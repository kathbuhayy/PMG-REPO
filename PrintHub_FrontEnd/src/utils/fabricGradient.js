// src/utils/fabricGradient.js  (new file)
/**
 * Shared gradient-descriptor -> fabric.Gradient converter, used by both
 * fabricZoneRenderer.js (shape/text fills) and patternDefs.js (pattern
 * tile foreground fill) - kept in its own file so neither has to import
 * from the other just for this one helper.
 *
 * Gradient descriptor shape (stored on the layer):
 *   { type: 'linear' | 'radial', angle: 0-360 (linear only), stops: [{ offset: 0-1, color }] }
 */
import * as fabric from "fabric";

export function buildGradientFill(gradient, width, height) {
  if (!gradient || !Array.isArray(gradient.stops) || gradient.stops.length < 2) return null;
  const colorStops = gradient.stops.map((s) => ({ offset: s.offset, color: s.color }));

  if (gradient.type === "radial") {
    return new fabric.Gradient({
      type: "radial",
      coords: {
        x1: width / 2,
        y1: height / 2,
        r1: 0,
        x2: width / 2,
        y2: height / 2,
        r2: Math.max(width, height) / 2,
      },
      colorStops,
    });
  }

  const angleRad = ((gradient.angle || 0) * Math.PI) / 180;
  const dx = Math.cos(angleRad);
  const dy = Math.sin(angleRad);
  return new fabric.Gradient({
    type: "linear",
    coords: {
      x1: width / 2 - (dx * width) / 2,
      y1: height / 2 - (dy * height) / 2,
      x2: width / 2 + (dx * width) / 2,
      y2: height / 2 + (dy * height) / 2,
    },
    colorStops,
  });
}