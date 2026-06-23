"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--background, #0c0c0e)" }}>
      <Nav />
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        {children}
      </main>
    </div>
  );
}

function Nav() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/x", label: "X Posts" },
    { href: "/dashboard/linkedin", label: "LinkedIn" },
  ];

  return (
    <nav style={{
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(12,12,14,0.9)",
      backdropFilter: "blur(12px)",
      position: "sticky",
      top: 0,
      zIndex: 50,
    }}>
      <div style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "0 1.5rem",
        display: "flex",
        alignItems: "center",
        height: "52px",
        gap: "0.25rem",
      }}>
        <Link href="/dashboard" style={{ fontWeight: 800, fontSize: "1rem", color: "var(--accent, #6d6bf5)", textDecoration: "none", marginRight: "1.5rem", letterSpacing: "-0.02em" }}>
          Influuc
        </Link>

        {links.map(({ href, label }) => {
          const active = href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} style={{
              padding: "0.35rem 0.875rem",
              borderRadius: "0.4rem",
              fontSize: "0.85rem",
              fontWeight: active ? 600 : 400,
              color: active ? "var(--foreground, #fff)" : "var(--muted, #888)",
              background: active ? "rgba(255,255,255,0.07)" : "transparent",
              textDecoration: "none",
              transition: "all 0.1s",
            }}>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
