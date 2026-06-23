-- Migration 0007: Add content strategy preference columns
-- These fields drive the weekly content engine (strategy + post generation).

alter table operating_preferences
  add column if not exists focus_topics   text[]  not null default '{}',
  add column if not exists content_goals  text[]  not null default '{}',
  add column if not exists tone           text,
  add column if not exists extra_notes    text;
