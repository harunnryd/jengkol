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
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker compose up -d              # local Postgres
pnpm --filter api prisma:migrate  # applies schema, generates Prisma client
pnpm dev                          # turbo run dev — boots both apps
```

API on `PORT` (default 3000), web dashboard on `5173`. Run just one app with
`pnpm --filter api dev` / `pnpm --filter web dev`. `pnpm build`/`pnpm test`/`pnpm lint`
run across both packages via Turborepo; `pnpm --filter <api|web> <script>` targets one.

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

### Modules

- `agencies`, `creators`, `campaigns` — core CRUD (Phase 1)
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

- `test/unit/` — pure logic, no I/O. `payout-calculator.spec.ts` (table-driven, `it.each`)
  and `llm-router.spec.ts` (key rotation/fallback state machine, via a mocked `buildModel`
  — no real API calls).
- `test/integration/` — Nest `TestingModule` + the real docker-compose Postgres.
  `payouts.integration.spec.ts` and `submissions.integration.spec.ts` (with
  `PlatformIntegrationsService` overridden by a fake, so it's real DB writes without a
  real platform API call).
- `test/e2e/` — full `AppModule` + `supertest`, the golden path over real HTTP
  (agency → creator → campaign → submission → payout → reporting), plus a check that a
  submission sync honestly 503s without platform credentials.
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

Minimal starter scaffold, not the full ops dashboard UI: one page that fetches
`GET /agencies` and lists them, proving the frontend↔backend wiring works
(`src/api/client.ts`, `VITE_API_URL` in `.env`). Build the real dashboard screens on top
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
