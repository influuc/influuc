-- Migration 0013: publishing kill-switch
-- Global per-founder pause that halts ALL publishing (autopilot + scheduled) instantly.

alter table operating_preferences
  add column if not exists publishing_paused boolean not null default false;

comment on column operating_preferences.publishing_paused is
  'Kill-switch: when true, post.scheduler and post.publish skip this founder entirely. No posts go out until resumed.';
