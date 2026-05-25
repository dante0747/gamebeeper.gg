/**
 * tests/unit/classifier.test.mjs
 * Unit tests for scripts/lib/classifier.mjs
 */

import { describe, it, expect, vi } from 'vitest';

// Mock ai.mjs to prevent Ollama LLM calls
vi.mock('../../scripts/lib/ai.mjs', () => ({
  ollamaClient: null,
  aiCache: {},
  saveCache: vi.fn(),
}));

import { keywordClassify, classifyArticle } from '../../scripts/lib/classifier.mjs';

// ── keywordClassify ───────────────────────────────────────────────────────────

describe('keywordClassify', () => {
  it('classifies PlayStation article', () => {
    expect(keywordClassify('PS5 Pro review — is it worth upgrading?', '')).toBe('PlayStation');
  });

  it('classifies Xbox article', () => {
    expect(keywordClassify('Xbox Game Pass adds 10 new titles this month', '')).toBe('Xbox');
  });

  it('classifies Nintendo article', () => {
    expect(keywordClassify('Nintendo Direct reveals new Zelda for Switch 2', '')).toBe('Nintendo');
  });

  it('classifies PC gaming article', () => {
    expect(keywordClassify('Steam summer sale dates and discounts announced', '')).toBe('PC');
  });

  it('classifies Reviews article', () => {
    expect(keywordClassify('Elden Ring DLC review: a stunning expansion', '')).toBe('Reviews');
  });

  it('classifies Trailers article', () => {
    expect(keywordClassify('World premiere trailer drops for Fable reboot', '')).toBe('Trailers');
  });

  it('classifies Esports article', () => {
    expect(keywordClassify('Valorant Champions tournament bracket announced', '')).toBe('Esports');
  });

  it('classifies Industry article', () => {
    expect(keywordClassify('Major studio acquisition shakes up publishing landscape', '')).toBe('Industry');
  });

  it('falls back to feedCategory for non-matching text', () => {
    expect(keywordClassify('Some non-matching text about stuff', '', 'Nintendo')).toBe('Nintendo');
  });

  it('defaults to Latest for non-matching text without feedCategory', () => {
    expect(keywordClassify('Random unrelated text', '')).toBe('Latest');
  });
});

// ── classifyArticle ───────────────────────────────────────────────────────────

describe('classifyArticle (no Ollama)', () => {
  it('short-circuits immediately for non-Latest feed category', async () => {
    const result = await classifyArticle('PlayStation exclusive announced', '', 'PlayStation');
    expect(result).toBe('PlayStation');
  });

  it('short-circuits for Nintendo feed category', async () => {
    const result = await classifyArticle('Some article title', '', 'Nintendo');
    expect(result).toBe('Nintendo');
  });

  it('falls back to keywordClassify when feedCategory is Latest', async () => {
    const result = await classifyArticle('Xbox Series X bundle deal revealed', '', 'Latest');
    expect(result).toBe('Xbox');
  });

  it('returns Latest for unclassifiable Latest-feed articles', async () => {
    const result = await classifyArticle('Random thoughts on productivity', '', 'Latest');
    expect(result).toBe('Latest');
  });
});
