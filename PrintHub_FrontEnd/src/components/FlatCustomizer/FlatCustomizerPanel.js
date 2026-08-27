/**
 * FlatCustomizerPanel
 * Shared customizer for flat print products: Business Card, Banner,
 * Sticker & Label, Hang Tag, and Brochure. Reads product.dbCategory
 * to select the correct labels, AI prompt suffix, and zone config.
 *
 * Props:
 *   product       {object}         – product with print_zones and dbCategory
 *   onDesignReady {fn}             – called with { type, zones, baseColor, ... }
 *   onClear       {fn}             – called when user removes the active design
 *   activeDesign  {object|null}    – currently applied design meta
 */
import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  FaCheckCircle,
  FaListUl,
  FaPalette,
  FaImage,
  FaMagic,
} from "react-icons/fa";
import { FaFont } from "react-icons/fa";
import { useCustomizerUpload } from "../../hooks/useCustomizerUpload";
import AIGeneratePanel from "../AIBuilder/AIGeneratePanel";
import FlatZoneCanvas from "./FlatZoneCanvas";
import FlatPreview3D from "./FlatPreview3D";
import { parseFlatSize } from "../../utils/parseFlatSize";
import { removeGuestDesign } from "../../utils/guestDesigns";
import "../TshirtCustomizer/TshirtCustomizer.css";
import { filterZonesBySide } from "../../config/categoryDefaults";



const TEXT_FONTS = ["Arial","Helvetica","Times New Roman","Georgia","Courier New","Verdana","Impact","Comic Sans MS","Trebuchet MS"];

const PANEL_CONFIG = {
  calling_card: {
    label: "Business Card",
    colorLabel: "CARD COLOR",
    aiSuffix: "business card print design, professional, clean layout",
  },
  banners: {
    label: "Banner",
    colorLabel: "BANNER COLOR",
    aiSuffix: "large format banner design, bold, high contrast",
  },
  stickers: {
    label: "Sticker",
    colorLabel: "STICKER COLOR",
    aiSuffix: "sticker or label design, vibrant, transparent background",
  },
  hang_tags: {
    label: "Hang Tag",
    colorLabel: "TAG COLOR",
    aiSuffix: "hang tag print design, elegant, compact layout",
  },
  brochures: {
    label: "Brochure",
    colorLabel: "PAPER COLOR",
    aiSuffix: "brochure layout design, informative, professional",
  },
};

function createTextLayer() {
  return {
    id: `text_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    text: "Your Text", x: 15, y: 40, w: 70, h: 20,
    fontFamily: "Arial", fontSize: 12, color: "#000000",
    bold: false, italic: false, align: "center",
    outline: false, outlineColor: "#ffffff", outlineWidth: 3,
    shadow: false, shadowColor: "#000000", shadowBlur: 4,
  };
}

// Convert hue (0-360) to hex at full saturation/lightness=50%
function hueToHex(hue) {
  const h = hue / 360;
  const s = 1;
  const l = 0.5;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}



export default function FlatCustomizerPanel({
  product,
  onDesignReady,
  onClear,
  activeDesign,
  selectedSide = "",
  selectedSize = "",
  initialWip = null,
  onWipChange,
}) {
  const [zoneTexts, setZoneTexts] = useState(() => initialWip?.zoneTexts ?? {});
  const [activeTextId, setActiveTextId] = useState(initialWip?.activeTextId ?? null);
  const productType = product?.dbCategory || "calling_card";
  const config = PANEL_CONFIG[productType] || PANEL_CONFIG.calling_card;
  const zones = useMemo(() => {
    return filterZonesBySide(
      product?.print_zones || [],
      selectedSide,
      productType,
    );
  }, [product?.print_zones, selectedSide, productType]);

  // Compute aspect ratio for 2D zone canvas
  const aspectRatio = useMemo(() => {
    if (!selectedSize) return null;
    const parsed = parseFlatSize(selectedSize);
    return parsed ? parsed.width / parsed.height : null;
  }, [selectedSize]);

    // Real print size in inches, for converting the product's admin-set
  // bleed/safe-margin values into on-canvas guide percentages.
  const printSizeInches = useMemo(() => {
    if (!selectedSize) return null;
    return parseFlatSize(selectedSize);
  }, [selectedSize]);

  const {
    gallery,
    setGallery,
    selectedGalleryId,
    setSelectedGalleryId,
    uploadError,
    handleFileChange,
    handleGenerate,
    generating,
    genError,
    setGenError,
    generating3D,
    gen3DError,
    setGen3DError,
    model3D,
    setModel3D,
    handleGenerate3D,
    uploadUsedImages,
  } = useCustomizerUpload(
    config.label,
    // Strip dead blob: URLs from restored gallery — blobs are
    // released on unmount and cannot survive navigation.
    // Only data: URLs (base64) are safe to restore from session.
    (initialWip?.gallery ?? []).filter(
      (g) => !g.url?.startsWith("blob:")
    )
  );

  const zoneFileRefs = useRef({});
  const getZoneRef = (zoneId) => {
    if (!zoneFileRefs.current[zoneId]) {
      zoneFileRefs.current[zoneId] = React.createRef();
    }
    return zoneFileRefs.current[zoneId];
  };

  // Zone placement state — strip any blob: refs from restored
  // zoneDesigns since those object URLs are dead after navigation.
  const [zoneDesigns, setZoneDesigns] = useState(() => {
    const saved = initialWip?.zoneDesigns ?? {};
    const cleaned = {};
    for (const [zoneId, zoneData] of Object.entries(saved)) {
      if (zoneData?.imageUrl?.startsWith("blob:")) continue;
      cleaned[zoneId] = zoneData;
    }
    return cleaned;
  });
  const [activeZone, setActiveZone] = useState(zones[0] || null);
  const [activeTab, setActiveTab] = useState(
    initialWip?.activeTab ?? "gallery"
  );

  const [aiPrompt, setAiPrompt] = useState(
    initialWip?.aiPrompt ?? ""
  );
  const [aiLastPrompt, setAiLastPrompt] = useState(
    initialWip?.aiLastPrompt ?? ""
  );

  const prevZonesKeyRef = useRef(zones.join(","));

  // Clear zoneDesigns and reset activeZone when print side (zones) changes
  useEffect(() => {
    const nextKey = zones.join(",");
    if (prevZonesKeyRef.current === nextKey) return;
    prevZonesKeyRef.current = nextKey;
    setZoneDesigns({});
    setActiveZone(zones[0] || null);
    setZoneTexts({});
    setActiveTextId(null);
  }, [zones]);

  // Sync activeZone when product print zones list changes
  useEffect(() => {
    if (zones.length > 0 && (!activeZone || !zones.includes(activeZone))) {
      setActiveZone(zones[0]);
    }
  }, [zones, activeZone]);

  const [baseColor, setBaseColor] = useState(
    initialWip?.shirtColor ?? initialWip?.baseColor ?? "#ffffff",
  );
  const [sliderHue, setSliderHue] = useState(0);

  // Synchronize zoneDesigns blob URLs with converted base64 URLs from gallery
  useEffect(() => {
    let changed = false;
    const newDesigns = { ...zoneDesigns };

    gallery.forEach((item) => {
      if (item.originalBlobUrl && item.url !== item.originalBlobUrl) {
        Object.keys(newDesigns).forEach((zoneId) => {
          const design = newDesigns[zoneId];
          if (design && design.imageUrl === item.originalBlobUrl) {
            newDesigns[zoneId] = { ...design, imageUrl: item.url };
            changed = true;
          }
        });
      }
    });

    if (changed) {
      setZoneDesigns(newDesigns);
    }
  }, [gallery, zoneDesigns]);

  // Synchronize changes back to the parent component's WIP state
  useEffect(() => {
    onWipChange?.({
      zoneDesigns,
      zoneTexts,
      shirtColor: baseColor,
      baseColor,
      gallery,
      activeTab,
      aiPrompt,
      aiLastPrompt,
    });
  }, [
    zoneDesigns,
    zoneTexts,
    baseColor,
    gallery,
    activeTab,
    aiPrompt,
    aiLastPrompt,
    onWipChange,
  ]);

  useEffect(() => {
    if (activeDesign?.type !== productType) return;
    if (activeDesign.zones) setZoneDesigns(activeDesign.zones);
    if (activeDesign.zoneTexts) setZoneTexts(activeDesign.zoneTexts);
    const savedColor =
      activeDesign.baseColor ||
      activeDesign.productColor ||
      activeDesign.shirtColor;
    if (savedColor) setBaseColor(savedColor);
  }, [activeDesign, productType]);

  // Hidden input ref for gallery upload
  const galleryFileInputRef = useRef(null);

  const handleGalleryUploadClick = () => {
    galleryFileInputRef.current?.click();
  };

  const handleGalleryFileChange = (e) => {
    const item = handleFileChange(e);
    if (item && activeZone) {
      setZoneDesigns((prev) => ({
        ...prev,
        [activeZone]: { imageUrl: item.url, x: 10, y: 10, w: 80, h: 80 },
      }));
    }
  };

  const handleAddText = (zoneId) => {
    if (!zoneId) return;
    const layer = createTextLayer();
    setZoneTexts((prev) => ({
      ...prev,
      [zoneId]: [...(prev[zoneId] || []), layer],
    }));
    setActiveZone(zoneId);
    setActiveTextId(layer.id);
    setActiveTab("text");
  };

  const handleTextChange = (zoneId, textId, updates) => {
    setZoneTexts((prev) => ({
      ...prev,
      [zoneId]: (prev[zoneId] || []).map((t) =>
        t.id === textId ? { ...t, ...updates } : t,
      ),
    }));
  };

  const handleTextRemove = (zoneId, textId) => {
    setZoneTexts((prev) => ({
      ...prev,
      [zoneId]: (prev[zoneId] || []).filter((t) => t.id !== textId),
    }));
    setActiveTextId((prev) => (prev === textId ? null : prev));
  };

  const handleTextSelect = (zoneId, textId) => {
    setActiveZone(zoneId);
    setActiveTextId(textId);
    setActiveTab("text");
  };

  const activeZoneTexts = zoneTexts[activeZone] || [];
  const activeTextLayer =
    activeZoneTexts.find((t) => t.id === activeTextId) || null;

  const updateActiveText = (updates) => {
    if (!activeZone || !activeTextId) return;
    handleTextChange(activeZone, activeTextId, updates);
  };

  const handleZoneFileChange = (zoneId, e) => {
    const item = handleFileChange(e);
    if (item) {
      setZoneDesigns((prev) => ({
        ...prev,
        [zoneId]: { imageUrl: item.url, x: 10, y: 10, w: 80, h: 80 },
      }));
    }
  };

  const handleZoneUploadClick = (zoneId) => {
    setActiveZone(zoneId);
    getZoneRef(zoneId).current?.click();
  };



  const handleGalleryClick = (item) => {
    setSelectedGalleryId(item.id);
    if (!activeZone) return;
    setZoneDesigns((prev) => ({
      ...prev,
      [activeZone]: { imageUrl: item.url, x: 10, y: 10, w: 80, h: 80 },
    }));
  };

  const handleZoneDesignChange = (zoneId, layer) => {
    setZoneDesigns((prev) => ({ ...prev, [zoneId]: layer }));
  };

  const handleZoneSelect = (zoneId) => {
    setActiveZone(zoneId);
  };

  // ── Use this design ───────────────────────────────────────────────
  const hasAnyDesign = 
  Object.values(zoneDesigns).some(Boolean) ||
  Object.values(zoneTexts).some((arr) => arr && arr.length > 0);

  const [useDesignLoading, setUseDesignLoading] = useState(false);

  const handleUseDesign = async () => {
    setUseDesignLoading(true);
    try {
      const uploadedZones = await uploadUsedImages(zoneDesigns);
      const primaryImage =
        uploadedZones.front?.imageUrl ||
        uploadedZones.outside?.imageUrl ||
        Object.values(uploadedZones).find(Boolean)?.imageUrl ||
        null;
      onDesignReady({
        type: productType,
        zones: uploadedZones,
        zoneTexts,
        baseColor,
        generatedImageUrl: primaryImage,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      // hook sets uploadError
    } finally {
      setUseDesignLoading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="tsc-root">
      {activeDesign?.type === productType && (
        <div className="tsc-active-design-bar">
          <FaCheckCircle />
          <span>{config.label} design applied to your order.</span>
          <button
            type="button"
            className="tsc-clear-btn"
            style={{ marginLeft: "auto" }}
            onClick={onClear}
          >
            Remove
          </button>
        </div>
      )}

      <div className="tsc-layout tsc-4col-layout">
        {/* ── 0. Far-Left Vertical Tabs ────────────────────────── */}
        <div className="tsc-vertical-tabs">
          <button
            type="button"
            className={`tsc-vtab-btn ${activeTab === "specs" ? "active" : ""}`}
            onClick={() => setActiveTab("specs")}
          >
            <FaListUl className="tsc-vtab-icon" />
            Specs
          </button>
          <button
            type="button"
            className={`tsc-vtab-btn ${activeTab === "colors" ? "active" : ""}`}
            onClick={() => setActiveTab("colors")}
          >
            <FaPalette className="tsc-vtab-icon" />
            Colors
          </button>
          <button
            type="button"
            className={`tsc-vtab-btn ${activeTab === "gallery" ? "active" : ""}`}
            onClick={() => setActiveTab("gallery")}
          >
            <FaImage className="tsc-vtab-icon" />
            Gallery
          </button>
          <button
            type="button"
            className={`tsc-vtab-btn ${activeTab === "ai" ? "active" : ""}`}
            onClick={() => setActiveTab("ai")}
          >
            <FaMagic className="tsc-vtab-icon" />
            AI
          </button>
          <button
            type="button"
            className={`tsc-vtab-btn${activeTab === "text" ? " active" : ""}`}
            onClick={() => setActiveTab("text")}
          >
            <FaFont className="tsc-vtab-icon" />
            Text
          </button>

        </div>

        {/* ── 1. Left Docked Control Sidebar ───────────────────── */}
        <div className="tsc-sidebar tsc-left-docked">
          {zones.map((zoneId) => (
            <input
              key={zoneId}
              ref={getZoneRef(zoneId)}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              style={{ display: "none" }}
              onChange={(e) => handleZoneFileChange(zoneId, e)}
            />
          ))}

          {/* Single Gallery hidden file input */}
          <input
            ref={galleryFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            style={{ display: "none" }}
            onChange={handleGalleryFileChange}
          />

          {/* Specs Tab Content */}
          {activeTab === "specs" && (
            <div className="tsc-sidebar-section">
              <div className="tsc-sidebar-header-row">
                <h4>Product Specifications</h4>
              </div>
              <p style={{ fontSize: 13, color: "#475569" }}>
                Please set the specifications (Size, Material, Finishing) in the
                main product page.
              </p>
            </div>
          )}

          {/* Colors Tab Content */}
          {activeTab === "colors" && (
            <div className="tsc-sidebar-section">
              <div className="tsc-sidebar-header-row">
                <h4>{config.colorLabel}</h4>
              </div>
              <div className="tsc-color-row">
                <input
                  type="range"
                  className="tsc-color-slider"
                  min={0}
                  max={360}
                  value={sliderHue}
                  onChange={(e) => {
                    const h = Number(e.target.value);
                    setSliderHue(h);
                    setBaseColor(hueToHex(h));
                  }}
                />
                <div
                  className="tsc-color-swatch"
                  style={{ background: baseColor }}
                />
              </div>
            </div>
          )}

          {/* Gallery */}
          <div
            className="tsc-sidebar-section"
            style={{ display: activeTab === "gallery" ? "block" : "none" }}
          >
            <div className="tsc-sidebar-header-row">
              <h4>Gallery</h4>
              <button
                type="button"
                className="tsc-gallery-upload-btn"
                onClick={handleGalleryUploadClick}
              >
                Upload
              </button>
            </div>
            {uploadError && (
              <p className="tsc-error" style={{ marginBottom: 8 }}>
                {uploadError}
              </p>
            )}
            <div className="tsc-gallery">
              {gallery.length === 0 && (
                <span className="tsc-gallery-empty">
                  Upload an image to start.
                </span>
              )}
              {gallery.map((item) => (
                <div
                  key={item.id}
                  className={`tsc-gallery-thumb${
                    selectedGalleryId === item.id ? " selected" : ""
                  }`}
                  title={item.label}
                  onClick={() => handleGalleryClick(item)}
                >
                  <img src={item.url} alt={item.label} />

                  <button
                    type="button"
                    className="tsc-gallery-thumb-remove"
                    title="Remove from gallery"
                    onClick={(e) => {
                      e.stopPropagation();
                      setGallery((prev) =>
                        prev.filter((g) => g.id !== item.id),
                      );
                      if (selectedGalleryId === item.id) {
                        setSelectedGalleryId(null);
                      }
                      const hasUser =
                        localStorage.getItem("user") ||
                        localStorage.getItem("userId");
                      if (!hasUser) {
                        removeGuestDesign(item.url);
                      }
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {activeTab === "text" && (
            <div className="tsc-sidebar-section">
              <div className="tsc-sidebar-header-row">
                <h4>Text</h4>
                <button
                  type="button"
                  className="tsc-gallery-upload-btn"
                  onClick={() => handleAddText(activeZone)}
                  disabled={!activeZone}
                >
                  + Add
                </button>
              </div>

              {activeZoneTexts.length === 0 && (
                <span className="tsc-gallery-empty" style={{ display: "block" }}>
                  No text yet. Click a zone, then "+ Add".
                </span>
              )}

              {activeZoneTexts.length > 0 && (
                <div className="tsc-text-list">
                  {activeZoneTexts.map((t) => (
                    <div
                      key={t.id}
                      className={`tsc-text-list-item${activeTextId === t.id ? " active" : ""
                        }`}
                      onClick={() => setActiveTextId(t.id)}
                    >
                      <span>{t.text || "(empty)"}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTextRemove(activeZone, t.id);
                        }}
                        style={{
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 14,
                          color: "#94a3b8",
                        }}
                        title="Remove"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTextLayer && (
                <>
                  <div className="tsc-text-editor-field">
                    <label className="tsc-spec-label">Text</label>
                    <input
                      className="tsc-text-input"
                      value={activeTextLayer.text}
                      onChange={(e) => updateActiveText({ text: e.target.value })}
                      maxLength={60}
                    />
                  </div>

                  <div className="tsc-text-editor-field">
                    <label className="tsc-spec-label">Font</label>
                    <select
                      className="tsc-select-control"
                      value={activeTextLayer.fontFamily}
                      onChange={(e) =>
                        updateActiveText({ fontFamily: e.target.value })
                      }
                    >
                      {TEXT_FONTS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="tsc-text-editor-field">
                    <label className="tsc-spec-label">
                      Size ({activeTextLayer.fontSize})
                    </label>
                    <input
                      type="range"
                      min={4}
                      max={40}
                      value={activeTextLayer.fontSize}
                      onChange={(e) =>
                        updateActiveText({ fontSize: Number(e.target.value) })
                      }
                    />
                  </div>

                  <div className="tsc-text-editor-field">
                    <label className="tsc-spec-label">Color</label>
                    <input
                      type="color"
                      value={activeTextLayer.color}
                      onChange={(e) => updateActiveText({ color: e.target.value })}
                    />
                  </div>

                  <div className="tsc-text-editor-field">
                    <label className="tsc-spec-label">Style</label>
                    <div className="tsc-text-style-row">
                      <button
                        type="button"
                        className={`tsc-text-toggle-btn${activeTextLayer.bold ? " active" : ""
                          }`}
                        onClick={() =>
                          updateActiveText({ bold: !activeTextLayer.bold })
                        }
                      >
                        B
                      </button>
                      <button
                        type="button"
                        className={`tsc-text-toggle-btn${activeTextLayer.italic ? " active" : ""
                          }`}
                        onClick={() =>
                          updateActiveText({ italic: !activeTextLayer.italic })
                        }
                      >
                        I
                      </button>
                      {["left", "center", "right"].map((a) => (
                        <button
                          key={a}
                          type="button"
                          className={`tsc-text-toggle-btn${activeTextLayer.align === a ? " active" : ""
                            }`}
                          onClick={() => updateActiveText({ align: a })}
                        >
                          {a[0].toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="tsc-text-editor-field">
                    <label className="tsc-spec-label">Outline</label>
                    <div className="tsc-text-style-row">
                      <button
                        type="button"
                        className={`tsc-text-toggle-btn${activeTextLayer.outline ? " active" : ""
                          }`}
                        onClick={() =>
                          updateActiveText({ outline: !activeTextLayer.outline })
                        }
                      >
                        {activeTextLayer.outline ? "On" : "Off"}
                      </button>
                      {activeTextLayer.outline && (
                        <input
                          type="color"
                          value={activeTextLayer.outlineColor}
                          onChange={(e) =>
                            updateActiveText({ outlineColor: e.target.value })
                          }
                        />
                      )}
                    </div>
                  </div>

                  <div className="tsc-text-editor-field">
                    <label className="tsc-spec-label">Shadow</label>
                    <div className="tsc-text-style-row">
                      <button
                        type="button"
                        className={`tsc-text-toggle-btn${activeTextLayer.shadow ? " active" : ""
                          }`}
                        onClick={() =>
                          updateActiveText({ shadow: !activeTextLayer.shadow })
                        }
                      >
                        {activeTextLayer.shadow ? "On" : "Off"}
                      </button>
                      {activeTextLayer.shadow && (
                        <input
                          type="color"
                          value={activeTextLayer.shadowColor}
                          onChange={(e) =>
                            updateActiveText({ shadowColor: e.target.value })
                          }
                        />
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* AI Generate section */}
          <div style={{ display: activeTab === "ai" ? "block" : "none" }}>
            <AIGeneratePanel
              activeZone={activeZone}
              productLabel={config.label}
              prompt={aiPrompt}
              onPromptChange={setAiPrompt}
              lastPrompt={aiLastPrompt}
              onLastPromptChange={setAiLastPrompt}
              onGenerated={(item) => {
                if (activeZone) {
                  setZoneDesigns((prev) => ({
                    ...prev,
                    [activeZone]: {
                      imageUrl: item.url,
                      x: 10,
                      y: 10,
                      w: 80,
                      h: 80,
                    },
                  }));
                }
              }}
              handleGenerate={handleGenerate}
              generating={generating}
              genError={genError}
              setGenError={setGenError}
              handleGenerate3D={handleGenerate3D}
              generating3D={generating3D}
              gen3DError={gen3DError}
              setGen3DError={setGen3DError}
              model3D={model3D}
              setModel3D={setModel3D}
            />
          </div>
        </div>

        {/* ── 2. Main column: 2D Editor ─────────────────────────── */}
        <div className="tsc-center-placeholders">
          <FlatZoneCanvas
            productType={productType}
            zones={zones}
            zoneDesigns={zoneDesigns}
            zoneTexts={zoneTexts}
            activeZone={activeZone}
            onZoneSelect={handleZoneSelect}
            onZoneDesignChange={handleZoneDesignChange}
            activeZone={activeZone}
            activeTextId={activeTextId}
            onZoneSelect={handleZoneSelect}
            onZoneDesignChange={handleZoneDesignChange}
            onTextChange={handleTextChange}
            onTextSelect={handleTextSelect}
            onTextRemove={handleTextRemove}
            onUploadClick={handleZoneUploadClick}
            aspectRatio={aspectRatio}
            printSizeInches={printSizeInches}
            bleedInches={product?.bleedInches}
            safeMarginInches={product?.safeMarginInches}
          />
        </div>

        {/* ── 3. Right column: 3D preview + color ───────────────── */}
        <div className="tsc-right-preview">
          <div className="tsc-preview-panel">
            <FlatPreview3D
              productType={productType}
              baseColor={baseColor}
              zoneDesigns={zoneDesigns}
              selectedSide={selectedSide}
              zones={zones}
              selectedSize={selectedSize}
            />
          </div>
        </div>
      </div>

      {/* Use design button */}
      <div className="tsc-bottom-action-bar">
        <button
          type="button"
          className="tsc-use-btn"
          disabled={!hasAnyDesign || useDesignLoading}
          onClick={handleUseDesign}
        >
          {useDesignLoading ? "Uploading..." : "Use This Design"}
        </button>
        {hasAnyDesign && (
          <button
            type="button"
            className="tsc-clear-btn"
            onClick={() => {
              setZoneDesigns({});
              setZoneTexts({});
              setActiveTextId(null);
              setActiveZone(zones[0] || null);
              setBaseColor("#ffffff");
              setSliderHue(0);
              onClear?.();
            }}
          >
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}