/**
 * scripts/generate-seo-content.mjs
 *
 * Pre-renders the top of the homepage from public/feed.json into index.html:
 *
 *   <!-- GENERATED_HERO_START --> … <!-- GENERATED_HERO_END -->
 *     the hero's "Top story" (the page's LCP image is then in the HTML)
 *
 *   <!-- GENERATED_LATEST_ARTICLES_START --> … <!-- GENERATED_LATEST_ARTICLES_END -->
 *     the first page of the feed, inside #feedGrid
 *
 * The markup comes from the same templates the browser uses (js/cards.js), so
 * crawlers and no-JS visitors see exactly what everyone else sees, and the live
 * render swaps in without layout shift. Stories are third-party articles we link
 * to, so no Article structured data is emitted for them.
 *
 * Run: node scripts/generate-seo-content.mjs
 * Requires Node 18+.
 */

import fs   from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { FEED_PAGE_SIZE } from '../js/config.js';
import { gridCard, heroMarkup } from '../js/cards.js';
import { normaliseCachedArticle } from '../js/feed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

/** Replace everything between two marker comments (markers are kept). */
export function injectBetween(html, name, content) {
  const start = `<!-- ${name}_START -->`;
  const end   = `<!-- ${name}_END -->`;
  const startIdx = html.indexOf(start);
  const endIdx   = html.indexOf(end);
  if (startIdx === -1 || endIdx === -1) {
    console.warn(`[generate-seo-content] ${name} markers not found in index.html — skipped.`);
    return html;
  }
  if (endIdx < startIdx) throw new Error(`Malformed ${name} markers in index.html.`);
  // Keep the end marker's indentation so repeated runs produce stable output.
  const lineStart = html.lastIndexOf('\n', endIdx) + 1;
  const indent = html.slice(lineStart, endIdx);
  return html.slice(0, startIdx + start.length) + '\n' + content.trimEnd() + '\n' + indent + html.slice(endIdx);
}

async function main() {
  const feedPath = path.join(ROOT, 'public', 'feed.json');
  let feedData;
  try {
    feedData = JSON.parse(await fs.readFile(feedPath, 'utf8'));
  } catch {
    console.warn('[generate-seo-content] public/feed.json not found — skipping pre-render.');
    process.exit(0);
  }

  // Mirror js/main.js: normalise, then drop anything without a usable link.
  const articles = (feedData.articles || [])
    .map(normaliseCachedArticle)
    .filter(a => a.link && a.link !== '#');
  if (articles.length === 0) {
    console.warn('[generate-seo-content] No articles found in feed.json — skipping.');
    process.exit(0);
  }

  const opts = { static: true };
  const hero = heroMarkup(articles, opts);
  const cards = articles.slice(0, FEED_PAGE_SIZE).map((a, i) => gridCard(a, i, opts)).join('');

  const indexPath = path.join(ROOT, 'index.html');
  let html = await fs.readFile(indexPath, 'utf8');
  html = injectBetween(html, 'GENERATED_HERO', hero);
  html = injectBetween(html, 'GENERATED_LATEST_ARTICLES', cards);

  // Keep the page's JSON-LD dateModified current.
  const today = new Date().toISOString().slice(0, 10);
  html = html.replace(/"dateModified":\s*"\d{4}-\d{2}-\d{2}"/, `"dateModified": "${today}"`);

  await fs.writeFile(indexPath, html, 'utf8');
  console.log(`[generate-seo-content] ✓ Pre-rendered hero + ${Math.min(articles.length, FEED_PAGE_SIZE)} stories into index.html.`);
}

// Only run when executed directly (the helper above is unit-tested).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(err => { console.error('[generate-seo-content] ✗', err); process.exit(1); });
}
