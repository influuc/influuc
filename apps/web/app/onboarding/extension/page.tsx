import { getCurrentFounder } from "@/lib/founder";
import { redirect } from "next/navigation";

/**
 * /onboarding/extension — Step 2 of the connect-first onboarding flow.
 *
 * Prompts the user to install the Influuc Chrome extension.
 * The extension scrapes their own X + LinkedIn profiles (logged-in session)
 * and seeds the Founder Brain with real content signal.
 *
 * Full extension implementation ships in M5 (Plasmo).
 * This page is the placeholder that gates progress to step 3.
 */
export default async function ExtensionPage() {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    redirect("/sign-in");
  }

  // If not yet connected any platform, send back
  if (founder.onboarding_state === "connect") {
    redirect("/onboarding/connect");
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        gap: "2rem",
        textAlign: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          alignItems: "center",
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
          Step 2 of 5
        </span>
        <h1
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
            fontWeight: 700,
            maxWidth: "26ch",
          }}
        >
          Install the Influuc extension
        </h1>
        <p
          style={{
            color: "var(--muted)",
            maxWidth: "44ch",
            lineHeight: 1.65,
          }}
        >
          The browser extension reads your existing posts and engagement — using
          your own logged-in session, never your password. This is how Influuc
          learns your voice.
        </p>
      </div>

      {/* Extension install card */}
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          borderRadius: "0.875rem",
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.03)",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          alignItems: "center",
        }}
      >
        {/* Extension icon placeholder */}
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #6d6bf5 0%, #9f7aea 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PuzzleIcon />
        </div>

        <div style={{ textAlign: "center" }}>
          <p style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
            Influuc — Chrome Extension
          </p>
          <p style={{ fontSize: "0.82rem", color: "var(--muted)" }}>
            Reads your posts from X &amp; LinkedIn · No password required
          </p>
        </div>

        {/* CWS install button — links to Chrome Web Store once published */}
        <div
          style={{
            padding: "0.875rem 1.5rem",
            borderRadius: "0.625rem",
            background: "rgba(255,255,255,0.08)",
            color: "var(--muted)",
            fontWeight: 600,
            fontSize: "0.9rem",
            width: "100%",
            textAlign: "center",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          Extension ships in M5 — coming soon
        </div>
      </div>

      {/* Skip for now — goes to capture fallback (extension is M5) */}
      <a
        href="/onboarding/capture"
        style={{
          fontSize: "0.82rem",
          color: "var(--muted)",
          textDecoration: "underline",
          textUnderlineOffset: "3px",
          cursor: "pointer",
        }}
      >
        Skip for now (continue without extension)
      </a>
    </div>
  );
}

/* ─── Icon ───────────────────────────────────────────────────────────────────── */

function PuzzleIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}
