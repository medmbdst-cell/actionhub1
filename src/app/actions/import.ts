// @ts-nocheck
'use server';

/**
 * Server actions pour l'import d'actions depuis Excel
 * Inclut le matching automatique des responsables
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { matchResponsable } from '@/lib/matching/nameMatching';

type ActionStatut = 'todo' | 'wip' | 'blocked' | 'done';
type ActionPriorite = 'haute' | 'moyen' | 'faible';

interface ImportedAction {
  description: string;
  event_description?: string;
  responsable_txt?: string;
  echeance?: string;
  statut?: ActionStatut;
  priorite?: ActionPriorite;
  commentaire?: string;
}

interface ImportActionsParams {
  planName: string;
  actions: ImportedAction[];
  sourceFile: string;    // Nom du fichier Excel
  sourceSheet: string;   // Nom de l'onglet
  driveRowIds?: Array<{  // ✨ Phase 3: Identifiants Drive pour sync incrémentale
    action: ImportedAction;
    drive_row_id: string;
    drive_content_hash: string;
  }>;
}

export async function importActions(params: ImportActionsParams) {
  try {
    const supabase = await createClient();

    // 1. Vérifier l'authentification et récupérer le profil
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Non authentifié' };
    }

    // 2. Récupérer le profil avec tenant_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { success: false, error: 'Profil non trouvé' };
    }

    // 3. Vérifier les permissions (admin ou responsable)
    if (!['admin', 'responsable'].includes(profile.role)) {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    // 4. Créer le plan d'action
    const { data: plan, error: planError } = await supabase
      .from('plans_action')
      .insert({
        tenant_id: profile.tenant_id,
        nom: params.planName,
        source_type: 'excel',
        created_by: user.id,
        actif: true
      })
      .select()
      .single();

    if (planError || !plan) {
      console.error('Erreur création plan:', planError);
      return { success: false, error: 'Erreur lors de la création du plan d\'action' };
    }

    // 5. Générer un ID unique pour ce lot d'import
    const importBatchId = crypto.randomUUID();
    const importDate = new Date().toISOString();

    // 6. Faire le matching automatique des responsables
    console.log(`🔍 Matching automatique de ${params.actions.length} actions...`);

    const matchingStats = {
      total: params.actions.length,
      matched: 0,
      ambigus: 0,
      inexistants: 0,
    };

    // Préparer les actions avec matching
    const actionsToInsert = [];
    const matchingIssuesToCreate = [];

    for (let i = 0; i < params.actions.length; i++) {
      const action = params.actions[i];

      // Nettoyer la date : accepter seulement YYYY-MM-DD valide
      const cleanEcheance = action.echeance && action.echeance.match(/^\d{4}-\d{2}-\d{2}$/)
        ? action.echeance
        : null;

      // Préparer l'action de base
      const actionData: any = {
        tenant_id: profile.tenant_id,
        plan_id: plan.id,
        description: action.description,
        event_description: action.event_description || null,
        responsable_txt: action.responsable_txt || null,
        responsable_id: null, // Sera rempli par le matching
        echeance: cleanEcheance,
        statut: action.statut || 'todo',
        priorite: action.priorite || null,
        commentaire: action.commentaire || null,
        created_by: user.id,
        updated_by: user.id,
        // ✨ Colonnes de traçabilité
        source_file: params.sourceFile,
        source_sheet: params.sourceSheet,
        plan_action_nom: params.planName,
        import_date: importDate,
        import_batch_id: importBatchId,
      };

      // ✨ Phase 3: Ajouter drive_row_id et drive_content_hash si fournis (import depuis Drive)
      if (params.driveRowIds && params.driveRowIds[i]) {
        actionData.drive_row_id = params.driveRowIds[i].drive_row_id;
        actionData.drive_content_hash = params.driveRowIds[i].drive_content_hash;
        actionData.last_synced_at = importDate;
      }

      // Faire le matching si on a un responsable_txt
      if (action.responsable_txt && action.responsable_txt.trim() !== '') {
        const matchResult = await matchResponsable(
          supabase,
          profile.tenant_id!,
          action.responsable_txt
        );

        if (matchResult.success && matchResult.responsableId) {
          // Match trouvé ✅
          actionData.responsable_id = matchResult.responsableId;
          matchingStats.matched++;
        } else if (matchResult.issue) {
          // Problème de matching → on créera une issue après insertion
          matchingIssuesToCreate.push({
            actionData,
            issue: matchResult.issue,
          });

          if (matchResult.issue.raison === 'ambiguite') {
            matchingStats.ambigus++;
          } else if (matchResult.issue.raison === 'inexistant') {
            matchingStats.inexistants++;
          }
        }
      }

      actionsToInsert.push(actionData);
    }

    console.log(`✅ Matching terminé: ${matchingStats.matched} matchés, ${matchingStats.ambigus} ambigus, ${matchingStats.inexistants} inexistants`);

    // 7. Insérer les actions en batch
    const { data: insertedActions, error: actionsError } = await supabase
      .from('actions')
      .insert(actionsToInsert as any)
      .select();

    if (actionsError) {
      console.error('Erreur insertion actions:', actionsError);
      // Supprimer le plan si l'insertion des actions échoue
      await supabase.from('plans_action').delete().eq('id', (plan as any).id);
      return { success: false, error: 'Erreur lors de l\'import des actions' };
    }

    // 8. Créer les issues de matching pour les cas non résolus
    if (matchingIssuesToCreate.length > 0 && insertedActions) {
      console.log(`📝 Création de ${matchingIssuesToCreate.length} issues de matching...`);

      const issuesToInsert = matchingIssuesToCreate.map((item, index) => {
        const insertedAction = insertedActions[actionsToInsert.findIndex(a => a === item.actionData)];

        return {
          tenant_id: profile.tenant_id,
          action_id: insertedAction.id,
          responsable_txt: item.actionData.responsable_txt,
          raison: item.issue.raison,
          candidats: item.issue.candidats ? JSON.stringify(item.issue.candidats) : null,
          resolu: false,
        };
      });

      const { error: issuesError } = await supabase
        .from('action_matching_issues')
        .insert(issuesToInsert as any);

      if (issuesError) {
        console.error('Erreur création issues de matching:', issuesError);
        // On continue quand même, ce n'est pas bloquant
      }
    }

    // 9. Revalider les pages concernées
    revalidatePath('/admin/actions');
    revalidatePath('/admin/import');
    revalidatePath('/admin/matching');

    return {
      success: true,
      data: {
        planId: (plan as any).id,
        planName: (plan as any).nom,
        actionsCount: insertedActions?.length || 0,
        matching: matchingStats,
      }
    };
  } catch (error) {
    console.error('Erreur import:', error);
    return { success: false, error: 'Erreur lors de l\'import' };
  }
}

/**
 * Télécharger le template Excel
 */
export async function downloadTemplate() {
  // Cette fonction sera appelée côté client
  // Le fichier est déjà disponible dans /public
  return { success: true, url: '/template-import-actions.xlsx' };
}
