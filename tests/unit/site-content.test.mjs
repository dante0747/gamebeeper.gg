/**
 * tests/unit/site-content.test.mjs
 * Guards for the homepage markup contract: the source count and Sources section
 * stay in sync with data/feeds.json, JS hooks exist, structured data is valid,
 * and the build-time pre-renderer is idempotent.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { siteStats } from '../../scripts/lib/site-stats.mjs';
import { injectBetween } from '../../scripts/generate-seo-content.mjs';
import { publisherHost } from '../../js/utils.js';

const html  = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
// index.html without the hourly pre-rendered stories (their text changes every build)
const shell = html
  .replace(/<!-- GENERATED_HERO_START -->[\s\S]*?<!-- GENERATED_HERO_END -->/, '')
  .replace(/<!-- GENERATED_LATEST_ARTICLES_START -->[\s\S]*?<!-- GENERATED_LATEST_ARTICLES_END -->/, '');
const feeds = JSON.parse(readFileSync(new URL('../../data/feeds.json', import.meta.url), 'utf8'));

describe('siteStats', () => {
  it('counts publishers, not feeds', () => {
    const stats = siteStats([
      { homepage: 'https://www.ign.com/' },
      { homepage: 'https://www.ign.com/reviews' },
      { homepage: 'https://www.gamespot.com/' },
      { homepage: 'https://kotaku.com/', enabled: false },
    ]);
    expect(stats).toEqual({ feedCount: 3, sourceCount: 2 });
  });

  it('matches the live registry', () => {
    const { feedCount, sourceCount } = siteStats();
    expect(feedCount).toBe(feeds.filter(f => f.enabled !== false).length);
    expect(sourceCount).toBeLessThanOrEqual(feedCount);
  });
});

describe('index.html', () => {
  it('uses the build-time token instead of hard-coded source counts', () => {
    expect(shell).toContain('{{SOURCE_COUNT}}');
    expect(shell).not.toMatch(/\b\d+ trusted (gaming )?sources\b/);
  });

  it('lists every enabled publisher in the Sources section', () => {
    const start = html.indexOf('id="sources"');
    const end   = html.indexOf('id="videoSourcesSection"');
    const section = html.slice(start, end);
    const listed = new Set([...section.matchAll(/href="(https:[^"]+)"/g)].map(m => publisherHost(m[1])));
    const expected = new Set(feeds.filter(f => f.enabled !== false).map(f => publisherHost(f.homepage)));
    const missing = [...expected].filter(h => !listed.has(h));
    expect(missing).toEqual([]);
  });

  it('keeps the element IDs the scripts depend on', () => {
    const ids = [
      'feedGrid', 'mobileFilters', 'statusDot', 'statusText', 'articleCount', 'errorBanner', 'errorMessage',
      'refreshBtnHero', 'refreshIcon', 'gridViewBtn', 'listViewBtn', 'sbFeeds', 'sbUpdated', 'sbFailed',
      'sbBmCount', 'heroFeaturedCard', 'trendingTopicsGrid', 'feedHealthBar', 'articleSearch', 'searchKbd',
      'navSearchBtn', 'savedStoriesBtn', 'navHamburger', 'navDrawer', 'navDrawerBackdrop', 'backToTop',
      'siteVersion', 'statFeeds', 'statToday', 'heroFeedCount', 'feedStatus', 'feedCustomizeSlot',
      'watch', 'watchPreviewSection', 'watchPreviewGrid', 'watchCarouselPrev', 'watchCarouselNext',
      'watchCarouselDots', 'watchCarouselWrap', 'watchFeatured', 'watchFilterGenre', 'watchFilterTopic',
      'watchFilterTrust', 'watchFilterSort', 'watchGrid', 'watchEmpty', 'watchEmptyReset', 'watchError',
      'watchErrorMsg', 'watchStatus', 'watchLibrary', 'watchLibraryToggle', 'feedMore', 'feedMoreBtn',
      'newStoriesPill',
    ];
    const missing = ids.filter(id => !html.includes(`id="${id}"`));
    expect(missing).toEqual([]);
  });

  it('has no duplicate static IDs', () => {
    const all = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
    const dupes = all.filter((id, i) => all.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  it('has exactly one h1', () => {
    expect(html.match(/<h1\b/g)).toHaveLength(1);
  });

  it('ships valid JSON-LD describing GameBeeper, not third-party articles', () => {
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      .map(m => JSON.parse(m[1].replaceAll('{{SOURCE_COUNT}}', '27')));
    const types = blocks.flatMap(b => (b['@graph'] || [b]).map(n => n['@type']));
    expect(types).toEqual(expect.arrayContaining(['WebSite', 'Organization', 'CollectionPage']));
    expect(types).not.toContain('NewsArticle');
    expect(html).not.toContain('schema.org/NewsArticle');
  });

  it('loads Google Analytics only through the consent module', () => {
    expect(html).not.toContain('googletagmanager.com/gtag/js');
  });

  it('keeps the pre-render markers', () => {
    for (const name of ['GENERATED_HERO', 'GENERATED_LATEST_ARTICLES']) {
      expect(html).toContain(`<!-- ${name}_START -->`);
      expect(html).toContain(`<!-- ${name}_END -->`);
    }
  });
});

describe('injectBetween', () => {
  const doc = '<div>\n  <!-- X_START -->\n  old\n  <!-- X_END -->\n</div>';

  it('replaces content between markers and keeps the markers', () => {
    const out = injectBetween(doc, 'X', '<p>new</p>');
    expect(out).toContain('<!-- X_START -->\n<p>new</p>\n  <!-- X_END -->');
    expect(out).not.toContain('old');
  });

  it('is idempotent', () => {
    const once  = injectBetween(doc, 'X', '<p>new</p>');
    const twice = injectBetween(once, 'X', '<p>new</p>');
    expect(twice).toBe(once);
  });

  it('leaves the document alone when markers are missing', () => {
    expect(injectBetween('<div></div>', 'X', 'y')).toBe('<div></div>');
  });
});
