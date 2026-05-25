/**
 * tests/e2e/global-teardown.js
 *
 * Runs once after the entire Playwright test suite finishes.
 * Restores public/feed.json from the backup made by global-setup.js.
 */

import { copyFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '../../');

const TARGET = path.join(ROOT, 'public/feed.json');
const BACKUP = path.join(ROOT, 'public/feed.json.bak');

export default async function globalTeardown() {
  try {
    await copyFile(BACKUP, TARGET);
    await unlink(BACKUP);
    console.log('[e2e teardown] Restored public/feed.json from backup');
  } catch (err) {
    console.warn('[e2e teardown] Could not restore public/feed.json:', err.message);
  }
}

