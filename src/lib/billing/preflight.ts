/**
 * Pre-flight insufficient-balance gate for Run submission — E-08 §4.7.
 *
 * Phase 5 rule (decided 2026-04-21): hard block. The Run does not enter the
 * pipeline if the org has insufficient credits. Single exception — a
 * platform_admin operating in admin-context can force. Forced runs are
 * audit-logged by the caller as `run.forced_insufficient_balance` with the
 * calculated deficit in the payload.
 *
 * Document count is the commercial unit that matches `per_document` for all
 * four seeded Rigs. The caller passes the `document_set_id`; we count
 * documents in state 'ready' — the same filter the pipeline will use when it
 * reads the corpus, so the estimate and actual cost can't diverge on
 * documents that fail to ingest.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { estimateRunCost, getCreditBalance, resolveCreditRate } from "./credit-rate";
import type { PreflightResult } from "./types";

export interface PreflightArgs {
  orgId: string;
  rigId: string | null;
  rigVersion: string | null;
  documentSetId: string;
  /** Caller is a platform_admin acting in admin-context; force-run is permitted. */
  canForce: boolean;
}

/**
 * Run the pre-flight checks. Returns a typed result. Caller is responsible
 * for:
 *   * Returning HTTP 402 / friendly error when `allowed` is false.
 *   * Writing the `run.forced_insufficient_balance` audit entry when
 *     `forced` is true.
 *   * Passing `canForce: true` only when the caller has already confirmed
 *     platform_admin + admin-context + explicit override intent.
 */
export async function preflightRunCost(
  admin: SupabaseClient,
  args: PreflightArgs
): Promise<PreflightResult> {
  const balance = await getCreditBalance(admin, args.orgId);

  // Unbound workspace — legacy path. No Rig, no rate, no debit. Allow the
  // run through at zero cost. Once the end-of-Phase-5 rig_id NOT NULL flip
  // lands, unbound workspaces can't submit Runs at all and this branch
  // becomes dead code. Leaving it explicit rather than relying on rigId
  // being set at every call-site.
  if (!args.rigId || !args.rigVersion) {
    return {
      allowed: false,
      reason: "rig_not_bound",
      cost: null,
      balance,
      deficit: null,
      rate: null,
    };
  }

  const rate = await resolveCreditRate(
    admin,
    args.orgId,
    args.rigId,
    args.rigVersion
  );

  if (!rate) {
    return {
      allowed: false,
      reason: "rig_not_priced",
      cost: null,
      balance,
      deficit: null,
      rate: null,
    };
  }

  const { count } = await admin
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("document_set_id", args.documentSetId)
    .eq("status", "ready");

  const documentCount = count ?? 0;
  const cost = estimateRunCost(rate, { documentCount });
  const deficit = cost - balance;

  if (deficit <= 0) {
    return { allowed: true, forced: false, cost, balance, rate };
  }

  if (args.canForce) {
    return { allowed: true, forced: true, cost, balance, deficit, rate };
  }

  return {
    allowed: false,
    reason: "insufficient_credits",
    cost,
    balance,
    deficit,
    rate,
  };
}
