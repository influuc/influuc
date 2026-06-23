import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout session in subscription mode with a 14-day trial.
 * The user must be authenticated. Returns { url } — redirect the browser there.
 *
 * Called from the /onboarding/paywall step.
 *
 * Required env vars (server-only):
 *   STRIPE_SECRET_KEY
 *   STRIPE_PRICE_ID  — the recurring price ID from the Stripe dashboard
 */

const TRIAL_DAYS = 14;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export async function POST(request: Request) {
  // ── 1. Authenticate ──────────────────────────────────────────────────────
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── 2. Resolve founder via service client (bypasses RLS) ─────────────────
  const db = createServiceClient();

  const { data: account } = await db
    .from("accounts")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const { data: founder } = await db
    .from("founders")
    .select("id")
    .eq("account_id", account.id)
    .single();

  if (!founder) {
    return NextResponse.json({ error: "Founder not found" }, { status: 404 });
  }

  // ── 3. Get or create Stripe customer ─────────────────────────────────────
  const { data: sub } = await db
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("founder_id", founder.id)
    .single();

  const stripe = getStripe();
  let customerId = sub?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { founder_id: founder.id },
    });
    customerId = customer.id;

    // Persist the customer ID so we don't create duplicates
    await db
      .from("subscriptions")
      .update({ stripe_customer_id: customerId })
      .eq("founder_id", founder.id);
  }

  // ── 4. Origin for redirect URLs ───────────────────────────────────────────
  const referer = request.headers.get("referer") ?? "http://localhost:3000";
  const { origin } = new URL(referer);

  // ── 5. Create Checkout session ────────────────────────────────────────────
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    return NextResponse.json(
      { error: "Billing not configured — STRIPE_PRICE_ID is not set" },
      { status: 503 }
    );
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_collection: "always",
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { founder_id: founder.id },
    },
    metadata: { founder_id: founder.id },
    success_url: `${origin}/onboarding/preferences?checkout=success`,
    cancel_url: `${origin}/onboarding/paywall?checkout=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
