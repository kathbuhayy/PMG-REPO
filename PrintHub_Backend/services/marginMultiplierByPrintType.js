// services/marginMultiplierByPrintType.js
/**
 * Margin multiplier applied to raw material cost (from InventorySubstrate/
 * InventoryInk/InventoryUnit costPer* fields), keyed by product.print_type.
 * Covers waste, overhead, and profit on top of raw cost — separate from
 * setupFee (Product.setupFee), which covers fixed labor/machine time
 * regardless of design size.
 *
 * Tune these as real cost data comes in — start conservative, adjust up
 * if margins are too thin once real orders run through this.
 */
const MARGIN_MULTIPLIER_BY_PRINT_TYPE = {
  "screen-print": 3.0,
  digital: 2.0,
  offset: 2.2,
  embroidery: 3.5,
  "large-format": 2.8,
  service: 1.5,
  blank: 1.0, // plain/undecorated items: no print margin, just the blank itself
};

const DEFAULT_MARGIN_MULTIPLIER = 2.2;

function getMarginMultiplier(printType) {
  const key = String(printType || "").toLowerCase();
  return MARGIN_MULTIPLIER_BY_PRINT_TYPE[key] ?? DEFAULT_MARGIN_MULTIPLIER;
}

module.exports = {
  MARGIN_MULTIPLIER_BY_PRINT_TYPE,
  DEFAULT_MARGIN_MULTIPLIER,
  getMarginMultiplier,
};