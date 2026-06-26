"use client";

import { useState, useTransition } from "react";
import { updatePostStatus, approveAllPosts } from "../actions";

type Post = {
  id: string;
  content: string;
  post_type?: string;
  status: string;
  scheduled_date: string;
};

function getTypeName(postType?: string): string {
  if (postType === "carousel") return "Carousel";
  return "Long Form";
}

function groupByDate(posts: Post[]) {
  const map = new Map<string, Post[]>();
  for (const p of posts) {
    if (!map.has(p.scheduled_date)) map.set(p.scheduled_date, []);
    map.get(p.scheduled_date)!.push(p);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function fmtDateHeader(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  return {
    num: d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" }),
    dow: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
  };
}

const TODAY = new Date().toISOString().slice(0, 10);

function liveStatusFor(dbStatus: string, scheduledDate: string): string {
  if ((dbStatus === "approved" || dbStatus === "scheduled") && scheduledDate < TODAY) return "published";
  return dbStatus;
}

const STATUS_COLOR: Record<string, string> = {
  draft:     "rgba(255,255,255,0.2)",
  approved:  "#4ade80",
  published: "#a5b4fc",
  scheduled: "#a5b4fc",
  rejected:  "#f87171",
  failed:    "#fb923c",
};

function statusLabel(status: string) {
  if (status === "draft")     return "Needs Review";
  if (status === "approved")  return "Scheduled";
  if (status === "published") return "Published";
  if (status === "rejected")  return "Rejected";
  if (status === "failed")    return "Failed";
  return status;
}

function statusStyle(status: string): React.CSSProperties {
  if (status === "approved" || status === "scheduled") return { background: "rgba(109,107,245,0.15)", color: "#a5b4fc" };
  if (status === "published") return { background: "rgba(74,222,128,0.1)", color: "#4ade80" };
  if (status === "rejected")  return { background: "rgba(248,113,113,0.1)", color: "#f87171" };
  if (status === "failed")    return { background: "rgba(251,146,60,0.1)", color: "#fb923c" };
  return { background: "rgba(255,255,255,0.06)", color: "var(--muted-2)" };
}

function PostModal({ post, localStatus, onClose, onStatusChange }: {
  post: Post;
  localStatus: string;
  onClose: () => void;
  onStatusChange: (s: "approved" | "rejected" | "draft") => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const d = new Date(post.scheduled_date + "T00:00:00Z");
  const dateLabel = d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
  });

  function handleStatus(newStatus: "approved" | "rejected" | "draft") {
    startTransition(async () => {
      await updatePostStatus(post.id, newStatus);
      onStatusChange(newStatus);
      if (newStatus === "approved") onClose();
    });
  }

  function handleCopy() {
    navigator.clipboard.writeText(post.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const isScheduled = localStatus === "approved" || localStatus === "scheduled";
  const isPublished = localStatus === "published";
  const isRejected  = localStatus === "rejected";
  const isDraft     = localStatus === "draft";

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)",
        zIndex: 200,
      }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(540px, calc(100vw - 32px))",
        maxHeight: "85vh", overflowY: "auto",
        background: "#0f0f1e", borderRadius: 20, zIndex: 201,
        boxShadow: "0 32px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.06)",
      }}>
        {/* Header */}
        <div style={{
          padding: "1.125rem 1.25rem",
          display: "flex", alignItems: "center", gap: "0.75rem",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: "#0a66c2",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--fg)", margin: 0 }}>{dateLabel}</p>
            <p style={{ fontSize: "0.7rem", color: "var(--muted)", margin: "0.1rem 0 0" }}>
              9:30 AM IST · {getTypeName(post.post_type)}
            </p>
          </div>
          {isScheduled && (
            <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: "rgba(74,222,128,0.12)", color: "#4ade80", flexShrink: 0 }}>
              Scheduled
            </span>
          )}
          {isPublished && (
            <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: "rgba(165,180,252,0.12)", color: "#a5b4fc", flexShrink: 0 }}>
              Published
            </span>
          )}
          {isRejected && (
            <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: "rgba(248,113,113,0.12)", color: "#f87171", flexShrink: 0 }}>
              Rejected
            </span>
          )}
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8,
            width: 28, height: 28, cursor: "pointer", color: "var(--muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.75rem", flexShrink: 0,
          }}>✕</button>
        </div>

        {/* Post preview */}
        <div style={{ padding: "1rem 1.25rem" }}>
          <div style={{
            background: "#1b1f23", borderRadius: 14, padding: "1.125rem",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.875rem" }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                background: "linear-gradient(135deg, #6d6bf5, #a5b4fc)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.8rem", color: "#fff", fontWeight: 700, flexShrink: 0,
              }}>✦</div>
              <div>
                <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff", margin: 0 }}>You</p>
                <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", margin: 0 }}>1st · 1m</p>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <button onClick={handleCopy} title="Copy text" style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: copied ? "#4ade80" : "rgba(255,255,255,0.25)",
                  fontSize: "0.7rem", fontWeight: 600, transition: "color 0.2s", padding: "4px",
                }}>
                  {copied ? "✓" : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
                <a
                  href="https://www.linkedin.com/feed/?shareActive=true"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Post manually on LinkedIn (copy text first)"
                  style={{ color: "rgba(255,255,255,0.25)", display: "flex", padding: "4px" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
              </div>
            </div>
            <p style={{
              fontSize: "0.875rem", color: "#e7e9ea", lineHeight: 1.7, margin: 0,
              whiteSpace: "pre-wrap", fontFamily: "system-ui, -apple-system, sans-serif",
            }}>{post.content}</p>
          </div>
        </div>

        {/* Footer — status-aware */}
        {isDraft && (
          <div style={{ padding: "0 1.25rem 1.25rem", display: "flex", gap: "0.5rem" }}>
            <button onClick={() => handleStatus("rejected")} disabled={isPending} style={{
              flex: 1, padding: "0.75rem", border: "none", borderRadius: 10,
              background: "rgba(255,255,255,0.05)", color: "var(--muted)",
              fontSize: "0.82rem", fontWeight: 600, cursor: isPending ? "wait" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}>Reject</button>
            <button onClick={() => handleStatus("approved")} disabled={isPending} style={{
              flex: 2, padding: "0.75rem", border: "none", borderRadius: 10,
              background: "#0a66c2", color: "#fff",
              fontSize: "0.82rem", fontWeight: 700, cursor: isPending ? "wait" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}>
              {isPending ? "Approving…" : "Approve →"}
            </button>
          </div>
        )}

        {isRejected && (
          <div style={{ padding: "0 1.25rem 1.25rem" }}>
            <button onClick={() => handleStatus("approved")} disabled={isPending} style={{
              width: "100%", padding: "0.75rem", border: "none", borderRadius: 10,
              background: "#0a66c2", color: "#fff",
              fontSize: "0.82rem", fontWeight: 700, cursor: isPending ? "wait" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}>
              {isPending ? "Approving…" : "Approve anyway"}
            </button>
          </div>
        )}

        {isScheduled && (
          <div style={{ padding: "0 1.25rem 1.25rem" }}>
            <button onClick={() => handleStatus("draft")} disabled={isPending} style={{
              width: "100%", padding: "0.75rem", border: "none", borderRadius: 10,
              background: "rgba(255,255,255,0.05)", color: "var(--muted)",
              fontSize: "0.82rem", fontWeight: 500, cursor: isPending ? "wait" : "pointer",
              opacity: isPending ? 0.6 : 1,
            }}>
              {isPending ? "Unscheduling…" : "Unschedule"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export function LinkedInCalendar({ posts, strategyId }: { posts: Post[]; strategyId: string }) {
  const [selected, setSelected] = useState<Post | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [approvingAll, startApprovingAll] = useTransition();

  const getStatus = (p: Post) => liveStatusFor(localStatuses[p.id] ?? p.status, p.scheduled_date);
  const groups = groupByDate(posts);
  const draftCount = posts.filter(p => getStatus(p) === "draft").length;
  const scheduled  = posts.filter(p => getStatus(p) === "approved").length;
  const published  = posts.filter(p => getStatus(p) === "published").length;

  function handleApproveAll() {
    const optimistic: Record<string, string> = {};
    posts.filter(p => getStatus(p) === "draft").forEach(p => { optimistic[p.id] = "approved"; });
    setLocalStatuses(prev => ({ ...prev, ...optimistic }));
    startApprovingAll(async () => {
      await approveAllPosts(strategyId, "linkedin");
    });
  }

  return (
    <>
      <div style={{ marginBottom: "1.75rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
          <span style={{ color: "var(--fg)", fontWeight: 600 }}>{scheduled}</span> scheduled
        </span>
        <span style={{ color: "var(--border-med)", fontSize: "1rem" }}>·</span>
        <span style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
          <span style={{ color: "var(--fg)", fontWeight: 600 }}>{published}</span> posted
        </span>
        {draftCount > 0 && (
          <>
            <span style={{ color: "var(--border-med)", fontSize: "1rem" }}>·</span>
            <span style={{ fontSize: "0.82rem", color: "#fb923c", fontWeight: 600 }}>
              {draftCount} need review
            </span>
            <button
              onClick={handleApproveAll}
              disabled={approvingAll}
              style={{
                marginLeft: "auto",
                padding: "0.425rem 1rem",
                background: approvingAll ? "rgba(10,102,194,0.45)" : "#0a66c2",
                border: "none", borderRadius: 8,
                color: "#fff", fontSize: "0.78rem", fontWeight: 700,
                cursor: approvingAll ? "wait" : "pointer",
                boxShadow: "0 0 14px rgba(10,102,194,0.3)",
                transition: "all 0.15s",
              }}
            >
              {approvingAll ? "Approving…" : `Approve All (${draftCount})`}
            </button>
          </>
        )}
      </div>

      {groups.length === 0 && (
        <div style={{
          padding: "3rem 2rem", textAlign: "center",
          background: "var(--card)", borderRadius: "var(--radius)",
        }}>
          <p style={{ color: "var(--muted)", fontSize: "0.875rem", margin: 0 }}>
            No posts yet for this week.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column" }}>
        {groups.map(([date, dayPosts]) => {
          const { num, dow } = fmtDateHeader(date);
          return (
            <div key={date}>
              <div style={{
                display: "flex", alignItems: "center", gap: "0.75rem",
                padding: "1.25rem 0 0.5rem",
              }}>
                <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--fg)", fontVariantNumeric: "tabular-nums" }}>
                  {num}
                </span>
                <span style={{
                  fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em",
                  textTransform: "uppercase", color: "var(--muted-2)",
                }}>{dow}</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>

              {dayPosts.map(post => {
                const liveStatus = getStatus(post);
                const dot = STATUS_COLOR[liveStatus] ?? "var(--muted-2)";

                return (
                  <div
                    key={post.id}
                    onClick={() => setSelected(post)}
                    className="cal-row"
                    style={{
                      display: "flex", alignItems: "center", gap: "1rem",
                      padding: "0.75rem 0.875rem",
                      borderRadius: 10, cursor: "pointer",
                      transition: "background 0.12s",
                    }}
                  >
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: dot, flexShrink: 0,
                      boxShadow: liveStatus === "approved" ? "0 0 6px rgba(74,222,128,0.45)" : "none",
                    }} />
                    <span style={{
                      fontSize: "0.775rem", color: "var(--muted)",
                      width: 92, flexShrink: 0, fontVariantNumeric: "tabular-nums",
                    }}>9:30 AM IST</span>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 600, padding: "2px 8px",
                      borderRadius: 5, flexShrink: 0,
                      background: "rgba(255,255,255,0.05)", color: "var(--muted)",
                    }}>{getTypeName(post.post_type)}</span>
                    <span style={{
                      flex: 1, fontSize: "0.82rem", color: "var(--fg)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{post.content}</span>
                    <span style={{
                      fontSize: "0.68rem", fontWeight: 600,
                      padding: "3px 9px", borderRadius: 5, flexShrink: 0,
                      ...statusStyle(liveStatus),
                    }}>
                      {statusLabel(liveStatus)}
                    </span>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {selected && (
        <PostModal
          post={selected}
          localStatus={getStatus(selected)}
          onClose={() => setSelected(null)}
          onStatusChange={(s: "approved" | "rejected" | "draft") => setLocalStatuses(prev => ({ ...prev, [selected.id]: s }))}
        />
      )}
    </>
  );
}
