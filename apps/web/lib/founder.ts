import { createClient } from "@/lib/supabase/server";
import type { Founder } from "@influuc/db";

/**
 * Resolve the current authenticated user's founder row.
 * Creates its own server client (uses session cookies from next/headers).
 * Safe to call from Route Handlers and Server Components.
 * Throws if unauthenticated or if DB provisioning is incomplete.
 */
export async function getCurrentFounder(): Promise<Founder> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (accountError || !account) {
    throw new Error("Account not found — provisioning may be incomplete");
  }

  // Cast needed: Supabase's .select("id") returns a complex generic that TS
  // can't narrow to { id: string } after the guard throw above.
  const accountId = (account as { id: string }).id;

  const { data: founder, error: founderError } = await supabase
    .from("founders")
    .select("*")
    .eq("account_id", accountId)
    .single();

  if (founderError || !founder) {
    throw new Error("Founder not found — provisioning may be incomplete");
  }

  return founder as Founder;
}
