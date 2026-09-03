// src/utils/fabricZoneRenderer.js  (replace entire file)
/**
 * fabricZoneRenderer
 * Single source of truth for turning a zone's layer stack into rendered
 * Fabric.js objects - used by FabricZoneCanvas.js, TshirtPreview3D.js,
 * and the flatten/export step.
 *
 * Common per-layer properties (opacity, locked) are applied once, here,
 * after the kind-specific builder runs - so every kind gets them for
 * free instead of each build* function reimplementing it.
 */

import * as fabric from "fabric";
import { SHAPE_PATHS } from "./shapeDefs";
import { fillPatternRect, buildFabricPatternFill } from "./patternDefs";
import { getCurveGeometry, computeCharPositions } from "./curvedText";
import { buildGradientFill } from "./fabricGradient";

async function loadFontIfNeeded(fontSpec) {
  if (typeof document !== "undefined" && document.fonts?.load) {
    try {
      await document.fonts.load(fontSpec);
    } catch {
      // Non-fatal - falls through to whatever the browser's default is.
    }
  }
}

async function buildTextObject(layer, x, y, w, h, zoneH) {
  const fontPx = (layer.fontSize / 100) * zoneH;
  const fontSpec = `${layer.italic ? "italic " : ""}${layer.bold ? "700" : "400"} ${fontPx}px ${layer.fontFamily}`;
  await loadFontIfNeeded(fontSpec);

  const fill = buildGradientFill(layer.gradient, w, h) || layer.color;

  const textbox = new fabric.Textbox(layer.text || "", {
    left: x,
    top: y,
    width: w,
    fontFamily: layer.fontFamily,
    fontSize: fontPx,
    fontWeight: layer.bold ? "700" : "400",
    fontStyle: layer.italic ? "italic" : "normal",
    fill,
    textAlign: layer.align === "left" ? "left" : layer.align === "right" ? "right" : "center",
    angle: layer.rotation || 0,
    stroke: layer.outline ? layer.outlineColor : undefined,
    strokeWidth: layer.outline ? (layer.outlineWidth / 100) * zoneH : 0,
    paintFirst: "stroke",
    shadow: layer.shadow
      ? new fabric.Shadow({
          color: layer.shadowColor,
          blur: (layer.shadowBlur / 100) * zoneH,
        })
      : null,
    splitByGrapheme: false,
  });

  textbox.set("top", y + h / 2 - textbox.height / 2);
  textbox.zoneLayerId = layer.id;
  textbox.zoneLayerKind = "text";
  return textbox;
}

async function buildCurvedTextObject(layer, x, y, w, h, zoneH) {
  const fontPx = (layer.fontSize / 100) * zoneH;
  const fontSpec = `${layer.italic ? "italic " : ""}${layer.bold ? "700" : "400"} ${fontPx}px ${layer.fontFamily}`;
  await loadFontIfNeeded(fontSpec);

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  measureCtx.font = fontSpec;
  const naturalWidth = measureCtx.measureText(layer.text || "").width;

  const geometry = getCurveGeometry(naturalWidth, layer.curve);
  const centerX = x + w / 2;
  const centerY = y + h / 2;

  if (!geometry) {
    return buildTextObject(layer, x, y, w, h, zoneH);
  }

  const positions = computeCharPositions(measureCtx, layer.text || "", geometry.radius, geometry.angleRad, layer.curve);

  // A per-character gradient would need to be re-derived per glyph to
  // look continuous across the curve - out of scope for now, so curved
  // text with a gradient falls back to the gradient's first stop color
  // as a flat approximation rather than silently ignoring the gradient.
  const flatFillFallback = layer.gradient?.stops?.[0]?.color;
  const charFill = flatFillFallback || layer.color;

  const charObjects = positions.map(({ char, x: cx, y: cy, rotation }) => {
    const t = new fabric.Text(char, {
      left: centerX + cx,
      top: centerY + cy,
      fontFamily: layer.fontFamily,
      fontSize: fontPx,
      fontWeight: layer.bold ? "700" : "400",
      fontStyle: layer.italic ? "italic" : "normal",
      fill: charFill,
      stroke: layer.outline ? layer.outlineColor : undefined,
      strokeWidth: layer.outline ? (layer.outlineWidth / 100) * zoneH : 0,
      paintFirst: "stroke",
      angle: (rotation * 180) / Math.PI,
      originX: "center",
      originY: "center",
    });
    return t;
  });

  const group = new fabric.Group(charObjects, {
    angle: layer.rotation || 0,
  });
  group.zoneLayerId = layer.id;
  group.zoneLayerKind = "text";
  return group;
}

function buildShapeObject(layer, x, y, w, h) {
  const pathData = SHAPE_PATHS[layer.shapeType] || SHAPE_PATHS.square;
  // Gradient coords are built in the path's own 0-100 viewBox space so
  // they scale correctly along with the object's own scaleX/scaleY.
  const fill = buildGradientFill(layer.gradient, 100, 100) || layer.fillColor || "#111827";
  const path = new fabric.Path(pathData, {
    fill,
    stroke: layer.strokeColor || undefined,
    strokeWidth: layer.strokeColor ? ((layer.strokeWidth || 0) / 100) * Math.max(w, h) : 0,
    angle: layer.rotation || 0,
  });
  const nativeW = path.width || 100;
  const nativeH = path.height || 100;
  path.set({
    scaleX: w / nativeW,
    scaleY: h / nativeH,
    left: x,
    top: y,
  });
  path.zoneLayerId = layer.id;
  path.zoneLayerKind = "shape";
  return path;
}

function buildPatternObject(layer, x, y, w, h) {
  const tileSize = Math.max(2, layer.tileSize || 20);
  const pattern = buildFabricPatternFill(
    layer.patternType,
    tileSize,
    layer.fillColor,
    layer.backgroundColor,
    layer.gradient,
  );
  const rect = new fabric.Rect({
    left: x,
    top: y,
    width: w,
    height: h,
    fill: pattern,
    angle: layer.rotation || 0,
  });
  rect.zoneLayerId = layer.id;
  rect.zoneLayerKind = "pattern";
  return rect;
}

function applyImageFilters(img, filters) {
  if (!filters) {
    img.filters = [];
    img.applyFilters();
    return;
  }
  const list = [];
  if (filters.grayscale) list.push(new fabric.filters.Grayscale());
  if (filters.sepia) list.push(new fabric.filters.Sepia());
  if (filters.invert) list.push(new fabric.filters.Invert());
  if (typeof filters.brightness === "number" && filters.brightness !== 0) {
    list.push(new fabric.filters.Brightness({ brightness: filters.brightness }));
  }
  if (typeof filters.contrast === "number" && filters.contrast !== 0) {
    list.push(new fabric.filters.Contrast({ contrast: filters.contrast }));
  }
  if (typeof filters.blur === "number" && filters.blur > 0) {
    list.push(new fabric.filters.Blur({ blur: filters.blur }));
  }
  img.filters = list;
  img.applyFilters();
}

async function buildImageObject(layer, x, y, w, h) {
  const img = await fabric.FabricImage.fromURL(layer.imageUrl, {
    crossOrigin: "anonymous",
  });
  img.set({
    left: x,
    top: y,
    scaleX: w / img.width,
    scaleY: h / img.height,
    angle: layer.rotation || 0,
  });
  img.zoneLayerId = layer.id;
  img.zoneLayerKind = "image";
  applyImageFilters(img, layer.filters);
  return img;
}

export async function buildFabricObjectFromLayer(layer, zoneW, zoneH) {
  const x = (layer.x / 100) * zoneW;
  const y = (layer.y / 100) * zoneH;
  const w = (layer.w / 100) * zoneW;
  const h = (layer.h / 100) * zoneH;

  let obj;
  switch (layer.kind) {
    case "image":
      obj = await buildImageObject(layer, x, y, w, h);
      break;
    case "text":
      obj = layer.curve
        ? await buildCurvedTextObject(layer, x, y, w, h, zoneH)
        : await buildTextObject(layer, x, y, w, h, zoneH);
      break;
    case "shape":
      obj = buildShapeObject(layer, x, y, w, h);
      break;
    case "pattern":
      obj = buildPatternObject(layer, x, y, w, h);
      break;
    default:
      return null;
  }

  if (!obj) return null;

  // Common properties every layer kind gets for free.
  const locked = !!layer.locked;
  obj.set({
    opacity: layer.opacity ?? 1,
    selectable: true,
    hasControls: !locked,
    lockMovementX: locked,
    lockMovementY: locked,
    lockScalingX: locked,
    lockScalingY: locked,
    lockRotation: locked,
  });

  return obj;
}

export async function renderZoneLayersToFabricCanvas(layers = [], width = 1024, height = 1024) {
  const canvasEl = document.createElement("canvas");
  canvasEl.width = width;
  canvasEl.height = height;

  const staticCanvas = new fabric.StaticCanvas(canvasEl, {
    width,
    height,
    backgroundColor: null,
  });

  for (const layer of layers) {
    try {
      const obj = await buildFabricObjectFromLayer(layer, width, height);
      if (obj) staticCanvas.add(obj);
    } catch {
      // Skip layers that fail to build (e.g. an image URL that 404s).
    }
  }

  staticCanvas.renderAll();
  return staticCanvas;
}

export async function renderZoneLayersToCanvasElement(layers, width, height) {
  const staticCanvas = await renderZoneLayersToFabricCanvas(layers, width, height);
  return staticCanvas.getElement();
}

export async function renderZoneLayersToDataURL(layers, sizeOrDims = 1024) {
  const { width, height } =
    typeof sizeOrDims === "number"
      ? { width: sizeOrDims, height: sizeOrDims }
      : { width: sizeOrDims?.width || 1024, height: sizeOrDims?.height || 1024 };
  const staticCanvas = await renderZoneLayersToFabricCanvas(layers, width, height);
  return staticCanvas.toDataURL({ format: "png" });
}