# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Cursor, etc.) working in this repo.
Humans: see [CONTRIBUTING.md](CONTRIBUTING.md) — everything there applies here too,
this file is the same rules with agent-specific emphasis and the mistakes that made
each rule worth writing down.

## Commands

```bash
pnpm install
pnpm --filter <api|web> dev       # boot one app
pnpm --filter <api|web> lint
pnpm --filter <api|web> build
pnpm --filter api test             # unit + integration (needs docker compose up -d)
pnpm --filter api test:e2e
pnpm build / pnpm lint / pnpm test # both apps via turbo, from repo root
```

Run lint + build + the relevant test tier before opening a PR — see
[docs/testing.md](docs/testing.md) for what each tier covers.

## Git workflow

- Trunk-based: **branch + PR, not direct pushes to `main`**. Short-lived branch, open
  a PR, let CI run, squash-merge.
- Commit messages: [Conventional Commits](https://www.conventionalcommits.org/),
  lowercase, **single line, no body unless the "why" genuinely isn't obvious from the
  diff**. `type(scope): description` — see CONTRIBUTING.md for the full convention.
- No `Co-Authored-By` or similar trailers for the agent itself. Being the tool that
  wrote the diff doesn't make you a co-author of the commit.
- No em dashes. Plain sentences.
- PR description follows `.github/PULL_REQUEST_TEMPLATE.md`'s structure. Use markdown
  that's actually easier to scan than prose when it fits — a table for "what changed
  per area", `code spans` for identifiers, bold for the one sentence that matters most
  in the summary — not markdown for its own sake.

These exist because an earlier session on this repo got every one of them wrong at
least once: multi-paragraph commit bodies on a repo whose own CONTRIBUTING.md says "no
body unless genuinely needed", automatic `Co-Authored-By: Claude` trailers nobody
asked for, a PR title that ignored the documented convention entirely, and direct
pushes to `main` despite the repo documenting a trunk-based branch+PR flow. None of
that was requested — it was just default habit that didn't match this repo's actual
rules. Read the rule, not just the habit.

## The one thing worth catching in review

Every resource query must be scoped by `agencyId` (or scoped indirectly through a
parent that is) — see [docs/auth.md](docs/auth.md). This is a multi-tenant app; a
missing tenant filter is an IDOR, not a style nit. If you add a new resource/module,
find the tenant-scoping pattern in an existing one (`creators`, `campaigns`,
`submissions`) and follow it exactly, don't improvise a new one.

## Where to look before assuming

- [docs/architecture.md](docs/architecture.md) — module map, data model, what's built
  vs. scaffolded
- [docs/development-notes.md](docs/development-notes.md) — build-tooling gotchas that
  look like mystery bugs if you don't know they're documented (e.g. why dev mode uses
  `nest start --watch` and not `tsx`, why `apps/web` tests need a `NODE_OPTIONS` flag)
- [docs/platform-integrations.md](docs/platform-integrations.md) — real API caveats
  (TikTok's OAuth requirement in particular) — don't mock around a real limitation,
  document it instead, same as the existing code does
