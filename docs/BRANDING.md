# GameBeeper brand and marketing kit

## Identity

**Gaming news, minus the noise.**

A lime gamepad sending a broadcast signal, inside a chamfered arcade tile. The mark combines the two halves of GameBeeper: games and a signal worth checking. Use the vector master at `public/brand/logo.svg`. The website uses this same file in every header and footer.

Colors: void `#09090C`, signal lime `#C8FF3D`, white `#F6F6F8`, muted text `#BDBDCB`. Cyan and violet are supporting accents. Keep space around the mark equal to at least one quarter of its width. Don't stretch it, rotate it in static artwork, recolor it, or add a glow to the mark itself.

## Ready-to-use assets

| Asset | Path | Size / use |
| --- | --- | --- |
| Vector logo | `public/brand/logo.svg` | Any size |
| Dark-background wordmark | `public/brand/wordmark.svg` | Website, media kit |
| Light-background wordmark | `public/brand/wordmark-light.svg` | Documents, press |
| Profile avatar | `public/brand/avatar.png` | 1024 × 1024 |
| Link preview | `public/og-image-v2.png` | 1200 × 630 |
| Square social post | `public/brand/social-square.png` | 1080 × 1080 |
| Social banner | `public/brand/social-banner.png` | 1500 × 500; check each platform's avatar crop |
| Browser icons | `public/favicon.svg`, `public/favicon-16.png`, `public/favicon-32.png` | Browser tabs |
| App icons | `public/icon-192.png`, `public/icon-512.png` | Installable web app |
| Maskable app icon | `public/icon-maskable-512.png` | Padded for launcher masks |
| Apple touch icon | `public/apple-touch-icon.png` | 180 × 180 |

The social image uses a new filename so previously cached link previews can fetch the new artwork after deployment. Existing posts may need a platform-specific preview refresh. The app manifest deliberately does not label the marketing graphic as an application screenshot.

## Copy

**Short description / social bio**

Gaming news, minus the noise. News, reviews, reveals and trailers in one free, ad-free feed. Newest first. Straight from the source.

**Launch post**

Your gaming catch-up, all in one place. GameBeeper brings news, reviews, reveals and trailers from gaming publications into one feed. Filter by platform, save stories and watch trailers. Free, ad-free and open source. Explore the feed: https://gamebeeper.gg/

**Long description**

GameBeeper is an independent video game news aggregator for players who want to catch up without checking dozens of sites. It brings headlines, reviews, reveals and trailers from gaming publications and official platform blogs into one chronological feed. Explore PlayStation, Xbox, Nintendo, PC and indie stories, save articles for later and watch trailers. Every story links to its original publisher. GameBeeper is free, ad-free and open source; linked publishers may have ads or paywalls.

**Calls to action:** Explore the feed · Watch trailers · See all sources · Save a story · Keep the signal running

**Image alt text:** GameBeeper's lime gamepad and broadcast signal logo. Gaming news, minus the noise. One feed, straight from the source.

Use build-time source counts on the website; avoid fixed counts in reusable graphics. Don't promise unrestricted access to publishers, guaranteed coverage, or a social account that has not been confirmed.

## Rebuilding

Run `npm ci`, then `npm run build:brand`. The script rasterizes the vector master and composites exact text over `public/brand/signal-background.png`. Generated exports are committed and ship through Vite's public directory; ordinary builds don't call an image service. Run `npm run build:app` to build the site with the current feed data.

The signal artwork was generated with the built-in imagegen tool. The logo and typography are editable SVG/code assets. Final generation prompt:

> Use case: ads-marketing. Asset type: abstract background artwork for GameBeeper.gg social sharing card. Brand context: independent video game news aggregator with arcade broadcast style, void black #09090C, electric lime #C8FF3D, tiny cyan and violet accents. Create a premium minimal wide landscape 1.905:1 graphic: deep nearly black backdrop, luminous lime angular signal trails and broadcast rings concentrated in the RIGHT third, subtle CRT scanlines, faint perspective grid, a few tiny squared pixels suggesting an arcade transmission. LEFT two thirds must be very dark calm negative space for later typography. Flat graphic design with very controlled restrained glow, crisp geometric edges, mature esports editorial aesthetic. No lettering, no words, no logos, no controllers, no people, no watermark. Canvas 1200 by 630 proportions.
