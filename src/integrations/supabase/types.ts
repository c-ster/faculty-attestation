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
      attestation_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_value: string | null
          previous_value: string | null
          submission_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: string | null
          previous_value?: string | null
          submission_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_value?: string | null
          previous_value?: string | null
          submission_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attestation_logs_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          email: string
          full_name: string
          id: string
          school: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          email: string
          full_name: string
          id?: string
          school?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string
          id?: string
          school?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      self_certifications: {
        Row: {
          attested_accurate: boolean
          attested_at: string | null
          classification_details: string | null
          contains_classified: boolean
          contains_export_controlled: boolean
          contains_operational_info: boolean
          created_at: string
          export_control_details: string | null
          export_control_type: string | null
          foreign_countries: string[] | null
          foreign_details: string | null
          has_foreign_involvement: boolean
          has_prior_release: boolean
          has_sponsor_restrictions: boolean
          id: string
          operational_details: string | null
          prior_release_details: string | null
          sponsor_restriction_details: string | null
          submission_id: string
        }
        Insert: {
          attested_accurate?: boolean
          attested_at?: string | null
          classification_details?: string | null
          contains_classified: boolean
          contains_export_controlled: boolean
          contains_operational_info: boolean
          created_at?: string
          export_control_details?: string | null
          export_control_type?: string | null
          foreign_countries?: string[] | null
          foreign_details?: string | null
          has_foreign_involvement: boolean
          has_prior_release: boolean
          has_sponsor_restrictions: boolean
          id?: string
          operational_details?: string | null
          prior_release_details?: string | null
          sponsor_restriction_details?: string | null
          submission_id: string
        }
        Update: {
          attested_accurate?: boolean
          attested_at?: string | null
          classification_details?: string | null
          contains_classified?: boolean
          contains_export_controlled?: boolean
          contains_operational_info?: boolean
          created_at?: string
          export_control_details?: string | null
          export_control_type?: string | null
          foreign_countries?: string[] | null
          foreign_details?: string | null
          has_foreign_involvement?: boolean
          has_prior_release?: boolean
          has_sponsor_restrictions?: boolean
          id?: string
          operational_details?: string | null
          prior_release_details?: string | null
          sponsor_restriction_details?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "self_certifications_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          abstract: string | null
          authors: string[]
          created_at: string
          department: string
          funding_source: string | null
          id: string
          manuscript_filename: string | null
          manuscript_path: string | null
          risk_flags: string[] | null
          school: string
          sponsor: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submission_id: string
          target_venue: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          abstract?: string | null
          authors: string[]
          created_at?: string
          department: string
          funding_source?: string | null
          id?: string
          manuscript_filename?: string | null
          manuscript_path?: string | null
          risk_flags?: string[] | null
          school: string
          sponsor?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submission_id?: string
          target_venue?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          abstract?: string | null
          authors?: string[]
          created_at?: string
          department?: string
          funding_source?: string | null
          id?: string
          manuscript_filename?: string | null
          manuscript_path?: string | null
          risk_flags?: string[] | null
          school?: string
          sponsor?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submission_id?: string
          target_venue?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      // Phase 2: Workflow Control Tables
      routing_rules: {
        Row: {
          id: string
          name: string
          description: string | null
          conditions: Json
          route_to_role: Database["public"]["Enums"]["app_role"]
          priority: number
          auto_assign_user_id: string | null
          active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          conditions?: Json
          route_to_role: Database["public"]["Enums"]["app_role"]
          priority?: number
          auto_assign_user_id?: string | null
          active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          conditions?: Json
          route_to_role?: Database["public"]["Enums"]["app_role"]
          priority?: number
          auto_assign_user_id?: string | null
          active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      submission_routing: {
        Row: {
          id: string
          submission_id: string
          rule_id: string | null
          routed_to_role: Database["public"]["Enums"]["app_role"]
          routed_to_user_id: string | null
          reason: string | null
          routed_at: string
          routed_by: string | null
        }
        Insert: {
          id?: string
          submission_id: string
          rule_id?: string | null
          routed_to_role: Database["public"]["Enums"]["app_role"]
          routed_to_user_id?: string | null
          reason?: string | null
          routed_at?: string
          routed_by?: string | null
        }
        Update: {
          id?: string
          submission_id?: string
          rule_id?: string | null
          routed_to_role?: Database["public"]["Enums"]["app_role"]
          routed_to_user_id?: string | null
          reason?: string | null
          routed_at?: string
          routed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_routing_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          }
        ]
      }
      approval_workflows: {
        Row: {
          id: string
          name: string
          description: string | null
          trigger_conditions: Json
          is_default: boolean
          active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          trigger_conditions?: Json
          is_default?: boolean
          active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          trigger_conditions?: Json
          is_default?: boolean
          active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workflow_steps: {
        Row: {
          id: string
          workflow_id: string
          step_order: number
          name: string
          description: string | null
          reviewer_role: Database["public"]["Enums"]["app_role"]
          required_approvals: number
          can_skip: boolean
          skip_conditions: Json | null
          timeout_days: number | null
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          step_order: number
          name: string
          description?: string | null
          reviewer_role: Database["public"]["Enums"]["app_role"]
          required_approvals?: number
          can_skip?: boolean
          skip_conditions?: Json | null
          timeout_days?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          workflow_id?: string
          step_order?: number
          name?: string
          description?: string | null
          reviewer_role?: Database["public"]["Enums"]["app_role"]
          required_approvals?: number
          can_skip?: boolean
          skip_conditions?: Json | null
          timeout_days?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_steps_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          }
        ]
      }
      submission_workflows: {
        Row: {
          id: string
          submission_id: string
          workflow_id: string
          current_step: number
          status: Database["public"]["Enums"]["workflow_status"]
          started_at: string
          completed_at: string | null
          final_decision: Database["public"]["Enums"]["review_decision"] | null
          decision_notes: string | null
        }
        Insert: {
          id?: string
          submission_id: string
          workflow_id: string
          current_step?: number
          status?: Database["public"]["Enums"]["workflow_status"]
          started_at?: string
          completed_at?: string | null
          final_decision?: Database["public"]["Enums"]["review_decision"] | null
          decision_notes?: string | null
        }
        Update: {
          id?: string
          submission_id?: string
          workflow_id?: string
          current_step?: number
          status?: Database["public"]["Enums"]["workflow_status"]
          started_at?: string
          completed_at?: string | null
          final_decision?: Database["public"]["Enums"]["review_decision"] | null
          decision_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_workflows_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submission_workflows_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "approval_workflows"
            referencedColumns: ["id"]
          }
        ]
      }
      submission_reviews: {
        Row: {
          id: string
          submission_id: string
          workflow_instance_id: string | null
          step_id: string | null
          step_order: number
          reviewer_id: string
          assigned_at: string
          assigned_by: string | null
          decision: Database["public"]["Enums"]["review_decision"]
          recommendation: string | null
          comments: string | null
          reviewed_at: string | null
          due_date: string | null
        }
        Insert: {
          id?: string
          submission_id: string
          workflow_instance_id?: string | null
          step_id?: string | null
          step_order?: number
          reviewer_id: string
          assigned_at?: string
          assigned_by?: string | null
          decision?: Database["public"]["Enums"]["review_decision"]
          recommendation?: string | null
          comments?: string | null
          reviewed_at?: string | null
          due_date?: string | null
        }
        Update: {
          id?: string
          submission_id?: string
          workflow_instance_id?: string | null
          step_id?: string | null
          step_order?: number
          reviewer_id?: string
          assigned_at?: string
          assigned_by?: string | null
          decision?: Database["public"]["Enums"]["review_decision"]
          recommendation?: string | null
          comments?: string | null
          reviewed_at?: string | null
          due_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          }
        ]
      }
      ai_triage_assessments: {
        Row: {
          id: string
          submission_id: string
          model_version: string
          risk_score: number
          confidence_score: number
          risk_level: string
          detected_concerns: string[]
          recommended_flags: string[]
          suggested_reviewer_role: Database["public"]["Enums"]["app_role"] | null
          assessment_data: Json
          processing_time_ms: number | null
          created_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          model_version?: string
          risk_score: number
          confidence_score: number
          risk_level: string
          detected_concerns?: string[]
          recommended_flags?: string[]
          suggested_reviewer_role?: Database["public"]["Enums"]["app_role"] | null
          assessment_data?: Json
          processing_time_ms?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          model_version?: string
          risk_score?: number
          confidence_score?: number
          risk_level?: string
          detected_concerns?: string[]
          recommended_flags?: string[]
          suggested_reviewer_role?: Database["public"]["Enums"]["app_role"] | null
          assessment_data?: Json
          processing_time_ms?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_triage_assessments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: true
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          submission_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          action_url: string | null
          read: boolean
          read_at: string | null
          email_sent: boolean
          email_sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          submission_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          action_url?: string | null
          read?: boolean
          read_at?: string | null
          email_sent?: boolean
          email_sent_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          submission_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          title?: string
          message?: string
          action_url?: string | null
          read?: boolean
          read_at?: string | null
          email_sent?: boolean
          email_sent_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          }
        ]
      }
      notification_preferences: {
        Row: {
          id: string
          user_id: string
          email_on_submission: boolean
          email_on_status_change: boolean
          email_on_review_request: boolean
          email_on_decision: boolean
          email_on_reminder: boolean
          show_in_app_notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_on_submission?: boolean
          email_on_status_change?: boolean
          email_on_review_request?: boolean
          email_on_decision?: boolean
          email_on_reminder?: boolean
          show_in_app_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_on_submission?: boolean
          email_on_status_change?: boolean
          email_on_review_request?: boolean
          email_on_decision?: boolean
          email_on_reminder?: boolean
          show_in_app_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "faculty" | "chair" | "lab_director" | "vice_provost" | "admin"
      submission_status:
        | "submitted"
        | "under_review"
        | "released"
        | "not_released"
      workflow_status:
        | "pending"
        | "in_progress"
        | "approved"
        | "rejected"
        | "revision_requested"
      review_decision:
        | "pending"
        | "approved"
        | "rejected"
        | "needs_revision"
        | "abstain"
      notification_type:
        | "submission_created"
        | "status_changed"
        | "review_requested"
        | "review_completed"
        | "workflow_approved"
        | "workflow_rejected"
        | "reminder"
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
      app_role: ["faculty", "chair", "lab_director", "vice_provost", "admin"],
      submission_status: [
        "submitted",
        "under_review",
        "released",
        "not_released",
      ],
      workflow_status: [
        "pending",
        "in_progress",
        "approved",
        "rejected",
        "revision_requested",
      ],
      review_decision: [
        "pending",
        "approved",
        "rejected",
        "needs_revision",
        "abstain",
      ],
      notification_type: [
        "submission_created",
        "status_changed",
        "review_requested",
        "review_completed",
        "workflow_approved",
        "workflow_rejected",
        "reminder",
      ],
    },
  },
} as const
