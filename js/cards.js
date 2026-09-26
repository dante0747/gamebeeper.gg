import { catMeta } from './config.js';
import { esc, safeUrl, catClass, relTime, absDate } from './utils.js';
import { isBookmarked } from './storage.js';

// Card templates are shared by the browser (js/main.js) and the build-time
// pre-renderer (scripts/generate-seo-content.mjs). Pass { static: true } when
// rendering at build time: dates become absolute and bookmark state is skipped.

// -- Icons (Lucide, 1.8px stroke) ----------------------------------------------

const svg = (body, { size = 16, fill = 'none' } = {}) =>
  `<svg aria-hidden="true" viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fill}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

const BOOKMARK_PATH = '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>';
const SHARE_PATH    = '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>';
const SPARKLE_PATH  = '<path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.4l-1.8-4.9L5 9.7l5.2-1.8z"/><path d="M19 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>';
const PLAY_PATH     = '<polygon points="6 4 20 12 6 20 6 4"/>';

// -- Small helpers -------------------------------------------------------------

/** Where a card should link to. Saved videos keep "video:<id>" as their bookmark key. */
export function articleHref(a) {
  if (a.contentType === 'video' && a.externalUrl) return a.externalUrl;
  return a.link;
}

// Real article image or null. Stories without one get the category placeholder,
// which js/images.js later tries to upgrade from the article's own metadata.
function imageSrc(a) {
  const src = safeUrl(a.image || a.thumbnail || null);
  return src !== '#' ? src : null;
}

function catLabel(category) {
  const label = catMeta[category]?.label ?? category ?? 'General';
  return `<span class="card-cat ${catClass(category)}">${esc(label)}</span>`;
}

function timeTag(dateStr, opts, cls = 'card-date') {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const label = opts.static ? absDate(dateStr) : relTime(dateStr);
  return label ? `<time class="${cls}" datetime="${esc(d.toISOString())}">${esc(label)}</time>` : '';
}

function bookmarkBtn(a, opts, id = '') {
  const bm = !opts.static && isBookmarked(a.link);
  return `<button class="icon-btn bm-btn${bm ? ' bm-active' : ''}"${id ? ` id="${id}"` : ''} data-bm-link="${esc(a.link)}" aria-pressed="${bm}" title="${bm ? 'Remove from saved' : 'Save story'}" aria-label="${bm ? 'Remove from saved stories' : 'Save story'}: ${esc(a.title)}">${svg(BOOKMARK_PATH, { fill: bm ? 'currentColor' : 'none' })}</button>`;
}

function shareBtn(a, href, id = '') {
  return `<button class="icon-btn card-share-btn"${id ? ` id="${id}"` : ''} data-share-url="${esc(href)}" data-share-title="${esc(a.title)}" title="Share" aria-label="Share: ${esc(a.title)}">${svg(SHARE_PATH)}</button>`;
}

// Only AI summaries get a button — plain RSS snippets are already on the card.
function summaryBtn(a) {
  if (a.summaryType !== 'ai' || !a.snippet) return '';
  return `<button class="icon-btn card-summary-btn" data-summary-title="${esc(a.title)}" data-summary-snippet="${esc(a.snippet)}" data-summary-type="ai" data-summary-link="${esc(articleHref(a))}" data-summary-source="${esc(a.source || '')}" title="AI summary" aria-label="Read AI summary: ${esc(a.title)}">${svg(SPARKLE_PATH)}</button>`;
}

function videoBadge(a) {
  if (a.contentType !== 'video') return '';
  return `<span class="card-video-badge" aria-hidden="true">${svg(PLAY_PATH, { size: 12, fill: 'currentColor' })}Video</span>`;
}

// -- Card image placeholder ---------------------------------------------------

const KNOWN_FALLBACKS = new Set(['latest','playstation','xbox','nintendo','pc','indie','reviews','trailers','esports','industry','hardware']);
const catFallbackSvg = cat => `/assets/fallbacks/${KNOWN_FALLBACKS.has((cat||'').toLowerCase()) ? cat.toLowerCase() : 'general'}.svg`;

export function cardPlaceholder(category, link) {
  const src = catFallbackSvg(category);
  return `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer" class="card-img-wrap card-placeholder" tabindex="-1" aria-hidden="true"><img class="card-img" src="${src}" alt="" loading="lazy" decoding="async" width="640" height="360"></a>`;
}

// Feed images are always lazy: on first load the hero's lead image is the LCP.
function cardImage(a, href, { list = false } = {}) {
  const src = imageSrc(a);
  if (!src) return cardPlaceholder(a.category, href).replace('card-img-wrap card-placeholder', `card-img-wrap card-placeholder${list ? ' card-img-wrap--list' : ''}`);
  const [w, h] = list ? [320, 180] : [640, 360];
  const wrapCls = `card-img-wrap${list ? ' card-img-wrap--list' : ''}${a.contentType === 'video' ? ' card-img-wrap--video' : ''}`;
  return `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer" class="${wrapCls}" tabindex="-1" aria-hidden="true"><img class="card-img${list ? ' card-img--list' : ''}" src="${esc(src)}" alt="${esc(a.title)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="${w}" height="${h}" data-category="${esc(a.category)}" data-link="${esc(href)}">${videoBadge(a)}</a>`;
}

function cardBody(a, href, opts, { snippetCls = 'card-snippet' } = {}) {
  return `
      <div class="card-body">
        <div class="card-top">${catLabel(a.category)}${timeTag(a.date || a.publishedAt, opts)}</div>
        <h3 class="card-title"><a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(a.title)}</a></h3>
        ${a.snippet ? `<p class="${snippetCls}">${esc(a.snippet)}</p>` : ''}
        <div class="card-footer">
          <div class="card-source"><span class="src-dot" aria-hidden="true"></span><span>${esc(a.source || '')}</span></div>
          <div class="card-actions">${summaryBtn(a)}${shareBtn(a, href)}${bookmarkBtn(a, opts)}</div>
        </div>
      </div>`;
}

function cardAttrs(a, i, href, extraCls) {
  const isVideo = a.contentType === 'video';
  return `class="card${extraCls} ${catClass(a.category)}${isVideo ? ' card-video' : ''}" data-card-idx="${i}" data-article-url="${esc(href)}" data-category="${esc(a.category)}"${isVideo ? ' data-content-type="video"' : ''}`;
}

// -- Grid card -----------------------------------------------------

export function gridCard(a, i, opts = {}) {
  const href = articleHref(a);
  const featured = i === 0;
  return `
    <article ${cardAttrs(a, i, href, featured ? ' card-featured' : '')}>
      ${cardImage(a, href)}${cardBody(a, href, opts)}
    </article>`;
}

// -- List card -----------------------------------------------------

export function listCard(a, i, opts = {}) {
  const href = articleHref(a);
  return `
    <article ${cardAttrs(a, i, href, ' card-row')}>
      ${cardImage(a, href, { list: true })}${cardBody(a, href, opts, { snippetCls: 'card-snippet card-snippet--sm' })}
    </article>`;
}

// -- Hero lead story ------------------------------------------------

/**
 * The hero's "Top story". `stack` holds the next stories; their images are
 * layered behind the lead card as decoration (aria-hidden, no duplicate text).
 */
export function heroCard(a, stack = [], opts = {}) {
  const href = articleHref(a);
  const src  = imageSrc(a) || catFallbackSvg(a.category);
  const layers = stack.map(imageSrc).filter(Boolean).slice(0, 2);
  return `
    ${layers.length ? `<div class="lead-stack" aria-hidden="true">${layers.map((s, i) => `<span class="lead-stack-layer lead-stack-layer--${i + 1}"><img src="${esc(s)}" alt="" width="640" height="360" loading="lazy" decoding="async" referrerpolicy="no-referrer"></span>`).join('')}</div>` : ''}
    <article class="lead-card ${catClass(a.category)}" data-article-url="${esc(href)}" data-category="${esc(a.category)}">
      <div class="lead-media"><img class="lead-img" src="${esc(src)}" alt="" width="1280" height="720" loading="eager" fetchpriority="high" decoding="async" referrerpolicy="no-referrer"></div>
      <div class="lead-scrim" aria-hidden="true"></div>
      <div class="lead-body">
        <div class="lead-meta"><span class="lead-flag">Top story</span>${catLabel(a.category)}${timeTag(a.date || a.publishedAt, opts, 'lead-date')}</div>
        <h3 class="lead-title"><a href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(a.title)}</a></h3>
        ${a.snippet ? `<p class="lead-snippet">${esc(a.snippet)}</p>` : ''}
        <div class="lead-foot">
          <span class="lead-source"><span class="src-dot" aria-hidden="true"></span>${esc(a.source || '')}</span>
          <div class="lead-actions">${shareBtn(a, href, 'heroFeaturedShareBtn')}${bookmarkBtn(a, opts, 'heroFeaturedBmBtn')}</div>
        </div>
      </div>
    </article>`;
}

/** Hero pick: the newest story with a real image (falls back to the newest story). */
export function pickLeadStory(articles) {
  return articles.find(a => safeUrl(a.image || null) !== '#') || articles[0] || null;
}

/** Full hero markup for a list of stories: the lead plus two layered backdrops. */
export function heroMarkup(articles, opts = {}) {
  const lead = pickLeadStory(articles);
  if (!lead) return '';
  const stack = articles.filter(a => a !== lead && safeUrl(a.image || null) !== '#').slice(0, 2);
  return heroCard(lead, stack, opts);
}

// -- Skeleton loading cards -----------------------------------------------------

export function buildSkeletons(n = 8) {
  return Array.from({ length: n }, () => `
    <div class="skeleton-card" aria-hidden="true">
      <div class="sk sk-img"></div>
      <div class="sk sk-chip"></div>
      <div class="sk sk-h1"></div>
      <div class="sk sk-h2"></div>
      <div class="sk sk-t1"></div>
      <div class="sk sk-foot"></div>
    </div>`).join('');
}
