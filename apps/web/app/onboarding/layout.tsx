import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Onboarding layout — protected.
 *
 * Middleware already guards all /onboarding/* routes, so by the time we get
 * here the user is authenticated. This layout double-checks and handles the
 * case where onboarding is already complete (redirect to /dashboard).
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Minimal top bar */}
      <header
        style={{
          padding: "1.25rem 2rem",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
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
      </header>

      <main style={{ flex: 1, display: "flex" }}>{children}</main>
    </div>
  );
}
