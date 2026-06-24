"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

interface SignInFormProps {
  initialError?: string;
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
        <div style={{ fontSize: "2.25rem", lineHeight: 1, filter: "drop-shadow(0 0 16px rgba(109,107,245,0.4))" }}>✉️</div>
        <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
          Check your inbox
        </h2>
        <p style={{ color: "rgba(255,255,255,0.45)", margin: 0, textAlign: "center", fontSize: "0.9rem", lineHeight: 1.65 }}>
          We sent a magic link to{" "}
          <strong style={{ color: "#f4f4f5", fontWeight: 500 }}>{email}</strong>.
          <br />
          Click it to sign in — no password needed.
        </p>
        <button
          onClick={() => setStatus("idle")}
          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontFamily: "inherit", fontSize: "0.82rem", textDecoration: "underline", textDecorationColor: "rgba(255,255,255,0.2)", marginTop: 4 }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      {/* Wordmark */}
      <div style={{
        width: 40, height: 40, borderRadius: "50%",
        background: "rgba(109,107,245,0.15)",
        border: "1px solid rgba(109,107,245,0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "1.1rem", fontWeight: 700, color: "#a5b4fc",
      }}>
        ✦
      </div>

      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "6px" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.025em" }}>
          Welcome to Influuc
        </h1>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.4)", fontSize: "0.875rem" }}>
          Sign in or create an account — no password required.
        </p>
      </div>

      {status === "error" && errorMsg && (
        <div style={{
          width: "100%", padding: "10px 14px", borderRadius: 10,
          background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)",
          color: "#f87171", fontSize: "0.85rem", textAlign: "center",
        }}>
          {errorMsg}
        </div>
      )}

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
          className="input"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
        >
          {status === "loading" ? (
            <><span className="spinner spinner-sm" />Sending…</>
          ) : (
            "Send magic link"
          )}
        </button>
      </form>

      <div style={{ display: "flex", alignItems: "center", width: "100%", gap: 0 }}>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.75rem", padding: "0 1rem", flexShrink: 0 }}>or</span>
        <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
      </div>

      <button
        onClick={handleGoogle}
        className="btn btn-ghost"
        style={{ width: "100%", justifyContent: "center" }}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <p style={{ margin: 0, fontSize: "0.72rem", color: "rgba(255,255,255,0.25)", textAlign: "center", lineHeight: 1.5 }}>
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M17.64 9.2c0-.638-.057-1.252-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908C16.658 14.233 17.64 11.925 17.64 9.2z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

const cardStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "1.25rem",
  padding: "2.25rem 2rem",
  display: "flex",
  flexDirection: "column",
  gap: "1.25rem",
  alignItems: "center",
  width: "100%",
  maxWidth: "400px",
  margin: "0 auto",
};
