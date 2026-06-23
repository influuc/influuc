import Link from "next/link";
import { ONBOARDING_STATES } from "@influuc/core";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "2rem",
        gap: "1.5rem",
      }}
    >
      <span
        style={{
          fontSize: "0.72rem",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--accent)",
          fontWeight: 700,
        }}
      >
        Influuc
      </span>

      <h1
        style={{
          fontSize: "clamp(2rem, 5vw, 3.5rem)",
          lineHeight: 1.05,
          maxWidth: "18ch",
          fontWeight: 700,
        }}
      >
        Your expertise, operated into authority.
      </h1>

      <p
        style={{
          color: "var(--muted)",
          maxWidth: "46ch",
          fontSize: "1.05rem",
          lineHeight: 1.65,
        }}
      >
        An AI Personal Brand Operator. Humans supervise; AI operates. Build
        authority in under 10 minutes a week.
      </p>

      <div style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap", justifyContent: "center", marginTop: "0.5rem" }}>
        <Link
          href="/sign-in"
          style={{
            padding: "0.75rem 2rem",
            borderRadius: "0.5rem",
            background: "var(--accent)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "0.95rem",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Get started free
        </Link>
        <Link
          href="/sign-in"
          style={{
            padding: "0.75rem 2rem",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.04)",
            color: "var(--fg)",
            fontWeight: 500,
            fontSize: "0.95rem",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Sign in
        </Link>
      </div>

      <p
        style={{
          color: "var(--muted)",
          fontSize: "0.75rem",
          marginTop: "2rem",
          opacity: 0.5,
        }}
      >
        M1 online · {ONBOARDING_STATES.length} onboarding stages
      </p>
    </main>
  );
}
