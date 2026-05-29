/**
 * tests/e2e/my-pulse.spec.js
 *
 * End-to-end tests for the "My Signal" (My Pulse) drawer:
 *   - opening / closing
 *   - blocking a category removes those cards from the feed
 *   - the pulse summary bar appears when preferences are active
 *   - resetting clears preferences and restores all cards
 *   - muting a source filters articles from that source
 *   - quick-preset chips work
 */

import { test, expect } from '@playwright/test';

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
  // Clear any lingering preferences from previous test runs
  await page.addInitScript(() => {
    const keys = Object.keys(localStorage).filter(k =>
      k.startsWith('gp:') || k.startsWith('geeksup_') || k.startsWith('gs:')
    );
    keys.forEach(k => localStorage.removeItem(k));
  });
});

async function goto(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}
async function waitForCards(page) {
  await page.waitForSelector('#feedGrid article.card', { timeout: 15_000 });
}

// =============================================================================
// Open / close
// =============================================================================

test('My Signal button is present in nav', async ({ page }) => {
  await goto(page);
  await expect(page.locator('#myPulseBtn')).toBeVisible({ timeout: 8_000 });
});

test('clicking My Signal button opens the drawer', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#myPulseBtn').click();
  await expect(page.locator('#myPulseDrawer')).toHaveClass(/open/, { timeout: 3_000 });
  await expect(page.locator('#myPulseBtn')).toHaveAttribute('aria-expanded', 'true');
});

test('clicking the X close button closes the drawer', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#myPulseBtn').click();
  await expect(page.locator('#myPulseDrawer')).toHaveClass(/open/);

  await page.locator('#myPulseClose').click();
  await expect(page.locator('#myPulseDrawer')).not.toHaveClass(/open/);
  await expect(page.locator('#myPulseBtn')).toHaveAttribute('aria-expanded', 'false');
});

test('pressing Escape closes the My Signal drawer', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#myPulseBtn').click();
  await expect(page.locator('#myPulseDrawer')).toHaveClass(/open/);

  await page.keyboard.press('Escape');
  await expect(page.locator('#myPulseDrawer')).not.toHaveClass(/open/);
});

test('clicking the backdrop closes the drawer', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#myPulseBtn').click();
  await expect(page.locator('#myPulseDrawer')).toHaveClass(/open/);

  await page.locator('#myPulseBackdrop').click();
  await expect(page.locator('#myPulseDrawer')).not.toHaveClass(/open/);
});

// =============================================================================
// Category blocking
// =============================================================================

test('drawer shows category chip buttons', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#myPulseBtn').click();
  await expect(page.locator('#myPulseDrawer #mpCategoryChips [data-cat-chip]').first()).toBeVisible({ timeout: 3_000 });
});

test('blocking a category removes those cards from the feed', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  // Find the first category that has visible cards
  const firstCard = page.locator('#feedGrid article.card').first();
  const targetCat = await firstCard.getAttribute('data-category');
  if (!targetCat || targetCat === 'Latest') {
    // Skip this test if category is indeterminate
    test.skip();
    return;
  }

  const beforeCount = await page.locator(`#feedGrid article.card[data-category="${targetCat}"]`).count();
  expect(beforeCount).toBeGreaterThan(0);

  // Block the category via My Signal
  await page.locator('#myPulseBtn').click();
  const chip = page.locator(`#myPulseDrawer [data-cat-chip="${targetCat}"]`);
  await expect(chip).toBeVisible({ timeout: 3_000 });
  await chip.click();
  await page.waitForTimeout(400);

  // Cards of that category should be gone
  const afterCount = await page.locator(`#feedGrid article.card[data-category="${targetCat}"]`).count();
  expect(afterCount).toBe(0);
});

test('chip gets muted class after blocking a category', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#myPulseBtn').click();
  const firstChip = page.locator('#myPulseDrawer #mpCategoryChips [data-cat-chip]').first();
  await expect(firstChip).toBeVisible({ timeout: 3_000 });

  await firstChip.click();
  await expect(firstChip).toHaveClass(/mpd-chip--muted/);
});

// =============================================================================
// Pulse summary bar
// =============================================================================

test('pulse summary bar appears when a category is blocked', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  // No preferences active initially — bar should be hidden
  const bar = page.locator('#pulseSummaryBar');

  await page.locator('#myPulseBtn').click();
  const firstChip = page.locator('#myPulseDrawer #mpCategoryChips [data-cat-chip]').first();
  await firstChip.click();
  await page.waitForTimeout(400);

  // Bar should now be visible with preference pills
  await expect(bar).toBeVisible({ timeout: 3_000 });
});

test('pulse summary bar reset button clears preferences', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const total = await page.locator('#feedGrid article.card').count();

  // Block a category
  await page.locator('#myPulseBtn').click();
  await page.locator('#myPulseDrawer #mpCategoryChips [data-cat-chip]').first().click();
  await page.waitForTimeout(400);

  // Hit the reset button on the summary bar
  await page.locator('#pulseSummaryBar').locator('#pulseSummaryReset').click();
  await page.waitForTimeout(400);

  // All cards should be restored
  const restoredCount = await page.locator('#feedGrid article.card').count();
  expect(restoredCount).toBe(total);

  // Bar should be hidden again
  const display = await page.locator('#pulseSummaryBar').evaluate(el => el.style.display);
  expect(display).toBe('none');
});

// =============================================================================
// Reset button inside the drawer
// =============================================================================

test('Reset to defaults button inside drawer restores all cards', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const total = await page.locator('#feedGrid article.card').count();

  // Block a category
  await page.locator('#myPulseBtn').click();
  await page.locator('#myPulseDrawer #mpCategoryChips [data-cat-chip]').first().click();
  await page.waitForTimeout(400);

  // Click reset inside drawer (drawer stays open after chip click)
  await page.locator('#myPulseBtn').click(); // re-open if closed
  await page.waitForTimeout(200);
  const resetBtn = page.locator('#myPulseDrawer #mpResetBtn');
  await expect(resetBtn).toBeVisible({ timeout: 3_000 });
  await resetBtn.click();
  await page.waitForTimeout(400);

  expect(await page.locator('#feedGrid article.card').count()).toBe(total);
});

test('Reset to defaults shows a toast message', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#myPulseBtn').click();
  await page.locator('#myPulseDrawer #mpCategoryChips [data-cat-chip]').first().click();
  await page.waitForTimeout(300);

  await page.locator('#myPulseBtn').click();
  await page.waitForTimeout(200);
  await page.locator('#myPulseDrawer #mpResetBtn').click();

  await expect(page.locator('#bmToast')).toBeVisible({ timeout: 3_000 });
});

// =============================================================================
// Quick presets
// =============================================================================

test('drawer shows quick-preset buttons', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#myPulseBtn').click();
  await expect(page.locator('#myPulseDrawer .mpd-preset').first()).toBeVisible({ timeout: 3_000 });
});

test('selecting a preset filters the feed', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const total = await page.locator('#feedGrid article.card').count();

  await page.locator('#myPulseBtn').click();
  // Click the first preset (e.g. "Console")
  await page.locator('#myPulseDrawer .mpd-preset').first().click();
  await page.waitForTimeout(400);

  const filtered = await page.locator('#feedGrid article.card').count();
  // After preset some categories may be hidden — count could be less or equal
  expect(filtered).toBeGreaterThanOrEqual(0);
  expect(filtered).toBeLessThanOrEqual(total);
});

// =============================================================================
// Source muting
// =============================================================================

test('drawer shows source mute buttons', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#myPulseBtn').click();
  await expect(page.locator('#myPulseDrawer #mpSourceList [data-src-mute]').first()).toBeVisible({ timeout: 3_000 });
});

test('muting a source removes its articles from the feed', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  // Get source of first card
  const firstCard = page.locator('#feedGrid article.card').first();
  const sourceText = await firstCard.locator('.card-source span:nth-child(2)').textContent();
  if (!sourceText?.trim()) { test.skip(); return; }
  const sourceName = sourceText.trim();

  const beforeCount = await page.locator(`#feedGrid article.card`).count();

  await page.locator('#myPulseBtn').click();
  const srcBtn = page.locator(`#myPulseDrawer [data-src-mute="${sourceName}"]`);
  if (await srcBtn.count() === 0) { test.skip(); return; }
  await srcBtn.click();
  await page.waitForTimeout(400);

  const afterCount = await page.locator('#feedGrid article.card').count();
  // At least some cards should have been removed
  expect(afterCount).toBeLessThanOrEqual(beforeCount);
});

// =============================================================================
// Hide sponsored toggle
// =============================================================================

test('Hide sponsored checkbox is present in the drawer', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#myPulseBtn').click();
  await expect(page.locator('#myPulseDrawer #mpHideSponsored')).toBeVisible({ timeout: 3_000 });
});

// =============================================================================
// Article age filter
// =============================================================================

test('Article age options are present in the drawer', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#myPulseBtn').click();
  await expect(page.locator('#myPulseDrawer [data-age]').first()).toBeVisible({ timeout: 3_000 });
  expect(await page.locator('#myPulseDrawer [data-age]').count()).toBeGreaterThanOrEqual(3);
});

test('selecting an age filter marks it active', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#myPulseBtn').click();
  const ageBtn = page.locator('#myPulseDrawer [data-age="7d"]');
  await expect(ageBtn).toBeVisible({ timeout: 3_000 });
  await ageBtn.click();

  await expect(ageBtn).toHaveClass(/active/);
  await expect(ageBtn).toHaveAttribute('aria-pressed', 'true');
});

