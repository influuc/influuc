# Influuc — Phase 2: Database Design

> Platform: **Supabase Postgres** + `pgvector`. Authorization: **RLS on every table**, keyed on `founder_id`.
> Principle: relational-first. The Founder Brain is *structured knowledge with provenance and confidence* — not a vector dump (per `founder-brain.md`).

---

## 1. ERD (logical)

```
auth.users (Supabase)
    │ 1:1
    ▼
accounts ───1:1─── subscriptions
    │
    │ 1:1 (v1: account == founder)
    ▼
founders ──────────────────────────────────────────────┐
    │ 1:N            │ 1:N           │ 1:N               │ 1:N
    ▼                ▼               ▼                   ▼
platform_           raw_sources    brain_layers      operating_
connections             │          (1 row/layer)     preferences
    │                   │ 1:N           │ 1:N
    │                   ▼               ▼
    │              extraction_     brain_facts ──N:1── brain_fact_versions
    │               jobs                │  │
    │                                   │  └──1:N── fact_provenance ──N:1── raw_sources
    │                                   │ embedding (pgvector)
    │                                   │
    │                          (Brain powers ↓ everything)
    │
    ├──1:N── opportunities ──1:N── opportunity_matches (→ brain_facts)
    │             │ 1:N
    │             ▼
    │        content_items ──1:N── content_variants
    │             │ 1:1
    │             ▼
    │        guardrail_reviews
    │             │ 1:N
    │             ▼
    │        publications ──N:1── platform_connections
    │             │ 1:N
    │             ▼
    │        publication_metrics (T+1h / +24h / +7d)
    │
    ├──1:N── schedules
    ├──1:N── reflections ──1:N──► brain_facts (via update jobs)
    ├──1:N── learning_signals ──► brain confidence updates
    ├──1:N── notifications
    └──1:N── metrics_daily (authority/audience/opportunity rollups)

cross-cutting: events (outbox) · event_consumers · failed_jobs · audit_log · feature_flags
```

---

## 2. Schema (DDL)

Conventions: `id uuid default gen_random_uuid() primary key`; `created_at timestamptz default now()`; `updated_at` via trigger; every tenant table has `founder_id uuid not null references founders(id) on delete cascade`. Enums via Postgres `create type`.

### 2.1 Identity & billing
```sql
create table accounts (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid not null unique references auth.users(id) on delete cascade,
  email         citext not null unique,
  status        text not null default 'active',      -- active|suspended|deleted
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table founders (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references accounts(id) on delete cascade,
  display_name  text,
  headline      text,
  primary_locale text default 'en',
  timezone      text default 'UTC',
  onboarding_state text not null default 'landing',  -- landing|connect|extension|capture|analysis|summary|paywall|trial|preferences|done (connect-first flow: OAuth → extension scrapes connected profiles, Phase 5 §1)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index on founders(account_id);

create type sub_status as enum ('trialing','active','past_due','canceled','incomplete');
create table subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  founder_id            uuid not null references founders(id) on delete cascade,
  stripe_customer_id    text,
  stripe_subscription_id text,
  plan                  text,                          -- free_trial|operator|...
  status                sub_status not null default 'trialing',
  current_period_end    timestamptz,
  monthly_token_budget  bigint default 2000000,        -- cost ceiling (R6)
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create unique index on subscriptions(founder_id);
```

### 2.2 Platform connections (OAuth for publishing)
```sql
create type platform as enum ('x','linkedin');
create type connection_status as enum ('active','needs_reauth','revoked','error');
create table platform_connections (
  id              uuid primary key default gen_random_uuid(),
  founder_id      uuid not null references founders(id) on delete cascade,
  platform        platform not null,
  platform_user_id text,
  handle          text,
  status          connection_status not null default 'active',
  scopes          text[] not null default '{}',
  -- tokens stored ENCRYPTED via Vault; these hold opaque vault references, not plaintext
  access_token_ref  text,
  refresh_token_ref text,
  token_expires_at  timestamptz,
  last_publish_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (founder_id, platform)
);
```

### 2.3 Founder Brain (core moat)
```sql
-- The fixed set of layers from founder-brain.md
create type brain_layer_type as enum
  ('identity','expertise','offer','audience','positioning','belief','story','writing_style','goal');

create table brain_layers (
  id          uuid primary key default gen_random_uuid(),
  founder_id  uuid not null references founders(id) on delete cascade,
  layer       brain_layer_type not null,
  summary     text,                       -- rolled-up natural-language view of the layer
  confidence  numeric(4,3) not null default 0.0,  -- 0..1 aggregate layer confidence
  updated_at  timestamptz not null default now(),
  unique (founder_id, layer)
);

-- Atomic units of understanding. This is the heart of the Brain.
create type fact_status as enum ('candidate','active','superseded','rejected');
create table brain_facts (
  id            uuid primary key default gen_random_uuid(),
  founder_id    uuid not null references founders(id) on delete cascade,
  layer         brain_layer_type not null,
  key           text,                      -- optional canonical slug, e.g. 'offer.primary'
  content       text not null,             -- the assertion, in natural language
  structured    jsonb,                     -- optional typed payload (e.g. {service,price,icp})
  confidence    numeric(4,3) not null default 0.5,
  status        fact_status not null default 'candidate',
  source_kind   text,                      -- website|linkedin|x|reflection|correction|inferred
  salience      numeric(4,3) default 0.5,  -- how central to the founder (for retrieval ranking)
  embedding     vector(1536),              -- semantic recall (model-dependent dim)
  valid_from    timestamptz not null default now(),
  valid_to      timestamptz,               -- non-null when superseded (temporal validity)
  created_by_job text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Full version history (the Brain must show evolution, never lose prior states)
create table brain_fact_versions (
  id          uuid primary key default gen_random_uuid(),
  fact_id     uuid not null references brain_facts(id) on delete cascade,
  founder_id  uuid not null references founders(id) on delete cascade,
  content     text not null,
  structured  jsonb,
  confidence  numeric(4,3) not null,
  status      fact_status not null,
  change_reason text,                       -- correction|reinforcement|decay|reconciliation
  changed_by_job text,
  created_at  timestamptz not null default now()
);

-- Provenance: which sources support a fact (drives confidence + "how does it know?")
create table fact_provenance (
  id           uuid primary key default gen_random_uuid(),
  fact_id      uuid not null references brain_facts(id) on delete cascade,
  founder_id   uuid not null references founders(id) on delete cascade,
  raw_source_id uuid references raw_sources(id) on delete set null,
  evidence     text,                        -- the quoted/extracted snippet
  weight       numeric(4,3) default 0.5,    -- contribution to confidence
  created_at   timestamptz not null default now()
);
```

### 2.4 Ingestion / sources (immutable provenance)
```sql
create type source_kind as enum ('website','linkedin','x','reflection','correction','content_performance','manual');
create table raw_sources (
  id          uuid primary key default gen_random_uuid(),
  founder_id  uuid not null references founders(id) on delete cascade,
  kind        source_kind not null,
  url         text,
  captured_by text,                          -- 'firecrawl'|'extension'|'api'|'founder'
  raw         jsonb not null,                -- normalised captured payload
  content_hash text,                         -- dedupe
  created_at  timestamptz not null default now(),
  unique (founder_id, content_hash)
);

create type job_status as enum ('queued','running','succeeded','failed','dead');
create table extraction_jobs (
  id           uuid primary key default gen_random_uuid(),
  founder_id   uuid not null references founders(id) on delete cascade,
  raw_source_id uuid references raw_sources(id) on delete cascade,
  status       job_status not null default 'queued',
  attempts     int not null default 0,
  error        text,
  trigger_run_id text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
```

### 2.5 Opportunity Engine
```sql
create type opp_type as enum
  ('industry_trend','market_shift','breaking_news','emerging_conversation',
   'podcast','partnership','collaboration','thought_leadership');
create type opp_status as enum ('discovered','scored','matched','surfaced','accepted','dismissed','expired');
create table opportunities (
  id            uuid primary key default gen_random_uuid(),
  founder_id    uuid not null references founders(id) on delete cascade,
  type          opp_type not null,
  title         text not null,
  summary       text,
  source_url    text,
  discovered_via text,                       -- exa|x|firecrawl|rss
  signal_at     timestamptz,                 -- when the world event happened
  expires_at    timestamptz,                 -- timing window (vision: be early)
  relevance_score numeric(4,3),              -- vs founder expertise/goals
  urgency_score   numeric(4,3),
  priority_score  numeric(4,3),              -- composite ranking
  status        opp_status not null default 'discovered',
  dedupe_hash   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (founder_id, dedupe_hash)
);

create table opportunity_matches (
  id            uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  founder_id    uuid not null references founders(id) on delete cascade,
  brain_fact_id uuid references brain_facts(id) on delete set null,
  match_reason  text,
  match_score   numeric(4,3),
  created_at    timestamptz not null default now()
);
```

### 2.6 Content Engine + Guardrail
```sql
create type content_status as enum
  ('draft','guardrail_pending','guardrail_failed','awaiting_approval','approved','scheduled','published','rejected','archived');
create type target_platform as enum ('x','linkedin');
create table content_items (
  id            uuid primary key default gen_random_uuid(),
  founder_id    uuid not null references founders(id) on delete cascade,
  opportunity_id uuid references opportunities(id) on delete set null,
  platform      target_platform not null,
  angle         text,                        -- strategist output
  status        content_status not null default 'draft',
  generated_by_model text,
  brain_snapshot jsonb,                       -- which facts/voice were used (audit/repro)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table content_variants (
  id            uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id) on delete cascade,
  founder_id    uuid not null references founders(id) on delete cascade,
  body          text not null,
  rank          int default 0,
  chosen        boolean default false,
  created_at    timestamptz not null default now()
);

create type guardrail_verdict as enum ('pass_autopilot','pass_approval','fail');
create table guardrail_reviews (
  id            uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id) on delete cascade,
  founder_id    uuid not null references founders(id) on delete cascade,
  verdict       guardrail_verdict not null,
  policy_flags  jsonb,                        -- {prohibited:[], pii:bool, unverified_claims:[]}
  brand_fit_score numeric(4,3),
  confidence    numeric(4,3),
  reasons       text,
  model         text,
  reviewed_at   timestamptz not null default now()
);
```

### 2.7 Publishing
```sql
create type pub_status as enum ('scheduled','publishing','published','failed','canceled');
create table publications (
  id            uuid primary key default gen_random_uuid(),
  founder_id    uuid not null references founders(id) on delete cascade,
  content_item_id uuid not null references content_items(id) on delete cascade,
  connection_id uuid not null references platform_connections(id) on delete restrict,
  platform      target_platform not null,
  mode          text not null,               -- manual|assisted|autopilot
  status        pub_status not null default 'scheduled',
  scheduled_for timestamptz,
  published_at  timestamptz,
  platform_post_id text,
  permalink     text,
  idempotency_key text not null,
  audit         jsonb,                        -- immutable: content, guardrail verdict, model, actor
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (idempotency_key)
);

create table schedules (
  id            uuid primary key default gen_random_uuid(),
  founder_id    uuid not null references founders(id) on delete cascade,
  platform      target_platform not null,
  cadence       jsonb,                        -- preferred days/times/limits
  active        boolean default true,
  created_at    timestamptz not null default now()
);

create table publication_metrics (
  id            uuid primary key default gen_random_uuid(),
  publication_id uuid not null references publications(id) on delete cascade,
  founder_id    uuid not null references founders(id) on delete cascade,
  collected_at  timestamptz not null default now(),
  window        text not null,                -- 'h1'|'h24'|'d7'
  impressions   bigint, likes bigint, comments bigint, reposts bigint, clicks bigint,
  followers_delta int,
  raw           jsonb
);
```

### 2.8 Learning & Reflection
```sql
create type signal_kind as enum ('edit','performance','acceptance','dismissal','engagement','reflection');
create table learning_signals (
  id            uuid primary key default gen_random_uuid(),
  founder_id    uuid not null references founders(id) on delete cascade,
  kind          signal_kind not null,
  ref_table     text, ref_id uuid,            -- polymorphic source of the signal
  payload       jsonb,
  processed     boolean default false,
  created_at    timestamptz not null default now()
);

create table reflections (
  id            uuid primary key default gen_random_uuid(),
  founder_id    uuid not null references founders(id) on delete cascade,
  week_of       date not null,
  prompt        text,
  response      text,                          -- founder's input (voice or text)
  distilled     boolean default false,
  created_at    timestamptz not null default now(),
  unique (founder_id, week_of)
);
```

### 2.9 Operating preferences, notifications, analytics
```sql
create type autonomy_mode as enum ('manual','assisted','autopilot');
create table operating_preferences (
  founder_id        uuid primary key references founders(id) on delete cascade,
  mode              autonomy_mode not null default 'assisted',
  autopilot_enabled boolean not null default false,    -- kill-switch
  autopilot_threshold numeric(4,3) default 0.85,
  approval_threshold  numeric(4,3) default 0.6,
  max_autopilot_per_day int default 2,
  prohibited_topics text[] default '{}',
  preferred_platforms target_platform[] default '{x,linkedin}',
  updated_at        timestamptz not null default now()
);

create table notifications (
  id          uuid primary key default gen_random_uuid(),
  founder_id  uuid not null references founders(id) on delete cascade,
  kind        text not null, channel text default 'email',
  payload     jsonb, sent_at timestamptz, read_at timestamptz,
  created_at  timestamptz not null default now()
);

create table metrics_daily (         -- outcome rollups (authority/audience/opportunity)
  id          uuid primary key default gen_random_uuid(),
  founder_id  uuid not null references founders(id) on delete cascade,
  day         date not null,
  authority_index numeric,           -- composite (followers, engagement quality, mentions)
  audience_total  bigint,
  opportunities_surfaced int, opportunities_accepted int,
  posts_published int, founder_minutes_spent numeric,
  unique (founder_id, day)
);
```

### 2.10 Cross-cutting infra
```sql
create table events (                -- transactional outbox
  id          uuid primary key default gen_random_uuid(),
  founder_id  uuid references founders(id) on delete cascade,
  type        text not null,
  payload     jsonb,
  processed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index on events (processed_at) where processed_at is null;

create table event_consumers (        -- idempotent consumption
  event_id    uuid not null references events(id) on delete cascade,
  consumer    text not null,
  processed_at timestamptz not null default now(),
  primary key (event_id, consumer)
);

create table failed_jobs (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid, task text, payload jsonb, error text,
  trigger_run_id text, created_at timestamptz default now()
);

create table audit_log (              -- security/compliance trail (append-only)
  id uuid primary key default gen_random_uuid(),
  founder_id uuid, actor text, action text, target_table text, target_id uuid,
  meta jsonb, created_at timestamptz default now()
);

create table feature_flags (
  key text primary key, enabled boolean default false, rules jsonb,
  updated_at timestamptz default now()
);
```

---

## 3. Relationships summary
- `accounts 1:1 founders 1:1 subscriptions 1:1 operating_preferences`
- `founders 1:N platform_connections / raw_sources / brain_facts / opportunities / content_items / publications / reflections`
- `brain_facts 1:N brain_fact_versions`, `brain_facts 1:N fact_provenance N:1 raw_sources`
- `opportunities 1:N content_items 1:N content_variants`; `content_items 1:1 guardrail_reviews 1:N publications 1:N publication_metrics`
- `events`/`event_consumers` decouple all engines (outbox).

---

## 4. Indexing strategy

| Table | Index | Why |
|---|---|---|
| every tenant table | `(founder_id)` btree | RLS + tenant scans |
| `brain_facts` | `(founder_id, layer, status)` | layer retrieval of active facts |
| `brain_facts` | `ivfflat (embedding vector_cosine_ops)` (or HNSW) | semantic recall |
| `brain_facts` | `(founder_id, salience desc)` partial `where status='active'` | retrieval ranking |
| `opportunities` | `(founder_id, status, priority_score desc)` | "top opportunities" feed |
| `opportunities` | `(expires_at)` partial `where status in ('discovered','scored','matched')` | expiry sweeps |
| `events` | partial `(processed_at) where processed_at is null` | dispatcher hot path |
| `publications` | `(connection_id, status)` + unique `(idempotency_key)` | serial publish + dedupe |
| `publication_metrics` | `(founder_id, collected_at)` | analytics rollups |
| `raw_sources` | unique `(founder_id, content_hash)` | dedupe ingestion |
| `learning_signals` | partial `(created_at) where processed=false` | batch learning |

Vector index choice: start **HNSW** (better recall/latency, pgvector ≥0.5) if dataset small per tenant; `ivfflat` if memory-constrained. Per-founder fact counts are small (hundreds–thousands), so vector search is cheap.

---

## 5. RLS strategy

**Default deny.** `alter table <t> enable row level security;` on every table; no policy = no access.

```sql
-- Helper: map auth.uid() -> founder_id (security definer, stable)
create or replace function current_founder_id() returns uuid
language sql stable security definer set search_path = public as $$
  select f.id from founders f
  join accounts a on a.id = f.account_id
  where a.auth_user_id = auth.uid()
$$;

-- Pattern applied to every tenant table:
create policy tenant_select on brain_facts for select
  using (founder_id = current_founder_id());
create policy tenant_modify on brain_facts for all
  using (founder_id = current_founder_id())
  with check (founder_id = current_founder_id());
```

Rules:
- **Client/anon role**: read/write only own-`founder_id` rows; *no* access to `events`, `failed_jobs`, `audit_log`, `feature_flags`, token refs.
- **Sensitive columns**: `platform_connections.access_token_ref/refresh_token_ref` never selectable by the client role (column-level grant revoked; or split into a `connection_secrets` table with no client policy). Tokens decrypted only in jobs via service role.
- **service_role** (jobs/server): bypasses RLS by design; used only in trusted Trigger.dev/server context, never exposed to browser/extension.
- **Append-only tables** (`brain_fact_versions`, `fact_provenance`, `audit_log`, `publications.audit`): `for insert` + `for select` policies only; no update/delete policy → effectively immutable to clients.
- **Storage**: Supabase Storage buckets per-founder path prefix + RLS policies.

---

## 6. Future scalability considerations
- **Tenancy growth**: account↔founder is 1:1 now but modelled as separate tables so a future "agency/multi-seat" can add `account 1:N founders` + a membership/role table without migration of founder-scoped data.
- **Hot tables**: `publication_metrics`, `events`, `learning_signals` are append-heavy → partition by month (`pg_partman`) when volume warrants; `events` can move to a real broker only if throughput demands (outbox interface stays the same).
- **Vector growth**: per-tenant fact counts stay small; if global ANN ever needed, move embeddings to a dedicated index/table. pgvector scales to this comfortably at MVP/early scale.
- **Read scaling**: Supabase read replicas + caching of Brain layer summaries (they change slowly). Brain `summary` columns are denormalised rollups precisely to avoid recomputing on every prompt assembly.
- **Cost governance**: `subscriptions.monthly_token_budget` + per-job accounting table (`ai_usage`, add when needed) enables hard ceilings and per-founder unit-economics reporting.
- **Data lifecycle**: retention policy on `raw_sources` (keep provenance snippet in `fact_provenance`, prune bulky `raw` after N days); GDPR delete = cascade from `accounts`.

---

*Next: Phase 3 — Founder Brain Design.*
