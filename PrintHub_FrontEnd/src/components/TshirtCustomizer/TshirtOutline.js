import React from "react";

/**
 * TshirtOutline
 * Flat line-drawing of a t-shirt (front or back), matching the visual
 * language of Printify's flat editor. Pure SVG, no external image assets.
 *
 * Props:
 *   side {"front"|"back"|"left_sleeve"|"right_sleeve"} — which view to draw
 *   width, height — pixel size of the rendered SVG (defaults fill parent)
 */
function TshirtOutline({ side = "front", width = "100%", height = "100%" }) {
  const stroke = "var(--tsc-outline-stroke, #1f2937)";
  const strokeWidth = 2;

  if (side === "left_sleeve" || side === "right_sleeve") {
    const flip = side === "right_sleeve";
    return (
      <svg
        viewBox="0 0 400 400"
        width={width}
        height={height}
        style={{ transform: flip ? "scaleX(-1)" : undefined }}
      >
        <path
          d="M150 40
             Q100 40 100 90
             L100 340
             Q100 370 140 370
             L260 370
             Q300 370 300 340
             L300 90
             Q300 40 250 40
             Z"
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  const isBack = side === "back";

  return (
    <svg viewBox="0 0 400 440" width={width} height={height}>
      {/* Collar */}
      {isBack ? (
        <path
          d="M162 46 C170 60, 230 60, 238 46"
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      ) : (
        <path
          d="M162 46 C172 74, 228 74, 238 46"
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      )}

      {/* Body + sleeves outline */}
      <path
        d="M162 46
           L92 74
           C70 82, 54 100, 40 128
           L18 172
           C12 184, 16 198, 28 206
           L84 240
           L104 200
           L104 392
           C104 404, 114 414, 126 414
           L274 414
           C286 414, 296 404, 296 392
           L296 200
           L316 240
           L372 206
           C384 198, 388 184, 382 172
           L360 128
           C346 100, 330 82, 308 74
           L238 46
           C230 60, 170 60, 162 46
           Z"
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />

      {/* Side seams */}
      <path
        d="M104 200 L104 392"
        fill="none"
        stroke={stroke}
        strokeWidth={1}
        opacity="0.35"
      />
      <path
        d="M296 200 L296 392"
        fill="none"
        stroke={stroke}
        strokeWidth={1}
        opacity="0.35"
      />

      {/* Sleeve hem lines */}
      <path
        d="M28 206 L84 240"
        fill="none"
        stroke={stroke}
        strokeWidth={1}
        opacity="0.35"
      />
      <path
        d="M372 206 L316 240"
        fill="none"
        stroke={stroke}
        strokeWidth={1}
        opacity="0.35"
      />
    </svg>
  );
}

export default TshirtOutline;