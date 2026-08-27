// src/utils/shapeDefs.js  (new file)
/**
 * shapeDefs
 * SVG path data (in a 0-100 viewBox) for the Graphics/Shapes library.
 * The same "d" string works both as an <svg><path d="..."/></svg> element
 * (used live in the flat editor) and as a Canvas 2D Path2D (used when
 * flattening layers for the 3D texture / Printful export) - Path2D
 * natively understands SVG path syntax, so there's one source of truth
 * instead of maintaining separate SVG and canvas-drawing code per shape.
 */

export const SHAPE_PATHS = {
  square: "M0,0 H100 V100 H0 Z",
  circle:
    "M50,0 C77.6,0 100,22.4 100,50 C100,77.6 77.6,100 50,100 " +
    "C22.4,100 0,77.6 0,50 C0,22.4 22.4,0 50,0 Z",
  triangle: "M50,0 L100,100 L0,100 Z",
  line: "M0,45 H100 V55 H0 Z",
  star:
    "M50,5 L61,39 L98,39 L68,60 L79,95 L50,75 L21,95 L32,60 L2,39 L39,39 Z",
  heart:
    "M50,88 C20,65 0,45 0,25 C0,10 12,0 25,0 C35,0 45,7 50,18 " +
    "C55,7 65,0 75,0 C88,0 100,10 100,25 C100,45 80,65 50,88 Z",
};

export const SHAPE_LABELS = {
  square: "Square",
  circle: "Circle",
  triangle: "Triangle",
  line: "Line",
  star: "Star",
  heart: "Heart",
};