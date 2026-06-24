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

  if (founder.onboarding_state === "landing" || founder.onboarding_state === "connect") {
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
      gap: "2.5rem",
      textAlign: "center",
    }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center", maxWidth: 480 }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "rgba(109,107,245,0.12)",
          border: "1px solid rgba(109,107,245,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "1.5rem", marginBottom: 4,
        }}>
          🧩
        </div>
        <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: 0, lineHeight: 1.1 }}>
          Install the Influuc extension
        </h1>
        <p style={{ color: "rgba(255,255,255,0.45)", maxWidth: "44ch", lineHeight: 1.7, margin: 0, fontSize: "0.95rem" }}>
          The extension reads your X posts and LinkedIn activity using your own
          logged-in session — no passwords, no background collection, no setup.
        </p>
      </div>

      <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 8 }}>
        <Step
          n={1}
          label="Load the extension in Chrome"
          detail='Go to chrome://extensions → enable "Developer mode" → "Load unpacked" → select apps/extension/build/chrome-mv3-dev'
        />
        <Step
          n={2}
          label="Come back here and click continue"
          detail="That's it. No login needed inside the extension — it uses your existing Influuc session automatically."
        />
      </div>

      <div style={{
        width: "100%", maxWidth: 420,
        padding: "12px 16px", borderRadius: 12,
        background: "rgba(109,107,245,0.07)",
        border: "1px solid rgba(109,107,245,0.18)",
        fontSize: "0.8rem", color: "rgba(255,255,255,0.45)",
        lineHeight: 1.65, textAlign: "left",
      }}>
        <strong style={{ color: "rgba(255,255,255,0.7)" }}>During development</strong> — run{" "}
        <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>pnpm dev</code> inside{" "}
        <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>apps/extension</code>,
        then load the{" "}
        <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4 }}>build/chrome-mv3-dev</code> folder.
      </div>

      <Link href="/onboarding/capture" className="btn btn-primary" style={{ padding: "13px 28px", fontSize: "0.95rem" }}>
        I&apos;ve installed it — continue →
      </Link>
    </div>
  );
}

function Step({ n, label, detail }: { n: number; label: string; detail: string }) {
  return (
    <div style={{
      display: "flex",
      gap: 16,
      padding: "16px 20px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(255,255,255,0.025)",
      textAlign: "left",
    }}>
      <div className="step-circle">{n}</div>
      <div>
        <p style={{ fontWeight: 600, fontSize: "0.875rem", margin: 0, letterSpacing: "-0.01em" }}>{label}</p>
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: "4px 0 0" }}>{detail}</p>
      </div>
    </div>
  );
}
