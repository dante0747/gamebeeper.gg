/**
 * scripts/lib/site-stats.mjs
 *
 * Derives the public "how many sources" numbers from data/feeds.json so every
 * surface (hero, meta tags, JSON-LD, About copy) states the same figure.
 *
 *   feedCount   – enabled RSS/Atom feeds (e.g. IGN + IGN Reviews = 2 feeds)
 *   sourceCount – distinct publishers behind those feeds (IGN = 1 source)
 */

import { readFileSync } from 'node:fs';
import { publisherHost } from '../../js/utils.js';

const FEEDS_URL = new URL('../../data/feeds.json', import.meta.url);

export function siteStats(feeds = JSON.parse(readFileSync(FEEDS_URL, 'utf8'))) {
  const enabled = feeds.filter(f => f.enabled !== false);
  const publishers = new Set(enabled.map(f => publisherHost(f.homepage || f.url)).filter(Boolean));
  return { feedCount: enabled.length, sourceCount: publishers.size };
}
