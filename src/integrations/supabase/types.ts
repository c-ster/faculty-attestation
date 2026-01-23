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
      // Phase 2: Notifications table
      notifications: {
        Row: {
          id: string
          user_id: string
          submission_id: string | null
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          status: Database["public"]["Enums"]["notification_status"]
          sent_at: string | null
          error_message: string | null
          email_to: string | null
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          submission_id?: string | null
          type: Database["public"]["Enums"]["notification_type"]
          title: string
          message: string
          status?: Database["public"]["Enums"]["notification_status"]
          sent_at?: string | null
          error_message?: string | null
          email_to?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          submission_id?: string | null
          type?: Database["public"]["Enums"]["notification_type"]
          title?: string
          message?: string
          status?: Database["public"]["Enums"]["notification_status"]
          sent_at?: string | null
          error_message?: string | null
          email_to?: string | null
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      // Phase 2: Reviews table
      reviews: {
        Row: {
          id: string
          submission_id: string
          reviewer_id: string
          workflow_step: Database["public"]["Enums"]["workflow_step"]
          decision: Database["public"]["Enums"]["review_decision"]
          reviewed_at: string | null
          review_notes: string | null
          revision_instructions: string | null
          assigned_at: string
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          reviewer_id: string
          workflow_step: Database["public"]["Enums"]["workflow_step"]
          decision?: Database["public"]["Enums"]["review_decision"]
          reviewed_at?: string | null
          review_notes?: string | null
          revision_instructions?: string | null
          assigned_at?: string
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          reviewer_id?: string
          workflow_step?: Database["public"]["Enums"]["workflow_step"]
          decision?: Database["public"]["Enums"]["review_decision"]
          reviewed_at?: string | null
          review_notes?: string | null
          revision_instructions?: string | null
          assigned_at?: string
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      // Phase 2: Review Comments table
      review_comments: {
        Row: {
          id: string
          submission_id: string
          review_id: string | null
          user_id: string
          comment: string
          is_internal: boolean
          parent_comment_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          submission_id: string
          review_id?: string | null
          user_id: string
          comment: string
          is_internal?: boolean
          parent_comment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          submission_id?: string
          review_id?: string | null
          user_id?: string
          comment?: string
          is_internal?: boolean
          parent_comment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_comments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "review_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      // Phase 2: Routing Rules table
      routing_rules: {
        Row: {
          id: string
          department: string | null
          school: string | null
          has_risk_flags: boolean | null
          risk_flag_types: string[] | null
          assign_to_role: Database["public"]["Enums"]["app_role"]
          assign_to_user_id: string | null
          priority: number
          is_active: boolean
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          department?: string | null
          school?: string | null
          has_risk_flags?: boolean | null
          risk_flag_types?: string[] | null
          assign_to_role: Database["public"]["Enums"]["app_role"]
          assign_to_user_id?: string | null
          priority?: number
          is_active?: boolean
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          department?: string | null
          school?: string | null
          has_risk_flags?: boolean | null
          risk_flag_types?: string[] | null
          assign_to_role?: Database["public"]["Enums"]["app_role"]
          assign_to_user_id?: string | null
          priority?: number
          is_active?: boolean
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
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
          // Phase 2 workflow fields
          current_step: Database["public"]["Enums"]["workflow_step"]
          assigned_to: string | null
          workflow_started_at: string | null
          workflow_completed_at: string | null
          is_expedited: boolean
          review_due_date: string | null
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
          // Phase 2 workflow fields
          current_step?: Database["public"]["Enums"]["workflow_step"]
          assigned_to?: string | null
          workflow_started_at?: string | null
          workflow_completed_at?: string | null
          is_expedited?: boolean
          review_due_date?: string | null
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
          // Phase 2 workflow fields
          current_step?: Database["public"]["Enums"]["workflow_step"]
          assigned_to?: string | null
          workflow_started_at?: string | null
          workflow_completed_at?: string | null
          is_expedited?: boolean
          review_due_date?: string | null
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
      // Phase 2 functions
      get_next_workflow_step: {
        Args: { current: Database["public"]["Enums"]["workflow_step"] }
        Returns: Database["public"]["Enums"]["workflow_step"]
      }
      advance_workflow: {
        Args: {
          _submission_id: string
          _decision: Database["public"]["Enums"]["review_decision"]
          _notes?: string
        }
        Returns: Database["public"]["Tables"]["submissions"]["Row"]
      }
      auto_assign_reviewer: {
        Args: { _submission_id: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "faculty" | "chair" | "lab_director" | "vice_provost" | "admin"
      submission_status:
        | "submitted"
        | "under_review"
        | "released"
        | "not_released"
      // Phase 2 enums
      workflow_step:
        | "submitted"
        | "chair_review"
        | "vice_provost_review"
        | "completed"
      review_decision:
        | "pending"
        | "approved"
        | "rejected"
        | "returned_for_revision"
      notification_type:
        | "submission_received"
        | "review_assigned"
        | "review_completed"
        | "revision_requested"
        | "final_decision"
        | "reminder"
      notification_status:
        | "pending"
        | "sent"
        | "failed"
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
      // Phase 2 enums
      workflow_step: [
        "submitted",
        "chair_review",
        "vice_provost_review",
        "completed",
      ],
      review_decision: [
        "pending",
        "approved",
        "rejected",
        "returned_for_revision",
      ],
      notification_type: [
        "submission_received",
        "review_assigned",
        "review_completed",
        "revision_requested",
        "final_decision",
        "reminder",
      ],
      notification_status: [
        "pending",
        "sent",
        "failed",
      ],
    },
  },
} as const
