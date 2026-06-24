import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingHeader } from "./onboarding-header";

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
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <OnboardingHeader />
      <main style={{ flex: 1, display: "flex" }}>{children}</main>
    </div>
  );
}
