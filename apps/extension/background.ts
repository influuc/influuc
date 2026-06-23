/**
 * Influuc extension background worker.
 *
 * Auth: no stored tokens. The capture page passes the user's Supabase
 * access_token directly in the SCRAPE message — same browser, same session.
 *
 * Flow:
 *  1. Capture page sends SCRAPE via externally_connectable
 *  2. Background opens X + LinkedIn in inactive tabs in parallel
 *  3. Injects self-contained scraper functions, scrolls, collects data
 *  4. POSTs to /api/ingest/extension with Bearer <access_token>
 *  5. Progress broadcast to capture page via onConnectExternal port
 */

const APP_ORIGINS = ["https://influuc-two.vercel.app", "http://localhost:3000"];

// Long-lived ports from the capture page for real-time progress
const capturePorts = new Set<chrome.runtime.Port>();

// ── External connections (capture page connects for progress updates) ─────────

chrome.runtime.onConnectExternal.addListener((port) => {
  if (!isAllowedOrigin(port.sender?.origin ?? port.sender?.url ?? "")) return;
  if (port.name === "capture-progress") {
    capturePorts.add(port);
    port.onDisconnect.addListener(() => capturePorts.delete(port));
  }
});

// ── External messages (from capture page) ─────────────────────────────────────

chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  if (!isAllowedOrigin(sender.origin ?? sender.url ?? "")) return;

  if (message?.type === "PING") {
    sendResponse({ ok: true });
    return;
  }

  if (message?.type === "SCRAPE") {
    const { token, xHandle, apiBase } = message as {
      type: string;
      token: string;
      xHandle?: string | null;
      apiBase: string;
    };
    void runScrape(token, xHandle ?? null, apiBase).then(sendResponse);
    return true; // async
  }
});

// ── Messages from popup ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((_message, _sender, _sendResponse) => {
  // Popup is now read-only; no commands needed.
});

// ── Orchestration ─────────────────────────────────────────────────────────────

async function runScrape(
  token: string,
  xHandle: string | null,
  apiBase: string
): Promise<{ ok: boolean }> {
  const jobs: Promise<void>[] = [];

  if (xHandle) jobs.push(scrapeX(token, apiBase, xHandle));
  jobs.push(scrapeLinkedIn(token, apiBase));

  await Promise.allSettled(jobs);

  broadcastProgress({ stage: "complete", status: "done" });
  return { ok: true };
}

// ── X scraping ────────────────────────────────────────────────────────────────

async function scrapeX(token: string, apiBase: string, xHandle: string): Promise<void> {
  broadcastProgress({ stage: "x", status: "opening" });
  const handle = xHandle.replace(/^@/, "");

  const tab = await chrome.tabs.create({ url: `https://x.com/${handle}`, active: false });
  const tabId = tab.id!;

  try {
    await waitForTabLoad(tabId, 25_000);
    await sleep(2500);

    broadcastProgress({ stage: "x", status: "scraping" });

    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: scrapeXPage,
      args: [25],
    });

    const data = result.result as Record<string, unknown> | null;
    if (!data) { broadcastProgress({ stage: "x", status: "failed" }); return; }

    const count = (data.tweets as unknown[])?.length ?? 0;
    broadcastProgress({ stage: "x", status: "uploading", count });
    await postToIngest(token, apiBase, "x", `https://x.com/${handle}`, data);
    broadcastProgress({ stage: "x", status: "done", count });

  } catch (err) {
    console.error("[scrape-x]", err);
    broadcastProgress({ stage: "x", status: "failed" });
  } finally {
    try { await chrome.tabs.remove(tabId); } catch { /* already closed */ }
  }
}

// ── LinkedIn scraping (two-phase: profile then recent-activity) ───────────────

async function scrapeLinkedIn(token: string, apiBase: string): Promise<void> {
  broadcastProgress({ stage: "linkedin", status: "opening" });

  const tab = await chrome.tabs.create({ url: "https://www.linkedin.com/in/me", active: false });
  const tabId = tab.id!;

  try {
    // /me redirects to actual profile URL
    await waitForTabLoad(tabId, 25_000);
    await sleep(2000);

    const tabInfo = await chrome.tabs.get(tabId);
    const profileUrl = tabInfo.url ?? "https://www.linkedin.com/in/me";
    const usernameMatch = profileUrl.match(/linkedin\.com\/in\/([^/?#]+)/);
    const username = usernameMatch?.[1] ?? "me";

    broadcastProgress({ stage: "linkedin", status: "scraping_profile" });

    const [profileResult] = await chrome.scripting.executeScript({
      target: { tabId },
      func: scrapeLinkedInProfilePage,
    });
    const profileData = (profileResult.result as Record<string, unknown> | null) ?? {};

    // Navigate to recent activity posts
    broadcastProgress({ stage: "linkedin", status: "scraping_posts" });
    await chrome.tabs.update(tabId, {
      url: `https://www.linkedin.com/in/${username}/recent-activity/all/`,
    });
    await waitForTabLoad(tabId, 25_000);
    await sleep(2500);

    const [postsResult] = await chrome.scripting.executeScript({
      target: { tabId },
      func: scrapeLinkedInPostsPage,
      args: [25],
    });
    const posts = (postsResult.result as string[] | null) ?? [];

    if (!profileData.name && posts.length === 0) {
      broadcastProgress({ stage: "linkedin", status: "failed" });
      return;
    }

    const combined = { ...profileData, posts, scrapedAt: new Date().toISOString() };
    broadcastProgress({ stage: "linkedin", status: "uploading", count: posts.length });
    await postToIngest(token, apiBase, "linkedin", profileUrl, combined);
    broadcastProgress({ stage: "linkedin", status: "done", count: posts.length });

  } catch (err) {
    console.error("[scrape-linkedin]", err);
    broadcastProgress({ stage: "linkedin", status: "failed" });
  } finally {
    try { await chrome.tabs.remove(tabId); } catch { /* already closed */ }
  }
}

// ── Injected page functions — must be fully self-contained ────────────────────

function scrapeXPage(targetCount: number): Promise<Record<string, unknown> | null> {
  return new Promise((resolve) => {
    const collected = new Map<string, string>();
    let noNew = 0;

    async function run() {
      while (collected.size < targetCount && noNew < 6) {
        const before = collected.size;
        document.querySelectorAll('article[data-testid="tweet"]').forEach((el) => {
          const text = (el.querySelector('[data-testid="tweetText"]') as HTMLElement | null)?.innerText?.trim();
          const time = (el.querySelector("time") as HTMLTimeElement | null)?.dateTime ?? "";
          if (text) collected.set(text, time);
        });
        noNew = collected.size === before ? noNew + 1 : 0;
        window.scrollBy(0, 1200);
        await new Promise((r) => setTimeout(r, 1800));
      }
      document.querySelectorAll('article[data-testid="tweet"]').forEach((el) => {
        const text = (el.querySelector('[data-testid="tweetText"]') as HTMLElement | null)?.innerText?.trim();
        const time = (el.querySelector("time") as HTMLTimeElement | null)?.dateTime ?? "";
        if (text) collected.set(text, time);
      });

      const name =
        (document.querySelector('[data-testid="UserName"] span:first-child') as HTMLElement | null)?.innerText?.trim() ?? "";
      if (!name && collected.size === 0) { resolve(null); return; }

      const bio = (document.querySelector('[data-testid="UserDescription"]') as HTMLElement | null)?.innerText?.trim() ?? null;
      const location = (document.querySelector('[data-testid="UserLocation"] span:last-child') as HTMLElement | null)?.innerText?.trim() ?? null;
      const tweets = Array.from(collected.entries())
        .slice(0, targetCount)
        .map(([text, time]) => ({ text, time: time || null }));

      resolve({ name, bio, location, tweets, scrapedAt: new Date().toISOString() });
    }
    void run();
  });
}

function scrapeLinkedInProfilePage(): Record<string, unknown> {
  const name =
    (document.querySelector(".text-heading-xlarge, h1") as HTMLElement | null)?.innerText?.trim() ?? "";
  const headline =
    (document.querySelector(".text-body-medium.break-words") as HTMLElement | null)?.innerText?.trim() ?? null;
  const location =
    (document.querySelector(".t-black--light.break-words") as HTMLElement | null)?.innerText?.trim() ?? null;

  const aboutSection = document.querySelector("#about");
  const about = aboutSection
    ? ((aboutSection.closest("section")?.querySelector('[class*="full-width"], .pv-shared-text-with-see-more') as HTMLElement | null)?.innerText?.trim() ??
       (aboutSection.nextElementSibling as HTMLElement | null)?.innerText?.trim() ??
       null)
    : null;

  const expSection = document.querySelector("#experience");
  const experiences = expSection
    ? Array.from(expSection.closest("section")?.querySelectorAll("li.artdeco-list__item") ?? [])
        .slice(0, 8)
        .map((li) => ({
          title: (li.querySelector(".t-bold span[aria-hidden='true']") as HTMLElement | null)?.innerText?.trim(),
          company: (
            li.querySelectorAll(".t-14.t-normal span[aria-hidden='true']")[0] as HTMLElement | null
          )?.innerText?.trim(),
        }))
        .filter((e) => e.title)
    : [];

  return { name, headline, location, about, experiences };
}

function scrapeLinkedInPostsPage(targetCount: number): Promise<string[]> {
  return new Promise((resolve) => {
    const collected = new Set<string>();
    let noNew = 0;

    async function run() {
      while (collected.size < targetCount && noNew < 6) {
        const before = collected.size;
        document
          .querySelectorAll(
            ".feed-shared-update-v2__description-wrapper, .update-components-text, .feed-shared-text"
          )
          .forEach((el) => {
            const text = (el as HTMLElement).innerText?.trim();
            if (text && text.length > 20) collected.add(text);
          });
        noNew = collected.size === before ? noNew + 1 : 0;
        window.scrollBy(0, 1200);
        await new Promise((r) => setTimeout(r, 1800));
      }
      document
        .querySelectorAll(
          ".feed-shared-update-v2__description-wrapper, .update-components-text, .feed-shared-text"
        )
        .forEach((el) => {
          const text = (el as HTMLElement).innerText?.trim();
          if (text && text.length > 20) collected.add(text);
        });
      resolve(Array.from(collected).slice(0, targetCount));
    }
    void run();
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function broadcastProgress(payload: Record<string, unknown>): void {
  capturePorts.forEach((port) => {
    try { port.postMessage(payload); } catch { /* port closed */ }
  });
  try { chrome.runtime.sendMessage({ type: "SCRAPE_PROGRESS", ...payload }); } catch { /* popup closed */ }
}

async function postToIngest(
  token: string,
  apiBase: string,
  platform: "x" | "linkedin",
  profileUrl: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const res = await fetch(`${apiBase}/api/ingest/extension`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ platform, profileUrl, data }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`[post-to-ingest] ${platform} ${res.status}:`, body);
    }
  } catch (err) {
    console.error("[post-to-ingest] network error:", err);
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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isAllowedOrigin(origin: string): boolean {
  return APP_ORIGINS.some((o) => origin.startsWith(o));
}

export {};
