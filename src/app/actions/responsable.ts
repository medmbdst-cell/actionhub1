'use server';

/**
 * Server actions pour les responsables d'équipe
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Vérifie que l'utilisateur courant est un responsable
 */
async function checkResponsable() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id, equipe_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'responsable') {
    throw new Error('Accès non autorisé : responsable requis');
  }

  if (!profile.equipe_id) {
    throw new Error('Aucune équipe assignée');
  }

  return { supabase, user, tenantId: profile.tenant_id!, equipeId: profile.equipe_id };
}

/**
 * Récupérer les actions de l'équipe du responsable
 */
export async function getTeamActions() {
  try {
    const { supabase, tenantId, equipeId } = await checkResponsable();

    const { data: actions, error } = await supabase
      .from('actions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('equipe_id', equipeId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération actions équipe:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: actions || [] };
  } catch (error) {
    console.error('Erreur récupération actions équipe:', error);
    return {
      success: false,
      error: 'Erreur lors de la récupération des actions',
      data: [],
    };
  }
}

/**
 * Mettre à jour le statut d'une action de l'équipe
 */
export async function updateActionStatut(params: {
  actionId: string;
  statut: 'todo' | 'wip' | 'blocked' | 'done';
  commentaire?: string;
}) {
  try {
    const { supabase, tenantId, equipeId } = await checkResponsable();

    const { data, error } = await supabase
      .from('actions')
      .update({
        statut: params.statut,
        commentaire: params.commentaire || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.actionId)
      .eq('equipe_id', equipeId) // Sécurité : action de SON équipe
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Erreur mise à jour action:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/responsable/actions/${params.actionId}`);
    revalidatePath('/responsable');
    return { success: true, data };
  } catch (error) {
    console.error('Erreur mise à jour action:', error);
    return {
      success: false,
      error: 'Erreur lors de la mise à jour de l\'action',
    };
  }
}

/**
 * Récupérer les membres de l'équipe
 */
export async function getTeamMembers() {
  try {
    const { supabase, tenantId, equipeId } = await checkResponsable();

    const { data: members, error } = await supabase
      .from('profiles')
      .select('id, email, nom, prenom, role, actif')
      .eq('tenant_id', tenantId)
      .eq('equipe_id', equipeId)
      .order('nom', { ascending: true });

    if (error) {
      console.error('Erreur récupération membres:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: members || [] };
  } catch (error) {
    console.error('Erreur récupération membres:', error);
    return {
      success: false,
      error: 'Erreur lors de la récupération des membres',
      data: [],
    };
  }
}
