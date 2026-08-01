/**
 * TshirtZoneCanvas
 * Renders a 2×2 grid of print zones. Each zone supports drag and resize
 * for a placed image. Clicking an empty zone selects it as the active target.
 *
 * Props:
 *   zones          {string[]}  – active zone ids for this product
 *   zoneDesigns    {object}    – { zoneId: { imageUrl, x, y, w, h } | null }
 *   activeZone     {string}    – currently selected zone id
 *   onZoneSelect   {fn}        – called with zoneId when a zone is clicked
 *   onZoneDesignChange {fn}    – called with (zoneId, layer) where layer is { imageUrl, x, y, w, h } | null
 */
import React, { useCallback, useRef } from "react";
import ReactDOM from "react-dom";
import "./TshirtCustomizer.css";

const ZONE_META = [
  { id: "left_sleeve", label: "LEFT SLEEVE", col: 1, row: 1 },
  { id: "right_sleeve", label: "RIGHT SLEEVE", col: 2, row: 1 },
  { id: "left_side", label: "LEFT SIDE", col: 1, row: 1 },
  { id: "right_side", label: "RIGHT SIDE", col: 2, row: 1 },
  { id: "front", label: "FRONT", col: 1, row: 2 },
  { id: "back", label: "BACK", col: 2, row: 2 },
  { id: "outside", label: "OUTSIDE", col: 1, row: 3 },
  { id: "inside", label: "INSIDE", col: 2, row: 3 },
  { id: "front_cover", label: "FRONT COVER", col: 1, row: 4 },
  { id: "back_cover", label: "BACK COVER", col: 2, row: 4 },
  { id: "wrap", label: "WRAP", col: 1, row: 5 },
];

function ZoneBox({
  meta,
  design,
  isActive,
  isInteractive = false,
  onSelect,
  onExpand,
  onDesignChange,
  onUploadClick,
  aspectRatio,
}) {
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);

  // ── drag ──────────────────────────────────────────────────────────
  const onImgPointerDown = useCallback(
    (e) => {
      if (!design || !isInteractive) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const rect = containerRef.current.getBoundingClientRect();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: design.x,
        origY: design.y,
        rectW: rect.width,
        rectH: rect.height,
      };
    },
    [design, isInteractive],
  );

  const onImgPointerMove = useCallback(
    (e) => {
      if (!dragRef.current || !design || !isInteractive) return;
      const { startX, startY, origX, origY, rectW, rectH } = dragRef.current;
      const dx = ((e.clientX - startX) / rectW) * 100;
      const dy = ((e.clientY - startY) / rectH) * 100;
      onDesignChange?.({
        ...design,
        x: Math.max(0, Math.min(100 - design.w, origX + dx)),
        y: Math.max(0, Math.min(100 - design.h, origY + dy)),
      });
    },
    [design, isInteractive, onDesignChange],
  );

  const onImgPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // ── resize ─────────────────────────────────────────────────────────
  const onResizePointerDown = useCallback(
    (e) => {
      if (!design || !isInteractive) return;
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const rect = containerRef.current.getBoundingClientRect();
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origW: design.w,
        origH: design.h,
        rectW: rect.width,
        rectH: rect.height,
      };
    },
    [design, isInteractive],
  );

  const onResizePointerMove = useCallback(
    (e) => {
      if (!resizeRef.current || !design || !isInteractive) return;
      const { startX, startY, origW, origH, rectW, rectH } = resizeRef.current;
      const dw = ((e.clientX - startX) / rectW) * 100;
      const dh = ((e.clientY - startY) / rectH) * 100;
      onDesignChange?.({
        ...design,
        w: Math.max(10, Math.min(100 - design.x, origW + dw)),
        h: Math.max(10, Math.min(100 - design.y, origH + dh)),
      });
    },
    [design, isInteractive, onDesignChange],
  );

  const onResizePointerUp = useCallback(() => {
    resizeRef.current = null;
  }, []);

  // Zoom change handler to scale placed image proportionally
  const handleZoomChange = (e) => {
    const scale = Number(e.target.value);
    if (!design || !onDesignChange) return;
    const oldW = design.w;
    const oldH = design.h;
    const centerPctX = design.x + oldW / 2;
    const centerPctY = design.y + oldH / 2;
    const newW = Math.max(10, Math.min(100, scale));
    const newH = Math.max(10, Math.min(100, scale));
    onDesignChange({
      ...design,
      w: newW,
      h: newH,
      x: Math.max(0, Math.min(100 - newW, centerPctX - newW / 2)),
      y: Math.max(0, Math.min(100 - newH, centerPctY - newH / 2)),
    });
  };

  const centerBoth = (e) => {
    e.stopPropagation();
    if (!design || !onDesignChange) return;
    onDesignChange({
      ...design,
      x: (100 - design.w) / 2,
      y: (100 - design.h) / 2,
    });
  };

  const centerX = (e) => {
    e.stopPropagation();
    if (!design || !onDesignChange) return;
    onDesignChange({
      ...design,
      x: (100 - design.w) / 2,
    });
  };

  const centerY = (e) => {
    e.stopPropagation();
    if (!design || !onDesignChange) return;
    onDesignChange({
      ...design,
      y: (100 - design.h) / 2,
    });
  };

  const rotateRight = (e) => {
    e.stopPropagation();
    if (!design || !onDesignChange) return;
    onDesignChange({
      ...design,
      rotation: ((design.rotation || 0) + 90) % 360,
    });
  };

  const fitZone = (e) => {
    e.stopPropagation();
    if (!design || !onDesignChange) return;
    onDesignChange({
      ...design,
      w: 80,
      h: 80,
      x: 10,
      y: 10,
    });
  };

  return (
    <div className={`tsc-zone-wrapper${isActive ? " active" : ""}`}>
      {/* OUTSIDE TOP HEADER TAB — CLICKABLE TO SELECT FOR GALLERY INJECTION */}
      <div
        className={`tsc-zone-header-tag${isActive ? " active" : ""}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        title={`Click to select ${meta.label} for gallery injection`}
      >
        <span className="tsc-zone-position-label">
          {meta.label} DESIGN
        </span>
      </div>

      {/* SOLID-BORDERED PICTURE CARD */}
      <div
        className={`tsc-zone-card${isActive ? " active" : ""}${
          design ? " has-image" : ""
        }`}
        onClick={() => {
          onSelect?.();
        }}
      >
        <div
          className="tsc-zone-inner"
          ref={containerRef}
          style={{ aspectRatio: "1 / 1" }}
        >
          {/* Render Crosshairs & Crop Brackets ONLY when interactive in modal */}
          {isInteractive && (
            <>
              <div className="tsc-corner-tl" />
              <div className="tsc-corner-tr" />
              <div className="tsc-corner-bl" />
              <div className="tsc-corner-br" />
              <div className="tsc-zone-crosshair-h" />
              <div className="tsc-zone-crosshair-v" />
            </>
          )}

          {design ? (
            <>
              {/* Floating Edit and Remove buttons in non-interactive grid view */}
              {!isInteractive && (
                <>
                  <button
                    type="button"
                    className="tsc-zone-edit-btn"
                    title="Click to edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect?.();
                      onExpand?.(meta);
                    }}
                  >
                    ✎
                  </button>

                  <button
                    type="button"
                    className="tsc-zone-remove-btn"
                    title="Remove design from this zone"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDesignChange?.(null);
                    }}
                  >
                    ×
                  </button>
                </>
              )}



              {/* placed image layer */}
              <div
                className="tsc-zone-design-layer"
                style={{
                  left: `${design.x}%`,
                  top: `${design.y}%`,
                  width: `${design.w}%`,
                  height: `${design.h}%`,
                }}
                onPointerDown={isInteractive ? onImgPointerDown : undefined}
                onPointerMove={isInteractive ? onImgPointerMove : undefined}
                onPointerUp={isInteractive ? onImgPointerUp : undefined}
              >

                <img
                  src={design.imageUrl}
                  alt="design"
                  draggable={false}
                  style={
                    design.rotation
                      ? { transform: `rotate(${design.rotation}deg)` }
                      : undefined
                  }
                />
                {isInteractive && (
                  <div
                    className="tsc-zone-resize-handle"
                    onPointerDown={onResizePointerDown}
                    onPointerMove={onResizePointerMove}
                    onPointerUp={onResizePointerUp}
                  />
                )}
              </div>

              {/* clear button in interactive mode */}
              {isInteractive && (
                <button
                  type="button"
                  className="tsc-zone-clear-btn"
                  title="Remove design from this zone"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDesignChange?.(null);
                  }}
                >
                  ×
                </button>
              )}
            </>
          ) : (
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
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <path d="M12 8v8M8 12h8" />
                </svg>
              </div>
              <span className="tsc-zone-select-label">
                Click to select
              </span>
            </div>
          )}
        </div>


        {/* Alignment & Zoom Bar in interactive orientation modal mode */}
        {isInteractive && design && (
          <>
            <div className="tsc-zone-align-toolbar">
              <button
                type="button"
                className="tsc-align-btn"
                title="Center both X & Y"
                onClick={centerBoth}
              >
                Center
              </button>
              <button
                type="button"
                className="tsc-align-btn"
                title="Center Horizontally"
                onClick={centerX}
              >
                Center X
              </button>
              <button
                type="button"
                className="tsc-align-btn"
                title="Center Vertically"
                onClick={centerY}
              >
                Center Y
              </button>
              <button
                type="button"
                className="tsc-align-btn"
                title="Rotate 90 degrees"
                onClick={rotateRight}
              >
                Rotate ↻
              </button>
              <button
                type="button"
                className="tsc-align-btn"
                title="Reset to 80% Fit"
                onClick={fitZone}
              >
                Fit
              </button>
            </div>

            <div className="tsc-modal-zoom-bar">
              <span className="tsc-zoom-label">Zoom Scale</span>
              <input
                type="range"
                className="tsc-zoom-slider"
                min={20}
                max={100}
                value={Math.round(design.w || 80)}
                onChange={handleZoomChange}
              />
              <span className="tsc-zoom-label">
                {Math.round(design.w || 80)}%
              </span>
            </div>

            <p className="tsc-crop-hint">
              Drag design to pan/crop inside zone limits.
            </p>
          </>
        )}
      </div>
    </div>
  );

}

export default function TshirtZoneCanvas({
  zones = [],
  zoneDesigns = {},
  activeZone,
  onZoneSelect,
  onZoneDesignChange,
  onUploadClick,
  aspectRatio,
}) {
  const [modalZone, setModalZone] = React.useState(null);
  const visibleZones = ZONE_META.filter((m) => zones.includes(m.id));

  if (visibleZones.length === 0) {
    return (
      <div
        style={{
          color: "#aab",
          fontSize: 13,
          textAlign: "center",
          padding: "20px 0",
        }}
      >
        No print zones configured for this product.
      </div>
    );
  }

  return (
    <div className="tsc-canvas-wrap">
      <p className="tsc-canvas-hint">Click a zone to customize it.</p>
      <div className="tsc-zone-grid">
        {visibleZones.map((meta) => (
          <ZoneBox
            key={meta.id}
            meta={meta}
            design={zoneDesigns[meta.id] || null}
            isActive={activeZone === meta.id}
            onSelect={() => onZoneSelect(meta.id)}
            onExpand={(m) => setModalZone(m)}
            onDesignChange={(layer) => onZoneDesignChange(meta.id, layer)}
            onUploadClick={onUploadClick}
            aspectRatio={aspectRatio}
          />
        ))}
      </div>

      {/* Mobile Zone Customizer Modal (Portaled to document.body for true Screen X & Y centering) */}
      {modalZone &&
        ReactDOM.createPortal(
          <div
            className="tsc-zone-modal-overlay"
            onClick={() => setModalZone(null)}
          >
            <div
              className="tsc-zone-modal-card"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="tsc-zone-modal-header">
                <h3>Customize {modalZone.label}</h3>
                <button
                  type="button"
                  className="tsc-zone-modal-close"
                  onClick={() => setModalZone(null)}
                >
                  ×
                </button>
              </div>

              <div className="tsc-zone-modal-body">
                <ZoneBox
                  meta={modalZone}
                  design={zoneDesigns[modalZone.id] || null}
                  isActive={true}
                  isInteractive={true}
                  onSelect={() => onZoneSelect(modalZone.id)}
                  onDesignChange={(layer) =>
                    onZoneDesignChange(modalZone.id, layer)
                  }
                  onUploadClick={onUploadClick}
                  aspectRatio={aspectRatio}
                />
              </div>

              <div className="tsc-zone-modal-actions">
                <button
                  type="button"
                  className="tsc-modal-upload-btn"
                  onClick={() => {
                    onUploadClick?.(modalZone.id);
                  }}
                >
                  Upload Graphic
                </button>
                <button
                  type="button"
                  className="tsc-modal-done-btn"
                  onClick={() => setModalZone(null)}
                >
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
