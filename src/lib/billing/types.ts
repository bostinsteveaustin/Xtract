/**
 * Shared types for Phase 5 billing. Kept in one module so the DB-returned
 * JSONB shapes and the app-layer computation contracts can't drift apart.
 */

/**
 * Rate config shape, matching `rig_versions.credit_rate_config` and the
 * override in `rig_entitlements.credit_rate_override`. Hybrid model locked
 * in Phase 5 — per-token is reserved for when the pipeline meters tokens;
 * per-document is the meaningful unit for the four seeded Rigs.
 *
 * Override merges shallowly onto base; override keys win. Missing keys
 * inherit from base.
 */
export interface HybridRateConfig {
  model: "hybrid";
  base_credits: number;
  per_document: number | null;
  per_token: number | null;
}

export type RateConfig = HybridRateConfig;

/** Raw shape as returned by resolve_credit_rate(); model may be absent for
 *  unconfigured Rigs (empty jsonb). Narrow with `isHybridRateConfig`. */
export type RawRateConfig = Record<string, unknown>;

export function isHybridRateConfig(x: unknown): x is HybridRateConfig {
  if (typeof x !== "object" || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    r.model === "hybrid"
    && typeof r.base_credits === "number"
    && (r.per_document === null || typeof r.per_document === "number")
    && (r.per_token === null || typeof r.per_token === "number")
  );
}

/** Input to cost estimation. Phase 5 uses document count; token metering lands
 *  when the pipeline reports token usage per run. */
export interface RunCostInputs {
  documentCount: number;
  tokenCount?: number;
}

export interface PreflightAllowed {
  allowed: true;
  forced: false;
  cost: number;
  balance: number;
  rate: RateConfig;
}

export interface PreflightForced {
  allowed: true;
  forced: true;
  cost: number;
  balance: number;
  deficit: number;
  rate: RateConfig;
}

export interface PreflightBlocked {
  allowed: false;
  reason: "insufficient_credits" | "rig_not_priced" | "rig_not_bound";
  cost: number | null;
  balance: number;
  deficit: number | null;
  rate: RateConfig | null;
}

export type PreflightResult = PreflightAllowed | PreflightForced | PreflightBlocked;
