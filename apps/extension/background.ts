/**
 * Influuc Extension — Background Service Worker
 *
 * Responsibilities:
 * - Receives the extension token from the web app (via externally_connectable)
 * - Stores the token and founderId in chrome.storage.local
 * - Receives scraped payloads from content scripts and POSTs them to the ingest API
 */

import { Storage } from "@plasmohq/storage";

const storage = new Storage();

const APP_ORIGINS = [
  "https://influuc-two.vercel.app",
  "http://localhost:3000",
];

// ─── Token handoff from web app ───────────────────────────────────────────────
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  const origin = sender.origin ?? sender.url ?? "";
  const allowed = APP_ORIGINS.some((o) => origin.startsWith(o));
  if (!allowed) return;

  if (message?.type === "SET_TOKEN") {
    const { token, founderId } = message as { type: string; token: string; founderId: string };
    if (!token || !founderId) {
      sendResponse({ ok: false, error: "Missing token or founderId" });
      return;
    }
    void storage.set("influucToken", token);
    void storage.set("founderId", founderId);
    sendResponse({ ok: true });
  }
});

// ─── Ingest payload from content scripts ─────────────────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "INGEST") {
    void handleIngest(message as IngestMessage).then(sendResponse);
    return true; // keep channel open for async response
  }
});

interface IngestMessage {
  type: "INGEST";
  platform: "x" | "linkedin";
  profileUrl: string;
  data: Record<string, unknown>;
}

async function handleIngest(msg: IngestMessage): Promise<{ ok: boolean; error?: string }> {
  const token = await storage.get<string>("influucToken");
  if (!token) {
    return { ok: false, error: "Not connected — open the popup and click Connect." };
  }

  const apiBase = await storage.get<string>("apiBase") ?? "https://influuc-two.vercel.app";

  try {
    const res = await fetch(`${apiBase}/api/ingest/extension`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        platform: msg.platform,
        profileUrl: msg.profileUrl,
        data: msg.data,
      }),
    });

    if (res.status === 401) {
      // Token expired — clear it so popup shows "reconnect"
      await storage.remove("influucToken");
      return { ok: false, error: "Token expired. Open the Influuc popup and reconnect." };
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

export {};
