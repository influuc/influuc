"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CaptureFormProps {
  founderId: string;
  hasX: boolean;
  xHandle: string | null;
  hasLinkedIn: boolean;
}

export function CaptureForm({ hasX, xHandle }: CaptureFormProps) {
  const router = useRouter();
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [includeX, setIncludeX] = useState(hasX);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualText, setManualText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<string | null>(null);

  const canSubmit =
    websiteUrl.trim().startsWith("http") || (hasX && includeX) || manualText.trim().length >= 20;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const calls: Array<() => Promise<Response>> = [];

    if (websiteUrl.trim().startsWith("http")) {
      calls.push(() =>
        fetch("/api/ingest/website", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: websiteUrl.trim() }),
        })
      );
    }

    if (hasX && includeX) {
      calls.push(() =>
        fetch("/api/ingest/x-tweets", { method: "POST" })
      );
    }

    if (manualText.trim().length >= 20) {
      calls.push(() =>
        fetch("/api/ingest/manual", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: manualText.trim() }),
        })
      );
    }

    if (calls.length === 0) {
      setError("Add at least one content source to continue.");
      setLoading(false);
      return;
    }

    try {
      const steps = ["Fetching content…", "Queuing analysis…", "Starting extraction…"];
      let stepIdx = 0;
      for (const call of calls) {
        setStep(steps[stepIdx] ?? "Processing…");
        stepIdx++;
        const res = await call();
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          throw new Error(data.error ?? "Ingest failed");
        }
      }
      router.push("/onboarding/analysis");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
      setStep(null);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        width: "100%",
        maxWidth: "420px",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
      }}
    >
      {/* Website URL */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <label
          htmlFor="website"
          style={{ fontSize: "0.82rem", fontWeight: 600, textAlign: "left" }}
        >
          Website URL
        </label>
        <input
          id="website"
          type="url"
          placeholder="https://yoursite.com"
          value={websiteUrl}
          onChange={(e) => setWebsiteUrl(e.target.value)}
          disabled={loading}
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "0.625rem",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            color: "var(--foreground)",
            fontSize: "0.9rem",
            outline: "none",
            width: "100%",
          }}
        />
      </div>

      {/* X posts toggle */}
      {hasX && (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.875rem 1rem",
            borderRadius: "0.625rem",
            border: "1px solid rgba(255,255,255,0.12)",
            background: includeX ? "rgba(109,107,245,0.08)" : "rgba(255,255,255,0.03)",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <input
            type="checkbox"
            checked={includeX}
            onChange={(e) => setIncludeX(e.target.checked)}
            disabled={loading}
            style={{ width: "16px", height: "16px", accentColor: "var(--accent)" }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>
              Fetch my recent X posts
            </div>
            {xHandle && (
              <div style={{ fontSize: "0.78rem", color: "var(--muted)" }}>{xHandle}</div>
            )}
          </div>
        </label>
      )}

      {/* Manual text toggle */}
      <button
        type="button"
        onClick={() => setManualOpen((o) => !o)}
        disabled={loading}
        style={{
          background: "none",
          border: "1px dashed rgba(255,255,255,0.15)",
          borderRadius: "0.625rem",
          padding: "0.75rem 1rem",
          color: "var(--muted)",
          fontSize: "0.82rem",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {manualOpen ? "▲ Hide manual input" : "▼ Paste a bio or intro (optional)"}
      </button>

      {manualOpen && (
        <textarea
          placeholder="Paste anything — your LinkedIn about section, a speaker bio, a company overview…"
          value={manualText}
          onChange={(e) => setManualText(e.target.value)}
          rows={5}
          disabled={loading}
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "0.625rem",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            color: "var(--foreground)",
            fontSize: "0.88rem",
            resize: "vertical",
            outline: "none",
            width: "100%",
          }}
        />
      )}

      {error && (
        <p style={{ fontSize: "0.82rem", color: "#f87171", textAlign: "left" }}>{error}</p>
      )}

      {loading && step && (
        <p style={{ fontSize: "0.82rem", color: "var(--accent)", textAlign: "left" }}>
          {step}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !canSubmit}
        style={{
          padding: "0.875rem 1.5rem",
          borderRadius: "0.625rem",
          background: canSubmit && !loading ? "var(--accent)" : "rgba(255,255,255,0.08)",
          color: canSubmit && !loading ? "#fff" : "var(--muted)",
          fontWeight: 700,
          fontSize: "0.95rem",
          border: "none",
          cursor: canSubmit && !loading ? "pointer" : "default",
          transition: "background 0.2s",
        }}
      >
        {loading ? "Importing…" : "Analyse my profile →"}
      </button>

      {!hasX && (
        <p style={{ fontSize: "0.78rem", color: "var(--muted)" }}>
          Connect X on the{" "}
          <a href="/onboarding/connect" style={{ color: "var(--accent)" }}>
            previous step
          </a>{" "}
          to include your posts automatically.
        </p>
      )}
    </form>
  );
}
