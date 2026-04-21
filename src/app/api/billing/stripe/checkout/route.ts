/**
 * POST /api/billing/stripe/checkout — Stripe Checkout launcher.
 *
 * Feature-flagged behind XTRACT_STRIPE_ENABLED. Flag off (Phase 5 default):
 * return 404 so the route is indistinguishable from a non-existent endpoint
 * — nothing reaches a Stripe SDK by accident.
 *
 * Flag on (Phase 6): this will create a Stripe Checkout session for a credit
 * pack, redirect the caller to Stripe's hosted UI, and the paired webhook
 * route handles the post-payment credit_purchase ledger write.
 *
 * The actual Stripe SDK wiring, tax config, and PCI review land in Phase 6
 * — this stub exists so the schema and app surface can be reviewed now.
 */

import { NextResponse } from "next/server";
import { requireOrgAdmin } from "@/lib/api/auth";
import { isStripeEnabled } from "@/lib/config/flags";

export async function POST(request: Request) {
  if (!isStripeEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const auth = await requireOrgAdmin();
  if (auth.error) return auth.error;
  if (!auth.activeOrgId) {
    return NextResponse.json({ error: "No active organisation" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const credits = (body as { credits?: number }).credits;
  if (typeof credits !== "number" || !Number.isFinite(credits) || credits <= 0) {
    return NextResponse.json({ error: "credits must be a positive number" }, { status: 400 });
  }

  // Phase 6 TODO:
  //   1. Look up / create a Stripe Customer for auth.activeOrgId (stored in a
  //      column on organizations or a side table).
  //   2. Create a Checkout Session with a dynamic line item priced from a
  //      platform-configured cents-per-credit rate.
  //   3. Return the session URL.
  //
  // Holding off on an SDK import here so bundle analysis doesn't pick up
  // Stripe while the flag is off by default.
  return NextResponse.json(
    {
      error: "Stripe checkout is enabled but the integration is not yet wired (Phase 6).",
    },
    { status: 501 }
  );
}
