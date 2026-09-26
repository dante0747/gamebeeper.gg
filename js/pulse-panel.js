import { categories } from './config.js';
import { getFeeds } from './feeds-registry.js';
import { loadPreferences, savePreferences, resetPreferences, PULSE_PREF_KEY } from './storage.js';
import { esc, showBmToast } from './utils.js';

const SLIDERS_SVG = '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>';
const CLOSE_SVG = '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>';

/**
 * @param {object} ctx
 * @param {() => void} ctx.render
 * @param {() => void} ctx.buildFilters
 */
export function initMyPulse({ render, buildFilters }) {
  // The button lives in the feed toolbar; fall back to the header if that slot is missing.
  const slot = document.getElementById('feedCustomizeSlot');
  const navActions = document.querySelector('.nav-actions');
  if (!slot && !navActions) return;

  const myPulseBtn = document.createElement('button');
  myPulseBtn.id = 'myPulseBtn';
  myPulseBtn.type = 'button';
  myPulseBtn.className = 'btn btn-ghost btn-sm';
  myPulseBtn.title = 'Customize your feed (My Signal)';
  myPulseBtn.setAttribute('aria-label', 'Customize your feed');
  myPulseBtn.setAttribute('aria-haspopup', 'dialog');
  myPulseBtn.setAttribute('aria-expanded', 'false');
  myPulseBtn.setAttribute('aria-controls', 'myPulseDrawer');
  myPulseBtn.innerHTML = `${SLIDERS_SVG}<span class="btn-label">Customize</span>`;
  if (slot) {
    slot.appendChild(myPulseBtn);
  } else {
    const settingsBtn = document.getElementById('settingsBtn');
    navActions.insertBefore(myPulseBtn, settingsBtn || navActions.lastElementChild);
  }

  // Summary bar sits directly above the feed grid; main.js fills it in.
  const feedGrid = document.getElementById('feedGrid');
  const summaryBar = document.createElement('div');
  summaryBar.id = 'pulseSummaryBar';
  summaryBar.className = 'pulse-summary-bar';
  summaryBar.setAttribute('aria-live', 'polite');
  summaryBar.style.display = 'none';
  feedGrid?.parentNode?.insertBefore(summaryBar, feedGrid);

  const backdrop = document.createElement('div');
  backdrop.id = 'myPulseBackdrop';
  backdrop.className = 'my-pulse-backdrop';
  const drawer = document.createElement('div');
  drawer.id = 'myPulseDrawer';
  drawer.className = 'my-pulse-drawer';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-labelledby', 'myPulseTitle');
  drawer.setAttribute('aria-modal', 'true');
  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);

  const filterCategories = categories.filter(c => c.id !== 'All' && c.id !== 'Bookmarks');
  const sourceNames = getFeeds().map(f => f.name);
  const AGE_OPTIONS = [
    { value: 'any', label: 'Any time' },
    { value: '24h', label: 'Last 24h' },
    { value: '7d',  label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
  ];
  const PRESETS = [
    { label: 'Console',    cats: ['PlayStation','Xbox','Nintendo'] },
    { label: 'PC',         cats: ['PC','Indie'] },
    { label: 'Esports',    cats: ['Esports'] },
    { label: 'Reviews',    cats: ['Reviews'] },
    { label: 'Industry',   cats: ['Industry','Hardware'] },
  ];

  function buildDrawerContent() {
    const prefs = loadPreferences();
    drawer.innerHTML = `
      <div class="mpd-header">
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
          <h2 class="mpd-title" id="myPulseTitle">${SLIDERS_SVG}My Signal</h2>
          <button type="button" class="mpd-close" id="myPulseClose" aria-label="Close">${CLOSE_SVG}</button>
        </div>
        <p class="mpd-subtitle">Tune what shows up in your feed. Changes apply instantly.</p>
      </div>
      <div class="mpd-body">
        <div class="settings-section">
          <div class="settings-label">Noise filter</div>
          <label class="mpd-toggle">
            <input type="checkbox" id="mpHideSponsored" ${prefs.hideSponsored ? 'checked' : ''} aria-label="Hide sponsored and promotional content" />
            <span class="mpd-toggle-track" aria-hidden="true"></span>
            <span class="mpd-toggle-label">Hide sponsored and promotional posts</span>
          </label>
        </div>
        <div class="settings-section">
          <div class="settings-label">Story age</div>
          <div class="settings-options" id="mpAgeOptions" role="group" aria-label="Filter by article age">
            ${AGE_OPTIONS.map(o => `<button type="button" class="settings-opt${prefs.maxAge === o.value ? ' active' : ''}" data-age="${o.value}" aria-pressed="${prefs.maxAge === o.value}">${o.label}</button>`).join('')}
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-label" style="display:flex;justify-content:space-between;align-items:center">
            <span>Topics <span class="mpd-count" id="mpCatCount">${prefs.blockedCategories.length > 0 ? `(${prefs.blockedCategories.length} hidden)` : ''}</span></span>
            <button type="button" class="mpd-link" id="mpShowAllCats" aria-label="Show all topics">Show all</button>
          </div>
          <div class="mpd-chip-group" id="mpCategoryChips" role="group" aria-label="Topic filters">
            ${filterCategories.map(c => {
              const blocked = prefs.blockedCategories.includes(c.id);
              return `<button type="button" class="mpd-chip${blocked ? ' mpd-chip--muted' : ''}" data-cat-chip="${esc(c.id)}" aria-pressed="${blocked}" title="${blocked ? 'Show' : 'Hide'} ${esc(c.label)} stories" aria-label="Hide ${esc(c.label)} stories">${esc(c.label)}</button>`;
            }).join('')}
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-label" style="display:flex;justify-content:space-between;align-items:center">
            <span>Sources <span class="mpd-count" id="mpSrcCount">${prefs.mutedSources.length > 0 ? `(${prefs.mutedSources.length} muted)` : ''}</span></span>
            <button type="button" class="mpd-link" id="mpUnmuteAll" aria-label="Unmute all sources">Unmute all</button>
          </div>
          <div class="mpd-source-list" id="mpSourceList" role="group" aria-label="Source mute controls">
            ${sourceNames.map(name => {
              const muted = prefs.mutedSources.includes(name);
              return `<button type="button" class="mpd-source${muted ? ' mpd-source--muted' : ''}" data-src-mute="${esc(name)}" aria-pressed="${muted}" title="${muted ? 'Unmute' : 'Mute'} ${esc(name)}" aria-label="Mute ${esc(name)}">
                <span class="mpd-src-name">${esc(name)}</span>
                <span class="mpd-src-badge" aria-hidden="true">${muted ? 'Muted' : 'On'}</span>
              </button>`;
            }).join('')}
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-label">Quick presets</div>
          <div class="settings-options" role="group" aria-label="Topic presets">
            ${PRESETS.map(p => `<button type="button" class="settings-opt mpd-preset" data-preset='${JSON.stringify(p.cats)}' title="Show only ${p.label} topics">${p.label}</button>`).join('')}
          </div>
        </div>
      </div>
      <div class="mpd-footer">
        <button type="button" class="settings-opt mpd-reset-btn" id="mpResetBtn">
          <svg aria-hidden="true" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:6px"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-5"/></svg>Reset to defaults
        </button>
        <span class="settings-note">Saved in this browser</span>
      </div>`;
    wireDrawerEvents();
  }

  function wireDrawerEvents() {
    drawer.querySelector('#myPulseClose')?.addEventListener('click', closeDrawer);

    drawer.querySelector('#mpHideSponsored')?.addEventListener('change', e => {
      const p = loadPreferences();
      p.hideSponsored = e.target.checked;
      savePreferences(p);
      render();
    });

    drawer.querySelector('#mpAgeOptions')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-age]');
      if (!btn) return;
      const p = loadPreferences();
      p.maxAge = btn.dataset.age;
      savePreferences(p);
      drawer.querySelectorAll('[data-age]').forEach(b => {
        b.classList.toggle('active', b.dataset.age === p.maxAge);
        b.setAttribute('aria-pressed', String(b.dataset.age === p.maxAge));
      });
      render();
    });

    drawer.querySelector('#mpCategoryChips')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-cat-chip]');
      if (!btn) return;
      const cat = btn.dataset.catChip;
      const p = loadPreferences();
      const idx = p.blockedCategories.indexOf(cat);
      if (idx === -1) p.blockedCategories.push(cat);
      else p.blockedCategories.splice(idx, 1);
      savePreferences(p);
      const blocked = p.blockedCategories.includes(cat);
      btn.classList.toggle('mpd-chip--muted', blocked);
      btn.setAttribute('aria-pressed', String(blocked));
      const catLabel = categories.find(c => c.id === cat)?.label || cat;
      btn.title = (blocked ? 'Show' : 'Hide') + ' ' + catLabel + ' stories';
      const countEl = drawer.querySelector('#mpCatCount');
      if (countEl) countEl.textContent = p.blockedCategories.length > 0 ? `(${p.blockedCategories.length} hidden)` : '';
      render();
    });

    drawer.querySelector('#mpShowAllCats')?.addEventListener('click', () => {
      const p = loadPreferences();
      p.blockedCategories = [];
      savePreferences(p);
      buildDrawerContent();
      render();
    });

    drawer.querySelector('#mpSourceList')?.addEventListener('click', e => {
      const btn = e.target.closest('[data-src-mute]');
      if (!btn) return;
      const src = btn.dataset.srcMute;
      const p = loadPreferences();
      const idx = p.mutedSources.indexOf(src);
      if (idx === -1) p.mutedSources.push(src);
      else p.mutedSources.splice(idx, 1);
      savePreferences(p);
      const muted = p.mutedSources.includes(src);
      btn.classList.toggle('mpd-source--muted', muted);
      btn.setAttribute('aria-pressed', String(muted));
      btn.title = (muted ? 'Unmute' : 'Mute') + ' ' + src;
      const badge = btn.querySelector('.mpd-src-badge');
      if (badge) badge.textContent = muted ? 'Muted' : 'On';
      const countEl = drawer.querySelector('#mpSrcCount');
      if (countEl) countEl.textContent = p.mutedSources.length > 0 ? `(${p.mutedSources.length} muted)` : '';
      render();
    });

    drawer.querySelector('#mpUnmuteAll')?.addEventListener('click', () => {
      const p = loadPreferences();
      p.mutedSources = [];
      savePreferences(p);
      buildDrawerContent();
      render();
    });

    drawer.querySelectorAll('.mpd-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        try {
          const cats = JSON.parse(btn.dataset.preset);
          const p = loadPreferences();
          const allCatIds = filterCategories.map(c => c.id);
          p.blockedCategories = allCatIds.filter(id => !cats.includes(id));
          savePreferences(p);
          buildDrawerContent();
          render();
        } catch { /* ignore */ }
      });
    });

    drawer.querySelector('#mpResetBtn')?.addEventListener('click', () => {
      resetPreferences();
      buildDrawerContent();
      render();
      showBmToast('My Signal reset to defaults');
    });
  }

  function openDrawer() {
    buildDrawerContent();
    drawer.classList.add('open');
    backdrop.classList.add('open');
    myPulseBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    if (!localStorage.getItem('gs:signal:seen')) localStorage.setItem('gs:signal:seen', '1');
    const nudge = document.getElementById('pulseNudge');
    if (nudge) nudge.remove();
    setTimeout(() => {
      const firstFocus = drawer.querySelector('button,input');
      if (firstFocus) firstFocus.focus();
    }, 80);
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    myPulseBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    myPulseBtn.focus();
  }

  // Keep Tab focus inside the open drawer (it is a modal dialog)
  drawer.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const focusable = Array.from(drawer.querySelectorAll('button, input, a[href]')).filter(el => !el.disabled);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  window.__openMyPulse = openDrawer;
  window.__syncMyPulse = () => { if (drawer.classList.contains('open')) buildDrawerContent(); };

  myPulseBtn.addEventListener('click', () => {
    drawer.classList.contains('open') ? closeDrawer() : openDrawer();
  });
  backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
  });

  // First-time onboarding nudge
  if (!localStorage.getItem('gs:signal:seen') && !localStorage.getItem(PULSE_PREF_KEY)) {
    setTimeout(() => {
      const nudge = document.createElement('div');
      nudge.id = 'pulseNudge';
      nudge.className = 'pulse-nudge';
      nudge.setAttribute('role', 'status');
      nudge.innerHTML = `
        <span style="display:inline-flex;color:var(--signal)">${SLIDERS_SVG}</span>
        <span>Only follow some platforms? Hide the rest in a few taps.</span>
        <button type="button" class="pulse-nudge-btn" id="pulseNudgeOpen">Customize</button>
        <button type="button" class="pulse-nudge-close" aria-label="Dismiss" id="pulseNudgeDismiss">${CLOSE_SVG}</button>`;
      const healthBar = document.getElementById('feedHealthBar');
      const anchor = healthBar || feedGrid;
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(nudge, anchor.nextSibling || anchor);
      document.getElementById('pulseNudgeOpen')?.addEventListener('click', () => { nudge.remove(); openDrawer(); });
      document.getElementById('pulseNudgeDismiss')?.addEventListener('click', () => { nudge.remove(); localStorage.setItem('gs:signal:seen', '1'); });
      setTimeout(() => { nudge.remove(); }, 10000);
    }, 1500);
  }
}



