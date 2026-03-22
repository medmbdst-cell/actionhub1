'use server';

/**
 * Server actions pour les collaborateurs
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Vérifie que l'utilisateur courant est un collaborateur
 */
async function checkCollaborateur() {
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

  if (!profile || profile.role !== 'collaborateur') {
    throw new Error('Accès non autorisé : collaborateur requis');
  }

  return { supabase, user, tenantId: profile.tenant_id!, equipeId: profile.equipe_id };
}

/**
 * Récupérer MES actions (assignées au collaborateur)
 */
export async function getMyActions() {
  try {
    const { supabase, user, tenantId } = await checkCollaborateur();

    const { data: actions, error } = await supabase
      .from('actions')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('responsable_id', user.id) // Seules MES actions
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération mes actions:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: actions || [] };
  } catch (error) {
    console.error('Erreur récupération mes actions:', error);
    return {
      success: false,
      error: 'Erreur lors de la récupération de vos actions',
      data: [],
    };
  }
}

/**
 * Mettre à jour le statut d'UNE DE MES actions
 */
export async function updateMyActionStatut(params: {
  actionId: string;
  statut: 'todo' | 'wip' | 'blocked' | 'done';
  commentaire?: string;
}) {
  try {
    const { supabase, user, tenantId } = await checkCollaborateur();

    const { data, error } = await supabase
      .from('actions')
      .update({
        statut: params.statut,
        commentaire: params.commentaire || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.actionId)
      .eq('responsable_id', user.id) // ⚠️ CRITIQUE: Seules SES actions
      .eq('tenant_id', tenantId)
      .select()
      .single();

    if (error) {
      console.error('Erreur mise à jour action:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/collaborateur/actions/${params.actionId}`);
    revalidatePath('/collaborateur');
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
 * Récupérer mon équipe (si assigné)
 */
export async function getMyTeam() {
  try {
    const { supabase, tenantId, equipeId } = await checkCollaborateur();

    if (!equipeId) {
      return { success: true, data: null };
    }

    const { data: equipe, error } = await supabase
      .from('equipes')
      .select(`
        *,
        responsable:profiles!equipes_responsable_id_fkey(id, nom, prenom, email)
      `)
      .eq('id', equipeId)
      .eq('tenant_id', tenantId)
      .single();

    if (error) {
      console.error('Erreur récupération équipe:', error);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data: equipe };
  } catch (error) {
    console.error('Erreur récupération équipe:', error);
    return {
      success: false,
      error: 'Erreur lors de la récupération de votre équipe',
      data: null,
    };
  }
}
