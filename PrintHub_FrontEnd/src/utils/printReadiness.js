// src/utils/printReadiness.js  (new file)
/**
 * printReadiness
 * Computes a real 0-100 "Print Readiness Score" from actual design data -
 * no fake numbers. Three sub-scores:
 *
 *   resolution   - reuses the same DPI badge logic already shown per-layer
 *                  in the Layers panel, averaged across every image layer
 *                  in every zone (not just the active one).
 *   safeArea     - checks whether each layer's bounding box actually stays
 *                  inside the product's safe-margin inset (the same guide
 *                  drawn in the flat editor), penalizing by how far outside
 *                  a layer sits.
 *   colorContrast - samples the REAL flattened design's average pixel
 *                  luminance (via canvas getImageData, not a guess) and
 *                  compares it against the shirt color's luminance using
 *                  the standard WCAG-style contrast ratio formula.
 *
 * Overall score is an equal-weighted average of the three. This is a
 * reasonable, defensible simplification - not a claim that these three
 * factors are scientifically the "correct" weighting for print quality.
 */

function hexToRgb(hex) {
  const clean = (hex || "#ffffff").replace("#", "");
  return {
    r: parseInt(clean.substring(0, 2), 16) || 255,
    g: parseInt(clean.substring(2, 4), 16) || 255,
    b: parseInt(clean.substring(4, 6), 16) || 255,
  };
}

function relativeLuminance({ r, g, b }) {
  const srgb = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastRatio(lum1, lum2) {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * @param {object} dpiByZoneAndLayer - { [zoneId]: { [layerId]: {status,dpi} } }
 * @returns {{score:number, label:string}}
 */
export function computeResolutionScore(dpiByZoneAndLayer) {
  const all = Object.values(dpiByZoneAndLayer || {}).flatMap((byLayer) => Object.values(byLayer || {}));
  const relevant = all.filter((q) => q && q.status !== "unknown" && q.status !== "n/a");
  if (relevant.length === 0) return { score: 100, label: "No images to check" };

  const scores = relevant.map((q) => {
    if (q.status === "ready") return 100;
    const ratio = Math.max(0, Math.min(1, (q.dpi || 0) / 300));
    return Math.round(20 + ratio * 60);
  });

  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  return { score: avg, label: `${relevant.length} image${relevant.length === 1 ? "" : "s"} checked` };
}

/**
 * @param {object} zoneLayers - { [zoneId]: Layer[] }
 * @param {{width:number,height:number}|null} printSizeInches
 * @param {number|null|undefined} safeMarginInches
 */
export function computeSafeAreaScore(zoneLayers, printSizeInches, safeMarginInches) {
  if (!printSizeInches?.width || !printSizeInches?.height || !safeMarginInches) {
    return { score: 100, label: "No safe-area margin configured" };
  }

  const insetX = (safeMarginInches / printSizeInches.width) * 100;
  const insetY = (safeMarginInches / printSizeInches.height) * 100;
  const safeLeft = insetX;
  const safeTop = insetY;
  const safeRight = 100 - insetX;
  const safeBottom = 100 - insetY;

  const allLayers = Object.values(zoneLayers || {}).flat();
  if (allLayers.length === 0) return { score: 100, label: "No layers to check" };

  const avgInset = (insetX + insetY) / 2 || 1;

  let totalPenalty = 0;
  allLayers.forEach((layer) => {
    const left = layer.x ?? 0;
    const top = layer.y ?? 0;
    const right = left + (layer.w ?? 0);
    const bottom = top + (layer.h ?? 0);

    const overshootLeft = Math.max(0, safeLeft - left);
    const overshootTop = Math.max(0, safeTop - top);
    const overshootRight = Math.max(0, right - safeRight);
    const overshootBottom = Math.max(0, bottom - safeBottom);
    const worstOvershoot = Math.max(overshootLeft, overshootTop, overshootRight, overshootBottom);

    totalPenalty += Math.min(1, worstOvershoot / avgInset);
  });

  const avgPenalty = totalPenalty / allLayers.length;
  const score = Math.round(100 - avgPenalty * 100);
  return { score, label: `${allLayers.length} layer${allLayers.length === 1 ? "" : "s"} checked` };
}

/**
 * @param {HTMLCanvasElement} designCanvas - flattened design, transparent bg
 * @param {string} shirtColorHex
 */
export function computeColorContrastScore(designCanvas, shirtColorHex) {
  const ctx = designCanvas.getContext("2d");
  const { width, height } = designCanvas;
  if (!width || !height) return { score: 100, label: "No design to sample", ratio: null };

  let imageData;
  try {
    imageData = ctx.getImageData(0, 0, width, height);
  } catch (e) {
    return { score: 100, label: "Could not sample design colors", ratio: null };
  }

  const data = imageData.data;
  let rSum = 0, gSum = 0, bSum = 0, opaqueCount = 0;
  const step = 4 * 4;
  for (let i = 0; i < data.length; i += step) {
    const alpha = data[i + 3];
    if (alpha < 16) continue;
    rSum += data[i];
    gSum += data[i + 1];
    bSum += data[i + 2];
    opaqueCount += 1;
  }

  if (opaqueCount === 0) return { score: 100, label: "No design to sample", ratio: null };

  const designLum = relativeLuminance({
    r: rSum / opaqueCount,
    g: gSum / opaqueCount,
    b: bSum / opaqueCount,
  });
  const shirtLum = relativeLuminance(hexToRgb(shirtColorHex));
  const ratio = contrastRatio(designLum, shirtLum);

  let score;
  if (ratio >= 7) score = 100;
  else if (ratio >= 4.5) score = 70 + ((ratio - 4.5) / (7 - 4.5)) * 30;
  else score = Math.max(20, (ratio / 4.5) * 70);

  return { score: Math.round(score), label: `Contrast ratio ${ratio.toFixed(1)}:1`, ratio };
}

export function computeOverallScore({ resolution, safeArea, colorContrast }) {
  return Math.round((resolution.score + safeArea.score + colorContrast.score) / 3);
}