# Watch Signal — GameBeeper Video Feature

**"Trailers, gameplay and developer stories worth watching."**

Watch Signal is the video content layer of GameBeeper. It aggregates official gaming trailers, gameplay reveals, developer diaries and editorial video coverage from trusted YouTube channels into the same clean, privacy-first, ad-free experience as the news feed.

---

## Added Video Sources

Watch Signal launches with **8 verified video sources** across four categories:

### Official Platforms
| Source | Channel | Topics |
|--------|---------|--------|
| PlayStation | [@PlayStation](https://www.youtube.com/@PlayStation) | PlayStation, Trailers, Showcases |
| Xbox | [@Xbox](https://www.youtube.com/@Xbox) | Xbox, Trailers, Showcases |
| Nintendo | [@Nintendo](https://www.youtube.com/@Nintendo) | Nintendo, Trailers, Showcases |

### Trusted Editorial
| Source | Channel | Topics |
|--------|---------|--------|
| IGN | [@IGN](https://www.youtube.com/@IGN) | Latest, Reviews, Trailers |
| GameSpot | [@GameSpot](https://www.youtube.com/@GameSpot) | Latest, Reviews, Trailers |
| Digital Foundry | [@DigitalFoundry](https://www.youtube.com/@DigitalFoundry) | Hardware, Reviews |

### Events & Showcases
| Source | Channel | Topics |
|--------|---------|--------|
| The Game Awards | [@TheGameAwards](https://www.youtube.com/@TheGameAwards) | Trailers, Esports, Awards |
| Summer Game Fest | [@SummerGameFest](https://www.youtube.com/@SummerGameFest) | Trailers, Showcases |

---

## Supported Providers

**Current:** `youtube` — YouTube public channels and playlists via the Atom RSS feed (`https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}`).

**Future (Phase 2):** `twitch` — Twitch clips and VODs for major showcases/esports events. Not included in the initial release due to the different metadata model and live-stream handling requirements.

**YouTube API (enhanced mode):** If the `YOUTUBE_API_KEY` environment variable is set when running `build:videos`, the script will use the YouTube Data API v3 to enrich videos with duration, live status and richer metadata. Without the key, the Atom RSS feed is used (no API quota required).

---

## How to Add a Video Source

1. Open `data/video-sources.json`.
2. Append a new entry following the schema:

```json
{
  "id": "unique-kebab-id",
  "displayName": "Display Name",
  "provider": "youtube",
  "providerChannelId": "UCxxxxxxxxxxxxxxxxxxxxxxxxx",
  "homepage": "https://www.youtube.com/@ChannelHandle",
  "sourceType": "official-platform | official-publisher | editorial | event",
  "defaultTopics": ["PlayStation", "Trailers"],
  "verified": true,
  "enabled": true,
  "priority": 1,
  "accentColor": "#0070D1"
}
```

3. Set `enabled: true` to include it in the next build.
4. Run `npm run build:videos` to fetch and cache the latest videos.

### Finding a YouTube Channel ID

The `providerChannelId` is the `UC...` identifier for a channel, **not** the `@handle`. You can find it:
- Via the YouTube channel page → View source → search for `"channelId"`.
- Using tools like [commentpicker.com/youtube-channel-id.php](https://commentpicker.com/youtube-channel-id.php).

---

## How to Disable a Video Source

Set `"enabled": false` for the source entry in `data/video-sources.json` and re-run the build. The source will be excluded from ingestion and its videos will not appear in the cached output.

```json
{
  "id": "some-source",
  "enabled": false,
  ...
}
```

Alternatively, set `"verified": false` to flag a source as unverified — the source will appear in the transparency section as unverified but can still be enabled.

---

## How Cached Video Data is Generated

Video data is built at **build time** (not at runtime) to keep the website static, fast and privacy-safe.

### Build command

```bash
npm run build:videos
```

This script (`scripts/build-videos.mjs`):
1. Reads `data/video-sources.json` to discover enabled YouTube sources.
2. Fetches each channel's public Atom RSS feed from `https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}`.
3. Parses up to 12 most recent videos per source.
4. Classifies each video's `videoGenre` and `topics` using title/description regex patterns.
5. Deduplicates videos by `providerVideoId`.
6. Sorts all videos newest-first.
7. Writes two static output files:

| File | Purpose |
|------|---------|
| `public/videos.json` | Normalized video entries consumed by the frontend |
| `public/video-health.json` | Per-source health report (online/failed status) |

### Build pipeline integration

`build:videos` is included in the full `npm run build:data` step:

```
build:data → generate-version → build-feed → build-videos → generate-sitemap → generate-seo-content
```

It can also be run standalone:

```bash
npm run build:videos
```

### Normalized video model

Each video entry in `public/videos.json` conforms to:

```json
{
  "id": "yt-{videoId}",
  "contentType": "video",
  "provider": "youtube",
  "providerVideoId": "{videoId}",
  "sourceId": "playstation-yt",
  "sourceName": "PlayStation",
  "sourceType": "official-platform",
  "title": "Gran Turismo 7 — Official Trailer",
  "description": "…",
  "publishedAt": "2026-05-26T12:00:00.000Z",
  "thumbnail": "https://i.ytimg.com/vi/{videoId}/hqdefault.jpg",
  "thumbnailFallback": "https://i.ytimg.com/vi/{videoId}/mqdefault.jpg",
  "duration": null,
  "liveStatus": "none",
  "topics": ["PlayStation"],
  "videoGenre": "trailer",
  "official": true,
  "externalUrl": "https://www.youtube.com/watch?v={videoId}",
  "embedUrl": "https://www.youtube-nocookie.com/embed/{videoId}",
  "bookmarked": false,
  "accentColor": "#0070D1"
}
```

---

## Privacy Behavior of Embedded Playback

Watch Signal is privacy-first. Here is exactly what happens:

| Moment | Behavior |
|--------|---------|
| Page load | **No YouTube iframe is loaded.** Only thumbnails from `i.ytimg.com` are loaded (standard `<img>` tags). |
| Video card hover | **No video preview or autoplay.** The play button glows, the thumbnail scales ≤1.03×. No network request to YouTube. |
| Click "Watch now" or play button | Modal opens. **Still showing only the thumbnail.** No iframe exists yet. |
| User clicks the large play button inside the modal | **Iframe is injected at this point only.** User has given explicit consent to load the player. |
| Iframe URL | Always uses `https://www.youtube-nocookie.com/embed/{videoId}` — the privacy-enhanced YouTube embed that does not set cookies until the user interacts with the player. |
| Autoplay | `autoplay=1` is set because the user has already clicked play. This is user-initiated, not background autoplay. No audio plays without user interaction. |
| Analytics | Fires `video_card_open` when the modal opens, `video_play_started` after play is clicked — both after user consent to analytics (existing consent flow). |
| Iframe removal | When the modal is closed, the iframe is removed from the DOM, stopping all playback and deallocating the player. |

### YouTube nocookie embed

```
https://www.youtube-nocookie.com/embed/{videoId}?autoplay=1&rel=0&modestbranding=1&color=white
```

- `youtube-nocookie.com` — privacy-enhanced mode; no tracking cookies set unless user interacts
- `rel=0` — suppresses related videos from other channels
- `modestbranding=1` — minimal YouTube branding
- No tracking parameters, no `origin`, no `enablejsapi=1` that would allow side-channel calls

---

## Video Genre Classification

Videos are automatically classified at build time using title/description pattern matching:

| Pattern keywords | Genre |
|-----------------|-------|
| "official trailer", "launch trailer", "reveal trailer", "announcement trailer" | `trailer` |
| "gameplay", "gameplay walkthrough", "extended gameplay" | `gameplay` |
| "developer diary", "dev diary", "behind the scenes", "making of" | `developer-diary` |
| "review", "analysis", "performance review", "technical analysis" | `review` |
| "showcase", "Nintendo Direct", "State of Play", "Developer_Direct", "game fest" | `showcase` |
| "tournament", "championship", "finals", "highlights", "esports" | `esports` |
| "interview", "dev talk", "conversation with" | `interview` |

Default genre for official channels when no pattern matches: `trailer`.

---

## Editorial Policy

- Official trailers and showcases may be **prioritised in the featured area because of freshness and relevance — never because of payment**.
- Editorial videos must meet the same trust and quality standards as article sources.
- Sponsored or paid promotional content detected in video descriptions is flagged and deprioritised (same policy as the news feed — see [`docs/feed-selection-criteria.md`](./feed-selection-criteria.md)).
- Source counts displayed on the site are calculated dynamically from `data/video-sources.json` (enabled sources) and `public/video-health.json` at runtime — never hardcoded.

---

## Tests

New tests added for Watch Signal:

| File | Coverage |
|------|---------|
| `tests/unit/videos.test.mjs` | Filter logic, getFeaturedVideo, formatDuration, videoRelTime, GENRE_LABEL |
| `tests/unit/video-filters.test.mjs` | VideoFilters state machine, chip rendering, DEFAULT_FILTERS |
| `tests/dom/video-player.test.js` | Modal open/close, no iframe before play, Escape key, backdrop click, focus restore, privacy-enhanced embed URL |

Run all tests:
```bash
npm test
```

