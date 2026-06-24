import { Sidebar } from "./sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)" }}>
      <Sidebar />
      <main style={{
        flex: 1,
        minWidth: 0,
        marginLeft: 220,
        display: "flex",
        flexDirection: "column",
      }}>
        {children}
      </main>
    </div>
  );
}
