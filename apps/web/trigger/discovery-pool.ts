import { schedules, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
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

// ── Niche taxonomy: queries + RSS feeds scraped ONCE per cluster, shared to all ──
export const CLUSTERS: Record<string, { queries: string[]; rss: string[] }> = {
  personal_branding: {
    queries: [
      "personal branding strategy founders 2025",
      "building audience on social media trends",
      "creator economy personal brand news",
    ],
    rss: [
      "https://blog.hootsuite.com/feed/",
      "https://www.socialmediaexaminer.com/feed/",
    ],
  },
  ai: {
    queries: [
      "breaking AI news startups",
      "generative AI industry trend",
      "AI agents product launch",
    ],
    rss: [
      "https://venturebeat.com/category/ai/feed/",
      "https://www.technologyreview.com/feed/",
    ],
  },
  business: {
    queries: [
      "startup funding news",
      "entrepreneurship trend founders",
      "B2B growth strategy",
    ],
    rss: [
      "https://techcrunch.com/feed/",
      "https://news.ycombinator.com/rss",
    ],
  },
  saas_agency: {
    queries: [
      "SaaS growth strategy news",
      "agency scaling trends",
      "B2B SaaS product launch",
    ],
    rss: [
      "https://www.saastr.com/feed/",
    ],
  },
  content_creation: {
    queries: [
      "content marketing trend 2025",
      "YouTube creator strategy news",
      "video content distribution",
    ],
    rss: [
      "https://contentmarketinginstitute.com/feed/",
    ],
  },
};

/** Map a founder's free-text topics to canonical clusters. */
export function topicsToClusters(topics: string[]): string[] {
  const t = topics.map((s) => s.toLowerCase()).join(" ");
  const out = new Set<string>();
  if (/\bai\b|machine learning|llm|gpt|generative|cloning|video generation/.test(t)) out.add("ai");
  if (/personal brand|branding|personal|authority|audience|influenc/.test(t)) out.add("personal_branding");
  if (/saas|agency/.test(t)) out.add("saas_agency");
  if (/business|startup|entrepreneur|sales|growth|b2b/.test(t)) out.add("business");
  if (/content|writing|youtube|video|newsletter|creator/.test(t)) out.add("content_creation");
  if (out.size === 0) out.add("personal_branding"); // default to core ICP
  return [...out];
}

interface PoolItem { title: string; url: string; summary: string | null; publishedAt: string | null; sourceKind: "exa" | "rss" }

// ── Exa search (shared per cluster) ──────────────────────────────────────────
async function searchExa(query: string): Promise<PoolItem[]> {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return [];
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey },
      body: JSON.stringify({
        query, numResults: 6, startPublishedDate: cutoff, type: "neural",
        contents: { text: { maxCharacters: 500 }, summary: { query } },
      }),
    });
    if (!res.ok) { logger.warn("pool: exa failed", { status: res.status }); return []; }
    const data = await res.json() as { results: Array<{ title: string; url: string; summary?: string; text?: string; publishedDate?: string }> };
    return (data.results ?? [])
      .filter((r) => r.url && r.title)
      .map((r) => ({ title: r.title, url: r.url, summary: r.summary ?? r.text?.slice(0, 400) ?? null, publishedAt: r.publishedDate ?? null, sourceKind: "exa" as const }));
  } catch (e) { logger.warn("pool: exa error", { err: String(e) }); return []; }
}

// ── Minimal RSS/Atom parser (no dependency) ──────────────────────────────────
function decode(s: string): string {
  return s.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "").trim();
}
function tag(block: string, name: string): string | null {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return m && m[1] !== undefined ? decode(m[1]) : null;
}
function attrLink(block: string): string | null {
  const m = block.match(/<link[^>]*href="([^"]+)"/i);
  return m && m[1] !== undefined ? m[1] : null;
}

async function fetchRss(url: string): Promise<PoolItem[]> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "InfluucBot/1.0" }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const xml = await res.text();
    const blocks = xml.match(/<(item|entry)[\s\S]*?<\/(item|entry)>/gi) ?? [];
    const out: PoolItem[] = [];
    for (const b of blocks.slice(0, 12)) {
      const title = tag(b, "title");
      const link = tag(b, "link") || attrLink(b);
      if (!title || !link || !/^https?:/.test(link)) continue;
      const summary = tag(b, "description") || tag(b, "summary") || null;
      const pub = tag(b, "pubDate") || tag(b, "updated") || tag(b, "published");
      out.push({ title, url: link, summary: summary?.slice(0, 400) ?? null, publishedAt: pub ? new Date(pub).toISOString() : null, sourceKind: "rss" });
    }
    return out;
  } catch (e) { logger.warn("pool: rss error", { url, err: String(e) }); return []; }
}

export const discoveryPoolFill = schedules.task({
  id: "discovery.pool.fill",
  cron: "0 7 * * *", // 7:00 UTC daily, before assignment
  maxDuration: 300,

  run: async () => {
    const db = createDb();
    let inserted = 0;

    for (const [cluster, cfg] of Object.entries(CLUSTERS)) {
      const items: PoolItem[] = [];

      for (const q of cfg.queries) items.push(...await searchExa(q));
      for (const feed of cfg.rss) items.push(...await fetchRss(feed));

      for (const it of items) {
        const dedupeHash = createHash("sha256").update(it.url).digest("hex").slice(0, 32);
        const { error } = await db.from("discovery_pool").insert({
          cluster,
          title: it.title.slice(0, 300),
          summary: it.summary,
          source_url: it.url,
          source_kind: it.sourceKind,
          published_at: it.publishedAt,
          dedupe_hash: dedupeHash,
        });
        if (!error) inserted++;
        // 23505 = already in pool for this cluster; ignore
      }
      logger.info("pool: cluster filled", { cluster, candidates: items.length });
    }

    logger.info("discovery.pool.fill: done", { inserted });
    return { inserted };
  },
});
