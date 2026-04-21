-- Migration 022: E-08 §4.4, §9.1 Table 21 — rig_entitlements (org → Published-Rig grants)
--
-- Governs which organisations can bind (workspace-bind) which Published Rigs.
-- Organisation-tier rigs don't need entitlements — all org members see their own.
--
-- An entitlement is active when revoked_at IS NULL. Revocation is soft
-- (revoked_at timestamp) so the historical grant is recoverable in audit.
-- Re-granting after revoke creates a NEW row — no in-place resurrection.
--
-- RLS:
--   SELECT : platform_admin, platform_support; org_admin of the entitled org.
--   WRITE  : platform_admin only.
--
-- Idempotent.

-- ─── rig_entitlements table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rig_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rig_id UUID NOT NULL REFERENCES rigs(id) ON DELETE CASCADE,
  granted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  revoked_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  credit_rate_override JSONB
);

-- At most one active entitlement per (org, rig) pair. A partial unique index
-- handles this without preventing historical revoked rows from coexisting.
CREATE UNIQUE INDEX IF NOT EXISTS rig_entitlements_unique_active
  ON rig_entitlements(organization_id, rig_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_rig_entitlements_org
  ON rig_entitlements(organization_id);
CREATE INDEX IF NOT EXISTS idx_rig_entitlements_rig
  ON rig_entitlements(rig_id);

-- ─── Guard: entitlements only for Published rigs ────────────────────────────
-- Organisation-tier rigs don't need entitlements (§4.4 "all members of the
-- organisation have discovery access by default"). Block via trigger because
-- CHECK constraints can't subquery.
CREATE OR REPLACE FUNCTION rig_entitlements_enforce_published()
RETURNS TRIGGER AS $$
DECLARE
  r_tier TEXT;
BEGIN
  SELECT tier INTO r_tier FROM rigs WHERE id = NEW.rig_id;
  IF r_tier IS NULL THEN
    RAISE EXCEPTION 'rig_entitlements.rig_id references a non-existent rig';
  END IF;
  IF r_tier <> 'published' THEN
    RAISE EXCEPTION 'rig_entitlements only applies to Published rigs; got tier=%', r_tier;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rig_entitlements_published_only ON rig_entitlements;
CREATE TRIGGER rig_entitlements_published_only
  BEFORE INSERT ON rig_entitlements
  FOR EACH ROW EXECUTE FUNCTION rig_entitlements_enforce_published();

-- ─── Revoke coherence: revoked_by_user_id iff revoked_at ────────────────────
ALTER TABLE rig_entitlements
  DROP CONSTRAINT IF EXISTS rig_entitlements_revoke_coherent;
ALTER TABLE rig_entitlements
  ADD CONSTRAINT rig_entitlements_revoke_coherent CHECK (
    (revoked_at IS NULL AND revoked_by_user_id IS NULL)
    OR (revoked_at IS NOT NULL AND revoked_by_user_id IS NOT NULL)
  );

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE rig_entitlements ENABLE ROW LEVEL SECURITY;

-- SELECT: platform role holders see all; org_admins see their own org's.
DROP POLICY IF EXISTS "rig_entitlements_select_platform" ON rig_entitlements;
CREATE POLICY "rig_entitlements_select_platform" ON rig_entitlements FOR SELECT
  USING (has_platform_role());

DROP POLICY IF EXISTS "rig_entitlements_select_org_admin" ON rig_entitlements;
CREATE POLICY "rig_entitlements_select_org_admin" ON rig_entitlements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = rig_entitlements.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'org_admin'
        AND m.status = 'active'
    )
  );

-- WRITE: platform_admin only. Revocation is a row UPDATE setting revoked_at.
DROP POLICY IF EXISTS "rig_entitlements_insert_platform_admin" ON rig_entitlements;
CREATE POLICY "rig_entitlements_insert_platform_admin" ON rig_entitlements FOR INSERT
  WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS "rig_entitlements_update_platform_admin" ON rig_entitlements;
CREATE POLICY "rig_entitlements_update_platform_admin" ON rig_entitlements FOR UPDATE
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

COMMENT ON TABLE rig_entitlements IS
  'E-08 §4.4 Table 21 grants an organisation the right to bind a Published Rig. Revocation is soft (revoked_at); re-grant creates a new row.';
