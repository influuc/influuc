"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

interface SignInFormProps {
  initialError?: string;
  /** Where to send the user after auth (default: /onboarding/connect). */
  next?: string;
}

export function SignInForm({ initialError, next = "/onboarding/connect" }: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">(
    initialError ? "error" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState(initialError ?? "");

  const supabase = createClient();

  async function handleMagicLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  async function handleGoogle() {
    const redirectTo = `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }

  if (status === "sent") {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: "2.5rem", lineHeight: 1 }}>✉️</div>
        <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700 }}>
          Check your inbox
        </h2>
        <p
          style={{
            color: "var(--muted)",
            margin: 0,
            textAlign: "center",
            fontSize: "0.9rem",
            lineHeight: 1.6,
          }}
        >
          We sent a magic link to <strong style={{ color: "var(--fg)" }}>{email}</strong>.
          <br />
          Click it to continue — no password needed.
        </p>
        <button
          onClick={() => setStatus("idle")}
          style={{
            ...ghostBtnStyle,
            marginTop: "0.25rem",
            fontSize: "0.8rem",
          }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      {/* Wordmark */}
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

      <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
        Welcome
      </h1>
      <p
        style={{
          margin: 0,
          color: "var(--muted)",
          fontSize: "0.875rem",
          textAlign: "center",
        }}
      >
        Sign in or create your account — no password required.
      </p>

      {/* Error banner */}
      {status === "error" && errorMsg && (
        <div style={errorBannerStyle}>{errorMsg}</div>
      )}

      {/* Magic-link form */}
      <form
        onSubmit={handleMagicLink}
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem", width: "100%" }}
      >
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          style={inputStyle}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          style={{
            ...primaryBtnStyle,
            opacity: status === "loading" ? 0.7 : 1,
          }}
        >
          {status === "loading" ? "Sending…" : "Send magic link"}
        </button>
      </form>

      {/* Divider */}
      <div style={dividerStyle}>
        <div style={dividerLineStyle} />
        <span
          style={{
            color: "var(--muted)",
            fontSize: "0.75rem",
            padding: "0 0.875rem",
            flexShrink: 0,
          }}
        >
          or
        </span>
        <div style={dividerLineStyle} />
      </div>

      {/* Google OAuth */}
      <button onClick={handleGoogle} style={secondaryBtnStyle}>
        <GoogleIcon />
        Continue with Google
      </button>

      <p
        style={{
          margin: 0,
          fontSize: "0.72rem",
          color: "var(--muted)",
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}

/* ─── Inline SVG ────────────────────────────────────────────────────────────── */

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M17.64 9.2c0-.638-.057-1.252-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908C16.658 14.233 17.64 11.925 17.64 9.2z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

/* ─── Styles ────────────────────────────────────────────────────────────────── */

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "1rem",
  padding: "2.5rem 2rem",
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
  alignItems: "center",
  width: "100%",
  maxWidth: "420px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  borderRadius: "0.5rem",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "var(--fg)",
  fontSize: "0.95rem",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const primaryBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: "0.5rem",
  border: "none",
  background: "var(--accent)",
  color: "#fff",
  fontSize: "0.95rem",
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "opacity 150ms",
};

const secondaryBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.05)",
  color: "var(--fg)",
  fontSize: "0.9rem",
  fontWeight: 500,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.625rem",
  fontFamily: "inherit",
};

const ghostBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--muted)",
  cursor: "pointer",
  fontFamily: "inherit",
  textDecoration: "underline",
};

const dividerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  width: "100%",
};

const dividerLineStyle: React.CSSProperties = {
  flex: 1,
  height: "1px",
  background: "rgba(255,255,255,0.08)",
};

const errorBannerStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 0.875rem",
  borderRadius: "0.5rem",
  background: "rgba(248,113,113,0.1)",
  border: "1px solid rgba(248,113,113,0.25)",
  color: "#f87171",
  fontSize: "0.85rem",
  textAlign: "center",
};
