-- Migration 024: E-08 §4.6, §9.2 Table 22 — workspace ↔ Rig binding
--
-- Adds `bound_rig_id` / `bound_rig_version` to the engagement-level workspace.
-- In Xtract the DB table that matches E-08's "Workspace" concept (the container
-- that binds a Rig, holds corpus + Runs) is `workflows` — the legacy DB
-- `workspaces` table is a pre-E-08 tenant placeholder that has already been
-- superseded by `organizations`. A Rig binding on `workspaces` would land in
-- the wrong place.
--
-- Binding rules enforced by trigger (CHECK can't subquery):
--   * Published Rig: org must hold an active rig_entitlements row for that Rig
--     (organisation-tier Rigs are owned by the tenant and bypass this check).
--   * Rig tier coherence: an Organisation Rig can only bind inside its own org.
--   * Version must exist on that Rig.
--   * Bound version must NOT be in state 'draft'.
--   * If the bound version is 'deprecated' and the window has closed, the bind
--     is rejected — new Runs on stale versions is what the window protects
--     against, but so is freshly binding to a wound-down version.
--
-- The Run-side check (a workspace already bound to a deprecated version whose
-- window then expires, attempting a new Run) lands in migration 025 on the
-- runs path. This migration only gates the *bind* action.
--
-- Idempotent.

-- ─── 1. Columns on workflows ────────────────────────────────────────────────
ALTER TABLE workflows
  ADD COLUMN IF NOT EXISTS bound_rig_id UUID
    REFERENCES rigs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bound_rig_version TEXT,
  ADD COLUMN IF NOT EXISTS bound_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bound_by_user_id UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;

-- Both bound_rig_id and bound_rig_version must be set together, or both NULL.
ALTER TABLE workflows
  DROP CONSTRAINT IF EXISTS workflows_rig_binding_coherent;
ALTER TABLE workflows
  ADD CONSTRAINT workflows_rig_binding_coherent CHECK (
    (bound_rig_id IS NULL AND bound_rig_version IS NULL)
    OR (bound_rig_id IS NOT NULL AND bound_rig_version IS NOT NULL)
  );

-- bound_rig_version must be semver when present.
ALTER TABLE workflows
  DROP CONSTRAINT IF EXISTS workflows_rig_binding_semver;
ALTER TABLE workflows
  ADD CONSTRAINT workflows_rig_binding_semver CHECK (
    bound_rig_version IS NULL
    OR bound_rig_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  );

CREATE INDEX IF NOT EXISTS idx_workflows_bound_rig
  ON workflows(bound_rig_id, bound_rig_version)
  WHERE bound_rig_id IS NOT NULL;

-- ─── 2. Bind-time enforcement trigger ───────────────────────────────────────
-- CHECK constraints can't subquery; a trigger does the real gating. Fires on
-- INSERT and on UPDATE when the binding fields change so a subsequent
-- workspace update can't silently point at a Rig/version the org no longer
-- has rights to.
CREATE OR REPLACE FUNCTION workflows_enforce_rig_binding()
RETURNS TRIGGER AS $$
DECLARE
  r_tier            TEXT;
  r_org_id          UUID;
  v_state           TEXT;
  v_window_end      TIMESTAMPTZ;
  has_entitlement   BOOLEAN;
BEGIN
  -- Nothing to check when the binding is being cleared.
  IF NEW.bound_rig_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Short-circuit on UPDATE when binding is untouched.
  IF TG_OP = 'UPDATE'
     AND NEW.bound_rig_id IS NOT DISTINCT FROM OLD.bound_rig_id
     AND NEW.bound_rig_version IS NOT DISTINCT FROM OLD.bound_rig_version THEN
    RETURN NEW;
  END IF;

  -- Resolve the Rig.
  SELECT tier, organization_id INTO r_tier, r_org_id
    FROM rigs
   WHERE id = NEW.bound_rig_id;
  IF r_tier IS NULL THEN
    RAISE EXCEPTION 'bound_rig_id references a non-existent rig';
  END IF;

  -- Cross-tenant guard for Organisation Rigs.
  IF r_tier = 'organisation' AND r_org_id <> NEW.organization_id THEN
    RAISE EXCEPTION
      'Organisation Rig cannot be bound outside its owning organisation';
  END IF;

  -- Published Rigs require an active entitlement in the workspace's org.
  IF r_tier = 'published' THEN
    SELECT EXISTS (
      SELECT 1 FROM rig_entitlements e
       WHERE e.organization_id = NEW.organization_id
         AND e.rig_id          = NEW.bound_rig_id
         AND e.revoked_at IS NULL
    ) INTO has_entitlement;
    IF NOT has_entitlement THEN
      RAISE EXCEPTION
        'organisation has no active entitlement for this Published Rig';
    END IF;
  END IF;

  -- Resolve the version and gate by state.
  SELECT state, deprecation_window_ends_at
    INTO v_state, v_window_end
    FROM rig_versions
   WHERE rig_id = NEW.bound_rig_id
     AND version = NEW.bound_rig_version;

  IF v_state IS NULL THEN
    RAISE EXCEPTION
      'rig % has no version %', NEW.bound_rig_id, NEW.bound_rig_version;
  END IF;

  IF v_state = 'draft' THEN
    RAISE EXCEPTION 'cannot bind to a draft rig version';
  END IF;

  IF v_state = 'deprecated'
     AND v_window_end IS NOT NULL
     AND v_window_end < now() THEN
    RAISE EXCEPTION
      'rig version % is deprecated and past its window end (%)',
      NEW.bound_rig_version, v_window_end;
  END IF;

  -- Stamp audit-ish metadata when binding fields were just set/changed.
  NEW.bound_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workflows_rig_binding_gate ON workflows;
CREATE TRIGGER workflows_rig_binding_gate
  BEFORE INSERT OR UPDATE OF bound_rig_id, bound_rig_version ON workflows
  FOR EACH ROW EXECUTE FUNCTION workflows_enforce_rig_binding();

-- ─── 3. Comments ─────────────────────────────────────────────────────────────
COMMENT ON COLUMN workflows.bound_rig_id IS
  'E-08 §9.2 Table 22. Rig this workspace is pinned to. NULL until bound. Binding is gated by workflows_enforce_rig_binding() — entitlement check, tier coherence, version state.';
COMMENT ON COLUMN workflows.bound_rig_version IS
  'E-08 §4.6. Pinned semver. Runs execute against this exact version until an explicit version-upgrade action is taken.';
