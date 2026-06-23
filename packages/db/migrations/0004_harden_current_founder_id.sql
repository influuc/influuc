-- Influuc — migration 0004: restrict current_founder_id() execution
-- Advisor 0028/0029: a SECURITY DEFINER function should not be callable by anon.
-- It is only needed by `authenticated` for RLS policy evaluation.

revoke execute on function public.current_founder_id() from public, anon;
grant execute on function public.current_founder_id() to authenticated, service_role;
