// src/components/TshirtCustomizer/TshirtCustomizerPanel.js  (replace entire file)
/**
 * TshirtCustomizerPanel
 * Main orchestrator for the t-shirt customizer.
 * Edit / Preview mode split:
 *   Edit mode    - flat 2D zone grid (TshirtZoneCanvas) + Layers panel
 *   Preview mode - 3D model render (PreviewComponent), read-only
 *
 * Props:
 *   product       {object}         - product with print_zones array
 *   onDesignReady {fn}             - called with { type:'tshirt', zoneLayers, zones, zoneTexts, shirtColor }
 *   onClear       {fn}             - called when user removes the active design
 *   activeDesign  {object|null}    - currently applied design meta
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
  FaLayerGroup,
} from "react-icons/fa";
import { useCustomizerUpload } from "../../hooks/useCustomizerUpload";
import AIGeneratePanel from "../AIBuilder/AIGeneratePanel";
import TemplatesPanel from "./TemplatesPanel";
import TshirtZoneCanvas from "./TshirtZoneCanvas";
import TshirtPreview3D from "./TshirtPreview3D";
import LayersPanel from "./LayersPanel";
import { ZONE_META } from "./TshirtZoneCanvas";
import { parseFlatSize, parseSizeInchesRaw } from "../../utils/parseFlatSize";
import { removeGuestDesign } from "../../utils/guestDesigns";
import "./TshirtCustomizer.css";
import { filterZonesBySide } from "../../config/categoryDefaults";
import {
  createImageLayer,
  createTextLayer,
  legacyToZoneLayers,
  deriveLegacyShape,
  addLayer,
  removeLayer,
  updateLayer,
  moveLayer,
  applyToZones,
} from "../../utils/zoneLayerModel";
import { loadImageNaturalSize, getLayerPrintQuality } from "../../utils/layerDpiCheck";



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

  // Real print size in inches (post landscape-swap, matching aspectRatio
  // above) - used to convert the product's admin-set bleed/safe-margin
  // values into on-canvas guide percentages. Uses parseSizeInchesRaw, NOT
  // parseFlatSize - the latter halves and caps dimensions for 3D-scene
  // scale, which would silently corrupt a real-inches calculation.
  const printSizeInches = useMemo(() => {
    if (!selectedSize) return null;
    const parsed = parseSizeInchesRaw(selectedSize);
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

    return { width: w, height: h };
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
    uploadUsedImagesInLayers,
  } = useCustomizerUpload(
    productLabel,
    // Strip dead blob: URLs from restored gallery - blobs are
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

  // ── Unified layer stack state ───────────────────────────────────────
  // { [zoneId]: Layer[] }  - bottom of array = bottom of stack.
  // Accepts either the new shape (initialWip.zoneLayers) or the legacy
  // shape (initialWip.zoneDesigns + initialWip.zoneTexts) restored from
  // a previous session, and migrates the legacy one automatically.
  const [zoneLayers, setZoneLayers] = useState(() => {
    if (initialWip?.zoneLayers) {
      const cleaned = {};
      for (const [zoneId, layers] of Object.entries(initialWip.zoneLayers)) {
        cleaned[zoneId] = (layers || []).filter(
          (l) => !(l.kind === "image" && l.imageUrl?.startsWith("blob:")),
        );
      }
      return cleaned;
    }
    const legacyDesigns = {};
    for (const [zoneId, zoneData] of Object.entries(initialWip?.zoneDesigns ?? {})) {
      if (zoneData?.imageUrl?.startsWith("blob:")) continue;
      legacyDesigns[zoneId] = zoneData;
    }
    return legacyToZoneLayers(legacyDesigns, initialWip?.zoneTexts ?? {});
  });

  const [selectedLayerId, setSelectedLayerId] = useState(null);

  // Edit (flat 2D) vs Preview (3D) mode - the Printify-style split.
  const [mode, setMode] = useState("edit");

  // { [layerId]: { status: 'ready'|'low'|'unknown', dpi } } for the
  // ACTIVE zone's image layers only (that's all the Layers panel shows).
  const [dpiByLayerId, setDpiByLayerId] = useState({});

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

  const prevZonesKeyRef = useRef(zones.join(","));

  // Clear layers and reset activeZone when print side (zones) changes
  useEffect(() => {
    const nextKey = zones.join(",");
    if (prevZonesKeyRef.current === nextKey) return;
    prevZonesKeyRef.current = nextKey;
    setZoneLayers({});
    setActiveZone(zones[0] || null);
    setSelectedLayerId(null);
  }, [zones]);

  // Sync activeZone when product print zones list changes
  useEffect(() => {
    if (zones.length > 0 && (!activeZone || !zones.includes(activeZone))) {
      setActiveZone(zones[0]);
    }
  }, [zones, activeZone]);

  // Shirt color - starts white
  const [shirtColor, setShirtColor] = useState(
    initialWip?.shirtColor ?? "#ffffff",
  );
  const [hexInput, setHexInput] = useState(initialWip?.shirtColor ?? "#ffffff");
  const [sliderHue, setSliderHue] = useState(0);
  const colorInputRef = useRef(null);

  // Synchronize layer image URLs with converted base64 URLs from gallery
  // (blob: URLs get swapped for durable data:/hosted URLs once ready).
  useEffect(() => {
    let changed = false;
    const next = { ...zoneLayers };

    gallery.forEach((item) => {
      if (item.originalBlobUrl && item.url !== item.originalBlobUrl) {
        Object.keys(next).forEach((zoneId) => {
          next[zoneId] = (next[zoneId] || []).map((layer) => {
            if (layer.kind === "image" && layer.imageUrl === item.originalBlobUrl) {
              changed = true;
              return { ...layer, imageUrl: item.url };
            }
            return layer;
          });
        });
      }
    });

    if (changed) {
      setZoneLayers(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallery]);

  // Synchronize changes back to the parent component's WIP state
  useEffect(() => {
    onWipChange?.({
      zoneLayers,
      shirtColor,
      activeTab,
      gallery,
      aiPrompt,
      aiLastPrompt,
    });
  }, [
    zoneLayers,
    shirtColor,
    activeTab,
    gallery,
    aiPrompt,
    aiLastPrompt,
    onWipChange,
  ]);

  useEffect(() => {
    if (activeDesign?.type !== designType) return;
    if (activeDesign.zoneLayers) {
      setZoneLayers(activeDesign.zoneLayers);
    } else if (activeDesign.zones || activeDesign.zoneTexts) {
      setZoneLayers(legacyToZoneLayers(activeDesign.zones, activeDesign.zoneTexts));
    }
    const savedColor =
      activeDesign.shirtColor ||
      activeDesign.productColor ||
      activeDesign.baseColor;
    if (savedColor) applyShirtColor(savedColor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDesign]);

  // ── DPI/print-quality check for the active zone's image layers ─────
  // Loads each new image once to read its native pixel size, caches that
  // on the layer, then computes an effective-DPI badge for the panel.
  useEffect(() => {
    let cancelled = false;
    const layers = zoneLayers[activeZone] || [];
    const imageLayers = layers.filter((l) => l.kind === "image");
    if (imageLayers.length === 0) return undefined;

    (async () => {
      const nextDpi = {};
      for (const layer of imageLayers) {
        let sized = layer;
        if (!layer.naturalWidth) {
          try {
            const size = await loadImageNaturalSize(layer.imageUrl);
            sized = { ...layer, ...size };
            if (!cancelled) {
              setZoneLayers((prev) => updateLayer(prev, activeZone, layer.id, size));
            }
          } catch {
            // Non-fatal - badge just stays "unknown" for this layer.
          }
        }
        nextDpi[layer.id] = getLayerPrintQuality(sized, activeZone);
      }
      if (!cancelled) setDpiByLayerId((prev) => ({ ...prev, ...nextDpi }));
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneLayers, activeZone]);

  // Hidden input ref for gallery upload
  const galleryFileInputRef = useRef(null);

  const handleGalleryUploadClick = () => {
    galleryFileInputRef.current?.click();
  };

  const handleGalleryFileChange = (e) => {
    const item = handleFileChange(e);
    if (item && activeZone) {
      const layer = createImageLayer({ imageUrl: item.url });
      setZoneLayers((prev) => addLayer(prev, activeZone, layer));
      setSelectedLayerId(layer.id);
    }
  };

  // ── Per-zone file upload ──────────────────────────────────────────
  const handleZoneFileChange = (zoneId, e) => {
    const item = handleFileChange(e);
    if (item) {
      const layer = createImageLayer({ imageUrl: item.url });
      setZoneLayers((prev) => addLayer(prev, zoneId, layer));
      setActiveZone(zoneId);
      setSelectedLayerId(layer.id);
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
    setZoneLayers((prev) => addLayer(prev, zoneId, layer));
    setActiveZone(zoneId);
    setSelectedLayerId(layer.id);
    setActiveTab("text");
  };

  // Generic layer field update - used by the text editor fields, the
  // flat canvas drag/resize, and the size-adjust sliders alike.
  const handleLayerUpdate = (zoneId, layerId, updates) => {
    setZoneLayers((prev) => updateLayer(prev, zoneId, layerId, updates));
  };

  const handleLayerRemove = (zoneId, layerId) => {
    setZoneLayers((prev) => removeLayer(prev, zoneId, layerId));
    setSelectedLayerId((prev) => (prev === layerId ? null : prev));
  };

  const handleLayerSelect = (zoneId, layerId) => {
    setActiveZone(zoneId);
    setSelectedLayerId(layerId);
    const layer = (zoneLayers[zoneId] || []).find((l) => l.id === layerId);
    if (layer?.kind === "text") setActiveTab("text");
  };

  const handleMoveLayer = (zoneId, layerId, direction) => {
    setZoneLayers((prev) => moveLayer(prev, zoneId, layerId, direction));
  };

  const handleApplyToAllAreas = () => {
    if (!activeZone || zones.length < 2) return;
    setZoneLayers((prev) =>
      applyToZones(prev, activeZone, zones.filter((z) => z !== activeZone)),
    );
  };

  const activeZoneLayers = zoneLayers[activeZone] || [];
  const activeZoneTextLayers = activeZoneLayers.filter((l) => l.kind === "text");
  const selectedLayer = activeZoneLayers.find((l) => l.id === selectedLayerId) || null;
  const activeTextLayer = selectedLayer?.kind === "text" ? selectedLayer : null;

  const updateActiveText = (updates) => {
    if (!activeZone || !selectedLayerId) return;
    handleLayerUpdate(activeZone, selectedLayerId, updates);
  };

  const handleTextRemove = (zoneId, textId) => {
    handleLayerRemove(zoneId, textId);
  };

  // ── Gallery click - assign to active zone ───────────────────────────
  const handleGalleryClick = (item) => {
    setSelectedGalleryId(item.id);
    if (!activeZone) return;
    const layer = createImageLayer({ imageUrl: item.url });
    setZoneLayers((prev) => addLayer(prev, activeZone, layer));
    setSelectedLayerId(layer.id);
  };

  const handleClearZone = (zoneId) => {
    setZoneLayers((prev) => ({ ...prev, [zoneId]: [] }));
    setSelectedLayerId((prev) =>
      (zoneLayers[zoneId] || []).some((l) => l.id === prev) ? null : prev,
    );
  };

  // ── Zone select ───────────────────────────────────────────────────
  const handleZoneSelect = (zoneId) => {
    setActiveZone(zoneId);
  };

  // ── Selected layer (image/text) size controls ──────────────────────
  const selectedLayerData = useMemo(() => {
    if (!selectedLayer) return null;
    return {
      kind: selectedLayer.kind,
      zoneId: activeZone,
      id: selectedLayer.id,
      x: selectedLayer.x ?? 10,
      y: selectedLayer.y ?? 10,
      w: selectedLayer.w ?? 80,
      h: selectedLayer.h ?? (selectedLayer.kind === "text" ? 20 : 80),
    };
  }, [selectedLayer, activeZone]);

  // Resize the selected image/text layer while keeping its center fixed
  const resizeSelectedLayer = (newW, newH) => {
    if (!selectedLayer || !activeZone) return;

    const clampValue = (v, min, max) => Math.max(min, Math.min(max, v));
    const width = clampValue(Number(newW) || 5, 5, 100);
    const height = clampValue(Number(newH) || 5, 5, 100);

    const oldW = selectedLayer.w ?? 80;
    const oldH = selectedLayer.h ?? 80;
    const oldX = selectedLayer.x ?? 10;
    const oldY = selectedLayer.y ?? 10;

    const centerX = oldX + oldW / 2;
    const centerY = oldY + oldH / 2;

    const x = clampValue(centerX - width / 2, 0, 100 - width);
    const y = clampValue(centerY - height / 2, 0, 100 - height);

    handleLayerUpdate(activeZone, selectedLayer.id, { x, y, w: width, h: height });
  };

  // ── Use this design ───────────────────────────────────────────────
  const hasAnyDesign = Object.values(zoneLayers).some(
    (layers) => layers && layers.length > 0,
  );

  const applyShirtColor = (color) => {
    const normalized = normalizeHexColor(color);
    if (!normalized) return false;
    setShirtColor(normalized);
    setHexInput(normalized);
    return true;
  };

  const [useDesignLoading, setUseDesignLoading] = useState(false);

  const isStaffOrAdmin = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      return u?.role === "admin" || u?.role === "staff";
    } catch {
      return false;
    }
  }, []);

  const handleApplyTemplate = (template) => {
    if (!template?.zoneLayers) return;
    const remapped = {};
    Object.entries(template.zoneLayers).forEach(([zoneId, layers]) => {
      remapped[zoneId] = (layers || []).map((l) => ({
        ...l,
        id: `${l.kind === "image" ? "img" : "text"}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      }));
    });
    setZoneLayers(remapped);
    setSelectedLayerId(null);
    if (template.baseColor) applyShirtColor(template.baseColor);
    setActiveTab("specs");
  };

  // ── Mockup View (Preview mode) ──────────────────────────────────────
  // Only TshirtPreview3D currently exposes the setView/captureSnapshot
  // ref API (it's wrapped in forwardRef). Other product PreviewComponents
  // (Cap, Mug, etc.) haven't been upgraded yet, so we detect support at
  // render time and simply hide the panel for those rather than attach
  // a ref to a plain function component (which React would warn about).
  const previewRef = useRef(null);
  const previewSupportsMockupView =
    PreviewComponent?.$$typeof === Symbol.for("react.forward_ref");
  const [activeMockupView, setActiveMockupView] = useState("front");
  const [mockupThumbnails, setMockupThumbnails] = useState(null);
  const [mockupThumbnailsLoading, setMockupThumbnailsLoading] = useState(false);

  // Generate the Front/Back/Left/Right thumbnail grid whenever Preview
  // mode opens. Two things load asynchronously and independently: the GLB
  // model itself, AND the design texture painted onto it (loaded via a
  // plain <img>.onload inside TshirtPreview3D). Polling only confirms the
  // model/camera refs exist - it does NOT confirm the texture has finished
  // loading, so an early "successful" capture can permanently bake in a
  // blank/black shirt. Fix: keep re-capturing for a bit even after the
  // first success, so a later pass overwrites the stale black snapshot
  // once the texture actually lands.
  useEffect(() => {
    if (mode !== "preview" || !previewSupportsMockupView) return undefined;

    let cancelled = false;
    let attempts = 0;
    setMockupThumbnails(null);
    setMockupThumbnailsLoading(true);

    const tryCapture = ({ isFollowUp = false } = {}) => {
      if (cancelled) return;
      const shots = previewRef.current?.captureAllViews?.();
      if (shots) {
        setMockupThumbnails(shots);
        setMockupThumbnailsLoading(false);
        if (!isFollowUp) {
          // Re-capture a couple more times to catch a texture that was
          // still loading during this first successful pass.
          setTimeout(() => tryCapture({ isFollowUp: true }), 800);
          setTimeout(() => tryCapture({ isFollowUp: true }), 1800);
        }
        return;
      }
      attempts += 1;
      if (attempts < 30) {
        setTimeout(tryCapture, 200);
      } else {
        setMockupThumbnailsLoading(false);
      }
    };

    const initialDelay = setTimeout(() => tryCapture(), 200);
    return () => {
      cancelled = true;
      clearTimeout(initialDelay);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, previewSupportsMockupView]);

  const handleSetMockupView = (view) => {
    setActiveMockupView(view);
    previewRef.current?.setView?.(view);
  };

  const handleDownloadMockup = () => {
    const dataUrl = previewRef.current?.captureSnapshot?.();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${productLabel.replace(/\s+/g, "-").toLowerCase()}-mockup-${activeMockupView}.png`;
    link.click();
  };

  const handleUseDesign = async () => {
    setUseDesignLoading(true);
    try {
      const uploadedLayers = await uploadUsedImagesInLayers(zoneLayers);
      const { zones: legacyZones, zoneTexts: legacyZoneTexts } = deriveLegacyShape(uploadedLayers);
      const primaryImage =
        legacyZones.front?.imageUrl ||
        Object.values(legacyZones).find(Boolean)?.imageUrl ||
        null;
      onDesignReady({
        type: designType,
        category: designType,
        zoneLayers: uploadedLayers,
        // Legacy fields kept for AdminOrders.js and any other reader that
        // hasn't been updated to the stacked-layer shape yet. Lossy for
        // multi-image zones (bottom image only) - see deriveLegacyShape.
        zones: legacyZones,
        zoneTexts: legacyZoneTexts,
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
            setZoneLayers({});
            setSelectedLayerId(null);
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

  // Legacy-shaped view of the current layers, for the 3D Preview mode
  // (PreviewComponent hasn't been updated to render a full stack yet -
  // it shows each zone's bottom-most image, same limitation as the
  // save-format fallback above). Text layers pass through as before.
  const previewLegacyShape = useMemo(() => deriveLegacyShape(zoneLayers), [zoneLayers]);

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

      {/* Edit / Preview mode toggle - Printify-style */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <div className="tsc-mode-toggle">
          <button
            type="button"
            className={`tsc-mode-btn${mode === "edit" ? " active" : ""}`}
            onClick={() => setMode("edit")}
          >
            Edit
          </button>
          <button
            type="button"
            className={`tsc-mode-btn${mode === "preview" ? " active" : ""}`}
            onClick={() => setMode("preview")}
            disabled={!hasAnyDesign}
            title={!hasAnyDesign ? "Add a design first" : "Preview on the 3D model"}
          >
            Preview
          </button>
        </div>
      </div>

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
            className={`tsc-vtab-btn${activeTab === "templates" ? " active" : ""}`}
            onClick={() => setActiveTab("templates")}
          >
            <FaLayerGroup className="tsc-vtab-icon" />
            Templates
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

              {activeZoneTextLayers.length === 0 && (
                <span className="tsc-gallery-empty" style={{ display: "block" }}>
                  No text yet. Click a zone, then "+ Add".
                </span>
              )}

              {activeZoneTextLayers.length > 0 && (
                <div className="tsc-text-list">
                  {activeZoneTextLayers.map((t) => (
                    <div
                      key={t.id}
                      className={`tsc-text-list-item${selectedLayerId === t.id ? " active" : ""
                        }`}
                      onClick={() => setSelectedLayerId(t.id)}
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
                  const layer = createImageLayer({ imageUrl: item.url });
                  setZoneLayers((prev) => addLayer(prev, activeZone, layer));
                  setSelectedLayerId(layer.id);
                }
              }}
              handleGenerate={handleGenerate}
              generating={generating}
              genError={genError}
              setGenError={setGenError}
            />
          )}

          {/* Tab: Templates */}
          {activeTab === "templates" && (
            <TemplatesPanel
              category={designType}
              isStaffOrAdmin={isStaffOrAdmin}
              onApply={handleApplyTemplate}
              getCurrentDesign={() => ({ zoneLayers, baseColor: shirtColor })}
            />
          )}

          {/* Image/Text Size controls - shown whenever a layer is selected */}
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
                  onClick={() => setSelectedLayerId(null)}
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

          {/* Persistent Layers panel - replaces the old per-zone upload
              slot list. Visible under every tab, shows the active
              zone's full stack with DPI badges, reorder, and delete. */}
          <LayersPanel
            layers={activeZoneLayers}
            selectedLayerId={selectedLayerId}
            onSelect={(layerId) => handleLayerSelect(activeZone, layerId)}
            onRemove={(layerId) => handleLayerRemove(activeZone, layerId)}
            onMove={(layerId, direction) => handleMoveLayer(activeZone, layerId, direction)}
            onApplyToAll={zones.length > 1 ? handleApplyToAllAreas : undefined}
            dpiByLayerId={dpiByLayerId}
          />
        </div>

        {/* ── 2/3. Main Canvas - Edit (flat) or Preview (3D) ───── */}
        {mode === "edit" ? (
          <div className="tsc-right-preview">
            <div className="tsc-preview-panel">
              <TshirtZoneCanvas
                zones={zones}
                zoneLayers={zoneLayers}
                selectedLayerId={selectedLayerId}
                activeZone={activeZone}
                onZoneSelect={handleZoneSelect}
                onLayerSelect={handleLayerSelect}
                onLayerChange={handleLayerUpdate}
                onLayerRemove={handleLayerRemove}
                onZoneClear={handleClearZone}
                onUploadClick={handleZoneUploadClick}
                aspectRatio={aspectRatio}
                printSizeInches={printSizeInches}
                bleedInches={product?.bleedInches}
                safeMarginInches={product?.safeMarginInches}
              />
            </div>
          </div>
        ) : (
          <div className="tsc-right-preview">
            <div className="tsc-preview-panel" style={{ display: "flex", gap: 16, flexDirection: "row" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <PreviewComponent
                  {...(previewSupportsMockupView ? { ref: previewRef } : {})}
                  modelPath={modelPath}
                  shirtColor={shirtColor}
                  zoneDesigns={previewLegacyShape.zones}
                  zoneTexts={previewLegacyShape.zoneTexts}
                  selectedSide={selectedSide}
                  zones={zones}
                  selectedSize={selectedSize}
                  activeZone={activeZone}
                  activeTextId={null}
                  onZoneSelect={handleZoneSelect}
                  {...mergedPreviewProps}
                />
              </div>

              {previewSupportsMockupView && (
                <div className="lp-panel" style={{ width: 190, flexShrink: 0, borderTop: "none", paddingTop: 0, marginTop: 0 }}>
                  <div className="lp-header" style={{ marginBottom: 12 }}>
                    <span>Mockup View</span>
                  </div>
                  <div className="mv-grid">
                    {[
                      { id: "front", label: "Front" },
                      { id: "back", label: "Back" },
                      { id: "left", label: "Left" },
                      { id: "right", label: "Right" },
                    ].map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className={`mv-thumb${activeMockupView === v.id ? " active" : ""}`}
                        onClick={() => handleSetMockupView(v.id)}
                      >
                        <div className="mv-thumb-img">
                          {mockupThumbnails?.[v.id] ? (
                            <img src={mockupThumbnails[v.id]} alt={v.label} />
                          ) : (
                            <span className="mv-thumb-spinner" />
                          )}
                        </div>
                        <span className="mv-thumb-label">{v.label}</span>
                      </button>
                    ))}
                  </div>

                  {mockupThumbnailsLoading && (
                    <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 4 }}>
                      Rendering angles…
                    </p>
                  )}

                  <button
                    type="button"
                    className="lp-apply-all-btn"
                    style={{ width: "100%", marginTop: 12 }}
                    onClick={handleDownloadMockup}
                  >
                    Download mockup
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}