import { loadingMessages } from './config.js';

// -- HTML escaping & URL validation -------------------------------

export function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export function safeUrl(value) {
  if (!value) return '#';
  try {
    const u = new URL(String(value).trim());
    if (!['http:', 'https:'].includes(u.protocol)) return '#';
    return u.toString();
  } catch {
    return '#';
  }
}

// -- String / date helpers -----------------------------------------

export function catClass(cat) {
  return 'cat-' + String(cat || 'general').toLowerCase().replace(/\s+/g, '-');
}

/** Publisher identity for a feed/article URL: hostname without "www." */
export function publisherHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return ''; }
}

/** Absolute, locale-stable date label ("Sep 26") for statically rendered markup. */
export function absDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function relTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    const s = (Date.now() - d) / 1000;
    if (s < 60)     return 'just now';
    if (s < 3600)   return `${Math.floor(s/60)}m ago`;
    if (s < 86400)  return `${Math.floor(s/3600)}h ago`;
    if (s < 604800) return `${Math.floor(s/86400)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

// DOMParser documents are inert: no scripts run and no images load, so this is
// safe for untrusted feed HTML (unlike assigning innerHTML on a live element).
export function stripHtml(html) {
  if (!html) return '';
  return new DOMParser().parseFromString(String(html), 'text/html').body.textContent || '';
}

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…',
  mdash: '—', ndash: '–', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”',
  eacute: 'é', egrave: 'è', aacute: 'á', oacute: 'ó', uuml: 'ü', ouml: 'ö',
  trade: '™', reg: '®', copy: '©', times: '×', deg: '°', middot: '·',
};

/**
 * Plain text from feed-supplied HTML, without touching the DOM: strips tags,
 * decodes entities (numeric + common named) and collapses whitespace. Works
 * identically in the browser and in the Node build scripts.
 */
export function cleanText(value) {
  if (!value) return '';
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === '#') {
        const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code <= 0x10FFFF ? String.fromCodePoint(code) : m;
      }
      return NAMED_ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(str, n = 160) {
  const s = (str || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n) + '\u2026' : s;
}

export function readTime(title, snippet) {
  const words = ((title || '') + ' ' + (snippet || '')).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function getText(el, tag) {
  const node = el.querySelector(tag);
  return node ? (node.textContent || '').trim() : '';
}

export function randomMsg() {
  return loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
}

// -- Share helper --------------------------------------------------

export async function shareArticle(title, url) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch { /* user cancelled */ }
  }
  try {
    await navigator.clipboard.writeText(url);
    showBmToast('Link copied');
  } catch {
    showBmToast('Copy: ' + url);
  }
}

// -- Screen-reader live region -------------------------------------

export function announce(message) {
  const el = document.getElementById('feedStatus');
  if (el) el.textContent = message;
}

// -- Animated counter ----------------------------------------------

export function animateCounter(el, target, duration = 800) {
  if (!el || isNaN(target)) return;
  const start = performance.now();
  const tick  = now => {
    const p    = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
    el.textContent = Math.round(target * ease);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// -- Toast notification --------------------------------------------

let toastTimer = null;

export function showBmToast(msg) {
  let toast = document.getElementById('bmToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'bmToast';
    toast.className = 'bm-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
}


