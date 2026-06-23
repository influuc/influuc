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
  const [error] = useState(initialError ?? null);

  const xConn = connections["x"];
  const liConn = connections["linkedin"];
  const xConnected = xConn?.status === "active";
  const liConnected = liConn?.status === "active";
  const anyConnected = xConnected || liConnected;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        width: "100%",
        maxWidth: "380px",
      }}
    >
      {error && (
        <div
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "0.5rem",
            padding: "0.75rem 1rem",
            fontSize: "0.85rem",
            color: "#f87171",
            textAlign: "left",
          }}
        >
          {humaniseError(error)}
        </div>
      )}

      {/* X (Twitter) */}
      <PlatformCard
        platform="x"
        label="X (Twitter)"
        icon={<XIcon />}
        connected={xConnected}
        handle={xConn?.handle ?? null}
        connectHref="/api/oauth/x"
      />

      {/* LinkedIn */}
      <PlatformCard
        platform="linkedin"
        label="LinkedIn"
        icon={<LinkedInIcon />}
        connected={liConnected}
        handle={liConn?.handle ?? null}
        connectHref="/api/oauth/linkedin"
      />

      {/* Continue — enabled once ≥1 connected */}
      <button
        onClick={() => router.push("/onboarding/extension")}
        disabled={!anyConnected}
        style={{
          marginTop: "0.5rem",
          padding: "0.875rem 1.5rem",
          borderRadius: "0.625rem",
          border: "none",
          background: anyConnected ? "var(--accent)" : "rgba(255,255,255,0.08)",
          color: anyConnected ? "#fff" : "var(--muted)",
          fontWeight: 600,
          fontSize: "0.95rem",
          cursor: anyConnected ? "pointer" : "not-allowed",
          transition: "opacity 0.15s",
          opacity: anyConnected ? 1 : 0.5,
        }}
      >
        Continue →
      </button>

      <p
        style={{
          fontSize: "0.75rem",
          color: "var(--muted)",
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        You can connect both now or add the second platform later from settings.
      </p>
    </div>
  );
}

/* ─── Platform card ─────────────────────────────────────────────────────────── */

interface PlatformCardProps {
  platform: string;
  label: string;
  icon: React.ReactNode;
  connected: boolean;
  handle: string | null;
  connectHref: string;
}

function PlatformCard({
  label,
  icon,
  connected,
  handle,
  connectHref,
}: PlatformCardProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.875rem",
        padding: "1rem 1.25rem",
        borderRadius: "0.75rem",
        border: connected
          ? "1px solid rgba(109,107,245,0.4)"
          : "1px solid rgba(255,255,255,0.1)",
        background: connected
          ? "rgba(109,107,245,0.08)"
          : "rgba(255,255,255,0.03)",
        color: "var(--fg)",
      }}
    >
      <span style={{ flexShrink: 0, opacity: connected ? 1 : 0.6 }}>{icon}</span>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", flex: 1, textAlign: "left" }}>
        <span style={{ fontWeight: 500, fontSize: "0.95rem" }}>{label}</span>
        {connected && handle ? (
          <span style={{ fontSize: "0.78rem", color: "var(--accent)" }}>{handle}</span>
        ) : (
          <span style={{ fontSize: "0.78rem", color: "var(--muted)" }}>Not connected</span>
        )}
      </div>

      <a
        href={connectHref}
        style={{
          padding: "0.45rem 1rem",
          borderRadius: "0.4rem",
          border: connected
            ? "1px solid rgba(109,107,245,0.5)"
            : "1px solid rgba(255,255,255,0.15)",
          background: "transparent",
          color: connected ? "var(--accent)" : "var(--fg)",
          fontSize: "0.8rem",
          fontWeight: 500,
          textDecoration: "none",
          whiteSpace: "nowrap",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        {connected ? "Re-connect" : "Connect"}
      </a>
    </div>
  );
}

/* ─── Icons ─────────────────────────────────────────────────────────────────── */

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

/* ─── Error humaniser ───────────────────────────────────────────────────────── */

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
