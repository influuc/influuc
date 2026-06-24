"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_MAIN = [
  {
    href: "/dashboard",
    label: "Overview",
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    href: "/dashboard/x",
    label: "X",
    exact: false,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/linkedin",
    label: "LinkedIn",
    exact: false,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/strategy",
    label: "Strategy",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/brain",
    label: "Founder Brain",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/history",
    label: "History",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar-desktop" style={{
      position: "fixed",
      top: 0, left: 0, bottom: 0,
      width: 230,
      background: "var(--sidebar-bg)",
      flexDirection: "column",
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0,
            background: "linear-gradient(135deg, #7c78ff 0%, #6d6bf5 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 14px rgba(109,107,245,0.3)",
          }}>
            <span style={{ color: "#fff", fontSize: "0.8rem", fontWeight: 700, lineHeight: 1 }}>✦</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.02em", color: "var(--fg)" }}>
            Influuc
          </span>
        </Link>
      </div>

      {/* Main menu */}
      <div style={{ padding: "4px 12px 0", flex: 1 }}>
        <p style={{
          fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "var(--muted-2)",
          padding: "0 8px 8px", margin: 0,
        }}>
          Main Menu
        </p>
        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_MAIN.map(({ href, label, icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.625rem",
                  padding: "0.55rem 0.75rem",
                  borderRadius: 9,
                  background: active ? "rgba(109,107,245,0.14)" : "transparent",
                  color: active ? "#c4b5fd" : "var(--muted)",
                  transition: "background 0.12s, color 0.12s",
                  cursor: "pointer",
                }}>
                  <span style={{ flexShrink: 0, opacity: active ? 1 : 0.75 }}>{icon}</span>
                  <span style={{ fontSize: "0.855rem", fontWeight: active ? 600 : 400, letterSpacing: "-0.01em" }}>
                    {label}
                  </span>
                  {active && (
                    <span style={{
                      marginLeft: "auto", width: 5, height: 5, borderRadius: "50%",
                      background: "var(--accent)", flexShrink: 0,
                      boxShadow: "0 0 6px rgba(109,107,245,0.6)",
                    }} />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System */}
      <div style={{ padding: "12px 12px 20px" }}>
        <p style={{
          fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "var(--muted-2)",
          padding: "0 8px 8px", margin: 0,
        }}>
          System
        </p>
        <Link href="/dashboard/settings" style={{ textDecoration: "none" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "0.625rem",
            padding: "0.55rem 0.75rem", borderRadius: 9,
            background: pathname.startsWith("/dashboard/settings") ? "rgba(109,107,245,0.14)" : "transparent",
            color: pathname.startsWith("/dashboard/settings") ? "#c4b5fd" : "var(--muted)",
            transition: "background 0.12s, color 0.12s",
            cursor: "pointer",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
            <span style={{ fontSize: "0.855rem", fontWeight: pathname.startsWith("/dashboard/settings") ? 600 : 400, letterSpacing: "-0.01em" }}>Settings</span>
          </div>
        </Link>
        <Link href="/sign-out" style={{ textDecoration: "none" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "0.625rem",
            padding: "0.55rem 0.75rem", borderRadius: 9,
            color: "var(--muted-2)",
            transition: "background 0.12s, color 0.12s",
            cursor: "pointer",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span style={{ fontSize: "0.855rem", letterSpacing: "-0.01em" }}>Sign Out</span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
