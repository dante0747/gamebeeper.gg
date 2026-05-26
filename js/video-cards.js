/**
 * video-cards.js — GameBeeper Watch Signal card rendering
 *
 * Renders featured and grid video cards.
 * Never injects an iframe — call video-player.js openVideoModal() on play interactions.
 */

'use strict';

import { esc } from './utils.js';
import { videoRelTime, formatDuration, GENRE_LABEL } from './videos.js';
import { isBookmarked } from './storage.js';
import { catMeta } from './config.js';

// ── Topic → accent color ──────────────────────────────────────────────────────

const TOPIC_COLOR = {
  PlayStation: '#0070D1',
  Xbox:        '#52B043',
  Nintendo:    '#E40012',
  PC:          '#7c5cff',
  Indie:       '#ff3abf',
  Reviews:     '#ffca3a',
  Trailers:    '#b7ff39',
  Esports:     '#ff6b35',
  Hardware:    '#26e6ff',
  Industry:    '#a3a6bd',
  Latest:      '#26e6ff',
};

export function topicColor(topics = []) {
  for (const t of topics) {
    if (TOPIC_COLOR[t]) return TOPIC_COLOR[t];
  }
  return '#26e6ff';
}

// ── Genre badge HTML ──────────────────────────────────────────────────────────

function genreBadge(genre) {
  const label = GENRE_LABEL[genre] || 'VIDEO';
  return `<span class="vc-genre-badge vc-genre-${esc(genre)}">${label}</span>`;
}

// ── Official verified pill ────────────────────────────────────────────────────

function officialBadge(official) {
  if (!official) return '';
  return `<span class="vc-official-badge" title="Verified official channel">
    <svg aria-hidden="true" viewBox="0 0 16 16" width="9" height="9" fill="currentColor"><path d="M8 0l1.9 4.1L14 5.3 11 8.2l.7 4.3L8 10.3 4.3 12.5 5 8.2 2 5.3l4.1-1.2z"/></svg>Official
  </span>`;
}

// ── Duration badge ────────────────────────────────────────────────────────────

function durationBadge(duration) {
  const f = formatDuration(duration);
  if (!f) return '';
  return `<span class="vc-duration">${esc(f)}</span>`;
}

// ── Thumbnail URL ─────────────────────────────────────────────────────────────

function thumbSrc(video) {
  return video.thumbnail || video.thumbnailFallback || '';
}

// ── Play button ───────────────────────────────────────────────────────────────

const PLAY_ICON = `<svg aria-hidden="true" viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;

// ── Bookmark button ───────────────────────────────────────────────────────────

function bmButton(video) {
  const bm = isBookmarked(`video:${video.id}`);
  return `<button class="bm-btn vc-bm-btn${bm ? ' bm-active' : ''}"
    data-bm-link="video:${esc(video.id)}"
    data-video-id="${esc(video.id)}"
    title="${bm ? 'Remove bookmark' : 'Save video'}"
    aria-label="${bm ? 'Remove bookmark' : 'Bookmark this video: ' + esc(video.title)}">
    <svg viewBox="0 0 24 24" width="13" height="13" fill="${bm ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
  </button>`;
}

// ── Topic chip ───────────────────────────────────────────────────────────────

function topicChip(video) {
  const primary = video.topics?.[0] || 'Latest';
  const color   = topicColor(video.topics || []);
  const label   = catMeta[primary]?.label || primary;
  return `<span class="vc-topic-chip" style="--chip-color:${esc(color)}">${esc(label)}</span>`;
}

// ── Source dot ────────────────────────────────────────────────────────────────

function sourceDot(video) {
  const color = topicColor(video.topics || []);
  return `<span class="vc-src-dot" style="background:${esc(color)};box-shadow:0 0 5px ${esc(color)}88"></span>`;
}

// ── Standard grid card ────────────────────────────────────────────────────────

/**
 * Renders a standard 16:9 video card for the grid.
 * @param {object} video  — normalized video entry
 * @param {number} index  — position in grid (used for CSS stagger var)
 */
export function videoGridCard(video, index = 0) {
  const thumb     = thumbSrc(video);
  const time      = videoRelTime(video.publishedAt);
  const accentCol = topicColor(video.topics || []);

  const thumbHtml = thumb
    ? `<img src="${esc(thumb)}" alt="Thumbnail for: ${esc(video.title)}" loading="lazy" decoding="async" width="640" height="360" class="vc-thumb-img" referrerpolicy="no-referrer">`
    : `<div class="vc-thumb-placeholder" style="--accent:${esc(accentCol)}"></div>`;

  return `
<article class="vc-card" style="--i:${index};--accent:${esc(accentCol)}"
  data-video-id="${esc(video.id)}"
  data-video-title="${esc(video.title)}"
  aria-label="Video: ${esc(video.title)}">
  <div class="vc-thumb-wrap">
    ${thumbHtml}
    <div class="vc-thumb-overlay" aria-hidden="true"></div>
    ${genreBadge(video.videoGenre)}
    ${durationBadge(video.duration)}
    <button class="vc-play-btn"
      data-video-id="${esc(video.id)}"
      aria-label="Play ${esc(GENRE_LABEL[video.videoGenre] || 'video').toLowerCase()}: ${esc(video.title)}">
      ${PLAY_ICON}
    </button>
  </div>
  <div class="vc-body">
    <div class="vc-title-row">
      <h3 class="vc-title">
        <button class="vc-title-btn" data-video-id="${esc(video.id)}">${esc(video.title)}</button>
      </h3>
    </div>
    <div class="vc-meta">
      <div class="vc-source">
        ${sourceDot(video)}
        <span class="vc-source-name">${esc(video.sourceName || '')}</span>
        ${officialBadge(video.official)}
      </div>
      <span class="vc-time">${esc(time)}</span>
    </div>
    <div class="vc-footer">
      ${topicChip(video)}
      <div class="vc-actions">
        ${bmButton(video)}
        <a class="vc-ext-link btn btn-ghost btn-sm"
          href="${esc(video.externalUrl || '#')}"
          target="_blank" rel="noopener noreferrer"
          aria-label="Open on YouTube: ${esc(video.title)}">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Watch →
        </a>
      </div>
    </div>
  </div>
</article>`;
}

// ── Featured spotlight card ───────────────────────────────────────────────────

/**
 * Renders the large featured spotlight card for the Watch page hero.
 */
export function videoFeaturedCard(video) {
  if (!video) return '<div class="vc-featured-empty">No featured video available.</div>';

  const thumb     = thumbSrc(video);
  const time      = videoRelTime(video.publishedAt);
  const accentCol = topicColor(video.topics || []);

  const thumbHtml = thumb
    ? `<img src="${esc(thumb)}" alt="Thumbnail for: ${esc(video.title)}" loading="eager" fetchpriority="high" decoding="async" width="1280" height="720" class="vc-featured-img" referrerpolicy="no-referrer">`
    : `<div class="vc-featured-placeholder" style="--accent:${esc(accentCol)}"></div>`;

  return `
<div class="vc-featured" style="--accent:${esc(accentCol)}" data-video-id="${esc(video.id)}">
  <div class="vc-featured-thumb-wrap">
    ${thumbHtml}
    <div class="vc-featured-overlay" aria-hidden="true"></div>
    <div class="vc-featured-badges" aria-hidden="true">
      ${genreBadge(video.videoGenre)}
      ${officialBadge(video.official)}
    </div>
    ${durationBadge(video.duration)}
  </div>
  <div class="vc-featured-body">
    <div class="vc-featured-source">
      ${sourceDot(video)}
      <span class="vc-source-name">${esc(video.sourceName || '')}</span>
      <span class="vc-dot-sep" aria-hidden="true">·</span>
      ${topicChip(video)}
      <span class="vc-dot-sep" aria-hidden="true">·</span>
      <span class="vc-time">${esc(time)}</span>
    </div>
    <h2 class="vc-featured-title">${esc(video.title)}</h2>
    ${video.description ? `<p class="vc-featured-desc">${esc(video.description.slice(0, 160))}${video.description.length > 160 ? '…' : ''}</p>` : ''}
    <div class="vc-featured-actions">
      <button class="btn btn-primary vc-watch-btn"
        data-video-id="${esc(video.id)}"
        aria-label="Watch now: ${esc(video.title)}">
        <svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        Watch now
      </button>
      ${bmButton(video)}
      <a class="btn btn-ghost btn-sm"
        href="${esc(video.externalUrl || '#')}"
        target="_blank" rel="noopener noreferrer"
        aria-label="Open source for: ${esc(video.title)}">
        Open source
        <svg aria-hidden="true" viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>
    </div>
  </div>
</div>`;
}

// ── Homepage preview card (compact) ──────────────────────────────────────────

/**
 * Renders a compact card for the homepage Watch Signal preview rail.
 */
export function videoPreviewCard(video, index = 0, isFeatured = false) {
  const thumb     = thumbSrc(video);
  const time      = videoRelTime(video.publishedAt);
  const accentCol = topicColor(video.topics || []);

  const thumbHtml = thumb
    ? `<img src="${esc(thumb)}" alt="Thumbnail for: ${esc(video.title)}" loading="lazy" decoding="async" width="640" height="360" class="vc-preview-img" referrerpolicy="no-referrer">`
    : `<div class="vc-thumb-placeholder" style="--accent:${esc(accentCol)}"></div>`;

  return `
<article class="vc-preview-card${isFeatured ? ' vc-preview-featured' : ''}" style="--i:${index};--accent:${esc(accentCol)}"
  data-video-id="${esc(video.id)}"
  aria-label="Video: ${esc(video.title)}">
  <div class="vc-preview-thumb-wrap">
    ${thumbHtml}
    <div class="vc-thumb-overlay" aria-hidden="true"></div>
    ${genreBadge(video.videoGenre)}
    ${durationBadge(video.duration)}
    <button class="vc-play-btn vc-play-sm"
      data-video-id="${esc(video.id)}"
      aria-label="Play ${esc(GENRE_LABEL[video.videoGenre] || 'video').toLowerCase()}: ${esc(video.title)}">
      <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
    </button>
  </div>
  <div class="vc-preview-body">
    <h4 class="vc-preview-title">
      <button class="vc-title-btn" data-video-id="${esc(video.id)}">${esc(video.title)}</button>
    </h4>
    <div class="vc-preview-meta">
      <span class="vc-source-name">${esc(video.sourceName || '')}</span>
      <span class="vc-dot-sep" aria-hidden="true">·</span>
      <span class="vc-time">${esc(time)}</span>
    </div>
  </div>
</article>`;
}

// ── Skeleton cards ────────────────────────────────────────────────────────────

export function videoGridSkeleton(n = 6) {
  return Array.from({ length: n }, (_, i) => `
<div class="vc-card vc-card-skeleton" aria-hidden="true" style="--i:${i}">
  <div class="vc-thumb-wrap vc-sk-thumb"></div>
  <div class="vc-body">
    <div class="vc-sk-line" style="width:90%;height:14px;margin-bottom:6px"></div>
    <div class="vc-sk-line" style="width:70%;height:12px;margin-bottom:12px"></div>
    <div class="vc-sk-line" style="width:50%;height:10px"></div>
  </div>
</div>`).join('');
}

export function videoPreviewSkeleton(n = 5) {
  return Array.from({ length: n }, (_, i) => `
<div class="vc-preview-card vc-card-skeleton" aria-hidden="true" style="--i:${i}">
  <div class="vc-preview-thumb-wrap vc-sk-thumb"></div>
  <div class="vc-preview-body">
    <div class="vc-sk-line" style="width:90%;height:12px;margin-bottom:5px"></div>
    <div class="vc-sk-line" style="width:60%;height:10px"></div>
  </div>
</div>`).join('');
}

