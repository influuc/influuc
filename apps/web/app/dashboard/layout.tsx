import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar />
      <main className="main-with-sidebar" style={{
        flex: 1,
        minWidth: 0,
        marginLeft: 230,
        display: "flex",
        flexDirection: "column",
      }}>
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
