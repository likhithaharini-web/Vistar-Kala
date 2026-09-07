const { MarketPrice } = require('../models');
const { Op } = require('sequelize');

const DEFAULT_HOURLY_RATE = 150; // INR per labour hour, used if not supplied

/**
 * Computes a recommended fair price using the factors described in the PRD:
 * raw material cost, number of artisans, labour hours, production time,
 * craftsmanship/complexity, authenticity/certification, current market
 * prices, market demand, packaging, transportation and other costs.
 *
 * @param {object} factors
 * @param {number} factors.rawMaterialCost
 * @param {number} [factors.numArtisans=1]
 * @param {number} [factors.labourHours=0]
 * @param {number} [factors.hourlyLabourRate]
 * @param {number} [factors.productionTimeDays]
 * @param {number} [factors.craftsmanshipComplexity=3] 1 (simple) - 5 (highly complex)
 * @param {boolean} [factors.hasAuthenticityCertification=false]
 * @param {number} [factors.packagingCost=0]
 * @param {number} [factors.transportationCost=0]
 * @param {number} [factors.otherCosts=0]
 * @param {'LOW'|'MEDIUM'|'HIGH'} [factors.marketDemand='MEDIUM']
 * @param {string} [factors.category]
 * @param {string} [factors.material]
 * @param {string} [factors.region]
 */
async function computeFairPrice(factors) {
  const {
    rawMaterialCost = 0,
    numArtisans = 1,
    labourHours = 0,
    hourlyLabourRate = DEFAULT_HOURLY_RATE,
    productionTimeDays,
    craftsmanshipComplexity = 3,
    hasAuthenticityCertification = false,
    packagingCost = 0,
    transportationCost = 0,
    otherCosts = 0,
    marketDemand = 'MEDIUM',
    category,
    material,
    region,
  } = factors;

  const labourCost = labourHours * hourlyLabourRate;
  const estimatedProductionCost =
    Number(rawMaterialCost) + labourCost + Number(packagingCost) + Number(transportationCost) + Number(otherCosts);

  const complexity = Math.min(5, Math.max(1, Number(craftsmanshipComplexity) || 3));
  const complexityMultiplier = 1 + (complexity - 1) * 0.12;

  const artisanCount = Math.max(1, Number(numArtisans) || 1);
  const artisanFactor = 1 + Math.min(artisanCount - 1, 5) * 0.03;

  const certificationBonus = hasAuthenticityCertification ? 1.08 : 1.0;

  const demandFactorMap = { LOW: 0.95, MEDIUM: 1.0, HIGH: 1.08 };
  const demandFactor = demandFactorMap[String(marketDemand).toUpperCase()] || 1.0;

  const baseMarkup = 1.35; // baseline artisan margin over production cost

  let computedPrice =
    estimatedProductionCost * complexityMultiplier * artisanFactor * certificationBonus * baseMarkup * demandFactor;

  // Pull comparable market prices (category/material/region) if we have any seeded/real data.
  const where = {};
  if (category) where.category = category;
  if (material) where.material = material;
  if (region) where.region = region;

  let marketMatches = [];
  try {
    marketMatches = await MarketPrice.findAll({ where, limit: 25, order: [['dateCollected', 'DESC']] });
  } catch (err) {
    marketMatches = [];
  }

  // If an exact category+material+region match set is thin, relax to category-only.
  if (marketMatches.length === 0 && category) {
    try {
      marketMatches = await MarketPrice.findAll({ where: { category }, limit: 25, order: [['dateCollected', 'DESC']] });
    } catch (err) {
      marketMatches = [];
    }
  }

  let marketAverage = null;
  let marketLow = null;
  let marketHigh = null;
  if (marketMatches.length > 0) {
    const prices = marketMatches.map((m) => m.comparableSellingPrice);
    marketAverage = prices.reduce((a, b) => a + b, 0) / prices.length;
    marketLow = Math.min(...prices);
    marketHigh = Math.max(...prices);
    // Blend the cost-based computation with observed market data (70/30)
    computedPrice = computedPrice * 0.7 + marketAverage * 0.3;
  }

  const recommendedPrice = Math.round(computedPrice);
  const priceRangeLow = Math.round(recommendedPrice * 0.9);
  const priceRangeHigh = Math.round(recommendedPrice * 1.1);
  const estimatedProfit = Math.round(recommendedPrice - estimatedProductionCost);

  const marketComparison = marketMatches.length
    ? `Based on ${marketMatches.length} comparable listing(s), market prices range from ~${Math.round(
        marketLow,
      )} to ~${Math.round(marketHigh)} (avg ~${Math.round(marketAverage)}).`
    : 'No comparable market data found yet; recommendation is based on cost and complexity only.';

  const explanation =
    `Estimated production cost is ${Math.round(estimatedProductionCost)} ` +
    `(materials: ${Math.round(rawMaterialCost)}, labour: ${Math.round(labourCost)} for ${labourHours}h ` +
    `across ${artisanCount} artisan(s), packaging: ${Math.round(packagingCost)}, transport: ${Math.round(
      transportationCost,
    )}, other: ${Math.round(otherCosts)}). ` +
    `A complexity multiplier of ${complexityMultiplier.toFixed(2)}x was applied for craftsmanship level ${complexity}/5` +
    (hasAuthenticityCertification ? ', plus an 8% authenticity/certification premium' : '') +
    `, with ${marketDemand.toLowerCase()} market demand and a baseline artisan margin. ` +
    marketComparison;

  return {
    recommendedPrice,
    priceRangeLow,
    priceRangeHigh,
    estimatedProductionCost: Math.round(estimatedProductionCost),
    estimatedProfit,
    marketComparison,
    explanation,
  };
}

module.exports = { computeFairPrice };
