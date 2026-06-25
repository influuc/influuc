-- Migration 0007: fix vault_update_secret to use vault extension's own update function
-- Direct UPDATE on vault.secrets fails because the secret column is encrypted;
-- vault.update_secret() handles re-encryption correctly.

create or replace function public.vault_update_secret(
  p_id     uuid,
  p_secret text
) returns void
language sql
security definer
set search_path = vault, public
as $$
  select vault.update_secret(p_id, p_secret);
$$;

revoke execute on function public.vault_update_secret(uuid, text) from public, anon;
