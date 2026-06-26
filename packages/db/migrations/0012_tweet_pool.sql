-- Influuc — migration 0012: shared daily tweet pool
-- Harvested once per day, assigned per-founder without extra API calls

create table if not exists daily_tweet_pool (
  id              uuid    primary key default gen_random_uuid(),
  tweet_id        text    not null,
  author_username text    not null,
  content         text    not null,
  like_count      int     not null default 0,
  retweet_count   int     not null default 0,
  reply_count     int     not null default 0,
  topic_bucket    text    not null, -- personal_branding | ai | business | saas_agency | youtube
  harvested_date  date    not null default current_date,
  created_at      timestamptz not null default now(),
  unique (tweet_id, harvested_date)
);

create index if not exists daily_tweet_pool_date_bucket_idx
  on daily_tweet_pool(harvested_date, topic_bucket);

-- One claim per tweet per day across all founders (prevents duplicates)
create table if not exists tweet_claims (
  tweet_id     text not null,
  founder_id   uuid not null references founders(id) on delete cascade,
  claimed_date date not null default current_date,
  primary key (tweet_id, claimed_date)
);
