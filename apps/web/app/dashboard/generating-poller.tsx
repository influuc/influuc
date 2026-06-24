"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function GeneratingPoller() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 8000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div style={{
      background: "rgba(109,107,245,0.06)",
      border: "1px solid rgba(109,107,245,0.15)",
      borderRadius: "var(--radius)",
      padding: "2rem 1.75rem",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "1rem",
      textAlign: "center",
    }}>
      {/* Spinner */}
      <div style={{ position: "relative", width: 44, height: 44 }}>
        <div style={{
          position: "absolute", inset: 0,
          border: "2px solid rgba(109,107,245,0.15)",
          borderTopColor: "#6d6bf5",
          borderRadius: "50%",
          animation: "spin 0.9s linear infinite",
        }} />
        <div style={{
          position: "absolute", inset: 8,
          border: "2px solid rgba(109,107,245,0.08)",
          borderTopColor: "rgba(109,107,245,0.5)",
          borderRadius: "50%",
          animation: "spin 1.3s linear infinite reverse",
        }} />
      </div>

      <div>
        <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--fg)", margin: "0 0 0.4rem" }}>
          Generating your first week of content
        </p>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: 0, lineHeight: 1.6, maxWidth: 380 }}>
          Your Founder Brain is writing 21 X posts and 7 LinkedIn articles in your voice.
          This usually takes 1–2 minutes. This page refreshes automatically.
        </p>
      </div>

      <div style={{ display: "flex", gap: "1.5rem", marginTop: "0.5rem" }}>
        <Stat label="X Posts" value="21" />
        <Stat label="LinkedIn" value="7" />
        <Stat label="Days covered" value="7" />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontWeight: 700, fontSize: "1.35rem", color: "var(--accent-fg)", margin: "0 0 0.2rem" }}>
        {value}
      </p>
      <p style={{ fontSize: "0.72rem", color: "var(--muted-2)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {label}
      </p>
    </div>
  );
}
