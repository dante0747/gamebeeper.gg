// â”€â”€ Persistent preferences â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Namespace migrated from 'geeksup_' / 'gp:' to 'gs:' for GameBeeper.
// Old developer-news category filters are intentionally cleared on first load
// via a one-time migration key so stale values don't break category filters.

export const PREF = {
  get: k      => localStorage.getItem('gs:' + k),
  set: (k, v) => localStorage.setItem('gs:' + k, v),
};

// One-time migration marker – clears stale developer-category data from old namespace
const MIGRATION_KEY = 'gs:migrated:v1';
if (typeof localStorage !== 'undefined' && !localStorage.getItem(MIGRATION_KEY)) {
  // Remove any keys from the old 'geeksup_' / 'gp:' namespaces
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('geeksup_') || k.startsWith('gp:'))) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    localStorage.setItem(MIGRATION_KEY, '1');
  } catch { /* ignore */ }
}

// â”€â”€ Signal Filters (formerly "My Pulse"): versioned preferences â”€â”€â”€

export const PULSE_PREF_KEY = 'GameBeeper.preferences.v1';

export function getDefaultPreferences() {
  return {
    version: 1,
    blockedCategories: [],
    mutedSources: [],
    hideSponsored: false,
    maxAge: 'any',
  };
}

export function loadPreferences() {
  try {
    const raw = localStorage.getItem(PULSE_PREF_KEY);
    if (!raw) return getDefaultPreferences();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1) return getDefaultPreferences();
    const d = getDefaultPreferences();
    return {
      version: 1,
      blockedCategories: Array.isArray(parsed.blockedCategories) ? parsed.blockedCategories : d.blockedCategories,
      mutedSources:      Array.isArray(parsed.mutedSources)      ? parsed.mutedSources      : d.mutedSources,
      hideSponsored:     typeof parsed.hideSponsored === 'boolean' ? parsed.hideSponsored   : d.hideSponsored,
      maxAge:            ['any','24h','7d','30d'].includes(parsed.maxAge) ? parsed.maxAge   : d.maxAge,
    };
  } catch { return getDefaultPreferences(); }
}

export function savePreferences(prefs) {
  try { localStorage.setItem(PULSE_PREF_KEY, JSON.stringify(prefs)); } catch { /* quota */ }
}

export function resetPreferences() {
  localStorage.removeItem(PULSE_PREF_KEY);
}

export function hasActivePreferences(prefs) {
  const d = getDefaultPreferences();
  return (
    prefs.blockedCategories.length > 0 ||
    prefs.mutedSources.length > 0 ||
    prefs.hideSponsored !== d.hideSponsored ||
    prefs.maxAge !== d.maxAge
  );
}

// â”€â”€ Bookmarks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const BOOKMARK_KEY = 'gs:bookmarks';
/** Maximum number of bookmarks stored. Oldest entries are pruned when exceeded. */
export const BOOKMARK_MAX = 200;

export function loadBookmarks() {
  try { return JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]'); }
  catch { return []; }
}

export function saveBookmarks(bms) {
  const capped = bms.length > BOOKMARK_MAX ? bms.slice(0, BOOKMARK_MAX) : bms;
  try {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(capped));
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      try {
        const pruned = capped.slice(0, Math.floor(capped.length / 2));
        localStorage.setItem(BOOKMARK_KEY, JSON.stringify(pruned));
        console.warn(`[GameBeeper] localStorage quota exceeded – bookmarks pruned to ${pruned.length}.`);
      } catch {
        console.error('[GameBeeper] Cannot save bookmarks: storage quota full even after pruning.');
      }
    }
  }
}

export function isBookmarked(link) {
  return loadBookmarks().some(b => b.link === link);
}

export function toggleBookmark(article) {
  let bms = loadBookmarks();
  const idx = bms.findIndex(b => b.link === article.link);
  if (idx === -1) {
    bms.unshift({ ...article, bookmarkedAt: new Date().toISOString() });
    if (bms.length > BOOKMARK_MAX) bms = bms.slice(0, BOOKMARK_MAX);
  } else {
    bms.splice(idx, 1);
  }
  saveBookmarks(bms);
  return idx === -1; // true = just bookmarked
}

