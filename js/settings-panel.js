import { REFRESH_OPTIONS } from './config.js';
import { PREF } from './storage.js';
import { showBmToast } from './utils.js';
import { getConsent, acceptConsent, declineConsent } from './consent.js';

const GEAR_SVG = '<svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>';
const TRASH_SVG = '<svg aria-hidden="true" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

// Every localStorage prefix this site has ever written (current + legacy).
const SITE_KEY_PREFIXES = ['gs:', 'gp:', 'geeksup_', 'GameBeeper.'];

/**
 * @param {object} ctx
 * @param {() => number}  ctx.getAutoRefreshMin
 * @param {(v: number) => void} ctx.setAutoRefreshMin
 * @param {() => string}  ctx.getViewMode
 * @param {(v: string) => void} ctx.setViewMode
 * @param {() => void}    ctx.applyView
 * @param {() => void}    ctx.render
 * @param {(min: number) => void} ctx.startAutoRefresh
 */
export function initSettings(ctx) {
  const { getAutoRefreshMin, setAutoRefreshMin, getViewMode, setViewMode, applyView, render, startAutoRefresh } = ctx;

  const navActions = document.querySelector('.nav-actions');
  if (!navActions) return;

  const settingsBtn = document.createElement('button');
  settingsBtn.id = 'settingsBtn';
  settingsBtn.type = 'button';
  settingsBtn.className = 'btn btn-ghost btn-sm';
  settingsBtn.title = 'Settings';
  settingsBtn.setAttribute('aria-label', 'Settings');
  settingsBtn.setAttribute('aria-haspopup', 'dialog');
  settingsBtn.setAttribute('aria-expanded', 'false');
  settingsBtn.setAttribute('aria-controls', 'settingsPopover');
  settingsBtn.innerHTML = `${GEAR_SVG}<span class="btn-label">Settings</span>`;
  navActions.insertBefore(settingsBtn, navActions.lastElementChild);

  // Countdown badge
  const toolbarLeft = document.querySelector('.toolbar-left');
  if (toolbarLeft) {
    const cd = document.createElement('span');
    cd.id = 'autoRefreshCountdown';
    cd.className = 'auto-countdown';
    cd.style.display = 'none';
    toolbarLeft.insertBefore(cd, document.getElementById('refreshBtnHero'));
  }

  const consent = getConsent();
  const popover = document.createElement('div');
  popover.id = 'settingsPopover';
  popover.className = 'settings-popover';
  popover.setAttribute('role', 'dialog');
  popover.setAttribute('aria-label', 'Settings');
  popover.innerHTML = `
    <div class="settings-header">
      <span class="settings-title">${GEAR_SVG}Settings</span>
    </div>
    <div class="settings-section">
      <div class="settings-label" id="setLblRefresh">Auto-refresh</div>
      <div class="settings-options" id="refreshOptions" role="group" aria-labelledby="setLblRefresh">
        ${REFRESH_OPTIONS.map(o => `
          <button type="button" class="settings-opt${getAutoRefreshMin() === o.value ? ' active' : ''}"
                  data-refresh="${o.value}" aria-pressed="${getAutoRefreshMin() === o.value}">${o.label}</button>
        `).join('')}
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-label" id="setLblView">Layout</div>
      <div class="settings-options" role="group" aria-labelledby="setLblView">
        <button type="button" class="settings-opt${getViewMode() === 'grid' ? ' active' : ''}" data-view="grid" aria-pressed="${getViewMode() === 'grid'}">Grid</button>
        <button type="button" class="settings-opt${getViewMode() === 'list' ? ' active' : ''}" data-view="list" aria-pressed="${getViewMode() === 'list'}">List</button>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-label" id="setLblAnalytics">Analytics</div>
      <p class="settings-hint">Anonymous Google Analytics, only with your OK.</p>
      <div class="settings-options" id="analyticsOptions" role="group" aria-labelledby="setLblAnalytics">
        <button type="button" class="settings-opt${consent === 'yes' ? ' active' : ''}" data-analytics="yes" aria-pressed="${consent === 'yes'}">Allowed</button>
        <button type="button" class="settings-opt${consent !== 'yes' ? ' active' : ''}" data-analytics="no" aria-pressed="${consent !== 'yes'}">Off</button>
      </div>
    </div>
    <div class="settings-section">
      <div class="settings-label">Your data</div>
      <button type="button" class="settings-opt settings-opt--danger" id="clearCacheBtn">${TRASH_SVG}Clear all site data</button>
    </div>
    <div class="settings-footer">
      <span class="settings-note">Settings and saved stories live in this browser only.</span>
    </div>`;
  document.body.appendChild(popover);

  let open = false;
  const position = () => {
    const r = settingsBtn.getBoundingClientRect();
    popover.style.position = 'fixed';
    popover.style.top   = (r.bottom + 8) + 'px';
    popover.style.right = Math.max(12, window.innerWidth - r.right) + 'px';
    popover.style.left  = '';
  };
  const openPopover = () => {
    open = true;
    position();
    popover.classList.add('open');
    settingsBtn.setAttribute('aria-expanded', 'true');
    setTimeout(() => popover.querySelector('.settings-opt.active, .settings-opt')?.focus(), 30);
  };
  const closePopover = ({ restoreFocus = false } = {}) => {
    if (!open) return;
    open = false;
    popover.classList.remove('open');
    settingsBtn.setAttribute('aria-expanded', 'false');
    if (restoreFocus) settingsBtn.focus();
  };

  settingsBtn.addEventListener('click', e => { e.stopPropagation(); open ? closePopover() : openPopover(); });
  document.addEventListener('click', e => { if (open && !popover.contains(e.target)) closePopover(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) closePopover({ restoreFocus: true }); });
  window.addEventListener('resize', () => { if (open) position(); }, { passive: true });
  // Close when focus leaves the popover (keyboard users tabbing onward)
  popover.addEventListener('focusout', e => {
    if (open && !popover.contains(e.relatedTarget) && e.relatedTarget !== settingsBtn) closePopover();
  });

  const setPressed = (selector, pred) => popover.querySelectorAll(selector).forEach(b => {
    b.classList.toggle('active', pred(b));
    b.setAttribute('aria-pressed', String(pred(b)));
  });

  // Auto-refresh
  popover.querySelector('#refreshOptions').addEventListener('click', e => {
    const btn = e.target.closest('[data-refresh]');
    if (!btn) return;
    setAutoRefreshMin(parseInt(btn.dataset.refresh, 10));
    PREF.set('autorefresh', getAutoRefreshMin());
    setPressed('[data-refresh]', b => parseInt(b.dataset.refresh, 10) === getAutoRefreshMin());
    startAutoRefresh(getAutoRefreshMin());
    showBmToast(getAutoRefreshMin() ? `Auto-refresh every ${btn.textContent.trim()}` : 'Auto-refresh off');
  });

  // Layout
  popover.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      setViewMode(btn.dataset.view);
      PREF.set('view', getViewMode());
      applyView();
      render();
      setPressed('[data-view]', b => b.dataset.view === getViewMode());
    });
  });

  // Analytics consent
  popover.querySelector('#analyticsOptions').addEventListener('click', e => {
    const btn = e.target.closest('[data-analytics]');
    if (!btn) return;
    const allow = btn.dataset.analytics === 'yes';
    if (allow) acceptConsent(); else declineConsent();
    setPressed('[data-analytics]', b => b.dataset.analytics === (allow ? 'yes' : 'no'));
    showBmToast(allow ? 'Analytics allowed — thank you' : 'Analytics off');
  });

  // Clear all site data
  popover.querySelector('#clearCacheBtn')?.addEventListener('click', () => {
    const overlay = document.createElement('div');
    overlay.className = 'cache-confirm-overlay';
    overlay.innerHTML = `
      <div class="cache-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="cacheConfirmTitle" aria-describedby="cacheConfirmDesc">
        <div class="cache-confirm-icon">${TRASH_SVG.replace('width="14" height="14"', 'width="26" height="26"')}</div>
        <h3 id="cacheConfirmTitle" class="cache-confirm-title">Clear all site data?</h3>
        <p id="cacheConfirmDesc" class="cache-confirm-desc">This removes your saved stories, feed filters, layout and refresh settings, analytics choice and cached images from this browser. The page will reload.<span class="cache-confirm-note">This can’t be undone.</span></p>
        <div class="cache-confirm-actions">
          <button type="button" class="btn btn-ghost btn-sm" id="cacheConfirmCancel">Cancel</button>
          <button type="button" class="btn btn-sm cache-confirm-delete" id="cacheConfirmOk">Clear everything</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    closePopover();
    overlay.querySelector('#cacheConfirmCancel').focus();

    const removeOverlay = () => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      settingsBtn.focus();
    };
    function onKey(e) {
      if (e.key === 'Escape') removeOverlay();
      if (e.key === 'Tab') {
        // Two buttons: keep focus inside the dialog
        const btns = overlay.querySelectorAll('button');
        const first = btns[0], last = btns[btns.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    overlay.querySelector('#cacheConfirmCancel').addEventListener('click', removeOverlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) removeOverlay(); });
    document.addEventListener('keydown', onKey);

    overlay.querySelector('#cacheConfirmOk').addEventListener('click', () => {
      const siteKeys = Object.keys(localStorage).filter(k => SITE_KEY_PREFIXES.some(p => k.startsWith(p)));
      siteKeys.forEach(k => localStorage.removeItem(k));
      overlay.remove();
      document.removeEventListener('keydown', onKey);
      showBmToast(`Cleared ${siteKeys.length} item${siteKeys.length !== 1 ? 's' : ''} — reloading…`);
      setTimeout(() => location.reload(), 1200);
    });
  });
}
