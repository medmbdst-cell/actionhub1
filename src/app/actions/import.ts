// @ts-nocheck
'use server';

/**
 * Server actions pour l'import d'actions depuis Excel
 * Inclut le matching automatique des responsables
 *
 * OPTIMISATION: Le matching est fait en mémoire après un seul fetch
 * des profils du tenant, pour éviter le timeout sur Vercel Hobby (10s).
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

interface ProfileCandidate {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

/**
 * Normalise une chaîne pour la comparaison (lowercase, sans accents, trim)
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Parse le texte du responsable pour extraire initiale(s) et nom
 */
function parseResponsableTxt(responsableTxt: string): {
  initiale: string | null;
  nom: string;
} {
  const cleaned = responsableTxt
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\./g, '');

  if (!cleaned.includes(' ')) {
    return { initiale: null, nom: cleaned };
  }

  const parts = cleaned.split(' ');
  const firstPart = parts[0];
  const restParts = parts.slice(1).join(' ');

  if (firstPart.length <= 3) {
    return { initiale: firstPart, nom: restParts };
  }

  return { initiale: firstPart[0], nom: restParts };
}

/**
 * Matching en mémoire : compare un responsable_txt contre la liste de profils pré-chargés
 */
function matchInMemory(
  responsableTxt: string,
  allProfiles: ProfileCandidate[]
): {
  responsableId: string | null;
  issue: { raison: string; candidats?: ProfileCandidate[]; message: string } | null;
} {
  if (!responsableTxt || responsableTxt.trim() === '') {
    return { responsableId: null, issue: null };
  }

  const { initiale, nom } = parseResponsableTxt(responsableTxt);
  const nomNormalized = normalize(nom);

  // Filtrer par nom
  let candidats = allProfiles.filter(p => normalize(p.nom) === nomNormalized);

  // Filtrer par initiale si présente
  if (initiale && candidats.length > 1) {
    const initialeNormalized = normalize(initiale);
    candidats = candidats.filter(p =>
      normalize(p.prenom).startsWith(initialeNormalized)
    );
  }

  if (candidats.length === 0) {
    return {
      responsableId: null,
      issue: {
        raison: 'inexistant',
        candidats: [],
        message: initiale
          ? `Aucun utilisateur trouvé avec le nom "${nom}" et le prénom commençant par "${initiale}"`
          : `Aucun utilisateur trouvé avec le nom "${nom}"`,
      },
    };
  }

  if (candidats.length === 1) {
    return { responsableId: candidats[0].id, issue: null };
  }

  return {
    responsableId: null,
    issue: {
      raison: 'ambiguite',
      candidats,
      message: `${candidats.length} utilisateurs trouvés avec le nom "${nom}". Veuillez ajouter l'initiale du prénom.`,
    },
  };
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

    // 6. PRÉ-CHARGER tous les profils du tenant en UNE SEULE requête
    //    (évite N requêtes DB = timeout sur Vercel Hobby 10s)
    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, nom, prenom, email')
      .eq('tenant_id', profile.tenant_id!)
      .eq('actif', true);

    const profilesList: ProfileCandidate[] = (allProfiles || []).map(p => ({
      id: p.id,
      nom: p.nom || '',
      prenom: p.prenom || '',
      email: p.email || '',
    }));

    console.log(`🔍 Matching de ${params.actions.length} actions contre ${profilesList.length} profils...`);

    const matchingStats = {
      total: params.actions.length,
      matched: 0,
      ambigus: 0,
      inexistants: 0,
    };

    // 7. Préparer les actions avec matching EN MÉMOIRE (0 requête DB supplémentaire)
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
        responsable_id: null,
        echeance: cleanEcheance,
        statut: action.statut || 'todo',
        priorite: action.priorite || null,
        commentaire: action.commentaire || null,
        created_by: user.id,
        updated_by: user.id,
        source_file: params.sourceFile,
        source_sheet: params.sourceSheet,
        plan_action_nom: params.planName,
        import_date: importDate,
        import_batch_id: importBatchId,
      };

      // Phase 3: Ajouter drive_row_id et drive_content_hash si fournis
      if (params.driveRowIds && params.driveRowIds[i]) {
        actionData.drive_row_id = params.driveRowIds[i].drive_row_id;
        actionData.drive_content_hash = params.driveRowIds[i].drive_content_hash;
        actionData.last_synced_at = importDate;
      }

      // Matching en mémoire (instantané, pas de requête DB)
      if (action.responsable_txt && action.responsable_txt.trim() !== '') {
        const matchResult = matchInMemory(action.responsable_txt, profilesList);

        if (matchResult.responsableId) {
          actionData.responsable_id = matchResult.responsableId;
          matchingStats.matched++;
        } else if (matchResult.issue) {
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

    // 8. Insérer les actions en batch
    const { data: insertedActions, error: actionsError } = await supabase
      .from('actions')
      .insert(actionsToInsert as any)
      .select();

    if (actionsError) {
      console.error('Erreur insertion actions:', actionsError);
      // Supprimer le plan si l'insertion des actions échoue
      await supabase.from('plans_action').delete().eq('id', (plan as any).id);
      return { success: false, error: `Erreur insertion actions: ${actionsError.message || actionsError.code || JSON.stringify(actionsError)}` };
    }

    // 9. Créer les issues de matching pour les cas non résolus
    if (matchingIssuesToCreate.length > 0 && insertedActions) {
      console.log(`📝 Création de ${matchingIssuesToCreate.length} issues de matching...`);

      const issuesToInsert = matchingIssuesToCreate.map((item) => {
        const insertedAction = insertedActions[actionsToInsert.findIndex(a => a === item.actionData)];

        return {
          tenant_id: profile.tenant_id,
          action_id: insertedAction?.id,
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
      }
    }

    // 10. Revalider les pages concernées
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
  } catch (error: any) {
    console.error('Erreur import:', error);
    const message = error?.message || 'Erreur inconnue';
    return { success: false, error: `Erreur lors de l'import: ${message}` };
  }
}

/**
 * Télécharger le template Excel
 */
export async function downloadTemplate() {
  return { success: true, url: '/template-import-actions.xlsx' };
}
