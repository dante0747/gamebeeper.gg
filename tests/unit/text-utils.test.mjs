/**
 * tests/unit/text-utils.test.mjs
 * DOM-free helpers in js/utils.js that run both in the browser and at build time.
 */

import { describe, it, expect } from 'vitest';
import { cleanText, publisherHost, absDate, catClass } from '../../js/utils.js';

describe('cleanText', () => {
  it('decodes numeric entities (decimal and hex)', () => {
    expect(cleanText('Kirby Air Riders&#8217; forgotten feature')).toBe('Kirby Air Riders’ forgotten feature');
    expect(cleanText('it&#x27;s')).toBe("it's");
  });
  it('decodes common named entities', () => {
    expect(cleanText('Tom &amp; Jerry &hellip; &ldquo;hi&rdquo;')).toBe('Tom & Jerry … “hi”');
  });
  it('strips tags and collapses whitespace', () => {
    expect(cleanText('<p>Hello   <b>world</b></p>\n')).toBe('Hello world');
  });
  it('removes markup that would execute if parsed as HTML', () => {
    expect(cleanText('<img src=x onerror=alert(1)>Title')).toBe('Title');
  });
  it('leaves unknown entities untouched', () => {
    expect(cleanText('a &madeup; b')).toBe('a &madeup; b');
  });
  it('handles empty values', () => {
    expect(cleanText('')).toBe('');
    expect(cleanText(null)).toBe('');
  });
});

describe('publisherHost', () => {
  it('drops www. and lowercases', () => {
    expect(publisherHost('https://WWW.IGN.com/reviews')).toBe('ign.com');
  });
  it('treats sub-feeds of one publisher as the same source', () => {
    expect(publisherHost('https://www.pushsquare.com/')).toBe(publisherHost('https://www.pushsquare.com/reviews'));
  });
  it('returns empty string for invalid URLs', () => {
    expect(publisherHost('not a url')).toBe('');
  });
});

describe('absDate', () => {
  it('formats an ISO date as a short, timezone-stable label', () => {
    expect(absDate('2026-09-26T23:30:00.000Z')).toBe('Sep 26');
  });
  it('returns empty string for missing or invalid dates', () => {
    expect(absDate('')).toBe('');
    expect(absDate('nope')).toBe('');
  });
});

describe('catClass', () => {
  it('falls back to "general" when the category is missing', () => {
    expect(catClass(undefined)).toBe('cat-general');
  });
});
