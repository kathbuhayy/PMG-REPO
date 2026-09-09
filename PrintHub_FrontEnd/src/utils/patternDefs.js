// src/utils/patternDefs.js  (replace entire file)
/**
 * patternDefs
 * Repeating tileable patterns. Every tile is now built from real Fabric
 * objects on a small offscreen fabric.StaticCanvas - one implementation
 * shared by the sidebar preview swatch AND the actual pattern fill used
 * when flattening a layer, instead of the old split (a hand-written SVG
 * string for the swatch, a separate hand-written Canvas 2D drawer for
 * the real fill) that could silently drift out of sync with each other.
 *
 * Every shape used here (Rect/Circle/Triangle) is a solid fill with no
 * image loading, so building + rendering a tile is fully synchronous.
 */
import * as fabric from "fabric";
import { buildGradientFill } from "./fabricGradient";

export const PATTERN_TYPES = ["stripes", "dots", "checkerboard", "chevron", "gingham"];

export const PATTERN_LABELS = {
  stripes: "Stripes",
  dots: "Dots",
  checkerboard: "Checkerboard",
  chevron: "Chevron",
  gingham: "Gingham",
};

/**
 * Builds one tile (tileSize square) as a raw <canvas> element.
 * `gradient` (optional) overrides fgColor with a gradient fill, using
 * the same descriptor shape shapes/text use.
 */
function buildPatternTileCanvas(patternType, tileSize, fgColor, bgColor, gradient) {
  const t = tileSize;
  const canvasEl = document.createElement("canvas");
  canvasEl.width = t;
  canvasEl.height = t;

  const staticCanvas = new fabric.StaticCanvas(canvasEl, { width: t, height: t });
  const fgFill = buildGradientFill(gradient, t, t) || fgColor;

  staticCanvas.add(new fabric.Rect({ left: 0, top: 0, width: t, height: t, fill: bgColor }));

  switch (patternType) {
    case "stripes":
      staticCanvas.add(new fabric.Rect({ left: 0, top: 0, width: t / 2, height: t, fill: fgFill }));
      break;
    case "dots":
      staticCanvas.add(
        new fabric.Circle({
          left: t / 2,
          top: t / 2,
          radius: t * 0.3,
          fill: fgFill,
          originX: "center",
          originY: "center",
        }),
      );
      break;
    case "checkerboard":
      staticCanvas.add(new fabric.Rect({ left: 0, top: 0, width: t / 2, height: t / 2, fill: fgFill }));
      staticCanvas.add(new fabric.Rect({ left: t / 2, top: t / 2, width: t / 2, height: t / 2, fill: fgFill }));
      break;
    case "chevron":
      // Fabric's Triangle defaults to apex-up/base-down, which is exactly
      // the shape the old hand-drawn chevron tile traced by hand.
      staticCanvas.add(new fabric.Triangle({ left: 0, top: 0, width: t, height: t, fill: fgFill }));
      break;
    case "gingham":
      staticCanvas.add(new fabric.Rect({ left: 0, top: 0, width: t / 2, height: t, fill: fgFill, opacity: 0.5 }));
      staticCanvas.add(new fabric.Rect({ left: 0, top: 0, width: t, height: t / 2, fill: fgFill, opacity: 0.5 }));
      break;
    default:
      break;
  }

  staticCanvas.renderAll();
  return staticCanvas.getElement();
}

/**
 * Fills a rectangular region (0,0)-(width,height) on the given context
 * with the tiled pattern, clipped to that region.
 */
export function fillPatternRect(ctx, patternType, width, height, tileSize, fgColor, bgColor, gradient) {
  const tileCanvas = buildPatternTileCanvas(patternType, tileSize, fgColor, bgColor, gradient);

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

/** Data URL of one tile - used for the sidebar Graphics preview swatch. */
export function buildPatternPreviewDataUrl(patternType, tileSize, fgColor, bgColor, gradient) {
  return buildPatternTileCanvas(patternType, tileSize, fgColor, bgColor, gradient).toDataURL("image/png");
}

/** A ready-to-use fabric.Pattern for buildPatternObject in fabricZoneRenderer.js. */
export function buildFabricPatternFill(patternType, tileSize, fgColor, bgColor, gradient) {
  const tileCanvas = buildPatternTileCanvas(patternType, tileSize, fgColor, bgColor, gradient);
  return new fabric.Pattern({ source: tileCanvas, repeat: "repeat" });
}