"use client";

import { useState } from "react";
import { PostCard } from "../post-card";
import type { PostStatus } from "../post-card";

type PostRow = {
  id: string;
  content: string;
  post_type: string;
  status: string;
  sort_order: number;
  scheduled_date: string;
};

type Filter = "all" | "draft" | "approved" | "published";

interface XPostListProps {
  posts: PostRow[];
  mode: "manual" | "assisted" | "autopilot";
}

function getTodayIST(): string {
  const now = new Date();
  const d = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function fmtDay(d: string) {
  return new Date(d + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric", timeZone: "UTC",
  });
}

function groupByDay(posts: PostRow[]) {
  const map = new Map<string, { shorts: PostRow[]; longs: PostRow[] }>();
  for (const p of posts) {
    if (!map.has(p.scheduled_date)) map.set(p.scheduled_date, { shorts: [], longs: [] });
    if (p.post_type === "x_short") map.get(p.scheduled_date)!.shorts.push(p);
    else map.get(p.scheduled_date)!.longs.push(p);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, groups]) => ({ date, ...groups }));
}

export function XPostList({ posts, mode }: XPostListProps) {
  const draftCount = posts.filter(p => p.status === "draft").length;
  const [filter, setFilter] = useState<Filter>(draftCount > 0 ? "draft" : "all");

  const counts = {
    all: posts.length,
    draft: posts.filter(p => p.status === "draft").length,
    approved: posts.filter(p => p.status === "approved").length,
    published: posts.filter(p => ["published", "scheduled"].includes(p.status)).length,
  };

  const visible =
    filter === "all"       ? posts :
    filter === "draft"     ? posts.filter(p => p.status === "draft") :
    filter === "approved"  ? posts.filter(p => p.status === "approved") :
    posts.filter(p => ["published", "scheduled"].includes(p.status));

  const byDay = groupByDay(visible);
  const todayIST = getTodayIST();

  const tabs: { id: Filter; label: string }[] = [
    { id: "all",       label: "All" },
    { id: "draft",     label: "Needs Review" },
    { id: "approved",  label: "Approved" },
    { id: "published", label: "Published" },
  ];

  const emptyMessage =
    filter === "draft"     ? "You're all caught up — no posts need review." :
    filter === "approved"  ? "No approved posts yet." :
    filter === "published" ? "No published posts yet." : "No posts found.";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>

      {/* ── Filter tabs ── */}
      <div style={{
        display: "flex",
        gap: "0.25rem",
        padding: "0.25rem",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 10,
        border: "1px solid var(--border)",
        width: "fit-content",
      }}>
        {tabs.map(tab => {
          const count = counts[tab.id];
          const active = filter === tab.id;
          const isDraft = tab.id === "draft";
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: "0.4rem 0.875rem",
                borderRadius: 7,
                border: "none",
                cursor: "pointer",
                fontSize: "0.78rem",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                background: active ? "rgba(255,255,255,0.09)" : "transparent",
                color: active ? "var(--fg)" : "var(--muted)",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
              {count > 0 && (
                <span style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 5,
                  lineHeight: 1.4,
                  background: active && isDraft ? "rgba(251,146,60,0.2)" : "rgba(255,255,255,0.07)",
                  color: active && isDraft ? "#fb923c" : active ? "var(--fg)" : "var(--muted-2)",
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Empty state ── */}
      {byDay.length === 0 && (
        <div style={{ padding: "3rem 2rem", textAlign: "center", color: "var(--muted)", fontSize: "0.875rem" }}>
          {emptyMessage}
        </div>
      )}

      {/* ── Days ── */}
      {byDay.map(({ date, shorts, longs }) => {
        const isToday = date === todayIST;
        return (
          <section key={date} style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            ...(isToday ? {
              padding: "1rem",
              background: "rgba(109,107,245,0.04)",
              borderRadius: 12,
              border: "1px solid rgba(109,107,245,0.12)",
              marginLeft: "-1rem",
              marginRight: "-1rem",
            } : {}),
          }}>
            {/* Day header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
              paddingBottom: "0.625rem",
              borderBottom: `1px solid ${isToday ? "rgba(109,107,245,0.15)" : "var(--border)"}`,
            }}>
              <h2 style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: isToday ? "var(--accent-fg)" : "var(--muted-2)",
                margin: 0,
              }}>
                {fmtDay(date)}
              </h2>
              {isToday && (
                <span style={{
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "2px 7px",
                  borderRadius: 4,
                  background: "rgba(109,107,245,0.15)",
                  color: "var(--accent-fg)",
                  border: "1px solid rgba(109,107,245,0.25)",
                }}>
                  Today
                </span>
              )}
            </div>

            {/* Short posts — 2-col grid */}
            {shorts.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {shorts.map(p => (
                  <PostCard
                    key={p.id}
                    id={p.id}
                    content={p.content}
                    postType="x_short"
                    initialStatus={p.status as PostStatus}
                    sortOrder={p.sort_order}
                    scheduledDate={p.scheduled_date}
                    mode={mode}
                  />
                ))}
              </div>
            )}

            {/* Long posts — full width */}
            {longs.map(p => (
              <PostCard
                key={p.id}
                id={p.id}
                content={p.content}
                postType="x_long"
                initialStatus={p.status as PostStatus}
                sortOrder={p.sort_order}
                scheduledDate={p.scheduled_date}
                mode={mode}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}
