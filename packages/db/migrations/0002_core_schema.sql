-- Influuc — migration 0002: core schema (tables + indexes + updated_at triggers)
-- Source of truth: docs/database/02-database-design.md

-- ─── Identity & billing ─────────────────────────────────────────────────────
create table accounts (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email        citext not null unique,
  status       text not null default 'active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table founders (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid not null references accounts(id) on delete cascade,
  display_name     text,
  headline         text,
  primary_locale   text default 'en',
  timezone         text default 'UTC',
  onboarding_state text not null default 'landing',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index founders_account_id_key on founders(account_id);

create table subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  founder_id             uuid not null references founders(id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text,
  status                 sub_status not null default 'trialing',
  current_period_end     timestamptz,
  monthly_token_budget   bigint default 2000000,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create unique index subscriptions_founder_id_key on subscriptions(founder_id);

create table operating_preferences (
  founder_id          uuid primary key references founders(id) on delete cascade,
  mode                autonomy_mode not null default 'assisted',
  autopilot_enabled   boolean not null default false,
  autopilot_threshold numeric(4,3) default 0.85,
  approval_threshold  numeric(4,3) default 0.6,
  max_autopilot_per_day int default 2,
  prohibited_topics   text[] default '{}',
  preferred_platforms target_platform[] default '{x,linkedin}',
  updated_at          timestamptz not null default now()
);

-- ─── Platform connections ───────────────────────────────────────────────────
create table platform_connections (
  id                uuid primary key default gen_random_uuid(),
  founder_id        uuid not null references founders(id) on delete cascade,
  platform          platform not null,
  platform_user_id  text,
  handle            text,
  status            connection_status not null default 'active',
  scopes            text[] not null default '{}',
  access_token_ref  text,
  refresh_token_ref text,
  token_expires_at  timestamptz,
  last_publish_at   timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (founder_id, platform)
);

-- ─── Ingestion / sources ────────────────────────────────────────────────────
create table raw_sources (
  id           uuid primary key default gen_random_uuid(),
  founder_id   uuid not null references founders(id) on delete cascade,
  kind         source_kind not null,
  url          text,
  captured_by  text,
  raw          jsonb not null,
  content_hash text,
  created_at   timestamptz not null default now(),
  unique (founder_id, content_hash)
);

create table extraction_jobs (
  id             uuid primary key default gen_random_uuid(),
  founder_id     uuid not null references founders(id) on delete cascade,
  raw_source_id  uuid references raw_sources(id) on delete cascade,
  status         job_status not null default 'queued',
  attempts       int not null default 0,
  error          text,
  trigger_run_id text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ─── Founder Brain ──────────────────────────────────────────────────────────
create table brain_layers (
  id         uuid primary key default gen_random_uuid(),
  founder_id uuid not null references founders(id) on delete cascade,
  layer      brain_layer_type not null,
  summary    text,
  confidence numeric(4,3) not null default 0.0,
  updated_at timestamptz not null default now(),
  unique (founder_id, layer)
);

create table brain_facts (
  id             uuid primary key default gen_random_uuid(),
  founder_id     uuid not null references founders(id) on delete cascade,
  layer          brain_layer_type not null,
  key            text,
  content        text not null,
  structured     jsonb,
  confidence     numeric(4,3) not null default 0.5,
  status         fact_status not null default 'candidate',
  source_kind    text,
  salience       numeric(4,3) default 0.5,
  embedding      vector(1536),
  valid_from     timestamptz not null default now(),
  valid_to       timestamptz,
  created_by_job text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table brain_fact_versions (
  id             uuid primary key default gen_random_uuid(),
  fact_id        uuid not null references brain_facts(id) on delete cascade,
  founder_id     uuid not null references founders(id) on delete cascade,
  content        text not null,
  structured     jsonb,
  confidence     numeric(4,3) not null,
  status         fact_status not null,
  change_reason  text,
  changed_by_job text,
  created_at     timestamptz not null default now()
);

create table fact_provenance (
  id            uuid primary key default gen_random_uuid(),
  fact_id       uuid not null references brain_facts(id) on delete cascade,
  founder_id    uuid not null references founders(id) on delete cascade,
  raw_source_id uuid references raw_sources(id) on delete set null,
  evidence      text,
  weight        numeric(4,3) default 0.5,
  created_at    timestamptz not null default now()
);

-- ─── Opportunity Engine ─────────────────────────────────────────────────────
create table opportunities (
  id              uuid primary key default gen_random_uuid(),
  founder_id      uuid not null references founders(id) on delete cascade,
  type            opp_type not null,
  title           text not null,
  summary         text,
  source_url      text,
  discovered_via  text,
  signal_at       timestamptz,
  expires_at      timestamptz,
  relevance_score numeric(4,3),
  urgency_score   numeric(4,3),
  priority_score  numeric(4,3),
  status          opp_status not null default 'discovered',
  dedupe_hash     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (founder_id, dedupe_hash)
);

create table opportunity_matches (
  id             uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references opportunities(id) on delete cascade,
  founder_id     uuid not null references founders(id) on delete cascade,
  brain_fact_id  uuid references brain_facts(id) on delete set null,
  match_reason   text,
  match_score    numeric(4,3),
  created_at     timestamptz not null default now()
);

-- ─── Content + Guardrail ────────────────────────────────────────────────────
create table content_items (
  id                 uuid primary key default gen_random_uuid(),
  founder_id         uuid not null references founders(id) on delete cascade,
  opportunity_id     uuid references opportunities(id) on delete set null,
  platform           target_platform not null,
  angle              text,
  status             content_status not null default 'draft',
  generated_by_model text,
  brain_snapshot     jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table content_variants (
  id              uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id) on delete cascade,
  founder_id      uuid not null references founders(id) on delete cascade,
  body            text not null,
  rank            int default 0,
  chosen          boolean default false,
  created_at      timestamptz not null default now()
);

create table guardrail_reviews (
  id              uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references content_items(id) on delete cascade,
  founder_id      uuid not null references founders(id) on delete cascade,
  verdict         guardrail_verdict not null,
  policy_flags    jsonb,
  brand_fit_score numeric(4,3),
  confidence      numeric(4,3),
  reasons         text,
  model           text,
  reviewed_at     timestamptz not null default now()
);

-- ─── Publishing ─────────────────────────────────────────────────────────────
create table publications (
  id               uuid primary key default gen_random_uuid(),
  founder_id       uuid not null references founders(id) on delete cascade,
  content_item_id  uuid not null references content_items(id) on delete cascade,
  connection_id    uuid not null references platform_connections(id) on delete restrict,
  platform         target_platform not null,
  mode             text not null,
  status           pub_status not null default 'scheduled',
  scheduled_for    timestamptz,
  published_at     timestamptz,
  platform_post_id text,
  permalink        text,
  idempotency_key  text not null unique,
  audit            jsonb,
  error            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table schedules (
  id         uuid primary key default gen_random_uuid(),
  founder_id uuid not null references founders(id) on delete cascade,
  platform   target_platform not null,
  cadence    jsonb,
  active     boolean default true,
  created_at timestamptz not null default now()
);

create table publication_metrics (
  id              uuid primary key default gen_random_uuid(),
  publication_id  uuid not null references publications(id) on delete cascade,
  founder_id      uuid not null references founders(id) on delete cascade,
  collected_at    timestamptz not null default now(),
  window_label    text not null,  -- 'h1' | 'h24' | 'd7'  (window is a reserved word)
  impressions     bigint, likes bigint, comments bigint, reposts bigint, clicks bigint,
  followers_delta int,
  raw             jsonb
);

-- ─── Learning & Reflection ──────────────────────────────────────────────────
create table learning_signals (
  id         uuid primary key default gen_random_uuid(),
  founder_id uuid not null references founders(id) on delete cascade,
  kind       signal_kind not null,
  ref_table  text,
  ref_id     uuid,
  payload    jsonb,
  processed  boolean default false,
  created_at timestamptz not null default now()
);

create table reflections (
  id         uuid primary key default gen_random_uuid(),
  founder_id uuid not null references founders(id) on delete cascade,
  week_of    date not null,
  prompt     text,
  response   text,
  distilled  boolean default false,
  created_at timestamptz not null default now(),
  unique (founder_id, week_of)
);

-- ─── Preferences-adjacent ops ───────────────────────────────────────────────
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  founder_id uuid not null references founders(id) on delete cascade,
  kind       text not null,
  channel    text default 'email',
  payload    jsonb,
  sent_at    timestamptz,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create table metrics_daily (
  id                     uuid primary key default gen_random_uuid(),
  founder_id             uuid not null references founders(id) on delete cascade,
  day                    date not null,
  authority_index        numeric,
  audience_total         bigint,
  opportunities_surfaced int,
  opportunities_accepted int,
  posts_published        int,
  founder_minutes_spent  numeric,
  unique (founder_id, day)
);

-- ─── Cross-cutting infra ────────────────────────────────────────────────────
create table events (
  id           uuid primary key default gen_random_uuid(),
  founder_id   uuid references founders(id) on delete cascade,
  type         text not null,
  payload      jsonb,
  processed_at timestamptz,
  created_at   timestamptz not null default now()
);

create table event_consumers (
  event_id     uuid not null references events(id) on delete cascade,
  consumer     text not null,
  processed_at timestamptz not null default now(),
  primary key (event_id, consumer)
);

create table failed_jobs (
  id             uuid primary key default gen_random_uuid(),
  founder_id     uuid,
  task           text,
  payload        jsonb,
  error          text,
  trigger_run_id text,
  created_at     timestamptz not null default now()
);

create table audit_log (
  id           uuid primary key default gen_random_uuid(),
  founder_id   uuid,
  actor        text,
  action       text,
  target_table text,
  target_id    uuid,
  meta         jsonb,
  created_at   timestamptz not null default now()
);

create table feature_flags (
  key        text primary key,
  enabled    boolean default false,
  rules      jsonb,
  updated_at timestamptz not null default now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index brain_facts_founder_layer_status_idx on brain_facts(founder_id, layer, status);
create index brain_facts_salience_idx on brain_facts(founder_id, salience desc) where status = 'active';
create index brain_facts_embedding_idx on brain_facts using hnsw (embedding vector_cosine_ops);
create index brain_fact_versions_fact_idx on brain_fact_versions(fact_id);
create index fact_provenance_fact_idx on fact_provenance(fact_id);
create index opportunities_feed_idx on opportunities(founder_id, status, priority_score desc);
create index opportunities_expiry_idx on opportunities(expires_at) where status in ('discovered','scored','matched');
create index content_items_founder_idx on content_items(founder_id, status);
create index publications_connection_status_idx on publications(connection_id, status);
create index publication_metrics_founder_idx on publication_metrics(founder_id, collected_at);
create index events_unprocessed_idx on events(processed_at) where processed_at is null;
create index learning_signals_unprocessed_idx on learning_signals(created_at) where processed = false;

-- ─── updated_at triggers (moddatetime) ──────────────────────────────────────
create trigger t_accounts_updated before update on accounts for each row execute function extensions.moddatetime(updated_at);
create trigger t_founders_updated before update on founders for each row execute function extensions.moddatetime(updated_at);
create trigger t_subscriptions_updated before update on subscriptions for each row execute function extensions.moddatetime(updated_at);
create trigger t_operating_preferences_updated before update on operating_preferences for each row execute function extensions.moddatetime(updated_at);
create trigger t_platform_connections_updated before update on platform_connections for each row execute function extensions.moddatetime(updated_at);
create trigger t_extraction_jobs_updated before update on extraction_jobs for each row execute function extensions.moddatetime(updated_at);
create trigger t_brain_layers_updated before update on brain_layers for each row execute function extensions.moddatetime(updated_at);
create trigger t_brain_facts_updated before update on brain_facts for each row execute function extensions.moddatetime(updated_at);
create trigger t_opportunities_updated before update on opportunities for each row execute function extensions.moddatetime(updated_at);
create trigger t_content_items_updated before update on content_items for each row execute function extensions.moddatetime(updated_at);
create trigger t_publications_updated before update on publications for each row execute function extensions.moddatetime(updated_at);
create trigger t_feature_flags_updated before update on feature_flags for each row execute function extensions.moddatetime(updated_at);
