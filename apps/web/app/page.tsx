import Link from "next/link";

export default function LandingPage() {
  return (
    <div style={{ background: "#000", minHeight: "100dvh", color: "#f4f4f5", fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif" }}>

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: 60,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        background: "rgba(0,0,0,0.75)",
      }}>
        <span style={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: "-0.02em", color: "#fff" }}>
          ✦ influuc
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <a href="#features" className="landing-nav-link">Features</a>
          <a href="#how-it-works" className="landing-nav-link">How it works</a>
          <a href="#pricing" className="landing-nav-link">Pricing</a>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Link href="/sign-in" className="landing-nav-link">Sign in</Link>
          <Link href="/sign-in" className="btn btn-primary btn-sm">Get started →</Link>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="hero-container" style={{
        paddingTop: "calc(60px + 110px)",
        paddingBottom: 120,
        paddingLeft: "2rem",
        paddingRight: "2rem",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}>
        <div className="hero-glow" />
        <div className="hero-grid-bg" />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 740, display: "flex", flexDirection: "column", alignItems: "center", gap: "1.75rem" }}>

          <div className="badge badge-accent animate-fade-up">
            ✦ AI Personal Brand Operator
          </div>

          <h1 className="animate-fade-up-delay-1" style={{
            fontSize: "clamp(2.6rem, 7vw, 5.2rem)",
            fontWeight: 800,
            lineHeight: 1.02,
            letterSpacing: "-0.04em",
            margin: 0,
          }}>
            <span className="gradient-text">Build authority.</span><br />
            <span style={{ color: "#f4f4f5" }}>Post consistently.</span><br />
            <span style={{ color: "rgba(255,255,255,0.3)" }}>Without the grind.</span>
          </h1>

          <p className="animate-fade-up-delay-2" style={{
            fontSize: "clamp(1rem, 2.5vw, 1.175rem)",
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.7,
            maxWidth: "50ch",
            margin: 0,
          }}>
            Influuc learns your voice, builds your content strategy, and posts to X and LinkedIn while you focus on building.{" "}
            <strong style={{ color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>10 minutes a week. Full control.</strong>
          </p>

          <div className="animate-fade-up-delay-3" style={{ display: "flex", gap: "0.875rem", flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/sign-in" className="btn btn-primary" style={{ fontSize: "1rem", padding: "14px 28px" }}>
              Start for free →
            </Link>
            <a href="#how-it-works" className="btn btn-ghost" style={{ fontSize: "1rem", padding: "14px 28px" }}>
              See how it works
            </a>
          </div>

          <div className="animate-fade-up-delay-4" style={{
            display: "flex", gap: "1.5rem", alignItems: "center",
            fontSize: "0.78rem", color: "rgba(255,255,255,0.3)",
            flexWrap: "wrap", justifyContent: "center",
          }}>
            <span>✓ 7-day free trial</span>
            <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
            <span>✓ No credit card</span>
            <span style={{ color: "rgba(255,255,255,0.1)" }}>·</span>
            <span>✓ Cancel anytime</span>
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "100px 2rem" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: "3.5rem" }}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
            <span className="badge badge-muted">Features</span>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>
              Everything you need to own your niche
            </h2>
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "1.05rem", margin: 0, maxWidth: "52ch" }}>
              Built for founders who know content matters but can&apos;t afford to live on social media.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card">
                <div style={{ fontSize: "1.5rem", marginBottom: 14, filter: "drop-shadow(0 0 12px rgba(109,107,245,0.35))" }}>{f.icon}</div>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 8px", letterSpacing: "-0.015em" }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.42)", lineHeight: 1.7, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: "100px 2rem", background: "rgba(109,107,245,0.025)" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: "3.5rem" }}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
            <span className="badge badge-muted">How it works</span>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>
              Set up once. Post forever.
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{
                display: "flex",
                gap: 24,
                padding: "28px 32px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.02)",
              }}>
                <div className="step-circle" style={{ width: 36, height: 36, fontSize: "0.85rem", marginTop: 3 }}>
                  {i + 1}
                </div>
                <div>
                  <h3 style={{ fontSize: "1.025rem", fontWeight: 600, margin: "0 0 7px", letterSpacing: "-0.015em" }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.42)", lineHeight: 1.7, margin: 0 }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: "100px 2rem" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", flexDirection: "column", gap: "3.5rem" }}>
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
            <span className="badge badge-muted">Pricing</span>
            <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 700, letterSpacing: "-0.03em", margin: 0 }}>
              Start free. Scale fast.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.4)", margin: 0 }}>
              7-day free trial of Pro — no credit card needed.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 16 }}>
            {PLANS.map((plan, i) => (
              <div key={i} style={{
                padding: 28, borderRadius: 16,
                border: plan.featured ? "1px solid rgba(109,107,245,0.4)" : "1px solid rgba(255,255,255,0.07)",
                background: plan.featured ? "rgba(109,107,245,0.06)" : "rgba(255,255,255,0.025)",
                display: "flex", flexDirection: "column", gap: 20, position: "relative",
              }}>
                {plan.featured && (
                  <div style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    padding: "3px 14px", borderRadius: 999,
                    background: "#6d6bf5", color: "#fff",
                    fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.09em", whiteSpace: "nowrap",
                  }}>
                    MOST POPULAR
                  </div>
                )}
                <div>
                  <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", margin: "0 0 6px", fontWeight: 500 }}>{plan.name}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: "2.4rem", fontWeight: 700, letterSpacing: "-0.03em" }}>{plan.price}</span>
                    <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.875rem" }}>/mo</span>
                  </div>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {plan.features.map((f, j) => (
                    <li key={j} style={{ display: "flex", gap: 9, fontSize: "0.875rem", color: "rgba(255,255,255,0.6)", alignItems: "flex-start" }}>
                      <span style={{ color: "#4ade80", flexShrink: 0, marginTop: 1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-in" className={`btn ${plan.featured ? "btn-primary" : "btn-ghost"}`} style={{ textAlign: "center" }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────────────────── */}
      <section style={{
        padding: "80px 2rem", textAlign: "center",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(109,107,245,0.03)",
      }}>
        <div style={{ maxWidth: 620, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.5rem", alignItems: "center" }}>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.035em", margin: 0, lineHeight: 1.05 }}>
            <span className="gradient-text">Start building authority</span><br />
            <span style={{ color: "#f4f4f5" }}>today.</span>
          </h2>
          <p style={{ color: "rgba(255,255,255,0.42)", fontSize: "1.05rem", margin: 0 }}>
            Your future audience is already on X and LinkedIn. Start showing up.
          </p>
          <Link href="/sign-in" className="btn btn-primary" style={{ fontSize: "1rem", padding: "14px 32px" }}>
            Get started free →
          </Link>
          <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.25)", margin: 0 }}>
            7-day free trial · No credit card · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer style={{
        padding: "1.5rem 2rem", borderTop: "1px solid rgba(255,255,255,0.05)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: "1rem",
        color: "rgba(255,255,255,0.25)", fontSize: "0.8rem",
      }}>
        <span style={{ fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "-0.01em" }}>✦ influuc</span>
        <span>© 2026 Influuc. Built for founders who ship.</span>
      </footer>
    </div>
  );
}

/* ── Data ────────────────────────────────────────────────────────────────────── */

const FEATURES = [
  { icon: "🧠", title: "Founder Brain", desc: "Ingests your existing posts, website, and voice. Learns what makes you unique and generates content that actually sounds like you — not a robot." },
  { icon: "📅", title: "Weekly Content Engine", desc: "Every Monday, a full week of posts drops — 3 X posts/day + 1 LinkedIn/day — built around your specific goals and current audience." },
  { icon: "✍️", title: "Review in Minutes", desc: "Approve, edit, or reject with one click. Your weekly queue takes around 10 minutes to review. Then you're completely done for the week." },
  { icon: "🚀", title: "Auto-Publisher", desc: "Approved posts publish at optimal times automatically. No copy-pasting, no switching tabs, no manually scheduling anything." },
  { icon: "🔄", title: "Weekly Reflection Loop", desc: "Quick 5-question check-in each week. What performed? What flopped? The AI adapts and gets smarter about your audience every cycle." },
  { icon: "⚡", title: "Opportunity Engine", desc: "Monitors trending topics in your niche. Surfaces the exact moments when you should post right now to maximize reach and relevance." },
];

const STEPS = [
  { title: "Connect your accounts", desc: "Link your X and LinkedIn in one click. The browser extension reads your existing content so the AI can learn your voice exactly." },
  { title: "Your Founder Brain is built", desc: "Influuc analyses your posts, website, and expertise. In a few minutes, it understands your audience, core topics, and writing style." },
  { title: "Review your first week", desc: "A full week of platform-native content appears in your dashboard. Approve what you love, edit what needs work, reject the rest." },
  { title: "Posts go live automatically", desc: "On Autopilot, everything publishes at optimal times with no input from you. On Manual, you stay in full control of every post." },
];

const PLANS = [
  {
    name: "Starter", price: "$29", featured: false, cta: "Start free trial",
    features: ["1 X post / day", "1 LinkedIn post / day", "Weekly content strategy", "Founder Brain", "Manual review mode"],
  },
  {
    name: "Pro", price: "$79", featured: true, cta: "Start free trial",
    features: ["3 X posts / day", "1 LinkedIn post / day", "Opportunity Engine", "Autopilot publishing", "Weekly reflection flywheel", "Priority AI processing"],
  },
  {
    name: "Scale", price: "$149", featured: false, cta: "Start free trial",
    features: ["Everything in Pro", "Advanced analytics", "Team access (coming soon)", "Dedicated onboarding call", "Custom posting schedule"],
  },
];
