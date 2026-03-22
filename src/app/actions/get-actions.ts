// @ts-nocheck
'use server';

import { createClient } from '@/lib/supabase/server';

export interface GetActionsParams {
  tenantId: string;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string[];
  priority?: string[];
  responsable?: string;
  planId?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  lateOnly?: boolean;
}

export interface GetActionsResult {
  actions: any[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Récupère les actions avec pagination, tri et filtres server-side
 */
export async function getActions(params: GetActionsParams): Promise<GetActionsResult> {
  const {
    tenantId,
    page = 1,
    pageSize = 25,
    search,
    status,
    priority,
    responsable,
    planId,
    sortField = 'created_at',
    sortDirection = 'desc',
    lateOnly = false,
  } = params;

  const supabase = await createClient();

  // Construction de la query de base
  let query = supabase
    .from('actions')
    .select(
      `
      id,
      description,
      event_description,
      statut,
      echeance,
      priorite,
      responsable_txt,
      commentaire,
      created_at,
      plan:plans_action!inner(id, nom)
    `,
      { count: 'exact' }
    )
    .eq('tenant_id', tenantId);

  // Filtre par plan
  if (planId) {
    query = query.eq('plan_id', planId);
  }

  // Recherche full-text
  if (search && search.trim()) {
    const searchTerm = search.trim();
    query = query.or(
      `description.ilike.%${searchTerm}%,event_description.ilike.%${searchTerm}%,responsable_txt.ilike.%${searchTerm}%`
    );
  }

  // Filtre par statut
  if (status && status.length > 0) {
    query = query.in('statut', status);
  }

  // Filtre par priorité
  if (priority && priority.length > 0) {
    query = query.in('priorite', priority);
  }

  // Filtre par responsable
  if (responsable) {
    query = query.ilike('responsable_txt', `%${responsable}%`);
  }

  // Filtre actions en retard (échéance dépassée ET non terminée)
  if (lateOnly) {
    const today = new Date().toISOString().split('T')[0];
    query = query
      .lt('echeance', today)
      .not('statut', 'in', '(done,100%)');
  }

  // Tri
  const validSortFields = [
    'description',
    'statut',
    'echeance',
    'priorite',
    'responsable_txt',
    'created_at',
  ];

  if (validSortFields.includes(sortField)) {
    query = query.order(sortField, {
      ascending: sortDirection === 'asc',
      nullsFirst: false,
    });
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  // Exécution
  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching actions:', error);
    throw new Error(`Failed to fetch actions: ${error.message}`);
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    actions: data || [],
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Récupère les valeurs uniques pour les filtres (dropdowns)
 */
export async function getActionFilterOptions(tenantId: string) {
  const supabase = await createClient();

  // Récupérer toutes les actions pour extraire les valeurs uniques
  const { data: actions } = await supabase
    .from('actions')
    .select('statut, priorite, responsable_txt')
    .eq('tenant_id', tenantId);

  if (!actions) {
    return {
      statuts: [],
      priorites: [],
      responsables: [],
    };
  }

  // Extraire les valeurs uniques
  const statuts = [...new Set(actions.map((a) => a.statut).filter(Boolean))].sort();
  const priorites = [...new Set(actions.map((a) => a.priorite).filter(Boolean))].sort();
  const responsables = [
    ...new Set(actions.map((a) => a.responsable_txt).filter(Boolean)),
  ].sort();

  return {
    statuts,
    priorites,
    responsables,
  };
}
