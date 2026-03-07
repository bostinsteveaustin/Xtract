-- E-02: iCML Dependency & Relationship Edges
-- Adds first-class relationship edges between extracted objects

-- ─── Enum types ─────────────────────────────────────────────────────────────
CREATE TYPE relationship_type AS ENUM (
  'supersedes',
  'superseded_by',
  'related_to',
  'duplicates',
  'categorised_under',
  'implements',
  'depends_on',
  'conflicts_with',
  'references'
);

CREATE TYPE relationship_direction AS ENUM (
  'unidirectional',
  'bidirectional'
);

CREATE TYPE relationship_source AS ENUM (
  'extraction',
  'analysis_pass',
  'human_review'
);

-- ─── Object Relationships ───────────────────────────────────────────────────
CREATE TABLE object_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  from_object_icml_id TEXT NOT NULL,
  to_object_icml_id TEXT NOT NULL,
  relationship_type relationship_type NOT NULL,
  direction relationship_direction NOT NULL DEFAULT 'unidirectional',
  confidence INTEGER NOT NULL DEFAULT 70 CHECK (confidence BETWEEN 0 AND 100),
  source relationship_source NOT NULL DEFAULT 'extraction',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX idx_object_relationships_run ON object_relationships(workflow_run_id);
CREATE INDEX idx_object_relationships_from ON object_relationships(from_object_icml_id);
CREATE INDEX idx_object_relationships_to ON object_relationships(to_object_icml_id);

-- ─── Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE object_relationships ENABLE ROW LEVEL SECURITY;

-- Scoped via workflow_run -> workflow -> workspace (same pattern as extracted_objects)
CREATE POLICY "object_relationships_select" ON object_relationships FOR SELECT
  USING (workflow_run_id IN (
    SELECT wr.id FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    WHERE w.workspace_id = get_my_workspace_id()
  ));
CREATE POLICY "object_relationships_insert" ON object_relationships FOR INSERT
  WITH CHECK (workflow_run_id IN (
    SELECT wr.id FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    WHERE w.workspace_id = get_my_workspace_id()
  ));
CREATE POLICY "object_relationships_delete" ON object_relationships FOR DELETE
  USING (workflow_run_id IN (
    SELECT wr.id FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    WHERE w.workspace_id = get_my_workspace_id()
  ));
