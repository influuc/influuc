import { useEffect, useState } from "react";

interface Progress {
  stage: "x" | "linkedin" | "complete";
  status: string;
  count?: number;
}

export default function Popup() {
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    const handler = (msg: Record<string, unknown>) => {
      if (msg.type === "SCRAPE_PROGRESS") {
        setProgress(msg as unknown as Progress);
      }
    };
    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, []);

  const isActive = progress && progress.stage !== "complete";

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logo}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
        </div>
        <span style={styles.title}>Influuc</span>
      </div>

      <div style={styles.body}>
        {isActive ? (
          <>
            <Spinner />
            <p style={{ ...styles.desc, fontWeight: 600 }}>Scanning your profiles…</p>
            <p style={styles.hint}>Keep this open. Tabs will close automatically.</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: "1.75rem", textAlign: "center" }}>
              {progress?.stage === "complete" ? "✓" : "⚡"}
            </div>
            <p style={{ ...styles.desc, fontWeight: 600, color: progress?.stage === "complete" ? "#4ade80" : "var(--foreground)" }}>
              {progress?.stage === "complete" ? "Scan complete!" : "Ready"}
            </p>
            <p style={styles.hint}>
              {progress?.stage === "complete"
                ? "Your brain is being built. Go back to the app."
                : "Scanning is triggered from the Influuc app — no setup needed here."}
            </p>
            <a
              href="https://influuc-two.vercel.app/onboarding/capture"
              target="_blank"
              rel="noreferrer"
              style={styles.link}
            >
              Open Influuc →
            </a>
          </>
        )}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ width: 20, height: 20, margin: "0 auto", border: "2px solid rgba(255,255,255,0.15)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { width: 240, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: "#0f0f11", color: "#f2f2f2", fontSize: "0.875rem" },
  header: { display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.08)" },
  logo: { width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #6d6bf5 0%, #9f7aea 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title: { fontWeight: 700, fontSize: "0.9rem" },
  body: { padding: "1.25rem 1rem", display: "flex", flexDirection: "column", gap: "0.75rem", minHeight: 140, justifyContent: "center" },
  desc: { color: "rgba(255,255,255,0.6)", lineHeight: 1.55, margin: 0, fontSize: "0.83rem" },
  hint: { color: "rgba(255,255,255,0.35)", fontSize: "0.75rem", lineHeight: 1.5, margin: 0 },
  link: { color: "var(--accent, #6d6bf5)", fontSize: "0.82rem", textDecoration: "none", fontWeight: 600 },
};
