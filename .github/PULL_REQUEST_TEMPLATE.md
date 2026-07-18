## What

<!-- One or two sentences: what does this PR do? -->

## Why

<!-- The motivation — bug it fixes, feature it enables, finding it addresses. -->

## Scope

- [ ] This PR is small and reviewable in one pass (trunk-based: prefer several small PRs over one large one)
- [ ] If this ships incomplete work behind a flag/toggle, that's noted below

## Test plan

<!-- How did you verify this? Commands run, screenshots, manual steps. -->

- [ ] `pnpm --filter <api|web> test` passes
- [ ] `pnpm --filter api test:e2e` passes (if `apps/api` changed)
- [ ] `pnpm lint` / `pnpm build` pass across affected apps

## Checklist

- [ ] Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat(api): ...`, `fix(web): ...`, `docs: ...`)
- [ ] No secrets, `.env` files, or credentials committed
- [ ] Docs updated (`README.md` / `docs/*.md`) if behavior or setup changed
