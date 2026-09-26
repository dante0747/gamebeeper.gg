import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';
import { siteStats } from './scripts/lib/site-stats.mjs';

// -- GameBeeper build plugin ----------------------------------------------------
// 1. Replaces {{SOURCE_COUNT}} / {{FEED_COUNT}} tokens in every HTML entry so the
//    "N trusted sources" copy, meta descriptions and JSON-LD all derive from
//    data/feeds.json — the single source of truth.
// 2. Publishes the runtime registries (data/*.json) that the browser fetches at
//    /data/…; they live outside public/ because the Node pipeline reads them too.
function gamebeeper() {
  const stats = siteStats();
  return {
    name: 'gamebeeper',
    transformIndexHtml(html) {
      return html
        .replaceAll('{{SOURCE_COUNT}}', String(stats.sourceCount))
        .replaceAll('{{FEED_COUNT}}', String(stats.feedCount));
    },
    generateBundle() {
      for (const file of ['feeds.json', 'video-sources.json']) {
        this.emitFile({
          type: 'asset',
          fileName: `data/${file}`,
          source: readFileSync(new URL(`./data/${file}`, import.meta.url)),
        });
      }
    },
  };
}

export default defineConfig({
  // Serve from project root; index.html at root is the entry point
  root: '.',

  // Use relative paths so dist/index.html works when opened as a local file
  // and when deployed to GitHub Pages at the domain root.
  base: './',

  // 'public/' is already used for feed.json / feed-health.json / version.json –
  // Vite treats this directory as static assets served verbatim.
  publicDir: 'public',

  plugins: [gamebeeper()],

  build: {
    // Output bundled app to dist/ for production deploy.
    // When deploying to GitHub Pages, point the deploy action at dist/.
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      // Every page is an explicit entry so the legal pages ship with the site
      // (and get the bundled stylesheet) instead of 404-ing in production.
      input: {
        main:    'index.html',
        privacy: 'privacy.html',
        terms:   'terms.html',
      },
    },

    // Inline assets ≤ 4 KB as base64 (default: 4096 bytes)
    assetsInlineLimit: 4096,

    // Generate source maps for production debugging
    sourcemap: false,
  },

  server: {
    // Local dev server – serves the static JSON files from public/
    port: 5173,
    open: true,
  },

  preview: {
    port: 4173,
  },

  test: {
    include: ['tests/**/*.test.{js,mjs}'],
    environment: 'node',
    environmentMatchGlobs: [
      ['**/tests/unit/browser-utils.test.js', 'happy-dom'],
      ['**/tests/unit/storage.test.js',        'happy-dom'],
      ['**/tests/dom/**',                      'happy-dom'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Only collect coverage for the modules we actively test.
      // Untested orchestration modules (main.js, feed.js, etc.) are excluded
      // so they don't deflate the project-wide average.
      include: [
        'js/utils.js',
        'js/storage.js',
        'js/cards.js',
        'js/config.js',
        'scripts/lib/utils.mjs',
        'scripts/lib/classifier.mjs',
        'scripts/lib/parser.mjs',
        'scripts/lib/sponsored.mjs',
        'scripts/lib/pipeline.mjs',
        'scripts/lib/config.mjs',
      ],
      // Per-file thresholds — set 5 pts below the measured baseline so the
      // gate fails only on genuine regressions, not natural variance.
      // Run `npm run test:coverage` to see current numbers.
      thresholds: {
        // Baseline: lines 61 %
        'scripts/lib/utils.mjs': { lines: 56, functions: 80 },
        // Baseline: lines 52 %
        'scripts/lib/classifier.mjs': { lines: 47 },
        // Baseline: lines 42 %
        'scripts/lib/sponsored.mjs': { lines: 37 },
        // Baseline: lines 100 %
        'scripts/lib/parser.mjs': { lines: 90, functions: 85 },
        // Baseline: lines 84 %
        'js/storage.js': { lines: 79, branches: 75, functions: 95 },
        // Baseline: lines 89 %
        'js/cards.js': { lines: 84, functions: 84 },
        // Baseline: lines 51 %
        'js/utils.js': { lines: 46 },
      },
    },
  },
});
