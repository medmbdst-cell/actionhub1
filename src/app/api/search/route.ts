import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export interface SearchResult {
  id: string;
  type: 'action' | 'plan' | 'user';
  title: string;
  subtitle?: string;
  url: string;
  metadata?: Record<string, any>;
}

/**
 * API de recherche globale
 * GET /api/search?q=query&limit=10
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const limit = parseInt(searchParams.get('limit') || '10');

  if (!query || query.trim().length < 2) {
    return NextResponse.json(
      { error: 'Query must be at least 2 characters' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Récupérer l'utilisateur et son tenant
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const tenantId = profile.tenant_id;
  const searchTerm = query.trim();

  try {
    // Recherche parallèle dans actions, plans et users
    const [actionsResults, plansResults, usersResults] = await Promise.all([
      searchActions(supabase, tenantId, searchTerm, limit),
      searchPlans(supabase, tenantId, searchTerm, limit),
      searchUsers(supabase, tenantId, searchTerm, limit, profile.role),
    ]);

    // Combiner et limiter les résultats
    const results: SearchResult[] = [
      ...actionsResults,
      ...plansResults,
      ...usersResults,
    ].slice(0, limit);

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: error.message || 'Search failed' },
      { status: 500 }
    );
  }
}

/**
 * Recherche dans les actions
 */
async function searchActions(
  supabase: any,
  tenantId: string,
  query: string,
  limit: number
): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('actions')
    .select('id, description, event_description, responsable_txt, statut, plan:plans_action(nom)')
    .eq('tenant_id', tenantId)
    .or(
      `description.ilike.%${query}%,event_description.ilike.%${query}%,responsable_txt.ilike.%${query}%`
    )
    .limit(limit);

  if (error) {
    console.error('Error searching actions:', error);
    return [];
  }

  return (data || []).map((action) => ({
    id: action.id,
    type: 'action' as const,
    title: action.description,
    subtitle: `${action.plan?.nom || 'Plan non défini'} • ${action.responsable_txt || 'Non assigné'} • ${action.statut}`,
    url: `/admin/actions/${action.id}`,
    metadata: {
      plan: action.plan?.nom,
      responsable: action.responsable_txt,
      statut: action.statut,
    },
  }));
}

/**
 * Recherche dans les plans
 */
async function searchPlans(
  supabase: any,
  tenantId: string,
  query: string,
  limit: number
): Promise<SearchResult[]> {
  const { data, error } = await supabase
    .from('plans_action')
    .select('id, nom, description, source_type')
    .eq('tenant_id', tenantId)
    .or(`nom.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(limit);

  if (error) {
    console.error('Error searching plans:', error);
    return [];
  }

  return (data || []).map((plan) => ({
    id: plan.id,
    type: 'plan' as const,
    title: plan.nom,
    subtitle: plan.description || `Plan d'action`,
    url: `/admin/plans/${plan.id}`,
    metadata: {
      source: plan.source_type,
    },
  }));
}

/**
 * Recherche dans les utilisateurs (admins uniquement)
 */
async function searchUsers(
  supabase: any,
  tenantId: string,
  query: string,
  limit: number,
  userRole: string
): Promise<SearchResult[]> {
  // Seulement les admins peuvent rechercher des utilisateurs
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nom, email, role')
    .eq('tenant_id', tenantId)
    .or(`nom.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(limit);

  if (error) {
    console.error('Error searching users:', error);
    return [];
  }

  return (data || []).map((user) => ({
    id: user.id,
    type: 'user' as const,
    title: user.nom || user.email,
    subtitle: `${user.email} • ${user.role}`,
    url: `/admin/users/${user.id}`,
    metadata: {
      email: user.email,
      role: user.role,
    },
  }));
}
