-- Migration 018: E-08 Table 23 — workspace_memberships (new role enum)
-- Replaces workspace_members' role enum (owner | admin | member) with the
-- E-08 tier names (workspace_owner | workspace_editor | workspace_viewer).
-- Migrates existing data; leaves workspace_members in place as deprecated
-- until Phase 3 cleanup confirms no application code references it.
-- Idempotent.

-- ─── workspace_memberships table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- denormalised, RLS key
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'workspace_viewer'
    CHECK (role IN ('workspace_owner', 'workspace_editor', 'workspace_viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_memberships_workspace ON workspace_memberships(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_memberships_user      ON workspace_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_memberships_org       ON workspace_memberships(organization_id);

-- ─── Data migration from workspace_members ─────────────────────────────────
-- Role map:
--   owner  → workspace_owner   (full control)
--   admin  → workspace_editor  (no archive / no re-bind, but full write)
--   member → workspace_editor  (current members can execute runs — preserve that)
-- New 'workspace_viewer' tier is created by explicit assignment, not by
-- migration. If the user currently has no workspace access they won't get a row.
INSERT INTO workspace_memberships (workspace_id, organization_id, user_id, role)
SELECT
  wm.workspace_id,
  w.organization_id,
  wm.user_id,
  CASE wm.role
    WHEN 'owner'  THEN 'workspace_owner'
    WHEN 'admin'  THEN 'workspace_editor'
    WHEN 'member' THEN 'workspace_editor'
  END AS role
FROM workspace_members wm
JOIN workspaces w ON w.id = wm.workspace_id
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE workspace_memberships ENABLE ROW LEVEL SECURITY;

-- A user can see workspace_memberships rows in any workspace of their active org.
DROP POLICY IF EXISTS "workspace_memberships_select" ON workspace_memberships;
CREATE POLICY "workspace_memberships_select" ON workspace_memberships FOR SELECT
  USING (organization_id = get_my_current_org_id());

-- Org admins and workspace_owners manage memberships. Expressed as two policies
-- so either condition alone grants write access.
DROP POLICY IF EXISTS "workspace_memberships_write_org_admin" ON workspace_memberships;
CREATE POLICY "workspace_memberships_write_org_admin" ON workspace_memberships FOR ALL
  USING (
    organization_id = get_my_current_org_id()
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = workspace_memberships.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'org_admin'
        AND m.status = 'active'
    )
  )
  WITH CHECK (
    organization_id = get_my_current_org_id()
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = workspace_memberships.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'org_admin'
        AND m.status = 'active'
    )
  );

DROP POLICY IF EXISTS "workspace_memberships_write_workspace_owner" ON workspace_memberships;
CREATE POLICY "workspace_memberships_write_workspace_owner" ON workspace_memberships FOR ALL
  USING (
    organization_id = get_my_current_org_id()
    AND EXISTS (
      SELECT 1 FROM workspace_memberships me
      WHERE me.workspace_id = workspace_memberships.workspace_id
        AND me.user_id = auth.uid()
        AND me.role = 'workspace_owner'
    )
  )
  WITH CHECK (
    organization_id = get_my_current_org_id()
    AND EXISTS (
      SELECT 1 FROM workspace_memberships me
      WHERE me.workspace_id = workspace_memberships.workspace_id
        AND me.user_id = auth.uid()
        AND me.role = 'workspace_owner'
    )
  );

-- ─── Deprecation notice on workspace_members ────────────────────────────────
COMMENT ON TABLE workspace_members IS
  'DEPRECATED in E-08 — use workspace_memberships (org-denormalised, E-08 role enum). Retained for data preservation. Dropped in Phase 3 cleanup.';
