'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/types';

/**
 * Vérifie que l'utilisateur courant est un super_admin
 */
async function checkSuperAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'super_admin') {
    throw new Error('Accès non autorisé : super admin requis');
  }

  return { supabase, user };
}

/**
 * Récupérer tous les utilisateurs (cross-tenant)
 */
export async function getAllUsers() {
  const { supabase } = await checkSuperAdmin();

  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
      *,
      tenants:tenant_id (
        id,
        nom,
        slug
      )
    `
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(
      `Erreur lors de la récupération des utilisateurs: ${error.message}`
    );
  }

  return data;
}

/**
 * Récupérer les utilisateurs d'un tenant spécifique
 */
export async function getUsersByTenant(tenantId: string) {
  const { supabase } = await checkSuperAdmin();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(
      `Erreur lors de la récupération des utilisateurs: ${error.message}`
    );
  }

  return data;
}

/**
 * Créer un nouvel utilisateur (admin pour un tenant)
 * Note: Cette fonction crée un compte Supabase Auth + profil
 */
export async function createUserForTenant(formData: FormData) {
  const { supabase } = await checkSuperAdmin();

  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const nom = formData.get('nom') as string;
  const prenom = formData.get('prenom') as string;
  const tenant_id = formData.get('tenant_id') as string;
  const role = (formData.get('role') as UserRole) || 'admin';

  // Validation
  if (!email || !password || !nom || !prenom) {
    return { error: 'Tous les champs sont requis' };
  }

  if (!tenant_id && role !== 'super_admin') {
    return { error: 'Un tenant est requis pour les rôles non super_admin' };
  }

  if (password.length < 8) {
    return { error: 'Le mot de passe doit contenir au moins 8 caractères' };
  }

  // Créer l'utilisateur dans Supabase Auth
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmer l'email
      user_metadata: {
        nom,
        prenom,
        tenant_id: tenant_id || null,
        role,
      },
    });

  if (authError) {
    return { error: `Erreur lors de la création: ${authError.message}` };
  }

  // Le profil sera créé automatiquement via le trigger handle_new_user()
  // On attend un peu pour s'assurer que le trigger s'est exécuté
  await new Promise((resolve) => setTimeout(resolve, 1000));

  revalidatePath('/super-admin/users');
  revalidatePath('/super-admin');
  if (tenant_id) {
    revalidatePath(`/super-admin/tenants/${tenant_id}`);
  }

  return { data: authData, error: null };
}

/**
 * Mettre à jour un utilisateur
 */
export async function updateUser(userId: string, formData: FormData) {
  const { supabase } = await checkSuperAdmin();

  const nom = formData.get('nom') as string;
  const prenom = formData.get('prenom') as string;
  const role = formData.get('role') as UserRole;
  const actif = formData.get('actif') === 'true';

  // Validation
  if (!nom || !prenom || !role) {
    return { error: 'Tous les champs sont requis' };
  }

  // Mettre à jour le profil
  const { data, error } = await supabase
    .from('profiles')
    .update({
      nom,
      prenom,
      role,
      actif,
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return { error: `Erreur lors de la mise à jour: ${error.message}` };
  }

  revalidatePath('/super-admin/users');
  revalidatePath('/super-admin');

  return { data, error: null };
}

/**
 * Activer/Désactiver un utilisateur
 */
export async function toggleUserStatus(userId: string, actif: boolean) {
  const { supabase } = await checkSuperAdmin();

  const { data, error } = await supabase
    .from('profiles')
    .update({ actif })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    return { error: `Erreur lors de la mise à jour: ${error.message}` };
  }

  revalidatePath('/super-admin/users');
  revalidatePath('/super-admin');

  return { data, error: null };
}

/**
 * Réinitialiser le mot de passe d'un utilisateur
 */
export async function resetUserPassword(userId: string, newPassword: string) {
  const { supabase } = await checkSuperAdmin();

  if (newPassword.length < 8) {
    return { error: 'Le mot de passe doit contenir au moins 8 caractères' };
  }

  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    return {
      error: `Erreur lors de la réinitialisation: ${error.message}`,
    };
  }

  return { data, error: null };
}

/**
 * Supprimer un utilisateur
 * ⚠️ Attention: supprime l'utilisateur de auth.users ET du profil
 */
export async function deleteUser(userId: string) {
  const { supabase } = await checkSuperAdmin();

  // Vérifier si l'utilisateur a des actions assignées
  const { count } = await supabase
    .from('actions')
    .select('*', { count: 'exact', head: true })
    .eq('responsable_id', userId);

  if (count && count > 0) {
    return {
      error: `Impossible de supprimer : cet utilisateur a ${count} action(s) assignée(s). Désactivez-le plutôt.`,
    };
  }

  // Supprimer l'utilisateur de Supabase Auth
  // Le profil sera supprimé automatiquement via ON DELETE CASCADE
  const { error } = await supabase.auth.admin.deleteUser(userId);

  if (error) {
    return { error: `Erreur lors de la suppression: ${error.message}` };
  }

  revalidatePath('/super-admin/users');
  revalidatePath('/super-admin');

  return { error: null };
}

/**
 * Récupérer les statistiques des utilisateurs
 */
export async function getUsersStats() {
  const { supabase } = await checkSuperAdmin();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, role, tenant_id, actif')
    .neq('role', 'super_admin');

  const stats = {
    total: profiles?.length || 0,
    active: profiles?.filter((p) => p.actif).length || 0,
    byRole: {
      admin: profiles?.filter((p) => p.role === 'admin').length || 0,
      responsable:
        profiles?.filter((p) => p.role === 'responsable').length || 0,
      collaborateur:
        profiles?.filter((p) => p.role === 'collaborateur').length || 0,
    },
  };

  return stats;
}

/**
 * Vérifie que l'utilisateur courant est un admin de tenant
 */
async function checkTenantAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    throw new Error('Accès non autorisé : admin requis');
  }

  return { supabase, user, tenantId: profile.tenant_id };
}

/**
 * Créer un utilisateur pour le tenant courant (admin tenant uniquement)
 */
export async function createTenantUser(params: {
  email: string;
  prenom: string;
  nom: string;
  role: 'admin' | 'responsable' | 'collaborateur';
  equipe_id?: string;
}) {
  try {
    // Vérifier les permissions avec le client normal
    const { tenantId } = await checkTenantAdmin();

    // Utiliser le client admin pour créer l'utilisateur
    const { createAdminClient } = await import('@/lib/supabase/server');
    const supabaseAdmin = await createAdminClient();

    // 1. Créer le compte Auth (SANS trigger, on créera le profil manuellement)
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: params.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        prenom: params.prenom,
        nom: params.nom,
      },
    });

    if (authError) {
      console.error('Erreur création auth:', authError);
      return { success: false, error: authError.message };
    }

    if (!authUser.user) {
      return { success: false, error: 'Utilisateur non créé' };
    }

    // 2. Créer le profil manuellement (le trigger est désactivé)
    const { error: insertError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        tenant_id: tenantId,
        email: params.email,
        prenom: params.prenom,
        nom: params.nom,
        role: params.role,
        equipe_id: params.equipe_id || null,
        actif: true,
      });

    if (insertError) {
      console.error('Erreur création profile:', insertError);
      // Supprimer l'utilisateur auth si le profil échoue
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return { success: false, error: insertError.message };
    }

    // 3. Récupérer le profil créé
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authUser.user.id)
      .single();

    if (profileError) {
      console.error('Erreur récupération profile:', profileError);
      return { success: false, error: profileError.message };
    }

    revalidatePath('/admin/users');
    return { success: true, data: profile };
  } catch (error) {
    console.error('Erreur création utilisateur:', error);
    return { success: false, error: 'Erreur lors de la création de l\'utilisateur' };
  }
}

/**
 * Récupérer les équipes du tenant courant
 */
export async function getTenantTeams() {
  try {
    const { supabase, tenantId } = await checkTenantAdmin();

    const { data: teams, error } = await supabase
      .from('equipes')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('nom', { ascending: true });

    if (error) {
      console.error('Erreur récupération équipes:', error);
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: teams || [] };
  } catch (error) {
    console.error('Erreur récupération équipes:', error);
    return { success: false, error: 'Erreur lors de la récupération des équipes', data: [] };
  }
}
