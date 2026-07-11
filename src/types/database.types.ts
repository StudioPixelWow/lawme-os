/**
 * LawME — Supabase database types.
 * GENERATED from the DEVELOPMENT project (udispadsbxqicmawqcuk) schema on
 * 2026-07-11, after applying 20260711173213_legal_intelligence_poc_foundation.
 * Regenerate with `npm run db:types` (or the Supabase MCP) after every
 * migration — never hand-edit (docs/setup/DATABASE_WORKFLOW.md).
 */
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
      audit_events: {
        Row: {
          actor: string | null
          actor_role: string | null
          event_type: string
          id: string
          object_id: string | null
          object_type: string | null
          occurred_at: string
          organization_id: string | null
          payload: Json
        }
        Insert: {
          actor?: string | null
          actor_role?: string | null
          event_type: string
          id?: string
          object_id?: string | null
          object_type?: string | null
          occurred_at?: string
          organization_id?: string | null
          payload?: Json
        }
        Update: {
          actor?: string | null
          actor_role?: string | null
          event_type?: string
          id?: string
          object_id?: string | null
          object_type?: string | null
          occurred_at?: string
          organization_id?: string | null
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_results: {
        Row: {
          created_at: string
          id: string
          metrics: Json
          output_ref: string | null
          passed: boolean | null
          run_id: string
          score: number | null
          task_id: string
          warnings: Json
        }
        Insert: {
          created_at?: string
          id?: string
          metrics?: Json
          output_ref?: string | null
          passed?: boolean | null
          run_id: string
          score?: number | null
          task_id: string
          warnings?: Json
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: Json
          output_ref?: string | null
          passed?: boolean | null
          run_id?: string
          score?: number | null
          task_id?: string
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "benchmark_results_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "benchmark_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benchmark_results_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "benchmark_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      benchmark_runs: {
        Row: {
          engine_version: string
          finished_at: string | null
          id: string
          model_provider: string
          model_version: string
          notes: string | null
          parser_version: string
          run_label: string
          started_at: string
        }
        Insert: {
          engine_version: string
          finished_at?: string | null
          id?: string
          model_provider?: string
          model_version?: string
          notes?: string | null
          parser_version?: string
          run_label: string
          started_at?: string
        }
        Update: {
          engine_version?: string
          finished_at?: string | null
          id?: string
          model_provider?: string
          model_version?: string
          notes?: string | null
          parser_version?: string
          run_label?: string
          started_at?: string
        }
        Relationships: []
      }
      benchmark_tasks: {
        Row: {
          category: string
          created_at: string
          difficulty: string
          domain: string
          gold: Json
          id: string
          inputs: Json
          is_synthetic: boolean
          law_as_of: string
          prompt_he: string
          scoring: Json
          status: string
          task_code: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          difficulty: string
          domain: string
          gold?: Json
          id?: string
          inputs?: Json
          is_synthetic?: boolean
          law_as_of: string
          prompt_he: string
          scoring?: Json
          status?: string
          task_code: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          difficulty?: string
          domain?: string
          gold?: Json
          id?: string
          inputs?: Json
          is_synthetic?: boolean
          law_as_of?: string
          prompt_he?: string
          scoring?: Json
          status?: string
          task_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_answer_claims: {
        Row: {
          claim_index: number
          claim_label: string
          claim_text: string
          created_at: string
          id: string
          query_id: string
        }
        Insert: {
          claim_index: number
          claim_label: string
          claim_text: string
          created_at?: string
          id?: string
          query_id: string
        }
        Update: {
          claim_index?: number
          claim_label?: string
          claim_text?: string
          created_at?: string
          id?: string
          query_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_answer_claims_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "legal_research_queries"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_citations: {
        Row: {
          anchor_key: string | null
          citation_kind: string
          cited_case_number_normalized: string | null
          cited_document_id: string | null
          cited_statute_ref: string | null
          citing_document_id: string
          confidence: number
          created_at: string
          id: string
          label: string
          provenance: string
          treatment: string
          verified: boolean
        }
        Insert: {
          anchor_key?: string | null
          citation_kind: string
          cited_case_number_normalized?: string | null
          cited_document_id?: string | null
          cited_statute_ref?: string | null
          citing_document_id: string
          confidence: number
          created_at?: string
          id?: string
          label?: string
          provenance: string
          treatment?: string
          verified?: boolean
        }
        Update: {
          anchor_key?: string | null
          citation_kind?: string
          cited_case_number_normalized?: string | null
          cited_document_id?: string | null
          cited_statute_ref?: string | null
          citing_document_id?: string
          confidence?: number
          created_at?: string
          id?: string
          label?: string
          provenance?: string
          treatment?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "legal_citations_cited_document_id_fkey"
            columns: ["cited_document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_citations_citing_document_id_fkey"
            columns: ["citing_document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_claim_citations: {
        Row: {
          anchor_key: string
          citation_format: string | null
          claim_id: string
          created_at: string
          document_id: string
          id: string
          quote_verified: boolean
          quoted_text: string | null
          version_id: string | null
        }
        Insert: {
          anchor_key: string
          citation_format?: string | null
          claim_id: string
          created_at?: string
          document_id: string
          id?: string
          quote_verified?: boolean
          quoted_text?: string | null
          version_id?: string | null
        }
        Update: {
          anchor_key?: string
          citation_format?: string | null
          claim_id?: string
          created_at?: string
          document_id?: string
          id?: string
          quote_verified?: boolean
          quoted_text?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_claim_citations_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "legal_answer_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_claim_citations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_claim_citations_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "legal_document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_document_entities: {
        Row: {
          confidence: number | null
          created_at: string
          document_id: string
          entity_id: string
          evidence_anchor: string | null
          id: string
          provenance: string
          role: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          document_id: string
          entity_id: string
          evidence_anchor?: string | null
          id?: string
          provenance: string
          role: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          document_id?: string
          entity_id?: string
          evidence_anchor?: string | null
          id?: string
          provenance?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_document_entities_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_document_entities_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "legal_entities"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_document_files: {
        Row: {
          byte_size: number
          content_type: string
          created_at: string
          document_id: string
          id: string
          is_original: boolean
          sha256: string
          storage_bucket: string
          storage_path: string
          version_id: string
        }
        Insert: {
          byte_size: number
          content_type: string
          created_at?: string
          document_id: string
          id?: string
          is_original?: boolean
          sha256: string
          storage_bucket: string
          storage_path: string
          version_id: string
        }
        Update: {
          byte_size?: number
          content_type?: string
          created_at?: string
          document_id?: string
          id?: string
          is_original?: boolean
          sha256?: string
          storage_bucket?: string
          storage_path?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_document_files_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_document_files_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "legal_document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_document_sections: {
        Row: {
          anchor_key: string
          char_end: number
          char_start: number
          content: string
          created_at: string
          heading_path: string | null
          id: string
          kind: string
          page_number: number | null
          section_index: number
          version_id: string
        }
        Insert: {
          anchor_key: string
          char_end: number
          char_start: number
          content: string
          created_at?: string
          heading_path?: string | null
          id?: string
          kind: string
          page_number?: number | null
          section_index: number
          version_id: string
        }
        Update: {
          anchor_key?: string
          char_end?: number
          char_start?: number
          content?: string
          created_at?: string
          heading_path?: string | null
          id?: string
          kind?: string
          page_number?: number | null
          section_index?: number
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_document_sections_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "legal_document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_document_text: {
        Row: {
          created_at: string
          extracted_text: string | null
          extraction_confidence: number | null
          extraction_method: string
          fts: unknown
          id: string
          language: string
          normalized_text: string | null
          ocr_status: string
          version_id: string
          warnings: Json
        }
        Insert: {
          created_at?: string
          extracted_text?: string | null
          extraction_confidence?: number | null
          extraction_method: string
          fts?: unknown
          id?: string
          language?: string
          normalized_text?: string | null
          ocr_status?: string
          version_id: string
          warnings?: Json
        }
        Update: {
          created_at?: string
          extracted_text?: string | null
          extraction_confidence?: number | null
          extraction_method?: string
          fts?: unknown
          id?: string
          language?: string
          normalized_text?: string | null
          ocr_status?: string
          version_id?: string
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "legal_document_text_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: true
            referencedRelation: "legal_document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_document_versions: {
        Row: {
          change_reason: string | null
          content_hash: string
          created_at: string
          document_id: string
          id: string
          parser_version: string
          version: number
        }
        Insert: {
          change_reason?: string | null
          content_hash: string
          created_at?: string
          document_id: string
          id?: string
          parser_version: string
          version: number
        }
        Update: {
          change_reason?: string | null
          content_hash?: string
          created_at?: string
          document_id?: string
          id?: string
          parser_version?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          authority_score: number | null
          authority_type: string
          canonical_source_url: string | null
          case_number_normalized: string | null
          case_number_raw: string | null
          court: string | null
          created_at: string
          deleted_at: string | null
          document_date: string | null
          document_type: string
          effective_date: string | null
          id: string
          ingestion_date: string
          language: string
          latest_version: number
          legal_domains: Json
          license_status: string
          metadata_confidence: number | null
          organization_id: string | null
          original_file_url: string | null
          procedure_code: string | null
          publication_date: string | null
          retention_policy: string | null
          source_id: string
          source_reliability: number | null
          storage_policy: string
          title: string
          title_en: string | null
          title_he: string | null
          updated_at: string
          verification_date: string | null
          verification_status: string
          version_date: string | null
        }
        Insert: {
          authority_score?: number | null
          authority_type?: string
          canonical_source_url?: string | null
          case_number_normalized?: string | null
          case_number_raw?: string | null
          court?: string | null
          created_at?: string
          deleted_at?: string | null
          document_date?: string | null
          document_type: string
          effective_date?: string | null
          id?: string
          ingestion_date?: string
          language?: string
          latest_version?: number
          legal_domains?: Json
          license_status?: string
          metadata_confidence?: number | null
          organization_id?: string | null
          original_file_url?: string | null
          procedure_code?: string | null
          publication_date?: string | null
          retention_policy?: string | null
          source_id: string
          source_reliability?: number | null
          storage_policy?: string
          title: string
          title_en?: string | null
          title_he?: string | null
          updated_at?: string
          verification_date?: string | null
          verification_status?: string
          version_date?: string | null
        }
        Update: {
          authority_score?: number | null
          authority_type?: string
          canonical_source_url?: string | null
          case_number_normalized?: string | null
          case_number_raw?: string | null
          court?: string | null
          created_at?: string
          deleted_at?: string | null
          document_date?: string | null
          document_type?: string
          effective_date?: string | null
          id?: string
          ingestion_date?: string
          language?: string
          latest_version?: number
          legal_domains?: Json
          license_status?: string
          metadata_confidence?: number | null
          organization_id?: string | null
          original_file_url?: string | null
          procedure_code?: string | null
          publication_date?: string | null
          retention_policy?: string | null
          source_id?: string
          source_reliability?: number | null
          storage_policy?: string
          title?: string
          title_en?: string | null
          title_he?: string | null
          updated_at?: string
          verification_date?: string | null
          verification_status?: string
          version_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_documents_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "legal_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_embeddings: {
        Row: {
          anchor_key: string
          chunk_index: number
          created_at: string
          dims: number
          embedding: string | null
          embedding_norm: number | null
          id: string
          model: string
          model_version: string
          status: string
          version_id: string
        }
        Insert: {
          anchor_key: string
          chunk_index: number
          created_at?: string
          dims: number
          embedding?: string | null
          embedding_norm?: number | null
          id?: string
          model: string
          model_version: string
          status?: string
          version_id: string
        }
        Update: {
          anchor_key?: string
          chunk_index?: number
          created_at?: string
          dims?: number
          embedding?: string | null
          embedding_norm?: number | null
          id?: string
          model?: string
          model_version?: string
          status?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_embeddings_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "legal_document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_entities: {
        Row: {
          attributes: Json
          created_at: string
          entity_type: string
          external_ref: string | null
          id: string
          name: string
          name_he: string | null
          updated_at: string
        }
        Insert: {
          attributes?: Json
          created_at?: string
          entity_type: string
          external_ref?: string | null
          id?: string
          name: string
          name_he?: string | null
          updated_at?: string
        }
        Update: {
          attributes?: Json
          created_at?: string
          entity_type?: string
          external_ref?: string | null
          id?: string
          name?: string
          name_he?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      legal_research_queries: {
        Row: {
          created_at: string
          engine_version: string
          expansion: Json
          filters: Json
          id: string
          normalized_query: string
          query_text: string
          session_id: string
        }
        Insert: {
          created_at?: string
          engine_version?: string
          expansion?: Json
          filters?: Json
          id?: string
          normalized_query?: string
          query_text: string
          session_id: string
        }
        Update: {
          created_at?: string
          engine_version?: string
          expansion?: Json
          filters?: Json
          id?: string
          normalized_query?: string
          query_text?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_research_queries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "legal_research_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_research_results: {
        Row: {
          authority_type: string
          created_at: string
          document_id: string
          id: string
          passage_anchor: string | null
          passage_text: string | null
          query_id: string
          rank: number
          score: number
          score_breakdown: Json
          version_id: string | null
          warnings: Json
        }
        Insert: {
          authority_type?: string
          created_at?: string
          document_id: string
          id?: string
          passage_anchor?: string | null
          passage_text?: string | null
          query_id: string
          rank: number
          score: number
          score_breakdown?: Json
          version_id?: string | null
          warnings?: Json
        }
        Update: {
          authority_type?: string
          created_at?: string
          document_id?: string
          id?: string
          passage_anchor?: string | null
          passage_text?: string | null
          query_id?: string
          rank?: number
          score?: number
          score_breakdown?: Json
          version_id?: string | null
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "legal_research_results_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_research_results_query_id_fkey"
            columns: ["query_id"]
            isOneToOne: false
            referencedRelation: "legal_research_queries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_research_results_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "legal_document_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_research_sessions: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          matter_ref: string | null
          organization_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          matter_ref?: string | null
          organization_id: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          matter_ref?: string | null
          organization_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_research_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_research_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_source_fetches: {
        Row: {
          content_type: string | null
          document_id: string | null
          error: string | null
          http_status: number | null
          id: string
          outcome: string
          parser_version: string | null
          requested_at: string
          retrieval_method: string
          sha256: string | null
          source_id: string
          url: string
        }
        Insert: {
          content_type?: string | null
          document_id?: string | null
          error?: string | null
          http_status?: number | null
          id?: string
          outcome: string
          parser_version?: string | null
          requested_at?: string
          retrieval_method: string
          sha256?: string | null
          source_id: string
          url: string
        }
        Update: {
          content_type?: string | null
          document_id?: string | null
          error?: string | null
          http_status?: number | null
          id?: string
          outcome?: string
          parser_version?: string | null
          requested_at?: string
          retrieval_method?: string
          sha256?: string | null
          source_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_source_fetches_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_source_fetches_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "legal_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_sources: {
        Row: {
          access_policy: string
          category: string
          created_at: string
          id: string
          is_active: boolean
          name_en: string
          name_he: string | null
          notes: string | null
          priority: string
          publisher: string | null
          rag_permission: string
          registry_code: string
          trust_tier: number
          updated_at: string
          url: string | null
        }
        Insert: {
          access_policy?: string
          category: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_en: string
          name_he?: string | null
          notes?: string | null
          priority: string
          publisher?: string | null
          rag_permission?: string
          registry_code: string
          trust_tier: number
          updated_at?: string
          url?: string | null
        }
        Update: {
          access_policy?: string
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name_en?: string
          name_he?: string | null
          notes?: string | null
          priority?: string
          publisher?: string | null
          rag_permission?: string
          registry_code?: string
          trust_tier?: number
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      organization_memberships: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          profile_id: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          profile_id: string
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          profile_id?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          settings: Json
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          settings?: Json
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          settings?: Json
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          deleted_at: string | null
          display_name: string
          id: string
          locale: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          id: string
          locale?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          id?: string
          locale?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
