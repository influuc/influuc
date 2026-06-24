"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const STEPS = [
  { path: "/onboarding/connect",     label: "Connect" },
  { path: "/onboarding/extension",   label: "Extension" },
  { path: "/onboarding/capture",     label: "Capture" },
  { path: "/onboarding/analysis",    label: "Analysing" },
  { path: "/onboarding/summary",     label: "Review" },
  { path: "/onboarding/preferences", label: "Preferences" },
];

export function OnboardingHeader() {
  const pathname = usePathname();
  const currentIndex = STEPS.findIndex((s) => pathname.startsWith(s.path));
  const currentStep = STEPS[currentIndex];

  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 2rem",
      height: 60,
      borderBottom: "1px solid rgba(255,255,255,0.05)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      background: "rgba(9,9,11,0.8)",
      position: "sticky",
      top: 0,
      zIndex: 20,
    }}>
      {/* Logo */}
      <Link href="/" style={{ fontWeight: 700, fontSize: "0.9rem", letterSpacing: "-0.02em", color: "#fff", textDecoration: "none", opacity: 0.85 }}>
        ✦ influuc
      </Link>

      {/* Progress dots */}
      {currentIndex >= 0 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {STEPS.map((s, i) => (
              <div
                key={s.path}
                className={
                  i < currentIndex
                    ? "progress-dot progress-dot-done"
                    : i === currentIndex
                    ? "progress-dot progress-dot-active"
                    : "progress-dot"
                }
              />
            ))}
          </div>
          {currentStep && (
            <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.3)", letterSpacing: "0.04em" }}>
              Step {currentIndex + 1} of {STEPS.length} · {currentStep.label}
            </span>
          )}
        </div>
      )}

      {/* Spacer */}
      <div style={{ width: "5rem" }} />
    </header>
  );
}
