-- Migration 014: E-08 §9.4 Table 26 — audit_log (append-only, cross-tenant)
-- Captures every security-relevant action. Append-only: UPDATE and DELETE are
-- revoked from the app role so nothing can rewrite history. Indefinite retention.
-- Idempotent.

-- ─── audit_log table ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  acting_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acting_user_platform_role TEXT,          -- snapshot at action time
  target_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  admin_context_flag BOOLEAN NOT NULL DEFAULT false,
  action TEXT NOT NULL,                    -- canonical name e.g. 'user.login'
  resource_type TEXT,
  resource_id UUID,
  payload JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_target_org_created
  ON audit_log(target_organization_id, created_at DESC)
  WHERE target_organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_acting_user_created
  ON audit_log(acting_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action_created
  ON audit_log(action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin_context
  ON audit_log(admin_context_flag, created_at DESC)
  WHERE admin_context_flag = true;

-- ─── Append-only enforcement ────────────────────────────────────────────────
-- Postgres roles: Supabase uses `anon`, `authenticated`, `service_role` for the
-- PostgREST surface. Revoke UPDATE and DELETE from each so nothing shy of a
-- direct-to-Postgres superuser connection can mutate history. SELECT and INSERT
-- are granted (INSERT explicitly, since default grants don't include it on new
-- tables for restricted roles).
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM PUBLIC;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM service_role;

GRANT SELECT, INSERT ON audit_log TO authenticated;
GRANT SELECT, INSERT ON audit_log TO service_role;
-- anon does not need access — the app writes audit rows through authenticated
-- sessions only.

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Platform admins and support can read everything.
DROP POLICY IF EXISTS "audit_log_select_platform" ON audit_log;
CREATE POLICY "audit_log_select_platform" ON audit_log FOR SELECT
  USING (has_platform_role());

-- Org admins can read audit entries for their own org.
DROP POLICY IF EXISTS "audit_log_select_org_admin" ON audit_log;
CREATE POLICY "audit_log_select_org_admin" ON audit_log FOR SELECT
  USING (
    target_organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = audit_log.target_organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'org_admin'
        AND m.status = 'active'
    )
  );

-- Users can read their own audit trail (useful for the Settings > Activity tab later).
DROP POLICY IF EXISTS "audit_log_select_self" ON audit_log;
CREATE POLICY "audit_log_select_self" ON audit_log FOR SELECT
  USING (acting_user_id = auth.uid());

-- Any authenticated user can insert — the app always supplies acting_user_id
-- and we don't want to block legitimate audit writes. A trigger could validate
-- acting_user_id = auth.uid(), but that would prevent service_role from writing
-- on behalf of system actions (e.g. triggered workflows). Application-layer
-- writeAuditEvent() is the source of truth.
DROP POLICY IF EXISTS "audit_log_insert_any" ON audit_log;
CREATE POLICY "audit_log_insert_any" ON audit_log FOR INSERT
  WITH CHECK (true);
