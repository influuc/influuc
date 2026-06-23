-- Influuc — migration 0010: weekly reflection
-- Founders must complete a reflection before each new week's content is generated

alter table founders
  add column if not exists reflection_pending boolean not null default false;

create table if not exists weekly_reflections (
  id           uuid primary key default gen_random_uuid(),
  founder_id   uuid not null references founders(id) on delete cascade,
  week_start   date not null,
  responses    jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  unique (founder_id, week_start)
);

create index if not exists weekly_reflections_founder_idx
  on weekly_reflections(founder_id, week_start desc);
