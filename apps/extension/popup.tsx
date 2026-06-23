import { useEffect, useState } from "react";
import { Storage } from "@plasmohq/storage";

const storage = new Storage();
const APP_BASE = "https://influuc-two.vercel.app";
const LOCAL_BASE = "http://localhost:3000";

type Screen =
  | "loading"
  | "disconnected"
  | "idle"
  | "permission"
  | "scraping"
  | "done"
  | "error";

interface Progress {
  stage: "x" | "linkedin" | "complete";
  status: "opening" | "uploading" | "done" | "failed";
  count?: number;
  xCount?: number;
  liCount?: number;
}

export default function Popup() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [currentUrl, setCurrentUrl] = useState("");
  const [progress, setProgress] = useState<Progress | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    void storage.get<string>("influucToken").then((t) => {
      setScreen(t ? "idle" : "disconnected");
    });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      setCurrentUrl(tabs[0]?.url ?? "");
    });

    // Listen for progress updates from background
    const handler = (msg: Record<string, unknown>) => {
      if (msg.type === "SCRAPE_PROGRESS") {
        const p = msg as unknown as Progress & { type: string };
        setProgress(p);
        if (p.stage === "complete") setScreen("done");
        if (p.status === "failed" && p.stage !== "complete") {
          // don't abort — just note the failure and continue
        }
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  function openConnectPage() {
    const extId = chrome.runtime.id;
    const base = currentUrl.startsWith("http://localhost") ? LOCAL_BASE : APP_BASE;
    void chrome.tabs.create({ url: `${base}/extension-auth?ext_id=${extId}` });
    window.close();
  }

  async function disconnect() {
    await storage.remove("influucToken");
    await storage.remove("founderId");
    setScreen("disconnected");
    setProgress(null);
  }

  function startScrape() {
    setScreen("scraping");
    setProgress(null);
    chrome.runtime.sendMessage({ type: "START_SCRAPE" }, (res: { ok: boolean; error?: string }) => {
      if (!res?.ok && res?.error) {
        setErrorMsg(res.error);
        setScreen("error");
      }
    });
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

      {/* ── Screens ── */}

      {screen === "loading" && (
        <div style={styles.body}>
          <Spinner />
        </div>
      )}

      {screen === "disconnected" && (
        <div style={styles.body}>
          <p style={styles.desc}>Connect Influuc to import your X and LinkedIn profiles into your Founder Brain.</p>
          <button style={styles.primaryBtn} onClick={openConnectPage}>
            Connect Influuc →
          </button>
        </div>
      )}

      {screen === "idle" && (
        <div style={styles.body}>
          <p style={{ ...styles.desc, color: "#4ade80", fontSize: "0.75rem", marginBottom: "0.25rem" }}>● Connected</p>
          <p style={styles.desc}>Import your X posts and LinkedIn profile into your Founder Brain.</p>
          <button style={styles.primaryBtn} onClick={() => setScreen("permission")}>
            Auto-Import Profiles →
          </button>
          <button style={styles.disconnectBtn} onClick={() => void disconnect()}>Disconnect</button>
        </div>
      )}

      {screen === "permission" && (
        <div style={styles.body}>
          <div style={styles.permIcon}>🔍</div>
          <p style={{ ...styles.desc, fontWeight: 600, marginBottom: "0.25rem" }}>Allow profile import?</p>
          <p style={{ ...styles.hint, marginBottom: "0.5rem" }}>
            Influuc will open your X and LinkedIn profiles in browser tabs (visible to you), scroll through your posts, and save them to your Founder Brain. No passwords stored.
          </p>
          <button style={styles.primaryBtn} onClick={startScrape}>
            Allow & Start Import
          </button>
          <button style={styles.ghostBtn} onClick={() => setScreen("idle")}>
            Cancel
          </button>
        </div>
      )}

      {screen === "scraping" && (
        <div style={styles.body}>
          <Spinner />
          <p style={{ ...styles.desc, fontWeight: 600 }}>Importing your profiles…</p>
          {progress && (
            <div style={styles.progressList}>
              <ProgressRow
                label="X (Twitter)"
                status={progress.stage === "x" ? progress.status : progress.stage === "complete" || (progress.stage === "linkedin") ? "done" : "waiting"}
                count={progress.stage !== "x" && (progress.stage === "linkedin" || progress.stage === "complete") ? progress.xCount : progress.count}
              />
              <ProgressRow
                label="LinkedIn"
                status={progress.stage === "linkedin" ? progress.status : progress.stage === "complete" ? "done" : "waiting"}
                count={progress.stage === "linkedin" ? progress.count : progress.stage === "complete" ? progress.liCount : undefined}
              />
            </div>
          )}
          <p style={styles.hint}>Keep this popup open. Tabs will close automatically.</p>
        </div>
      )}

      {screen === "done" && (
        <div style={styles.body}>
          <div style={{ fontSize: "2rem", textAlign: "center" }}>✓</div>
          <p style={{ ...styles.desc, fontWeight: 600, color: "#4ade80" }}>Import complete!</p>
          {progress?.stage === "complete" && (
            <p style={styles.hint}>
              {progress.xCount ? `${progress.xCount} X posts` : ""}
              {progress.xCount && progress.liCount ? " + " : ""}
              {progress.liCount ? `${progress.liCount} LinkedIn posts` : ""}
              {" "}saved to your Founder Brain.
            </p>
          )}
          <button style={styles.primaryBtn} onClick={() => setScreen("idle")}>Done</button>
        </div>
      )}

      {screen === "error" && (
        <div style={styles.body}>
          <p style={{ ...styles.desc, color: "#f87171", fontWeight: 600 }}>Import failed</p>
          <p style={{ ...styles.hint, color: "#f87171" }}>{errorMsg}</p>
          <button style={styles.ghostBtn} onClick={() => setScreen("idle")}>Back</button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressRow({ label, status, count }: { label: string; status: string; count?: number }) {
  const icon = status === "done" ? "✓" : status === "failed" ? "✗" : status === "waiting" ? "○" : "…";
  const color = status === "done" ? "#4ade80" : status === "failed" ? "#f87171" : status === "waiting" ? "rgba(255,255,255,0.3)" : "var(--accent)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem" }}>
      <span style={{ color, width: 14, textAlign: "center", flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && <span style={{ color: "var(--muted)", fontSize: "0.75rem" }}>{count} posts</span>}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 20, height: 20, margin: "0 auto",
      border: "2px solid rgba(255,255,255,0.15)",
      borderTopColor: "var(--accent)",
      borderRadius: "50%",
      animation: "spin 0.7s linear infinite",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 270,
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
    minHeight: 160,
    justifyContent: "center",
  },
  desc: { color: "rgba(255,255,255,0.6)", lineHeight: 1.55, margin: 0, fontSize: "0.83rem" },
  hint: { color: "rgba(255,255,255,0.38)", fontSize: "0.76rem", lineHeight: 1.5, margin: 0 },
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
  ghostBtn: {
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.55)",
    fontSize: "0.82rem",
    cursor: "pointer",
    textAlign: "center",
  },
  disconnectBtn: {
    padding: "0.35rem 0",
    background: "none",
    border: "none",
    color: "rgba(255,255,255,0.25)",
    fontSize: "0.73rem",
    cursor: "pointer",
    textAlign: "left",
  },
  permIcon: {
    fontSize: "1.75rem",
    textAlign: "center",
  },
  progressList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    padding: "0.75rem",
    borderRadius: "0.5rem",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
  },
};
