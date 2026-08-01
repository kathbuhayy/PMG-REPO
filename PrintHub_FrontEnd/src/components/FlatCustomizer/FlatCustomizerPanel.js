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
import { useCustomizerUpload } from "../../hooks/useCustomizerUpload";
import AIGeneratePanel from "../AIBuilder/AIGeneratePanel";
import FlatZoneCanvas from "./FlatZoneCanvas";
import FlatPreview3D from "./FlatPreview3D";
import { parseFlatSize } from "../../utils/parseFlatSize";
import { removeGuestDesign } from "../../utils/guestDesigns";
import "../TshirtCustomizer/TshirtCustomizer.css";
import { filterZonesBySide } from "../../config/categoryDefaults";

const FLAT_ZONE_META = [
  { id: "front", label: "FRONT" },
  { id: "back", label: "BACK" },
  { id: "outside", label: "OUTSIDE" },
  { id: "inside", label: "INSIDE" },
  { id: "front_cover", label: "FRONT COVER" },
  { id: "back_cover", label: "BACK COVER" },
];

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

const GUEST_GEN_KEY = "ai_guest_generations";
const GUEST_LIMIT = 3;

function getGuestGenCount() {
  try {
    return parseInt(localStorage.getItem(GUEST_GEN_KEY) || "0", 10) || 0;
  } catch {
    return 0;
  }
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
  } = useCustomizerUpload(config.label, initialWip?.gallery ?? []);

  const zoneFileRefs = useRef({});
  const getZoneRef = (zoneId) => {
    if (!zoneFileRefs.current[zoneId]) {
      zoneFileRefs.current[zoneId] = React.createRef();
    }
    return zoneFileRefs.current[zoneId];
  };

  const [zoneDesigns, setZoneDesigns] = useState(initialWip?.zoneDesigns ?? {});
  const [activeZone, setActiveZone] = useState(zones[0] || null);
  const [activeTab, setActiveTab] = useState("gallery");

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
      shirtColor: baseColor,
      baseColor,
      gallery,
    });
  }, [zoneDesigns, baseColor, gallery, onWipChange]);

  useEffect(() => {
    if (activeDesign?.type !== productType) return;
    if (activeDesign.zones) setZoneDesigns(activeDesign.zones);
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

  const handleClearZone = (zoneId) => {
    setZoneDesigns((prev) => ({ ...prev, [zoneId]: null }));
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
  const hasAnyDesign = Object.values(zoneDesigns).some(Boolean);

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

          {/* AI Generate section */}
          <div style={{ display: activeTab === "ai" ? "block" : "none" }}>
            <AIGeneratePanel
              activeZone={activeZone}
              productLabel={config.label}
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
          </div>
        </div>

        {/* ── 2. Main column: 2D Editor ─────────────────────────── */}
        <div className="tsc-center-placeholders">
          <FlatZoneCanvas
            productType={productType}
            zones={zones}
            zoneDesigns={zoneDesigns}
            activeZone={activeZone}
            onZoneSelect={handleZoneSelect}
            onZoneDesignChange={handleZoneDesignChange}
            onUploadClick={handleZoneUploadClick}
            aspectRatio={aspectRatio}
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
