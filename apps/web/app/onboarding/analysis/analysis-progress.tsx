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

const STATUS_COLOR: Record<string, string> = {
  queued:    "rgba(255,255,255,0.2)",
  running:   "#6d6bf5",
  succeeded: "#4ade80",
  failed:    "#f87171",
  dead:      "#f87171",
};

const STATUS_LABEL: Record<string, string> = {
  queued:    "Waiting…",
  running:   "Analysing…",
  succeeded: "Done",
  failed:    "Failed",
  dead:      "Failed",
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
        setTimeout(() => { router.push("/onboarding/summary"); }, 1200);
      }
    }

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
    <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Progress card */}
      <div style={{
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.025)",
        padding: "1.5rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}>
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
      <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.3)", textAlign: "center" }}>
        {done
          ? "Analysis complete — redirecting…"
          : `${elapsed}s elapsed · typically 30–90 seconds`}
      </p>

      {anyFailed && !done && (
        <p style={{ fontSize: "0.82rem", color: "#f87171", textAlign: "center" }}>
          Some content failed to process.{" "}
          <a href="/onboarding/summary" style={{ color: "#a5b4fc" }}>
            Continue anyway →
          </a>
        </p>
      )}

      {timedOut && !done && (
        <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.35)", textAlign: "center" }}>
          Taking longer than expected?{" "}
          <a href="/onboarding/summary" style={{ color: "#a5b4fc", fontWeight: 600 }}>
            Skip to review →
          </a>
        </p>
      )}

      <style>{`@keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.35} }`}</style>
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
  const isDone    = status === "succeeded";
  const isFailed  = status === "failed" || status === "dead";
  const isRunning = status === "running";

  const dotColor = STATUS_COLOR[status] ?? "rgba(255,255,255,0.2)";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
        background: dotColor,
        boxShadow: isRunning ? `0 0 8px ${dotColor}` : isDone ? `0 0 6px rgba(74,222,128,0.4)` : "none",
        animation: isRunning ? "pulse-dot 1.5s ease-in-out infinite" : "none",
      }} />
      <span style={{
        fontSize: "0.875rem",
        color: isDone ? "#4ade80" : isFailed ? "#f87171" : "rgba(255,255,255,0.75)",
        flex: 1,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: "0.75rem",
        color: dotColor,
        flexShrink: 0,
        fontWeight: isDone ? 600 : 400,
      }}>
        {STATUS_LABEL[status] ?? status}
      </span>
    </div>
  );
}
