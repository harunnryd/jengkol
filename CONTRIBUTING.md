# Contributing

## Workflow: trunk-based development

- `main` is always releasable. No long-lived feature branches.
- Branch off `main`, keep the branch short-lived (ideally merged within a day or two),
  open a PR early (draft is fine) rather than batching up a large diff.
- Prefer several small, focused PRs over one large one — see the PR template's scope
  checklist.
- If a change is genuinely incomplete when it needs to merge, land it behind a flag/toggle
  rather than leaving the branch open — don't let branches drift from `main`.
- Rebase on `main` instead of merging `main` into your branch, to keep history linear.
- Squash-merge PRs into `main` so each PR becomes one commit in `main`'s history — write
  the squash commit message following the convention below regardless of how many commits
  were on the branch.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/), lowercase, no body unless
genuinely needed:

```
type(scope): description
```

- `type`: `feat`, `fix`, `docs`, `test`, `chore`, `refactor`
- `scope`: `api`, `web`, or omitted for repo-wide changes (tooling, docs, monorepo config)

Examples: `feat(api): add campaign budget validation`, `fix(web): handle expired token on load`, `docs: update auth flow diagram`.

## Before opening a PR

```bash
pnpm install
pnpm --filter <api|web> lint
pnpm --filter <api|web> build
pnpm --filter api test        # unit + integration
pnpm --filter api test:e2e    # if apps/api changed
```

See [docs/testing.md](docs/testing.md) for what each test tier covers.

## Code review

- Every PR needs at least one review before merging to `main`.
- Reviewers: focus on correctness and whether the tenant-scoping pattern
  (see [docs/auth.md](docs/auth.md)) is followed for any new resource — this is the one
  category of bug that's cheap to catch in review and expensive to catch in production.

## Reporting bugs / requesting features

Use the issue templates — they ask for exactly what's needed to act on the report
(repro steps, logs, which app). Security issues: do not open a public issue — see
[SECURITY.md](SECURITY.md).
