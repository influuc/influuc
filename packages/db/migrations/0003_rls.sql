-- Influuc — migration 0003: RLS (default-deny, tenant isolation by founder_id)
-- Source of truth: docs/database/02-database-design.md §5

-- Helper: map auth.uid() -> founder_id
create or replace function public.current_founder_id() returns uuid
language sql stable security definer set search_path = public as $$
  select f.id
  from public.founders f
  join public.accounts a on a.id = f.account_id
  where a.auth_user_id = auth.uid()
  limit 1
$$;

-- Standard tenant tables: owner full access, scoped by founder_id
do $$
declare t text;
  tenant_tables text[] := array[
    'subscriptions','operating_preferences','platform_connections','raw_sources',
    'extraction_jobs','brain_layers','brain_facts','opportunities','opportunity_matches',
    'content_items','content_variants','guardrail_reviews','publications','schedules',
    'publication_metrics','learning_signals','reflections','notifications','metrics_daily'
  ];
begin
  foreach t in array tenant_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy tenant_rw on public.%I for all to authenticated using (founder_id = public.current_founder_id()) with check (founder_id = public.current_founder_id())',
      t
    );
  end loop;
end $$;

-- Identity tables
alter table accounts enable row level security;
create policy own_account on accounts for select to authenticated using (auth_user_id = auth.uid());

alter table founders enable row level security;
create policy own_founder on founders for select to authenticated using (id = public.current_founder_id());
-- (account/founder rows are provisioned by the service role, which bypasses RLS)

-- Append-only tables: select + insert only (no update/delete for clients)
alter table brain_fact_versions enable row level security;
create policy ao_select on brain_fact_versions for select to authenticated using (founder_id = public.current_founder_id());
create policy ao_insert on brain_fact_versions for insert to authenticated with check (founder_id = public.current_founder_id());

alter table fact_provenance enable row level security;
create policy ao_select on fact_provenance for select to authenticated using (founder_id = public.current_founder_id());
create policy ao_insert on fact_provenance for insert to authenticated with check (founder_id = public.current_founder_id());

alter table audit_log enable row level security;
create policy ao_select on audit_log for select to authenticated using (founder_id = public.current_founder_id());

-- Internal/system tables: RLS on, no client policy → service role only
alter table events enable row level security;
alter table event_consumers enable row level security;
alter table failed_jobs enable row level security;
alter table feature_flags enable row level security;
