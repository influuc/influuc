"use client";

import { useState, useTransition } from "react";
import { updatePostStatus, approveAllPosts } from "../actions";

type Post = {
  id: string;
  content: string;
  post_type: string;
  status: string;
  sort_order: number;
  scheduled_date: string;
};

function getPostTime(postType: string, sortOrder: number): string {
  if (postType === "x_long") return "7:00 PM IST";
  return sortOrder === 0 ? "9:00 AM IST" : "1:00 PM IST";
}

function getTypeName(postType: string): string {
  return postType === "x_long" ? "Long Form" : "Single Post";
}

function groupByDate(posts: Post[]) {
  const map = new Map<string, Post[]>();
  for (const p of posts) {
    if (!map.has(p.scheduled_date)) map.set(p.scheduled_date, []);
    map.get(p.scheduled_date)!.push(p);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, ps]) => ({
      date,
      posts: ps.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    }));
}

function fmtDateHeader(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z");
  return {
    num: d.toLocaleDateString("en-US", { day: "numeric", timeZone: "UTC" }),
    dow: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
  };
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
  onStatusChange: (s: "approved" | "rejected") => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  const time = getPostTime(post.post_type, post.sort_order ?? 0);
  const d = new Date(post.scheduled_date + "T00:00:00Z");
  const dateLabel = d.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
  });

  function handleStatus(newStatus: "approved" | "rejected") {
    startTransition(async () => {
      await updatePostStatus(post.id, newStatus);
      onStatusChange(newStatus);
    });
  }

  function handleCopy() {
    navigator.clipboard.writeText(post.content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const isDone = localStatus === "approved" || localStatus === "published";
  const isRejected = localStatus === "rejected";

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
        width: "min(520px, calc(100vw - 32px))",
        maxHeight: "85vh", overflowY: "auto",
        background: "#0f0f1e", borderRadius: 20, zIndex: 201,
        boxShadow: "0 32px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.06)",
      }}>
        <div style={{
          padding: "1.125rem 1.25rem",
          display: "flex", alignItems: "center", gap: "0.75rem",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: "rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--fg)">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--fg)", margin: 0 }}>{dateLabel}</p>
            <p style={{ fontSize: "0.7rem", color: "var(--muted)", margin: "0.1rem 0 0" }}>
              {time} · {getTypeName(post.post_type)}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 8,
            width: 28, height: 28, cursor: "pointer", color: "var(--muted)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.75rem", flexShrink: 0,
          }}>✕</button>
        </div>

        <div style={{ padding: "1rem 1.25rem 0.75rem" }}>
          <p style={{
            fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.12em",
            textTransform: "uppercase", color: "var(--muted-2)", margin: "0 0 0.75rem",
          }}>Platform Preview</p>
          <div style={{
            background: "#000", borderRadius: 14, padding: "1rem 1.125rem",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <div style={{
                width: 34, height: 34, borderRadius: "50%",
                background: "linear-gradient(135deg, #6d6bf5, #a5b4fc)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.75rem", color: "#fff", fontWeight: 700,
              }}>✦</div>
              <div>
                <p style={{ fontSize: "0.82rem", fontWeight: 700, color: "#fff", margin: 0 }}>You</p>
                <p style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.38)", margin: 0 }}>@you · 1m</p>
              </div>
            </div>
            <p style={{
              fontSize: "0.875rem", color: "#e7e9ea", lineHeight: 1.65, margin: 0,
              whiteSpace: "pre-wrap", fontFamily: "system-ui, -apple-system, sans-serif",
            }}>{post.content}</p>
          </div>
        </div>

        <div style={{ padding: "0.75rem 1.25rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button onClick={handleCopy} style={{
            width: "100%", padding: "0.7rem",
            background: "rgba(255,255,255,0.06)", border: "none", borderRadius: 10,
            color: copied ? "var(--success)" : "var(--fg)",
            fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
            transition: "color 0.2s",
          }}>
            {copied ? "✓ Copied!" : "Copy Content"}
          </button>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => handleStatus("rejected")} disabled={isPending || isRejected} style={{
              flex: 1, padding: "0.7rem", border: "none", borderRadius: 10,
              background: isRejected ? "rgba(248,113,113,0.15)" : "rgba(255,255,255,0.05)",
              color: isRejected ? "#f87171" : "var(--muted)",
              fontSize: "0.82rem", fontWeight: 600, cursor: isPending ? "wait" : "pointer",
              opacity: isPending ? 0.6 : 1, transition: "all 0.15s",
            }}>
              {isRejected ? "✓ Rejected" : "Reject"}
            </button>
            <button onClick={() => handleStatus("approved")} disabled={isPending || isDone} style={{
              flex: 2, padding: "0.7rem", border: "none", borderRadius: 10,
              background: isDone ? "rgba(74,222,128,0.15)" : "rgba(109,107,245,0.85)",
              color: isDone ? "#4ade80" : "#fff",
              fontSize: "0.82rem", fontWeight: 700, cursor: isPending ? "wait" : "pointer",
              boxShadow: isDone ? "none" : "0 0 20px rgba(109,107,245,0.35)",
              opacity: isPending ? 0.6 : 1, transition: "all 0.15s",
            }}>
              {isDone ? "✓ Approved" : "Approve"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function XCalendar({ posts, strategyId }: { posts: Post[]; strategyId: string }) {
  const [selected, setSelected] = useState<Post | null>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, string>>({});
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [approvingAll, startApprovingAll] = useTransition();
  const [, startInline] = useTransition();

  const getStatus = (p: Post) => localStatuses[p.id] ?? p.status;
  const groups = groupByDate(posts);
  const draftCount = posts.filter(p => getStatus(p) === "draft").length;
  const scheduled = posts.filter(p => ["approved", "scheduled"].includes(getStatus(p))).length;
  const published = posts.filter(p => getStatus(p) === "published").length;

  function handleInlineStatus(postId: string, newStatus: "approved" | "rejected", e: React.MouseEvent) {
    e.stopPropagation();
    if (pendingIds.has(postId)) return;
    setPendingIds(prev => new Set([...prev, postId]));
    setLocalStatuses(prev => ({ ...prev, [postId]: newStatus }));
    startInline(async () => {
      await updatePostStatus(postId, newStatus);
      setPendingIds(prev => { const s = new Set(prev); s.delete(postId); return s; });
    });
  }

  function handleApproveAll() {
    const optimistic: Record<string, string> = {};
    posts.filter(p => getStatus(p) === "draft").forEach(p => { optimistic[p.id] = "approved"; });
    setLocalStatuses(prev => ({ ...prev, ...optimistic }));
    startApprovingAll(async () => {
      await approveAllPosts(strategyId, "x");
    });
  }

  return (
    <>
      {/* Stats bar */}
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
                background: approvingAll ? "rgba(109,107,245,0.45)" : "rgba(109,107,245,0.85)",
                border: "none", borderRadius: 8,
                color: "#fff", fontSize: "0.78rem", fontWeight: 700,
                cursor: approvingAll ? "wait" : "pointer",
                boxShadow: "0 0 14px rgba(109,107,245,0.3)",
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
        {groups.map(({ date, posts: dayPosts }) => {
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
                const time = getPostTime(post.post_type, post.sort_order ?? 0);
                const dot = STATUS_COLOR[liveStatus] ?? "var(--muted-2)";
                const isDraft = liveStatus === "draft";
                const isPending = pendingIds.has(post.id);

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
                    }}>{time}</span>
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 600, padding: "2px 8px",
                      borderRadius: 5, flexShrink: 0,
                      background: "rgba(255,255,255,0.05)", color: "var(--muted)",
                    }}>{getTypeName(post.post_type)}</span>
                    <span style={{
                      flex: 1, fontSize: "0.82rem", color: "var(--fg)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{post.content}</span>

                    {isDraft ? (
                      <div
                        style={{ display: "flex", gap: "0.375rem", flexShrink: 0 }}
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          onClick={e => handleInlineStatus(post.id, "rejected", e)}
                          disabled={isPending}
                          title="Reject"
                          style={{
                            padding: "4px 9px", border: "none", borderRadius: 5,
                            background: "rgba(248,113,113,0.1)", color: "#f87171",
                            fontSize: "0.7rem", fontWeight: 700,
                            cursor: isPending ? "wait" : "pointer",
                            opacity: isPending ? 0.4 : 1,
                          }}
                        >✕</button>
                        <button
                          onClick={e => handleInlineStatus(post.id, "approved", e)}
                          disabled={isPending}
                          style={{
                            padding: "4px 12px", border: "none", borderRadius: 5,
                            background: "rgba(109,107,245,0.85)", color: "#fff",
                            fontSize: "0.7rem", fontWeight: 700,
                            cursor: isPending ? "wait" : "pointer",
                            opacity: isPending ? 0.4 : 1,
                            boxShadow: "0 0 10px rgba(109,107,245,0.3)",
                          }}
                        >Approve</button>
                      </div>
                    ) : (
                      <span style={{
                        fontSize: "0.68rem", fontWeight: 600,
                        padding: "3px 9px", borderRadius: 5, flexShrink: 0,
                        ...statusStyle(liveStatus),
                      }}>
                        {statusLabel(liveStatus)}
                      </span>
                    )}
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
          onStatusChange={s => setLocalStatuses(prev => ({ ...prev, [selected.id]: s }))}
        />
      )}
    </>
  );
}
