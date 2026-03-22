'use server';

/**
 * Server action pour mettre à jour une action
 * Utilisé pour tester la Phase 3 (préservation des modifications locales)
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface UpdateActionInput {
  id: string;
  statut?: string;
  commentaire?: string;
}

export async function updateAction(input: UpdateActionInput) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier que l'action existe et appartient au tenant
    const { data: profile } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return { success: false, error: 'Profil non trouvé' };
    }

    const { data: action } = await supabase
      .from('actions')
      .select('id, tenant_id')
      .eq('id', input.id)
      .single();

    if (!action || action.tenant_id !== profile.tenant_id) {
      return { success: false, error: 'Action non trouvée ou accès refusé' };
    }

    // Mettre à jour uniquement les champs fournis
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (input.statut !== undefined) {
      updateData.statut = input.statut;
    }

    if (input.commentaire !== undefined) {
      updateData.commentaire = input.commentaire;
    }

    const { error: updateError } = await supabase
      .from('actions')
      .update(updateData)
      .eq('id', input.id);

    if (updateError) {
      console.error('Erreur update action:', updateError);
      return { success: false, error: updateError.message };
    }

    // Revalider le cache
    revalidatePath('/admin/actions');
    revalidatePath(`/admin/actions/${input.id}`);

    return { success: true, message: 'Action mise à jour avec succès' };
  } catch (error: any) {
    console.error('Erreur updateAction:', error);
    return { success: false, error: error.message || 'Erreur inconnue' };
  }
}
