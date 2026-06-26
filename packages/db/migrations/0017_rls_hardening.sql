-- Migration 0017: close RLS gaps flagged by the security advisor.
-- post_metrics + weekly_reflections were exposed with NO RLS (cross-tenant leak).
-- Shared pools (discovery_pool, daily_tweet_pool, tweet_claims) get deny-by-default
-- to clients (only service_role / server jobs touch them).
-- Vault helper functions were executable by `authenticated` — locked to service_role.

-- ── Per-founder tables: enable RLS + owner-only policies ──────────────────────
alter table post_metrics enable row level security;
drop policy if exists "founder_reads_own_metrics" on post_metrics;
create policy "founder_reads_own_metrics" on post_metrics
  for select using (founder_id = public.current_founder_id());

alter table weekly_reflections enable row level security;
drop policy if exists "founder_rw_own_reflections" on weekly_reflections;
create policy "founder_reads_own_reflections" on weekly_reflections
  for select using (founder_id = public.current_founder_id());
create policy "founder_writes_own_reflections" on weekly_reflections
  for insert with check (founder_id = public.current_founder_id());
create policy "founder_updates_own_reflections" on weekly_reflections
  for update using (founder_id = public.current_founder_id());

-- ── Shared / system pools: RLS on, no client policies (deny-all to clients;
--    service_role bypasses RLS so server jobs still work) ──────────────────────
alter table discovery_pool enable row level security;
alter table daily_tweet_pool enable row level security;
alter table tweet_claims enable row level security;

-- ── Lock vault helpers to service_role only (was callable by authenticated) ───
revoke execute on function public.vault_create_secret(text, text) from authenticated;
revoke execute on function public.vault_read_secret(uuid)        from authenticated;
revoke execute on function public.vault_update_secret(uuid, text) from authenticated;
revoke execute on function public.vault_delete_secret(uuid)      from authenticated;
