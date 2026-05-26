/**
 * build-videos.mjs — GameBeeper Watch Signal ingestion
 *
 * Fetches the latest videos from each source defined in data/video-sources.json.
 *
 * Strategy (MVP — no YouTube API key required):
 *   Uses YouTube's public Atom RSS feeds:
 *   https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}
 *
 * Output:
 *   public/videos.json      — normalized video entries consumed by the frontend
 *   public/video-health.json — per-source health report
 *
 * Usage:
 *   node scripts/build-videos.mjs
 *
 * Environment variables (optional, for enhanced mode):
 *   YOUTUBE_API_KEY — enables rich metadata: duration, live status, description
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const SOURCES_PATH = resolve(ROOT, 'data/video-sources.json');
const OUT_DIR      = resolve(ROOT, 'public');
const VIDEOS_OUT   = resolve(OUT_DIR, 'videos.json');
const HEALTH_OUT   = resolve(OUT_DIR, 'video-health.json');

const MAX_PER_SOURCE = 12;
const FETCH_TIMEOUT_MS = 10_000;

// ── Classification helpers ────────────────────────────────────────────────────

const GENRE_PATTERNS = [
  { pattern: /\b(official[ -]?trailer|launch[ -]?trailer|reveal[ -]?trailer|announcement[ -]?trailer|gameplay[ -]?trailer|cinematic[ -]?trailer)\b/i, genre: 'trailer' },
  { pattern: /\b(gameplay|gameplay[ -]?walkthrough|extended[ -]?gameplay|first[ -]?gameplay|combat[ -]?showcase)\b/i, genre: 'gameplay' },
  { pattern: /\b(developer[ -]?diary|dev[ -]?diary|behind[ -]?the[ -]?scenes|making[ -]?of|devlog)\b/i, genre: 'developer-diary' },
  { pattern: /\b(review|analysis|performance[ -]?review|technical[ -]?analysis|digital[ -]?foundry)\b/i, genre: 'review' },
  { pattern: /\b(showcase|Nintendo[ -]?Direct|State[ -]?of[ -]?Play|Xbox[ -]?Showcase|Developer[ -]?Direct|game[ -]?fest)\b/i, genre: 'showcase' },
  { pattern: /\b(tournament|championship|finals|highlights|esports|pro[ -]?league)\b/i, genre: 'esports' },
  { pattern: /\b(interview|dev[ -]?talk|conversation[ -]?with|sits[ -]?down[ -]?with)\b/i, genre: 'interview' },
];

function classifyGenre(title, description = '') {
  const text = `${title} ${description}`;
  for (const { pattern, genre } of GENRE_PATTERNS) {
    if (pattern.test(text)) return genre;
  }
  return 'trailer'; // default for official channels
}

const TOPIC_PATTERNS = [
  { pattern: /\b(playstation|ps5|ps4|sony)\b/i,           topic: 'PlayStation' },
  { pattern: /\b(xbox|game[ -]?pass|microsoft)\b/i,       topic: 'Xbox' },
  { pattern: /\b(nintendo|switch|mario|zelda|pokemon)\b/i, topic: 'Nintendo' },
  { pattern: /\b(pc|steam|valve|windows[ -]?game)\b/i,    topic: 'PC' },
  { pattern: /\b(indie|devlog|small[ -]?developer)\b/i,   topic: 'Indie' },
  { pattern: /\b(review|analysis|score)\b/i,              topic: 'Reviews' },
  { pattern: /\b(esports|tournament|competitive)\b/i,     topic: 'Esports' },
  { pattern: /\b(hardware|gpu|fps|performance)\b/i,       topic: 'Hardware' },
];

function classifyTopics(title, description = '', sourceTopics = []) {
  const topics = [...sourceTopics];
  const text = `${title} ${description}`;
  for (const { pattern, topic } of TOPIC_PATTERNS) {
    if (pattern.test(text) && !topics.includes(topic)) {
      topics.push(topic);
    }
  }
  return topics.slice(0, 4);
}

// ── YouTube Atom RSS parsing ──────────────────────────────────────────────────

function parseAtomFeed(xml, source) {
  const videos = [];

  // Extract <entry> blocks
  const entryRx = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRx.exec(xml)) !== null) {
    const entry = m[1];

    const videoId    = (entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)    || [])[1] || null;
    const title      = decodeHtmlEntities((entry.match(/<title>(.*?)<\/title>/)         || [])[1] || '');
    const published  = (entry.match(/<published>(.*?)<\/published>/)        || [])[1] || null;
    const updated    = (entry.match(/<updated>(.*?)<\/updated>/)            || [])[1] || null;
    const description= decodeHtmlEntities((entry.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1] || '');

    // Thumbnail — prefer highest res
    const thumbHq    = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const thumbMq    = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

    if (!videoId || !title) continue;

    const genre  = classifyGenre(title, description);
    const topics = classifyTopics(title, description, source.defaultTopics || []);

    videos.push({
      id:              `yt-${videoId}`,
      contentType:     'video',
      provider:        'youtube',
      providerVideoId: videoId,
      sourceId:        source.id,
      sourceName:      source.displayName,
      sourceType:      source.sourceType,
      title,
      description:     description.slice(0, 300),
      publishedAt:     published || updated || new Date().toISOString(),
      thumbnail:       thumbHq,
      thumbnailFallback: thumbMq,
      duration:        null, // populated by YouTube API when available
      liveStatus:      'none',
      topics,
      videoGenre:      genre,
      official:        source.sourceType === 'official-platform' || source.sourceType === 'official-publisher',
      externalUrl:     `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl:        `https://www.youtube-nocookie.com/embed/${videoId}`,
      bookmarked:      false,
      accentColor:     source.accentColor || null,
    });
  }

  return videos;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchWithTimeout(url, ms = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const resp = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'GameBeeper/1.0 (+https://gamebeeper.gg)' } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchSourceVideos(source) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${source.providerChannelId}`;
  const xml = await fetchWithTimeout(feedUrl);
  const videos = parseAtomFeed(xml, source);
  return videos.slice(0, MAX_PER_SOURCE);
}

// ── Main ingestion pipeline ───────────────────────────────────────────────────

async function run() {
  console.log('[build-videos] Starting Watch Signal video ingestion…');

  let sources;
  try {
    sources = JSON.parse(readFileSync(SOURCES_PATH, 'utf8'));
  } catch (e) {
    console.error('[build-videos] Failed to read video sources:', e.message);
    process.exit(1);
  }

  const enabledSources = sources.filter(s => s.enabled !== false && s.provider === 'youtube');
  console.log(`[build-videos] Processing ${enabledSources.length} enabled sources…`);

  const allVideos = [];
  const healthEntries = [];

  await Promise.allSettled(
    enabledSources.map(async (source) => {
      try {
        const videos = await fetchSourceVideos(source);
        allVideos.push(...videos);
        healthEntries.push({ id: source.id, name: source.displayName, ok: true, videosFetched: videos.length });
        console.log(`  ✓ ${source.displayName}: ${videos.length} videos`);
      } catch (err) {
        healthEntries.push({ id: source.id, name: source.displayName, ok: false, error: err.message, videosFetched: 0 });
        console.warn(`  ✗ ${source.displayName}: ${err.message}`);
      }
    })
  );

  // Sort by publishedAt descending (newest first)
  allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  // Deduplicate by providerVideoId
  const seen = new Set();
  const dedupedVideos = allVideos.filter(v => {
    if (seen.has(v.providerVideoId)) return false;
    seen.add(v.providerVideoId);
    return true;
  });

  const now = new Date().toISOString();
  const onlineCount = healthEntries.filter(h => h.ok).length;

  // Write output files
  mkdirSync(OUT_DIR, { recursive: true });

  writeFileSync(VIDEOS_OUT, JSON.stringify({
    generatedAt:  now,
    sourceCount:  enabledSources.length,
    videoCount:   dedupedVideos.length,
    videos:       dedupedVideos,
  }, null, 2));

  writeFileSync(HEALTH_OUT, JSON.stringify({
    generatedAt:   now,
    totalSources:  enabledSources.length,
    onlineSources: onlineCount,
    failedSources: enabledSources.length - onlineCount,
    sources:       healthEntries.sort((a, b) => a.name.localeCompare(b.name)),
  }, null, 2));

  console.log(`\n[build-videos] Done. ${dedupedVideos.length} videos from ${onlineCount}/${enabledSources.length} sources.`);
  console.log(`  → ${VIDEOS_OUT}`);
  console.log(`  → ${HEALTH_OUT}`);
}

run().catch(err => {
  console.error('[build-videos] Fatal error:', err);
  process.exit(1);
});

