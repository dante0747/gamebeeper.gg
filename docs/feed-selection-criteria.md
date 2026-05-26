# GameBeeper Feed Selection Criteria

This document explains how RSS feeds are selected for inclusion in GameBeeper and how the list is maintained over time.

---

## What GameBeeper aggregates

GameBeeper aggregates **publicly available RSS/Atom feeds** from established video game news sources. The goal is a curated, high signal-to-noise reading experience for gamers — covering PlayStation, Xbox, Nintendo, PC Gaming, Indie, Reviews, Trailers, Esports, Industry, and Hardware.

---

## Inclusion criteria

A feed must meet **all** of the following criteria to be included:

| Criterion | Requirement |
|---|---|
| **Relevance** | Content is primarily about video games, gaming hardware, esports, or the games industry. |
| **Quality** | Articles are substantive — not clickbait, link-farm, or SEO-farm content. |
| **Accessibility** | Articles are freely readable without a paywall or mandatory registration. |
| **RSS availability** | The source publishes a working, standards-compliant RSS or Atom feed. |
| **Reliability** | The feed has been active for at least 6 months and publishes at least once per month. |
| **No SEO farms** | The source is not primarily a content-marketing or growth-hacking operation. |
| **Low sponsored ratio** | Less than ~20% of recent posts are sponsored/promotional content. GameBeeper additionally filters out sponsored posts automatically (see below). |

---

## Sponsored content filtering

GameBeeper applies an automatic keyword filter (`SPONSORED_RE` in `js/config.js`) at both **build time** (SEO fallback) and **runtime** (client-side rendering). Any article whose title or summary matches patterns like `sponsored`, `partner content`, `promoted`, `advertorial`, `webinar`, or `webcast` is silently excluded from the feed.

This does not guarantee 100% removal of promotional content — it is a best-effort filter. If you spot a sponsored article that slipped through, please [open an issue](https://github.com/dante0747/GameBeeper.gg/issues/new).

---

## Feed tiers

Feeds are informally categorised by tier:

| Tier | Description | Examples |
|---|---|---|
| **Official** | Published by the platform holder or game publisher. | PlayStation Blog, Xbox Wire |
| **Dedicated** | Publication exclusively covering one platform or gaming topic. | Nintendo Life, Push Square, Pure Xbox, PCGamesN |
| **Independent** | Established independent gaming journalism outlets. | Eurogamer, IGN, GameSpot, Polygon, Kotaku, Destructoid |
| **Industry** | Trade press and industry analysts covering the business of games. | GamesIndustry.biz |
| **News** | Fast-moving gaming news desks. | VGC, Gematsu, Dot Esports |

---

## How often the list is reviewed

The feed list (`data/feeds.json`) is reviewed:

- **On every PR** that adds or modifies a feed entry — a maintainer checks the feed URL, recent content quality, and sponsored ratio.
- **Quarterly** — a bulk pass to check for dead feeds, quality degradation, or relevance drift.
- **On community reports** — if a feed is reported as broken or low-quality via a GitHub issue, it is reviewed within a few days.

---

## How to nominate a new feed

1. Check that the feed meets all inclusion criteria above.
2. [Open a GitHub Issue](https://github.com/dante0747/GameBeeper.gg/issues/new) with:
   - The feed name and website URL
   - The RSS/Atom feed URL
   - The gaming category it belongs to (Latest, PlayStation, Xbox, Nintendo, PC, Indie, Reviews, Trailers, Esports, Industry, or Hardware)
   - A brief reason why it belongs in GameBeeper
3. Or open a Pull Request that adds the feed to `data/feeds.json` — follow the existing format.

---

## How to report a feed

If a feed is broken, consistently publishing low-quality content, or has changed its editorial direction, please [open a GitHub issue](https://github.com/dante0747/GameBeeper.gg/issues/new) with the feed name and a brief description of the issue.

---

## Removal policy

A feed may be removed if it:
- Has been unreachable for more than 30 days
- Starts publishing primarily paywalled or sponsored content
- Is no longer relevant to the gaming audience
- Requests removal

Removal requests from the feed publisher are honoured promptly. Contact [abarghooeimajid@gmail.com](mailto:abarghooeimajid@gmail.com).
