/**
 * Post-completion run debit — E-08 §4.7.
 *
 * Called from the extract route's finalize block. Writes a single ledger
 * entry at entry_type='run_debit' with amount = -cost, and dual-writes the
 * cost onto workflow_runs for the legacy-column back-compat window (both
 * `credit_cost` NUMERIC and `credits_debited` INTEGER — the latter drops in
 * Phase 6).
 *
 * Idempotency is enforced in SQL: the unique partial index on
 * credit_ledger(organization_id, run_id) WHERE entry_type='run_debit'
 * guarantees one debit per run. A second call on the same run hits that
 * index, is swallowed as a no-op, and returns the existing entry id.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface DebitRunArgs {
  orgId: string;
  runId: string;
  cost: number;
  /** Free-text reference, e.g. "mode2-extract". Stored in credit_ledger.reference. */
  reference?: string;
  /** Optional — the user whose action triggered the run. */
  triggeringUserId?: string | null;
}

export interface DebitRunResult {
  ledgerEntryId: string;
  /** True if this call created the ledger row; false if it already existed
   *  (duplicate Run-complete webhook, retried pipeline, etc.). */
  created: boolean;
}

/**
 * Always uses service_role via the admin client. The SQL helper
 * write_credit_ledger() is SECURITY DEFINER and takes the per-org advisory
 * lock, so even concurrent duplicate debits serialise cleanly.
 *
 * Zero-cost runs do NOT write a ledger row (the credit_ledger amount<>0
 * constraint would reject it); the workflow_runs mirror is still updated
 * so reporting is consistent.
 */
export async function debitRun(
  admin: SupabaseClient,
  args: DebitRunArgs
): Promise<DebitRunResult | null> {
  if (args.cost <= 0) {
    await admin
      .from("workflow_runs")
      .update({
        credit_cost: 0,
        credits_debited: 0,
      })
      .eq("id", args.runId);
    return null;
  }

  const { data, error } = await admin.rpc("write_credit_ledger", {
    p_org_id: args.orgId,
    p_entry_type: "run_debit",
    p_amount: -args.cost,
    p_run_id: args.runId,
    p_reference: args.reference ?? null,
    p_created_by_user_id: args.triggeringUserId ?? null,
  });

  // Postgres unique_violation (SQLSTATE 23505) on the unique partial index
  // means a debit already landed for this run — idempotent re-entry, not an
  // error. Fetch the existing row id and return it.
  if (error) {
    if (error.code === "23505") {
      const { data: existing } = await admin
        .from("credit_ledger")
        .select("id")
        .eq("organization_id", args.orgId)
        .eq("run_id", args.runId)
        .eq("entry_type", "run_debit")
        .maybeSingle();
      if (existing) {
        return { ledgerEntryId: existing.id, created: false };
      }
    }
    throw new Error(`debitRun failed: ${error.message}`);
  }

  // Mirror the cost onto the run row for reporting + legacy-column compat.
  // Integer truncation for credits_debited is intentional — the column drops
  // in Phase 6 and its precision is no longer load-bearing.
  await admin
    .from("workflow_runs")
    .update({
      credit_cost: args.cost,
      credits_debited: Math.round(args.cost),
    })
    .eq("id", args.runId);

  return { ledgerEntryId: data as string, created: true };
}
