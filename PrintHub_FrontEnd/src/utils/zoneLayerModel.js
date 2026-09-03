// src/utils/zoneLayerModel.js  (replace entire file)
/**
 * zoneLayerModel
 * Unified stacked-layer data model for the customizer.
 *
 *   zoneLayers = { [zoneId]: Layer[] }   // index 0 = bottom of stack
 *
 * Common fields (every kind): id, kind, x, y, w, h, rotation, opacity
 * (0-1, default 1), locked (bool, default false).
 *   image:   imageUrl, naturalWidth, naturalHeight, filters
 *            ({ grayscale, sepia, invert, brightness, contrast, blur })
 *   text:    text, fontFamily, fontSize, color, bold, italic, align,
 *            outline, outlineColor, outlineWidth, shadow, shadowColor,
 *            shadowBlur, curve, gradient
 *   shape:   shapeType, fillColor, strokeColor, strokeWidth, gradient
 *   pattern: patternType, fillColor, backgroundColor, tileSize, gradient
 *
 * gradient shape (shape/pattern/text - optional, null = solid color):
 *   { type: 'linear'|'radial', angle: 0-360, stops: [{offset,color}] }
 *
 * IMPORTANT: production orders already have `design_data` JSON saved in
 * the OLD shape (`zones` + `zoneTexts`, see AdminOrders.js). Nothing here
 * should assume every saved design is already in the new shape.
 */

let _idCounter = 0;
function makeId(prefix) {
  _idCounter += 1;
  return `${prefix}_${Date.now()}_${_idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createImageLayer({ imageUrl, x = 10, y = 10, w = 80, h = 80, rotation = 0 } = {}) {
  return {
    id: makeId("image"),
    kind: "image",
    imageUrl,
    x,
    y,
    w,
    h,
    rotation,
    opacity: 1,
    locked: false,
    filters: null,
  };
}

export function createTextLayer(overrides = {}) {
  return {
    id: makeId("text"),
    kind: "text",
    text: "Your Text",
    x: 15,
    y: 40,
    w: 70,
    h: 20,
    rotation: 0,
    fontFamily: "Arial",
    fontSize: 12,
    color: "#000000",
    bold: false,
    italic: false,
    align: "center",
    outline: false,
    outlineColor: "#ffffff",
    outlineWidth: 3,
    shadow: false,
    shadowColor: "#000000",
    shadowBlur: 4,
    curve: 0,
    opacity: 1,
    locked: false,
    gradient: null,
    ...overrides,
  };
}

export const SHAPE_TYPES = [
  "star", "heart", "line", "triangle", "circle", "square",
  "arrow", "hexagon", "speech_bubble", "ribbon",
];

export function createShapeLayer({
  shapeType = "star",
  x = 20,
  y = 20,
  w = 40,
  h = 40,
  rotation = 0,
  fillColor = "#111827",
} = {}) {
  return {
    id: makeId("shape"),
    kind: "shape",
    shapeType,
    x,
    y,
    w,
    h,
    rotation,
    fillColor,
    strokeColor: null,
    strokeWidth: 0,
    opacity: 1,
    locked: false,
    gradient: null,
  };
}

export function createPatternLayer({
  patternType = "stripes",
  x = 10,
  y = 10,
  w = 80,
  h = 80,
  rotation = 0,
  fillColor = "#111827",
  backgroundColor = "#ffffff",
  tileSize = 20,
} = {}) {
  return {
    id: makeId("pattern"),
    kind: "pattern",
    patternType,
    x,
    y,
    w,
    h,
    rotation,
    fillColor,
    backgroundColor,
    tileSize,
    opacity: 1,
    locked: false,
    gradient: null,
  };
}

export function legacyToZoneLayers(legacyZoneDesigns = {}, legacyZoneTexts = {}) {
  const zoneLayers = {};
  const zoneIds = new Set([
    ...Object.keys(legacyZoneDesigns || {}),
    ...Object.keys(legacyZoneTexts || {}),
  ]);

  zoneIds.forEach((zoneId) => {
    const layers = [];
    const design = legacyZoneDesigns?.[zoneId];
    if (design?.imageUrl) {
      layers.push({
        id: makeId("image"),
        kind: "image",
        imageUrl: design.imageUrl,
        x: design.x ?? 10,
        y: design.y ?? 10,
        w: design.w ?? 80,
        h: design.h ?? 80,
        rotation: design.rotation ?? 0,
        opacity: 1,
        locked: false,
        filters: null,
      });
    }
    (legacyZoneTexts?.[zoneId] || []).forEach((t) => {
      layers.push({ opacity: 1, locked: false, gradient: null, ...t, kind: "text" });
    });
    zoneLayers[zoneId] = layers;
  });

  return zoneLayers;
}

export function isNewShape(designObj) {
  return !!designObj && typeof designObj === "object" && "zoneLayers" in designObj;
}

export function normalizeToZoneLayers(designObj) {
  if (!designObj) return {};
  if (isNewShape(designObj)) return designObj.zoneLayers || {};
  return legacyToZoneLayers(designObj.zones || designObj.zoneDesigns, designObj.zoneTexts);
}

export function deriveLegacyShape(zoneLayers = {}) {
  const zones = {};
  const zoneTexts = {};

  Object.entries(zoneLayers).forEach(([zoneId, layers]) => {
    const firstImage = layers.find((l) => l.kind === "image");
    if (firstImage) {
      const { id, kind, ...rest } = firstImage;
      zones[zoneId] = rest;
    }
    zoneTexts[zoneId] = layers
      .filter((l) => l.kind === "text")
      .map((l) => {
        const { kind, ...rest } = l;
        return rest;
      });
  });

  return { zones, zoneTexts };
}

// ── Stack operations (all pure, return a new zoneLayers object) ──────

export function addLayer(zoneLayers, zoneId, layer) {
  const existing = zoneLayers[zoneId] || [];
  return { ...zoneLayers, [zoneId]: [...existing, layer] };
}

export function removeLayer(zoneLayers, zoneId, layerId) {
  const existing = zoneLayers[zoneId] || [];
  return { ...zoneLayers, [zoneId]: existing.filter((l) => l.id !== layerId) };
}

export function updateLayer(zoneLayers, zoneId, layerId, updates) {
  const existing = zoneLayers[zoneId] || [];
  return {
    ...zoneLayers,
    [zoneId]: existing.map((l) => (l.id === layerId ? { ...l, ...updates } : l)),
  };
}

export function moveLayer(zoneLayers, zoneId, layerId, direction) {
  const existing = [...(zoneLayers[zoneId] || [])];
  const idx = existing.findIndex((l) => l.id === layerId);
  if (idx === -1) return zoneLayers;
  const nextIdx = idx + direction;
  if (nextIdx < 0 || nextIdx >= existing.length) return zoneLayers;
  [existing[idx], existing[nextIdx]] = [existing[nextIdx], existing[idx]];
  return { ...zoneLayers, [zoneId]: existing };
}

export function reorderLayer(zoneLayers, zoneId, layerId, targetIndex) {
  const existing = [...(zoneLayers[zoneId] || [])];
  const fromIdx = existing.findIndex((l) => l.id === layerId);
  if (fromIdx === -1) return zoneLayers;
  const [moved] = existing.splice(fromIdx, 1);
  existing.splice(targetIndex, 0, moved);
  return { ...zoneLayers, [zoneId]: existing };
}

/** Toggle a single layer's locked flag. */
export function toggleLayerLock(zoneLayers, zoneId, layerId) {
  const existing = zoneLayers[zoneId] || [];
  return {
    ...zoneLayers,
    [zoneId]: existing.map((l) => (l.id === layerId ? { ...l, locked: !l.locked } : l)),
  };
}

/** Copy one zone's full layer stack onto other zones ("Apply to all areas"). */
export function applyToZones(zoneLayers, sourceZoneId, targetZoneIds) {
  const sourceLayers = zoneLayers[sourceZoneId] || [];
  const next = { ...zoneLayers };
  targetZoneIds.forEach((zoneId) => {
    if (zoneId === sourceZoneId) return;
    next[zoneId] = sourceLayers.map((l) => ({
      ...l,
      id: makeId(l.kind),
    }));
  });
  return next;
}