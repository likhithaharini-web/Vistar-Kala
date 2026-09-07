const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { PriceAnalysis, ProductImage } = require('../models');
const { computeFairPrice } = require('../utils/fairPriceEngine');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const uploadDir = path.resolve(process.cwd(), 'uploads');

/**
 * POST /ai/enhance-image
 * Accepts an uploaded image, validates it, "sends" it to the AI image
 * service, stores the original + a mock enhanced copy, and returns URLs.
 *
 * NOTE: This is a prototype mock. Real background removal / lighting
 * correction / e-commerce formatting would call an external AI provider;
 * here we simulate the pipeline by duplicating the file and recording
 * which functions were "applied", so the rest of the system (product
 * records, image storage, URLs returned to the frontend) behaves exactly
 * as it would with a real provider wired in.
 */
const enhanceImage = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'An image file is required (multipart field name: image)');

  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    fs.unlinkSync(req.file.path);
    throw new ApiError(400, `Unsupported image type. Allowed: ${allowed.join(', ')}`);
  }

  const originalUrl = `/uploads/${req.file.filename}`;

  // Mock "AI enhancement" pass: copy the file to represent the processed output.
  const enhancedFilename = `${uuidv4()}${ext}`;
  fs.copyFileSync(req.file.path, path.join(uploadDir, enhancedFilename));
  const enhancedUrl = `/uploads/${enhancedFilename}`;

  const appliedFunctions = ['background_removal', 'lighting_correction', 'image_enhancement', 'ecommerce_formatting'];

  let images = null;
  if (req.body.productId) {
    images = await Promise.all([
      ProductImage.create({ productId: req.body.productId, url: originalUrl, type: 'ORIGINAL' }),
      ProductImage.create({ productId: req.body.productId, url: enhancedUrl, type: 'ENHANCED' }),
    ]);
  }

  res.json({
    success: true,
    originalImageUrl: originalUrl,
    enhancedImageUrl: enhancedUrl,
    appliedFunctions,
    images,
  });
});

/**
 * POST /ai/transcribe
 * Mock speech-to-text + language detection + translation step of the
 * Auto-Cataloguing flow (voice -> text -> detected language -> English).
 */
const transcribe = asyncHandler(async (req, res) => {
  const { language } = req.body;
  if (!req.file && !req.body.mockText) {
    throw new ApiError(400, 'An audio file (field: audio) or mockText is required');
  }

  // In a real system this would call a speech-to-text provider (e.g. Whisper).
  // For the prototype we return a plausible mocked transcript so downstream
  // cataloguing logic has something to work with end-to-end.
  const detectedLanguage = language || 'hi';
  const transcript =
    req.body.mockText ||
    'यह एक हस्तनिर्मित उत्पाद है जो पारंपरिक तकनीक से बनाया गया है।';
  const translatedText =
    req.body.mockTranslatedText ||
    'This is a handmade product created using a traditional technique, made with natural materials.';

  res.json({
    success: true,
    detectedLanguage,
    transcript,
    translatedText,
  });
});

/**
 * POST /ai/catalogue
 * Input: voice recording / transcript, product image, artisan info, language.
 * Flow (mocked end-to-end): Voice -> Speech-to-Text -> Language Detection ->
 * Translation -> AI Product Understanding -> Catalogue Generation.
 * Output fields are all editable by the artisan afterward.
 */
const generateCatalogue = asyncHandler(async (req, res) => {
  const {
    transcript,
    translatedText,
    artisanInfo = {},
    language = 'hi',
    imageUrl,
  } = req.body;

  if (!transcript && !translatedText) {
    throw new ApiError(400, 'transcript or translatedText is required (run /ai/transcribe first if needed)');
  }

  const baseText = translatedText || transcript;
  const craft = artisanInfo.craftCategory || 'Handicraft';
  const material = artisanInfo.material || 'Natural materials';

  // Mocked "AI product understanding" - a real implementation would call an
  // LLM/vision model. We derive plausible, editable catalogue fields.
  const productName = artisanInfo.suggestedName || `Handcrafted ${craft} Piece`;
  const category = artisanInfo.category || craft;
  const shortDescription = baseText.length > 120 ? `${baseText.slice(0, 117)}...` : baseText;
  const detailedDescription = `${baseText} Crafted using ${material.toLowerCase()} by a skilled artisan, this piece reflects authentic regional craftsmanship.`;
  const features = [
    'Handmade',
    `Material: ${material}`,
    `Craft: ${craft}`,
    'One-of-a-kind, natural variations may occur',
  ];
  const keywords = [craft, material, 'handmade', 'artisan', 'authentic'].map((k) => k.toLowerCase());

  const englishDescription = detailedDescription;
  const hindiDescription =
    'यह उत्पाद कुशल कारीगर द्वारा हस्तनिर्मित है और यह पारंपरिक शिल्प कौशल को दर्शाता है। (संपादन योग्य)';

  res.json({
    success: true,
    editable: true,
    catalogue: {
      productName,
      category,
      material,
      craftType: craft,
      shortDescription,
      detailedDescription,
      features,
      keywords,
      englishDescription,
      hindiDescription,
      sourceImageUrl: imageUrl || null,
      sourceLanguage: language,
    },
  });
});

/**
 * POST /ai/fair-price
 * Dynamic Fair Price Engine (PRD section 6). Computes a recommended price
 * from cost/complexity/market factors and optionally persists the analysis
 * against a product.
 */
const fairPrice = asyncHandler(async (req, res) => {
  const {
    productId,
    rawMaterialCost,
    numArtisans,
    labourHours,
    hourlyLabourRate,
    productionTimeDays,
    craftsmanshipComplexity,
    hasAuthenticityCertification,
    packagingCost,
    transportationCost,
    otherCosts,
    marketDemand,
    category,
    material,
    region,
  } = req.body;

  if (rawMaterialCost === undefined) {
    throw new ApiError(400, 'rawMaterialCost is required');
  }

  const result = await computeFairPrice({
    rawMaterialCost,
    numArtisans,
    labourHours,
    hourlyLabourRate,
    productionTimeDays,
    craftsmanshipComplexity,
    hasAuthenticityCertification,
    packagingCost,
    transportationCost,
    otherCosts,
    marketDemand,
    category,
    material,
    region,
  });

  const analysis = await PriceAnalysis.create({
    productId: productId || null,
    inputFactors: JSON.stringify(req.body),
    estimatedProductionCost: result.estimatedProductionCost,
    recommendedPrice: result.recommendedPrice,
    priceRangeLow: result.priceRangeLow,
    priceRangeHigh: result.priceRangeHigh,
    estimatedProfit: result.estimatedProfit,
    marketComparison: result.marketComparison,
    explanation: result.explanation,
  });

  res.json({ success: true, analysisId: analysis.id, ...result });
});

module.exports = { enhanceImage, transcribe, generateCatalogue, fairPrice };
