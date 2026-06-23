"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@influuc/db";

/**
 * Browser-side Supabase client — use inside Client Components ('use client').
 * Returns a new instance each call; callers that need a singleton can memo it.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
