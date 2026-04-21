-- Migration 028: E-08 §4.6 — require rig_id on every new workflow_runs INSERT
--
-- Phase 5 decision (2026-04-21) was to flip workflow_runs.rig_id to NOT NULL
-- at the end of the phase. The dry-run showed 12 pre-E-08 orphan runs whose
-- workflow was never bound to a Rig — these can't be backfilled with a real
-- rig_id, and we don't want to forge one. A plain `ALTER COLUMN ... SET NOT
-- NULL` would refuse to apply while those 12 rows exist.
--
-- Chosen alternative: keep the column nullable at the type level but reject
-- NULL on new INSERTs via the existing workflow_runs_enforce_rig_binding()
-- trigger. Historical orphans remain intact (still queryable, still part of
-- audit history); no new orphan can be created. Functionally equivalent to
-- NOT NULL for all forward traffic without destroying past data.
--
-- This is a trigger body change only — the trigger itself is already
-- registered by migration 025. CREATE OR REPLACE is idempotent.
--
-- Deploy coupling: the app code on feature/e08-foundations has been
-- threading rig_id through resolveWorkspaceRigPin since Phase 4 (mig 024).
-- Every live pipeline entry point supplies rig_id for bound workspaces; the
-- only caller that could trip this is the extract route's "unbound workspace
-- → null rigPin" branch, which Phase 5 already narrowed to preflight-skip +
-- debit-skip. That branch still creates a Run with NULL rig_id and will
-- now be rejected. Intentional — this closes the legacy path as promised
-- in the Phase 5 closure notes.
--
-- Rollback: re-run this migration with the `RETURN NEW` line restored (see
-- mig 025 for the pre-028 trigger body).

CREATE OR REPLACE FUNCTION workflow_runs_enforce_rig_binding()
RETURNS TRIGGER AS $$
DECLARE
  ws_bound_rig     UUID;
  ws_bound_version TEXT;
  v_state          TEXT;
  v_window_end     TIMESTAMPTZ;
BEGIN
  -- rig_id is required on every new Run (E-08 §4.6). Pre-E-08 orphans with
  -- rig_id NULL already exist in the table; this check only fires on new
  -- inserts, so those rows are preserved. Legacy-path inserts (unbound
  -- workspace → null rigPin from resolveWorkspaceRigPin) are intentionally
  -- rejected — bind the workspace before submitting a Run.
  IF NEW.rig_id IS NULL THEN
    RAISE EXCEPTION
      'workflow_runs.rig_id is required — bind the workspace to a Rig before running an extraction (E-08 §4.6)';
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
  ELSE
    -- Workspace not bound but caller supplied a rig_id: require that the
    -- workspace be bound first so ownership/auth checks on the Rig flow
    -- through the binding surface, not through Run submission.
    RAISE EXCEPTION
      'workspace has no Rig binding — bind a Rig before submitting a Run';
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

COMMENT ON FUNCTION workflow_runs_enforce_rig_binding() IS
  'E-08 §4.6 Phase 6 — enforces rig_id required on INSERT, workspace-binding coherence, version-state gating, auto-stamps is_experimental. Historical rig_id NULL rows (12 pre-E-08 orphans) are preserved; new inserts must supply rig_id.';
