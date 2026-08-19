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

const RUSH_ORDER_RATE = 0.2;


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
  // ── Flat / Paper (business card, hang tag, brochure…) ─────────
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
  if (label.includes("sticker") || label.includes("label")) return "stickers";
  if (label.includes("hang tag") || label.includes("hangtag"))
    return "hang_tags";
  if (label.includes("tarpaulin") || label.includes("banner"))
    return "tarpaulin";
  if (label.includes("business card") || label.includes("calling card")) {
    return "business_card";
  }
  if (label.includes("thank you")) return "thank_you_card";
  if (label.includes("sticker") || label.includes("label")) return "stickers";
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
  if (normalized === "business_card" || normalized === "calling_card") {
    return BusinessCardCustomizerPanel;
  }
  if (normalized === "brochures") return BrochureCustomizerPanel;
  if (normalized === "flyer" || normalized === "flyers")
    return FlyerCustomizerPanel;
  if (normalized === "poster" || normalized === "posters")
    return PosterCustomizerPanel;
  if (normalized === "thank_you_card") return ThankYouCardCustomizerPanel;
  if (normalized === "stickers") return StickerCustomizerPanel;
  if (normalized === "hang_tags") return HangTagCustomizerPanel;
  if (
    normalized === "tarpaulin" ||
    normalized === "tarpaulins" ||
    normalized === "banners"
  ) {
    return TarpaulinCustomizerPanel;
  }
  if (normalized === "cap") return CapCustomizerPanel;
  if (normalized === "jersey" || normalized === "jersery")
    return JerseyCustomizerPanel;
  if (normalized === "mug") return MugCustomizerPanel;
  return TshirtCustomizerPanel;
}

/** Map a raw API product to the shape the component expects */
function mapApiProduct(data) {
  const parseOptions = (arr) =>
    (arr || []).map((opt) => {
      const value = String(opt || "");
      const idx = value.indexOf("|");
      if (idx === -1) return { label: value, price: "" };
      return { label: value.slice(0, idx), price: value.slice(idx + 1) };
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
    sizes: (data.size_options || []).filter((s) => !/contact\s*us/i.test(s)),
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
    stock: data.stock !== undefined ? Number(data.stock) : 0,
  };
}

const getSessionValue = (id, key, fallback) => {
  try {
    const saved = sessionStorage.getItem(`pd_${id}_${key}`);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const setSessionValue = (id, key, value) => {
  try {
    sessionStorage.setItem(`pd_${id}_${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn("sessionStorage failed", e);
  }
};

function ProductDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const quoteRef = useRef(null);
  const reelRef = useRef(null);
  const { addToCart } = useCart();

  const [activeImageIdx, setActiveImageIdx] = useState(0);

  const [product, setProduct] = useState(null);
  const [productLoading, setProductLoading] = useState(true);
  const [productError, setProductError] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    setProductLoading(true);
    setProductError(null);
    fetch(buildApiUrl(`/api/products/${id}`))
      .then((r) => {
        if (!r.ok) throw new Error("Product not found");
        return r.json();
      })
      .then((data) => setProduct(mapApiProduct(data)))
      .catch((err) => setProductError(err.message))
      .finally(() => setProductLoading(false));
  }, [id]);

  const [selectedImage, setSelectedImage] = useState(
    product?.gallery?.[0] || "",
  );
  const [selectedSize, setSelectedSize] = useState(() =>
    getSessionValue(id, "selectedSize", product?.sizes?.[0] || ""),
  );
  const [selectedMaterial, setSelectedMaterial] = useState(() =>
    getSessionValue(id, "selectedMaterial", product?.materials?.[0] || null),
  );
  const [selectedSide, setSelectedSide] = useState(() =>
    getSessionValue(id, "selectedSide", product?.sides?.[0] || ""),
  );
  const [selectedFinish, setSelectedFinish] = useState(() =>
    getSessionValue(id, "selectedFinish", product?.finishing?.[0] || ""),
  );
  const [selectedQty, setSelectedQty] = useState(() =>
    getSessionValue(id, "selectedQty", null),
  );
  const [selectedColor, setSelectedColor] = useState(() =>
    getSessionValue(id, "selectedColor", product?.colors?.[0] || ""),
  );
  const [customQty, setCustomQty] = useState(() =>
    getSessionValue(id, "customQty", ""),
  );
  const [isRushOrder, setIsRushOrder] = useState(() =>
  getSessionValue(id, "isRushOrder", false),
);

const buildGuestDraftPayload = () => ({
  id: product.id,
  productId: product.id,
  title: product.title,
  price: grandTotal,
  size: selectedSize,
  sizeSurcharge,
  isRushOrder,
  rushOrderFee,
  color: selectedColor || "",
  material: {
    label: selectedMaterial?.label || "",
    price: selectedMaterial?.price || "",
  },
  sides: selectedSide,
  finishing: selectedFinish,
  quantity: selectedQty,
  design: activeDesign || null,
  images: product.images,
});

const attemptAddToCart = () => {
  if (!storedUser) {
    saveGuestDesignDraft(buildGuestDraftPayload());
    setShowLoginModal(true);
    return;
  }
  executeAddToCart();
};

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const isCustomizerOpen = location.pathname.endsWith("/customize");

  const getBackUrl = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("customizer");
    const searchStr = params.toString();
    return `/product/${id}${searchStr ? `?${searchStr}` : ""}`;
  };

  const isJerseyProduct = useMemo(() => {
    return String(product?.dbCategory || product?.title || "")
      .toLowerCase()
      .includes("jersey");
  }, [product]);

  // Filter side options for Jersey to exclude sleeve/sublimation options
  const displaySides = useMemo(() => {
    if (!product?.sides) return [];

    if (isJerseyProduct) {
      return product.sides.filter((side) => {
        const s = side.toLowerCase();
        return !s.includes("sleeve") && !s.includes("sublimation");
      });
    }

    return product.sides;
  }, [product?.sides, isJerseyProduct]);

  useEffect(() => {
    if (!product) return;
    const hasCust = searchParams.get("customizer") === "true";
    const isCustomizePath = location.pathname.endsWith("/customize");
    if (hasCust && !isCustomizePath) {
      navigate(
        {
          pathname: `/product/${id}/customize`,
          search: searchParams.toString(),
        },
        { replace: true },
      );
    }

    const sizeParam = searchParams.get("size");
    if (sizeParam) {
      setSelectedSize(sizeParam);
      setSessionValue(id, "selectedSize", sizeParam);
    }

    const materialParam = searchParams.get("material");
    if (materialParam && product.materials) {
      const matched = product.materials.find(
        (m) => (m.label || m) === materialParam,
      );
      if (matched) {
        setSelectedMaterial(matched);
        setSessionValue(id, "selectedMaterial", matched);
      }
    }

    const sideParam = searchParams.get("side");
    if (sideParam) {
      setSelectedSide(sideParam);
      setSessionValue(id, "selectedSide", sideParam);
    }

    const finishParam = searchParams.get("finishing");
    if (finishParam) {
      setSelectedFinish(finishParam);
      setSessionValue(id, "selectedFinish", finishParam);
    }

    const colorParam = searchParams.get("color");
    if (colorParam) {
      setSelectedColor(colorParam);
      setSessionValue(id, "selectedColor", colorParam);
    }
  }, [product, searchParams, id, location.pathname, navigate]);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [customSizeSelected, setCustomSizeSelected] = useState(false);
  const [quoteSuccess, setQuoteSuccess] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [quoteSubmitting, setQuoteSubmitting] = useState(false);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [noticeModal, setNoticeModal] = useState(null);
  const [showOosConfirmModal, setShowOosConfirmModal] = useState(false);
  const [showNoDesignConfirmModal, setShowNoDesignConfirmModal] =
    useState(false);
  const [showBulkQuoteModal, setShowBulkQuoteModal] = useState(false);
  // Tracks whether the bulk-quantity alert has already been shown for the
  // current overflow, so it pops once per crossing instead of on every
  // keystroke while the person keeps typing digits.
  const bulkAlertShownRef = useRef(false);

  // AI Builder
  const [activeDesign, setActiveDesign] = useState(null); // designMeta | null

  const [customizerWip, setCustomizerWip] = useState(() => {
    if (!id) return null;
    try {
      const saved = sessionStorage.getItem(`customizer_wip_${id}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Sync state if product ID changes
  useEffect(() => {
    if (!id) return;
    try {
      const saved = sessionStorage.getItem(`customizer_wip_${id}`);
      setCustomizerWip(saved ? JSON.parse(saved) : null);
    } catch {
      setCustomizerWip(null);
    }
  }, [id]);

  // Handle sync updates of customizer WIP
  const handleWipChange = useCallback(
    (wip) => {
      if (!product?.id) return;
      setCustomizerWip(wip);
      try {
        if (wip) {
          sessionStorage.setItem(
            `customizer_wip_${product.id}`,
            JSON.stringify(wip),
          );
        } else {
          sessionStorage.removeItem(`customizer_wip_${product.id}`);
        }
      } catch (e) {
        console.warn("Could not save WIP to session storage", e);
      }
    },
    [product?.id],
  );

  // Helper to clear the customizer WIP state for the current product
  const clearWip = useCallback(() => {
    if (!product?.id) return;
    setCustomizerWip(null);
    try {
      sessionStorage.removeItem(`customizer_wip_${product.id}`);
    } catch (e) {
      console.warn("Could not clear WIP from session storage", e);
    }
  }, [product?.id]);
  const CustomizerPanel = useMemo(() => {
    return getCustomizerPanel(product?.dbCategory);
  }, [product?.dbCategory]);

  const categoryName = useMemo(() => {
    return getProductCategory(product);
  }, [product]);

  const filteredZones = useMemo(() => {
    if (!product?.print_zones?.length) return [];
    const key = String(selectedSide || "")
      .toLowerCase()
      .trim();
    // No side selected → show all zones
    if (!key) return product.print_zones;
    const mapped = SIDE_TO_ZONES[key];
    // Unknown option → show all zones as fallback
    if (!mapped) return product.print_zones;
    // Intersect: only zones the product actually has
    const filtered = mapped.filter((z) => product.print_zones.includes(z));
    // If intersection is empty (misconfigured product), fall back
    return filtered.length > 0 ? filtered : product.print_zones;
  }, [product, selectedSide]);

  const filteredProductForCustomizer = useMemo(() => {
    if (!product) return null;
    return {
      ...product,
      print_zones: filteredZones,
    };
  }, [product, filteredZones]);

  const storedUser = useMemo(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("user") || "null");
      const role = String(parsed?.role || "").toLowerCase();
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
  const [quoteForm, setQuoteForm] = useState({
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
  const savedRush = getSessionValue(id, "isRushOrder", null);
  setIsRushOrder(savedRush !== null ? savedRush : false);
}, [id]);

  useEffect(() => {
    if (!product) return;

    setSelectedImage(product.gallery?.[0] || "");

    const savedSize = getSessionValue(id, "selectedSize", null);
    setSelectedSize(savedSize !== null ? savedSize : product.sizes?.[0] || "");

    const savedMat = getSessionValue(id, "selectedMaterial", null);
    setSelectedMaterial(
      savedMat !== null ? savedMat : product.materials?.[0] || null,
    );

    const savedSide = getSessionValue(id, "selectedSide", null);
    setSelectedSide(savedSide !== null ? savedSide : displaySides?.[0] || "");

    const savedColor = getSessionValue(id, "selectedColor", null);
    setSelectedColor(
      savedColor !== null ? savedColor : product.colors?.[0] || "",
    );

    const savedFinish = getSessionValue(id, "selectedFinish", null);
    setSelectedFinish(
      savedFinish !== null ? savedFinish : product.finishing?.[0] || "",
    );

    const savedQty = getSessionValue(id, "selectedQty", null);
    setSelectedQty(savedQty);

    const savedCustomQty = getSessionValue(id, "customQty", null);
    const restoredCustomQty = savedCustomQty !== null ? savedCustomQty : "";
    setCustomQty(restoredCustomQty);

    const savedDesign = getSessionValue(id, "activeDesign", null);
    setActiveDesign(savedDesign !== null ? savedDesign : null);

    // If the restored quantity is already over the bulk threshold, keep the
    // person in the quote flow instead of snapping back to the normal
    // configurator with a quantity that can't actually be added to cart.
    const restoredExceedsBulk = Boolean(
      product.quantity_mode === "text" &&
        product.quantity_count &&
        (parseInt(restoredCustomQty, 10) || 0) > product.quantity_count,
    );
    bulkAlertShownRef.current = restoredExceedsBulk;
    setCustomSizeSelected(restoredExceedsBulk);

    setQuoteForm({
      subject: `Request a quote for ${product.title}`,
      name: "",
      email: "",
      quantity:
        product.quantity_mode === "text"
          ? ""
          : product.quantities?.[0]?.label || "",
      size: product.sizes?.[0] || "",
      color: product.colors?.[0] || "",
      material: product.materials?.[0]?.label || "",
      finishing: product.finishing?.[0] || "",
      printing: displaySides?.[0] || "",
      processing: product.processing?.[0] || "",
      other: "",
    });
  }, [product, displaySides, id]);

  useEffect(() => {
    if (!product?.id) return;

    try {
      const viewed = JSON.parse(
        localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]",
      );
      const recentProduct = {
        id: product.id,
        name: product.title,
        images: product.gallery?.length
          ? product.gallery
          : product.images || [],
        image: product.image,
        price: product.price,
        viewedAt: Date.now(),
      };
      const nextViewed = [
        recentProduct,
        ...(Array.isArray(viewed)
          ? viewed.filter((item) => String(item.id) !== String(product.id))
          : []),
      ].slice(0, RECENTLY_VIEWED_LIMIT);

      localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(nextViewed));
      setRecentlyViewed(
        nextViewed.filter((item) => String(item.id) !== String(product.id)),
      );
    } catch {
      // Recently viewed is a convenience feature; product viewing should still work.
    }
  }, [product]);

  // Keep quote form quantity in sync with the selected quantity control
  useEffect(() => {
    if (!product) return;
    if (product.quantity_mode === "text") {
      // For text mode, prefer the numeric customQty
      setQuoteForm((prev) => ({ ...prev, quantity: customQty || "" }));
    } else {
      // For dropdown mode, mirror the selectedQty label
      setQuoteForm((prev) => ({ ...prev, quantity: selectedQty?.label || "" }));
    }
  }, [selectedQty, customQty, product]);

  const materialSurcharge = useMemo(
    () => extractNumericPrice(selectedMaterial?.price),
    [selectedMaterial],
  );

  const sizeSurcharge = useMemo(
    () => getSizeSurcharge(selectedSize),
    [selectedSize],
  );

  const quantityPrice = useMemo(
    () => extractNumericPrice(selectedQty?.price),
    [selectedQty],
  );

  const subtotal = useMemo(
    () => (selectedQty ? quantityPrice + materialSurcharge + sizeSurcharge : 0),
    [selectedQty, quantityPrice, materialSurcharge, sizeSurcharge],
  );

  const rushOrderFee = useMemo(
    () => (isRushOrder ? subtotal * RUSH_ORDER_RATE : 0),
    [isRushOrder, subtotal],
  );

  const grandTotal = useMemo(
    () => subtotal + rushOrderFee,
    [subtotal, rushOrderFee],
  );

  // Resolves the currently selected quantity to a plain number,
  // regardless of whether the product uses dropdown or text qty mode.
  const selectedQuantityNumber = useMemo(() => {
    if (!product) return 0;
    if (product.quantity_mode === "text") {
      return parseInt(customQty, 10) || 0;
    }
    if (selectedQty?.quantityNumber) return selectedQty.quantityNumber;
    return parseInt(selectedQty?.label, 10) || 0;
  }, [product, customQty, selectedQty]);

  // True when the selected quantity exceeds the product's bulk-order
  // threshold and should be redirected to a quote request instead of
  // being added straight to cart.
  const exceedsBulkThreshold = useMemo(() => {
    if (!product?.quantity_count) return false;
    return selectedQuantityNumber > product.quantity_count;
  }, [product, selectedQuantityNumber]);

  const selectedSideLower = String(selectedSide || "").toLowerCase();
  const selectedFinishLower = String(selectedFinish || "").toLowerCase();
  const selectedMaterialLower = String(
    selectedMaterial?.label || "",
  ).toLowerCase();
  const previewSurface = selectedSideLower.includes("back")
    ? "back"
    : selectedSideLower.includes("sleeve")
      ? "sleeve"
      : "front";
  const previewClasses = [
    isJerseyProduct ? "pd-live-jersey" : "",
    previewSurface === "back" ? "pd-preview-back" : "",
    previewSurface === "sleeve" ? "pd-preview-sleeve" : "",
    selectedSideLower.includes("front & back") ? "pd-preview-spin" : "",
    selectedSideLower.includes("full sublimation") ||
      selectedFinishLower.includes("sublimation") ||
      selectedMaterialLower.includes("mesh")
      ? "pd-preview-sublimation"
      : "",
    selectedFinishLower.includes("embroidery") ? "pd-preview-embroidery" : "",
    selectedFinishLower.includes("screen") ? "pd-preview-screenprint" : "",
    selectedFinishLower.includes("heat") ? "pd-preview-heat" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const progressSteps = [
    {
      label: "Choose Size",
      complete: Boolean(selectedSize && !customSizeSelected),
    },
    { label: "Choose Material", complete: Boolean(selectedMaterial) },
    {
      label: "Choose Print",
      complete: Boolean(selectedSide && selectedFinish),
    },
    { label: "Finalize Order", complete: Boolean(selectedQty || customQty) },
  ];

  useEffect(() => {
    if (!product?.gallery?.length) return;
    if (selectedSideLower.includes("back") && product.gallery[1]) {
      setSelectedImage(product.gallery[1]);
    } else if (selectedSideLower.includes("front") && product.gallery[0]) {
      setSelectedImage(product.gallery[0]);
    }
  }, [product, selectedSideLower]);

  const materialDisplayPrice = useMemo(() => {
    if (!selectedMaterial?.price) return "Included";
    const numeric = extractNumericPrice(selectedMaterial.price);
    if (!numeric) return "Included";
    return `+ ${formatPrice(numeric)}`;
  }, [selectedMaterial]);

  const handleQuoteChange = (e) => {
    const { name, value } = e.target;
    setQuoteForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleRushOrder = () => {
  setIsRushOrder((prev) => {
    const next = !prev;
    setSessionValue(id, "isRushOrder", next);
    return next;
  });
};

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();

    setQuoteSubmitting(true);
    setQuoteError("");

    try {
      const userId = storedUser?.id || null;

      // Prepare design data to include in quote
      const designData = activeDesign ? {
        type: product.dbCategory || "custom",
        zones: activeDesign.zones || {},
        generatedImageUrl: activeDesign.generatedImageUrl || null,
        baseColor: activeDesign.baseColor || null,
        shirtColor: activeDesign.shirtColor || null,
        timestamp: new Date().toISOString(),
      } : null;

      const res = await fetch(buildApiUrl("/api/inquiries"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          product_title: product.title,
          subject: quoteForm.subject,
          name: quoteForm.name,
          email: quoteForm.email,
          quantity: quoteForm.quantity || customQty || "",
          size: selectedSize || "",
          color: selectedColor || "",
          material: selectedMaterial?.label || "",
          finishing: selectedFinish || "",
          printing: selectedSide || "",
          processing: product.processing?.[0] || "",
          other: quoteForm.other,
          design_data: designData,
          isRushOrder,          // ADD
          rushOrderFee,         // ADD
          sizeSurcharge,   // ADD
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to submit");

      setQuoteSuccess(true);
      setQuoteForm((prev) => ({
        ...prev,
        name: "",
        email: "",
        other: "",
      }));
    } catch (err) {
      setQuoteError(err.message || "Something went wrong. Please try again.");
    } finally {
      setQuoteSubmitting(false);
    }
  };

  const handleReelScroll = () => {
    const reel = reelRef.current;
    if (!reel) return;
    setActiveImageIdx(Math.round(reel.scrollLeft / reel.offsetWidth));
  };

  const scrollToSlide = (idx) => {
    const reel = reelRef.current;
    if (!reel) return;
    reel.scrollTo({ left: idx * reel.offsetWidth, behavior: "smooth" });
    setActiveImageIdx(idx);
  };

  const scrollToQuote = () => {
    // Select the Contact Us / custom size option when user requests a quote
    setCustomSizeSelected(true);
    quoteRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const executeAddToCart = () => {
    addToCart({
      id: product.id,
      productId: product.id,
      title: product.title,
      price: grandTotal,
      size: selectedSize,
      sizeSurcharge,        // ADD
      isRushOrder,           // ADD
      rushOrderFee,  
      sizeSurcharge,
      rushOrder: isRushOrder,
      rushOrderFee,
      color: selectedColor || "",
      material: {
        label: selectedMaterial?.label || "",
        price: selectedMaterial?.price || "",
      },
      sides: selectedSide,
      finishing: selectedFinish,
      quantity: selectedQty,
      design: activeDesign || null,
      images: product.images,
    });

    setSuccessMessage("✓ Added to cart!");
    setTimeout(() => {
      setSuccessMessage("");
    }, 2000);

    try {
      sessionStorage.removeItem(`pd_${id}_selectedSize`);
      sessionStorage.removeItem(`pd_${id}_selectedMaterial`);
      sessionStorage.removeItem(`pd_${id}_selectedSide`);
      sessionStorage.removeItem(`pd_${id}_selectedFinish`);
      sessionStorage.removeItem(`pd_${id}_selectedColor`);
      sessionStorage.removeItem(`pd_${id}_selectedQty`);
      sessionStorage.removeItem(`pd_${id}_customQty`);
      sessionStorage.removeItem(`pd_${id}_activeDesign`);
      sessionStorage.removeItem(`pd_${id}_isRushOrder`);
    } catch (e) {
      console.warn("Failed to clear sessionStorage on addToCart", e);
    }
    setActiveDesign(null);
    clearWip();
  };

  const handleAddToCart = () => {
    // Cart guard: block bulk quantities, redirect to quote request.
    // Checked first — an over-threshold quantity intentionally leaves
    // selectedQty unset, so "please select a quantity" would be misleading.
    if (exceedsBulkThreshold) {
      setShowBulkQuoteModal(true);
      return;
    }

    if (!selectedQty) {
      setNoticeModal({
        title: "Complete your options",
        message: "Please select quantity before adding to cart.",
        tone: "info",
      });
      return;
    }

    if (product.stock === 0) {
      setShowOosConfirmModal(true);
      return;
    }

    // Cart guard: warn if always-printed product has no design filled
    const hasPrintZones = product.print_zones?.length > 0;
    if (hasPrintZones && !activeDesign) {
      setShowNoDesignConfirmModal(true);
      return;
    }

    attemptAddToCart();   // was: executeAddToCart();
  };

  if (productLoading) {
    return (
      <div>
        <div style={{ padding: "30px", maxWidth: "1400px", margin: "0 auto" }}>
          <p>Loading product...</p>
        </div>
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div>
        <div style={{ padding: "30px", maxWidth: "1400px", margin: "0 auto" }}>
          <button onClick={() => navigate(-1)}>← Back</button>
          <h2>{productError || "Product not found"}</h2>
        </div>
      </div>
    );
  }

  if (isCustomizerOpen && CustomizerPanel) {
    return (
      <div className="pd-customizer-page-wrapper fade-in-up">
        <div className="pd-customizer-page-header">
          <div className="pd-customizer-header-left">
            <button
              type="button"
              className="pd-customizer-back-btn"
              onClick={() => navigate(getBackUrl(), { replace: true })}
            >
              ←
            </button>
            <h2>Design Customizer</h2>
          </div>
          <div
            className="pd-customizer-header-right"
            id="customizer-header-actions"
          />
        </div>
        <div className="pd-customizer-page-body">
          <CustomizerPanel
            product={filteredProductForCustomizer || product}
            activeDesign={activeDesign}
            selectedSize={selectedSize}
            onSizeChange={(val) => {
              setSelectedSize(val);
              setSessionValue(id, "selectedSize", val);
            }}
            selectedMaterial={selectedMaterial}
            onMaterialChange={(val) => {
              setSelectedMaterial(val);
              setSessionValue(id, "selectedMaterial", val);
            }}
            selectedSide={selectedSide}
            onSideChange={(val) => {
              setSelectedSide(val);
              setSessionValue(id, "selectedSide", val);
            }}
            selectedFinish={selectedFinish}
            onFinishChange={(val) => {
              setSelectedFinish(val);
              setSessionValue(id, "selectedFinish", val);
            }}
            initialWip={customizerWip}
            onWipChange={handleWipChange}
            onDesignReady={(meta) => {
              setActiveDesign(meta);
              setSessionValue(id, "activeDesign", meta);
              clearWip();

              // Notify React Native WebView if embedded in mobile app
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(
                  JSON.stringify({
                    type: "DESIGN_COMPLETED",
                    design: meta,
                  }),
                );
                return;
              }

              // Auto-select corresponding side based on customized zones
              if (meta?.zones && Object.keys(meta.zones).length > 0) {
                const activeZoneIds = Object.entries(meta.zones)
                  .filter(([_, z]) => z?.imageUrl)
                  .map(([zoneId]) => zoneId);

                if (activeZoneIds.length > 0) {
                  const bestSide = Object.entries(SIDE_TO_ZONES).find(
                    ([_, zoneIds]) => {
                      return (
                        zoneIds.length === activeZoneIds.length &&
                        zoneIds.every((z) => activeZoneIds.includes(z))
                      );
                    },
                  );

                  if (bestSide) {
                    const matchedSide = product.sides?.find(
                      (s) => s.toLowerCase().trim() === bestSide[0],
                    );
                    if (matchedSide) {
                      setSelectedSide(matchedSide);
                      setSessionValue(id, "selectedSide", matchedSide);
                    }
                  } else {
                    const hasFront = activeZoneIds.includes("front");
                    const hasBack = activeZoneIds.includes("back");
                    if (hasFront && hasBack) {
                      const bothSide = product.sides?.find(
                        (s) =>
                          s.toLowerCase().includes("both") ||
                          (s.toLowerCase().includes("front") &&
                            s.toLowerCase().includes("back")) ||
                          s.toLowerCase().includes("two") ||
                          s.toLowerCase().includes("360") ||
                          s.toLowerCase().includes("double"),
                      );
                      if (bothSide) {
                        setSelectedSide(bothSide);
                        setSessionValue(id, "selectedSide", bothSide);
                      }
                    }
                  }
                }
              }

              navigate(getBackUrl(), { replace: true });
            }}
            onClear={() => {
              setActiveDesign(null);
              setSessionValue(id, "activeDesign", null);
              clearWip();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="pd-page fade-in-up">
        <button
          type="button"
          className="pd-back-btn"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <div className="pd-breadcrumb">
          <span onClick={() => navigate("/product-overview")}>Products</span>
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
          <span>{product.title}</span>
        </div>

        <div className="pd-grid-layout">
          {/* Left Column: Sticky Gallery */}
          <div className="pd-left-col">
            <div className="pd-gallery">
              {/* Desktop Thumbs */}
              <div className="pd-thumbs">
                {product.gallery.map((img, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`pd-thumb ${selectedImage === img ? "active" : ""
                      }`}
                    onClick={() => setSelectedImage(img)}
                  >
                    <img src={img} alt={`${product.title} ${index + 1}`} />
                  </button>
                ))}
              </div>

              <div className={`pd-main-image ${previewClasses}`}>
                <div className="pd-preview-stage">
                  <img src={selectedImage} alt={product.title} />
                  {isJerseyProduct && (
                    <>
                      <span className="pd-print-zone pd-zone-back">
                        Back print area
                      </span>
                      <span className="pd-print-zone pd-zone-sleeve">
                        Sleeve print
                      </span>
                      <span className="pd-embroidery-badge">Embroidery</span>
                      <span className="pd-fabric-shine" />
                    </>
                  )}
                </div>
                <div className="pd-preview-status">
                  <span>
                    {previewSurface === "back"
                      ? "Back view"
                      : previewSurface === "sleeve"
                        ? "Sleeve focus"
                        : "Front view"}
                  </span>
                  <strong>{selectedFinish || "Standard finish"}</strong>
                </div>
              </div>

              {/* Mobile Swipe Reel */}
              <div
                className="pd-img-reel"
                ref={reelRef}
                onScroll={handleReelScroll}
              >
                {product.gallery.map((img, index) => (
                  <div key={index} className="pd-img-slide">
                    <img src={img} alt={`${product.title} ${index + 1}`} />
                  </div>
                ))}
              </div>

              {product.gallery.length > 1 && (
                <div className="pd-img-dots">
                  {product.gallery.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      className={`pd-img-dot ${i === activeImageIdx ? "active" : ""
                        }`}
                      onClick={() => scrollToSlide(i)}
                      aria-label={`Image ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Config & Details */}
          <div className="pd-right-col">
            <div className="pd-info-header">
              <h1>{product.title}</h1>

              {/* Print tier badge — plain vs. printed indicator */}
              {product.print_zones?.length === 0 ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "rgba(100,100,100,0.12)",
                    color: "#555",
                    fontWeight: "600",
                    fontSize: "12px",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    marginBottom: "8px",
                    letterSpacing: "0.03em",
                  }}
                >
                  ✦ Plain / Undecorated
                </span>
              ) : product.print_zones?.length > 0 ? (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "rgba(14,165,233,0.13)",
                    color: "#0369a1",
                    fontWeight: "600",
                    fontSize: "12px",
                    padding: "4px 12px",
                    borderRadius: "20px",
                    marginBottom: "8px",
                    letterSpacing: "0.03em",
                  }}
                >
                  Includes Custom Print
                </span>
              ) : null}

              <div className="pd-perk-badges">
                <span className="pd-perk-badge">Premium Quality</span>
                <span className="pd-perk-badge">Fade Resistant</span>
                <span className="pd-perk-badge">Fast Turnaround</span>
                <span className="pd-perk-badge">Locally Printed</span>
              </div>
              <div className="pd-stock-info" style={{ marginTop: "8px" }}>
                {product.stock === 0 ? (
                  <span
                    style={{
                      color: "#dc2626",
                      fontWeight: "700",
                      fontSize: "13px",
                      background: "rgba(220, 38, 38, 0.1)",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      display: "inline-block",
                    }}
                  >
                    Out of Stock
                  </span>
                ) : (
                  <span
                    style={{
                      color: "#16a34a",
                      fontWeight: "600",
                      fontSize: "13px",
                      background: "rgba(22, 163, 74, 0.1)",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      display: "inline-block",
                    }}
                  >
                    In Stock ({product.stock} units left)
                  </span>
                )}
              </div>
              <p className="pd-description">{product.description}</p>
              <p className="pd-extra-link">
                Something you need but cannot find in here?{" "}
                <button
                  type="button"
                  className="pd-inline-link"
                  onClick={scrollToQuote}
                >
                  Request a quote
                </button>
              </p>
            </div>

            {/* Info & Action Pills */}
            <div className="pd-info-pills">
              <button
                type="button"
                className="pd-info-pill-btn"
                onClick={() => {
                  setIsTemplatesOpen(true);
                  document
                    .querySelector(".pd-accordions")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Templates
              </button>
              <button
                type="button"
                className="pd-info-pill-btn"
                onClick={() => {
                  setIsSpecsOpen(true);
                  document
                    .querySelector(".pd-accordions")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Specifications
              </button>
            </div>

            <div className="pd-configurator">
              {/* Step 1: Size */}
              <div className="pd-option-group">
                <label htmlFor="pd-size-select" className="pd-option-label">
                  1. Choose Size
                </label>
                <select
                  id="pd-size-select"
                  className="pd-select-control"
                  value={selectedSize}
                  onChange={(e) => {
                    setSelectedSize(e.target.value);
                    setSessionValue(id, "selectedSize", e.target.value);
                    setCustomSizeSelected(false);
                  }}
                >
                  {product.sizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>

              {!customSizeSelected && (
                <>
                  {/* Step 2: Material */}
                  <div className="pd-option-group">
                    <label
                      htmlFor="pd-material-select"
                      className="pd-option-label"
                    >
                      2. Choose Material
                    </label>
                    <select
                      id="pd-material-select"
                      className="pd-select-control"
                      value={selectedMaterial?.label || ""}
                      onChange={(e) => {
                        const mat = product.materials.find(
                          (m) => m.label === e.target.value,
                        );
                        if (mat) {
                          setSelectedMaterial(mat);
                          setSessionValue(id, "selectedMaterial", mat);
                        }
                      }}
                    >
                      {product.materials.map((material) => (
                        <option key={material.label} value={material.label}>
                          {material.label}{" "}
                          {material.price
                            ? `(+ ${formatPrice(
                              extractNumericPrice(material.price),
                            )})`
                            : "(Included)"}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Step 3: Printed Sides */}
                  {/* <div className="pd-option-group">
                    <label
                      htmlFor="pd-sides-select"
                      className="pd-option-label"
                    >
                      3. Choose Printed Sides
                    </label>
                    <select
                      id="pd-sides-select"
                      className="pd-select-control"
                      value={selectedSide}
                      onChange={(e) => {
                        setSelectedSide(e.target.value);
                        setSessionValue(id, "selectedSide", e.target.value);
                        setActiveDesign(null);
                        setSessionValue(id, "activeDesign", null);
                        clearWip();
                      }}
                    >
                      {displaySides.map((side) => (
                        <option key={side} value={side}>
                          {side}
                        </option>
                      ))}
                    </select>
                  </div> */}

                  {/* Step 4: Finishing */}
                  <div className="pd-option-group">
                    <label
                      htmlFor="pd-finish-select"
                      className="pd-option-label"
                    >
                      4. Choose Finishing
                    </label>
                    <select
                      id="pd-finish-select"
                      className="pd-select-control"
                      value={selectedFinish}
                      onChange={(e) => {
                        setSelectedFinish(e.target.value);
                        setSessionValue(id, "selectedFinish", e.target.value);
                      }}
                    >
                      {product.finishing.map((finish) => (
                        <option key={finish} value={finish}>
                          {finish}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Step 4.5: Choose Color */}
                  {product.colors?.length > 0 && (
                    <div className="pd-option-group">
                      <label
                        htmlFor="pd-color-select"
                        className="pd-option-label"
                      >
                        Choose Color
                      </label>
                      <select
                        id="pd-color-select"
                        className="pd-select-control"
                        value={selectedColor}
                        onChange={(e) => {
                          setSelectedColor(e.target.value);
                          setSessionValue(id, "selectedColor", e.target.value);
                        }}
                      >
                        {product.colors.map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Step 5: Customizer (Optional) */}
                  {CustomizerPanel && product.print_zones?.length > 0 && (
                    <div className="pd-option-group">
                      <label className="pd-option-label">
                        5. Design Customization
                      </label>
                      {activeDesign ? (
                        <div className="pd-design-status-box">
                          <div className="pd-design-thumbs-row">
                            {Object.values(activeDesign.zones || {})
                              .filter((z) => z?.imageUrl)
                              .map((z, i) => (
                                <img
                                  key={i}
                                  src={z.imageUrl}
                                  alt="attached zone"
                                  className="pd-design-attached-thumb"
                                />
                              ))}
                            {!Object.values(activeDesign.zones || {}).some(
                              (z) => z?.imageUrl,
                            ) &&
                              activeDesign.generatedImageUrl && (
                                <img
                                  src={activeDesign.generatedImageUrl}
                                  alt="design preview"
                                  className="pd-design-attached-thumb"
                                />
                              )}
                          </div>
                          <div className="pd-design-status-text">
                            <span>Design attached</span>
                            <div className="pd-design-status-buttons">
                              <button
                                type="button"
                                className="pd-design-edit-btn"
                                onClick={() =>
                                  navigate(`/product/${id}/customize`)
                                }
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="pd-design-remove-btn"
                                onClick={() => {
                                  setActiveDesign(null);
                                  setSessionValue(id, "activeDesign", null);
                                  clearWip();
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="pd-btn-open-modal-customizer"
                          onClick={() => navigate(`/product/${id}/customize`)}
                        >
                          Design Your Own / Customize...
                        </button>
                      )}
                    </div>
                  )}

                  {/* Step 6 / 5: Quantity */}
                  <div className="pd-option-group">
                    <label htmlFor="pd-qty-select" className="pd-option-label">
                      {CustomizerPanel && product.print_zones?.length > 0
                        ? "6. Choose Quantity"
                        : "5. Choose Quantity"}
                    </label>
                    {product.quantity_mode === "text" ? (
                      <div className="pd-qty-custom-box">
                        {(() => {
                          const handleQtyChange = (val) => {
                            const v = String(val);
                            setCustomQty(v);
                            setSessionValue(id, "customQty", v);
                            const n = parseInt(v, 10) || 0;

                            if (n <= 0) {
                              setSelectedQty(null);
                              setSessionValue(id, "selectedQty", null);
                              bulkAlertShownRef.current = false;
                              return;
                            }

                            const exceedsBulk =
                              product.quantity_count &&
                              n > product.quantity_count;

                            if (exceedsBulk) {
                              // Keep what they typed visible in the input,
                              // but don't treat it as a valid cart quantity.
                              setSelectedQty(null);
                              setSessionValue(id, "selectedQty", null);
                              // Only pop the alert once per crossing — not on
                              // every keystroke while they keep typing.
                              if (!bulkAlertShownRef.current) {
                                bulkAlertShownRef.current = true;
                                setShowBulkQuoteModal(true);
                              }
                            } else {
                              bulkAlertShownRef.current = false;
                              const qtyObj = {
                                label: `${n} pcs`,
                                price: formatPrice(
                                  extractNumericPrice(product.price) * n,
                                ),
                                quantityNumber: n,
                              };
                              setSelectedQty(qtyObj);
                              setSessionValue(id, "selectedQty", qtyObj);
                              setCustomSizeSelected(false);
                            }
                          };

                          return (
                            <div
                              style={{ display: "flex", alignItems: "center" }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleQtyChange(
                                    Math.max(
                                      1,
                                      (parseInt(customQty, 10) || 1) - 1,
                                    ),
                                  )
                                }
                                style={{
                                  width: "38px",
                                  height: "38px",
                                  background: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "6px 0 0 6px",
                                  cursor: "pointer",
                                  fontWeight: "bold",
                                  color: "#475569",
                                }}
                              >
                                -
                              </button>
                              <input
                                id="pd-qty-select"
                                type="number"
                                min={1}
                                className="pd-qty-input-text"
                                value={customQty}
                                onChange={(e) =>
                                  handleQtyChange(e.target.value)
                                }
                                placeholder="Qty"
                                style={{
                                  borderRadius: "0",
                                  borderLeft: "none",
                                  borderRight: "none",
                                  textAlign: "center",
                                  width: "60px",
                                  height: "38px",
                                  margin: 0,
                                  MozAppearance: "textfield",
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleQtyChange(
                                    (parseInt(customQty, 10) || 0) + 1,
                                  )
                                }
                                style={{
                                  width: "38px",
                                  height: "38px",
                                  background: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "0 6px 6px 0",
                                  cursor: "pointer",
                                  fontWeight: "bold",
                                  color: "#475569",
                                }}
                              >
                                +
                              </button>
                            </div>
                          );
                        })()}
                        {product.quantity_count && (
                          <div className="pd-qty-limit-notice">
                            Quantities greater than {product.quantity_count}{" "}
                            will be handled via quote request.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="pd-qty-container">
                        <select
                          id="pd-qty-select"
                          className="pd-select-control"
                          data-no-realtime-validation="true"
                          value={selectedQty?.label || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "") {
                              setSelectedQty(null);
                              setSessionValue(id, "selectedQty", null);
                              return;
                            }
                            const qty = product.quantities.find(
                              (q) => q.label === val,
                            );
                            if (qty) {
                              setSelectedQty(qty);
                              setSessionValue(id, "selectedQty", qty);
                            }
                          }}
                        >
                          <option value="">Select Quantity</option>
                          {product.quantities.map((qty) => {
                            const numeric =
                              parseInt(qty.label, 10) || qty.label;
                            return (
                              <option key={qty.label} value={qty.label}>
                                {numeric}
                              </option>
                            );
                          })}
                        </select>
                        <span className="pd-qty-suffix">pcs.</span>
                      </div>
                    )}
                    {product.quantity_mode !== "text" &&
                      product.quantity_count && (
                        <div className="pd-qty-limit-notice">
                          Quantities greater than {product.quantity_count} pcs
                          are handled via quote request.
                        </div>
                      )}
                  </div>

                  <div className="pd-option-group">
                    <label className="pd-option-label">Need it faster?</label>
                    <button
                      type="button"
                      onClick={handleToggleRushOrder}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: "8px",
                        fontWeight: 600,
                        fontSize: "14px",
                        cursor: "pointer",
                        border: isRushOrder ? "1px solid #ea580c" : "1px solid #cbd5e1",
                        background: isRushOrder ? "rgba(234,88,12,0.12)" : "#f8fafc",
                        color: isRushOrder ? "#c2410c" : "#334155",
                      }}
                    >
                      {isRushOrder ? "✓ Rush Order Added (+20%)" : "⚡ Add Rush Order (+20%)"}
                    </button>
                  </div>

                  {/* Summary & Checkout Card */}
                  <div className="pd-order-card">
                    <div className="pd-order-head">
                      <span>Ready to print</span>
                      <strong key={grandTotal} className="pd-animated-price">
                        <AnimatedPrice value={grandTotal} />
                      </strong>
                    </div>

                    <div className="pd-order-details">
                      <span>
                        <strong>Size</strong>
                        {selectedSize || "Select one"}
                      </span>
                      <span>
                        <strong>Material</strong>
                        {selectedMaterial?.label || "Select one"}
                      </span>
                      <span>
                        <strong>Print</strong>
                        {selectedSide || "Select one"}
                      </span>
                      <span>
                        <strong>Qty</strong>
                        {selectedQty?.label || customQty || "Select one"}
                      </span>
                      {product.colors?.length > 0 && (
                        <span>
                          <strong>Color</strong>
                          {selectedColor || "Select one"}
                        </span>
                      )}
                    </div>

                    <div className="pd-order-price-lines">
                      <p>
                        <span>Quantity price</span>
                        <strong>{selectedQty?.price || formatPrice(0)}</strong>
                      </p>
                      <p>
                        <span>Material add-on</span>
                        <strong>{materialDisplayPrice}</strong>
                      </p>
                      {sizeSurcharge > 0 && (
                        <p>
                          <span>Size surcharge ({selectedSize})</span>
                          <strong>+ {formatPrice(sizeSurcharge)}</strong>
                        </p>
                      )}
                      {isRushOrder && (
                        <p>
                          <span>Rush order (+20%)</span>
                          <strong>+ {formatPrice(rushOrderFee)}</strong>
                        </p>
                      )}
                      <p className="pd-order-total-line">
                        <span>Total</span>
                        <strong key={`total-${grandTotal}`} className="pd-animated-price">
                          <AnimatedPrice value={grandTotal} />
                        </strong>
                      </p>
                    </div>

                    {successMessage && (
                      <div className="pd-success-message">
                        <FaCheckCircle /> {successMessage}
                      </div>
                    )}

                    <button
                      type="button"
                      className="pd-cart-btn"
                      onClick={handleAddToCart}
                    >
                      ADD TO CART
                    </button>
                  </div>
                </>
              )}

              {/* Accordions */}
              <div className="pd-accordions">
                <div
                  className={`pd-accordion-item ${isTemplatesOpen ? "active" : ""
                    }`}
                >
                  <button
                    type="button"
                    className="pd-accordion-header"
                    onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
                  >
                    <span>TEMPLATES</span>
                    <span>{isTemplatesOpen ? "−" : "+"}</span>
                  </button>
                  {isTemplatesOpen && (
                    <div className="pd-accordion-content">
                      <p>Available template size:</p>
                      <div className="pd-template-box">
                        <strong>{product.sizes[0]}</strong>
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className={`pd-accordion-item ${isSpecsOpen ? "active" : ""}`}
                >
                  <button
                    type="button"
                    className="pd-accordion-header"
                    onClick={() => setIsSpecsOpen(!isSpecsOpen)}
                  >
                    <span>SPECIFICATIONS</span>
                    <span>{isSpecsOpen ? "−" : "+"}</span>
                  </button>
                  {isSpecsOpen && (
                    <div className="pd-accordion-content">
                      <ul className="pd-features-list">
                        <li>Use high-resolution images</li>
                        <li>Submit files in correct size</li>
                        <li>Use bleed for print-safe layout</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Quote Form */}
              {customSizeSelected && (
                <section className="pd-section pd-quote-section" ref={quoteRef}>
                  <h2 className="pd-quote-title">Request a quote.</h2>
                  <p className="pd-quote-desc">
                    Are you looking for a product that is not on our website? Or
                    have you found a product on our website, but it doesn't
                    quite fit your needs? Let our team of experts send you a
                    quote that matches your expectations.
                  </p>

                  <form className="pd-quote-box" onSubmit={handleQuoteSubmit}>
                    <div className="pd-quote-row pd-quote-row-wide">
                      <label htmlFor="subject">Subject:</label>
                      <input
                        id="subject"
                        type="text"
                        name="subject"
                        value={quoteForm.subject}
                        onChange={handleQuoteChange}
                      />
                    </div>

                    <div className="pd-quote-row">
                      <label htmlFor="name">Your Name:</label>
                      <input
                        id="name"
                        type="text"
                        name="name"
                        value={quoteForm.name}
                        onChange={handleQuoteChange}
                      />
                    </div>

                    <div className="pd-quote-row">
                      <label htmlFor="email">Your Email:</label>
                      <input
                        id="email"
                        type="email"
                        name="email"
                        value={quoteForm.email}
                        onChange={handleQuoteChange}
                      />
                    </div>

                    <div className="pd-quote-row">
                      <label>Product:</label>
                      <div className="pd-quote-readonly">{product.title}</div>
                    </div>

                    <div className="pd-quote-row">
                      <label htmlFor="quantity">Quantity:</label>
                      {product.quantity_mode === "text" ? (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 6,
                          }}
                        >
                          <input
                            id="quantity"
                            name="quantity"
                            type="number"
                            min={1}
                            value={quoteForm.quantity}
                            onChange={handleQuoteChange}
                            placeholder="Enter quantity"
                          />
                          {product.quantity_count ? (
                            <div style={{ fontSize: 12, color: "#6b7280" }}>
                              Quantities greater than {product.quantity_count}{" "}
                              will be handled via Quote/Contact.
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <select
                          id="quantity"
                          name="quantity"
                          data-no-realtime-validation="true"
                          value={quoteForm.quantity}
                          onChange={handleQuoteChange}
                        >
                          {product.quantities.map((q) => (
                            <option key={q.label} value={q.label}>
                              {q.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="pd-quote-row pd-quote-row-wide pd-quote-row-top">
                      <label htmlFor="other">Other:</label>
                      <textarea
                        id="other"
                        name="other"
                        rows="4"
                        value={quoteForm.other}
                        onChange={handleQuoteChange}
                        placeholder="Special requests..."
                      />
                    </div>

                    <div className="pd-quote-actions">
                      {quoteSuccess && (
                        <div className="pd-quote-success">
                          <FaCheckCircle /> Your quote request has been
                          submitted! We'll get back to you shortly.
                        </div>
                      )}
                      {quoteError && (
                        <div className="pd-quote-error">{quoteError}</div>
                      )}
                      <button
                        type="submit"
                        className="pd-quote-btn"
                        disabled={quoteSubmitting}
                      >
                        {quoteSubmitting ? "SUBMITTING..." : "REQUEST QUOTE"}
                      </button>
                    </div>
                  </form>
                </section>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Sticky Add to Cart */}
        {!customSizeSelected && (
          <div className="pd-sticky-cta">
            <button
              type="button"
              className="pd-sticky-btn"
              onClick={handleAddToCart}
            >
              Add to Cart
            </button>
          </div>
        )}

        {/* Recently Viewed */}
        {recentlyViewed.length > 0 && (
          <section className="pd-recently-viewed">
            <div className="pd-recently-head">
              <h2>Your recently viewed items</h2>
              <p>Products you opened earlier will stay here.</p>
            </div>
            <div className="pd-recently-grid">
              {recentlyViewed.slice(0, 4).map((item) => {
                const image =
                  item.images?.[0] ||
                  item.image ||
                  "https://via.placeholder.com/300x200?text=No+Image";
                return (
                  <button
                    key={item.id}
                    type="button"
                    className="pd-recent-card"
                    onClick={() => navigate(`/product/${item.id}`)}
                  >
                    <img
                      src={image}
                      alt={item.name}
                      onError={(e) => {
                        e.target.src =
                          "https://via.placeholder.com/300x200?text=No+Image";
                      }}
                    />
                    <strong>{item.name}</strong>
                    {formatRecentPrice(item.price) ? (
                      <span>From {formatRecentPrice(item.price)}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <AppModal
        open={Boolean(noticeModal)}
        title={noticeModal?.title}
        message={noticeModal?.message}
        tone={noticeModal?.tone}
        onConfirm={() => setNoticeModal(null)}
      />

      <AppModal
        open={showOosConfirmModal}
        title="Item Currently Out of Stock"
        message={
          "This item is currently out of stock. " +
          "Do you still want to add it to your cart?"
        }
        confirmText="Add to Cart"
        cancelText="Cancel"
        tone="warning"
        onConfirm={() => {
          setShowOosConfirmModal(false);
          attemptAddToCart();
        }}
        onCancel={() => setShowOosConfirmModal(false)}
      />

      <AppModal
        open={showNoDesignConfirmModal}
        title="No design added"
        message={
          "You haven't added a design yet. This product requires a " +
          "custom print. Do you want to continue without a design?"
        }
        confirmText="Add to Cart"
        cancelText="Cancel"
        tone="warning"
        onConfirm={() => {
          setShowNoDesignConfirmModal(false);
          attemptAddToCart();
        }}
        onCancel={() => setShowNoDesignConfirmModal(false)}
      />

      <AppModal
        open={showBulkQuoteModal}
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
          setShowBulkQuoteModal(false);
          scrollToQuote();
        }}
        onCancel={() => {
          setShowBulkQuoteModal(false);
          bulkAlertShownRef.current = false;
        }}
      />

      {showLoginModal && (
  <LoginRequiredModal
    variant="checkout"
    onClose={() => setShowLoginModal(false)}
    onLogin={() => {
      setShowLoginModal(false);
      navigate("/user-login", { state: { from: `/product/${id}` } });
    }}
    onRegister={() => {
      setShowLoginModal(false);
      navigate("/user-register", { state: { from: `/product/${id}` } });
    }}
  />
)}
    </div>
  );
}

export default ProductDetail;