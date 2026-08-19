import React, { useState, useMemo } from "react";
import "./TshirtCustomizer.css";

/**
 * TshirtFlatPreview
 * Printify-style multi-angle mockup preview. Reads product.mockupViews
 * (calibrated by an admin via AdminMockupViews) and shows a thumbnail
 * row to switch between angles — each view has its own photo and its
 * own calibrated print-area rectangle, so "Folded" and "Front" can both
 * correctly composite the same front design at their own coordinates.
 *
 * Falls back to a simple front/back-only view using product.gallery if
 * no mockupViews have been calibrated yet, so nothing breaks for
 * products that haven't been set up in the admin tool.
 *
 * Props:
 *   product          {object}
 *   zoneDesigns      {object}
 *   zoneTexts        {object}
 */
function TshirtFlatPreview({ product, zoneDesigns = {}, zoneTexts = {} }) {
  const views = useMemo(() => {
    if (product?.mockupViews?.length > 0) return product.mockupViews;

    // Fallback: synthesize front/back views from the plain gallery photos
    // using the same box coordinates Edit mode uses, so old products still
    // show something reasonable before anyone calibrates real mockups.
    const fallback = [];
    if (product?.gallery?.[0]) {
      fallback.push({
        id: "fallback-front",
        label: "Front",
        imageUrl: product.gallery[0],
        side: "front",
        printArea: { x: 27, y: 30, w: 46, h: 40 },
      });
    }
    if (product?.gallery?.[1]) {
      fallback.push({
        id: "fallback-back",
        label: "Back",
        imageUrl: product.gallery[1],
        side: "back",
        printArea: { x: 27, y: 30, w: 46, h: 40 },
      });
    }
    return fallback;
  }, [product]);

  const [activeViewId, setActiveViewId] = useState(views[0]?.id);
  const activeView = views.find((v) => v.id === activeViewId) || views[0];

  if (!activeView) {
    return (
      <div style={{ color: "#aab", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
        No mockup photos available for this product yet.
      </div>
    );
  }

  const design = zoneDesigns[activeView.side];
  const texts = zoneTexts[activeView.side] || [];
  const { printArea } = activeView;

  return (
    <div className="tsc-flat-editor">
      <div className="tsc-flat-stage">
        <img className="tsc-flat-mockup-photo" src={activeView.imageUrl} alt={activeView.label} />

        <div
          className="tsc-flat-mockup-overlay"
          style={{
            left: `${printArea.x}%`,
            top: `${printArea.y}%`,
            width: `${printArea.w}%`,
            height: `${printArea.h}%`,
          }}
        >
          {design && (
            <div
              className="tsc-flat-mockup-design"
              style={{
                left: `${design.x}%`,
                top: `${design.y}%`,
                width: `${design.w}%`,
                height: `${design.h}%`,
                transform: design.rotation ? `rotate(${design.rotation}deg)` : undefined,
              }}
            >
              <img src={design.imageUrl} alt="" draggable={false} />
            </div>
          )}

          {texts.map((t) => (
            <div
              key={t.id}
              className="tsc-flat-mockup-text"
              style={{
                left: `${t.x}%`,
                top: `${t.y}%`,
                width: `${t.w}%`,
                height: `${t.h}%`,
                color: t.color || "#000",
                fontFamily: t.fontFamily || "Arial",
                fontSize: `${t.fontSize}cqh`,
                fontWeight: t.bold ? 700 : 400,
                fontStyle: t.italic ? "italic" : "normal",
                textAlign: t.align || "center",
                WebkitTextStroke: t.outline
                  ? `${Math.max(1, t.outlineWidth / 2)}px ${t.outlineColor}`
                  : undefined,
                textShadow: t.shadow
                  ? `0 0 ${t.shadowBlur}px ${t.shadowColor}`
                  : undefined,
              }}
            >
              {t.text || ""}
            </div>
          ))}
        </div>
      </div>

      <div className="tsc-flat-mockup-thumbs">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`tsc-flat-mockup-thumb${v.id === activeView.id ? " active" : ""}`}
            onClick={() => setActiveViewId(v.id)}
          >
            <img src={v.imageUrl} alt={v.label} />
            <span>{v.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default TshirtFlatPreview;