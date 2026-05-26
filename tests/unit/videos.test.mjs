/**
 * tests/unit/videos.test.mjs
 * Unit tests for js/videos.js — Watch Signal data layer
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  filterVideos,
  getFeaturedVideo,
  videoRelTime,
  formatDuration,
  GENRE_LABEL,
  SOURCE_TYPE_LABEL,
  loadVideoCache,
} from '../../js/videos.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeVideo(overrides = {}) {
  return {
    id:              'yt-abc123',
    contentType:     'video',
    provider:        'youtube',
    providerVideoId: 'abc123',
    sourceId:        'playstation-yt',
    sourceName:      'PlayStation',
    sourceType:      'official-platform',
    title:           'Gran Turismo 7 — Official Trailer',
    description:     'The latest trailer for Gran Turismo 7.',
    publishedAt:     new Date().toISOString(),
    thumbnail:       'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
    thumbnailFallback: 'https://i.ytimg.com/vi/abc123/mqdefault.jpg',
    duration:        183,
    liveStatus:      'none',
    topics:          ['PlayStation'],
    videoGenre:      'trailer',
    official:        true,
    externalUrl:     'https://www.youtube.com/watch?v=abc123',
    embedUrl:        'https://www.youtube-nocookie.com/embed/abc123',
    bookmarked:      false,
    ...overrides,
  };
}

const SAMPLE_VIDEOS = [
  makeVideo({ id: 'v1', videoGenre: 'trailer',  topics: ['PlayStation'], official: true,  sourceType: 'official-platform', publishedAt: '2026-05-26T10:00:00Z' }),
  makeVideo({ id: 'v2', videoGenre: 'gameplay', topics: ['Xbox'],        official: true,  sourceType: 'official-platform', publishedAt: '2026-05-26T09:00:00Z' }),
  makeVideo({ id: 'v3', videoGenre: 'review',   topics: ['Hardware'],    official: false, sourceType: 'editorial',         publishedAt: '2026-05-26T08:00:00Z' }),
  makeVideo({ id: 'v4', videoGenre: 'showcase', topics: ['Nintendo'],    official: true,  sourceType: 'official-platform', publishedAt: '2026-05-25T12:00:00Z' }),
  makeVideo({ id: 'v5', videoGenre: 'esports',  topics: ['Esports'],     official: false, sourceType: 'event',             publishedAt: '2026-05-25T08:00:00Z' }),
];

// Prime the internal cache before tests
beforeEach(async () => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      generatedAt: '2026-05-26T12:00:00Z',
      sourceCount: 5,
      videoCount: SAMPLE_VIDEOS.length,
      videos: SAMPLE_VIDEOS,
    }),
  });
  await loadVideoCache();
});

// ── GENRE_LABEL ───────────────────────────────────────────────────────────────

describe('GENRE_LABEL', () => {
  it('maps all known genres', () => {
    expect(GENRE_LABEL['trailer']).toBe('TRAILER');
    expect(GENRE_LABEL['gameplay']).toBe('GAMEPLAY');
    expect(GENRE_LABEL['review']).toBe('REVIEW');
    expect(GENRE_LABEL['developer-diary']).toBe('DEV DIARY');
    expect(GENRE_LABEL['showcase']).toBe('SHOWCASE');
    expect(GENRE_LABEL['esports']).toBe('ESPORTS');
    expect(GENRE_LABEL['interview']).toBe('INTERVIEW');
  });
});

describe('SOURCE_TYPE_LABEL', () => {
  it('maps all source types', () => {
    expect(SOURCE_TYPE_LABEL['official-platform']).toBe('Official Platform');
    expect(SOURCE_TYPE_LABEL['official-publisher']).toBe('Official Publisher');
    expect(SOURCE_TYPE_LABEL['editorial']).toBe('Trusted Editorial');
    expect(SOURCE_TYPE_LABEL['event']).toBe('Event');
  });
});

// ── formatDuration ────────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('formats seconds under 1 hour as m:ss', () => {
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(63)).toBe('1:03');
    expect(formatDuration(3599)).toBe('59:59');
  });

  it('formats seconds >= 1 hour as h:mm:ss', () => {
    expect(formatDuration(3661)).toBe('1:01:01');
    expect(formatDuration(7322)).toBe('2:02:02');
  });

  it('returns null for zero or falsy', () => {
    expect(formatDuration(0)).toBeNull();
    expect(formatDuration(null)).toBeNull();
    expect(formatDuration(NaN)).toBeNull();
  });
});

// ── videoRelTime ──────────────────────────────────────────────────────────────

describe('videoRelTime', () => {
  it('returns "just now" for very recent times', () => {
    expect(videoRelTime(new Date().toISOString())).toBe('just now');
  });

  it('returns minutes for sub-hour age', () => {
    const d = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    expect(videoRelTime(d)).toBe('30m ago');
  });

  it('returns hours for sub-day age', () => {
    const d = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
    expect(videoRelTime(d)).toBe('5h ago');
  });

  it('returns days for sub-week age', () => {
    const d = new Date(Date.now() - 3 * 86400 * 1000).toISOString();
    expect(videoRelTime(d)).toBe('3d ago');
  });

  it('returns a date string for old dates', () => {
    const result = videoRelTime(new Date('2025-01-15').toISOString());
    expect(result).toMatch(/Jan|15/);
  });

  it('returns empty string for null/undefined', () => {
    expect(videoRelTime(null)).toBe('');
    expect(videoRelTime(undefined)).toBe('');
  });
});

// ── filterVideos ──────────────────────────────────────────────────────────────

describe('filterVideos — genre', () => {
  it('returns all videos when no filters applied', () => {
    expect(filterVideos({})).toHaveLength(5);
  });

  it('filters by genre: trailer', () => {
    const r = filterVideos({ genre: 'trailer' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('v1');
  });

  it('filters by genre: gameplay', () => {
    const r = filterVideos({ genre: 'gameplay' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('v2');
  });

  it('filters by genre: esports', () => {
    const r = filterVideos({ genre: 'esports' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('v5');
  });
});

describe('filterVideos — topic', () => {
  it('filters by topic: PlayStation', () => {
    const r = filterVideos({ topic: 'PlayStation' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('v1');
  });

  it('filters by topic: Nintendo', () => {
    const r = filterVideos({ topic: 'Nintendo' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('v4');
  });
});

describe('filterVideos — trust', () => {
  it('filters by trust: official', () => {
    const r = filterVideos({ trust: 'official' });
    expect(r.every(v => v.official === true)).toBe(true);
    expect(r).toHaveLength(3);
  });

  it('filters by trust: editorial', () => {
    const r = filterVideos({ trust: 'editorial' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('v3');
  });

  it('filters by trust: events', () => {
    const r = filterVideos({ trust: 'events' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('v5');
  });
});

describe('filterVideos — search', () => {
  it('filters by search query matching title', () => {
    const r = filterVideos({ search: 'Gran Turismo' });
    expect(r.length).toBeGreaterThan(0);
  });

  it('returns empty when search has no match', () => {
    expect(filterVideos({ search: 'zzz_no_match_zzz' })).toHaveLength(0);
  });

  it('ignores search terms shorter than 2 chars', () => {
    expect(filterVideos({ search: 'a' })).toHaveLength(5);
  });
});

describe('filterVideos — sort', () => {
  it('sorts by latest (default) newest-first', () => {
    const r = filterVideos({ sort: 'latest' });
    const dates = r.map(v => new Date(v.publishedAt).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeLessThanOrEqual(dates[i - 1]);
    }
  });

  it('sorts by official-first, then by date within each group', () => {
    const r = filterVideos({ sort: 'official-first' });
    let seenNonOfficial = false;
    for (const v of r) {
      if (!v.official) seenNonOfficial = true;
      if (seenNonOfficial && v.official) {
        throw new Error(`Official video appeared after non-official: ${v.id}`);
      }
    }
  });
});

describe('filterVideos — combined', () => {
  it('genre + topic', () => {
    const r = filterVideos({ genre: 'showcase', topic: 'Nintendo' });
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe('v4');
  });

  it('returns empty when no match', () => {
    expect(filterVideos({ genre: 'trailer', topic: 'Esports' })).toHaveLength(0);
  });
});

// ── getFeaturedVideo ──────────────────────────────────────────────────────────

describe('getFeaturedVideo', () => {
  it('prefers newest official trailer/showcase from sorted array', () => {
    const videos = [
      makeVideo({ id: 'review', videoGenre: 'review',  official: false, publishedAt: '2026-05-27T00:00:00Z' }),
      makeVideo({ id: 'new',    videoGenre: 'trailer', official: true,  publishedAt: '2026-05-26T00:00:00Z' }),
      makeVideo({ id: 'old',    videoGenre: 'trailer', official: true,  publishedAt: '2026-01-01T00:00:00Z' }),
    ];
    const featured = getFeaturedVideo(videos);
    expect(featured.videoGenre).toMatch(/trailer|showcase/);
    expect(featured.official).toBe(true);
  });

  it('falls back to first video when no official trailer/showcase', () => {
    const videos = [
      makeVideo({ id: 'r1', videoGenre: 'review',   official: false }),
      makeVideo({ id: 'r2', videoGenre: 'gameplay', official: false }),
    ];
    expect(getFeaturedVideo(videos).id).toBe('r1');
  });

  it('returns null for empty array', () => {
    expect(getFeaturedVideo([])).toBeNull();
  });
});
