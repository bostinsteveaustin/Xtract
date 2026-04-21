// Generated Supabase types — run `pnpm supabase gen types typescript` to regenerate
// For now, use a placeholder that allows the project to compile

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          owner_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          workspace_id: string | null;
          avatar_url: string | null;
          platform_role: "none" | "platform_support" | "platform_admin";
          mfa_required: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          workspace_id?: string | null;
          avatar_url?: string | null;
          platform_role?: "none" | "platform_support" | "platform_admin";
          mfa_required?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          workspace_id?: string | null;
          avatar_url?: string | null;
          platform_role?: "none" | "platform_support" | "platform_admin";
          mfa_required?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      ctx_configurations: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          version: string;
          content: Json;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          version?: string;
          content: Json;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          version?: string;
          content?: Json;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      document_sets: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          document_set_id: string;
          filename: string;
          storage_path: string;
          file_type: string;
          file_size: number;
          page_count: number | null;
          text_content: string | null;
          chunk_count: number | null;
          metadata: Json | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_set_id: string;
          filename: string;
          storage_path: string;
          file_type: string;
          file_size: number;
          page_count?: number | null;
          text_content?: string | null;
          chunk_count?: number | null;
          metadata?: Json | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          document_set_id?: string;
          filename?: string;
          storage_path?: string;
          file_type?: string;
          file_size?: number;
          page_count?: number | null;
          text_content?: string | null;
          chunk_count?: number | null;
          metadata?: Json | null;
          status?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      workflows: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          template_id: string | null;
          node_graph: Json;
          status: string;
          // ── migration-009: workspace architecture refactor ──
          type: string;
          description: string | null;
          workspace_ctx_id: string | null;
          // ── migration-017: org re-key ──
          organization_id: string;
          // ── migration-024: E-08 §4.6 Rig binding ──
          bound_rig_id: string | null;
          bound_rig_version: string | null;
          bound_at: string | null;
          bound_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          template_id?: string | null;
          node_graph: Json;
          status?: string;
          type?: string;
          description?: string | null;
          workspace_ctx_id?: string | null;
          organization_id?: string;
          bound_rig_id?: string | null;
          bound_rig_version?: string | null;
          bound_at?: string | null;
          bound_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          template_id?: string | null;
          node_graph?: Json;
          status?: string;
          type?: string;
          description?: string | null;
          workspace_ctx_id?: string | null;
          organization_id?: string;
          bound_rig_id?: string | null;
          bound_rig_version?: string | null;
          bound_at?: string | null;
          bound_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      workflow_runs: {
        Row: {
          id: string;
          workflow_id: string;
          document_set_id: string | null;
          ctx_configuration_id: string | null;
          status: string;
          node_states: Json;
          started_at: string | null;
          completed_at: string | null;
          run_by: string | null;
          error_message: string | null;
          tokens_used: number;
          prompt_tokens: number;
          completion_tokens: number;
          step_token_log: Json;
          ctx_content: string | null;
          // ── migration-009: pipeline run fields ──
          pipeline_type: string | null;
          config_pattern: string | null;
          technical_ctx_id: string | null;
          credits_debited: number;
          output_envelope_id: string | null;
          // ── migration-017: org re-key ──
          organization_id: string;
          // ── migration-025: E-08 §4.6 Rig pinning on Runs ──
          rig_id: string | null;
          rig_version: string | null;
          is_experimental: boolean;
          credit_cost: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          workflow_id: string;
          document_set_id?: string | null;
          ctx_configuration_id?: string | null;
          status?: string;
          node_states?: Json;
          started_at?: string | null;
          completed_at?: string | null;
          run_by?: string | null;
          error_message?: string | null;
          tokens_used?: number;
          prompt_tokens?: number;
          completion_tokens?: number;
          step_token_log?: Json;
          ctx_content?: string | null;
          pipeline_type?: string | null;
          config_pattern?: string | null;
          technical_ctx_id?: string | null;
          credits_debited?: number;
          output_envelope_id?: string | null;
          organization_id?: string;
          rig_id?: string | null;
          rig_version?: string | null;
          is_experimental?: boolean;
          credit_cost?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          workflow_id?: string;
          document_set_id?: string | null;
          ctx_configuration_id?: string | null;
          status?: string;
          node_states?: Json;
          started_at?: string | null;
          completed_at?: string | null;
          run_by?: string | null;
          error_message?: string | null;
          tokens_used?: number;
          prompt_tokens?: number;
          completion_tokens?: number;
          step_token_log?: Json;
          ctx_content?: string | null;
          pipeline_type?: string | null;
          config_pattern?: string | null;
          technical_ctx_id?: string | null;
          credits_debited?: number;
          output_envelope_id?: string | null;
          organization_id?: string;
          rig_id?: string | null;
          rig_version?: string | null;
          is_experimental?: boolean;
          credit_cost?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      workflow_source_documents: {
        Row: {
          id: string;
          workflow_id: string;
          filename: string;
          storage_path: string;
          mime_type: string | null;
          file_size: number | null;
          uploaded_by: string | null;
          uploaded_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          workflow_id: string;
          filename: string;
          storage_path: string;
          mime_type?: string | null;
          file_size?: number | null;
          uploaded_by?: string | null;
          uploaded_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: string;
          workflow_id?: string;
          filename?: string;
          storage_path?: string;
          mime_type?: string | null;
          file_size?: number | null;
          uploaded_by?: string | null;
          uploaded_at?: string;
          metadata?: Json;
        };
        Relationships: [];
      };
      pipeline_run_documents: {
        Row: {
          pipeline_run_id: string;
          source_document_id: string;
        };
        Insert: {
          pipeline_run_id: string;
          source_document_id: string;
        };
        Update: {
          pipeline_run_id?: string;
          source_document_id?: string;
        };
        Relationships: [];
      };
      extracted_objects: {
        Row: {
          id: string;
          workflow_run_id: string;
          object_type: string;
          object_icml_id: string | null;
          attributes: Json;
          source_document_id: string | null;
          source_section: string | null;
          source_page: number | null;
          source_clause_text: string | null;
          confidence: number | null;
          rubric_score: number | null;
          rubric_level: string | null;
          scoring_rationale: string | null;
          provenance: Json | null;
          status: string;
          reviewed_by: string | null;
          review_notes: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workflow_run_id: string;
          object_type: string;
          object_icml_id?: string | null;
          attributes: Json;
          source_document_id?: string | null;
          source_section?: string | null;
          source_page?: number | null;
          source_clause_text?: string | null;
          confidence?: number | null;
          rubric_score?: number | null;
          rubric_level?: string | null;
          scoring_rationale?: string | null;
          provenance?: Json | null;
          status?: string;
          reviewed_by?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workflow_run_id?: string;
          object_type?: string;
          object_icml_id?: string | null;
          attributes?: Json;
          source_document_id?: string | null;
          source_section?: string | null;
          source_page?: number | null;
          source_clause_text?: string | null;
          confidence?: number | null;
          rubric_score?: number | null;
          rubric_level?: string | null;
          scoring_rationale?: string | null;
          provenance?: Json | null;
          status?: string;
          reviewed_by?: string | null;
          review_notes?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      extraction_decisions: {
        Row: {
          id: string;
          workflow_run_id: string;
          extracted_object_id: string;
          decision_type: string;
          description: string | null;
          decided_by: string;
          decided_at: string;
        };
        Insert: {
          id?: string;
          workflow_run_id: string;
          extracted_object_id: string;
          decision_type: string;
          description?: string | null;
          decided_by: string;
          decided_at?: string;
        };
        Update: {
          id?: string;
          workflow_run_id?: string;
          extracted_object_id?: string;
          decision_type?: string;
          description?: string | null;
          decided_by?: string;
          decided_at?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      workspace_invitations: {
        Row: {
          id: string;
          workspace_id: string;
          email: string;
          token: string;
          invited_by: string;
          role: string;
          status: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          email: string;
          token: string;
          invited_by: string;
          role?: string;
          status?: string;
          expires_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          email?: string;
          token?: string;
          invited_by?: string;
          role?: string;
          status?: string;
          expires_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      object_relationships: {
        Row: {
          id: string;
          workflow_run_id: string;
          from_object_icml_id: string;
          to_object_icml_id: string;
          relationship_type: string;
          direction: string;
          confidence: number;
          source: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workflow_run_id: string;
          from_object_icml_id: string;
          to_object_icml_id: string;
          relationship_type: string;
          direction?: string;
          confidence?: number;
          source?: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workflow_run_id?: string;
          from_object_icml_id?: string;
          to_object_icml_id?: string;
          relationship_type?: string;
          direction?: string;
          confidence?: number;
          source?: string;
          description?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      // ─── E-08 Platform Foundations ────────────────────────────────────────
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          status: "active" | "suspended" | "archived";
          billing_contact_user_id: string | null;
          stripe_customer_id: string | null;
          branding: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          status?: "active" | "suspended" | "archived";
          billing_contact_user_id?: string | null;
          stripe_customer_id?: string | null;
          branding?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          status?: "active" | "suspended" | "archived";
          billing_contact_user_id?: string | null;
          stripe_customer_id?: string | null;
          branding?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string;
          role: "org_admin" | "rig_manager" | "member";
          capability_flags: Json;
          status: "active" | "invited" | "suspended";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id: string;
          role?: "org_admin" | "rig_manager" | "member";
          capability_flags?: Json;
          status?: "active" | "invited" | "suspended";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          organization_id?: string;
          role?: "org_admin" | "rig_manager" | "member";
          capability_flags?: Json;
          status?: "active" | "invited" | "suspended";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          id: string;
          acting_user_id: string | null;
          acting_user_platform_role: string | null;
          target_organization_id: string | null;
          admin_context_flag: boolean;
          action: string;
          resource_type: string | null;
          resource_id: string | null;
          payload: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          acting_user_id?: string | null;
          acting_user_platform_role?: string | null;
          target_organization_id?: string | null;
          admin_context_flag?: boolean;
          action: string;
          resource_type?: string | null;
          resource_id?: string | null;
          payload?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      invite_tokens: {
        Row: {
          id: string;
          organization_id: string;
          email: string;
          token: string;
          invited_by_user_id: string;
          role: "org_admin" | "rig_manager" | "member";
          capability_flags: Json;
          status: "pending" | "accepted" | "expired" | "revoked";
          expires_at: string;
          created_at: string;
          accepted_at: string | null;
          accepted_by_user_id: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          email: string;
          token: string;
          invited_by_user_id: string;
          role?: "org_admin" | "rig_manager" | "member";
          capability_flags?: Json;
          status?: "pending" | "accepted" | "expired" | "revoked";
          expires_at?: string;
          created_at?: string;
          accepted_at?: string | null;
          accepted_by_user_id?: string | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          email?: string;
          token?: string;
          invited_by_user_id?: string;
          role?: "org_admin" | "rig_manager" | "member";
          capability_flags?: Json;
          status?: "pending" | "accepted" | "expired" | "revoked";
          expires_at?: string;
          created_at?: string;
          accepted_at?: string | null;
          accepted_by_user_id?: string | null;
        };
        Relationships: [];
      };
      workspace_memberships: {
        Row: {
          id: string;
          workspace_id: string;
          organization_id: string;
          user_id: string;
          role: "workspace_owner" | "workspace_editor" | "workspace_viewer";
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          organization_id: string;
          user_id: string;
          role?: "workspace_owner" | "workspace_editor" | "workspace_viewer";
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          organization_id?: string;
          user_id?: string;
          role?: "workspace_owner" | "workspace_editor" | "workspace_viewer";
          created_at?: string;
        };
        Relationships: [];
      };
      // ─── E-08 Phase 2: Rigs ───────────────────────────────────────────────
      rigs: {
        Row: {
          id: string;
          organization_id: string | null;
          tier: "published" | "organisation";
          slug: string;
          name: string;
          category:
            | "contract_intelligence"
            | "controls_extraction"
            | "ontology_building"
            | "qa_review"
            | "custom";
          forked_from_rig_id: string | null;
          forked_from_version: string | null;
          current_state: "draft" | "experimental" | "validated" | "deprecated";
          current_version: string;
          created_by_user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          tier: "published" | "organisation";
          slug: string;
          name: string;
          category:
            | "contract_intelligence"
            | "controls_extraction"
            | "ontology_building"
            | "qa_review"
            | "custom";
          forked_from_rig_id?: string | null;
          forked_from_version?: string | null;
          current_state?: "draft" | "experimental" | "validated" | "deprecated";
          current_version?: string;
          created_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          tier?: "published" | "organisation";
          slug?: string;
          name?: string;
          category?:
            | "contract_intelligence"
            | "controls_extraction"
            | "ontology_building"
            | "qa_review"
            | "custom";
          forked_from_rig_id?: string | null;
          forked_from_version?: string | null;
          current_state?: "draft" | "experimental" | "validated" | "deprecated";
          current_version?: string;
          created_by_user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rig_versions: {
        Row: {
          id: string;
          rig_id: string;
          version: string;
          state: "draft" | "experimental" | "validated" | "deprecated";
          pipeline_pattern:
            | "single_pass"
            | "chunked"
            | "verified"
            | "reconciled"
            | "composite";
          ctx_bundle_refs: Json;
          output_contract: Json;
          validation_profile: Json;
          calibration_evidence_id: string | null;
          credit_rate_config: Json;
          review_ui_config: Json;
          methodology_statement: string;
          released_at: string | null;
          released_by_user_id: string | null;
          deprecated_at: string | null;
          deprecation_window_ends_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rig_id: string;
          version: string;
          state?: "draft" | "experimental" | "validated" | "deprecated";
          pipeline_pattern:
            | "single_pass"
            | "chunked"
            | "verified"
            | "reconciled"
            | "composite";
          ctx_bundle_refs?: Json;
          output_contract?: Json;
          validation_profile?: Json;
          calibration_evidence_id?: string | null;
          credit_rate_config?: Json;
          review_ui_config?: Json;
          methodology_statement?: string;
          released_at?: string | null;
          released_by_user_id?: string | null;
          deprecated_at?: string | null;
          deprecation_window_ends_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          rig_id?: string;
          version?: string;
          state?: "draft" | "experimental" | "validated" | "deprecated";
          pipeline_pattern?:
            | "single_pass"
            | "chunked"
            | "verified"
            | "reconciled"
            | "composite";
          ctx_bundle_refs?: Json;
          output_contract?: Json;
          validation_profile?: Json;
          calibration_evidence_id?: string | null;
          credit_rate_config?: Json;
          review_ui_config?: Json;
          methodology_statement?: string;
          released_at?: string | null;
          released_by_user_id?: string | null;
          deprecated_at?: string | null;
          deprecation_window_ends_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      calibration_evidence: {
        Row: {
          id: string;
          rig_version_id: string;
          evidence_type:
            | "noise_floor"
            | "repeatability"
            | "factorial_design"
            | "domain_test";
          payload: Json;
          attached_by_user_id: string | null;
          attached_at: string;
        };
        Insert: {
          id?: string;
          rig_version_id: string;
          evidence_type:
            | "noise_floor"
            | "repeatability"
            | "factorial_design"
            | "domain_test";
          payload?: Json;
          attached_by_user_id?: string | null;
          attached_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      rig_entitlements: {
        Row: {
          id: string;
          organization_id: string;
          rig_id: string;
          granted_by_user_id: string | null;
          granted_at: string;
          revoked_at: string | null;
          revoked_by_user_id: string | null;
          credit_rate_override: Json | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          rig_id: string;
          granted_by_user_id?: string | null;
          granted_at?: string;
          revoked_at?: string | null;
          revoked_by_user_id?: string | null;
          credit_rate_override?: Json | null;
        };
        Update: {
          id?: string;
          organization_id?: string;
          rig_id?: string;
          granted_by_user_id?: string | null;
          granted_at?: string;
          revoked_at?: string | null;
          revoked_by_user_id?: string | null;
          credit_rate_override?: Json | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      relationship_type:
        | "supersedes"
        | "superseded_by"
        | "related_to"
        | "duplicates"
        | "categorised_under"
        | "implements"
        | "depends_on"
        | "conflicts_with"
        | "references";
      relationship_direction: "unidirectional" | "bidirectional";
      relationship_source: "extraction" | "analysis_pass" | "human_review";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
