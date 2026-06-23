import { createClient } from "@supabase/supabase-js";
import type { Database } from "@influuc/db";

/**
 * Service-role Supabase client — bypasses RLS entirely.
 * SERVER-SIDE ONLY. Never import in Client Components or expose to the browser.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in env (server-only, no NEXT_PUBLIC_ prefix).
 * Copy it from: Supabase Dashboard → Project Settings → API → service_role.
 */
export function createServiceClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      [
        "SUPABASE_SERVICE_ROLE_KEY is not set.",
        "Copy it from: Supabase Dashboard → Project Settings → API → service_role.",
        "Add it to .env.local (server-only — no NEXT_PUBLIC_ prefix).",
      ].join(" ")
    );
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
