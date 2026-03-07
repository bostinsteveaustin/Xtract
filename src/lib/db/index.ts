// Database types adapter for Supabase
// Maps old Drizzle/Neon types to Supabase types

import type { Database } from "@/lib/supabase/types";

export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type CTXConfiguration = Database["public"]["Tables"]["ctx_configurations"]["Row"];
export type DocumentSet = Database["public"]["Tables"]["document_sets"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type Workflow = Database["public"]["Tables"]["workflows"]["Row"];
export type WorkflowRun = Database["public"]["Tables"]["workflow_runs"]["Row"];
export type ExtractedObject = Database["public"]["Tables"]["extracted_objects"]["Row"];
export type ExtractionDecision = Database["public"]["Tables"]["extraction_decisions"]["Row"];

export type ObjectRelationshipRecord = Database["public"]["Tables"]["object_relationships"]["Row"];

// Aliases for backward compatibility with old code
export type CTXFileRecord = CTXConfiguration;
export type DomainObject = ExtractedObject;
export type Source = Document;
