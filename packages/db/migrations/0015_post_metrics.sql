-- Migration 0015: engagement metrics for published posts (SCRUM-35)

-- 1. Persist the platform's own post id so we can fetch metrics later
alter table weekly_posts
  add column if not exists platform_post_id text;

-- 2. Metric snapshots (one row per collection pass per post)
create table if not exists post_metrics (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references weekly_posts(id) on delete cascade,
  founder_id    uuid not null references founders(id) on delete cascade,
  platform      text not null,
  likes         int  not null default 0,
  reposts       int  not null default 0,
  replies       int  not null default 0,
  quotes        int  not null default 0,
  impressions   bigint,
  engagement    int  not null default 0,   -- likes + reposts + replies + quotes (sortable rollup)
  collected_at  timestamptz not null default now()
);

create index if not exists post_metrics_post_idx on post_metrics(post_id, collected_at desc);
create index if not exists post_metrics_founder_idx on post_metrics(founder_id, collected_at desc);
