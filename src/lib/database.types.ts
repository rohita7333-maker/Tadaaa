// AUTO-GENERATED from the live shared Supabase project (xrlmnlknymgakswsbawk).
// Do not hand-edit. Regenerate with:
//   supabase gen types typescript --project-id xrlmnlknymgakswsbawk
// Ground-truth DB shape — mobile must match web exactly.

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
        Relationships: [
          {
            foreignKeyName: "gift_purchases_redeemed_invite_id_fkey"
            columns: ["redeemed_invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "invite_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "invite_questions"
            referencedColumns: ["id"]
          },
        ]
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
          photo_url?: string | null
          visitor_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_contributions_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "invite_photos_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "invite_questions_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "invite_rsvps_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "invite_views_invite_id_fkey"
            columns: ["invite_id"]
            isOneToOne: false
            referencedRelation: "invites"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accept_contributions: boolean
          countdown_date: string | null
          created_at: string | null
          creator_id: string
          deleted_at: string | null
          enable_dodge_no: boolean | null
          events: Json
          expires_at: string | null
          id: string
          is_active: boolean | null
          is_paid: boolean | null
          message: string
          occasion_type: string
          response_count: number | null
          reveal_type: string | null
          revealed_at: string | null
          slug: string
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
          enable_dodge_no?: boolean | null
          events?: Json
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          message: string
          occasion_type?: string
          response_count?: number | null
          reveal_type?: string | null
          revealed_at?: string | null
          slug: string
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
          enable_dodge_no?: boolean | null
          events?: Json
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          is_paid?: boolean | null
          message?: string
          occasion_type?: string
          response_count?: number | null
          reveal_type?: string | null
          revealed_at?: string | null
          slug?: string
          stripe_session_id?: string | null
          theme?: string
          title?: string
          updated_at?: string | null
          video_job_id?: string | null
          video_status?: string | null
          video_storage_path?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          notify_occasions: boolean
          notify_on_answer: boolean
          notify_on_view: boolean
          stripe_customer_id: string | null
          subscription_expires_at: string | null
          subscription_tier: string
          welcomed_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          notify_occasions?: boolean
          notify_on_answer?: boolean
          notify_on_view?: boolean
          stripe_customer_id?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: string
          welcomed_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          notify_occasions?: boolean
          notify_on_answer?: boolean
          notify_on_view?: boolean
          stripe_customer_id?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: string
          welcomed_at?: string | null
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
      claim_stripe_event: {
        Args: { p_event_id: string; p_event_type: string }
        Returns: boolean
      }
      consume_rate_limit: {
        Args: { p_key: string; p_limit: number; p_window_ms: number }
        Returns: boolean
      }
      increment_view_count: { Args: { invite_id: string }; Returns: number }
      record_answer: {
        Args: {
          p_answer: boolean
          p_invite_id: string
          p_question_id: string
          p_user_agent?: string
        }
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
      unsubscribe_user: {
        Args: { p_list: string; p_user_id: string }
        Returns: boolean
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
