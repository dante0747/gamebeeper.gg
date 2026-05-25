/**
 * scripts/build-feed.mjs
 *
 * Entry point â€” orchestrates the feed build pipeline.
 *
 * Fetches all enabled RSS/Atom feeds from data/feeds.json,
 * normalises articles, deduplicates, and writes:
 *   public/feed.json        â€” full article cache consumed by the browser
 *   public/feed-health.json â€” per-feed health report
 *
 * Run: node scripts/build-feed.mjs
 * Requires Node 18+ (native fetch + crypto).
 *
 * Module layout:
 *   lib/config.mjs      â€” constants, regex patterns, XML parser
 *   lib/utils.mjs       â€” pure helpers, streamHtml
 *   lib/ai.mjs          â€” Ollama client + shared AI cache
 *   lib/classifier.mjs  â€” keyword + LLM category classification
 *   lib/sponsored.mjs   â€” regex + LLM sponsored content detection
 *   lib/summarizer.mjs  â€” LLM article summarization
 *   lib/images.mjs      â€” image extraction + og:image resolution
 *   lib/parser.mjs      â€” RSS/Atom parsing + feed fetching
 *   lib/pipeline.mjs    â€” article set helpers + pipeline pass functions
 */

import fs   from 'node:fs/promises';
import path from 'node:path';

import { ROOT, MIN_PER_CATEGORY, MAX_PER_CATEGORY } from './lib/config.mjs';
import { newestFirst }    from './lib/utils.mjs';
import { initOllama }     from './lib/ai.mjs';
import { fetchOneFeed }   from './lib/parser.mjs';
import {
  deduplicateArticles,
  guaranteeCategoryRepresentation,
  capByCategory,
  runClassificationPass,
  runSponsoredDetectionPass,
  runSummarizationPass,
  runImageResolutionPass,
} from './lib/pipeline.mjs';

// â”€â”€ Output writers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function writeOutputFiles(publicDir, feedJson, healthJson) {
  await fs.mkdir(publicDir, { recursive: true });
  await fs.writeFile(path.join(publicDir, 'feed.json'),        JSON.stringify(feedJson,   null, 2), 'utf8');
  await fs.writeFile(path.join(publicDir, 'feed-health.json'), JSON.stringify(healthJson, null, 2), 'utf8');
}

async function patchReadme(rootDir, feedCount) {
  const readmePath = path.join(rootDir, 'README.md');
  try {
    let readme = await fs.readFile(readmePath, 'utf8');
    readme = readme
      .replace(/RSS_feeds-\d+-/,                            `RSS_feeds-${feedCount}-`)
      .replace(/# \d+ feeds Â· 0 paywalls Â· 100% signal/,    `# ${feedCount} feeds Â· 0 paywalls Â· 100% signal`);
    await fs.writeFile(readmePath, readme, 'utf8');
    console.log(`[build-feed] README badge updated to ${feedCount} feeds.`);
  } catch (e) {
    console.warn('[build-feed] Could not patch README badge:', e.message);
  }
}

// â”€â”€ Main â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function main() {
  await initOllama();

  // â”€â”€ 1. Fetch all feeds â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const feedDefs = JSON.parse(await fs.readFile(path.join(ROOT, 'data', 'feeds.json'), 'utf8'));
  const enabled  = feedDefs.filter(f => f.enabled !== false);
  console.log(`[build-feed] Fetching ${enabled.length} feedsâ€¦`);

  const results     = await Promise.allSettled(enabled.map(fetchOneFeed));
  const allArticles = [];
  const health      = [];

  for (const result of results) {
    if (result.status === 'rejected') continue;
    const { feed, articles, ok, error } = result.value;
    health.push({
      id: feed.id, name: feed.name, category: feed.category,
      ok, error: error || null, count: articles.length,
      fetchedAt: new Date().toISOString(),
    });
    if (ok) allArticles.push(...articles);
    console.log(`  ${ok ? 'âœ“' : 'âœ—'} ${feed.name} â€” ${articles.length} articles${ok ? '' : ` (${error})`}`);
  }

  // â”€â”€ 2. Deduplicate â†’ sort â†’ guarantee category representation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const deduped  = deduplicateArticles(allArticles).sort(newestFirst);
  const balanced = guaranteeCategoryRepresentation(deduped, MIN_PER_CATEGORY).sort(newestFirst);

  // â”€â”€ 3. Classify (keyword always runs; LLM when Ollama is available) â”€â”€â”€â”€â”€â”€â”€â”€
  await runClassificationPass(balanced);

  // â”€â”€ 4. Cap over-represented categories (after classification is final) â”€â”€â”€â”€â”€â”€
  const articles = capByCategory(balanced, MAX_PER_CATEGORY);
  const dropped  = balanced.length - articles.length;
  if (dropped > 0) {
    console.log(`[build-feed] Category cap: dropped ${dropped} over-represented articles (max ${MAX_PER_CATEGORY} per category).`);
  }

  // â”€â”€ 5. AI passes: sponsored detection â†’ summarization â†’ image resolution â”€â”€â”€
  await runSponsoredDetectionPass(articles);
  await runSummarizationPass(articles);
  await runImageResolutionPass(articles);

  // â”€â”€ 6. Write output files â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const successCount = health.filter(h => h.ok).length;
  const failedCount  = health.filter(h => !h.ok).length;

  await writeOutputFiles(path.join(ROOT, 'public'), {
    generatedAt:  new Date().toISOString(),
    feedCount:    enabled.length,
    articleCount: articles.length,
    successFeeds: successCount,
    failedFeeds:  failedCount,
    articles,
  }, {
    generatedAt: new Date().toISOString(),
    feeds: health,
  });

  await patchReadme(ROOT, enabled.length);

  console.log(`\n[build-feed] Done. ${articles.length} articles from ${successCount}/${enabled.length} feeds.`);
  console.log(`  Wrote public/feed.json and public/feed-health.json`);
}

main().catch(err => { console.error('[build-feed] Fatal:', err); process.exit(1); });


