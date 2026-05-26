/**
 * video-filters.js — GameBeeper Watch Signal filter bar
 *
 * Manages filter/sort state and renders filter chip bars for the Watch page.
 */

'use strict';

import { esc } from './utils.js';
import { gaEvent } from './analytics.js';

export const DEFAULT_FILTERS = {
  genre:  'all',
  topic:  'all',
  trust:  'all',
  sort:   'latest',
  search: '',
};

export const GENRE_OPTIONS = [
  { id: 'all',           label: 'All videos'  },
  { id: 'trailer',       label: 'Trailers'    },
  { id: 'gameplay',      label: 'Gameplay'    },
  { id: 'review',        label: 'Reviews'     },
  { id: 'developer-diary', label: 'Dev Diaries' },
  { id: 'showcase',      label: 'Showcases'   },
  { id: 'esports',       label: 'Esports'     },
];

export const TOPIC_OPTIONS = [
  { id: 'all',         label: 'All Platforms' },
  { id: 'PlayStation', label: 'PlayStation'   },
  { id: 'Xbox',        label: 'Xbox'          },
  { id: 'Nintendo',    label: 'Nintendo'      },
  { id: 'PC',          label: 'PC Gaming'     },
  { id: 'Indie',       label: 'Indie'         },
];

export const TRUST_OPTIONS = [
  { id: 'all',       label: 'All Sources'   },
  { id: 'official',  label: 'Official only' },
  { id: 'editorial', label: 'Editorial'     },
  { id: 'events',    label: 'Events'        },
];

export const SORT_OPTIONS = [
  { id: 'latest',         label: 'Latest'         },
  { id: 'official-first', label: 'Official first'  },
];

/** Render a filter chip group into a container element. */
function renderChips(container, options, activeId, onChange, groupLabel) {
  if (!container) return;
  container.innerHTML = options.map(opt => `
    <button class="watch-filter-chip${opt.id === activeId ? ' active' : ''}"
      data-filter-id="${esc(opt.id)}"
      aria-pressed="${opt.id === activeId}"
      aria-label="${esc(opt.label)}">
      ${esc(opt.label)}
    </button>`).join('');

  container.addEventListener('click', e => {
    const btn = e.target.closest('[data-filter-id]');
    if (!btn) return;
    const id = btn.dataset.filterId;
    if (id === activeId) return;
    container.querySelectorAll('.watch-filter-chip').forEach(b => {
      b.classList.toggle('active', b.dataset.filterId === id);
      b.setAttribute('aria-pressed', b.dataset.filterId === id ? 'true' : 'false');
    });
    onChange(id);
    gaEvent('video_filter_selected', { filter_type: groupLabel, filter_value: id });
  });
}

/**
 * VideoFilters class — manages filter state and DOM for the Watch page.
 */
export class VideoFilters {
  constructor(onChangeCallback) {
    this._state    = { ...DEFAULT_FILTERS };
    this._onChange = onChangeCallback || (() => {});
  }

  get state() { return { ...this._state }; }

  /** Mount filter bars into provided container elements. */
  mount({ genreEl, topicEl, trustEl, sortEl }) {
    this._genreEl = genreEl;
    this._topicEl = topicEl;
    this._trustEl = trustEl;
    this._sortEl  = sortEl;
    this._renderAll();
  }

  _renderAll() {
    renderChips(this._genreEl, GENRE_OPTIONS, this._state.genre,  v => this._set('genre', v),  'genre');
    renderChips(this._topicEl, TOPIC_OPTIONS, this._state.topic,  v => this._set('topic', v),  'topic');
    renderChips(this._trustEl, TRUST_OPTIONS, this._state.trust,  v => this._set('trust', v),  'trust');
    renderChips(this._sortEl,  SORT_OPTIONS,  this._state.sort,   v => this._set('sort', v),   'sort');
  }

  _set(key, value) {
    this._state[key] = value;
    this._onChange(this.state);
    // Announce filter change to screen readers
    const announcement = document.getElementById('feedStatus');
    if (announcement) announcement.textContent = `Watch filter updated: ${key} set to ${value}`;
  }

  reset() {
    this._state = { ...DEFAULT_FILTERS };
    this._renderAll();
    this._onChange(this.state);
  }

  setSearch(q) {
    this._state.search = q;
    this._onChange(this.state);
  }
}

