// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup:  './tests/e2e/global-setup.js',
  globalTeardown: './tests/e2e/global-teardown.js',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    // ── Functional test suite (smoke + feature specs) ──────────────────────────
    {
      name: 'chromium',
      testMatch: /(?<!visual)\.spec\.js$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: /(?<!visual)\.spec\.js$/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: /(?<!visual)\.spec\.js$/,
      use: { ...devices['Desktop Safari'] },
    },

    // ── Mobile viewports ────────────────────────────────────────────────────────
    {
      name: 'mobile-chrome',
      testMatch: /smoke\.spec\.js$/,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'mobile-safari',
      testMatch: /smoke\.spec\.js$/,
      use: { ...devices['iPhone 13'] },
    },

    // ── Visual regression (Chromium only for deterministic snapshots) ────────────
    {
      name: 'visual',
      testMatch: /visual\.spec\.js$/,
      use: {
        ...devices['Desktop Chrome'],
        // Disable animations for stable screenshots
        launchOptions: { args: ['--disable-gpu', '--disable-lcd-text'] },
      },
    },
  ],

  // Use the Vite dev server — it serves /public/feed.json correctly because
  // root is '.', making the public/ folder accessible at its full path.
  // (vite preview serves dist/ where feed.json is at root, not /public/.)
  webServer: {
    // --no-open prevents Vite from launching a system browser tab that would
    // compete with Playwright for Vite's Node.js event loop on each test.
    command: 'npx vite --no-open',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});

