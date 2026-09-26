/**
 * tests/dom/cards.test.js
 * DOM component tests for js/cards.js (runs in happy-dom environment)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock storage.js to prevent localStorage reads
vi.mock('../../js/storage.js', () => ({
  isBookmarked: vi.fn(() => false),
  loadBookmarks: vi.fn(() => []),
}));

// Mock config.js with minimal catMeta
vi.mock('../../js/config.js', () => {
  const icon = '<svg width="15" height="15"></svg>';
  return {
    catMeta: {
      General:    { icon, color: '#94A3B8' },
      Security:   { icon, color: '#F43F5E' },
      JavaScript: { icon, color: '#FBBF24' },
    },
    categories: [
      { id: 'General',    label: 'General',    color: '#94A3B8', icon },
      { id: 'Security',   label: 'Security',   color: '#F43F5E', icon },
      { id: 'JavaScript', label: 'JavaScript', color: '#FBBF24', icon },
    ],
    loadingMessages: ['Loading...'],
  };
});

import { gridCard, listCard, buildSkeletons, heroMarkup, pickLeadStory, articleHref } from '../../js/cards.js';

const mockArticle = {
  title:         'Test Article Title',
  link:          'https://example.com/article',
  source:        'Test Source',
  category:      'General',
  snippet:       'A test article snippet with some content.',
  image:         'https://example.com/image.jpg',
  fallbackImage: '/assets/fallbacks/general.svg',
  summaryType:   'snippet',
  date:          new Date(Date.now() - 300_000).toISOString(), // 5 min ago
};

// -- gridCard ------------------------------------------------------------------

describe('gridCard', () => {
  let html;
  beforeEach(() => {
    html = gridCard(mockArticle, 0);
  });

  it('returns a non-empty HTML string', () => {
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });

  it('contains article.title (escaped)', () => {
    expect(html).toContain('Test Article Title');
  });

  it('contains article.link in an <a href>', () => {
    expect(html).toContain(`href="${mockArticle.link}"`);
  });

  it('contains article.source', () => {
    expect(html).toContain('Test Source');
  });

  it('data-category attribute matches article.category', () => {
    expect(html).toContain('data-category="General"');
  });

  it('<img> src is set when article has an image', () => {
    expect(html).toContain(`src="${mockArticle.image}"`);
  });

  it('bookmark button data-bm-link equals article.link', () => {
    expect(html).toContain(`data-bm-link="${mockArticle.link}"`);
  });

  it('XSS: title with <script> is escaped in output', () => {
    const xssArticle = { ...mockArticle, title: '<script>alert(1)</script>' };
    const xssHtml = gridCard(xssArticle, 1);
    expect(xssHtml).not.toContain('<script>alert(1)</script>');
    expect(xssHtml).toContain('&lt;script&gt;');
  });
});

// -- gridCard without image ----------------------------------------------------

describe('gridCard without image', () => {
  it('renders placeholder when no image', () => {
    const noImg = { ...mockArticle, image: null };
    const html = gridCard(noImg, 0);
    expect(html).toContain('card-placeholder');
  });
});

// -- listCard ------------------------------------------------------------------

describe('listCard', () => {
  let html;
  beforeEach(() => {
    html = listCard(mockArticle, 0);
  });

  it('returns a non-empty HTML string', () => {
    expect(typeof html).toBe('string');
    expect(html.length).toBeGreaterThan(0);
  });

  it('contains article.title', () => {
    expect(html).toContain('Test Article Title');
  });

  it('contains article.link in an <a href>', () => {
    expect(html).toContain(`href="${mockArticle.link}"`);
  });

  it('contains article.source', () => {
    expect(html).toContain('Test Source');
  });

  it('data-category attribute matches article.category', () => {
    expect(html).toContain('data-category="General"');
  });

  it('bookmark button data-bm-link equals article.link', () => {
    expect(html).toContain(`data-bm-link="${mockArticle.link}"`);
  });

  it('XSS: title with <script> is escaped', () => {
    const xssArticle = { ...mockArticle, title: '<script>xss</script>' };
    const xssHtml = listCard(xssArticle, 0);
    expect(xssHtml).not.toContain('<script>xss</script>');
  });
});

// -- buildSkeletons ------------------------------------------------------------

describe('buildSkeletons', () => {
  it('returns HTML containing exactly n skeleton elements', () => {
    const html = buildSkeletons(3);
    const count = (html.match(/skeleton-card/g) || []).length;
    expect(count).toBe(3);
  });

  it('result contains "skeleton" CSS class', () => {
    const html = buildSkeletons(2);
    expect(html).toContain('skeleton');
  });

  it('default n=8 produces 8 skeletons', () => {
    const html = buildSkeletons();
    const count = (html.match(/skeleton-card/g) || []).length;
    expect(count).toBe(8);
  });
});


// -- Card semantics --------------------------------------------------------------

describe('card semantics', () => {
  it('uses an h3 headline inside the feed section', () => {
    expect(gridCard(mockArticle, 0)).toMatch(/<h3 class="card-title">/);
  });

  it('opens stories in a new tab safely', () => {
    expect(gridCard(mockArticle, 0)).toContain('target="_blank" rel="noopener noreferrer"');
  });

  it('shows the AI-summary button only for AI summaries', () => {
    expect(gridCard(mockArticle, 0)).not.toContain('card-summary-btn');
    expect(gridCard({ ...mockArticle, summaryType: 'ai' }, 0)).toContain('card-summary-btn');
  });

  it('static rendering prints an absolute date and no saved state', () => {
    const html = gridCard({ ...mockArticle, date: '2026-09-26T12:00:00.000Z' }, 0, { static: true });
    expect(html).toContain('>Sep 26</time>');
    expect(html).toContain('aria-pressed="false"');
  });
});

// -- Saved videos ------------------------------------------------------------------

describe('saved video cards', () => {
  const video = {
    ...mockArticle,
    link: 'video:yt-abc',
    contentType: 'video',
    externalUrl: 'https://www.youtube.com/watch?v=abc',
  };

  it('links to the video page but keeps the bookmark key', () => {
    const html = gridCard(video, 0);
    expect(html).toContain('href="https://www.youtube.com/watch?v=abc"');
    expect(html).toContain('data-bm-link="video:yt-abc"');
    expect(html).not.toContain('href="video:');
  });

  it('articleHref falls back to the article link', () => {
    expect(articleHref(mockArticle)).toBe(mockArticle.link);
    expect(articleHref(video)).toBe(video.externalUrl);
  });
});

// -- Hero lead story -------------------------------------------------------------

describe('heroMarkup / pickLeadStory', () => {
  const noImage = { ...mockArticle, title: 'No image story', link: 'https://example.com/a', image: null };
  const withImage = { ...mockArticle, title: 'Image story', link: 'https://example.com/b' };
  const next1 = { ...mockArticle, link: 'https://example.com/c', image: 'https://example.com/c.jpg' };
  const next2 = { ...mockArticle, link: 'https://example.com/d', image: 'https://example.com/d.jpg' };

  it('picks the newest story that has an image', () => {
    expect(pickLeadStory([noImage, withImage])).toBe(withImage);
  });

  it('falls back to the newest story when none have images', () => {
    expect(pickLeadStory([noImage])).toBe(noImage);
  });

  it('returns null for an empty list', () => {
    expect(pickLeadStory([])).toBeNull();
    expect(heroMarkup([])).toBe('');
  });

  it('renders the lead with the hooks main.js wires up', () => {
    const html = heroMarkup([withImage, next1, next2]);
    expect(html).toContain('class="lead-card');
    expect(html).toContain(`data-article-url="${withImage.link}"`);
    expect(html).toContain('id="heroFeaturedBmBtn"');
    expect(html).toContain('id="heroFeaturedShareBtn"');
    expect(html).toContain('fetchpriority="high"');
  });

  it('layers the next two images behind the lead as decoration only', () => {
    const html = heroMarkup([withImage, next1, next2]);
    expect(html).toContain('class="lead-stack" aria-hidden="true"');
    expect(html).toContain('https://example.com/c.jpg');
    expect(html).toContain('https://example.com/d.jpg');
    expect((html.match(/lead-stack-layer--/g) || []).length).toBe(2);
  });

  it('escapes the headline', () => {
    const html = heroMarkup([{ ...withImage, title: '<script>x</script>' }]);
    expect(html).not.toContain('<script>x</script>');
  });
});
