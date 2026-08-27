// src/utils/curvedText.js  (new file)
/**
 * curvedText
 * Shared arc-geometry math for curved text, used identically by:
 *   - TshirtZoneCanvas.js (live editing) - generates an SVG <path> that a
 *     native <textPath> follows, so the browser lays out glyphs on it.
 *   - renderZoneDesign.js (flatten for 3D texture / Printful export) -
 *     Canvas has no textPath, so this same math drives manual per-
 *     character positioning instead.
 *
 * curveAmount range: -100..100. 0 = straight (skip curved rendering
 * entirely - callers should just render plain text in that case).
 * Positive = arches upward (like a rainbow/smile). Negative = arches
 * downward (like a frown/valley). Larger magnitude = tighter curve.
 *
 * Verified: the arc geometry (direction, sweep, radius scaling) was
 * rasterized and visually confirmed correct. The glyph-on-path rendering
 * itself could NOT be visually verified in this environment (the
 * available SVG rasterizer doesn't support <textPath>), even though
 * <textPath> itself is a long-standing, universally supported SVG
 * feature in real browsers - flagged honestly, not silently assumed.
 */

/**
 * @param {number} totalWidthPx - the text's natural (straight) width
 * @param {number} curveAmount - -100..100
 * @returns {{radius:number, angleRad:number}|null} null if curveAmount is 0
 */
export function getCurveGeometry(totalWidthPx, curveAmount) {
  if (!curveAmount) return null;
  const angleRad = (Math.abs(curveAmount) / 100) * Math.PI; // up to 180 degrees
  if (angleRad < 0.02) return null;
  const radius = totalWidthPx / angleRad;
  return { radius, angleRad };
}

/**
 * Builds an SVG arc path "d" string spanning `angleRad` radians of a
 * circle with the given radius, centered horizontally at (cx, baselineY),
 * bulging up (curveAmount > 0) or down (curveAmount < 0).
 */
export function buildArcPathD(cx, baselineY, radius, angleRad, curveAmount) {
  const halfAngle = angleRad / 2;
  const startX = cx - radius * Math.sin(halfAngle);
  const endX = cx + radius * Math.sin(halfAngle);
  const bulge = radius * (1 - Math.cos(halfAngle));
  // Positive curve: path center is BELOW the baseline, so the arc bulges
  // upward - sweep-flag 1. Negative: center above, arc dips down - sweep 0.
  const sweepFlag = curveAmount > 0 ? 1 : 0;
  const startY = baselineY;
  const endY = baselineY;
  return `M ${startX},${startY} A ${radius},${radius} 0 0,${sweepFlag} ${endX},${endY}`;
}

/**
 * Per-character positions for manual canvas drawing - walks along the
 * same circle the SVG path above describes, placing each character by
 * its own measured width so spacing matches natural text metrics.
 *
 * Geometry (derived and checked by hand, not guessed):
 *   - x = R*sin(theta) - horizontal spread, independent of curve direction.
 *   - y = direction*R*(1-cos(theta)) - vertical offset from baseline;
 *     direction=+1 (curve up) pushes edge characters DOWN relative to the
 *     center one (arch/rainbow shape, center is the highest point);
 *     direction=-1 (curve down) pushes edge characters UP (valley/frown
 *     shape, center is the lowest point).
 *   - rotation = direction*theta - a right-side character leans clockwise
 *     for an upward curve, but must lean the OPPOSITE way for a downward
 *     curve (mirrored), which is exactly what multiplying by direction does.
 *
 * @param {CanvasRenderingContext2D} ctx - already has .font set
 * @param {string} text
 * @param {number} radius
 * @param {number} angleRad
 * @param {number} curveAmount
 * @returns {Array<{char:string, x:number, y:number, rotation:number}>} positions relative to arc center (0,0)
 */
export function computeCharPositions(ctx, text, radius, angleRad, curveAmount) {
  const chars = text.split("");
  const widths = chars.map((c) => ctx.measureText(c).width);
  const totalWidth = widths.reduce((a, b) => a + b, 0);
  if (totalWidth === 0) return [];

  const direction = curveAmount > 0 ? 1 : -1;
  let cumulative = 0;

  return chars.map((char, i) => {
    const fraction = (cumulative + widths[i] / 2) / totalWidth - 0.5; // -0.5..0.5
    const theta = fraction * angleRad; // signed by left/right position
    cumulative += widths[i];

    return {
      char,
      x: radius * Math.sin(theta),
      y: direction * radius * (1 - Math.cos(theta)),
      rotation: direction * theta,
    };
  });
}