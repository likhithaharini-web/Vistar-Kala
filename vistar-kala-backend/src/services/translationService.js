/**
 * translationService.js
 * ---------------------
 * Wraps the Google Cloud Translation API (v2 / Basic).
 * - In-memory LRU-style cache (no Redis yet).
 * - Never exposes credentials outside this module.
 * - Returns the original text on any API failure so callers can gracefully fallback.
 */

const https = require('https');

// ─── Supported languages (must match the frontend lang-select options) ──────
const SUPPORTED_LANGUAGES = new Set(['en', 'hi', 'te']);

// ─── Simple in-memory cache ──────────────────────────────────────────────────
// Key: "<srcLang>|<tgtLang>|<text>" → translatedText string
const MAX_CACHE_SIZE = 2000; // prevent unbounded growth
const _cache = new Map();

function _cacheKey(text, sourceLang, targetLang) {
  return `${sourceLang || 'auto'}|${targetLang}|${text}`;
}

function _getCache(text, sourceLang, targetLang) {
  return _cache.get(_cacheKey(text, sourceLang, targetLang)) ?? null;
}

function _setCache(text, sourceLang, targetLang, translated) {
  if (_cache.size >= MAX_CACHE_SIZE) {
    // Evict the oldest entry (first inserted) to keep size bounded
    const firstKey = _cache.keys().next().value;
    _cache.delete(firstKey);
  }
  _cache.set(_cacheKey(text, sourceLang, targetLang), translated);
}

// ─── Google Cloud Translation REST helper ───────────────────────────────────
/**
 * Calls the Google Cloud Translation API v2 synchronously via the Node.js
 * https module so we avoid introducing a new npm dependency.
 *
 * @param {string}      text         Text to translate.
 * @param {string}      targetLang   BCP-47 language code (e.g. 'hi', 'en', 'te').
 * @param {string|null} sourceLang   BCP-47 source lang, or null for auto-detect.
 * @returns {Promise<{translatedText: string, detectedSourceLanguage: string|null}>}
 */
function _callGoogleApi(text, targetLang, sourceLang) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
      return reject(new Error('GOOGLE_TRANSLATE_API_KEY is not configured'));
    }

    const body = JSON.stringify({
      q: text,
      target: targetLang,
      ...(sourceLang ? { source: sourceLang } : {}),
      format: 'text',
    });

    const options = {
      hostname: 'translation.googleapis.com',
      path: `/language/translate/v2?key=${apiKey}`,
      method: 'POST',
      headers: {
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

          // Google returns HTTP 200 even for some errors; check for error property
          if (parsed.error) {
            return reject(new Error(parsed.error.message || 'Google Translate API error'));
          }

          const translation = parsed?.data?.translations?.[0];
          if (!translation) {
            return reject(new Error('Unexpected Google Translate API response shape'));
          }

          resolve({
            translatedText: translation.translatedText,
            detectedSourceLanguage: translation.detectedSourceLanguage || null,
          });
        } catch (e) {
          reject(new Error(`Failed to parse Google Translate response: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`Google Translate network error: ${e.message}`)));
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Google Translate request timed out'));
    });

    req.write(body);
    req.end();
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Translates a piece of text.
 *
 * @param {string}      text         The text to translate.
 * @param {string}      targetLang   Target BCP-47 language code.
 * @param {string|null} sourceLang   Source BCP-47 language code, or null for auto-detect.
 * @returns {Promise<{translatedText: string, fromCache: boolean, detectedSourceLanguage: string|null}>}
 * @throws  Will throw if the API key is missing or the API returns an error that
 *          should surface as a 4xx to the caller (e.g. unsupported language).
 */
async function translate(text, targetLang, sourceLang = null) {
  // Check cache first
  const cached = _getCache(text, sourceLang, targetLang);
  if (cached !== null) {
    return { translatedText: cached, fromCache: true, detectedSourceLanguage: null };
  }

  const result = await _callGoogleApi(text, targetLang, sourceLang);

  // Populate cache
  _setCache(text, sourceLang, targetLang, result.translatedText);

  return { ...result, fromCache: false };
}

/**
 * Returns whether a given language code is supported by the application.
 */
function isSupportedLanguage(lang) {
  return SUPPORTED_LANGUAGES.has(lang);
}

/**
 * Returns the current cache size (useful for health checks / diagnostics).
 */
function cacheSize() {
  return _cache.size;
}

/**
 * Clears the in-memory translation cache (useful for tests).
 */
function clearCache() {
  _cache.clear();
}

module.exports = { translate, isSupportedLanguage, cacheSize, clearCache, SUPPORTED_LANGUAGES };
