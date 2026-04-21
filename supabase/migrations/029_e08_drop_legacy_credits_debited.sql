-- Migration 029: drop legacy workflow_runs.credits_debited column
--
-- credits_debited was added in migration 009 (workspace architecture refactor)
-- as an integer placeholder for per-run cost. Phase 5 landed the real billing
-- system: credit_cost NUMERIC(12,4) on workflow_runs (migration 025) plus the
-- append-only credit_ledger (migration 026). During Phase 5 the debit path
-- dual-wrote to both columns so the column could be dropped cleanly here
-- without ever losing cost data.
--
-- Deploy coupling — MUST APPLY AFTER the app code that stopped writing this
-- column is live:
--   1. Merge the Phase 6 PR to main.
--   2. Wait for Vercel to finish deploying — no running extraction should
--      still be on the pre-merge build (the default pipeline timeout is
--      300s, so allow ~10 minutes to drain).
--   3. Apply this migration in the Supabase dashboard.
--
-- If this migration is applied before the new app code is live, the OLD
-- pipeline code still writes `credits_debited` on every Run finalize and
-- every write will fail with a 42703 (undefined_column), blocking Runs.
-- The preceding migration 028 is safe to apply at any time; only 029 has
-- the ordering dependency.
--
-- Not idempotent in the strict sense (DROP COLUMN IF EXISTS is, but once
-- dropped it's gone). Re-running is a no-op thanks to IF EXISTS.

ALTER TABLE workflow_runs
  DROP COLUMN IF EXISTS credits_debited;
