import { loadingMessages } from './config.js';

// â”€â”€ HTML escaping & URL validation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ String / date helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function catClass(cat) {
  return 'cat-' + cat.toLowerCase().replace(/\s+/g, '-');
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

export function stripHtml(html) {
  if (!html) return '';
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent || d.innerText || '';
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

// â”€â”€ Share helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function shareArticle(title, url) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch { /* user cancelled */ }
  }
  try {
    await navigator.clipboard.writeText(url);
    showBmToast('🔗 Link copied to clipboard!');
  } catch {
    showBmToast('Copy: ' + url);
  }
}

// â”€â”€ Screen-reader live region â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function announce(message) {
  const el = document.getElementById('feedStatus');
  if (el) el.textContent = message;
}

// â”€â”€ Animated counter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Toast notification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let toastTimer = null;

export function showBmToast(msg) {
  let toast = document.getElementById('bmToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'bmToast';
    toast.className = 'bm-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
}


