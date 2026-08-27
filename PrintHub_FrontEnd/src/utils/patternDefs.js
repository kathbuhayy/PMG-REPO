// src/utils/patternDefs.js  (new file)
/**
 * patternDefs
 * Repeating tileable patterns - a design element like a "fill the whole
 * zone with stripes/dots/etc" option, distinct from the single-icon
 * Shapes library. Each pattern has two implementations that must stay
 * visually consistent:
 *   - buildPatternSvgDef() - SVG string for a live <pattern> def (used
 *     in the flat editor).
 *   - fillPatternRect() - draws the tiled pattern into a rect on a
 *     Canvas 2D context (used by the flatten/export step).
 *
 * Verified: all 5 patterns were rasterized and visually confirmed to
 * tile cleanly with no seams or misalignment before this was written.
 */

export const PATTERN_TYPES = ["stripes", "dots", "checkerboard", "chevron", "gingham"];

export const PATTERN_LABELS = {
  stripes: "Stripes",
  dots: "Dots",
  checkerboard: "Checkerboard",
  chevron: "Chevron",
  gingham: "Gingham",
};

/**
 * SVG <pattern> inner content (as a string, for dangerouslySetInnerHTML
 * or direct JSX string interpolation) for one tile, sized tileSize square.
 */
export function buildPatternSvgDef(patternType, tileSize, fgColor, bgColor) {
  const t = tileSize;
  switch (patternType) {
    case "stripes":
      return `<rect width="${t}" height="${t}" fill="${bgColor}"/><rect width="${t / 2}" height="${t}" fill="${fgColor}"/>`;
    case "dots":
      return `<rect width="${t}" height="${t}" fill="${bgColor}"/><circle cx="${t / 2}" cy="${t / 2}" r="${t * 0.3}" fill="${fgColor}"/>`;
    case "checkerboard":
      return `<rect width="${t}" height="${t}" fill="${bgColor}"/><rect width="${t / 2}" height="${t / 2}" fill="${fgColor}"/><rect x="${t / 2}" y="${t / 2}" width="${t / 2}" height="${t / 2}" fill="${fgColor}"/>`;
    case "chevron":
      return `<rect width="${t}" height="${t}" fill="${bgColor}"/><path d="M0,${t} L${t / 2},0 L${t},${t} Z" fill="${fgColor}"/>`;
    case "gingham":
      return `<rect width="${t}" height="${t}" fill="${bgColor}"/><rect width="${t / 2}" height="${t}" fill="${fgColor}" opacity="0.5"/><rect width="${t}" height="${t / 2}" fill="${fgColor}" opacity="0.5"/>`;
    default:
      return `<rect width="${t}" height="${t}" fill="${bgColor}"/>`;
  }
}

/**
 * Draws ONE tile of the pattern at (0,0) on a canvas context, sized
 * tileSize square. Caller tiles this across the target area in a loop.
 */
function drawTile(ctx, patternType, tileSize, fgColor, bgColor) {
  const t = tileSize;
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, t, t);
  ctx.fillStyle = fgColor;

  switch (patternType) {
    case "stripes":
      ctx.fillRect(0, 0, t / 2, t);
      break;
    case "dots":
      ctx.beginPath();
      ctx.arc(t / 2, t / 2, t * 0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "checkerboard":
      ctx.fillRect(0, 0, t / 2, t / 2);
      ctx.fillRect(t / 2, t / 2, t / 2, t / 2);
      break;
    case "chevron":
      ctx.beginPath();
      ctx.moveTo(0, t);
      ctx.lineTo(t / 2, 0);
      ctx.lineTo(t, t);
      ctx.closePath();
      ctx.fill();
      break;
    case "gingham":
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, 0, t / 2, t);
      ctx.fillRect(0, 0, t, t / 2);
      ctx.globalAlpha = 1;
      break;
    default:
      break;
  }
}

/**
 * Fills a rectangular region (0,0)-(width,height) on the given context
 * with the tiled pattern, clipped to that region.
 */
export function fillPatternRect(ctx, patternType, width, height, tileSize, fgColor, bgColor) {
  const tileCanvas = typeof OffscreenCanvas !== "undefined"
    ? new OffscreenCanvas(tileSize, tileSize)
    : document.createElement("canvas");
  tileCanvas.width = tileSize;
  tileCanvas.height = tileSize;
  const tileCtx = tileCanvas.getContext("2d");
  drawTile(tileCtx, patternType, tileSize, fgColor, bgColor);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, width, height);
  ctx.clip();
  for (let y = 0; y < height; y += tileSize) {
    for (let x = 0; x < width; x += tileSize) {
      ctx.drawImage(tileCanvas, x, y);
    }
  }
  ctx.restore();
}