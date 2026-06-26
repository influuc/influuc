"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "./actions";

interface SidebarProps {
  firstName?: string;
  email?: string;
  draftX?: number;
  draftLinkedIn?: number;
}

const NAV_MAIN = [
  {
    href: "/dashboard",
    label: "Overview",
    exact: true,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
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
    badgeKey: "x" as const,
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
    badgeKey: "linkedin" as const,
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
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/opportunities",
    label: "Opportunities",
    exact: false,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    href: "/dashboard/history",
    label: "History",
    exact: false,
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

export function Sidebar({ firstName = "", email = "", draftX = 0, draftLinkedIn = 0 }: SidebarProps) {
  const pathname = usePathname();
  const initials = firstName ? firstName.charAt(0).toUpperCase() : email ? email.charAt(0).toUpperCase() : "?";

  const badges: Record<string, number> = { x: draftX, linkedin: draftLinkedIn };

  return (
    <aside style={{
      position: "fixed",
      top: 0, left: 0, bottom: 0,
      width: 270,
      background: "var(--sidebar-bg)",
      display: "flex",
      flexDirection: "column",
      zIndex: 50,
      borderRight: "1px solid var(--border)",
    }}>
      {/* Logo */}
      <div style={{ padding: "22px 20px 18px", display: "flex", alignItems: "center", gap: "0.7rem" }}>
        <Link href="/dashboard" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.7rem" }}>
          <div style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: "linear-gradient(135deg, #7c78ff 0%, #6d6bf5 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 18px rgba(109,107,245,0.35)",
          }}>
            <span style={{ color: "#fff", fontSize: "0.85rem", fontWeight: 700, lineHeight: 1 }}>✦</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.02em", color: "var(--fg)" }}>
            Influuc
          </span>
        </Link>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "var(--border)", margin: "0 16px 12px" }} />

      {/* Main menu */}
      <div style={{ padding: "0 10px", flex: 1, overflowY: "auto" }}>
        <p style={{
          fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.11em",
          textTransform: "uppercase", color: "var(--muted-2)",
          padding: "0 10px 10px", margin: 0,
        }}>
          Main Menu
        </p>
        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {NAV_MAIN.map(({ href, label, icon, exact, badgeKey }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            const badge = badgeKey ? (badges[badgeKey] ?? 0) : 0;
            return (
              <Link key={href} href={href} style={{ textDecoration: "none" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.65rem 0.875rem",
                  borderRadius: 10,
                  background: active ? "rgba(109,107,245,0.14)" : "transparent",
                  color: active ? "#c4b5fd" : "var(--muted)",
                  transition: "background 0.12s, color 0.12s",
                  cursor: "pointer",
                }}>
                  <span style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }}>{icon}</span>
                  <span style={{ fontSize: "0.9rem", fontWeight: active ? 600 : 400, letterSpacing: "-0.01em", flex: 1 }}>
                    {label}
                  </span>
                  {badge > 0 && (
                    <span style={{
                      minWidth: 20, height: 20,
                      background: "#f97316",
                      borderRadius: 999,
                      fontSize: "0.62rem", fontWeight: 700,
                      color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 5px", flexShrink: 0,
                    }}>
                      {badge}
                    </span>
                  )}
                  {active && badge === 0 && (
                    <span style={{
                      width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                      background: "var(--accent)",
                      boxShadow: "0 0 6px rgba(109,107,245,0.6)",
                    }} />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System section */}
      <div style={{ padding: "12px 10px 8px" }}>
        <div style={{ height: 1, background: "var(--border)", margin: "0 6px 12px" }} />
        <p style={{
          fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.11em",
          textTransform: "uppercase", color: "var(--muted-2)",
          padding: "0 10px 10px", margin: 0,
        }}>
          System
        </p>
        <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Link href="/dashboard/settings" style={{ textDecoration: "none" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.65rem 0.875rem", borderRadius: 10,
              background: pathname.startsWith("/dashboard/settings") ? "rgba(109,107,245,0.14)" : "transparent",
              color: pathname.startsWith("/dashboard/settings") ? "#c4b5fd" : "var(--muted)",
              transition: "background 0.12s, color 0.12s",
              cursor: "pointer",
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
              </svg>
              <span style={{ fontSize: "0.9rem", fontWeight: pathname.startsWith("/dashboard/settings") ? 600 : 400, letterSpacing: "-0.01em" }}>
                Settings
              </span>
              {pathname.startsWith("/dashboard/settings") && (
                <span style={{
                  marginLeft: "auto", width: 5, height: 5, borderRadius: "50%",
                  background: "var(--accent)", flexShrink: 0,
                  boxShadow: "0 0 6px rgba(109,107,245,0.6)",
                }} />
              )}
            </div>
          </Link>

          <form action={signOutAction}>
            <button type="submit" style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.65rem 0.875rem", borderRadius: 10,
              color: "var(--muted-2)",
              transition: "background 0.12s, color 0.12s",
              cursor: "pointer",
              background: "none", border: "none", width: "100%",
              fontFamily: "inherit", textAlign: "left",
            }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span style={{ fontSize: "0.9rem", letterSpacing: "-0.01em" }}>Sign Out</span>
            </button>
          </form>
        </nav>
      </div>

      {/* User chip */}
      <div style={{
        margin: "8px 10px 14px",
        padding: "10px 12px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.04)",
        border: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: "0.75rem",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #6d6bf5 0%, #a5b4fc 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "0.8rem", fontWeight: 700, color: "#fff",
          boxShadow: "0 0 12px rgba(109,107,245,0.3)",
        }}>
          {initials}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{
            fontSize: "0.855rem", fontWeight: 600, color: "var(--fg)",
            margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {firstName || "Founder"}
          </p>
          <p style={{
            fontSize: "0.72rem", color: "var(--muted)",
            margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {email}
          </p>
        </div>
      </div>
    </aside>
  );
}
