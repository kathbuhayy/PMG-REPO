import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FaCheckCircle, FaMagic } from "react-icons/fa";
import "./Product-detail.css";
import { getProductCategory } from "../config/categoryDefaults";
import { useCart } from "../hooks/useCart";
import { extractNumericPrice, formatPrice } from "../utils/appUtils";
import { buildApiUrl } from "../config/api";
import AIBuilderPanel from "../components/AIBuilder/AIBuilderPanel";
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
import FlatCustomizerPanel from "../components/FlatCustomizer/FlatCustomizerPanel";
import AppModal from "../components/AppModal";

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
  const printZones =
    data.print_zones?.length > 0
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
    price: data.price,
    sizes: (data.size_options || []).filter(
      (s) => !/contact\s*us/i.test(s)
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
    stock: data.stock !== undefined ? Number(data.stock) : 0,
  };
}

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
  const [selectedSize, setSelectedSize] = useState(product?.sizes?.[0] || "");
  const [selectedMaterial, setSelectedMaterial] = useState(
    product?.materials?.[0] || null,
  );
  const [selectedSide, setSelectedSide] = useState(product?.sides?.[0] || "");
  const [selectedFinish, setSelectedFinish] = useState(
    product?.finishing?.[0] || "",
  );
  const [selectedQty, setSelectedQty] = useState(
    product?.quantities?.[0] || null,
  );
  const [selectedColor, setSelectedColor] = useState(
    product?.colors?.[0] || "",
  );
  const [customQty, setCustomQty] = useState("");
  const [searchParams] = useSearchParams();
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  useEffect(() => {
    if (!product) return;
    const isCustomizerRequested =
      searchParams.get("customizer") === "true" ||
      searchParams.get("embed") === "true";

    if (isCustomizerRequested) {
      setIsCustomizerOpen(true);

      const sizeParam = searchParams.get("size");
      if (sizeParam) setSelectedSize(sizeParam);

      const materialParam = searchParams.get("material");
      if (materialParam && product.materials) {
        const matched = product.materials.find(
          (m) => (m.label || m) === materialParam,
        );
        if (matched) setSelectedMaterial(matched);
      }

      const sideParam = searchParams.get("side");
      if (sideParam) setSelectedSide(sideParam);

      const finishParam = searchParams.get("finishing");
      if (finishParam) setSelectedFinish(finishParam);

      const colorParam = searchParams.get("color");
      if (colorParam) setSelectedColor(colorParam);
    }
  }, [product, searchParams]);
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

  // AI Builder
  const [activeDesign, setActiveDesign] = useState(null); // designMeta | null

  // WIP Customizer state persistence (survives page refresh)
  const [customizerWip, setCustomizerWip] = useState(() => {
    if (!product?.id) return null;
    try {
      const saved = localStorage.getItem(`customizer_wip_${product.id}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Sync state if product ID changes
  useEffect(() => {
    if (!product?.id) return;
    try {
      const saved = localStorage.getItem(`customizer_wip_${product.id}`);
      setCustomizerWip(saved ? JSON.parse(saved) : null);
    } catch {
      setCustomizerWip(null);
    }
  }, [product?.id]);

  // Handle sync updates of customizer WIP
  const handleWipChange = (wip) => {
    if (!product?.id) return;
    setCustomizerWip(wip);
    try {
      if (wip) {
        localStorage.setItem(
          `customizer_wip_${product.id}`,
          JSON.stringify(wip)
        );
      } else {
        localStorage.removeItem(`customizer_wip_${product.id}`);
      }
    } catch (e) {
      console.warn("Could not save WIP to local storage", e);
    }
  };

  // Helper to clear the customizer WIP state for the current product
  const clearWip = () => {
    if (!product?.id) return;
    setCustomizerWip(null);
    try {
      localStorage.removeItem(`customizer_wip_${product.id}`);
    } catch (e) {
      console.warn("Could not clear WIP from local storage", e);
    }
  };
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
    if (!product) return;

    setSelectedImage(product.gallery?.[0] || "");
    setSelectedSize(product.sizes?.[0] || "");
    setSelectedMaterial(product.materials?.[0] || null);
    setSelectedSide(product.sides?.[0] || "");
    setSelectedColor(product.colors?.[0] || "");
    setSelectedFinish(product.finishing?.[0] || "");
    setSelectedQty(product.quantities?.[0] || null);
    setCustomQty("");
    setCustomSizeSelected(false);

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
      printing: product.sides?.[0] || "",
      processing: product.processing?.[0] || "",
      other: "",
    });
  }, [product]);

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

  const quantityPrice = useMemo(
    () => extractNumericPrice(selectedQty?.price),
    [selectedQty],
  );

  const grandTotal = useMemo(
    () => quantityPrice + materialSurcharge,
    [quantityPrice, materialSurcharge],
  );

  const selectedSideLower = String(selectedSide || "").toLowerCase();
  const selectedFinishLower = String(selectedFinish || "").toLowerCase();
  const selectedMaterialLower = String(
    selectedMaterial?.label || "",
  ).toLowerCase();
  const isJerseyProduct = String(product?.dbCategory || product?.title || "")
    .toLowerCase()
    .includes("jersey");
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
  const completedSteps = progressSteps.filter((step) => step.complete).length;

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

  const handleQuoteSubmit = async (e) => {
    e.preventDefault();

    setQuoteSubmitting(true);
    setQuoteError("");

    try {
      const userId = storedUser?.id || null;

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
  };

  const handleAddToCart = () => {
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

    executeAddToCart();
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
              onClick={() => setIsCustomizerOpen(false)}
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
            onSizeChange={setSelectedSize}
            selectedMaterial={selectedMaterial}
            onMaterialChange={setSelectedMaterial}
            selectedSide={selectedSide}
            onSideChange={setSelectedSide}
            selectedFinish={selectedFinish}
            onFinishChange={setSelectedFinish}
            initialWip={customizerWip}
            onWipChange={handleWipChange}
            onDesignReady={(meta) => {
              setActiveDesign(meta);
              setIsCustomizerOpen(false);
              clearWip();

              // Notify React Native WebView if embedded in mobile app
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(
                  JSON.stringify({
                    type: "DESIGN_COMPLETED",
                    design: meta,
                  }),
                );
              }

              // Auto-select the corresponding side option based on customized zones
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
                      if (bothSide) setSelectedSide(bothSide);
                    }
                  }
                }
              }
            }}
            onClear={() => {
              setActiveDesign(null);
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
                        if (mat) setSelectedMaterial(mat);
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
                  <div className="pd-option-group">
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
                        setActiveDesign(null);
                        clearWip();
                      }}
                    >
                      {product.sides.map((side) => (
                        <option key={side} value={side}>
                          {side}
                        </option>
                      ))}
                    </select>
                  </div>

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
                      onChange={(e) => setSelectedFinish(e.target.value)}
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
                        onChange={(e) => setSelectedColor(e.target.value)}
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
                                onClick={() => setIsCustomizerOpen(true)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="pd-design-remove-btn"
                                onClick={() => {
                                  setActiveDesign(null);
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
                          onClick={() => setIsCustomizerOpen(true)}
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
                            const n = parseInt(v, 10) || 0;
                            if (n <= 0) return;

                            if (
                              product.quantity_count &&
                              n > product.quantity_count
                            ) {
                              setCustomSizeSelected(true);
                              scrollToQuote();
                            } else {
                              setSelectedQty({
                                label: `${n} pcs`,
                                price: formatPrice(
                                  extractNumericPrice(product.price) * n,
                                ),
                                quantityNumber: n,
                              });
                              setCustomSizeSelected(false);
                            }
                          };

                          return (
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleQtyChange(Math.max(1, (parseInt(customQty, 10) || 1) - 1))}
                                style={{ width: "38px", height: "38px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "6px 0 0 6px", cursor: "pointer", fontWeight: "bold", color: "#475569" }}
                              >
                                -
                              </button>
                              <input
                                id="pd-qty-select"
                                type="number"
                                min={1}
                                className="pd-qty-input-text"
                                value={customQty}
                                onChange={(e) => handleQtyChange(e.target.value)}
                                placeholder="Qty"
                                style={{ borderRadius: "0", borderLeft: "none", borderRight: "none", textAlign: "center", width: "60px", height: "38px", margin: 0, MozAppearance: "textfield" }}
                              />
                              <button
                                type="button"
                                onClick={() => handleQtyChange((parseInt(customQty, 10) || 0) + 1)}
                                style={{ width: "38px", height: "38px", background: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "0 6px 6px 0", cursor: "pointer", fontWeight: "bold", color: "#475569" }}
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
                            const qty = product.quantities.find(
                              (q) => q.label === e.target.value,
                            );
                            if (qty) setSelectedQty(qty);
                          }}
                        >
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
                      <p className="pd-order-total-line">
                        <span>Total</span>
                        <strong
                          key={`total-${grandTotal}`}
                          className="pd-animated-price"
                        >
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
          executeAddToCart();
        }}
        onCancel={() => setShowOosConfirmModal(false)}
      />
    </div>
  );
}

export default ProductDetail;
