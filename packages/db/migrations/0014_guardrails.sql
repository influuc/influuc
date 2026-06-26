-- Migration 0014: pre-publish guardrails on weekly_posts
-- Safety / prohibited-topic / brand-fit check runs before a post goes out.
-- A failed post is set to 'blocked' and never published.

-- 1. Allow 'blocked' status
alter table weekly_posts drop constraint if exists weekly_posts_status_check;
alter table weekly_posts add constraint weekly_posts_status_check
  check (status in ('draft', 'approved', 'rejected', 'published', 'scheduled', 'blocked'));

-- 2. Guardrail result columns (audit trail on the post itself)
alter table weekly_posts
  add column if not exists guardrail_verdict   text,
  add column if not exists guardrail_reasons   text,
  add column if not exists guardrail_brand_fit numeric(4,3),
  add column if not exists guardrail_checked_at timestamptz;

comment on column weekly_posts.guardrail_verdict is
  'Last pre-publish guardrail result: pass | fail | null (unchecked). fail => status blocked.';
