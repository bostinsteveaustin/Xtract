-- Migration 013: E-08 §6, §7.1, §9 — platform_role + mfa_required on profiles
-- Adds the platform tier to the role hierarchy. Two roles:
--   platform_support : read-only cross-tenant (support staff)
--   platform_admin   : full cross-tenant (BridgingX ops)
-- Also introduces platform-tier RLS policies for organizations and memberships
-- so super admins can operate across tenants. Idempotent.

-- ─── Extend profiles ────────────────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS platform_role TEXT NOT NULL DEFAULT 'none'
    CHECK (platform_role IN ('none', 'platform_support', 'platform_admin')),
  ADD COLUMN IF NOT EXISTS mfa_required BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_platform_role
  ON profiles(platform_role)
  WHERE platform_role <> 'none';

-- Keep mfa_required in sync with platform_role: any non-'none' platform role
-- forces MFA. Application code also enforces this; the DB-level trigger is
-- defence-in-depth.
CREATE OR REPLACE FUNCTION sync_mfa_required()
RETURNS TRIGGER AS $$
BEGIN
  NEW.mfa_required := (NEW.platform_role <> 'none');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_sync_mfa_required ON profiles;
CREATE TRIGGER profiles_sync_mfa_required
  BEFORE INSERT OR UPDATE OF platform_role ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_mfa_required();

-- ─── Helpers: is the current user a platform role holder? ───────────────────
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND platform_role = 'platform_admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_platform_support()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND platform_role = 'platform_support'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- True for either platform role — used for read-across-tenants policies.
CREATE OR REPLACE FUNCTION has_platform_role()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND platform_role <> 'none'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── Platform-tier RLS on organizations ─────────────────────────────────────
-- Platform admins and support read all orgs.
DROP POLICY IF EXISTS "organizations_select_platform" ON organizations;
CREATE POLICY "organizations_select_platform" ON organizations FOR SELECT
  USING (has_platform_role());

-- Only platform admin can create / archive organisations.
DROP POLICY IF EXISTS "organizations_insert_platform_admin" ON organizations;
CREATE POLICY "organizations_insert_platform_admin" ON organizations FOR INSERT
  WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "organizations_update_platform_admin" ON organizations;
CREATE POLICY "organizations_update_platform_admin" ON organizations FOR UPDATE
  USING (is_platform_admin());

DROP POLICY IF EXISTS "organizations_delete_platform_admin" ON organizations;
CREATE POLICY "organizations_delete_platform_admin" ON organizations FOR DELETE
  USING (is_platform_admin());

-- ─── Platform-tier RLS on memberships ───────────────────────────────────────
-- Platform admins and support read all memberships.
DROP POLICY IF EXISTS "memberships_select_platform" ON memberships;
CREATE POLICY "memberships_select_platform" ON memberships FOR SELECT
  USING (has_platform_role());

-- Platform admin can create / mutate any membership (seeding, support actions).
DROP POLICY IF EXISTS "memberships_write_platform_admin" ON memberships;
CREATE POLICY "memberships_write_platform_admin" ON memberships FOR ALL
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- ─── Platform-tier RLS on profiles ──────────────────────────────────────────
-- Existing policies (migration 001, 008) let users see their own profile and
-- workspace member profiles. Platform roles read across the board.
DROP POLICY IF EXISTS "profiles_select_platform" ON profiles;
CREATE POLICY "profiles_select_platform" ON profiles FOR SELECT
  USING (has_platform_role());

-- Only platform admin can change another user's platform_role.
-- This is enforced at the application layer too; a policy prevents direct SQL escalation.
DROP POLICY IF EXISTS "profiles_update_platform_admin" ON profiles;
CREATE POLICY "profiles_update_platform_admin" ON profiles FOR UPDATE
  USING (is_platform_admin());
