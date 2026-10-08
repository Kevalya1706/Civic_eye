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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      contractors: {
        Row: {
          active: boolean
          company_name: string | null
          created_at: string
          department: Database["public"]["Enums"]["department_type"]
          email: string | null
          emergency_contact: string | null
          engineer_id: string | null
          id: string
          lead_engineer_name: string | null
          name: string
          phone: string | null
          user_id: string | null
          ward: string
          ward_id: string | null
        }
        Insert: {
          active?: boolean
          company_name?: string | null
          created_at?: string
          department: Database["public"]["Enums"]["department_type"]
          email?: string | null
          emergency_contact?: string | null
          engineer_id?: string | null
          id?: string
          lead_engineer_name?: string | null
          name: string
          phone?: string | null
          user_id?: string | null
          ward: string
          ward_id?: string | null
        }
        Update: {
          active?: boolean
          company_name?: string | null
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"]
          email?: string | null
          emergency_contact?: string | null
          engineer_id?: string | null
          id?: string
          lead_engineer_name?: string | null
          name?: string
          phone?: string | null
          user_id?: string | null
          ward?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractors_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      department_scores: {
        Row: {
          avg_resolution_hours: number | null
          department: Database["public"]["Enums"]["department_type"]
          efficiency_score: number
          id: string
          resolved_tickets: number
          total_tickets: number
          updated_at: string
        }
        Insert: {
          avg_resolution_hours?: number | null
          department: Database["public"]["Enums"]["department_type"]
          efficiency_score?: number
          id?: string
          resolved_tickets?: number
          total_tickets?: number
          updated_at?: string
        }
        Update: {
          avg_resolution_hours?: number | null
          department?: Database["public"]["Enums"]["department_type"]
          efficiency_score?: number
          id?: string
          resolved_tickets?: number
          total_tickets?: number
          updated_at?: string
        }
        Relationships: []
      }
      enforcement_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          ticket_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          ticket_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enforcement_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      press_releases: {
        Row: {
          headline: string | null
          id: string
          pdf_url: string | null
          sent_at: string
          sent_to: string[]
          social_cost: number
          summary: string | null
          ticket_id: string
          ward: string | null
        }
        Insert: {
          headline?: string | null
          id?: string
          pdf_url?: string | null
          sent_at?: string
          sent_to?: string[]
          social_cost: number
          summary?: string | null
          ticket_id: string
          ward?: string | null
        }
        Update: {
          headline?: string | null
          id?: string
          pdf_url?: string | null
          sent_at?: string
          sent_to?: string[]
          social_cost?: number
          summary?: string | null
          ticket_id?: string
          ward?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "press_releases_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          badge: string
          civic_points: number
          created_at: string
          display_name: string
          email: string | null
          id: string
          total_reported: number
          total_verified: number
          trust_score: number
          updated_at: string
          user_id: string
        }
        Insert: {
          badge?: string
          civic_points?: number
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          total_reported?: number
          total_verified?: number
          trust_score?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          badge?: string
          civic_points?: number
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          total_reported?: number
          total_verified?: number
          trust_score?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          address: string
          admin_reviewed_at: string | null
          ai_analysis_notes: Json | null
          ai_audit_status: string
          ai_integrity_score: number | null
          assigned_at: string | null
          assigned_contractor_id: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          city: string | null
          created_at: string
          crew_dispatched_at: string | null
          department: Database["public"]["Enums"]["department_type"]
          description: string
          escalation_level: number
          fixed_photo_url: string | null
          full_precise_address: string | null
          id: string
          image_hash: string | null
          image_url: string | null
          last_nudged_at: string | null
          lat: number
          lng: number
          near_school_or_hospital: boolean
          neighborhood: string | null
          nudge_count: number
          photo_url: string | null
          precision_tier: Database["public"]["Enums"]["precision_tier"] | null
          press_released_at: string | null
          priority_score: number
          resolution_image_url: string | null
          resolved_at: string | null
          sla_deadline: string | null
          social_cost: number
          status: Database["public"]["Enums"]["ticket_status"]
          traffic_density: number | null
          upvotes: number
          user_id: string
          user_name: string
          user_trust_score: number
          ward: string | null
          ward_id: string | null
        }
        Insert: {
          address?: string
          admin_reviewed_at?: string | null
          ai_analysis_notes?: Json | null
          ai_audit_status?: string
          ai_integrity_score?: number | null
          assigned_at?: string | null
          assigned_contractor_id?: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          city?: string | null
          created_at?: string
          crew_dispatched_at?: string | null
          department: Database["public"]["Enums"]["department_type"]
          description?: string
          escalation_level?: number
          fixed_photo_url?: string | null
          full_precise_address?: string | null
          id?: string
          image_hash?: string | null
          image_url?: string | null
          last_nudged_at?: string | null
          lat: number
          lng: number
          near_school_or_hospital?: boolean
          neighborhood?: string | null
          nudge_count?: number
          photo_url?: string | null
          precision_tier?: Database["public"]["Enums"]["precision_tier"] | null
          press_released_at?: string | null
          priority_score?: number
          resolution_image_url?: string | null
          resolved_at?: string | null
          sla_deadline?: string | null
          social_cost?: number
          status?: Database["public"]["Enums"]["ticket_status"]
          traffic_density?: number | null
          upvotes?: number
          user_id: string
          user_name?: string
          user_trust_score?: number
          ward?: string | null
          ward_id?: string | null
        }
        Update: {
          address?: string
          admin_reviewed_at?: string | null
          ai_analysis_notes?: Json | null
          ai_audit_status?: string
          ai_integrity_score?: number | null
          assigned_at?: string | null
          assigned_contractor_id?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          city?: string | null
          created_at?: string
          crew_dispatched_at?: string | null
          department?: Database["public"]["Enums"]["department_type"]
          description?: string
          escalation_level?: number
          fixed_photo_url?: string | null
          full_precise_address?: string | null
          id?: string
          image_hash?: string | null
          image_url?: string | null
          last_nudged_at?: string | null
          lat?: number
          lng?: number
          near_school_or_hospital?: boolean
          neighborhood?: string | null
          nudge_count?: number
          photo_url?: string | null
          precision_tier?: Database["public"]["Enums"]["precision_tier"] | null
          press_released_at?: string | null
          priority_score?: number
          resolution_image_url?: string | null
          resolved_at?: string | null
          sla_deadline?: string | null
          social_cost?: number
          status?: Database["public"]["Enums"]["ticket_status"]
          traffic_density?: number | null
          upvotes?: number
          user_id?: string
          user_name?: string
          user_trust_score?: number
          ward?: string | null
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_assigned_contractor_id_fkey"
            columns: ["assigned_contractor_id"]
            isOneToOne: false
            referencedRelation: "contractors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          department: Database["public"]["Enums"]["department_type"] | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          ward: string | null
        }
        Insert: {
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"] | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          ward?: string | null
        }
        Update: {
          created_at?: string
          department?: Database["public"]["Enums"]["department_type"] | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          ward?: string | null
        }
        Relationships: []
      }
      wards: {
        Row: {
          city: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          city?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      webauthn_challenges: {
        Row: {
          challenge: string
          created_at: string
          email: string | null
          expires_at: string
          id: string
          type: string
          user_id: string | null
        }
        Insert: {
          challenge: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          type: string
          user_id?: string | null
        }
        Update: {
          challenge?: string
          created_at?: string
          email?: string | null
          expires_at?: string
          id?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      webauthn_credentials: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calc_social_cost: { Args: { _ticket_id: string }; Returns: number }
      get_my_email: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "citizen" | "officer" | "hod" | "commissioner"
      department_type:
        | "Road Dept"
        | "Electricity"
        | "Water & Sewage"
        | "Waste Management"
        | "Drainage"
      precision_tier: "high" | "standard" | "low"
      ticket_category:
        | "Pothole"
        | "Pole Fault"
        | "Water Leak"
        | "Waste Overflow"
        | "Drainage Block"
        | "Road Damage"
      ticket_status: "Open" | "In Progress" | "Resolved" | "Suspicious"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["citizen", "officer", "hod", "commissioner"],
      department_type: [
        "Road Dept",
        "Electricity",
        "Water & Sewage",
        "Waste Management",
        "Drainage",
      ],
      precision_tier: ["high", "standard", "low"],
      ticket_category: [
        "Pothole",
        "Pole Fault",
        "Water Leak",
        "Waste Overflow",
        "Drainage Block",
        "Road Damage",
      ],
      ticket_status: ["Open", "In Progress", "Resolved", "Suspicious"],
    },
  },
} as const
