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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          target_id: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          target_id?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          target_id?: string | null
        }
        Relationships: []
      }
      advertisements: {
        Row: {
          created_at: string
          duration_seconds: number
          headline: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          placement: string
          sort_order: number
          target_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number
          headline?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          placement: string
          sort_order?: number
          target_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number
          headline?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          placement?: string
          sort_order?: number
          target_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      catalog_sync_jobs: {
        Row: {
          changes_page: number
          changes_since: string
          enabled: boolean
          end_date: string
          export_date: string | null
          export_offset: number
          id: string
          import_complete: boolean
          imported_count: number
          last_error: string | null
          last_success_at: string | null
          lock_until: string | null
          page: number
          pending_ids: number[]
          start_date: string
          updated_at: string
        }
        Insert: {
          changes_page?: number
          changes_since?: string
          enabled?: boolean
          end_date?: string
          export_date?: string | null
          export_offset?: number
          id: string
          import_complete?: boolean
          imported_count?: number
          last_error?: string | null
          last_success_at?: string | null
          lock_until?: string | null
          page?: number
          pending_ids?: number[]
          start_date?: string
          updated_at?: string
        }
        Update: {
          changes_page?: number
          changes_since?: string
          enabled?: boolean
          end_date?: string
          export_date?: string | null
          export_offset?: number
          id?: string
          import_complete?: boolean
          imported_count?: number
          last_error?: string | null
          last_success_at?: string | null
          lock_until?: string | null
          page?: number
          pending_ids?: number[]
          start_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      catalog_sync_queue: {
        Row: {
          attempts: number
          media_type: string
          synced_at: string | null
          tmdb_id: number
        }
        Insert: {
          attempts?: number
          media_type: string
          synced_at?: string | null
          tmdb_id: number
        }
        Update: {
          attempts?: number
          media_type?: string
          synced_at?: string | null
          tmdb_id?: number
        }
        Relationships: []
      }
      licensed_videos: {
        Row: {
          catalog_id: string | null
          created_at: string
          episode: number | null
          id: string
          media_type: string
          path: string
          quality: string
          season: number | null
          server_id: string
          source_type: string
          title: string | null
          tmdb_id: number
        }
        Insert: {
          catalog_id?: string | null
          created_at?: string
          episode?: number | null
          id?: string
          media_type: string
          path: string
          quality?: string
          season?: number | null
          server_id: string
          source_type?: string
          title?: string | null
          tmdb_id: number
        }
        Update: {
          catalog_id?: string | null
          created_at?: string
          episode?: number | null
          id?: string
          media_type?: string
          path?: string
          quality?: string
          season?: number | null
          server_id?: string
          source_type?: string
          title?: string | null
          tmdb_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "licensed_videos_catalog_id_fkey"
            columns: ["catalog_id"]
            isOneToOne: false
            referencedRelation: "media_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licensed_videos_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "server_config"
            referencedColumns: ["id"]
          },
        ]
      }
      media_catalog: {
        Row: {
          backdrop_path: string | null
          created_at: string
          id: string
          is_published: boolean
          media_type: string
          metadata: Json | null
          overview: string
          poster_path: string | null
          release_date: string | null
          title: string
          tmdb_id: number
          updated_at: string
          vote_average: number
        }
        Insert: {
          backdrop_path?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          media_type: string
          metadata?: Json | null
          overview?: string
          poster_path?: string | null
          release_date?: string | null
          title: string
          tmdb_id: number
          updated_at?: string
          vote_average?: number
        }
        Update: {
          backdrop_path?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          media_type?: string
          metadata?: Json | null
          overview?: string
          poster_path?: string | null
          release_date?: string | null
          title?: string
          tmdb_id?: number
          updated_at?: string
          vote_average?: number
        }
        Relationships: []
      }
      party_join_attempts: {
        Row: {
          attempts: number
          user_id: string
          window_start: string
        }
        Insert: {
          attempts?: number
          user_id: string
          window_start?: string
        }
        Update: {
          attempts?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      party_members: {
        Row: {
          code: string
          display_name: string
          last_seen_at: string
          user_id: string
        }
        Insert: {
          code: string
          display_name: string
          last_seen_at?: string
          user_id: string
        }
        Update: {
          code?: string
          display_name?: string
          last_seen_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_members_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "watch_parties"
            referencedColumns: ["code"]
          },
        ]
      }
      party_messages: {
        Row: {
          code: string
          created_at: string
          display_name: string
          id: string
          text: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          display_name: string
          id?: string
          text: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          display_name?: string
          id?: string
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_messages_code_fkey"
            columns: ["code"]
            isOneToOne: false
            referencedRelation: "watch_parties"
            referencedColumns: ["code"]
          },
        ]
      }
      party_secrets: {
        Row: {
          code: string
          pin_hash: string
        }
        Insert: {
          code: string
          pin_hash: string
        }
        Update: {
          code?: string
          pin_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "party_secrets_code_fkey"
            columns: ["code"]
            isOneToOne: true
            referencedRelation: "watch_parties"
            referencedColumns: ["code"]
          },
        ]
      }
      payments: {
        Row: {
          amount_idr: number
          created_at: string
          id: string
          plan: string
          status: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_idr: number
          created_at?: string
          id?: string
          plan: string
          status?: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_idr?: number
          created_at?: string
          id?: string
          plan?: string
          status?: string
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_banned: boolean
          membership_tier: Database["public"]["Enums"]["membership_tier"]
          premium_until: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          is_banned?: boolean
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          premium_until?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_banned?: boolean
          membership_tier?: Database["public"]["Enums"]["membership_tier"]
          premium_until?: string | null
        }
        Relationships: []
      }
      server_config: {
        Row: {
          base_url: string
          created_at: string
          id: string
          is_active: boolean
          last_checked_at: string | null
          last_latency_ms: number | null
          name: string
          premium_only: boolean
          priority: number
        }
        Insert: {
          base_url: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          last_latency_ms?: number | null
          name: string
          premium_only?: boolean
          priority?: number
        }
        Update: {
          base_url?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_checked_at?: string | null
          last_latency_ms?: number | null
          name?: string
          premium_only?: boolean
          priority?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          background_color: string | null
          bg_image_url: string | null
          card_color: string | null
          description: string
          favicon_url: string | null
          id: number
          keywords: string
          logo_url: string | null
          movie_embed_template: string
          og_image_url: string | null
          primary_color: string | null
          site_name: string
          tv_embed_template: string
          updated_at: string
        }
        Insert: {
          background_color?: string | null
          bg_image_url?: string | null
          card_color?: string | null
          description?: string
          favicon_url?: string | null
          id?: number
          keywords?: string
          logo_url?: string | null
          movie_embed_template?: string
          og_image_url?: string | null
          primary_color?: string | null
          site_name?: string
          tv_embed_template?: string
          updated_at?: string
        }
        Update: {
          background_color?: string | null
          bg_image_url?: string | null
          card_color?: string | null
          description?: string
          favicon_url?: string | null
          id?: number
          keywords?: string
          logo_url?: string | null
          movie_embed_template?: string
          og_image_url?: string | null
          primary_color?: string | null
          site_name?: string
          tv_embed_template?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      watch_parties: {
        Row: {
          code: string
          created_at: string
          episode: number | null
          host_id: string
          is_active: boolean
          last_active_at: string
          media_type: string
          playback_action: string
          playback_time: number
          playback_updated_at: string
          season: number | null
          title: string | null
          tmdb_id: number
          visibility: string
        }
        Insert: {
          code: string
          created_at?: string
          episode?: number | null
          host_id: string
          is_active?: boolean
          last_active_at?: string
          media_type: string
          playback_action?: string
          playback_time?: number
          playback_updated_at?: string
          season?: number | null
          title?: string | null
          tmdb_id: number
          visibility?: string
        }
        Update: {
          code?: string
          created_at?: string
          episode?: number | null
          host_id?: string
          is_active?: boolean
          last_active_at?: string
          media_type?: string
          playback_action?: string
          playback_time?: number
          playback_updated_at?: string
          season?: number | null
          title?: string | null
          tmdb_id?: number
          visibility?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string
          id: string
          media_type: string
          poster_path: string | null
          title: string
          tmdb_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type: string
          poster_path?: string | null
          title: string
          tmdb_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          poster_path?: string | null
          title?: string
          tmdb_id?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_catalog_sync_job: {
        Args: { job_id: string }
        Returns: {
          changes_page: number
          changes_since: string
          enabled: boolean
          end_date: string
          export_date: string | null
          export_offset: number
          id: string
          import_complete: boolean
          imported_count: number
          last_error: string | null
          last_success_at: string | null
          lock_until: string | null
          page: number
          pending_ids: number[]
          start_date: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "catalog_sync_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_watch_party: {
        Args: {
          p_code: string
          p_episode: number
          p_name: string
          p_pin: string
          p_season: number
          p_title: string
          p_tmdb_id: number
          p_type: string
          p_visibility: string
        }
        Returns: string
      }
      get_watch_party_by_code: {
        Args: { p_code: string }
        Returns: {
          code: string
          created_at: string
          episode: number | null
          host_id: string
          is_active: boolean
          last_active_at: string
          media_type: string
          playback_action: string
          playback_time: number
          playback_updated_at: string
          season: number | null
          title: string | null
          tmdb_id: number
          visibility: string
        }[]
        SetofOptions: {
          from: "*"
          to: "watch_parties"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_party_member: { Args: { p_code: string }; Returns: boolean }
      is_premium: { Args: { _user_id: string }; Returns: boolean }
      join_watch_party: {
        Args: { p_code: string; p_name: string; p_pin: string }
        Returns: boolean
      }
      list_public_watch_parties: {
        Args: never
        Returns: {
          code: string
          episode: number
          media_type: string
          season: number
          title: string
          tmdb_id: number
          viewers: number
        }[]
      }
      party_heartbeat: { Args: { p_code: string }; Returns: boolean }
      title_available: {
        Args: { _media_type: string; _tmdb_id: number }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      membership_tier: "free" | "premium"
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
      app_role: ["admin", "moderator", "user"],
      membership_tier: ["free", "premium"],
    },
  },
} as const
