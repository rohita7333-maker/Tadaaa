// AUTO-GENERATED from the live shared Supabase project (xrlmnlknymgakswsbawk).
// Do not hand-edit. Regenerate with:
//   supabase gen types typescript --project-id xrlmnlknymgakswsbawk
// Ground-truth DB shape — mobile must match web exactly.
//
// Regenerated 2026-08-17 (second pass, after `owner_invite_analytics`). The
// first pass MISSED `get_contribute_meta` and `get_invite_reveal` — both shipped
// that same day and both were being called through an `as never` cast, so tsc
// could not see the drift. Verified this time by listing every table and
// function in the live project and grepping for each one.
//
// The previous copy predated the phase-0 migration and
// was missing FOUR tables (entitlements, letters, notify_requests, push_tokens)
// and ELEVEN functions. While it was stale, `tsc` could not see `pin_hash`,
// `moderation_status` or `display_timezone`, so a screen reading them failed to
// compile while a screen WRITING a column that no longer existed would have
// compiled fine. Regenerating is what makes the typecheck gate mean anything
// about the schema again.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_audit: {
        Row: {
          action: string
          created_at: string
          id: string
          ip: string | null
          meta: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip?: string | null
          meta?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip?: string | null
          meta?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_drafts: {
        Row: {
          created_at: string
          id: string
          inputs: Json
          output: Json
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          inputs: Json
          output: Json
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          inputs?: Json
          output?: Json
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          invite_id: string | null
          kind: string
          source: string
          store_txn_id: string | null
          theme_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          invite_id?: string | null
          kind: string
          source: string
          store_txn_id?: string | null
          theme_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          invite_id?: string | null
          kind?: string
          source?: string
          store_txn_id?: string | null
          theme_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gift_purchases: {
        Row: {
          created_at: string
          expires_at: string
          gift_message: string | null
          id: string
          recipient_email: string
          redeem_token: string
          redeemed_at: string | null
          redeemed_by: string | null
          redeemed_invite_id: string | null
          sender_email: string | null
          sender_name: string | null
          status: string
          stripe_session_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          gift_message?: string | null
          id?: string
          recipient_email: string
          redeem_token?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          redeemed_invite_id?: string | null
          sender_email?: string | null
          sender_name?: string | null
          status?: string
          stripe_session_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          gift_message?: string | null
          id?: string
          recipient_email?: string
          redeem_token?: string
          redeemed_at?: string | null
          redeemed_by?: string | null
          redeemed_invite_id?: string | null
          sender_email?: string | null
          sender_name?: string | null
          status?: string
          stripe_session_id?: string
        }
        Relationships: []
      }
      invite_answers: {
        Row: {
          answer: boolean
          answered_at: string | null
          id: string
          ip_hash: string | null
          question_id: string
          user_agent: string | null
        }
        Insert: {
          answer: boolean
          answered_at?: string | null
          id?: string
          ip_hash?: string | null
          question_id: string
          user_agent?: string | null
        }
        Update: {
          answer?: boolean
          answered_at?: string | null
          id?: string
          ip_hash?: string | null
          question_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      invite_contributions: {
        Row: {
          approved: boolean
          contributor_email: string | null
          contributor_name: string
          created_at: string
          id: string
          invite_id: string
          message: string | null
          moderation_status: string | null
          photo_url: string | null
          visitor_hash: string
        }
        Insert: {
          approved?: boolean
          contributor_email?: string | null
          contributor_name: string
          created_at?: string
          id?: string
          invite_id: string
          message?: string | null
          moderation_status?: string | null
          photo_url?: string | null
          visitor_hash: string
        }
        Update: {
          approved?: boolean
          contributor_email?: string | null
          contributor_name?: string
          created_at?: string
          id?: string
          invite_id?: string
          message?: string | null
          moderation_status?: string | null
          photo_url?: string | null
          visitor_hash?: string
        }
        Relationships: []
      }
      invite_photos: {
        Row: {
          caption: string
          created_at: string | null
          id: string
          invite_id: string
          rotation_deg: number | null
          sort_order: number
          storage_path: string
        }
        Insert: {
          caption?: string
          created_at?: string | null
          id?: string
          invite_id: string
          rotation_deg?: number | null
          sort_order: number
          storage_path: string
        }
        Update: {
          caption?: string
          created_at?: string | null
          id?: string
          invite_id?: string
          rotation_deg?: number | null
          sort_order?: number
          storage_path?: string
        }
        Relationships: []
      }
      invite_questions: {
        Row: {
          attached_photo_index: number | null
          created_at: string | null
          id: string
          invite_id: string
          no_label: string
          question_text: string
          require_answer: boolean | null
          sort_order: number
          yes_label: string
        }
        Insert: {
          attached_photo_index?: number | null
          created_at?: string | null
          id?: string
          invite_id: string
          no_label?: string
          question_text: string
          require_answer?: boolean | null
          sort_order?: number
          yes_label?: string
        }
        Update: {
          attached_photo_index?: number | null
          created_at?: string | null
          id?: string
          invite_id?: string
          no_label?: string
          question_text?: string
          require_answer?: boolean | null
          sort_order?: number
          yes_label?: string
        }
        Relationships: []
      }
      invite_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          invite_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          invite_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          invite_id?: string
        }
        Relationships: []
      }
      invite_rsvps: {
        Row: {
          id: string
          invite_id: string
          name: string | null
          responded_at: string
          user_agent: string | null
          visitor_hash: string
        }
        Insert: {
          id?: string
          invite_id: string
          name?: string | null
          responded_at?: string
          user_agent?: string | null
          visitor_hash: string
        }
        Update: {
          id?: string
          invite_id?: string
          name?: string | null
          responded_at?: string
          user_agent?: string | null
          visitor_hash?: string
        }
        Relationships: []
      }
      invite_views: {
        Row: {
          id: string
          invite_id: string
          user_agent: string | null
          viewed_at: string | null
        }
        Insert: {
          id?: string
          invite_id: string
          user_agent?: string | null
          viewed_at?: string | null
        }
        Update: {
          id?: string
          invite_id?: string
          user_agent?: string | null
          viewed_at?: string | null
        }
        Relationships: []
      }
      invites: {
        Row: {
          accept_contributions: boolean
          countdown_date: string | null
          created_at: string | null
          creator_id: string
          deleted_at: string | null
          display_timezone: string | null
          enable_dodge_no: boolean | null
          events: Json
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_paid: boolean | null
          message: string
          occasion_type: string
          password_hash: string | null
          pin_hash: string | null
          pin_hint: string | null
          response_count: number | null
          reveal_type: string | null
          revealed_at: string | null
          slug: string
          status: string
          stripe_session_id: string | null
          theme: string
          title: string
          updated_at: string | null
          video_job_id: string | null
          video_status: string | null
          video_storage_path: string | null
          view_count: number | null
        }
        Insert: {
          accept_contributions?: boolean
          countdown_date?: string | null
          created_at?: string | null
          creator_id: string
          deleted_at?: string | null
          display_timezone?: string | null
          enable_dodge_no?: boolean | null
          events?: Json
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          message: string
          occasion_type?: string
          password_hash?: string | null
          pin_hash?: string | null
          pin_hint?: string | null
          response_count?: number | null
          reveal_type?: string | null
          revealed_at?: string | null
          slug: string
          status?: string
          stripe_session_id?: string | null
          theme?: string
          title: string
          updated_at?: string | null
          video_job_id?: string | null
          video_status?: string | null
          video_storage_path?: string | null
          view_count?: number | null
        }
        Update: {
          accept_contributions?: boolean
          countdown_date?: string | null
          created_at?: string | null
          creator_id?: string
          deleted_at?: string | null
          display_timezone?: string | null
          enable_dodge_no?: boolean | null
          events?: Json
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          message?: string
          occasion_type?: string
          password_hash?: string | null
          pin_hash?: string | null
          pin_hint?: string | null
          response_count?: number | null
          reveal_type?: string | null
          revealed_at?: string | null
          slug?: string
          status?: string
          stripe_session_id?: string | null
          theme?: string
          title?: string
          updated_at?: string | null
          video_job_id?: string | null
          video_status?: string | null
          video_storage_path?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      letters: {
        Row: {
          body: string
          created_at: string
          id: string
          invite_id: string
          label: string
          opened_at: string | null
          position: number
          unlock_at: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          invite_id: string
          label: string
          opened_at?: string | null
          position?: number
          unlock_at?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          invite_id?: string
          label?: string
          opened_at?: string | null
          position?: number
          unlock_at?: string | null
        }
        Relationships: []
      }
      notify_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          invite_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          invite_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          invite_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          biometric_lock: boolean
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          notify_occasions: boolean
          notify_on_answer: boolean
          notify_on_view: boolean
          occasions: string[]
          stripe_customer_id: string | null
          subscription_expires_at: string | null
          subscription_tier: string
          welcomed_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          biometric_lock?: boolean
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          notify_occasions?: boolean
          notify_on_answer?: boolean
          notify_on_view?: boolean
          occasions?: string[]
          stripe_customer_id?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: string
          welcomed_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          biometric_lock?: boolean
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          notify_occasions?: boolean
          notify_on_answer?: boolean
          notify_on_view?: boolean
          occasions?: string[]
          stripe_customer_id?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: string
          welcomed_at?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: number
        }
        Insert: {
          count?: number
          key: string
          window_start: number
        }
        Update: {
          count?: number
          key?: string
          window_start?: number
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          event_id: string
          event_type: string
          received_at: string
        }
        Insert: {
          event_id: string
          event_type: string
          received_at?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          received_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_push_token: {
        Args: { p_platform: string; p_token: string }
        Returns: Json
      }
      claim_stripe_event: {
        Args: { p_event_id: string; p_event_type: string }
        Returns: boolean
      }
      consume_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_ms: number }
        Returns: boolean
      }
      derive_invite_status: {
        Args: {
          p_countdown_date: string
          p_deleted_at: string
          p_expires_at: string
          p_is_active: boolean
        }
        Returns: string
      }
      get_contribute_meta: {
        Args: { p_slug: string }
        Returns: {
          open: boolean
          title: string
        }[]
      }
      get_invite_analytics: { Args: { p_invite_id: string }; Returns: Json }
      get_invite_by_slug: {
        Args: { p_slug: string }
        Returns: {
          accept_contributions: boolean
          countdown_date: string
          created_at: string
          enable_dodge_no: boolean
          events: Json
          expires_at: string
          id: string
          is_paid: boolean
          message: string
          occasion_type: string
          response_count: number
          reveal_type: string
          slug: string
          theme: string
          title: string
          view_count: number
        }[]
      }
      get_invite_contributions: {
        Args: { p_invite_id: string }
        Returns: {
          approved: boolean
          contributor_name: string
          created_at: string
          id: string
          invite_id: string
          message: string
          photo_url: string
        }[]
      }
      get_invite_letters: {
        Args: { p_slug: string }
        Returns: {
          body: string
          id: string
          label: string
          locked: boolean
          opened_at: string
          position: number
          unlock_at: string
        }[]
      }
      get_invite_photos: {
        Args: { p_invite_id: string }
        Returns: {
          caption: string
          created_at: string
          id: string
          invite_id: string
          rotation_deg: number
          sort_order: number
          storage_path: string
        }[]
      }
      get_invite_pin_meta: {
        Args: { p_slug: string }
        Returns: {
          has_pin: boolean
          pin_hint: string
        }[]
      }
      get_invite_questions: {
        Args: { p_invite_id: string }
        Returns: {
          attached_photo_index: number
          id: string
          invite_id: string
          no_label: string
          question_text: string
          require_answer: boolean
          sort_order: number
          yes_label: string
        }[]
      }
      get_invite_reveal: {
        Args: { p_pin: string; p_slug: string }
        Returns: Json
      }
      get_invite_state: {
        Args: { p_slug: string }
        Returns: {
          expires_at: string
          found: boolean
          is_active: boolean
        }[]
      }
      get_owner_contributions: {
        Args: { p_invite_id: string }
        Returns: {
          approved: boolean
          contributor_name: string
          created_at: string
          id: string
          invite_id: string
          message: string
          moderation_status: string
          photo_url: string
        }[]
      }
      get_reaction_counts: {
        Args: { p_slug: string }
        Returns: {
          count: number
          emoji: string
        }[]
      }
      increment_view_count: { Args: { invite_id: string }; Returns: number }
      log_invite_open: {
        Args: { p_invite_id: string; p_user_agent?: string }
        Returns: number
      }
      moderate_contribution: {
        Args: { p_id: string; p_status: string }
        Returns: Json
      }
      open_invite_letter: { Args: { p_letter_id: string }; Returns: Json }
      record_answer: {
        Args: {
          p_answer: boolean
          p_invite_id: string
          p_question_id: string
          p_user_agent?: string
        }
        Returns: Json
      }
      record_notify_request: {
        Args: { p_email: string; p_slug: string }
        Returns: Json
      }
      record_reaction: {
        Args: { p_emoji: string; p_slug: string; p_visitor_hash: string }
        Returns: Json
      }
      record_rsvp:
        | {
            Args: {
              p_invite_id: string
              p_user_agent: string
              p_visitor_hash: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_invite_id: string
              p_name?: string
              p_user_agent: string
              p_visitor_hash: string
            }
            Returns: Json
          }
      set_invite_pin: {
        Args: { p_hint?: string; p_invite_id: string; p_pin: string }
        Returns: Json
      }
      submit_contribution: {
        Args: {
          p_message: string
          p_name: string
          p_photo_url?: string
          p_slug: string
          p_visitor_hash?: string
        }
        Returns: Json
      }
      unsubscribe_user: {
        Args: { p_list: string; p_user_id: string }
        Returns: boolean
      }
      verify_invite_pin: {
        Args: { p_pin: string; p_slug: string }
        Returns: Json
      }
      verify_stripe_customer: {
        Args: { p_customer_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]
