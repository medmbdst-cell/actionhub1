// @ts-nocheck
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
 * Récupérer tous les tenants
 */
export async function getTenants() {
  const { supabase } = await checkSuperAdmin();

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Erreur lors de la récupération des tenants: ${error.message}`);
  }

  return data;
}

/**
 * Récupérer un tenant par ID
 */
export async function getTenantById(id: string) {
  const { supabase } = await checkSuperAdmin();

  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Erreur lors de la récupération du tenant: ${error.message}`);
  }

  return data;
}

/**
 * Créer un nouveau tenant
 */
export async function createTenant(formData: FormData) {
  const { supabase } = await checkSuperAdmin();

  const nom = formData.get('nom') as string;
  const slug = formData.get('slug') as string;
  const logo_url = formData.get('logo_url') as string | null;

  // Validation
  if (!nom || !slug) {
    return { error: 'Le nom et le slug sont requis' };
  }

  // Vérifier que le slug est unique
  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) {
    return { error: 'Ce slug est déjà utilisé' };
  }

  // Créer le tenant
  const { data, error } = await supabase
    .from('tenants')
    .insert({
      nom,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      logo_url: logo_url || null,
      actif: true,
    })
    .select()
    .single();

  if (error) {
    return { error: `Erreur lors de la création: ${error.message}` };
  }

  revalidatePath('/super-admin');
  revalidatePath('/super-admin/tenants');

  return { data, error: null };
}

/**
 * Mettre à jour un tenant
 */
export async function updateTenant(id: string, formData: FormData) {
  const { supabase } = await checkSuperAdmin();

  const nom = formData.get('nom') as string;
  const slug = formData.get('slug') as string;
  const logo_url = formData.get('logo_url') as string | null;
  const actif = formData.get('actif') === 'true';

  // Validation
  if (!nom || !slug) {
    return { error: 'Le nom et le slug sont requis' };
  }

  // Vérifier que le slug est unique (sauf pour ce tenant)
  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', slug)
    .neq('id', id)
    .single();

  if (existing) {
    return { error: 'Ce slug est déjà utilisé par un autre tenant' };
  }

  // Mettre à jour le tenant
  const { data, error } = await supabase
    .from('tenants')
    .update({
      nom,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      logo_url: logo_url || null,
      actif,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { error: `Erreur lors de la mise à jour: ${error.message}` };
  }

  revalidatePath('/super-admin');
  revalidatePath('/super-admin/tenants');
  revalidatePath(`/super-admin/tenants/${id}`);

  return { data, error: null };
}

/**
 * Activer/Désactiver un tenant
 */
export async function toggleTenantStatus(id: string, actif: boolean) {
  const { supabase } = await checkSuperAdmin();

  const { data, error } = await supabase
    .from('tenants')
    .update({ actif })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return { error: `Erreur lors de la mise à jour: ${error.message}` };
  }

  revalidatePath('/super-admin');
  revalidatePath('/super-admin/tenants');
  revalidatePath(`/super-admin/tenants/${id}`);

  return { data, error: null };
}

/**
 * Supprimer un tenant (avec confirmation côté client)
 * ⚠️ Attention: cela supprime aussi tous les utilisateurs, plans et actions liés
 */
export async function deleteTenant(id: string) {
  const { supabase } = await checkSuperAdmin();

  // Compter les utilisateurs et actions liés
  const { count: usersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', id);

  const { count: actionsCount } = await supabase
    .from('actions')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', id);

  if (usersCount && usersCount > 0) {
    return {
      error: `Impossible de supprimer : ce tenant a ${usersCount} utilisateur(s). Désactivez-le plutôt.`,
    };
  }

  if (actionsCount && actionsCount > 0) {
    return {
      error: `Impossible de supprimer : ce tenant a ${actionsCount} action(s). Désactivez-le plutôt.`,
    };
  }

  // Supprimer le tenant
  const { error } = await supabase.from('tenants').delete().eq('id', id);

  if (error) {
    return { error: `Erreur lors de la suppression: ${error.message}` };
  }

  revalidatePath('/super-admin');
  revalidatePath('/super-admin/tenants');

  return { error: null };
}

/**
 * Récupérer les statistiques d'un tenant
 */
export async function getTenantStats(tenantId: string) {
  const { supabase } = await checkSuperAdmin();

  // Nombre d'utilisateurs
  const { count: usersCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('actif', true);

  // Nombre de plans
  const { count: plansCount } = await supabase
    .from('plans_action')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('actif', true);

  // Nombre d'actions
  const { count: actionsCount } = await supabase
    .from('actions')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  // Actions terminées
  const { count: completedCount } = await supabase
    .from('actions')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('statut', 'done');

  return {
    users: usersCount || 0,
    plans: plansCount || 0,
    actions: actionsCount || 0,
    completed: completedCount || 0,
    completionRate:
      actionsCount && actionsCount > 0
        ? Math.round(((completedCount || 0) / actionsCount) * 100)
        : 0,
  };
}
