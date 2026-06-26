"use client";

import { useState } from "react";

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  breaking_news:        { label: "Breaking",       color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  emerging_conversation:{ label: "Trending",       color: "#fb923c", bg: "rgba(251,146,60,0.12)"  },
  industry_trend:       { label: "Industry Trend", color: "#a5b4fc", bg: "rgba(165,180,252,0.12)" },
  market_shift:         { label: "Market Shift",   color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  thought_leadership:   { label: "Thought Leader", color: "#4ade80", bg: "rgba(74,222,128,0.12)"  },
  podcast:              { label: "Podcast",         color: "#67e8f9", bg: "rgba(103,232,249,0.12)" },
  partnership:          { label: "Partnership",     color: "#c4b5fd", bg: "rgba(196,181,253,0.12)" },
  collaboration:        { label: "Collab",          color: "#c4b5fd", bg: "rgba(196,181,253,0.12)" },
};

function priorityColor(score: number | null) {
  if (!score) return "var(--muted-2)";
  if (score >= 0.75) return "#4ade80";
  if (score >= 0.55) return "#fb923c";
  return "#6b6b80";
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export interface OppCardProps {
  id: string;
  type: string;
  title: string;
  summary: string | null;
  source_url: string | null;
  signal_at: string | null;
  priority_score: number | null;
  relevance_score: number | null;
  urgency_score: number | null;
  match_reason: string | null;
  initialStatus: "surfaced" | "accepted" | "dismissed";
}

export function OppCard({
  id, type, title, summary, source_url, signal_at,
  priority_score, match_reason, initialStatus,
}: OppCardProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState<"accept" | "dismiss" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const meta = TYPE_META[type] ?? { label: type, color: "var(--muted)", bg: "rgba(255,255,255,0.06)" };
  const pColor = priorityColor(priority_score);
  const accepted = status === "accepted";
  const dismissed = status === "dismissed";

  async function act(action: "accept" | "dismiss") {
    setLoading(action);
    setError(null);
    try {
      const res = await fetch(`/api/opportunities/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setStatus(action === "accept" ? "accepted" : "dismissed");
      } else {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Something went wrong");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{
      background: "var(--card)",
      borderRadius: "var(--radius)",
      border: `1px solid ${accepted ? "rgba(74,222,128,0.15)" : dismissed ? "rgba(255,255,255,0.03)" : "var(--border)"}`,
      padding: "1.125rem 1.375rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.75rem",
      opacity: dismissed ? 0.4 : 1,
      transition: "opacity 0.2s, border-color 0.2s",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
        {/* Type badge */}
        <span style={{
          flexShrink: 0,
          fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.07em",
          padding: "3px 8px", borderRadius: 5,
          color: meta.color, background: meta.bg,
          whiteSpace: "nowrap",
        }}>
          {meta.label.toUpperCase()}
        </span>

        {/* Title */}
        <p style={{
          flex: 1, margin: 0,
          fontSize: "0.9rem", fontWeight: 600,
          color: "var(--fg)", lineHeight: 1.4,
        }}>
          {title}
        </p>

        {/* Priority indicator */}
        <div style={{
          flexShrink: 0,
          display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2,
        }}>
          <span style={{ fontSize: "0.62rem", color: "var(--muted-2)", letterSpacing: "0.06em" }}>PRIORITY</span>
          <span style={{
            fontSize: "0.85rem", fontWeight: 700,
            color: pColor,
            fontVariantNumeric: "tabular-nums",
          }}>
            {priority_score != null ? Math.round(priority_score * 100) : "—"}
          </span>
        </div>
      </div>

      {/* Match reason */}
      {match_reason && (
        <p style={{
          margin: 0,
          fontSize: "0.8rem", color: "var(--muted)", lineHeight: 1.5,
          padding: "0.5rem 0.75rem",
          background: "rgba(109,107,245,0.07)",
          borderRadius: 8,
          borderLeft: "2px solid rgba(109,107,245,0.3)",
        }}>
          {match_reason}
        </p>
      )}

      {/* Summary */}
      {summary && (
        <p style={{
          margin: 0,
          fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.55,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {summary}
        </p>
      )}

      {/* Footer row */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "0.5rem",
        paddingTop: "0.125rem",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {source_url && (
            <a
              href={source_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: "0.72rem", color: "var(--accent-fg)", textDecoration: "none",
                display: "flex", alignItems: "center", gap: "0.3rem",
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              View source
            </a>
          )}
          {signal_at && (
            <span style={{ fontSize: "0.7rem", color: "var(--muted-2)" }}>
              {fmtDate(signal_at)}
            </span>
          )}
        </div>

        {/* Actions */}
        {!dismissed && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {!accepted ? (
              <>
                <button
                  onClick={() => act("dismiss")}
                  disabled={!!loading}
                  style={{
                    fontSize: "0.75rem", fontWeight: 500,
                    padding: "0.35rem 0.875rem", borderRadius: 7,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                    cursor: "pointer",
                    opacity: loading === "dismiss" ? 0.5 : 1,
                  }}
                >
                  {loading === "dismiss" ? "…" : "Dismiss"}
                </button>
                <button
                  onClick={() => act("accept")}
                  disabled={!!loading}
                  style={{
                    fontSize: "0.75rem", fontWeight: 600,
                    padding: "0.35rem 0.875rem", borderRadius: 7,
                    background: "rgba(109,107,245,0.18)",
                    border: "1px solid rgba(109,107,245,0.3)",
                    color: "var(--accent-fg)",
                    cursor: "pointer",
                    opacity: loading === "accept" ? 0.5 : 1,
                    display: "flex", alignItems: "center", gap: "0.35rem",
                  }}
                >
                  {loading === "accept" ? "Writing…" : "✍ Write post"}
                </button>
              </>
            ) : (
              <a href="/dashboard/x" style={{
                fontSize: "0.72rem", fontWeight: 600,
                padding: "0.3rem 0.75rem", borderRadius: 7,
                background: "rgba(74,222,128,0.1)",
                color: "#4ade80",
                textDecoration: "none",
                display: "flex", alignItems: "center", gap: "0.35rem",
              }}>
                ✓ Draft ready — review in X →
              </a>
            )}
          </div>
        )}
      </div>

      {error && (
        <p style={{
          margin: 0, fontSize: "0.72rem", color: "#f87171",
          padding: "0.4rem 0.6rem", borderRadius: 6,
          background: "rgba(248,113,113,0.08)",
        }}>
          {error}
        </p>
      )}
    </div>
  );
}
