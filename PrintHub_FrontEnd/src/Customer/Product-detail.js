import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { FaCheckCircle, FaMagic } from "react-icons/fa";
import "./Product-detail.css";
import { getProductCategory } from "../config/categoryDefaults";
import { useCart } from "../hooks/useCart";
import { extractNumericPrice, formatPrice } from "../utils/appUtils";
import { buildApiUrl } from "../config/api";
import TshirtCustomizerPanel from "../components/TshirtCustomizer/TshirtCustomizerPanel";
import NotebookCustomizerPanel from "../components/NotebookCustomizer/NotebookCustomizerPanel";
import BusinessCardCustomizerPanel from "../components/BusinessCardCustomizer/BusinessCardCustomizerPanel";
import BrochureCustomizerPanel from "../components/BrochureCustomizer/BrochureCustomizerPanel";
import CapCustomizerPanel from "../components/CapCustomizer/CapCustomizerPanel";
import JerseyCustomizerPanel from "../components/JerseyCustomizer/JerseyCustomizerPanel";
import MugCustomizerPanel from "../components/MugCustomizer/MugCustomizerPanel";
import PosterCustomizerPanel from "../components/PosterCustomizer/PosterCustomizerPanel";
import FlyerCustomizerPanel from "../components/FlyerCustomizer/FlyerCustomizerPanel";
import ThankYouCardCustomizerPanel from "../components/ThankYouCardCustomizer/ThankYouCardCustomizerPanel";
import StickerCustomizerPanel from "../components/StickerCustomizer/StickerCustomizerPanel";
import HangTagCustomizerPanel from "../components/HangTagCustomizer/HangTagCustomizerPanel";
import TarpaulinCustomizerPanel from "../components/TarpaulinCustomizer/TarpaulinCustomizerPanel";
import AppModal from "../components/AppModal";
import LoginRequiredModal from "../components/LoginRequiredModal.js";
import { saveGuestDesignDraft } from "../utils/guestCustomization";
import tshirtPrintAreas from "../assets/tshirt-print-areas.png";

const RECENTLY_VIEWED_KEY = "printhub_recently_viewed_products";
const RECENTLY_VIEWED_LIMIT = 8;

function formatRecentPrice(price) {
  if (price === null || price === undefined || price === "") return "";
  const numeric = Number(price);
  return Number.isFinite(numeric)
    ? `₱${numeric.toLocaleString()}`
    : String(price);
}

function AnimatedPrice({ value }) {
  const [displayValue, setDisplayValue] = useState(value || 0);
  const previousValueRef = useRef(value || 0);

  useEffect(() => {
    const start = previousValueRef.current;
    const end = Number(value || 0);
    const duration = 420;
    const startTime = performance.now();
    let frameId;

    const tick = (now) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(start + (end - start) * eased);

      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        previousValueRef.current = end;
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return <>{formatPrice(displayValue)}</>;
}

const DEFAULT_PRODUCT_ZONES = {
  notebook: ["front_cover", "back_cover"],
  tshirt: ["front", "back", "left_sleeve", "right_sleeve"],
  jersey: ["front", "back", "left_sleeve", "right_sleeve"],
  jersery: ["front", "back", "left_sleeve", "right_sleeve"],
  cap: ["front", "back", "left_side", "right_side"],
  mug: ["front", "back"],
  calling_card: ["front", "back"],
  business_card: ["front", "back"],
  brochures: ["front", "back"],
  flyers: ["front", "back"],
  poster: ["front"],
  posters: ["front"],
  thank_you_card: ["front", "back"],
  banners: ["front"],
  tarpaulin: ["front"],
  tarpaulins: ["front"],
  stickers: ["front"],
  hang_tags: ["front", "back"],
  other: ["front", "back"],
};

const SIZE_SURCHARGES = {
  small: 0,
  medium: 10,
  large: 20,
  xl: 30,
  "extra large": 20,
  "2xl": 40,
  xxl: 30,
  "2x large": 30,
};

function getSizeSurcharge(size) {
  const key = String(size || "").toLowerCase().trim();
  return SIZE_SURCHARGES[key] ?? 0;
}

/**
 * Maps each "Printed Sides" dropdown label to the zone IDs it implies.
 * The filteredZones logic intersects this with the product's actual
 * print_zones so phantom zones never appear.
 */
const SIDE_TO_ZONES = {
  // ── T-shirt ───────────────────────────────────────────────────
  "front chest": ["front"],
  back: ["back"],
  "front & back": ["front", "back"],
  sleeve: ["left_sleeve", "right_sleeve"],
  "full body wrap": ["front", "back", "left_sleeve", "right_sleeve"],

  // ── Jersey ────────────────────────────────────────────────────
  front: ["front"],
  "sleeve (left)": ["left_sleeve"],
  "sleeve (right)": ["right_sleeve"],
  "full sublimation": ["front", "back", "left_sleeve", "right_sleeve"],

  // ── Cap ───────────────────────────────────────────────────────
  "front center": ["front"],
  "left panel": ["left_side"],
  "right panel": ["right_side"],
  "back closure": ["back"],
  "full panel": ["front", "back", "left_side", "right_side"],

  // ── Mug ───────────────────────────────────────────────────────
  "360° wrap": ["wrap"],
  "front only": ["front"],
  "two sides": ["front", "back"],

  // ── Flat / Paper ──────────────────────────────────────────────
  "single side": ["front", "front_cover"],
  "double side": ["front", "back", "front_cover", "back_cover"],
};

function getDefaultPrintZones(category) {
  const normalized = String(category || "other").toLowerCase();
  return DEFAULT_PRODUCT_ZONES[normalized] || DEFAULT_PRODUCT_ZONES.other;
}

function inferCustomizerCategory({ category, name, title }) {
  const rawCategory = String(category || "").toLowerCase();
  const label = `${name || ""} ${title || ""}`.toLowerCase();

  if (label.includes("flyer")) return "flyers";
  if (label.includes("poster")) return "posters";
  if (label.includes("sticker") || label.includes("label"))
    return "stickers";
  if (label.includes("hang tag") || label.includes("hangtag"))
    return "hang_tags";
  if (label.includes("tarpaulin") || label.includes("banner"))
    return "tarpaulin";

  if (label.includes("business card") || label.includes("calling card")) {
    return "business_card";
  }

  if (label.includes("thank you")) return "thank_you_card";
  if (label.includes("sticker") || label.includes("label"))
    return "stickers";
  if (label.includes("hang tag") || label.includes("hangtag"))
    return "hang_tags";
  if (label.includes("brochure")) return "brochures";

  if (rawCategory && !["service", "print", "other"].includes(rawCategory)) {
    return rawCategory;
  }

  if (label.includes("notebook")) return "notebook";
  if (label.includes("jersey")) return "jersey";
  if (label.includes("cap") || label.includes("hat")) return "cap";
  if (label.includes("mug") || label.includes("cup")) return "mug";

  if (
    label.includes("shirt") ||
    label.includes("t-shirt") ||
    label.includes("tshirt")
  ) {
    return "tshirt";
  }

  return rawCategory || "other";
}

function getCustomizerPanel(category) {
  const normalized = String(category || "other").toLowerCase();

  if (normalized === "notebook") return NotebookCustomizerPanel;

  if (
    normalized === "business_card" ||
    normalized === "calling_card"
  ) {
    return BusinessCardCustomizerPanel;
  }

  if (normalized === "brochures") return BrochureCustomizerPanel;

  if (normalized === "flyer" || normalized === "flyers")
    return FlyerCustomizerPanel;

  if (normalized === "poster" || normalized === "posters")
    return PosterCustomizerPanel;

  if (normalized === "thank_you_card")
    return ThankYouCardCustomizerPanel;

  if (normalized === "stickers")
    return StickerCustomizerPanel;

  if (normalized === "hang_tags")
    return HangTagCustomizerPanel;

  if (
    normalized === "tarpaulin" ||
    normalized === "tarpaulins" ||
    normalized === "banners"
  ) {
    return TarpaulinCustomizerPanel;
  }

  if (normalized === "cap") return CapCustomizerPanel;

  if (
    normalized === "jersey" ||
    normalized === "jersery"
  ) {
    return JerseyCustomizerPanel;
  }

  if (normalized === "mug")
    return MugCustomizerPanel;

  return TshirtCustomizerPanel;
}

/** Map a raw API product to the shape the component expects */
function mapApiProduct(data) {
  const parseOptions = (arr) =>
    (arr || []).map((opt) => {
      const value = String(opt || "");
      const idx = value.indexOf("|");

      if (idx === -1) {
        return {
          label: value,
          price: "",
        };
      }

      return {
        label: value.slice(0, idx),
        price: value.slice(idx + 1),
      };
    });

  const dbCategory = inferCustomizerCategory({
    category: data.category,
    name: data.name,
  });

  const printZones = Array.isArray(data.print_zones)
    ? data.print_zones
    : getDefaultPrintZones(dbCategory);

  return {
    id: data.id,
    category: data.print_type || "print",
    title: data.name,
    image: data.images?.[0] || "",
    description: data.description || "",
    images: data.images || [],
    gallery: data.images?.length > 0 ? data.images : [],
    mockupViews: data.mockupViews || [],
    price: data.price,
    sizes: (data.size_options || []).filter(
      (s) => !/contact\s*us/i.test(s),
    ),
    materials: parseOptions(data.material_options),
    sides: data.side_options || [],
    finishing: data.finishing_options || [],
    colors: data.color_options || [],
    processing: data.processing_options || [],
    quantities: parseOptions(data.quantity_options),
    ai_prompt_rules: data.ai_prompt_rules || null,
    print_zones: printZones,
    dbCategory,
    rawCategory: data.category || "other",
    quantity_mode: data.quantity_mode || "dropdown",
    quantity_count: data.quantity_count || null,
    stock:
      data.stock !== undefined
        ? Number(data.stock)
        : 0,
  };
}

const getSessionValue = (id, key, fallback) => {
  try {
    const saved = sessionStorage.getItem(
      `pd_${id}_${key}`,
    );

    return saved
      ? JSON.parse(saved)
      : fallback;
  } catch {
    return fallback;
  }
};

const setSessionValue = (id, key, value) => {
  try {
    sessionStorage.setItem(
      `pd_${id}_${key}`,
      JSON.stringify(value),
    );
  } catch (e) {
    console.warn(
      "sessionStorage failed",
      e,
    );
  }
};

function ProductDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const quoteRef = useRef(null);
  const reelRef = useRef(null);

  const { addToCart } = useCart();

  const [activeImageIdx, setActiveImageIdx] =
    useState(0);

  const [product, setProduct] =
    useState(null);

  const [productLoading, setProductLoading] =
    useState(true);

  const [productError, setProductError] =
    useState(null);

  const [showLoginModal, setShowLoginModal] =
    useState(false);

  useEffect(() => {
    if (!id) return;

    setProductLoading(true);
    setProductError(null);

    fetch(buildApiUrl(`/api/products/${id}`))
      .then((r) => {
        if (!r.ok) {
          throw new Error("Product not found");
        }

        return r.json();
      })
      .then((data) =>
        setProduct(mapApiProduct(data)),
      )
      .catch((err) =>
        setProductError(err.message),
      )
      .finally(() =>
        setProductLoading(false),
      );
  }, [id]);

  const [selectedImage, setSelectedImage] =
    useState(
      product?.gallery?.[0] || "",
    );

  const [selectedSize, setSelectedSize] =
    useState(() =>
      getSessionValue(
        id,
        "selectedSize",
        product?.sizes?.[0] || "",
      ),
    );

  const [selectedMaterial, setSelectedMaterial] =
    useState(() =>
      getSessionValue(
        id,
        "selectedMaterial",
        product?.materials?.[0] || null,
      ),
    );

  const [selectedSide, setSelectedSide] =
    useState(() =>
      getSessionValue(
        id,
        "selectedSide",
        product?.sides?.[0] || "",
      ),
    );

  const [selectedFinish, setSelectedFinish] =
    useState(() =>
      getSessionValue(
        id,
        "selectedFinish",
        product?.finishing?.[0] || "",
      ),
    );

  const [selectedQty, setSelectedQty] =
    useState(() =>
      getSessionValue(
        id,
        "selectedQty",
        null,
      ),
    );

  const [selectedColor, setSelectedColor] =
    useState(() =>
      getSessionValue(
        id,
        "selectedColor",
        product?.colors?.[0] || "",
      ),
    );

  const [customQty, setCustomQty] =
    useState(() =>
      getSessionValue(
        id,
        "customQty",
        "",
      ),
    );

  const buildGuestDraftPayload = () => ({
    id: product.id,
    productId: product.id,
    title: product.title,
    price: grandTotal,
    size: selectedSize,
    sizeSurcharge,
    color: selectedColor || "",
    material: {
      label:
        selectedMaterial?.label || "",
      price:
        selectedMaterial?.price || "",
    },
    sides: selectedSide,
    finishing: selectedFinish,
    quantity: selectedQty,
    design: activeDesign || null,
    images: product.images,
  });

  const attemptAddToCart = () => {
    if (!storedUser) {
      saveGuestDesignDraft(
        buildGuestDraftPayload(),
      );

      setShowLoginModal(true);
      return;
    }

    executeAddToCart();
  };

  const [searchParams] =
    useSearchParams();

  const location = useLocation();

  const isCustomizerOpen =
    location.pathname.endsWith(
      "/customize",
    );

  const getBackUrl = () => {
    const params =
      new URLSearchParams(
        searchParams,
      );

    params.delete("customizer");

    const searchStr =
      params.toString();

    return `/product/${id}${searchStr
        ? `?${searchStr}`
        : ""
      }`;
  };

  const isJerseyProduct = useMemo(() => {
    return String(
      product?.dbCategory ||
      product?.title ||
      "",
    )
      .toLowerCase()
      .includes("jersey");
  }, [product]);

  // Filter side options for Jersey
  // to exclude sleeve/sublimation options
  const displaySides = useMemo(() => {
    if (!product?.sides) return [];

    if (isJerseyProduct) {
      return product.sides.filter(
        (side) => {
          const s =
            side.toLowerCase();

          return (
            !s.includes("sleeve") &&
            !s.includes(
              "sublimation",
            )
          );
        },
      );
    }

    return product.sides;
  }, [
    product?.sides,
    isJerseyProduct,
  ]);

  useEffect(() => {
    if (!product) return;

    const hasCust =
      searchParams.get(
        "customizer",
      ) === "true";

    const isCustomizePath =
      location.pathname.endsWith(
        "/customize",
      );

    if (
      hasCust &&
      !isCustomizePath
    ) {
      navigate(
        {
          pathname:
            `/product/${id}/customize`,
          search:
            searchParams.toString(),
        },
        {
          replace: true,
        },
      );
    }

    const sizeParam =
      searchParams.get("size");

    if (sizeParam) {
      setSelectedSize(
        sizeParam,
      );

      setSessionValue(
        id,
        "selectedSize",
        sizeParam,
      );
    }

    const materialParam =
      searchParams.get(
        "material",
      );

    if (
      materialParam &&
      product.materials
    ) {
      const matched =
        product.materials.find(
          (m) =>
            (m.label || m) ===
            materialParam,
        );

      if (matched) {
        setSelectedMaterial(
          matched,
        );

        setSessionValue(
          id,
          "selectedMaterial",
          matched,
        );
      }
    }

    const sideParam =
      searchParams.get("side");

    if (sideParam) {
      setSelectedSide(
        sideParam,
      );

      setSessionValue(
        id,
        "selectedSide",
        sideParam,
      );
    }

    const finishParam =
      searchParams.get(
        "finishing",
      );

    if (finishParam) {
      setSelectedFinish(
        finishParam,
      );

      setSessionValue(
        id,
        "selectedFinish",
        finishParam,
      );
    }

    const colorParam =
      searchParams.get("color");

    if (colorParam) {
      setSelectedColor(
        colorParam,
      );

      setSessionValue(
        id,
        "selectedColor",
        colorParam,
      );
    }
  }, [
    product,
    searchParams,
    id,
    location.pathname,
    navigate,
  ]);

  const [isTemplatesOpen,
    setIsTemplatesOpen] =
    useState(false);

  const [isSpecsOpen,
    setIsSpecsOpen] =
    useState(false);

  const [successMessage,
    setSuccessMessage] =
    useState("");

  const [customSizeSelected,
    setCustomSizeSelected] =
    useState(false);

  const [quoteSuccess,
    setQuoteSuccess] =
    useState(false);

  const [quoteError,
    setQuoteError] =
    useState("");

  const [quoteSubmitting,
    setQuoteSubmitting] =
    useState(false);

  const [recentlyViewed,
    setRecentlyViewed] =
    useState([]);

  const [noticeModal,
    setNoticeModal] =
    useState(null);

  const [
    showOosConfirmModal,
    setShowOosConfirmModal,
  ] = useState(false);

  const [
    showNoDesignConfirmModal,
    setShowNoDesignConfirmModal,
  ] = useState(false);

  const [
    showBulkQuoteModal,
    setShowBulkQuoteModal,
  ] = useState(false);

  const bulkAlertShownRef =
    useRef(false);

  // AI Builder
  const [activeDesign,
    setActiveDesign] =
    useState(null);

  // Draft autosave
  const WIP_DRAFT_MAX_AGE_MS =
    7 * 24 * 60 * 60 * 1000;

  const wipDraftKey = useCallback(
    (productId) =>
      `customizer_wip_${productId}`,
    [],
  );

  const readWipDraft = useCallback(
    (productId) => {
      if (!productId) return null;

      try {
        const raw =
          localStorage.getItem(
            wipDraftKey(
              productId,
            ),
          );

        if (!raw) return null;

        const parsed =
          JSON.parse(raw);

        if (
          !parsed?.savedAt ||
          !parsed?.wip
        ) {
          return null;
        }

        if (
          Date.now() -
          parsed.savedAt >
          WIP_DRAFT_MAX_AGE_MS
        ) {
          localStorage.removeItem(
            wipDraftKey(
              productId,
            ),
          );

          return null;
        }

        return parsed.wip;
      } catch {
        return null;
      }
    },
    [wipDraftKey],
  );

  const wipHasContent =
    useCallback(
      (wip) => {
        if (!wip) return false;

        const layerCount =
          Object.values(
            wip.zoneLayers || {},
          ).reduce(
            (n, arr) =>
              n +
              (arr?.length || 0),
            0,
          );

        const legacyImageCount =
          Object.values(
            wip.zoneDesigns || {},
          ).filter(
            (d) => d?.imageUrl,
          ).length;

        const legacyTextCount =
          Object.values(
            wip.zoneTexts || {},
          ).reduce(
            (n, arr) =>
              n +
              (arr?.length || 0),
            0,
          );

        return (
          layerCount > 0 ||
          legacyImageCount > 0 ||
          legacyTextCount > 0
        );
      },
      [],
    );

  const [customizerWip,
    setCustomizerWip] =
    useState(null);

  const [pendingDraft,
    setPendingDraft] =
    useState(null);

  const [showDraftPrompt,
    setShowDraftPrompt] =
    useState(false);

  useEffect(() => {
    if (!id) return;

    const draft =
      readWipDraft(id);

    if (
      draft &&
      wipHasContent(draft)
    ) {
      setPendingDraft(draft);
      setShowDraftPrompt(true);
      setCustomizerWip(null);
    } else {
      setPendingDraft(null);
      setShowDraftPrompt(false);
      setCustomizerWip(null);
    }
  }, [
    id,
    readWipDraft,
    wipHasContent,
  ]);

  const handleWipChange =
    useCallback(
      (wip) => {
        if (!product?.id) return;

        setCustomizerWip(wip);

        try {
          if (wip) {
            localStorage.setItem(
              wipDraftKey(
                product.id,
              ),
              JSON.stringify({
                wip,
                savedAt:
                  Date.now(),
              }),
            );
          } else {
            localStorage.removeItem(
              wipDraftKey(
                product.id,
              ),
            );
          }
        } catch (e) {
          console.warn(
            "Could not save WIP draft",
            e,
          );
        }
      },
      [
        product?.id,
        wipDraftKey,
      ],
    );

  const clearWip =
    useCallback(() => {
      if (!product?.id) return;

      setCustomizerWip(null);

      try {
        localStorage.removeItem(
          wipDraftKey(
            product.id,
          ),
        );
      } catch (e) {
        console.warn(
          "Could not clear WIP draft",
          e,
        );
      }
    }, [
      product?.id,
      wipDraftKey,
    ]);

  const CustomizerPanel =
    useMemo(() => {
      return getCustomizerPanel(
        product?.dbCategory,
      );
    }, [
      product?.dbCategory,
    ]);

  const categoryName =
    useMemo(() => {
      return getProductCategory(
        product,
      );
    }, [product]);

  const filteredZones =
    useMemo(() => {
      if (
        !product?.print_zones
          ?.length
      ) {
        return [];
      }

      const key =
        String(
          selectedSide || "",
        )
          .toLowerCase()
          .trim();

      if (!key) {
        return product.print_zones;
      }

      const mapped =
        SIDE_TO_ZONES[key];

      if (!mapped) {
        return product.print_zones;
      }

      const filtered =
        mapped.filter(
          (z) =>
            product.print_zones.includes(
              z,
            ),
        );

      return filtered.length > 0
        ? filtered
        : product.print_zones;
    }, [
      product,
      selectedSide,
    ]);

  const filteredProductForCustomizer =
    useMemo(() => {
      if (!product) return null;

      return {
        ...product,
        print_zones:
          filteredZones,
      };
    }, [
      product,
      filteredZones,
    ]);

  const storedUser =
    useMemo(() => {
      try {
        const parsed =
          JSON.parse(
            localStorage.getItem(
              "user",
            ) || "null",
          );

        const role =
          String(
            parsed?.role || "",
          ).toLowerCase();

        if (
          !parsed?.id ||
          role === "admin" ||
          role === "staff" ||
          role === "guest"
        ) {
          return null;
        }

        return parsed;
      } catch {
        return null;
      }
    }, []);

  const [quoteForm,
    setQuoteForm] =
    useState({
      subject: "",
      name: "",
      email: "",
      quantity: "",
      size: "",
      color: "",
      material: "",
      finishing: "",
      printing: "",
      processing: "",
      other: "",
    });

  useEffect(() => {
    if (!product) return;

    setSelectedImage(
      product.gallery?.[0] ||
      "",
    );

    const savedSize =
      getSessionValue(
        id,
        "selectedSize",
        null,
      );

    setSelectedSize(
      savedSize !== null
        ? savedSize
        : product.sizes?.[0] ||
        "",
    );

    const savedMat =
      getSessionValue(
        id,
        "selectedMaterial",
        null,
      );

    setSelectedMaterial(
      savedMat !== null
        ? savedMat
        : product.materials?.[0] ||
        null,
    );

    const savedSide =
      getSessionValue(
        id,
        "selectedSide",
        null,
      );

    setSelectedSide(
      savedSide !== null
        ? savedSide
        : displaySides?.[0] ||
        "",
    );

    const savedColor =
      getSessionValue(
        id,
        "selectedColor",
        null,
      );

    setSelectedColor(
      savedColor !== null
        ? savedColor
        : product.colors?.[0] ||
        "",
    );

    const savedFinish =
      getSessionValue(
        id,
        "selectedFinish",
        null,
      );

    setSelectedFinish(
      savedFinish !== null
        ? savedFinish
        : product.finishing?.[0] ||
        "",
    );

    const savedQty =
      getSessionValue(
        id,
        "selectedQty",
        null,
      );

    setSelectedQty(savedQty);

    const savedCustomQty =
      getSessionValue(
        id,
        "customQty",
        null,
      );

    const restoredCustomQty =
      savedCustomQty !== null
        ? savedCustomQty
        : "";

    setCustomQty(
      restoredCustomQty,
    );

    const savedDesign =
      getSessionValue(
        id,
        "activeDesign",
        null,
      );

    setActiveDesign(
      savedDesign !== null
        ? savedDesign
        : null,
    );

    const restoredExceedsBulk =
      Boolean(
        product.quantity_mode ===
        "text" &&
        product.quantity_count &&
        (parseInt(
          restoredCustomQty,
          10,
        ) || 0) >
        product.quantity_count,
      );

    bulkAlertShownRef.current =
      restoredExceedsBulk;

    setCustomSizeSelected(
      restoredExceedsBulk,
    );

    setQuoteForm({
      subject:
        `Request a quote for ${product.title}`,
      name: "",
      email: "",
      quantity:
        product.quantity_mode ===
          "text"
          ? ""
          : product.quantities?.[0]
            ?.label || "",
      size:
        product.sizes?.[0] || "",
      color:
        product.colors?.[0] || "",
      material:
        product.materials?.[0]
          ?.label || "",
      finishing:
        product.finishing?.[0] ||
        "",
      printing:
        displaySides?.[0] || "",
      processing:
        product.processing?.[0] ||
        "",
      other: "",
    });
  }, [
    product,
    displaySides,
    id,
  ]);

  useEffect(() => {
    if (!product?.id) return;

    try {
      const viewed =
        JSON.parse(
          localStorage.getItem(
            RECENTLY_VIEWED_KEY,
          ) || "[]",
        );

      const recentProduct = {
        id: product.id,
        name: product.title,
        images:
          product.gallery?.length
            ? product.gallery
            : product.images || [],
        image:
          product.image,
        price:
          product.price,
        viewedAt:
          Date.now(),
      };

      const nextViewed = [
        recentProduct,
        ...(Array.isArray(viewed)
          ? viewed.filter(
            (item) =>
              String(
                item.id,
              ) !==
              String(
                product.id,
              ),
          )
          : []),
      ].slice(
        0,
        RECENTLY_VIEWED_LIMIT,
      );

      localStorage.setItem(
        RECENTLY_VIEWED_KEY,
        JSON.stringify(
          nextViewed,
        ),
      );

      setRecentlyViewed(
        nextViewed.filter(
          (item) =>
            String(item.id) !==
            String(product.id),
        ),
      );
    } catch {
      // Recently viewed is a convenience feature.
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;

    if (
      product.quantity_mode ===
      "text"
    ) {
      setQuoteForm(
        (prev) => ({
          ...prev,
          quantity:
            customQty || "",
        }),
      );
    } else {
      setQuoteForm(
        (prev) => ({
          ...prev,
          quantity:
            selectedQty?.label ||
            "",
        }),
      );
    }
  }, [
    selectedQty,
    customQty,
    product,
  ]);

  const materialSurcharge =
    useMemo(
      () =>
        extractNumericPrice(
          selectedMaterial?.price,
        ),
      [selectedMaterial],
    );

  const sizeSurcharge =
    useMemo(
      () =>
        getSizeSurcharge(
          selectedSize,
        ),
      [selectedSize],
    );

  const quantityPrice =
    useMemo(
      () =>
        extractNumericPrice(
          selectedQty?.price,
        ),
      [selectedQty],
    );

  const subtotal =
    useMemo(
      () =>
        selectedQty
          ? quantityPrice +
          materialSurcharge +
          sizeSurcharge
          : 0,
      [
        selectedQty,
        quantityPrice,
        materialSurcharge,
        sizeSurcharge,
      ],
    );

  // Rush order removed.
  // Grand total is now simply the normal subtotal.
  const grandTotal =
    useMemo(
      () => subtotal,
      [subtotal],
    );

  const selectedQuantityNumber =
    useMemo(() => {
      if (!product) return 0;

      if (
        product.quantity_mode ===
        "text"
      ) {
        return (
          parseInt(
            customQty,
            10,
          ) || 0
        );
      }

      if (
        selectedQty?.quantityNumber
      ) {
        return selectedQty.quantityNumber;
      }

      return (
        parseInt(
          selectedQty?.label,
          10,
        ) || 0
      );
    }, [
      product,
      customQty,
      selectedQty,
    ]);

  const exceedsBulkThreshold =
    useMemo(() => {
      if (
        !product?.quantity_count
      ) {
        return false;
      }

      return (
        selectedQuantityNumber >
        product.quantity_count
      );
    }, [
      product,
      selectedQuantityNumber,
    ]);

  const selectedSideLower =
    String(
      selectedSide || "",
    ).toLowerCase();

  const selectedFinishLower =
    String(
      selectedFinish || "",
    ).toLowerCase();

  const selectedMaterialLower =
    String(
      selectedMaterial?.label ||
      "",
    ).toLowerCase();

  const previewSurface =
    selectedSideLower.includes(
      "back",
    )
      ? "back"
      : selectedSideLower.includes(
        "sleeve",
      )
        ? "sleeve"
        : "front";

  const previewClasses = [
    isJerseyProduct
      ? "pd-live-jersey"
      : "",

    previewSurface === "back"
      ? "pd-preview-back"
      : "",

    previewSurface === "sleeve"
      ? "pd-preview-sleeve"
      : "",

    selectedSideLower.includes(
      "front & back",
    )
      ? "pd-preview-spin"
      : "",

    selectedSideLower.includes(
      "full sublimation",
    ) ||
      selectedFinishLower.includes(
        "sublimation",
      ) ||
      selectedMaterialLower.includes(
        "mesh",
      )
      ? "pd-preview-sublimation"
      : "",

    selectedFinishLower.includes(
      "embroidery",
    )
      ? "pd-preview-embroidery"
      : "",

    selectedFinishLower.includes(
      "screen",
    )
      ? "pd-preview-screenprint"
      : "",

    selectedFinishLower.includes(
      "heat",
    )
      ? "pd-preview-heat"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const progressSteps = [
    {
      label: "Choose Size",
      complete:
        Boolean(
          selectedSize &&
          !customSizeSelected,
        ),
    },

    {
      label: "Choose Material",
      complete:
        Boolean(
          selectedMaterial,
        ),
    },

    {
      label: "Choose Print",
      complete:
        Boolean(
          selectedSide &&
          selectedFinish,
        ),
    },

    {
      label: "Finalize Order",
      complete:
        Boolean(
          selectedQty ||
          customQty,
        ),
    },
  ];

  useEffect(() => {
    if (
      !product?.gallery?.length
    ) {
      return;
    }

    if (
      selectedSideLower.includes(
        "back",
      ) &&
      product.gallery[1]
    ) {
      setSelectedImage(
        product.gallery[1],
      );
    } else if (
      selectedSideLower.includes(
        "front",
      ) &&
      product.gallery[0]
    ) {
      setSelectedImage(
        product.gallery[0],
      );
    }
  }, [
    product,
    selectedSideLower,
  ]);

  const materialDisplayPrice =
    useMemo(() => {
      if (
        !selectedMaterial?.price
      ) {
        return "Included";
      }

      const numeric =
        extractNumericPrice(
          selectedMaterial.price,
        );

      if (!numeric) {
        return "Included";
      }

      return `+ ${formatPrice(
        numeric,
      )}`;
    }, [
      selectedMaterial,
    ]);

  const handleQuoteChange = (
    e,
  ) => {
    const {
      name,
      value,
    } = e.target;

    setQuoteForm(
      (prev) => ({
        ...prev,
        [name]: value,
      }),
    );
  };

  const handleQuoteSubmit =
    async (e) => {
      e.preventDefault();

      setQuoteSubmitting(
        true,
      );

      setQuoteError("");

      try {
        const userId =
          storedUser?.id ||
          null;

        const designData =
          activeDesign
            ? {
              type:
                product.dbCategory ||
                "custom",
              zones:
                activeDesign.zones ||
                {},
              generatedImageUrl:
                activeDesign.generatedImageUrl ||
                null,
              baseColor:
                activeDesign.baseColor ||
                null,
              shirtColor:
                activeDesign.shirtColor ||
                null,
              timestamp:
                new Date().toISOString(),
            }
            : null;

        const res =
          await fetch(
            buildApiUrl(
              "/api/inquiries",
            ),
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify(
                {
                  userId,
                  product_title:
                    product.title,
                  subject:
                    quoteForm.subject,
                  name:
                    quoteForm.name,
                  email:
                    quoteForm.email,
                  quantity:
                    quoteForm.quantity ||
                    customQty ||
                    "",
                  size:
                    selectedSize ||
                    "",
                  color:
                    selectedColor ||
                    "",
                  material:
                    selectedMaterial?.label ||
                    "",
                  finishing:
                    selectedFinish ||
                    "",
                  printing:
                    selectedSide ||
                    "",
                  processing:
                    product.processing?.[0] ||
                    "",
                  other:
                    quoteForm.other,
                  design_data:
                    designData,
                  sizeSurcharge,
                },
              ),
            },
          );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data.message ||
            "Failed to submit",
          );
        }

        setQuoteSuccess(
          true,
        );

        setQuoteForm(
          (prev) => ({
            ...prev,
            name: "",
            email: "",
            other: "",
          }),
        );
      } catch (err) {
        setQuoteError(
          err.message ||
          "Something went wrong. Please try again.",
        );
      } finally {
        setQuoteSubmitting(
          false,
        );
      }
    };

  const handleReelScroll =
    () => {
      const reel =
        reelRef.current;

      if (!reel) return;

      setActiveImageIdx(
        Math.round(
          reel.scrollLeft /
          reel.offsetWidth,
        ),
      );
    };

  const scrollToSlide = (
    idx,
  ) => {
    const reel =
      reelRef.current;

    if (!reel) return;

    reel.scrollTo({
      left:
        idx *
        reel.offsetWidth,
      behavior:
        "smooth",
    });

    setActiveImageIdx(
      idx,
    );
  };

  const scrollToQuote = () => {
    // Open the quote request section
    setCustomSizeSelected(true);
  
    quoteRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };
  
  const handleCancelQuote = () => {
    // Close the quote request section
    setCustomSizeSelected(false);
  
    // Clear temporary quote messages
    setQuoteError("");
    setQuoteSuccess(false);
  
    // Clear only user-entered fields
    setQuoteForm((prev) => ({
      ...prev,
      name: "",
      email: "",
      other: "",
    }));
  
    // Return to the normal product section
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };
  const executeAddToCart =
    () => {
      addToCart({
        id: product.id,
        productId:
          product.id,
        title:
          product.title,
        price:
          grandTotal,
        size:
          selectedSize,
        sizeSurcharge,
        color:
          selectedColor ||
          "",
        material: {
          label:
            selectedMaterial?.label ||
            "",
          price:
            selectedMaterial?.price ||
            "",
        },
        sides:
          selectedSide,
        finishing:
          selectedFinish,
        quantity:
          selectedQty,
        design:
          activeDesign ||
          null,
        images:
          product.images,
      });

      setSuccessMessage(
        "✓ Added to cart!",
      );

      setTimeout(() => {
        setSuccessMessage(
          "",
        );
      }, 2000);

      try {
        sessionStorage.removeItem(
          `pd_${id}_selectedSize`,
        );

        sessionStorage.removeItem(
          `pd_${id}_selectedMaterial`,
        );

        sessionStorage.removeItem(
          `pd_${id}_selectedSide`,
        );

        sessionStorage.removeItem(
          `pd_${id}_selectedFinish`,
        );

        sessionStorage.removeItem(
          `pd_${id}_selectedColor`,
        );

        sessionStorage.removeItem(
          `pd_${id}_selectedQty`,
        );

        sessionStorage.removeItem(
          `pd_${id}_customQty`,
        );

        sessionStorage.removeItem(
          `pd_${id}_activeDesign`,
        );
      } catch (e) {
        console.warn(
          "Failed to clear sessionStorage on addToCart",
          e,
        );
      }

      setActiveDesign(
        null,
      );

      clearWip();
    };

  const handleAddToCart =
    () => {
      if (
        exceedsBulkThreshold
      ) {
        setShowBulkQuoteModal(
          true,
        );
        return;
      }

      if (!selectedQty) {
        setNoticeModal({
          title:
            "Complete your options",
          message:
            "Please select quantity before adding to cart.",
          tone:
            "info",
        });

        return;
      }

      if (
        product.stock ===
        0
      ) {
        setShowOosConfirmModal(
          true,
        );

        return;
      }

      const hasPrintZones =
        product.print_zones
          ?.length > 0;

      if (
        hasPrintZones &&
        !activeDesign
      ) {
        setShowNoDesignConfirmModal(
          true,
        );

        return;
      }

      attemptAddToCart();
    };

  if (productLoading) {
    return (
      <div>
        <div
          style={{
            padding:
              "30px",
            maxWidth:
              "1400px",
            margin:
              "0 auto",
          }}
        >
          <p>
            Loading product...
          </p>
        </div>
      </div>
    );
  }

  if (
    productError ||
    !product
  ) {
    return (
      <div>
        <div
          style={{
            padding:
              "30px",
            maxWidth:
              "1400px",
            margin:
              "0 auto",
          }}
        >
          <button
            onClick={() =>
              navigate(-1)
            }
          >
            ← Back
          </button>

          <h2>
            {productError ||
              "Product not found"}
          </h2>
        </div>
      </div>
    );
  }

  if (
    isCustomizerOpen &&
    CustomizerPanel
  ) {
    return (
      <div className="pd-customizer-page-wrapper fade-in-up">
        <div className="pd-customizer-page-header">
          <div className="pd-customizer-header-left">
            <button
              type="button"
              className="pd-customizer-back-btn"
              onClick={() =>
                navigate(
                  getBackUrl(),
                  {
                    replace:
                      true,
                  },
                )
              }
            >
              ←
            </button>

            <h2>
              Design Customizer
            </h2>
          </div>

          <div
            className="pd-customizer-header-right"
            id="customizer-header-actions"
          />
        </div>

        <div className="pd-customizer-page-body">
          <CustomizerPanel
            product={
              filteredProductForCustomizer ||
              product
            }
            activeDesign={
              activeDesign
            }
            selectedSize={
              selectedSize
            }
            onSizeChange={(
              val,
            ) => {
              setSelectedSize(
                val,
              );

              setSessionValue(
                id,
                "selectedSize",
                val,
              );
            }}
            selectedMaterial={
              selectedMaterial
            }
            onMaterialChange={(
              val,
            ) => {
              setSelectedMaterial(
                val,
              );

              setSessionValue(
                id,
                "selectedMaterial",
                val,
              );
            }}
            selectedSide={
              selectedSide
            }
            onSideChange={(
              val,
            ) => {
              setSelectedSide(
                val,
              );

              setSessionValue(
                id,
                "selectedSide",
                val,
              );
            }}
            selectedFinish={
              selectedFinish
            }
            onFinishChange={(
              val,
            ) => {
              setSelectedFinish(
                val,
              );

              setSessionValue(
                id,
                "selectedFinish",
                val,
              );
            }}
            initialWip={
              customizerWip
            }
            onWipChange={
              handleWipChange
            }
            onDesignReady={(
              meta,
            ) => {
              setActiveDesign(
                meta,
              );

              setSessionValue(
                id,
                "activeDesign",
                meta,
              );

              clearWip();

              if (
                window.ReactNativeWebView
              ) {
                window.ReactNativeWebView.postMessage(
                  JSON.stringify(
                    {
                      type:
                        "DESIGN_COMPLETED",
                      design:
                        meta,
                    },
                  ),
                );

                return;
              }

              if (
                meta?.zones &&
                Object.keys(
                  meta.zones,
                ).length > 0
              ) {
                const activeZoneIds =
                  Object.entries(
                    meta.zones,
                  )
                    .filter(
                      ([_, z]) =>
                        z?.imageUrl,
                    )
                    .map(
                      ([
                        zoneId,
                      ]) =>
                        zoneId,
                    );

                if (
                  activeZoneIds.length >
                  0
                ) {
                  const bestSide =
                    Object.entries(
                      SIDE_TO_ZONES,
                    ).find(
                      ([
                        _,
                        zoneIds,
                      ]) => {
                        return (
                          zoneIds.length ===
                          activeZoneIds.length &&
                          zoneIds.every(
                            (z) =>
                              activeZoneIds.includes(
                                z,
                              ),
                          )
                        );
                      },
                    );

                  if (
                    bestSide
                  ) {
                    const matchedSide =
                      product.sides?.find(
                        (s) =>
                          s
                            .toLowerCase()
                            .trim() ===
                          bestSide[0],
                      );

                    if (
                      matchedSide
                    ) {
                      setSelectedSide(
                        matchedSide,
                      );

                      setSessionValue(
                        id,
                        "selectedSide",
                        matchedSide,
                      );
                    }
                  } else {
                    const hasFront =
                      activeZoneIds.includes(
                        "front",
                      );

                    const hasBack =
                      activeZoneIds.includes(
                        "back",
                      );

                    if (
                      hasFront &&
                      hasBack
                    ) {
                      const bothSide =
                        product.sides?.find(
                          (s) =>
                            s
                              .toLowerCase()
                              .includes(
                                "both",
                              ) ||
                            (s
                              .toLowerCase()
                              .includes(
                                "front",
                              ) &&
                              s
                                .toLowerCase()
                                .includes(
                                  "back",
                                )) ||
                            s
                              .toLowerCase()
                              .includes(
                                "two",
                              ) ||
                            s
                              .toLowerCase()
                              .includes(
                                "360",
                              ) ||
                            s
                              .toLowerCase()
                              .includes(
                                "double",
                              ),
                        );

                      if (
                        bothSide
                      ) {
                        setSelectedSide(
                          bothSide,
                        );

                        setSessionValue(
                          id,
                          "selectedSide",
                          bothSide,
                        );
                      }
                    }
                  }
                }
              }

              navigate(
                getBackUrl(),
                {
                  replace:
                    true,
                },
              );
            }}
            onClear={() => {
              setActiveDesign(
                null,
              );

              setSessionValue(
                id,
                "activeDesign",
                null,
              );

              clearWip();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pd-page fade-in-up">
<div className="pd-navigation-row">

<button
  type="button"
  className="pd-back-btn"
  onClick={() => navigate(-1)}
>
  ← Back
</button>

<div className="pd-breadcrumb">
  <span onClick={() => navigate("/product-overview")}>
    Products
  </span>

  <span>›</span>

  <span
    onClick={() =>
      navigate(
        `/product-overview?category=${encodeURIComponent(categoryName)}`,
      )
    }
  >
    {categoryName}
  </span>

  <span>›</span>

  <span className="pd-breadcrumb-current">
    {product.title}
  </span>
</div>

</div>

      <div className="pd-grid-layout pd-pmg-layout">

        {/* =========================
            LEFT — PRODUCT GALLERY
            ========================= */}

        <div className="pd-left-col pd-pmg-gallery-col">

          <div className="pd-gallery">

            {/* Thumbnail Gallery */}
            <div className="pd-thumbs">
              {product.gallery.map(
                (
                  img,
                  index,
                ) => (
                  <button
                    key={index}
                    type="button"
                    className={`pd-thumb ${selectedImage ===
                        img
                        ? "active"
                        : ""
                      }`}
                    onClick={() =>
                      setSelectedImage(
                        img,
                      )
                    }
                  >
                    <img
                      src={img}
                      alt={`${product.title} ${index + 1
                        }`}
                    />
                  </button>
                ),
              )}
            </div>

            {/* Main Product Image */}
            <div
              className={`pd-main-image ${previewClasses}`}
            >

              <button
                type="button"
                className="pd-image-expand-btn"
                onClick={() => {
                  const img =
                    document.querySelector(
                      ".pd-main-image img",
                    );

                  if (
                    img?.requestFullscreen
                  ) {
                    img.requestFullscreen();
                  }
                }}
                aria-label="View product fullscreen"
              >
                ⛶
              </button>

              <div className="pd-preview-stage">

                <img
                  src={
                    selectedImage
                  }
                  alt={
                    product.title
                  }
                />

                {isJerseyProduct && (
                  <>
                    <span className="pd-print-zone pd-zone-back">
                      Back print area
                    </span>

                    <span className="pd-print-zone pd-zone-sleeve">
                      Sleeve print
                    </span>

                    <span className="pd-embroidery-badge">
                      Embroidery
                    </span>

                    <span className="pd-fabric-shine" />
                  </>
                )}

              </div>
            </div>

            {/* Mobile Image Reel */}
            <div
              className="pd-img-reel"
              ref={reelRef}
              onScroll={
                handleReelScroll
              }
            >
              {product.gallery.map(
                (
                  img,
                  index,
                ) => (
                  <div
                    key={index}
                    className="pd-img-slide"
                  >
                    <img
                      src={img}
                      alt={`${product.title} ${index + 1
                        }`}
                    />
                  </div>
                ),
              )}
            </div>

            {product.gallery
              .length > 1 && (
                <div className="pd-img-dots">
                  {product.gallery.map(
                    (
                      _,
                      i,
                    ) => (
                      <button
                        key={i}
                        type="button"
                        className={`pd-img-dot ${i ===
                            activeImageIdx
                            ? "active"
                            : ""
                          }`}
                        onClick={() =>
                          scrollToSlide(
                            i,
                          )
                        }
                        aria-label={`Image ${i + 1
                          }`}
                      />
                    ),
                  )}
                </div>
              )}

          </div>

          {/* =========================
              PRODUCT DETAILS
              ========================= */}

          <div className="pd-pmg-details-card">

            <button
              type="button"
              className="pd-pmg-details-header"
              onClick={() =>
                setIsSpecsOpen(
                  !isSpecsOpen,
                )
              }
            >
              <span>
                <span className="pd-pmg-details-icon">
                  ⌂
                </span>

                PRODUCT DETAILS
              </span>

              <span className="pd-pmg-details-arrow">
                {isSpecsOpen
                  ? "⌃"
                  : "›"}
              </span>
            </button>

            {isSpecsOpen && (
              <div className="pd-pmg-details-content">

                <div>
                  <strong>
                    Material:
                  </strong>

                  <span>
                    {selectedMaterial?.label ||
                      product.materials?.[0]
                        ?.label ||
                      "100% Cotton"}
                  </span>
                </div>

                <div>
                  <strong>
                    Fit:
                  </strong>

                  <span>
                    Regular / Unisex
                  </span>
                </div>

                <div>
                  <strong>
                    Available Sizes:
                  </strong>

                  <span>
                    {product.sizes?.join(
                      ", ",
                    ) ||
                      "XS, S, M, L, XL, XXL"}
                  </span>
                </div>

                <div>
                  <strong>
                    Colors:
                  </strong>

                  <span>
                    {product.colors?.join(
                      ", ",
                    ) ||
                      "Black, White, Gray, Navy Blue, Red"}
                  </span>
                </div>

                <div>
                  <strong>
                    Design:
                  </strong>

                  <span>
                    Customizable print/design
                  </span>
                </div>

                <div>
                  <strong>
                    Print Type:
                  </strong>

                  <span>
                    High-quality digital or heat-transfer print
                  </span>
                </div>

                <div>
                  <strong>
                    Neckline:
                  </strong>

                  <span>
                    Round Neck
                  </span>
                </div>

                <div>
                  <strong>
                    Sleeve:
                  </strong>

                  <span>
                    Short Sleeve
                  </span>
                </div>

                <div>
                  <strong>
                    Customization:
                  </strong>

                  <span>
                    Customer can select color, size and design
                  </span>
                </div>

                <div>
                  <strong>
                    Care:
                  </strong>

                  <span>
                    Machine wash; turn inside out before washing
                  </span>
                </div>

                <div>
                  <strong>
                    Usage:
                  </strong>

                  <span>
                    Casual wear, events, organizations, and personalized gifts
                  </span>
                </div>

              </div>
            )}

          </div>

          {/* Templates */}
          <div className="pd-pmg-simple-accordion">

            <button
              type="button"
              onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
            >
              <span>
                ▣ &nbsp; TEMPLATES / PRINT AREA
              </span>

              <span>
                {isTemplatesOpen ? "⌃" : "›"}
              </span>
            </button>

            {isTemplatesOpen && (
              <div className="pd-pmg-template-content">

                <p>
                  Available template size:
                </p>

                <strong>
                  {product.sizes?.[0] || "Standard"}
                </strong>

                <div className="pd-template-image-wrapper">
                  <img
                    src={tshirtPrintAreas}
                    alt="T-shirt print area and imprint location guide"
                    className="pd-template-image"
                  />
                </div>

              </div>
            )}

          </div>

        </div>

        {/* =========================
            RIGHT — PRODUCT CONFIG
            ========================= */}

        <div className="pd-right-col pd-pmg-info-col">

          {/* Header */}
          <div className="pd-pmg-product-header">

            <div className="pd-pmg-rating">
              <span>
                ★
              </span>

              <strong>
                4.5
              </strong>
            </div>

            <h1>
              {product.title}
            </h1>

            {product.print_zones
              ?.length > 0 ? (
              <span className="pd-pmg-print-badge">
                Includes Custom Print
              </span>
            ) : (
              <span className="pd-pmg-print-badge pd-pmg-plain-badge">
                Plain / Undecorated
              </span>
            )}

            <p className="pd-description">
              {product.description ||
                "Design your own style by choosing your preferred color, size, and design. Create a unique product that matches your personality and preferences."}
            </p>

            <p className="pd-pmg-bulk-link">
              Want a bulk order?{" "}

              <button
                type="button"
                onClick={
                  scrollToQuote
                }
              >
                Inquire here.
              </button>
            </p>

          </div>

          {/* Configuration */}
          {!customSizeSelected && (
            <div className="pd-pmg-configurator">

              {/* SIZE */}
              <div className="pd-pmg-option-group">

                <div className="pd-pmg-option-heading">
                  <span>
                    SELECT SIZE
                  </span>

                  <button
                    type="button"
                    className="pd-pmg-sizing-btn"
                    onClick={() =>
                      setIsTemplatesOpen(
                        true,
                      )
                    }
                  >
                    ▣ &nbsp; Sizing
                  </button>
                </div>

                <div className="pd-pmg-size-grid">

                  {product.sizes.map(
                    (size) => (
                      <button
                        key={size}
                        type="button"
                        className={`pd-pmg-size-btn ${selectedSize ===
                            size
                            ? "active"
                            : ""
                          }`}
                        onClick={() => {
                          setSelectedSize(
                            size,
                          );

                          setSessionValue(
                            id,
                            "selectedSize",
                            size,
                          );

                          setCustomSizeSelected(
                            false,
                          );
                        }}
                      >
                        {size}
                      </button>
                    ),
                  )}

                </div>

              </div>

              {/* MATERIAL */}
              <div className="pd-pmg-option-group">

                <label>
                  CHOOSE MATERIAL
                </label>

                <select
                  value={
                    selectedMaterial?.label ||
                    ""
                  }
                  onChange={(e) => {
                    const mat =
                      product.materials.find(
                        (m) =>
                          m.label ===
                          e.target
                            .value,
                      );

                    if (mat) {
                      setSelectedMaterial(
                        mat,
                      );

                      setSessionValue(
                        id,
                        "selectedMaterial",
                        mat,
                      );
                    }
                  }}
                >
                  {product.materials.map(
                    (
                      material,
                    ) => (
                      <option
                        key={
                          material.label
                        }
                        value={
                          material.label
                        }
                      >
                        {
                          material.label
                        }

                        {material.price
                          ? ` (+ ${formatPrice(
                            extractNumericPrice(
                              material.price,
                            ),
                          )})`
                          : " (Included)"}
                      </option>
                    ),
                  )}
                </select>

              </div>

              {/* FINISHING */}
              <div className="pd-pmg-option-group">

                <label>
                  CHOOSE FINISHING
                </label>

                <select
                  value={
                    selectedFinish
                  }
                  onChange={(e) => {
                    setSelectedFinish(
                      e.target
                        .value,
                    );

                    setSessionValue(
                      id,
                      "selectedFinish",
                      e.target
                        .value,
                    );
                  }}
                >
                  {product.finishing.map(
                    (
                      finish,
                    ) => (
                      <option
                        key={
                          finish
                        }
                        value={
                          finish
                        }
                      >
                        {
                          finish
                        }
                      </option>
                    ),
                  )}
                </select>

              </div>

              {/* COLOR */}
              {product.colors
                ?.length > 0 && (
                  <div className="pd-pmg-option-group">

                    <label>
                      CHOOSE COLOR
                    </label>

                    <select
                      value={
                        selectedColor
                      }
                      onChange={(e) => {
                        setSelectedColor(
                          e.target
                            .value,
                        );

                        setSessionValue(
                          id,
                          "selectedColor",
                          e.target
                            .value,
                        );
                      }}
                    >
                      {product.colors.map(
                        (
                          color,
                        ) => (
                          <option
                            key={
                              color
                            }
                            value={
                              color
                            }
                          >
                            {
                              color
                            }
                          </option>
                        ),
                      )}
                    </select>

                  </div>
                )}

              {/* STOCK */}
              <div className="pd-pmg-stock">

                {product.stock ===
                  0 ? (
                  <span className="pd-pmg-stock-out">
                    Out of Stock
                  </span>
                ) : (
                  <span>
                    In Stock (
                    {
                      product.stock
                    }{" "}
                    units left)
                  </span>
                )}

              </div>

              {/* QUANTITY */}
              <div className="pd-pmg-quantity-row">

                <label>
                  QUANTITY
                </label>

                {product.quantity_mode ===
                  "text" ? (

                  <div className="pd-pmg-quantity-control">

                    <button
                      type="button"
                      onClick={() => {
                        const next =
                          Math.max(
                            1,
                            (parseInt(
                              customQty,
                              10,
                            ) || 1) -
                            1,
                          );

                        const v =
                          String(
                            next,
                          );

                        setCustomQty(
                          v,
                        );

                        setSessionValue(
                          id,
                          "customQty",
                          v,
                        );

                        const qtyObj =
                        {
                          label: `${next} pcs`,
                          price:
                            formatPrice(
                              extractNumericPrice(
                                product.price,
                              ) *
                              next,
                            ),
                          quantityNumber:
                            next,
                        };

                        setSelectedQty(
                          qtyObj,
                        );

                        setSessionValue(
                          id,
                          "selectedQty",
                          qtyObj,
                        );
                      }}
                    >
                      −
                    </button>

                    <input
                      type="number"
                      min="1"
                      value={
                        customQty ||
                        1
                      }
                      onChange={(
                        e,
                      ) => {
                        const value =
                          e.target
                            .value;

                        setCustomQty(
                          value,
                        );

                        setSessionValue(
                          id,
                          "customQty",
                          value,
                        );

                        const n =
                          parseInt(
                            value,
                            10,
                          ) || 0;

                        if (
                          n > 0 &&
                          (!product.quantity_count ||
                            n <=
                            product.quantity_count)
                        ) {
                          const qtyObj =
                          {
                            label: `${n} pcs`,
                            price:
                              formatPrice(
                                extractNumericPrice(
                                  product.price,
                                ) *
                                n,
                              ),
                            quantityNumber:
                              n,
                          };

                          setSelectedQty(
                            qtyObj,
                          );

                          setSessionValue(
                            id,
                            "selectedQty",
                            qtyObj,
                          );
                        }
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        const next =
                          (parseInt(
                            customQty,
                            10,
                          ) || 0) +
                          1;

                        const v =
                          String(
                            next,
                          );

                        setCustomQty(
                          v,
                        );

                        setSessionValue(
                          id,
                          "customQty",
                          v,
                        );

                        if (
                          product.quantity_count &&
                          next >
                          product.quantity_count
                        ) {
                          setSelectedQty(
                            null,
                          );

                          setSessionValue(
                            id,
                            "selectedQty",
                            null,
                          );

                          setShowBulkQuoteModal(
                            true,
                          );

                          return;
                        }

                        const qtyObj =
                        {
                          label: `${next} pcs`,
                          price:
                            formatPrice(
                              extractNumericPrice(
                                product.price,
                              ) *
                              next,
                            ),
                          quantityNumber:
                            next,
                        };

                        setSelectedQty(
                          qtyObj,
                        );

                        setSessionValue(
                          id,
                          "selectedQty",
                          qtyObj,
                        );
                      }}
                    >
                      +
                    </button>

                  </div>

                ) : (

                  <select
                    value={
                      selectedQty?.label ||
                      ""
                    }
                    onChange={(e) => {
                      const qty =
                        product.quantities.find(
                          (q) =>
                            q.label ===
                            e.target
                              .value,
                        );

                      if (qty) {
                        setSelectedQty(
                          qty,
                        );

                        setSessionValue(
                          id,
                          "selectedQty",
                          qty,
                        );
                      }
                    }}
                  >
                    <option value="">
                      Select Quantity
                    </option>

                    {product.quantities.map(
                      (
                        qty,
                      ) => (
                        <option
                          key={
                            qty.label
                          }
                          value={
                            qty.label
                          }
                        >
                          {
                            qty.label
                          }
                        </option>
                      ),
                    )}
                  </select>

                )}

              </div>

              {/* CUSTOMIZER */}
              {CustomizerPanel &&
                product.print_zones
                  ?.length > 0 && (
                  <div className="pd-pmg-customize-card">

                    <div className="pd-pmg-customize-icon">
                      ✎
                    </div>

                    <div>
                      <strong>
                        Customize your own Design!
                      </strong>

                      <p>
                        Get the best price and quality
                        on every order with PMG!
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/product/${id}/customize`,
                        )
                      }
                    >
                      Start Designing
                    </button>

                  </div>
                )}

              {/* TOTAL CARD */}
              <div className="pd-pmg-total-card">

                <div className="pd-pmg-total-heading">

                  <span>
                    🛒 &nbsp; TOTAL
                  </span>

                  <strong>
                    {grandTotal >
                      0
                      ? formatPrice(
                        grandTotal,
                      )
                      : formatPrice(
                        extractNumericPrice(
                          product.price,
                        ),
                      )}
                  </strong>

                </div>

                <div className="pd-pmg-total-details">

                  <div>
                    <span>
                      Size:
                    </span>

                    <strong>
                      {selectedSize ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Material:
                    </span>

                    <strong>
                      {selectedMaterial?.label ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Color:
                    </span>

                    <strong>
                      {selectedColor ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Qty:
                    </span>

                    <strong>
                      {selectedQty?.label ||
                        customQty ||
                        "—"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Print Area:
                    </span>

                    <strong>
                      {selectedSide ||
                        "Front Only (Standard)"}
                    </strong>
                  </div>

                </div>

                {successMessage && (
                  <div className="pd-success-message">
                    <FaCheckCircle />
                    {
                      successMessage
                    }
                  </div>
                )}

                <button
                  type="button"
                  className="pd-pmg-cart-btn"
                  onClick={
                    handleAddToCart
                  }
                >
                  🛒 &nbsp; ADD TO CART
                </button>

              </div>

            </div>
          )}

          {/* QUOTE FORM */}
          {customSizeSelected && (
            <section
              className="pd-section pd-quote-section"
              ref={quoteRef}
            >

              <h2 className="pd-quote-title">
                Request a quote.
              </h2>

              <p className="pd-quote-desc">
                Are you looking for a product that is
                not on our website? Or have you found
                a product on our website, but it doesn't
                quite fit your needs? Let our team of
                experts send you a quote that matches
                your expectations.
              </p>

              <form
                className="pd-quote-box"
                onSubmit={
                  handleQuoteSubmit
                }
              >

                <div className="pd-quote-row pd-quote-row-wide">
                  <label htmlFor="subject">
                    Subject:
                  </label>

                  <input
                    id="subject"
                    type="text"
                    name="subject"
                    value={
                      quoteForm.subject
                    }
                    onChange={
                      handleQuoteChange
                    }
                  />
                </div>

                <div className="pd-quote-row">
                  <label htmlFor="name">
                    Your Name:
                  </label>

                  <input
                    id="name"
                    type="text"
                    name="name"
                    value={
                      quoteForm.name
                    }
                    onChange={
                      handleQuoteChange
                    }
                  />
                </div>

                <div className="pd-quote-row">
                  <label htmlFor="email">
                    Your Email:
                  </label>

                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={
                      quoteForm.email
                    }
                    onChange={
                      handleQuoteChange
                    }
                  />
                </div>

                <div className="pd-quote-row">
                  <label>
                    Product:
                  </label>

                  <div className="pd-quote-readonly">
                    {
                      product.title
                    }
                  </div>
                </div>

                <div className="pd-quote-row">
                  <label htmlFor="quantity">
                    Quantity:
                  </label>

                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    value={
                      quoteForm.quantity
                    }
                    onChange={
                      handleQuoteChange
                    }
                  />
                </div>

                <div className="pd-quote-row pd-quote-row-wide pd-quote-row-top">

                  <label htmlFor="other">
                    Other:
                  </label>

                  <textarea
                    id="other"
                    name="other"
                    rows="4"
                    value={
                      quoteForm.other
                    }
                    onChange={
                      handleQuoteChange
                    }
                    placeholder="Special requests..."
                  />

                </div>

                <div className="pd-quote-actions">

                  {quoteSuccess && (
                    <div className="pd-quote-success">
                      <FaCheckCircle />

                      Your quote request has been
                      submitted! We'll get back to you
                      shortly.
                    </div>
                  )}

                  {quoteError && (
                    <div className="pd-quote-error">
                      {
                        quoteError
                      }
                    </div>
                  )}

<div className="pd-quote-button-row">

  <button
    type="button"
    className="pd-quote-cancel-btn"
    onClick={handleCancelQuote}
    disabled={quoteSubmitting}
  >
    CANCEL
  </button>

  <button
    type="submit"
    className="pd-quote-btn"
    disabled={quoteSubmitting}
  >
    {quoteSubmitting ? "SUBMITTING..." : "REQUEST QUOTE"}
  </button>

</div>

                </div>

              </form>

            </section>
          )}

        </div>

      </div>

      <AppModal
        open={
          showDraftPrompt
        }
        title="Continue your previous customization?"
        message="You have an unfinished design for this product from an earlier visit. Would you like to pick up where you left off?"
        confirmText="Continue Editing"
        cancelText="Start New Design"
        tone="info"
        onConfirm={() => {
          setCustomizerWip(
            pendingDraft,
          );

          setShowDraftPrompt(
            false,
          );
        }}
        onCancel={() => {
          if (product?.id) {
            try {
              localStorage.removeItem(
                wipDraftKey(
                  product.id,
                ),
              );
            } catch (e) {
              console.warn(
                "Could not clear WIP draft",
                e,
              );
            }
          }

          setPendingDraft(
            null,
          );

          setCustomizerWip(
            null,
          );

          setShowDraftPrompt(
            false,
          );
        }}
      />

      <AppModal
        open={Boolean(
          noticeModal,
        )}
        title={
          noticeModal?.title
        }
        message={
          noticeModal?.message
        }
        tone={
          noticeModal?.tone
        }
        onConfirm={() =>
          setNoticeModal(
            null,
          )
        }
      />

      <AppModal
        open={
          showOosConfirmModal
        }
        title="Item Currently Out of Stock"
        message={
          "This item is currently out of stock. " +
          "Do you still want to add it to your cart?"
        }
        confirmText="Add to Cart"
        cancelText="Cancel"
        tone="warning"
        onConfirm={() => {
          setShowOosConfirmModal(
            false,
          );

          attemptAddToCart();
        }}
        onCancel={() =>
          setShowOosConfirmModal(
            false,
          )
        }
      />

      <AppModal
        open={
          showNoDesignConfirmModal
        }
        title="No design added"
        message={
          "You haven't added a design yet. This product requires a " +
          "custom print. Do you want to continue without a design?"
        }
        confirmText="Add to Cart"
        cancelText="Cancel"
        tone="warning"
        onConfirm={() => {
          setShowNoDesignConfirmModal(
            false,
          );

          attemptAddToCart();
        }}
        onCancel={() =>
          setShowNoDesignConfirmModal(
            false,
          )
        }
      />

      <AppModal
        open={
          showBulkQuoteModal
        }
        title="Bulk Order Quantity"
        message={
          product?.quantity_count
            ? `Quantities above ${product.quantity_count} pcs are handled ` +
            "as bulk orders. Please request a quote and our team will " +
            "follow up with pricing and lead time."
            : "This quantity requires a bulk order quote."
        }
        confirmText="Request a Quote"
        cancelText="Cancel"
        tone="warning"
        onConfirm={() => {
          setShowBulkQuoteModal(
            false,
          );

          scrollToQuote();
        }}
        onCancel={() => {
          setShowBulkQuoteModal(
            false,
          );

          bulkAlertShownRef.current =
            false;
        }}
      />

      {showLoginModal && (
        <LoginRequiredModal
          variant="checkout"
          onClose={() =>
            setShowLoginModal(
              false,
            )
          }
          onLogin={() => {
            setShowLoginModal(
              false,
            );

            navigate(
              "/user-login",
              {
                state: {
                  from: `/product/${id}`,
                },
              },
            );
          }}
          onRegister={() => {
            setShowLoginModal(
              false,
            );

            navigate(
              "/user-register",
              {
                state: {
                  from: `/product/${id}`,
                },
              },
            );
          }}
        />
      )}

    </div>
  );
}

export default ProductDetail;