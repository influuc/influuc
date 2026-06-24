"use client";

import { useState, useTransition } from "react";
import { updatePostStatus, updatePostContent } from "./actions";

export type PostStatus = "draft" | "approved" | "rejected" | "published" | "scheduled" | "failed";
export type PostType = "x_short" | "x_long" | "linkedin";

interface PostCardProps {
  id: string;
  content: string;
  postType: PostType;
  initialStatus: PostStatus;
  sortOrder?: number;
  scheduledDate?: string;
  mode?: "manual" | "assisted" | "autopilot";
}

// IST posting schedule
function getPostTime(postType: PostType, sortOrder?: number): string {
  if (postType === "linkedin") return "9:30 AM IST";
  if (postType === "x_long")   return "7:00 PM IST";
  return (sortOrder ?? 0) === 0 ? "9:00 AM IST" : "1:00 PM IST";
}

function fmtScheduledDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = d.getTime() - today.getTime();
  if (diff >= 0 && diff < 86400000)   return "Today";
  if (diff >= 86400000 && diff < 172800000) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

const STATUS_DOT_COLOR: Record<PostStatus, string> = {
  draft:     "#52525b",
  approved:  "#4ade80",
  rejected:  "#f87171",
  published: "#a5b4fc",
  scheduled: "#a5b4fc",
  failed:    "#fb923c",
};

export function PostCard({
  id,
  content: initialContent,
  postType,
  initialStatus,
  sortOrder,
  scheduledDate,
  mode = "manual",
}: PostCardProps) {
  const [status, setStatus]       = useState<PostStatus>(initialStatus);
  const [content, setContent]     = useState(initialContent);
  const [editing, setEditing]     = useState(false);
  const [editDraft, setEditDraft] = useState(initialContent);
  const [isPending, startTransition] = useTransition();

  const isShort    = postType === "x_short";
  const isLinkedIn = postType === "linkedin";
  const charCount  = content.length;
  const overLimit  = isShort && charCount > 480;

  const approved  = status === "approved";
  const rejected  = status === "rejected";
  const published = status === "published";
  const scheduled = status === "scheduled";
  const failed    = status === "failed";
  const terminal  = published || scheduled || failed;

  const time = getPostTime(postType, sortOrder);

  function setStatusOpt(next: "approved" | "rejected" | "draft") {
    setStatus(next);
    startTransition(async () => { await updatePostStatus(id, next); });
  }

  function saveEdit() {
    setContent(editDraft);
    setEditing(false);
    startTransition(async () => { await updatePostContent(id, editDraft); });
  }

  const cardClass = `post-card ${
    approved  ? "post-card-approved"  :
    rejected  ? "post-card-rejected"  :
    published ? "post-card-published" :
    failed    ? "post-card-failed"    : ""
  }`;

  const typeLabel =
    isShort    ? `Short ${sortOrder !== undefined ? sortOrder + 1 : ""}` :
    postType === "x_long" ? "Long" : "LinkedIn";

  return (
    <div className={cardClass}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", minWidth: 0 }}>
          <span className="post-type-badge">{typeLabel}</span>

          {/* char count */}
          {isShort && (
            <span style={{ fontSize: "0.68rem", color: overLimit ? "var(--error)" : "var(--muted-2)", fontVariantNumeric: "tabular-nums" }}>
              {charCount}/480
            </span>
          )}
          {isLinkedIn && (
            <span style={{ fontSize: "0.68rem", color: charCount >= 2000 ? "var(--success)" : "var(--muted-2)", fontVariantNumeric: "tabular-nums" }}>
              {charCount} chars
            </span>
          )}

          {/* scheduled time */}
          {scheduledDate && !terminal && (
            <span style={{ fontSize: "0.68rem", color: "var(--muted-2)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ opacity: 0.4 }}>·</span>
              {fmtScheduledDate(scheduledDate)}, {time}
            </span>
          )}
        </div>

        {/* Status badge */}
        <span className={`post-status post-status-${status}`} style={{ flexShrink: 0 }}>
          <span className="post-status-dot" style={{ background: STATUS_DOT_COLOR[status] }} />
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      {/* ── Content ── */}
      {editing ? (
        <textarea
          value={editDraft}
          onChange={(e) => setEditDraft(e.target.value)}
          rows={isLinkedIn ? 14 : isShort ? 5 : 9}
          autoFocus
          style={{
            width: "100%",
            padding: "0.875rem 1rem",
            borderRadius: 8,
            border: "1px solid rgba(109,107,245,0.4)",
            background: "rgba(0,0,0,0.35)",
            color: "var(--fg)",
            fontSize: "0.9rem",
            lineHeight: 1.7,
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
      ) : (
        <div style={{ maxHeight: isLinkedIn ? 380 : isShort ? "none" : 220, overflowY: "auto" }}>
          <p style={{
            fontSize: "0.9rem",
            lineHeight: 1.75,
            color: rejected ? "var(--muted)" : "#e4e4e7",
            margin: 0,
            whiteSpace: "pre-wrap",
            fontWeight: 400,
          }}>
            {content}
          </p>
        </div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", paddingTop: "0.125rem" }}>

        {/* Terminal states (published / scheduled / failed) — same for all modes */}
        {terminal ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", width: "100%" }}>
            {published && (
              <span style={{ fontSize: "0.75rem", color: "var(--accent-fg)", display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 500 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
                Published
              </span>
            )}
            {scheduled && (
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--muted)", display: "inline-block" }} />
                Queued · {time}
              </span>
            )}
            {failed && (
              <>
                <span style={{ fontSize: "0.75rem", color: "var(--warning)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--warning)", display: "inline-block" }} />
                  Failed to publish
                </span>
                <div style={{ flex: 1 }} />
                <button className="post-btn post-btn-ghost" onClick={() => setStatusOpt("approved")} disabled={isPending}>
                  Retry
                </button>
              </>
            )}
          </div>

        /* Edit mode */
        ) : editing ? (
          <>
            <button className="post-btn post-btn-primary" onClick={saveEdit} disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </button>
            <button className="post-btn post-btn-ghost" onClick={() => { setEditing(false); setEditDraft(content); }}>
              Cancel
            </button>
          </>

        /* AUTOPILOT — no approval needed, posts go out automatically */
        ) : mode === "autopilot" ? (
          <>
            <button className="post-btn post-btn-edit" onClick={() => setEditing(true)}>
              Edit
            </button>
            <div style={{ flex: 1 }} />
            <span style={{
              fontSize: "0.72rem", color: "var(--accent-fg)", fontWeight: 500,
              display: "flex", alignItems: "center", gap: "0.375rem",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", background: "var(--accent)",
                display: "inline-block", animation: "pulse-dot 2s ease-in-out infinite",
              }} />
              Auto-publishing · {time}
            </span>
          </>

        /* MANUAL + AUTOMATIC — require approval */
        ) : (
          <>
            <button className="post-btn post-btn-edit" onClick={() => setEditing(true)}>
              Edit
            </button>
            <div style={{ flex: 1 }} />
            {approved && (
              <button className="post-btn post-btn-ghost" onClick={() => setStatusOpt("draft")} disabled={isPending}>
                Undo
              </button>
            )}
            {rejected && (
              <button className="post-btn post-btn-ghost" onClick={() => setStatusOpt("draft")} disabled={isPending}>
                Restore
              </button>
            )}
            {!approved && !rejected && (
              <>
                <button className="post-btn post-btn-reject" onClick={() => setStatusOpt("rejected")} disabled={isPending}>
                  Reject
                </button>
                <button className="post-btn post-btn-approve" onClick={() => setStatusOpt("approved")} disabled={isPending}>
                  ✓ Approve
                </button>
              </>
            )}
            {approved && (
              <button className="post-btn post-btn-approve-solid" disabled>
                ✓ Approved
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
