import { useEffect, useState } from "react";
import { Storage } from "@plasmohq/storage";

const storage = new Storage();
const APP_BASE = "https://influuc-two.vercel.app";
const LOCAL_BASE = "http://localhost:3000";

type Status = "idle" | "loading" | "success" | "error";

interface ScrapeResult {
  ok: boolean;
  error?: string;
}

export default function Popup() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState("");

  // Load persisted token on mount
  useEffect(() => {
    void storage.get<string>("influucToken").then((t) => setToken(t ?? null));

    // Get current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      setCurrentUrl(tabs[0]?.url ?? "");
    });
  }, []);

  // Detect what platform the current tab is
  const isX = currentUrl.includes("x.com") || currentUrl.includes("twitter.com");
  const isLinkedIn = currentUrl.includes("linkedin.com/in/");

  function openConnectPage() {
    const extId = chrome.runtime.id;
    const base = currentUrl.startsWith("http://localhost") ? LOCAL_BASE : APP_BASE;
    chrome.tabs.create({ url: `${base}/extension-auth?ext_id=${extId}` });
    window.close();
  }

  async function disconnect() {
    await storage.remove("influucToken");
    await storage.remove("founderId");
    setToken(null);
    setStatus("idle");
    setStatusMsg("");
  }

  async function scrapeCurrentTab(platform: "x" | "linkedin") {
    setStatus("loading");
    setStatusMsg(platform === "x" ? "Reading your X profile…" : "Reading your LinkedIn profile…");

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id || !tab.url) throw new Error("No active tab");

      // Inject content script and get scraped data back
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: platform === "x" ? scrapeX : scrapeLinkedIn,
      });

      const scraped = result.result as Record<string, unknown> | null;
      if (!scraped) throw new Error("Nothing found to scrape on this page");

      // Send to background for upload
      const response = await chrome.runtime.sendMessage({
        type: "INGEST",
        platform,
        profileUrl: tab.url,
        data: scraped,
      }) as ScrapeResult;

      if (response.ok) {
        setStatus("success");
        setStatusMsg("Added to your Brain ✓");
        setTimeout(() => { setStatus("idle"); setStatusMsg(""); }, 3000);
      } else {
        throw new Error(response.error ?? "Upload failed");
      }
    } catch (err) {
      setStatus("error");
      setStatusMsg(String(err instanceof Error ? err.message : err));
    }
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
        </div>
        <span style={styles.title}>Influuc</span>
      </div>

      {!token ? (
        // Not connected
        <div style={styles.body}>
          <p style={styles.desc}>Connect Influuc to import your X and LinkedIn profiles into your Founder Brain.</p>
          <button style={styles.primaryBtn} onClick={openConnectPage}>
            Connect Influuc →
          </button>
        </div>
      ) : (
        // Connected
        <div style={styles.body}>
          <p style={{ ...styles.desc, color: "#4ade80", fontSize: "0.75rem" }}>● Connected</p>

          {/* Context-aware scrape buttons */}
          {isX && (
            <button
              style={status === "loading" ? { ...styles.platformBtn, opacity: 0.6 } : styles.platformBtn}
              disabled={status === "loading"}
              onClick={() => void scrapeCurrentTab("x")}
            >
              <XIcon /> Import X profile to Brain
            </button>
          )}
          {isLinkedIn && (
            <button
              style={status === "loading" ? { ...styles.platformBtn, opacity: 0.6 } : styles.platformBtn}
              disabled={status === "loading"}
              onClick={() => void scrapeCurrentTab("linkedin")}
            >
              <LinkedInIcon /> Import LinkedIn profile to Brain
            </button>
          )}
          {!isX && !isLinkedIn && (
            <p style={styles.hint}>
              Navigate to your X or LinkedIn profile, then click the import button here.
            </p>
          )}

          {/* Status */}
          {statusMsg && (
            <p style={{ ...styles.hint, color: status === "error" ? "#f87171" : status === "success" ? "#4ade80" : "var(--muted)" }}>
              {statusMsg}
            </p>
          )}

          <button style={styles.disconnectBtn} onClick={() => void disconnect()}>
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Scrapers (injected into page via executeScript) ─────────────────────────

function scrapeX(): Record<string, unknown> | null {
  function text(sel: string) {
    return (document.querySelector(sel) as HTMLElement | null)?.innerText?.trim() ?? null;
  }
  const name = text('[data-testid="UserName"] span:first-child');
  if (!name) return null;

  const bio = text('[data-testid="UserDescription"]');
  const location = text('[data-testid="UserLocation"] span:last-child');
  const website = (document.querySelector('[data-testid="UserUrl"] a') as HTMLAnchorElement | null)?.href ?? null;
  const followersEl = document.querySelector('[href$="/verified_followers"] ~ * span, a[href$="/followers"] span');
  const followers = followersEl?.textContent?.trim() ?? null;

  const tweetEls = Array.from(document.querySelectorAll('article[data-testid="tweet"]'));
  const tweets = tweetEls
    .map((el) => {
      const t = (el.querySelector('[data-testid="tweetText"]') as HTMLElement | null)?.innerText?.trim();
      const time = (el.querySelector("time") as HTMLTimeElement | null)?.dateTime ?? null;
      return t ? { text: t, time } : null;
    })
    .filter(Boolean)
    .slice(0, 100);

  return { name, bio, location, website, followers, tweets, scrapedAt: new Date().toISOString() };
}

function scrapeLinkedIn(): Record<string, unknown> | null {
  function text(sel: string) {
    return (document.querySelector(sel) as HTMLElement | null)?.innerText?.trim() ?? null;
  }
  const name = text('.text-heading-xlarge') ?? text('h1');
  if (!name) return null;

  const headline = text('.text-body-medium.break-words') ?? text('.pv-text-details__left-panel .text-body-medium');
  const location = text('.text-body-small.inline.t-black--light.break-words');

  // About — LinkedIn hides overflow behind "see more"
  const aboutEl = document.querySelector('#about') as HTMLElement | null;
  const about = aboutEl
    ? (aboutEl.closest('section')?.querySelector('.pv-shared-text-with-see-more, .visually-hidden') as HTMLElement | null)?.innerText?.trim()
      ?? (aboutEl.nextElementSibling as HTMLElement | null)?.innerText?.trim()
    : null;

  // Experience
  const expSection = document.querySelector('#experience') as HTMLElement | null;
  const experiences = expSection
    ? Array.from(expSection.closest('section')?.querySelectorAll('li.artdeco-list__item') ?? []).map((li) => ({
        title: (li.querySelector('.t-bold span[aria-hidden="true"]') as HTMLElement | null)?.innerText?.trim(),
        company: (li.querySelectorAll('.t-14.t-normal span[aria-hidden="true"]')[0] as HTMLElement | null)?.innerText?.trim(),
        duration: (li.querySelector('.t-14.t-black--light span[aria-hidden="true"]') as HTMLElement | null)?.innerText?.trim(),
      })).filter((e) => e.title)
    : [];

  // Recent posts on profile feed
  const postEls = Array.from(document.querySelectorAll('.feed-shared-update-v2__description-wrapper, .update-components-text'));
  const posts = postEls
    .map((el) => (el as HTMLElement).innerText?.trim())
    .filter(Boolean)
    .slice(0, 50);

  return { name, headline, location, about, experiences, posts, scrapedAt: new Date().toISOString() };
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63 5.905-5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 260,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: "#0f0f11",
    color: "#f2f2f2",
    fontSize: "0.875rem",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem 1rem",
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 7,
    background: "linear-gradient(135deg, #6d6bf5 0%, #9f7aea 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  title: { fontWeight: 700, fontSize: "0.9rem" },
  body: {
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  desc: { color: "rgba(255,255,255,0.55)", lineHeight: 1.5, margin: 0 },
  hint: { color: "rgba(255,255,255,0.4)", fontSize: "0.78rem", lineHeight: 1.5, margin: 0 },
  primaryBtn: {
    padding: "0.625rem 1rem",
    borderRadius: "0.5rem",
    background: "linear-gradient(135deg, #6d6bf5 0%, #9f7aea 100%)",
    color: "#fff",
    fontWeight: 600,
    fontSize: "0.85rem",
    border: "none",
    cursor: "pointer",
    textAlign: "center",
  },
  platformBtn: {
    padding: "0.625rem 0.875rem",
    borderRadius: "0.5rem",
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#f2f2f2",
    fontWeight: 500,
    fontSize: "0.82rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  disconnectBtn: {
    padding: "0.4rem 0",
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.3)",
    fontSize: "0.75rem",
    cursor: "pointer",
    textAlign: "left",
  },
};
