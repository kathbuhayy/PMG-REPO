import React from "react";
import TshirtOutline from "./TshirtOutline";
import { ZONE_META, ZoneBox } from "./TshirtZoneCanvas";
import "./TshirtCustomizer.css";

/**
 * TshirtFlatEditor
 * Printify-style flat editing surface: one large shirt outline per side,
 * with side tabs at the bottom (Front / Back / Left Sleeve / Right Sleeve).
 * Reuses the exact same ZoneBox drag/resize component as the grid view —
 * only the layout and background changes (full-size outline vs. small tile).
 *
 * Props mirror TshirtZoneCanvas exactly so the two can be swapped in
 * TshirtCustomizerPanel.js via a simple viewMode check.
 */
function TshirtFlatEditor({
  zones = [],
  zoneDesigns = {},
  zoneTexts = {},
  activeTextId,
  activeZone,
  onZoneSelect,
  onZoneDesignChange,
  onUploadClick,
  onAddText,
  onTextSelect,
  onTextChange,
  onTextRemove,
}) {
  const visibleZones = ZONE_META.filter((m) => zones.includes(m.id));
  const currentMeta =
    visibleZones.find((m) => m.id === activeZone) || visibleZones[0];

  if (!currentMeta) {
    return (
      <div style={{ color: "#aab", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
        No print zones configured for this product.
      </div>
    );
  }

  return (
    <div className="tsc-flat-editor">
      <p className="tsc-canvas-hint">Drag directly on the shirt to position your design.</p>

      <div className="tsc-flat-stage">
        <div className="tsc-flat-outline">
          <TshirtOutline side={currentMeta.id} />
        </div>
              <div className={`tsc-flat-zonebox-overlay zone-${currentMeta.id}`}>
                  <ZoneBox
                      meta={currentMeta}
                      design={zoneDesigns[currentMeta.id] || null}
                      texts={zoneTexts[currentMeta.id] || []}
                      activeTextId={activeTextId}
                      isActive
                      minimal
                      onSelect={() => onZoneSelect(currentMeta.id)}
                      onDesignChange={(layer) => onZoneDesignChange(currentMeta.id, layer)}
                      onUploadClick={onUploadClick}
                      onAddText={onAddText}
                      onTextSelect={(textId) => onTextSelect?.(currentMeta.id, textId)}
                      onTextChange={(textId, updates) => onTextChange?.(currentMeta.id, textId, updates)}
                      onTextRemove={(textId) => onTextRemove?.(currentMeta.id, textId)}
                  />
              </div>
      </div>

      <div className="tsc-flat-side-tabs">
        {visibleZones.map((meta) => (
          <button
            key={meta.id}
            type="button"
            className={`tsc-flat-side-tab${meta.id === currentMeta.id ? " active" : ""}`}
            onClick={() => onZoneSelect(meta.id)}
          >
            {meta.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TshirtFlatEditor;