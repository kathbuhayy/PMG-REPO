// src/components/TshirtCustomizer/TshirtZoneCanvas.js  (replace entire file)
import React, { useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import { SHAPE_PATHS } from "../../utils/shapeDefs";
import { buildPatternSvgDef } from "../../utils/patternDefs";
import { getCurveGeometry, buildArcPathD } from "../../utils/curvedText";
import "./TshirtCustomizer.css";

export const ZONE_META = [
  { id: "left_sleeve", label: "LEFT SLEEVE" },
  { id: "right_sleeve", label: "RIGHT SLEEVE" },
  { id: "left_side", label: "LEFT SIDE" },
  { id: "right_side", label: "RIGHT SIDE" },
  { id: "front", label: "FRONT" },
  { id: "back", label: "BACK" },
  { id: "outside", label: "OUTSIDE" },
  { id: "inside", label: "INSIDE" },
  { id: "front_cover", label: "FRONT COVER" },
  { id: "back_cover", label: "BACK COVER" },
  { id: "wrap", label: "WRAP" },
];

/**
 * Generic draggable/resizable box for ONE layer (image, text, shape,
 * or pattern). Uses the real .tsc-zone-design-layer / .tsc-text-layer
 * classes so the existing CSS (sizing, object-fit, selection outline)
 * applies correctly.
 */
function LayerBox({ layer, isActive, onSelect, onChange, onRemove }) {
  const wrapRef = useRef(null);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);

  const onPointerDown = useCallback(
    (e) => {
      e.stopPropagation();
      onSelect?.();
      e.currentTarget.setPointerCapture(e.pointerId);
      const rect = wrapRef.current.parentElement.getBoundingClientRect();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: layer.x,
        origY: layer.y,
        rectW: rect.width,
        rectH: rect.height,
      };
    },
    [layer, onSelect],
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!dragRef.current) return;
      const { startX, startY, origX, origY, rectW, rectH } = dragRef.current;
      const dx = ((e.clientX - startX) / rectW) * 100;
      const dy = ((e.clientY - startY) / rectH) * 100;
      onChange?.({
        x: Math.max(0, Math.min(100 - layer.w, origX + dx)),
        y: Math.max(0, Math.min(100 - layer.h, origY + dy)),
      });
    },
    [layer, onChange],
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onResizeDown = useCallback(
    (e) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const rect = wrapRef.current.parentElement.getBoundingClientRect();
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origW: layer.w,
        origH: layer.h,
        rectW: rect.width,
        rectH: rect.height,
      };
    },
    [layer],
  );

  const onResizeMove = useCallback(
    (e) => {
      if (!resizeRef.current) return;
      const { startX, startY, origW, origH, rectW, rectH } = resizeRef.current;
      const dw = ((e.clientX - startX) / rectW) * 100;
      const dh = ((e.clientY - startY) / rectH) * 100;
      onChange?.({
        w: Math.max(5, Math.min(100 - layer.x, origW + dw)),
        h: Math.max(5, Math.min(100 - layer.y, origH + dh)),
      });
    },
    [layer, onChange],
  );

  const onResizeUp = useCallback(() => {
    resizeRef.current = null;
  }, []);

  const boxStyle = {
    left: `${layer.x}%`,
    top: `${layer.y}%`,
    width: `${layer.w}%`,
    height: `${layer.h}%`,
  };

  const textStyle =
    layer.kind === "text"
      ? {
          fontFamily: layer.fontFamily,
          fontSize: `${layer.fontSize}cqh`,
          color: layer.color,
          fontWeight: layer.bold ? 700 : 400,
          fontStyle: layer.italic ? "italic" : "normal",
          textAlign: layer.align,
          WebkitTextStroke: layer.outline
            ? `${Math.max(1, layer.outlineWidth / 2)}px ${layer.outlineColor}`
            : undefined,
          textShadow: layer.shadow
            ? `0 0 ${layer.shadowBlur}px ${layer.shadowColor}`
            : undefined,
        }
      : undefined;

  return (
    <div
      ref={wrapRef}
      className={`tsc-zone-design-layer${layer.kind === "text" ? " tsc-text-layer" : ""}${isActive ? " active" : ""}`}
      style={boxStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {layer.kind === "image" ? (
        <img
          src={layer.imageUrl}
          alt="design"
          draggable={false}
          style={layer.rotation ? { transform: `rotate(${layer.rotation}deg)` } : undefined}
        />
      ) : layer.kind === "shape" ? (
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          style={layer.rotation ? { transform: `rotate(${layer.rotation}deg)` } : undefined}
        >
          <path d={SHAPE_PATHS[layer.shapeType] || SHAPE_PATHS.square} fill={layer.fillColor} />
        </svg>
      ) : layer.kind === "pattern" ? (
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          style={layer.rotation ? { transform: `rotate(${layer.rotation}deg)` } : undefined}
        >
          <defs>
            <pattern
              id={`pattern-${layer.id}`}
              width={layer.tileSize}
              height={layer.tileSize}
              patternUnits="userSpaceOnUse"
              dangerouslySetInnerHTML={{
                __html: buildPatternSvgDef(layer.patternType, layer.tileSize, layer.fillColor, layer.backgroundColor),
              }}
            />
          </defs>
          <rect width="100" height="100" fill={`url(#pattern-${layer.id})`} />
        </svg>
      ) : layer.kind === "text" && layer.curve ? (
        (() => {
          const fontUnits = (layer.fontSize / 100) * 200;
          const estWidth = Math.max(20, layer.text.length * fontUnits * 0.55);
          const geometry = getCurveGeometry(estWidth, layer.curve);
          const pathId = `curve-${layer.id}`;
          const pathD = geometry
            ? buildArcPathD(200, 100, geometry.radius, geometry.angleRad, layer.curve)
            : `M 20,100 L 380,100`;

          return (
            <svg viewBox="0 0 400 200" width="100%" height="100%" style={{ overflow: "visible" }}>
              <defs>
                <path id={pathId} d={pathD} fill="none" />
              </defs>
              <text
                fontFamily={layer.fontFamily}
                fontSize={fontUnits}
                fontWeight={layer.bold ? 700 : 400}
                fontStyle={layer.italic ? "italic" : "normal"}
                fill={layer.color}
                stroke={layer.outline ? layer.outlineColor : undefined}
                strokeWidth={layer.outline ? Math.max(1, layer.outlineWidth / 2) : undefined}
              >
                <textPath href={`#${pathId}`} xlinkHref={`#${pathId}`} startOffset="50%" textAnchor="middle">
                  {layer.text || "Text"}
                </textPath>
              </text>
            </svg>
          );
        })()
      ) : (
        <span className="tsc-text-layer-content" style={textStyle}>
          {layer.text || "Text"}
        </span>
      )}

      {isActive && (
        <>
          <button
            type="button"
            className="tsc-text-layer-remove"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove?.();
            }}
            title="Delete layer"
          >
            x
          </button>
          <div
            className={layer.kind === "text" ? "tsc-text-layer-resize" : "tsc-zone-resize-handle"}
            onPointerDown={onResizeDown}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
          />
        </>
      )}
    </div>
  );
}

// Reasonable reconstructions of the modal's quick-align tools, applied
// to whichever layer is currently selected.
function alignLayer(layer, mode) {
  switch (mode) {
    case "centerBoth":
      return { x: (100 - layer.w) / 2, y: (100 - layer.h) / 2 };
    case "centerX":
      return { x: (100 - layer.w) / 2 };
    case "centerY":
      return { y: (100 - layer.h) / 2 };
    case "rotateRight":
      return { rotation: ((layer.rotation || 0) + 90) % 360 };
    case "fit":
      return { x: 0, y: 0, w: 100, h: 100 };
    default:
      return {};
  }
}

export function ZoneBox({
  meta,
  layers = [],
  selectedLayerId,
  isActive,
  isInteractive = false,
  hideHeaderTag = false,
  onSelect,
  onExpand,
  onLayerSelect,
  onLayerChange,
  onLayerRemove,
  onZoneClear,
  onUploadClick,
  printSizeInches,
  bleedInches,
  safeMarginInches,
}) {
  const hasAnyLayer = layers.length > 0;
  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;

  const hasGuides = printSizeInches?.width > 0 && printSizeInches?.height > 0;
  const safeInsetX = hasGuides && safeMarginInches
    ? (safeMarginInches / printSizeInches.width) * 100
    : null;
  const safeInsetY = hasGuides && safeMarginInches
    ? (safeMarginInches / printSizeInches.height) * 100
    : null;

  return (
    <div className="tsc-zone-wrapper">
      {!hideHeaderTag && (
        <button
          type="button"
          className={`tsc-zone-header-tag${isActive ? " active" : ""}`}
          onClick={() => onSelect?.()}
        >
          <span className="tsc-zone-position-label">{meta.label}</span>
        </button>
      )}

      <div
        className={`tsc-zone-card${isActive ? " active" : ""}${hasAnyLayer ? " has-image" : ""}`}
        onClick={() => onSelect?.()}
      >
        <div className={`tsc-zone-inner tsc-zone${isActive ? " active" : ""}`}>
          <span className="tsc-zone-label">{meta.label}</span>

          <div className="tsc-zone-crosshair-h" />
          <div className="tsc-zone-crosshair-v" />

          {safeInsetX !== null && (
            <div
              className="tsc-safe-guide"
              style={{
                position: "absolute",
                top: `${safeInsetY}%`,
                left: `${safeInsetX}%`,
                right: `${safeInsetX}%`,
                bottom: `${safeInsetY}%`,
                border: "1.5px dashed #2563eb",
                pointerEvents: "none",
                zIndex: 1,
              }}
              title={`Safe area: keep important content ${safeMarginInches}in from the edge`}
            />
          )}

          {layers.map((layer) => (
            <LayerBox
              key={layer.id}
              layer={layer}
              isActive={selectedLayerId === layer.id}
              onSelect={() => onLayerSelect?.(layer.id)}
              onChange={(updates) => onLayerChange?.(layer.id, updates)}
              onRemove={() => onLayerRemove?.(layer.id)}
            />
          ))}

          {!hasAnyLayer && (
            <div
              className="tsc-zone-placeholder"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.();
              }}
            >
              <div
                className="tsc-zone-upload-trigger"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.();
                  onUploadClick?.(meta.id);
                }}
                title="Click to upload image"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              </div>
              <span className="tsc-zone-select-label">Click to select</span>
            </div>
          )}

          {hasAnyLayer && !isInteractive && (
            <>
              {onExpand && (
                <button
                  type="button"
                  className="tsc-zone-edit-btn"
                  title="Open advanced tools (align, rotate, zoom)"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.();
                    onExpand?.(meta);
                  }}
                >
                  &#9998;
                </button>
              )}
              <button
                type="button"
                className="tsc-zone-remove-btn"
                title="Remove all designs from this zone"
                onClick={(e) => {
                  e.stopPropagation();
                  onZoneClear?.();
                }}
              >
                x
              </button>
            </>
          )}
        </div>
      </div>

      {bleedInches > 0 && (
        <p
          style={{
            fontSize: 11,
            color: "#dc2626",
            margin: "4px 0 0",
            textAlign: "center",
          }}
        >
          Bleed: extend artwork {bleedInches}in past this edge
        </p>
      )}

      {isInteractive && hasAnyLayer && (
        <>
          {selectedLayer ? (
            <>
              <div className="tsc-zone-align-toolbar">
                <button type="button" className="tsc-align-btn" onClick={() => onLayerChange?.(selectedLayer.id, alignLayer(selectedLayer, "centerBoth"))}>Center</button>
                <button type="button" className="tsc-align-btn" onClick={() => onLayerChange?.(selectedLayer.id, alignLayer(selectedLayer, "centerX"))}>Center X</button>
                <button type="button" className="tsc-align-btn" onClick={() => onLayerChange?.(selectedLayer.id, alignLayer(selectedLayer, "centerY"))}>Center Y</button>
                {selectedLayer.kind === "image" && (
                  <button type="button" className="tsc-align-btn" onClick={() => onLayerChange?.(selectedLayer.id, alignLayer(selectedLayer, "rotateRight"))}>Rotate &#8635;</button>
                )}
                <button type="button" className="tsc-align-btn" onClick={() => onLayerChange?.(selectedLayer.id, alignLayer(selectedLayer, "fit"))}>Fit</button>
              </div>

              <div className="tsc-modal-zoom-bar">
                <span className="tsc-zoom-label">Zoom Scale</span>
                <input
                  type="range"
                  className="tsc-zoom-slider"
                  min={5}
                  max={100}
                  value={Math.round(selectedLayer.w || 80)}
                  onChange={(e) => {
                    const w = Number(e.target.value);
                    const h = selectedLayer.kind === "image" ? w : selectedLayer.h;
                    onLayerChange?.(selectedLayer.id, { w, h });
                  }}
                />
                <span className="tsc-zoom-label">{Math.round(selectedLayer.w || 80)}%</span>
              </div>

              <p className="tsc-crop-hint">Drag a layer to move it. Use the resize handle at its corner.</p>
            </>
          ) : (
            <p className="tsc-crop-hint">Select a layer above to align, rotate, or resize it.</p>
          )}
        </>
      )}
    </div>
  );
}

export default function TshirtZoneCanvas({
  zones = [],
  zoneLayers = {},
  selectedLayerId,
  activeZone,
  onZoneSelect,
  onLayerSelect,
  onLayerChange,
  onLayerRemove,
  onZoneClear,
  onUploadClick,
  aspectRatio,
  printSizeInches,
  bleedInches,
  safeMarginInches,
}) {
  const [modalZone, setModalZone] = React.useState(null);
  const visibleZones = ZONE_META.filter((m) => zones.includes(m.id));

  if (visibleZones.length === 0) {
    return (
      <div style={{ color: "#aab", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
        No print zones configured for this product.
      </div>
    );
  }

  return (
    <div className="tsc-canvas-wrap">
      <p className="tsc-canvas-hint">Drag directly on a layer to move it. Select a layer, then use the resize handle at its corner.</p>
      <div className="tsc-zone-grid">
        {visibleZones.map((meta) => (
          <ZoneBox
            key={meta.id}
            meta={meta}
            layers={zoneLayers[meta.id] || []}
            selectedLayerId={activeZone === meta.id ? selectedLayerId : null}
            isActive={activeZone === meta.id}
            onSelect={() => onZoneSelect(meta.id)}
            onExpand={(m) => setModalZone(m)}
            onLayerSelect={(layerId) => onLayerSelect?.(meta.id, layerId)}
            onLayerChange={(layerId, updates) => onLayerChange?.(meta.id, layerId, updates)}
            onLayerRemove={(layerId) => onLayerRemove?.(meta.id, layerId)}
            onZoneClear={() => onZoneClear?.(meta.id)}
            onUploadClick={onUploadClick}
            printSizeInches={printSizeInches}
            bleedInches={bleedInches}
            safeMarginInches={safeMarginInches}
          />
        ))}
      </div>

      {modalZone &&
        ReactDOM.createPortal(
          <div className="tsc-zone-modal-overlay" onClick={() => setModalZone(null)}>
            <div className="tsc-zone-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="tsc-zone-modal-header">
                <h3>Customize {modalZone.label}</h3>
                <button type="button" className="tsc-zone-modal-close" onClick={() => setModalZone(null)}>x</button>
              </div>

              <div className="tsc-zone-modal-body">
                <ZoneBox
                  meta={modalZone}
                  layers={zoneLayers[modalZone.id] || []}
                  selectedLayerId={selectedLayerId}
                  isActive={true}
                  isInteractive={true}
                  onSelect={() => onZoneSelect(modalZone.id)}
                  onLayerSelect={(layerId) => onLayerSelect?.(modalZone.id, layerId)}
                  onLayerChange={(layerId, updates) => onLayerChange?.(modalZone.id, layerId, updates)}
                  onLayerRemove={(layerId) => onLayerRemove?.(modalZone.id, layerId)}
                  onZoneClear={() => onZoneClear?.(modalZone.id)}
                  onUploadClick={onUploadClick}
                  printSizeInches={printSizeInches}
                  bleedInches={bleedInches}
                  safeMarginInches={safeMarginInches}
                />
              </div>

              <div className="tsc-zone-modal-actions">
                <button type="button" className="tsc-modal-upload-btn" onClick={() => onUploadClick?.(modalZone.id)}>
                  Upload Graphic
                </button>
                <button type="button" className="tsc-modal-done-btn" onClick={() => setModalZone(null)}>
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}