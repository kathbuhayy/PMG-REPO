// src/utils/layerDpiCheck.js
/**
 * layerDpiCheck
 * Approximates print quality for an image layer, so the Layers panel can
 * show a live "Print-ready" / "Low-res" badge before checkout.
 *
 * This is a heuristic, not a lab measurement: it assumes a default
 * physical size (in inches) for each zone type, then compares the
 * image's native pixel resolution against what's needed for a target
 * DPI at the layer's current displayed size within that zone.
 *
 * Tune ZONE_PHYSICAL_INCHES as real product measurements become
 * available — these are reasonable industry-standard defaults for now.
 */

export const ZONE_PHYSICAL_INCHES = {
  front: { w: 12, h: 16 },
  back: { w: 12, h: 16 },
  left_sleeve: { w: 3.5, h: 3.5 },
  right_sleeve: { w: 3.5, h: 3.5 },
  left_side: { w: 3, h: 3 },
  right_side: { w: 3, h: 3 },
  outside: { w: 3.5, h: 3.5 }, // mug wrap face
  inside: { w: 3.5, h: 3.5 },
  front_cover: { w: 8.5, h: 11 },
  back_cover: { w: 8.5, h: 11 },
  wrap: { w: 9.5, h: 3.5 }, // mug full wrap
  DEFAULT: { w: 10, h: 10 },
};

export const DEFAULT_TARGET_DPI = 300;
const LOW_RES_RATIO = 0.85; // below 85% of target DPI = flagged low-res

export function getZonePhysicalSize(zoneId) {
  return ZONE_PHYSICAL_INCHES[zoneId] || ZONE_PHYSICAL_INCHES.DEFAULT;
}

/**
 * Reads an image's natural pixel dimensions. Cached on the layer object
 * itself (naturalWidth/naturalHeight) after first load so we don't
 * re-decode the image on every render.
 */
export function loadImageNaturalSize(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight });
    img.onerror = reject;
    img.src = imageUrl;
  });
}

/**
 * Compute effective DPI for an image layer.
 *   effectiveDPI = naturalWidthPx / (layer.w% * zoneWidthInches)
 * Returns null if we don't yet have naturalWidth cached on the layer.
 */
export function computeEffectiveDpi(layer, zoneId) {
  if (layer.kind !== "image" || !layer.naturalWidth) return null;
  const zoneSize = getZonePhysicalSize(zoneId);
  const printedWidthInches = (layer.w / 100) * zoneSize.w;
  if (printedWidthInches <= 0) return null;
  return Math.round(layer.naturalWidth / printedWidthInches);
}

/**
 * Returns { status: 'ready' | 'low' | 'unknown', dpi } for a layer.
 */
export function getLayerPrintQuality(layer, zoneId, targetDpi = DEFAULT_TARGET_DPI) {
  if (layer.kind !== "image") return { status: "n/a", dpi: null };
  const dpi = computeEffectiveDpi(layer, zoneId);
  if (dpi == null) return { status: "unknown", dpi: null };
  const status = dpi >= targetDpi * LOW_RES_RATIO ? "ready" : "low";
  return { status, dpi };
}