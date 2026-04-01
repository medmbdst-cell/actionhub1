// @ts-nocheck
'use server';

/**
 * Server actions pour la gestion des plans d'action
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Récupère tous les plans d'action du tenant avec le nombre d'actions
 */
export async function getPlans() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    // Récupérer les plans
    const { data: plans, error } = await supabase
      .from('plans_action')
      .select('id, nom, source_type, google_drive_file_id, auto_sync, actif, created_at')
      .eq('tenant_id', profile.tenant_id!)
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: 'Erreur récupération plans' };
    }

    // Compter les actions par plan en une seule requête
    const { data: actionCounts, error: countError } = await supabase
      .from('actions')
      .select('plan_id')
      .eq('tenant_id', profile.tenant_id!);

    // Calculer les counts en mémoire
    const countMap = new Map<string, number>();
    if (actionCounts) {
      for (const a of actionCounts) {
        countMap.set(a.plan_id, (countMap.get(a.plan_id) || 0) + 1);
      }
    }

    const plansWithCounts = (plans || []).map(plan => ({
      ...plan,
      actionsCount: countMap.get(plan.id) || 0,
    }));

    return { success: true, plans: plansWithCounts };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Supprime un plan d'action et toutes ses données associées
 * - Actions (CASCADE)
 * - Matching issues
 * - Sync files (si Drive)
 */
export async function deletePlanById(planId: string) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Non authentifié' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Permissions insuffisantes' };
    }

    // Vérifier que le plan appartient au tenant
    const { data: plan, error: planError } = await supabase
      .from('plans_action')
      .select('id, nom, tenant_id')
      .eq('id', planId)
      .eq('tenant_id', profile.tenant_id!)
      .single();

    if (planError || !plan) {
      return { success: false, error: 'Plan non trouvé' };
    }

    // Supprimer les sync files associés (si existants)
    await supabase
      .from('google_drive_synced_files')
      .delete()
      .eq('plan_id', planId);

    // Supprimer les matching issues associées aux actions du plan
    const { data: actionIds } = await supabase
      .from('actions')
      .select('id')
      .eq('plan_id', planId);

    if (actionIds && actionIds.length > 0) {
      const ids = actionIds.map(a => a.id);
      await supabase
        .from('action_matching_issues')
        .delete()
        .in('action_id', ids);
    }

    // Supprimer le plan (les actions sont supprimées en CASCADE)
    const { error: deleteError } = await supabase
      .from('plans_action')
      .delete()
      .eq('id', planId);

    if (deleteError) {
      return { success: false, error: `Erreur suppression: ${deleteError.message}` };
    }

    revalidatePath('/admin/plans');
    revalidatePath('/admin/actions');
    revalidatePath('/admin');

    return {
      success: true,
      message: `Plan "${plan.nom}" supprimé avec succès`,
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
