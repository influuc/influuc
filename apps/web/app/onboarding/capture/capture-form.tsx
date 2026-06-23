"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface CaptureFormProps {
  founderId: string;
  hasX: boolean;
  xHandle: string | null;
  hasLinkedIn: boolean;
  websiteHint?: string | null;
}

type ExtState = "checking" | "ready" | "missing";
type ScanState = "idle" | "scanning" | "done" | "error";
type SourceStatus = "idle" | "opening" | "scraping" | "scraping_profile" | "scraping_posts" | "uploading" | "done" | "failed" | "skipped";

interface SourceProgress {
  status: SourceStatus;
  count?: number;
}

// Minimal Chrome externally_connectable types for the web page context
declare const chrome: {
  runtime: {
    sendMessage: (
      extId: string,
      msg: unknown,
      cb?: (resp: unknown) => void
    ) => void;
    connect: (extId: string, info: { name: string }) => {
      onMessage: { addListener: (fn: (msg: unknown) => void) => void };
      onDisconnect: { addListener: (fn: () => void) => void };
      disconnect: () => void;
    };
  };
};

const STATUS_LABEL: Record<SourceStatus, string> = {
  idle: "Waiting…",
  opening: "Opening tab…",
  scraping: "Reading posts…",
  scraping_profile: "Reading profile…",
  scraping_posts: "Reading posts…",
  uploading: "Saving…",
  done: "Done",
  failed: "Failed",
  skipped: "Skipped",
};

export function CaptureForm({ hasX, xHandle, hasLinkedIn, websiteHint }: CaptureFormProps) {
  const router = useRouter();
  const [extState, setExtState] = useState<ExtState>("checking");
  const [extId, setExtId] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState(websiteHint ?? "");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [sources, setSources] = useState<{ website: SourceProgress; x: SourceProgress; linkedin: SourceProgress }>({
    website: { status: "idle" },
    x: { status: "idle" },
    linkedin: { status: "idle" },
  });
  const portRef = useRef<ReturnType<typeof chrome.runtime.connect> | null>(null);

  // ── Extension detection ──
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "__INFLUUC_EXT" && typeof e.data.id === "string") {
        setExtId(e.data.id);
        setExtState("ready");
      }
    };
    window.addEventListener("message", handler);
    window.postMessage({ type: "__INFLUUC_PING" }, "*");
    const timeout = setTimeout(() => {
      setExtState((s) => (s === "checking" ? "missing" : s));
    }, 1800);
    return () => {
      window.removeEventListener("message", handler);
      clearTimeout(timeout);
    };
  }, []);

  function patchSource(key: keyof typeof sources, patch: Partial<SourceProgress>) {
    setSources((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  }

  async function startScan() {
    setScanState("scanning");
    setErrorMsg("");

    // Get session token from Supabase client
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setErrorMsg("Session expired — please refresh and try again.");
      setScanState("error");
      return;
    }

    const hasWebsite = websiteUrl.trim().startsWith("http");
    const willScanX = hasX && !!extId;
    const willScanLinkedIn = hasLinkedIn && !!extId;

    // Mark sources as active or skipped
    setSources({
      website: { status: hasWebsite ? "opening" : "skipped" },
      x: { status: willScanX ? "opening" : "skipped" },
      linkedin: { status: willScanLinkedIn ? "opening" : "skipped" },
    });

    // ── Connect port for extension progress ──
    if (extId) {
      try {
        const port = chrome.runtime.connect(extId, { name: "capture-progress" });
        portRef.current = port;
        port.onMessage.addListener((msg) => {
          const m = msg as { stage: string; status: string; count?: number };
          if (m.stage === "x") patchSource("x", { status: m.status as SourceStatus, count: m.count });
          if (m.stage === "linkedin") patchSource("linkedin", { status: m.status as SourceStatus, count: m.count });
        });
        port.onDisconnect.addListener(() => { portRef.current = null; });
      } catch { /* extension not available */ }
    }

    // ── Fire scrapes in parallel ──
    const jobs: Promise<void>[] = [];

    // Website (server-side Firecrawl)
    if (hasWebsite) {
      jobs.push(
        fetch("/api/ingest/website", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: websiteUrl.trim() }),
        }).then(async (res) => {
          if (res.ok) {
            patchSource("website", { status: "done" });
          } else {
            const err = (await res.json()) as { error?: string };
            console.warn("[capture] website failed:", err.error);
            patchSource("website", { status: "failed" });
          }
        }).catch(() => patchSource("website", { status: "failed" }))
      );
    }

    // X + LinkedIn via extension
    if (extId && (willScanX || willScanLinkedIn)) {
      jobs.push(
        new Promise<void>((resolve) => {
          chrome.runtime.sendMessage(
            extId,
            {
              type: "SCRAPE",
              token,
              xHandle: willScanX ? xHandle : null,
              apiBase: window.location.origin,
            },
            () => resolve()
          );
        })
      );
    }

    await Promise.allSettled(jobs);

    // Disconnect the progress port
    try { portRef.current?.disconnect(); } catch { /* already gone */ }

    setScanState("done");
    // Navigate to analysis after a brief success moment
    setTimeout(() => router.push("/onboarding/analysis"), 1200);
  }

  const isScanning = scanState === "scanning";
  const isDone = scanState === "done";
  const hasAnything = websiteUrl.trim().startsWith("http") || (hasX && extState === "ready") || (hasLinkedIn && extState === "ready");

  return (
    <div style={{ width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Extension status banner */}
      {extState === "missing" && (
        <div style={{
          padding: "0.75rem 1rem",
          borderRadius: "0.625rem",
          background: "rgba(251,191,36,0.08)",
          border: "1px solid rgba(251,191,36,0.2)",
          fontSize: "0.82rem",
          color: "rgba(251,191,36,0.9)",
          lineHeight: 1.5,
        }}>
          <strong>Extension not detected.</strong> X and LinkedIn scraping requires the Influuc extension.{" "}
          <a href="/onboarding/extension" style={{ color: "inherit", textDecoration: "underline" }}>
            Install it →
          </a>
        </div>
      )}

      {/* Sources list */}
      <div style={{
        borderRadius: "0.875rem",
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.03)",
        overflow: "hidden",
      }}>
        {/* Website row */}
        <SourceRow
          icon="🌐"
          label="Website"
          status={sources.website.status}
          detail={
            isScanning || isDone ? undefined : (
              <input
                type="url"
                placeholder="https://yoursite.com (optional)"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={isScanning}
                style={{
                  marginTop: "0.375rem",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.5rem",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)",
                  color: "var(--foreground)",
                  fontSize: "0.85rem",
                  outline: "none",
                  width: "100%",
                }}
              />
            )
          }
          scanning={isScanning || isDone}
        />

        <Divider />

        {/* X row */}
        <SourceRow
          icon="𝕏"
          label={xHandle ?? "X (Twitter)"}
          sublabel={xHandle ? "X (Twitter)" : undefined}
          status={hasX && extState === "ready" ? sources.x.status : (hasX ? "skipped" : "skipped")}
          count={sources.x.count}
          connected={hasX}
          needsExt={hasX && extState === "missing"}
          scanning={isScanning || isDone}
        />

        <Divider />

        {/* LinkedIn row */}
        <SourceRow
          icon="💼"
          label="LinkedIn"
          status={hasLinkedIn && extState === "ready" ? sources.linkedin.status : "skipped"}
          count={sources.linkedin.count}
          connected={hasLinkedIn}
          needsExt={hasLinkedIn && extState === "missing"}
          scanning={isScanning || isDone}
        />
      </div>

      {/* CTA */}
      {scanState === "error" && (
        <p style={{ fontSize: "0.82rem", color: "#f87171" }}>{errorMsg}</p>
      )}

      {isDone ? (
        <div style={{ textAlign: "center", color: "#4ade80", fontWeight: 600, fontSize: "0.95rem" }}>
          ✓ Scan complete — building your brain…
        </div>
      ) : (
        <button
          onClick={() => void startScan()}
          disabled={isScanning || extState === "checking" || !hasAnything}
          style={{
            padding: "0.875rem 1.5rem",
            borderRadius: "0.625rem",
            background: isScanning || extState === "checking" || !hasAnything
              ? "rgba(255,255,255,0.08)"
              : "var(--accent)",
            color: isScanning || extState === "checking" || !hasAnything ? "var(--muted)" : "#fff",
            fontWeight: 700,
            fontSize: "0.95rem",
            border: "none",
            cursor: isScanning || extState === "checking" || !hasAnything ? "default" : "pointer",
            transition: "background 0.2s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          {isScanning ? (
            <>
              <MiniSpinner />
              Scanning your profiles…
            </>
          ) : extState === "checking" ? (
            "Checking for extension…"
          ) : (
            "Scan my accounts →"
          )}
        </button>
      )}

      {isScanning && (
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", textAlign: "center", lineHeight: 1.5 }}>
          Tabs will open and close automatically. Takes 20–40 seconds.
        </p>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SourceRow({
  icon, label, sublabel, status, count, connected = true, needsExt = false, detail, scanning,
}: {
  icon: string;
  label: string;
  sublabel?: string;
  status: SourceStatus;
  count?: number;
  connected?: boolean;
  needsExt?: boolean;
  detail?: React.ReactNode;
  scanning: boolean;
}) {
  const isDone = status === "done";
  const isFailed = status === "failed";
  const isActive = !["idle", "done", "failed", "skipped"].includes(status);
  const isSkipped = status === "skipped";

  const dotColor = isDone
    ? "#4ade80"
    : isFailed
    ? "#f87171"
    : isActive
    ? "#6d6bf5"
    : isSkipped
    ? "rgba(255,255,255,0.15)"
    : "rgba(255,255,255,0.25)";

  return (
    <div style={{ padding: "0.875rem 1.125rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <span style={{ fontSize: "1.1rem", flexShrink: 0, opacity: isSkipped ? 0.35 : 1 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: "0.875rem", color: isSkipped ? "var(--muted)" : "var(--foreground)" }}>
            {label}
          </div>
          {sublabel && (
            <div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>{sublabel}</div>
          )}
          {!scanning && !connected && (
            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", marginTop: "0.1rem" }}>
              Not connected
            </div>
          )}
          {!scanning && needsExt && (
            <div style={{ fontSize: "0.75rem", color: "rgba(251,191,36,0.7)", marginTop: "0.1rem" }}>
              Needs extension
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          {count !== undefined && status === "done" && (
            <span style={{ fontSize: "0.72rem", color: "#4ade80" }}>{count} posts</span>
          )}
          <div style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: dotColor,
            boxShadow: isActive ? `0 0 6px ${dotColor}` : "none",
            animation: isActive ? "pulse 1.4s ease-in-out infinite" : "none",
          }} />
        </div>
        {scanning && status !== "idle" && status !== "skipped" && (
          <span style={{
            fontSize: "0.72rem",
            color: isDone ? "#4ade80" : isFailed ? "#f87171" : "var(--muted)",
            minWidth: 80,
            textAlign: "right",
          }}>
            {isDone && count !== undefined ? `${count} posts` : STATUS_LABEL[status]}
          </span>
        )}
      </div>
      {detail}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 1.125rem" }} />;
}

function MiniSpinner() {
  return (
    <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
