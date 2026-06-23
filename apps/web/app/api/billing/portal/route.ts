import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import Stripe from "stripe";

/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session for managing subscriptions.
 * Returns { url } — redirect the browser there.
 *
 * Required env vars (server-only):
 *   STRIPE_SECRET_KEY
 */

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

  // ── 2. Get Stripe customer ID ─────────────────────────────────────────────
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

  const { data: sub } = await db
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("founder_id", founder.id)
    .single();

  const customerId = sub?.stripe_customer_id;
  if (!customerId) {
    return NextResponse.json(
      { error: "No billing account found. Complete checkout first." },
      { status: 400 }
    );
  }

  // ── 3. Create portal session ──────────────────────────────────────────────
  const referer = request.headers.get("referer") ?? "http://localhost:3000";
  const { origin } = new URL(referer);

  const stripe = getStripe();
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${origin}/dashboard/settings`,
  });

  return NextResponse.json({ url: portalSession.url });
}
