/**
 * Computes a 0-100 match score between a buyer Requirement and an artisan's
 * ReverseBid, using craft expertise, product compatibility, customization
 * capability, quantity capacity, delivery deadline, location, previous
 * work, rating and price - per PRD section 11 (AI Artisan Matching).
 */
function computeMatchScore({ requirement, reverseBid, artisanProfile }) {
  let score = 0;
  const breakdown = {};

  // Craft expertise / product compatibility (20 pts)
  const craftMatch =
    artisanProfile?.craftCategory &&
    requirement?.category &&
    artisanProfile.craftCategory.toLowerCase().trim() === requirement.category.toLowerCase().trim();
  breakdown.craftExpertise = craftMatch ? 20 : requirement?.category ? 8 : 12;
  score += breakdown.craftExpertise;

  // Quantity capacity (15 pts)
  const requiredQty = requirement?.quantity || 1;
  const canFulfil = reverseBid?.quantityFulfillable || 0;
  if (canFulfil >= requiredQty) {
    breakdown.quantityCapacity = 15;
  } else if (requiredQty > 0) {
    breakdown.quantityCapacity = Math.max(0, Math.round((canFulfil / requiredQty) * 15));
  } else {
    breakdown.quantityCapacity = 10;
  }
  score += breakdown.quantityCapacity;

  // Delivery deadline feasibility (15 pts)
  if (requirement?.requiredByDate && reverseBid?.completionTimeDays != null) {
    const daysUntilDeadline = Math.ceil(
      (new Date(requirement.requiredByDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (reverseBid.completionTimeDays <= daysUntilDeadline) {
      breakdown.deliveryDeadline = 15;
    } else {
      const overBy = reverseBid.completionTimeDays - daysUntilDeadline;
      breakdown.deliveryDeadline = Math.max(0, 15 - overBy * 2);
    }
  } else {
    breakdown.deliveryDeadline = 8;
  }
  score += breakdown.deliveryDeadline;

  // Customization capability (10 pts)
  if (requirement?.customization) {
    breakdown.customizationCapability = reverseBid?.customizationCapability ? 10 : 2;
  } else {
    breakdown.customizationCapability = 8;
  }
  score += breakdown.customizationCapability;

  // Location match (10 pts)
  const locationMatch =
    artisanProfile?.location &&
    requirement?.deliveryLocation &&
    requirement.deliveryLocation.toLowerCase().includes(artisanProfile.location.toLowerCase());
  breakdown.location = locationMatch ? 10 : 4;
  score += breakdown.location;

  // Previous work / samples (5 pts)
  breakdown.previousWork = reverseBid?.sampleUrl ? 5 : 0;
  score += breakdown.previousWork;

  // Rating (15 pts) - artisanProfile.rating expected 0-5
  const rating = artisanProfile?.rating || 0;
  breakdown.rating = Math.round((rating / 5) * 15);
  score += breakdown.rating;

  // Price competitiveness vs budget (10 pts)
  if (requirement?.budget && reverseBid?.bidPrice != null) {
    if (reverseBid.bidPrice <= requirement.budget) {
      breakdown.price = 10;
    } else {
      const overPct = (reverseBid.bidPrice - requirement.budget) / requirement.budget;
      breakdown.price = Math.max(0, Math.round(10 - overPct * 20));
    }
  } else {
    breakdown.price = 6;
  }
  score += breakdown.price;

  return { score: Math.min(100, Math.round(score)), breakdown };
}

module.exports = { computeMatchScore };
