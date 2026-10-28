# Terravado — security posture

Terravado holds client finances and lending data, so access control is treated as
the primary feature, not an afterthought. This note records how it is enforced and
how to verify it.

## Principles

1. **All security rules live in the repo.** Every table, RLS policy and database
   function is a numbered migration under `supabase/migrations/` (`0001`–`0019`).
   The security model can be reviewed, diffed, and rebuilt from scratch — nothing
   critical lives only in the Supabase dashboard.
2. **Row Level Security on by default.** Every table has RLS enabled. Tenant data
   is scoped by `tenant_id IN (select current_user_tenants())`, so a signed-in user
   only ever sees their own tenant's rows. (`suburb_data` is deliberately shared,
   read-only market data; `platform_admins` is deny-by-default.)
3. **No service-role key in app code.** The application talks to Supabase as the
   logged-in user, so RLS applies to everything. Privileged work is done by a small
   set of `SECURITY DEFINER` database functions, each with its own explicit guard —
   not by a master key scattered across files.

## Privileged functions (the sensitive surface)

Concentrated and guarded:

| Function | Guard |
| --- | --- |
| `admin_*` (tenants, members, roles) | `is_platform_admin()` — platform admins only |
| `tenant_members`, `current_tenant_roles` | scoped to the caller's own tenant via `auth.uid()` |
| `accept_deal_share` | only the invited email may accept |
| `shared_client_ids` | the caller's accepted shares only |

As of migration `0019`, these are no longer executable by `anon` — only
`authenticated` and `service_role` — so the in-function guard is a second layer,
not the only one.

## Cross-tenant deal sharing

A guest invited onto a deal gets **SELECT-only** access, scoped by
`shared_client_ids()` to exactly the shared person/deal and its properties,
modelling and documents. Guests cannot write, and cannot see anything else in the
host's account. The host's own access is unchanged.

## How to verify

- **Static audit** — `supabase/tests/security_audit.sql`. Returns one row per
  violation; an empty result is a pass (no table without RLS, no permissive
  policy, no tenant table without a policy, no unguarded definer function).
- **Runtime isolation** — `supabase/tests/rls_isolation.sql`. Impersonates a
  non-member in a rolled-back transaction and asserts every tenant-data count is 0.
- **Engine assurance** — `npm run verify:engine`. 20 known-answer checks on the
  serviceability/modelling engine, gated in CI.

Run the two SQL checks after any migration (Supabase SQL editor, or in CI against
the database).

## Known gaps / next

- The SQL checks above are not yet wired into automated CI (they need a database
  connection string in the pipeline). Running them after each migration is the
  interim discipline.
- Application-layer server actions have no unit tests yet; the database is the
  enforcement boundary, which is where the automated checks focus.
