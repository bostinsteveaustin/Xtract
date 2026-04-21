-- Migration 027: E-08 §4.7 — credit-resolution and ledger-write SQL helpers
--
-- Three SQL-side helpers sit under the Phase 5 billing app code so that:
--   * rate resolution is authoritative (override-over-base merge lives in one
--     place, not two);
--   * balance reads are consistent (always newest row's balance_after, or 0);
--   * ledger writes happen through one function — callers never recompute
--     balance_after themselves.
--
-- All helpers idempotent via CREATE OR REPLACE.

-- ─── 1. resolve_credit_rate ────────────────────────────────────────────────
-- Returns the effective rate config for a given (org, rig, rig_version).
-- Shape is the hybrid model locked in Phase 5:
--   { "model": "hybrid", "base_credits": int, "per_document": int, "per_token": int|null }
-- The `||` operator does a shallow JSONB merge — our schema is flat so that
-- suffices. Override keys win over base. Missing override returns the base.
-- Missing rig_version returns '{}' — the app layer must decide what that
-- means (Phase 5: refuse to run with "Rig not priced").
CREATE OR REPLACE FUNCTION resolve_credit_rate(
  p_org_id       UUID,
  p_rig_id       UUID,
  p_rig_version  TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  base_config     JSONB;
  override_config JSONB;
BEGIN
  SELECT credit_rate_config INTO base_config
    FROM rig_versions
   WHERE rig_id = p_rig_id
     AND version = p_rig_version;

  IF base_config IS NULL THEN
    RETURN '{}'::JSONB;
  END IF;

  SELECT credit_rate_override INTO override_config
    FROM rig_entitlements
   WHERE organization_id = p_org_id
     AND rig_id          = p_rig_id
     AND revoked_at IS NULL
   LIMIT 1;

  IF override_config IS NULL THEN
    RETURN base_config;
  END IF;

  RETURN base_config || override_config;
END;
$$;

-- ─── 2. get_credit_balance ─────────────────────────────────────────────────
-- Authoritative live-balance read. Newest row's balance_after or 0. Callers
-- that need this under RLS pressure should invoke it via service_role or
-- platform_admin — regular members get 0 back (RLS filter returns no rows).
CREATE OR REPLACE FUNCTION get_credit_balance(p_org_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT balance_after
       FROM credit_ledger
      WHERE organization_id = p_org_id
      ORDER BY created_at DESC, id DESC
      LIMIT 1),
    0
  );
$$;

-- ─── 3. write_credit_ledger ────────────────────────────────────────────────
-- The only intended path for inserts into credit_ledger. Wraps prior-balance
-- lookup + balance_after compute so the app layer never does this arithmetic
-- itself. Returns the new entry id.
--
-- SECURITY DEFINER so it bypasses RLS on both the credit_ledger SELECT (for
-- prior balance) and the INSERT. Grants are narrowed so only authenticated
-- and service_role can execute. Written-as-postgres means the per-org
-- advisory lock from the BEFORE INSERT trigger still fires and still gates
-- concurrent writers.
--
-- Idempotency for run_debit: the unique partial index
-- (organization_id, run_id) WHERE entry_type='run_debit' (mig 026) makes a
-- duplicate insert fail with 23505. Caller should swallow 23505 on run_debit
-- and re-read the existing row.
CREATE OR REPLACE FUNCTION write_credit_ledger(
  p_org_id              UUID,
  p_entry_type          TEXT,
  p_amount              NUMERIC,
  p_run_id              UUID DEFAULT NULL,
  p_reference           TEXT DEFAULT NULL,
  p_created_by_user_id  UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  prior_balance NUMERIC(14, 4);
  new_id        UUID;
  lock_key      BIGINT;
BEGIN
  -- Same advisory lock the trigger takes — acquired here so the prior-balance
  -- read and the insert happen inside one locked window, preventing the
  -- classic read-modify-write race.
  lock_key := hashtext('credit_ledger:' || p_org_id::text)::BIGINT;
  PERFORM pg_advisory_xact_lock(lock_key);

  SELECT balance_after
    INTO prior_balance
    FROM credit_ledger
   WHERE organization_id = p_org_id
   ORDER BY created_at DESC, id DESC
   LIMIT 1;

  IF prior_balance IS NULL THEN
    prior_balance := 0;
  END IF;

  INSERT INTO credit_ledger (
    organization_id,
    entry_type,
    amount,
    run_id,
    reference,
    balance_after,
    created_by_user_id
  ) VALUES (
    p_org_id,
    p_entry_type,
    p_amount,
    p_run_id,
    p_reference,
    prior_balance + p_amount,
    p_created_by_user_id
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Narrow EXECUTE: authenticated (for server-action paths that use the user's
-- session — platform_admin adjustments) + service_role (for the admin-client
-- run-debit path from the extraction API). Revoke from PUBLIC first in case
-- of a re-run with a prior grant.
REVOKE ALL ON FUNCTION write_credit_ledger(UUID, TEXT, NUMERIC, UUID, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION write_credit_ledger(UUID, TEXT, NUMERIC, UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION write_credit_ledger(UUID, TEXT, NUMERIC, UUID, TEXT, UUID) TO service_role;

-- resolve_credit_rate and get_credit_balance are SECURITY INVOKER by default
-- which is what we want — they read data subject to RLS, so a member of a
-- different org can't peek at another org's rate override or balance.
GRANT EXECUTE ON FUNCTION resolve_credit_rate(UUID, UUID, TEXT)  TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_credit_rate(UUID, UUID, TEXT)  TO service_role;
GRANT EXECUTE ON FUNCTION get_credit_balance(UUID)               TO authenticated;
GRANT EXECUTE ON FUNCTION get_credit_balance(UUID)               TO service_role;

COMMENT ON FUNCTION resolve_credit_rate(UUID, UUID, TEXT) IS
  'E-08 §4.7 — merges rig_entitlements.credit_rate_override over rig_versions.credit_rate_config. Override keys win. Empty jsonb means the Rig has no rate set; app layer must refuse to run.';
COMMENT ON FUNCTION get_credit_balance(UUID) IS
  'E-08 §4.7 — live org balance. Newest credit_ledger.balance_after or 0.';
COMMENT ON FUNCTION write_credit_ledger(UUID, TEXT, NUMERIC, UUID, TEXT, UUID) IS
  'E-08 §4.7 — single authoritative path for credit_ledger INSERTs. SECURITY DEFINER; computes balance_after server-side under a per-org advisory lock.';
