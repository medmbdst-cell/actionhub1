// @ts-nocheck
'use server';

/**
 * Server action pour mettre à jour un utilisateur
 * Permet à l'admin d'assigner une équipe à un collaborateur/responsable
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface UpdateUserInput {
  userId: string;
  equipeId: string | null;
  role?: 'admin' | 'responsable' | 'collaborateur';
}

export async function updateUser(input: UpdateUserInput) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Non authentifié' };
    }

    // Vérifier que l'utilisateur connecté est admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return { success: false, error: 'Accès refusé - Admin uniquement' };
    }

    // Vérifier que l'utilisateur cible appartient au même tenant
    const { data: targetUser } = await supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', input.userId)
      .single();

    if (!targetUser || targetUser.tenant_id !== profile.tenant_id) {
      return { success: false, error: 'Utilisateur non trouvé ou accès refusé' };
    }

    // Si une équipe est spécifiée, vérifier qu'elle appartient au tenant
    if (input.equipeId) {
      const { data: equipe } = await supabase
        .from('equipes')
        .select('id')
        .eq('id', input.equipeId)
        .eq('tenant_id', profile.tenant_id)
        .single();

      if (!equipe) {
        return { success: false, error: 'Équipe non trouvée' };
      }
    }

    // Construire les données de mise à jour
    const updateData: any = {
      equipe_id: input.equipeId,
      updated_at: new Date().toISOString(),
    };

    if (input.role) {
      updateData.role = input.role;
    }

    // Mettre à jour l'utilisateur
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', input.userId);

    if (updateError) {
      console.error('Erreur update user:', updateError);
      return { success: false, error: updateError.message };
    }

    // Revalider le cache
    revalidatePath('/admin/users');
    revalidatePath(`/admin/users/${input.userId}`);

    return { success: true, message: 'Utilisateur mis à jour avec succès' };
  } catch (error: any) {
    console.error('Erreur updateUser:', error);
    return { success: false, error: error.message || 'Erreur inconnue' };
  }
}
