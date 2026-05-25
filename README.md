<div align="center">

```
 ██████+  █████+ ███+   ███+███████+██████+ ███████+███████+██████+ ███████+██████+ 
██+====+ ██+==██+████+ ████|██+====+██+==██+██+====+██+====+██+==██+██+====+██+==██+
██|  ███+███████|██+████+██|█████+  ██████++█████+  █████+  ██████++█████+  ██████++
██|   ██|██+==██|██|+██++██|██+==+  ██+==██+██+==+  ██+==+  ██+===+ ██+==+  ██+==██+
+██████++██|  ██|██| +=+ ██|███████+██████++███████+███████+██|     ███████+██|  ██|
 +=====+ +=+  +=++=+     +=++======++=====+ +======++======++=+     +======++=+  +=+
```

**All the games worth watching. One signal.**

[![Live](https://img.shields.io/badge/status-live-39d353?style=flat-square&logo=statuspage&logoColor=black)](https://GameBeeper.gg)
[![Feeds](https://img.shields.io/badge/RSS_feeds-26-58c8ff?style=flat-square&logo=rss&logoColor=black)](https://GameBeeper.gg)
[![Paywalls](https://img.shields.io/badge/paywalls-0-39d353?style=flat-square)](https://GameBeeper.gg)
[![No Ad Trackers](https://img.shields.io/badge/ad_trackers-none-ff5555?style=flat-square)](https://GameBeeper.gg)
[![No Ads](https://img.shields.io/badge/ads-nope-bc8cff?style=flat-square)](https://GameBeeper.gg)
[![Tests](https://img.shields.io/badge/tests-passing-39d353?style=flat-square&logo=vitest&logoColor=black)](./tests)

> *Video game news aggregated from 19 trusted gaming sources — one fast, clean, distraction-free feed.*

</div>

---

> **Forked from [geekspulse.dev](https://geekspulse.dev)** — a developer news aggregator by the same author, repurposed for video game news.

---

## 📡 What Is GameBeeper?

GameBeeper is a free, open-source video game news aggregator. A Node.js pipeline fetches and normalises RSS feeds from 19 trusted gaming sources into static JSON files; the frontend renders from that cache for instant, reliable loads.

It covers **PlayStation, Xbox, Nintendo, PC Gaming, Indie, Reviews, Trailers & Reveals, Esports, Industry, and Hardware** — sorted newest-first, no algorithm, no ads, no paywalls.

- 🚫 **No ads.** No VC money. No ad trackers.
- ⚡ **Static hosting.** Plain HTML/CSS/JS — no application server required.
- 🔓 **No paywalls.** Every article links directly to the publisher.
- 🧠 **No framework bloat.** Clean, fast, modern vanilla web.

---

## ✨ Features

| Feature | Details |
|---|---|
| 📡 **19 Gaming Feeds** | Hand-curated from official platforms, independent outlets, and industry reporters |
| 🗂️ **11 Categories** | Latest · PlayStation · Xbox · Nintendo · PC Gaming · Indie · Reviews · Trailers · Esports · Industry · Hardware |
| 🤖 **AI Summaries** | On-demand article summaries via pre-cached snippets or local Ollama fallback |
| ⚡ **Static Cache** | Articles pre-built by a Node.js pipeline; browser loads JSON instantly |
| 🔄 **Auto-Refresh** | Configurable: 1m · 5m · 10m · 15m · 30m · 1h |
| 🃏 **Grid & List View** | Toggle between layouts, preference saved locally |
| 💾 **localStorage Prefs** | Filter, view mode & refresh interval persist across sessions (`gs:` namespace) |
| 💀 **Skeleton Loaders** | Shimmer placeholders while feeds are loading |
| 🎮 **Gaming Editorial UI** | Dark theme, neon glows, animated signal indicator, Chakra Petch display font |
| ♿ **Accessible** | ARIA roles, labels, `aria-pressed`, keyboard navigation, `prefers-reduced-motion` |
| 📱 **Responsive** | Mobile-first with chip filters and a hamburger drawer on small screens |
| 🔖 **Bookmarks** | Save articles to localStorage for later reading |
| ⌨️ **Keyboard Shortcuts** | `/` search · `j/k` navigate · `o` open · `r` refresh · `Esc` clear |
| 🏥 **Feed Health Panel** | Live status: last updated time, online/failed feed counts |
| ⏱️ **Reading Time** | Estimated read time displayed on every article card |
| 🔗 **Share Articles** | Web Share API with automatic clipboard fallback |

---

## 🗞️ Feed Sources

<details>
<summary><strong>📡 Latest (General Gaming)</strong></summary>

- [VGC](https://www.videogameschronicle.com/)
- [Gematsu](https://www.gematsu.com/)
- [Eurogamer](https://www.eurogamer.net/)
- [IGN](https://www.ign.com/)
- [GameSpot](https://www.gamespot.com/)
- [Destructoid](https://www.destructoid.com/)
- [Polygon](https://www.polygon.com/)
- [Kotaku](https://kotaku.com/)
- [TheGamer](https://www.thegamer.com/)

</details>

<details>
<summary><strong>🎮 PlayStation</strong></summary>

- [PlayStation Blog](https://blog.playstation.com/) *(Official)*
- [Push Square](https://www.pushsquare.com/)

</details>

<details>
<summary><strong>🟢 Xbox</strong></summary>

- [Xbox Wire](https://news.xbox.com/) *(Official)*
- [Pure Xbox](https://www.purexbox.com/)

</details>

<details>
<summary><strong>🔴 Nintendo</strong></summary>

- [Nintendo Life](https://www.nintendolife.com/)
- [Nintendo Everything](https://nintendoeverything.com/)

</details>

<details>
<summary><strong>🖥️ PC Gaming</strong></summary>

- [PC Gamer](https://www.pcgamer.com/)
- [Rock Paper Shotgun](https://www.rockpapershotgun.com/)
- [PCGamesN](https://www.pcgamesn.com/)

</details>

<details>
<summary><strong>🏢 Industry</strong></summary>

- [GamesIndustry.biz](https://www.gamesindustry.biz/)

</details>

---

## 🧪 Testing

GameBeeper has a full layered test suite that runs in CI on every push before any deploy can happen.

### Stack

| Tool | Role |
|---|---|
| [Vitest](https://vitest.dev) | Unit, integration & DOM component tests |
| [happy-dom](https://github.com/capricorn86/happy-dom) | Lightweight DOM environment for browser-side tests |
| [Playwright](https://playwright.dev) | End-to-end smoke tests (Chromium) |
| [@vitest/coverage-v8](https://vitest.dev/guide/coverage) | V8-based coverage with per-file thresholds |

### Commands

```bash
# Run all unit, integration & DOM tests
npm test

# Run in watch mode during development
npm run test:watch

# Run with coverage report (outputs to coverage/)
npm run test:coverage

# Run end-to-end smoke tests (~25s — starts Vite dev server automatically)
npm run test:e2e

# Open Playwright UI runner
npm run test:e2e:ui
```

### Test layout

```
tests/
  unit/
    utils.test.mjs           ← scripts/lib/utils.mjs
    browser-utils.test.js    ← js/utils.js
    storage.test.js          ← js/storage.js
    classifier.test.mjs      ← scripts/lib/classifier.mjs  (gaming categories)
    sponsored.test.mjs       ← scripts/lib/sponsored.mjs
  integration/
    parser.test.mjs          ← scripts/lib/parser.mjs
    build-feed.test.mjs      ← pipeline dedup, sort, cap
  dom/
    cards.test.js            ← js/cards.js  (happy-dom)
  e2e/
    smoke.spec.js            ← Playwright full-browser
  fixtures/
    rss-valid.xml / rss-encoded-content.xml / rss-single-item.xml / rss-empty.xml
    atom-valid.xml / atom-alternate-link.xml
```

### CI pipeline

```
push / schedule
    |
    ▼
 test job  — npm test (Vitest)
    |  needs: test
    ▼
 build job — Ollama LLM classification + feed data + GitHub Pages deploy
    |  needs: build  (main branch only)
    ▼
 e2e job   — npm run test:e2e (Playwright smoke tests)
              +- report uploaded as CI artifact (7-day retention)
```

A failing unit or integration test **blocks the entire pipeline** — no bad code can reach production.

---

## 🏗️ Architecture

```js
const architecture = {
  hosting:      "Static files — no application server required",
  markup:       "HTML5",           // semantic, accessible
  styles:       "Vanilla CSS",     // custom properties, animations, grid
  logic:        "Vanilla JS",      // ES2022+ native ES modules
  modules:      "js/ — focused ES modules loaded via <script type=\"module\">",
  fonts:        ["Chakra Petch", "Oxanium", "Inter", "JetBrains Mono"],
  feedPipeline: "Node.js (scripts/build-feed.mjs + scripts/lib/*.mjs)",
  bundler:      "Vite 6",          // dev server + production build
  storage:      "localStorage",   // preferences & bookmarks  (gs: namespace)
  deps:         ["fast-xml-parser", "ollama"], // build-time only
  devDeps:      ["vite", "vitest", "happy-dom", "@playwright/test", "@vitest/coverage-v8"],
  analytics:    "Google Analytics (consent-gated, anonymised IP)",
};
```

The frontend's primary data source is `public/feed.json`. If that file is missing or stale, the app silently falls back to fetching RSS feeds directly via browser-side CORS proxies — emergency path only.

---

## ⚙️ Feed Pipeline

The `scripts/build-feed.mjs` script pre-fetches all gaming RSS feeds and writes a static JSON cache to `public/`. GitHub Actions runs this **every hour** on a schedule.

```bash
# Install dependencies
npm install

# Fetch all feeds → public/feed.json + public/feed-health.json
npm run build:feed

# Regenerate sitemap.xml
npm run build:sitemap

# Inject latest articles into index.html for SEO crawlers
npm run build:seo

# Write public/version.json
npm run build:version

# Run the full pipeline (data + Vite production build)
npm run build
```

---

## 📂 Project Structure

```
GameBeeper.gg/
+-- index.html               Main page
+-- styles.css               GameBeeper design system
+-- privacy.html             Privacy policy
+-- terms.html               Terms of use
+-- favicon.svg              Signal-wave emblem
+-- og-image.png             1200×630 social preview
+-- CNAME                    GameBeeper.gg
|
+-- js/                      Browser ES modules
|   +-- main.js              App entry-point
|   +-- config.js            Brand constants + gaming categories
|   +-- cards.js             Card HTML generation
|   +-- feed.js              Feed fetching + rendering
|   +-- feeds-registry.js    Source registry
|   +-- storage.js           localStorage (gs: namespace)
|   +-- settings-panel.js    Settings popover
|   +-- pulse-panel.js       "My Signal" filter drawer
|   +-- summary.js           AI summary modal
|   +-- images.js            Lazy image loading
|   +-- utils.js             Escape, formatting helpers
|   +-- analytics.js         GA4 consent wrapper
|   +-- consent.js           Cookie consent banner
|
+-- scripts/                 Node.js build pipeline
|   +-- build-feed.mjs       Main feed builder
|   +-- generate-sitemap.mjs Sitemap generator
|   +-- generate-seo-content.mjs SEO fallback injector
|   +-- generate-version.mjs public/version.json writer
|   +-- lib/
|       +-- config.mjs       Gaming categories, keywords, USER_AGENT
|       +-- classifier.mjs   Keyword + LLM gaming classifier
|       +-- parser.mjs       RSS/Atom parser
|       +-- pipeline.mjs     Dedup, sort, cap
|       +-- images.mjs       Image extraction + validation
|       +-- summarizer.mjs   AI snippet/summary generation
|       +-- sponsored.mjs    Sponsored-post filter
|       +-- utils.mjs        Shared utilities
|
+-- data/
|   +-- feeds.json           19 enabled gaming RSS sources
|
+-- public/                  Generated + static assets
|   +-- feed.json            Pre-built article cache
|   +-- feed-health.json     Feed status metadata
|   +-- version.json         Build timestamp
|   +-- manifest.json        PWA manifest
|   +-- sw.js                Service worker
|
+-- assets/fallbacks/        Animated SVG category placeholders (gaming only)
|
+-- tests/                   Full test suite (Vitest + Playwright)
+-- .github/workflows/
    +-- build-feed.yml       Hourly feed refresh + Pages deploy
    +-- ci.yml               PR/push build + audit gate
```

---

## 🔑 Category Classification

The classifier (`scripts/lib/classifier.mjs`) uses a two-tier approach:

1. **Keyword tier** — instant, deterministic, no dependencies. Regex patterns per category with documented precedence:
   `PlayStation → Xbox → Nintendo → PC → Indie → Reviews → Trailers → Esports → Hardware → Industry → Latest`

2. **LLM tier** — optional Ollama (`llama3.2:1b`) for ambiguous cases when `USE_LLM=1` is set in the environment (used in GitHub Actions).

**Precedence rules:**
- Articles from official platform feeds (PlayStation Blog, Xbox Wire) trust their feed's category directly — no reclassification.
- "Xbox Game Pass release arrives on PC" → Xbox (platform announcement wins).
- "Nintendo Direct reveals indie lineup" → Nintendo (first-party event wins).
- "PlayStation studio layoffs" → Industry (layoffs/acquisitions win when the primary subject).

---

## 🚀 Local Development

```bash
git clone https://github.com/dante0747/GameBeeper.gg.git
cd GameBeeper.gg
npm install

# Start Vite dev server (reads existing public/feed.json)
npm run dev

# Rebuild the feed cache first if needed
npm run build:feed && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## 📝 Adding a Gaming Source

1. Verify the RSS/Atom URL returns valid gaming content (use `npm run build:feed`).
2. Add an entry to `data/feeds.json`:
   ```json
   { "id": "my-source", "name": "My Source", "url": "https://example.com/feed/",
     "homepage": "https://example.com/", "category": "Latest", "enabled": true }
   ```
3. Set `"category"` to the feed's primary gaming category. Use `"Latest"` for general gaming outlets so articles are classified per-article by keyword/LLM. Use a specific category only for dedicated outlets (e.g., `"PlayStation"` for PlayStation Blog).
4. Run `npm run build:feed` and verify the articles are relevant gaming content.
5. Open a PR with your change.

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for bug reports, feed suggestions, and pull request workflow.

---

## Repository Metadata

**Description:**
All the games worth watching. One signal. — a fast, open-source video game news aggregator.

**Website:**
https://GameBeeper.gg/

**Suggested topics:**
`video-game-news` `rss` `news-aggregator` `javascript` `static-site` `open-source` `gaming` `playstation` `xbox` `nintendo` `pc-gaming`

---

<div align="center">

**© 2026 GameBeeper** — No ads. No paywalls. No ad trackers.

*All the games worth watching. One signal.*

</div>

