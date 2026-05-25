/**
 * scripts/lib/classifier.mjs
 * Article category classification for gaming news — keyword tier and optional Ollama LLM tier.
 *
 * Category precedence (deterministic keyword pass):
 *   PlayStation → Xbox → Nintendo → PC → Indie → Reviews → Trailers → Esports → Hardware → Industry → Latest
 *
 * For official platform feeds (feedCategory !== 'Latest'), the feed's own category is trusted
 * directly — keyword and LLM passes are skipped to avoid false reclassification.
 */

import { CATEGORY_KEYWORDS, VALID_CATS, OLLAMA_MODEL } from './config.mjs';
import { ollamaClient, aiCache, saveCache }             from './ai.mjs';

// ── Tier 1: keyword rules (always works, zero LLM dependency) ──────────────

export function keywordClassify(title = '', summary = '', feedCategory = 'Latest') {
  const text = `${title} ${summary}`;
  for (const [cat, re] of Object.entries(CATEGORY_KEYWORDS)) {
    if (re.test(text)) return cat;
  }
  return feedCategory;
}

// ── Tier 2: Ollama local LLM (used in CI via GitHub Actions, optional locally) ──

export async function classifyArticle(title = '', summary = '', feedCategory = 'Latest') {
  // 1. For articles from dedicated (non-Latest) feeds, trust the feed's own category.
  //    Official PlayStation/Xbox/Nintendo feeds should stay in their platform category.
  if (feedCategory !== 'Latest') return feedCategory;

  // 2. Check committed AI cache
  const cacheKey = title.slice(0, 120);
  if (aiCache[cacheKey]) return aiCache[cacheKey];

  // 3. Keyword classifier (always available, instant, deterministic)
  const kwResult = keywordClassify(title, summary, feedCategory);

  // 4. LLM override for ambiguous cases (only if Ollama is running)
  if (ollamaClient) {
    try {
      const prompt =
        `You are a video-game news classifier. Classify the article below into EXACTLY ONE category.\n\n` +
        `Categories and what they cover:\n` +
        `- PlayStation  : PS5, PS4, PS VR2, PS Plus, State of Play, PlayStation Studios\n` +
        `- Xbox         : Xbox Series X/S, Game Pass, Xbox Game Studios, ID@Xbox, Microsoft Gaming\n` +
        `- Nintendo     : Switch, Nintendo Direct, Joy-Con, eShop, Mario, Zelda, Metroid, Pokémon\n` +
        `- PC           : Steam, Epic Games Store, GOG, Steam Deck, NVIDIA, GeForce, Radeon, DLSS, mods\n` +
        `- Indie        : independent games, indie showcases, AA games outside major publishers\n` +
        `- Reviews      : reviews, scored verdicts, hands-on impressions, review roundups\n` +
        `- Trailers     : reveal trailers, gameplay trailers, showcases, world premieres, announcements\n` +
        `- Esports      : competitive gaming, tournaments, championships, Valorant, CS2, Dota, LCS\n` +
        `- Hardware     : gaming consoles, handhelds, controllers, gaming monitors, GPUs, accessories\n` +
        `- Industry     : acquisitions, layoffs, studio closures, earnings, publishing deals, lawsuits\n` +
        `- Latest       : general gaming news that does not fit the categories above\n\n` +
        `Rules:\n` +
        `1. "Xbox Game Pass release arrives on PC" → choose Xbox (platform announcement takes priority over PC).\n` +
        `2. "Nintendo Direct reveals indie lineup" → choose Nintendo (first-party event, not generic Indie).\n` +
        `3. "PlayStation studio layoffs" → choose Industry (industry event takes priority when layoffs/acquisitions are the primary subject).\n` +
        `4. Reply with ONLY the category name — no punctuation, no explanation.\n\n` +
        `Title: ${title}\nSnippet: ${summary.slice(0, 300)}\n\nCategory:`;
      const resp   = await ollamaClient.generate({
        model: OLLAMA_MODEL, prompt, stream: false,
        options: { temperature: 0, num_predict: 10 },
      });
      const raw    = (resp.response || '').trim();
      const match  = VALID_CATS.find(c => raw.toLowerCase().startsWith(c.toLowerCase()));
      const result = match || kwResult;
      aiCache[cacheKey] = result;
      return result;
    } catch (e) {
      console.warn(`[classifier] LLM call failed for "${title.slice(0, 50)}": ${e.message}`);
    }
  }

  // 5. Fall back to keyword result
  return kwResult;
}
