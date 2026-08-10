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
  FaShapes,
} from "react-icons/fa";
import { useCustomizerUpload } from "../../hooks/useCustomizerUpload";
import AIGeneratePanel from "../AIBuilder/AIGeneratePanel";
import TshirtZoneCanvas from "./TshirtZoneCanvas";
import TshirtPreview3D from "./TshirtPreview3D";
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

const SHIRT_COLOR_WORDS = {
  red: "#dc2626", burgundy: "#7f1d1d", maroon: "#7f1d1d",
  blue: "#2563eb", navy: "#172554", green: "#15803d",
  black: "#111827", white: "#ffffff", yellow: "#eab308",
  orange: "#ea580c", purple: "#7e22ce", pink: "#db2777",
  gray: "#6b7280", grey: "#6b7280",
};

function svgDataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function createTextDesign(text, font, color) {
  const safeText = String(text || "YOUR TEXT")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return svgDataUrl(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><text x="600" y="430" text-anchor="middle" dominant-baseline="middle" font-family="${font}" font-size="150" font-weight="800" fill="${color}" stroke="#ffffff" stroke-width="5" paint-order="stroke">${safeText}</text></svg>`,
  );
}

const DESIGN_TEMPLATES = [
  { id: "bolt", label: "Bold Bolt", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><path fill="#facc15" stroke="#0f172a" stroke-width="26" d="M450 55 140 455h195l-5 290 330-445H465z"/></svg>` },
  { id: "sun", label: "Retro Sun", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><circle cx="400" cy="390" r="180" fill="#fb7185"/><path d="M150 430h500M180 500h440M215 570h370" stroke="#fbbf24" stroke-width="42"/><path d="M400 70v85M130 180l62 62M670 180l-62 62" stroke="#0f172a" stroke-width="34" stroke-linecap="round"/></svg>` },
  { id: "mountain", label: "Mountain", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><circle cx="590" cy="185" r="74" fill="#facc15"/><path d="m65 650 225-355 115 180 90-130 240 305z" fill="#0f766e"/><path d="m290 295 75 118-75-35-65 45z" fill="#fff"/></svg>` },
  { id: "floral", label: "Floral", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><g fill="#ec4899" stroke="#7c2d12" stroke-width="16"><ellipse cx="400" cy="190" rx="75" ry="145"/><ellipse cx="400" cy="610" rx="75" ry="145"/><ellipse cx="190" cy="400" rx="145" ry="75"/><ellipse cx="610" cy="400" rx="145" ry="75"/></g><circle cx="400" cy="400" r="95" fill="#facc15"/></svg>` },
  { id: "wave", label: "Ocean Wave", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><circle cx="400" cy="400" r="210" fill="#0ea5e9"/><path d="M120 470c60-70 120-70 180 0s120 70 180 0 120-70 180 0" fill="none" stroke="#ffffff" stroke-width="34" stroke-linecap="round"/><path d="M120 560c60-70 120-70 180 0s120 70 180 0 120-70 180 0" fill="none" stroke="#e0f2fe" stroke-width="26" stroke-linecap="round"/></svg>` },
  { id: "star", label: "Star Burst", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><path fill="#f59e0b" stroke="#78350f" stroke-width="20" d="M400 60l78 190 205 20-155 135 46 200-174-103-174 103 46-200L117 270l205-20z"/></svg>` },
  { id: "paw", label: "Paw Print", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><g fill="#334155"><ellipse cx="400" cy="520" rx="120" ry="95"/><circle cx="300" cy="330" r="62"/><circle cx="500" cy="330" r="62"/><circle cx="240" cy="430" r="55"/><circle cx="560" cy="430" r="55"/></g></svg>` },
  { id: "heart", label: "Heart", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800"><path fill="#ef4444" stroke="#7f1d1d" stroke-width="18" d="M400 700C180 560 80 440 80 300 80 190 170 100 280 100c70 0 120 30 120 30s50-30 120-30c110 0 200 90 200 200 0 140-100 260-320 400z"/></svg>` },
];

const TEXT_FONTS = [
  "Arial",
  "Verdana",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Impact",
  "Trebuchet MS",
  "Comic Sans MS",
  "Palatino Linotype",
  "Lucida Console",
  "Tahoma",
  "Gill Sans",
];

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

// Filler words that add no design meaning — stripped so the AI focuses on the
// actual artwork and so different phrasings ("make the shirt red", "red tee
// with a lion", "the color should be blue") all resolve the same way.
const PROMPT_FILLER_WORDS =
  /\b(tshirt|t-shirt|t shirt|shirt|tee|color|colour|make it|make the|make my|the color should be|the colour should be|i want|please|with a|with the|on it|for me)\b/gi;

// Detect a shirt color word inside a natural-language prompt. Returns the hex
// color to apply plus the prompt with the color/filler words removed so the
// image generator only sees the actual design description.
function parsePromptForColor(prompt) {
  const raw = String(prompt || "");
  const lower = raw.toLowerCase();
  for (const [word, hex] of Object.entries(SHIRT_COLOR_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, "i");
    if (re.test(lower)) {
      const cleanedPrompt = raw
        .replace(re, " ")
        .replace(PROMPT_FILLER_WORDS, " ")
        .replace(/\s{2,}/g, " ")
        .trim();
      return { color: hex, cleanedPrompt };
    }
  }
  return { color: null, cleanedPrompt: raw.trim() };
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
  const [textContent, setTextContent] = useState(initialWip?.textContent ?? "");
  const [textFont, setTextFont] = useState(initialWip?.textFont ?? "Arial");
  const [textColor, setTextColor] = useState(initialWip?.textColor ?? "#111827");

  const prevZonesKeyRef = useRef(zones.join(","));

  // Clear zoneDesigns and reset activeZone when print side (zones) changes
  useEffect(() => {
    const nextKey = zones.join(",");
    if (prevZonesKeyRef.current === nextKey) return;
    prevZonesKeyRef.current = nextKey;
    setZoneDesigns({});
    setActiveZone(zones[0] || null);
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
      shirtColor,
      activeTab,
      gallery,
      aiPrompt,
      aiLastPrompt,
      textContent,
      textFont,
      textColor,
    });
  }, [
    zoneDesigns,
    shirtColor,
    activeTab,
    gallery,
    aiPrompt,
    aiLastPrompt,
    textContent,
    textFont,
    textColor,
    onWipChange,
  ]);

  useEffect(() => {
    if (activeDesign?.type !== designType) return;
    if (activeDesign.zones) setZoneDesigns(activeDesign.zones);
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



  // ── Gallery click — assign to active zone ───────────────────────────
  const handleGalleryClick = (item) => {
    setSelectedGalleryId(item.id);
    if (!activeZone) return;
    setZoneDesigns((prev) => ({
      ...prev,
      [activeZone]: { imageUrl: item.url, x: 10, y: 10, w: 80, h: 80 },
    }));
  };

  const applyDesignToActiveZone = (imageUrl) => {
    if (!activeZone) return;
    setZoneDesigns((prev) => ({
      ...prev,
      [activeZone]: { imageUrl, x: 10, y: 10, w: 80, h: 80 },
    }));
  };

  const applyTextToActiveZone = () => {
    if (!textContent.trim()) return;
    applyDesignToActiveZone(
      createTextDesign(textContent.trim(), textFont, textColor),
    );
  };

  // ── Zone design change (drag/resize) ──────────────────────────────
  const handleZoneDesignChange = (zoneId, layer) => {
    setZoneDesigns((prev) => ({ ...prev, [zoneId]: layer }));
  };

  // ── Zone select ───────────────────────────────────────────────────
  const handleZoneSelect = (zoneId) => {
    setActiveZone(zoneId);
  };

  // ── Use this design ───────────────────────────────────────────────
  const hasAnyDesign = Object.values(zoneDesigns).some(Boolean);

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
        zones: uploadedZones,
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

  // ── AI generate wrapper: adapt to natural-language prompts ────────
  // Detects a shirt color word ("make the shirt red", "red tee with a lion")
  // and applies it to the shirt, then strips color/filler words so the image
  // generator only sees the actual design description.
  const handleAiGenerate = async (prompt, activeZone) => {
    const { color, cleanedPrompt } = parsePromptForColor(prompt);
    if (color) applyShirtColor(color);
    return handleGenerate(cleanedPrompt, activeZone);
  };

  // ── Save design ───────────────────────────────────────────────────
  const [saved, setSaved] = useState(false);

  const handleSaveDesign = () => {
    try {
      const savedDesigns = JSON.parse(
        localStorage.getItem("pmg_saved_designs") || "[]",
      );
      savedDesigns.push({
        id: `saved-${Date.now()}`,
        type: designType,
        productLabel,
        zones: zoneDesigns,
        shirtColor,
        textContent,
        textFont,
        textColor,
        savedAt: new Date().toISOString(),
      });
      localStorage.setItem(
        "pmg_saved_designs",
        JSON.stringify(savedDesigns.slice(-20)),
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error("Failed to save design", e);
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
            setActiveZone(zones[0] || null);
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
        className="tsc-save-btn"
        disabled={!hasAnyDesign}
        onClick={handleSaveDesign}
      >
        {saved ? "✓ Saved" : "Save"}
      </button>
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
          <button
            type="button"
            className={`tsc-vtab-btn${activeTab === "designs" ? " active" : ""}`}
            onClick={() => setActiveTab("designs")}
          >
            <FaShapes className="tsc-vtab-icon" />
            Designs
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
              handleGenerate={handleAiGenerate}
              generating={generating}
              genError={genError}
              setGenError={setGenError}
            />
          )}

          {/* Tab 4: Add Text */}
          {activeTab === "text" && (
            <div className="tsc-sidebar-section">
              <div className="tsc-sidebar-header-row">
                <h4>Add Text</h4>
              </div>
              <div className="tsc-spec-field">
                <label className="tsc-spec-label">Text</label>
                <input
                  className="tsc-text-input"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Enter your text..."
                  maxLength={40}
                />
              </div>
              <div className="tsc-spec-field">
                <label className="tsc-spec-label">Font</label>
                <select
                  className="tsc-select-control"
                  value={textFont}
                  onChange={(e) => setTextFont(e.target.value)}
                >
                  {TEXT_FONTS.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>
              <div className="tsc-spec-field">
                <label className="tsc-spec-label">Text Color</label>
                <div className="tsc-text-color-row">
                  <input
                    type="color"
                    className="tsc-text-color-input"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                  />
                  <span className="tsc-text-color-hex">{textColor}</span>
                </div>
              </div>
              <button
                type="button"
                className="tsc-text-apply-btn"
                disabled={!textContent.trim()}
                onClick={applyTextToActiveZone}
              >
                Add Text to {activeZone || "Design"}
              </button>
            </div>
          )}

          {/* Tab 5: Pick a Design */}
          {activeTab === "designs" && (
            <div className="tsc-sidebar-section">
              <div className="tsc-sidebar-header-row">
                <h4>Pick a Design</h4>
              </div>
              <div className="tsc-design-grid">
                {DESIGN_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    className="tsc-design-thumb"
                    title={tpl.label}
                    onClick={() =>
                      applyDesignToActiveZone(svgDataUrl(tpl.svg))
                    }
                  >
                    <img src={svgDataUrl(tpl.svg)} alt={tpl.label} />
                    <span>{tpl.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── 2. Center Placeholders Viewport ───────────────────── */}
        <div className="tsc-center-placeholders">
          <TshirtZoneCanvas
            zones={zones}
            zoneDesigns={zoneDesigns}
            activeZone={activeZone}
            onZoneSelect={handleZoneSelect}
            onZoneDesignChange={handleZoneDesignChange}
            onUploadClick={handleZoneUploadClick}
            aspectRatio={aspectRatio}
          />
        </div>

        {/* ── 3. Right 3D Preview Panel (1:1 aspect ratio) ─────── */}
        <div className="tsc-right-preview">
          <div className="tsc-preview-panel">
            <PreviewComponent
              modelPath={modelPath}
              shirtColor={shirtColor}
              zoneDesigns={zoneDesigns}
              selectedSide={selectedSide}
              zones={zones}
              selectedSize={selectedSize}
              {...mergedPreviewProps}
            />
          </div>
        </div>
      </div>

      {/* Mobile bottom action bar (Save + Use This Design) */}
      <div className="tsc-bottom-action-bar">
        <button
          type="button"
          className="tsc-save-btn"
          disabled={!hasAnyDesign}
          onClick={handleSaveDesign}
        >
          {saved ? "✓ Saved" : "Save"}
        </button>
        <button
          type="button"
          className="tsc-use-btn"
          disabled={!hasAnyDesign || useDesignLoading}
          onClick={handleUseDesign}
        >
          {useDesignLoading ? "Uploading..." : "Use This Design"}
        </button>
      </div>
    </div>
  );
}
