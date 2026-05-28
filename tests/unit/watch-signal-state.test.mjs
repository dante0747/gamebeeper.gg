/**
 * tests/unit/watch-signal-state.test.mjs
 * Unit tests for Watch Signal data-layer states and source configuration.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { loadVideoCache } from '../../js/videos.js';

// ── Video source configuration ────────────────────────────────────────────────

describe('video-sources.json', () => {
  it('exists and is valid JSON', () => {
    const raw = readFileSync('data/video-sources.json', 'utf8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('every enabled source has a non-empty providerChannelId', () => {
    const sources = JSON.parse(readFileSync('data/video-sources.json', 'utf8'));
    const enabled = sources.filter(s => s.enabled);
    for (const s of enabled) {
      expect(s.providerChannelId, `${s.id} missing providerChannelId`).toBeTruthy();
      expect(s.providerChannelId.length, `${s.id} channel ID too short`).toBeGreaterThan(10);
    }
  });

  it('PlayStation uses the correct channel ID', () => {
    const sources = JSON.parse(readFileSync('data/video-sources.json', 'utf8'));
    const ps = sources.find(s => s.id === 'playstation-yt');
    expect(ps).toBeTruthy();
    expect(ps.providerChannelId).toBe('UC-2Y8dQb0S6DtpxNgAKoJKA');
  });

  it('Xbox uses the correct channel ID', () => {
    const sources = JSON.parse(readFileSync('data/video-sources.json', 'utf8'));
    const xbox = sources.find(s => s.id === 'xbox-yt');
    expect(xbox).toBeTruthy();
    expect(xbox.providerChannelId).toBe('UCjBp_7RuDBUYbd1LegWEJ8g');
  });

  it('IGN uses the correct channel ID', () => {
    const sources = JSON.parse(readFileSync('data/video-sources.json', 'utf8'));
    const ign = sources.find(s => s.id === 'ign-yt');
    expect(ign).toBeTruthy();
    expect(ign.providerChannelId).toBe('UCKy1dAqELo0zrOtPkf0eTMw');
  });

  it('GameSpot uses the correct channel ID', () => {
    const sources = JSON.parse(readFileSync('data/video-sources.json', 'utf8'));
    const gs = sources.find(s => s.id === 'gamespot-yt');
    expect(gs).toBeTruthy();
    expect(gs.providerChannelId).toBe('UCbu2SsF-Or3Rsn3NxqODImw');
  });

  it('Nintendo and Digital Foundry remain enabled with their existing IDs', () => {
    const sources = JSON.parse(readFileSync('data/video-sources.json', 'utf8'));
    const nintendo = sources.find(s => s.id === 'nintendo-yt');
    const df       = sources.find(s => s.id === 'digital-foundry-yt');
    expect(nintendo?.enabled).toBe(true);
    expect(nintendo?.providerChannelId).toBe('UCGIY_O-8vW4rfX98KlMkvRg');
    expect(df?.enabled).toBe(true);
    expect(df?.providerChannelId).toBe('UC9PBzalIcEQCsiIkq36PyUA');
  });
});

// ── Watch Signal empty / error states ─────────────────────────────────────────

describe('Watch Signal UI copy', () => {
  it('empty-state message is user-facing and does not mention internal scripts', () => {
    const src = readFileSync('js/watch-signal.js', 'utf8');
    expect(src).not.toContain('node scripts/build-videos.mjs');
    expect(src).not.toContain('No videos cached yet');
  });

  it('empty-state message tells users to check back', () => {
    const src = readFileSync('js/watch-signal.js', 'utf8');
    expect(src).toContain('check back soon');
  });
});

// ── loadVideoCache graceful failure ───────────────────────────────────────────

describe('loadVideoCache', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns { videos: [] } when fetch fails (network error)', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const result = await loadVideoCache();
    expect(result.videos).toEqual([]);
  });

  it('returns { videos: [] } when fetch returns non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    const result = await loadVideoCache();
    expect(result.videos).toEqual([]);
  });

  it('returns videos array when fetch succeeds', async () => {
    const mockVideos = [{ id: 'v1', title: 'Test Video' }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ videos: mockVideos, generatedAt: '2026-05-28T00:00:00Z' }),
    });
    const result = await loadVideoCache();
    expect(result.videos).toHaveLength(1);
    expect(result.videos[0].id).toBe('v1');
  });
});
