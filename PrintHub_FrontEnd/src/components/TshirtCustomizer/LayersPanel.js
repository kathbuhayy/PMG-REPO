// src/components/TshirtCustomizer/LayersPanel.js  (replace entire file)
/**
 * LayersPanel
 * Printify-style stacked layer list for the active zone. Renders
 * top-of-stack first (matches how design tools usually list layers).
 *
 * Props:
 *   layers          {Layer[]}  – zoneLayers[activeZone], bottom-to-top order
 *   selectedLayerId {string|null}
 *   onSelect        {fn(layerId)}
 *   onRemove        {fn(layerId)}
 *   onMove          {fn(layerId, direction)}  – direction: 1 (up) | -1 (down)
 *   onApplyToAll    {fn()}  – "Apply to all areas"
 *   dpiByLayerId    {object} – { [layerId]: { status, dpi } }, from layerDpiCheck
 */
import React from "react";
import { FaLock, FaLockOpen } from "react-icons/fa";
import { SHAPE_PATHS } from "../../utils/shapeDefs";
import "./TshirtCustomizer.css";

function LayerThumb({ layer }) {
  if (layer.kind === "image") {
    return (
      <div className="lp-thumb">
        <img src={layer.imageUrl} alt="" draggable={false} />
      </div>
    );
  }
  if (layer.kind === "shape") {
    return (
      <div className="lp-thumb lp-thumb-shape">
        <svg viewBox="0 0 100 100" width="60%" height="60%">
          <path d={SHAPE_PATHS[layer.shapeType] || SHAPE_PATHS.square} fill={layer.fillColor || "#111827"} />
        </svg>
      </div>
    );
  }
  return (
    <div className="lp-thumb lp-thumb-text" style={{ color: layer.color }}>
      Tt
    </div>
  );
}

function DpiBadge({ quality }) {
  if (!quality || quality.status === "n/a") return null;
  if (quality.status === "unknown") {
    return <span className="lp-badge lp-badge-unknown">Checking…</span>;
  }
  if (quality.status === "ready") {
    return (
      <span className="lp-badge lp-badge-ready" title={`${quality.dpi} DPI at current size`}>
        ✓ Print-ready
      </span>
    );
  }
  return (
    <span className="lp-badge lp-badge-low" title={`${quality.dpi} DPI at current size — may look blurry`}>
      ⚠ Low-res
    </span>
  );
}

export default function LayersPanel({
  layers = [],
  selectedLayerId,
  onSelect,
  onRemove,
  onMove,
  onApplyToAll,
  onToggleLock,
  dpiByLayerId = {},
}) {
  // Top of visual stack listed first, like Printify/Photoshop.
  const displayOrder = [...layers].reverse();

  return (
    <div className="lp-panel">
      <div className="lp-header">
        <span>Layers</span>
        {onApplyToAll && (
          <button type="button" className="lp-apply-all-btn" onClick={onApplyToAll}>
            Apply to all areas
          </button>
        )}
      </div>

      {displayOrder.length === 0 && (
        <div className="lp-empty">No layers yet — upload an image, add text, or generate one with AI.</div>
      )}

      <div className="lp-list">
        {displayOrder.map((layer, displayIdx) => {
          const isTop = displayIdx === 0;
          const isBottom = displayIdx === displayOrder.length - 1;
          const isSelected = layer.id === selectedLayerId;
          return (
            <div
              key={layer.id}
              className={`lp-row${isSelected ? " lp-row-selected" : ""}`}
              onClick={() => onSelect?.(layer.id)}
            >
              <LayerThumb layer={layer} />

              <div className="lp-row-main">
                <div className="lp-row-name">
                  {layer.kind === "image"
                    ? "Image"
                    : layer.kind === "shape"
                      ? `${layer.shapeType?.charAt(0).toUpperCase()}${layer.shapeType?.slice(1)}` || "Shape"
                      : layer.kind === "pattern"
                        ? `${layer.patternType?.charAt(0).toUpperCase()}${layer.patternType?.slice(1)}` || "Pattern"
                        : layer.text || "Text"}
                </div>
                <DpiBadge quality={dpiByLayerId[layer.id]} />
                {typeof layer.opacity === "number" && layer.opacity < 1 && (
                  <span className="lp-opacity-badge">{Math.round(layer.opacity * 100)}%</span>
                )}
              </div>

              <div className="lp-row-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className={`lp-lock-btn${layer.locked ? " active" : ""}`}
                  title={layer.locked ? "Unlock layer" : "Lock layer"}
                  onClick={() => onToggleLock?.(layer.id)}
                >
                  {layer.locked ? <FaLock size={11} /> : <FaLockOpen size={11} />}
                </button>
                <button
                  type="button"
                  className="lp-move-btn"
                  disabled={isTop}
                  title="Bring forward"
                  onClick={() => onMove?.(layer.id, 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="lp-move-btn"
                  disabled={isBottom}
                  title="Send backward"
                  onClick={() => onMove?.(layer.id, -1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="lp-remove-btn"
                  title="Delete layer"
                  onClick={() => onRemove?.(layer.id)}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}