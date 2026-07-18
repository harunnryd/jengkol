# Development notes / gotchas

Two build-tooling issues cost real debugging time during development. Both are fixed —
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
