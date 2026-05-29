/**
 * tests/e2e/smoke.spec.js
 * Playwright end-to-end smoke + full-coverage tests for GameBeeper.gg
 *
 * Prerequisites: `npm run build:app` then `npx vite preview` (handled by
 * playwright.config.js webServer, or the CI e2e job).
 */

import { test, expect } from '@playwright/test';

// -- Block external network dependencies ---------------------------------------
// Google Fonts and Analytics are stubbed so tests run fast and deterministically.
test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route =>
    route.fulfill({ status: 200, contentType: 'text/css; charset=utf-8', body: '' })
  );
  await page.route('https://fonts.gstatic.com/**', route =>
    route.fulfill({ status: 200, contentType: 'font/woff2', body: '' })
  );
  await page.route('https://www.googletagmanager.com/**', route =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
  );
});

// -- Helpers -------------------------------------------------------------------

/**
 * Navigate to the given URL using `domcontentloaded`.
 */
async function goto(page, path = '/') {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
}

/** Wait for article cards to be rendered in #feedGrid */
async function waitForCards(page) {
  await page.waitForSelector('#feedGrid article.card', { timeout: 15_000 });
}

// =============================================================================
// PAGE LOAD & METADATA
// =============================================================================

test('page loads and shows article cards', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const cards = page.locator('#feedGrid article.card');
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeGreaterThan(0);
});

test('page title contains GameBeeper', async ({ page }) => {
  await goto(page);
  await expect(page).toHaveTitle(/GameBeeper/i);
});

test('meta description is present and non-trivial', async ({ page }) => {
  await goto(page);
  const desc = await page.locator('meta[name="description"]').getAttribute('content');
  expect(desc).toBeTruthy();
  expect(desc.length).toBeGreaterThan(20);
});

test('canonical link points to gamebeeper.gg', async ({ page }) => {
  await goto(page);
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  expect(canonical).toMatch(/gamebeeper\.gg/);
});

test('Open Graph image meta tag is present', async ({ page }) => {
  await goto(page);
  const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
  expect(ogImage).toBeTruthy();
});

test('manifest.json is linked in <head>', async ({ page }) => {
  await goto(page);
  const manifest = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifest).toBeTruthy();
});

// =============================================================================
// NAVIGATION
// =============================================================================

test('nav logo is visible and links to /', async ({ page }) => {
  await goto(page);
  const logo = page.locator('.top-nav .logo');
  await expect(logo).toBeVisible();
  expect(await logo.getAttribute('href')).toBe('/');
});

test('nav links Feed, Sources, About, Feedback are present', async ({ page }) => {
  await goto(page);
  for (const label of ['Feed', 'Sources', 'About', 'Feedback']) {
    await expect(page.locator(`.nav-links a:has-text("${label}")`)).toBeVisible();
  }
});

test('nav Watch link is present', async ({ page }) => {
  await goto(page);
  await expect(page.locator('.nav-links .nav-link-watch')).toBeVisible();
});

test('nav search button is present and clickable', async ({ page }) => {
  await goto(page);
  await waitForCards(page);
  await expect(page.locator('#navSearchBtn')).toBeVisible();
  await page.locator('#navSearchBtn').click(); // should not throw
});

test('mobile hamburger opens and closes nav drawer', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await goto(page);
  await waitForCards(page);

  const hamburger = page.locator('#navHamburger');
  const drawer = page.locator('#navDrawer');

  await hamburger.click();
  await expect(drawer).toHaveClass(/open/);
  await expect(hamburger).toHaveAttribute('aria-expanded', 'true');

  await page.locator('#navDrawerBackdrop').click();
  await expect(drawer).not.toHaveClass(/open/);
  await expect(hamburger).toHaveAttribute('aria-expanded', 'false');
});

test('mobile nav drawer closes on Escape key', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await goto(page);
  await waitForCards(page);

  await page.locator('#navHamburger').click();
  await expect(page.locator('#navDrawer')).toHaveClass(/open/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#navDrawer')).not.toHaveClass(/open/);
});

// =============================================================================
// HERO SECTION
// =============================================================================

test('hero heading is visible', async ({ page }) => {
  await goto(page);
  await expect(page.locator('#hero-heading')).toBeVisible();
});

test('hero "Explore the Feed" CTA links to #latest', async ({ page }) => {
  await goto(page);
  const cta = page.locator('.hero-ctas a.btn-primary');
  await expect(cta).toBeVisible();
  expect(await cta.getAttribute('href')).toBe('#latest');
});

test('hero refresh button is present', async ({ page }) => {
  await goto(page);
  await expect(page.locator('#refreshBtnHero')).toBeVisible();
});

test('hero feed count badge shows a non-zero number', async ({ page }) => {
  await goto(page);
  const count = await page.locator('#heroFeedCount').textContent();
  expect(parseInt(count ?? '0', 10)).toBeGreaterThan(0);
});

test('hero featured card renders an hfc-inner after articles load', async ({ page }) => {
  await goto(page);
  await waitForCards(page);
  await expect(page.locator('#heroFeaturedCard .hfc-inner')).toBeVisible({ timeout: 10_000 });
});

test('hero featured card title link has a valid href', async ({ page }) => {
  await goto(page);
  await waitForCards(page);
  const titleLink = page.locator('#heroFeaturedCard .hfc-title a');
  await expect(titleLink).toBeVisible({ timeout: 10_000 });
  const href = await titleLink.getAttribute('href');
  expect(href).toBeTruthy();
  expect(href).not.toBe('#');
});

// =============================================================================
// STATUS / TOOLBAR
// =============================================================================

test('status dot transitions from loading to live', async ({ page }) => {
  await goto(page);
  await waitForCards(page);
  await expect(page.locator('#statusDot')).toHaveClass(/live/, { timeout: 10_000 });
});

test('article count is shown after load', async ({ page }) => {
  await goto(page);
  await waitForCards(page);
  const countEl = page.locator('#articleCount');
  await expect(countEl).toBeVisible();
  expect((await countEl.textContent()) ?? '').toMatch(/\d+/);
});

test('grid view button is active by default', async ({ page }) => {
  await goto(page);
  await waitForCards(page);
  await expect(page.locator('#gridViewBtn')).toHaveClass(/active/);
  await expect(page.locator('#gridViewBtn')).toHaveAttribute('aria-pressed', 'true');
});

// =============================================================================
// CATEGORY FILTER
// =============================================================================

test('sidebar category filter — PC shows only PC cards', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#mobileFilters button[data-cat="PC"]').first().click();
  await page.waitForTimeout(300);

  const cards = page.locator('#feedGrid article.card:visible');
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < Math.min(count, 5); i++) {
    expect(await cards.nth(i).getAttribute('data-category')).toBe('PC');
  }
});

test('clicking All filter after category filter restores all cards', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const totalBefore = await page.locator('#feedGrid article.card').count();

  await page.locator('#mobileFilters button[data-cat="Nintendo"]').first().click();
  await page.waitForTimeout(300);
  await page.locator('#mobileFilters button[data-cat="All"]').first().click();
  await page.waitForTimeout(300);

  expect(await page.locator('#feedGrid article.card').count()).toBe(totalBefore);
});

test('clear chip appears when a non-All filter is active', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#mobileFilters button[data-cat="Reviews"]').first().click();
  await page.waitForTimeout(300);

  await expect(page.locator('#mobileFilters .chip-clear')).toBeVisible();
});

test('clicking clear chip resets to All', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const total = await page.locator('#feedGrid article.card').count();
  await page.locator('#mobileFilters button[data-cat="Reviews"]').first().click();
  await page.waitForTimeout(300);
  await page.locator('#mobileFilters .chip-clear').click();
  await page.waitForTimeout(300);

  expect(await page.locator('#feedGrid article.card').count()).toBe(total);
});

test('trending topics grid is populated after load', async ({ page }) => {
  await goto(page);
  await waitForCards(page);
  const topics = page.locator('#trendingTopicsGrid .trending-topic');
  await expect(topics.first()).toBeVisible({ timeout: 10_000 });
  expect(await topics.count()).toBeGreaterThan(0);
});

test('clicking a trending topic activates a chip in mobileFilters', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#trendingTopicsGrid .trending-topic').first().click();
  await page.waitForTimeout(300);

  const activeChip = page.locator('#mobileFilters .chip.active');
  await expect(activeChip).toBeVisible();
});

// =============================================================================
// SEARCH
// =============================================================================

test('search filters articles by keyword', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const allBefore = await page.locator('#feedGrid article.card').count();
  await page.locator('#articleSearch').fill('python');
  await page.waitForTimeout(400);

  const countAfter = await page.locator('#feedGrid article.card:visible').count();
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

  expect(await page.locator('#feedGrid article.card').count()).toBe(allCount);
});

test('search input has placeholder text mentioning search', async ({ page }) => {
  await goto(page);
  expect(await page.locator('#articleSearch').getAttribute('placeholder')).toMatch(/search/i);
});

// =============================================================================
// KEYBOARD SHORTCUTS
// =============================================================================

test('pressing / focuses the search input', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#feedGrid').click();
  await page.keyboard.press('/');

  await expect(page.locator('#articleSearch')).toBeFocused();
});

test('pressing Escape clears and blurs search', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const searchInput = page.locator('#articleSearch');
  await searchInput.fill('rust');
  await page.waitForTimeout(200);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  expect(await searchInput.inputValue()).toBe('');
});

test('pressing r triggers a feed refresh', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.keyboard.press('r');
  await expect(page.locator('#statusDot')).toHaveClass(/live/, { timeout: 15_000 });
});

test('pressing j/k does not crash the page', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#feedGrid').click();
  await page.keyboard.press('j');
  await page.waitForTimeout(100);
  await page.keyboard.press('k');
  await page.waitForTimeout(100);

  expect(await page.locator('#feedGrid article.card').count()).toBeGreaterThan(0);
});

// =============================================================================
// BOOKMARK FLOW
// =============================================================================

test('bookmarking first card shows toast and activates the bookmark button', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const firstCard = page.locator('#feedGrid article.card').first();
  const bmBtn = firstCard.locator('.bm-btn');
  await bmBtn.click();

  await expect(page.locator('#bmToast')).toBeVisible({ timeout: 3000 });
  await expect(bmBtn).toHaveClass(/bm-active/);
});

test('bookmarks filter count reflects saved bookmarks', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#feedGrid article.card').first().locator('.bm-btn').click();
  await page.waitForTimeout(300);

  const bookmarksBtn = page.locator('#sidebarFilters button[data-cat="Bookmarks"]');
  const countText = await bookmarksBtn.locator('.fi-count').textContent();
  expect(parseInt(countText ?? '0', 10)).toBeGreaterThan(0);
});

test('saved stories nav button is present', async ({ page }) => {
  await goto(page);
  await expect(page.locator('#savedStoriesBtn')).toBeVisible();
});

test('removing a bookmark toggles button back to inactive', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const bmBtn = page.locator('#feedGrid article.card').first().locator('.bm-btn');
  await bmBtn.click(); // add
  await expect(bmBtn).toHaveClass(/bm-active/);
  await bmBtn.click(); // remove
  await page.waitForTimeout(200);
  await expect(bmBtn).not.toHaveClass(/bm-active/);
});

// =============================================================================
// VIEW TOGGLE
// =============================================================================

test('switching to list view changes card layout', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#listViewBtn').click();
  await page.waitForTimeout(200);

  await expect(page.locator('#feedGrid article.card-row').first()).toBeVisible();
  await expect(page.locator('#listViewBtn')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#gridViewBtn')).toHaveAttribute('aria-pressed', 'false');
});

test('switching back to grid view restores grid cards', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#listViewBtn').click();
  await page.waitForTimeout(200);
  await page.locator('#gridViewBtn').click();
  await page.waitForTimeout(200);

  await expect(page.locator('#feedGrid article.card').first()).toBeVisible();
  await expect(page.locator('#gridViewBtn')).toHaveAttribute('aria-pressed', 'true');
});

// =============================================================================
// MOBILE VIEWPORT
// =============================================================================

test('mobile viewport: chip filters visible and sidebar is hidden', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await goto(page);
  await waitForCards(page);

  await expect(page.locator('#mobileFilters')).toBeVisible();

  const sidebar = page.locator('aside.community-rail');
  const box = await sidebar.boundingBox();
  const isHiddenOffscreen = !box || box.x < 0 || box.width === 0;
  const isHiddenByStyle = await sidebar.evaluate(el =>
    getComputedStyle(el).display === 'none' ||
    getComputedStyle(el).visibility === 'hidden'
  );
  expect(isHiddenOffscreen || isHiddenByStyle).toBe(true);
});

test('mobile viewport: hamburger button is visible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await goto(page);
  await expect(page.locator('#navHamburger')).toBeVisible();
});

// =============================================================================
// SIDEBAR COMMUNITY RAIL (desktop)
// =============================================================================

test('desktop viewport: community rail is visible', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await goto(page);
  await waitForCards(page);
  await expect(page.locator('aside.community-rail')).toBeVisible();
});

test('sidebar signal status shows sources count after load', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await goto(page);
  await waitForCards(page);
  expect((await page.locator('#sbFeeds').textContent()) ?? '').toMatch(/\d+/);
});

test('sidebar last refresh time is populated after load', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await goto(page);
  await waitForCards(page);
  expect(await page.locator('#sbUpdated').textContent()).not.toBe('--');
});

// =============================================================================
// ARTICLE CARD STRUCTURE
// =============================================================================

test('each visible article card has a title link with a valid href', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const cards = page.locator('#feedGrid article.card');
  const count = Math.min(await cards.count(), 10);

  for (let i = 0; i < count; i++) {
    const href = await cards.nth(i).locator('.card-title a').getAttribute('href');
    expect(href).toBeTruthy();
    expect(href).not.toBe('#');
  }
});

test('each visible article card has a source label', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const cards = page.locator('#feedGrid article.card');
  const count = Math.min(await cards.count(), 5);

  for (let i = 0; i < count; i++) {
    await expect(cards.nth(i).locator('.card-source')).toBeVisible();
  }
});

test('each visible article card has a bookmark button', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const cards = page.locator('#feedGrid article.card');
  const count = Math.min(await cards.count(), 5);

  for (let i = 0; i < count; i++) {
    await expect(cards.nth(i).locator('.bm-btn')).toBeVisible();
  }
});

// =============================================================================
// REFRESH BUTTON
// =============================================================================

test('hero refresh button triggers reload and returns to live status', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#refreshBtnHero').click();
  await expect(page.locator('#statusDot')).toHaveClass(/live/, { timeout: 15_000 });
});

// =============================================================================
// STATIC PAGES
// =============================================================================

test('privacy.html loads with expected content', async ({ page }) => {
  await page.goto('/privacy.html', { waitUntil: 'domcontentloaded' });
  expect((await page.locator('body').textContent())?.toLowerCase()).toMatch(/privacy/);
});

test('terms.html loads with expected content', async ({ page }) => {
  await page.goto('/terms.html', { waitUntil: 'domcontentloaded' });
  expect((await page.locator('body').textContent())?.toLowerCase()).toMatch(/terms/);
});

// =============================================================================
// JSON ENDPOINTS
// =============================================================================

test('feed.json is accessible and returns an articles array', async ({ page }) => {
  const res = await page.request.get('/feed.json');
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(Array.isArray(body.articles)).toBe(true);
});

test('version.json is accessible and has a version field', async ({ page }) => {
  const res = await page.request.get('/version.json');
  expect(res.status()).toBe(200);
  expect((await res.json()).version).toBeTruthy();
});

test('manifest.json is valid JSON with a name field', async ({ page }) => {
  const res = await page.request.get('/manifest.json');
  expect(res.status()).toBe(200);
  expect((await res.json()).name).toBeTruthy();
});

// =============================================================================
// ACCESSIBILITY
// =============================================================================

test('skip-to-main-content link is present and targets #latest', async ({ page }) => {
  await goto(page);
  await expect(page.locator('.skip-link[href="#latest"]')).toBeAttached();
});

test('search input has an associated aria label', async ({ page }) => {
  await goto(page);
  await expect(page.locator('label[for="articleSearch"]')).toBeAttached();
});

test('<main> landmark is present', async ({ page }) => {
  await goto(page);
  await expect(page.locator('main')).toBeAttached();
});

test('no unhandled JS errors on page load', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  await goto(page);
  await waitForCards(page);
  const realErrors = errors.filter(e =>
    !e.includes('serviceWorker') &&
    !e.includes('sw.js') &&
    !e.includes('Could not load')
  );
  expect(realErrors).toHaveLength(0);
});

// =============================================================================
// FOOTER
// =============================================================================

test('footer sources section is present', async ({ page }) => {
  await goto(page);
  await expect(page.locator('#sources')).toBeAttached();
});

test('footer privacy and terms links are present', async ({ page }) => {
  await goto(page);
  await expect(page.locator('footer a[href="/privacy.html"]').first()).toBeAttached();
  await expect(page.locator('footer a[href="/terms.html"]').first()).toBeAttached();
});

test('back-to-top button appears after scrolling down', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(300);

  await expect(page.locator('#backToTop')).toHaveClass(/visible/, { timeout: 3000 });
});
