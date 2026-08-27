/**
 * TshirtSideView
 * Printify-style single-shirt view with a Front side / Back side toggle,
 * used instead of the side-by-side zone grid whenever a product has
 * exactly front + back zones (the common plain-tee case). Reuses the
 * exact same ZoneBox used by the grid - same drag/resize/layers/DPI/
 * bleed-safe-guide behavior - just shown one at a time, positioned over
 * a shirt silhouette instead of as a full grid cell.
 *
 * Products with other zone combinations (sleeves, mugs, business cards,
 * etc.) are untouched - TshirtCustomizerPanel only renders this component
 * when zones are exactly {"front","back"}.
 */
import React, { useState, useEffect } from "react";
import { ZoneBox, ZONE_META } from "./TshirtZoneCanvas";
import { SHIRT_OUTLINE_VIEWBOX, SHIRT_OUTLINE_PATH, SHIRT_DETAIL_PATHS, SHIRT_PRINT_AREA } from "../../utils/shirtOutline";
import "./TshirtCustomizer.css";

export default function TshirtSideView({
  zoneLayers = {},
  selectedLayerId,
  activeZone,
  onZoneSelect,
  onLayerSelect,
  onLayerChange,
  onLayerRemove,
  onZoneClear,
  onUploadClick,
  printSizeInches,
  bleedInches,
  safeMarginInches,
}) {
  const [viewSide, setViewSide] = useState(activeZone === "back" ? "back" : "front");

  // Stay in sync if something else (e.g. clicking a layer in a different
  // zone from outside this component) changes the parent's activeZone.
  useEffect(() => {
    if (activeZone === "front" || activeZone === "back") {
      setViewSide(activeZone);
    }
  }, [activeZone]);

  const handleToggle = (side) => {
    setViewSide(side);
    onZoneSelect?.(side);
  };

  const meta = ZONE_META.find((m) => m.id === viewSide) || { id: viewSide, label: viewSide.toUpperCase() };

  return (
    <div className="tsc-canvas-wrap">
      <p className="tsc-canvas-hint">
        Drag directly on a layer to move it. Select a layer, then use the resize handle at its corner.
      </p>

      <div style={{ position: "relative", width: "100%", maxWidth: 560, margin: "0 auto" }}>
        <svg
          viewBox={SHIRT_OUTLINE_VIEWBOX}
          style={{ width: "100%", height: "auto", display: "block", pointerEvents: "none" }}
        >
          <path
            d={SHIRT_OUTLINE_PATH}
            fill="#ffffff"
            stroke="#1f2937"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {SHIRT_DETAIL_PATHS.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="#1f2937"
              strokeWidth={i === 0 ? "1.3" : "1"}
              opacity={i === 0 ? 1 : 0.55}
            />
          ))}
        </svg>

        <div
          style={{
            position: "absolute",
            left: `${SHIRT_PRINT_AREA.left}%`,
            top: `${SHIRT_PRINT_AREA.top}%`,
            width: `${SHIRT_PRINT_AREA.width}%`,
            height: `${SHIRT_PRINT_AREA.height}%`,
          }}
        >
          <ZoneBox
            meta={meta}
            layers={zoneLayers[viewSide] || []}
            selectedLayerId={selectedLayerId}
            isActive={true}
            hideHeaderTag
            onSelect={() => onZoneSelect?.(viewSide)}
            onLayerSelect={(layerId) => onLayerSelect?.(viewSide, layerId)}
            onLayerChange={(layerId, updates) => onLayerChange?.(viewSide, layerId, updates)}
            onLayerRemove={(layerId) => onLayerRemove?.(viewSide, layerId)}
            onZoneClear={() => onZoneClear?.(viewSide)}
            onUploadClick={onUploadClick}
            printSizeInches={printSizeInches}
            bleedInches={bleedInches}
            safeMarginInches={safeMarginInches}
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
        <button
          type="button"
          className={`tsc-mode-btn${viewSide === "front" ? " active" : ""}`}
          onClick={() => handleToggle("front")}
        >
          Front side
        </button>
        <button
          type="button"
          className={`tsc-mode-btn${viewSide === "back" ? " active" : ""}`}
          onClick={() => handleToggle("back")}
        >
          Back side
        </button>
      </div>
    </div>
  );
}