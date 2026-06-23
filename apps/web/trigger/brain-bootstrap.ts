import { task, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@influuc/db";
import { extractBrainFacts } from "../lib/openrouter";

// Trigger.dev runs on Node.js 21 which lacks native WebSocket.
// Supabase's createClient initialises RealtimeClient in its constructor even
// if we never use realtime — polyfill with a no-op stub so the rest API works.
if (typeof globalThis.WebSocket === "undefined") {
  // @ts-ignore
  globalThis.WebSocket = class StubWS extends EventTarget {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
    readyState = 3;
    close() {}
    send() {}
  };
}

function createDb() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function vaultRead(db: ReturnType<typeof createDb>, secretId: string): Promise<string> {
  const { data, error } = await db.rpc("vault_read_secret", { p_id: secretId });
  if (error) throw new Error(`Vault read failed: ${error.message}`);
  return data as string;
}

export type BrainBootstrapPayload = {
  founderId: string;
  rawSourceId: string;
  extractionJobId: string;
};

export const brainBootstrap = task({
  id: "brain.bootstrap",
  maxDuration: 300,
  run: async (payload: BrainBootstrapPayload) => {
    const { founderId, rawSourceId, extractionJobId } = payload;
    const db = createDb();

    logger.info("brain.bootstrap starting", { founderId, rawSourceId, extractionJobId });

    // Mark job as running
    await db
      .from("extraction_jobs")
      .update({ status: "running", attempts: 1 })
      .eq("id", extractionJobId);

    // Fetch raw source
    const { data: rawSource, error: rsError } = await db
      .from("raw_sources")
      .select("*")
      .eq("id", rawSourceId)
      .single();

    if (rsError || !rawSource) {
      await db
        .from("extraction_jobs")
        .update({ status: "failed", error: "raw_source not found" })
        .eq("id", extractionJobId);
      throw new Error(`raw_source ${rawSourceId} not found`);
    }

    // Build content string from raw based on kind
    const raw = rawSource.raw as Record<string, unknown>;
    let content = "";
    let sourceUrl: string | undefined;

    switch (rawSource.kind) {
      case "website": {
        sourceUrl = (raw.url as string) ?? undefined;
        const title = (raw.title as string) ?? "";
        const markdown = (raw.markdown as string) ?? (raw.content as string) ?? "";
        content = title ? `# ${title}\n\n${markdown}` : markdown;
        break;
      }
      case "x": {
        // Handles both X API format (username, tweets[]) and extension format (name, bio, tweets[{text,time}])
        const tweets = (raw.tweets as Array<{ text: string }>) ?? [];
        const handle = (raw.username as string) ?? (raw.name as string) ?? "";
        const bio = (raw.bio as string) ?? "";
        const parts: string[] = [`Twitter/X: @${handle}`];
        if (bio) parts.push(`Bio: ${bio}`);
        parts.push("", "Posts:", ...tweets.map((t) => t.text).filter(Boolean));
        content = parts.join("\n\n");
        break;
      }
      case "linkedin": {
        // Handles both API format (profile.{headline,about}, posts[{text}]) and extension format (name, headline, about, experiences[], posts[string])
        const name = (raw.name as string) ?? "";
        const headline = (raw.headline as string) ?? ((raw.profile as Record<string, unknown> | undefined)?.headline as string) ?? "";
        const about = (raw.about as string) ?? ((raw.profile as Record<string, unknown> | undefined)?.about as string) ?? "";
        const experiences = (raw.experiences as Array<{ title?: string; company?: string; duration?: string }>) ?? [];
        const rawPosts = (raw.posts as Array<string | { text: string }>) ?? [];
        const parts: string[] = [];
        if (name) parts.push(`LinkedIn: ${name}`);
        if (headline) parts.push(`Headline: ${headline}`);
        if (about) parts.push(`About: ${about}`);
        if (experiences.length > 0) {
          parts.push("Experience:");
          for (const e of experiences) {
            if (e.title) parts.push(`  • ${e.title}${e.company ? ` @ ${e.company}` : ""}${e.duration ? ` (${e.duration})` : ""}`);
          }
        }
        if (rawPosts.length > 0) {
          parts.push("Posts:");
          for (const p of rawPosts) {
            const text = typeof p === "string" ? p : p.text;
            if (text) parts.push(text);
          }
        }
        content = parts.join("\n\n");
        break;
      }
      case "manual":
      default:
        content = (raw.text as string) ?? "";
        break;
    }

    if (!content.trim()) {
      await db
        .from("extraction_jobs")
        .update({ status: "failed", error: "empty content" })
        .eq("id", extractionJobId);
      throw new Error("Empty content — nothing to extract");
    }

    logger.info("Calling OpenRouter for brain extraction", {
      kind: rawSource.kind,
      contentLength: content.length,
    });

    // Extract brain facts via OpenRouter
    const extracted = await extractBrainFacts(content, rawSource.kind ?? "unknown", sourceUrl);

    // Delete any facts previously created by this job (handles retries)
    await db.from("brain_facts").delete().eq("created_by_job", extractionJobId);

    // Insert extracted facts
    const layers = Object.keys(extracted) as (keyof typeof extracted)[];
    type FactInsert = Database["public"]["Tables"]["brain_facts"]["Insert"];
    const factRows: FactInsert[] = [];

    for (const layer of layers) {
      const facts = extracted[layer];
      for (const fact of facts) {
        factRows.push({
          founder_id: founderId,
          layer: layer as FactInsert["layer"],
          key: fact.key,
          content: fact.content,
          confidence: Math.max(0, Math.min(1, fact.confidence ?? 0.5)),
          status: "candidate",
          source_kind: rawSource.kind ?? "manual",
          salience: fact.confidence >= 0.8 ? 0.8 : 0.5,
          created_by_job: extractionJobId,
        });
      }
    }

    const totalFacts = factRows.length;
    logger.info("Inserting brain facts", { totalFacts });

    if (factRows.length > 0) {
      const { error: insertError } = await db.from("brain_facts").insert(factRows);
      if (insertError) {
        logger.error("Failed to insert brain_facts", { error: insertError.message });
        await db
          .from("extraction_jobs")
          .update({ status: "failed", error: insertError.message })
          .eq("id", extractionJobId);
        throw new Error(`Insert failed: ${insertError.message}`);
      }
    }

    // Mark job succeeded
    await db
      .from("extraction_jobs")
      .update({ status: "succeeded" })
      .eq("id", extractionJobId);

    logger.info("brain.bootstrap completed", { totalFacts });

    // Advance onboarding_state to 'summary' if ALL jobs for this founder are now done
    const { data: pendingJobs } = await db
      .from("extraction_jobs")
      .select("id")
      .eq("founder_id", founderId)
      .in("status", ["queued", "running"]);

    if (!pendingJobs || pendingJobs.length === 0) {
      logger.info("All extraction jobs done — advancing onboarding_state to summary");
      await db
        .from("founders")
        .update({ onboarding_state: "summary" })
        .eq("id", founderId)
        .eq("onboarding_state", "analysis");
    }

    return { totalFacts };
  },
});
