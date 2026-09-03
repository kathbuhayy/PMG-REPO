// src/components/TshirtCustomizer/FabricZoneCanvas.js  (new file)
/**
 * FabricZoneCanvas
 * Replaces TshirtZoneCanvas.js. Renders one real fabric.Canvas per
 * visible zone, sized to that zone's exact measured pixel dimensions
 * (zoneDimensions.js) - the same dimensions the 3D texture builder and
 * the SudoMock/Printful flatten step use, via the shared
 * fabricZoneRenderer.js. This is what makes a layer's x/y/w/h
 * percentage mean the same physical thing on every surface.
 *
 * Layer objects in fabric are built fresh from zoneLayers on every
 * change (see the rebuild effect below) - not diffed - so this
 * component never has its own notion of truth beyond what's already in
 * zoneLayers. Fabric's drag/resize/rotate interactions write back into
 * that state via onLayerChange; the next render rebuilds the canvas
 * from the updated state, and the previously-selected layer (by id) is
 * reselected so resize handles don't vanish after every edit.
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import * as fabric from "fabric";
import { buildFabricObjectFromLayer } from "../../utils/fabricZoneRenderer";
import { getZoneDimensions } from "../../utils/zoneDimensions";
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
 * One zone's interactive Fabric canvas. Mounts a real fabric.Canvas at
 * the zone's true pixel size, rebuilds its objects whenever `layers`
 * changes, and reports drag/resize/rotate/select/delete back through
 * the provided callbacks using the same x/y/w/h/rotation percentage
 * convention every other part of the customizer already uses.
 */
function FabricZoneBox({
  meta,
  layers = [],
  selectedLayerId,
  isActive,
  onSelect,
  onLayerSelect,
  onLayerChange,
  onLayerRemove,
  onZoneClear,
  onUploadClick,
  printSizeInches,
  bleedInches,
  safeMarginInches,
}) {
  const canvasElRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const wrapRef = useRef(null);

  const dims = getZoneDimensions(meta.id);
  const hasAnyLayer = layers.length > 0;

  // Kept as a ref so the rebuild effect (below) can read the *current*
  // selectedLayerId without needing it in its dependency array - we
  // don't want a selection-only change to trigger a full object rebuild,
  // only a genuine layers-array change should do that.
  const selectedLayerIdRef = useRef(selectedLayerId);
  selectedLayerIdRef.current = selectedLayerId;

  const onLayerChangeRef = useRef(onLayerChange);
  onLayerChangeRef.current = onLayerChange;

  const onLayerSelectRef = useRef(onLayerSelect);
  onLayerSelectRef.current = onLayerSelect;

  const onLayerRemoveRef = useRef(onLayerRemove);
  onLayerRemoveRef.current = onLayerRemove;

  // ── Mount the Fabric canvas once, wire up its event listeners ──────
  useEffect(() => {
    if (!canvasElRef.current) return undefined;

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: dims.width,
      height: dims.height,
      backgroundColor: "#ffffff",
      selection: true, // drag-to-select or shift-click for multi-select
    });
    fabricCanvasRef.current = canvas;

    // The canvas's internal resolution stays at the zone's real pixel
    // size (dims.width x dims.height) so object x/y/w/h percentage math
    // stays correct - only the on-screen CSS size is scaled to fit
    // whatever width the sidebar actually gives it. Using Fabric's own
    // setDimensions(..., { cssOnly: true }) instead of a plain CSS
    // width:100% rule keeps Fabric's pointer-to-canvas coordinate math
    // correct, which a naive CSS override would silently break for
    // dragging/resizing accuracy.
    const resizeToContainer = () => {
      const wrapEl = wrapRef.current;
      if (!wrapEl || !fabricCanvasRef.current) return;
      const { clientWidth, clientHeight } = wrapEl;
      if (clientWidth > 0 && clientHeight > 0) {
        fabricCanvasRef.current.setDimensions(
          { width: clientWidth, height: clientHeight },
          { cssOnly: true },
        );
      }
    };

    resizeToContainer();
    const resizeObserver = new ResizeObserver(resizeToContainer);
    if (wrapRef.current) resizeObserver.observe(wrapRef.current);

    const SNAP_THRESHOLD = 6; // px

    const clearGuides = () => {
      const ctx = canvas.contextTop;
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const drawGuide = (type, pos) => {
      const ctx = canvas.contextTop;
      if (!ctx) return;
      ctx.save();
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      if (type === "v") {
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, canvas.height);
      } else {
        ctx.moveTo(0, pos);
        ctx.lineTo(canvas.width, pos);
      }
      ctx.stroke();
      ctx.restore();
    };

    // Snaps the moving object's center to the zone's center or another
    // layer's center when within SNAP_THRESHOLD px, drawing a guide line
    // while it's snapped. Skipped for multi-object drags (activeSelection)
    // to keep that path simple.
    const onObjectMoving = (e) => {
      const obj = e.target;
      if (!obj || obj.type === "activeSelection") {
        clearGuides();
        return;
      }
      obj.setCoords();
      clearGuides();

      const zoneCenterX = dims.width / 2;
      const zoneCenterY = dims.height / 2;
      let objCenter = obj.getCenterPoint();
      let snappedX = false;
      let snappedY = false;

      if (Math.abs(objCenter.x - zoneCenterX) < SNAP_THRESHOLD) {
        obj.setPositionByOrigin(new fabric.Point(zoneCenterX, objCenter.y), "center", "center");
        drawGuide("v", zoneCenterX);
        snappedX = true;
      }
      if (Math.abs(objCenter.y - zoneCenterY) < SNAP_THRESHOLD) {
        objCenter = obj.getCenterPoint();
        obj.setPositionByOrigin(new fabric.Point(objCenter.x, zoneCenterY), "center", "center");
        drawGuide("h", zoneCenterY);
        snappedY = true;
      }

      canvas.getObjects().forEach((other) => {
        if (other === obj || !other.zoneLayerId) return;
        other.setCoords();
        const otherCenter = other.getCenterPoint();
        const current = obj.getCenterPoint();
        if (!snappedX && Math.abs(current.x - otherCenter.x) < SNAP_THRESHOLD) {
          obj.setPositionByOrigin(new fabric.Point(otherCenter.x, current.y), "center", "center");
          drawGuide("v", otherCenter.x);
          snappedX = true;
        }
        if (!snappedY && Math.abs(current.y - otherCenter.y) < SNAP_THRESHOLD) {
          const c2 = obj.getCenterPoint();
          obj.setPositionByOrigin(new fabric.Point(c2.x, otherCenter.y), "center", "center");
          drawGuide("h", otherCenter.y);
          snappedY = true;
        }
      });
    };

    const percentFromObject = (obj) => ({
      x: (obj.left / dims.width) * 100,
      y: (obj.top / dims.height) * 100,
      w: (obj.getScaledWidth() / dims.width) * 100,
      h: (obj.getScaledHeight() / dims.height) * 100,
      rotation: obj.angle || 0,
    });

    const handleModified = (e) => {
      const obj = e.target;
      if (!obj) return;
      clearGuides();

      // Multi-select drag/resize: emit one update per child layer. Each
      // child's getCenterPoint() already resolves to absolute canvas
      // coordinates regardless of the ActiveSelection's own transform,
      // which reading left/top directly off a grouped child would not.
      if (obj.type === "activeSelection" && typeof obj.forEachObject === "function") {
        obj.forEachObject((child) => {
          if (!child.zoneLayerId) return;
          child.setCoords();
          const center = child.getCenterPoint();
          const w = child.getScaledWidth();
          const h = child.getScaledHeight();
          onLayerChangeRef.current?.(child.zoneLayerId, {
            x: ((center.x - w / 2) / dims.width) * 100,
            y: ((center.y - h / 2) / dims.height) * 100,
            w: (w / dims.width) * 100,
            h: (h / dims.height) * 100,
            rotation: child.angle || 0,
          });
        });
        return;
      }

      if (!obj.zoneLayerId) return;
      onLayerChangeRef.current?.(obj.zoneLayerId, percentFromObject(obj));
    };

    const handleSelection = (e) => {
      const obj = e.selected?.[0];
      if (obj?.zoneLayerId) onLayerSelectRef.current?.(obj.zoneLayerId);
    };

    const handleSelectionCleared = () => {
      onLayerSelectRef.current?.(null);
    };

    const handleKeyDown = (evt) => {
      if (evt.key !== "Delete" && evt.key !== "Backspace") return;
      const active = canvas.getActiveObject();
      if (!active) return;
      evt.preventDefault();
      if (active.type === "activeSelection") {
        active.forEachObject((child) => {
          if (child.zoneLayerId) onLayerRemoveRef.current?.(child.zoneLayerId);
        });
      } else if (active.zoneLayerId) {
        onLayerRemoveRef.current?.(active.zoneLayerId);
      }
    };

    canvas.on("object:moving", onObjectMoving);
    canvas.on("mouse:up", clearGuides);
    canvas.on("object:modified", handleModified);
    canvas.on("selection:created", handleSelection);
    canvas.on("selection:updated", handleSelection);
    canvas.on("selection:cleared", handleSelectionCleared);

    const wrapEl = wrapRef.current;
    wrapEl?.addEventListener("keydown", handleKeyDown);

    return () => {
      wrapEl?.removeEventListener("keydown", handleKeyDown);
      canvas.off("object:moving", onObjectMoving);
      canvas.off("mouse:up", clearGuides);
      resizeObserver.disconnect();
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.id]); // one canvas per zone identity - not re-created on every prop change

  // ── Rebuild every Fabric object from `layers` whenever it changes ──
  // This is the "layers is the only source of truth" rule: rather than
  // patching individual Fabric objects to match state deltas, the whole
  // object set is thrown away and rebuilt fresh each time. Simpler and
  // impossible to drift from state, at the cost of a brief flicker per
  // edit and losing in-progress Fabric-only visual state (there isn't
  // any, since Fabric never holds anything zoneLayers doesn't already
  // have once object:modified has fired).
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let cancelled = false;

    (async () => {
      const objects = [];
      for (const layer of layers) {
        try {
          const obj = await buildFabricObjectFromLayer(layer, dims.width, dims.height);
          if (obj) objects.push(obj);
        } catch {
          // Skip layers that fail to build (e.g. a 404'd image URL)
          // rather than aborting the whole zone's rebuild.
        }
      }

      if (cancelled || !fabricCanvasRef.current) return;

      canvas.clear();
      canvas.backgroundColor = "#ffffff";
      objects.forEach((obj) => canvas.add(obj));

      // Restore selection by id so resize handles don't disappear after
      // every drag/edit (which triggers this same rebuild via the
      // onLayerChange -> parent state -> new `layers` reference cycle).
      const toReselect = objects.find((o) => o.zoneLayerId === selectedLayerIdRef.current);
      if (toReselect) {
        canvas.setActiveObject(toReselect);
      }

      canvas.renderAll();
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, dims.width, dims.height]);

  return (
    <div className="tsc-zone-wrapper">
      <div
        className={`tsc-zone-card${isActive ? " active" : ""}${hasAnyLayer ? " has-image" : ""}`}
        style={{ aspectRatio: `${dims.width} / ${dims.height}` }}
      >
        <div
          ref={wrapRef}
          className={`tsc-zone-inner tsc-zone${isActive ? " active" : ""}`}
          style={{ height: "100%", position: "relative" }}
          tabIndex={0}
        >
          <canvas ref={canvasElRef} style={{ position: "absolute", inset: 0 }} />

          {!hasAnyLayer && (
            <div
              className="tsc-zone-placeholder"
              style={{ position: "absolute", inset: 0 }}
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

          {printSizeInches?.width > 0 && printSizeInches?.height > 0 && safeMarginInches ? (
            <div
              className="tsc-safe-guide"
              style={{
                position: "absolute",
                top: `${(safeMarginInches / printSizeInches.height) * 100}%`,
                left: `${(safeMarginInches / printSizeInches.width) * 100}%`,
                right: `${(safeMarginInches / printSizeInches.width) * 100}%`,
                bottom: `${(safeMarginInches / printSizeInches.height) * 100}%`,
                border: "1.5px dashed #2563eb",
                pointerEvents: "none",
                zIndex: 1,
              }}
              title={`Safe area: keep important content ${safeMarginInches}in from the edge`}
            />
          ) : null}

          {hasAnyLayer && (
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
          )}
        </div>
      </div>

      {bleedInches > 0 && (
        <p style={{ fontSize: 11, color: "#dc2626", margin: "4px 0 0", textAlign: "center" }}>
          Bleed: extend artwork {bleedInches}in past this edge
        </p>
      )}
    </div>
  );
}

export default function FabricZoneCanvas({
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
  printSizeInches,
  bleedInches,
  safeMarginInches,
}) {
  const visibleZones = ZONE_META.filter((m) => zones.includes(m.id));

  if (visibleZones.length === 0) {
    return (
      <div style={{ color: "#aab", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
        No print zones configured for this product.
      </div>
    );
  }

  const currentMeta = visibleZones.find((m) => m.id === activeZone) || visibleZones[0];

  return (
    <div className="tsc-canvas-wrap">
      <p className="tsc-canvas-hint">Drag a layer to move it. Use its corner handle to resize, or the top handle to rotate.</p>

      {visibleZones.length > 1 && (
        <div className="tsc-zone-tabs">
          {visibleZones.map((meta) => {
            const hasContent = (zoneLayers[meta.id] || []).length > 0;
            const isActive = meta.id === currentMeta.id;
            return (
              <button
                key={meta.id}
                type="button"
                className={`tsc-zone-tab${isActive ? " active" : ""}`}
                onClick={() => onZoneSelect(meta.id)}
              >
                {meta.label}
                {hasContent && <span className="tsc-zone-tab-dot" />}
              </button>
            );
          })}
        </div>
      )}

      {/* key={currentMeta.id} forces a fresh mount/unmount per zone
          switch, rather than reusing one mutable canvas instance - the
          Fabric canvas is rebuilt from zoneLayers[currentMeta.id] every
          time anyway (see the rebuild effect above), so nothing is lost. */}
      <div className="tsc-zone-stage">
        <FabricZoneBox
          key={currentMeta.id}
          meta={currentMeta}
          layers={zoneLayers[currentMeta.id] || []}
          selectedLayerId={selectedLayerId}
          isActive
          onLayerSelect={(layerId) => onLayerSelect?.(currentMeta.id, layerId)}
          onLayerChange={(layerId, updates) => onLayerChange?.(currentMeta.id, layerId, updates)}
          onLayerRemove={(layerId) => onLayerRemove?.(currentMeta.id, layerId)}
          onZoneClear={() => onZoneClear?.(currentMeta.id)}
          onUploadClick={onUploadClick}
          printSizeInches={printSizeInches}
          bleedInches={bleedInches}
          safeMarginInches={safeMarginInches}
        />
      </div>
    </div>
  );
}