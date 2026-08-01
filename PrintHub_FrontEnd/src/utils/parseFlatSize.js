// Size mapping for standard paper sizes (in inches)
const PAPER_SIZES = {
  a3: { width: 11.69, height: 16.54 },
  a4: { width: 8.27, height: 11.69 },
  a5: { width: 5.83, height: 8.27 },
  a6: { width: 4.13, height: 5.83 },
  letter: { width: 8.5, height: 11 },
  legal: { width: 8.5, height: 14 },
};

/**
 * Parses a size option string (e.g. "3.5x2", "A4", "24x36 in", "50x100cm")
 * and converts it to normalized width and height dimensions in 3D units.
 * Returns { width, height } or null if it cannot be parsed.
 */
export function parseFlatSize(sizeStr) {
  if (!sizeStr || typeof sizeStr !== "string") {
    return null;
  }

  const cleanStr = sizeStr.trim().toLowerCase();

  // 1. Check standard paper sizes using word boundaries (e.g., "A4 size" or "Folded A4")
  const paperRegex = /\b(a3|a4|a5|letter|legal)\b/;
  const paperMatch = cleanStr.match(paperRegex);

  if (paperMatch) {
    const paperName = paperMatch[1];
    const size = PAPER_SIZES[paperName];
    return {
      width: Number((size.width / 2).toFixed(3)),
      height: Number((size.height / 2).toFixed(3)),
    };
  }

  // 2. Regular expression for WxH formats anywhere in the string: e.g. "folded 3.5x2"
  // Handles decimal numbers, spaces, and optional units
  const regex = /([\d.]+)\s*[x×*]\s*([\d.]+)\s*(in|inch|inches|cm|centimeter|centimeters|mm|millimeter|millimeters|")?/;
  const match = cleanStr.match(regex);

  if (match) {
    let w = parseFloat(match[1]);
    let h = parseFloat(match[2]);
    const unit = match[3] || "in";

    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
      return null;
    }

    // Convert to inches
    if (unit === "cm" || unit === "centimeter" || unit === "centimeters") {
      w = w / 2.54;
      h = h / 2.54;
    } else if (unit === "mm" || unit === "millimeter" || unit === "millimeters") {
      w = w / 25.4;
      h = h / 25.4;
    }

    // Apply scaling factor of 2
    let finalW = w / 2;
    let finalH = h / 2;

    // Cap the maximum dimension to 6.0 in 3D units
    const maxDim = 6.0;
    if (finalW > maxDim || finalH > maxDim) {
      const ratio = finalW > finalH ? maxDim / finalW : maxDim / finalH;
      finalW *= ratio;
      finalH *= ratio;
    }

    return {
      width: Number(finalW.toFixed(3)),
      height: Number(finalH.toFixed(3)),
    };
  }

  return null;
}
