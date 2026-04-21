-- Migration 020: E-08 §4.3, §9.1 Table 19 — rig_versions (immutable version snapshots)
--
-- Each row is a specific version of a Rig with its full composition snapshot.
-- Once released (state moves out of 'draft'), the row is effectively immutable:
--   - Immutable columns are enforced by a BEFORE UPDATE trigger.
--   - state and deprecation_window_ends_at remain mutable to allow lifecycle
--     transitions (draft → experimental → validated → deprecated).
--
-- Run.rig_version_id (future Phase 4) will reference this table directly, so
-- the exact composition that produced a Run's output is recoverable.
--
-- RLS: inherits visibility from the parent rig (Published → all; Organisation →
-- members + platform roles). Writes follow the parent's author rules.
--
-- Idempotent.

-- ─── rig_versions table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rig_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rig_id UUID NOT NULL REFERENCES rigs(id) ON DELETE CASCADE,
  version TEXT NOT NULL
    CHECK (version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'),
  state TEXT NOT NULL DEFAULT 'draft'
    CHECK (state IN ('draft', 'experimental', 'validated', 'deprecated')),
  pipeline_pattern TEXT NOT NULL
    CHECK (pipeline_pattern IN (
      'single_pass',
      'chunked',
      'verified',
      'reconciled',
      'composite'
    )),
  ctx_bundle_refs JSONB NOT NULL DEFAULT '[]'::JSONB,       -- [{ctx_id, version}]
  output_contract JSONB NOT NULL DEFAULT '{}'::JSONB,       -- iCML ref / OWL / BPMN / graph
  validation_profile JSONB NOT NULL DEFAULT '{}'::JSONB,    -- thresholds, escalation triggers
  calibration_evidence_id UUID,                             -- FK added after mig 021
  credit_rate_config JSONB NOT NULL DEFAULT '{}'::JSONB,    -- rate model
  review_ui_config JSONB NOT NULL DEFAULT '{}'::JSONB,      -- field surfacing
  methodology_statement TEXT NOT NULL DEFAULT '',
  released_at TIMESTAMPTZ,
  released_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deprecated_at TIMESTAMPTZ,
  deprecation_window_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (rig_id, version),

  -- Release coherence: released_at must be set once state moves out of draft.
  CONSTRAINT rig_versions_release_coherent CHECK (
    (state = 'draft' AND released_at IS NULL)
    OR (state <> 'draft' AND released_at IS NOT NULL)
  ),

  -- Deprecation coherence: both deprecated_at and deprecation_window_ends_at
  -- set together, and only when state = 'deprecated'.
  CONSTRAINT rig_versions_deprecation_coherent CHECK (
    (state <> 'deprecated' AND deprecated_at IS NULL AND deprecation_window_ends_at IS NULL)
    OR (
      state = 'deprecated'
      AND deprecated_at IS NOT NULL
      AND deprecation_window_ends_at IS NOT NULL
      AND deprecation_window_ends_at > deprecated_at
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_rig_versions_rig         ON rig_versions(rig_id);
CREATE INDEX IF NOT EXISTS idx_rig_versions_state       ON rig_versions(state);
CREATE INDEX IF NOT EXISTS idx_rig_versions_rig_state   ON rig_versions(rig_id, state);

-- ─── Immutability: once released, composition fields are frozen ─────────────
-- Allowed mutable fields after release:
--   state  (state-machine transitions)
--   deprecated_at / deprecation_window_ends_at (deprecation bookkeeping)
-- Everything else is frozen — a minor/major/patch change creates a NEW row.
CREATE OR REPLACE FUNCTION rig_versions_enforce_immutability()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.state = 'draft' THEN
    RETURN NEW;  -- draft rows are fully mutable
  END IF;

  IF NEW.rig_id <> OLD.rig_id THEN
    RAISE EXCEPTION 'rig_versions.rig_id is immutable after release';
  END IF;
  IF NEW.version <> OLD.version THEN
    RAISE EXCEPTION 'rig_versions.version is immutable after release';
  END IF;
  IF NEW.pipeline_pattern <> OLD.pipeline_pattern THEN
    RAISE EXCEPTION 'rig_versions.pipeline_pattern is immutable after release';
  END IF;
  IF NEW.ctx_bundle_refs IS DISTINCT FROM OLD.ctx_bundle_refs THEN
    RAISE EXCEPTION 'rig_versions.ctx_bundle_refs is immutable after release';
  END IF;
  IF NEW.output_contract IS DISTINCT FROM OLD.output_contract THEN
    RAISE EXCEPTION 'rig_versions.output_contract is immutable after release';
  END IF;
  IF NEW.validation_profile IS DISTINCT FROM OLD.validation_profile THEN
    RAISE EXCEPTION 'rig_versions.validation_profile is immutable after release';
  END IF;
  IF NEW.calibration_evidence_id IS DISTINCT FROM OLD.calibration_evidence_id THEN
    -- Allow attaching evidence post-release (evidence is collected over time
    -- for experimental→validated promotion), but never detaching.
    IF OLD.calibration_evidence_id IS NOT NULL
       AND NEW.calibration_evidence_id IS DISTINCT FROM OLD.calibration_evidence_id THEN
      RAISE EXCEPTION 'rig_versions.calibration_evidence_id cannot be replaced once set';
    END IF;
  END IF;
  IF NEW.credit_rate_config IS DISTINCT FROM OLD.credit_rate_config THEN
    RAISE EXCEPTION 'rig_versions.credit_rate_config is immutable after release';
  END IF;
  IF NEW.review_ui_config IS DISTINCT FROM OLD.review_ui_config THEN
    RAISE EXCEPTION 'rig_versions.review_ui_config is immutable after release';
  END IF;
  IF NEW.methodology_statement <> OLD.methodology_statement THEN
    RAISE EXCEPTION 'rig_versions.methodology_statement is immutable after release';
  END IF;
  IF NEW.released_at IS DISTINCT FROM OLD.released_at THEN
    RAISE EXCEPTION 'rig_versions.released_at is immutable after release';
  END IF;
  IF NEW.released_by_user_id IS DISTINCT FROM OLD.released_by_user_id THEN
    RAISE EXCEPTION 'rig_versions.released_by_user_id is immutable after release';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rig_versions_immutable ON rig_versions;
CREATE TRIGGER rig_versions_immutable
  BEFORE UPDATE ON rig_versions
  FOR EACH ROW EXECUTE FUNCTION rig_versions_enforce_immutability();

-- ─── State machine: enforce legal transitions ───────────────────────────────
-- draft         → experimental, (deleted)
-- experimental  → validated, deprecated
-- validated     → deprecated
-- deprecated    → (terminal; no transitions out)
CREATE OR REPLACE FUNCTION rig_versions_enforce_state_machine()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.state = NEW.state THEN
    RETURN NEW;
  END IF;

  IF OLD.state = 'draft' AND NEW.state NOT IN ('experimental') THEN
    RAISE EXCEPTION 'illegal transition: draft → %', NEW.state;
  END IF;
  IF OLD.state = 'experimental' AND NEW.state NOT IN ('validated', 'deprecated') THEN
    RAISE EXCEPTION 'illegal transition: experimental → %', NEW.state;
  END IF;
  IF OLD.state = 'validated' AND NEW.state NOT IN ('deprecated') THEN
    RAISE EXCEPTION 'illegal transition: validated → %', NEW.state;
  END IF;
  IF OLD.state = 'deprecated' THEN
    RAISE EXCEPTION 'illegal transition: deprecated is terminal';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rig_versions_state_machine ON rig_versions;
CREATE TRIGGER rig_versions_state_machine
  BEFORE UPDATE OF state ON rig_versions
  FOR EACH ROW EXECUTE FUNCTION rig_versions_enforce_state_machine();

-- ─── RLS ────────────────────────────────────────────────────────────────────
-- Visibility and write rights inherit from the parent rig. Expressed as a
-- subquery rather than a denormalised column to avoid drift.
ALTER TABLE rig_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rig_versions_select" ON rig_versions;
CREATE POLICY "rig_versions_select" ON rig_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rigs r
      WHERE r.id = rig_versions.rig_id
        AND (
          r.tier = 'published'
          OR has_platform_role()
          OR (r.tier = 'organisation' AND is_org_member(r.organization_id))
        )
    )
  );

DROP POLICY IF EXISTS "rig_versions_insert" ON rig_versions;
CREATE POLICY "rig_versions_insert" ON rig_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rigs r
      WHERE r.id = rig_versions.rig_id
        AND (
          (r.tier = 'published'    AND is_platform_admin())
          OR (r.tier = 'organisation' AND can_author_rigs_in_org(r.organization_id))
        )
    )
  );

DROP POLICY IF EXISTS "rig_versions_update" ON rig_versions;
CREATE POLICY "rig_versions_update" ON rig_versions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM rigs r
      WHERE r.id = rig_versions.rig_id
        AND (
          (r.tier = 'published'    AND is_platform_admin())
          OR (r.tier = 'organisation' AND can_author_rigs_in_org(r.organization_id))
        )
    )
  );

COMMENT ON TABLE rig_versions IS
  'E-08 §4.3 Versioned snapshot of a Rig. Once released, composition fields are frozen. State transitions follow draft→experimental→validated→deprecated.';
COMMENT ON COLUMN rig_versions.output_contract IS
  'Schema reference for the Rig output. For Contract Intelligence, references iCML v4.0 including E-02 relationship edges.';
