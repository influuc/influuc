"use client";

import { useEffect, useState } from "react";

/**
 * /extension-auth
 *
 * Bridge page: the Influuc extension popup opens this URL with ?ext_id=<chrome.runtime.id>.
 * This page (authenticated via the user's existing Supabase session) mints a short-lived
 * extension token and sends it back to the extension via chrome.runtime.sendMessage.
 *
 * Uses externally_connectable — the extension manifest allows messages from this origin.
 * Reads ?ext_id via window.location.search to avoid useSearchParams/Suspense complexity.
 */
export default function ExtensionAuthPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Authenticating…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const extId = params.get("ext_id") ?? "";

    if (!extId) {
      setStatus("error");
      setMessage("Missing extension ID. Please re-open this page from the Influuc extension.");
      return;
    }

    let cancelled = false;

    async function auth() {
      try {
        const res = await fetch("/api/extension/token");
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          setStatus("error");
          setMessage(err.error ?? "Authentication failed — are you signed in?");
          return;
        }
        const { token, founderId } = (await res.json()) as { token: string; founderId: string };

        // Send the token to the extension via externally_connectable messaging.
        // chrome.runtime is only available in Chrome (not SSR/Firefox).
        const cr = (window as unknown as { chrome?: { runtime?: { sendMessage?: (id: string, msg: unknown, cb: (resp: unknown) => void) => void } } }).chrome;
        if (!cr?.runtime?.sendMessage) {
          setStatus("error");
          setMessage("Chrome extension API not available. Make sure you're using Chrome with the extension installed.");
          return;
        }

        cr.runtime.sendMessage(extId, { type: "SET_TOKEN", token, founderId }, (resp) => {
          if (cancelled) return;
          const r = resp as { ok?: boolean } | undefined;
          if (r?.ok) {
            setStatus("success");
            setMessage("Connected! You can close this tab.");
            setTimeout(() => window.close(), 2000);
          } else {
            setStatus("error");
            setMessage("Extension didn't respond. Make sure the Influuc extension is installed and enabled.");
          }
        });
      } catch (err) {
        if (cancelled) return;
        console.error("[extension-auth]", err);
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      }
    }

    void auth();
    return () => { cancelled = true; };
  }, []);

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.25rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "linear-gradient(135deg, #6d6bf5 0%, #9f7aea 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      </div>

      <div>
        <p style={{ fontWeight: 600, fontSize: "1.05rem" }}>Influuc Extension</p>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginTop: "0.375rem" }}>
          {message}
        </p>
      </div>

      {status === "loading" && (
        <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,0.15)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      )}
      {status === "success" && (
        <span style={{ color: "#4ade80", fontSize: "1.5rem" }}>✓</span>
      )}
      {status === "error" && (
        <span style={{ color: "#f87171", fontSize: "1.5rem" }}>✗</span>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
