// @ts-nocheck
'use server';

/**
 * Server actions pour l'import d'actions depuis Google Drive
 * Télécharge les fichiers Drive et les importe dans ActionHub
 */

import { createClient } from '@/lib/supabase/server';
import { fetchDriveFile } from './drive';
import { parseExcelWorkbook, sheetToRows, type ParsedExcelData } from '@/lib/import/excelParser';
import { type ColumnMapping, type MappedAction, mapRowToAction } from '@/lib/import/mappingUtils';
import { importActions } from './import';
import { validateFileComplete } from '@/lib/import/fileValidator';
import { generateRowIdentifiers } from '@/lib/sync/rowIdentifier';

interface ParsePreviewResult {
  success: boolean;
  error?: string;
  file?: {
    id: string;
    name: string;
    modifiedTime: string;
  };
  sheets?: Map<string, ParsedExcelData>;
}

interface ImportFromDriveParams {
  fileId: string;
  sheetName: string;
  mapping: ColumnMapping;
  planName: string;
  autoSync?: boolean;
}

/**
 * Télécharge un fichier Drive et le parse pour preview
 * Retourne toutes les feuilles avec leurs données
 */
export async function parseDriveFileToPreview(fileId: string, tenantId?: string, supabaseClient?: any): Promise<ParsePreviewResult> {
  try {
    // 1. Télécharger le fichier depuis Drive
    const result = await fetchDriveFile(fileId, tenantId, supabaseClient);

    if (!result.success || !result.file || !result.buffer) {
      return { success: false, error: result.error || 'Erreur lors du téléchargement' };
    }

    // 2. Convertir le buffer base64 en ArrayBuffer
    const buffer = Buffer.from(result.buffer, 'base64');
    const arrayBuffer = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );

    // 3. Parser le fichier Excel
    const workbook = parseExcelWorkbook(arrayBuffer);

    // 4. Parser toutes les feuilles
    const sheets = new Map<string, ParsedExcelData>();
    workbook.SheetNames.forEach((sheetName) => {
      const data = sheetToRows(workbook, sheetName);
      sheets.set(sheetName, data);
    });

    // 5. Retourner les données
    return {
      success: true,
      file: {
        id: result.file.id,
        name: result.file.name,
        modifiedTime: result.file.modifiedTime,
      },
      sheets,
    };
  } catch (error: any) {
    console.error('Erreur parseDriveFileToPreview:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors du parsing du fichier',
    };
  }
}

/**
 * Importe un fichier Excel depuis Google Drive dans ActionHub
 * Crée le plan d'action et toutes les actions avec matching automatique
 */
export async function importFromDrive(params: ImportFromDriveParams) {
  try {
    const supabase = await createClient();

    // 1. Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Non authentifié' };
    }

    // 2. Récupérer le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'responsable'].includes(profile.role)) {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    // 3. Vérifier si le fichier n'est pas déjà importé (prévention doublons)
    const { data: existingPlan } = await supabase
      .from('plans_action')
      .select('id, nom, created_at')
      .eq('tenant_id', profile.tenant_id!)
      .eq('google_drive_file_id', params.fileId)
      .single();

    if (existingPlan) {
      const createdAt = new Date(existingPlan.created_at).toLocaleString('fr-FR');
      return {
        success: false,
        error: `Ce fichier a déjà été importé dans le plan "${existingPlan.nom}" le ${createdAt}. Utilisez la synchronisation pour mettre à jour les données.`,
      };
    }

    // 4. Télécharger et parser le fichier
    const parseResult = await parseDriveFileToPreview(params.fileId);

    if (!parseResult.success || !parseResult.sheets || !parseResult.file) {
      return { success: false, error: parseResult.error || 'Erreur lors du parsing' };
    }

    // 4. Récupérer la feuille sélectionnée
    const sheetData = parseResult.sheets.get(params.sheetName);

    if (!sheetData) {
      return { success: false, error: `Feuille "${params.sheetName}" non trouvée` };
    }

    // 5. Valider le format et la qualité des données
    const validation = validateFileComplete(sheetData, params.sheetName);

    if (!validation.valid) {
      return {
        success: false,
        error: `Validation échouée:\n${validation.errors.join('\n')}`,
      };
    }

    // Loguer les warnings s'il y en a
    if (validation.warnings.length > 0) {
      console.warn(`[Import Drive] Warnings pour "${params.planName}":`);
      validation.warnings.forEach(w => console.warn(`  - ${w}`));
    }

    // Loguer les stats de validation
    if (validation.stats) {
      console.log(`[Import Drive] Stats: ${validation.stats.validRows}/${validation.stats.totalRows} lignes valides`);
    }

    // 6. Mapper les données avec index original + génération des drive_row_id
    // IMPORTANT: Utiliser l'index ORIGINAL du fichier Excel pour drive_row_id

    const actionsWithRowIds: Array<{
      action: MappedAction;
      drive_row_id: string;
      drive_content_hash: string;
    }> = [];

    sheetData.rows.forEach((row, originalIndex) => {
      const action = mapRowToAction(row, params.mapping);

      // Ignorer les lignes vides/invalides
      if (!action) {
        return;
      }

      // Générer les identifiants avec l'index original
      const { rowId, contentHash } = generateRowIdentifiers(
        row,
        originalIndex,
        params.mapping
      );

      actionsWithRowIds.push({
        action,
        drive_row_id: rowId,
        drive_content_hash: contentHash,
      });
    });

    if (actionsWithRowIds.length === 0) {
      return { success: false, error: 'Aucune action valide trouvée dans le fichier' };
    }

    // 7. Importer les actions (réutilise la logique existante)
    const importResult = await importActions({
      planName: params.planName,
      actions: actionsWithRowIds.map(a => a.action),
      sourceFile: parseResult.file.name,
      sourceSheet: params.sheetName,
      driveRowIds: actionsWithRowIds, // Passer les row_ids
    });

    if (!importResult.success || !importResult.data) {
      return { success: false, error: importResult.error || 'Erreur lors de l\'import' };
    }

    const planId = importResult.data.planId;

    // 8. Si auto-sync activé, créer l'entrée dans google_drive_synced_files
    if (params.autoSync) {
      // Récupérer la connexion Drive active
      const { data: connection } = await supabase
        .from('google_drive_connections')
        .select('id')
        .eq('tenant_id', profile.tenant_id!)
        .eq('actif', true)
        .single();

      if (connection) {
        await supabase
          .from('google_drive_synced_files')
          .insert({
            tenant_id: profile.tenant_id!,
            connection_id: connection.id,
            plan_id: planId,
            drive_file_id: params.fileId,
            drive_file_name: parseResult.file.name,
            drive_modified_time: parseResult.file.modifiedTime,
            sync_enabled: true,
            sheet_name: params.sheetName,
            column_mapping: params.mapping,
          });

        // Marquer le plan comme auto-sync
        await supabase
          .from('plans_action')
          .update({
            google_drive_file_id: params.fileId,
            auto_sync: true,
          })
          .eq('id', planId);

        console.log(`✅ Auto-sync activé pour le plan ${planId}`);
      }
    }

    // 9. Retourner le résultat
    return {
      success: true,
      data: {
        planId: importResult.data.planId,
        planName: importResult.data.planName,
        actionsCount: importResult.data.actionsCount,
        autoSyncEnabled: params.autoSync || false,
      },
    };
  } catch (error: any) {
    console.error('Erreur importFromDrive:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de l\'import',
    };
  }
}
