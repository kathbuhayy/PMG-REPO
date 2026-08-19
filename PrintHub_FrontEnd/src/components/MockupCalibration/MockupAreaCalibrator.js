import React, { useCallback, useRef } from "react";
import "./MockupCalibration.css";

/**
 * MockupAreaCalibrator
 * Drag/resize a rectangle over a photo to mark where the print area sits
 * on that specific image. Percent-based drag/resize math, similar to
 * ZoneBox in the customizer, but simplified — no image/text layers
 * inside, just a boundary marker.
 *
 * Props:
 *   imageUrl {string}
 *   area     {x, y, w, h}  — percentages
 *   onChange {fn}          — (area) => void
 */
function MockupAreaCalibrator({ imageUrl, area, onChange }) {
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);

  const onPointerDown = useCallback(
    (e) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const rect = containerRef.current.getBoundingClientRect();
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: area.x,
        origY: area.y,
        rectW: rect.width,
        rectH: rect.height,
      };
    },
    [area]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!dragRef.current) return;
      const { startX, startY, origX, origY, rectW, rectH } = dragRef.current;
      const dx = ((e.clientX - startX) / rectW) * 100;
      const dy = ((e.clientY - startY) / rectH) * 100;
      onChange({
        ...area,
        x: Math.max(0, Math.min(100 - area.w, origX + dx)),
        y: Math.max(0, Math.min(100 - area.h, origY + dy)),
      });
    },
    [area, onChange]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onResizePointerDown = useCallback(
    (e) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const rect = containerRef.current.getBoundingClientRect();
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origW: area.w,
        origH: area.h,
        rectW: rect.width,
        rectH: rect.height,
      };
    },
    [area]
  );

  const onResizePointerMove = useCallback(
    (e) => {
      if (!resizeRef.current) return;
      const { startX, startY, origW, origH, rectW, rectH } = resizeRef.current;
      const dw = ((e.clientX - startX) / rectW) * 100;
      const dh = ((e.clientY - startY) / rectH) * 100;
      onChange({
        ...area,
        w: Math.max(5, Math.min(100 - area.x, origW + dw)),
        h: Math.max(5, Math.min(100 - area.y, origH + dh)),
      });
    },
    [area, onChange]
  );

  const onResizePointerUp = useCallback(() => {
    resizeRef.current = null;
  }, []);

  return (
    <div className="mac-container" ref={containerRef}>
      <img className="mac-photo" src={imageUrl} alt="" draggable={false} />
      <div
        className="mac-area-box"
        style={{
          left: `${area.x}%`,
          top: `${area.y}%`,
          width: `${area.w}%`,
          height: `${area.h}%`,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="mac-resize-handle"
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
        />
      </div>
    </div>
  );
}

export default MockupAreaCalibrator;