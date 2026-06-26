-- RLS cross-tenant denial test suite (SCRUM-21)
-- Asserts that an authenticated founder cannot read another founder's rows
-- across every per-founder table. Run against a DB with >= 2 founders:
--   psql "$DATABASE_URL" -f packages/db/tests/rls_cross_tenant.sql
-- Raises an exception (non-zero exit) on any leak; prints PASS otherwise.

do $$
declare
  a_auth     uuid;
  a_founder  uuid;
  b_founder  uuid;
  tbl        text;
  leaked     int;
  per_founder_tables text[] := array[
    'weekly_reflections', 'post_metrics', 'opportunities',
    'weekly_posts', 'brain_facts', 'operating_preferences', 'opportunity_matches'
  ];
begin
  select f.id, acc.auth_user_id into a_founder, a_auth
  from founders f join accounts acc on acc.id = f.account_id
  limit 1;

  select id into b_founder from founders where id <> a_founder limit 1;

  if a_auth is null or b_founder is null then
    raise notice 'SKIP: need >= 2 founders with auth users'; return;
  end if;

  -- impersonate founder A
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', a_auth, 'role', 'authenticated')::text, true);

  foreach tbl in array per_founder_tables loop
    execute format('select count(*) from %I where founder_id = %L', tbl, b_founder) into leaked;
    if leaked > 0 then
      raise exception 'RLS FAIL: % exposed % cross-tenant rows', tbl, leaked;
    end if;
    raise notice '  % : 0 cross-tenant rows OK', tbl;
  end loop;

  reset role;
  raise notice 'RLS cross-tenant denial: PASS (% tables)', array_length(per_founder_tables, 1);
end $$;
