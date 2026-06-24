import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Fetch lightweight sidebar data: user identity + pending review counts
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let firstName = "";
  let email = user?.email ?? "";
  let draftX = 0;
  let draftLinkedIn = 0;

  if (user) {
    const db = createServiceClient();
    const { data: account } = await db
      .from("accounts")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (account) {
      const { data: founder } = await db
        .from("founders")
        .select("id, display_name")
        .eq("account_id", account.id)
        .single();

      if (founder) {
        firstName = founder.display_name ?? "";
        const { data: drafts } = await db
          .from("weekly_posts")
          .select("platform")
          .eq("founder_id", founder.id)
          .eq("status", "draft");

        if (drafts) {
          draftX = drafts.filter((p) => p.platform === "x").length;
          draftLinkedIn = drafts.filter((p) => p.platform === "linkedin").length;
        }
      }
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar
        firstName={firstName}
        email={email}
        draftX={draftX}
        draftLinkedIn={draftLinkedIn}
      />
      <main className="main-with-sidebar" style={{
        flex: 1,
        minWidth: 0,
        marginLeft: 270,
        display: "flex",
        flexDirection: "column",
      }}>
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
