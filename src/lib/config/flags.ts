/**
 * Single source of truth for Xtract feature flags read from env.
 *
 * Keeping every flag read in one module means:
 *   * Grep the codebase for a flag → one result, not scattered reads.
 *   * Flag gating is uniformly resolved server-side; there's no risk of a
 *     client-side bundle baking in `process.env.X_ENABLED` when the flag was
 *     meant to be server-only.
 *
 * Phase 5 flags:
 *   * XTRACT_STRIPE_ENABLED — gates the Stripe webhook + checkout endpoints
 *     and the Stripe-facing UI. Off in Phase 5 (schema-ready only); flipped
 *     on in Phase 6 once tax + PCI review + real test keys are in place.
 *
 * Phase 1 flags (kept here for consolidation — previously read inline):
 *   * XTRACT_PLATFORM_ADMIN_BYPASS — dev-only escape hatch on the
 *     platform-admin cross-tenant gate.
 */

export function isStripeEnabled(): boolean {
  return process.env.XTRACT_STRIPE_ENABLED === "true";
}

export function isPlatformAdminBypassEnabled(): boolean {
  return process.env.XTRACT_PLATFORM_ADMIN_BYPASS === "true";
}
