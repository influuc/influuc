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
      accounts: {
        Row: {
          auth_user_id: string
          created_at: string
          email: string
          id: string
          status: string
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          created_at?: string
          email: string
          id?: string
          status?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          created_at?: string
          email?: string
          id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string | null
          actor: string | null
          created_at: string
          founder_id: string | null
          id: string
          meta: Json | null
          target_id: string | null
          target_table: string | null
        }
        Insert: {
          action?: string | null
          actor?: string | null
          created_at?: string
          founder_id?: string | null
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Update: {
          action?: string | null
          actor?: string | null
          created_at?: string
          founder_id?: string | null
          id?: string
          meta?: Json | null
          target_id?: string | null
          target_table?: string | null
        }
        Relationships: []
      }
      brain_fact_versions: {
        Row: {
          change_reason: string | null
          changed_by_job: string | null
          confidence: number
          content: string
          created_at: string
          fact_id: string
          founder_id: string
          id: string
          status: Database["public"]["Enums"]["fact_status"]
          structured: Json | null
        }
        Insert: {
          change_reason?: string | null
          changed_by_job?: string | null
          confidence: number
          content: string
          created_at?: string
          fact_id: string
          founder_id: string
          id?: string
          status: Database["public"]["Enums"]["fact_status"]
          structured?: Json | null
        }
        Update: {
          change_reason?: string | null
          changed_by_job?: string | null
          confidence?: number
          content?: string
          created_at?: string
          fact_id?: string
          founder_id?: string
          id?: string
          status?: Database["public"]["Enums"]["fact_status"]
          structured?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "brain_fact_versions_fact_id_fkey"
            columns: ["fact_id"]
            isOneToOne: false
            referencedRelation: "brain_facts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brain_fact_versions_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_facts: {
        Row: {
          confidence: number
          content: string
          created_at: string
          created_by_job: string | null
          embedding: string | null
          founder_id: string
          id: string
          key: string | null
          layer: Database["public"]["Enums"]["brain_layer_type"]
          salience: number | null
          source_kind: string | null
          status: Database["public"]["Enums"]["fact_status"]
          structured: Json | null
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          confidence?: number
          content: string
          created_at?: string
          created_by_job?: string | null
          embedding?: string | null
          founder_id: string
          id?: string
          key?: string | null
          layer: Database["public"]["Enums"]["brain_layer_type"]
          salience?: number | null
          source_kind?: string | null
          status?: Database["public"]["Enums"]["fact_status"]
          structured?: Json | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          confidence?: number
          content?: string
          created_at?: string
          created_by_job?: string | null
          embedding?: string | null
          founder_id?: string
          id?: string
          key?: string | null
          layer?: Database["public"]["Enums"]["brain_layer_type"]
          salience?: number | null
          source_kind?: string | null
          status?: Database["public"]["Enums"]["fact_status"]
          structured?: Json | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brain_facts_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      brain_layers: {
        Row: {
          confidence: number
          founder_id: string
          id: string
          layer: Database["public"]["Enums"]["brain_layer_type"]
          summary: string | null
          updated_at: string
        }
        Insert: {
          confidence?: number
          founder_id: string
          id?: string
          layer: Database["public"]["Enums"]["brain_layer_type"]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          confidence?: number
          founder_id?: string
          id?: string
          layer?: Database["public"]["Enums"]["brain_layer_type"]
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brain_layers_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      content_items: {
        Row: {
          angle: string | null
          brain_snapshot: Json | null
          created_at: string
          founder_id: string
          generated_by_model: string | null
          id: string
          opportunity_id: string | null
          platform: Database["public"]["Enums"]["target_platform"]
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          angle?: string | null
          brain_snapshot?: Json | null
          created_at?: string
          founder_id: string
          generated_by_model?: string | null
          id?: string
          opportunity_id?: string | null
          platform: Database["public"]["Enums"]["target_platform"]
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          angle?: string | null
          brain_snapshot?: Json | null
          created_at?: string
          founder_id?: string
          generated_by_model?: string | null
          id?: string
          opportunity_id?: string | null
          platform?: Database["public"]["Enums"]["target_platform"]
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_items_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      content_variants: {
        Row: {
          body: string
          chosen: boolean | null
          content_item_id: string
          created_at: string
          founder_id: string
          id: string
          rank: number | null
        }
        Insert: {
          body: string
          chosen?: boolean | null
          content_item_id: string
          created_at?: string
          founder_id: string
          id?: string
          rank?: number | null
        }
        Update: {
          body?: string
          chosen?: boolean | null
          content_item_id?: string
          created_at?: string
          founder_id?: string
          id?: string
          rank?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_variants_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_variants_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      event_consumers: {
        Row: {
          consumer: string
          event_id: string
          processed_at: string
        }
        Insert: {
          consumer: string
          event_id: string
          processed_at?: string
        }
        Update: {
          consumer?: string
          event_id?: string
          processed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_consumers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          founder_id: string | null
          id: string
          payload: Json | null
          processed_at: string | null
          type: string
        }
        Insert: {
          created_at?: string
          founder_id?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          type: string
        }
        Update: {
          created_at?: string
          founder_id?: string | null
          id?: string
          payload?: Json | null
          processed_at?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      extraction_jobs: {
        Row: {
          attempts: number
          created_at: string
          error: string | null
          founder_id: string
          id: string
          raw_source_id: string | null
          status: Database["public"]["Enums"]["job_status"]
          trigger_run_id: string | null
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          error?: string | null
          founder_id: string
          id?: string
          raw_source_id?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          trigger_run_id?: string | null
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          error?: string | null
          founder_id?: string
          id?: string
          raw_source_id?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          trigger_run_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "extraction_jobs_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extraction_jobs_raw_source_id_fkey"
            columns: ["raw_source_id"]
            isOneToOne: false
            referencedRelation: "raw_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      fact_provenance: {
        Row: {
          created_at: string
          evidence: string | null
          fact_id: string
          founder_id: string
          id: string
          raw_source_id: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string
          evidence?: string | null
          fact_id: string
          founder_id: string
          id?: string
          raw_source_id?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string
          evidence?: string | null
          fact_id?: string
          founder_id?: string
          id?: string
          raw_source_id?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fact_provenance_fact_id_fkey"
            columns: ["fact_id"]
            isOneToOne: false
            referencedRelation: "brain_facts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_provenance_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fact_provenance_raw_source_id_fkey"
            columns: ["raw_source_id"]
            isOneToOne: false
            referencedRelation: "raw_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_jobs: {
        Row: {
          created_at: string
          error: string | null
          founder_id: string | null
          id: string
          payload: Json | null
          task: string | null
          trigger_run_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          founder_id?: string | null
          id?: string
          payload?: Json | null
          task?: string | null
          trigger_run_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          founder_id?: string | null
          id?: string
          payload?: Json | null
          task?: string | null
          trigger_run_id?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          enabled: boolean | null
          key: string
          rules: Json | null
          updated_at: string
        }
        Insert: {
          enabled?: boolean | null
          key: string
          rules?: Json | null
          updated_at?: string
        }
        Update: {
          enabled?: boolean | null
          key?: string
          rules?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      founders: {
        Row: {
          account_id: string
          created_at: string
          display_name: string | null
          headline: string | null
          id: string
          onboarding_state: string
          primary_locale: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          display_name?: string | null
          headline?: string | null
          id?: string
          onboarding_state?: string
          primary_locale?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          display_name?: string | null
          headline?: string | null
          id?: string
          onboarding_state?: string
          primary_locale?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "founders_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      guardrail_reviews: {
        Row: {
          brand_fit_score: number | null
          confidence: number | null
          content_item_id: string
          founder_id: string
          id: string
          model: string | null
          policy_flags: Json | null
          reasons: string | null
          reviewed_at: string
          verdict: Database["public"]["Enums"]["guardrail_verdict"]
        }
        Insert: {
          brand_fit_score?: number | null
          confidence?: number | null
          content_item_id: string
          founder_id: string
          id?: string
          model?: string | null
          policy_flags?: Json | null
          reasons?: string | null
          reviewed_at?: string
          verdict: Database["public"]["Enums"]["guardrail_verdict"]
        }
        Update: {
          brand_fit_score?: number | null
          confidence?: number | null
          content_item_id?: string
          founder_id?: string
          id?: string
          model?: string | null
          policy_flags?: Json | null
          reasons?: string | null
          reviewed_at?: string
          verdict?: Database["public"]["Enums"]["guardrail_verdict"]
        }
        Relationships: [
          {
            foreignKeyName: "guardrail_reviews_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardrail_reviews_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_signals: {
        Row: {
          created_at: string
          founder_id: string
          id: string
          kind: Database["public"]["Enums"]["signal_kind"]
          payload: Json | null
          processed: boolean | null
          ref_id: string | null
          ref_table: string | null
        }
        Insert: {
          created_at?: string
          founder_id: string
          id?: string
          kind: Database["public"]["Enums"]["signal_kind"]
          payload?: Json | null
          processed?: boolean | null
          ref_id?: string | null
          ref_table?: string | null
        }
        Update: {
          created_at?: string
          founder_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["signal_kind"]
          payload?: Json | null
          processed?: boolean | null
          ref_id?: string | null
          ref_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_signals_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      metrics_daily: {
        Row: {
          audience_total: number | null
          authority_index: number | null
          day: string
          founder_id: string
          founder_minutes_spent: number | null
          id: string
          opportunities_accepted: number | null
          opportunities_surfaced: number | null
          posts_published: number | null
        }
        Insert: {
          audience_total?: number | null
          authority_index?: number | null
          day: string
          founder_id: string
          founder_minutes_spent?: number | null
          id?: string
          opportunities_accepted?: number | null
          opportunities_surfaced?: number | null
          posts_published?: number | null
        }
        Update: {
          audience_total?: number | null
          authority_index?: number | null
          day?: string
          founder_id?: string
          founder_minutes_spent?: number | null
          id?: string
          opportunities_accepted?: number | null
          opportunities_surfaced?: number | null
          posts_published?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "metrics_daily_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: string | null
          created_at: string
          founder_id: string
          id: string
          kind: string
          payload: Json | null
          read_at: string | null
          sent_at: string | null
        }
        Insert: {
          channel?: string | null
          created_at?: string
          founder_id: string
          id?: string
          kind: string
          payload?: Json | null
          read_at?: string | null
          sent_at?: string | null
        }
        Update: {
          channel?: string | null
          created_at?: string
          founder_id?: string
          id?: string
          kind?: string
          payload?: Json | null
          read_at?: string | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      operating_preferences: {
        Row: {
          approval_threshold: number | null
          autopilot_enabled: boolean
          autopilot_threshold: number | null
          content_goals: string[]
          extra_notes: string | null
          focus_topics: string[]
          founder_id: string
          max_autopilot_per_day: number | null
          mode: Database["public"]["Enums"]["autonomy_mode"]
          preferred_platforms:
            | Database["public"]["Enums"]["target_platform"][]
            | null
          prohibited_topics: string[] | null
          tone: string | null
          updated_at: string
        }
        Insert: {
          approval_threshold?: number | null
          autopilot_enabled?: boolean
          autopilot_threshold?: number | null
          content_goals?: string[]
          extra_notes?: string | null
          focus_topics?: string[]
          founder_id: string
          max_autopilot_per_day?: number | null
          mode?: Database["public"]["Enums"]["autonomy_mode"]
          preferred_platforms?:
            | Database["public"]["Enums"]["target_platform"][]
            | null
          prohibited_topics?: string[] | null
          tone?: string | null
          updated_at?: string
        }
        Update: {
          approval_threshold?: number | null
          autopilot_enabled?: boolean
          autopilot_threshold?: number | null
          content_goals?: string[]
          extra_notes?: string | null
          focus_topics?: string[]
          founder_id?: string
          max_autopilot_per_day?: number | null
          mode?: Database["public"]["Enums"]["autonomy_mode"]
          preferred_platforms?:
            | Database["public"]["Enums"]["target_platform"][]
            | null
          prohibited_topics?: string[] | null
          tone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operating_preferences_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: true
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          created_at: string
          dedupe_hash: string | null
          discovered_via: string | null
          expires_at: string | null
          founder_id: string
          id: string
          priority_score: number | null
          relevance_score: number | null
          signal_at: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["opp_status"]
          summary: string | null
          title: string
          type: Database["public"]["Enums"]["opp_type"]
          updated_at: string
          urgency_score: number | null
        }
        Insert: {
          created_at?: string
          dedupe_hash?: string | null
          discovered_via?: string | null
          expires_at?: string | null
          founder_id: string
          id?: string
          priority_score?: number | null
          relevance_score?: number | null
          signal_at?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["opp_status"]
          summary?: string | null
          title: string
          type: Database["public"]["Enums"]["opp_type"]
          updated_at?: string
          urgency_score?: number | null
        }
        Update: {
          created_at?: string
          dedupe_hash?: string | null
          discovered_via?: string | null
          expires_at?: string | null
          founder_id?: string
          id?: string
          priority_score?: number | null
          relevance_score?: number | null
          signal_at?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["opp_status"]
          summary?: string | null
          title?: string
          type?: Database["public"]["Enums"]["opp_type"]
          updated_at?: string
          urgency_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_matches: {
        Row: {
          brain_fact_id: string | null
          created_at: string
          founder_id: string
          id: string
          match_reason: string | null
          match_score: number | null
          opportunity_id: string
        }
        Insert: {
          brain_fact_id?: string | null
          created_at?: string
          founder_id: string
          id?: string
          match_reason?: string | null
          match_score?: number | null
          opportunity_id: string
        }
        Update: {
          brain_fact_id?: string | null
          created_at?: string
          founder_id?: string
          id?: string
          match_reason?: string | null
          match_score?: number | null
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_matches_brain_fact_id_fkey"
            columns: ["brain_fact_id"]
            isOneToOne: false
            referencedRelation: "brain_facts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_matches_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunity_matches_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_connections: {
        Row: {
          access_token_ref: string | null
          created_at: string
          founder_id: string
          handle: string | null
          id: string
          last_publish_at: string | null
          platform: Database["public"]["Enums"]["platform"]
          platform_user_id: string | null
          refresh_token_ref: string | null
          scopes: string[]
          status: Database["public"]["Enums"]["connection_status"]
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token_ref?: string | null
          created_at?: string
          founder_id: string
          handle?: string | null
          id?: string
          last_publish_at?: string | null
          platform: Database["public"]["Enums"]["platform"]
          platform_user_id?: string | null
          refresh_token_ref?: string | null
          scopes?: string[]
          status?: Database["public"]["Enums"]["connection_status"]
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token_ref?: string | null
          created_at?: string
          founder_id?: string
          handle?: string | null
          id?: string
          last_publish_at?: string | null
          platform?: Database["public"]["Enums"]["platform"]
          platform_user_id?: string | null
          refresh_token_ref?: string | null
          scopes?: string[]
          status?: Database["public"]["Enums"]["connection_status"]
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_connections_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_metrics: {
        Row: {
          clicks: number | null
          collected_at: string
          comments: number | null
          followers_delta: number | null
          founder_id: string
          id: string
          impressions: number | null
          likes: number | null
          publication_id: string
          raw: Json | null
          reposts: number | null
          window_label: string
        }
        Insert: {
          clicks?: number | null
          collected_at?: string
          comments?: number | null
          followers_delta?: number | null
          founder_id: string
          id?: string
          impressions?: number | null
          likes?: number | null
          publication_id: string
          raw?: Json | null
          reposts?: number | null
          window_label: string
        }
        Update: {
          clicks?: number | null
          collected_at?: string
          comments?: number | null
          followers_delta?: number | null
          founder_id?: string
          id?: string
          impressions?: number | null
          likes?: number | null
          publication_id?: string
          raw?: Json | null
          reposts?: number | null
          window_label?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_metrics_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_metrics_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      publications: {
        Row: {
          audit: Json | null
          connection_id: string
          content_item_id: string
          created_at: string
          error: string | null
          founder_id: string
          id: string
          idempotency_key: string
          mode: string
          permalink: string | null
          platform: Database["public"]["Enums"]["target_platform"]
          platform_post_id: string | null
          published_at: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["pub_status"]
          updated_at: string
        }
        Insert: {
          audit?: Json | null
          connection_id: string
          content_item_id: string
          created_at?: string
          error?: string | null
          founder_id: string
          id?: string
          idempotency_key: string
          mode: string
          permalink?: string | null
          platform: Database["public"]["Enums"]["target_platform"]
          platform_post_id?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["pub_status"]
          updated_at?: string
        }
        Update: {
          audit?: Json | null
          connection_id?: string
          content_item_id?: string
          created_at?: string
          error?: string | null
          founder_id?: string
          id?: string
          idempotency_key?: string
          mode?: string
          permalink?: string | null
          platform?: Database["public"]["Enums"]["target_platform"]
          platform_post_id?: string | null
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["pub_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "publications_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "platform_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_content_item_id_fkey"
            columns: ["content_item_id"]
            isOneToOne: false
            referencedRelation: "content_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publications_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_sources: {
        Row: {
          captured_by: string | null
          content_hash: string | null
          created_at: string
          founder_id: string
          id: string
          kind: Database["public"]["Enums"]["source_kind"]
          raw: Json
          url: string | null
        }
        Insert: {
          captured_by?: string | null
          content_hash?: string | null
          created_at?: string
          founder_id: string
          id?: string
          kind: Database["public"]["Enums"]["source_kind"]
          raw: Json
          url?: string | null
        }
        Update: {
          captured_by?: string | null
          content_hash?: string | null
          created_at?: string
          founder_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["source_kind"]
          raw?: Json
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_sources_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      reflections: {
        Row: {
          created_at: string
          distilled: boolean | null
          founder_id: string
          id: string
          prompt: string | null
          response: string | null
          week_of: string
        }
        Insert: {
          created_at?: string
          distilled?: boolean | null
          founder_id: string
          id?: string
          prompt?: string | null
          response?: string | null
          week_of: string
        }
        Update: {
          created_at?: string
          distilled?: boolean | null
          founder_id?: string
          id?: string
          prompt?: string | null
          response?: string | null
          week_of?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflections_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          active: boolean | null
          cadence: Json | null
          created_at: string
          founder_id: string
          id: string
          platform: Database["public"]["Enums"]["target_platform"]
        }
        Insert: {
          active?: boolean | null
          cadence?: Json | null
          created_at?: string
          founder_id: string
          id?: string
          platform: Database["public"]["Enums"]["target_platform"]
        }
        Update: {
          active?: boolean | null
          cadence?: Json | null
          created_at?: string
          founder_id?: string
          id?: string
          platform?: Database["public"]["Enums"]["target_platform"]
        }
        Relationships: [
          {
            foreignKeyName: "schedules_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          founder_id: string
          id: string
          monthly_token_budget: number | null
          plan: string | null
          status: Database["public"]["Enums"]["sub_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          founder_id: string
          id?: string
          monthly_token_budget?: number | null
          plan?: string | null
          status?: Database["public"]["Enums"]["sub_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          founder_id?: string
          id?: string
          monthly_token_budget?: number | null
          plan?: string | null
          status?: Database["public"]["Enums"]["sub_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_strategies: {
        Row: {
          id: string
          founder_id: string
          week_start: string
          strategy: Json
          created_at: string
        }
        Insert: {
          id?: string
          founder_id: string
          week_start: string
          strategy?: Json
          created_at?: string
        }
        Update: {
          id?: string
          founder_id?: string
          week_start?: string
          strategy?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_strategies_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_posts: {
        Row: {
          id: string
          founder_id: string
          strategy_id: string
          week_start: string
          platform: string
          scheduled_date: string
          post_type: string
          sort_order: number
          content: string
          status: string
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          founder_id: string
          strategy_id: string
          week_start: string
          platform: string
          scheduled_date: string
          post_type: string
          sort_order?: number
          content: string
          status?: string
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          founder_id?: string
          strategy_id?: string
          week_start?: string
          platform?: string
          scheduled_date?: string
          post_type?: string
          sort_order?: number
          content?: string
          status?: string
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_posts_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_posts_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "weekly_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_founder_id: { Args: never; Returns: string }
      vault_create_secret: {
        Args: { p_name?: string; p_secret: string }
        Returns: string
      }
      vault_delete_secret: { Args: { p_id: string }; Returns: undefined }
      vault_read_secret: { Args: { p_id: string }; Returns: string }
      vault_update_secret: {
        Args: { p_id: string; p_secret: string }
        Returns: undefined
      }
    }
    Enums: {
      autonomy_mode: "manual" | "assisted" | "autopilot"
      brain_layer_type:
        | "identity"
        | "expertise"
        | "offer"
        | "audience"
        | "positioning"
        | "belief"
        | "story"
        | "writing_style"
        | "goal"
      connection_status: "active" | "needs_reauth" | "revoked" | "error"
      content_status:
        | "draft"
        | "guardrail_pending"
        | "guardrail_failed"
        | "awaiting_approval"
        | "approved"
        | "scheduled"
        | "published"
        | "rejected"
        | "archived"
      fact_status: "candidate" | "active" | "superseded" | "rejected"
      guardrail_verdict: "pass_autopilot" | "pass_approval" | "fail"
      job_status: "queued" | "running" | "succeeded" | "failed" | "dead"
      opp_status:
        | "discovered"
        | "scored"
        | "matched"
        | "surfaced"
        | "accepted"
        | "dismissed"
        | "expired"
      opp_type:
        | "industry_trend"
        | "market_shift"
        | "breaking_news"
        | "emerging_conversation"
        | "podcast"
        | "partnership"
        | "collaboration"
        | "thought_leadership"
      platform: "x" | "linkedin"
      pub_status:
        | "scheduled"
        | "publishing"
        | "published"
        | "failed"
        | "canceled"
      signal_kind:
        | "edit"
        | "performance"
        | "acceptance"
        | "dismissal"
        | "engagement"
        | "reflection"
      source_kind:
        | "website"
        | "linkedin"
        | "x"
        | "reflection"
        | "correction"
        | "content_performance"
        | "manual"
      sub_status: "trialing" | "active" | "past_due" | "canceled" | "incomplete"
      target_platform: "x" | "linkedin"
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
      autonomy_mode: ["manual", "assisted", "autopilot"],
      brain_layer_type: [
        "identity",
        "expertise",
        "offer",
        "audience",
        "positioning",
        "belief",
        "story",
        "writing_style",
        "goal",
      ],
      connection_status: ["active", "needs_reauth", "revoked", "error"],
      content_status: [
        "draft",
        "guardrail_pending",
        "guardrail_failed",
        "awaiting_approval",
        "approved",
        "scheduled",
        "published",
        "rejected",
        "archived",
      ],
      fact_status: ["candidate", "active", "superseded", "rejected"],
      guardrail_verdict: ["pass_autopilot", "pass_approval", "fail"],
      job_status: ["queued", "running", "succeeded", "failed", "dead"],
      opp_status: [
        "discovered",
        "scored",
        "matched",
        "surfaced",
        "accepted",
        "dismissed",
        "expired",
      ],
      opp_type: [
        "industry_trend",
        "market_shift",
        "breaking_news",
        "emerging_conversation",
        "podcast",
        "partnership",
        "collaboration",
        "thought_leadership",
      ],
      platform: ["x", "linkedin"],
      pub_status: [
        "scheduled",
        "publishing",
        "published",
        "failed",
        "canceled",
      ],
      signal_kind: [
        "edit",
        "performance",
        "acceptance",
        "dismissal",
        "engagement",
        "reflection",
      ],
      source_kind: [
        "website",
        "linkedin",
        "x",
        "reflection",
        "correction",
        "content_performance",
        "manual",
      ],
      sub_status: ["trialing", "active", "past_due", "canceled", "incomplete"],
      target_platform: ["x", "linkedin"],
    },
  },
} as const
