"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ConnectionInfo {
  handle: string | null;
  status: string;
}

interface ConnectFormProps {
  connections: Record<string, ConnectionInfo>;
  initialError?: string;
}

export function ConnectForm({ connections, initialError }: ConnectFormProps) {
  const router = useRouter();
  const [error, setError] = useState(initialError ?? null);
  const [advancing, setAdvancing] = useState(false);

  const xConn = connections["x"];
  const liConn = connections["linkedin"];
  const xConnected = xConn?.status === "active";
  const liConnected = liConn?.status === "active";
  const bothConnected = xConnected && liConnected;

  async function handleContinue() {
    setAdvancing(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding/advance-connect", { method: "POST" });
      if (res.ok) {
        router.push("/onboarding/extension");
      } else {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Something went wrong.");
        setAdvancing(false);
      }
    } catch {
      setError("Network error — please try again.");
      setAdvancing(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", width: "100%", maxWidth: "400px" }}>

      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: 10,
          background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)",
          fontSize: "0.85rem", color: "#f87171",
        }}>
          {humaniseError(error)}
        </div>
      )}

      <PlatformCard
        label="X (Twitter)"
        icon={<XIcon />}
        connected={xConnected}
        handle={xConn?.handle ?? null}
        connectHref="/api/oauth/x"
      />

      <PlatformCard
        label="LinkedIn"
        icon={<LinkedInIcon />}
        connected={liConnected}
        handle={liConn?.handle ?? null}
        connectHref="/api/oauth/linkedin"
      />

      {!bothConnected && (
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 1.6, margin: 0 }}>
          {!xConnected && !liConnected
            ? "Connect both X and LinkedIn to continue."
            : !xConnected
            ? "✓ LinkedIn connected — now connect X to continue."
            : "✓ X connected — now connect LinkedIn to continue."}
        </p>
      )}

      <button
        onClick={() => void handleContinue()}
        disabled={!bothConnected || advancing}
        className="btn btn-primary"
        style={{ width: "100%", justifyContent: "center", marginTop: 4, opacity: !bothConnected || advancing ? 0.45 : 1, cursor: !bothConnected || advancing ? "not-allowed" : "pointer" }}
      >
        {advancing ? "Setting up…" : "Continue →"}
      </button>
    </div>
  );
}

function PlatformCard({
  label, icon, connected, handle, connectHref,
}: {
  label: string;
  icon: React.ReactNode;
  connected: boolean;
  handle: string | null;
  connectHref: string;
}) {
  return (
    <div className={`platform-card ${connected ? "platform-card-connected" : ""}`}>
      <span style={{ flexShrink: 0, opacity: connected ? 1 : 0.55 }}>{icon}</span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
        <span style={{ fontWeight: 600, fontSize: "0.925rem" }}>{label}</span>
        {connected && handle ? (
          <span style={{ fontSize: "0.78rem", color: "#a5b4fc" }}>{handle}</span>
        ) : (
          <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)" }}>Not connected</span>
        )}
      </div>
      {connected && <div className="glow-dot glow-dot-success" />}
      <a href={connectHref} className="btn btn-xs btn-ghost" style={{ flexShrink: 0 }}>
        {connected ? "Re-connect" : "Connect"}
      </a>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function humaniseError(code: string): string {
  const map: Record<string, string> = {
    state_missing: "Session expired — please try connecting again.",
    state_mismatch: "Security check failed — please try connecting again.",
    state_invalid: "Invalid session — please try connecting again.",
    missing_code: "Authorization was not completed. Please try again.",
    connection_failed: "Could not save your connection. Please try again.",
    access_denied: "You cancelled the authorization. Click Connect to try again.",
  };
  return map[code] ?? `Connection error: ${code}`;
}
