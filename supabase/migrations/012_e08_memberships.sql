-- Migration 012: E-08 §9.1 Table 17 — memberships (user ↔ organisation join)
-- Adds membership table, RLS helper functions, and the organizations RLS policies
-- that depend on memberships. Idempotent.

-- ─── Memberships table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('org_admin', 'rig_manager', 'member')),
  capability_flags JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'invited', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user_status ON memberships(user_id, status) WHERE status = 'active';

DROP TRIGGER IF EXISTS memberships_set_updated_at ON memberships;
CREATE TRIGGER memberships_set_updated_at
  BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Helper: am I a member of this org? (ignoring status) ───────────────────
CREATE OR REPLACE FUNCTION is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── Helper: get the current user's active organization_id ──────────────────
-- Prefers the session GUC 'app.current_org_id' set by requireAuth() from the
-- sb-active-org cookie. Falls back to the user's single active membership
-- when only one exists. Returns NULL if the user has no membership or if
-- ambiguous — callers must then require explicit org selection.
CREATE OR REPLACE FUNCTION get_my_current_org_id()
RETURNS UUID AS $$
DECLARE
  guc_value TEXT;
  explicit_org UUID;
  single_org UUID;
  membership_count INTEGER;
BEGIN
  -- 1. Try the session GUC set by the app layer
  guc_value := current_setting('app.current_org_id', true);
  IF guc_value IS NOT NULL AND guc_value <> '' THEN
    BEGIN
      explicit_org := guc_value::UUID;
      IF EXISTS (
        SELECT 1 FROM memberships
        WHERE organization_id = explicit_org
          AND user_id = auth.uid()
          AND status = 'active'
      ) THEN
        RETURN explicit_org;
      END IF;
    EXCEPTION WHEN invalid_text_representation THEN
      -- fall through to fallback
      NULL;
    END;
  END IF;

  -- 2. Fallback: user has exactly one active membership
  SELECT count(*), max(organization_id)
    INTO membership_count, single_org
    FROM memberships
   WHERE user_id = auth.uid()
     AND status = 'active';

  IF membership_count = 1 THEN
    RETURN single_org;
  END IF;

  -- 3. Ambiguous or no membership
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─── Memberships RLS ────────────────────────────────────────────────────────
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- Users can see their own memberships.
DROP POLICY IF EXISTS "memberships_select_own" ON memberships;
CREATE POLICY "memberships_select_own" ON memberships FOR SELECT
  USING (user_id = auth.uid());

-- Org admins can see all memberships in their org.
DROP POLICY IF EXISTS "memberships_select_org_admin" ON memberships;
CREATE POLICY "memberships_select_org_admin" ON memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'org_admin'
        AND m.status = 'active'
    )
  );

-- Org admins can insert/update/delete memberships in their org.
DROP POLICY IF EXISTS "memberships_write_org_admin" ON memberships;
CREATE POLICY "memberships_write_org_admin" ON memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'org_admin'
        AND m.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'org_admin'
        AND m.status = 'active'
    )
  );

-- ─── Organizations RLS (deferred from migration 011) ────────────────────────
-- A user can see an organisation if they have any active membership in it.
-- Platform admin cross-tenant access is granted via a separate policy added
-- after profiles.platform_role exists (migration 013).
DROP POLICY IF EXISTS "organizations_select_member" ON organizations;
CREATE POLICY "organizations_select_member" ON organizations FOR SELECT
  USING (is_org_member(id));

-- Org admins can update their own organisation (name, branding, billing contact).
DROP POLICY IF EXISTS "organizations_update_org_admin" ON organizations;
CREATE POLICY "organizations_update_org_admin" ON organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = organizations.id
        AND m.user_id = auth.uid()
        AND m.role = 'org_admin'
        AND m.status = 'active'
    )
  );

-- Insert / delete on organizations are platform-admin only — no policy here,
-- so non-platform-admin INSERT/DELETE is denied. Platform admin policies land
-- in migration 013 alongside the platform_role column.
