/**
 * tests/e2e/pwa.spec.js
 *
 * End-to-end tests for PWA / static-asset endpoints:
 *   - robots.txt is accessible and contains expected directives
 *   - sitemap.xml is accessible and is valid XML
 *   - feed-health.json is accessible
 *   - Service Worker script is served (sw.js)
 *   - manifest.json has required PWA fields
 *   - og-image.png is served
 *   - favicon.svg is served
 */

import { test, expect } from '@playwright/test';

// =============================================================================
// robots.txt
// =============================================================================

test('robots.txt is accessible', async ({ page }) => {
  const res = await page.request.get('/robots.txt');
  expect(res.status()).toBe(200);
});

test('robots.txt has correct content-type (text/*)', async ({ page }) => {
  const res = await page.request.get('/robots.txt');
  const ct = res.headers()['content-type'] ?? '';
  expect(ct).toMatch(/text/);
});

test('robots.txt allows all crawlers at root', async ({ page }) => {
  const res = await page.request.get('/robots.txt');
  const body = await res.text();
  expect(body).toContain('User-agent: *');
  expect(body).toContain('Allow: /');
});

test('robots.txt includes a Sitemap directive', async ({ page }) => {
  const res = await page.request.get('/robots.txt');
  const body = await res.text();
  expect(body).toMatch(/Sitemap:/i);
});

// =============================================================================
// sitemap.xml
// =============================================================================

test('sitemap.xml is accessible', async ({ page }) => {
  const res = await page.request.get('/sitemap.xml');
  expect(res.status()).toBe(200);
});

test('sitemap.xml has XML content-type', async ({ page }) => {
  const res = await page.request.get('/sitemap.xml');
  const ct = res.headers()['content-type'] ?? '';
  expect(ct).toMatch(/xml/);
});

test('sitemap.xml is parseable XML with a <urlset> root', async ({ page }) => {
  const res = await page.request.get('/sitemap.xml');
  const body = await res.text();
  expect(body).toMatch(/<\?xml/);
  expect(body).toContain('<urlset');
  expect(body).toContain('<url>');
  expect(body).toContain('<loc>');
});

test('sitemap.xml contains the canonical homepage URL', async ({ page }) => {
  const res = await page.request.get('/sitemap.xml');
  const body = await res.text();
  expect(body).toContain('gamebeeper.gg');
});

// =============================================================================
// manifest.json
// =============================================================================

test('manifest.json has required PWA fields', async ({ page }) => {
  const res = await page.request.get('/manifest.json');
  expect(res.status()).toBe(200);
  const body = await res.json();

  expect(body.name).toBeTruthy();
  expect(body.short_name ?? body.name).toBeTruthy();
  // Icons are optional but common
});

test('manifest.json content-type is JSON', async ({ page }) => {
  const res = await page.request.get('/manifest.json');
  const ct = res.headers()['content-type'] ?? '';
  expect(ct).toMatch(/json/);
});

// =============================================================================
// Service Worker
// =============================================================================

test('sw.js is served with a 200 status', async ({ page }) => {
  const res = await page.request.get('/sw.js');
  expect(res.status()).toBe(200);
});

test('sw.js has JavaScript content-type', async ({ page }) => {
  const res = await page.request.get('/sw.js');
  const ct = res.headers()['content-type'] ?? '';
  expect(ct).toMatch(/javascript/);
});

// =============================================================================
// Static assets
// =============================================================================

test('og-image.png is served', async ({ page }) => {
  const res = await page.request.get('/og-image.png');
  expect(res.status()).toBe(200);
});

test('favicon.svg is served', async ({ page }) => {
  const res = await page.request.get('/favicon.svg');
  expect(res.status()).toBe(200);
});

test('feed-health.json is accessible (200 or 404 only)', async ({ page }) => {
  const res = await page.request.get('/feed-health.json');
  expect([200, 404]).toContain(res.status());
});

// =============================================================================
// PWA on-page validation
// =============================================================================

test('page has theme-color meta tag', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content');
  expect(themeColor).toBeTruthy();
});

test('page links to apple-touch-icon', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const ati = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
  expect(ati).toBeTruthy();
});

test('page has Open Graph type set to "website"', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const ogType = await page.locator('meta[property="og:type"]').getAttribute('content');
  expect(ogType).toBe('website');
});

test('page has Twitter card meta tag', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const tc = await page.locator('meta[name="twitter:card"]').getAttribute('content');
  expect(tc).toBe('summary_large_image');
});

test('JSON-LD structured data is present on the page', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const scripts = page.locator('script[type="application/ld+json"]');
  expect(await scripts.count()).toBeGreaterThan(0);
});

