"use client";

import { useState } from "react";

const FEATURES = [
  "Daily opportunity feed matched to your Brain",
  "On-voice drafts you can approve in seconds",
  "X + LinkedIn posting with your existing accounts",
  "Brain updates automatically as you publish",
  "Autopilot with guardrails (you stay in control)",
];

export function PaywallClient({ cancelled }: { cancelled?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Failed to start checkout");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "380px",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      {cancelled && (
        <p
          style={{
            fontSize: "0.82rem",
            color: "var(--muted)",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          Checkout was cancelled — your Brain is saved and waiting whenever you&apos;re ready.
        </p>
      )}

      {/* Plan card */}
      <div
        style={{
          borderRadius: "0.875rem",
          border: "1px solid rgba(109,107,245,0.3)",
          background: "rgba(109,107,245,0.06)",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <p style={{ fontWeight: 700, fontSize: "1.05rem", margin: 0 }}>Influuc Pro</p>
            <p style={{ fontSize: "0.8rem", color: "var(--muted)", margin: "0.25rem 0 0" }}>
              14-day free trial · cancel anytime
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontWeight: 700, fontSize: "1.4rem" }}>$29</span>
            <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>/mo</span>
          </div>
        </div>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {FEATURES.map((f) => (
            <li
              key={f}
              style={{
                fontSize: "0.85rem",
                color: "rgba(255,255,255,0.8)",
                display: "flex",
                gap: "0.5rem",
                alignItems: "flex-start",
                textAlign: "left",
              }}
            >
              <span style={{ color: "#4ade80", flexShrink: 0 }}>✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p style={{ fontSize: "0.82rem", color: "#f87171" }}>{error}</p>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading}
        style={{
          padding: "0.9rem 1.5rem",
          borderRadius: "0.625rem",
          background: loading ? "rgba(255,255,255,0.08)" : "var(--accent)",
          color: loading ? "var(--muted)" : "#fff",
          fontWeight: 700,
          fontSize: "0.95rem",
          border: "none",
          cursor: loading ? "default" : "pointer",
          transition: "background 0.2s",
        }}
      >
        {loading ? "Redirecting to Stripe…" : "Start 14-day free trial →"}
      </button>

      <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
        No charge for 14 days. Cancel anytime before the trial ends.
      </p>

      <a
        href="/dashboard"
        style={{
          fontSize: "0.78rem",
          color: "var(--muted)",
          textDecoration: "underline",
          textUnderlineOffset: "3px",
        }}
      >
        Skip for now (limited access)
      </a>
    </div>
  );
}
