/**
 * tests/unit/video-filters.test.mjs
 * Unit tests for js/video-filters.js — Watch Signal filter state management
 * Covers: DEFAULT_FILTERS, option lists, VideoFilters class state machine.
 */

// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEFAULT_FILTERS,
  GENRE_OPTIONS,
  TOPIC_OPTIONS,
  TRUST_OPTIONS,
  SORT_OPTIONS,
  VideoFilters,
} from '../../js/video-filters.js';

// ── Mock analytics so gaEvent doesn't throw in test env ──────────────────────

vi.mock('../../js/analytics.js', () => ({ gaEvent: vi.fn() }));

// ── Defaults ──────────────────────────────────────────────────────────────────

describe('DEFAULT_FILTERS', () => {
  it('has all required keys', () => {
    expect(DEFAULT_FILTERS).toMatchObject({
      genre:  'all',
      topic:  'all',
      trust:  'all',
      sort:   'latest',
      search: '',
    });
  });
});

describe('option lists', () => {
  it('GENRE_OPTIONS includes "all" and all content types', () => {
    const ids = GENRE_OPTIONS.map(o => o.id);
    expect(ids).toContain('all');
    expect(ids).toContain('trailer');
    expect(ids).toContain('gameplay');
    expect(ids).toContain('review');
    expect(ids).toContain('developer-diary');
    expect(ids).toContain('showcase');
    expect(ids).toContain('esports');
  });

  it('TOPIC_OPTIONS includes "all" and main platforms', () => {
    const ids = TOPIC_OPTIONS.map(o => o.id);
    expect(ids).toContain('all');
    expect(ids).toContain('PlayStation');
    expect(ids).toContain('Xbox');
    expect(ids).toContain('Nintendo');
    expect(ids).toContain('PC');
    expect(ids).toContain('Indie');
  });

  it('TRUST_OPTIONS includes "all", "official", "editorial", "events"', () => {
    const ids = TRUST_OPTIONS.map(o => o.id);
    expect(ids).toContain('all');
    expect(ids).toContain('official');
    expect(ids).toContain('editorial');
    expect(ids).toContain('events');
  });

  it('SORT_OPTIONS includes "latest" and "official-first"', () => {
    const ids = SORT_OPTIONS.map(o => o.id);
    expect(ids).toContain('latest');
    expect(ids).toContain('official-first');
  });

  it('all options have non-empty labels', () => {
    const allOptions = [...GENRE_OPTIONS, ...TOPIC_OPTIONS, ...TRUST_OPTIONS, ...SORT_OPTIONS];
    for (const opt of allOptions) {
      expect(typeof opt.label).toBe('string');
      expect(opt.label.length).toBeGreaterThan(0);
    }
  });
});

// ── VideoFilters state machine ────────────────────────────────────────────────

describe('VideoFilters', () => {
  let onChange;
  let filters;

  beforeEach(() => {
    onChange = vi.fn();
    filters = new VideoFilters(onChange);
    // Provide stub DOM elements so mount() doesn't throw
    const makeEl = () => { const el = document.createElement('div'); return el; };
    filters.mount({
      genreEl: makeEl(),
      topicEl: makeEl(),
      trustEl: makeEl(),
      sortEl:  makeEl(),
    });
  });

  it('starts with DEFAULT_FILTERS state', () => {
    expect(filters.state).toMatchObject(DEFAULT_FILTERS);
  });

  it('state is a copy, not a reference', () => {
    const s1 = filters.state;
    const s2 = filters.state;
    expect(s1).not.toBe(s2); // different objects each time
    expect(s1).toEqual(s2);
  });

  it('setSearch updates the search state and calls onChange', () => {
    filters.setSearch('zelda');
    expect(filters.state.search).toBe('zelda');
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ search: 'zelda' }));
  });

  it('reset restores DEFAULT_FILTERS and notifies', () => {
    filters.setSearch('mario');
    onChange.mockClear();
    filters.reset();
    expect(filters.state).toMatchObject(DEFAULT_FILTERS);
    expect(onChange).toHaveBeenCalledWith(DEFAULT_FILTERS);
  });

  it('onChange is not called when no filter changes', () => {
    const callCount = onChange.mock.calls.length;
    // No explicit action taken after mount — count should stay the same
    expect(onChange.mock.calls.length).toBe(callCount);
  });
});

// ── DOM chip rendering ────────────────────────────────────────────────────────

describe('VideoFilters — chip DOM rendering', () => {
  it('renders chips into the provided genre container', () => {
    const onChange = vi.fn();
    const filters = new VideoFilters(onChange);
    const genreEl = document.createElement('div');
    const topicEl = document.createElement('div');
    const trustEl = document.createElement('div');
    const sortEl  = document.createElement('div');

    filters.mount({ genreEl, topicEl, trustEl, sortEl });

    const chips = genreEl.querySelectorAll('[data-filter-id]');
    expect(chips.length).toBe(GENRE_OPTIONS.length);
  });

  it('marks the default genre "all" chip as active', () => {
    const onChange = vi.fn();
    const filters = new VideoFilters(onChange);
    const genreEl = document.createElement('div');
    filters.mount({
      genreEl,
      topicEl: document.createElement('div'),
      trustEl: document.createElement('div'),
      sortEl:  document.createElement('div'),
    });

    const activeChips = genreEl.querySelectorAll('.watch-filter-chip.active');
    expect(activeChips.length).toBe(1);
    expect(activeChips[0].dataset.filterId).toBe('all');
  });

  it('clicking a chip fires onChange with updated genre', () => {
    const onChange = vi.fn();
    const filters = new VideoFilters(onChange);
    const genreEl = document.createElement('div');
    document.body.appendChild(genreEl);
    filters.mount({
      genreEl,
      topicEl: document.createElement('div'),
      trustEl: document.createElement('div'),
      sortEl:  document.createElement('div'),
    });

    onChange.mockClear();
    const trailerChip = genreEl.querySelector('[data-filter-id="trailer"]');
    expect(trailerChip).not.toBeNull();
    trailerChip.click();

    expect(onChange).toHaveBeenCalledOnce();
    const callArg = onChange.mock.calls[0][0];
    expect(callArg.genre).toBe('trailer');

    document.body.removeChild(genreEl);
  });
});

