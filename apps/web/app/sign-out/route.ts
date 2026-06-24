import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// POST only — sign-out must not be a GET route because Next.js <Link>
// prefetches GET routes, which would silently sign the user out on page load.
export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
