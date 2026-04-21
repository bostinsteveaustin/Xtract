-- Migration 017: E-08 §5.3, §9.2 — re-key all tenant-scoped RLS from workspace to organisation
-- Adds organization_id to every tenant-scoped table, backfills it, and rewrites
-- every RLS policy to scope by organization_id rather than workspace_id.
-- Workspace still exists as a sub-tenant under organisation but is no longer the
-- top-level isolation boundary.
--
-- Platform admins do not get a global RLS bypass. They pick an organisation via
-- admin-context entry which sets app.current_org_id; get_my_current_org_id()
-- honours that GUC for platform-role holders even without a membership.
--
-- Idempotent: all ADD COLUMNs are IF NOT EXISTS; all DROP POLICY ... IF EXISTS
-- before re-CREATE.

-- ─── 1. get_my_current_org_id() rewrite: honour admin-context for platform roles ─
CREATE OR REPLACE FUNCTION get_my_current_org_id()
RETURNS UUID AS $$
DECLARE
  guc_value       TEXT;
  explicit_org    UUID;
  is_admin        BOOLEAN;
  is_support      BOOLEAN;
  single_org      UUID;
  membership_count INTEGER;
BEGIN
  -- Platform-role context check — used to decide whether a GUC-requested org
  -- is allowed without a membership.
  SELECT
    (platform_role = 'platform_admin'),
    (platform_role = 'platform_support')
    INTO is_admin, is_support
    FROM profiles WHERE id = auth.uid();

  guc_value := current_setting('app.current_org_id', true);

  IF guc_value IS NOT NULL AND guc_value <> '' THEN
    BEGIN
      explicit_org := guc_value::UUID;

      -- Member of the requested org? → honour.
      IF EXISTS (
        SELECT 1 FROM memberships
        WHERE organization_id = explicit_org
          AND user_id = auth.uid()
          AND status = 'active'
      ) THEN
        RETURN explicit_org;
      END IF;

      -- Not a member but has a platform role → honour (admin-context flow).
      IF COALESCE(is_admin, false) OR COALESCE(is_support, false) THEN
        RETURN explicit_org;
      END IF;

      -- Requested an org without membership and no platform role → deny.
      RETURN NULL;
    EXCEPTION WHEN invalid_text_representation THEN
      NULL;  -- malformed GUC → fall through
    END;
  END IF;

  -- No GUC set. Fall back to the single active membership if unambiguous.
  SELECT count(*), max(organization_id)
    INTO membership_count, single_org
    FROM memberships
   WHERE user_id = auth.uid()
     AND status = 'active';

  IF membership_count = 1 THEN
    RETURN single_org;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── 2. Add organization_id to tenant-scoped tables ─────────────────────────
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE ctx_configurations
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE document_sets
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- workflows.org_id already added in 009 (nullable). Rename and make NOT NULL below.
ALTER TABLE workflows
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE workflow_runs
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE extracted_objects
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE extraction_decisions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE workflow_source_documents
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE pipeline_run_documents
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- ─── 3. Backfill organization_id ────────────────────────────────────────────
-- Every existing workspace points at BridgingX under the consolidation seed (015).
DO $$
DECLARE
  bridgingx_id UUID;
BEGIN
  SELECT id INTO bridgingx_id FROM organizations WHERE slug = 'bridgingx';

  IF bridgingx_id IS NULL THEN
    RAISE EXCEPTION 'BridgingX organisation missing — migration 015 has not run';
  END IF;

  UPDATE workspaces             SET organization_id = bridgingx_id WHERE organization_id IS NULL;
  UPDATE ctx_configurations     SET organization_id = bridgingx_id WHERE organization_id IS NULL;
  UPDATE document_sets          SET organization_id = bridgingx_id WHERE organization_id IS NULL;

  UPDATE documents d
     SET organization_id = ds.organization_id
    FROM document_sets ds
   WHERE d.document_set_id = ds.id
     AND d.organization_id IS NULL;

  -- workflows: adopt the pre-existing org_id placeholder from 009 if present,
  -- else backfill from parent workspace's org.
  UPDATE workflows w
     SET organization_id = COALESCE(w.org_id, ws.organization_id, bridgingx_id)
    FROM workspaces ws
   WHERE w.workspace_id = ws.id
     AND w.organization_id IS NULL;

  UPDATE workflow_runs wr
     SET organization_id = w.organization_id
    FROM workflows w
   WHERE wr.workflow_id = w.id
     AND wr.organization_id IS NULL;

  UPDATE extracted_objects eo
     SET organization_id = wr.organization_id
    FROM workflow_runs wr
   WHERE eo.workflow_run_id = wr.id
     AND eo.organization_id IS NULL;

  UPDATE extraction_decisions ed
     SET organization_id = wr.organization_id
    FROM workflow_runs wr
   WHERE ed.workflow_run_id = wr.id
     AND ed.organization_id IS NULL;

  UPDATE workflow_source_documents wsd
     SET organization_id = w.organization_id
    FROM workflows w
   WHERE wsd.workflow_id = w.id
     AND wsd.organization_id IS NULL;

  UPDATE pipeline_run_documents prd
     SET organization_id = wr.organization_id
    FROM workflow_runs wr
   WHERE prd.pipeline_run_id = wr.id
     AND prd.organization_id IS NULL;
END $$;

-- ─── 4. Tighten to NOT NULL + add indexes ───────────────────────────────────
ALTER TABLE workspaces                 ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE ctx_configurations         ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE document_sets              ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE documents                  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE workflows                  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE workflow_runs              ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE extracted_objects          ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE extraction_decisions       ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE workflow_source_documents  ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE pipeline_run_documents     ALTER COLUMN organization_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_workspaces_org                 ON workspaces(organization_id);
CREATE INDEX IF NOT EXISTS idx_ctx_configurations_org         ON ctx_configurations(organization_id);
CREATE INDEX IF NOT EXISTS idx_document_sets_org              ON document_sets(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_org                  ON documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflows_organization         ON workflows(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_org              ON workflow_runs(organization_id);
CREATE INDEX IF NOT EXISTS idx_extracted_objects_org          ON extracted_objects(organization_id);
CREATE INDEX IF NOT EXISTS idx_extraction_decisions_org       ON extraction_decisions(organization_id);
CREATE INDEX IF NOT EXISTS idx_workflow_source_documents_org  ON workflow_source_documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_run_documents_org     ON pipeline_run_documents(organization_id);

-- ─── 5. Drop old workspace-keyed RLS policies ───────────────────────────────
-- workspaces (008 policy)
DROP POLICY IF EXISTS "Users can view workspace via membership" ON workspaces;
DROP POLICY IF EXISTS "Users can view own workspace"            ON workspaces;  -- 001, may still linger

-- ctx_configurations
DROP POLICY IF EXISTS "ctx_configurations_select" ON ctx_configurations;
DROP POLICY IF EXISTS "ctx_configurations_insert" ON ctx_configurations;
DROP POLICY IF EXISTS "ctx_configurations_update" ON ctx_configurations;
DROP POLICY IF EXISTS "ctx_configurations_delete" ON ctx_configurations;

-- document_sets
DROP POLICY IF EXISTS "document_sets_select" ON document_sets;
DROP POLICY IF EXISTS "document_sets_insert" ON document_sets;
DROP POLICY IF EXISTS "document_sets_update" ON document_sets;
DROP POLICY IF EXISTS "document_sets_delete" ON document_sets;

-- documents
DROP POLICY IF EXISTS "documents_select" ON documents;
DROP POLICY IF EXISTS "documents_insert" ON documents;
DROP POLICY IF EXISTS "documents_update" ON documents;
DROP POLICY IF EXISTS "documents_delete" ON documents;

-- workflows
DROP POLICY IF EXISTS "workflows_select" ON workflows;
DROP POLICY IF EXISTS "workflows_insert" ON workflows;
DROP POLICY IF EXISTS "workflows_update" ON workflows;
DROP POLICY IF EXISTS "workflows_delete" ON workflows;

-- workflow_runs
DROP POLICY IF EXISTS "workflow_runs_select" ON workflow_runs;
DROP POLICY IF EXISTS "workflow_runs_insert" ON workflow_runs;
DROP POLICY IF EXISTS "workflow_runs_update" ON workflow_runs;

-- extracted_objects
DROP POLICY IF EXISTS "extracted_objects_select" ON extracted_objects;
DROP POLICY IF EXISTS "extracted_objects_insert" ON extracted_objects;
DROP POLICY IF EXISTS "extracted_objects_update" ON extracted_objects;

-- extraction_decisions
DROP POLICY IF EXISTS "extraction_decisions_select" ON extraction_decisions;
DROP POLICY IF EXISTS "extraction_decisions_insert" ON extraction_decisions;

-- workflow_source_documents
DROP POLICY IF EXISTS "workflow_source_docs_select" ON workflow_source_documents;
DROP POLICY IF EXISTS "workflow_source_docs_insert" ON workflow_source_documents;
DROP POLICY IF EXISTS "workflow_source_docs_delete" ON workflow_source_documents;

-- pipeline_run_documents
DROP POLICY IF EXISTS "pipeline_run_docs_select" ON pipeline_run_documents;
DROP POLICY IF EXISTS "pipeline_run_docs_insert" ON pipeline_run_documents;

-- ─── 6. New org-keyed RLS policies ──────────────────────────────────────────
-- workspaces: members of the org see all workspaces in it; writes gated the same.
DROP POLICY IF EXISTS "workspaces_select_org" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert_org" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update_org" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete_org" ON workspaces;
CREATE POLICY "workspaces_select_org" ON workspaces FOR SELECT
  USING (organization_id = get_my_current_org_id());
CREATE POLICY "workspaces_insert_org" ON workspaces FOR INSERT
  WITH CHECK (organization_id = get_my_current_org_id());
CREATE POLICY "workspaces_update_org" ON workspaces FOR UPDATE
  USING (organization_id = get_my_current_org_id());
CREATE POLICY "workspaces_delete_org" ON workspaces FOR DELETE
  USING (organization_id = get_my_current_org_id());

-- Generic CRUD policy pattern — expressed per-table for clarity (no dynamic SQL).

-- ctx_configurations
CREATE POLICY "ctx_configurations_select" ON ctx_configurations FOR SELECT
  USING (organization_id = get_my_current_org_id());
CREATE POLICY "ctx_configurations_insert" ON ctx_configurations FOR INSERT
  WITH CHECK (organization_id = get_my_current_org_id());
CREATE POLICY "ctx_configurations_update" ON ctx_configurations FOR UPDATE
  USING (organization_id = get_my_current_org_id());
CREATE POLICY "ctx_configurations_delete" ON ctx_configurations FOR DELETE
  USING (organization_id = get_my_current_org_id());

-- document_sets
CREATE POLICY "document_sets_select" ON document_sets FOR SELECT
  USING (organization_id = get_my_current_org_id());
CREATE POLICY "document_sets_insert" ON document_sets FOR INSERT
  WITH CHECK (organization_id = get_my_current_org_id());
CREATE POLICY "document_sets_update" ON document_sets FOR UPDATE
  USING (organization_id = get_my_current_org_id());
CREATE POLICY "document_sets_delete" ON document_sets FOR DELETE
  USING (organization_id = get_my_current_org_id());

-- documents
CREATE POLICY "documents_select" ON documents FOR SELECT
  USING (organization_id = get_my_current_org_id());
CREATE POLICY "documents_insert" ON documents FOR INSERT
  WITH CHECK (organization_id = get_my_current_org_id());
CREATE POLICY "documents_update" ON documents FOR UPDATE
  USING (organization_id = get_my_current_org_id());
CREATE POLICY "documents_delete" ON documents FOR DELETE
  USING (organization_id = get_my_current_org_id());

-- workflows
CREATE POLICY "workflows_select" ON workflows FOR SELECT
  USING (organization_id = get_my_current_org_id());
CREATE POLICY "workflows_insert" ON workflows FOR INSERT
  WITH CHECK (organization_id = get_my_current_org_id());
CREATE POLICY "workflows_update" ON workflows FOR UPDATE
  USING (organization_id = get_my_current_org_id());
CREATE POLICY "workflows_delete" ON workflows FOR DELETE
  USING (organization_id = get_my_current_org_id());

-- workflow_runs
CREATE POLICY "workflow_runs_select" ON workflow_runs FOR SELECT
  USING (organization_id = get_my_current_org_id());
CREATE POLICY "workflow_runs_insert" ON workflow_runs FOR INSERT
  WITH CHECK (organization_id = get_my_current_org_id());
CREATE POLICY "workflow_runs_update" ON workflow_runs FOR UPDATE
  USING (organization_id = get_my_current_org_id());

-- extracted_objects
CREATE POLICY "extracted_objects_select" ON extracted_objects FOR SELECT
  USING (organization_id = get_my_current_org_id());
CREATE POLICY "extracted_objects_insert" ON extracted_objects FOR INSERT
  WITH CHECK (organization_id = get_my_current_org_id());
CREATE POLICY "extracted_objects_update" ON extracted_objects FOR UPDATE
  USING (organization_id = get_my_current_org_id());

-- extraction_decisions
CREATE POLICY "extraction_decisions_select" ON extraction_decisions FOR SELECT
  USING (organization_id = get_my_current_org_id());
CREATE POLICY "extraction_decisions_insert" ON extraction_decisions FOR INSERT
  WITH CHECK (organization_id = get_my_current_org_id());

-- workflow_source_documents
CREATE POLICY "workflow_source_docs_select" ON workflow_source_documents FOR SELECT
  USING (organization_id = get_my_current_org_id());
CREATE POLICY "workflow_source_docs_insert" ON workflow_source_documents FOR INSERT
  WITH CHECK (organization_id = get_my_current_org_id());
CREATE POLICY "workflow_source_docs_delete" ON workflow_source_documents FOR DELETE
  USING (organization_id = get_my_current_org_id());

-- pipeline_run_documents
CREATE POLICY "pipeline_run_docs_select" ON pipeline_run_documents FOR SELECT
  USING (organization_id = get_my_current_org_id());
CREATE POLICY "pipeline_run_docs_insert" ON pipeline_run_documents FOR INSERT
  WITH CHECK (organization_id = get_my_current_org_id());

-- ─── 7. Legacy helper and placeholder cleanup ───────────────────────────────
-- get_my_workspace_id() is still referenced by old code and older migrations
-- (008's workspace_members/workspace_invitations policies still use it). Keep
-- the helper; it reads profiles.workspace_id which remains valid as a
-- "default workspace" hint. Once we drop workspace_members (Phase 3 cleanup)
-- the helper can be retired.

-- Drop the now-redundant workflows.org_id placeholder. organization_id replaces it.
ALTER TABLE workflows DROP COLUMN IF EXISTS org_id;
DROP INDEX IF EXISTS idx_workflows_org;  -- the old placeholder index from 009

COMMENT ON FUNCTION get_my_current_org_id() IS
  'Returns the active organization_id for the current session, sourced from app.current_org_id GUC (set by requireAuth) or from a single active membership. Honours platform-role admin context.';
