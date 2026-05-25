/**
 * tests/e2e/global-setup.js
 *
 * Runs once before the Playwright test suite starts.
 * Copies the e2e feed fixture into public/feed.json so the Vite dev server
 * serves realistic article data without polluting the real feed file.
 */

import { copyFile, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '../../');

const FIXTURE = path.join(ROOT, 'tests/fixtures/feed.json');
const TARGET  = path.join(ROOT, 'public/feed.json');
const BACKUP  = path.join(ROOT, 'public/feed.json.bak');

export default async function globalSetup() {
  // Back up whatever is currently in public/feed.json
  const original = await readFile(TARGET, 'utf8');
  await writeFile(BACKUP, original, 'utf8');

  // Install the test fixture
  await copyFile(FIXTURE, TARGET);
  console.log('[e2e setup] Installed tests/fixtures/feed.json → public/feed.json');
}

