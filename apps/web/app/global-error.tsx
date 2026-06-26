"use client";

import { useEffect } from "react";
import { captureException } from "@/lib/observability";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    captureException(error, { digest: error.digest, boundary: "global-error" });
  }, [error]);

  return (
    <html>
      <body style={{ margin: 0, background: "#07070f", color: "#f0f0f8", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
          <div style={{ textAlign: "center", maxWidth: 400 }}>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 0.5rem" }}>Something went wrong</h1>
            <p style={{ color: "#6b6b80", fontSize: "0.875rem", margin: "0 0 1.5rem", lineHeight: 1.5 }}>
              An unexpected error occurred. Our team has been notified.
            </p>
            <button
              onClick={reset}
              style={{ background: "#6d6bf5", color: "#fff", border: "none", borderRadius: 9, padding: "0.6rem 1.25rem", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
