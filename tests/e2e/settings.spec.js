/**
 * tests/e2e/settings.spec.js
 *
 * End-to-end tests for the Settings panel (gear icon in nav) and
 * the auto-refresh countdown feature.
 */

import { test, expect } from '@playwright/test';

// -- Shared stubs --------------------------------------------------------------
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
});

async function goto(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}
async function waitForCards(page) {
  await page.waitForSelector('#feedGrid article.card', { timeout: 15_000 });
}

// =============================================================================
// Settings panel — open / close
// =============================================================================

test('settings button is present in nav', async ({ page }) => {
  await goto(page);
  await expect(page.locator('#settingsBtn')).toBeVisible({ timeout: 8_000 });
});

test('clicking settings button opens the popover', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsPopover')).toHaveClass(/open/, { timeout: 3_000 });
});

test('clicking settings button again closes the popover', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsPopover')).toHaveClass(/open/);

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsPopover')).not.toHaveClass(/open/);
});

test('clicking outside the popover closes it', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsPopover')).toHaveClass(/open/);

  // Click somewhere neutral outside the popover
  await page.locator('#feedGrid').click();
  await expect(page.locator('#settingsPopover')).not.toHaveClass(/open/);
});

test('pressing Escape closes the settings popover', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#settingsPopover')).toHaveClass(/open/);

  await page.keyboard.press('Escape');
  await expect(page.locator('#settingsPopover')).not.toHaveClass(/open/);
});

// =============================================================================
// Settings panel — view toggle
// =============================================================================

test('settings popover view buttons switch to list view', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#settingsBtn').click();
  await page.locator('#settingsPopover [data-view="list"]').click();
  await page.waitForTimeout(200);

  await expect(page.locator('#feedGrid article.card-row').first()).toBeVisible();
  await expect(page.locator('#listViewBtn')).toHaveAttribute('aria-pressed', 'true');
});

test('settings popover view buttons switch back to grid view', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  // Switch to list first
  await page.locator('#settingsBtn').click();
  await page.locator('#settingsPopover [data-view="list"]').click();
  await page.waitForTimeout(200);

  // Re-open and switch to grid
  await page.locator('#settingsBtn').click();
  await page.locator('#settingsPopover [data-view="grid"]').click();
  await page.waitForTimeout(200);

  await expect(page.locator('#gridViewBtn')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#feedGrid article.card-row').first()).not.toBeVisible();
});

// =============================================================================
// Settings panel — auto-refresh options
// =============================================================================

test('settings popover shows auto-refresh option buttons', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#settingsBtn').click();

  const refreshOpts = page.locator('#refreshOptions [data-refresh]');
  expect(await refreshOpts.count()).toBeGreaterThan(0);

  // "Off" (value 0) should be present
  await expect(page.locator('#refreshOptions [data-refresh="0"]')).toBeVisible();
});

test('selecting a non-zero auto-refresh option marks it active', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#settingsBtn').click();

  // Pick the first non-zero refresh option
  const firstNonZero = page.locator('#refreshOptions [data-refresh]:not([data-refresh="0"])').first();
  await firstNonZero.click();
  await page.waitForTimeout(200);

  await expect(firstNonZero).toHaveClass(/active/);
});

test('auto-refresh countdown timer appears when refresh interval is set', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#settingsBtn').click();

  // Pick the first non-zero refresh option (e.g. 1 min)
  const firstNonZero = page.locator('#refreshOptions [data-refresh]:not([data-refresh="0"])').first();
  await firstNonZero.click();
  await page.waitForTimeout(500);

  // Countdown element should be visible and show a time-like string
  const cd = page.locator('#autoRefreshCountdown');
  await expect(cd).toBeVisible({ timeout: 3_000 });
  const text = await cd.textContent();
  expect(text).toMatch(/\d+:\d{2}/); // e.g. "1:00" or "0:59"
});

test('setting auto-refresh back to Off hides the countdown timer', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  // Enable refresh
  await page.locator('#settingsBtn').click();
  await page.locator('#refreshOptions [data-refresh]:not([data-refresh="0"])').first().click();
  await page.waitForTimeout(300);

  // Disable refresh (set to 0)
  await page.locator('#settingsBtn').click();
  await page.locator('#refreshOptions [data-refresh="0"]').click();
  await page.waitForTimeout(300);

  const cd = page.locator('#autoRefreshCountdown');
  // Should be hidden or empty
  const isHidden = (await cd.evaluate(el => el.style.display)) === 'none';
  const isEmpty  = (await cd.textContent())?.trim() === '';
  expect(isHidden || isEmpty).toBe(true);
});

// =============================================================================
// Settings panel — clear cache button
// =============================================================================

test('clear cache button is present in settings popover', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#settingsBtn').click();
  await expect(page.locator('#clearCacheBtn')).toBeVisible();
});

test('clear cache button opens confirmation dialog', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#settingsBtn').click();
  await page.locator('#clearCacheBtn').click();

  // Confirmation overlay should appear
  await expect(page.locator('.cache-confirm-overlay')).toBeVisible({ timeout: 3_000 });
  await expect(page.locator('#cacheConfirmOk')).toBeVisible();
  await expect(page.locator('#cacheConfirmCancel')).toBeVisible();
});

test('cancelling the clear cache dialog removes the overlay', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#settingsBtn').click();
  await page.locator('#clearCacheBtn').click();
  await expect(page.locator('.cache-confirm-overlay')).toBeVisible();

  await page.locator('#cacheConfirmCancel').click();
  await expect(page.locator('.cache-confirm-overlay')).not.toBeVisible({ timeout: 2_000 });
});

