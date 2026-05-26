/**
 * videos.js — GameBeeper Watch Signal data layer
 *
 * Loads normalized video entries from the static /public/videos.json cache
 * generated at build time by scripts/build-videos.mjs.
 */

'use strict';

let _videos    = [];
let _sources   = [];
let _health    = null;
let _loadedAt  = null;

/** Load video sources registry from /data/video-sources.json */
export async function loadVideoSources() {
  try {
    const resp = await fetch('/data/video-sources.json', { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    _sources = Array.isArray(data) ? data.filter(s => s.enabled !== false) : [];
  } catch (e) {
    console.warn('[GameBeeper] Could not load video sources:', e.message);
    _sources = [];
  }
}

/** Load cached video entries from /public/videos.json */
export async function loadVideoCache() {
  try {
    const resp = await fetch('/public/videos.json', { cache: 'no-cache', signal: AbortSignal.timeout(8000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    _videos   = Array.isArray(data.videos) ? data.videos : [];
    _loadedAt = data.generatedAt || null;
    return { videos: _videos, generatedAt: _loadedAt, sourceCount: data.sourceCount || 0 };
  } catch (e) {
    console.warn('[GameBeeper] Video cache unavailable:', e.message);
    _videos = [];
    return { videos: [], generatedAt: null, sourceCount: 0 };
  }
}

/** Load video source health from /public/video-health.json */
export async function loadVideoHealth() {
  try {
    const resp = await fetch('/public/video-health.json', { cache: 'no-cache', signal: AbortSignal.timeout(5000) });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    _health = await resp.json();
    return _health;
  } catch (e) {
    console.debug('[GameBeeper] video-health.json unavailable:', e.message);
    return null;
  }
}

/** Return the current in-memory video array */
export function getVideos() { return _videos; }

/** Return enabled video sources */
export function getVideoSources() { return _sources; }

/** Return health data */
export function getVideoHealth() { return _health; }

/** Return when the cache was last generated */
export function getVideoCacheDate() { return _loadedAt; }

/**
 * Filter videos by active Watch Signal filter state.
 * @param {object} opts
 * @param {string} opts.genre      — 'all' | 'trailer' | 'gameplay' | 'review' | 'developer-diary' | 'showcase' | 'esports'
 * @param {string} opts.topic      — 'all' | 'PlayStation' | 'Xbox' | 'Nintendo' | 'PC' | 'Indie'
 * @param {string} opts.trust      — 'all' | 'official' | 'editorial' | 'events'
 * @param {string} opts.sort       — 'latest' | 'official-first'
 * @param {string} opts.search     — free text search
 */
export function filterVideos({ genre = 'all', topic = 'all', trust = 'all', sort = 'latest', search = '' } = {}) {
  let out = [..._videos];

  if (genre !== 'all') {
    out = out.filter(v => v.videoGenre === genre);
  }

  if (topic !== 'all') {
    out = out.filter(v => Array.isArray(v.topics) && v.topics.includes(topic));
  }

  if (trust === 'official') {
    out = out.filter(v => v.official === true);
  } else if (trust === 'editorial') {
    out = out.filter(v => v.sourceType === 'editorial');
  } else if (trust === 'events') {
    out = out.filter(v => v.sourceType === 'event');
  }

  if (search.trim().length >= 2) {
    const q = search.trim().toLowerCase();
    out = out.filter(v =>
      (v.title      || '').toLowerCase().includes(q) ||
      (v.sourceName || '').toLowerCase().includes(q) ||
      (v.description|| '').toLowerCase().includes(q)
    );
  }

  if (sort === 'official-first') {
    out.sort((a, b) => {
      if (a.official === b.official) return new Date(b.publishedAt) - new Date(a.publishedAt);
      return a.official ? -1 : 1;
    });
  } else {
    // latest first (default — already sorted from cache but re-sort to be safe)
    out.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  }

  return out;
}

/** Pick the best featured video: newest official trailer or showcase */
export function getFeaturedVideo(videos = _videos) {
  // Prefer newest official trailer or showcase
  const candidate = videos.find(v =>
    v.official && (v.videoGenre === 'trailer' || v.videoGenre === 'showcase')
  );
  return candidate || videos[0] || null;
}

/**
 * Format a relative publish time for video entries.
 * Reuses the same approach as relTime in utils.js.
 */
export function videoRelTime(isoDate) {
  if (!isoDate) return '';
  try {
    const diff = Date.now() - new Date(isoDate).getTime();
    const s = diff / 1000;
    if (s < 60)  return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 7 * 86400) return `${Math.floor(s / 86400)}d ago`;
    return new Date(isoDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

/** Format duration in seconds to mm:ss or h:mm:ss */
export function formatDuration(secs) {
  if (!secs || isNaN(secs)) return null;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Map videoGenre to human-readable badge label */
export const GENRE_LABEL = {
  'trailer':       'TRAILER',
  'gameplay':      'GAMEPLAY',
  'review':        'REVIEW',
  'developer-diary': 'DEV DIARY',
  'showcase':      'SHOWCASE',
  'esports':       'ESPORTS',
  'interview':     'INTERVIEW',
};

/** Map sourceType to human-readable label */
export const SOURCE_TYPE_LABEL = {
  'official-platform':  'Official Platform',
  'official-publisher': 'Official Publisher',
  'editorial':          'Trusted Editorial',
  'event':              'Event',
};

