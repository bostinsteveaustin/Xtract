-- Migration 009: Workspace Architecture Refactor
-- Extends workflows (engagement containers) with type, description, CTX, org_id.
-- Adds workspace_source_documents, pipeline_run_documents.
-- Extends workflow_runs with structured run fields.
-- Idempotent — safe to run twice.

-- ─── 1. Extend workflows (engagement workspaces) ────────────────────────────

ALTER TABLE workflows
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'custom'
    CHECK (type IN ('contract', 'regulatory', 'knowhow', 'custom')),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS workspace_ctx_id UUID REFERENCES ctx_configurations(id),
  ADD COLUMN IF NOT EXISTS org_id UUID;  -- nullable until E-06; populated by billing migration

-- Index for future org-scoped queries (E-06)
CREATE INDEX IF NOT EXISTS idx_workflows_org ON workflows(org_id) WHERE org_id IS NOT NULL;

-- Backfill type from existing template_id values
UPDATE workflows SET type = CASE
  WHEN template_id ILIKE 'contract%'    THEN 'contract'
  WHEN template_id ILIKE 'ontology%'    THEN 'knowhow'
  WHEN template_id ILIKE 'controls%'    THEN 'regulatory'
  WHEN template_id ILIKE 'regulatory%'  THEN 'regulatory'
  ELSE 'custom'
END
WHERE type = 'custom';  -- only touch rows that haven't been set explicitly

-- ─── 2. Workspace source documents ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_source_documents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID        NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  filename    TEXT        NOT NULL,
  storage_path TEXT       NOT NULL,
  mime_type   TEXT,
  file_size   BIGINT,
  uploaded_by UUID        REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata    JSONB       NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_workflow_source_docs_workflow
  ON workflow_source_documents(workflow_id);

-- ─── 3. Pipeline run documents (join) ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS pipeline_run_documents (
  pipeline_run_id     UUID NOT NULL REFERENCES workflow_runs(id)               ON DELETE CASCADE,
  source_document_id  UUID NOT NULL REFERENCES workflow_source_documents(id)   ON DELETE CASCADE,
  PRIMARY KEY (pipeline_run_id, source_document_id)
);

-- ─── 4. Extend workflow_runs with structured pipeline run fields ────────────

ALTER TABLE workflow_runs
  ADD COLUMN IF NOT EXISTS pipeline_type      TEXT,
  ADD COLUMN IF NOT EXISTS config_pattern     TEXT DEFAULT 'single_pass'
    CHECK (config_pattern IN ('single_pass', 'chunked', 'verified', 'reconciled')),
  ADD COLUMN IF NOT EXISTS technical_ctx_id   UUID REFERENCES ctx_configurations(id),
  ADD COLUMN IF NOT EXISTS credits_debited    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS output_envelope_id UUID;  -- FK to XOE table (future)

-- Backfill pipeline_type from parent workflow's template_id
UPDATE workflow_runs wr
SET pipeline_type = w.template_id
FROM workflows w
WHERE wr.workflow_id = w.id
  AND w.template_id IS NOT NULL
  AND wr.pipeline_type IS NULL;

-- ─── 5. RLS for new tables ──────────────────────────────────────────────────

ALTER TABLE workflow_source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_run_documents    ENABLE ROW LEVEL SECURITY;

-- workflow_source_documents — scoped via workflow → workspace
-- DROP IF EXISTS makes the block idempotent (CREATE POLICY has no IF NOT EXISTS)
DROP POLICY IF EXISTS "workflow_source_docs_select" ON workflow_source_documents;
CREATE POLICY "workflow_source_docs_select" ON workflow_source_documents
  FOR SELECT USING (
    workflow_id IN (
      SELECT id FROM workflows WHERE workspace_id = get_my_workspace_id()
    )
  );

DROP POLICY IF EXISTS "workflow_source_docs_insert" ON workflow_source_documents;
CREATE POLICY "workflow_source_docs_insert" ON workflow_source_documents
  FOR INSERT WITH CHECK (
    workflow_id IN (
      SELECT id FROM workflows WHERE workspace_id = get_my_workspace_id()
    )
  );

DROP POLICY IF EXISTS "workflow_source_docs_delete" ON workflow_source_documents;
CREATE POLICY "workflow_source_docs_delete" ON workflow_source_documents
  FOR DELETE USING (
    workflow_id IN (
      SELECT id FROM workflows WHERE workspace_id = get_my_workspace_id()
    )
  );

-- pipeline_run_documents — scoped via run → workflow → workspace
DROP POLICY IF EXISTS "pipeline_run_docs_select" ON pipeline_run_documents;
CREATE POLICY "pipeline_run_docs_select" ON pipeline_run_documents
  FOR SELECT USING (
    pipeline_run_id IN (
      SELECT wr.id FROM workflow_runs wr
      JOIN workflows w ON wr.workflow_id = w.id
      WHERE w.workspace_id = get_my_workspace_id()
    )
  );

DROP POLICY IF EXISTS "pipeline_run_docs_insert" ON pipeline_run_documents;
CREATE POLICY "pipeline_run_docs_insert" ON pipeline_run_documents
  FOR INSERT WITH CHECK (
    pipeline_run_id IN (
      SELECT wr.id FROM workflow_runs wr
      JOIN workflows w ON wr.workflow_id = w.id
      WHERE w.workspace_id = get_my_workspace_id()
    )
  );
