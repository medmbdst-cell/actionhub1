export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      action_matching_issues: {
        Row: {
          action_id: string
          candidats: Json | null
          created_at: string
          id: string
          raison: string
          resolu: boolean
          resolu_le: string | null
          resolu_par: string | null
          responsable_assigne_id: string | null
          responsable_txt: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          action_id: string
          candidats?: Json | null
          created_at?: string
          id?: string
          raison: string
          resolu?: boolean
          resolu_le?: string | null
          resolu_par?: string | null
          responsable_assigne_id?: string | null
          responsable_txt: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          action_id?: string
          candidats?: Json | null
          created_at?: string
          id?: string
          raison?: string
          resolu?: boolean
          resolu_le?: string | null
          resolu_par?: string | null
          responsable_assigne_id?: string | null
          responsable_txt?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_matching_issues_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_matching_issues_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "v_actions_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_matching_issues_resolu_par_fkey"
            columns: ["resolu_par"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_matching_issues_responsable_assigne_id_fkey"
            columns: ["responsable_assigne_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_matching_issues_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      actions: {
        Row: {
          commentaire: string | null
          created_at: string
          created_by: string | null
          description: string
          echeance: string | null
          equipe_id: string | null
          event_description: string | null
          id: string
          import_batch_id: string | null
          import_date: string | null
          plan_action_nom: string | null
          plan_id: string
          priorite: Database["public"]["Enums"]["action_priorite"] | null
          responsable_id: string | null
          responsable_txt: string | null
          source_file: string | null
          source_sheet: string | null
          statut: Database["public"]["Enums"]["action_statut"]
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          echeance?: string | null
          equipe_id?: string | null
          event_description?: string | null
          id?: string
          import_batch_id?: string | null
          import_date?: string | null
          plan_action_nom?: string | null
          plan_id: string
          priorite?: Database["public"]["Enums"]["action_priorite"] | null
          responsable_id?: string | null
          responsable_txt?: string | null
          source_file?: string | null
          source_sheet?: string | null
          statut?: Database["public"]["Enums"]["action_statut"]
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          commentaire?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          echeance?: string | null
          equipe_id?: string | null
          event_description?: string | null
          id?: string
          import_batch_id?: string | null
          import_date?: string | null
          plan_action_nom?: string | null
          plan_id?: string
          priorite?: Database["public"]["Enums"]["action_priorite"] | null
          responsable_id?: string | null
          responsable_txt?: string | null
          source_file?: string | null
          source_sheet?: string | null
          statut?: Database["public"]["Enums"]["action_statut"]
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_action"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      actions_historique: {
        Row: {
          action_id: string
          ancienne_val: string | null
          champ: string
          id: string
          modifie_le: string
          nouvelle_val: string | null
          tenant_id: string
          user_id: string | null
        }
        Insert: {
          action_id: string
          ancienne_val?: string | null
          champ: string
          id?: string
          modifie_le?: string
          nouvelle_val?: string | null
          tenant_id: string
          user_id?: string | null
        }
        Update: {
          action_id?: string
          ancienne_val?: string | null
          champ?: string
          id?: string
          modifie_le?: string
          nouvelle_val?: string | null
          tenant_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_historique_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_historique_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "v_actions_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_historique_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_historique_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipe_membres: {
        Row: {
          equipe_id: string
          user_id: string
        }
        Insert: {
          equipe_id: string
          user_id: string
        }
        Update: {
          equipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipe_membres_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipe_membres_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          nom: string
          responsable_id: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          nom: string
          responsable_id?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          nom?: string
          responsable_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipes_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plans_action: {
        Row: {
          actif: boolean
          created_at: string
          created_by: string | null
          description: string | null
          fichier_path: string | null
          id: string
          nom: string
          source_type: string | null
          source_url: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          fichier_path?: string | null
          id?: string
          nom: string
          source_type?: string | null
          source_url?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          fichier_path?: string | null
          id?: string
          nom?: string
          source_type?: string | null
          source_url?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_action_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plans_action_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          actif: boolean
          created_at: string
          email: string
          equipe_id: string | null
          id: string
          nom: string
          prenom: string
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          email: string
          equipe_id?: string | null
          id: string
          nom: string
          prenom: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          email?: string
          equipe_id?: string | null
          id?: string
          nom?: string
          prenom?: string
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          actif: boolean
          created_at: string
          id: string
          logo_url: string | null
          nom: string
          slug: string
          updated_at: string
        }
        Insert: {
          actif?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          nom: string
          slug: string
          updated_at?: string
        }
        Update: {
          actif?: boolean
          created_at?: string
          id?: string
          logo_url?: string | null
          nom?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_actions_detail: {
        Row: {
          commentaire: string | null
          created_at: string | null
          description: string | null
          echeance: string | null
          echeance_status: string | null
          id: string | null
          plan_id: string | null
          plan_nom: string | null
          priorite: Database["public"]["Enums"]["action_priorite"] | null
          responsable_display: string | null
          responsable_id: string | null
          responsable_nom: string | null
          statut: Database["public"]["Enums"]["action_statut"] | null
          tenant_id: string | null
          tenant_nom: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_action"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_responsable_id_fkey"
            columns: ["responsable_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      v_matching_issues_details: {
        Row: {
          action_description: string | null
          action_id: string | null
          candidats: Json | null
          created_at: string | null
          id: string | null
          plan_id: string | null
          plan_nom: string | null
          raison: string | null
          resolu: boolean | null
          resolu_le: string | null
          resolu_par_nom: string | null
          resolu_par_prenom: string | null
          responsable_nom: string | null
          responsable_prenom: string | null
          responsable_txt: string | null
          source_file: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "action_matching_issues_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_matching_issues_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "v_actions_detail"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_matching_issues_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans_action"
            referencedColumns: ["id"]
          },
        ]
      }
      v_stats_tenant: {
        Row: {
          a_faire: number | null
          bloquees: number | null
          en_cours: number | null
          en_retard: number | null
          taux_completion: number | null
          tenant_id: string | null
          terminees: number | null
          total: number | null
          urgentes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "actions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_tenant_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      action_priorite: "haute" | "moyen" | "faible"
      action_statut: "todo" | "wip" | "blocked" | "done"
      user_role: "super_admin" | "admin" | "responsable" | "collaborateur"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      action_priorite: ["haute", "moyen", "faible"],
      action_statut: ["todo", "wip", "blocked", "done"],
      user_role: ["super_admin", "admin", "responsable", "collaborateur"],
    },
  },
} as const
