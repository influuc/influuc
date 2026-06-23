# Influuc

**AI Personal Brand Operator.** Transforms founder expertise into authority with **< 10 minutes/week** of founder effort. Humans supervise; AI operates. The **Founder Brain** is the core moat.

> Full design corpus lives in [`/docs`](./docs) (source of truth). Confluence mirror under the Product Management space. Delivery tracked in Jira project `SCRUM`.

## Stack
Next.js (Vercel) · Supabase (Postgres + pgvector + Auth + Storage + RLS + Vault) · Trigger.dev (jobs/agents) · OpenRouter (LLMs) · Exa + Firecrawl (research) · Plasmo (extension) · Stripe · Resend · PostHog · Sentry.

## Monorepo layout
```
apps/
  web/         Next.js — marketing, app, API routes, webhooks
  extension/   Plasmo — own-session LinkedIn/X capture   (added in a later increment)
packages/
  core/        domain types + Founder Brain logic
  db/          schema, migrations, generated types        (later)
  agents/      agent definitions + guardrail pipeline      (later)
  jobs/        Trigger.dev tasks                           (later)
  integrations/ OpenRouter, Exa, Firecrawl, X, LinkedIn… clients (later)
  ui/          shared components                           (later)
```

## Getting started
Requires Node 20+ and pnpm 9.

```bash
pnpm install
pnpm dev          # runs the web app at http://localhost:3000
```

Other scripts: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format`.

## Environment
Copy `.env.example` → `.env.local` and fill values. **Secrets are server-side only — never commit `.env.local`.** Production uses Vercel/Trigger.dev env + Supabase Vault.

## Build order
See [`docs/design/07-implementation-plan.md`](./docs/design/07-implementation-plan.md). Current: **M0 — Foundation**.
