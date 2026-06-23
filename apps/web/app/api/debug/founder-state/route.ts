import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "not_authenticated", authError: authError?.message });
    }

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: "account_not_found", accountError: accountError?.message, userId: user.id });
    }

    const { data: founder, error: founderError } = await supabase
      .from("founders")
      .select("id, onboarding_state, account_id")
      .eq("account_id", (account as { id: string }).id)
      .single();

    return NextResponse.json({
      userId: user.id,
      accountId: (account as { id: string }).id,
      founder: founder ?? null,
      founderError: founderError?.message ?? null,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) });
  }
}
