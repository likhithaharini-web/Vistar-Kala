/**
 * translateController.js
 * ----------------------
 * Handles POST /api/translate requests.
 * - Validates input (text present, target language supported, text not too large).
 * - Calls translationService (powered by Groq LLaMA API).
 * - Returns only the translated text; NEVER exposes the API key.
 * - Falls back gracefully: if GROQ_API_KEY is not configured, returns a 503
 *   with a clear message so the frontend can show original text.
 */

const { translate, isSupportedLanguage } = require('../services/translationService');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Maximum character length we accept per request to prevent abuse
const MAX_TEXT_LENGTH = 2000;

const translateText = asyncHandler(async (req, res) => {
  const { text, targetLanguage, sourceLanguage } = req.body;

  // ── Input validation ────────────────────────────────────────────────────
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new ApiError(400, 'text is required and must be a non-empty string');
  }

  if (text.length > MAX_TEXT_LENGTH) {
    throw new ApiError(413, `text must not exceed ${MAX_TEXT_LENGTH} characters`);
  }

  if (!targetLanguage || typeof targetLanguage !== 'string') {
    throw new ApiError(400, 'targetLanguage is required');
  }

  if (!isSupportedLanguage(targetLanguage)) {
    throw new ApiError(400, `targetLanguage '${targetLanguage}' is not supported. Supported: en, hi, te`);
  }

  if (sourceLanguage && !isSupportedLanguage(sourceLanguage)) {
    throw new ApiError(400, `sourceLanguage '${sourceLanguage}' is not supported. Supported: en, hi, te`);
  }

  // If source == target, skip the API call entirely
  if (sourceLanguage && sourceLanguage === targetLanguage) {
    return res.json({ success: true, translatedText: text.trim(), fromCache: true });
  }

  // ── Check API key presence early to return a clear 503 ─────────────────
  if (!process.env.GROQ_API_KEY) {
    // Return 503 so the frontend knows translation is unavailable (not a client error)
    return res.status(503).json({
      success: false,
      message: 'Translation service is not configured. Set GROQ_API_KEY in the server .env file.',
    });
  }

  // ── Translate ───────────────────────────────────────────────────────────
  try {
    const result = await translate(
      text.trim(),
      targetLanguage,
      sourceLanguage || null,
    );

    return res.json({
      success: true,
      translatedText: result.translatedText,
      detectedSourceLanguage: result.detectedSourceLanguage,
      fromCache: result.fromCache,
    });
  } catch (err) {
    // Log server-side (no credential info in the message)
    // eslint-disable-next-line no-console
    console.error('[TranslateController] Translation failed:', err.message);

    // Distinguish client-type errors (bad language code) from server/network errors
    if (err.message && err.message.toLowerCase().includes('invalid')) {
      throw new ApiError(400, `Translation failed: ${err.message}`);
    }

    // For all other failures (network, quota, etc.) return 502 so the frontend
    // can fall back to the original text gracefully.
    return res.status(502).json({
      success: false,
      message: 'Translation service temporarily unavailable. Displaying original text.',
    });
  }
});

module.exports = { translateText };
