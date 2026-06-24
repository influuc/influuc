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
}

export function PostCard({ id, content: initialContent, postType, initialStatus, sortOrder }: PostCardProps) {
  const [status, setStatus] = useState<PostStatus>(initialStatus);
  const [content, setContent] = useState(initialContent);
  const [editing, setEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(initialContent);
  const [isPending, startTransition] = useTransition();

  const isShort = postType === "x_short";
  const isLinkedIn = postType === "linkedin";
  const charCount = content.length;
  const overLimit = isShort && charCount > 480;

  const approved  = status === "approved";
  const rejected  = status === "rejected";
  const published = status === "published";
  const scheduled = status === "scheduled";
  const failed    = status === "failed";
  const terminal  = published || scheduled || failed;

  function setStatusOpt(next: "approved" | "rejected" | "draft") {
    setStatus(next);
    startTransition(async () => { await updatePostStatus(id, next); });
  }

  function saveEdit() {
    setContent(editDraft);
    setEditing(false);
    startTransition(async () => { await updatePostContent(id, editDraft); });
  }

  const borderColor = approved  ? "rgba(74,222,128,0.2)"
    : rejected  ? "rgba(248,113,113,0.12)"
    : published ? "rgba(109,107,245,0.2)"
    : scheduled ? "rgba(109,107,245,0.2)"
    : failed    ? "rgba(251,146,60,0.25)"
    : "var(--border)";

  const typeLabel = isShort
    ? `Short ${sortOrder !== undefined ? sortOrder + 1 : ""}`
    : postType === "x_long" ? "Long" : "LinkedIn";

  return (
    <div style={{
      background: "var(--card)",
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--radius)",
      padding: "1rem 1.125rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.875rem",
      opacity: rejected ? 0.5 : 1,
      transition: "border-color 0.15s, opacity 0.15s",
    }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <TypeBadge label={typeLabel} />
          {isShort && (
            <span style={{
              fontSize: "0.7rem",
              color: overLimit ? "var(--error)" : "var(--muted-2)",
              fontVariantNumeric: "tabular-nums",
            }}>
              {charCount}/480
            </span>
          )}
          {isLinkedIn && (
            <span style={{
              fontSize: "0.7rem",
              color: charCount >= 2000 ? "var(--success)" : "var(--muted-2)",
              fontVariantNumeric: "tabular-nums",
            }}>
              {charCount} chars
            </span>
          )}
        </div>
        <StatusBadge status={status} />
      </div>

      {/* Content */}
      {editing ? (
        <textarea
          value={editDraft}
          onChange={(e) => setEditDraft(e.target.value)}
          rows={isLinkedIn ? 14 : isShort ? 4 : 8}
          autoFocus
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid rgba(109,107,245,0.35)",
            background: "rgba(0,0,0,0.3)",
            color: "var(--fg)",
            fontSize: "0.875rem",
            lineHeight: 1.7,
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
      ) : (
        <div style={{
          maxHeight: isLinkedIn ? 360 : isShort ? "none" : 200,
          overflowY: "auto",
        }}>
          <p style={{
            fontSize: "0.875rem",
            lineHeight: 1.75,
            color: "var(--fg)",
            margin: 0,
            whiteSpace: "pre-wrap",
          }}>
            {content}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {terminal ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", width: "100%" }}>
            {published && (
              <span style={{ fontSize: "0.75rem", color: "var(--accent-fg)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Dot color="var(--accent)" /> Live
              </span>
            )}
            {scheduled && (
              <span style={{ fontSize: "0.75rem", color: "var(--muted)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <Dot color="var(--muted)" /> Queued
              </span>
            )}
            {failed && (
              <>
                <span style={{ fontSize: "0.75rem", color: "var(--warning)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Dot color="var(--warning)" /> Failed
                </span>
                <div style={{ flex: 1 }} />
                <ActionBtn variant="ghost" onClick={() => setStatusOpt("approved")} disabled={isPending}>
                  Retry
                </ActionBtn>
              </>
            )}
          </div>
        ) : editing ? (
          <>
            <ActionBtn variant="primary" onClick={saveEdit} disabled={isPending}>Save</ActionBtn>
            <ActionBtn variant="ghost" onClick={() => { setEditing(false); setEditDraft(content); }}>Cancel</ActionBtn>
          </>
        ) : (
          <>
            <ActionBtn variant="ghost" onClick={() => setEditing(true)}>Edit</ActionBtn>
            <div style={{ flex: 1 }} />
            {approved && (
              <ActionBtn variant="ghost" onClick={() => setStatusOpt("draft")} disabled={isPending}>Undo</ActionBtn>
            )}
            {rejected && (
              <ActionBtn variant="ghost" onClick={() => setStatusOpt("draft")} disabled={isPending}>Restore</ActionBtn>
            )}
            {!approved && !rejected && (
              <>
                <ActionBtn variant="danger" onClick={() => setStatusOpt("rejected")} disabled={isPending}>Reject</ActionBtn>
                <ActionBtn variant="success" onClick={() => setStatusOpt("approved")} disabled={isPending}>Approve</ActionBtn>
              </>
            )}
            {approved && (
              <ActionBtn variant="success-solid" disabled>Approved</ActionBtn>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span style={{
      display: "inline-block",
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: color,
      flexShrink: 0,
    }} />
  );
}

function TypeBadge({ label }: { label: string }) {
  return (
    <span style={{
      fontSize: "0.62rem",
      fontWeight: 700,
      letterSpacing: "0.07em",
      textTransform: "uppercase",
      color: "var(--muted-2)",
      padding: "0.2rem 0.5rem",
      borderRadius: 4,
      background: "rgba(255,255,255,0.05)",
      border: "1px solid var(--border)",
    }}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: PostStatus }) {
  const map: Record<PostStatus, { label: string; color: string; bg: string }> = {
    draft:     { label: "Draft",     color: "var(--muted)",    bg: "rgba(255,255,255,0.05)" },
    approved:  { label: "Approved",  color: "var(--success)",  bg: "var(--success-bg)"      },
    rejected:  { label: "Rejected",  color: "var(--error)",    bg: "var(--error-bg)"        },
    published: { label: "Published", color: "var(--accent-fg)", bg: "var(--accent-bg)"      },
    scheduled: { label: "Scheduled", color: "var(--accent-fg)", bg: "var(--accent-bg)"      },
    failed:    { label: "Failed",    color: "var(--warning)",  bg: "var(--warning-bg)"      },
  };
  const c = map[status] ?? map.draft;
  return (
    <span style={{
      fontSize: "0.62rem",
      fontWeight: 700,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      padding: "0.2rem 0.55rem",
      borderRadius: 4,
      background: c.bg,
      color: c.color,
    }}>
      {c.label}
    </span>
  );
}

function ActionBtn({ variant, onClick, disabled, children }: {
  variant: "primary" | "ghost" | "success" | "success-solid" | "danger";
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary:       { background: "var(--accent)",    color: "#fff",              border: "none" },
    ghost:         { background: "transparent",       color: "var(--muted)",      border: "1px solid var(--border)" },
    success:       { background: "var(--success-bg)", color: "var(--success)",    border: "1px solid rgba(74,222,128,0.2)" },
    "success-solid": { background: "var(--success-bg)", color: "var(--success)", border: "1px solid rgba(74,222,128,0.2)" },
    danger:        { background: "var(--error-bg)",   color: "var(--error)",      border: "1px solid rgba(248,113,113,0.15)" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.4rem 0.875rem",
        borderRadius: "var(--radius-sm)",
        fontSize: "0.8rem",
        fontWeight: 500,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled && variant !== "success-solid" ? 0.5 : 1,
        fontFamily: "inherit",
        lineHeight: 1,
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}
