-- Influuc — migration 0009: publishing support
-- Adds next_generation_at (rolling 7-day content refresh) to founders
-- Adds scheduled status to weekly_posts (intermediate state to prevent double-publish)

alter table founders
  add column if not exists next_generation_at timestamptz;

-- Index so the weekly cron query is fast
create index if not exists founders_next_generation_at_idx
  on founders(next_generation_at)
  where onboarding_state = 'done';
