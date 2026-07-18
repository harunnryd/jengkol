# Architecture

## Monorepo layout

```
jengkol/
├── turbo.json, pnpm-workspace.yaml    # workspace + task pipeline
├── package.json                        # root: husky, lint-staged, prettier, turbo
├── docker-compose.yml                  # local Postgres, shared by apps/api
└── apps/
    ├── api/   # NestJS backend
    └── web/   # Vite + React dashboard
```

## apps/api — NestJS backend

Stack: NestJS + TypeScript, PostgreSQL via Prisma, OpenTelemetry (traces),
`@nestjs/schedule` for the periodic view-count sync job. Path aliases (`@/*` → `src/*`)
work in both dev (`nest start --watch`) and the compiled build (`tsc-alias` rewrites them
after `nest build`).

CORS is restricted to `CORS_ORIGIN` (comma-separated list, defaults to
`http://localhost:5173`) — never a wildcard by default. Set it to your real frontend
origin(s) before deploying anywhere beyond local dev.

### Pagination

`GET /creators`, `GET /campaigns`, and `GET /submissions` take `?page` (default `1`) and
`?limit` (default `20`, max `100`) query params and return
`{ data: T[], meta: { page, limit, total, totalPages } }` rather than a bare array. Any
new list endpoint should follow the same shape (`PaginationQueryDto` in
`src/common/dto/pagination-query.dto.ts`) rather than returning an unbounded result set.

### Modules

- `auth` — registration/login/invite, JWT strategy + global guard, `@Roles()` for
  owner-only actions — see [auth.md](./auth.md)
- `agencies`, `creators`, `campaigns` — core CRUD (Phase 1), all tenant-scoped. `creators`
  also runs `CreatorProfileSyncService` (daily cron, YouTube only) to keep channel-level
  stats (subscribers, channel view count, channel age) fresh — see
  [llm-vetting.md](./llm-vetting.md) for why that data exists
- `submissions` — creator content submissions, with a cron job (`SubmissionsSyncService`,
  every 30 min) that pulls fresh view counts, recalculates payouts, and appends a
  `SubmissionMetricSnapshot` row every run (the flat `views`/`likes`/`comments` columns
  stay as a cheap "latest" read; the snapshot table is the growth/trend history)
- `payouts` — payout calculation engine (`calculatePayout`), flat or per-view rate models
- `platform-integrations` — `YoutubeProvider` / `TiktokProvider` behind a common
  `PlatformProvider` interface, so adding a new platform (Instagram, etc.) means adding
  one provider, not touching the rest of the app — see [platform-integrations.md](./platform-integrations.md)
- `llm` — `LlmRouterService`, multi-provider key rotation and fallback — see
  [llm-vetting.md](./llm-vetting.md)
- `vetting` (Phase 3) — real LLM-based vetting agent (langgraph) — see
  [llm-vetting.md](./llm-vetting.md)
- `reporting` (Phase 4 scaffold) — campaign summary rollup (views, spend, per-creator
  breakdown) from the same Phase 1 data; becomes the white-label deliverable once
  branding/access-control is added

### Data model

`Agency` → `User` (OWNER/MEMBER) and `Creator` (KOL or CLIPPER, tied to a `Platform`) →
`Campaign` (flat or per-view rate) → `Submission` (one piece of content, one creator, one
campaign) → `Payout` (one per submission, computed from `Campaign.rateModel` +
`Submission.views`). `CreatorScore` stores each vetting run's blended score +
heuristic/LLM breakdown.

`Creator` also carries agency-entered `niche` tags plus synced channel-level fields
(`subscriberCount`, `channelViewCount`, `channelPublishedAt`, etc. — YouTube only for
now); `Submission` carries synced content metadata (`title`, `description`,
`publishedAt`, `tags`, `durationSeconds`), captured once on first sync since it doesn't
change after upload. `SubmissionMetricSnapshot` is an append-only views/likes/comments
history, one row per sync — this "Creator Intelligence" layer is what the upgraded
vetting agent reasons over (see [llm-vetting.md](./llm-vetting.md)), and the substrate
any future creator-campaign matching or predictive-performance feature would build on.

## apps/web — dashboard (Vite + React)

Full-CRUD ops dashboard: Tailwind v4 + shadcn/ui (on Base UI primitives), `react-router`
behind a token-based `ProtectedRoute`. Login/register, and once signed in — Creators,
Campaigns, and Submissions pages with create/edit/delete, plus per-submission Sync/
Recalculate/Mark-paid actions, and a Settings page (rename agency, invite a member,
owner-gated). Per-resource typed API client in `src/api/*` (`src/api/http.ts` for the
shared fetch wrapper + auth/token handling).

## Roadmap alignment

- Phase 1 (Tracking & Payout Engine): fully implemented (`creators`, `campaigns`,
  `submissions`, `payouts`)
- Phase 2 (multi-platform + payout automation): the provider abstraction already supports
  YouTube + TikTok; adding Instagram is a new provider class, not a rewrite
- Phase 3 (AI Vetting): real LLM-based vetting agent (langgraph + LLM router + Langfuse)
  grounded in real channel/content data (the "Creator Intelligence" layer — see above),
  not a placeholder and not just two manually-typed numbers. Not yet built: TikTok OAuth
  (blocks TikTok channel/comment data entirely), comment-content/fraud analysis, and the
  creator-campaign AI matching + predictive-performance features this data enables
- Phase 4 (white-label reporting): `reporting` module exposes the campaign rollup that
  becomes the client-facing dashboard once branding/access-control lands; `apps/web` is
  where that dashboard grows
