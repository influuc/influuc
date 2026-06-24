"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentFounder } from "@/lib/founder";
import { revalidatePath } from "next/cache";
import type { Database } from "@influuc/db";

export async function promoteFact(factId: string) {
  const founder = await getCurrentFounder();
  const db = createServiceClient();
  await db
    .from("brain_facts")
    .update({ status: "active", confidence: 0.75 })
    .eq("id", factId)
    .eq("founder_id", founder.id);
  revalidatePath("/dashboard/brain");
}

export async function dismissFact(factId: string) {
  const founder = await getCurrentFounder();
  const db = createServiceClient();
  await db
    .from("brain_facts")
    .update({ status: "rejected" })
    .eq("id", factId)
    .eq("founder_id", founder.id);
  revalidatePath("/dashboard/brain");
}

export async function addFact(layer: Database["public"]["Enums"]["brain_layer_type"], content: string) {
  const founder = await getCurrentFounder();
  const db = createServiceClient();
  await db.from("brain_facts").insert({
    founder_id: founder.id,
    layer,
    key: content.slice(0, 60),
    content,
    confidence: 0.9,
    status: "active",
    source_kind: "manual",
  });
  revalidatePath("/dashboard/brain");
}
