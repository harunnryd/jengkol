# Auth & multi-tenancy

Every route is JWT-protected by default (`JwtAuthGuard` registered globally via
`APP_GUARD` in `modules/auth/auth.module.ts`) — a new module can't forget to guard
itself; routes opt out explicitly with `@Public()` (only `/auth/register` and
`/auth/login` do).

## Endpoints

- `POST /auth/register` — creates an `Agency` + its first `User` (`role: OWNER`) together
  in one transaction, returns a token
- `POST /auth/login` — returns a token for an existing user
- `POST /auth/invite` — owner-only (`@Roles('OWNER')` + `RolesGuard`), adds a `MEMBER` to
  the caller's own agency
- `GET /agencies/me` / `PATCH /agencies/me` (owner-only) — the caller's own agency.
  Standalone `GET /agencies` and `POST /agencies` were removed entirely: agency creation
  only happens via `/auth/register`, and there's no legitimate reason for one agency to
  look up another.

## Tenant scoping

**Every list/get/update/delete on every resource is scoped by the caller's `agencyId`
from the JWT — never from a client-supplied field.** `Creator`/`Campaign` carry
`agencyId` directly; `Submission`/`Payout` are scoped through their `Campaign` relation
(`findFirst({ where: { id, campaign: { agencyId } } })`). A cross-tenant ID returns a
plain 404, not the other agency's data — proved by `test/e2e/auth.e2e-spec.ts`'s
"IDOR closed" case, not just asserted.

## Config

`JWT_SECRET` is required (min 16 chars) and `.env.example` ships an obviously-fake dev
value — generate a real one (`openssl rand -hex 32`) before deploying anywhere real.
Tokens are long-lived (`JWT_EXPIRES_IN=7d` default) with no refresh-token rotation —
fine for this stage, worth hardening before a real production launch.
