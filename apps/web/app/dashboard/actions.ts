"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentFounder } from "@/lib/founder";
import { revalidatePath } from "next/cache";

export async function updatePostStatus(postId: string, status: "approved" | "rejected" | "draft") {
  const founder = await getCurrentFounder();
  const db = createServiceClient();
  await db
    .from("weekly_posts")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("founder_id", founder.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/x");
  revalidatePath("/dashboard/linkedin");
}

export async function updatePostContent(postId: string, content: string) {
  const founder = await getCurrentFounder();
  const db = createServiceClient();
  await db
    .from("weekly_posts")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("founder_id", founder.id);
  revalidatePath("/dashboard/x");
  revalidatePath("/dashboard/linkedin");
}

export async function approveAllPosts(strategyId: string, platform: "x" | "linkedin") {
  const founder = await getCurrentFounder();
  const db = createServiceClient();
  await db
    .from("weekly_posts")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("founder_id", founder.id)
    .eq("strategy_id", strategyId)
    .eq("platform", platform)
    .in("status", ["draft", "rejected"]);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/x");
  revalidatePath("/dashboard/linkedin");
}
