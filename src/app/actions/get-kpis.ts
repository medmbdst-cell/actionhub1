// @ts-nocheck
'use server';

import { createClient } from '@/lib/supabase/server';

export interface TenantKPIs {
  total_actions: number;
  completed_actions: number;
  in_progress_actions: number;
  late_actions: number;
  completed_this_month: number;
  todo_count: number;
  wip_count: number;
  blocked_count: number;
  high_priority_count: number;
  medium_priority_count: number;
  low_priority_count: number;
  completion_rate: number;
  last_refreshed: string;
}

/**
 * Récupère les KPIs cachés depuis la materialized view
 * Fallback sur calcul direct si pas de données dans le cache
 */
export async function getCachedKPIs(tenantId: string): Promise<TenantKPIs | null> {
  const supabase = await createClient();

  try {
    // Appeler la fonction PostgreSQL get_tenant_kpis
    const { data, error } = await supabase.rpc('get_tenant_kpis', {
      p_tenant_id: tenantId,
    });

    if (error) {
      console.error('Error fetching cached KPIs:', error);
      throw new Error(`Failed to fetch KPIs: ${error.message}`);
    }

    // La fonction retourne un array avec un seul élément
    if (data && data.length > 0) {
      return data[0] as TenantKPIs;
    }

    return null;
  } catch (error) {
    console.error('Error in getCachedKPIs:', error);
    throw error;
  }
}

/**
 * Refresh manuel de la materialized view (pour /admin/settings ou debug)
 */
export async function refreshKPIsCache(): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();

  try {
    // Refresh CONCURRENTLY pour éviter le lock
    const { error } = await supabase.rpc('exec_sql', {
      sql: 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_tenant_kpis',
    });

    if (error) {
      console.error('Error refreshing KPIs cache:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Cache KPIs refreshed successfully' };
  } catch (error: any) {
    console.error('Error in refreshKPIsCache:', error);
    return { success: false, message: error.message || 'Unknown error' };
  }
}

/**
 * Récupère les KPIs par plan (pour analytics détaillées)
 */
export async function getPlanKPIs(tenantId: string) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('mv_plan_kpis')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('total_actions', { ascending: false });

    if (error) {
      console.error('Error fetching plan KPIs:', error);
      throw new Error(`Failed to fetch plan KPIs: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPlanKPIs:', error);
    throw error;
  }
}
