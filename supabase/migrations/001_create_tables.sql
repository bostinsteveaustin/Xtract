-- Xtract Phase 1 Database Schema
-- 9 tables with RLS policies for workspace-scoped access

-- ─── Workspaces ──────────────────────────────────────────────────────────────
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Profiles (extends auth.users) ──────────────────────────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  workspace_id UUID REFERENCES workspaces(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── CTX Configurations ─────────────────────────────────────────────────────
CREATE TABLE ctx_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  content JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'deprecated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Document Sets ──────────────────────────────────────────────────────────
CREATE TABLE document_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Documents ──────────────────────────────────────────────────────────────
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_set_id UUID NOT NULL REFERENCES document_sets(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt', 'md')),
  file_size INTEGER NOT NULL,
  page_count INTEGER,
  text_content TEXT,
  chunk_count INTEGER,
  metadata JSONB,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'ready', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Workflows ──────────────────────────────────────────────────────────────
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id TEXT,
  node_graph JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Workflow Runs ──────────────────────────────────────────────────────────
CREATE TABLE workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  document_set_id UUID REFERENCES document_sets(id),
  ctx_configuration_id UUID REFERENCES ctx_configurations(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  node_states JSONB NOT NULL DEFAULT '{}'::JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  run_by UUID REFERENCES auth.users(id),
  error_message TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Extracted Objects ──────────────────────────────────────────────────────
CREATE TABLE extracted_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL,
  object_icml_id TEXT,
  attributes JSONB NOT NULL,
  source_document_id UUID REFERENCES documents(id),
  source_section TEXT,
  source_page INTEGER,
  source_clause_text TEXT,
  confidence INTEGER CHECK (confidence BETWEEN 0 AND 100),
  rubric_score INTEGER,
  rubric_level TEXT,
  scoring_rationale TEXT,
  provenance JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  reviewed_by UUID REFERENCES auth.users(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Extraction Decisions (audit trail) ─────────────────────────────────────
CREATE TABLE extraction_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  extracted_object_id UUID NOT NULL REFERENCES extracted_objects(id) ON DELETE CASCADE,
  decision_type TEXT NOT NULL CHECK (decision_type IN ('approve', 'reject', 'flag', 'unflag')),
  description TEXT,
  decided_by UUID NOT NULL REFERENCES auth.users(id),
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX idx_profiles_workspace ON profiles(workspace_id);
CREATE INDEX idx_ctx_configurations_workspace ON ctx_configurations(workspace_id);
CREATE INDEX idx_document_sets_workspace ON document_sets(workspace_id);
CREATE INDEX idx_documents_set ON documents(document_set_id);
CREATE INDEX idx_workflows_workspace ON workflows(workspace_id);
CREATE INDEX idx_workflow_runs_workflow ON workflow_runs(workflow_id);
CREATE INDEX idx_extracted_objects_run ON extracted_objects(workflow_run_id);
CREATE INDEX idx_extraction_decisions_run ON extraction_decisions(workflow_run_id);

-- ─── Row Level Security ─────────────────────────────────────────────────────
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ctx_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_decisions ENABLE ROW LEVEL SECURITY;

-- Helper: get current user's workspace_id
CREATE OR REPLACE FUNCTION get_my_workspace_id()
RETURNS UUID AS $$
  SELECT workspace_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Workspaces: owner can see their workspace
CREATE POLICY "Users can view own workspace"
  ON workspaces FOR SELECT
  USING (owner_id = auth.uid());

-- Profiles: users can view and update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

-- Workspace-scoped policies (same pattern for all workspace tables)
-- CTX Configurations
CREATE POLICY "ctx_configurations_select" ON ctx_configurations FOR SELECT
  USING (workspace_id = get_my_workspace_id());
CREATE POLICY "ctx_configurations_insert" ON ctx_configurations FOR INSERT
  WITH CHECK (workspace_id = get_my_workspace_id());
CREATE POLICY "ctx_configurations_update" ON ctx_configurations FOR UPDATE
  USING (workspace_id = get_my_workspace_id());
CREATE POLICY "ctx_configurations_delete" ON ctx_configurations FOR DELETE
  USING (workspace_id = get_my_workspace_id());

-- Document Sets
CREATE POLICY "document_sets_select" ON document_sets FOR SELECT
  USING (workspace_id = get_my_workspace_id());
CREATE POLICY "document_sets_insert" ON document_sets FOR INSERT
  WITH CHECK (workspace_id = get_my_workspace_id());
CREATE POLICY "document_sets_update" ON document_sets FOR UPDATE
  USING (workspace_id = get_my_workspace_id());
CREATE POLICY "document_sets_delete" ON document_sets FOR DELETE
  USING (workspace_id = get_my_workspace_id());

-- Documents (scoped via document_set -> workspace)
CREATE POLICY "documents_select" ON documents FOR SELECT
  USING (document_set_id IN (SELECT id FROM document_sets WHERE workspace_id = get_my_workspace_id()));
CREATE POLICY "documents_insert" ON documents FOR INSERT
  WITH CHECK (document_set_id IN (SELECT id FROM document_sets WHERE workspace_id = get_my_workspace_id()));
CREATE POLICY "documents_update" ON documents FOR UPDATE
  USING (document_set_id IN (SELECT id FROM document_sets WHERE workspace_id = get_my_workspace_id()));
CREATE POLICY "documents_delete" ON documents FOR DELETE
  USING (document_set_id IN (SELECT id FROM document_sets WHERE workspace_id = get_my_workspace_id()));

-- Workflows
CREATE POLICY "workflows_select" ON workflows FOR SELECT
  USING (workspace_id = get_my_workspace_id());
CREATE POLICY "workflows_insert" ON workflows FOR INSERT
  WITH CHECK (workspace_id = get_my_workspace_id());
CREATE POLICY "workflows_update" ON workflows FOR UPDATE
  USING (workspace_id = get_my_workspace_id());
CREATE POLICY "workflows_delete" ON workflows FOR DELETE
  USING (workspace_id = get_my_workspace_id());

-- Workflow Runs (scoped via workflow -> workspace)
CREATE POLICY "workflow_runs_select" ON workflow_runs FOR SELECT
  USING (workflow_id IN (SELECT id FROM workflows WHERE workspace_id = get_my_workspace_id()));
CREATE POLICY "workflow_runs_insert" ON workflow_runs FOR INSERT
  WITH CHECK (workflow_id IN (SELECT id FROM workflows WHERE workspace_id = get_my_workspace_id()));
CREATE POLICY "workflow_runs_update" ON workflow_runs FOR UPDATE
  USING (workflow_id IN (SELECT id FROM workflows WHERE workspace_id = get_my_workspace_id()));

-- Extracted Objects (scoped via workflow_run -> workflow -> workspace)
CREATE POLICY "extracted_objects_select" ON extracted_objects FOR SELECT
  USING (workflow_run_id IN (
    SELECT wr.id FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    WHERE w.workspace_id = get_my_workspace_id()
  ));
CREATE POLICY "extracted_objects_insert" ON extracted_objects FOR INSERT
  WITH CHECK (workflow_run_id IN (
    SELECT wr.id FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    WHERE w.workspace_id = get_my_workspace_id()
  ));
CREATE POLICY "extracted_objects_update" ON extracted_objects FOR UPDATE
  USING (workflow_run_id IN (
    SELECT wr.id FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    WHERE w.workspace_id = get_my_workspace_id()
  ));

-- Extraction Decisions (scoped via workflow_run -> workflow -> workspace)
CREATE POLICY "extraction_decisions_select" ON extraction_decisions FOR SELECT
  USING (workflow_run_id IN (
    SELECT wr.id FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    WHERE w.workspace_id = get_my_workspace_id()
  ));
CREATE POLICY "extraction_decisions_insert" ON extraction_decisions FOR INSERT
  WITH CHECK (workflow_run_id IN (
    SELECT wr.id FROM workflow_runs wr
    JOIN workflows w ON wr.workflow_id = w.id
    WHERE w.workspace_id = get_my_workspace_id()
  ));

-- ─── Auto-create workspace + profile on signup ──────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id UUID;
BEGIN
  INSERT INTO workspaces (name, owner_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s workspace', NEW.id)
  RETURNING id INTO new_workspace_id;

  INSERT INTO profiles (id, email, display_name, workspace_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    new_workspace_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Enable Realtime for workflow_runs (progress updates) ───────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE workflow_runs;
