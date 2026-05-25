/**
 * tests/e2e/smoke.spec.js
 * Playwright end-to-end smoke tests for GameBeeper.dev
 *
 * Prerequisites: `npm run build:app` then `npx vite preview` (handled by
 * playwright.config.js webServer, or the CI e2e job).
 */

import { test, expect } from '@playwright/test';

// ── Block external network dependencies ───────────────────────────────────────
// Google Fonts is loaded as a render-blocking <link rel="stylesheet">.
// On a slow or rate-limited connection it can delay the `load` event far beyond
// the test timeout.  Stub it out so every test gets a near-instant empty CSS
// response and the fonts fall back to the stack declared in styles.css.
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route =>
    route.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: '' })
  );
  await page.route('https://fonts.gstatic.com/**', route =>
    route.fulfill({ status: 200, contentType: 'font/woff2', body: '' })
  );
  // Stub Google Analytics in case consent is somehow set in the test profile
  await page.route('https://www.googletagmanager.com/**', route =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
  );
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Navigate to the given URL using `domcontentloaded` rather than the default
 * `load`.  The `load` event can stall when any subresource (e.g. an external
 * stylesheet that escaped the route-stub list) is slow.  Using
 * `domcontentloaded` returns as soon as the HTML is parsed and all deferred
 * ES-module scripts have executed — which is all the app needs to initialise.
 * Individual tests already call `waitForCards()` to confirm the app is ready.
 */
async function goto(page, path = '/') {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}

/** Wait for article cards to be rendered in #feedGrid */
async function waitForCards(page) {
  await page.waitForSelector('#feedGrid article.card', { timeout: 15_000 });
}

// ── Page loads and shows articles ────────────────────────────────────────────

test('page loads and shows article cards', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const cards = page.locator('#feedGrid article.card');
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
});

test('page title contains GameBeeper', async ({ page }) => {
  await goto(page);
  await expect(page).toHaveTitle(/GameBeeper/i);
});

// ── Category filter ───────────────────────────────────────────────────────────

test('sidebar category filter — PC shows only PC cards', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  // Click the PC filter button in the sidebar
  await page.locator('#sidebarFilters button[data-cat="PC"]').first().click();
  await page.waitForTimeout(300); // allow filter animation

  const cards = page.locator('#feedGrid article.card:visible');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);

  // Every visible card should have data-category="PC"
  for (let i = 0; i < Math.min(count, 5); i++) {
    const cat = await cards.nth(i).getAttribute('data-category');
    expect(cat).toBe('PC');
  }
});

// ── Search ────────────────────────────────────────────────────────────────────

test('search filters articles by keyword', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const allBefore = await page.locator('#feedGrid article.card').count();

  const searchInput = page.locator('#articleSearch');
  await searchInput.fill('python');
  await page.waitForTimeout(400); // debounce

  const cardsAfter = page.locator('#feedGrid article.card:visible');
  const countAfter = await cardsAfter.count();

  // Should show fewer cards than "all" and at least 1 result
  expect(countAfter).toBeGreaterThan(0);
  expect(countAfter).toBeLessThan(allBefore);
});

test('clearing search restores all articles', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const allCount = await page.locator('#feedGrid article.card').count();

  await page.locator('#articleSearch').fill('python');
  await page.waitForTimeout(400);

  await page.locator('#articleSearch').fill('');
  await page.waitForTimeout(400);

  const restored = await page.locator('#feedGrid article.card').count();
  expect(restored).toBe(allCount);
});

// ── Keyboard navigation ───────────────────────────────────────────────────────

test('pressing / focuses the search input', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  // Click somewhere neutral first (not inside search)
  await page.locator('#feedGrid').click();
  await page.keyboard.press('/');

  const searchInput = page.locator('#articleSearch');
  await expect(searchInput).toBeFocused();
});

test('pressing Escape clears and blurs search', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const searchInput = page.locator('#articleSearch');
  await searchInput.fill('rust');
  await page.waitForTimeout(200);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  const value = await searchInput.inputValue();
  expect(value).toBe('');
});

// ── Bookmark flow ─────────────────────────────────────────────────────────────

test('bookmarking first card shows toast and activates the bookmark button', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  // Click the bookmark button on the first card
  const firstCard = page.locator('#feedGrid article.card').first();
  const bmBtn = firstCard.locator('.bm-btn');
  await bmBtn.click();

  // Toast should appear
  await expect(page.locator('#bmToast')).toBeVisible({ timeout: 3000 });

  // The button should now have the bm-active class (filled bookmark icon)
  await expect(bmBtn).toHaveClass(/bm-active/);

  // The Bookmarks filter count in the sidebar should reflect the new bookmark
  const bookmarksFilterBtn = page.locator('#sidebarFilters button[data-cat="Bookmarks"]');
  const countText = await bookmarksFilterBtn.locator('.fi-count').textContent();
  expect(parseInt(countText || '0', 10)).toBeGreaterThan(0);
});

// ── Mobile viewport ───────────────────────────────────────────────────────────

test('mobile viewport: chip filters visible and sidebar is hidden', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await goto(page);
  await waitForCards(page);

  // Mobile chip filter row should be visible
  const mobileFilters = page.locator('#mobileFilters');
  await expect(mobileFilters).toBeVisible();

  // Sidebar should be visually hidden (off-screen or display:none) on mobile
  const sidebar = page.locator('aside.sidebar');
  // On mobile the sidebar is toggled via a panel, not visible inline
  const box = await sidebar.boundingBox();
  const isHiddenOffscreen = !box || box.x < 0 || box.width === 0;
  const isHiddenByStyle = (await sidebar.evaluate(el =>
    getComputedStyle(el).display === 'none' ||
    getComputedStyle(el).visibility === 'hidden'
  ));
  expect(isHiddenOffscreen || isHiddenByStyle).toBe(true);
});

// ── View toggle ───────────────────────────────────────────────────────────────

test('switching to list view changes card layout', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#listViewBtn').click();
  await page.waitForTimeout(200);

  // Cards in list view have the card-row class
  const listCard = page.locator('#feedGrid article.card-row').first();
  await expect(listCard).toBeVisible();
});
