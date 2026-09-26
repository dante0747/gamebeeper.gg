/**
 * js/consent.js
 *
 * Manages analytics consent (GDPR). This is the ONLY place Google Analytics is
 * loaded — index.html contains no gtag snippet.
 * - Shows a small dismissible prompt on first visit.
 * - Loads GA4 only after the visitor accepts.
 * - The choice can be changed at any time in Settings.
 * - Stores the decision in localStorage under 'gs:analytics:consent'.
 *   Value 'yes' = accepted, 'no' = declined.
 */

const GA_ID           = 'G-T8HTCPRNDN';
const CONSENT_KEY     = 'gs:analytics:consent';
const BANNER_SEEN_KEY = 'gs:consent:seen';

/** Dynamically inject GA4 after consent. */
function loadGA4() {
  window[`ga-disable-${GA_ID}`] = false;
  if (typeof window.gtag === 'function') return; // already loaded
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { anonymize_ip: true });
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
}

/** 'yes' | 'no' | null (not decided yet) */
export function getConsent() {
  try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
}

/** Accept analytics consent. */
export function acceptConsent() {
  localStorage.setItem(CONSENT_KEY, 'yes');
  localStorage.setItem(BANNER_SEEN_KEY, '1');
  loadGA4();
  removeBanner();
}

/** Decline (or withdraw) analytics consent. Stops GA for the rest of this visit too. */
export function declineConsent() {
  localStorage.setItem(CONSENT_KEY, 'no');
  localStorage.setItem(BANNER_SEEN_KEY, '1');
  window[`ga-disable-${GA_ID}`] = true;
  removeBanner();
}

function removeBanner() {
  document.getElementById('cookieBanner')?.remove();
  document.body.style.setProperty('--cookie-h', '0px');
}

/** Show the consent prompt. */
function showBanner() {
  if (document.getElementById('cookieBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'cookieBanner';
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Analytics consent');
  banner.innerHTML = `
    <div class="cookie-banner-inner">
      <p class="cookie-banner-text">
        May we use <strong>Google Analytics</strong> to see which features people use? No ads, no profiling — and you can change your mind in Settings.
        <a href="/privacy.html">Privacy policy</a>
      </p>
      <div class="cookie-banner-actions">
        <button id="cookieDecline" class="btn btn-ghost btn-sm" type="button">No thanks</button>
        <button id="cookieAccept" class="btn btn-secondary btn-sm" type="button">Allow analytics</button>
      </div>
    </div>`;
  document.body.appendChild(banner);
  // Push back-to-top and toast above the banner
  requestAnimationFrame(() => {
    document.body.style.setProperty('--cookie-h', banner.offsetHeight + 'px');
  });
  document.getElementById('cookieAccept')?.addEventListener('click', acceptConsent);
  document.getElementById('cookieDecline')?.addEventListener('click', declineConsent);
}

/** Initialise consent logic. Called once on page load. */
export function initConsent() {
  const stored = getConsent();
  if (stored === 'yes') {
    loadGA4();
    return;
  }
  if (stored === 'no') {
    return; // user already declined
  }
  // No decision yet – show the prompt after a short delay so it doesn't flash instantly
  setTimeout(showBanner, 1500);
}
