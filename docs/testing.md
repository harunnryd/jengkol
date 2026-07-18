# Testing — pyramid: unit → integration → e2e → eval

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
- `test/eval/` — see [llm-vetting.md](./llm-vetting.md).

## apps/web

```bash
pnpm --filter web test    # vitest + @testing-library/react
```

Smoke coverage only, not a full pyramid: `LoginPage.test.tsx` (submits and redirects),
`CreatorsPage.test.tsx` (fetches and renders a list page), `ProtectedRoute.test.tsx`
(redirects when unauthenticated, renders when a token is present). Each API module is
mocked with `vi.mock` — no real backend calls. See
[development-notes.md](./development-notes.md) for a Node/jsdom `localStorage` gotcha
this suite works around.
