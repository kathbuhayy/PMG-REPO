/**
 * TshirtCustomizerPanel
 * Main orchestrator for the t-shirt customizer.
 * 3-column layout: sidebar (gallery + upload + AI prompt) | zone canvas | 3D preview
 *
 * Props:
 *   product       {object}         – product with print_zones array
 *   onDesignReady {fn}             – called with { type:'tshirt', zones, shirtColor }
 *   onClear       {fn}             – called when user removes the active design
 *   activeDesign  {object|null}    – currently applied design meta
 */
import React, { useEffect, useRef, useState, useMemo } from "react";
import ReactDOM from "react-dom";
import {
  FaCheckCircle,
  FaListUl,
  FaPalette,
  FaImage,
  FaMagic,
  FaFont,
} from "react-icons/fa";
import { useCustomizerUpload } from "../../hooks/useCustomizerUpload";
import AIGeneratePanel from "../AIBuilder/AIGeneratePanel";
import TshirtZoneCanvas from "./TshirtZoneCanvas";
import TshirtPreview3D from "./TshirtPreview3D";
import ZoneUploadSlots from "./ZoneUploadSlots";
import { ZONE_META } from "./TshirtZoneCanvas";
import { parseFlatSize } from "../../utils/parseFlatSize";
import { removeGuestDesign } from "../../utils/guestDesigns";
import "./TshirtCustomizer.css";
import { filterZonesBySide } from "../../config/categoryDefaults";



const TSHIRT_GLB = "/models/tshirt.glb";
const QUICK_COLORS = [
  "#ffffff",
  "#111827",
  "#ff0000",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#0ea5e9",
  "#2563eb",
  "#7c3aed",
  "#ec4899",
];

const TEXT_FONTS = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
  "Impact",
  "Comic Sans MS",
  "Trebuchet MS",
];

function createTextLayer() {
  return {
    id: `text_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    text: "Your Text",
    x: 15,
    y: 40,
    w: 70,
    h: 20,
    fontFamily: "Arial",
    fontSize: 12, // % of zone height
    color: "#000000",
    bold: false,
    italic: false,
    align: "center", // left | center | right
    outline: false,
    outlineColor: "#ffffff",
    outlineWidth: 3, // % of zone height
    shadow: false,
    shadowColor: "#000000",
    shadowBlur: 4, // % of zone height
  };
}

// Convert hue (0-360) to a hex color at full saturation/lightness=50%
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

function normalizeHexColor(value) {
  const raw = String(value || "").trim();
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toLowerCase() : null;
}

export default function TshirtCustomizerPanel({
  product,
  onDesignReady,
  onClear,
  activeDesign,
  selectedSide = "",
  onSideChange,
  selectedSize = "",
  onSizeChange,
  selectedMaterial = null,
  onMaterialChange,
  selectedFinish = "",
  onFinishChange,
  customSizeSelected = false,
  onCustomSizeChange,
  modelPath = TSHIRT_GLB,
  PreviewComponent = TshirtPreview3D,
  designType = "tshirt",
  productLabel = "T-shirt",
  previewProps = {},
  initialWip = null,
  onWipChange,
}) {
  const zones = useMemo(() => {
    return filterZonesBySide(
      product?.print_zones || [],
      selectedSide,
      designType,
    );
  }, [product?.print_zones, selectedSide, designType]);

  // Filter side options for Jersey to exclude sleeve/sublimation options
  const displaySides = useMemo(() => {
    if (!product?.sides) return [];

    if (designType === "jersey" || productLabel === "jersey") {
      return product.sides.filter((side) => {
        const s = side.toLowerCase();
        return !s.includes("sleeve") && !s.includes("sublimation");
      });
    }

    return product.sides;
  }, [product?.sides, designType, productLabel]);

  // Merge parsed size into previewProps.flatShape for flat panels
  const mergedPreviewProps = useMemo(() => {
    if (!selectedSize || !previewProps.flatShape) return previewProps;
    const parsed = parseFlatSize(selectedSize);
    if (!parsed) return previewProps;

    let w = parsed.width;
    let h = parsed.height;
    const defaultIsLandscape =
      previewProps.flatShape.width > previewProps.flatShape.height;
    const parsedIsLandscape = w > h;
    if (defaultIsLandscape !== parsedIsLandscape) {
      w = parsed.height;
      h = parsed.width;
    }

    // Determine fold lines based on bi-fold vs tri-fold text in selectedSize
    let foldLines = previewProps.flatShape.foldLines;
    if (foldLines !== undefined) {
      const lowerSize = selectedSize.toLowerCase();
      if (
        lowerSize.includes("bi-fold") ||
        lowerSize.includes("bifold") ||
        lowerSize.includes("bi fold")
      ) {
        foldLines = 1;
      } else if (
        lowerSize.includes("tri-fold") ||
        lowerSize.includes("trifold") ||
        lowerSize.includes("tri fold") ||
        lowerSize.includes("z-fold") ||
        lowerSize.includes("zfold")
      ) {
        foldLines = 2;
      }
    }

    return {
      ...previewProps,
      flatShape: {
        ...previewProps.flatShape,
        width: w,
        height: h,
        ...(foldLines !== undefined && { foldLines }),
      },
    };
  }, [selectedSize, previewProps]);

  // Compute aspect ratio for 2D zone canvas
  const aspectRatio = useMemo(() => {
    if (!selectedSize) return null;
    const parsed = parseFlatSize(selectedSize);
    if (!parsed) return null;

    let w = parsed.width;
    let h = parsed.height;
    if (previewProps?.flatShape) {
      const defaultIsLandscape =
        previewProps.flatShape.width > previewProps.flatShape.height;
      const parsedIsLandscape = w > h;
      if (defaultIsLandscape !== parsedIsLandscape) {
        w = parsed.height;
        h = parsed.width;
      }
    }

    return w / h;
  }, [selectedSize, previewProps]);

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
    uploadUsedImages,
  } = useCustomizerUpload(
    productLabel,
    // Strip dead blob: URLs from restored gallery — blobs are
    // released on unmount and cannot survive navigation.
    // Only data: URLs (base64) are safe to restore from session.
    (initialWip?.gallery ?? []).filter(
      (g) => !g.url?.startsWith("blob:")
    )
  );

  // Per-zone file input refs
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

  const [zoneTexts, setZoneTexts] = useState(() => initialWip?.zoneTexts ?? {});
  const [activeTextId, setActiveTextId] = useState(
    initialWip?.activeTextId ?? null,
  );

  const [activeZone, setActiveZone] = useState(zones[0] || null);

  // Progressive Disclosure Sidebar Tab state
  const [activeTab, setActiveTab] = useState(
    initialWip?.activeTab ?? "specs"
  );

  const [aiPrompt, setAiPrompt] = useState(
    initialWip?.aiPrompt ?? ""
  );
  const [aiLastPrompt, setAiLastPrompt] = useState(
    initialWip?.aiLastPrompt ?? ""
  );

  // Currently selected image/text layer (drives the size-adjust panel
  // that sits above "Design Print Areas" in the sidebar)
  const [selectedLayer, setSelectedLayer] = useState(null);

  const prevZonesKeyRef = useRef(zones.join(","));

  // Clear zoneDesigns and reset activeZone when print side (zones) changes
  useEffect(() => {
    const nextKey = zones.join(",");
    if (prevZonesKeyRef.current === nextKey) return;
    prevZonesKeyRef.current = nextKey;
    setZoneDesigns({});
    setZoneTexts({});
    setActiveTextId(null);
    setActiveZone(zones[0] || null);
    setSelectedLayer(null);
  }, [zones]);

  // Sync activeZone when product print zones list changes
  useEffect(() => {
    if (zones.length > 0 && (!activeZone || !zones.includes(activeZone))) {
      setActiveZone(zones[0]);
    }
  }, [zones, activeZone]);

  // Shirt color — starts white
  const [shirtColor, setShirtColor] = useState(
    initialWip?.shirtColor ?? "#ffffff",
  );
  const [hexInput, setHexInput] = useState(initialWip?.shirtColor ?? "#ffffff");
  const [sliderHue, setSliderHue] = useState(0);
  const colorInputRef = useRef(null);

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
      shirtColor,
      activeTab,
      gallery,
      aiPrompt,
      aiLastPrompt,
    });
  }, [
    zoneDesigns,
    zoneTexts,
    shirtColor,
    activeTab,
    gallery,
    aiPrompt,
    aiLastPrompt,
    onWipChange,
  ]);

  useEffect(() => {
    if (activeDesign?.type !== designType) return;
    if (activeDesign.zones) setZoneDesigns(activeDesign.zones);
    if (activeDesign.zoneTexts) setZoneTexts(activeDesign.zoneTexts);
    const savedColor =
      activeDesign.shirtColor ||
      activeDesign.productColor ||
      activeDesign.baseColor;
    if (savedColor) applyShirtColor(savedColor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDesign]);

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

  // ── Per-zone file upload ──────────────────────────────────────────
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
    setActiveTab("gallery");
    getZoneRef(zoneId).current?.click();
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
    setSelectedLayer((prev) =>
      prev?.kind === "text" && prev.id === textId ? null : prev,
    );
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



  // ── Gallery click — assign to active zone ───────────────────────────
  const handleGalleryClick = (item) => {
    setSelectedGalleryId(item.id);
    if (!activeZone) return;
    setZoneDesigns((prev) => ({
      ...prev,
      [activeZone]: { imageUrl: item.url, x: 10, y: 10, w: 80, h: 80 },
    }));
  };

  // ── Zone design change (drag/resize) ──────────────────────────────
  const handleZoneDesignChange = (zoneId, layer) => {
    setZoneDesigns((prev) => ({ ...prev, [zoneId]: layer }));
  };

  const handleClearZone = (zoneId) => {
    setZoneDesigns((prev) => {
      const next = { ...prev };
      delete next[zoneId];
      return next;
    });
    setSelectedLayer((prev) =>
      prev?.kind === "image" && prev.zoneId === zoneId ? null : prev,
    );
  };

  // ── Zone select ───────────────────────────────────────────────────
  const handleZoneSelect = (zoneId) => {
    setActiveZone(zoneId);
  };

  // ── Selected layer (image/text) size controls ──────────────────────
  // Reads the current x/y/w/h for whatever is selected, straight from
  // zoneDesigns / zoneTexts so it always reflects live state.
  const selectedLayerData = useMemo(() => {
    if (!selectedLayer) return null;

    if (selectedLayer.kind === "image") {
      const design = zoneDesigns[selectedLayer.zoneId];
      if (!design?.imageUrl) return null;

      return {
        kind: "image",
        zoneId: selectedLayer.zoneId,
        x: design.x ?? 10,
        y: design.y ?? 10,
        w: design.w ?? 80,
        h: design.h ?? 80,
      };
    }

    if (selectedLayer.kind === "text") {
      const texts = zoneTexts[selectedLayer.zoneId] || [];
      const text = texts.find((t) => t.id === selectedLayer.id);
      if (!text) return null;

      return {
        kind: "text",
        zoneId: selectedLayer.zoneId,
        id: selectedLayer.id,
        x: text.x ?? 10,
        y: text.y ?? 10,
        w: text.w ?? 80,
        h: text.h ?? 20,
      };
    }

    return null;
  }, [selectedLayer, zoneDesigns, zoneTexts]);

  // Resize the selected image/text layer while keeping its center fixed
  const resizeSelectedLayer = (newW, newH) => {
    if (!selectedLayer) return;

    const clampValue = (v, min, max) => Math.max(min, Math.min(max, v));
    const width = clampValue(Number(newW) || 5, 5, 100);
    const height = clampValue(Number(newH) || 5, 5, 100);

    if (selectedLayer.kind === "image") {
      const design = zoneDesigns[selectedLayer.zoneId];
      if (!design?.imageUrl) return;

      const oldW = design.w ?? 80;
      const oldH = design.h ?? 80;
      const oldX = design.x ?? 10;
      const oldY = design.y ?? 10;

      const centerX = oldX + oldW / 2;
      const centerY = oldY + oldH / 2;

      const x = clampValue(centerX - width / 2, 0, 100 - width);
      const y = clampValue(centerY - height / 2, 0, 100 - height);

      handleZoneDesignChange(selectedLayer.zoneId, {
        ...design,
        x,
        y,
        w: width,
        h: height,
      });

      return;
    }

    if (selectedLayer.kind === "text") {
      const texts = zoneTexts[selectedLayer.zoneId] || [];
      const text = texts.find((t) => t.id === selectedLayer.id);
      if (!text) return;

      const oldW = text.w ?? 80;
      const oldH = text.h ?? 20;
      const oldX = text.x ?? 10;
      const oldY = text.y ?? 10;

      const centerX = oldX + oldW / 2;
      const centerY = oldY + oldH / 2;

      const x = clampValue(centerX - width / 2, 0, 100 - width);
      const y = clampValue(centerY - height / 2, 0, 100 - height);

      handleTextChange(selectedLayer.zoneId, selectedLayer.id, {
        x,
        y,
        w: width,
        h: height,
      });
    }
  };

  // ── Use this design ───────────────────────────────────────────────
  const hasAnyDesign =
    Object.values(zoneDesigns).some(Boolean) ||
    Object.values(zoneTexts).some((arr) => arr && arr.length > 0);

  const applyShirtColor = (color) => {
    const normalized = normalizeHexColor(color);
    if (!normalized) return false;
    setShirtColor(normalized);
    setHexInput(normalized);
    return true;
  };

  const [useDesignLoading, setUseDesignLoading] = useState(false);

  const handleUseDesign = async () => {
    setUseDesignLoading(true);
    try {
      const uploadedZones = await uploadUsedImages(zoneDesigns);
      const primaryImage =
        uploadedZones.front?.imageUrl ||
        Object.values(uploadedZones).find(Boolean)?.imageUrl ||
        null;
      onDesignReady({
        type: designType,
        category: designType,
        zones: uploadedZones,
        zoneTexts,
        shirtColor,
        productColor: shirtColor,
        baseColor: shirtColor,
        generatedImageUrl: primaryImage,
        generatedAt: new Date().toISOString(),
      });
    } catch (err) {
      // hook sets uploadError
    } finally {
      setUseDesignLoading(false);
    }
  };

  const [headerTarget, setHeaderTarget] = useState(null);

  useEffect(() => {
    setHeaderTarget(document.getElementById("customizer-header-actions"));
  }, []);

  const useDesignBtn = (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {hasAnyDesign && (
        <button
          type="button"
          className="tsc-clear-btn"
          onClick={() => {
            setZoneDesigns({});
            setZoneTexts({});
            setActiveTextId(null);
            setActiveZone(zones[0] || null);
            setSelectedLayer(null);
            applyShirtColor("#ffffff");
            setSliderHue(0);
            onClear?.();
          }}
        >
          Clear All
        </button>
      )}
      <button
        type="button"
        className="tsc-use-btn-header"
        disabled={!hasAnyDesign || useDesignLoading}
        onClick={handleUseDesign}
      >
        {useDesignLoading ? "Uploading..." : "✓ Use This Design"}
      </button>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="tsc-root">
      {headerTarget ? (
        ReactDOM.createPortal(useDesignBtn, headerTarget)
      ) : (
        <div
          className="tsc-header-fallback"
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 12,
          }}
        >
          {useDesignBtn}
        </div>
      )}

      {/* Applied design confirmation bar */}
      {activeDesign?.type === designType && (
        <div className="tsc-active-design-bar">
          <FaCheckCircle />
          <span>{productLabel} design applied to your order.</span>
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
            className={`tsc-vtab-btn${activeTab === "specs" ? " active" : ""}`}
            onClick={() => setActiveTab("specs")}
          >
            <FaListUl className="tsc-vtab-icon" />
            Specs
          </button>
          <button
            type="button"
            className={`tsc-vtab-btn${activeTab === "color" ? " active" : ""}`}
            onClick={() => setActiveTab("color")}
          >
            <FaPalette className="tsc-vtab-icon" />
            Colors
          </button>
          <button
            type="button"
            className={`tsc-vtab-btn${activeTab === "gallery" ? " active" : ""}`}
            onClick={() => setActiveTab("gallery")}
          >
            <FaImage className="tsc-vtab-icon" />
            Gallery
          </button>
          <button
            type="button"
            className={`tsc-vtab-btn${activeTab === "ai" ? " active" : ""}`}
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
          {/* Per-zone hidden file inputs */}
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

          {/* Tab 0: Product Specifications */}
          {activeTab === "specs" && (
            <div className="tsc-sidebar-section">
              <div
                className="tsc-sidebar-header-row"
                style={{ marginBottom: 12 }}
              >
                <h4>Product Specifications</h4>
              </div>

              {/* Size */}
              {product?.sizes?.length > 0 && (
                <div className="tsc-spec-field">
                  <label className="tsc-spec-label">Size</label>
                  <select
                    className="tsc-select-control"
                    value={customSizeSelected ? "custom" : selectedSize}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        onCustomSizeChange?.(true);
                      } else {
                        onSizeChange?.(e.target.value);
                        onCustomSizeChange?.(false);
                      }
                    }}
                  >
                    {product.sizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Material */}
              {product?.materials?.length > 0 && (
                <div className="tsc-spec-field">
                  <label className="tsc-spec-label">Material</label>
                  <select
                    className="tsc-select-control"
                    value={selectedMaterial?.label || ""}
                    onChange={(e) => {
                      const mat = product.materials.find(
                        (m) => m.label === e.target.value,
                      );
                      if (mat) onMaterialChange?.(mat);
                    }}
                  >
                    {product.materials.map((material) => (
                      <option key={material.label} value={material.label}>
                        {material.label}{" "}
                        {material.price
                          ? `(+ ${material.price})`
                          : "(Included)"}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Printed Sides */}
              {product?.sides?.length > 0 && (
                <div className="tsc-spec-field">
                  <label className="tsc-spec-label">Printed Sides</label>
                  <select
                    className="tsc-select-control"
                    value={selectedSide}
                    onChange={(e) => onSideChange?.(e.target.value)}
                  >
                    {displaySides.map((side) => (
                      <option key={side} value={side}>
                        {side}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Finishing */}
              {product?.finishing?.length > 0 && (
                <div className="tsc-spec-field">
                  <label className="tsc-spec-label">Finishing</label>
                  <select
                    className="tsc-select-control"
                    value={selectedFinish}
                    onChange={(e) => onFinishChange?.(e.target.value)}
                  >
                    {product.finishing.map((finish) => (
                      <option key={finish} value={finish}>
                        {finish}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Tab 1: Gallery & Uploads */}
          {activeTab === "gallery" && (
            <div className="tsc-sidebar-section">
              <div className="tsc-sidebar-header-row">
                <h4>Upload & Gallery</h4>
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
                    className={`tsc-gallery-thumb${selectedGalleryId === item.id ? " selected" : ""
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
          )}

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

          {/* Tab 2: Base Color Selection */}
          {activeTab === "color" && (
            <div className="tsc-sidebar-section">
              <div
                className="tsc-color-section"
                style={{ borderTop: "none", padding: 0 }}
              >
                <div className="tsc-color-label">PRODUCT BASE COLOR</div>
                <div className="tsc-color-row" style={{ marginTop: 8 }}>
                  <input
                    type="range"
                    className="tsc-color-slider"
                    min={0}
                    max={360}
                    value={sliderHue}
                    onChange={(e) => {
                      const h = Number(e.target.value);
                      const nextColor = hueToHex(h);
                      setSliderHue(h);
                      applyShirtColor(nextColor);
                    }}
                  />
                  <button
                    type="button"
                    className="tsc-color-swatch"
                    style={{ background: shirtColor }}
                    title="Pick shirt color"
                    onClick={() => colorInputRef.current?.click()}
                  />
                </div>
                <div className="tsc-color-controls">
                  <input
                    className="tsc-hex-input"
                    value={hexInput}
                    maxLength={7}
                    aria-label="Shirt color hex code"
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      setHexInput(nextValue);
                      applyShirtColor(nextValue);
                    }}
                    onBlur={() => {
                      if (!applyShirtColor(hexInput)) setHexInput(shirtColor);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="tsc-more-colors-btn"
                    onClick={() => colorInputRef.current?.click()}
                  >
                    More colors
                  </button>
                  <input
                    ref={colorInputRef}
                    type="color"
                    className="tsc-native-color-input"
                    value={shirtColor}
                    onChange={(e) => applyShirtColor(e.target.value)}
                  />
                </div>
                <div className="tsc-quick-colors" style={{ marginTop: 12 }}>
                  {QUICK_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`tsc-quick-color${shirtColor === color ? " active" : ""}`}
                      style={{ background: color }}
                      title={color.toUpperCase()}
                      aria-label={`Use ${color} shirt color`}
                      onClick={() => applyShirtColor(color)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: AI Builder */}
          {activeTab === "ai" && (
            <AIGeneratePanel
              activeZone={activeZone}
              productLabel={productLabel}
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
            />
          )}

          {/* Image/Text Size controls — shown above Design Print Areas
              whenever an image or text layer is selected in the 3D preview */}
          {selectedLayerData && (
            <div className="tsc-sidebar-section tsc-size-controls">
              <div className="tsc-size-header">
                <div>
                  <strong>
                    {selectedLayerData.kind === "image"
                      ? "Image Size"
                      : "Text Size"}
                  </strong>
                  <span>Adjust width and height</span>
                </div>

                <button
                  type="button"
                  className="tsc-size-close"
                  onClick={() => setSelectedLayer(null)}
                >
                  ×
                </button>
              </div>

              <div className="tsc-size-control">
                <div className="tsc-size-label-row">
                  <span>Width</span>
                  <strong>{Math.round(selectedLayerData.w)}%</strong>
                </div>

                <input
                  type="range"
                  min="5"
                  max="100"
                  step="1"
                  value={Math.round(selectedLayerData.w)}
                  onChange={(e) =>
                    resizeSelectedLayer(e.target.value, selectedLayerData.h)
                  }
                  className="tsc-size-slider"
                />
              </div>

              <div className="tsc-size-control">
                <div className="tsc-size-label-row">
                  <span>Height</span>
                  <strong>{Math.round(selectedLayerData.h)}%</strong>
                </div>

                <input
                  type="range"
                  min="5"
                  max="100"
                  step="1"
                  value={Math.round(selectedLayerData.h)}
                  onChange={(e) =>
                    resizeSelectedLayer(selectedLayerData.w, e.target.value)
                  }
                  className="tsc-size-slider"
                />
              </div>

              <button
                type="button"
                className="tsc-size-reset"
                onClick={() => {
                  if (selectedLayerData.kind === "image") {
                    resizeSelectedLayer(80, 80);
                  } else {
                    resizeSelectedLayer(80, 20);
                  }
                }}
              >
                Reset Size
              </button>
            </div>
          )}

          {/* Persistent Design Print Areas — visible under every tab */}
          <ZoneUploadSlots
            zones={zones}
            zoneMeta={ZONE_META}
            zoneDesigns={zoneDesigns}
            activeZone={activeZone}
            uploading={false}
            uploadError={uploadError}
            onZoneSelect={handleZoneSelect}
            onUploadClick={handleZoneUploadClick}
            onClearZone={handleClearZone}
          />
        </div>

        {/* ── 3. Right 3D Preview Panel (1:1 aspect ratio) ─────── */}
        <div className="tsc-right-preview">
          <div className="tsc-preview-panel">
            <PreviewComponent
              modelPath={modelPath}
              shirtColor={shirtColor}
              zoneDesigns={zoneDesigns}
              zoneTexts={zoneTexts}
              selectedSide={selectedSide}
              zones={zones}
              selectedSize={selectedSize}
              activeZone={activeZone}
              activeTextId={activeTextId}
              onZoneSelect={handleZoneSelect}
              onZoneDesignChange={handleZoneDesignChange}
              onTextChange={handleTextChange}
              onTextSelect={handleTextSelect}
              onTextRemove={handleTextRemove}
              selectedLayer={selectedLayer}
              onLayerSelect={setSelectedLayer}
              {...mergedPreviewProps}
            />
          </div>
        </div>
      </div>
    </div>
  );
}