import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@influuc/db";

if (typeof globalThis.WebSocket === "undefined") {
  // @ts-ignore
  globalThis.WebSocket = class StubWS extends EventTarget {
    static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
    readyState = 3; close() {} send() {}
  };
}

function createDb() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// OpenAI text-embedding-3-small → 1536 dims (matches brain_facts.embedding).
async function embed(texts: string[]): Promise<number[][] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
  });
  if (!res.ok) { logger.warn("brain.embed: OpenAI error", { status: res.status }); return null; }
  const j = await res.json() as { data: { embedding: number[] }[] };
  return j.data.map((d) => d.embedding);
}

export const brainEmbed = schedules.task({
  id: "brain.embed",
  cron: "0 6 * * *", // daily 06:00 UTC — backfill embeddings for new facts
  maxDuration: 300,

  run: async () => {
    if (!process.env.OPENAI_API_KEY) {
      logger.info("brain.embed: OPENAI_API_KEY not set — semantic retrieval disabled, skipping");
      return { embedded: 0, skipped: true };
    }

    const db = createDb();
    const { data: facts } = await db
      .from("brain_facts")
      .select("id, content")
      .eq("status", "active")
      .is("embedding", null)
      .limit(500);

    if (!facts?.length) { logger.info("brain.embed: nothing to embed"); return { embedded: 0 }; }

    let embedded = 0;
    for (let i = 0; i < facts.length; i += 100) {
      const batch = facts.slice(i, i + 100);
      const vectors = await embed(batch.map((f) => f.content));
      if (!vectors) break;
      for (let k = 0; k < batch.length; k++) {
        await db.from("brain_facts").update({ embedding: JSON.stringify(vectors[k]) }).eq("id", batch[k]!.id);
        embedded++;
      }
    }

    logger.info("brain.embed: done", { embedded });
    return { embedded };
  },
});
