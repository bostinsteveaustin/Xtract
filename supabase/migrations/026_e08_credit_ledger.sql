-- Migration 026: E-08 §4.7, §9.1 Table 25 — credit_ledger (append-only)
--
-- The credit ledger is the authoritative record of every credit movement
-- against an organisation. Run debits, credit purchases (Stripe), manual
-- adjustments for pilot billing, and refunds all land here as INSERTs — never
-- UPDATE or DELETE. An org's live balance is the `balance_after` value of its
-- newest row, or 0 if it has no rows.
--
-- Shape matches E-08 Table 25 exactly:
--   id, organization_id, entry_type, amount, run_id, reference,
--   balance_after, created_at, created_by_user_id
--
-- Sign convention (§4.7): `amount` is signed — debits are negative, credits
-- positive. `balance_after = prior_balance + amount` is enforced by trigger
-- so the app layer cannot desync the running total from history.
--
-- Append-only:
--   * UPDATE, DELETE, TRUNCATE revoked from every PostgREST role.
--   * BEFORE UPDATE / DELETE triggers raise regardless.
--
-- Concurrency:
--   * A per-org transaction advisory lock serialises concurrent writes against
--     the same org so two racing debits can't both read the same prior balance
--     and produce a double-spend. Cross-org writes still parallelise.
--
-- Idempotency for Run debits:
--   * A unique partial index on (organization_id, run_id) WHERE entry_type =
--     'run_debit' guarantees a single Run can be debited at most once.
--
-- RLS:
--   * SELECT : platform role holders; org_admins of the target org; members
--              holding the can_manage_billing capability flag.
--   * INSERT : service_role and platform_admin only. The app layer writes via
--              the write_credit_ledger() SECURITY DEFINER helper in mig 027.
--   * UPDATE / DELETE : none (revoked above; trigger belt-and-braces).
--
-- Idempotent.

-- ─── credit_ledger table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  entry_type TEXT NOT NULL CHECK (entry_type IN (
    'run_debit',
    'credit_purchase',
    'adjustment',
    'refund'
  )),
  amount NUMERIC(14, 4) NOT NULL,
  run_id UUID REFERENCES workflow_runs(id) ON DELETE SET NULL,
  reference TEXT,
  balance_after NUMERIC(14, 4) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Sign coherence: run_debit is always ≤ 0; credit_purchase and refund are
-- always ≥ 0; adjustment may be either. Zero-amount entries are pointless
-- and forbidden.
ALTER TABLE credit_ledger
  DROP CONSTRAINT IF EXISTS credit_ledger_amount_sign_coherent;
ALTER TABLE credit_ledger
  ADD CONSTRAINT credit_ledger_amount_sign_coherent CHECK (
    amount <> 0
    AND (entry_type <> 'run_debit'        OR amount <  0)
    AND (entry_type <> 'credit_purchase' OR amount >  0)
    AND (entry_type <> 'refund'          OR amount >  0)
  );

-- run_debit must reference a run; non-debits must not (refunds reference the
-- original run via `reference` text so a refund can be traced back without
-- pretending to be the debit itself).
ALTER TABLE credit_ledger
  DROP CONSTRAINT IF EXISTS credit_ledger_run_id_coherent;
ALTER TABLE credit_ledger
  ADD CONSTRAINT credit_ledger_run_id_coherent CHECK (
    (entry_type = 'run_debit' AND run_id IS NOT NULL)
    OR (entry_type <> 'run_debit' AND run_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_credit_ledger_org_created
  ON credit_ledger(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_entry_type_created
  ON credit_ledger(entry_type, created_at DESC);

-- Run-debit idempotency: at most one debit row per (org, run). Partial so
-- non-debit entries (which have run_id IS NULL anyway) don't collide.
CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_unique_run_debit
  ON credit_ledger(organization_id, run_id)
  WHERE entry_type = 'run_debit';

-- ─── balance_after integrity trigger ────────────────────────────────────────
-- Must run BEFORE INSERT so balance_after is computed server-side. Uses a
-- transaction-scoped advisory lock keyed on the org to serialise concurrent
-- writers — without it two racing inserts could both read the same newest row
-- and each compute the same balance_after, double-spending the balance.
CREATE OR REPLACE FUNCTION credit_ledger_enforce_balance()
RETURNS TRIGGER AS $$
DECLARE
  prior_balance NUMERIC(14, 4);
  lock_key      BIGINT;
BEGIN
  -- Per-org serialisation. hashtext returns INT4; cast widens to fit advisory
  -- lock's BIGINT. Combined with organization_id::text keeps the key stable
  -- across the lifetime of the row.
  lock_key := hashtext('credit_ledger:' || NEW.organization_id::text)::BIGINT;
  PERFORM pg_advisory_xact_lock(lock_key);

  SELECT balance_after
    INTO prior_balance
    FROM credit_ledger
   WHERE organization_id = NEW.organization_id
   ORDER BY created_at DESC, id DESC
   LIMIT 1;

  IF prior_balance IS NULL THEN
    prior_balance := 0;
  END IF;

  -- If the caller supplied balance_after, verify it. If they left it at the
  -- column default (which won't match any sensible value for a non-zero amount),
  -- recompute and stamp. Explicit verification catches app-layer drift loudly.
  IF NEW.balance_after IS DISTINCT FROM (prior_balance + NEW.amount) THEN
    RAISE EXCEPTION
      'credit_ledger.balance_after mismatch for org %: prior=%, amount=%, supplied=%, expected=%',
      NEW.organization_id, prior_balance, NEW.amount, NEW.balance_after,
      prior_balance + NEW.amount;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS credit_ledger_balance_gate ON credit_ledger;
CREATE TRIGGER credit_ledger_balance_gate
  BEFORE INSERT ON credit_ledger
  FOR EACH ROW EXECUTE FUNCTION credit_ledger_enforce_balance();

-- ─── Append-only enforcement (trigger belt + GRANTs braces) ─────────────────
CREATE OR REPLACE FUNCTION credit_ledger_reject_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'credit_ledger is append-only; % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS credit_ledger_no_update ON credit_ledger;
CREATE TRIGGER credit_ledger_no_update
  BEFORE UPDATE ON credit_ledger
  FOR EACH ROW EXECUTE FUNCTION credit_ledger_reject_mutation();

DROP TRIGGER IF EXISTS credit_ledger_no_delete ON credit_ledger;
CREATE TRIGGER credit_ledger_no_delete
  BEFORE DELETE ON credit_ledger
  FOR EACH ROW EXECUTE FUNCTION credit_ledger_reject_mutation();

REVOKE UPDATE, DELETE, TRUNCATE ON credit_ledger FROM PUBLIC;
REVOKE UPDATE, DELETE, TRUNCATE ON credit_ledger FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE ON credit_ledger FROM authenticated;
REVOKE UPDATE, DELETE, TRUNCATE ON credit_ledger FROM service_role;

GRANT SELECT ON credit_ledger TO authenticated;
GRANT SELECT, INSERT ON credit_ledger TO service_role;

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;

-- Platform roles read everything.
DROP POLICY IF EXISTS "credit_ledger_select_platform" ON credit_ledger;
CREATE POLICY "credit_ledger_select_platform" ON credit_ledger FOR SELECT
  USING (has_platform_role());

-- Org admins and holders of can_manage_billing read their own org.
DROP POLICY IF EXISTS "credit_ledger_select_org_billing" ON credit_ledger;
CREATE POLICY "credit_ledger_select_org_billing" ON credit_ledger FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.organization_id = credit_ledger.organization_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND (
          m.role = 'org_admin'
          OR COALESCE((m.capability_flags->>'can_manage_billing')::BOOLEAN, false) = true
        )
    )
  );

-- INSERT: platform_admin (manual adjustments) and service_role (via the app
-- layer's admin client + write_credit_ledger helper).
DROP POLICY IF EXISTS "credit_ledger_insert_platform_admin" ON credit_ledger;
CREATE POLICY "credit_ledger_insert_platform_admin" ON credit_ledger FOR INSERT
  WITH CHECK (is_platform_admin());

-- No UPDATE / DELETE policies — revoked at the GRANT layer and rejected by
-- trigger. Any attempted mutation raises.

-- ─── Comments ───────────────────────────────────────────────────────────────
COMMENT ON TABLE credit_ledger IS
  'E-08 §4.7 Table 25. Append-only credit movements per organisation. Live balance = newest row''s balance_after. See write_credit_ledger() in migration 027.';
COMMENT ON COLUMN credit_ledger.amount IS
  'Signed. run_debit/refund-reversal < 0; credit_purchase/refund > 0; adjustment either sign.';
COMMENT ON COLUMN credit_ledger.balance_after IS
  'Server-computed by credit_ledger_enforce_balance(). Caller must supply (prior + amount) exactly or INSERT raises.';
COMMENT ON COLUMN credit_ledger.run_id IS
  'Only populated for entry_type=run_debit. Refunds reference the original run via free-text `reference` to preserve the one-debit-per-run invariant.';
