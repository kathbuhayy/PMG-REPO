// src/components/TshirtCustomizer/TshirtCustomizerPanel.js  (replace entire file)
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
  FaShapes,
  FaLock,
  FaLockOpen,
  FaSlidersH,
} from "react-icons/fa";
import { useCustomizerUpload } from "../../hooks/useCustomizerUpload";
import AIGeneratePanel from "../AIBuilder/AIGeneratePanel";
import TemplatesPanel from "./TemplatesPanel";
import FabricZoneCanvas, { ZONE_META } from "./FabricZoneCanvas";
import TshirtPreview3D from "./TshirtPreview3D";
import LayersPanel from "./LayersPanel";
import { parseFlatSize, parseSizeInchesRaw } from "../../utils/parseFlatSize";
import { removeGuestDesign } from "../../utils/guestDesigns";
import "./TshirtCustomizer.css";
import { filterZonesBySide } from "../../config/categoryDefaults";
import {
  createImageLayer,
  createTextLayer,
  createShapeLayer,
  createPatternLayer,
  legacyToZoneLayers,
  deriveLegacyShape,
  addLayer,
  removeLayer,
  updateLayer,
  moveLayer,
  applyToZones,
  toggleLayerLock,
} from "../../utils/zoneLayerModel";
import { loadImageNaturalSize, getLayerPrintQuality } from "../../utils/layerDpiCheck";
import { renderZoneLayersToDataURL, renderZoneLayersToFabricCanvas } from "../../utils/fabricZoneRenderer";
import {
  computeResolutionScore,
  computeSafeAreaScore,
  computeColorContrastScore,
  computeOverallScore,
} from "../../utils/printReadiness";
import { SHAPE_PATHS, SHAPE_LABELS } from "../../utils/shapeDefs";
import { PATTERN_TYPES, PATTERN_LABELS, buildPatternPreviewDataUrl } from "../../utils/patternDefs";
import { TEXT_FONTS, FONT_CATEGORIES, loadGoogleFonts } from "../../config/textFonts";
import { buildApiUrl } from "../../config/api";
import { getZoneDimensions } from "../../utils/zoneDimensions";



const TSHIRT_GLB = "/models/texture.glb";
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

  const [fontSearch, setFontSearch] = useState("");
  const [fontCategory, setFontCategory] = useState("Sans");

  useEffect(() => {
    if (activeTab === "text") loadGoogleFonts();
  }, [activeTab]);

  const filteredFonts = useMemo(() => {
    const q = fontSearch.trim().toLowerCase();
    return TEXT_FONTS.filter((f) => {
      const matchesCategory = !fontSearch && f.category === fontCategory;
      const matchesSearch = q && f.name.toLowerCase().includes(q);
      return fontSearch ? matchesSearch : matchesCategory;
    });
  }, [fontSearch, fontCategory]);

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

    // Per-zone color overrides (currently just the 4 hem meshes) - { [zoneId]: hexColor }
  const [zoneColors, setZoneColors] = useState(initialWip?.zoneColors ?? {});

  const applyZoneColor = (zoneId, color) => {
    const normalized = normalizeHexColor(color);
    if (!normalized) return false;
    setZoneColors((prev) => ({ ...prev, [zoneId]: normalized }));
    return true;
  };

  const HEM_ZONE_OPTIONS = [
    { id: "neck", label: "Neck Hem" },
    { id: "front_hem", label: "Bottom Hem (Front)" },
    { id: "back_hem", label: "Bottom Hem (Back)" },
    { id: "left_hem", label: "Left Sleeve Hem" },
    { id: "right_hem", label: "Right Sleeve Hem" },
  ];

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
      zoneColors,
      activeTab,
      gallery,
      aiPrompt,
      aiLastPrompt,
    });
  }, [
    zoneLayers,
    shirtColor,
    zoneColors,
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
        if (activeDesign.zoneColors) setZoneColors(activeDesign.zoneColors);
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

    // ── Print Readiness Score ────────────────────────────────────────────
  // Separate from the active-zone-only DPI check above (which only feeds
  // the Layers panel badge) - this one checks every zone, since the score
  // should reflect the whole design, not just whichever zone happens to
  // be selected right now.
  const [dpiByZoneAndLayer, setDpiByZoneAndLayer] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const nextByZone = {};
      for (const [zoneId, layers] of Object.entries(zoneLayers)) {
        const imageLayers = layers.filter((l) => l.kind === "image");
        if (imageLayers.length === 0) continue;
        const nextForZone = {};
        for (const layer of imageLayers) {
          let sized = layer;
          if (!layer.naturalWidth) {
            try {
              const size = await loadImageNaturalSize(layer.imageUrl);
              sized = { ...layer, ...size };
            } catch {
              // Non-fatal - this layer just won't contribute a resolution score.
            }
          }
          nextForZone[layer.id] = getLayerPrintQuality(sized, zoneId);
        }
        nextByZone[zoneId] = nextForZone;
      }
      if (!cancelled) setDpiByZoneAndLayer(nextByZone);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoneLayers]);

  const [readinessScore, setReadinessScore] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resolution = computeResolutionScore(dpiByZoneAndLayer);
      const safeArea = computeSafeAreaScore(zoneLayers, printSizeInches, product?.safeMarginInches);

      let colorContrast = { score: 100, label: "No design to sample", ratio: null };
      const anyZoneWithContent = Object.entries(zoneLayers).find(([, layers]) => layers?.length > 0);
      if (anyZoneWithContent) {
        try {
          const [, layers] = anyZoneWithContent;
          const staticCanvas = await renderZoneLayersToFabricCanvas(layers, 256, 256);
          const canvas = staticCanvas.getElement();
          colorContrast = computeColorContrastScore(canvas, shirtColor);
        } catch {
          // Non-fatal - contrast sub-score just falls back to its default.
        }
      }

      if (!cancelled) {
        setReadinessScore({
          overall: computeOverallScore({ resolution, safeArea, colorContrast }),
          resolution,
          safeArea,
          colorContrast,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dpiByZoneAndLayer, zoneLayers, printSizeInches, shirtColor, product?.safeMarginInches]);

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

  const handleAddShape = (shapeType) => {
    if (!activeZone) return;
    const layer = createShapeLayer({ shapeType });
    setZoneLayers((prev) => addLayer(prev, activeZone, layer));
    setSelectedLayerId(layer.id);
  };

  const handleAddPattern = (patternType) => {
    if (!activeZone) return;
    const layer = createPatternLayer({ patternType });
    setZoneLayers((prev) => addLayer(prev, activeZone, layer));
    setSelectedLayerId(layer.id);
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
  const activeShapeLayer = selectedLayer?.kind === "shape" ? selectedLayer : null;
  const activePatternLayer = selectedLayer?.kind === "pattern" ? selectedLayer : null;

  const updateActiveShape = (updates) => {
    if (!activeZone || !selectedLayerId) return;
    handleLayerUpdate(activeZone, selectedLayerId, updates);
  };

  const updateActivePattern = (updates) => {
    if (!activeZone || !selectedLayerId) return;
    handleLayerUpdate(activeZone, selectedLayerId, updates);
  };

  const updateActiveText = (updates) => {
    if (!activeZone || !selectedLayerId) return;
    handleLayerUpdate(activeZone, selectedLayerId, updates);
  };

  const updateActiveLayer = (updates) => {
    if (!activeZone || !selectedLayerId) return;
    handleLayerUpdate(activeZone, selectedLayerId, updates);
  };

  const toggleActiveLayerLock = () => {
    if (!selectedLayer) return;
    updateActiveLayer({ locked: !selectedLayer.locked });
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
        id: `${l.kind}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
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
    if (!previewSupportsMockupView) return undefined;

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
  }, [previewSupportsMockupView, zoneLayers, shirtColor]);

  const handleSetMockupView = (view) => {
    setActiveMockupView(view);
    previewRef.current?.setView?.(view);
  };

  // ── "Real Life Picture Preview" (Printful) ──────────────────────────
  // Composites the current front-zone design onto Printful's real studio
  // photo of an actual blank garment. Only offered for designType/category
  // "tshirt" right now, matching the backend's PRINTFUL_CATALOG mapping -
  // hides itself for anything else rather than showing a broken button.
  const [realLifePreview, setRealLifePreview] = useState(null); // { status: 'loading'|'error'|'result', message, mockups }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

    const handleRealLifePreview = async () => {
    setRealLifePreview({ status: "loading", message: "Preparing your design…" });
    try {
      // Flatten + upload every zone that actually has a layer in it -
      // front/back/sleeves all get their own mockup image if populated.
      const zonesWithContent = Object.entries(zoneLayers).filter(
        ([, layers]) => layers && layers.length > 0,
      );
      if (zonesWithContent.length === 0) {
        throw new Error("Add a design to at least one zone first.");
      }

      const designs = [];
      for (const [zoneId, layers] of zonesWithContent) {
        setRealLifePreview({ status: "loading", message: `Preparing ${zoneId} design…` });
        const dataUrl = await renderZoneLayersToDataURL(layers, 1024);

        setRealLifePreview({ status: "loading", message: `Uploading ${zoneId} design…` });
        const uploadRes = await fetch(buildApiUrl("/api/mockup/upload-design"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.message || `Failed to upload ${zoneId} design.`);
        designs.push({ zoneId, imageUrl: uploadData.url });
      }

      setRealLifePreview({ status: "loading", message: "Mapping your designs onto real product photos…" });
      const taskRes = await fetch(buildApiUrl("/api/mockup/printful/create-task"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designs, category: designType, shirtColor }),
      });
      const taskData = await taskRes.json();
      if (!taskRes.ok) throw new Error(taskData.message || "Failed to create mockup task.");

      const POLL_INTERVAL_MS = 1500;
      const MAX_ATTEMPTS = 20;
      let mockups = null;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        setRealLifePreview({
          status: "loading",
          message: `Rendering your mockups… (${attempt}/${MAX_ATTEMPTS})`,
        });

        const statusRes = await fetch(
          buildApiUrl(`/api/mockup/printful/task-status?taskKey=${taskData.taskKey}`),
        );
        const statusData = await statusRes.json();
        if (!statusRes.ok) throw new Error(statusData.message || "Failed to check mockup status.");

        if (statusData.status === "completed") {
          mockups = statusData.mockups || [];
          break;
        }
        if (statusData.status === "failed") {
          throw new Error("Printful reported the mockup task failed.");
        }
        await wait(POLL_INTERVAL_MS);
      }

      if (!mockups || mockups.length === 0) throw new Error("Timed out waiting for the mockup to render.");
      setRealLifePreview({ status: "result", mockups });
    } catch (err) {
      setRealLifePreview({ status: "error", message: err.message || "Something went wrong." });
    }
  };

    const handleSudoMockPreview = async () => {
    setRealLifePreview({ status: "loading", message: "Preparing your design…" });
    try {
      const zonesWithContent = Object.entries(zoneLayers).filter(
        ([, layers]) => layers && layers.length > 0,
      );
      if (zonesWithContent.length === 0) {
        throw new Error("Add a design to at least one zone first.");
      }

      const designs = [];
      for (const [zoneId, layers] of zonesWithContent) {
        setRealLifePreview({ status: "loading", message: `Preparing ${zoneId} design…` });
        // Flatten at this zone's real SudoMock print-area aspect ratio
        // (not a generic square) so "fit"/"center" on SudoMock's side
        // doesn't stretch/reposition the design relative to the 3D preview.
        const dims = getZoneDimensions(zoneId);
        const dataUrl = await renderZoneLayersToDataURL(
          layers,
          dims ? { width: dims.width * 2, height: dims.height * 2 } : 1024,
        );

        setRealLifePreview({ status: "loading", message: `Uploading ${zoneId} design…` });
        const uploadRes = await fetch(buildApiUrl("/api/mockup/upload-design"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dataUrl }),
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadData.message || `Failed to upload ${zoneId} design.`);
        designs.push({ zoneId, imageUrl: uploadData.url });
      }

      setRealLifePreview({ status: "loading", message: "Rendering your mockup…" });
      const renderRes = await fetch(buildApiUrl("/api/mockup/sudomock/render"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designs, category: designType, shirtColor }),
      });
      const renderData = await renderRes.json();
      if (!renderRes.ok) throw new Error(renderData.message || "Failed to render mockup.");

      setRealLifePreview({ status: "result", mockups: renderData.mockups || [] });
    } catch (err) {
      setRealLifePreview({ status: "error", message: err.message || "Something went wrong." });
    }
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
        zones: legacyZones,
        zoneTexts: legacyZoneTexts,
        shirtColor,
        zoneColors,
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
            setZoneColors({});
            setSliderHue(0);
            onClear?.();
          }}
        >
          Clear All
        </button>
      )}
      {designType === "tshirt" && (
        <button
          type="button"
          className="tsc-clear-btn"
          disabled={!hasAnyDesign}
          onClick={handleSudoMockPreview}
        >
          View SudoMock Preview
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
            className={`tsc-vtab-btn${activeTab === "graphics" ? " active" : ""}`}
            onClick={() => setActiveTab("graphics")}
          >
            <FaShapes className="tsc-vtab-icon" />
            Graphics
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
                    <input
                      type="text"
                      className="tsc-text-input"
                      placeholder="Search fonts…"
                      value={fontSearch}
                      onChange={(e) => setFontSearch(e.target.value)}
                      style={{ marginBottom: 8 }}
                    />
                    {!fontSearch && (
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {FONT_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            className={`tsc-text-toggle-btn${fontCategory === cat ? " active" : ""}`}
                            onClick={() => setFontCategory(cat)}
                            style={{ fontSize: 11, padding: "4px 10px" }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                    <div
                      style={{
                        maxHeight: 180,
                        overflowY: "auto",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                      }}
                    >
                      {filteredFonts.length === 0 && (
                        <p style={{ fontSize: 12, color: "#94a3b8", padding: "10px 12px", margin: 0 }}>
                          No fonts match "{fontSearch}".
                        </p>
                      )}
                      {filteredFonts.map((f) => (
                        <button
                          key={f.name}
                          type="button"
                          onClick={() => updateActiveText({ fontFamily: f.name })}
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            padding: "8px 12px",
                            border: "none",
                            borderBottom: "1px solid #f1f5f9",
                            background: activeTextLayer.fontFamily === f.name ? "#eff6ff" : "#fff",
                            cursor: "pointer",
                            fontFamily: f.name,
                            fontSize: 15,
                            color: "#111827",
                          }}
                        >
                          {f.name}
                        </button>
                      ))}
                    </div>
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
                      className="tsc-slider"
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

                  <div className="tsc-text-editor-field">
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <label className="tsc-spec-label">Curve</label>
                      <button
                        type="button"
                        onClick={() => updateActiveText({ curve: 0 })}
                        style={{ fontSize: 11, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}
                      >
                        Reset
                      </button>
                    </div>
                    <input
                      type="range"
                      min={-100}
                      max={100}
                      value={activeTextLayer.curve || 0}
                      onChange={(e) => updateActiveText({ curve: Number(e.target.value) })}
                      className="tsc-slider"
                    />
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

              <div className="tsc-color-section" style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #e5e7eb" }}>
                <div className="tsc-color-label">HEM COLORS</div>
                {HEM_ZONE_OPTIONS.map(({ id, label }) => (
                  <div
                    key={id}
                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}
                  >
                    <label className="tsc-spec-label" style={{ margin: 0 }}>{label}</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="color"
                        value={zoneColors[id] || shirtColor}
                        onChange={(e) => applyZoneColor(id, e.target.value)}
                      />
                      {zoneColors[id] && (
                        <button
                          type="button"
                          className="tsc-text-toggle-btn"
                          title="Match base color"
                          onClick={() =>
                            setZoneColors((prev) => {
                              const next = { ...prev };
                              delete next[id];
                              return next;
                            })
                          }
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                ))}
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

          {/* Tab: Graphics (shapes library) */}
          {activeTab === "graphics" && (
            <div className="tsc-sidebar-section">
              <div className="tsc-sidebar-header-row">
                <h4>Graphics</h4>
              </div>
              <div className="mv-grid">
                {Object.keys(SHAPE_PATHS).map((shapeType) => (
                  <button
                    key={shapeType}
                    type="button"
                    className="mv-thumb"
                    disabled={!activeZone}
                    onClick={() => handleAddShape(shapeType)}
                    title={`Add ${SHAPE_LABELS[shapeType]}`}
                  >
                    <div className="mv-thumb-img">
                      <svg viewBox="0 0 100 100" width="60%" height="60%">
                        <path d={SHAPE_PATHS[shapeType]} fill="#111827" />
                      </svg>
                    </div>
                    <span className="mv-thumb-label">{SHAPE_LABELS[shapeType]}</span>
                  </button>
                ))}
              </div>
              {!activeZone && (
                <p className="tsc-gallery-empty" style={{ marginTop: 10 }}>
                  Select a zone first to add a shape.
                </p>
              )}

              <div style={{ borderTop: "1px solid #e5e7eb", margin: "16px 0" }} />

              <div className="tsc-sidebar-header-row">
                <h4>Patterns</h4>
              </div>
              <div className="mv-grid">
                {PATTERN_TYPES.map((patternType) => (
                  <button
                    key={patternType}
                    type="button"
                    className="mv-thumb"
                    disabled={!activeZone}
                    onClick={() => handleAddPattern(patternType)}
                    title={`Add ${PATTERN_LABELS[patternType]}`}
                  >
                    <div className="mv-thumb-img">
                      <img
                        src={buildPatternPreviewDataUrl(patternType, 20, "#111827", "#ffffff")}
                        alt={PATTERN_LABELS[patternType]}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    </div>
                    <span className="mv-thumb-label">{PATTERN_LABELS[patternType]}</span>
                  </button>
                ))}
              </div>
              {!activeZone && (
                <p className="tsc-gallery-empty" style={{ marginTop: 10 }}>
                  Select a zone first to add a pattern.
                </p>
              )}
            </div>
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

          {/* Shape fill color - only when a shape layer is selected */}
          {activeShapeLayer && (
            <div className="tsc-sidebar-section">
              <label className="tsc-spec-label">Shape color</label>
              <input
                type="color"
                value={activeShapeLayer.fillColor}
                onChange={(e) => updateActiveShape({ fillColor: e.target.value })}
              />

              <div style={{ marginTop: 12 }}>
                <div className="tsc-sidebar-header-row" style={{ marginBottom: 8 }}>
                  <label className="tsc-spec-label" style={{ margin: 0 }}>
                    Outline
                  </label>
                  <button
                    type="button"
                    className={`tsc-text-toggle-btn${activeShapeLayer.strokeColor ? " active" : ""}`}
                    onClick={() =>
                      updateActiveShape({
                        strokeColor: activeShapeLayer.strokeColor ? null : "#000000",
                        strokeWidth: activeShapeLayer.strokeWidth || 4,
                      })
                    }
                  >
                    {activeShapeLayer.strokeColor ? "On" : "Off"}
                  </button>
                </div>
                {activeShapeLayer.strokeColor && (
                  <>
                    <input
                      type="color"
                      value={activeShapeLayer.strokeColor}
                      onChange={(e) => updateActiveShape({ strokeColor: e.target.value })}
                      style={{ marginBottom: 8 }}
                    />
                    <label className="tsc-spec-label">Outline width ({activeShapeLayer.strokeWidth})</label>
                    <input
                      type="range"
                      min={1}
                      max={20}
                      value={activeShapeLayer.strokeWidth}
                      onChange={(e) => updateActiveShape({ strokeWidth: Number(e.target.value) })}
                      className="tsc-slider"
                    />
                  </>
                )}
              </div>
            </div>
          )}

          {/* Pattern colors + tile size - only when a pattern layer is selected */}
          {activePatternLayer && (
            <div className="tsc-sidebar-section">
              <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                <div>
                  <label className="tsc-spec-label">Pattern color</label>
                  <input
                    type="color"
                    value={activePatternLayer.fillColor}
                    onChange={(e) => updateActivePattern({ fillColor: e.target.value })}
                  />
                </div>
                <div>
                  <label className="tsc-spec-label">Background</label>
                  <input
                    type="color"
                    value={activePatternLayer.backgroundColor}
                    onChange={(e) => updateActivePattern({ backgroundColor: e.target.value })}
                  />
                </div>
              </div>
              <label className="tsc-spec-label">
                Pattern size ({activePatternLayer.tileSize})
              </label>
              <input
                type="range"
                min={8}
                max={40}
                value={activePatternLayer.tileSize}
                onChange={(e) => updateActivePattern({ tileSize: Number(e.target.value) })}
                className="tsc-slider"
              />
            </div>
          )}

          {/* Opacity + lock - applies to every layer kind. */}
          {selectedLayer && (
            <div className="tsc-sidebar-section">
              <div className="tsc-sidebar-header-row">
                <h4 className="tsc-section-title">
                  <FaLayerGroup className="tsc-section-title-icon" />
                  Layer
                </h4>
                <button
                  type="button"
                  className={`lp-lock-btn${selectedLayer.locked ? " active" : ""}`}
                  title={selectedLayer.locked ? "Unlock layer" : "Lock layer"}
                  onClick={toggleActiveLayerLock}
                >
                  {selectedLayer.locked ? <FaLock size={11} /> : <FaLockOpen size={11} />}
                </button>
              </div>
              <div className="tsc-text-editor-field">
                <label className="tsc-spec-label">
                  Opacity ({Math.round((selectedLayer.opacity ?? 1) * 100)}%)
                </label>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={Math.round((selectedLayer.opacity ?? 1) * 100)}
                  onChange={(e) => updateActiveLayer({ opacity: Number(e.target.value) / 100 })}
                  className="tsc-slider"
                />
              </div>
            </div>
          )}

          {/* Gradient fill - shape, pattern, and text layers only. */}
          {selectedLayer && selectedLayer.kind !== "image" && (
            <div className="tsc-sidebar-section">
              <div className="tsc-sidebar-header-row">
                <h4>Gradient Fill</h4>
                <button
                  type="button"
                  className={`tsc-text-toggle-btn${selectedLayer.gradient ? " active" : ""}`}
                  onClick={() => {
                    if (selectedLayer.gradient) {
                      updateActiveLayer({ gradient: null });
                      return;
                    }
                    const baseColor =
                      selectedLayer.kind === "text" ? selectedLayer.color : selectedLayer.fillColor;
                    updateActiveLayer({
                      gradient: {
                        type: "linear",
                        angle: 0,
                        stops: [
                          { offset: 0, color: baseColor || "#111827" },
                          { offset: 1, color: "#ffffff" },
                        ],
                      },
                    });
                  }}
                >
                  {selectedLayer.gradient ? "On" : "Off"}
                </button>
              </div>

              {selectedLayer.gradient && (
                <>
                  <div
                    className="tsc-gradient-preview"
                    style={{
                      background: `linear-gradient(${selectedLayer.gradient.angle || 0}deg, ${selectedLayer.gradient.stops[0].color}, ${selectedLayer.gradient.stops[1].color})`,
                    }}
                  />
                  <div className="tsc-gradient-stops-row">
                    <input
                      type="color"
                      value={selectedLayer.gradient.stops[0].color}
                      onChange={(e) =>
                        updateActiveLayer({
                          gradient: {
                            ...selectedLayer.gradient,
                            stops: [
                              { ...selectedLayer.gradient.stops[0], color: e.target.value },
                              selectedLayer.gradient.stops[1],
                            ],
                          },
                        })
                      }
                    />
                    <input
                      type="color"
                      value={selectedLayer.gradient.stops[1].color}
                      onChange={(e) =>
                        updateActiveLayer({
                          gradient: {
                            ...selectedLayer.gradient,
                            stops: [
                              selectedLayer.gradient.stops[0],
                              { ...selectedLayer.gradient.stops[1], color: e.target.value },
                            ],
                          },
                        })
                      }
                    />
                    <select
                      className="tsc-select-control"
                      value={selectedLayer.gradient.type}
                      onChange={(e) =>
                        updateActiveLayer({ gradient: { ...selectedLayer.gradient, type: e.target.value } })
                      }
                    >
                      <option value="linear">Linear</option>
                      <option value="radial">Radial</option>
                    </select>
                  </div>
                  {selectedLayer.gradient.type === "linear" && (
                    <div className="tsc-text-editor-field">
                      <label className="tsc-spec-label">Angle ({selectedLayer.gradient.angle || 0}°)</label>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={selectedLayer.gradient.angle || 0}
                        onChange={(e) =>
                          updateActiveLayer({
                            gradient: { ...selectedLayer.gradient, angle: Number(e.target.value) },
                          })
                        }
                        className="tsc-slider"
                      />
                    </div>
                  )}
                  {selectedLayer.kind === "text" && selectedLayer.curve ? (
                    <p className="tsc-gallery-empty" style={{ marginTop: 6 }}>
                      Curved text renders gradients as a flat color approximation.
                    </p>
                  ) : null}
                </>
              )}
            </div>
          )}

          {/* Image filters - image layers only. */}
          {selectedLayer?.kind === "image" && (
            <div className="tsc-sidebar-section">
              <div className="tsc-sidebar-header-row">
                <h4 className="tsc-section-title">
                  <FaSlidersH className="tsc-section-title-icon" />
                  Image Filters
                </h4>
              </div>
              <div className="tsc-filter-row">
                {[
                  ["grayscale", "Grayscale"],
                  ["sepia", "Sepia"],
                  ["invert", "Invert"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={`tsc-text-toggle-btn${selectedLayer.filters?.[key] ? " active" : ""}`}
                    onClick={() =>
                      updateActiveLayer({
                        filters: { ...(selectedLayer.filters || {}), [key]: !selectedLayer.filters?.[key] },
                      })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="tsc-text-editor-field">
                <label className="tsc-spec-label">
                  Brightness ({Math.round((selectedLayer.filters?.brightness || 0) * 100)})
                </label>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={Math.round((selectedLayer.filters?.brightness || 0) * 100)}
                  onChange={(e) =>
                    updateActiveLayer({
                      filters: { ...(selectedLayer.filters || {}), brightness: Number(e.target.value) / 100 },
                    })
                  }
                  className="tsc-slider"
                />
              </div>

              <div className="tsc-text-editor-field">
                <label className="tsc-spec-label">
                  Contrast ({Math.round((selectedLayer.filters?.contrast || 0) * 100)})
                </label>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  value={Math.round((selectedLayer.filters?.contrast || 0) * 100)}
                  onChange={(e) =>
                    updateActiveLayer({
                      filters: { ...(selectedLayer.filters || {}), contrast: Number(e.target.value) / 100 },
                    })
                  }
                  className="tsc-slider"
                />
              </div>

              <div className="tsc-text-editor-field">
                <label className="tsc-spec-label">
                  Blur ({Math.round((selectedLayer.filters?.blur || 0) * 100)})
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round((selectedLayer.filters?.blur || 0) * 100)}
                  onChange={(e) =>
                    updateActiveLayer({
                      filters: { ...(selectedLayer.filters || {}), blur: Number(e.target.value) / 100 },
                    })
                  }
                  className="tsc-slider"
                />
              </div>
            </div>
          )}

          {/* Persistent Layers panel - replaces the old per-zone upload
              slot list. Visible under every tab, shows the active
              zone's full stack with DPI badges, reorder, lock, and delete. */}
          <LayersPanel
            layers={activeZoneLayers}
            selectedLayerId={selectedLayerId}
            onSelect={(layerId) => handleLayerSelect(activeZone, layerId)}
            onRemove={(layerId) => handleLayerRemove(activeZone, layerId)}
            onMove={(layerId, direction) => handleMoveLayer(activeZone, layerId, direction)}
            onToggleLock={(layerId) => setZoneLayers((prev) => toggleLayerLock(prev, activeZone, layerId))}
            onApplyToAll={zones.length > 1 ? handleApplyToAllAreas : undefined}
            dpiByLayerId={dpiByLayerId}
          />
        </div>

        {/* ── 2. Main column - always the 3D preview + readiness/
              mockup rail ─────────────────────────────────────────── */}
        <div className="tsc-right-preview">
            <div className="tsc-preview-panel" style={{ display: "flex", gap: 16, flexDirection: "row" }}>
              <div className="tsc-inline-zone-canvas" style={{ display: "flex", justifyContent: "center" }}>
                <FabricZoneCanvas
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
                  printSizeInches={printSizeInches}
                  bleedInches={product?.bleedInches}
                  safeMarginInches={product?.safeMarginInches}
                />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <PreviewComponent
                  {...(previewSupportsMockupView ? { ref: previewRef } : {})}
                  modelPath={modelPath}
                  shirtColor={shirtColor}
                  zoneColors={zoneColors}
                  zoneDesigns={previewLegacyShape.zones}
                  zoneTexts={previewLegacyShape.zoneTexts}
                  zoneLayers={zoneLayers}
                  selectedSide={selectedSide}
                  zones={zones}
                  selectedSize={selectedSize}
                  activeZone={activeZone}
                  activeTextId={null}
                  onZoneSelect={handleZoneSelect}
                  {...mergedPreviewProps}
                />
              </div>
            </div>
        </div>
      </div>

      {realLifePreview && (
        <div
          onClick={() => setRealLifePreview(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              maxWidth: "min(90vw, 500px)",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 14 }}>Real Life Picture Preview</strong>
              <button
                type="button"
                onClick={() => setRealLifePreview(null)}
                style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer", lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {realLifePreview.status === "loading" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "32px 0" }}>
                <span className="tsc-spinner" />
                <p style={{ fontSize: 13, color: "#6b7280", textAlign: "center" }}>{realLifePreview.message}</p>
              </div>
            )}

            {realLifePreview.status === "error" && (
              <p style={{ fontSize: 13, color: "#b91c1c", textAlign: "center", padding: "24px 0" }}>
                {realLifePreview.message}
              </p>
            )}

            {realLifePreview.status === "result" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
                {realLifePreview.mockups.map((m, i) => (
                  <div key={i}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", margin: "0 0 4px" }}>
                      {m.placement}
                    </p>
                    <img
                      src={m.mockupUrl}
                      alt={`Real life preview - ${m.placement}`}
                      style={{ width: "100%", height: "auto", borderRadius: 8 }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}