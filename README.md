# jengkol

Creator ops platform for KOL/clipper agencies: replaces spreadsheet-based creator tracking,
view-count sync, and payout calculation with a real backend — plus a dashboard frontend.

Turborepo monorepo, pnpm workspaces:

```
jengkol/
├── turbo.json, pnpm-workspace.yaml    # workspace + task pipeline
├── package.json                        # root: husky, lint-staged, prettier, turbo
├── docker-compose.yml                  # local Postgres, shared by apps/api
└── apps/
    ├── api/   # NestJS backend — see apps/api section below
    └── web/   # Vite + React dashboard — see apps/web section below
```

## Setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # set a real JWT_SECRET before anything but local dev
cp apps/web/.env.example apps/web/.env
docker compose up -d              # local Postgres
pnpm --filter api prisma:migrate  # applies schema, generates Prisma client
pnpm --filter api db:seed         # optional: demo agency + creator + campaign + login
pnpm dev                          # turbo run dev — boots both apps
```

API on `PORT` (default 3000), web dashboard on `5173`. Run just one app with
`pnpm --filter api dev` / `pnpm --filter web dev`. `pnpm build`/`pnpm test`/`pnpm lint`
run across both packages via Turborepo; `pnpm --filter <api|web> <script>` targets one.
`db:seed` prints demo login credentials (`demo@jengkol.local` / `password123`) — sign in
with those on the web dashboard, or `POST /auth/register` for a fresh account.

## apps/api — NestJS backend

Stack: NestJS + TypeScript, PostgreSQL via Prisma, OpenTelemetry (traces),
`@nestjs/schedule` for the periodic view-count sync job. Path aliases (`@/*` → `src/*`)
work in both dev (`nest start --watch`) and the compiled build (`tsc-alias` rewrites them
after `nest build`).

**Dev server note:** dev mode uses `nest start --watch` (tsc-based), not `tsx` — `tsx`'s
esbuild-based decorator metadata turned out to be unreliable for NestJS's constructor
injection (every DI'd provider failed intermittently, not just cross-package ones). `tsx`
is still used for one-off scripts with no DI, like `db:seed`. Also: `nest-cli.json` sets
`"tsConfigPath": "tsconfig.build.json"` explicitly and `tsconfig.json` has **no**
`"incremental"` — combined with `deleteOutDir: true`, an incremental `.tsbuildinfo` cache
will make `tsc` think nothing changed right after the output directory was wiped, silently
producing an empty `dist/`. Both gotchas cost real debugging time; don't reintroduce them.

### Auth & multi-tenancy

Every route is JWT-protected by default (`JwtAuthGuard` registered globally via
`APP_GUARD` in `modules/auth/auth.module.ts`) — a new module can't forget to guard
itself; routes opt out explicitly with `@Public()` (only `/auth/register` and
`/auth/login` do). `POST /auth/register` creates an `Agency` + its first `User`
(`role: OWNER`) together in one transaction; `POST /auth/login` returns a token for an
existing user; `POST /auth/invite` (owner-only, via `@Roles('OWNER')` + `RolesGuard`)
adds a `MEMBER` to the caller's own agency.

**Every list/get/update/delete on every resource is scoped by the caller's `agencyId`
from the JWT — never from a client-supplied field.** `Creator`/`Campaign` carry
`agencyId` directly; `Submission`/`Payout` are scoped through their `Campaign` relation
(`findFirst({ where: { id, campaign: { agencyId } } })`). A cross-tenant ID returns a
plain 404, not the other agency's data — proved by
`test/e2e/auth.e2e-spec.ts`'s "IDOR closed" case, not just asserted. `GET /agencies` and
`POST /agencies` were removed entirely; agency creation only happens via
`/auth/register`, and there's no legitimate reason for one agency to look up another —
use `GET /agencies/me` / `PATCH /agencies/me` (owner-only) instead.

`JWT_SECRET` is required (min 16 chars) and `.env.example` ships an obviously-fake dev
value — generate a real one (`openssl rand -hex 32`) before deploying anywhere real.
Tokens are long-lived (`JWT_EXPIRES_IN=7d` default) with no refresh-token rotation —
fine for this stage, worth hardening before a real production launch.

### Modules

- `auth` — registration/login/invite, JWT strategy + global guard, `@Roles()` for
  owner-only actions (see above)
- `agencies`, `creators`, `campaigns` — core CRUD (Phase 1), all tenant-scoped
- `submissions` — creator content submissions, with a cron job (`SubmissionsSyncService`,
  every 30 min) that pulls fresh view counts and recalculates payouts
- `payouts` — payout calculation engine (`calculatePayout`), flat or per-view rate models
- `platform-integrations` — `YoutubeProvider` / `TiktokProvider` behind a common
  `PlatformProvider` interface, so adding a new platform (Instagram, etc.) means adding
  one provider, not touching the rest of the app
- `llm` — `LlmRouterService`: rotates across API keys within a provider (round-robin) and
  falls back to the next configured provider (Anthropic → OpenAI, in `LLM_PROVIDER_ORDER`)
  once a provider's keys are exhausted. Used by `vetting`.
- `vetting` (Phase 3) — real LLM-based vetting agent: a `@langchain/langgraph` `StateGraph`
  (`gatherProfile` → `llmAssess` → `combineScore`) blends the original heuristic
  (followers/engagement) with an LLM qualitative fit/red-flag assessment into the final
  `CreatorScore`. Langfuse traces every LLM call when configured.
- `reporting` (Phase 4 scaffold) — campaign summary rollup (views, spend, per-creator
  breakdown) from the same Phase 1 data; becomes the white-label deliverable once
  branding/access-control is added

CORS is enabled (`app.enableCors()` in `main.ts`) so `apps/web` on a different port/origin
can call it directly in dev.

### Platform integration caveats — read before wiring real keys

**YouTube** — works immediately once `YOUTUBE_API_KEY` is set. YouTube Data API v3's
`videos.list?part=statistics` endpoint returns public view/like/comment counts for any
video ID with just an API key (Google Cloud Console → enable "YouTube Data API v3" →
create an API key). No OAuth needed.

**TikTok** — there is no public "any video by URL" stats endpoint. The real, documented
path is TikTok's [Display API](https://developers.tiktok.com/doc/display-api-get-video-list/)
(`POST /v2/video/query/`), which only returns metrics for videos owned by whichever user
completed OAuth login to your registered TikTok app. In practice this means: every
clipper/creator submitting TikTok content must connect their TikTok account first, and
the `accessToken` passed to `TiktokProvider.getVideoMetrics()` is *their* user access
token — not an app-level secret. `TIKTOK_CLIENT_KEY`/`TIKTOK_CLIENT_SECRET` in `.env` are
for registering/authenticating the app itself; the OAuth flow to collect creator access
tokens is not yet built (tracked as a Phase 2 follow-up: TikTok OAuth connect flow).

Until keys are set, both providers make the real HTTP call and surface the real
401/403/`503` — nothing is mocked, so behavior is honest about missing credentials rather
than silently returning fake data. The vetting agent (below) follows the same rule.

### LLM router & vetting agent — read before wiring real keys

`LLM_PROVIDER_ORDER=anthropic,openai` (default) sets the fallback order. Each provider
takes a **comma-separated list** of keys in `ANTHROPIC_API_KEYS` / `OPENAI_API_KEYS` —
the router round-robins across a provider's keys on every call, and on a 401/403/429 it
rotates to the next key, then the next provider, until one succeeds or all are exhausted
(`src/modules/llm/llm-router.service.ts`). A provider with no keys configured is skipped
entirely — if neither is set, `POST /vetting/creators/:id/score` returns a `503`, same
honest-failure pattern as the platform providers.

**Langfuse** (`LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY`) is optional — when set, an
`@langfuse/otel` `LangfuseSpanProcessor` is added to the app's existing OpenTelemetry
`NodeSDK` (`src/observability/tracing.ts`), and `@langfuse/langchain`'s `CallbackHandler`
traces every vetting-agent LLM call. Uses the newer OTEL-native Langfuse v5 SDK
(`@langfuse/*`), not the legacy `langfuse-langchain` package — that one pins
`langchain <0.4.0` and is incompatible with the `langchain@1.x` used here.

### Testing — pyramid: unit → integration → e2e → eval

```bash
pnpm --filter api test          # unit + integration (fast, real Postgres, no LLM calls)
pnpm --filter api test:e2e      # full app + supertest, golden path over real HTTP
pnpm --filter api test:eval     # real LLM calls — needs ANTHROPIC_API_KEYS/OPENAI_API_KEYS + OPENAI_API_KEY
```

- `test/unit/` — pure logic, no I/O. `payout-calculator.spec.ts` (table-driven, `it.each`),
  `llm-router.spec.ts` (key rotation/fallback state machine, via a mocked `buildModel` —
  no real API calls), and `auth.service.spec.ts` (register/login/password-hashing, with a
  mocked PrismaService — no real DB).
- `test/integration/` — Nest `TestingModule` + the real docker-compose Postgres.
  `payouts.integration.spec.ts` and `submissions.integration.spec.ts` (with
  `PlatformIntegrationsService` overridden by a fake, so it's real DB writes without a
  real platform API call).
- `test/e2e/` — full `AppModule` + `supertest` over real HTTP. `golden-path.e2e-spec.ts`
  (register → creator → campaign → submission → payout → reporting, plus the honest 503
  without platform credentials) and `auth.e2e-spec.ts` (register, wrong-password login,
  401 with no token, and — the one that matters — a second agency's user getting a plain
  404 instead of the first agency's creator data).
- `test/eval/` — runs the **real** vetting agent (real LLM calls) against fixture
  creators, scored with [`autoevals`](https://github.com/braintrustdata/autoevals)
  (`ClosedQA`) to check the reasoning is actually about brand-safety/fit, and that a
  clearly-good creator scores above a clearly-bad one. Chosen over the npm `deepeval`
  package, which turned out to be a thin client for Confident AI's *cloud* dashboard
  (needs a separate account + `CONFIDENT_API_KEY`, no local judge model) rather than a
  local eval library — `autoevals` runs entirely locally against your own `OPENAI_API_KEY`
  and has far wider adoption for this exact use case. Skipped (not faked) without real keys.

### Data model

`Agency` → `Creator` (KOL or CLIPPER, tied to a `Platform`) → `Campaign` (flat or
per-view rate) → `Submission` (one piece of content, one creator, one campaign) →
`Payout` (one per submission, computed from `Campaign.rateModel` + `Submission.views`).
`CreatorScore` stores each vetting run's blended score + heuristic/LLM breakdown.

## apps/web — dashboard (Vite + React)

Minimal starter scaffold, not the full ops dashboard UI: a login form (email/password →
`POST /auth/login`, JWT stored in `localStorage`) and, once signed in, a page that fetches
`GET /agencies/me` and shows the agency name — proving the auth + tenant-scoped
frontend↔backend wiring works end to end (`src/api/client.ts`, `VITE_API_URL` in `.env`).
No router, no registration UI, no token refresh — build the real dashboard screens on top
of this as agency/campaign/creator management features are prioritized.

## Roadmap alignment

- Phase 1 (Tracking & Payout Engine): fully implemented (`creators`, `campaigns`,
  `submissions`, `payouts`)
- Phase 2 (multi-platform + payout automation): the provider abstraction already supports
  YouTube + TikTok; adding Instagram is a new provider class, not a rewrite
- Phase 3 (AI Vetting): real LLM-based vetting agent (langgraph + LLM router + Langfuse),
  not a placeholder
- Phase 4 (white-label reporting): `reporting` module exposes the campaign rollup that
  becomes the client-facing dashboard once branding/access-control lands; `apps/web` is
  where that dashboard grows
