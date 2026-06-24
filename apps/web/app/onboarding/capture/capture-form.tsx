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

declare const chrome: {
  runtime: {
    sendMessage: (extId: string, msg: unknown, cb?: (resp: unknown) => void) => void;
    connect: (extId: string, info: { name: string }) => {
      onMessage: { addListener: (fn: (msg: unknown) => void) => void };
      onDisconnect: { addListener: (fn: () => void) => void };
      disconnect: () => void;
    };
  };
};

const STATUS_LABEL: Record<SourceStatus, string> = {
  idle: "Waiting…", opening: "Opening tab…", scraping: "Reading posts…",
  scraping_profile: "Reading profile…", scraping_posts: "Reading posts…",
  uploading: "Saving…", done: "Done", failed: "Failed", skipped: "Skipped",
};

export function CaptureForm({ hasX, xHandle, hasLinkedIn, websiteHint }: CaptureFormProps) {
  const router = useRouter();
  const [extState, setExtState] = useState<ExtState>("checking");
  const [extId, setExtId] = useState<string | null>(null);
  const [websiteUrl, setWebsiteUrl] = useState(websiteHint ?? "");
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [sources, setSources] = useState<{ website: SourceProgress; x: SourceProgress; linkedin: SourceProgress }>({
    website: { status: "idle" }, x: { status: "idle" }, linkedin: { status: "idle" },
  });
  const portRef = useRef<ReturnType<typeof chrome.runtime.connect> | null>(null);

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
    return () => { window.removeEventListener("message", handler); clearTimeout(timeout); };
  }, []);

  function patchSource(key: keyof typeof sources, patch: Partial<SourceProgress>) {
    setSources((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  }

  async function startScan() {
    setScanState("scanning");
    setErrorMsg("");

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

    setSources({
      website: { status: hasWebsite ? "opening" : "skipped" },
      x: { status: willScanX ? "opening" : "skipped" },
      linkedin: { status: willScanLinkedIn ? "opening" : "skipped" },
    });

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

    const jobs: Promise<void>[] = [];

    if (hasWebsite) {
      jobs.push(
        fetch("/api/ingest/website", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: websiteUrl.trim() }),
        }).then(async (res) => {
          if (res.ok) { patchSource("website", { status: "done" }); }
          else { console.warn("[capture] website failed"); patchSource("website", { status: "failed" }); }
        }).catch(() => patchSource("website", { status: "failed" }))
      );
    }

    if (extId && (willScanX || willScanLinkedIn)) {
      jobs.push(new Promise<void>((resolve) => {
        chrome.runtime.sendMessage(extId, { type: "SCRAPE", token, xHandle: willScanX ? xHandle : null, apiBase: window.location.origin }, () => resolve());
      }));
    }

    await Promise.allSettled(jobs);
    try { portRef.current?.disconnect(); } catch { /* already gone */ }
    setScanState("done");
    setTimeout(() => router.push("/onboarding/analysis"), 1200);
  }

  const isScanning = scanState === "scanning";
  const isDone = scanState === "done";
  const hasAnything = websiteUrl.trim().startsWith("http") || (hasX && extState === "ready") || (hasLinkedIn && extState === "ready");

  return (
    <div style={{ width: "100%", maxWidth: 440, display: "flex", flexDirection: "column", gap: "1rem" }}>

      {extState === "missing" && (
        <div style={{
          padding: "10px 14px", borderRadius: 10,
          background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)",
          fontSize: "0.82rem", color: "rgba(251,191,36,0.9)", lineHeight: 1.6,
        }}>
          <strong>Extension not detected.</strong> X and LinkedIn scraping requires the Influuc extension.{" "}
          <a href="/onboarding/extension" style={{ color: "inherit", textDecoration: "underline" }}>Install it →</a>
        </div>
      )}

      <div style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.025)",
        overflow: "hidden",
      }}>
        <SourceRow
          icon="🌐" label="Website" status={sources.website.status}
          detail={isScanning || isDone ? undefined : (
            <input
              type="url"
              placeholder="https://yoursite.com (optional)"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              disabled={isScanning}
              className="input"
              style={{ marginTop: 8, fontSize: "0.85rem", padding: "8px 12px" }}
            />
          )}
          scanning={isScanning || isDone}
        />
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 18px" }} />
        <SourceRow
          icon="𝕏" label={xHandle ?? "X (Twitter)"} sublabel={xHandle ? "X (Twitter)" : undefined}
          status={hasX && extState === "ready" ? sources.x.status : "skipped"}
          count={sources.x.count} connected={hasX} needsExt={hasX && extState === "missing"}
          scanning={isScanning || isDone}
        />
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "0 18px" }} />
        <SourceRow
          icon="💼" label="LinkedIn"
          status={hasLinkedIn && extState === "ready" ? sources.linkedin.status : "skipped"}
          count={sources.linkedin.count} connected={hasLinkedIn} needsExt={hasLinkedIn && extState === "missing"}
          scanning={isScanning || isDone}
        />
      </div>

      {scanState === "error" && (
        <p style={{ fontSize: "0.82rem", color: "#f87171", textAlign: "center" }}>{errorMsg}</p>
      )}

      {isDone ? (
        <div style={{ textAlign: "center", color: "#4ade80", fontWeight: 600, fontSize: "0.95rem", padding: "8px 0" }}>
          ✓ Scan complete — building your brain…
        </div>
      ) : (
        <button
          onClick={() => void startScan()}
          disabled={isScanning || extState === "checking" || !hasAnything}
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center", opacity: isScanning || extState === "checking" || !hasAnything ? 0.45 : 1, cursor: isScanning || extState === "checking" || !hasAnything ? "not-allowed" : "pointer" }}
        >
          {isScanning ? (
            <><span className="spinner" />Scanning your profiles…</>
          ) : extState === "checking" ? (
            "Checking for extension…"
          ) : (
            "Scan my accounts →"
          )}
        </button>
      )}

      {isScanning && (
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 1.6 }}>
          Tabs will open and close automatically. Takes 20–40 seconds.
        </p>
      )}

      <style>{`@keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
    </div>
  );
}

function SourceRow({
  icon, label, sublabel, status, count, connected = true, needsExt = false, detail, scanning,
}: {
  icon: string; label: string; sublabel?: string; status: SourceStatus; count?: number;
  connected?: boolean; needsExt?: boolean; detail?: React.ReactNode; scanning: boolean;
}) {
  const isDone    = status === "done";
  const isFailed  = status === "failed";
  const isActive  = !["idle", "done", "failed", "skipped"].includes(status);
  const isSkipped = status === "skipped";

  const dotColor = isDone ? "#4ade80" : isFailed ? "#f87171" : isActive ? "#6d6bf5" : "rgba(255,255,255,0.18)";

  return (
    <div className="source-row">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: "1.1rem", flexShrink: 0, opacity: isSkipped ? 0.3 : 1 }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: "0.875rem", color: isSkipped ? "rgba(255,255,255,0.3)" : "#f4f4f5", margin: 0 }}>{label}</p>
          {sublabel && <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", margin: 0 }}>{sublabel}</p>}
          {!scanning && !connected && <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.25)", margin: "2px 0 0" }}>Not connected</p>}
          {!scanning && needsExt && <p style={{ fontSize: "0.75rem", color: "rgba(251,191,36,0.7)", margin: "2px 0 0" }}>Needs extension</p>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {scanning && status !== "idle" && status !== "skipped" && (
            <span style={{ fontSize: "0.72rem", color: isDone ? "#4ade80" : isFailed ? "#f87171" : "rgba(255,255,255,0.4)", minWidth: 70, textAlign: "right" }}>
              {isDone && count !== undefined ? `${count} posts` : STATUS_LABEL[status]}
            </span>
          )}
          <div style={{
            width: 8, height: 8, borderRadius: "50%", background: dotColor,
            boxShadow: isActive ? `0 0 6px ${dotColor}` : "none",
            animation: isActive ? "pulse-dot 1.4s ease-in-out infinite" : "none",
          }} />
        </div>
      </div>
      {detail}
    </div>
  );
}
