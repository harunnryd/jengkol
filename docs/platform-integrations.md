# Platform integration caveats — read before wiring real keys

## YouTube

Works immediately once `YOUTUBE_API_KEY` is set. YouTube Data API v3's
`videos.list?part=snippet,contentDetails,statistics` endpoint returns public view/like/
comment counts *and* real content metadata (title, description, published date, tags,
duration) for any video ID with just an API key (Google Cloud Console → enable "YouTube
Data API v3" → create an API key) — one call, one quota unit, regardless of how many
`part` values are requested, so this is a strictly free upgrade over fetching statistics
alone. No OAuth needed.

`YoutubeProvider.getChannelStats(handle)` additionally calls
`channels.list?part=snippet,statistics&forHandle=<Creator.externalHandle>` to pull
subscriber count, channel view count, and channel age — used by
`CreatorProfileSyncService` (daily cron, YouTube creators only) to keep `Creator`'s
channel-level fields fresh. See [llm-vetting.md](./llm-vetting.md) for why this matters:
it's the real data the upgraded vetting agent reasons about, instead of two manually
typed-in numbers.

## TikTok

There is no public "any video by URL" stats endpoint. The real, documented path is
TikTok's [Display API](https://developers.tiktok.com/doc/display-api-get-video-list/)
(`POST /v2/video/query/`), which only returns metrics for videos owned by whichever user
completed OAuth login to your registered TikTok app. In practice this means: every
clipper/creator submitting TikTok content must connect their TikTok account first, and
the `accessToken` passed to `TiktokProvider.getVideoMetrics()` is *their* user access
token — not an app-level secret. `TIKTOK_CLIENT_KEY`/`TIKTOK_CLIENT_SECRET` in `.env` are
for registering/authenticating the app itself; the OAuth flow to collect creator access
tokens is not yet built (tracked as a Phase 2 follow-up: TikTok OAuth connect flow).

## Honest failure, not fake data

Until keys are set, both providers make the real HTTP call and surface the real
401/403/`503` — nothing is mocked, so behavior is honest about missing credentials rather
than silently returning fake data. The vetting agent follows the same rule (see
[llm-vetting.md](./llm-vetting.md)).
