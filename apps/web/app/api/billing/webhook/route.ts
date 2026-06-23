import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * POST /api/billing/webhook
 *
 * Stripe webhook handler — syncs subscription state into the `subscriptions` table.
 *
 * Handled events:
 *   checkout.session.completed         → link stripe_subscription_id
 *   customer.subscription.created      → sync status + period
 *   customer.subscription.updated      → sync status + period
 *   customer.subscription.deleted      → mark cancelled
 *
 * Required env vars (server-only):
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET  — from Stripe Dashboard → Webhooks → signing secret
 *
 * In development: use `stripe listen --forward-to localhost:3000/api/billing/webhook`
 */

// Route Handlers in Next.js App Router support raw body via request.text().
// No need to disable body parsing (that was a Pages Router concern).
export const runtime = "nodejs";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: "Missing stripe-signature or STRIPE_WEBHOOK_SECRET" },
      { status: 400 }
    );
  }

  // Read raw body for signature verification
  const body = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    console.error("[stripe/webhook] signature verification failed:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const db = createServiceClient();

  try {
    switch (event.type) {
      // ── Checkout completed → link the subscription ────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const founderId = session.metadata?.founder_id;
        const stripeSubscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (founderId && stripeSubscriptionId) {
          await db
            .from("subscriptions")
            .update({ stripe_subscription_id: stripeSubscriptionId })
            .eq("founder_id", founderId);

          // Advance onboarding state from paywall → preferences (via trial)
          await db
            .from("founders")
            .update({ onboarding_state: "preferences" })
            .eq("id", founderId)
            .in("onboarding_state", ["paywall", "trial"]);
        }
        break;
      }

      // ── Subscription created / updated → sync status ──────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const founderId = subscription.metadata?.founder_id;
        if (!founderId) break;

        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        await db
          .from("subscriptions")
          .update({
            stripe_subscription_id: subscription.id,
            status: mapStripeStatus(subscription.status),
            current_period_end: periodEnd,
          })
          .eq("founder_id", founderId);
        break;
      }

      // ── Subscription deleted → cancel ─────────────────────────────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const founderId = subscription.metadata?.founder_id;
        if (!founderId) break;

        await db
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("founder_id", founderId);
        break;
      }

      default:
        // Unhandled event — return 200 so Stripe doesn't retry
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** Map Stripe subscription status → our sub_status enum (see migration 0001). */
function mapStripeStatus(
  status: Stripe.Subscription["status"]
): "trialing" | "active" | "past_due" | "canceled" | "incomplete" {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
      return "canceled";
    case "paused":
    case "incomplete":
    case "incomplete_expired":
      return "incomplete";
    default:
      return "past_due";
  }
}
