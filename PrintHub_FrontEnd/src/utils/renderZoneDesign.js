// src/utils/renderZoneDesign.js  (replace entire file)
/**
 * renderZoneDesign
 * Flattens a zone's ordered layer stack (images + text + shapes +
 * patterns, from zoneLayerModel) into a single transparent-background
 * canvas - the flat design image that personMockupComposite/Printful
 * warps onto a photo, and the same shape the 3D texture builder in
 * TshirtPreview3D.js already produces for the GLB model.
 *
 * Layer x/y/w/h are percentages of the zone's own bounding box (0-100),
 * matching every other place in the customizer that reads zoneLayers.
 */

import { SHAPE_PATHS } from "./shapeDefs";
import { fillPatternRect } from "./patternDefs";
import { getCurveGeometry, computeCharPositions } from "./curvedText";

function loadImageCached(url, cache) {
  if (cache.has(url)) return cache.get(url);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
  cache.set(url, p);
  return p;
}

const imageCache = new Map();

async function drawTextLayer(ctx, t, size) {
  const boxX = (t.x / 100) * size;
  const boxY = (t.y / 100) * size;
  const boxW = (t.w / 100) * size;
  const boxH = (t.h / 100) * size;
  const fontPx = (t.fontSize / 100) * size;
  const fontSpec = `${t.italic ? "italic " : ""}${t.bold ? "700" : "400"} ${fontPx}px ${t.fontFamily}`;

  if (typeof document !== "undefined" && document.fonts?.load) {
    try {
      await document.fonts.load(fontSpec);
    } catch {
      // Non-fatal - falls through to whatever the browser's default is.
    }
  }

  ctx.save();
  ctx.font = fontSpec;
  ctx.textBaseline = "middle";
  ctx.textAlign = t.align === "left" ? "left" : t.align === "right" ? "right" : "center";

  if (t.shadow) {
    ctx.shadowColor = t.shadowColor;
    ctx.shadowBlur = (t.shadowBlur / 100) * size;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  if (t.curve) {
    const centerX = boxX + boxW / 2;
    const centerY = boxY + boxH / 2;
    const text = t.text || "";
    const naturalWidth = ctx.measureText(text).width;
    const geometry = getCurveGeometry(naturalWidth, t.curve);

    if (geometry) {
      ctx.textAlign = "center";
      const positions = computeCharPositions(ctx, text, geometry.radius, geometry.angleRad, t.curve);
      positions.forEach(({ char, x, y, rotation }) => {
        ctx.save();
        ctx.translate(centerX + x, centerY + y);
        ctx.rotate(rotation);
        if (t.outline) {
          ctx.lineWidth = (t.outlineWidth / 100) * size;
          ctx.strokeStyle = t.outlineColor;
          ctx.strokeText(char, 0, 0);
        }
        ctx.fillStyle = t.color;
        ctx.fillText(char, 0, 0);
        ctx.restore();
      });
    }
    ctx.restore();
    return;
  }

  let drawX = boxX + boxW / 2;
  if (t.align === "left") drawX = boxX;
  if (t.align === "right") drawX = boxX + boxW;
  const drawY = boxY + boxH / 2;

  if (t.outline) {
    ctx.lineWidth = (t.outlineWidth / 100) * size;
    ctx.strokeStyle = t.outlineColor;
    ctx.strokeText(t.text || "", drawX, drawY);
  }

  ctx.fillStyle = t.color;
  ctx.fillText(t.text || "", drawX, drawY);
  ctx.restore();
}

/**
 * @param {Layer[]} layers - a single zone's layer stack, bottom to top
 * @param {number} [size] - output canvas size in px (square)
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderZoneLayersToCanvas(layers = [], size = 1024) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, size, size);

  for (const layer of layers) {
    if (layer.kind === "image" && layer.imageUrl) {
      try {
        const img = await loadImageCached(layer.imageUrl, imageCache);
        const x = (layer.x / 100) * size;
        const y = (layer.y / 100) * size;
        const w = (layer.w / 100) * size;
        const h = (layer.h / 100) * size;
        ctx.save();
        if (layer.rotation) {
          ctx.translate(x + w / 2, y + h / 2);
          ctx.rotate((layer.rotation * Math.PI) / 180);
          ctx.translate(-(x + w / 2), -(y + h / 2));
        }
        ctx.drawImage(img, x, y, w, h);
        ctx.restore();
      } catch {
        // Skip images that fail to load rather than aborting the whole render.
      }
    } else if (layer.kind === "text") {
      await drawTextLayer(ctx, layer, size);
    } else if (layer.kind === "shape") {
      const x = (layer.x / 100) * size;
      const y = (layer.y / 100) * size;
      const w = (layer.w / 100) * size;
      const h = (layer.h / 100) * size;
      const pathData = SHAPE_PATHS[layer.shapeType] || SHAPE_PATHS.square;

      ctx.save();
      if (layer.rotation) {
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.translate(-(x + w / 2), -(y + h / 2));
      }
      ctx.translate(x, y);
      ctx.scale(w / 100, h / 100);
      ctx.fillStyle = layer.fillColor || "#111827";
      ctx.fill(new Path2D(pathData));
      ctx.restore();
    } else if (layer.kind === "pattern") {
      const x = (layer.x / 100) * size;
      const y = (layer.y / 100) * size;
      const w = (layer.w / 100) * size;
      const h = (layer.h / 100) * size;
      const scaledTileSize = Math.max(2, (layer.tileSize / 100) * ((w + h) / 2));

      ctx.save();
      if (layer.rotation) {
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.translate(-(x + w / 2), -(y + h / 2));
      }
      ctx.translate(x, y);
      fillPatternRect(ctx, layer.patternType, w, h, scaledTileSize, layer.fillColor, layer.backgroundColor);
      ctx.restore();
    }
  }

  return canvas;
}

/**
 * Convenience wrapper: flattens layers, returns a PNG data URL directly.
 */
export async function renderZoneLayersToDataURL(layers = [], size = 1024) {
  const canvas = await renderZoneLayersToCanvas(layers, size);
  return canvas.toDataURL("image/png");
}