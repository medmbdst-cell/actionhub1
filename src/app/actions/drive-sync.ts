// @ts-nocheck
'use server';

/**
 * Server actions pour la synchronisation automatique Google Drive
 * Vérifie si les fichiers Drive ont changé et re-importe si nécessaire
 */

import { createClient } from '@/lib/supabase/server';
import { getDriveClientForTenant } from '@/lib/google/driveClient';
import { parseDriveFileToPreview } from './drive-import';
import { mapRowsToActions, mapRowToAction } from '@/lib/import/mappingUtils';
import { importActions } from './import';
import { generateRowIdentifiers, generateActionHash } from '@/lib/sync/rowIdentifier';
import { mergeAction } from '@/lib/sync/mergeStrategies';
import crypto from 'crypto';

/**
 * Récupère la liste des fichiers synchronisés pour un tenant
 */
export async function getSyncedFiles(tenantId: string, supabaseClient?: any) {
  const supabase = supabaseClient || await createClient();

  const { data: files, error } = await supabase
    .from('google_drive_synced_files')
    .select(`
      *,
      plan:plans_action!inner(id, nom),
      connection:google_drive_connections!inner(id, actif)
    `)
    .eq('tenant_id', tenantId)
    .eq('sync_enabled', true)
    .order('last_synced_at', { ascending: false });

  if (error) {
    console.error('Erreur getSyncedFiles:', error);
    return { success: false, error: error.message };
  }

  return { success: true, files: files || [] };
}

/**
 * Synchronise un fichier Drive avec stratégie "incrémentale" (Phase 3)
 * Détecte les changements ligne par ligne et merge intelligemment
 * ✅ Préserve les modifications manuelles
 */
export async function syncFileIncremental(syncedFileId: string, supabaseClient?: any) {
  try {
    const supabase = supabaseClient || await createClient();

    // 1. Récupérer les infos du fichier synchronisé
    const { data: syncedFile, error: fetchError } = await supabase
      .from('google_drive_synced_files')
      .select('*, plan:plans_action!inner(id, nom)')
      .eq('id', syncedFileId)
      .single();

    if (fetchError || !syncedFile) {
      return { success: false, error: 'Fichier synchronisé non trouvé' };
    }

    // 2. Récupérer le client Drive
    const driveData = await getDriveClientForTenant(syncedFile.tenant_id, supabase);
    if (!driveData) {
      return { success: false, error: 'Aucune connexion Google Drive active' };
    }

    const { drive } = driveData;

    // 3. Parser le fichier Drive pour calculer le hash du contenu
    // On ne se fie plus au modifiedTime car il ne change pas pour les Excel édités via Google Sheets
    const parseResult = await parseDriveFileToPreview(syncedFile.drive_file_id, syncedFile.tenant_id, supabase);
    if (!parseResult.success || !parseResult.sheets) {
      return { success: false, error: parseResult.error };
    }

    const sheetData = parseResult.sheets.get(syncedFile.sheet_name!);
    if (!sheetData) {
      return { success: false, error: `Feuille "${syncedFile.sheet_name}" non trouvée` };
    }

    // 5. Générer les identifiants pour chaque ligne Drive
    // IMPORTANT: Utiliser l'index ORIGINAL du fichier Excel, pas l'index dans le tableau filtré
    const driveActions = new Map<string, {
      rowId: string;
      contentHash: string;
      rowIndex: number;
      mappedAction: any;
    }>();

    // Mapper chaque ligne avec son index original (AVANT filtrage)
    sheetData.rows.forEach((row, originalIndex) => {
      // Mapper la ligne (peut retourner null si ligne invalide)
      const mappedAction = mapRowToAction(row, syncedFile.column_mapping as any);

      // Ignorer les lignes vides/invalides (comme le fait mapRowsToActions)
      if (!mappedAction) {
        return;
      }

      // Générer les identifiants avec l'index ORIGINAL
      const { rowId, contentHash } = generateRowIdentifiers(
        row,
        originalIndex, // ✅ Index original dans le fichier Excel
        syncedFile.column_mapping as any
      );

      driveActions.set(rowId, {
        rowId,
        contentHash,
        rowIndex: originalIndex,
        mappedAction,
      });
    });

    // 4. Calculer le hash du fichier complet (toutes les lignes)
    // On trie les rowId pour garantir un ordre stable
    const sortedHashes = Array.from(driveActions.values())
      .map(a => a.contentHash)
      .sort()
      .join('|');

    const fileContentHash = crypto.createHash('sha256').update(sortedHashes, 'utf-8').digest('hex');

    console.log(`📊 Hash fichier actuel: ${fileContentHash.substring(0, 16)}...`);
    console.log(`📊 Hash fichier stocké: ${syncedFile.file_content_hash?.substring(0, 16) || 'null'}...`);

    // 5. Comparer le hash avec le dernier sync
    if (syncedFile.file_content_hash && fileContentHash === syncedFile.file_content_hash) {
      console.log('⏭️ Contenu identique, skip');
      return { success: true, changed: false, message: 'Fichier déjà à jour' };
    }

    console.log(`🔄 Sync incrémentale de "${syncedFile.drive_file_name}" (${driveActions.size} lignes)`);

    // 6. Référence au dernier sync (pour mergeAction)
    const lastSyncedTime = new Date(syncedFile.last_synced_at);

    // 7. Récupérer toutes les actions existantes du plan
    const { data: existingActions, error: fetchActionsError } = await supabase
      .from('actions')
      .select('*')
      .eq('plan_id', syncedFile.plan_id);

    if (fetchActionsError) {
      return { success: false, error: 'Erreur lors de la récupération des actions' };
    }

    // 7. Créer un Map des actions existantes par drive_row_id
    const existingActionsMap = new Map<string, any>();
    const actionsWithoutRowId: any[] = [];

    (existingActions || []).forEach((action) => {
      if (action.drive_row_id) {
        existingActionsMap.set(action.drive_row_id, action);
      } else {
        actionsWithoutRowId.push(action);
      }
    });

    // 8. Catégoriser les actions
    const toCreate: any[] = [];
    const toUpdate: any[] = [];
    const toMarkDeleted: string[] = [];
    const conflicts: any[] = [];

    // Actions dans Drive
    for (const [rowId, driveData] of driveActions.entries()) {
      const existing = existingActionsMap.get(rowId);

      if (!existing) {
        // NOUVELLE action ajoutée dans Drive
        const cleanEcheance = driveData.mappedAction.echeance && driveData.mappedAction.echeance.match(/^\d{4}-\d{2}-\d{2}$/)
          ? driveData.mappedAction.echeance
          : null;

        toCreate.push({
          tenant_id: syncedFile.tenant_id,
          plan_id: syncedFile.plan_id,
          drive_row_id: rowId,
          drive_content_hash: driveData.contentHash,
          last_synced_at: new Date().toISOString(),
          description: driveData.mappedAction.description,
          event_description: driveData.mappedAction.event_description || null,
          responsable_txt: driveData.mappedAction.responsable_txt || null,
          echeance: cleanEcheance,
          statut: driveData.mappedAction.statut || 'todo',
          priorite: driveData.mappedAction.priorite || null,
          commentaire: driveData.mappedAction.commentaire || null,
        });
      } else {
        // Action EXISTANTE - vérifier si elle a changé
        const currentHash = generateActionHash(existing);
        const hasChangedInDrive = driveData.contentHash !== existing.drive_content_hash;
        const hasChangedLocally = currentHash !== existing.drive_content_hash;

        if (hasChangedInDrive || hasChangedLocally) {
          // Il y a des changements - faire le merge
          const { mergedAction, conflicts: actionConflicts } = mergeAction(
            driveData.mappedAction,
            existing,
            lastSyncedTime
          );

          const cleanEcheance = mergedAction.echeance && String(mergedAction.echeance).match(/^\d{4}-\d{2}-\d{2}$/)
            ? mergedAction.echeance
            : existing.echeance;

          toUpdate.push({
            id: existing.id,
            ...mergedAction,
            echeance: cleanEcheance,
            drive_content_hash: driveData.contentHash,
            last_synced_at: new Date().toISOString(),
          });

          if (actionConflicts.length > 0) {
            conflicts.push({
              actionId: existing.id,
              conflicts: actionConflicts,
            });
          }
        }
      }

      // Retirer de la map (pour trouver les actions supprimées après)
      existingActionsMap.delete(rowId);
    }

    // Actions restantes dans la map = SUPPRIMÉES du fichier Drive
    for (const [rowId, action] of existingActionsMap.entries()) {
      if (!action.deleted_from_source) {
        toMarkDeleted.push(action.id);
      }
    }

    // 9. Exécuter les opérations en base de données

    // Créer nouvelles actions
    if (toCreate.length > 0) {
      const { error } = await supabase.from('actions').insert(toCreate);
      if (error) {
        console.error('Erreur création actions:', error);
        return { success: false, error: 'Erreur lors de la création des actions' };
      }
    }

    // Mettre à jour actions existantes
    if (toUpdate.length > 0) {
      for (const action of toUpdate) {
        const { id, ...updates } = action;
        const { error } = await supabase
          .from('actions')
          .update(updates)
          .eq('id', id);

        if (error) {
          console.error(`Erreur update action ${id}:`, error);
        }
      }
    }

    // Marquer actions supprimées
    if (toMarkDeleted.length > 0) {
      const { error } = await supabase
        .from('actions')
        .update({ deleted_from_source: true })
        .in('id', toMarkDeleted);

      if (error) {
        console.error('Erreur marquage suppression:', error);
      }
    }

    // Logger les conflits
    if (conflicts.length > 0) {
      const conflictRecords = conflicts.flatMap(({ actionId, conflicts: actionConflicts }) =>
        actionConflicts.map((c: any) => ({
          tenant_id: syncedFile.tenant_id,
          action_id: actionId,
          synced_file_id: syncedFileId,
          field_name: c.field,
          drive_value: String(c.driveValue || ''),
          local_value: String(c.localValue || ''),
          resolved_value: String(c.resolvedValue || ''),
          resolution_strategy: c.strategy,
        }))
      );

      await supabase.from('sync_conflicts').insert(conflictRecords);
    }

    // 10. Mettre à jour le record de synchronisation
    await supabase
      .from('google_drive_synced_files')
      .update({
        file_content_hash: fileContentHash,
        last_synced_at: new Date().toISOString(),
        sync_mode: 'incremental',
      })
      .eq('id', syncedFileId);

    console.log(`✅ Sync incrémentale réussie:
      - ${toCreate.length} créées
      - ${toUpdate.length} mises à jour
      - ${toMarkDeleted.length} supprimées du Drive
      - ${conflicts.length} conflits résolus`);

    return {
      success: true,
      changed: true,
      stats: {
        created: toCreate.length,
        updated: toUpdate.length,
        deleted: toMarkDeleted.length,
        conflicts: conflicts.length,
      },
      message: `Sync réussie: ${toCreate.length} créées, ${toUpdate.length} MAJ, ${toMarkDeleted.length} supprimées`,
    };

  } catch (error: any) {
    console.error('Erreur syncFileIncremental:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Synchronise un fichier Drive avec stratégie "full replace" (Phase 2)
 * Supprime TOUTES les actions puis re-importe tout
 * ⚠️ Perd les modifications manuelles !
 */
export async function syncFileFullReplace(syncedFileId: string, supabaseClient?: any) {
  try {
    const supabase = supabaseClient || await createClient();

    // 1. Récupérer les infos du fichier synchronisé
    const { data: syncedFile, error: fetchError } = await supabase
      .from('google_drive_synced_files')
      .select(`
        *,
        plan:plans_action!inner(id, nom)
      `)
      .eq('id', syncedFileId)
      .single();

    if (fetchError || !syncedFile) {
      return { success: false, error: 'Fichier synchronisé non trouvé' };
    }

    // 2. Récupérer le client Drive pour ce tenant
    const driveData = await getDriveClientForTenant(syncedFile.tenant_id, supabase);

    if (!driveData) {
      return { success: false, error: 'Aucune connexion Google Drive active' };
    }

    const { drive } = driveData;

    // 3. Re-télécharger et parser le fichier
    const parseResult = await parseDriveFileToPreview(syncedFile.drive_file_id, syncedFile.tenant_id, supabase);

    if (!parseResult.success || !parseResult.sheets) {
      return { success: false, error: parseResult.error || 'Erreur lors du parsing' };
    }

    // 7. Récupérer la feuille correspondante
    const sheetData = parseResult.sheets.get(syncedFile.sheet_name!);

    if (!sheetData) {
      return { success: false, error: `Feuille "${syncedFile.sheet_name}" non trouvée` };
    }

    // 4. Calculer le hash du fichier complet pour détecter les changements
    const rowHashes: string[] = [];
    sheetData.rows.forEach((row, index) => {
      const mapped = mapRowToAction(row, syncedFile.column_mapping as any);
      if (mapped) {
        const { contentHash } = generateRowIdentifiers(row, index, syncedFile.column_mapping as any);
        rowHashes.push(contentHash);
      }
    });

    const sortedHashes = rowHashes.sort().join('|');
    const fileContentHash = crypto.createHash('sha256').update(sortedHashes, 'utf-8').digest('hex');

    console.log(`📊 Hash fichier actuel: ${fileContentHash.substring(0, 16)}...`);
    console.log(`📊 Hash fichier stocké: ${syncedFile.file_content_hash?.substring(0, 16) || 'null'}...`);

    // 5. Comparer le hash (si identique, skip)
    if (syncedFile.file_content_hash && fileContentHash === syncedFile.file_content_hash) {
      console.log(`✓ Fichier "${syncedFile.drive_file_name}" déjà à jour`);
      return {
        success: true,
        changed: false,
        message: 'Fichier déjà à jour',
      };
    }

    console.log(`🔄 Synchronisation COMPLÈTE de "${syncedFile.drive_file_name}" (${rowHashes.length} lignes)`);

    // 6. Supprimer toutes les actions du plan
    const { error: deleteError } = await supabase
      .from('actions')
      .delete()
      .eq('plan_id', syncedFile.plan_id);

    if (deleteError) {
      console.error('Erreur suppression actions:', deleteError);
      return { success: false, error: 'Erreur lors de la suppression des actions' };
    }

    // 7. Mapper les données avec le mapping stocké
    const mappedActions = mapRowsToActions(sheetData.rows, syncedFile.column_mapping as any);

    if (mappedActions.length === 0) {
      return { success: false, error: 'Aucune action valide trouvée' };
    }

    // 8. Re-importer les actions (réutilise la logique existante mais sans créer de plan)
    // Note: Pas besoin d'auth.getUser() car on utilise SERVICE_ROLE client qui bypass RLS

    // Préparer les actions avec matching (copie de la logique de importActions)
    const actionsToInsert = [];
    const matchingIssuesToCreate = [];

    for (const action of mappedActions) {
      const cleanEcheance = action.echeance && action.echeance.match(/^\d{4}-\d{2}-\d{2}$/)
        ? action.echeance
        : null;

      const baseAction = {
        tenant_id: syncedFile.tenant_id,
        plan_id: syncedFile.plan_id,
        description: action.description,
        event_description: action.event_description || null,
        responsable_txt: action.responsable_txt || null,
        echeance: cleanEcheance,
        statut: action.statut || 'todo',
        priorite: action.priorite || null,
        commentaire: action.commentaire || null,
        created_at: new Date().toISOString(),
      };

      actionsToInsert.push(baseAction);
    }

    // 10. Insérer les nouvelles actions
    const { error: insertError } = await supabase
      .from('actions')
      .insert(actionsToInsert);

    if (insertError) {
      console.error('Erreur insertion actions:', insertError);
      return { success: false, error: 'Erreur lors de l\'insertion des actions' };
    }

    // 9. Mettre à jour le record de synchronisation
    await supabase
      .from('google_drive_synced_files')
      .update({
        file_content_hash: fileContentHash,
        last_synced_at: new Date().toISOString(),
        sync_mode: 'full_replace',
      })
      .eq('id', syncedFileId);

    console.log(`✅ Synchronisation réussie : ${actionsToInsert.length} actions importées`);

    return {
      success: true,
      changed: true,
      actionsCount: actionsToInsert.length,
      message: `${actionsToInsert.length} actions synchronisées`,
    };

  } catch (error: any) {
    console.error('Erreur syncFile:', error);
    return {
      success: false,
      error: error.message || 'Erreur lors de la synchronisation',
    };
  }
}

/**
 * Point d'entrée principal pour la synchronisation d'un fichier
 * Choisit automatiquement entre sync incrémentale ou full replace selon sync_mode
 */
export async function syncFile(syncedFileId: string, supabaseClient?: any) {
  const supabase = supabaseClient || await createClient();

  // Récupérer le mode de sync du fichier
  const { data: syncedFile } = await supabase
    .from('google_drive_synced_files')
    .select('sync_mode, drive_file_name')
    .eq('id', syncedFileId)
    .single();

  const mode = syncedFile?.sync_mode || 'full_replace';
  console.log(`🔍 [syncFile] Fichier: "${syncedFile?.drive_file_name}", Mode: ${mode}`);

  if (mode === 'incremental') {
    console.log('   ✅ Utilisation du mode INCRÉMENTAL (Phase 3)');
    return syncFileIncremental(syncedFileId, supabase);
  } else {
    console.log('   ⚠️ Utilisation du mode FULL_REPLACE (Phase 2)');
    return syncFileFullReplace(syncedFileId, supabase);
  }
}

/**
 * Change le mode de synchronisation pour un fichier
 */
export async function changeSyncMode(
  syncedFileId: string,
  newMode: 'full_replace' | 'incremental'
) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('google_drive_synced_files')
      .update({ sync_mode: newMode })
      .eq('id', syncedFileId);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: newMode === 'incremental'
        ? 'Mode incrémental activé ✨'
        : 'Mode remplacement complet activé',
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Synchronise tous les fichiers d'un tenant
 * Utilisé par le cron job
 */
export async function syncAllFiles(tenantId: string, supabaseClient?: any) {
  const filesResult = await getSyncedFiles(tenantId, supabaseClient);

  if (!filesResult.success || !filesResult.files) {
    return { success: false, error: filesResult.error };
  }

  const results = [];

  for (const file of filesResult.files) {
    const syncResult = await syncFile(file.id, supabaseClient);
    results.push({
      fileId: file.id,
      fileName: file.drive_file_name,
      ...syncResult,
    });
  }

  const changedCount = results.filter(r => r.changed).length;
  const totalCount = results.length;

  return {
    success: true,
    results,
    summary: `${changedCount}/${totalCount} fichier(s) synchronisé(s)`,
  };
}

/**
 * Active/Désactive la synchronisation pour un plan
 */
export async function toggleSync(syncedFileId: string, enabled: boolean) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('google_drive_synced_files')
      .update({ sync_enabled: enabled })
      .eq('id', syncedFileId);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: enabled ? 'Synchronisation activée' : 'Synchronisation désactivée',
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Supprime complètement un plan d'action et ses données associées
 * Supprime :
 * - Le fichier synchronisé
 * - Le plan d'action
 * - Toutes les actions (CASCADE automatique)
 */
export async function deletePlan(syncedFileId: string) {
  try {
    const supabase = await createClient();

    // 1. Récupérer le plan_id associé au fichier synchronisé
    const { data: syncedFile, error: fetchError } = await supabase
      .from('google_drive_synced_files')
      .select('plan_id, drive_file_name')
      .eq('id', syncedFileId)
      .single();

    if (fetchError || !syncedFile) {
      return { success: false, error: 'Fichier synchronisé non trouvé' };
    }

    const planId = syncedFile.plan_id;
    const fileName = syncedFile.drive_file_name;

    // 2. Supprimer le fichier synchronisé
    const { error: deleteSyncError } = await supabase
      .from('google_drive_synced_files')
      .delete()
      .eq('id', syncedFileId);

    if (deleteSyncError) {
      return { success: false, error: 'Erreur lors de la suppression du fichier synchronisé' };
    }

    // 3. Supprimer le plan (les actions seront supprimées automatiquement via CASCADE)
    const { error: deletePlanError } = await supabase
      .from('plans_action')
      .delete()
      .eq('id', planId);

    if (deletePlanError) {
      return { success: false, error: 'Erreur lors de la suppression du plan' };
    }

    return {
      success: true,
      message: `Plan "${fileName}" supprimé avec succès`,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
