-- Migration 025: E-08 §4.6, §9.2 Table 24 — record Rig version on every Run
--
-- E-08 Table 24 defines `runs` as the execution record. Xtract's equivalent
-- predates E-08 and is `workflow_runs` from migration 001; the column overlap
-- with the spec is ~95%. Rather than stand up a parallel `runs` table (which
-- would force dual writes across every pipeline code path and a data backfill
-- that buys nothing), this migration extends `workflow_runs` with the E-08
-- additions:
--
--   * rig_id, rig_version  — snapshot of what executed
--   * is_experimental      — true when the pinned rig_version was experimental
--                            at the time the Run started
--   * credit_cost          — numeric placeholder, not wired to billing yet
--                            (billing is Phase 5). Coexists with the older
--                            `credits_debited` integer from migration 009;
--                            once Phase 5 lands, credits_debited drops.
--
-- And it enforces, on every INSERT:
--
--   1. If the workspace is Rig-bound, the Run must reference that exact Rig
--      + version. A Run can't silently execute against a different Rig than
--      its workspace is pinned to. Legacy rows (null rig_id) are permitted
--      while pre-E-08 pipeline code is being migrated — after the code is
--      fully threaded this should flip to NOT NULL in Phase 5.
--   2. The referenced rig_version must exist and must not be 'draft'.
--   3. If 'deprecated', the deprecation window must not have closed. This is
--      the gate that turns "90 days to upgrade" into real enforcement rather
--      than advisory.
--   4. is_experimental is auto-set from the version's state (BEFORE INSERT),
--      so callers don't have to compute it and can't lie about it.
--
-- Idempotent.

-- ─── 1. Columns on workflow_runs ────────────────────────────────────────────
ALTER TABLE workflow_runs
  ADD COLUMN IF NOT EXISTS rig_id UUID
    REFERENCES rigs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rig_version TEXT,
  ADD COLUMN IF NOT EXISTS is_experimental BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_cost NUMERIC(12, 4) NOT NULL DEFAULT 0;

-- rig_id and rig_version must be set together, or both NULL.
ALTER TABLE workflow_runs
  DROP CONSTRAINT IF EXISTS workflow_runs_rig_pair_coherent;
ALTER TABLE workflow_runs
  ADD CONSTRAINT workflow_runs_rig_pair_coherent CHECK (
    (rig_id IS NULL AND rig_version IS NULL)
    OR (rig_id IS NOT NULL AND rig_version IS NOT NULL)
  );

-- Semver shape for rig_version when set.
ALTER TABLE workflow_runs
  DROP CONSTRAINT IF EXISTS workflow_runs_rig_version_semver;
ALTER TABLE workflow_runs
  ADD CONSTRAINT workflow_runs_rig_version_semver CHECK (
    rig_version IS NULL OR rig_version ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  );

CREATE INDEX IF NOT EXISTS idx_workflow_runs_rig
  ON workflow_runs(rig_id, rig_version)
  WHERE rig_id IS NOT NULL;

-- ─── 2. Run-time enforcement trigger ────────────────────────────────────────
-- Fires on INSERT only. A completed Run is immutable in spirit — we don't
-- re-validate the Rig binding on status/output updates, which are normal
-- during the Run's life.
CREATE OR REPLACE FUNCTION workflow_runs_enforce_rig_binding()
RETURNS TRIGGER AS $$
DECLARE
  ws_bound_rig     UUID;
  ws_bound_version TEXT;
  v_state          TEXT;
  v_window_end     TIMESTAMPTZ;
BEGIN
  -- Legacy Runs (pre-E-08 pipeline code not yet threaded) have no rig_id.
  -- Permit them but skip all gating — they also skip the is_experimental
  -- auto-stamp (default false is fine).
  IF NEW.rig_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Look up the workspace's current binding.
  SELECT bound_rig_id, bound_rig_version
    INTO ws_bound_rig, ws_bound_version
    FROM workflows
   WHERE id = NEW.workflow_id;

  -- If the workspace is bound, the Run must match. This catches attempts to
  -- sneak a Run against a different Rig than the workspace is pinned to —
  -- version upgrades must happen via the binding update, not inside Run
  -- creation.
  IF ws_bound_rig IS NOT NULL THEN
    IF NEW.rig_id <> ws_bound_rig OR NEW.rig_version <> ws_bound_version THEN
      RAISE EXCEPTION
        'run rig (%, %) does not match workspace binding (%, %)',
        NEW.rig_id, NEW.rig_version, ws_bound_rig, ws_bound_version;
    END IF;
  END IF;

  -- Version lookup + state gate.
  SELECT state, deprecation_window_ends_at
    INTO v_state, v_window_end
    FROM rig_versions
   WHERE rig_id  = NEW.rig_id
     AND version = NEW.rig_version;

  IF v_state IS NULL THEN
    RAISE EXCEPTION
      'run references non-existent rig version (%, %)',
      NEW.rig_id, NEW.rig_version;
  END IF;

  IF v_state = 'draft' THEN
    RAISE EXCEPTION 'cannot run against a draft rig version';
  END IF;

  IF v_state = 'deprecated'
     AND v_window_end IS NOT NULL
     AND v_window_end < now() THEN
    RAISE EXCEPTION
      'rig version % deprecation window closed at % — upgrade the workspace binding',
      NEW.rig_version, v_window_end;
  END IF;

  -- Auto-stamp is_experimental from the version's state at Run time.
  NEW.is_experimental := (v_state = 'experimental');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workflow_runs_rig_binding_gate ON workflow_runs;
CREATE TRIGGER workflow_runs_rig_binding_gate
  BEFORE INSERT ON workflow_runs
  FOR EACH ROW EXECUTE FUNCTION workflow_runs_enforce_rig_binding();

-- ─── 3. Comments ─────────────────────────────────────────────────────────────
COMMENT ON COLUMN workflow_runs.rig_id IS
  'E-08 §9.2 Table 24. Rig this Run executed against. NULL for legacy pre-E-08 Runs; becomes NOT NULL once every pipeline code path is threaded (Phase 5).';
COMMENT ON COLUMN workflow_runs.rig_version IS
  'E-08 §4.6 version pinning. Snapshot of the exact semver at Run time — a subsequent upgrade of the workspace binding does not rewrite history.';
COMMENT ON COLUMN workflow_runs.is_experimental IS
  'Auto-stamped by workflow_runs_enforce_rig_binding() from the pinned version''s state. Callers cannot override.';
COMMENT ON COLUMN workflow_runs.credit_cost IS
  'E-08 Table 24 placeholder. Billing machinery lands in Phase 5 (credit_ledger). Coexists with legacy credits_debited until then.';
