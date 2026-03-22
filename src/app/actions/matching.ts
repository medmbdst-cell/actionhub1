'use server';

/**
 * Server actions pour la résolution des problèmes de matching
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Résoudre une issue de matching en assignant un responsable à une action
 */
export async function resolveMatchingIssue(params: {
  issueId: string;
  actionId: string;
  responsableId: string;
}) {
  try {
    const supabase = await createClient();

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Récupérer le profil
    const { data: profile } = (await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()) as { data: { tenant_id: string; role: string } | null };

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    // 1. Mettre à jour l'action avec le responsable assigné
    const { error: actionError } = await supabase
      .from('actions')
      .update({
        responsable_id: params.responsableId,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.actionId)
      .eq('tenant_id', profile.tenant_id!);

    if (actionError) {
      console.error('Erreur mise à jour action:', actionError);
      return { success: false, error: 'Erreur lors de la mise à jour de l\'action' };
    }

    // 2. Marquer l'issue comme résolue
    const { error: issueError } = await supabase
      .from('action_matching_issues')
      .update({
        resolu: true,
        resolu_par: user.id,
        resolu_le: new Date().toISOString(),
        responsable_assigne_id: params.responsableId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.issueId)
      .eq('tenant_id', profile.tenant_id!);

    if (issueError) {
      console.error('Erreur mise à jour issue:', issueError);
      return { success: false, error: 'Erreur lors de la résolution' };
    }

    // Revalider les pages
    revalidatePath('/admin/matching');
    revalidatePath('/admin/actions');

    return { success: true };
  } catch (error) {
    console.error('Erreur résolution matching:', error);
    return { success: false, error: 'Erreur lors de la résolution' };
  }
}

/**
 * Ignorer une issue de matching (la marquer comme résolue sans assigner)
 */
export async function skipMatchingIssue(params: { issueId: string }) {
  try {
    const supabase = await createClient();

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Récupérer le profil
    const { data: profile } = (await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()) as { data: { tenant_id: string; role: string } | null };

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    // Marquer l'issue comme résolue (ignorée)
    const { error: issueError } = await supabase
      .from('action_matching_issues')
      .update({
        resolu: true,
        resolu_par: user.id,
        resolu_le: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.issueId)
      .eq('tenant_id', profile.tenant_id!);

    if (issueError) {
      console.error('Erreur mise à jour issue:', issueError);
      return { success: false, error: 'Erreur lors de l\'ignorage' };
    }

    // Revalider les pages
    revalidatePath('/admin/matching');

    return { success: true };
  } catch (error) {
    console.error('Erreur ignorage matching:', error);
    return { success: false, error: 'Erreur lors de l\'ignorage' };
  }
}

/**
 * Re-tenter le matching automatique pour une issue inexistante
 * Utile quand l'utilisateur a été créé après l'import initial
 */
export async function retryMatching(params: {
  issueId: string;
  actionId: string;
  responsableTxt: string;
}) {
  try {
    const supabase = await createClient();

    // Vérifier l'authentification
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié', candidats: [] };
    }

    // Récupérer le profil
    const { data: profile } = (await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()) as { data: { tenant_id: string; role: string } | null };

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Permissions insuffisantes', candidats: [] };
    }

    // Importer l'algorithme de matching
    const { matchResponsable } = await import('@/lib/matching/nameMatching');

    // Re-faire le matching
    const matchResult = await matchResponsable(
      supabase,
      profile.tenant_id!,
      params.responsableTxt
    );

    // Cas 1 : Match trouvé → Assigner automatiquement
    if (matchResult.success && matchResult.responsableId) {
      // Mettre à jour l'action
      await supabase
        .from('actions')
        .update({
          responsable_id: matchResult.responsableId,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.actionId)
        .eq('tenant_id', profile.tenant_id!);

      // Marquer l'issue comme résolue
      await supabase
        .from('action_matching_issues')
        .update({
          resolu: true,
          resolu_par: user.id,
          resolu_le: new Date().toISOString(),
          responsable_assigne_id: matchResult.responsableId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.issueId)
        .eq('tenant_id', profile.tenant_id!);

      revalidatePath('/admin/matching');
      revalidatePath('/admin/actions');

      return {
        success: true,
        message: 'Utilisateur trouvé et assigné automatiquement !',
        candidats: []
      };
    }

    // Cas 2 : Toujours inexistant
    if (matchResult.issue?.raison === 'inexistant') {
      return {
        success: false,
        error: 'Aucun utilisateur trouvé',
        message: matchResult.issue.message,
        candidats: []
      };
    }

    // Cas 3 : Maintenant ambigu (plusieurs candidats)
    if (matchResult.issue?.raison === 'ambiguite') {
      return {
        success: false,
        error: 'Plusieurs utilisateurs trouvés',
        message: matchResult.issue.message,
        candidats: matchResult.issue.candidats || []
      };
    }

    return {
      success: false,
      error: 'Erreur inconnue',
      candidats: []
    };
  } catch (error) {
    console.error('Erreur retry matching:', error);
    return {
      success: false,
      error: 'Erreur lors du retry',
      candidats: []
    };
  }
}

/**
 * Récupérer les statistiques de matching pour un tenant
 */
export async function getMatchingStats() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Non authentifié', data: null };
    }

    const { data: profile } = (await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single()) as { data: { tenant_id: string } | null };

    if (!profile) {
      return { success: false, error: 'Profil non trouvé', data: null };
    }

    // Compter les issues non résolues
    const { count: unresolvedCount } = await supabase
      .from('action_matching_issues')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', profile.tenant_id!)
      .eq('resolu', false);

    // Compter par raison
    const { data: issues } = await supabase
      .from('action_matching_issues')
      .select('raison')
      .eq('tenant_id', profile.tenant_id!)
      .eq('resolu', false);

    const stats = {
      total: unresolvedCount || 0,
      ambigus: issues?.filter((i) => i.raison === 'ambiguite').length || 0,
      inexistants: issues?.filter((i) => i.raison === 'inexistant').length || 0,
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('Erreur récupération stats:', error);
    return { success: false, error: 'Erreur', data: null };
  }
}
