// â”€â”€ Brand constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const BRAND = {
  name:         'GameBeeper',
  shortName:    'GS',
  tagline:      'All the games worth watching. One signal.',
  description:  'GameBeeper collects the latest video game news, reveals, reviews, platform updates, and industry stories in one fast, distraction-free feed.',
  canonicalUrl: 'https://GameBeeper.gg/',
};

// â”€â”€ Static data & constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const CORS_PROXIES = [
  url => 'https://api.codetabs.com/v1/proxy/?quest='  + encodeURIComponent(url),
  url => 'https://api.allorigins.win/raw?url='        + encodeURIComponent(url),
  url => 'https://corsproxy.io/?'                     + encodeURIComponent(url),
  url => 'https://proxy.cors.sh/'                     + url,
  url => 'https://thingproxy.freeboard.io/fetch/'     + url,
];
export const CORS_PROXY = 'https://api.codetabs.com/v1/proxy/?quest=';
export const RSS2JSON   = 'https://api.rss2json.com/v1/api.json?rss_url=';

export const MAX_PER_FEED   = 15;
export const DAY_MS         = 86_400_000;
export const CACHE_STALE_MS = 2 * 60 * 60 * 1_000;

export const REFRESH_OPTIONS = [
  { label: 'Off', value: 0  },
  { label: '1m',  value: 1  },
  { label: '5m',  value: 5  },
  { label: '10m', value: 10 },
  { label: '15m', value: 15 },
  { label: '30m', value: 30 },
  { label: '1h',  value: 60 },
];

// SVG icons â€” Lucide Icons (lucide.dev)
export const CAT_SVG = {
  'All':
    `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>`,
  'Latest':
    `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>`,
  'PlayStation':
    `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M8 12h.01"/><path d="M16 12h.01"/></svg>`,
  'Xbox':
    `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m4.93 4.93 14.14 14.14"/></svg>`,
  'Nintendo':
    `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/><path d="M9 7h6"/></svg>`,
  'PC':
    `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
  'Indie':
    `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>`,
  'Reviews':
    `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  'Trailers':
    `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  'Esports':
    `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>`,
  'Industry':
    `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  'Hardware':
    `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M20 15h2M2 9h2M20 9h2M9 2v2M9 20v2"/></svg>`,
};

export const categories = [
  { id: 'All',          label: 'All news',        color: '#26e6ff', icon: CAT_SVG['All']          },
  { id: 'Latest',       label: 'Latest',           color: '#26e6ff', icon: CAT_SVG['Latest']       },
  { id: 'PlayStation',  label: 'PlayStation',      color: '#0070D1', icon: CAT_SVG['PlayStation']  },
  { id: 'Xbox',         label: 'Xbox',             color: '#52B043', icon: CAT_SVG['Xbox']         },
  { id: 'Nintendo',     label: 'Nintendo',         color: '#E40012', icon: CAT_SVG['Nintendo']     },
  { id: 'PC',           label: 'PC Gaming',        color: '#7c5cff', icon: CAT_SVG['PC']           },
  { id: 'Indie',        label: 'Indie',            color: '#ff3abf', icon: CAT_SVG['Indie']        },
  { id: 'Reviews',      label: 'Reviews',          color: '#ffca3a', icon: CAT_SVG['Reviews']      },
  { id: 'Trailers',     label: 'Trailers & Reveals',color: '#b7ff39',icon: CAT_SVG['Trailers']     },
  { id: 'Esports',      label: 'Esports',          color: '#ff6b35', icon: CAT_SVG['Esports']      },
  { id: 'Industry',     label: 'Industry',         color: '#a3a6bd', icon: CAT_SVG['Industry']     },
  { id: 'Hardware',     label: 'Hardware',         color: '#26e6ff', icon: CAT_SVG['Hardware']     },
  { id: 'Bookmarks',    label: 'Saved',            color: '#ff3abf',
    icon: `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>` },
];

// Fast lookup: category id â†’ { icon, color }
export const catMeta = Object.fromEntries(categories.map(c => [c.id, { icon: c.icon, color: c.color }]));

export const loadingMessages = [
  'Tuning into the latest game stories\u2026',
  'Scanning official channels\u2026',
  'New stories incoming\u2026',
  'Downloading today\'s game news\u2026',
  'Locking onto the signal\u2026',
  'Loading the latest from gaming\'s finest sources\u2026',
  'Your daily briefing is loading\u2026',
  'Aggregating news from across gaming\u2026',
  'Checking in with all platforms\u2026',
];

// Runtime sponsored-content regex \u2014 used for live-fetched articles
export const SPONSORED_RE = /\b(sponsored|partner[ -]content|promoted|advertorial|advertisement|webinar|webcast|brought[ -]to[ -]you[ -]by|in[ -]partnership[ -]with|paid[ -]post|native[ -]ad|content[ -]marketing|affiliate|deals?[ -]roundup)\b/i;

