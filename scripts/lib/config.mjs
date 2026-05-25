/**
 * scripts/lib/config.mjs
 * Shared constants, regex patterns, and the XML parser instance.
 */

import path           from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser }  from 'fast-xml-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Brand ─────────────────────────────────────────────────────────────────────

export const BRAND = {
  name:          'GameBeeper',
  shortName:     'GS',
  tagline:       'All the games worth watching. One signal.',
  description:   'GameBeeper collects the latest video game news, reveals, reviews, platform updates, and industry stories in one fast, distraction-free feed.',
  canonicalUrl:  'https://GameBeeper.gg/',
  supportEmail:  '',
  socialHandle:  '',
};

// ── Paths ──────────────────────────────────────────────────────────────────

/** Absolute path to the repository root. */
export const ROOT = path.resolve(__dirname, '../..');

// ── Fetch / pipeline tuning ────────────────────────────────────────────────

export const FEED_TIMEOUT_MS           = 10_000;
export const ARTICLE_TIMEOUT_MS        = 8_000;
export const ARTICLE_FETCH_CONCURRENCY = 8;
export const MAX_PER_FEED              = 15;
export const MIN_PER_CATEGORY          = 10;
export const MAX_PER_CATEGORY          = 100;
export const MIN_SUMMARY_LEN           = 40;
export const ARTICLE_TEXT_MAX_BYTES    = 512 * 1024;
export const ARTICLE_TEXT_MAX_CHARS    = 3_000;
export const IMAGE_HEAD_MAX_BYTES      = 256 * 1024;
export const USER_AGENT                = 'GameBeeper/1.0 (+https://GameBeeper.gg; feed-bot)';

// ── AI / Ollama ────────────────────────────────────────────────────────────

export const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:1b';
export const OLLAMA_HOST  = process.env.OLLAMA_HOST  || 'http://127.0.0.1:11434';
export const USE_LLM      = process.env.USE_LLM === '1';
export const CACHE_FILE   = path.resolve(__dirname, '../..', '.ai-category-cache.json');

// Gaming taxonomy categories (excludes UI-only "All" and "Bookmarks" filters)
export const VALID_CATS = [
  'Latest', 'PlayStation', 'Xbox', 'Nintendo', 'PC',
  'Indie', 'Reviews', 'Trailers', 'Esports', 'Industry', 'Hardware',
];

// ── XML parser ─────────────────────────────────────────────────────────────

export const XML_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  parseTagValue: true,
  trimValues: true,
  processEntities: false,
  htmlEntities: false,
  stopNodes: ['*.description', '*.content', '*.content:encoded', '*.summary'],
});

// ── Category metadata ──────────────────────────────────────────────────────

export const CATEGORY_FALLBACK_IMAGES = {
  'Latest':       '/assets/fallbacks/latest.svg',
  'PlayStation':  '/assets/fallbacks/playstation.svg',
  'Xbox':         '/assets/fallbacks/xbox.svg',
  'Nintendo':     '/assets/fallbacks/nintendo.svg',
  'PC':           '/assets/fallbacks/pc.svg',
  'Indie':        '/assets/fallbacks/indie.svg',
  'Reviews':      '/assets/fallbacks/reviews.svg',
  'Trailers':     '/assets/fallbacks/trailers.svg',
  'Esports':      '/assets/fallbacks/esports.svg',
  'Industry':     '/assets/fallbacks/industry.svg',
  'Hardware':     '/assets/fallbacks/hardware.svg',
};

// Deterministic keyword classification — gaming taxonomy
// Precedence (for general/Latest feeds): platform-specific → topic-specific → Latest fallback
// Platform categories come first so "PS5 review" → PlayStation, "Nintendo Direct trailer" → Nintendo.
// For articles from official platform feeds (feedCategory !== 'Latest'), trust the feed category.
export const CATEGORY_KEYWORDS = {
  'PlayStation': /\b(PlayStation|PS5|PS4|PS VR2|PSVR2|PS Plus|State of Play|PlayStation Studios|PlayStation Store)\b/i,
  'Xbox':        /\b(Xbox|Game Pass|Xbox Series|Xbox Game Studios|ID@Xbox|Microsoft Gaming|Xbox Cloud)\b/i,
  'Nintendo':    /\b(Nintendo|Switch 2?|Nintendo Direct|Joy-Con|eShop|Mario|Zelda|Metroid|Pok[eé]mon)\b/i,
  'PC':          /\b(PC gaming|Steam\b|Steam Deck|Epic Games Store|GOG\b|NVIDIA|GeForce|Radeon|DLSS|modding|mod community)\b/i,
  'Reviews':     /\b(review(?:ed|s)?|verdict|hands-on|impressions|review roundup|game of the year|GOTY|scored? \d|rating)\b/i,
  'Trailers':    /\b(trailer|gameplay reveal|world premiere|first look|release date (?:trailer|reveal)|CGI trailer|gameplay trailer|reveal trailer|story trailer|official trailer)\b/i,
  'Esports':     /\b(esports|e-sports|tournament|championship|pro league|Valorant|LCS|LEC|VCT|Dota 2?|Counter-Strike|CS2|competitive gaming|major\b.*gaming|gaming.*major\b)\b/i,
  'Hardware':    /\b(console hardware|handheld console|gaming controller|gaming headset|gaming monitor|GPU\b|gaming hardware|gaming accessory|graphics card|benchmark|frame rate|performance test)\b/i,
  'Indie':       /\b(indie game|independent developer|independent studio|Indie World|demo festival|AA game|indie dev|indie showcase)\b/i,
  'Industry':    /\b(acquisition|layoff|studio closure|publisher|earnings|union\b|lawsuit|regulatory|delay(?:ed)? production|developer layoff)\b/i,
};

// Sponsored-content patterns (regex tier — catches obvious cases without LLM)
export const SPONSORED_RE = /\b(sponsored|partner[ -]content|promoted|advertorial|advertisement|webinar|webcast|brought[ -]to[ -]you[ -]by|in[ -]partnership[ -]with|paid[ -]post|native[ -]ad|content[ -]marketing|affiliate|deals?[ -]roundup)\b/i;

// ── Image-filter constants ─────────────────────────────────────────────────

export const BAD_PATH_PATTERNS = [
  'rss', 'logo', 'logos', 'icon', 'icons', 'favicon', 'avatar', 'avatars',
  'sprite', 'sprites', 'pixel', 'tracking', 'badge', 'badges',
  'placeholder', 'spacer', '1x1', 'blank', 'beacon', 'counter',
  'feedburner', 'feedproxy', 'analytics', 'stats', 'doubleclick',
  'googlesyndication', 'adservice', 'adsystem', 'quantserve',
  'chartbeat', 'scorecardresearch', 'gravatar', 'profile', 'author',
  'apple-touch', 'android-chrome', 'mstile',
  'lcorner', 'rcorner', 'corner', 'lcorner-ss',
];
export const BAD_HOSTNAME_RE = /\b(feedburner|feedproxy|gravatar|doubleclick|googlesyndication|adservice|adsystem|quantserve|chartbeat|scorecardresearch)\b/i;
export const TINY_SIZE_RE    = /[_\-x×](?:16|32|48|64)(?:x|×|px|_|\b)/i;
export const BAD_URL_RE      = /static\.lwn\.net\/images\/l?corner/i;
export const IMG_EXT         = /\.(jpe?g|png|webp|avif)(\?|$)/i;
