# @influuc/db

Database schema (migrations) + generated TypeScript types for the Influuc Supabase project.

- **Project:** `influuc's Project` (ref `wcwvknsxatokfgmcqwfk`, region `ap-southeast-2`, Postgres 17).
- **Migrations:** `./migrations/*.sql` — forward-only, the source of truth for the schema.
  - `0001_extensions_and_enums` — pgvector, citext, moddatetime, all enums
  - `0002_core_schema` — 28 tables + indexes (incl. HNSW vector index) + updated_at triggers
  - `0003_rls` — `current_founder_id()` helper + RLS (tenant isolation, append-only, locked internal tables)
  - `0004_harden_current_founder_id` — restrict the helper to `authenticated`/`service_role`
- **Types:** `./src/database.types.ts` (generated). Regenerate with `pnpm --filter @influuc/db gen:types`.

All tables have RLS enabled (default-deny), keyed on `founder_id`. Tenant isolation is enforced by the database, not just the API.
