# Influuc — Project Discovery

> The "first task" deliverable, persisted. Produced after reading all of `/docs`. Decisions confirmed with the founder 2026-06-22.

## Locked decisions
| Decision | Choice |
|---|---|
| Deliverable scope | Full Phase 1–7 design + **live Jira** + Confluence-ready docs (Confluence connector not yet installed) |
| Social data access | **Extension reads** (own session), **official APIs write** (X, LinkedIn `w_member_social`) |
| Autonomy in v1 | **Full Autopilot ships**, behind hard guardrails (confidence gates, policy filters, rate caps, kill-switch, audit) |
| Team | **Solo founder + Claude Code** — sequence for one builder, simplest viable path |

## 1. Product Analysis
Influuc is an **operator, not a tool**: it inverts the creator-software model so the founder *supervises* and the system *operates*. Success = founder effort ≤10 min/week + authority growth, never engagement/volume. The **Founder Brain is the moat**; every engine depends on it, it depends on none. The product is fundamentally **asynchronous and proactive** ("Influuc already handled it"). Highest-risk product decision = autonomous publishing under a real name (managed via guardrails). Design filter for every feature = the `non-goals.md` Ultimate Test.

## 2. Technical Analysis
Next.js/Vercel (thin UI + API + webhooks) · Supabase (Postgres + pgvector + Auth + Storage + RLS + Vault) · Trigger.dev (all async/agent work) · OpenRouter (model-agnostic) · Exa + Firecrawl (research) · Plasmo extension (read channel) · Stripe · Resend · PostHog · Sentry. The hard part is **not the stack** — it's the two external platforms: official APIs largely forbid the *reading* the vision needs and gate *writing*. This is why the extension is load-bearing.

## 3. Architecture Recommendation
Event-driven core; Brain at centre as versioned, confidence-scored knowledge; engines as Trigger.dev workflows reading the Brain and emitting events; Learning Engine closes the loop. Monorepo (Turborepo). Single Postgres with strict RLS. Detail in Phases 1–7.

## 4. Risks
- **R1** LinkedIn API can't deliver the reading the vision needs → extension load-bearing.
- **R2** X API tier limits discovery volume/cost → engine is tier-parametrised.
- **R3** Autonomous-publish liability → Guardrail Pipeline + caps + kill-switch + audit.
- **R4** Extension ToS / Web-Store risk → own-session, explicit-action, manual-upload fallback.
- **R5** Brain cold-start quality → honest confidence + confirm-don't-create onboarding.
- **R6** AI cost per founder → cheap-to-expensive funnel + per-founder token budgets.
- **R7** Over-engineering → simplest viable path; cut anything failing the Ultimate Test.

## 5. Unknowns (carry-forward)
LinkedIn dev access level; current X API tier; exact pricing/packaging; compliance region; whether external customers exist yet vs. founder-as-first-user.

## 6. Assumptions
Stack as above; English B2B founders; single-founder tenancy v1; human-in-loop default with autopilot opt-in + acknowledged.

## 7. Open questions resolved → see Locked decisions. Remaining (non-blocking): X API tier value, LinkedIn partner status, pricing tiers. Will parametrise rather than hard-code.

## Security note (action required by founder)
Live secrets (OpenRouter, Firecrawl, Exa, Resend, **full X tokens**, **LinkedIn client secret**) were pasted in chat and must be treated as **compromised → rotate all**. They belong in Vercel/Trigger.dev env + Supabase Vault, never in repo or client/extension bundles.
