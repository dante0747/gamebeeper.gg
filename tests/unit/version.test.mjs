/**
 * tests/unit/version.test.mjs
 * Validates version.json schema and the loadSiteVersion display logic.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const VERSION_PATH = resolve('public/version.json');

describe('version.json schema', () => {
  it('exists and is valid JSON', () => {
    const raw = readFileSync(VERSION_PATH, 'utf8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('has required fields: version, commit, date, build', () => {
    const v = JSON.parse(readFileSync(VERSION_PATH, 'utf8'));
    expect(v.version).toBeTruthy();
    expect(v.commit).toBeTruthy();
    expect(v.date).toBeTruthy();
    expect(v.build).toBeTypeOf('number');
  });

  it('uses "date" field — not "buildDate" (regression guard)', () => {
    const v = JSON.parse(readFileSync(VERSION_PATH, 'utf8'));
    expect(v.date).toBeTruthy();
    // buildDate was a bug; this field must not exist in the schema
    expect(v.buildDate).toBeUndefined();
  });

  it('version string matches vN.N.N format', () => {
    const { version } = JSON.parse(readFileSync(VERSION_PATH, 'utf8'));
    expect(version).toMatch(/^v\d+\.\d+\.\d+/);
  });

  it('date is a valid ISO date string', () => {
    const { date } = JSON.parse(readFileSync(VERSION_PATH, 'utf8'));
    const d = new Date(date);
    expect(isNaN(d.getTime())).toBe(false);
  });
});

describe('main.js version display logic (regression)', () => {
  it('About section uses v.date not v.buildDate', () => {
    const src = readFileSync('js/main.js', 'utf8');
    // Regression guard: the About section fetch must use v.date
    expect(src).toContain('v.date');
    expect(src).not.toContain('v.buildDate');
  });

  it('loadSiteVersion is called early on DOMContentLoaded (not only inside fetchAll)', () => {
    const src = readFileSync('js/main.js', 'utf8');
    // The bootstrap block should call loadSiteVersion() before init()
    const bootstrap = src.slice(src.indexOf("document.addEventListener('DOMContentLoaded'"));
    const versionCallIdx = bootstrap.indexOf('loadSiteVersion()');
    const initCallIdx    = bootstrap.indexOf('init()');
    expect(versionCallIdx).toBeGreaterThanOrEqual(0);
    expect(versionCallIdx).toBeLessThan(initCallIdx);
  });
});
