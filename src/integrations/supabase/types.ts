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
          category: Database["public"]["Enums"]["ticket_category"]
          city: string | null
          created_at: string
          crew_dispatched_at: string | null
          department: Database["public"]["Enums"]["department_type"]
          description: string
          fixed_photo_url: string | null
          full_precise_address: string | null
          id: string
          image_hash: string | null
          last_nudged_at: string | null
          lat: number
          lng: number
          near_school_or_hospital: boolean
          neighborhood: string | null
          nudge_count: number
          photo_url: string | null
          precision_tier: Database["public"]["Enums"]["precision_tier"] | null
          priority_score: number
          resolved_at: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          upvotes: number
          user_id: string
          user_name: string
          user_trust_score: number
        }
        Insert: {
          address?: string
          admin_reviewed_at?: string | null
          category: Database["public"]["Enums"]["ticket_category"]
          city?: string | null
          created_at?: string
          crew_dispatched_at?: string | null
          department: Database["public"]["Enums"]["department_type"]
          description?: string
          fixed_photo_url?: string | null
          full_precise_address?: string | null
          id?: string
          image_hash?: string | null
          last_nudged_at?: string | null
          lat: number
          lng: number
          near_school_or_hospital?: boolean
          neighborhood?: string | null
          nudge_count?: number
          photo_url?: string | null
          precision_tier?: Database["public"]["Enums"]["precision_tier"] | null
          priority_score?: number
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          upvotes?: number
          user_id: string
          user_name?: string
          user_trust_score?: number
        }
        Update: {
          address?: string
          admin_reviewed_at?: string | null
          category?: Database["public"]["Enums"]["ticket_category"]
          city?: string | null
          created_at?: string
          crew_dispatched_at?: string | null
          department?: Database["public"]["Enums"]["department_type"]
          description?: string
          fixed_photo_url?: string | null
          full_precise_address?: string | null
          id?: string
          image_hash?: string | null
          last_nudged_at?: string | null
          lat?: number
          lng?: number
          near_school_or_hospital?: boolean
          neighborhood?: string | null
          nudge_count?: number
          photo_url?: string | null
          precision_tier?: Database["public"]["Enums"]["precision_tier"] | null
          priority_score?: number
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          upvotes?: number
          user_id?: string
          user_name?: string
          user_trust_score?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
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
