-- Migration 021: E-08 §4.3, §9.1 Table 20 — calibration_evidence (immutable validation artefacts)
--
-- Required for experimental → validated promotion. Evidence types per §12.2
-- Table 20 and Table 5 (repeatability gate):
--   noise_floor       : baseline measurement of non-deterministic variance
--   repeatability     : multiple runs on same input, compared for stability
--   factorial_design  : systematic sweep of configuration parameters
--   domain_test       : run against a second independent domain (the Amy Williams gate)
--
-- Evidence is append-only. Once attached, a row is never updated or deleted.
-- RLS inherits from the parent rig_version → parent rig.
--
-- After this migration lands, rig_versions.calibration_evidence_id gets its FK.
-- Idempotent.

-- ─── calibration_evidence table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calibration_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rig_version_id UUID NOT NULL REFERENCES rig_versions(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL
    CHECK (evidence_type IN (
      'noise_floor',
      'repeatability',
      'factorial_design',
      'domain_test'
    )),
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  attached_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  attached_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calibration_evidence_rig_version
  ON calibration_evidence(rig_version_id);
CREATE INDEX IF NOT EXISTS idx_calibration_evidence_type
  ON calibration_evidence(rig_version_id, evidence_type);

-- ─── Append-only enforcement ────────────────────────────────────────────────
-- Immutable artefact per §4.3 Table 3. Revoke UPDATE and DELETE from app roles.
-- A superuser direct connection can still correct data if truly necessary.
REVOKE UPDATE, DELETE, TRUNCATE ON calibration_evidence FROM PUBLIC;
REVOKE UPDATE, DELETE, TRUNCATE ON calibration_evidence FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE ON calibration_evidence FROM authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON calibration_evidence FROM service_role;

GRANT SELECT, INSERT ON calibration_evidence TO authenticated;
GRANT SELECT, INSERT ON calibration_evidence TO service_role;

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE calibration_evidence ENABLE ROW LEVEL SECURITY;

-- SELECT: same visibility as parent rig_version.
DROP POLICY IF EXISTS "calibration_evidence_select" ON calibration_evidence;
CREATE POLICY "calibration_evidence_select" ON calibration_evidence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM rig_versions rv
      JOIN rigs r ON r.id = rv.rig_id
      WHERE rv.id = calibration_evidence.rig_version_id
        AND (
          r.tier = 'published'
          OR has_platform_role()
          OR (r.tier = 'organisation' AND is_org_member(r.organization_id))
        )
    )
  );

-- INSERT: same write rule as parent rig (platform_admin for Published;
-- org_admin/rig_manager for Organisation).
DROP POLICY IF EXISTS "calibration_evidence_insert" ON calibration_evidence;
CREATE POLICY "calibration_evidence_insert" ON calibration_evidence FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rig_versions rv
      JOIN rigs r ON r.id = rv.rig_id
      WHERE rv.id = calibration_evidence.rig_version_id
        AND (
          (r.tier = 'published'    AND is_platform_admin())
          OR (r.tier = 'organisation' AND can_author_rigs_in_org(r.organization_id))
        )
    )
  );

-- ─── Backfill FK on rig_versions ────────────────────────────────────────────
-- Now that calibration_evidence exists, add the referential constraint on
-- rig_versions.calibration_evidence_id. Deferred so migrations 020 and 021
-- don't have a circular ordering dependency at their own CREATE TABLE time.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rig_versions_calibration_evidence_fk'
  ) THEN
    ALTER TABLE rig_versions
      ADD CONSTRAINT rig_versions_calibration_evidence_fk
      FOREIGN KEY (calibration_evidence_id)
      REFERENCES calibration_evidence(id)
      ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON TABLE calibration_evidence IS
  'E-08 §4.3 Table 20 immutable validation artefacts. Required for experimental→validated promotion; append-only.';
