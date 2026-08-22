/**
 * shirtOutline
 * A simple, original line-art t-shirt silhouette (front/back look the same
 * for a plain tee) used as the visual backdrop in TshirtSideView, plus the
 * print-area rectangle's position on that silhouette as percentages.
 *
 * Verified by rasterizing to a real PNG and viewing it before use - not
 * just checked for valid SVG syntax.
 */

export const SHIRT_OUTLINE_VIEWBOX = "0 0 300 360";

export const SHIRT_OUTLINE_PATH =
  "M 150,0 L 95,0 C 70,0 45,15 25,45 L 0,95 L 45,130 L 65,105 L 65,340 " +
  "C 65,350 72,357 82,357 L 218,357 C 228,357 235,350 235,340 L 235,105 " +
  "L 255,130 L 300,95 L 275,45 C 255,15 230,0 205,0 L 150,0 Z " +
  "M 105,0 C 108,14 122,24 150,24 C 178,24 192,14 195,0";

// Extra detail lines layered on top of the base outline for a more
// Printify-like garment look: inner collar rib, side seams, sleeve hems,
// bottom hem. Kept as separate thin/lighter strokes rather than baked
// into the main silhouette path, so they read as construction details
// instead of outline edges.
export const SHIRT_DETAIL_PATHS = [
  "M 112,6 C 117,17 132,26 150,26 C 168,26 183,17 188,6", // inner collar rib
  "M 78,112 L 78,338", // left side seam
  "M 222,112 L 222,338", // right side seam
  "M 8,88 L 50,121", // left sleeve hem
  "M 292,88 L 250,121", // right sleeve hem
  "M 66,332 L 234,332", // bottom hem
];

// Percentages of the shirt's own bounding box (0-100), where the chest
// print area sits.
export const SHIRT_PRINT_AREA = { left: 30, top: 30, width: 40, height: 38 };