// @ts-nocheck
'use server';

/**
 * Server Actions pour la gestion des équipes
 * Accessible aux admins de tenant
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Helper pour vérifier si l'utilisateur est admin
async function checkAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Non authentifié');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    throw new Error('Accès non autorisé');
  }

  return { user, tenantId: profile.tenant_id! };
}

/**
 * Récupérer toutes les équipes du tenant
 */
export async function getTeams() {
  const { tenantId } = await checkAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('equipes')
    .select(`
      *,
      responsable:profiles!equipes_responsable_id_fkey(id, nom, prenom, email)
    `)
    .eq('tenant_id', tenantId)
    .order('nom');

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Récupérer une équipe par son ID
 */
export async function getTeamById(id: string) {
  const { tenantId } = await checkAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('equipes')
    .select(`
      *,
      responsable:profiles!equipes_responsable_id_fkey(id, nom, prenom, email),
      membres:equipe_membres(
        profile_id,
        profiles(id, nom, prenom, email, role)
      )
    `)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Créer une nouvelle équipe (depuis un objet)
 */
export async function createTeam(params: { nom: string; description?: string; responsable_id?: string }) {
  try {
    const { tenantId } = await checkAdmin();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('equipes')
      .insert({
        tenant_id: tenantId,
        nom: params.nom,
        description: params.description || null,
        responsable_id: params.responsable_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur création équipe:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/teams');
    return { success: true, data };
  } catch (error) {
    console.error('Erreur création équipe:', error);
    return { success: false, error: 'Erreur lors de la création de l\'équipe' };
  }
}

/**
 * Créer une nouvelle équipe (depuis FormData - pour compatibilité)
 */
export async function createTeamFromForm(formData: FormData) {
  const nom = formData.get('nom') as string;
  const description = formData.get('description') as string;
  const responsableId = formData.get('responsable_id') as string;

  return createTeam({
    nom,
    description,
    responsable_id: responsableId,
  });
}

/**
 * Mettre à jour une équipe
 */
export async function updateTeam(id: string, formData: FormData) {
  const { tenantId } = await checkAdmin();
  const supabase = await createClient();

  const nom = formData.get('nom') as string;
  const description = formData.get('description') as string;
  const responsableId = formData.get('responsable_id') as string;

  const { data, error } = await supabase
    .from('equipes')
    .update({
      nom,
      description,
      responsable_id: responsableId || null,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/admin/teams');
  return data;
}

/**
 * Supprimer une équipe
 */
export async function deleteTeam(id: string) {
  const { tenantId } = await checkAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('equipes')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/teams');
  return { success: true };
}

/**
 * Ajouter un membre à une équipe
 */
export async function addTeamMember(equipeId: string, profileId: string) {
  await checkAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('equipe_membres')
    .insert({
      equipe_id: equipeId,
      profile_id: profileId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath('/admin/teams');
  return data;
}

/**
 * Retirer un membre d'une équipe
 */
export async function removeTeamMember(equipeId: string, profileId: string) {
  await checkAdmin();
  const supabase = await createClient();

  const { error } = await supabase
    .from('equipe_membres')
    .delete()
    .eq('equipe_id', equipeId)
    .eq('profile_id', profileId);

  if (error) throw new Error(error.message);

  revalidatePath('/admin/teams');
  return { success: true };
}

/**
 * Obtenir les statistiques des équipes
 */
export async function getTeamsStats() {
  const { tenantId } = await checkAdmin();
  const supabase = await createClient();

  const [{ count: totalEquipes }, { count: totalMembres }] = await Promise.all([
    supabase.from('equipes').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase
      .from('equipe_membres')
      .select('equipes!inner(tenant_id)', { count: 'exact', head: true })
      .eq('equipes.tenant_id', tenantId),
  ]);

  return {
    total_equipes: totalEquipes || 0,
    total_membres: totalMembres || 0,
  };
}
