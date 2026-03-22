/**
 * Application Types
 */

import type { Database } from './database';

// Table types
export type Tenant = Database['public']['Tables']['tenants']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Equipe = Database['public']['Tables']['equipes']['Row'];
export type PlanAction = Database['public']['Tables']['plans_action']['Row'];
export type Action = Database['public']['Tables']['actions']['Row'];
export type ActionHistorique = Database['public']['Tables']['actions_historique']['Row'];

// View types
export type ActionDetail = Database['public']['Views']['v_actions_detail']['Row'];
export type StatsTenant = Database['public']['Views']['v_stats_tenant']['Row'];

// Enum types
export type UserRole = Database['public']['Enums']['user_role'];
export type ActionStatut = Database['public']['Enums']['action_statut'];
export type ActionPriorite = Database['public']['Enums']['action_priorite'];

// Auth context
export interface AuthContext {
  user: Profile | null;
  tenant: Tenant | null;
  isLoading: boolean;
}

// Import/Export types
export interface ImportedAction {
  source: string;
  action: string;
  responsable: string;
  echeance: Date | null;
  statut: ActionStatut;
  priorite: ActionPriorite | null;
  _raw: Record<string, any>;
}

export interface ColumnMapping {
  action?: string;
  responsable?: string;
  echeance?: string;
  statut?: string;
  priorite?: string;
}

export interface ImportSource {
  id: number;
  name: string;
  rows: Record<string, any>[];
  mapping: ColumnMapping;
}
