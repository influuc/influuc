-- Influuc — migration 0011: quote tweet support
-- Adds source tweet fields to weekly_posts and x_quote_tweet post type

-- Extend post_type check to include x_quote_tweet
alter table weekly_posts drop constraint if exists weekly_posts_post_type_check;
alter table weekly_posts add constraint weekly_posts_post_type_check
  check (post_type in ('x_short', 'x_long', 'linkedin', 'x_quote_tweet'));

-- Source tweet metadata (null for regular posts)
alter table weekly_posts
  add column if not exists source_tweet_id      text,
  add column if not exists source_tweet_content text,
  add column if not exists source_tweet_author  text;
