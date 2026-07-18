# jengkol

Creator ops platform for KOL/clipper agencies: replaces spreadsheet-based creator
tracking, view-count sync, and payout calculation with a real backend — plus a dashboard
frontend.

Turborepo monorepo (pnpm workspaces): [`apps/api`](apps/api) is a NestJS backend, JWT-auth
protected and multi-tenant from the ground up; [`apps/web`](apps/web) is a Vite + React
dashboard.

## Quick start

```bash
pnpm install
cp apps/api/.env.example apps/api/.env   # set a real JWT_SECRET before anything but local dev
cp apps/web/.env.example apps/web/.env
docker compose up -d              # local Postgres
pnpm --filter api prisma:migrate  # applies schema, generates Prisma client
pnpm --filter api db:seed         # optional: demo agency + creator + campaign + login
pnpm dev                          # turbo run dev — boots both apps
```

API on `PORT` (default `3000`), web dashboard on `5173`. `db:seed` prints demo login
credentials (`demo@jengkol.local` / `password123`) — sign in with those on the web
dashboard, or `POST /auth/register` for a fresh account.

Run just one app: `pnpm --filter api dev` / `pnpm --filter web dev`.
`pnpm build`/`pnpm test`/`pnpm lint` run across both packages via Turborepo;
`pnpm --filter <api|web> <script>` targets one.

## Documentation

- [Architecture](docs/architecture.md) — monorepo layout, modules, data model, roadmap
- [Auth & multi-tenancy](docs/auth.md)
- [Platform integrations](docs/platform-integrations.md) — YouTube/TikTok setup caveats
- [LLM router & vetting agent](docs/llm-vetting.md)
- [Testing](docs/testing.md) — unit/integration/e2e/eval pyramid
- [Development notes](docs/development-notes.md) — build-tooling gotchas worth knowing before you touch config

## Contributing

Trunk-based development, small PRs, Conventional Commits — see
[CONTRIBUTING.md](CONTRIBUTING.md). Found a security issue? See
[SECURITY.md](SECURITY.md) instead of opening a public issue.

## License

[Apache-2.0](LICENSE)
