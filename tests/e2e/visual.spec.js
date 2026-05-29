/**
 * tests/e2e/visual.spec.js
 *
 * Visual regression tests using Playwright's toHaveScreenshot().
 *
 * FIRST RUN: generate baselines with:
 *   npx playwright test tests/e2e/visual.spec.js --update-snapshots
 *
 * SUBSEQUENT RUNS: compare against stored snapshots automatically.
 *
 * Snapshots are stored in: tests/e2e/visual.spec.js-snapshots/
 * Commit the snapshot folder to keep baselines in version control.
 *
 * Thresholds are intentionally generous (maxDiffPixelRatio: 0.04) to
 * tolerate minor rendering differences across environments while still
 * catching meaningful regressions.
 */

import { test, expect } from '@playwright/test';

const SNAPSHOT_OPTS = {
  maxDiffPixelRatio: 0.04,
  threshold: 0.2,
  animations: 'disabled',
};

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', r =>
    r.fulfill({ status: 200, contentType: 'text/css', body: '' })
  );
  await page.route('https://fonts.gstatic.com/**', r =>
    r.fulfill({ status: 200, contentType: 'font/woff2', body: '' })
  );
  await page.route('https://www.googletagmanager.com/**', r =>
    r.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
  );
  // Stub external images so snapshots are deterministic
  await page.route(/\.(jpg|jpeg|png|webp|gif|avif)($|\?)/, r =>
    r.fulfill({ status: 200, contentType: 'image/png', body: Buffer.alloc(0) })
  );
  // Suppress nudge that might appear on first visit
  await page.addInitScript(() => {
    localStorage.setItem('gs:signal:seen', '1');
  });
});

async function goto(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}
async function waitForCards(page) {
  await page.waitForSelector('#feedGrid article.card', { timeout: 15_000 });
}
async function waitForLive(page) {
  await page.waitForFunction(
    () => document.getElementById('statusDot')?.classList.contains('live'),
    { timeout: 15_000 }
  );
}

// =============================================================================
// Full-page snapshots
// =============================================================================

test('hero section matches baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await goto(page);
  await waitForCards(page);
  await waitForLive(page);

  await expect(page.locator('.hero')).toHaveScreenshot('hero-desktop.png', SNAPSHOT_OPTS);
});

test('article feed grid (first 6 cards) matches baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await goto(page);
  await waitForCards(page);
  await waitForLive(page);

  await expect(page.locator('#feedGrid')).toHaveScreenshot('feed-grid-desktop.png', SNAPSHOT_OPTS);
});

test('navigation bar matches baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await goto(page);
  await waitForCards(page);

  await expect(page.locator('.top-nav')).toHaveScreenshot('nav-desktop.png', SNAPSHOT_OPTS);
});

test('mobile hero section matches baseline', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await goto(page);
  await waitForCards(page);
  await waitForLive(page);

  await expect(page.locator('.hero')).toHaveScreenshot('hero-mobile.png', SNAPSHOT_OPTS);
});

test('mobile chip filter bar matches baseline', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await goto(page);
  await waitForCards(page);

  await expect(page.locator('#mobileFilters')).toHaveScreenshot('chip-filters-mobile.png', SNAPSHOT_OPTS);
});

// =============================================================================
// State snapshots
// =============================================================================

test('list view layout matches baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await goto(page);
  await waitForCards(page);
  await waitForLive(page);

  await page.locator('#listViewBtn').click();
  await page.waitForTimeout(300);

  await expect(page.locator('#feedGrid')).toHaveScreenshot('feed-list-desktop.png', SNAPSHOT_OPTS);
});

test('summary modal open state matches baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await goto(page);
  await waitForCards(page);

  await page.locator('#feedGrid article.card').first().locator('.card-summary-btn').click();
  await page.waitForSelector('#summaryModal.open', { timeout: 3_000 });

  await expect(page.locator('#summaryModal .summary-dialog')).toHaveScreenshot(
    'summary-modal.png',
    SNAPSHOT_OPTS
  );
});

test('settings popover open state matches baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await goto(page);
  await waitForCards(page);

  await page.locator('#settingsBtn').click();
  await page.waitForSelector('#settingsPopover.open', { timeout: 3_000 });

  await expect(page.locator('#settingsPopover')).toHaveScreenshot('settings-popover.png', SNAPSHOT_OPTS);
});

test('My Signal drawer open state matches baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await goto(page);
  await waitForCards(page);

  await page.locator('#myPulseBtn').click();
  await page.waitForSelector('#myPulseDrawer.open', { timeout: 3_000 });

  await expect(page.locator('#myPulseDrawer')).toHaveScreenshot('my-signal-drawer.png', SNAPSHOT_OPTS);
});

test('footer section matches baseline', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await goto(page);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);

  await expect(page.locator('.site-footer')).toHaveScreenshot('footer-desktop.png', SNAPSHOT_OPTS);
});

