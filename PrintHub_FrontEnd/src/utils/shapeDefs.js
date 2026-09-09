// src/utils/shapeDefs.js  (replace entire file)
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
  arrow: "M0,35 H60 V15 L100,50 L60,85 V65 H0 Z",
  hexagon: "M98,50 L74,91.57 L26,91.57 L2,50 L26,8.43 L74,8.43 Z",
  speech_bubble:
    "M10,10 H90 Q95,10 95,20 V60 Q95,70 90,70 H40 L25,90 L30,70 H10 " +
    "Q5,70 5,60 V20 Q5,10 10,10 Z",
  ribbon: "M20,0 H80 V60 L50,45 L20,60 Z",
};

export const SHAPE_LABELS = {
  square: "Square",
  circle: "Circle",
  triangle: "Triangle",
  line: "Line",
  star: "Star",
  heart: "Heart",
  arrow: "Arrow",
  hexagon: "Hexagon",
  speech_bubble: "Speech Bubble",
  ribbon: "Ribbon",
};