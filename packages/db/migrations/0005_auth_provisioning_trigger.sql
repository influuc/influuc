-- Influuc — migration 0005: auth provisioning trigger
-- On every new auth.users row: create account → founder → operating_preferences → trial subscription.
-- Runs with SECURITY DEFINER so it can write across RLS-protected tables.

create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_account_id uuid;
  v_founder_id  uuid;
begin
  -- 1. Map the Supabase auth user to our accounts table
  insert into public.accounts (auth_user_id, email)
  values (new.id, new.email)
  returning id into v_account_id;

  -- 2. Create the founder profile (onboarding starts at 'connect')
  insert into public.founders (account_id, display_name, onboarding_state)
  values (
    v_account_id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    'connect'
  )
  returning id into v_founder_id;

  -- 3. Operating preferences (all defaults: assisted, autopilot off)
  insert into public.operating_preferences (founder_id)
  values (v_founder_id);

  -- 4. Trial subscription (no Stripe data yet — linked at paywall step)
  insert into public.subscriptions (founder_id, status, monthly_token_budget)
  values (v_founder_id, 'trialing', 2000000);

  return new;
exception
  when others then
    -- Re-raise: orphaned auth users with no account rows are worse than a failed signup
    raise;
end;
$$;

-- Drop trigger if exists (idempotent re-runs)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Principle of least privilege: this function only needs to run as a trigger
revoke execute on function public.handle_new_user() from public, anon;
