/**
 * FlatZoneCanvas
 * Renders print zones for flat products (Business Card, Banner, Sticker, Hang Tag, Brochure).
 * Zone metadata is config-driven per productType.
 *
 * Props:
 *   productType    {string}    – dbCategory value (e.g. "calling_card", "banners")
 *   zones          {string[]}  – active zone ids for this product
 *   zoneDesigns    {object}    – { zoneId: { imageUrl, x, y, w, h } | null }
 *   activeZone     {string}    – currently selected zone id
 *   onZoneSelect   {fn}        – called with zoneId when a zone is clicked
 *   onZoneDesignChange {fn}    – called with (zoneId, layer) where layer is { imageUrl, x, y, w, h } | null
 */
import React, { useCallback, useRef, useState } from "react";
import ReactDOM from "react-dom";
import "../TshirtCustomizer/TshirtCustomizer.css";

const ZONES_BY_TYPE = {
  calling_card: [
    { id: "front", label: "FRONT", col: 1, row: 1 },
    { id: "back", label: "BACK", col: 2, row: 1 },
  ],
  banners: [{ id: "front", label: "FRONT", col: 1, row: 1 }],
  stickers: [{ id: "front", label: "FRONT", col: 1, row: 1 }],
  hang_tags: [
    { id: "front", label: "FRONT", col: 1, row: 1 },
    { id: "back", label: "BACK", col: 2, row: 1 },
  ],
  brochures: [
    { id: "outside", label: "OUTSIDE", col: 1, row: 1 },
    { id: "inside", label: "INSIDE", col: 2, row: 1 },
  ],
};

function TextLayerBox({ text, isActive, onSelect, onChange, onRemove }) {
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
        origX: text.x,
        origY: text.y,
        rectW: rect.width,
        rectH: rect.height,
      };
    },
    [text, onSelect],
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!dragRef.current) return;
      const { startX, startY, origX, origY, rectW, rectH } = dragRef.current;
      const dx = ((e.clientX - startX) / rectW) * 100;
      const dy = ((e.clientY - startY) / rectH) * 100;
      onChange?.({
        x: Math.max(0, Math.min(100 - text.w, origX + dx)),
        y: Math.max(0, Math.min(100 - text.h, origY + dy)),
      });
    },
    [text, onChange],
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
        origW: text.w,
        origH: text.h,
        rectW: rect.width,
        rectH: rect.height,
      };
    },
    [text],
  );

  const onResizeMove = useCallback(
    (e) => {
      if (!resizeRef.current) return;
      const { startX, startY, origW, origH, rectW, rectH } = resizeRef.current;
      const dw = ((e.clientX - startX) / rectW) * 100;
      const dh = ((e.clientY - startY) / rectH) * 100;
      onChange?.({
        w: Math.max(10, Math.min(100 - text.x, origW + dw)),
        h: Math.max(6, Math.min(100 - text.y, origH + dh)),
      });
    },
    [text, onChange],
  );

  const onResizeUp = useCallback(() => {
    resizeRef.current = null;
  }, []);

  const textStyle = {
    fontFamily: text.fontFamily,
    fontSize: `${text.fontSize}cqh`,
    color: text.color,
    fontWeight: text.bold ? 700 : 400,
    fontStyle: text.italic ? "italic" : "normal",
    textAlign: text.align,
    WebkitTextStroke: text.outline
      ? `${Math.max(1, text.outlineWidth / 2)}px ${text.outlineColor}`
      : undefined,
    textShadow: text.shadow
      ? `0 0 ${text.shadowBlur}px ${text.shadowColor}`
      : undefined,
  };

  return (
    <div
      ref={wrapRef}
      className={`tsc-text-layer${isActive ? " active" : ""}`}
      style={{
        left: `${text.x}%`,
        top: `${text.y}%`,
        width: `${text.w}%`,
        height: `${text.h}%`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <span className="tsc-text-layer-content" style={textStyle}>
        {text.text || "Text"}
      </span>
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
          >
            ×
          </button>
          <div
            className="tsc-text-layer-resize"
            onPointerDown={onResizeDown}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeUp}
          />
        </>
      )}
    </div>
  );
}

function ZoneBox({
  meta,
  design,
  texts = [],
  activeTextId,
  isActive,
  isInteractive = false,
  onSelect,
  onExpand,
  onDesignChange,
  onUploadClick,
  onAddText,
  onTextSelect,
  onTextChange,
  onTextRemove,
  aspectRatio,
}) {
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);

  const onImgPointerDown = useCallback(
    (e) => {
      if (!design) return;
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
    [design],
  );

  const onImgPointerMove = useCallback(
    (e) => {
      if (!dragRef.current || !design) return;
      const { startX, startY, origX, origY, rectW, rectH } = dragRef.current;
      const dx = ((e.clientX - startX) / rectW) * 100;
      const dy = ((e.clientY - startY) / rectH) * 100;
      onDesignChange?.({
        ...design,
        x: Math.max(0, Math.min(100 - design.w, origX + dx)),
        y: Math.max(0, Math.min(100 - design.h, origY + dy)),
      });
    },
    [design, onDesignChange],
  );

  const onImgPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onResizePointerDown = useCallback(
    (e) => {
      if (!design) return;
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
    [design],
  );

  const onResizePointerMove = useCallback(
    (e) => {
      if (!resizeRef.current || !design) return;
      const { startX, startY, origW, origH, rectW, rectH } = resizeRef.current;
      const dw = ((e.clientX - startX) / rectW) * 100;
      const dh = ((e.clientY - startY) / rectH) * 100;
      onDesignChange?.({
        ...design,
        w: Math.max(10, Math.min(100 - design.x, origW + dw)),
        h: Math.max(10, Math.min(100 - design.y, origH + dh)),
      });
    },
    [design, onDesignChange],
  );

  const onResizePointerUp = useCallback(() => {
    resizeRef.current = null;
  }, []);

  // Zoom change handler to scale image proportionally
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
    <div
      className={`tsc-zone${isActive ? " active" : ""}${
        design ? " has-image" : ""
      }`}
      onClick={() => {
        onSelect?.();
      }}
    >
      <div
        className="tsc-zone-inner"
        ref={containerRef}
        style={aspectRatio ? { aspectRatio: String(aspectRatio) } : undefined}
      >
        {design ? (
          <>
            {/* Floating edit pencil and remove buttons in grid view */}
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
                  className="tsc-zone-addtext-btn"
                  title="Add text"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect?.();
                    onAddText?.(meta.id);
                  }}
                >
                  + T
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

            <div
              className="tsc-zone-design-layer"
              style={{
                left: `${design.x}%`,
                top: `${design.y}%`,
                width: `${design.w}%`,
                height: `${design.h}%`,
              }}
              onPointerDown={onImgPointerDown}
              onPointerMove={onImgPointerMove}
              onPointerUp={onImgPointerUp}
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
              <div
                className="tsc-zone-resize-handle"
                onPointerDown={onResizePointerDown}
                onPointerMove={onResizePointerMove}
                onPointerUp={onResizePointerUp}
              />
            </div>

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
                  width="28"
                  height="28"
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

        {/* Text layers render above image/placeholder — draggable directly */}
        {texts.map((t) => (
          <TextLayerBox
            key={t.id}
            text={t}
            isActive={activeTextId === t.id}
            onSelect={() => handleTextBoxSelect(t.id)}
            onChange={(updates) => onTextChange?.(t.id, updates)}
            onRemove={() => onTextRemove?.(t.id)}
          />
        ))}
      </div>

      <div className="tsc-zone-label">{meta.label}</div>

      {/* Alignment and zoom bar in interactive orientation modal mode */}
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
  );
}

export default function FlatZoneCanvas({
  productType,
  zones = [],
  zoneTexts,
  zoneDesigns = {},
  activeZone,
  onZoneSelect,
  onZoneDesignChange,
  activeTextId,
  onAddText,
  onTextSelect,
  onTextChange,
  onTextRemove,
  onUploadClick,
  aspectRatio,
}) {
  const [modalZone, setModalZone] = useState(null);
  const allMeta = ZONES_BY_TYPE[productType] || [];
  const visibleZones = allMeta.filter((m) => zones.includes(m.id));

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
      <p className="tsc-canvas-hint">
        Click a zone to upload graphics.
      </p>
      <div className="tsc-zone-grid">
        {visibleZones.map((meta) => (
          <ZoneBox
            key={meta.id}
            meta={meta}
            design={zoneDesigns[meta.id] || null}
            texts={zoneTexts[meta.id] || []}
            activeTextId={activeZone === meta.id ? activeTextId : null}
            isActive={activeZone === meta.id}
            onSelect={() => onZoneSelect(meta.id)}
            onExpand={(m) => setModalZone(m)}
            onDesignChange={(layer) => onZoneDesignChange(meta.id, layer)}
            onAddText={onAddText}
            onTextSelect={(textId) => onTextSelect?.(meta.id, textId)}
            onTextChange={(textId, updates) => onTextChange?.(meta.id, textId, updates)}
            onTextRemove={(textId) => onTextRemove?.(meta.id, textId)}
            onUploadClick={onUploadClick}
            aspectRatio={aspectRatio}
          />
        ))}
      </div>

      {/* Orientation and Crop Modal */}
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
                  texts={zoneTexts[meta.id] || []}
                  activeTextId={activeZone === meta.id ? activeTextId : null}
                  isActive={true}
                  isInteractive={true}
                  onSelect={() => onZoneSelect(modalZone.id)}
                  onDesignChange={(layer) =>
                    onZoneDesignChange(modalZone.id, layer)
                  }
                  onAddText={onAddText}
                  onTextSelect={(textId) => onTextSelect?.(modalZone.id, textId)}
                  onTextChange={(textId, updates) => onTextChange?.(modalZone.id, textId, updates)}
                  onTextRemove={(textId) => onTextRemove?.(modalZone.id, textId)}
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

