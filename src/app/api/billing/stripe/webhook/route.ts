/**
 * POST /api/billing/stripe/webhook — Stripe post-payment webhook.
 *
 * Feature-flagged behind XTRACT_STRIPE_ENABLED. Flag off (Phase 5 default):
 * return 404. Flag on (Phase 6): validate the Stripe signature, ignore any
 * event type other than `checkout.session.completed`, look up the caller's
 * org via the Customer metadata, and write a credit_purchase ledger entry
 * for the purchased credit pack.
 *
 * The real wiring lands in Phase 6. This stub documents the intended
 * contract so the schema (credit_ledger.entry_type='credit_purchase', audit
 * action billing.credit_purchased) is reviewable now.
 *
 * Idempotency model (Phase 6): the Stripe event id becomes the ledger
 * `reference` field, and a unique index on
 * (organization_id, reference) WHERE entry_type='credit_purchase' prevents
 * double-crediting on webhook retries. That index is NOT created in Phase 5
 * because it's premature until the real webhook handler exists.
 */

import { NextResponse } from "next/server";
import { isStripeEnabled } from "@/lib/config/flags";

export async function POST() {
  if (!isStripeEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Phase 6 TODO:
  //   1. Read raw body + `stripe-signature` header.
  //   2. Verify signature with stripe.webhooks.constructEvent(...) using
  //      STRIPE_WEBHOOK_SECRET.
  //   3. Switch on event.type === 'checkout.session.completed'.
  //   4. Resolve organization_id from Customer metadata.
  //   5. Call rpc('write_credit_ledger', {...entry_type='credit_purchase',
  //      reference=event.id}) — idempotent via the partial unique index.
  //   6. writeSystemAuditEvent({ action: BILLING_CREDIT_PURCHASED, ... }).
  //
  // Returning 501 so Stripe retries while the handler is stub; swap to 200
  // when the real path lands in Phase 6.
  return NextResponse.json(
    { error: "Stripe webhook is enabled but the handler is not yet wired (Phase 6)." },
    { status: 501 }
  );
}
