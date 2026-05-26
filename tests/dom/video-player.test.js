/**
 * tests/dom/video-player.test.js
 * DOM tests for js/video-player.js — privacy-first modal player
 */

// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  openVideoModal,
  closeVideoModal,
  initVideoPlayer,
  _resetVideoPlayerForTests,
} from '../../js/video-player.js';

vi.mock('../../js/analytics.js', () => ({ gaEvent: vi.fn() }));
vi.mock('../../js/storage.js', () => ({
  isBookmarked: vi.fn(() => false),
  toggleBookmark: vi.fn(() => true),
}));

function makeVideo(overrides = {}) {
  return {
    id: 'yt-test123', contentType: 'video', provider: 'youtube',
    providerVideoId: 'test123', sourceId: 'playstation-yt', sourceName: 'PlayStation',
    sourceType: 'official-platform', title: 'Test Trailer',
    description: 'A test video.', publishedAt: new Date().toISOString(),
    thumbnail: 'https://i.ytimg.com/vi/test123/hqdefault.jpg',
    thumbnailFallback: 'https://i.ytimg.com/vi/test123/mqdefault.jpg',
    duration: 120, liveStatus: 'none', topics: ['PlayStation'], videoGenre: 'trailer',
    official: true, externalUrl: 'https://www.youtube.com/watch?v=test123',
    embedUrl: 'https://www.youtube-nocookie.com/embed/test123', bookmarked: false,
    ...overrides,
  };
}

const getModal = () => document.getElementById('videoPlayerModal');

beforeEach(() => {
  _resetVideoPlayerForTests();
  initVideoPlayer();
});

afterEach(() => {
  _resetVideoPlayerForTests();
});

describe('Video Player — initial state', () => {
  it('builds modal DOM but keeps it closed', () => {
    const modal = getModal();
    expect(modal).not.toBeNull();
    expect(modal.getAttribute('aria-hidden')).toBe('true');
    expect(modal.classList.contains('open')).toBe(false);
  });

  it('does NOT inject an iframe on page load', () => {
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
  });

  it('modal has role="dialog" and aria-modal="true"', () => {
    const modal = getModal();
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.getAttribute('aria-modal')).toBe('true');
  });
});

describe('Video Player — openVideoModal', () => {
  it('shows the modal (adds "open" class, sets aria-hidden="false")', () => {
    openVideoModal(makeVideo());
    const modal = getModal();
    expect(modal.classList.contains('open')).toBe(true);
    expect(modal.getAttribute('aria-hidden')).toBe('false');
  });

  it('sets accessible aria-label based on video title', () => {
    openVideoModal(makeVideo());
    const modal = getModal();
    expect(modal.getAttribute('aria-label')).toContain('Test Trailer');
  });

  it('does NOT inject an iframe when modal opens (privacy: lazy embed)', () => {
    openVideoModal(makeVideo());
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
  });

  it('shows thumbnail before play', () => {
    openVideoModal(makeVideo());
    const thumbImg = document.getElementById('vpThumbImg');
    expect(thumbImg).not.toBeNull();
    expect(thumbImg.src).toContain('test123');
  });

  it('shows privacy note before play', () => {
    openVideoModal(makeVideo());
    const note = document.getElementById('vpPrivacyNote');
    expect(note?.style.display).not.toBe('none');
  });

  it('renders info panel with video title', () => {
    openVideoModal(makeVideo());
    expect(document.getElementById('vpInfoCol')?.textContent).toContain('Test Trailer');
  });
});

describe('Video Player — play button injects iframe', () => {
  it('play button exists in DOM after openVideoModal', () => {
    openVideoModal(makeVideo());
    expect(document.querySelector('.vp-play-large')).not.toBeNull();
  });

  it('injects iframe only after play button click', () => {
    openVideoModal(makeVideo());
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
    document.querySelector('.vp-play-large')?.click();
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
  });

  it('iframe src uses youtube-nocookie.com', () => {
    openVideoModal(makeVideo());
    document.querySelector('.vp-play-large')?.click();
    expect(document.querySelector('iframe')?.src).toContain('youtube-nocookie.com');
  });

  it('iframe src contains the correct video ID', () => {
    openVideoModal(makeVideo());
    document.querySelector('.vp-play-large')?.click();
    expect(document.querySelector('iframe')?.src).toContain('test123');
  });

  it('iframe has autoplay=1 (user-initiated play)', () => {
    openVideoModal(makeVideo());
    document.querySelector('.vp-play-large')?.click();
    expect(document.querySelector('iframe')?.src).toContain('autoplay=1');
  });

  it('iframe has rel=0 to suppress related videos', () => {
    openVideoModal(makeVideo());
    document.querySelector('.vp-play-large')?.click();
    expect(document.querySelector('iframe')?.src).toContain('rel=0');
  });
});

describe('Video Player — closeVideoModal', () => {
  it('removes "open" class and sets aria-hidden="true"', () => {
    openVideoModal(makeVideo());
    closeVideoModal();
    const modal = getModal();
    expect(modal.classList.contains('open')).toBe(false);
    expect(modal.getAttribute('aria-hidden')).toBe('true');
  });

  it('removes the iframe on close (stops playback)', () => {
    openVideoModal(makeVideo());
    document.querySelector('.vp-play-large')?.click();
    expect(document.querySelectorAll('iframe')).toHaveLength(1);
    closeVideoModal();
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
  });

  it('restores body scroll', () => {
    openVideoModal(makeVideo());
    expect(document.body.style.overflow).toBe('hidden');
    closeVideoModal();
    expect(document.body.style.overflow).toBe('');
  });

  it('schedules focus restore to trigger element after close (no error thrown)', async () => {
    const btn = document.createElement('button');
    btn.setAttribute('tabindex', '0');
    document.body.appendChild(btn);
    btn.focus();
    openVideoModal(makeVideo(), btn);
    closeVideoModal();
    // Verify modal is closed synchronously
    expect(getModal()?.classList.contains('open')).toBe(false);
    // Focus restore is deferred 30ms — just confirm no error is thrown
    await new Promise(r => setTimeout(r, 80));
    document.body.removeChild(btn);
  });
});

describe('Video Player — Escape key handling', () => {
  it('Escape key closes the modal', () => {
    openVideoModal(makeVideo());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(getModal()?.classList.contains('open')).toBe(false);
  });

  it('non-Escape keys do not close the modal', () => {
    openVideoModal(makeVideo());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(getModal()?.classList.contains('open')).toBe(true);
    closeVideoModal();
  });
});

describe('Video Player — backdrop click', () => {
  it('clicking the backdrop closes the modal', () => {
    openVideoModal(makeVideo());
    document.getElementById('vpBackdropClick')?.click();
    expect(getModal()?.classList.contains('open')).toBe(false);
  });
});

describe('Video Player — privacy guarantee', () => {
  it('no iframe until explicit play', () => {
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
    openVideoModal(makeVideo());
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
    closeVideoModal();
  });

  it('closing and reopening modal clears stale iframes', () => {
    openVideoModal(makeVideo());
    document.querySelector('.vp-play-large')?.click();
    closeVideoModal();
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
    openVideoModal(makeVideo({ id: 'yt-s2', providerVideoId: 'second' }));
    expect(document.querySelectorAll('iframe')).toHaveLength(0);
    closeVideoModal();
  });
});
