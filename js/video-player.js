/**
 * video-player.js — GameBeeper Watch Signal privacy-first modal player
 *
 * Opens a dialog modal and only injects a YouTube iframe AFTER the user
 * explicitly clicks play. Video thumbnails are shown until that moment.
 *
 * Privacy guarantees:
 *   - No iframe is created on page load.
 *   - YouTube embed uses youtube-nocookie.com.
 *   - No autoplay with sound.
 *   - Modal role="dialog" with full focus trap and Escape close.
 */

'use strict';

import { esc, showBmToast } from './utils.js';
import { videoRelTime, GENRE_LABEL, formatDuration } from './videos.js';
import { isBookmarked, toggleBookmark } from './storage.js';
import { gaEvent } from './analytics.js';

// Topic → accent color (duplicated here to avoid circular import with video-cards.js)
const TOPIC_COLOR = {
  PlayStation: '#0070D1', Xbox: '#52B043', Nintendo: '#E40012',
  PC: '#7c5cff', Indie: '#ff3abf', Reviews: '#ffca3a',
  Trailers: '#b7ff39', Esports: '#ff6b35', Hardware: '#26e6ff',
  Industry: '#a3a6bd', Latest: '#26e6ff',
};
function topicColor(topics = []) {
  for (const t of topics) if (TOPIC_COLOR[t]) return TOPIC_COLOR[t];
  return '#26e6ff';
}

// ── State ─────────────────────────────────────────────────────────────────────

let _modalEl      = null;
let _currentVideo = null;
let _triggerEl    = null;   // element that opened the modal – focus restored on close
let _trapCleanup  = null;

// ── Build modal DOM ───────────────────────────────────────────────────────────

function ensureModal() {
  if (_modalEl) return _modalEl;

  _modalEl = document.createElement('div');
  _modalEl.id = 'videoPlayerModal';
  _modalEl.className = 'vp-backdrop';
  _modalEl.setAttribute('role', 'dialog');
  _modalEl.setAttribute('aria-modal', 'true');
  _modalEl.setAttribute('aria-label', 'Video player');
  _modalEl.setAttribute('aria-hidden', 'true');
  _modalEl.innerHTML = `
    <div class="vp-theater" tabindex="-1">
      <div class="vp-layout">
        <div class="vp-player-col">
          <div class="vp-ratio-wrap" id="vpRatioWrap">
            <!-- iframe injected here on play -->
            <div class="vp-thumb-preview" id="vpThumbPreview">
              <img id="vpThumbImg" class="vp-thumb-img" alt="" loading="eager" decoding="async" referrerpolicy="no-referrer"/>
              <div class="vp-thumb-overlay" aria-hidden="true"></div>
              <button class="vp-play-large" id="vpPlayBtn" aria-label="Play video">
                <svg aria-hidden="true" viewBox="0 0 24 24" width="40" height="40" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              </button>
            </div>
          </div>
          <p class="vp-privacy-note" aria-live="polite" id="vpPrivacyNote">
            <svg aria-hidden="true" viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 14s5-2.5 5-6.25V3.5L8 1.5 3 3.5v4.25C3 11.5 8 14 8 14z"/></svg>
            Tap play to load video · Uses youtube-nocookie.com · No trackers
          </p>
        </div>
        <aside class="vp-info-col" id="vpInfoCol">
          <!-- populated dynamically -->
        </aside>
      </div>
      <button class="vp-close" id="vpClose" aria-label="Close video player">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="vp-backdrop-click" id="vpBackdropClick" aria-hidden="true"></div>`;

  document.body.appendChild(_modalEl);

  // Close bindings
  document.getElementById('vpClose')?.addEventListener('click', closeVideoModal);
  document.getElementById('vpBackdropClick')?.addEventListener('click', closeVideoModal);
  document.addEventListener('keydown', handleKeyDown);

  return _modalEl;
}

// ── Populate info panel ───────────────────────────────────────────────────────

function populateInfoPanel(video) {
  const infoCol = document.getElementById('vpInfoCol');
  if (!infoCol || !video) return;

  const time      = videoRelTime(video.publishedAt);
  const accentCol = topicColor(video.topics || []);
  const bm        = isBookmarked(`video:${video.id}`);
  const primary   = video.topics?.[0] || 'Latest';

  infoCol.innerHTML = `
    <div class="vp-info-inner">
      <div class="vp-info-badges">
        <span class="vc-genre-badge vc-genre-${esc(video.videoGenre)}">${esc(GENRE_LABEL[video.videoGenre] || 'VIDEO')}</span>
        ${video.official ? `<span class="vc-official-badge"><svg aria-hidden="true" viewBox="0 0 16 16" width="9" height="9" fill="currentColor"><path d="M8 0l1.9 4.1L14 5.3 11 8.2l.7 4.3L8 10.3 4.3 12.5 5 8.2 2 5.3l4.1-1.2z"/></svg>Official</span>` : ''}
      </div>
      <h2 class="vp-info-title" id="vpInfoTitle">${esc(video.title)}</h2>
      <div class="vp-info-source">
        <span class="vc-src-dot" style="background:${esc(accentCol)};box-shadow:0 0 5px ${esc(accentCol)}88"></span>
        <span class="vp-source-name">${esc(video.sourceName || '')}</span>
      </div>
      <div class="vp-info-meta">
        <span class="vc-topic-chip" style="--chip-color:${esc(accentCol)}">${esc(primary)}</span>
        <span class="vp-time">${esc(time)}</span>
        ${video.duration ? `<span class="vp-duration">${esc(formatDuration(video.duration) || '')}</span>` : ''}
      </div>
      ${video.description ? `<p class="vp-info-desc">${esc(video.description.slice(0, 280))}${video.description.length > 280 ? '…' : ''}</p>` : ''}
      <div class="vp-info-actions">
        <button class="bm-btn vp-bm-btn${bm ? ' bm-active' : ''}"
          id="vpBmBtn"
          data-video-id="${esc(video.id)}"
          data-bm-link="video:${esc(video.id)}"
          title="${bm ? 'Remove bookmark' : 'Save video'}"
          aria-label="${bm ? 'Remove bookmark' : 'Save this video'}">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="${bm ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          ${bm ? 'Saved' : 'Save'}
        </button>
        <a class="btn btn-ghost btn-sm vp-ext"
          href="${esc(video.externalUrl || '#')}"
          target="_blank" rel="noopener noreferrer"
          aria-label="Watch on YouTube: ${esc(video.title)}">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Watch on YouTube
        </a>
      </div>
    </div>`;

  // Wire bookmark in info panel
  document.getElementById('vpBmBtn')?.addEventListener('click', () => {
    if (!_currentVideo) return;
    const key = `video:${_currentVideo.id}`;
    const article = { link: key, title: _currentVideo.title, source: _currentVideo.sourceName, contentType: 'video', ..._currentVideo };
    const added = toggleBookmark(article, key);
    gaEvent(added ? 'bookmark_add' : 'bookmark_remove', {
      article_title: _currentVideo.title,
      article_source: _currentVideo.sourceName,
      content_type: 'video',
    });
    const btn = document.getElementById('vpBmBtn');
    if (btn) {
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', added ? 'currentColor' : 'none');
      btn.classList.toggle('bm-active', added);
      btn.setAttribute('aria-label', added ? 'Remove bookmark' : 'Save this video');
      btn.innerHTML = btn.innerHTML.replace(/Saved|Save/, added ? 'Saved' : 'Save');
    }
    showBmToast(added ? '📹 Video saved' : '🗑️ Removed from bookmarks');
    // update any matching bm buttons in the page
    document.querySelectorAll(`[data-bm-link="${CSS.escape(key)}"]`).forEach(el => {
      if (el === btn) return;
      const s = el.querySelector('svg');
      if (s) s.setAttribute('fill', added ? 'currentColor' : 'none');
      el.classList.toggle('bm-active', added);
    });
  });
}

// ── Inject iframe after play clicked ─────────────────────────────────────────

function injectPlayer(video) {
  const wrap  = document.getElementById('vpRatioWrap');
  const thumb = document.getElementById('vpThumbPreview');
  const note  = document.getElementById('vpPrivacyNote');
  if (!wrap || !video?.embedUrl) return;

  if (thumb) thumb.style.display = 'none';
  if (note)  note.style.display  = 'none';

  // Remove existing iframe if any
  wrap.querySelector('.vp-iframe')?.remove();

  const iframe = document.createElement('iframe');
  iframe.className = 'vp-iframe';
  iframe.src = `${video.embedUrl}?autoplay=1&rel=0&modestbranding=1&color=white`;
  iframe.title = video.title;
  iframe.setAttribute('allow', 'autoplay; fullscreen; encrypted-media; picture-in-picture');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('loading', 'eager');
  // Sandbox: allow scripts (needed for YT player) but restrict other capabilities
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox');
  wrap.appendChild(iframe);

  gaEvent('video_play_started', {
    video_id:    video.id,
    video_title: video.title,
    source_name: video.sourceName,
    video_genre: video.videoGenre,
  });
}

// ── Open / close ──────────────────────────────────────────────────────────────

export function openVideoModal(video, triggerEl = null) {
  if (!video) return;

  _currentVideo = video;
  _triggerEl    = triggerEl;

  const modal   = ensureModal();
  const theater = modal.querySelector('.vp-theater');

  // Set accessible label
  modal.setAttribute('aria-label', `Video player: ${video.title}`);
  const titleEl = document.getElementById('vpInfoTitle');
  if (titleEl) titleEl.id = 'vp-dialog-label';
  modal.setAttribute('aria-labelledby', 'vp-dialog-label');

  // Set thumbnail
  const thumbImg  = document.getElementById('vpThumbImg');
  const thumbPrev = document.getElementById('vpThumbPreview');
  const playBtn   = document.getElementById('vpPlayBtn');
  const noteEl    = document.getElementById('vpPrivacyNote');

  if (thumbImg)  { thumbImg.src = video.thumbnail || video.thumbnailFallback || ''; thumbImg.alt = `Thumbnail for: ${video.title}`; }
  if (thumbPrev) thumbPrev.style.display = '';
  if (noteEl)    noteEl.style.display = '';

  // Remove any existing iframe
  document.getElementById('vpRatioWrap')?.querySelector('.vp-iframe')?.remove();

  // Populate info panel
  populateInfoPanel(video);

  // Play button wires
  if (playBtn) {
    const newPlay = playBtn.cloneNode(true); // remove old listeners
    newPlay.setAttribute('aria-label', `Play: ${video.title}`);
    playBtn.parentNode?.replaceChild(newPlay, playBtn);
    newPlay.addEventListener('click', () => injectPlayer(_currentVideo));
  }

  // Show modal
  modal.setAttribute('aria-hidden', 'false');
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Focus theater container
  setTimeout(() => { theater?.focus(); }, 30);

  // Focus trap
  _trapCleanup = activateFocusTrap(theater);

  gaEvent('video_card_open', {
    video_id:    video.id,
    video_title: video.title,
    source_name: video.sourceName,
  });
}

export function closeVideoModal() {
  if (!_modalEl) return;

  // Remove iframe to stop playback
  document.getElementById('vpRatioWrap')?.querySelector('.vp-iframe')?.remove();
  const thumbPrev = document.getElementById('vpThumbPreview');
  if (thumbPrev) thumbPrev.style.display = '';

  _modalEl.classList.remove('open');
  _modalEl.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';

  if (_trapCleanup) { _trapCleanup(); _trapCleanup = null; }

  // Restore focus to trigger
  setTimeout(() => { _triggerEl?.focus(); _triggerEl = null; }, 30);
  _currentVideo = null;
}

// ── Keyboard handler ──────────────────────────────────────────────────────────

function handleKeyDown(e) {
  if (!_modalEl?.classList.contains('open')) return;
  if (e.key === 'Escape') { e.preventDefault(); closeVideoModal(); }
}

// ── Focus trap ────────────────────────────────────────────────────────────────

function getFocusable(el) {
  return Array.from(el.querySelectorAll(
    'a[href], button:not(:disabled), input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )).filter(el => !el.closest('[aria-hidden="true"]'));
}

function activateFocusTrap(container) {
  function onKey(e) {
    if (e.key !== 'Tab') return;
    const focusable = getFocusable(container);
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
  container.addEventListener('keydown', onKey);
  return () => container.removeEventListener('keydown', onKey);
}

// ── Init ──────────────────────────────────────────────────────────────────────

/** Call once at startup to pre-build the modal DOM (avoids first-open jank). */
export function initVideoPlayer() {
  ensureModal();
}

/**
 * Reset singleton state — for use in automated tests only.
 * Removes the modal element from the DOM and nulls the reference so
 * the next initVideoPlayer() / openVideoModal() creates a fresh modal.
 * @internal
 */
export function _resetVideoPlayerForTests() {
  if (_modalEl) {
    _modalEl.remove();
    _modalEl = null;
  }
  _currentVideo = null;
  _triggerEl    = null;
  if (_trapCleanup) { _trapCleanup(); _trapCleanup = null; }
  document.body.style.overflow = '';
}

