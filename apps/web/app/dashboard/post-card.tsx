"use client";

import { useState, useTransition } from "react";
import { updatePostStatus, updatePostContent } from "./actions";

export type PostStatus = "draft" | "approved" | "rejected" | "published" | "scheduled";
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

  function setStatusOpt(next: "approved" | "rejected" | "draft") {
    setStatus(next);
    startTransition(async () => { await updatePostStatus(id, next); });
  }

  function saveEdit() {
    setContent(editDraft);
    setEditing(false);
    startTransition(async () => { await updatePostContent(id, editDraft); });
  }

  const approved = status === "approved";
  const rejected = status === "rejected";

  const cardStyle: React.CSSProperties = {
    border: `1px solid ${approved ? "rgba(74,222,128,0.28)" : rejected ? "rgba(248,113,113,0.18)" : "rgba(255,255,255,0.08)"}`,
    background: approved ? "rgba(74,222,128,0.04)" : rejected ? "rgba(248,113,113,0.04)" : "rgba(255,255,255,0.02)",
    borderRadius: "0.75rem",
    padding: "1rem 1.125rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    opacity: rejected ? 0.55 : 1,
    transition: "border-color 0.15s, background 0.15s, opacity 0.15s",
  };

  const typeLabel = isShort
    ? `X Short${sortOrder !== undefined ? ` #${sortOrder + 1}` : ""}`
    : postType === "x_long" ? "X Long" : "LinkedIn";

  const contentMaxHeight = isShort ? "none" : isLinkedIn ? "380px" : "220px";

  return (
    <div style={cardStyle}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={typeBadge}>{typeLabel}</span>
          {isShort && (
            <span style={{ fontSize: "0.7rem", color: overLimit ? "#f87171" : "var(--muted, #888)", fontVariantNumeric: "tabular-nums" }}>
              {charCount} / 480
            </span>
          )}
          {isLinkedIn && (
            <span style={{ fontSize: "0.7rem", color: charCount >= 2000 ? "#4ade80" : "var(--muted, #888)", fontVariantNumeric: "tabular-nums" }}>
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
            padding: "0.625rem 0.75rem",
            borderRadius: "0.375rem",
            border: "1px solid rgba(109,107,245,0.45)",
            background: "rgba(0,0,0,0.35)",
            color: "var(--foreground, #fff)",
            fontSize: "0.875rem",
            lineHeight: 1.65,
            resize: "vertical",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      ) : (
        <div style={{ maxHeight: contentMaxHeight, overflowY: contentMaxHeight === "none" ? "visible" : "auto" }}>
          <p style={{
            fontSize: "0.875rem",
            lineHeight: 1.7,
            color: "var(--foreground, #fff)",
            margin: 0,
            whiteSpace: "pre-wrap",
          }}>
            {content}
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.125rem" }}>
        {editing ? (
          <>
            <Btn variant="accent" onClick={saveEdit} disabled={isPending}>Save</Btn>
            <Btn variant="ghost" onClick={() => { setEditing(false); setEditDraft(content); }}>Cancel</Btn>
          </>
        ) : (
          <>
            <Btn variant="ghost" onClick={() => setEditing(true)}>Edit</Btn>
            <div style={{ flex: 1 }} />
            {approved && <Btn variant="ghost" onClick={() => setStatusOpt("draft")} disabled={isPending}>Undo</Btn>}
            {rejected && <Btn variant="ghost" onClick={() => setStatusOpt("draft")} disabled={isPending}>Restore</Btn>}
            {!approved && !rejected && (
              <>
                <Btn variant="reject" onClick={() => setStatusOpt("rejected")} disabled={isPending}>✕</Btn>
                <Btn variant="approve" onClick={() => setStatusOpt("approved")} disabled={isPending}>✓ Approve</Btn>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: PostStatus }) {
  const map: Record<PostStatus, { label: string; color: string; bg: string }> = {
    draft:     { label: "Draft",     color: "rgba(255,255,255,0.45)", bg: "rgba(255,255,255,0.06)" },
    approved:  { label: "Approved",  color: "#4ade80",                bg: "rgba(74,222,128,0.12)"  },
    rejected:  { label: "Rejected",  color: "#f87171",                bg: "rgba(248,113,113,0.1)"  },
    published: { label: "Published", color: "#60a5fa",                bg: "rgba(96,165,250,0.1)"   },
    scheduled: { label: "Scheduled", color: "#a78bfa",                bg: "rgba(167,139,250,0.1)"  },
  };
  const c = map[status] ?? map.draft;
  return (
    <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.55rem", borderRadius: "0.25rem", background: c.bg, color: c.color, fontWeight: 700, letterSpacing: "0.05em" }}>
      {c.label}
    </span>
  );
}

function Btn({ variant, onClick, disabled, children }: {
  variant: "accent" | "ghost" | "approve" | "reject";
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const styles: Record<string, React.CSSProperties> = {
    accent:  { background: "var(--accent, #6d6bf5)", color: "#fff",     border: "none" },
    ghost:   { background: "rgba(255,255,255,0.06)", color: "var(--muted, #888)", border: "1px solid rgba(255,255,255,0.08)" },
    approve: { background: "rgba(74,222,128,0.12)",  color: "#4ade80",  border: "1px solid rgba(74,222,128,0.28)" },
    reject:  { background: "rgba(248,113,113,0.08)", color: "#f87171",  border: "1px solid rgba(248,113,113,0.2)" },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "0.375rem 0.875rem",
        borderRadius: "0.375rem",
        fontSize: "0.8rem",
        fontWeight: 600,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.5 : 1,
        ...styles[variant],
      }}
    >
      {children}
    </button>
  );
}

const typeBadge: React.CSSProperties = {
  fontSize: "0.62rem",
  padding: "0.15rem 0.5rem",
  borderRadius: "0.25rem",
  background: "rgba(255,255,255,0.08)",
  color: "var(--muted, #888)",
  fontWeight: 700,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
};
