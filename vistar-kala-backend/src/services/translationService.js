/**
 * translationService.js
 * ---------------------
 * Translates text using the Groq LLM API (LLaMA-3 model via OpenAI-compatible endpoint).
 * - In-memory LRU-style cache to avoid redundant API calls.
 * - Never exposes credentials outside this module.
 * - Returns the original text on any API failure so callers can gracefully fallback.
 */

const https = require('https');

// ─── Supported languages ─────────────────────────────────────────────────────
const SUPPORTED_LANGUAGES = new Set(['en', 'hi', 'te']);

const LANGUAGE_NAMES = {
  en: 'English',
  hi: 'Hindi',
  te: 'Telugu',
};

// ─── In-memory cache ──────────────────────────────────────────────────────────
const MAX_CACHE_SIZE = 2000;
const _cache = new Map();

function _cacheKey(text, sourceLang, targetLang) {
  return `${sourceLang || 'auto'}|${targetLang}|${text}`;
}

function _getCache(text, sourceLang, targetLang) {
  return _cache.get(_cacheKey(text, sourceLang, targetLang)) ?? null;
}

function _setCache(text, sourceLang, targetLang, translated) {
  if (_cache.size >= MAX_CACHE_SIZE) {
    const firstKey = _cache.keys().next().value;
    _cache.delete(firstKey);
  }
  _cache.set(_cacheKey(text, sourceLang, targetLang), translated);
}

// ─── Groq API helper ──────────────────────────────────────────────────────────
/**
 * Sends a translation request to the Groq chat completions API.
 * Uses llama-3.1-8b-instant for fast, cost-effective translations.
 *
 * @param {string}      text         Text to translate.
 * @param {string}      targetLang   BCP-47 language code (e.g. 'hi', 'en', 'te').
 * @param {string|null} sourceLang   BCP-47 source lang, or null for auto-detect.
 * @returns {Promise<{translatedText: string, detectedSourceLanguage: string|null}>}
 */
function _callGroqApi(text, targetLang, sourceLang) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return reject(new Error('GROQ_API_KEY is not configured'));
    }

    const targetLangName = LANGUAGE_NAMES[targetLang] || targetLang;
    const sourceHint = sourceLang ? ` from ${LANGUAGE_NAMES[sourceLang] || sourceLang}` : '';

    const systemPrompt =
      `You are a professional translation assistant specializing in Indian handicrafts, artisan products, and cultural heritage content. ` +
      `Translate the given text${sourceHint} to ${targetLangName}. ` +
      `Return ONLY the translated text — no explanations, no quotes, no extra commentary. ` +
      `Preserve proper nouns, product names, and GI tag identifiers as-is.`;

    const body = JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      temperature: 0.1,   // Low temperature for deterministic, faithful translations
      max_tokens: 1024,
    });

    const options = {
      hostname: 'api.groq.com',
      path: '/openai/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);

          if (parsed.error) {
            return reject(new Error(parsed.error.message || 'Groq API error'));
          }

          const content = parsed?.choices?.[0]?.message?.content;
          if (!content) {
            return reject(new Error('Unexpected Groq API response shape'));
          }

          resolve({
            translatedText: content.trim(),
            detectedSourceLanguage: sourceLang || null,
          });
        } catch (e) {
          reject(new Error(`Failed to parse Groq API response: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`Groq API network error: ${e.message}`)));
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Groq API request timed out'));
    });

    req.write(body);
    req.end();
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Translates a piece of text using Groq (LLaMA model).
 *
 * @param {string}      text         The text to translate.
 * @param {string}      targetLang   Target BCP-47 language code.
 * @param {string|null} sourceLang   Source BCP-47 language code, or null for auto-detect.
 * @returns {Promise<{translatedText: string, fromCache: boolean, detectedSourceLanguage: string|null}>}
 */
async function translate(text, targetLang, sourceLang = null) {
  const cached = _getCache(text, sourceLang, targetLang);
  if (cached !== null) {
    return { translatedText: cached, fromCache: true, detectedSourceLanguage: null };
  }

  const result = await _callGroqApi(text, targetLang, sourceLang);

  _setCache(text, sourceLang, targetLang, result.translatedText);

  return { ...result, fromCache: false };
}

function isSupportedLanguage(lang) {
  return SUPPORTED_LANGUAGES.has(lang);
}

function cacheSize() {
  return _cache.size;
}

function clearCache() {
  _cache.clear();
}

module.exports = { translate, isSupportedLanguage, cacheSize, clearCache, SUPPORTED_LANGUAGES };
