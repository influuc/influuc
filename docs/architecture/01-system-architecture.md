# Influuc — Phase 1: Architecture Design

> Source of truth: `/docs/vision.md`, `product.md`, `non-goals.md`, `founder-brain.md`, `onboarding.md`.
> Architecture principle (per `available-infrastructure.md`): **Vision → Product → UX → System → Infrastructure.** Use the simplest system capable of delivering the vision. Complexity must be earned.

This document covers: System, Service, Data, Event, Queue, Agent, Browser-Extension, OAuth, and Security architecture.

---

## 0. Decisions locked with the founder (2026-06-22)

| Decision | Choice | Architectural consequence |
|---|---|---|
| Deliverable scope | Full design + live Jira + (Confluence-ready) docs | This corpus |
| Social data access | **Extension reads, official API writes** | Plasmo captures LinkedIn/X from the founder's own session; X write API + LinkedIn `w_member_social` publish |
| Autonomy in v1 | **Full Autopilot ships in v1, with hard guardrails** | Requires confidence gates, content-policy filters, rate caps, kill-switch, immutable audit log |
| Team | Solo founder + Claude Code | Monorepo, managed services only, minimal ops surface |

### Standing risks carried into the design
- **R1 LinkedIn API ceiling** — reading is not permitted; the extension is load-bearing, not a convenience.
- **R2 X API tier** — discovery volume depends on the paid tier; engine is tier-parametrised.
- **R3 Autonomous-publish liability** — mitigated by the Guardrail Pipeline (§Agent Architecture).
- **R4 ToS / Web-Store** — extension scrapes only the founder's *own* authenticated views, on explicit action; documented in Phase 6.

---

## 1. System Architecture

### 1.1 Shape
Influuc is an **event-driven, asynchronous operator** with a thin supervisory web surface. The founder does not "drive" the app; background workers produce outcomes that the founder reviews in ≤10 min/week. Therefore the centre of gravity is the **job/agent tier**, not the UI.

```
                         ┌─────────────────────────────────────────────┐
                         │                FOUNDER                         │
                         │   Web app (review/approve)  +  Plasmo ext      │
                         └───────────────┬───────────────┬───────────────┘
                                         │ HTTPS          │ capture (own session)
                         ┌───────────────▼───────────────▼───────────────┐
                         │   Next.js on Vercel  (UI + API routes + BFF)    │
                         │   - Auth (Supabase) - tRPC/route handlers       │
                         │   - Webhooks (Stripe, Trigger.dev, platforms)   │
                         └───────────────┬─────────────────────┬──────────┘
                                         │ enqueue / emit       │ read/write (RLS)
                  ┌──────────────────────▼───────┐   ┌──────────▼─────────────────┐
                  │   Trigger.dev (job + agent    │   │   Supabase                  │
                  │   runtime, schedules, queues) │◄─►│   Postgres + pgvector       │
                  │   - Discovery / Analysis      │   │   Auth · Storage · Realtime │
                  │   - Generation / Publishing   │   │   RLS (founder_id)          │
                  │   - Learning / Reflection     │   │   Vault (token encryption)  │
                  └───┬─────────┬─────────┬───────┘   └─────────────────────────────┘
                      │         │         │
        ┌─────────────▼┐ ┌──────▼─────┐ ┌─▼────────────┐ ┌───────────┐ ┌──────────┐
        │ OpenRouter   │ │ Exa /      │ │ X API /      │ │ Resend    │ │ Stripe   │
        │ (LLMs)       │ │ Firecrawl  │ │ LinkedIn API │ │ (email)   │ │ (billing)│
        └──────────────┘ └────────────┘ └──────────────┘ └───────────┘ └──────────┘

   Cross-cutting: PostHog (product analytics), Sentry (errors/perf), GTM (web tags).
```

### 1.2 Why this shape
- **Vercel + Next.js**: one deployable for marketing site, app, API, and webhooks. Preview deploys per PR. Serverless functions are fine for request/response; anything long-running goes to Trigger.dev (avoids serverless timeouts).
- **Supabase**: Postgres (relational truth) + `pgvector` (semantic recall) + Auth + Storage + Realtime + Vault, one platform, RLS as the primary authorization boundary. Avoids stitching 4 services.
- **Trigger.dev**: durable, retryable, schedulable workflows. The Opportunity/Content/Learning loops are inherently async, long, and bursty — exactly its sweet spot. Keeps the request path thin.
- **OpenRouter**: model-agnostic. Per-task model selection (cheap model for classification, frontier model for generation). No lock-in.

### 1.3 Environments
`local` → `preview` (per-PR) → `production`. One Supabase project per environment (prod + a shared dev/preview project with branch databases where feasible). Trigger.dev environments mirror this. Secrets per-environment only.

### 1.4 Repository topology (monorepo, Turborepo + pnpm)
```
influuc/
├─ apps/
│  ├─ web/            # Next.js (App Router): marketing, app, API routes, webhooks
│  └─ extension/      # Plasmo (LinkedIn/X capture)
├─ packages/
│  ├─ core/           # Founder Brain logic, domain types, scoring
│  ├─ agents/         # agent definitions, prompts, guardrail pipeline
│  ├─ db/             # schema, migrations, generated types, RLS policies
│  ├─ jobs/           # Trigger.dev task definitions
│  ├─ integrations/   # OpenRouter, Exa, Firecrawl, X, LinkedIn, Resend clients
│  └─ ui/             # shared React components, design system
├─ supabase/          # migrations, seed, config
└─ docs/              # this corpus
```
Rationale for solo builder: one repo, one CI, shared types end-to-end, no cross-repo version drift.

---

## 2. Service Architecture

Logical services (not micro-services — they are modules/packages and Trigger.dev task groups within one deployable). Boundaries are drawn by **data ownership** and **failure isolation**, so they *could* be extracted later.

| Service | Responsibility | Runtime | Reads | Writes |
|---|---|---|---|---|
| **Identity & Billing** | Auth, accounts, subscription state, entitlements | Web (API) + Stripe webhooks | `accounts`, `subscriptions` | same |
| **Founder Brain** | Layered knowledge, confidence, embeddings, versioning | core + jobs | all sources | `brain_*` tables |
| **Ingestion** | Pull/parse website (Firecrawl), LinkedIn/X (extension payloads), normalise | jobs | external | `raw_sources`, `extraction_jobs` |
| **Opportunity Engine** | Discover, score, prioritise, match opportunities | jobs (scheduled) | Brain + Exa/X | `opportunities` |
| **Content Engine** | Convert opportunity + Brain → drafts in founder voice | jobs | Brain + opportunities | `content_items` |
| **Guardrail** | Policy/safety/brand-fit gate before any publish | agents | content + policy | `guardrail_reviews` |
| **Publishing Engine** | Schedule, approve, publish, confirm | jobs + API | content + connections | `publications`, `schedules` |
| **Learning Engine** | Ingest outcomes/edits, update Brain confidence | jobs (scheduled) | metrics + edits | `brain_*`, `learning_signals` |
| **Reflection Engine** | Weekly prompt → capture → distil into Brain | jobs + API | founder input | `reflections`, `brain_*` |
| **Notifications** | Lifecycle + approval emails (minimal) | jobs + Resend | events | `notifications` |
| **Analytics** | Outcome metrics (authority/audience/opportunity) | jobs + PostHog | platform metrics | `metrics_*` |

**Dependency rule (from `founder-brain.md`):** every engine depends on the Founder Brain; the Brain depends on none of them. Enforced by package boundaries — `packages/core` (Brain) imports nothing from engine packages.

---

## 3. Data Architecture

Full schema/ERD/RLS in **Phase 2**. Architectural stance here:

- **Single Postgres, relational-first.** The Brain is *structured* (typed layers + confidence), not a vector dump. Embeddings live alongside in `pgvector` for semantic recall only.
- **Three data classes:**
  1. **Source data** (immutable, append-only): `raw_sources`, extraction payloads — keep provenance forever; never mutate.
  2. **Derived knowledge** (versioned, mutable with history): `brain_facts` and layer tables — every change is versioned with confidence + provenance.
  3. **Operational** (workflow state): opportunities, content, publications, schedules, metrics.
- **Provenance everywhere.** Every Brain fact links to the source(s) and the job that produced it. This is what enables confidence scoring and the "how does it know that?" experience.
- **Tenant isolation by `founder_id`** on every row, enforced by RLS. (Account ≈ founder in v1; schema leaves room for future multi-seat.)
- **Soft-delete + audit** on anything publish-related (legal/brand traceability for autopilot).

---

## 4. Event Architecture

Events are the spine connecting engines. We use a **lightweight internal event model**: an `events` table (append-only outbox) + Trigger.dev task triggers. We deliberately avoid a standalone broker (Kafka/SQS) — unearned complexity for a solo MVP.

### 4.1 Event flow (canonical loop)
```
account.connected ─────────────► brain.bootstrap.requested
brain.bootstrap.completed ─────► onboarding.summary.ready
opportunity.discovered ────────► opportunity.scored ──► opportunity.matched
opportunity.accepted ──────────► content.generation.requested
content.generated ─────────────► guardrail.review.requested
guardrail.passed ──────────────► publish.scheduled
guardrail.failed ──────────────► founder.review.requested
publish.completed ─────────────► metrics.collection.scheduled
metrics.collected ─────────────► learning.signal.created ──► brain.update.requested
reflection.submitted ──────────► brain.update.requested
brain.updated ─────────────────► (re-score open opportunities)
```

### 4.2 Mechanics
- **Producers** insert into `events` (outbox pattern) inside the same DB transaction as the state change → no lost events.
- **Dispatcher** (Trigger.dev scheduled + Supabase trigger/webhook) reads unprocessed events and invokes the relevant task.
- **Idempotency**: every event has a UUID; consumers record processed event IDs (`event_consumers`) → at-least-once delivery is safe.
- **Ordering**: per-founder causal ordering is sufficient; we do not need global ordering.

### 4.3 Why outbox over direct calls
Durability + replay + audit. If the Learning Engine is down, signals queue and process on recovery; nothing is lost. Critical for an "operator" that must not silently drop work.

---

## 5. Queue Architecture (Trigger.dev)

Trigger.dev provides durable queues, concurrency control, retries, and schedules. We model work as **task groups** with explicit concurrency keys.

| Queue / Task group | Trigger | Concurrency | Retry | Notes |
|---|---|---|---|---|
| `brain.bootstrap` | event / onboarding | key=`founder_id`, limit 1 | 3, expo backoff | heavy; fan-out to source extractors |
| `ingest.website` | event | global pool, key=`founder_id` | 3 | Firecrawl |
| `ingest.social` | extension upload | key=`founder_id` | 3 | normalise capture payloads |
| `opportunity.discover` | **schedule** (per founder cadence) | global pool, capped | 2 | Exa/X; tier-aware rate limiting |
| `opportunity.score` | event | batch | 3 | LLM classify + match vs Brain |
| `content.generate` | event | key=`founder_id`, limit 2 | 2 | frontier model; expensive |
| `guardrail.review` | event | key=`founder_id` | 2 | policy + safety gate |
| `publish.execute` | schedule/approval | **key=`connection_id`, limit 1** | 5 w/ backoff | respect platform rate limits; idempotent |
| `metrics.collect` | schedule (post-publish T+1h,+24h,+7d) | global | 5 | platform metrics |
| `learning.aggregate` | schedule (weekly) + event | key=`founder_id` | 3 | updates Brain confidence |
| `reflection.prompt` | schedule (weekly) | global | 2 | Resend send |

**Key design points**
- **Per-`connection_id` serial publishing** prevents two jobs posting concurrently to the same account → no duplicate posts, respects rate limits.
- **Tier-aware throttling** for discovery: a config maps X/LinkedIn API plan → max calls/window; the scheduler reads it (handles R2).
- **Cost ceilings**: each LLM task checks a per-founder monthly token budget before running (handles R6); over-budget → queued for next cycle + notify.
- **Dead-letter**: exhausted retries write to `failed_jobs` + Sentry + (if founder-impacting) a notification.

---

## 6. Agent Architecture

"Agents" = LLM-driven workers orchestrated by Trigger.dev tasks. They are **bounded and tool-using**, not free-roaming. Each agent has: a typed input, a system prompt assembled from the Brain, an allowlisted tool set, structured output (JSON schema validated), and a cost cap.

### 6.1 Agent roster
| Agent | Job | Model class (via OpenRouter) | Tools |
|---|---|---|---|
| **Brain Extractor** | Source text → candidate facts per layer + confidence | mid | none (pure transform) |
| **Brain Reconciler** | Merge candidates with existing Brain; resolve conflicts; set confidence | mid | DB read |
| **Opportunity Classifier** | Raw signal → typed opportunity + relevance score | small/cheap | none |
| **Opportunity Matcher** | Score opportunity vs Brain (expertise/goal fit) | mid | Brain retrieval |
| **Content Strategist** | Opportunity + Brain → angle, format, platform | mid | Brain retrieval |
| **Content Writer** | Strategy + voice profile → draft(s) | frontier | Brain retrieval |
| **Guardrail Reviewer** | Draft → policy/safety/brand-fit verdict + reasons | mid | policy rules |
| **Reflection Distiller** | Weekly input → structured Brain updates | mid | DB read |

### 6.2 Guardrail Pipeline (the safety spine for autopilot — R3)
Every piece of content, **regardless of publishing mode**, passes through:
```
draft ─► [1 Schema/format valid?] ─► [2 Policy filter: prohibited topics, claims, PII, legal] 
      ─► [3 Brand-fit: matches Brain positioning/voice, confidence ≥ τ]
      ─► [4 Factuality check: no unverifiable specific claims w/o source]
      ─► [5 Confidence gate]
                ├─ score ≥ AUTOPILOT_THRESHOLD  → eligible for full autopilot
                ├─ APPROVE_THRESHOLD ≤ score < AUTOPILOT → require founder approval
                └─ score < APPROVE_THRESHOLD     → discard + log, do not surface
```
- Thresholds are **per-founder, per-mode** config. Autopilot uses a *higher* bar than assisted.
- **Kill-switch**: a single `founder.autopilot_enabled=false` (and a global `system.publishing_paused`) halts all publishing instantly; honoured by `publish.execute` at run time, not just enqueue time.
- **Immutable audit**: every guardrail verdict + the exact content + model + version is written to `guardrail_reviews` and `publications.audit`. Required for autopilot accountability.
- **Rate caps**: max N autopilot posts/founder/day; bursts require approval.

### 6.3 Prompt assembly & retrieval
Prompts are **composed from the Brain**, never static templates (per `non-goals.md`). The Retrieval Model (Phase 3) selects the relevant layers (voice, positioning, relevant stories/beliefs) and injects them with confidence annotations so the model knows what is solid vs. tentative.

---

## 7. Browser-Extension Architecture (Plasmo) — overview

Full detail in **Phase 6**. Architectural role: the extension is the **read channel** the official APIs can't provide (R1/R4).

- **Manifest V3**, Plasmo. Components: background service worker, content scripts (LinkedIn, X), popup, options.
- **Capture is explicit and own-session only**: it reads pages the founder is already viewing while logged into their own account, on an explicit action ("Import my profile", "Add to Brain"). No silent/continuous scraping, no third-party private data.
- **No secrets in the extension.** It authenticates to Influuc via a short-lived token minted by the web app (Supabase session → extension token exchange). It POSTs captured payloads to an authenticated ingestion endpoint.
- **Payloads are normalised server-side**, never trusted raw. Server validates schema and rate-limits per founder.
- **Trust posture**: transparent permissions, clear in-UI disclosure, local preview of what will be sent, opt-in per capture. (Phase 6 covers store compliance.)

---

## 8. OAuth Architecture

Two distinct OAuth surfaces:

### 8.1 App auth (founder ↔ Influuc)
Supabase Auth. Email magic-link + Google OAuth. Session = Supabase JWT; RLS reads `auth.uid()`.

### 8.2 Platform auth (Influuc ↔ X / LinkedIn) — for **publishing**
| Platform | Flow | Scopes (write path) | Token handling |
|---|---|---|---|
| **X** | OAuth 2.0 PKCE (user context) | `tweet.write`, `tweet.read`, `users.read`, `offline.access` | store access+refresh **encrypted in Supabase Vault**; refresh server-side |
| **LinkedIn** | OAuth 2.0 (3-legged) | `w_member_social` (post as member), `openid profile email` | access token (+refresh if approved); Vault-encrypted |

**Rules**
- All token exchange happens **server-side** (Next.js route handlers). The client never sees platform tokens.
- Tokens encrypted at rest (Vault / pgcrypto), decrypted only inside jobs at publish time.
- **State + PKCE** on every flow; `state` is a signed, short-TTL value bound to `founder_id` to prevent CSRF/mix-up.
- Per-connection revocation: founder can disconnect → tokens hard-deleted, pending publishes cancelled.
- **Re-consent handling**: on `401/invalid_token`, mark connection `needs_reauth`, pause its publishes, notify founder.
- LinkedIn read scopes are intentionally **not** requested (not granted for this use) — reading comes from the extension.

### 8.3 Extension auth
Web app mints a short-lived (e.g., 15 min, refreshable) Influuc-scoped token for the extension via an authenticated exchange; the extension never holds Supabase service keys or platform tokens.

---

## 9. Security Architecture (summary; expanded in Phase 7)

- **AuthN**: Supabase Auth, JWT. **AuthZ**: Postgres RLS keyed on `founder_id` is the *primary* boundary — even if an API route is buggy, the DB refuses cross-tenant reads. Service-role key used only in trusted server/job context, never shipped to client/extension.
- **Secrets**: per-environment env vars (Vercel/Trigger.dev) + Supabase Vault for platform/user tokens. **No secrets in repo or client bundles.** (The keys pasted in chat must be rotated — flagged separately.)
- **Data**: encryption at rest (Supabase) + Vault for tokens; TLS everywhere; PII minimisation; provenance/audit tables immutable.
- **Extension**: least-privilege host permissions, own-session capture only, server-side validation of all payloads, signed extension token.
- **API**: input validation (zod) on every boundary; webhook signature verification (Stripe, Trigger.dev, platform callbacks); per-founder + per-IP rate limiting; idempotency keys on publish.
- **Abuse/autopilot**: guardrail pipeline, rate caps, kill-switch, content audit log, anomaly alerts (e.g., spike in posts) to Sentry.
- **Compliance hooks**: data export + delete (GDPR-ready), token revocation on disconnect, retention policy on raw sources.

---

## 10. What we deliberately are NOT building (architectural restraint)
Per `non-goals.md`: no template engine, no inspiration feed, no social inbox, no team/RBAC system (single-founder tenancy only), no in-app content-library browsing surface. The architecture stays small so the Brain and the operator loop get the investment.

---

*Next: Phase 2 — Database Design (ERD, schema, RLS, indexing, scalability).*
