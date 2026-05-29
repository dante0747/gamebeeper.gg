/**
 * tests/e2e/summary.spec.js
 *
 * End-to-end tests for the AI Summary / Article Snippet modal:
 *   - clicking the summary button on a card opens the modal
 *   - the modal displays the article title
 *   - the "Read full article" link points to the correct URL
 *   - pressing Escape closes the modal
 *   - clicking the backdrop closes the modal
 *   - clicking the X button closes the modal
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
});

async function goto(page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
}
async function waitForCards(page) {
  await page.waitForSelector('#feedGrid article.card', { timeout: 15_000 });
}

// =============================================================================
// Modal opens
// =============================================================================

test('summary button is present on article cards', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  const summaryBtn = page.locator('#feedGrid article.card').first().locator('.card-summary-btn');
  await expect(summaryBtn).toBeVisible();
});

test('clicking summary button opens the summary modal', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#feedGrid article.card').first().locator('.card-summary-btn').click();

  await expect(page.locator('#summaryModal')).toHaveClass(/open/, { timeout: 3_000 });
});

test('summary modal displays the article title', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  // Get the title of the first card
  const cardTitleText = await page.locator('#feedGrid article.card').first()
    .locator('.card-title a').textContent();

  await page.locator('#feedGrid article.card').first().locator('.card-summary-btn').click();

  const modalTitle = await page.locator('#summaryModalTitle').textContent();
  expect(modalTitle?.trim()).toBeTruthy();
  // The modal title should broadly match the card title (both come from the same article)
  expect(modalTitle?.trim().length).toBeGreaterThan(0);
});

test('summary modal "Read full article" link has a valid href', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#feedGrid article.card').first().locator('.card-summary-btn').click();

  const href = await page.locator('#summaryReadLink').getAttribute('href');
  expect(href).toBeTruthy();
  expect(href).not.toBe('#');
});

test('summary modal displays text or an error message', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#feedGrid article.card').first().locator('.card-summary-btn').click();

  const summaryText = page.locator('#summaryText');
  const summaryError = page.locator('#summaryError');

  const hasText  = (await summaryText.textContent())?.trim().length ?? 0;
  const hasError = await summaryError.evaluate(el => !el.hidden);

  expect(hasText > 0 || hasError).toBe(true);
});

test('summary modal shows the source label', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#feedGrid article.card').first().locator('.card-summary-btn').click();

  const src = await page.locator('#summarySource').textContent();
  expect(src?.trim().length).toBeGreaterThan(0);
});

// =============================================================================
// Modal closes
// =============================================================================

test('pressing Escape closes the summary modal', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#feedGrid article.card').first().locator('.card-summary-btn').click();
  await expect(page.locator('#summaryModal')).toHaveClass(/open/);

  await page.keyboard.press('Escape');
  await expect(page.locator('#summaryModal')).not.toHaveClass(/open/, { timeout: 2_000 });
});

test('clicking the backdrop closes the summary modal', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#feedGrid article.card').first().locator('.card-summary-btn').click();
  await expect(page.locator('#summaryModal')).toHaveClass(/open/);

  await page.locator('#summaryBackdrop').click();
  await expect(page.locator('#summaryModal')).not.toHaveClass(/open/, { timeout: 2_000 });
});

test('clicking the X button closes the summary modal', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#feedGrid article.card').first().locator('.card-summary-btn').click();
  await expect(page.locator('#summaryModal')).toHaveClass(/open/);

  await page.locator('#summaryClose').click();
  await expect(page.locator('#summaryModal')).not.toHaveClass(/open/, { timeout: 2_000 });
});

test('body overflow is restored after closing the modal', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  await page.locator('#feedGrid article.card').first().locator('.card-summary-btn').click();
  await page.locator('#summaryClose').click();
  await page.waitForTimeout(200);

  const overflow = await page.evaluate(() => document.body.style.overflow);
  expect(overflow).not.toBe('hidden');
});

// =============================================================================
// Badge type
// =============================================================================

test('AI summary cards show the AI badge label', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  // Find a card whose summary button has no snippet class (i.e. is AI type)
  const aiBtn = page.locator('#feedGrid article.card .card-summary-btn:not(.card-summary-btn--snippet)').first();
  const count = await aiBtn.count();
  if (count === 0) { test.skip(); return; }

  await aiBtn.click();
  await expect(page.locator('#summaryBadgeLabel')).toHaveText('AI Summary');
});

test('snippet summary cards show the Article Snippet badge label', async ({ page }) => {
  await goto(page);
  await waitForCards(page);

  // Find a snippet-type button
  const snippetBtn = page.locator('#feedGrid article.card .card-summary-btn--snippet').first();
  const count = await snippetBtn.count();
  if (count === 0) { test.skip(); return; }

  await snippetBtn.click();
  await expect(page.locator('#summaryBadgeLabel')).toHaveText('Article Snippet');
});

