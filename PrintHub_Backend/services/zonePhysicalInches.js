// services/zonePhysicalInches.js
/**
 * Server-side copy of src/utils/layerDpiCheck.js's ZONE_PHYSICAL_INCHES
 * and src/utils/parseFlatSize.js's parseSizeInchesRaw. Kept in sync
 * manually — if either frontend file's numbers/regex change, mirror
 * the change here too, since this is what production material-usage
 * scaling reads.
 */

const ZONE_PHYSICAL_INCHES = {
  front: { width: 12, height: 16 },
  back: { width: 12, height: 16 },
  left_sleeve: { width: 3.5, height: 3.5 },
  right_sleeve: { width: 3.5, height: 3.5 },
  left_side: { width: 3, height: 3 },
  right_side: { width: 3, height: 3 },
  outside: { width: 3.5, height: 3.5 },
  inside: { width: 3.5, height: 3.5 },
  front_cover: { width: 8.5, height: 11 },
  back_cover: { width: 8.5, height: 11 },
  wrap: { width: 9.5, height: 3.5 },
  hood: { width: 8, height: 8 },
  DEFAULT: { width: 10, height: 10 },
};

function getZonePhysicalSize(zoneId) {
  return ZONE_PHYSICAL_INCHES[zoneId] || ZONE_PHYSICAL_INCHES.DEFAULT;
}

const PAPER_SIZES = {
  a3: { width: 11.69, height: 16.54 },
  a4: { width: 8.27, height: 11.69 },
  a5: { width: 5.83, height: 8.27 },
  a6: { width: 4.13, height: 5.83 },
  letter: { width: 8.5, height: 11 },
  legal: { width: 8.5, height: 14 },
};

/** Mirrors utils/parseFlatSize.js's parseSizeInchesRaw exactly. */
function parseSizeInchesRaw(sizeStr) {
  if (!sizeStr || typeof sizeStr !== "string") return null;
  const cleanStr = sizeStr.trim().toLowerCase();

  const paperMatch = cleanStr.match(/\b(a3|a4|a5|letter|legal)\b/);
  if (paperMatch) {
    const size = PAPER_SIZES[paperMatch[1]];
    return { width: size.width, height: size.height };
  }

  const match = cleanStr.match(
    /([\d.]+)\s*[x×*]\s*([\d.]+)\s*(in|inch|inches|ft|feet|foot|cm|centimeter|centimeters|mm|millimeter|millimeters|")?/
  );
  if (!match) return null;

  let w = parseFloat(match[1]);
  let h = parseFloat(match[2]);
  const unit = match[3] || "in";
  if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null;

  if (unit === "cm" || unit === "centimeter" || unit === "centimeters") {
    w = w / 2.54;
    h = h / 2.54;
  } else if (unit === "mm" || unit === "millimeter" || unit === "millimeters") {
    w = w / 25.4;
    h = h / 25.4;
  } else if (unit === "ft" || unit === "feet" || unit === "foot") {
    w = w * 12;
    h = h * 12;
  }

  return { width: Number(w.toFixed(3)), height: Number(h.toFixed(3)) };
}

/**
 * Real dimensions for a zone: prefers the customer's selected size
 * string when it parses as WxH (flat/paper products), otherwise falls
 * back to the fixed per-zone-type lookup (garment/wrap products).
 */
function getZoneRealSize(zoneId, sizeStr) {
  const parsed = parseSizeInchesRaw(sizeStr);
  if (parsed) return parsed;
  return getZonePhysicalSize(zoneId);
}

module.exports = {
  ZONE_PHYSICAL_INCHES,
  getZonePhysicalSize,
  parseSizeInchesRaw,
  getZoneRealSize,
};