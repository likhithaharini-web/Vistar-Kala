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

  const rawMaterialCostToUse = rawMaterialCost !== undefined ? rawMaterialCost : req.body.materialCost;
  const labourHoursToUse = labourHours !== undefined ? labourHours : req.body.hoursWorked;

  if (rawMaterialCostToUse === undefined) {
    throw new ApiError(400, 'rawMaterialCost (or materialCost) is required');
  }

  const result = await computeFairPrice({
    rawMaterialCost: rawMaterialCostToUse,
    numArtisans,
    labourHours: labourHoursToUse,
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

/**
 * POST /ai/story-gen
 * Heritage Story Generator – produces an emotionally rich, culturally grounded
 * narrative for a craft product.  No external ML call is required; the engine
 * selects from curated story arcs keyed to craft type / category, then
 * interpolates artisan & product details to create a unique, buyer-facing story.
 *
 * Body (all optional, better results with more detail):
 *   productName   string  – e.g. "Pochampally Double Ikat Silk Saree"
 *   artisanName   string  – e.g. "Rukmini Devi"
 *   craftType     string  – e.g. "Ikat", "Warli", "Dhokra", "Blue Pottery"
 *   category      string  – e.g. "Handloom Sarees", "Pottery", "Jewellery"
 *   region        string  – e.g. "Pochampally, Telangana"
 *   material      string  – e.g. "Mulberry Silk", "Terracotta"
 *   experienceYears number – artisan's years of practice
 *   description   string  – product description to weave into the narrative
 */
const generateStory = asyncHandler(async (req, res) => {
  const {
    productName,
    artisanName,
    craftType,
    category,
    region,
    material,
    experienceYears,
    description,
  } = req.body;

  if (!productName && !craftType && !category) {
    throw new ApiError(400, 'Provide at least one of: productName, craftType, or category');
  }

  // ─── Craft-specific narrative arcs ──────────────────────────────────────────
  // Each arc has: title template, culturalContext, technique, legacy
  const STORY_ARCS = {
    ikat: {
      title: (prod) => `The Mathematics of the Sacred Loom: ${prod}`,
      culturalContext:
        'Double Ikat is considered one of the world\'s most demanding textile arts — fewer than a handful of regions on earth have mastered it. '
        + 'In Pochampally and Bhoodan, Telangana, weavers have practised this craft for over 800 years, their pit-looms echoing the rhythm of generations.',
      technique:
        'Each warp and weft thread is individually hand-tied with resist before dyeing, requiring extraordinary mathematical precision. '
        + 'The motifs only reveal themselves at the moment of weaving, as thousands of pre-dyed threads align perfectly on the loom.',
      legacy:
        'A Pochampally Ikat saree holds a GI tag — it cannot be legally replicated anywhere else on earth. '
        + 'Owning one is owning a living archive of Deccan heritage.',
    },
    warli: {
      title: (prod) => `Song of the Mother Earth: ${prod}`,
      culturalContext:
        'The Warli tribe of the Sahyadri foothills in Palghar, Maharashtra, paint not with pigments but with sacred rice paste on mud walls. '
        + 'These geometric hieroglyphs predate written language — they are 2,500-year-old oral history rendered visible.',
      technique:
        'Using a bamboo stylus and rice-water paste on hand-spun canvas, the artist traces the Tarpa circle — a perpetual spiral of human figures '
        + 'embodying the cosmic cycle of birth, monsoon, and harvest.',
      legacy:
        'Every Warli canvas is a prayer. The Tarpa dancer at its centre is believed to summon rain and protect the harvest. '
        + 'UNESCO has recognised this living tradition as intangible cultural heritage.',
    },
    dhokra: {
      title: (prod) => `The 4,000-Year Metallurgy of Bastar: ${prod}`,
      culturalContext:
        'Dhokra bell-metal casting is a direct descendant of the technique used to create the Mohenjo-daro Dancing Girl, one of humanity\'s '
        + 'oldest known bronze sculptures. Bastar\'s tribal craftsmen have kept this flame alive through oral transmission alone.',
      technique:
        'Beeswax threads are hand-wound around a clay core to sculpt the form; river clay is packed over it and fired in a sal-wood pit furnace. '
        + 'When molten bell-metal flows in, the wax evaporates — the process is called "lost wax" because every mould is destroyed to release its unique piece.',
      legacy:
        'No two Dhokra sculptures are identical. The destruction of the mould is not a flaw but a philosophy: each piece carries the '
        + 'irreproducible signature of a single artisan\'s hands and a single moment in time.',
    },
    pottery: {
      title: (prod) => `The Persian Cobalt Flame: ${prod}`,
      culturalContext:
        'Jaipur Blue Pottery arrived in Rajasthan on the Silk Road, blending Persian glazing with Mughal floral motifs and local Indian earth. '
        + 'Unlike any other ceramic on earth, it contains no clay — only powdered quartz, glass, and Fuller\'s earth.',
      technique:
        'Master potters hand-paint swirling Arabesque foliage with cobalt and copper oxides onto unfired quartz forms, '
        + 'then fire them once in wood-burning kilns at precisely calibrated temperatures to achieve the unmistakable turquoise glaze.',
      legacy:
        'Each piece is fired only once — there are no second chances. The crackling glaze that emerges is unique to that firing moment, '
        + 'making every urn and tile a one-of-a-kind artefact that graced the corridors of Rajput palaces.',
    },
    jewellery: {
      title: (prod) => `Silver Threads of Rajasthan: ${prod}`,
      culturalContext:
        'The jewellers of Rajasthan have dressed queens and goddesses for centuries. Their Kundan and Meenakari techniques '
        + 'reached the subcontinent through the Mughal court and were perfected by Rajput artisans who fused Persian refinement with indigenous boldness.',
      technique:
        'Pure silver is melted, hammered into gossamer sheets, then cut and set with precision using tools passed down through family lineages. '
        + 'Enamel Meenakari work demands a jeweller to fire each colour separately — a single piece may enter the kiln five or six times.',
      legacy:
        'Traditional Rajasthani jewellery is also talisman: the lotus symbolises rebirth, the peacock summons the monsoon, '
        + 'and the fish motif blesses its wearer with abundance. Wearing this piece is joining an unbroken chain of devotion.',
    },
    default: {
      title: (prod) => `The Living Craft: ${prod}`,
      culturalContext:
        'India\'s artisan traditions stretch back millennia — each piece made by hand is an act of cultural preservation, '
        + 'a quiet resistance against industrial uniformity, and a living bridge between ancestral wisdom and the modern world.',
      technique:
        'Using skills passed down through families across generations, the artisan draws on deep muscle memory and sensory mastery '
        + 'that no machine can replicate — every irregularity is a signature, every imperfection a proof of humanity.',
      legacy:
        'When you hold this piece, you hold thousands of hours of devotion, years of practice, and centuries of collective knowledge. '
        + 'Supporting handmade heritage directly sustains the artisan families who are its living custodians.',
    },
  };

  // ─── Select best arc ─────────────────────────────────────────────────────────
  const craftKey = (craftType || category || '').toLowerCase();
  let arc = STORY_ARCS.default;
  for (const [key, value] of Object.entries(STORY_ARCS)) {
    if (craftKey.includes(key)) { arc = value; break; }
  }

  // ─── Compose story sections ──────────────────────────────────────────────────
  const name = productName || `${craftType || category || 'Handcrafted'} Piece`;
  const artisan = artisanName || 'our master artisan';
  const regionStr = region ? `the ${region} cluster` : 'a heritage craft cluster';
  const exp = experienceYears ? `${experienceYears} years of mastery` : 'decades of mastery';
  const mat = material ? `using ${material}` : '';
  const descParagraph = description
    ? `\n\nThe artisan describes this piece: "${description.trim()}"`
    : '';

  const heading = arc.title(name);

  const body = [
    `**Origin & Culture**\n${arc.culturalContext}`,
    `**The Making**\n${arc.technique}${mat ? ` This particular piece was crafted ${mat}.` : ''}`,
    `**Meet the Artisan**\nCreated by ${artisan} from ${regionStr}, who brings ${exp} to every piece they make.${descParagraph}`,
    `**Heritage & Legacy**\n${arc.legacy}`,
  ].join('\n\n');

  const shortStory =
    `${arc.culturalContext.split('.')[0]}. Crafted by ${artisan} from ${regionStr} with ${exp}.`;

  // ─── Translated stub (Hindi) ─────────────────────────────────────────────────
  // A real implementation would call the translation service here;
  // we provide a placeholder that is clearly marked editable.
  const hindiStory =
    `${name} — एक अद्वितीय हस्तशिल्प रचना, ${artisan} द्वारा निर्मित। (अनुवाद संपादन योग्य)`;

  res.json({
    success: true,
    story: {
      heading,
      body,
      shortStory,
      hindiStory,
      craftType: craftType || null,
      region: region || null,
      artisanName: artisanName || null,
      generatedAt: new Date().toISOString(),
    },
  });
});

module.exports = { enhanceImage, transcribe, generateCatalogue, fairPrice, generateStory };
