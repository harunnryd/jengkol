# Development notes / gotchas

A few build-tooling issues cost real debugging time during development. All are fixed —
this is a record of why the current setup looks the way it does, so nobody "simplifies"
it back into the broken state.

## Dev server uses `nest start --watch`, not `tsx`

`tsx`'s esbuild-based decorator metadata turned out to be unreliable for NestJS's
constructor injection — every DI'd provider failed intermittently under it, not just
cross-package ones. Dev mode uses `nest start --watch` (real `tsc`, correct metadata
emission) instead. `tsx` is still used for one-off scripts with no DI, like `db:seed`.

## `nest-cli.json` needs an explicit `tsConfigPath`, and `tsconfig.json` must not set `incremental`

`nest-cli.json` sets `"tsConfigPath": "tsconfig.build.json"` explicitly, and
`tsconfig.json` has **no** `"incremental"`. Combined with `deleteOutDir: true`, an
incremental `.tsbuildinfo` cache will make `tsc` think nothing changed right after the
output directory was wiped, silently producing an empty `dist/`. If a rebuild ever starts
producing an empty or stale `dist/`, check for a stray `tsconfig.build.tsbuildinfo` before
assuming anything else is wrong.

## `apps/web` tests need `NODE_OPTIONS=--no-experimental-webstorage`

Node 22+ ships an experimental native `localStorage` global. On Node versions where it's
enabled by default, it shadows jsdom's own `window.localStorage` in Vitest's `jsdom`
environment — `window.localStorage` ends up being a broken stub (no `getItem`/`setItem`/
`clear`) instead of jsdom's real `Storage` implementation, since Node defines its own
version as a non-configurable global before jsdom's environment setup runs. The `test`
script in `apps/web/package.json` sets `NODE_OPTIONS=--no-experimental-webstorage` to
disable Node's native version so jsdom's works correctly — don't remove it, and don't
call bare `localStorage` in app code either (use `window.localStorage` explicitly, as
`src/api/http.ts` does), since a future Node default-flip could reintroduce the shadowing.
