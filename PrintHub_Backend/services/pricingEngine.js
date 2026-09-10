// services/pricingEngine.js
/**
 * Live design-based pricing. Given a product, its customer-selected
 * customizations, and quantity, returns a full price breakdown:
 *   finalUnitPrice = (setupFee + materialCost * marginMultiplier) * quantityDiscountFactor
 *   grandTotal     = finalUnitPrice * quantity
 *
 * Reuses the exact same material-usage and design-area-scale logic that
 * decrementMaterialsForOrder uses in production.js, so the price the
 * customer sees always matches what production will actually consume —
 * no separate, drifting calculation.
 */
const {
  resolveMaterialUsage,
  computeDesignAreaScale,
  computeSizeAreaScale,
} = require("./production");
const { getMarginMultiplier } = require("./marginMultiplierByPrintType");

const DEFAULT_SETUP_FEE = 0; // used only if product.setupFee is not yet set

/**
 * Parses one "label|price" quantity_options entry into { qty, price }.
 * Tolerant of "Free", missing price, and non-numeric labels — returns
 * null for anything that can't be parsed into a usable tier.
 */
function parseQuantityOptionEntry(entry) {
  const str = String(entry || "");
  const [rawLabel, rawPrice] = str.split("|");
  const qtyMatch = (rawLabel || "").match(/(\d+)/);
  if (!qtyMatch) return null;
  const qty = parseInt(qtyMatch[1], 10);

  const priceMatch = (rawPrice || "").replace(/[^\d.]/g, "");
  const price = priceMatch ? parseFloat(priceMatch) : null;
  if (!qty || price == null || isNaN(price) || price <= 0) return null;

  return { qty, price };
}

/**
 * Derives a discount factor (0-1] for the given quantity, based on the
 * ratio between this quantity's tier price and the smallest tier's price
 * in product.quantity_options. Returns 1 (no discount) if there's no
 * usable ladder or the quantity doesn't match a known tier closely enough.
 *
 * This works regardless of whether quantity_options prices are meant as
 * per-unit or per-order-total figures, since only the RATIO between tiers
 * is used, not the absolute numbers.
 */
function getQuantityDiscountFactor(product, quantity) {
  const options = (product.quantity_options || [])
    .map(parseQuantityOptionEntry)
    .filter(Boolean)
    .sort((a, b) => a.qty - b.qty);

  if (options.length === 0) return 1;

  const baseTier = options[0];
  // Find the tier matching this quantity exactly, or the closest tier at
  // or below it (bulk pricing only ever applies at or above a threshold).
  let matchedTier = baseTier;
  for (const tier of options) {
    if (tier.qty <= quantity) matchedTier = tier;
  }

  const basePerUnit = baseTier.price / baseTier.qty;
  const matchedPerUnit = matchedTier.price / matchedTier.qty;
  if (basePerUnit <= 0) return 1;

  const factor = matchedPerUnit / basePerUnit;
  // Clamp defensively — a factor above 1 or at/near 0 indicates malformed
  // data in quantity_options rather than a real discount.
  return Math.max(0.1, Math.min(factor, 1));
}

/**
 * Computes the full price breakdown for one line item, without touching
 * the database (no decrement, no order lookup) — safe to call repeatedly
 * from a live-pricing endpoint as the customer edits their design.
 *
 * @param {object} product - full Product row, including quantity_options,
 *   setupFee, print_type, print_zones, substrateMaterialName, etc.
 * @param {object} customizations - the same shape stored on OrderItem/
 *   CartItem.customizations: { design, size, material, quantity, ... }
 * @param {object} materialCosts - { [materialName]: costPerUnit } lookup,
 *   pre-fetched from InventorySubstrate/InventoryInk/InventoryUnit so this
 *   function never queries the DB itself.
 * @param {number} quantity - numeric quantity being priced.
 */
function computeItemPrice(product, customizations, materialCosts, quantity) {
  const qty = Math.max(1, Number(quantity) || 1);

  const usageEntries = resolveMaterialUsage(product, { customizations });
  const designScale = computeDesignAreaScale({ customizations }, product);
  // Independent of designScale (a 0-1 coverage FRACTION that already
  // cancels out absolute size) - this is how much bigger the customer's
  // chosen size is than the product's smallest size option, so a 4x8ft
  // banner correctly costs more material than a 1x2ft one even before
  // any design is attached. Stays 1 for non-dimensional sizes (garment
  // "M"/"XL" labels don't parse as WxH).
  const sizeScale = computeSizeAreaScale(product, customizations?.size);

  let rawMaterialCost = 0;
  const materialBreakdown = [];

  for (const entry of usageEntries) {
    const unitCost = materialCosts[entry.name] ?? null;
    const amount =
      entry.type === "unit"
        ? entry.usagePerUnit // units don't scale by design or size area
        : entry.usagePerUnit * designScale * sizeScale;

    const lineCost = unitCost != null ? amount * unitCost : 0;
    rawMaterialCost += lineCost;

    materialBreakdown.push({
      type: entry.type,
      name: entry.name,
      amount: Number(amount.toFixed(4)),
      unitCost,
      lineCost: unitCost != null ? Number(lineCost.toFixed(2)) : null,
    });
  }

  const marginMultiplier = getMarginMultiplier(product.print_type);
  const setupFee =
    product.setupFee != null ? Number(product.setupFee) : DEFAULT_SETUP_FEE;
  const markedUpMaterialCost = rawMaterialCost * marginMultiplier;

  const preDiscountUnitPrice = setupFee + markedUpMaterialCost;

  const quantityDiscountFactor = getQuantityDiscountFactor(product, qty);
  const finalUnitPrice = preDiscountUnitPrice * quantityDiscountFactor;

  const grandTotal = finalUnitPrice * qty;

  return {
    setupFee: Number(setupFee.toFixed(2)),
    marginMultiplier,
    rawMaterialCost: Number(rawMaterialCost.toFixed(2)),
    markedUpMaterialCost: Number(markedUpMaterialCost.toFixed(2)),
    quantityDiscountFactor: Number(quantityDiscountFactor.toFixed(4)),
    unitPrice: Number(finalUnitPrice.toFixed(2)),
    quantity: qty,
    grandTotal: Number(grandTotal.toFixed(2)),
    materialBreakdown,
    designScale: Number(designScale.toFixed(4)),
    sizeScale: Number(sizeScale.toFixed(4)),
  };
}

module.exports = {
  computeItemPrice,
  getQuantityDiscountFactor,
  parseQuantityOptionEntry,
};