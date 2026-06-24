"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/dashboard",
    label: "Overview",
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/dashboard/x",
    label: "X Posts",
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
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      position: "fixed",
      top: 0,
      left: 0,
      bottom: 0,
      width: 220,
      background: "var(--sidebar-bg)",
      borderRight: "1px solid var(--border)",
      display: "flex",
      flexDirection: "column",
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1px solid var(--border)",
      }}>
        <Link href="/dashboard" style={{ textDecoration: "none" }}>
          <span style={{
            fontWeight: 800,
            fontSize: 20,
            letterSpacing: "-0.04em",
            color: "var(--accent-fg)",
          }}>
            influuc
          </span>
        </Link>
      </div>

      {/* Nav items */}
      <nav style={{
        flex: 1,
        padding: "10px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        overflowY: "auto",
      }}>
        {navItems.map(({ href, label, icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                background: active ? "var(--accent-bg)" : "transparent",
                color: active ? "var(--accent-fg)" : "var(--muted)",
                textDecoration: "none",
                fontSize: 13.5,
                fontWeight: active ? 600 : 400,
                transition: "background 0.1s, color 0.1s",
              }}
            >
              <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: Settings */}
      <div style={{
        padding: "10px 10px 16px",
        borderTop: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}>
        {(() => {
          const active = pathname.startsWith("/dashboard/settings");
          return (
            <Link
              href="/dashboard/settings"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                background: active ? "var(--accent-bg)" : "transparent",
                color: active ? "var(--accent-fg)" : "var(--muted)",
                textDecoration: "none",
                fontSize: 13.5,
                fontWeight: active ? 600 : 400,
                transition: "background 0.1s, color 0.1s",
              }}
            >
              <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              </span>
              Settings
            </Link>
          );
        })()}
      </div>
    </aside>
  );
}
