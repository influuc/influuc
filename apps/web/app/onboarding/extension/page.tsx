import { getCurrentFounder } from "@/lib/founder";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function ExtensionPage() {
  let founder;
  try {
    founder = await getCurrentFounder();
  } catch {
    redirect("/sign-in");
  }

  if (founder.onboarding_state === "connect") {
    redirect("/onboarding/connect");
  }

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "3rem 1.5rem",
      gap: "2rem",
      textAlign: "center",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
        <span style={{ fontSize: "0.72rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 700 }}>
          Step 2 of 5
        </span>
        <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 700, maxWidth: "26ch" }}>
          Install the Influuc extension
        </h1>
        <p style={{ color: "var(--muted)", maxWidth: "44ch", lineHeight: 1.65 }}>
          The extension reads your X posts and LinkedIn activity using your own
          logged-in session — no passwords, no background collection, no setup.
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: "380px", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <Step n={1} label="Load the extension in Chrome" detail='Go to chrome://extensions → enable "Developer mode" → "Load unpacked" → select apps/extension/build/chrome-mv3-dev' />
        <Step n={2} label="Come back here and continue" detail="That's it. No login needed inside the extension — it uses your existing Influuc session automatically." />
      </div>

      <div style={{
        width: "100%",
        maxWidth: "380px",
        padding: "0.875rem 1rem",
        borderRadius: "0.625rem",
        background: "rgba(109,107,245,0.1)",
        border: "1px solid rgba(109,107,245,0.25)",
        fontSize: "0.8rem",
        color: "var(--muted)",
        lineHeight: 1.6,
        textAlign: "left",
      }}>
        <strong style={{ color: "var(--foreground)" }}>During development</strong> — run{" "}
        <code style={{ background: "rgba(255,255,255,0.07)", padding: "0 4px", borderRadius: 3 }}>pnpm dev</code> inside{" "}
        <code style={{ background: "rgba(255,255,255,0.07)", padding: "0 4px", borderRadius: 3 }}>apps/extension</code>,
        then load the <code style={{ background: "rgba(255,255,255,0.07)", padding: "0 4px", borderRadius: 3 }}>build/chrome-mv3-dev</code> folder.
      </div>

      <Link
        href="/onboarding/capture"
        style={{
          padding: "0.75rem 2rem",
          borderRadius: "0.5rem",
          background: "var(--accent)",
          color: "#fff",
          fontWeight: 600,
          fontSize: "0.95rem",
          textDecoration: "none",
        }}
      >
        I&apos;ve installed it — continue →
      </Link>
    </div>
  );
}

function Step({ n, label, detail }: { n: number; label: string; detail: string }) {
  return (
    <div style={{
      display: "flex",
      gap: "0.875rem",
      padding: "0.875rem 1rem",
      borderRadius: "0.625rem",
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(255,255,255,0.02)",
      textAlign: "left",
    }}>
      <div style={{
        width: 26,
        height: 26,
        borderRadius: "50%",
        background: "var(--accent)",
        color: "#fff",
        fontWeight: 700,
        fontSize: "0.78rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 1,
      }}>
        {n}
      </div>
      <div>
        <p style={{ fontWeight: 600, fontSize: "0.875rem", margin: 0 }}>{label}</p>
        <p style={{ fontSize: "0.78rem", color: "var(--muted)", lineHeight: 1.5, margin: "0.25rem 0 0" }}>{detail}</p>
      </div>
    </div>
  );
}
