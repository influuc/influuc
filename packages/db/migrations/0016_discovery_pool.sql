-- Migration 0016: shared niche-level discovery pool (cost: scrape once per niche, share to all)

create table if not exists discovery_pool (
  id             uuid primary key default gen_random_uuid(),
  cluster        text not null,
  title          text not null,
  summary        text,
  source_url     text not null,
  source_kind    text not null,            -- 'exa' | 'rss'
  published_at   timestamptz,
  harvested_date date not null default current_date,
  dedupe_hash    text not null,
  created_at     timestamptz not null default now(),
  unique (cluster, dedupe_hash)
);

create index if not exists discovery_pool_cluster_date_idx
  on discovery_pool(cluster, harvested_date desc);
