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
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          workspace_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          workspace_id?: string | null;
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
          created_at?: string;
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
