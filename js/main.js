'use strict';

import { categories, catMeta, SPONSORED_RE, DAY_MS, CACHE_STALE_MS, FEED_PAGE_SIZE } from './config.js';
import { loadFeedsRegistry, getFeeds } from './feeds-registry.js';
import { gaEvent } from './analytics.js';
import { initConsent } from './consent.js';
import { PREF, loadPreferences, resetPreferences, hasActivePreferences, loadBookmarks, isBookmarked, toggleBookmark, BOOKMARKS_EVENT } from './storage.js';
import { esc, randomMsg, announce, animateCounter, showBmToast, shareArticle, catClass, publisherHost, relTime } from './utils.js';
import { progressivelyResolveMissingImages, resolveArticleMetadataImage, updateCardImage } from './images.js';
import { loadFeedCache, fetchAllFromRSS, normaliseCachedArticle } from './feed.js';
import { gridCard, listCard, buildSkeletons, cardPlaceholder, heroMarkup, pickLeadStory } from './cards.js';
import { initSettings } from './settings-panel.js';
import { initMyPulse } from './pulse-panel.js';
import { initPayPalModal } from './paypal-modal.js';
import { initSummaryModal, openSummaryModal } from './summary.js';

// -- State ---------------------------------------------------------

let allArticles    = [];
let activeFilter   = PREF.get('filter')      || 'All';
let viewMode       = PREF.get('view')        || 'grid';
let autoRefreshMin = parseInt(PREF.get('autorefresh') || '0', 10);
let isLoading      = false;
let failedFeeds    = 0;
let cachedFeedCount = 0;
let autoTimer      = null;
let countdownSecs  = 0;
let countdownTimer = null;
let searchQuery    = '';
let focusedCardIdx = -1;
let renderLimit    = FEED_PAGE_SIZE;   // stories currently rendered ("Show more" raises it)
let visibleList    = [];               // result of the last render(), for "Show more"
let hasRendered    = false;            // first render swaps in over the pre-rendered cards
let hasCountedUp   = false;
let lastGeneratedAt = null;            // build time of the data currently on screen

// -- DOM refs ------------------------------------------------------

const $  = id => document.getElementById(id);
const feedGrid       = $('feedGrid');
const mobileFilters  = $('mobileFilters');
const statusDot      = $('statusDot');
const statusText     = $('statusText');
const articleCount   = $('articleCount');
const errorBanner    = $('errorBanner');
const errorMessage   = $('errorMessage');
const refreshBtnHero = $('refreshBtnHero');
const refreshIcon    = $('refreshIcon');
const gridViewBtn    = $('gridViewBtn');
const listViewBtn    = $('listViewBtn');
const sbFeeds        = $('sbFeeds');
const sbUpdated      = $('sbUpdated');
const sbFailed       = $('sbFailed');
const feedMore       = $('feedMore');
const feedMoreBtn    = $('feedMoreBtn');
const feedMoreCount  = $('feedMoreCount');
const newStoriesPill = $('newStoriesPill');
const feedSection    = $('latest');

const timeFmt = d => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// -- Preference-based filtering ------------------------------------

function isSponsoredItem(a) {
  // Pre-built articles carry a `sponsored` flag stamped by build-feed.mjs
  // (regex + optional Ollama LLM pass). Trust it when present.
  if (a.sponsored === true) return true;
  // Live-fetched articles (loaded via CORS proxies at runtime) have no flag –
  // fall back to the regex which covers the obvious keyword signals.
  return SPONSORED_RE.test([(a.title || ''), (a.snippet || ''), (a.source || '')].join(' '));
}

function isWithinAgeRange(a, maxAge) {
  if (maxAge === 'any' || !a.date) return true;
  try {
    const d = new Date(a.date);
    if (isNaN(d)) return true;
    const ageMs = Date.now() - d;
    if (maxAge === '24h') return ageMs <= DAY_MS;
    if (maxAge === '7d')  return ageMs <= 7  * DAY_MS;
    if (maxAge === '30d') return ageMs <= 30 * DAY_MS;
  } catch { return true; }
  return true;
}

function applyPreferencesFilter(articles, prefs) {
  return articles.filter(a => {
    if (prefs.blockedCategories.length && prefs.blockedCategories.includes(a.category)) return false;
    if (prefs.mutedSources.length && prefs.mutedSources.includes(a.source)) return false;
    if (prefs.hideSponsored && isSponsoredItem(a)) return false;
    if (!isWithinAgeRange(a, prefs.maxAge)) return false;
    return true;
  });
}

/** Saved videos are stored with a "video:<id>" link and no category — give them card fields. */
function normaliseBookmark(b) {
  if (b.contentType !== 'video') return b;
  return {
    ...b,
    category: b.category || b.topics?.[0] || 'Trailers',
    image:    b.image || b.thumbnail || null,
    date:     b.date || b.publishedAt || null,
    source:   b.source || b.sourceName || '',
  };
}

// -- Render --------------------------------------------------------

const EMPTY_ART = {
  noSignal:  '<div class="empty-art--nosignal" aria-hidden="true"><span>NO SIGNAL</span></div>',
  inventory: '<div class="empty-art--inventory" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>',
  search:    '<div class="empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></div>',
};

function emptyStateHtml() {
  const isBookmarkView = activeFilter === 'Bookmarks';
  const pulseFiltered  = !isBookmarkView && allArticles.length > 0 && hasActivePreferences(loadPreferences());
  let art = EMPTY_ART.noSignal, title, sub, action = '';
  if (searchQuery) {
    art = EMPTY_ART.search;
    title = `No match for “${esc(searchQuery)}”`;
    sub = isBookmarkView ? 'Try another word, or search all stories.' : 'Try another word or a different topic.';
    action = '<button class="btn btn-ghost btn-sm" type="button" data-empty-action="clear-search">Clear search</button>';
  } else if (isBookmarkView) {
    art = EMPTY_ART.inventory;
    title = 'Inventory empty';
    sub = 'Your saved stories will appear here. Tap the bookmark on any story to stash it — saves stay on this device.';
    action = '<button class="btn btn-ghost btn-sm" type="button" data-empty-action="all">Browse all stories</button>';
  } else if (pulseFiltered) {
    title = 'Everything’s muted';
    sub = 'Your filters are hiding every story here. Show more topics or sources in Customize, or reset.';
    action = '<button class="btn btn-ghost btn-sm" type="button" data-empty-action="reset-pulse">Reset filters</button>';
  } else if (allArticles.length === 0) {
    title = 'No signal';
    sub = 'We couldn’t load the feed. Give it a moment and try again.';
    action = '<button class="btn btn-ghost btn-sm" type="button" data-empty-action="retry">Try again</button>';
  } else {
    title = 'Nothing on this channel';
    sub = 'No stories in this topic right now. New ones land every hour.';
    action = '<button class="btn btn-ghost btn-sm" type="button" data-empty-action="all">Show all stories</button>';
  }
  return `
    <div class="empty-state" role="status">
      ${art}
      <p class="empty-title">${title}</p>
      <p class="empty-sub">${sub}</p>
      ${action}
    </div>`;
}

function cardHtml(a, i) {
  return viewMode === 'list' ? listCard(a, i) : gridCard(a, i);
}

function render() {
  hideNewStoriesPill();
  // Entrance animation only for renders the reader triggers — not for the
  // first swap over identical pre-rendered cards.
  feedGrid.classList.toggle('can-animate', hasRendered);
  hasRendered = true;

  let visible;
  if (activeFilter === 'Bookmarks') {
    visible = loadBookmarks().map(normaliseBookmark);
  } else {
    visible = activeFilter === 'All'
      ? allArticles
      : allArticles.filter(a => a.category === activeFilter);
  }

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    visible = visible.filter(a =>
      (a.title  || '').toLowerCase().includes(q) ||
      (a.snippet|| '').toLowerCase().includes(q) ||
      (a.source || '').toLowerCase().includes(q)
    );
  }

  if (activeFilter !== 'Bookmarks') {
    visible = applyPreferencesFilter(visible, loadPreferences());
  }

  visibleList = visible;
  focusedCardIdx = -1;
  feedGrid.classList.toggle('feed-filtered', activeFilter !== 'All');

  if (visible.length === 0) {
    feedGrid.innerHTML = isLoading && allArticles.length === 0 ? buildSkeletons(6) : emptyStateHtml();
    articleCount.style.display = 'none';
    updateFeedMore();
    renderActivePulseSummary();
    if (!isLoading) announce(searchQuery ? `No stories match ${searchQuery}.` : 'No stories to show.');
    return;
  }

  const shown = visible.slice(0, renderLimit);
  feedGrid.innerHTML = shown.map(cardHtml).join('');
  feedGrid.querySelectorAll('.card').forEach((el, i) => el.style.setProperty('--i', i));

  articleCount.style.display = '';
  const label = activeFilter === 'All' ? '' : ` · ${esc(catMeta[activeFilter]?.label ?? activeFilter)}`;
  articleCount.innerHTML = `<strong>${visible.length}</strong> ${visible.length === 1 ? 'story' : 'stories'}${label}${searchQuery ? ` matching “${esc(searchQuery)}”` : ''}`;
  updateFeedMore();

  announce(`${visible.length} ${visible.length === 1 ? 'story' : 'stories'} shown.`);
  renderActivePulseSummary();
  setTimeout(progressivelyResolveMissingImages, 100);
}

/** Append the next page without re-rendering what the reader has already seen. */
function showMore() {
  const start = feedGrid.querySelectorAll('.card').length;
  renderLimit += FEED_PAGE_SIZE;
  const next = visibleList.slice(start, renderLimit);
  if (!next.length) return;
  feedGrid.insertAdjacentHTML('beforeend', next.map((a, j) => cardHtml(a, start + j)).join(''));
  const cards = feedGrid.querySelectorAll('.card');
  cards.forEach((el, i) => { if (i >= start) el.style.setProperty('--i', i - start); });
  cards[start]?.querySelector('.card-title a')?.focus({ preventScroll: true });
  updateFeedMore();
  gaEvent('feed_show_more', { shown: Math.min(renderLimit, visibleList.length) });
  setTimeout(progressivelyResolveMissingImages, 100);
}

function updateFeedMore() {
  if (!feedMore) return;
  const remaining = visibleList.length - Math.min(renderLimit, visibleList.length);
  feedMore.hidden = remaining <= 0;
  if (remaining > 0) {
    feedMoreBtn.textContent = `Show ${Math.min(remaining, FEED_PAGE_SIZE)} more stories`;
    feedMoreCount.textContent = `Showing ${Math.min(renderLimit, visibleList.length)} of ${visibleList.length}`;
  }
}

function resetPaging() { renderLimit = FEED_PAGE_SIZE; }

// -- State setters -------------------------------------------------

function setLoading() {
  statusDot.className = 'status-dot loading';
  statusText.textContent = randomMsg();
  setRefreshBusy(true);
  hideError();
  // First visit: keep the pre-rendered stories on screen until live data lands;
  // only show skeletons when there is nothing to look at yet.
  if (!allArticles.length && !feedGrid.querySelector('.card')) {
    feedGrid.innerHTML = buildSkeletons(6);
    articleCount.style.display = 'none';
  }
}

function setLive(generatedAt) {
  const updated = generatedAt ? new Date(generatedAt) : null;
  const validUpdated = updated && !isNaN(updated) ? updated : null;
  statusDot.className = allArticles.length ? 'status-dot live' : 'status-dot error';
  statusText.textContent = allArticles.length
    ? (validUpdated ? `Updated ${timeFmt(validUpdated)}` : 'Live')
    : 'Feed unavailable';
  if (validUpdated) statusText.title = validUpdated.toLocaleString();
  setRefreshBusy(false);

  // "Stories today" counts stories published since local midnight. With no data
  // we show a dash rather than a misleading zero.
  const statTodayEl = $('statToday');
  if (statTodayEl) {
    if (!allArticles.length) {
      statTodayEl.textContent = '—';
    } else {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayCount = allArticles.filter(a => { const d = new Date(a.date); return !isNaN(d) && d >= todayStart; }).length;
      if (hasCountedUp) statTodayEl.textContent = todayCount;
      else animateCounter(statTodayEl, todayCount, 700);
      hasCountedUp = true;
    }
  }
  const heroUpdated = $('heroUpdated');
  if (heroUpdated) {
    heroUpdated.textContent = validUpdated ? timeFmt(validUpdated) : '—';
    if (validUpdated) heroUpdated.title = validUpdated.toLocaleString();
  }
}

function setRefreshBusy(busy) {
  if (refreshBtnHero) {
    refreshBtnHero.disabled = busy;
    refreshBtnHero.setAttribute('aria-busy', String(busy));
  }
  if (refreshIcon) refreshIcon.classList.toggle('spin', busy);
  feedSection?.classList.toggle('is-refreshing', busy);
}

function showError(msg) { errorMessage.textContent = msg; errorBanner.classList.add('visible'); }
function hideError()    { errorBanner.classList.remove('visible'); }

// -- Counts --------------------------------------------------------

/** Distinct publishers (IGN + IGN Reviews = 1 source). */
function sourceCount() {
  return new Set(getFeeds().map(f => publisherHost(f.homepage || f.url)).filter(Boolean)).size;
}

function updateSourceCountSpans() {
  const count = sourceCount();
  if (!count) return; // registry unavailable — keep the build-time number
  ['heroFeedCount', 'statFeeds'].forEach(id => { const el = $(id); if (el) el.textContent = count; });
}

function updateBookmarkCount() {
  const count = loadBookmarks().length;
  const badge = $('sbBmCount');
  if (badge) badge.textContent = count;
  const btn = $('savedStoriesBtn');
  if (btn) {
    btn.classList.toggle('has-saved', count > 0);
    btn.setAttribute('aria-label', `Saved stories (${count})`);
  }
}

function updateSidebarStats(cacheGeneratedAt) {
  const total = cachedFeedCount || getFeeds().length;
  if (sbFeeds) sbFeeds.textContent = total ? Math.max(0, total - failedFeeds) : '—';
  if (sbUpdated) {
    const d = cacheGeneratedAt ? new Date(cacheGeneratedAt) : null;
    if (d && !isNaN(d)) {
      sbUpdated.textContent = timeFmt(d);
      sbUpdated.title = d.toLocaleString();
    } else {
      sbUpdated.textContent = '—';
    }
  }
  if (sbFailed) {
    sbFailed.textContent = failedFeeds;
    sbFailed.classList.toggle('has-errors', failedFeeds > 0);
  }
  // Feed health drawn as a game HP bar
  const hp = $('sbHpFill');
  if (hp && total) {
    const ratio = Math.max(0, total - failedFeeds) / total;
    hp.style.setProperty('--hp', `${Math.round(ratio * 100)}%`);
    hp.style.setProperty('--hp-color', ratio >= 0.95 ? '#3DDC97' : ratio >= 0.7 ? '#FFD23D' : '#FF5C6C');
  }
  updateBookmarkCount();
}

// -- Feed-health notice --------------------------------------------
// Only shown when some source feeds failed this hour. Error details stay in
// the console; readers just see which sources are temporarily missing.

async function loadFeedHealthBanner() {
  const bar = $('feedHealthBar');
  if (!bar) return;
  try {
    const resp = await fetch('/feed-health.json', { cache: 'no-cache', signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return;
    const health = await resp.json();
    const failedList = Array.isArray(health.feeds) ? health.feeds.filter(f => !f.ok) : [];
    if (!failedList.length) { bar.style.display = 'none'; return; }
    failedList.forEach(f => console.debug(`[GameBeeper] Feed "${f.name}" failed: ${f.error || 'unknown error'}`));
    const names = failedList.map(f => esc(f.name)).join(', ');
    bar.innerHTML = `<span class="fhb-info"><span class="status-dot loading" aria-hidden="true"></span>${failedList.length} source feed${failedList.length === 1 ? '' : 's'} couldn’t be reached this hour.</span><span class="fhb-names">Missing for now: ${names}</span>`;
    bar.style.display = '';
  } catch (e) {
    console.debug('[GameBeeper] feed-health.json unavailable:', e.message);
  }
}

// -- Site version badge --------------------------------------------

async function loadSiteVersion() {
  const el = $('siteVersion');
  if (!el) return;
  try {
    const resp = await fetch('/version.json', { cache: 'no-cache', signal: AbortSignal.timeout(4000) });
    if (!resp.ok) return;
    const v = await resp.json();
    el.textContent = `${v.version} · ${v.commit}`;
    el.title = `Build #${v.build} (${v.date}) – view changelog`;
  } catch {
    el.textContent = 'Changelog';
  }
}

// -- Filters -------------------------------------------------------

function buildFilters() {
  const counts = {};
  allArticles.forEach(a => { counts[a.category] = (counts[a.category] || 0) + 1; });
  const bmCount = loadBookmarks().length;

  const visibleCategories = categories.filter(c => {
    if (c.id === 'All' || c.id === 'Bookmarks') return true;
    return (counts[c.id] || 0) > 0;
  });

  mobileFilters.innerHTML = visibleCategories.map(c => {
    const active = c.id === activeFilter;
    const lead = c.id === 'Bookmarks'
      ? `<span class="chip-icon" aria-hidden="true">${c.icon.replace(/width="\d+" height="\d+"/, 'width="13" height="13"')}</span>`
      : (c.id === 'All' ? '' : `<span class="chip-tick" aria-hidden="true"></span>`);
    const count = c.id === 'Bookmarks' ? `<span class="chip-count">${bmCount}</span>` : '';
    return `<button type="button" class="chip ${catClass(c.id)}${active ? ' active' : ''}" data-cat="${esc(c.id)}" aria-pressed="${active}">${lead}${esc(c.label)}${count}</button>`;
  }).join('');

  if (typeof window.__updateFiltersMask === 'function') {
    setTimeout(window.__updateFiltersMask, 50);
  }
  revealActiveChip('auto');
  updateBookmarkCount();
}

/** Scroll the topic bar sideways so the selected chip is visible. */
function revealActiveChip(behavior = 'smooth') {
  const chip = mobileFilters.querySelector('.chip.active');
  if (!chip) return;
  const c = chip.getBoundingClientRect();
  const r = mobileFilters.getBoundingClientRect();
  if (c.left < r.left || c.right > r.right) {
    mobileFilters.scrollBy({ left: c.left - r.left - 24, behavior });
  }
}

// -- Hero lead story ------------------------------------------------

function buildHeroFeaturedCard(articles) {
  const card = $('heroFeaturedCard');
  if (!card || !articles.length) return;
  const featured = pickLeadStory(articles);
  if (!featured) return;

  const current = card.querySelector('.lead-card');
  if (current?.dataset.articleUrl === featured.link) {
    // Same lead as the pre-rendered one: update in place so the LCP image is untouched.
    const time = current.querySelector('.lead-date');
    if (time) time.textContent = relTime(featured.date);
    syncBookmarkButtons(featured.link, isBookmarked(featured.link), featured.title);
  } else {
    card.innerHTML = heroMarkup(articles);
  }
}

/** One delegated listener for the hero lead (its markup is replaced on refresh). */
function initHeroCard() {
  const card = $('heroFeaturedCard');
  if (!card) return;
  const leadArticle = () => {
    const link = card.querySelector('.lead-card')?.dataset.articleUrl;
    return allArticles.find(a => a.link === link) || null;
  };
  card.addEventListener('click', e => {
    const bmBtn = e.target.closest('#heroFeaturedBmBtn');
    const shareBtn = e.target.closest('#heroFeaturedShareBtn');
    const titleLink = e.target.closest('.lead-title a');
    if (!bmBtn && !shareBtn && !titleLink) return;
    const featured = leadArticle();
    if (bmBtn || shareBtn) { e.preventDefault(); e.stopPropagation(); }
    if (!featured) {
      if (shareBtn) shareArticle(shareBtn.dataset.shareTitle, shareBtn.dataset.shareUrl);
      return;
    }
    if (bmBtn) {
      handleBookmarkToggle(bmBtn, featured);
    } else if (shareBtn) {
      gaEvent('share', { article_title: featured.title, article_url: featured.link });
      shareArticle(featured.title, featured.link);
    } else {
      gaEvent('select_content', { content_type: 'article', item_id: featured.link, article_title: featured.title, article_source: featured.source, placement: 'hero' });
    }
  });
}

// -- Headline ticker -------------------------------------------------

const TICKER_COUNT = 12;
const TICKER_SPEED = 70; // px per second

function tickerItems(articles, focusable) {
  return articles.slice(0, TICKER_COUNT).map(a => `
    <a class="ticker-item ${catClass(a.category)}" href="${esc(a.link)}" target="_blank" rel="noopener noreferrer"${focusable ? '' : ' tabindex="-1"'}><b>${esc(a.source)}</b><span>${esc(a.title)}</span></a><span class="ticker-sep" aria-hidden="true">&#9670;</span>`).join('');
}

/** Broadcast-style lower third with the newest headlines (two copies for a seamless loop). */
function buildTicker(articles) {
  const ticker = $('ticker');
  const track = $('tickerTrack');
  if (!ticker || !track || !articles.length) return;
  track.innerHTML = `<span class="ticker-set">${tickerItems(articles, true)}</span><span class="ticker-set" aria-hidden="true">${tickerItems(articles, false)}</span>`;
  const half = track.scrollWidth / 2;
  track.style.setProperty('--ticker-dur', `${Math.max(30, Math.round(half / TICKER_SPEED))}s`);
  ticker.classList.add('is-running');
}

function initTicker() {
  const ticker = $('ticker');
  const toggle = $('tickerToggle');
  if (!ticker) return;
  toggle?.addEventListener('click', () => {
    const paused = ticker.classList.toggle('is-paused');
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.setAttribute('aria-label', paused ? 'Play headline ticker' : 'Pause headline ticker');
    toggle.title = paused ? 'Play' : 'Pause';
  });
  ticker.addEventListener('click', e => {
    const link = e.target.closest('a.ticker-item');
    if (link) gaEvent('select_content', { content_type: 'article', item_id: link.href, placement: 'ticker' });
  });
}

// -- Topics in the feed (rail) ---------------------------------------

function updateTrendingTopics(articles) {
  const grid = $('trendingTopicsGrid');
  if (!grid || !articles.length) return;

  const catCounts = {};
  articles.forEach(a => {
    if (a.category && a.category !== 'All' && a.category !== 'Bookmarks') {
      catCounts[a.category] = (catCounts[a.category] || 0) + 1;
    }
  });
  const topCats = Object.entries(catCounts).sort(([, a], [, b]) => b - a).slice(0, 8);
  if (!topCats.length) return;
  const max = topCats[0][1];

  grid.innerHTML = topCats.map(([cat, count]) => `
    <button type="button" class="trending-topic ${catClass(cat)}${cat === activeFilter ? ' active' : ''}" data-trending-cat="${esc(cat)}" style="--share:${(count / max).toFixed(3)}" aria-label="${esc(catMeta[cat]?.label ?? cat)}: ${count} stories">
      <span>${esc(catMeta[cat]?.label ?? cat)}</span><span class="trending-topic-count">${count}</span>
      <span class="trending-topic-bar" aria-hidden="true"></span>
    </button>`).join('');
}

// -- Set filter (exposed globally) ---------------------------------------------

function setFilter(cat) {
  activeFilter = cat;
  PREF.set('filter', cat);
  gaEvent('filter_category', { category: cat });
  mobileFilters.querySelectorAll('[data-cat]').forEach(btn => {
    const active = btn.dataset.cat === cat;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  document.querySelectorAll('.trending-topic').forEach(btn => btn.classList.toggle('active', btn.dataset.trendingCat === cat));
  revealActiveChip();
  resetPaging();
  render();
}

/** Move to the previous/next topic tab, like a console menu's shoulder buttons. */
function stepTopic(step) {
  const tabs = [...mobileFilters.querySelectorAll('[data-cat]')];
  if (!tabs.length) return;
  const i = Math.max(0, tabs.findIndex(t => t.dataset.cat === activeFilter));
  const next = tabs[(i + step + tabs.length) % tabs.length];
  setFilter(next.dataset.cat);
  next.focus({ preventScroll: true });
}

/** Bring the top of the feed section into view below the sticky header. */
function scrollToFeed() {
  if (!feedSection) return;
  const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h'), 10) || 64;
  const top = feedSection.getBoundingClientRect().top + window.scrollY - navH;
  window.scrollTo({ top: Math.max(0, top), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

// -- View mode -----------------------------------------------------

function applyView() {
  feedGrid.classList.toggle('list-view', viewMode === 'list');
  gridViewBtn.classList.toggle('active', viewMode === 'grid');
  listViewBtn.classList.toggle('active', viewMode === 'list');
  gridViewBtn.setAttribute('aria-pressed', String(viewMode === 'grid'));
  listViewBtn.setAttribute('aria-pressed', String(viewMode === 'list'));
}

// -- Bookmarks -----------------------------------------------------

/** Toggle a bookmark and mirror the new state on every button for that story. */
function handleBookmarkToggle(btn, article) {
  const added = toggleBookmark(article);
  gaEvent(added ? 'bookmark_add' : 'bookmark_remove', {
    article_title: article.title, article_source: article.source, article_url: article.link,
  });
  syncBookmarkButtons(article.link, added, article.title);
  showBmToast(added ? (unlockAchievement('firstsave') ? 'Achievement unlocked: First save' : 'Saved for later') : 'Removed from saved');
  if (activeFilter === 'Bookmarks') render();
}

function syncBookmarkButtons(link, added, title = '') {
  document.querySelectorAll(`[data-bm-link="${CSS.escape(link)}"]`).forEach(el => {
    el.querySelector('svg')?.setAttribute('fill', added ? 'currentColor' : 'none');
    el.classList.toggle('bm-active', added);
    el.setAttribute('aria-pressed', String(added));
    el.title = added ? 'Remove from saved' : 'Save story';
    if (el.classList.contains('bm-btn') && !el.classList.contains('vp-bm-btn')) {
      el.setAttribute('aria-label', `${added ? 'Remove from saved stories' : 'Save story'}${title ? ': ' + title : ''}`);
    }
  });
}

/** One-time achievements. Returns true the first time an id is unlocked. */
function unlockAchievement(id) {
  try {
    const key = `gs:ach:${id}`;
    if (localStorage.getItem(key)) return false;
    localStorage.setItem(key, '1');
    return true;
  } catch { return false; }
}

// -- Konami code -----------------------------------------------------
// Up Up Down Down Left Right Left Right B A: a few seconds of party mode.

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiPos = 0;

function trackKonami(e) {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  konamiPos = key === KONAMI[konamiPos] ? konamiPos + 1 : (key === KONAMI[0] ? 1 : 0);
  if (konamiPos < KONAMI.length) return;
  konamiPos = 0;
  document.body.classList.add('cheat-mode');
  showBmToast(unlockAchievement('konami') ? 'Achievement unlocked: +30 lives' : 'Cheat activated: +30 lives');
  gaEvent('easter_egg', { name: 'konami' });
  setTimeout(() => document.body.classList.remove('cheat-mode'), 6000);
}

// -- Nav scroll effect + mobile menu ---------------------------

function initNav() {
  const nav = document.querySelector('.top-nav');
  if (!nav) return;
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const hamburger = $('navHamburger');
  const drawer    = $('navDrawer');
  const backdrop  = $('navDrawerBackdrop');
  if (!hamburger || !drawer || !backdrop) return;

  function openDrawer() {
    hamburger.classList.add('open');
    drawer.classList.add('open');
    backdrop.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    hamburger.setAttribute('aria-label', 'Close menu');
    drawer.removeAttribute('aria-hidden');
    const firstLink = drawer.querySelector('.nav-drawer-link');
    if (firstLink) setTimeout(() => firstLink.focus(), 50);
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer({ restoreFocus = true } = {}) {
    hamburger.classList.remove('open');
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Open menu');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (restoreFocus) hamburger.focus();
  }

  hamburger.addEventListener('click', () => {
    if (drawer.classList.contains('open')) closeDrawer(); else openDrawer();
  });
  backdrop.addEventListener('click', () => closeDrawer());

  // Close when a link is tapped (focus moves to the destination instead)
  drawer.querySelectorAll('.nav-drawer-link').forEach(link => {
    link.addEventListener('click', () => closeDrawer({ restoreFocus: false }));
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
  });

  // Close if the viewport grows past the mobile breakpoint
  matchMedia('(min-width: 960px)').addEventListener?.('change', e => {
    if (e.matches && drawer.classList.contains('open')) closeDrawer({ restoreFocus: false });
  });

  // Focus trap within drawer
  drawer.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(drawer.querySelectorAll('.nav-drawer-link'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });
}

// -- Topic chip scroll mask ---------------------------------------

function initMobileFiltersMask() {
  const el = mobileFilters;
  if (!el) return;
  function updateMask() {
    const atLeft  = el.scrollLeft <= 2;
    const atRight = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
    el.classList.remove('mask-left', 'mask-right', 'mask-both');
    if (!atLeft && !atRight) el.classList.add('mask-both');
    else if (!atLeft) el.classList.add('mask-left');
    else if (!atRight) el.classList.add('mask-right');
  }
  el.addEventListener('scroll', updateMask, { passive: true });
  window.addEventListener('resize', updateMask, { passive: true });
  setTimeout(updateMask, 100);
  window.__updateFiltersMask = updateMask;
}

// -- Auto-refresh --------------------------------------------------

function updateCountdownUI(secs) {
  const el = $('autoRefreshCountdown');
  if (!el) return;
  if (!secs || secs <= 0) { el.textContent = ''; el.style.display = 'none'; return; }
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  el.textContent = `Next ${m}:${String(s).padStart(2, '0')}`;
  el.title = 'Time until the next automatic refresh';
  el.style.display = '';
}

function startAutoRefresh(minutes) {
  clearInterval(autoTimer);
  clearInterval(countdownTimer);
  autoTimer = null; countdownTimer = null;
  updateCountdownUI(0);
  if (!minutes) return;

  countdownSecs = minutes * 60;
  updateCountdownUI(countdownSecs);
  countdownTimer = setInterval(() => {
    countdownSecs--;
    updateCountdownUI(countdownSecs);
    if (countdownSecs <= 0) clearInterval(countdownTimer);
  }, 1000);
  autoTimer = setInterval(() => {
    fetchAll({ silent: true }).then(() => startAutoRefresh(autoRefreshMin));
  }, minutes * 60 * 1000);
}

// -- "N new stories" pill --------------------------------------------

function showNewStoriesPill(count) {
  if (!newStoriesPill) return;
  newStoriesPill.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>${count} new ${count === 1 ? 'story' : 'stories'}`;
  newStoriesPill.hidden = false;
  announce(`${count} new ${count === 1 ? 'story' : 'stories'} available.`);
}

function hideNewStoriesPill() {
  if (newStoriesPill) newStoriesPill.hidden = true;
}

/** True when the reader has scrolled into the feed (re-rendering would move what they're reading). */
function isReadingFeed() {
  return feedGrid.getBoundingClientRect().top < 0;
}

// -- My Signal summary bar ------------------------------------------

function renderActivePulseSummary() {
  const bar = $('pulseSummaryBar');
  const btn = $('myPulseBtn');
  const prefs = loadPreferences();
  const active = hasActivePreferences(prefs);
  btn?.classList.toggle('has-prefs', active);
  if (!bar) return;
  if (!active) { bar.style.display = 'none'; return; }
  bar.style.display = '';
  const parts = [];
  if (prefs.blockedCategories.length) parts.push(`${prefs.blockedCategories.length} topic${prefs.blockedCategories.length === 1 ? '' : 's'} hidden`);
  if (prefs.mutedSources.length) parts.push(`${prefs.mutedSources.length} source${prefs.mutedSources.length === 1 ? '' : 's'} muted`);
  if (prefs.hideSponsored) parts.push('Sponsored hidden');
  if (prefs.maxAge !== 'any') {
    const ageLabels = { '24h': 'Last 24 hours', '7d': 'Last 7 days', '30d': 'Last 30 days' };
    parts.push(ageLabels[prefs.maxAge] || prefs.maxAge);
  }
  bar.innerHTML = `
    <span class="psb-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg></span>
    <span class="psb-label">My Signal:</span>
    ${parts.map(p => `<span class="psb-pill">${esc(p)}</span>`).join('')}
    <button class="psb-reset" id="pulseSummaryReset" type="button" aria-label="Reset My Signal filters">Reset</button>
    <button class="psb-edit" id="pulseSummaryEdit" type="button" aria-label="Edit My Signal filters">Edit</button>`;
  $('pulseSummaryReset')?.addEventListener('click', () => {
    resetPreferences(); resetPaging(); render(); syncMyPulsePanelIfOpen();
  });
  $('pulseSummaryEdit')?.addEventListener('click', openMyPulsePanel);
}

function openMyPulsePanel() {
  if (typeof window.__openMyPulse === 'function') window.__openMyPulse();
}

function syncMyPulsePanelIfOpen() {
  if (typeof window.__syncMyPulse === 'function') window.__syncMyPulse();
}

// -- Stale cache banner --------------------------------------------

function showStaleCacheBanner(generatedAt) {
  let bar = $('staleCacheBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'staleCacheBar';
    bar.className = 'stale-cache-bar';
    bar.setAttribute('role', 'status');
    const grid = feedGrid?.parentNode;
    if (grid) grid.insertBefore(bar, feedGrid);
  }
  try {
    const ageMs = Date.now() - new Date(generatedAt).getTime();
    const hoursAgo = Math.round(ageMs / 3_600_000);
    bar.innerHTML =
      `<span>These stories were last updated <strong>${hoursAgo} hours ago</strong>. The next update should land soon.</span>` +
      `<button class="stale-cache-bar__refresh" id="staleCacheRefresh" type="button">Check now</button>`;
    bar.classList.add('visible');
    $('staleCacheRefresh')?.addEventListener('click', () => { bar.classList.remove('visible'); fetchAll(); });
  } catch { /* bad date – skip */ }
}

function hideStaleCacheBanner() {
  $('staleCacheBar')?.classList.remove('visible');
}

// -- Primary data loader -------------------------------------------

/**
 * Load the feed. Existing stories stay on screen while refreshing.
 * `silent` (auto-refresh): if the reader is mid-feed and new stories arrived,
 * offer them via the "N new stories" pill instead of moving the page.
 */
async function fetchAll({ silent = false } = {}) {
  if (isLoading) return;
  isLoading = true;
  const previous = allArticles;
  const previousLinks = new Set(previous.map(a => a.link));
  const prevFailed = failedFeeds;
  // Pre-rendered stories from the HTML (first visit, before live data arrives)
  const hasStaticCards = !previous.length && !!feedGrid.querySelector('.card');
  failedFeeds = 0;
  setLoading();

  let cacheGeneratedAt = null;
  let loadFailed = false;

  try {
    const data = await loadFeedCache();
    allArticles = data.articles.map(normaliseCachedArticle).filter(a => a.link && a.link !== '#');
    failedFeeds = data.failedFeeds || 0;
    cacheGeneratedAt = data.generatedAt || null;
    if (data.feedCount) cachedFeedCount = data.feedCount;
    console.info(`[GameBeeper] Loaded ${allArticles.length} articles from cache (generated ${data.generatedAt}).`);
    if (cacheGeneratedAt) {
      const ageMs = Date.now() - new Date(cacheGeneratedAt).getTime();
      if (ageMs > CACHE_STALE_MS) showStaleCacheBanner(cacheGeneratedAt);
      else hideStaleCacheBanner();
    }
  } catch (cacheErr) {
    console.warn('[GameBeeper] Feed cache unavailable, attempting emergency RSS fallback…', cacheErr.message);
    try {
      const result = await fetchAllFromRSS();
      if (!result.articles.length) throw new Error('RSS fallback returned no articles');
      allArticles = result.articles;
      failedFeeds = result.failedCount;
    } catch (rssErr) {
      console.error('[GameBeeper] Emergency RSS fallback also failed:', rssErr.message);
      loadFailed = true;
      // Keep whatever the reader already had rather than blanking the page.
      allArticles = previous;
      failedFeeds = prevFailed;
      showError(previous.length
        ? 'We couldn’t refresh the signal right now. Your current stories are still here.'
        : hasStaticCards
          ? 'We couldn’t refresh the signal right now. The stories below may be a little out of date.'
          : 'We couldn’t reach the signal right now. Please try again in a moment.');
    }
  }

  isLoading = false;
  if (!loadFailed) lastGeneratedAt = cacheGeneratedAt;
  setLive(lastGeneratedAt);
  if (loadFailed && previous.length) statusText.textContent = 'Refresh failed';
  updateSidebarStats(lastGeneratedAt);
  loadFeedHealthBanner();

  // If the active filter no longer has articles, reset to 'All'
  if (activeFilter !== 'All' && activeFilter !== 'Bookmarks') {
    const hasArticles = allArticles.some(a => a.category === activeFilter);
    if (!hasArticles) {
      activeFilter = 'All';
      PREF.set('filter', 'All');
    }
  }

  buildFilters();
  buildHeroFeaturedCard(allArticles);
  buildTicker(allArticles);
  updateTrendingTopics(allArticles);

  const newCount = previous.length ? allArticles.filter(a => !previousLinks.has(a.link)).length : 0;
  if (loadFailed && (previous.length || hasStaticCards)) {
    // Nothing new to show: keep what is on screen.
  } else if (silent && previous.length) {
    if (newCount === 0) {
      // Nothing new: leave the page exactly as it is.
    } else if (isReadingFeed()) {
      showNewStoriesPill(newCount);
    } else {
      render();
    }
  } else {
    render();
    if (previous.length && !loadFailed) {
      showBmToast(newCount ? `${newCount} new ${newCount === 1 ? 'story' : 'stories'}` : 'You’re up to date');
    }
  }

  if (allArticles.length > 0 && !loadFailed) hideError();
}

// -- Init ----------------------------------------------------------

async function init() {
  await loadFeedsRegistry();
  updateSourceCountSpans();

  initNav();
  initMobileFiltersMask();
  initSettings({
    getAutoRefreshMin: ()  => autoRefreshMin,
    setAutoRefreshMin: v   => { autoRefreshMin = v; },
    getViewMode:       ()  => viewMode,
    setViewMode:       v   => { viewMode = v; },
    applyView,
    render,
    startAutoRefresh,
  });
  initMyPulse({ render: () => { resetPaging(); render(); }, buildFilters });
  initPayPalModal();
  initSummaryModal();
  initHeroCard();
  initTicker();
  applyView();
  buildFilters();

  // Expose public globals
  window.__setFilter    = setFilter;
  window.resetPreferences = resetPreferences;
  window.syncMyPulsePanelIfOpen = syncMyPulsePanelIfOpen;
  window.__pulseReset   = () => { resetPreferences(); resetPaging(); render(); syncMyPulsePanelIfOpen(); };

  // Topic chips (one delegated listener; the chips are rebuilt on every load)
  mobileFilters.addEventListener('click', e => {
    const btn = e.target.closest('[data-cat]');
    if (btn) setFilter(btn.dataset.cat);
  });

  // Shoulder-button keycaps beside the topic tabs
  document.querySelectorAll('.tab-key').forEach(btn => {
    btn.addEventListener('click', () => stepTopic(Number(btn.dataset.tabStep) || 1));
  });

  // Topics rail
  $('trendingTopicsGrid')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-trending-cat]');
    if (!btn) return;
    setFilter(btn.dataset.trendingCat);
    scrollToFeed();
  });

  // Any link or button with data-set-filter (nav "Saved", footer, source groups)
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-set-filter]');
    if (!el) return;
    e.preventDefault();
    setFilter(el.dataset.setFilter);
    scrollToFeed();
  });

  // Search: nav button, "/" and Ctrl/⌘+K all land in the feed search field
  const searchInput = $('articleSearch');
  const searchKbd   = $('searchKbd');
  function focusSearch(trigger) {
    scrollToFeed();
    setTimeout(() => { searchInput?.focus({ preventScroll: true }); searchInput?.select(); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350);
    gaEvent('search_open', { trigger });
  }
  $('navSearchBtn')?.addEventListener('click', () => focusSearch('nav_search_btn'));

  gridViewBtn.addEventListener('click', () => {
    viewMode = 'grid'; PREF.set('view', viewMode); applyView(); render();
  });
  listViewBtn.addEventListener('click', () => {
    viewMode = 'list'; PREF.set('view', viewMode); applyView(); render();
  });

  refreshBtnHero?.addEventListener('click', () => {
    gaEvent('refresh_feeds', { trigger: 'refreshBtnHero' });
    fetchAll();
  });
  $('errorRetry')?.addEventListener('click', () => fetchAll());
  feedMoreBtn?.addEventListener('click', showMore);
  newStoriesPill?.addEventListener('click', () => {
    resetPaging();
    render();
    scrollToFeed();
    gaEvent('new_stories_shown', {});
  });

  // Empty-state actions
  feedGrid.addEventListener('click', e => {
    const btn = e.target.closest('[data-empty-action]');
    if (!btn) return;
    const action = btn.dataset.emptyAction;
    if (action === 'clear-search') { searchInput.value = ''; searchQuery = ''; resetPaging(); render(); searchInput.focus(); }
    else if (action === 'all') setFilter('All');
    else if (action === 'reset-pulse') window.__pulseReset();
    else if (action === 'retry') fetchAll();
  });

  fetchAll().then(() => startAutoRefresh(autoRefreshMin));
  loadSiteVersion();

  // Register Service Worker for offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(reg => {
      console.debug('[GameBeeper] SW registered, scope:', reg.scope);
    }).catch(err => {
      console.warn('[GameBeeper] SW registration failed:', err.message);
    });
  }

  updateSidebarStats();

  // Keep counters, chips and the Saved view in step with bookmarks changed
  // anywhere (feed cards, hero, Watch videos, video player).
  window.addEventListener(BOOKMARKS_EVENT, () => {
    buildFilters();
  });

  // Image load quality guard – replace upscaled images with placeholder
  feedGrid.addEventListener('load', async event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.classList.contains('card-img')) return;
    const nW = img.naturalWidth || 0;
    const nH = img.naturalHeight || 0;
    if (nW === 0 || nH === 0) return;
    const wrap = img.closest('.card-img-wrap');
    const card = img.closest('.card');
    if (!wrap || !card || wrap.classList.contains('card-placeholder')) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = wrap.getBoundingClientRect();
    const targetW = (rect.width  || Number(img.getAttribute('width'))  || 0) * dpr;
    const targetH = (rect.height || Number(img.getAttribute('height')) || 0) * dpr;
    if (targetW === 0 || targetH === 0) return;
    const TOL = 0.8;
    if (nW >= targetW * TOL && nH >= targetH * TOL) return;
    const category = card.dataset.category || img.dataset.category || 'General';
    const link     = card.dataset.articleUrl || img.dataset.link || '#';
    img.onerror = null;
    wrap.outerHTML = cardPlaceholder(category, link);
  }, true);

  // Broken image handler – replace with placeholder, then try to resolve a better image
  feedGrid.addEventListener('error', async event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.classList.contains('card-img')) return;
    const card = img.closest('.card');
    const wrap = img.closest('.card-img-wrap');
    // A failing placeholder must not be replaced by itself again (error loop)
    if (!card || !wrap || wrap.classList.contains('card-placeholder')) return;
    const category = card.dataset.category || img.dataset.category || 'General';
    const link     = card.dataset.articleUrl || img.dataset.link || '#';
    wrap.outerHTML = cardPlaceholder(category, link);
    if (!link || link === '#') return;
    try {
      const imageData = await resolveArticleMetadataImage(link);
      if (imageData) updateCardImage(card, imageData);
    } catch (err) {
      console.warn('[GameBeeper] Could not resolve fallback image after error', err);
    }
  }, true);

  // Bookmark delegation
  feedGrid.addEventListener('click', e => {
    const btn = e.target.closest('.bm-btn');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    const link = btn.dataset.bmLink;
    const article = allArticles.find(a => a.link === link) || loadBookmarks().find(a => a.link === link);
    if (!article) return;
    handleBookmarkToggle(btn, article);
  });

  // Share delegation
  feedGrid.addEventListener('click', e => {
    const btn = e.target.closest('.card-share-btn');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    gaEvent('share', { article_title: btn.dataset.shareTitle, article_url: btn.dataset.shareUrl });
    shareArticle(btn.dataset.shareTitle, btn.dataset.shareUrl);
  });

  // Summary delegation
  feedGrid.addEventListener('click', e => {
    const btn = e.target.closest('.card-summary-btn');
    if (!btn) return;
    e.preventDefault(); e.stopPropagation();
    gaEvent('summary_open', { article_title: btn.dataset.summaryTitle, article_url: btn.dataset.summaryLink });
    openSummaryModal({
      title:       btn.dataset.summaryTitle,
      snippet:     btn.dataset.summarySnippet,
      summaryType: btn.dataset.summaryType,
      link:        btn.dataset.summaryLink,
      source:      btn.dataset.summarySource,
    });
  });

  // Outbound link tracking
  feedGrid.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const card = link.closest('.card');
    if (!card) return;
    gaEvent('select_content', {
      content_type: 'article',
      item_id: link.href,
      article_title: card.querySelector('.card-title a')?.textContent?.trim() || '',
      article_source: card.querySelector('.card-source span:nth-child(2)')?.textContent?.trim() || '',
      article_category: card.dataset.category || '',
    });
  });

  // Search input
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = searchInput.value.trim();
        if (searchQuery.length >= 3) gaEvent('search', { search_term: searchQuery });
        resetPaging();
        render();
      }, 180);
    });
    searchInput.addEventListener('focus', () => { if (searchKbd) searchKbd.style.display = 'none'; });
    searchInput.addEventListener('blur',  () => { if (searchKbd && !searchInput.value) searchKbd.style.display = ''; });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName?.toLowerCase();
    const inInput = tag === 'input' || tag === 'textarea' || tag === 'select';
    if (!inInput) trackKonami(e);

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault(); focusSearch('shortcut_mod_k');
    } else if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    } else if (e.key === '/' && !inInput) {
      e.preventDefault(); focusSearch('shortcut_slash');
    } else if (e.key === 'Escape' && document.activeElement === searchInput) {
      searchInput.blur();
      if (searchInput.value) { searchInput.value = ''; searchQuery = ''; resetPaging(); render(); }
    } else if (e.key === 'r' && !inInput) {
      fetchAll();
    } else if ((e.key === '[' || e.key === ']') && !inInput) {
      e.preventDefault();
      stepTopic(e.key === ']' ? 1 : -1);
    } else if ((e.key === 'j' || e.key === 'k') && !inInput) {
      const cards = Array.from(feedGrid.querySelectorAll('.card'));
      if (!cards.length) return;
      e.preventDefault();
      focusedCardIdx = e.key === 'j'
        ? Math.min(focusedCardIdx + 1, cards.length - 1)
        : Math.max(focusedCardIdx - 1, 0);
      cards[focusedCardIdx]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cards[focusedCardIdx]?.querySelector('.card-title a')?.focus({ preventScroll: true });
    } else if (e.key === 'o' && !inInput && focusedCardIdx >= 0) {
      const cards = Array.from(feedGrid.querySelectorAll('.card'));
      const link = cards[focusedCardIdx]?.querySelector('.card-title a');
      if (link) window.open(link.href, '_blank', 'noopener,noreferrer');
    }
  });
}

// -- Bootstrap -----------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Initialise cookie/analytics consent (GDPR)
  initConsent();

  init();

  // Back to top button
  const btn = $('backToTop');
  if (!btn) return;
  let visible = false;
  let hideTimer = null;

  function onScroll() {
    const shouldShow = window.scrollY > 900;
    if (shouldShow && !visible) {
      visible = true;
      clearTimeout(hideTimer);
      btn.classList.remove('hiding');
      btn.classList.add('visible');
    } else if (!shouldShow && visible) {
      visible = false;
      btn.classList.add('hiding');
      hideTimer = setTimeout(() => btn.classList.remove('visible', 'hiding'), 220);
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    document.querySelector('.logo')?.focus({ preventScroll: true });
  });
});
