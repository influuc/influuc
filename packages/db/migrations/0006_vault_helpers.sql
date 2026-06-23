-- Influuc — migration 0006: Supabase Vault RPC wrappers
-- vault.create_secret() lives in the vault schema and can't be called directly
-- from the JS client. These public wrappers expose it safely via RPC.

create or replace function public.vault_create_secret(
  p_secret text,
  p_name   text default null
) returns uuid
language sql
security definer
set search_path = vault, public
as $$
  select vault.create_secret(p_secret, p_name, '');
$$;

create or replace function public.vault_read_secret(
  p_id uuid
) returns text
language sql
security definer
set search_path = vault, public
as $$
  select decrypted_secret from vault.decrypted_secrets where id = p_id;
$$;

create or replace function public.vault_update_secret(
  p_id     uuid,
  p_secret text
) returns void
language sql
security definer
set search_path = vault, public
as $$
  update vault.secrets set secret = p_secret, updated_at = now() where id = p_id;
$$;

create or replace function public.vault_delete_secret(
  p_id uuid
) returns void
language sql
security definer
set search_path = vault, public
as $$
  delete from vault.secrets where id = p_id;
$$;

-- Restrict to authenticated + service_role only
revoke execute on function public.vault_create_secret(text, text) from public, anon;
revoke execute on function public.vault_read_secret(uuid) from public, anon;
revoke execute on function public.vault_update_secret(uuid, text) from public, anon;
revoke execute on function public.vault_delete_secret(uuid) from public, anon;
