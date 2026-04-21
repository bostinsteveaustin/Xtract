/**
 * Credit-rate resolution and run-cost estimation. Delegates rate lookup to
 * the SQL helper `resolve_credit_rate(org, rig, version)` from migration 027
 * so the override-over-base merge policy lives in one place (SQL). This
 * module just wraps and validates the return shape.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isHybridRateConfig,
  type RateConfig,
  type RawRateConfig,
  type RunCostInputs,
} from "./types";

/**
 * Resolve the effective rate for (org, rig, rigVersion). Returns null when
 * the Rig has no rate configured — caller should refuse the run rather than
 * silently picking a default.
 *
 * Expects a service-role client so RLS doesn't strip out the override row.
 */
export async function resolveCreditRate(
  admin: SupabaseClient,
  orgId: string,
  rigId: string,
  rigVersion: string
): Promise<RateConfig | null> {
  const { data, error } = await admin.rpc("resolve_credit_rate", {
    p_org_id: orgId,
    p_rig_id: rigId,
    p_rig_version: rigVersion,
  });

  if (error) {
    throw new Error(`resolve_credit_rate failed: ${error.message}`);
  }

  const raw = (data ?? {}) as RawRateConfig;
  if (Object.keys(raw).length === 0) return null;

  if (!isHybridRateConfig(raw)) {
    // A Rig was released with a malformed rate config — that's a platform-
    // admin authoring bug, not a customer-visible condition. Surface loudly
    // so the Rig is fixed rather than running at a silent zero cost.
    throw new Error(
      `Rig ${rigId}@${rigVersion} has a malformed credit_rate_config: ${JSON.stringify(raw)}`
    );
  }
  return raw;
}

/**
 * Pure cost computation. Separated so tests can pin behaviour without DB.
 * Total = base_credits + per_document × documents + per_token × tokens.
 * null rates are treated as 0 contribution (not an error — a Rig can
 * legitimately be base-only).
 */
export function estimateRunCost(
  rate: RateConfig,
  inputs: RunCostInputs
): number {
  const docPart = rate.per_document !== null
    ? rate.per_document * inputs.documentCount
    : 0;
  const tokenPart = rate.per_token !== null && inputs.tokenCount !== undefined
    ? rate.per_token * inputs.tokenCount
    : 0;
  return rate.base_credits + docPart + tokenPart;
}

/**
 * Live balance for an org. Delegates to get_credit_balance() so the "newest
 * row's balance_after or 0" rule lives in SQL.
 */
export async function getCreditBalance(
  admin: SupabaseClient,
  orgId: string
): Promise<number> {
  const { data, error } = await admin.rpc("get_credit_balance", {
    p_org_id: orgId,
  });
  if (error) {
    throw new Error(`get_credit_balance failed: ${error.message}`);
  }
  return Number(data ?? 0);
}
