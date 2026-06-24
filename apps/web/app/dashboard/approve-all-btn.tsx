"use client";

import { useState, useTransition } from "react";
import { approveAllPosts } from "./actions";

export function ApproveAllBtn({
  strategyId,
  platform,
  draftCount,
}: {
  strategyId: string;
  platform: "x" | "linkedin";
  draftCount: number;
}) {
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (draftCount === 0 || done) {
    return (
      <span style={{
        fontSize: "0.78rem", color: "var(--success)", fontWeight: 600,
        display: "flex", alignItems: "center", gap: "0.375rem",
      }}>
        ✓ Week approved
      </span>
    );
  }

  return (
    <button
      onClick={() => {
        startTransition(async () => {
          await approveAllPosts(strategyId, platform);
          setDone(true);
        });
      }}
      disabled={isPending}
      style={{
        padding: "0.5rem 1.125rem",
        borderRadius: 8,
        background: "rgba(109,107,245,0.15)",
        border: "1px solid rgba(109,107,245,0.3)",
        color: "#a5b4fc",
        fontSize: "0.8rem",
        fontWeight: 600,
        cursor: isPending ? "default" : "pointer",
        opacity: isPending ? 0.6 : 1,
        fontFamily: "inherit",
        transition: "background 0.15s, border-color 0.15s",
        whiteSpace: "nowrap",
      }}
    >
      {isPending ? "Approving…" : `Approve entire week (${draftCount} posts)`}
    </button>
  );
}
