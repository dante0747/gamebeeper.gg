// -- Brand constants -----------------------------------------------
export const BRAND = {
  name:         'GameBeeper',
  shortName:    'GS',
  tagline:      'All the games worth watching. One signal.',
  description:  'GameBeeper collects the latest video game news, reveals, reviews, platform updates, and industry stories in one fast, distraction-free feed.',
  canonicalUrl: 'https://GameBeeper.gg/',
};

// -- Static data & constants ------------------------------------------

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

// SVG icons – Lucide Icons (lucide.dev)
export const CAT_SVG = {
  'All':
    `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/></svg>`,
  'Latest':
    `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 0-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/></svg>`,
  'PlayStation':
    `<svg aria-hidden="true" viewBox="0 0 576 512" width="15" height="15" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M570.9 372.3c-11.3 14.2-38.8 24.3-38.8 24.3L327 470.2v-54.3l150.9-53.8c17.1-6.1 19.8-14.8 5.8-19.4-13.9-4.6-39.1-3.3-56.2 2.9L327 381.1v-56.4c23.2-7.8 47.1-13.6 75.7-16.8 40.9-4.5 90.9.6 130.2 15.5 44.2 14 49.2 34.7 38 48.9zm-224.4-92.5v-139c0-16.3-3-31.3-18.3-35.6-11.7-3.8-19 7.1-19 23.4v347.9l-93.8-29.8V32c39.9 7.4 98 24.9 129.2 35.4C424.1 94.7 451 128.7 451 205.2c0 74.5-46 102.8-104.5 74.6zM43.2 410.2c-45.4-12.8-53-39.5-32.3-54.8 19.1-14.2 51.7-24.9 51.7-24.9l134.5-47.8v54.5l-96.8 34.6c-17.1 6.1-19.7 14.8-5.8 19.4 13.9 4.6 39.1 3.3 56.2-2.9l46.4-16.9v48.8c-51.6 9.3-101.4 7.3-153.9-10z"/></svg>`,
  'Xbox':
    `<svg aria-hidden="true" viewBox="0 0 512 512" width="15" height="15" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M369.9 318.2c44.3 54.3 64.7 98.8 54.4 118.7-7.9 15.1-56.7 44.6-92.6 55.9-29.6 9.3-68.4 13.3-100.4 10.2-38.2-3.7-76.9-17.4-110.1-39C93.3 445.8 87 438.3 87 423.4c0-29.9 32.9-82.3 89.2-142.1 32-33.9 76.5-73.7 81.4-72.6 9.4 2.1 84.3 75.1 112.3 109.5zM188.6 143.8c-29.7-26.9-58.1-53.9-86.4-63.4-15.2-5.1-16.3-4.8-28.7 8.1-29.2 30.4-53.5 79.7-60.3 122.4-5.4 34.2-6.1 43.8-4.2 60.5 5.6 50.5 17.3 85.4 40.5 120.9 9.5 14.6 12.1 17.3 9.3 9.9-4.2-11-.3-37.5 9.5-64 14.3-39 53.9-112.9 120.3-194.4zm311.6 63.5C483.3 127.3 432.7 77 425.6 77c-7.3 0-24.2 6.5-36 13.9-23.3 14.5-41 31.4-64.3 52.8C367.7 197 427.5 283.1 448.2 346c6.8 20.7 9.7 41.1 7.4 52.3-1.7 8.5-1.7 8.5 1.4 4.6 6.1-7.7 19.9-31.3 25.4-43.5 7.4-16.2 15-40.2 18.6-58.7 4.3-22.5 3.9-70.8-.8-93.4zM141.3 43C189 40.5 251 77.5 255.6 78.4c.7.1 10.4-4.2 21.6-9.7 63.9-31.1 94-25.8 107.4-25.2-63.9-39.3-152.7-50-233.9-11.7-23.4 11.1-24 11.9-9.4 11.2z"/></svg>`,
  'Nintendo':
    `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="currentColor" fill-rule="evenodd" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 2H7.25A5.25 5.25 0 0 0 2 7.25v9.5A5.25 5.25 0 0 0 7.25 22h3.25V2ZM8.25 4.25v15.5h-1a3 3 0 0 1-3-3v-9.5a3 3 0 0 1 3-3h1Zm-.65 2.6a1.4 1.4 0 1 0 0 2.8 1.4 1.4 0 0 0 0-2.8ZM11.5 2v20h5.25A5.25 5.25 0 0 0 22 16.75v-9.5A5.25 5.25 0 0 0 16.75 2H11.5Zm4.75 8.25a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5Z"/></svg>`,
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
    `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`,
  'Hardware':
    `<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M15 20v2M2 15h2M20 15h2M2 9h2M20 9h2M9 2v2M9 20v2"/></svg>`,
};

export const categories = [
  { id: 'All',          label: 'All news',        color: '#26e6ff', icon: CAT_SVG['All']          },
  { id: 'Latest',       label: 'General',          color: '#26e6ff', icon: CAT_SVG['Latest']       },
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

// Fast lookup: category id -> { icon, color, label }
export const catMeta = Object.fromEntries(categories.map(c => [c.id, { icon: c.icon, color: c.color, label: c.label }]));

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

