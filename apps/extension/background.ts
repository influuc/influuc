import { Storage } from "@plasmohq/storage";

const storage = new Storage();
const APP_ORIGINS = ["https://influuc-two.vercel.app", "http://localhost:3000"];

// ─── Token handoff from web app (externally_connectable) ──────────────────────

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const origin = sender.origin ?? sender.url ?? "";
  if (!APP_ORIGINS.some((o) => origin.startsWith(o))) return;

  if (message?.type === "SET_TOKEN") {
    const { token, founderId } = message as { type: string; token: string; founderId: string };
    if (!token || !founderId) { sendResponse({ ok: false }); return; }
    void storage.set("influucToken", token);
    void storage.set("founderId", founderId);
    sendResponse({ ok: true });
  }
});

// ─── Messages from popup ──────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "INGEST") {
    void handleIngest(message as IngestMessage).then(sendResponse);
    return true;
  }
  if (message?.type === "START_SCRAPE") {
    void handleStartScrape().then(sendResponse);
    return true;
  }
});

// ─── Manual ingest (from popup executeScript) ─────────────────────────────────

interface IngestMessage {
  type: "INGEST";
  platform: "x" | "linkedin";
  profileUrl: string;
  data: Record<string, unknown>;
}

async function handleIngest(msg: IngestMessage): Promise<{ ok: boolean; error?: string }> {
  const token = await storage.get<string>("influucToken");
  if (!token) return { ok: false, error: "Not connected — open the popup and click Connect." };

  const apiBase = await getApiBase();
  try {
    const res = await fetch(`${apiBase}/api/ingest/extension`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ platform: msg.platform, profileUrl: msg.profileUrl, data: msg.data }),
    });
    if (res.status === 401) {
      await storage.remove("influucToken");
      return { ok: false, error: "Token expired. Open the popup and reconnect." };
    }
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      return { ok: false, error: err.error ?? `Server error ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: `Network error: ${String(err)}` };
  }
}

// ─── Auto-scrape orchestration ────────────────────────────────────────────────

async function handleStartScrape(): Promise<{ ok: boolean; error?: string; xCount?: number; liCount?: number }> {
  const token = await storage.get<string>("influucToken");
  if (!token) return { ok: false, error: "Not connected." };

  const apiBase = await getApiBase();

  // Fetch handles from web app
  let xHandle: string | null = null;
  let linkedinHandle: string | null = null;
  try {
    const res = await fetch(`${apiBase}/api/extension/profiles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { xHandle: string | null; linkedinHandle: string | null };
      xHandle = data.xHandle;
      linkedinHandle = data.linkedinHandle;
    }
  } catch { /* proceed with nulls */ }

  let xCount = 0;
  let liCount = 0;

  // ── Scrape X ──
  if (xHandle) {
    void sendProgress({ stage: "x", status: "opening" });
    const xData = await openAndScrape(`https://x.com/${xHandle}`, 50);
    if (xData) {
      xCount = (xData.tweets as unknown[])?.length ?? 0;
      void sendProgress({ stage: "x", status: "uploading", count: xCount });
      await postToIngest(token, apiBase, "x", `https://x.com/${xHandle}`, xData);
      void sendProgress({ stage: "x", status: "done", count: xCount });
    } else {
      void sendProgress({ stage: "x", status: "failed" });
    }
  }

  // ── Scrape LinkedIn ──
  // Use /in/me which LinkedIn redirects to the logged-in user's own profile —
  // avoids needing a vanity URL slug stored from OAuth.
  if (linkedinHandle !== null) {
    void sendProgress({ stage: "linkedin", status: "opening" });
    const liUrl = linkedinHandle && !linkedinHandle.includes(" ")
      ? `https://www.linkedin.com/in/${linkedinHandle}/`
      : "https://www.linkedin.com/in/me";
    const liData = await openAndScrape(liUrl, 30);
    if (liData) {
      liCount = (liData.posts as unknown[])?.length ?? 0;
      void sendProgress({ stage: "linkedin", status: "uploading", count: liCount });
      await postToIngest(token, apiBase, "linkedin", liUrl, liData);
      void sendProgress({ stage: "linkedin", status: "done", count: liCount });
    } else {
      void sendProgress({ stage: "linkedin", status: "failed" });
    }
  }

  void sendProgress({ stage: "complete", status: "done", xCount, liCount });
  return { ok: true, xCount, liCount };
}

// ─── Tab orchestration ────────────────────────────────────────────────────────

async function openAndScrape(
  url: string,
  targetCount: number
): Promise<Record<string, unknown> | null> {
  const tab = await chrome.tabs.create({ url, active: true });
  const tabId = tab.id!;

  try {
    await waitForTabLoad(tabId, 20_000);
    await new Promise((r) => setTimeout(r, 2500)); // let dynamic content settle

    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: scrollAndCollect,
      args: [targetCount],
    });

    return (result.result as Record<string, unknown> | null) ?? null;
  } catch (err) {
    console.error("[auto-scrape] failed for", url, err);
    return null;
  } finally {
    try { await chrome.tabs.remove(tabId); } catch { /* already closed */ }
  }
}

function waitForTabLoad(tabId: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Tab load timeout"));
    }, timeoutMs);

    function listener(id: number, info: chrome.tabs.TabChangeInfo) {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// Injected into the page — must be fully self-contained (no closure references)
function scrollAndCollect(targetCount: number): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    const isX = window.location.host.includes("x.com") || window.location.host.includes("twitter.com");
    const collected = new Map<string, string>();
    let noNewRounds = 0;

    function collect() {
      if (isX) {
        document.querySelectorAll('article[data-testid="tweet"]').forEach((el) => {
          const t = (el.querySelector('[data-testid="tweetText"]') as HTMLElement | null)?.innerText?.trim();
          const time = (el.querySelector("time") as HTMLTimeElement | null)?.dateTime ?? "";
          if (t) collected.set(t, time);
        });
      } else {
        document.querySelectorAll(
          '.feed-shared-update-v2__description-wrapper, .update-components-text'
        ).forEach((el) => {
          const t = (el as HTMLElement).innerText?.trim();
          if (t && t.length > 15) collected.set(t, "");
        });
      }
    }

    async function run() {
      while (collected.size < targetCount && noNewRounds < 5) {
        const before = collected.size;
        collect();
        noNewRounds = collected.size === before ? noNewRounds + 1 : 0;
        window.scrollBy(0, 1200);
        await new Promise((r) => setTimeout(r, 1800));
      }
      collect(); // final pass

      if (isX) {
        const name =
          (document.querySelector('[data-testid="UserName"] span:first-child') as HTMLElement | null)?.innerText?.trim() ?? "";
        if (!name) { resolve(null); return; }
        const bio = (document.querySelector('[data-testid="UserDescription"]') as HTMLElement | null)?.innerText?.trim() ?? null;
        const location = (document.querySelector('[data-testid="UserLocation"] span:last-child') as HTMLElement | null)?.innerText?.trim() ?? null;
        const tweets = Array.from(collected.entries()).slice(0, 100).map(([text, time]) => ({ text, time: time || null }));
        resolve({ name, bio, location, tweets, scrapedAt: new Date().toISOString() });
      } else {
        const name = (document.querySelector('.text-heading-xlarge, h1') as HTMLElement | null)?.innerText?.trim() ?? "";
        if (!name) { resolve(null); return; }
        const headline = (document.querySelector('.text-body-medium.break-words') as HTMLElement | null)?.innerText?.trim() ?? null;
        const location = (document.querySelector('.text-body-small.inline.t-black--light.break-words') as HTMLElement | null)?.innerText?.trim() ?? null;
        const aboutEl = document.querySelector('#about') as HTMLElement | null;
        const about = aboutEl
          ? ((aboutEl.closest('section')?.querySelector('[class*="full-width"], .pv-shared-text-with-see-more') as HTMLElement | null)?.innerText?.trim()
              ?? (aboutEl.nextElementSibling as HTMLElement | null)?.innerText?.trim())
          : null;
        const expSection = document.querySelector('#experience') as HTMLElement | null;
        const experiences = expSection
          ? Array.from(expSection.closest('section')?.querySelectorAll('li.artdeco-list__item') ?? []).slice(0, 10).map((li) => ({
              title: (li.querySelector('.t-bold span[aria-hidden="true"]') as HTMLElement | null)?.innerText?.trim(),
              company: (li.querySelectorAll('.t-14.t-normal span[aria-hidden="true"]')[0] as HTMLElement | null)?.innerText?.trim(),
            })).filter((e) => e.title)
          : [];
        const posts = Array.from(collected.keys()).slice(0, 50);
        resolve({ name, headline, location, about, experiences, posts, scrapedAt: new Date().toISOString() });
      }
    }

    void run();
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function postToIngest(
  token: string,
  apiBase: string,
  platform: "x" | "linkedin",
  profileUrl: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    await fetch(`${apiBase}/api/ingest/extension`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ platform, profileUrl, data }),
    });
  } catch { /* swallow */ }
}

async function sendProgress(payload: Record<string, unknown>): Promise<void> {
  try {
    await chrome.runtime.sendMessage({ type: "SCRAPE_PROGRESS", ...payload });
  } catch { /* popup not open */ }
}

async function getApiBase(): Promise<string> {
  return (await storage.get<string>("apiBase")) ?? "https://influuc-two.vercel.app";
}

export {};
