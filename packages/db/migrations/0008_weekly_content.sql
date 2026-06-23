-- weekly_strategies: the LLM-generated weekly content plan (Call 1 output)
create table weekly_strategies (
  id          uuid        primary key default gen_random_uuid(),
  founder_id  uuid        not null references founders(id) on delete cascade,
  week_start  date        not null,
  strategy    jsonb       not null default '{}',
  created_at  timestamptz not null default now(),
  constraint weekly_strategies_founder_week unique (founder_id, week_start)
);

alter table weekly_strategies enable row level security;
create policy "founders_read_own_strategies"
  on weekly_strategies for select
  using (founder_id = auth.uid());

-- weekly_posts: individual posts generated from the strategy (Call 2 output)
-- platform:   'x' | 'linkedin'
-- post_type:  'x_short' | 'x_long' | 'linkedin'
-- status:     'draft' | 'approved' | 'rejected' | 'published' | 'scheduled'
create table weekly_posts (
  id             uuid        primary key default gen_random_uuid(),
  founder_id     uuid        not null references founders(id) on delete cascade,
  strategy_id    uuid        not null references weekly_strategies(id) on delete cascade,
  week_start     date        not null,
  platform       text        not null check (platform in ('x', 'linkedin')),
  scheduled_date date        not null,
  post_type      text        not null check (post_type in ('x_short', 'x_long', 'linkedin')),
  sort_order     int         not null default 0,
  content        text        not null,
  status         text        not null default 'draft'
                             check (status in ('draft', 'approved', 'rejected', 'published', 'scheduled')),
  published_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table weekly_posts enable row level security;
create policy "founders_read_own_posts"
  on weekly_posts for select
  using (founder_id = auth.uid());
create policy "founders_update_own_posts"
  on weekly_posts for update
  using (founder_id = auth.uid());
