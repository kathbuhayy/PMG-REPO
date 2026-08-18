import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  FaSearch,
  FaFilter,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEdit,
  FaTrash,
  FaPlus,
  FaCloudUploadAlt,
  FaTrashAlt,
  FaInfoCircle,
} from "react-icons/fa";
import { adminFetch } from "../utils/adminFetch";
import ConfirmModal from "../components/ConfirmModal";
import "./Admin-dashboard.css";
import { buildApiUrl } from "../config/api";
import {
  CATEGORY_DEFAULTS,
  CATEGORY_NAMES,
  CUSTOMIZER_ZONES,
  OPTION_THEMES,
} from "../config/categoryDefaults";

const CATEGORY_ZONES = {
  tshirt: ["front", "back", "left_sleeve", "right_sleeve"],
  jersey: ["front", "back", "left_sleeve", "right_sleeve"],
  jersery: ["front", "back", "left_sleeve", "right_sleeve"],
  cap: ["front", "back", "left_side", "right_side"],
  notebook: ["front_cover", "back_cover"],
  calling_card: ["front", "back"],
  business_card: ["front", "back"],
  mug: ["front", "back"],
  banners: ["front"],
  poster: ["front"],
  posters: ["front"],
  flyers: ["front", "back"],
  thank_you_card: ["front", "back"],
  stickers: ["front"],
  hang_tags: ["front", "back"],
  brochures: ["front", "back"],
  other: ["front", "back"],
};

const getCategoryZones = (category) =>
  CATEGORY_ZONES[category] || CATEGORY_ZONES.other;

// Resolves the normalized category key for customizer mapping
const getCustomizerCategoryKey = (category) => {
  const norm = String(category || "").toLowerCase();
  if (norm === "tshirt" || norm === "t-shirts") return "T-shirts";
  if (norm === "jersey" || norm === "jersery") return "Jersey";
  if (norm === "cap" || norm === "hat") return "Cap";
  if (norm === "mug" || norm === "mugs") return "Mug";
  if (norm === "notebook") return "Notebook";
  if (norm === "calling_card" || norm === "business_card") return "Business Card";
  if (norm === "brochures") return "Brochures";
  if (norm === "hang_tags") return "Hang Tags";
  if (norm === "banners") return "Banners";
  return null;
};

// Generates valid side options based on category and enabled print zones
const generateSideOptions = (category, zones) => {
  const norm = String(category || "").toLowerCase();
  const options = [];

  if (norm === "tshirt" || norm === "t-shirts") {
    if (zones.includes("front")) options.push("Front Chest");
    if (zones.includes("back")) options.push("Back");
    if (zones.includes("front") && zones.includes("back")) {
      options.push("Front & Back");
    }
    if (zones.includes("left_sleeve") || zones.includes("right_sleeve")) {
      options.push("Sleeve");
    }
    if (
      zones.includes("front") &&
      zones.includes("back") &&
      zones.includes("left_sleeve") &&
      zones.includes("right_sleeve")
    ) {
      options.push("Full Body Wrap");
    }
  } else if (norm === "jersey" || norm === "jersery") {
    if (zones.includes("front")) options.push("Front");
    if (zones.includes("back")) options.push("Back");
    if (zones.includes("front") && zones.includes("back")) {
      options.push("Front & Back");
    }
    if (zones.includes("left_sleeve")) options.push("Sleeve (Left)");
    if (zones.includes("right_sleeve")) options.push("Sleeve (Right)");
    if (
      zones.includes("front") &&
      zones.includes("back") &&
      zones.includes("left_sleeve") &&
      zones.includes("right_sleeve")
    ) {
      options.push("Full Sublimation");
    }
  } else if (norm === "cap" || norm === "hat") {
    if (zones.includes("front")) options.push("Front Center");
    if (zones.includes("back")) options.push("Back Closure");
    if (zones.includes("left_side")) options.push("Left Side");
    if (zones.includes("right_side")) options.push("Right Side");
    if (
      zones.includes("front") &&
      zones.includes("back") &&
      zones.includes("left_side") &&
      zones.includes("right_side")
    ) {
      options.push("Full Panel");
    }
  } else if (norm === "mug" || norm === "mugs") {
    if (zones.includes("front")) options.push("Front Only");
    if (zones.includes("back")) options.push("Back");
    if (zones.includes("wrap")) options.push("360° Wrap");
    if (zones.includes("front") && zones.includes("back")) {
      options.push("Front & Back");
      options.push("Two Sides");
    }
  } else if (norm === "notebook") {
    if (zones.includes("front_cover")) options.push("Single Side");
    if (zones.includes("front_cover") && zones.includes("back_cover")) {
      options.push("Double Side");
    }
  } else if (norm === "calling_card" || norm === "business_card") {
    if (zones.includes("front")) options.push("Single Side");
    if (zones.includes("front") && zones.includes("back")) {
      options.push("Double Side");
    }
  } else if (norm === "brochures") {
    if (zones.includes("front") && zones.includes("back")) {
      options.push("Double Side");
    }
  } else if (norm === "hang_tags") {
    if (zones.includes("front")) options.push("Single Side");
    if (zones.includes("front") && zones.includes("back")) {
      options.push("Double Side");
    }
  } else if (norm === "banners") {
    if (zones.includes("front")) options.push("Single Side");
  }

  return options;
};

function AdminProducts({
  refreshTrigger = 0,
  onAddProduct = null,
  lowStockFilter = null,
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [productsQuery, setProductsQuery] = useState("");
  const [productsCategory, setProductsCategory] = useState("all");
  const [localRefreshKey, setLocalRefreshKey] = useState(0); // ✅ Local refresh trigger
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [inventoryOptions, setInventoryOptions] = useState({ substrates: [], inks: [] });

  useEffect(() => {
    adminFetch(buildApiUrl("/api/admin/inventory"))
      .then((res) => res.json())
      .then((data) => {
        const materials = data.materials || [];
        setInventoryOptions({
          substrates: materials.filter((m) => m.type === "substrate"),
          inks: materials.filter((m) => m.type === "ink"),
        });
      })
      .catch((err) => console.error("Failed to fetch inventory options:", err));
  }, []);

  // ✅ NEW: Edit product states
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    sku: "",
    price: "",
    stock: "",
    print_type: "offset",
    material: "",
    description: "",
    ai_prompt_rules: "",
    substrateMaterialName: "",
    substrateUsagePerUnit: "",
    inkColorChannel: "",
    inkUsagePerUnit: "",
    status: "active",
    images: [],
    quantity_mode: "dropdown",
    quantity_count: "",
    color_options: [],
    size_options: [],
    material_options: [],
    side_options: [],
    finishing_options: [],
    processing_options: [],
    delivery_options: [],
    quantity_options: [],
    shipping_options: [],
    print_zones: [],
    category: "other",
  });
  const [tagInputs, setTagInputs] = useState({
    color_options: "",
    size_options: "",
    material_options: "",
    side_options: "",
    finishing_options: "",
    processing_options: "",
    delivery_options: "",
    quantity_options: "",
    shipping_options: "",
  });
  const [editImageUploading, setEditImageUploading] = useState(false);
  const [editImageError, setEditImageError] = useState("");
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [addStockProduct, setAddStockProduct] = useState(null);
  const [addStockAmount, setAddStockAmount] = useState(0);
  const [addStockOptionsText, setAddStockOptionsText] = useState("");
  const [batchPcs, setBatchPcs] = useState("");
  const [batchUnitPrice, setBatchUnitPrice] = useState("");

  const [editProductTab, setEditProductTab] = useState("details");

  const GridOptionEditor = ({ field, label }) => {
    const fieldValue = editForm[field];

    const items = useMemo(() => {
      const arr = fieldValue || [];
      return arr.map((item) => {
        const parts = String(item).split("|");
        const rawLabel = parts[0] || "";
        const lbl =
          field === "quantity_options"
            ? rawLabel.replace(/\s*pcs\s*/i, "")
            : rawLabel;

        const rawPrice = parts[1] || "";
        let prc = "";
        if (rawPrice.toLowerCase() === "free") {
          prc = "0";
        } else {
          const match = rawPrice.replace(/[^\d.]/g, "");
          if (match) prc = match;
        }

        return {
          label: lbl,
          price: prc,
        };
      });
    }, [fieldValue, field]);

    const updateItem = (index, key, val) => {
      const newItems = [...items];
      newItems[index] = { ...newItems[index], [key]: val };
      const serialized = newItems.map((it) => {
        const finalLabel =
          field === "quantity_options" && it.label
            ? `${it.label.trim()} pcs`
            : it.label.trim();

        let finalPrice = it.price.trim();
        if (finalPrice) {
          const num = parseFloat(finalPrice);
          if (!isNaN(num)) {
            if (num === 0 && field === "shipping_options") {
              finalPrice = "Free";
            } else {
              finalPrice = new Intl.NumberFormat("en-PH", {
                style: "currency",
                currency: "PHP",
              }).format(num);
            }
          }
        }
        return `${finalLabel}|${finalPrice}`;
      });
      setEditForm((prev) => ({
        ...prev,
        [field]: serialized,
      }));
    };

    const addItem = () => {
      const serialized = [...(editForm[field] || []), "|"];
      setEditForm((prev) => ({
        ...prev,
        [field]: serialized,
      }));
    };

    const removeItem = (index) => {
      const newItems = items.filter((_, idx) => idx !== index);
      const serialized = newItems.map((it) => {
        const finalLabel =
          field === "quantity_options" && it.label
            ? `${it.label.trim()} pcs`
            : it.label.trim();

        let finalPrice = it.price.trim();
        if (finalPrice) {
          const num = parseFloat(finalPrice);
          if (!isNaN(num)) {
            if (num === 0 && field === "shipping_options") {
              finalPrice = "Free";
            } else {
              finalPrice = new Intl.NumberFormat("en-PH", {
                style: "currency",
                currency: "PHP",
              }).format(num);
            }
          }
        }
        return `${finalLabel}|${finalPrice}`;
      });
      setEditForm((prev) => ({
        ...prev,
        [field]: serialized,
      }));
    };

    return (
      <div className="dashform-group" style={{ marginBottom: "20px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "6px",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          {label}
        </label>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "8px",
                alignItems: "center",
              }}
            >
              {field === "quantity_options" ? (
                <div
                  style={{
                    flex: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                >
                  <input
                    type="number"
                    value={item.label}
                    placeholder="Quantity"
                    onChange={(e) => updateItem(i, "label", e.target.value)}
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      fontSize: "13px",
                    }}
                  />
                  <span style={{ fontSize: "13px", color: "#64748b" }}>
                    pcs
                  </span>
                </div>
              ) : (
                <input
                  type="text"
                  value={item.label}
                  placeholder="Option Label"
                  onChange={(e) => updateItem(i, "label", e.target.value)}
                  style={{
                    flex: 2,
                    padding: "8px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "13px",
                  }}
                />
              )}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <input
                  type="number"
                  step="0.01"
                  value={item.price}
                  placeholder="Price"
                  onChange={(e) => updateItem(i, "price", e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "13px",
                  }}
                />
                <span style={{ fontSize: "13px", color: "#64748b" }}>PHP</span>
              </div>
              <button
                type="button"
                onClick={() => removeItem(i)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#ef4444",
                  padding: "8px",
                }}
                title="Remove row"
              >
                <FaTrashAlt size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className="dashaction-btn blue"
            onClick={addItem}
            style={{
              alignSelf: "flex-start",
              marginTop: "4px",
              padding: "6px 12px",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <FaPlus size={10} />
            Add Row
          </button>
        </div>
      </div>
    );
  };

  const addStockOptionsList = useMemo(() => {
    return (addStockOptionsText || "")
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const parts = line.split("|");
        const rawLabel = parts[0] || "";
        const lbl = rawLabel.replace(/\s*pcs\s*/i, "");

        const rawPrice = parts[1] || "";
        let prc = "";
        if (rawPrice.toLowerCase() === "free") {
          prc = "0";
        } else {
          const match = rawPrice.replace(/[^\d.]/g, "");
          if (match) prc = match;
        }

        return {
          label: lbl,
          price: prc,
        };
      });
  }, [addStockOptionsText]);

  const updateAddStockOption = (index, key, val) => {
    const newList = [...addStockOptionsList];
    newList[index] = { ...newList[index], [key]: val };
    const serialized = newList
      .map((it) => {
        const finalLabel = it.label ? `${it.label.trim()} pcs` : "";
        let finalPrice = it.price.trim();
        if (finalPrice) {
          const num = parseFloat(finalPrice);
          if (!isNaN(num)) {
            finalPrice = new Intl.NumberFormat("en-PH", {
              style: "currency",
              currency: "PHP",
            }).format(num);
          }
        }
        return `${finalLabel}|${finalPrice}`;
      })
      .join("\n");
    setAddStockOptionsText(serialized);
  };

  const addAddStockOption = () => {
    const serialized = addStockOptionsText ? `${addStockOptionsText}\n|` : "|";
    setAddStockOptionsText(serialized);
  };

  const removeAddStockOption = (index) => {
    const newList = addStockOptionsList.filter((_, idx) => idx !== index);
    const serialized = newList
      .map((it) => {
        const finalLabel = it.label ? `${it.label.trim()} pcs` : "";
        let finalPrice = it.price.trim();
        if (finalPrice) {
          const num = parseFloat(finalPrice);
          if (!isNaN(num)) {
            finalPrice = new Intl.NumberFormat("en-PH", {
              style: "currency",
              currency: "PHP",
            }).format(num);
          }
        }
        return `${finalLabel}|${finalPrice}`;
      })
      .join("\n");
    setAddStockOptionsText(serialized);
  };
  const [toast, setToast] = useState({ message: "", type: "" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: "", type: "" });
    }, 3000);
  };

  const isEditDetailsValid = useMemo(() => {
    return (
      editForm.name.trim() !== "" &&
      editForm.sku.trim() !== "" &&
      parseFloat(editForm.price) > 0
    );
  }, [editForm.name, editForm.sku, editForm.price]);

  const isEditImagesValid = useMemo(() => {
    return editForm.images.length > 0;
  }, [editForm.images]);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // If lowStockFilter prop is provided, use admin low-stock endpoint
        const useLowStock =
          lowStockFilter && lowStockFilter.filter === "low_stock";
        const threshold = (lowStockFilter && lowStockFilter.threshold) || 10;
                const url = useLowStock
          ? buildApiUrl(`/api/admin/low-stock?threshold=${threshold}&limit=100`)
          : buildApiUrl("/api/admin/products?limit=100");

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch products");

        const data = await response.json();

        // Transform API data to match UI format
        const apiProducts = data.products || data;
        const transformedProducts = (apiProducts || []).map((product) => ({
          sku: product.sku || `PRD-${product.id}`,
          name: product.name,
          category:
            product.print_type === "offset" || product.print_type === "digital"
              ? "print"
              : "service",
          price: parseFloat(product.price),
          stock:
            product.stock !== undefined && product.stock !== null
              ? product.stock
              : 0,
          status: product.active ? "active" : "inactive",
          dbId: product.id,
          material: product.material,
          description: product.description,
          images: product.images || [],
          updatedAt:
            product.updatedAt || product.createdAt || new Date().toISOString(),
        }));

        // ✅ Sort by recently updated (descending)
        transformedProducts.sort((a, b) => {
          if (a.status !== b.status) {
            return a.status === "active" ? -1 : 1;
          }
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        });

        setProducts(transformedProducts);
        setError(null);
      } catch (err) {
        console.error("Error fetching products:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    // Refresh products every 30 seconds
    const interval = setInterval(fetchProducts, 30000);
    return () => clearInterval(interval);
  }, [refreshTrigger, localRefreshKey, lowStockFilter]);

  // Filter products based on search query and category
  const filteredProducts = useMemo(() => {
    const q = productsQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchQuery =
        !q ||
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        String(p.price).includes(q);

      const matchCategory =
        productsCategory === "all" ? true : p.category === productsCategory;

      return matchQuery && matchCategory;
    });
  }, [products, productsQuery, productsCategory]);

  // Calculate stats from products
  const productsStats = useMemo(() => {
    const active = products.filter((p) => p.status === "active").length;
    const out = products.filter((p) => p.stock === 0).length;
    const services = products.filter((p) => p.category === "service").length;
    const prints = products.filter((p) => p.category === "print").length;
    return { active, out, services, prints, total: products.length };
  }, [products]);

  const handleClearFilters = () => {
    setProductsQuery("");
    setProductsCategory("all");
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = (checked) => {
    if (checked) {
      setSelectedIds(new Set(filteredProducts.map((p) => p.dbId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const bulkSetDropdown = async () => {
    if (selectedIds.size === 0) {
      showToast("No products selected", "error");
      return;
    }
    setConfirmModalConfig({
      isOpen: true,
      title: "Bulk Update",
      message: `Set ${selectedIds.size} product(s) to dropdown mode?`,
      onCancel: () => setConfirmModalConfig(null),
      onConfirm: async () => {
        setConfirmModalConfig(null);
        try {
          const promises = Array.from(selectedIds).map((id) =>
            adminFetch(buildApiUrl(`/api/products/${id}`), {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ quantity_mode: "dropdown" }),
            }),
          );

          const results = await Promise.all(promises);
          const failed = [];
          for (let i = 0; i < results.length; i++) {
            if (!results[i].ok) {
              failed.push(Array.from(selectedIds)[i]);
            }
          }

          if (failed.length > 0) {
            showToast(`Failed to update ${failed.length} product(s).`, "error");
          } else {
            showToast("Updated selected products to dropdown mode.", "success");
          }

          setSelectedIds(new Set());
          setLocalRefreshKey((k) => k + 1);
        } catch (err) {
          console.error(err);
          showToast("Bulk update failed", "error");
        }
      }
    });
  };

  // ✅ NEW: Open edit modal with selected product
  const handleEditProduct = async (product) => {
    setSelectedProduct(product);
    // Fetch full product to get option arrays
    let fullProduct = {};
    try {
      const res = await adminFetch(buildApiUrl(`/api/products/${product.dbId}`));
      if (res.ok) fullProduct = await res.json();
    } catch (err) {
      console.error("Failed to fetch full product:", err);
    }
    setEditForm({
      name: product.name,
      sku: product.sku,
      price: product.price.toString(),
      stock: product.stock.toString(),
      print_type:
        product.category === "service"
          ? "service"
          : product.category === "print"
            ? "offset"
            : "offset",
      material: product.material || "",
      description: product.description || "",
      ai_prompt_rules: fullProduct.ai_prompt_rules || "",
      substrateMaterialName: fullProduct.substrateMaterialName || "",
      substrateUsagePerUnit: fullProduct.substrateUsagePerUnit || "",
      inkColorChannel: fullProduct.inkColorChannel || "",
      inkUsagePerUnit: fullProduct.inkUsagePerUnit || "",
      status: product.status,
      images: fullProduct.images || [],
      color_options: fullProduct.color_options || [],
      size_options: fullProduct.size_options || [],
      material_options: fullProduct.material_options || [],
      side_options: fullProduct.side_options || [],
      finishing_options: fullProduct.finishing_options || [],
      processing_options: fullProduct.processing_options || [],
      delivery_options: fullProduct.delivery_options || [],
      quantity_options: fullProduct.quantity_options || [],
      quantity_mode: fullProduct.quantity_mode || "dropdown",
      quantity_count:
        fullProduct.quantity_count !== undefined &&
          fullProduct.quantity_count !== null
          ? String(fullProduct.quantity_count)
          : "",
      shipping_options: fullProduct.shipping_options || [],
      print_zones:
        fullProduct.print_zones?.length > 0
          ? fullProduct.print_zones
          : getCategoryZones(fullProduct.category || "other"),
      category: fullProduct.category || "other",
    });
    setTagInputs({
      color_options: "",
      size_options: "",
      material_options: "",
      finishing_options: "",
      processing_options: "",
      delivery_options: "",
      quantity_options: "",
      shipping_options: "",
    });
    setEditImageError("");
    setEditProductTab("details");
    setShowEditModal(true);
  };

  // ✅ NEW: Toggle product status (active/inactive)
  const handleToggleStatus = async (product) => {
    try {
      const newStatus = product.status === "active" ? false : true;
      const res = await adminFetch(buildApiUrl(`/api/products/${product.dbId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update status");
      showToast("Product status updated!", "success");
      // ✅ Trigger local refresh instead of reloading
      setLocalRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error toggling status:", err);
      showToast(err.message || "Error updating status", "error");
    }
  };

  // ✅ NEW: Submit edit product form
  const submitEditProduct = async (e) => {
    e.preventDefault();

    if (!editForm.name.trim()) {
      showToast("Product name is required", "error");
      return;
    }
    if (!editForm.sku.trim()) {
      showToast("SKU is required", "error");
      return;
    }
    if (!editForm.price || editForm.price <= 0) {
      showToast("Price must be greater than 0", "error");
      return;
    }

    try {
      const res = await adminFetch(
        buildApiUrl(`/api/products/${selectedProduct.dbId}`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editForm.name,
            sku: editForm.sku,
            price: parseFloat(editForm.price),
            stock: parseInt(editForm.stock) || 0,
            print_type: editForm.print_type,
            material: editForm.material,
            description: editForm.description,
            ai_prompt_rules: editForm.ai_prompt_rules,
            substrateMaterialName: editForm.substrateMaterialName,
            substrateUsagePerUnit: editForm.substrateUsagePerUnit,
            inkColorChannel: editForm.inkColorChannel,
            inkUsagePerUnit: editForm.inkUsagePerUnit,
            active: editForm.status === "active",
            images: editForm.images,
            color_options: editForm.color_options,
            quantity_mode: editForm.quantity_mode,
            quantity_count:
              editForm.quantity_count === ""
                ? null
                : parseInt(editForm.quantity_count),
            size_options: editForm.size_options,
            material_options: editForm.material_options,
            finishing_options: editForm.finishing_options,
            processing_options: editForm.processing_options,
            delivery_options: editForm.delivery_options,
            quantity_options: editForm.quantity_options,
            shipping_options: editForm.shipping_options,
            category: editForm.category,
            print_zones: editForm.print_zones,
            side_options: editForm.side_options,
          }),
        },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to update product");
      }

      setShowEditModal(false);
      showToast("Product updated successfully!", "success");
      // ✅ Trigger local refresh instead of reloading
      setLocalRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Error updating product", "error");
    }
  };

  // Tag-editor helpers
  const addTag = (field) => {
    const val = tagInputs[field].trim();
    if (!val || editForm[field].includes(val)) return;
    setEditForm((prev) => ({ ...prev, [field]: [...prev[field], val] }));
    setTagInputs((prev) => ({ ...prev, [field]: "" }));
  };

  const removeTag = (field, index) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  // Apply category template to editForm
  const applyEditTemplate = (categoryName) => {
    if (!categoryName) return;
    const defaults = CATEGORY_DEFAULTS[categoryName];
    if (!defaults) return;

    const zoneKey = getCustomizerCategoryKey(categoryName);
    const customizerZones = zoneKey ? CUSTOMIZER_ZONES[zoneKey] : null;
    const newZones = customizerZones ? customizerZones.map((z) => z.id) : [];

    const categoryMap = {
      "T-shirts": "tshirt",
      Jersey: "jersey",
      Cap: "cap",
      Mug: "mug",
      Notebook: "notebook",
      "Business Card": "calling_card",
      Banners: "banners",
      "Stickers & Labels": "stickers",
      "Hang Tags": "hang_tags",
      Brochures: "brochures",
    };
    const dbCategory = categoryMap[categoryName] || "other";
    const newSides = customizerZones
      ? generateSideOptions(dbCategory, newZones)
      : [...(defaults.side_options || [])];

    setEditForm((prev) => ({
      ...prev,
      print_type: defaults.print_type || prev.print_type,
      material: defaults.material || prev.material,
      ai_prompt_rules: defaults.ai_prompt_rules || prev.ai_prompt_rules,
      color_options: [...(defaults.color_options || [])],
      size_options: [...(defaults.size_options || [])],
      material_options: [...(defaults.material_options || [])],
      finishing_options: [...(defaults.finishing_options || [])],
      processing_options: [...(defaults.processing_options || [])],
      delivery_options: [...(defaults.delivery_options || [])],
      quantity_options: [...(defaults.quantity_options || [])],
      shipping_options: [...(defaults.shipping_options || [])],
      print_zones: newZones,
      side_options: newSides,
    }));
  };

  const TagEditor = ({ field, label, editable = true }) => {
    const theme = OPTION_THEMES[field] || {
      color: "#64748b",
      bg: "rgba(100, 116, 139, 0.1)",
      border: "rgba(100, 116, 139, 0.25)",
    };

    return (
      <div className="dashform-group" style={{ marginBottom: "16px" }}>
        <label>{label}</label>
        <div className="scrollable-tags-row">
          {editForm[field].map((tag, i) => (
            <span
              key={i}
              style={{
                background: theme.bg,
                border: `1px solid ${theme.border}`,
                borderRadius: "4px",
                padding: "2px 8px",
                fontSize: "13px",
                color: theme.color,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {tag}
              {editable && (
                <button
                  type="button"
                  onClick={() => removeTag(field, i)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: theme.color,
                    fontSize: "14px",
                    lineHeight: 1,
                    padding: "0 2px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <FaTrashAlt style={{ fontSize: "10px" }} />
                </button>
              )}
            </span>
          ))}
        </div>
        {editable && (
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              type="text"
              value={tagInputs[field]}
              onChange={(e) =>
                setTagInputs((prev) => ({
                  ...prev,
                  [field]: e.target.value,
                }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(field);
                }
              }}
              placeholder={`Add ${label.toLowerCase()} option...`}
              style={{
                flex: 1,
                padding: "6px 10px",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                fontSize: "13px",
              }}
            />
            <button
              type="button"
              className="dashaction-btn blue"
              onClick={() => addTag(field)}
              style={{ padding: "0 16px" }}
            >
              Add
            </button>
          </div>
        )}
      </div>
    );
  };

  const openAddStock = async (product) => {
    try {
      const res = await adminFetch(buildApiUrl(`/api/products/${product.dbId}`));
      if (!res.ok) throw new Error("Failed to fetch product");
      const full = await res.json();
      setAddStockProduct(full);
      setAddStockAmount(0);
      setAddStockOptionsText((full.quantity_options || []).join("\n"));
      setBatchPcs("");
      setBatchUnitPrice("");
      setShowAddStockModal(true);
    } catch (e) {
      console.error(e);
      showToast("Failed to open Add Stock modal", "error");
    }
  };

  // Calculate batch discount pricing for options
  const calculateBatchOption = () => {
    const pcs = parseInt(batchPcs, 10);
    const unitPrice = parseFloat(batchUnitPrice);
    if (!pcs || pcs <= 0 || isNaN(unitPrice) || unitPrice <= 0) return null;

    const rawTotal = pcs * unitPrice;
    const discounted = rawTotal * 0.95;
    const formattedPrice = discounted.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return {
      pcs,
      rawTotal,
      discounted,
      optionString: `${pcs} pcs|₱${formattedPrice}`,
    };
  };

  const handleAddBatchOption = () => {
    const result = calculateBatchOption();
    if (!result) {
      showToast("Enter valid pcs count and unit price", "error");
      return;
    }

    setAddStockOptionsText((prev) => {
      const trimmed = (prev || "").trim();
      return trimmed
        ? `${trimmed}\n${result.optionString}`
        : result.optionString;
    });

    setBatchPcs("");
    setBatchUnitPrice("");
    showToast(`Added option: ${result.optionString}`, "success");
  };

  const submitAddStock = async () => {
    if (!addStockProduct) return;
    const add = parseInt(addStockAmount) || 0;
    if (add <= 0) {
      showToast("Enter an amount greater than 0", "error");
      return;
    }

    const opts = addStockOptionsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const res = await adminFetch(
        buildApiUrl(`/api/products/${addStockProduct.id}/add-stock`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ add, quantity_options: opts }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Add stock failed");
      setShowAddStockModal(false);
      setAddStockProduct(null);
      setLocalRefreshKey((k) => k + 1);
      showToast("Stock updated successfully", "success");
    } catch (e) {
      console.error(e);
      showToast(e.message || "Failed to add stock", "error");
    }
  };

  // Upload image for Edit Product modal
  const handleEditImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setEditImageError("Image must be 3MB or smaller.");
      e.target.value = "";
      return;
    }
    setEditImageError("");
    setEditImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await adminFetch(buildApiUrl("/api/products/upload"), {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setEditForm((prev) => ({ ...prev, images: [...prev.images, data.url] }));
    } catch (err) {
      setEditImageError(err.message || "Upload failed");
    } finally {
      setEditImageUploading(false);
      e.target.value = "";
    }
  };

  // ✅ NEW: Delete product
  const handleDeleteProduct = (product) => {
    setConfirmModalConfig({
      isOpen: true,
      title: "Delete Product",
      message: `Delete product "${product.name}"? This cannot be undone.`,
      onCancel: () => setConfirmModalConfig(null),
      onConfirm: async () => {
        setConfirmModalConfig(null);
        try {
          const res = await adminFetch(buildApiUrl(`/api/products/${product.dbId}`), {
            method: "DELETE",
          });

          if (!res.ok) throw new Error("Failed to delete product");

          // ✅ Immediately remove from UI
          setProducts((prev) => prev.filter((p) => p.dbId !== product.dbId));

          showToast("Product deleted successfully!", "success");
        } catch (err) {
          console.error("Error deleting product:", err);
          showToast(err.message || "Error deleting product", "error");
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="dashpage dashpage-products">
        <div className="dashpage-loading">Loading products...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashpage dashpage-products">
        <div className="dashpage-error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="dashpage dashpage-products">
      {toast.message && (
        <div className={`app-toast-container ${toast.type}`}>
          <FaInfoCircle />
          <span>{toast.message}</span>
        </div>
      )}

      {confirmModalConfig && (
        <ConfirmModal
          isOpen={confirmModalConfig.isOpen}
          title={confirmModalConfig.title}
          message={confirmModalConfig.message}
          onConfirm={confirmModalConfig.onConfirm}
          onCancel={confirmModalConfig.onCancel}
        />
      )}

      {/* ✅ Top row - Header with Title and Add Button */}
      <div className="dashpage-top">
        <div>
          <p className="dashpage-subtitle">
            Manage your product catalog and inventory
          </p>
        </div>

        {onAddProduct && (
          <button
            className="dashpage-add-btn"
            type="button"
            onClick={onAddProduct}
          >
            <span className="dashpage-plus">
              <FaPlus size={14} />
            </span>
            New Product
          </button>
        )}
      </div>

      {/* ✅ Stat cards */}
      <div className="dashpage-stats">
        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">Total Products</div>
          <div className="dashpage-stat-value">{productsStats.total}</div>
        </div>

        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">Active</div>
          <div className="dashpage-stat-value green">
            {productsStats.active}
          </div>
        </div>

        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">Out of Stock</div>
          <div className="dashpage-stat-value red">{productsStats.out}</div>
        </div>

        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">Services</div>
          <div className="dashpage-stat-value purple">
            {productsStats.services}
          </div>
        </div>
      </div>

      {/* ✅ Toolbar - Search and Filters */}
      <div className="dashpage-toolbar">
        <div className="dashpage-search">
          <span className="dashpage-search-icon">
            <FaSearch size={14} />
          </span>

          <input
            type="text"
            placeholder="Search SKU, product name, price..."
            value={productsQuery}
            onChange={(e) => setProductsQuery(e.target.value)}
          />
        </div>

        <div className="dashpage-filters">
          <select
            value={productsCategory}
            onChange={(e) => setProductsCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="print">Print</option>
            <option value="service">Service</option>
          </select>

          <button
            className="dashpage-filterbtn"
            type="button"
            onClick={handleClearFilters}
            title="Clear filters"
          >
            <FaFilter />
          </button>

          <button
            type="button"
            className="dashaction-btn blue"
            style={{ marginLeft: 8 }}
            onClick={bulkSetDropdown}
            title="Set selected products to dropdown quantity mode"
          >
            Set selected → Dropdown
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="dashpage-table-card">
        <table className="dashpage-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    filteredProducts.length > 0 &&
                    selectedIds.size === filteredProducts.length
                  }
                  onChange={(e) => selectAllVisible(e.target.checked)}
                />
              </th>
              <th>Image</th>
              <th>SKU</th>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredProducts.map((p) => (
              <tr key={p.dbId}>
                <td style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.dbId)}
                    onChange={() => toggleSelect(p.dbId)}
                  />
                </td>
                <td data-label="Image">
                  {p.images?.[0] ? (
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      style={{
                        width: 44,
                        height: 44,
                        objectFit: "cover",
                        borderRadius: 6,
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 6,
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px dashed rgba(255, 255, 255, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 10,
                        color: "#cbd5e1",
                      }}
                    >
                      No img
                    </div>
                  )}
                </td>
                <td data-label="SKU" className="strong">
                  {p.sku}
                </td>
                <td data-label="Product">{p.name}</td>
                <td data-label="Category">
                  <span className={`dashpage-pill cat-${p.category}`}>
                    {p.category}
                  </span>
                </td>
                <td data-label="Price">₱ {p.price.toLocaleString()}</td>
                <td data-label="Stock">
                  {p.stock !== undefined && p.stock !== null ? p.stock : "—"}
                </td>
                <td data-label="Status">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(p)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    title={`Click to toggle status (currently ${p.status})`}
                  >
                    <span
                      className={`dashpage-pill status-${p.status === "active" ? "completed" : "cancelled"
                        }`}
                    >
                      {p.status === "active" ? (
                        <FaCheckCircle style={{ marginRight: 6 }} />
                      ) : (
                        <FaExclamationTriangle style={{ marginRight: 6 }} />
                      )}
                      {p.status === "active" ? "active" : "inactive"}
                    </span>
                  </button>
                </td>
                <td data-label="Actions">
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      justifyContent: "center",
                    }}
                  >
                    <button
                      type="button"
                      className="dashaction-btn blue"
                      onClick={() => handleEditProduct(p)}
                      title="Edit product"
                    >
                      <FaEdit size={12} />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="dashaction-btn red"
                      onClick={() => handleDeleteProduct(p)}
                      title="Delete product"
                    >
                      <FaTrash size={12} />
                      Delete
                    </button>
                    <button
                      type="button"
                      className="dashaction-btn orange"
                      onClick={() => openAddStock(p)}
                      title="Add stock / edit quantity options"
                    >
                      Add Stock
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan="9" className="dashpage-empty">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ✅ NEW: Edit Product modal */}
      {showEditModal &&
        selectedProduct &&
        createPortal(
          <div
            className="ad-logout-overlay"
            onMouseDown={() => setShowEditModal(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="ad-logout-modal wizard-modal-container"
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                maxHeight: "85vh",
                maxWidth: "540px",
                width: "100%",
                padding: "24px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div className="wizard-modal-header">
                <h3 className="ad-logout-title">Edit Product</h3>
                <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                  Update product details and specifications
                </p>
              </div>

              <div className="modal-tabs-header" style={{ marginTop: "16px" }}>
                <button
                  type="button"
                  className={`modal-tab-btn ${editProductTab === "details" ? "active" : ""
                    }`}
                  onClick={() => setEditProductTab("details")}
                >
                  Details
                  <span className="modal-tab-badge">
                    {isEditDetailsValid ? (
                      <FaCheckCircle style={{ color: "#10b981" }} />
                    ) : (
                      <FaExclamationTriangle style={{ color: "#f59e0b" }} />
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  className={`modal-tab-btn ${editProductTab === "images" ? "active" : ""
                    }`}
                  style={{
                    opacity: isEditDetailsValid ? 1 : 0.6,
                    cursor: isEditDetailsValid ? "pointer" : "not-allowed",
                  }}
                  onClick={() => {
                    if (isEditDetailsValid) {
                      setEditProductTab("images");
                    }
                  }}
                >
                  Images
                  <span className="modal-tab-badge">
                    {isEditImagesValid ? (
                      <FaCheckCircle style={{ color: "#10b981" }} />
                    ) : (
                      <FaExclamationTriangle style={{ color: "#f59e0b" }} />
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  className={`modal-tab-btn ${editProductTab === "specifications" ? "active" : ""
                    }`}
                  style={{
                    opacity: isEditDetailsValid && isEditImagesValid ? 1 : 0.6,
                    cursor:
                      isEditDetailsValid && isEditImagesValid
                        ? "pointer"
                        : "not-allowed",
                  }}
                  onClick={() => {
                    if (isEditDetailsValid && isEditImagesValid) {
                      setEditProductTab("specifications");
                    }
                  }}
                >
                  Specs
                  <span className="modal-tab-badge">
                    <FaCheckCircle style={{ color: "#10b981" }} />
                  </span>
                </button>
              </div>

              <form
                onSubmit={submitEditProduct}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flexGrow: 1,
                  overflow: "hidden",
                }}
              >
                <div
                  className="wizard-modal-body"
                  style={{
                    flexGrow: 1,
                    overflowY: "auto",
                    paddingRight: "4px",
                  }}
                >
                  {editProductTab === "details" && (
                    <>
                      <div className="dashform-group">
                        <label>
                          Category Template{" "}
                          <span style={{ color: "#9ca3af", fontWeight: "400" }}>
                            (auto-fills options)
                          </span>
                        </label>
                        <select
                          defaultValue=""
                          onChange={(e) => applyEditTemplate(e.target.value)}
                        >
                          <option value="">— Select a template —</option>
                          {CATEGORY_NAMES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "16px",
                          marginBottom: "16px",
                        }}
                      >
                        <div
                          className="dashform-group"
                          style={{ marginBottom: 0 }}
                        >
                          <label>Product Name *</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) =>
                              setEditForm({ ...editForm, name: e.target.value })
                            }
                            placeholder="e.g., Business Cards"
                          />
                        </div>

                        <div
                          className="dashform-group"
                          style={{ marginBottom: 0 }}
                        >
                          <label>SKU *</label>
                          <input
                            type="text"
                            value={editForm.sku}
                            onChange={(e) =>
                              setEditForm({ ...editForm, sku: e.target.value })
                            }
                            placeholder="e.g., BC-001"
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "16px",
                          marginBottom: "16px",
                        }}
                      >
                        <div
                          className="dashform-group"
                          style={{ marginBottom: 0 }}
                        >
                          <label>Price (₱) *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.price}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                price: e.target.value,
                              })
                            }
                            placeholder="0.00"
                          />
                        </div>

                        <div
                          className="dashform-group"
                          style={{ marginBottom: 0 }}
                        >
                          <label>Stock</label>
                          <input
                            type="number"
                            value={editForm.stock}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                stock: e.target.value,
                              })
                            }
                            disabled={true}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "16px",
                          marginBottom: "16px",
                        }}
                      >
                        <div
                          className="dashform-group"
                          style={{ marginBottom: 0 }}
                        >
                          <label>Print Type</label>
                          <select
                            value={editForm.print_type}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                print_type: e.target.value,
                              })
                            }
                          >
                            <option value="offset">Offset Print</option>
                            <option value="digital">Digital Print</option>
                            <option value="service">Service</option>
                          </select>
                        </div>

                        <div
                          className="dashform-group"
                          style={{ marginBottom: 0 }}
                        >
                          <label>Product Category</label>
                          <select
                            value={editForm.category}
                            onChange={(e) => {
                              const newCat = e.target.value;
                              const zoneKey = getCustomizerCategoryKey(newCat);
                              const customizerZones = zoneKey
                                ? CUSTOMIZER_ZONES[zoneKey]
                                : null;
                              const newZones = customizerZones
                                ? customizerZones.map((z) => z.id)
                                : [];
                              const newSides = customizerZones
                                ? generateSideOptions(newCat, newZones)
                                : [];
                              setEditForm({
                                ...editForm,
                                category: newCat,
                                print_zones: newZones,
                                side_options: newSides,
                              });
                            }}
                          >
                            <option value="tshirt">T-shirts</option>
                            <option value="jersery">Jersey</option>
                            <option value="cap">Cap</option>
                            <option value="mugs">Mugs</option>
                            <option value="notebook">Notebook</option>
                            <option value="calling_card">Business Card</option>
                            <option value="banners">Banners</option>
                            <option value="stickers">
                              Stickers &amp; Labels
                            </option>
                            <option value="hang_tags">Hang Tags</option>
                            <option value="brochures">Brochures</option>
                            <option value="mug">Mug</option>
                          </select>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "16px",
                          marginBottom: "16px",
                        }}
                      >
                        <div
                          className="dashform-group"
                          style={{ marginBottom: 0 }}
                        >
                          <label>Material</label>
                          <input
                            type="text"
                            value={editForm.material}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                material: e.target.value,
                              })
                            }
                            placeholder="e.g., Matte Paper"
                          />
                        </div>
                        <div
                          className="dashform-group"
                          style={{ marginBottom: 0 }}
                        >
                          <label>Status</label>
                          <select
                            value={editForm.status}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                status: e.target.value,
                              })
                            }
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </div>
                      </div>

                      <div className="dashform-group">
                        <label>Description</label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              description: e.target.value,
                            })
                          }
                                                    placeholder="Product description..."
                          rows="3"
                        />
                      </div>

                                            {/* Inventory Linkage */}
                      <div className="dashform-group">
                        <label>
                          Substrate Material{" "}
                          <span style={{ color: "#cbd5e1", fontWeight: "400", fontSize: "12px" }}>
                            (which tracked material this product consumes)
                          </span>
                        </label>
                        <select
                          value={editForm.substrateMaterialName || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              substrateMaterialName: e.target.value,
                            })
                          }
                        >
                          <option value="">— None —</option>
                          {inventoryOptions.substrates.map((s) => (
                            <option key={s.name} value={s.name}>
                              {s.name} ({s.stock} {s.unit} in stock)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="dashform-group">
                        <label>
                          Substrate Usage Per Unit{" "}
                          <span style={{ color: "#cbd5e1", fontWeight: "400", fontSize: "12px" }}>
                            (meters consumed per piece produced)
                          </span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.substrateUsagePerUnit || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              substrateUsagePerUnit: e.target.value,
                            })
                          }
                          placeholder="e.g. 0.02"
                        />
                      </div>

                      <div className="dashform-group">
                        <label>
                          Ink Color Channel{" "}
                          <span style={{ color: "#cbd5e1", fontWeight: "400", fontSize: "12px" }}>
                            (which tracked ink this product consumes)
                          </span>
                        </label>
                        <select
                          value={editForm.inkColorChannel || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              inkColorChannel: e.target.value,
                            })
                          }
                        >
                          <option value="">— None —</option>
                          {inventoryOptions.inks.map((i) => (
                            <option key={i.name} value={i.name}>
                              {i.name} ({i.stock} {i.unit} in stock)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="dashform-group">
                        <label>
                          Ink Usage Per Unit{" "}
                          <span style={{ color: "#cbd5e1", fontWeight: "400", fontSize: "12px" }}>
                            (ml consumed per piece produced)
                          </span>
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.inkUsagePerUnit || ""}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              inkUsagePerUnit: e.target.value,
                            })
                          }
                          placeholder="e.g. 0.4"
                        />
                      </div>

                      {/* AI Prompt Rules */}
                      {/* <div className="dashform-group">
                <label>
                  AI Prompt Rules{" "}
                  <span style={{ color: "#cbd5e1", fontWeight: "400", fontSize: "12px" }}>
                    (instructions the AI must follow strictly)
                  </span>
                </label>
                <textarea
                  value={editForm.ai_prompt_rules}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      ai_prompt_rules: e.target.value,
                    })
                  }
                  placeholder="e.g., Always use 300dpi. Bleed must be 0.125in. No clipart..."
                  rows="4"
                />
              </div> */}
                    </>
                  )}

                  {editProductTab === "images" && (
                    <>
                      <div className="dashform-group">
                        <label>Product Images (max 3MB each)</label>
                        <label className="custom-upload-zone">
                          <FaCloudUploadAlt
                            style={{ fontSize: "28px", color: "#64748b" }}
                          />
                          <span className="custom-upload-title">
                            Click to upload product image
                          </span>
                          <span className="custom-upload-sub">
                            Supports JPEG, PNG, WEBP, GIF
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={handleEditImageUpload}
                            disabled={editImageUploading}
                            style={{ display: "none" }}
                          />
                        </label>
                        {editImageUploading && (
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#64748b",
                              marginTop: "4px",
                            }}
                          >
                            Uploading...
                          </p>
                        )}
                        {editImageError && (
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#ef4444",
                              marginTop: "4px",
                            }}
                          >
                            {editImageError}
                          </p>
                        )}
                      </div>
                      {editForm.images.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "8px",
                            marginBottom: "16px",
                          }}
                        >
                          {editForm.images.map((url, i) => (
                            <div key={i} style={{ position: "relative" }}>
                              <img
                                src={url}
                                alt={`img-${i}`}
                                style={{
                                  width: "60px",
                                  height: "60px",
                                  objectFit: "cover",
                                  borderRadius: "4px",
                                  border: "1px solid rgba(0,0,0,0.1)",
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setEditForm((prev) => ({
                                    ...prev,
                                    images: prev.images.filter(
                                      (_, idx) => idx !== i,
                                    ),
                                  }))
                                }
                                style={{
                                  position: "absolute",
                                  top: "-6px",
                                  right: "-6px",
                                  background: "#ef4444",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: "50%",
                                  width: "16px",
                                  height: "16px",
                                  fontSize: "10px",
                                  cursor: "pointer",
                                  lineHeight: 1,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                &times;
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {editProductTab === "specifications" && (
                    <>
                      <div className="dashform-group">
                        <label>Quantity Input Mode</label>
                        <select
                          value={editForm.quantity_mode}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              quantity_mode: e.target.value,
                            })
                          }
                        >
                          <option value="dropdown">
                            Radio Options (predefined options)
                          </option>
                          <option value="text">
                            Text input (custom quantity)
                          </option>
                        </select>
                        {editForm.quantity_mode === "text" && (
                          <div style={{ marginTop: "12px" }}>
                            <label
                              style={{
                                fontSize: "12px",
                                color: "#64748b",
                                marginBottom: "4px",
                              }}
                            >
                              Quantity threshold (auto-quote when exceeded)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={editForm.quantity_count}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  quantity_count: e.target.value,
                                })
                              }
                              placeholder="e.g., 50"
                            />
                            <p
                              style={{
                                fontSize: 11,
                                color: "#64748b",
                                marginTop: 6,
                                margin: 0,
                              }}
                            >
                              If customer enters a quantity greater than this
                              value, the product page will auto-select the
                              Contact/Quote option.
                            </p>
                          </div>
                        )}
                      </div>

                      {editForm.quantity_mode === "dropdown" ? (
                        <div style={{ marginBottom: "16px" }}>
                          <GridOptionEditor
                            field="quantity_options"
                            label="Quantity Options"
                          />
                          <button
                            type="button"
                            className="dashaction-btn green"
                            onClick={() =>
                              openAddStock(
                                selectedProduct || {
                                  dbId: selectedProduct?.dbId,
                                },
                              )
                            }
                            style={{ marginBottom: "16px" }}
                          >
                            Add Stock / Edit Quantity Options
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#64748b",
                            marginBottom: 16,
                          }}
                        >
                          Quantity options are hidden when Quantity Input Mode
                          is set to text.
                        </div>
                      )}

                      <TagEditor field="color_options" label="Color Options" />
                      <TagEditor field="size_options" label="Size Options" />
                      <TagEditor
                        field="material_options"
                        label="Material Options"
                      />

                      {/* Printable Areas / Side Options Selector */}
                      {(() => {
                        const zoneKey = getCustomizerCategoryKey(
                          editForm.category,
                        );
                        const customizerZones = zoneKey
                          ? CUSTOMIZER_ZONES[zoneKey]
                          : null;
                        if (customizerZones) {
                          const hasCustomPrint =
                            editForm.print_zones?.length > 0;
                          return (
                            <div
                              className="dashform-group"
                              style={{ marginBottom: "16px" }}
                            >
                              <label
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  cursor: "pointer",
                                  marginBottom: "12px",
                                  fontWeight: "bold",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={hasCustomPrint}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    if (checked) {
                                      const allZoneIds = customizerZones.map(
                                        (z) => z.id,
                                      );
                                      const updatedSides = generateSideOptions(
                                        editForm.category,
                                        allZoneIds,
                                      );
                                      setEditForm({
                                        ...editForm,
                                        print_zones: allZoneIds,
                                        side_options: updatedSides,
                                      });
                                    } else {
                                      setEditForm({
                                        ...editForm,
                                        print_zones: [],
                                        side_options: [],
                                      });
                                    }
                                  }}
                                />
                                Enable Custom Printing (Allow Customizer)
                              </label>

                              {hasCustomPrint && (
                                <>
                                  <label>
                                    Printable Areas (Customizer Zones) *
                                  </label>
                                  <p
                                    style={{
                                      fontSize: "11px",
                                      color: "#64748b",
                                      marginTop: "2px",
                                      marginBottom: "8px",
                                    }}
                                  >
                                    Select which areas can be printed.
                                  </p>
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: "12px",
                                      background: "#f8fafc",
                                      padding: "10px",
                                      borderRadius: "8px",
                                      border: "1px solid #cbd5e1",
                                    }}
                                  >
                                    {customizerZones.map((z) => {
                                      const isChecked =
                                        editForm.print_zones.includes(z.id);
                                      return (
                                        <label
                                          key={z.id}
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            color: "#334155",
                                            margin: 0,
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              const updatedZones = isChecked
                                                ? editForm.print_zones.filter(
                                                  (id) => id !== z.id,
                                                )
                                                : [
                                                  ...editForm.print_zones,
                                                  z.id,
                                                ];
                                              const updatedSides =
                                                generateSideOptions(
                                                  editForm.category,
                                                  updatedZones,
                                                );
                                              setEditForm({
                                                ...editForm,
                                                print_zones: updatedZones,
                                                side_options: updatedSides,
                                              });
                                            }}
                                          />
                                          {z.label}
                                        </label>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          );
                        } else {
                          return (
                            <TagEditor
                              field="side_options"
                              label="Printing Side Options"
                            />
                          );
                        }
                      })()}

                      <TagEditor
                        field="finishing_options"
                        label="Finishing Options"
                      />
                      <TagEditor
                        field="processing_options"
                        label="Processing Options"
                      />
                      <TagEditor
                        field="delivery_options"
                        label="Delivery Options"
                      />
                      <GridOptionEditor
                        field="shipping_options"
                        label="Shipping Options"
                      />
                    </>
                  )}
                </div>

                <div
                  className="wizard-modal-footer"
                  style={{
                    borderTop: "1px solid rgba(15, 23, 42, 0.06)",
                    paddingTop: "16px",
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                    marginTop: "8px",
                  }}
                >
                  <button
                    type="button"
                    className="ad-logout-btn ghost"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  {editProductTab !== "details" && (
                    <button
                      type="button"
                      className="ad-logout-btn ghost"
                      onClick={() => {
                        if (editProductTab === "images") {
                          setEditProductTab("details");
                        } else if (editProductTab === "specifications") {
                          setEditProductTab("images");
                        }
                      }}
                    >
                      Back
                    </button>
                  )}
                  {editProductTab !== "specifications" ? (
                    <button
                      type="button"
                      className="ad-logout-btn"
                      style={{
                        background: "#2563eb",
                        color: "#fff",
                        border: "none",
                        opacity:
                          (editProductTab === "details" &&
                            !isEditDetailsValid) ||
                            (editProductTab === "images" && !isEditImagesValid)
                            ? 0.5
                            : 1,
                        cursor:
                          (editProductTab === "details" &&
                            !isEditDetailsValid) ||
                            (editProductTab === "images" && !isEditImagesValid)
                            ? "not-allowed"
                            : "pointer",
                      }}
                      disabled={
                        (editProductTab === "details" && !isEditDetailsValid) ||
                        (editProductTab === "images" && !isEditImagesValid)
                      }
                      onClick={() => {
                        if (editProductTab === "details") {
                          if (isEditDetailsValid) {
                            setEditProductTab("images");
                          }
                        } else if (editProductTab === "images") {
                          if (isEditImagesValid) {
                            setEditProductTab("specifications");
                          }
                        }
                      }}
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="ad-logout-btn"
                      style={{
                        background: "#10b981",
                        color: "#fff",
                        border: "none",
                      }}
                    >
                      Save Changes
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
      {showAddStockModal &&
        addStockProduct &&
        createPortal(
          <div
            className="ad-logout-overlay"
            onMouseDown={() => setShowAddStockModal(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="ad-logout-modal"
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                maxHeight: "80vh",
                overflowY: "auto",
                maxWidth: "480px",
              }}
            >
              <h3 className="ad-logout-title">
                Add Stock — {addStockProduct.name}
              </h3>

              <div className="dashform-group">
                <label>Current Stock</label>
                <div style={{ fontSize: 16, color: "#fff", fontWeight: 700 }}>
                  {addStockProduct.stock}
                </div>
              </div>

              <div className="dashform-group">
                <label>Stock to Add</label>
                <input
                  type="number"
                  min={0}
                  value={addStockAmount}
                  onChange={(e) => setAddStockAmount(e.target.value)}
                />
              </div>

              {/* Batch Order Price Calculator */}
              <div
                style={{
                  background: "#0f172a",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  padding: "14px",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#38bdf8",
                    marginBottom: "10px",
                  }}
                >
                  Batch Price Calculator (Auto 5% Discount)
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "11px", color: "#94a3b8" }}>
                      Batch Pcs
                    </label>
                    <input
                      type="number"
                      min={1}
                      placeholder="e.g. 100"
                      value={batchPcs}
                      onChange={(e) => setBatchPcs(e.target.value)}
                      style={{ marginTop: "4px", padding: "6px 10px" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: "11px", color: "#94a3b8" }}>
                      Unit Price (₱)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="e.g. 12.50"
                      value={batchUnitPrice}
                      onChange={(e) => setBatchUnitPrice(e.target.value)}
                      style={{ marginTop: "4px", padding: "6px 10px" }}
                    />
                  </div>
                </div>

                {calculateBatchOption() ? (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#cbd5e1",
                      marginBottom: "10px",
                      background: "rgba(56, 189, 248, 0.1)",
                      padding: "8px 10px",
                      borderRadius: "6px",
                    }}
                  >
                    <div>
                      Total: ₱
                      {calculateBatchOption().rawTotal.toLocaleString("en-PH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                    <div style={{ fontWeight: "700", color: "#4ade80" }}>
                      5% Discounted Total: ₱
                      {calculateBatchOption().discounted.toLocaleString(
                        "en-PH",
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  className="dashaction-btn blue"
                  onClick={handleAddBatchOption}
                  style={{ width: "100%", padding: "8px" }}
                >
                  + Add to Quantity Options
                </button>
              </div>

              <div className="dashform-group" style={{ marginBottom: "20px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  Quantity Options
                </label>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {addStockOptionsList.map((item, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          flex: 2,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <input
                          type="number"
                          value={item.label}
                          placeholder="Quantity"
                          onChange={(e) =>
                            updateAddStockOption(i, "label", e.target.value)
                          }
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            fontSize: "13px",
                          }}
                        />
                        <span style={{ fontSize: "13px", color: "#64748b" }}>
                          pcs
                        </span>
                      </div>
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <input
                          type="number"
                          step="0.01"
                          value={item.price}
                          placeholder="Price"
                          onChange={(e) =>
                            updateAddStockOption(i, "price", e.target.value)
                          }
                          style={{
                            flex: 1,
                            padding: "8px 12px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                            fontSize: "13px",
                          }}
                        />
                        <span style={{ fontSize: "13px", color: "#64748b" }}>
                          PHP
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAddStockOption(i)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#ef4444",
                          padding: "8px",
                        }}
                        title="Remove row"
                      >
                        <FaTrashAlt size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="dashaction-btn blue"
                    onClick={addAddStockOption}
                    style={{
                      alignSelf: "flex-start",
                      marginTop: "4px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <FaPlus size={10} />
                    Add Row
                  </button>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    marginTop: 8,
                    margin: 0,
                  }}
                >
                  Editing quantity options here will replace the product's
                  existing quantity options.
                </p>
              </div>

              <div className="ad-logout-actions" style={{ marginTop: "24px" }}>
                <button
                  type="button"
                  className="ad-logout-btn ghost"
                  onClick={() => setShowAddStockModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="ad-logout-btn"
                  onClick={submitAddStock}
                >
                  Add Stock
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default AdminProducts;
