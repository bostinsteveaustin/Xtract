-- E-02: Object Relationships
-- Stores cross-reference edges between extracted objects (contract pipeline)

CREATE TABLE IF NOT EXISTS object_relationships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  workflow_run_id   UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  source_object_id  TEXT NOT NULL,   -- icml: URI of source object
  target_object_id  TEXT NOT NULL,   -- icml: URI of target object
  relationship_type TEXT NOT NULL,   -- subject_to | conditional_on | supplements | amends | supersedes | related_to | conflicts_with | implements
  direction         TEXT NOT NULL DEFAULT 'unidirectional', -- unidirectional | bidirectional
  confidence        TEXT NOT NULL DEFAULT 'medium',         -- high | medium | low
  source_evidence   TEXT,            -- Clause text establishing the cross-reference
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by run
CREATE INDEX IF NOT EXISTS idx_object_relationships_run
  ON object_relationships (workflow_run_id);

-- Index for fast lookup by source object
CREATE INDEX IF NOT EXISTS idx_object_relationships_source
  ON object_relationships (source_object_id);

-- RLS
ALTER TABLE object_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON object_relationships
  FOR ALL USING (workspace_id = get_my_workspace_id());
