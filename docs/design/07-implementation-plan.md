# Influuc — Phase 7: Implementation Plan, Testing, CI/CD, Security

> Context: **solo founder + Claude Code.** Sequence for one builder, simplest viable path, de-risk R1/R2 (social access) early. Autopilot ships v1 but behind guardrails built before any autopilot is enabled.

---

## 1. Build Order (milestones)

Ordered by dependency and risk-retirement. Each milestone is shippable/verifiable.

### M0 — Foundation (week 0–1)
- Monorepo (Turborepo + pnpm), TypeScript strict, ESLint/Prettier.
- Next.js app on Vercel; Supabase project; Trigger.dev project; Sentry + PostHog wired.
- CI skeleton (lint, typecheck, unit). Env/secret management. `packages/db` with migration tooling.
- **Exit:** empty app deploys to preview + prod; CI green; one migration applied.

### M1 — Auth, Accounts, Billing (week 1–2)
- Supabase Auth (magic-link + Google). `accounts`/`founders` provisioning.
- Stripe Checkout + webhooks → `subscriptions`; entitlement gate.
- **Exit:** a user can sign up, start a trial, and is gated by plan.

### M2 — Founder Brain core (week 2–4) ← **the moat, build before engines**
- Schema for Brain tables + RLS + pgvector.
- Ingestion: Firecrawl website → `raw_sources`.
- Brain Extractor + Reconciler agents (OpenRouter); confidence + provenance; versioning.
- Retrieval Model (hybrid) + layer summaries.
- **Exit:** given a website, the system produces a confidence-scored Brain you can inspect.

### M3 — Onboarding (week 4–6)
- Stages 1–4 (arrival → discovery → analysis → summary) on top of M2.
- Realtime progress; confirmable cards writing corrections back to Brain.
- Stages 5–7 (commitment, connections, preferences) — reuses M1 + adds OAuth.
- **Exit:** a founder onboards to a useful Brain with minimal typing; "how does it know that?" demo works.

### M4 — Social access + onboarding extension (week 4–7) ← **on the onboarding critical path; retire R1/R2 early**
- X OAuth (PKCE) + LinkedIn OAuth — **identity + publish scopes together**, at the front of onboarding (Stage 2). Vault token storage; verified profile URLs captured.
- Plasmo extension (**required onboarding step**): given the OAuth-connected profile URLs, scrape own-session LinkedIn/X profile + posts → ingestion API → Brain. **No `history`** — `activeTab`/`scripting` (+ optional `tabs`).
- Firecrawl scrapes the website. Fallback chain (OAuth/API + Firecrawl + manual upload) so a founder who declines the extension is degraded, never blocked.
- **Exit:** founder connects accounts (1 step, identity+publish), installs the extension, and their profiles are scraped into the Brain.

> **Sequencing (2026-06-22, connect-first flow):** OAuth is the first onboarding step and the extension scrape is the primary capture path, so the extension is on the onboarding critical path — build the OAuth + extension-capture slices early, in parallel with M2/M3. Ship the fallback alongside.

### M5 — Opportunity Engine (week 7–9)
- Discovery (Exa + RSS first; X-search gated on tier) → classify → match (Brain) → score → prioritise → surface.
- Opportunity feed UI; accept/dismiss → learning signals.
- **Exit:** founder sees ranked, Brain-matched opportunities with reasons.

### M6 — Content + Guardrail + Publishing (week 9–12) ← **autopilot lands here**
- Content Strategist + Writer (voice from Brain); variants.
- **Guardrail pipeline built and tested before autopilot is switchable.**
- Publishing: schedule → publish (per-connection serial, idempotent) → confirm.
- Modes: manual → assisted → autopilot (autopilot behind explicit consent + caps + kill-switch).
- **Exit:** end-to-end opportunity→post works in all three modes; autopilot respects every guardrail.

### M7 — Learning + Reflection + Analytics (week 12–14)
- Metrics collection (post-publish windows); `learning_signals` → weekly aggregate → Brain/weights.
- Weekly reflection (Resend prompt → capture → distil).
- Outcome analytics (authority/audience/opportunity), not vanity.
- **Exit:** the system measurably improves week-over-week; weekly ritual live.

### M8 — Hardening & launch (week 14–16)
- Full E2E suite green; load/cost testing; security review; abuse controls; runbooks; rollback drills.
- **Exit:** production-ready; no failing tests gating deploys.

---

## 2. Dependencies & Critical Path

```
M0 ─► M1 ─► M2 ─────────► M3 ─► M5 ─► M6 ─► M7 ─► M8
                 └► M4 ───┘        ▲
                  (feeds M2 +      │
                   enables M6 publish)
```
- **Critical path:** M0→M1→M2→M3→M5→M6→M7→M8. The Brain (M2) is the longest pole and everything funnels through it.
- **M4 parallel** but must land before M6 (no publishing without connections) and enriches M2/M3.
- **Guardrail (in M6) blocks autopilot** — autopilot cannot be enabled until guardrail tests pass.

## 3. Estimated Complexity

| Milestone | Complexity | Primary risk |
|---|---|---|
| M0 Foundation | Low | config sprawl |
| M1 Auth/Billing | Low–Med | Stripe webhook edge cases |
| M2 Founder Brain | **High** | extraction quality, confidence calibration (R5) |
| M3 Onboarding | Med | async UX, realtime progress |
| M4 Social access | **High** | OAuth approval, extension store review, ToS (R1/R4) |
| M5 Opportunity | Med–High | relevance quality, API tiers (R2), cost (R6) |
| M6 Content/Guardrail/Publish | **High** | voice fidelity, autopilot safety (R3) |
| M7 Learning/Analytics | Med | attribution, avoiding feedback loops |
| M8 Hardening | Med | realistic load/cost validation |

Highest-risk, highest-value: **M2 (Brain)** and **M6 (autopilot safety)**. Invest reviewing effort there.

---

## 4. Testing Strategy (NOT optional)

Test pyramid: many unit, focused integration, targeted E2E, always-on smoke, automated regression.

### 4.1 Unit tests (Vitest)
- Confidence scoring math; conflict-resolution logic; scoring/prioritisation functions; retrieval ranking; guardrail rule evaluators; OAuth state/PKCE helpers; zod schema validators; idempotency-key generation.
- Pure functions in `packages/core`/`agents` are heavily unit-tested (deterministic, no LLM calls — LLM clients mocked).

### 4.2 Integration tests (Vitest + Supabase test DB)
- DB + RLS: assert cross-tenant access is **denied** (security regression guard).
- Ingestion → extraction → Brain write (with mocked Firecrawl/OpenRouter).
- Stripe webhook → subscription state.
- Trigger.dev task contracts (inputs/outputs, idempotency, retry).
- Publishing: idempotent publish, per-connection serialisation, token refresh path.

### 4.3 E2E tests (Playwright)
Browser-driven against a seeded preview env. Coverage plans below.

### 4.4 Smoke tests
- Post-deploy: app loads, auth works, healthcheck endpoints (DB, Trigger.dev, OpenRouter reachability), a canary job runs. Fast (<2 min); gates promotion.

### 4.5 Regression tests
- Every fixed bug gets a test. Golden-set for Brain extraction + guardrail verdicts (snapshot eval on a fixed founder fixture) to catch quality regressions when prompts/models change. LLM-output tests assert **structure + policy**, not exact wording.

### 4.6 E2E coverage plans (required scenarios)
| Flow | Key assertions |
|---|---|
| **Authentication** | sign up, magic-link, Google, session persistence, sign-out, gated routes |
| **Onboarding** | discovery→analysis→summary; corrections persist to Brain; resume mid-flow; sparse-footprint fallback |
| **Founder Brain** | bootstrap produces facts; correction raises confidence; version history recorded; provenance shown |
| **Opportunity Engine** | discovery surfaces ranked opps with reasons; accept→generation; dismiss→learning signal |
| **Publishing** | manual publish; assisted approve→publish; autopilot publish within caps; idempotency (no dupes) |
| **Billing** | trial start; upgrade; cancel; entitlement enforcement |
| **Extension** | token mint; profile import; preview-before-send; payload reaches Brain; disconnect/delete |
| **Settings** | change mode; toggle autopilot; kill-switch halts publishing immediately |
| **Analytics** | outcome metrics populate post-publish |
| **Failure: OAuth** | denial, expired token→needs_reauth, publishing paused, re-consent |
| **Failure: Payment** | declined card, past_due handling, retry, no Brain data loss |
| **Failure: Network** | API timeouts degrade gracefully; onboarding backgrounds + emails |
| **Failure: Background job** | task failure→retry→dead-letter→Sentry+notification; no lost events (outbox replay) |

---

## 5. CI/CD (GitHub Actions)

**No code reaches production if tests fail** — enforced by required status checks + branch protection.

### 5.1 PR validation workflow (`pull_request`)
```
jobs: install → lint → typecheck → unit → integration(Supabase service container)
      → build → e2e(Playwright on Vercel preview) → security scan
required checks: ALL must pass to merge
```
- Vercel auto-creates a **preview deployment** per PR; E2E runs against it.
- Supabase: ephemeral branch DB (or service container) seeded for integration/E2E.
- Trigger.dev: preview/staging environment.

### 5.2 Production deployment (`push` to `main`)
```
gate: PR checks already green → deploy migrations (forward-only, reviewed)
      → Vercel production promote → smoke tests → notify
      → auto-rollback if smoke fails
```
- **Migrations** run before app promote; forward-only, additive-first (expand/contract pattern) so rollback of app code stays safe.
- **Trigger.dev** deploy gated on the same checks.

### 5.3 Rollback strategy
- **App:** Vercel instant rollback to previous deployment (immutable deploys).
- **DB:** expand/contract migrations mean the previous app version still works against the new schema; destructive changes are a separate, later "contract" migration after the new code is stable. Supabase PITR for emergencies.
- **Jobs:** Trigger.dev version pinning; roll back task version.
- **Kill-switches:** feature flags + `system.publishing_paused` to disable autopilot/publishing without a deploy.
- **Drill:** rollback rehearsed in M8.

### 5.4 Gates summary
| Stage | Gate |
|---|---|
| commit | pre-commit: lint/format/typecheck (local, fast) |
| PR | lint + typecheck + unit + integration + build + E2E + security scan (all required) |
| merge→main | branch protection requires green + review |
| deploy | migration apply → promote → **smoke** (auto-rollback on fail) |

---

## 6. Security Requirements (review)

| Area | Controls |
|---|---|
| **Authentication** | Supabase Auth (magic-link/Google), JWT, short sessions, secure cookies |
| **Authorization** | **RLS default-deny on every table**, keyed on `current_founder_id()`; service-role only in trusted server/job context; cross-tenant denial covered by integration tests |
| **OAuth** | PKCE + signed short-TTL `state` bound to founder; server-side token exchange; per-connection revoke; needs_reauth handling |
| **Secrets** | per-env vars (Vercel/Trigger.dev) + Supabase Vault for platform/user tokens; **none in repo or client/extension bundles**; rotate on exposure (the chat-pasted keys must be rotated) |
| **Extension** | least-privilege perms; own-session capture; short-lived ingest-scoped token; server validates/sanitises all payloads; restricted `externally_connectable` |
| **Database** | encryption at rest; token columns non-selectable by client role; append-only audit/provenance; backups + PITR |
| **API** | zod validation at every boundary; webhook signature verification (Stripe, Trigger.dev, platform callbacks); idempotency keys on publish; CORS locked |
| **Abuse prevention** | guardrail pipeline; per-day autopilot caps; anomaly alerts (post-rate spikes → Sentry); content audit log; kill-switch |
| **Rate limiting** | per-founder + per-IP on public/ingest endpoints; platform-API throttling by tier; backoff on 429 |
| **Monitoring** | Sentry (errors/perf), PostHog (product), structured audit_log; alerting on dead-letter and guardrail-fail spikes |
| **Compliance** | data export + cascade delete (GDPR); retention policy on raw sources; consent records for autopilot + extension capture |

### 6.1 Autopilot-specific safety (R3)
- Guardrail must pass `pass_autopilot` (higher bar than approval).
- Breaking-news defaults to approval even in autopilot.
- Daily cap + per-post audit (content, model, version, verdict, actor).
- Founder gets post-publish notification with an **undo window**.
- Global + per-founder kill-switch honoured at *run* time, not just enqueue time.

---

## 7. Verification of vision alignment
Every milestone is checked against the `non-goals.md` Ultimate Test: *does this build authority and reduce founder effort, or make us another creator tool?* Features that fail are cut. Outcome metrics (authority/audience/opportunity), not time-in-app, define success.

---

*End of Phase 1–7 design corpus. Next: Confluence-ready docs + live Jira structure.*
