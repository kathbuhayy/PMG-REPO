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
} from "react-icons/fa";
import { useCustomizerUpload } from "../../hooks/useCustomizerUpload";
import AIGeneratePanel from "../AIBuilder/AIGeneratePanel";
import TshirtZoneCanvas from "./TshirtZoneCanvas";
import TshirtPreview3D from "./TshirtPreview3D";
import { parseFlatSize } from "../../utils/parseFlatSize";
import { removeGuestDesign } from "../../utils/guestDesigns";
import "./TshirtCustomizer.css";
import { filterZonesBySide } from "../../config/categoryDefaults";

const ZONE_META = [
  { id: "front", label: "FRONT" },
  { id: "back", label: "BACK" },
  { id: "left_sleeve", label: "LEFT SLEEVE" },
  { id: "right_sleeve", label: "RIGHT SLEEVE" },
  { id: "front_cover", label: "FRONT COVER" },
  { id: "back_cover", label: "BACK COVER" },
  { id: "outside", label: "OUTSIDE" },
  { id: "inside", label: "INSIDE" },
];

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
    uploading,
    uploadError,
    handleFileChange,
    handleGenerate,
    generating,
    genError,
    setGenError,
    uploadUsedImages,
  } = useCustomizerUpload(productLabel, initialWip?.gallery ?? []);

  // Per-zone file input refs
  const zoneFileRefs = useRef({});
  const getZoneRef = (zoneId) => {
    if (!zoneFileRefs.current[zoneId]) {
      zoneFileRefs.current[zoneId] = React.createRef();
    }
    return zoneFileRefs.current[zoneId];
  };

  // Zone placement state
  const [zoneDesigns, setZoneDesigns] = useState(initialWip?.zoneDesigns ?? {});
  const [activeZone, setActiveZone] = useState(zones[0] || null);

  // Progressive Disclosure Sidebar Tab state
  const [activeTab, setActiveTab] = useState(initialWip?.activeTab ?? "specs"); // "specs" | "gallery" | "color" | "ai"

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
    });
  }, [zoneDesigns, shirtColor, activeTab, gallery, onWipChange]);

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

  const handleClearZone = (zoneId) => {
    setZoneDesigns((prev) => ({ ...prev, [zoneId]: null }));
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
                    {product.sides.map((side) => (
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
    </div>
  );
}
