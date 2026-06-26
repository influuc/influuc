import { NextResponse } from "next/server";
import { getCurrentFounder } from "@/lib/founder";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const founder = await getCurrentFounder();
    const { action } = (await request.json()) as { action: "accept" | "dismiss" };

    if (action !== "accept" && action !== "dismiss") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const db = createServiceClient();
    const newStatus = action === "accept" ? "accepted" : "dismissed";

    const { error } = await db
      .from("opportunities")
      .update({ status: newStatus })
      .eq("id", id)
      .eq("founder_id", founder.id)
      .in("status", ["surfaced", "accepted", "dismissed"]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, status: newStatus });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
