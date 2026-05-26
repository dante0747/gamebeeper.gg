/**
 * watch-signal.js — GameBeeper Watch Signal orchestrator
 *
 * Initialises the Watch Signal homepage preview module and dedicated Watch page.
 * Handles data loading, rendering, filtering, and video player delegation.
 */

'use strict';

import {
  loadVideoCache, loadVideoSources, loadVideoHealth,
  filterVideos, getFeaturedVideo, getVideos, getVideoSources, getVideoHealth,
  getVideoCacheDate, videoRelTime,
} from './videos.js';
import {
  videoGridCard, videoFeaturedCard, videoPreviewCard,
  videoGridSkeleton, videoPreviewSkeleton,
} from './video-cards.js';
import { VideoFilters } from './video-filters.js';
import { openVideoModal, initVideoPlayer } from './video-player.js';
import { gaEvent } from './analytics.js';
import { esc } from './utils.js';

// ── State ─────────────────────────────────────────────────────────────────────

let _filters      = null;
let _isLoading    = true;
let _hasError     = false;
let _allVideos    = [];

// ── DOM helpers ───────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

// ── Render helpers ────────────────────────────────────────────────────────────

/** Update the Watch page status line */
function updateWatchStatus() {
  const el = $('watchStatus');
  if (!el) return;
  const sources = getVideoSources();
  const health  = getVideoHealth();
  const date    = getVideoCacheDate();
  const online  = health ? health.onlineSources : sources.length;
  const total   = health ? health.totalSources  : sources.length;
  const dateStr = date ? videoRelTime(date) : '';
  el.textContent = `${online} video source${online === 1 ? '' : 's'} online${dateStr ? ' · Updated ' + dateStr : ''}`;
}

/** Render the featured spotlight on the Watch page */
function renderFeatured(videos) {
  const wrap = $('watchFeatured');
  if (!wrap) return;
  const featured = getFeaturedVideo(videos);
  wrap.innerHTML = videoFeaturedCard(featured);
  // Wire play + watch-now buttons on featured
  wrap.querySelectorAll('[data-video-id]').forEach(el => {
    const id = el.dataset.videoId;
    if (!id) return;
    const video = _allVideos.find(v => v.id === id);
    if (!video) return;
    if (el.classList.contains('vc-watch-btn') || el.classList.contains('vc-play-btn')) {
      el.addEventListener('click', () => openVideoModal(video, el));
    }
  });
}

/** Render the Watch page grid */
function renderWatchGrid(videos) {
  const grid  = $('watchGrid');
  const empty = $('watchEmpty');
  if (!grid) return;

  if (videos.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  grid.innerHTML = videos.map((v, i) => videoGridCard(v, i)).join('');
  grid.querySelectorAll('.vc-play-btn, .vc-title-btn').forEach(el => {
    const id = el.dataset.videoId;
    const video = _allVideos.find(v => v.id === id);
    if (video) el.addEventListener('click', () => openVideoModal(video, el));
  });
  // Wire bookmark buttons in grid
  wireGridBookmarks(grid);
}

/** Wire BM buttons on a grid container */
function wireGridBookmarks(container) {
  container.querySelectorAll('.vc-bm-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      // Video bookmarks are handled via video-player delegation in storage.js
      // This fires custom logic — but for simplicity we delegate to the player module:
      const id = btn.dataset.videoId;
      if (!id) return;
      const video = _allVideos.find(v => v.id === id);
      if (!video) return;
      import('./video-player.js').then(({ closeVideoModal: _c }) => {
        // trigger bookmark toggle inline
        import('./storage.js').then(({ toggleBookmark, isBookmarked }) => {
          import('./utils.js').then(({ showBmToast }) => {
            import('./analytics.js').then(({ gaEvent }) => {
              const key     = `video:${video.id}`;
              const article = { link: key, title: video.title, source: video.sourceName, contentType: 'video', ...video };
              const added   = toggleBookmark(article, key);
              gaEvent(added ? 'bookmark_add' : 'bookmark_remove', { article_title: video.title, content_type: 'video' });
              const svg = btn.querySelector('svg');
              if (svg) svg.setAttribute('fill', added ? 'currentColor' : 'none');
              btn.classList.toggle('bm-active', added);
              btn.setAttribute('aria-label', added ? 'Remove bookmark' : `Bookmark this video: ${video.title}`);
              showBmToast(added ? '📹 Video saved' : '🗑️ Removed from bookmarks');
            });
          });
        });
      });
    });
  });
}

/** Render homepage Watch Signal preview module */
function renderPreview(videos) {
  const grid    = $('watchPreviewGrid');
  const section = $('watchPreviewSection');
  if (!grid || !section) return;

  // Only show preview if we have videos
  if (videos.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = '';

  const featured   = getFeaturedVideo(videos);
  const supporting = videos.filter(v => v !== featured).slice(0, 8); // up to 8 supporting

  const html = [
    featured    ? videoPreviewCard(featured, 0, true) : '',
    ...supporting.map((v, i) => videoPreviewCard(v, i + 1, false)),
  ].join('');

  grid.innerHTML = html;
  grid.querySelectorAll('.vc-play-btn, .vc-title-btn').forEach(el => {
    const id = el.dataset.videoId;
    const video = _allVideos.find(v => v.id === id);
    if (video) el.addEventListener('click', () => openVideoModal(video, el));
  });

  // Boot carousel after cards are in the DOM
  initPreviewCarousel();
}

// ── Homepage preview carousel controller ─────────────────────────────────────

function initPreviewCarousel() {
  const track   = $('watchPreviewGrid');
  const prevBtn = $('watchCarouselPrev');
  const nextBtn = $('watchCarouselNext');
  const dotsWrap = $('watchCarouselDots');
  if (!track || !prevBtn || !nextBtn) return;

  const INTERVAL = 4500; // ms between auto-advances
  let autoTimer  = null;
  let isPaused   = false;

  // ── Helpers ──────────────────────────────────────────────

  function cardWidth() {
    const card = track.querySelector('.vc-preview-card');
    if (!card) return track.clientWidth;
    const gap = parseInt(getComputedStyle(track).gap) || 16;
    return card.offsetWidth + gap;
  }

  function cards() {
    return Array.from(track.querySelectorAll('.vc-preview-card'));
  }

  function visibleCount() {
    const w = cardWidth();
    return w > 0 ? Math.max(1, Math.round(track.clientWidth / w)) : 1;
  }

  function currentIndex() {
    const w = cardWidth();
    return w > 0 ? Math.round(track.scrollLeft / w) : 0;
  }

  function maxIndex() {
    return Math.max(0, cards().length - visibleCount());
  }

  function scrollTo(idx) {
    const safeIdx = Math.max(0, Math.min(idx, maxIndex()));
    track.scrollTo({ left: safeIdx * cardWidth(), behavior: 'smooth' });
  }

  // ── Dots ─────────────────────────────────────────────────

  function buildDots() {
    if (!dotsWrap) return;
    const count = cards().length;
    dotsWrap.innerHTML = Array.from({ length: count }, (_, i) =>
      `<button class="watch-carousel-dot${i === 0 ? ' active' : ''}"
         aria-label="Go to slide ${i + 1} of ${count}"
         style="--carousel-interval:${INTERVAL}ms"
         data-idx="${i}"></button>`
    ).join('');
    dotsWrap.querySelectorAll('.watch-carousel-dot').forEach(dot => {
      dot.addEventListener('click', () => {
        scrollTo(parseInt(dot.dataset.idx));
        resetAuto();
      });
    });
  }

  function updateDots(idx) {
    if (!dotsWrap) return;
    dotsWrap.querySelectorAll('.watch-carousel-dot').forEach((dot, i) => {
      const wasActive = dot.classList.contains('active');
      const isActive  = i === idx;
      dot.classList.toggle('active', isActive);
      // Restart the CSS progress-bar animation on newly active dot
      if (isActive && !wasActive) {
        dot.style.animation = 'none';
        void dot.offsetWidth; // reflow
        dot.style.animation = '';
        // Re-inject the ::after by toggling
        dot.classList.remove('active');
        void dot.offsetWidth;
        dot.classList.add('active');
      }
      dot.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  // ── Navigation state ──────────────────────────────────────

  function updateNav() {
    const idx = currentIndex();
    prevBtn.disabled = idx <= 0;
    nextBtn.disabled = idx >= maxIndex();
    updateDots(idx);
  }

  // ── Auto-advance ──────────────────────────────────────────

  function startAuto() {
    if (isPaused) return;
    clearInterval(autoTimer);
    autoTimer = setInterval(() => {
      const idx = currentIndex();
      scrollTo(idx >= maxIndex() ? 0 : idx + 1);
    }, INTERVAL);
  }

  function stopAuto() {
    clearInterval(autoTimer);
    autoTimer = null;
  }

  function resetAuto() {
    stopAuto();
    startAuto();
  }

  // ── Event wiring ──────────────────────────────────────────

  prevBtn.addEventListener('click', () => { scrollTo(currentIndex() - 1); resetAuto(); });
  nextBtn.addEventListener('click', () => { scrollTo(currentIndex() + 1); resetAuto(); });

  // Update nav state on scroll (incl. touch/swipe)
  track.addEventListener('scroll', () => updateNav(), { passive: true });

  // Pause auto-advance on hover or focus inside the carousel
  const wrap = $('watchCarouselWrap');
  if (wrap) {
    wrap.addEventListener('mouseenter', () => { isPaused = true;  stopAuto(); });
    wrap.addEventListener('mouseleave', () => { isPaused = false; startAuto(); });
    wrap.addEventListener('focusin',    () => { isPaused = true;  stopAuto(); });
    wrap.addEventListener('focusout', e => {
      if (!wrap.contains(e.relatedTarget)) { isPaused = false; startAuto(); }
    });
  }

  // Keyboard: Left/Right arrows when carousel is focused
  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  { scrollTo(currentIndex() - 1); resetAuto(); e.preventDefault(); }
    if (e.key === 'ArrowRight') { scrollTo(currentIndex() + 1); resetAuto(); e.preventDefault(); }
  });

  // Touch swipe detection
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) { scrollTo(currentIndex() + (dx < 0 ? 1 : -1)); resetAuto(); }
  }, { passive: true });

  // ── Init ──────────────────────────────────────────────────

  buildDots();
  updateNav();
  startAuto();
}

// ── Filter application ────────────────────────────────────────────────────────

function applyFilters(state) {
  if (_isLoading) return;
  const filtered = filterVideos(state);
  renderFeatured(filtered);
  renderWatchGrid(filtered);
}

// ── Initialisation ────────────────────────────────────────────────────────────

async function initWatchSignal() {
  // Pre-build modal DOM
  initVideoPlayer();

  // Show skeleton states while loading
  const grid    = $('watchGrid');
  const preview = $('watchPreviewGrid');
  if (grid)    grid.innerHTML    = videoGridSkeleton(6);
  if (preview) preview.innerHTML = videoPreviewSkeleton(5);

  // Load data in parallel
  await Promise.all([loadVideoSources(), loadVideoHealth()]);
  const { videos } = await loadVideoCache();
  _allVideos  = videos;
  _isLoading  = false;

  // Show Watch page section if we have (or don't have) content
  const watchSection    = $('watch');
  if (watchSection) watchSection.style.display = '';

  updateWatchStatus();

  if (videos.length === 0) {
    // No videos yet — show empty state but not error
    const error = $('watchError');
    const errMsg = $('watchErrorMsg');
    if (error && errMsg) {
      errMsg.textContent = 'No videos cached yet. Run `node scripts/build-videos.mjs` to populate the video feed.';
      error.style.display = '';
    }
    const previewSection = $('watchPreviewSection');
    if (previewSection) previewSection.style.display = 'none';
    if (grid) grid.innerHTML = videoGridSkeleton(6).replace(/vc-sk-thumb/g, 'vc-sk-thumb vc-sk-thumb--empty');
    return;
  }

  // Build filter bar
  _filters = new VideoFilters(state => applyFilters(state));
  _filters.mount({
    genreEl: $('watchFilterGenre'),
    topicEl: $('watchFilterTopic'),
    trustEl: $('watchFilterTrust'),
    sortEl:  $('watchFilterSort'),
  });

  // Initial render
  renderFeatured(videos);
  renderWatchGrid(videos);
  renderPreview(videos);

  // Empty state reset button
  $('watchEmptyReset')?.addEventListener('click', () => {
    _filters?.reset();
    document.getElementById('watchFilterGenre')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // Bookmark delegation on Watch page (outside grid — e.g., featured card)
  const watchSection2 = $('watch');
  watchSection2?.addEventListener('click', e => {
    const btn = e.target.closest('.bm-btn');
    if (!btn || btn.closest('#watchGrid')) return; // grid handles its own
    e.stopPropagation();
    const id = btn.dataset.videoId;
    if (!id) return;
    // let the click bubble to the vc-watch-btn handler is enough; featured bm is wired in renderFeatured
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Start Watch Signal init (non-blocking, doesn't block the main feed)
  initWatchSignal().catch(err => {
    console.error('[GameBeeper] Watch Signal init error:', err);
    const watchSection = $('watch');
    if (watchSection) watchSection.style.display = '';
    const error = $('watchError');
    const errMsg = $('watchErrorMsg');
    if (error && errMsg) {
      errMsg.textContent = 'Video sources temporarily unavailable. The main feed continues to work normally.';
      error.style.display = '';
    }
  });
});

