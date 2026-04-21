-- Migration 019: E-08 §4, §9.1 Table 18 — rigs (platform-scoped Published, tenant-scoped Organisation)
--
-- A Rig is the calibrated, versioned, executable apparatus for a category of work.
-- Two tiers share one table:
--   published    : BridgingX-authored commercial SKUs, organization_id IS NULL
--   organisation : tenant-authored, organization_id points at the owning org
--
-- The current_state + current_version fields are a denormalised shortcut —
-- the authoritative state lives on rig_versions (migration 020). Keeping the
-- shortcut avoids a join on every list-rigs query.
--
-- RLS:
--   SELECT published     → any authenticated user (so /rigs browse works everywhere)
--   SELECT organisation  → org members OR platform role holders
--   INSERT published     → platform_admin only
--   INSERT organisation  → org_admin / rig_manager in the target org (enforced via policy)
--   UPDATE published     → platform_admin only
--   UPDATE organisation  → org_admin / rig_manager in the owning org
--   DELETE               → no policy (immutable via RLS; admin client bypasses if truly needed)
--
-- Idempotent.

-- ─── rigs table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rigs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  tier TEXT NOT NULL
    CHECK (tier IN ('published', 'organisation')),
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL
    CHECK (category IN (
      'contract_intelligence',
      'controls_extraction',
      'ontology_building',
      'qa_review',
      'custom'
    )),
  forked_from_rig_id UUID REFERENCES rigs(id) ON DELETE SET NULL,
  forked_from_version TEXT,
  current_state TEXT NOT NULL DEFAULT 'draft'
    CHECK (current_state IN ('draft', 'experimental', 'validated', 'deprecated')),
  current_version TEXT NOT NULL DEFAULT '0.1.0'
    CHECK (current_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Tier ↔ organization_id invariant: Published must have no org; Organisation
  -- must have an org. A single missed INSERT elsewhere in the code shouldn't
  -- be able to create a malformed row.
  CONSTRAINT rigs_tier_org_coherent CHECK (
    (tier = 'published'    AND organization_id IS NULL) OR
    (tier = 'organisation' AND organization_id IS NOT NULL)
  )
);

-- Slug uniqueness: Published slugs unique globally; Organisation slugs unique
-- within their org. Use a partial unique index pair instead of a composite key
-- with NULL handling, because PostgreSQL treats NULLs in a multi-column UNIQUE
-- as distinct (so (NULL, 'contract') would repeat).
CREATE UNIQUE INDEX IF NOT EXISTS rigs_slug_unique_published
  ON rigs(slug)
  WHERE tier = 'published';

CREATE UNIQUE INDEX IF NOT EXISTS rigs_slug_unique_organisation
  ON rigs(organization_id, slug)
  WHERE tier = 'organisation';

CREATE INDEX IF NOT EXISTS idx_rigs_tier             ON rigs(tier);
CREATE INDEX IF NOT EXISTS idx_rigs_organization     ON rigs(organization_id)
  WHERE organization_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_rigs_category         ON rigs(category);
CREATE INDEX IF NOT EXISTS idx_rigs_current_state    ON rigs(current_state);
CREATE INDEX IF NOT EXISTS idx_rigs_forked_from      ON rigs(forked_from_rig_id)
  WHERE forked_from_rig_id IS NOT NULL;

-- ─── updated_at trigger ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS rigs_set_updated_at ON rigs;
CREATE TRIGGER rigs_set_updated_at
  BEFORE UPDATE ON rigs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Helper: is the current user an org rig author in this org? ─────────────
-- org_admin and rig_manager can author Organisation-tier rigs in their own org.
-- Capability flag can_author_rigs on memberships.capability_flags can also grant.
CREATE OR REPLACE FUNCTION can_author_rigs_in_org(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND (
        role IN ('org_admin', 'rig_manager')
        OR COALESCE((capability_flags->>'can_author_rigs')::BOOLEAN, false) = true
      )
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE rigs ENABLE ROW LEVEL SECURITY;

-- SELECT: Published rigs are visible to all authenticated users. Browsing the
-- public Rig catalogue is not a privacy concern and it simplifies the /rigs
-- user page. Entitlement for *binding* is governed by rig_entitlements (mig 022).
DROP POLICY IF EXISTS "rigs_select_published" ON rigs;
CREATE POLICY "rigs_select_published" ON rigs FOR SELECT
  USING (tier = 'published');

-- SELECT: Organisation-tier rigs visible to active members of that org, or to
-- platform role holders (audit, support).
DROP POLICY IF EXISTS "rigs_select_organisation" ON rigs;
CREATE POLICY "rigs_select_organisation" ON rigs FOR SELECT
  USING (
    tier = 'organisation'
    AND (
      has_platform_role()
      OR is_org_member(organization_id)
    )
  );

-- INSERT published → platform_admin only.
DROP POLICY IF EXISTS "rigs_insert_published" ON rigs;
CREATE POLICY "rigs_insert_published" ON rigs FOR INSERT
  WITH CHECK (
    tier = 'published'
    AND organization_id IS NULL
    AND is_platform_admin()
  );

-- INSERT organisation → org_admin / rig_manager / holders of can_author_rigs.
DROP POLICY IF EXISTS "rigs_insert_organisation" ON rigs;
CREATE POLICY "rigs_insert_organisation" ON rigs FOR INSERT
  WITH CHECK (
    tier = 'organisation'
    AND organization_id IS NOT NULL
    AND can_author_rigs_in_org(organization_id)
  );

-- UPDATE published → platform_admin only.
DROP POLICY IF EXISTS "rigs_update_published" ON rigs;
CREATE POLICY "rigs_update_published" ON rigs FOR UPDATE
  USING (tier = 'published' AND is_platform_admin())
  WITH CHECK (tier = 'published' AND is_platform_admin());

-- UPDATE organisation → org_admin / rig_manager in the owning org.
DROP POLICY IF EXISTS "rigs_update_organisation" ON rigs;
CREATE POLICY "rigs_update_organisation" ON rigs FOR UPDATE
  USING (
    tier = 'organisation'
    AND can_author_rigs_in_org(organization_id)
  )
  WITH CHECK (
    tier = 'organisation'
    AND can_author_rigs_in_org(organization_id)
  );

COMMENT ON TABLE rigs IS
  'E-08 §4 Rig registry. One row per Rig. current_state / current_version are denormalised shortcuts; authoritative state lives on rig_versions.';
COMMENT ON COLUMN rigs.tier IS
  'published = BridgingX-authored, organization_id NULL. organisation = tenant-authored, organization_id set.';
COMMENT ON COLUMN rigs.current_state IS
  'Lifecycle: draft → experimental → validated → deprecated. Transitions are explicit server actions with audit entries.';
