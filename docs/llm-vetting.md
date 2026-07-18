# LLM router & vetting agent — read before wiring real keys

## LLM router

`LLM_PROVIDER_ORDER=anthropic,openai` (default) sets the fallback order. Each provider
takes a **comma-separated list** of keys in `ANTHROPIC_API_KEYS` / `OPENAI_API_KEYS` —
the router round-robins across a provider's keys on every call, and on a 401/403/429 it
rotates to the next key, then the next provider, until one succeeds or all are exhausted
(`src/modules/llm/llm-router.service.ts`). A provider with no keys configured is skipped
entirely — if neither is set, `POST /vetting/creators/:id/score` returns a `503`, same
honest-failure pattern as the platform providers.

Known limitation: `provider.keyIndex` is shared mutable state read-then-incremented
before an `await`, so concurrent calls can interleave and briefly break the round-robin
fairness guarantee (two concurrent requests could land on the same key). Not fixed —
low-throughput endpoint, and a real fix needs a mutex/queue that isn't worth the added
complexity at this scale.

## Vetting agent (Phase 3)

A `@langchain/langgraph` `StateGraph` (`gatherProfile` → `llmAssess` → `combineScore`)
blends a heuristic score with an LLM qualitative fit/red-flag assessment into the final
`CreatorScore`. LLM output is parsed defensively — malformed JSON or non-numeric fields
fail loudly (`ServiceUnavailableException`) or fall back to 0, never silently produce
`NaN`.

**Heuristic** (`computeHeuristic` in `vetting-agent.graph.ts`) has three components,
summing to 100: `followersComponent` (0-50), `engagementComponent` (0-30), and
`authenticityComponent` (0-20) — the last one flags an anomalous views-to-subscriber
ratio (near-zero across many posts suggests bought/fake followers; very high on a young
channel suggests an outlier worth double-checking) but never drives the score to zero on
its own; it biases the baseline, the LLM does the actual judgment call.

**LLM input** (`vetting.service.ts` `scoreCreator`) is no longer just two numbers.
Before invoking the graph, it computes `avgViewsPerSubmission` and
`viewsToSubscriberRatio` from the creator's own submission/snapshot history, derives
`channelAgeInDays` from the synced channel-publish date, and pulls the 3 most recent
submissions' real `title`/`description` — so the LLM reasons about actual content and
real performance history, not an isolated followers/engagement snapshot. Fields default
safely (`0`/`null`) for creators that haven't been through a
`CreatorProfileSyncService` run yet (see [architecture.md](./architecture.md)) — an
un-synced creator still scores, just without the authenticity/content signal.

`CreatorScore.breakdown` now also stores `contextUsed` (the niche/subscriber/ratio/recent-
titles actually shown to the LLM) alongside `heuristic` and `llmAssessment`, so a human
reviewer can see *why* a score came out the way it did, not just the number.

## Langfuse (optional)

`LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY` — when set, an `@langfuse/otel`
`LangfuseSpanProcessor` is added to the app's existing OpenTelemetry `NodeSDK`
(`src/observability/tracing.ts`), and `@langfuse/langchain`'s `CallbackHandler` traces
every vetting-agent LLM call. Uses the newer OTEL-native Langfuse v5 SDK (`@langfuse/*`),
not the legacy `langfuse-langchain` package — that one pins `langchain <0.4.0` and is
incompatible with the `langchain@1.x` used here.

## Eval suite

`test/eval/vetting-agent.eval.ts` runs the **real** vetting agent (real LLM calls)
against fixture creators, scored with [`autoevals`](https://github.com/braintrustdata/autoevals)
(`ClosedQA`) to check the reasoning is actually about brand-safety/fit, and that a
clearly-good creator scores above a clearly-bad one.

Chosen over the npm `deepeval` package, which turned out to be a thin client for
Confident AI's *cloud* dashboard (needs a separate account + `CONFIDENT_API_KEY`, no
local judge model) rather than a local eval library — `autoevals` runs entirely locally
against your own `OPENAI_API_KEY` and has far wider adoption for this exact use case.
Skipped (not faked) without real keys.
