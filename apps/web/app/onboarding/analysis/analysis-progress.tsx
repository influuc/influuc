"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getAnalysisState } from "./actions";

interface ExtractionJob {
  id: string;
  status: string;
  raw_source_id: string | null;
}

interface AnalysisProgressProps {
  founderId: string;
}

const STATUS_LABEL: Record<string, string> = {
  queued: "Waiting…",
  running: "Analysing content…",
  succeeded: "Done",
  failed: "Failed",
  dead: "Failed",
};

const STATUS_COLOR: Record<string, string> = {
  queued: "var(--muted)",
  running: "var(--accent)",
  succeeded: "#4ade80",
  failed: "#f87171",
  dead: "#f87171",
};

export function AnalysisProgress({ founderId }: AnalysisProgressProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState<ExtractionJob[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const fetchJobs = useCallback(async (): Promise<ExtractionJob[]> => {
    const supabase = createClient();
    const { data } = await supabase
      .from("extraction_jobs")
      .select("id, status, raw_source_id")
      .eq("founder_id", founderId)
      .order("created_at", { ascending: true });
    if (!data) return [];
    // Cast: Supabase enum types collapse to `never` without explicit narrowing
    type Row = { id: string; status: string; raw_source_id: string | null };
    return (data as Row[]).map((row) => ({
      id: row.id,
      status: row.status,
      raw_source_id: row.raw_source_id,
    }));
  }, [founderId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let tickInterval: ReturnType<typeof setInterval>;
    let cancelled = false;

    async function poll() {
      const data = await fetchJobs();
      if (cancelled) return;
      setJobs(data);

      const allTerminal = data.length > 0 &&
        data.every((j) => j.status === "succeeded" || j.status === "failed" || j.status === "dead");

      if (allTerminal) {
        setDone(true);
        clearInterval(interval);
        // Give 1 second for UI feedback then navigate
        setTimeout(() => {
          router.push("/onboarding/summary");
        }, 1200);
      }
    }

    // Server-action check — bypasses client auth issues
    async function checkState() {
      const result = await getAnalysisState();
      if (cancelled) return;
      if (result?.onboarding_state === "summary") {
        setDone(true);
        clearInterval(interval);
        router.push("/onboarding/summary");
      }
    }

    poll();
    checkState();
    interval = setInterval(() => { poll(); checkState(); }, 2500);
    tickInterval = setInterval(() => setElapsed((e) => e + 1), 1000);
    const timeoutId = setTimeout(() => {
      if (!cancelled) setTimedOut(true);
    }, 15_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearInterval(tickInterval);
      clearTimeout(timeoutId);
    };
  }, [founderId, fetchJobs, router]);

  const allDone = jobs.length > 0 && jobs.every((j) => j.status === "succeeded");
  const anyFailed = jobs.some((j) => j.status === "failed" || j.status === "dead");

  return (
    <div style={{ width: "100%", maxWidth: "380px", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Progress steps */}
      <div
        style={{
          borderRadius: "0.875rem",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.03)",
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.875rem",
        }}
      >
        {jobs.length === 0 ? (
          <>
            <ProgressRow label="Reading your website…" status="running" />
            <ProgressRow label="Fetching your posts…" status="running" />
            <ProgressRow label="Extracting your identity…" status="queued" />
          </>
        ) : (
          jobs.map((job, i) => (
            <ProgressRow
              key={job.id}
              label={JOB_LABELS[i] ?? `Source ${i + 1}`}
              status={job.status}
            />
          ))
        )}

        {(jobs.length > 0 || elapsed > 5) && (
          <ProgressRow
            label="Building Founder Brain…"
            status={allDone || done ? "succeeded" : anyFailed ? "failed" : "running"}
          />
        )}
      </div>

      {/* Elapsed */}
      <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
        {done
          ? "Analysis complete — redirecting…"
          : `${elapsed}s elapsed · typically 30–90 seconds total`}
      </p>

      {anyFailed && !done && (
        <p style={{ fontSize: "0.82rem", color: "#f87171" }}>
          Some content failed to process.{" "}
          <a href="/onboarding/summary" style={{ color: "var(--accent)" }}>
            Continue anyway →
          </a>
        </p>
      )}

      {timedOut && (
        <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
          Taking longer than expected?{" "}
          <a href="/onboarding/summary" style={{ color: "var(--accent)", fontWeight: 600 }}>
            Skip to review →
          </a>
        </p>
      )}
    </div>
  );
}

const JOB_LABELS = [
  "Reading your website…",
  "Fetching your posts…",
  "Processing your content…",
  "Extracting expertise…",
];

function ProgressRow({ label, status }: { label: string; status: string }) {
  const isDone = status === "succeeded";
  const isFailed = status === "failed" || status === "dead";
  const isRunning = status === "running";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      {/* Status dot */}
      <div
        style={{
          width: "10px",
          height: "10px",
          borderRadius: "50%",
          flexShrink: 0,
          background: STATUS_COLOR[status] ?? "var(--muted)",
          boxShadow: isRunning ? `0 0 6px ${STATUS_COLOR.running}` : undefined,
          animation: isRunning ? "pulse 1.5s ease-in-out infinite" : undefined,
        }}
      />
      <span
        style={{
          fontSize: "0.85rem",
          color: isDone ? "#4ade80" : isFailed ? "#f87171" : "var(--foreground)",
          flex: 1,
          textAlign: "left",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: "0.75rem",
          color: STATUS_COLOR[status] ?? "var(--muted)",
          flexShrink: 0,
        }}
      >
        {STATUS_LABEL[status] ?? status}
      </span>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
