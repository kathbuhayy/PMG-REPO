// Admin-dashboard.js (FULL UPDATED FILE — adds Logout confirmation modal ONLY, no other UI/layout changes)
import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import "./Admin-dashboard.css";
import AdminProfile from "./Admin-profile";
import AdminManageAccounts from "./Admin-manageacc";
import AdminOrders from "./AdminOrders";
import AdminInquiries from "./AdminInquiries";
import AdminProducts from "./AdminProducts";
import { buildApiUrl } from "../config/api";
import {
  CATEGORY_DEFAULTS,
  CATEGORY_NAMES,
  CUSTOMIZER_ZONES,
  OPTION_THEMES,
} from "../config/categoryDefaults";

import {
  FaMoneyBillWave,
  FaUserPlus,
  FaShoppingBag,
  FaPlus,
  FaCheckCircle,
  FaExclamationTriangle,
  FaCloudUploadAlt,
  FaTrashAlt,
  FaInfoCircle,
  FaTachometerAlt,
  FaEnvelope,
  FaBoxOpen,
  FaUsers,
  FaUser,
  FaSignOutAlt,
} from "react-icons/fa";

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
    if (zones.includes("left_sleeve")) options.push("Left Panel");
    if (zones.includes("right_sleeve")) options.push("Right Panel");
    if (
      zones.includes("front") &&
      zones.includes("back") &&
      zones.includes("left_sleeve") &&
      zones.includes("right_sleeve")
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

function AdminDashboard() {
  const navigate = useNavigate();
  const [addProductTab, setAddProductTab] = useState("details");
  const [toast, setToast] = useState({ message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 3000);
  };
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { tab } = useParams();
  const activeItem = useMemo(() => {
    if (!tab) return "dashboard";
    if (tab === "manageaccount") return "customers";
    return tab;
  }, [tab]);

  // ✅ Mobile sidebar drawer
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // ✅ NEW: Logout confirm modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ✅ NEW: Add Product modal
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [refreshProductsKey, setRefreshProductsKey] = useState(0);
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    price: "",
    stock: "",
    print_type: "offset",
    material: "",
    description: "",
    ai_prompt_rules: "",
    images: [],
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
  const [addTagInputs, setAddTagInputs] = useState({
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
  const [addImageUploading, setAddImageUploading] = useState(false);
  const [addImageError, setAddImageError] = useState("");

  // ✅ NEW: Dashboard stats from API
  const [dashStats, setDashStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalUsers: 0,
  });
  const [, setStatsLoading] = useState(true);
  // Low stock state
  const [lowStock, setLowStock] = useState({ products: [], pagination: {} });
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [lowStockLoading, setLowStockLoading] = useState(true);
  const [lowStockFilter, setLowStockFilter] = useState(null);

  // Out of stock state
  const [, setOutOfStock] = useState({
    products: [],
    pagination: {},
  });
  const [, setOutOfStockLoading] = useState(true);

  // ✅ close mobile sidebar if resized to desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 768) setIsMobileSidebarOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Fetch low-stock products for dashboard
  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        setLowStockLoading(true);
        const threshold = 10; // default threshold
        const limit = 5; // show top 5 on dashboard
        const res = await fetch(
          buildApiUrl(
            `/api/admin/low-stock?threshold=${threshold}&limit=${limit}`,
          ),
        );
        if (!res.ok) throw new Error("Failed to fetch low-stock");
        const data = await res.json();
        setLowStock({
          products: data.products || [],
          pagination: data.pagination || {},
        });
        setOutOfStockCount(data.outOfStockCount || 0);
      } catch (err) {
        console.error("Error fetching low-stock:", err);
      } finally {
        setLowStockLoading(false);
      }
    };

    fetchLowStock();
    const lsInterval = setInterval(fetchLowStock, 30000);
    return () => clearInterval(lsInterval);
  }, []);

  // Fetch out-of-stock products for dashboard
  useEffect(() => {
    const fetchOutOfStock = async () => {
      try {
        setOutOfStockLoading(true);
        const threshold = 0;
        const limit = 5;
        const res = await fetch(
          buildApiUrl(
            `/api/admin/low-stock?threshold=${threshold}&limit=${limit}`,
          ),
        );
        if (!res.ok) throw new Error("Failed to fetch out-of-stock");
        const data = await res.json();
        setOutOfStock({
          products: data.products || [],
          pagination: data.pagination || {},
        });
      } catch (err) {
        console.error("Error fetching out-of-stock:", err);
      } finally {
        setOutOfStockLoading(false);
      }
    };

    fetchOutOfStock();
    const oosInterval = setInterval(fetchOutOfStock, 30000);
    return () => clearInterval(oosInterval);
  }, []);

  // ✅ NEW: Fetch dashboard stats from API
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        const [ordersRes, usersRes] = await Promise.all([
          fetch(buildApiUrl("/api/admin/orders")),
          fetch(buildApiUrl("/api/admin/users")),
        ]);

        const ordersData = await ordersRes.json();
        const usersData = await usersRes.json();

        // Calculate stats
        const totalOrders = ordersData.length;
        const pendingOrders = ordersData.filter(
          (o) => o.status === "pending",
        ).length;
        const totalRevenue = ordersData
          .filter((o) => o.status === "completed")
          .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
        const totalUsers = Array.isArray(usersData)
          ? usersData.length
          : (usersData?.users?.length ?? 0);

        setDashStats({
          totalRevenue,
          totalOrders,
          pendingOrders,
          totalUsers,
        });
      } catch (err) {
        console.error("Error fetching dashboard stats:", err);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const storedUser = useMemo(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("user")) ||
        JSON.parse(localStorage.getItem("adminUser")) ||
        null
      );
    } catch {
      return null;
    }
  }, []);

  const [sidebarUser, setSidebarUser] = useState(storedUser);

  const role = sidebarUser?.role || "user";

  useEffect(() => {
    const userId = storedUser?.id;
    if (!userId) return;

    let cancelled = false;

    const syncSidebarProfile = async () => {
      try {
        const res = await fetch(buildApiUrl(`/api/user-profile/${userId}`));
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load profile");

        const fullName = data.name || "";
        const parts = fullName.trim().split(/\s+/).filter(Boolean);
        const firstName = parts[0] || storedUser?.firstName || "";
        const lastName = parts.slice(1).join(" ") || storedUser?.lastName || "";
        const updated = {
          ...(storedUser || {}),
          firstName,
          lastName,
          email: data.email || storedUser?.email || "",
          avatar_url: data.avatar_url || "",
        };

        if (cancelled) return;
        setSidebarUser(updated);
        localStorage.setItem("user", JSON.stringify(updated));
        if (localStorage.getItem("adminUser")) {
          localStorage.setItem("adminUser", JSON.stringify(updated));
        }
      } catch (err) {
        console.error("Error syncing sidebar profile:", err);
      }
    };

    syncSidebarProfile();
    window.addEventListener("profileUpdated", syncSidebarProfile);

    return () => {
      cancelled = true;
      window.removeEventListener("profileUpdated", syncSidebarProfile);
    };
  }, [storedUser]);

  // ✅ ROLE-BASED ACCESS CONTROL: Only admins can access admin pages
  useEffect(() => {
    if (!sidebarUser || (role !== "admin" && role !== "staff")) {
      // Redirect non-admin and non-staff users to home page
      navigate("/");
      return;
    }
  }, [sidebarUser, role, navigate]);

  const menuItems = useMemo(() => {
    const base = [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: <FaTachometerAlt />,
      },
      {
        id: "orders",
        label: "Orders",
        icon: <FaShoppingBag />,
      },
      {
        id: "inquiries",
        label: "Inquiries",
        icon: <FaEnvelope />,
      },
      {
        id: "products",
        label: "Products",
        icon: <FaBoxOpen />,
      },
      {
        id: "customers",
        label: "Manage Accounts",
        icon: <FaUsers />,
      },
      {
        id: "profile",
        label: "Profile",
        icon: <FaUser />,
      },
    ];

    // Staff: remove Manage Accounts
    if (role === "staff") {
      return base.filter((i) => i.id !== "customers");
    }

    return base;
  }, [role]);

  const handleMenuItemClick = (item) => {
    if (role === "staff" && item.id === "customers") return;
    const targetTab = item.id === "customers" ? "manageaccount" : item.id;
    navigate(`/admin/${targetTab}`);
    setIsMobileSidebarOpen(false);
  };

  // ✅ unchanged logout logic moved here (same behavior)
  const doLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    sessionStorage.clear();

    document.cookie.split(";").forEach(function (c) {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    setIsMobileSidebarOpen(false);
    setShowLogoutModal(false);
    setTimeout(() => navigate("/"), 100);
  };

  // ✅ NEW: open confirm modal instead of immediate logout
  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  // ✅ NEW: Open add product modal
  const handleAddProduct = () => {
    setProductForm({
      name: "",
      sku: "",
      price: "",
      stock: "",
      print_type: "offset",
      material: "",
      description: "",
      ai_prompt_rules: "",
      images: [],
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
    setAddTagInputs({
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
    setAddImageError("");
    setShowAddProductModal(true);
  };

  // Apply category template to productForm
  const applyAddTemplate = (categoryName) => {
    if (!categoryName) return;
    const defaults = CATEGORY_DEFAULTS[categoryName];
    if (!defaults) return;

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
      Poster: "posters"
    };
    const dbCategory = categoryMap[categoryName] || "other";

    const zoneKey = getCustomizerCategoryKey(categoryName);
    const customizerZones = zoneKey ? CUSTOMIZER_ZONES[zoneKey] : null;
    const newZones = customizerZones ? customizerZones.map((z) => z.id) : [];
    const newSides = customizerZones
      ? generateSideOptions(dbCategory, newZones)
      : [...(defaults.side_options || [])];

    setProductForm((prev) => ({
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
      category: dbCategory,
    }));
  };

  // Tag helpers for Add Product modal
  const addAddTag = (field) => {
    const val = addTagInputs[field].trim();
    if (!val || productForm[field].includes(val)) return;
    setProductForm((prev) => ({ ...prev, [field]: [...prev[field], val] }));
    setAddTagInputs((prev) => ({ ...prev, [field]: "" }));
  };

  const removeAddTag = (field, index) => {
    setProductForm((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  // Upload image for Add Product modal
  const handleAddImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      setAddImageError("Image must be 3MB or smaller.");
      e.target.value = "";
      return;
    }
    setAddImageError("");
    setAddImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(buildApiUrl("/api/products/upload"), {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");
      setProductForm((prev) => ({
        ...prev,
        images: [...prev.images, data.url],
      }));
    } catch (err) {
      setAddImageError(err.message || "Upload failed");
    } finally {
      setAddImageUploading(false);
      e.target.value = "";
    }
  };
  const submitAddProduct = async (e) => {
    e.preventDefault();

    if (!productForm.name.trim()) {
      showToast("Product name is required", "error");
      return;
    }
    if (!productForm.sku.trim()) {
      showToast("SKU is required", "error");
      return;
    }
    if (!productForm.price || productForm.price <= 0) {
      showToast("Price must be greater than 0", "error");
      return;
    }

    try {
      const res = await fetch(buildApiUrl("/api/products"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productForm.name,
          sku: productForm.sku,
          price: parseFloat(productForm.price),
          stock: parseInt(productForm.stock) || 0,
          print_type: productForm.print_type,
          material: productForm.material,
          description: productForm.description,
          ai_prompt_rules: productForm.ai_prompt_rules,
          images: productForm.images,
          color_options: productForm.color_options,
          size_options: productForm.size_options,
          material_options: productForm.material_options,
          side_options: productForm.side_options,
          finishing_options: productForm.finishing_options,
          processing_options: productForm.processing_options,
          delivery_options: productForm.delivery_options,
          quantity_options: productForm.quantity_options,
          shipping_options: productForm.shipping_options,
          print_zones: productForm.print_zones,
          category: productForm.category,
          active: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to add product");

      setShowAddProductModal(false);
      showToast("Product added successfully!", "success");
      navigate("/admin/products");
      setRefreshProductsKey((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Error adding product", "error");
    }
  };
  useEffect(() => {
    if (role === "staff" && activeItem === "customers") {
      navigate("/admin/dashboard");
    }
  }, [role, activeItem, navigate]);

  const pageTitle = useMemo(() => {
    if (activeItem === "dashboard") return "Dashboard";
    if (activeItem === "profile") return "Profile";
    if (activeItem === "customers") return "Manage Accounts";
    if (activeItem === "orders") return "Orders";
    if (activeItem === "inquiries") return "Inquiries";
    if (activeItem === "products") return "Products";
    return "Dashboard";
  }, [activeItem]);

  const isDetailsValid = useMemo(() => {
    return (
      productForm.name.trim() !== "" &&
      productForm.sku.trim() !== "" &&
      parseFloat(productForm.price) > 0
    );
  }, [productForm.name, productForm.sku, productForm.price]);

  const isImagesValid = useMemo(() => {
    return productForm.images.length > 0;
  }, [productForm.images]);

  return (
    <div className="admin-dashboard">
      {toast.message && (
        <div className={`app-toast-container ${toast.type}`}>
          <FaInfoCircle />
          <span>{toast.message}</span>
        </div>
      )}
      {/* ✅ Mobile overlay when sidebar open */}
      {isMobileSidebarOpen && (
        <button
          className="mobile-overlay"
          type="button"
          aria-label="Close menu"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* ✅ NEW: Logout confirmation modal */}
      {showLogoutModal &&
        createPortal(
          <div
            className="ad-logout-overlay"
            onMouseDown={() => setShowLogoutModal(false)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="ad-logout-modal"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <h3 className="ad-logout-title">Log out?</h3>
              <p className="ad-logout-text">Are you sure you want to logout?</p>

              <div className="ad-logout-actions">
                <button
                  type="button"
                  className="ad-logout-btn ghost"
                  onClick={() => setShowLogoutModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="ad-logout-btn danger"
                  onClick={doLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* ✅ NEW: Add Product modal */}
      {showAddProductModal &&
        createPortal(
          <div
            className="ad-logout-overlay"
            onMouseDown={() => setShowAddProductModal(false)}
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
                <h3 className="ad-logout-title">Add New Product</h3>
                <p style={{ color: "#64748b", fontSize: "14px", margin: 0 }}>
                  Fill in the product details below
                </p>
              </div>

              <div className="modal-tabs-header" style={{ marginTop: "16px" }}>
                <button
                  type="button"
                  className={`modal-tab-btn ${addProductTab === "details" ? "active" : ""
                    }`}
                  onClick={() => setAddProductTab("details")}
                >
                  Details
                  <span className="modal-tab-badge">
                    {isDetailsValid ? (
                      <FaCheckCircle style={{ color: "#10b981" }} />
                    ) : (
                      <FaExclamationTriangle style={{ color: "#f59e0b" }} />
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  className={`modal-tab-btn ${addProductTab === "images" ? "active" : ""
                    }`}
                  onClick={() => setAddProductTab("images")}
                >
                  Images
                  <span className="modal-tab-badge">
                    {isImagesValid ? (
                      <FaCheckCircle style={{ color: "#10b981" }} />
                    ) : (
                      <FaExclamationTriangle style={{ color: "#f59e0b" }} />
                    )}
                  </span>
                </button>
                <button
                  type="button"
                  className={`modal-tab-btn ${addProductTab === "specifications" ? "active" : ""
                    }`}
                  onClick={() => setAddProductTab("specifications")}
                >
                  Specs
                  <span className="modal-tab-badge">
                    <FaCheckCircle style={{ color: "#10b981" }} />
                  </span>
                </button>
              </div>

              <form
                onSubmit={submitAddProduct}
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
                  {addProductTab === "details" && (
                    <>
                      {/* Category Template */}
                      <div className="dashform-group">
                        <label>
                          Category Template{" "}
                          <span style={{ color: "#9ca3af", fontWeight: "400" }}>
                            (auto-fills options)
                          </span>
                        </label>
                        <select
                          defaultValue=""
                          onChange={(e) => applyAddTemplate(e.target.value)}
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
                          gap: "12px",
                        }}
                      >
                        <div className="dashform-group">
                          <label>Product Name *</label>
                          <input
                            type="text"
                            value={productForm.name}
                            onChange={(e) =>
                              setProductForm({
                                ...productForm,
                                name: e.target.value,
                              })
                            }
                            placeholder="e.g., Business Cards"
                          />
                        </div>

                        <div className="dashform-group">
                          <label>SKU *</label>
                          <input
                            type="text"
                            value={productForm.sku}
                            onChange={(e) =>
                              setProductForm({
                                ...productForm,
                                sku: e.target.value,
                              })
                            }
                            placeholder="e.g., BC-001"
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "12px",
                        }}
                      >
                        <div className="dashform-group">
                          <label>Price (₱) *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={productForm.price}
                            onChange={(e) =>
                              setProductForm({
                                ...productForm,
                                price: e.target.value,
                              })
                            }
                            placeholder="0.00"
                          />
                        </div>

                        <div className="dashform-group">
                          <label>Stock</label>
                          <input
                            type="number"
                            value={productForm.stock}
                            onChange={(e) =>
                              setProductForm({
                                ...productForm,
                                stock: e.target.value,
                              })
                            }
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "12px",
                        }}
                      >
                        <div className="dashform-group">
                          <label>Print Type</label>
                          <select
                            value={productForm.print_type}
                            onChange={(e) =>
                              setProductForm({
                                ...productForm,
                                print_type: e.target.value,
                              })
                            }
                          >
                            <option value="offset">Offset Print</option>
                            <option value="digital">Digital Print</option>
                            <option value="service">Service</option>
                          </select>
                        </div>

                        <div className="dashform-group">
                          <label>Material</label>
                          <input
                            type="text"
                            value={productForm.material}
                            onChange={(e) =>
                              setProductForm({
                                ...productForm,
                                material: e.target.value,
                              })
                            }
                            placeholder="e.g., Matte Paper"
                          />
                        </div>
                      </div>

                      <div className="dashform-group">
                        <label>Description</label>
                        <textarea
                          value={productForm.description}
                          onChange={(e) =>
                            setProductForm({
                              ...productForm,
                              description: e.target.value,
                            })
                          }
                          placeholder="Product description..."
                          rows="2"
                        />
                      </div>

                      {/* <div className="dashform-group">
                      <label>
                        AI Prompt Rules{" "}
                        <span style={{ color: "#9ca3af", fontWeight: "400" }}>
                          (instructions the AI must follow)
                        </span>
                      </label>
                      <textarea
                        value={productForm.ai_prompt_rules}
                        onChange={(e) =>
                          setProductForm({
                            ...productForm,
                            ai_prompt_rules: e.target.value,
                          })
                        }
                        placeholder="Always use 300dpi. Bleed must be 0.125in..."
                        rows="3"
                      />
                    </div> */}
                    </>
                  )}

                  {addProductTab === "images" && (
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
                            onChange={handleAddImageUpload}
                            disabled={addImageUploading}
                            style={{ display: "none" }}
                          />
                        </label>
                        {addImageUploading && (
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#6b7280",
                              marginTop: "4px",
                            }}
                          >
                            Uploading...
                          </p>
                        )}
                        {addImageError && (
                          <p
                            style={{
                              fontSize: "12px",
                              color: "#e74c3c",
                              marginTop: "4px",
                            }}
                          >
                            {addImageError}
                          </p>
                        )}
                        {productForm.images.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "8px",
                              marginTop: "12px",
                            }}
                          >
                            {productForm.images.map((url, i) => (
                              <div key={i} style={{ position: "relative" }}>
                                <img
                                  src={url}
                                  alt={`upload-${i}`}
                                  style={{
                                    width: "60px",
                                    height: "60px",
                                    objectFit: "cover",
                                    borderRadius: "6px",
                                    border: "1px solid #d1d5db",
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    setProductForm((prev) => ({
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
                                    background: "#e74c3c",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "50%",
                                    width: "16px",
                                    height: "16px",
                                    fontSize: "10px",
                                    cursor: "pointer",
                                    lineHeight: 1,
                                  }}
                                >
                                  &times;
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {addProductTab === "specifications" && (
                    <>
                      {[
                        { field: "color_options", label: "Color Options" },
                        { field: "size_options", label: "Size Options" },
                        {
                          field: "material_options",
                          label: "Material Options",
                        },
                        {
                          field: "side_options",
                          label: "Printing (Sides) Options",
                        },
                        {
                          field: "finishing_options",
                          label: "Finishing Options",
                        },
                        {
                          field: "processing_options",
                          label: "Processing Options",
                        },
                        {
                          field: "delivery_options",
                          label: "Delivery Options",
                        },
                        {
                          field: "quantity_options",
                          label: "Quantity Options",
                          hint: "format: label|price (e.g. 100 pcs|₱1,270.50)",
                        },
                        {
                          field: "shipping_options",
                          label: "Shipping Options",
                          hint: "format: label|price (e.g. Standard|Free)",
                        },
                      ]
                        .filter(({ field }) => {
                          const zk = getCustomizerCategoryKey(
                            productForm.category,
                          );
                          const hasZones = zk && CUSTOMIZER_ZONES[zk];
                          return !(field === "side_options" && hasZones);
                        })
                        .map(({ field, label, hint }) => {
                          const zk = getCustomizerCategoryKey(
                            productForm.category,
                          );
                          const customizerZones = zk
                            ? CUSTOMIZER_ZONES[zk]
                            : null;
                          const theme = OPTION_THEMES[field] || {
                            color: "#64748b",
                            bg: "rgba(100, 116, 139, 0.1)",
                            border: "rgba(100, 116, 139, 0.25)",
                          };

                          if (
                            field === "quantity_options" ||
                            field === "shipping_options"
                          ) {
                            const items = (
                              productForm[field] || []
                            ).map((item) => {
                              const parts = String(item).split("|");
                              const rawLabel = parts[0] || "";
                              const lbl = field === "quantity_options"
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

                            const updateItem = (index, key, val) => {
                              const newItems = [...items];
                              newItems[index] = {
                                ...newItems[index],
                                [key]: val,
                              };
                              const serialized = newItems.map((it) => {
                                const finalLabel =
                                  field === "quantity_options" && it.label
                                    ? `${it.label.trim()} pcs`
                                    : it.label.trim();

                                let finalPrice = it.price.trim();
                                if (finalPrice) {
                                  const num = parseFloat(finalPrice);
                                  if (!isNaN(num)) {
                                    if (
                                      num === 0 &&
                                      field === "shipping_options"
                                    ) {
                                      finalPrice = "Free";
                                    } else {
                                      finalPrice = new Intl.NumberFormat(
                                        "en-PH",
                                        {
                                          style: "currency",
                                          currency: "PHP",
                                        },
                                      ).format(num);
                                    }
                                  }
                                }
                                return `${finalLabel}|${finalPrice}`;
                              });
                              setProductForm((prev) => ({
                                ...prev,
                                [field]: serialized,
                              }));
                            };

                            const addItem = () => {
                              const serialized = [
                                ...(productForm[field] || []),
                                "|",
                              ];
                              setProductForm((prev) => ({
                                ...prev,
                                [field]: serialized,
                              }));
                            };

                            const removeItem = (index) => {
                              const newItems = items.filter(
                                (_, idx) => idx !== index,
                              );
                              const serialized = newItems.map((it) => {
                                const finalLabel =
                                  field === "quantity_options" && it.label
                                    ? `${it.label.trim()} pcs`
                                    : it.label.trim();

                                let finalPrice = it.price.trim();
                                if (finalPrice) {
                                  const num = parseFloat(finalPrice);
                                  if (!isNaN(num)) {
                                    if (
                                      num === 0 &&
                                      field === "shipping_options"
                                    ) {
                                      finalPrice = "Free";
                                    } else {
                                      finalPrice = new Intl.NumberFormat(
                                        "en-PH",
                                        {
                                          style: "currency",
                                          currency: "PHP",
                                        },
                                      ).format(num);
                                    }
                                  }
                                }
                                return `${finalLabel}|${finalPrice}`;
                              });
                              setProductForm((prev) => ({
                                ...prev,
                                [field]: serialized,
                              }));
                            };

                            return (
                              <div
                                key={field}
                                style={{ marginBottom: "20px" }}
                              >
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
                                            onChange={(e) =>
                                              updateItem(
                                                i,
                                                "label",
                                                e.target.value,
                                              )
                                            }
                                            style={{
                                              flex: 1,
                                              padding: "8px 12px",
                                              border: "1px solid #cbd5e1",
                                              borderRadius: "6px",
                                              fontSize: "13px",
                                            }}
                                          />
                                          <span
                                            style={{
                                              fontSize: "13px",
                                              color: "#64748b",
                                            }}
                                          >
                                            pcs
                                          </span>
                                        </div>
                                      ) : (
                                        <input
                                          type="text"
                                          value={item.label}
                                          placeholder="Option Label"
                                          onChange={(e) =>
                                            updateItem(
                                              i,
                                              "label",
                                              e.target.value,
                                            )
                                          }
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
                                          onChange={(e) =>
                                            updateItem(
                                              i,
                                              "price",
                                              e.target.value,
                                            )
                                          }
                                          style={{
                                            flex: 1,
                                            padding: "8px 12px",
                                            border: "1px solid #cbd5e1",
                                            borderRadius: "6px",
                                            fontSize: "13px",
                                          }}
                                        />
                                        <span
                                          style={{
                                            fontSize: "13px",
                                            color: "#64748b",
                                          }}
                                        >
                                          PHP
                                        </span>
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
                                    onClick={addItem}
                                    style={{
                                      alignSelf: "flex-start",
                                      marginTop: "4px",
                                      padding: "6px 12px",
                                      background: "transparent",
                                      color: "#2563eb",
                                      border: "1px solid #2563eb",
                                      borderRadius: "6px",
                                      fontSize: "12px",
                                      cursor: "pointer",
                                      fontWeight: "600",
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
                          }

                          return (
                            <React.Fragment key={field}>
                              <div style={{ marginBottom: "16px" }}>
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

                                {hint && (
                                  <div className="format-info-alert">
                                    <FaInfoCircle
                                      style={{
                                        flexShrink: 0,
                                        marginTop: "2px",
                                        color: "#2563eb",
                                      }}
                                    />
                                    <span style={{ color: "#1e3a8a" }}>
                                      {hint}
                                    </span>
                                  </div>
                                )}

                                <div className="scrollable-tags-row">
                                  {productForm[field].map((tag, i) => (
                                    <span
                                      key={i}
                                      style={{
                                        background: theme.bg,
                                        border: `1px solid ${theme.border}`,
                                        borderRadius: "4px",
                                        padding: "2px 8px",
                                        fontSize: "13px",
                                        color: theme.color,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                      }}
                                    >
                                      {tag}
                                      <button
                                        type="button"
                                        onClick={() => removeAddTag(field, i)}
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
                                        <FaTrashAlt
                                          style={{ fontSize: "10px" }}
                                        />
                                      </button>
                                    </span>
                                  ))}
                                </div>

                                <div style={{ display: "flex", gap: "6px" }}>
                                  <input
                                    type="text"
                                    value={addTagInputs[field]}
                                    onChange={(e) =>
                                      setAddTagInputs((prev) => ({
                                        ...prev,
                                        [field]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        addAddTag(field);
                                      }
                                    }}
                                    placeholder={
                                      field === "quantity_options"
                                        ? "e.g., 100 pcs|₱1,270.50"
                                        : field === "shipping_options"
                                          ? "e.g., Standard|Free"
                                          : `Add ${label.toLowerCase()} option...`
                                    }
                                    style={{
                                      flex: 1,
                                      padding: "6px 10px",
                                      border: "1px solid #d1d5db",
                                      borderRadius: "6px",
                                      fontSize: "13px",
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => addAddTag(field)}
                                    style={{
                                      padding: "6px 12px",
                                      background: "transparent",
                                      color: "#2563eb",
                                      border: "1px solid #2563eb",
                                      borderRadius: "6px",
                                      fontSize: "13px",
                                      cursor: "pointer",
                                      fontWeight: "600",
                                    }}
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>

                              {field === "material_options" &&
                                customizerZones && (
                                  <div style={{ marginBottom: "16px" }}>
                                    <label
                                      style={{
                                        display: "block",
                                        marginBottom: "4px",
                                        fontSize: "13px",
                                        fontWeight: "600",
                                      }}
                                    >
                                      Printable Areas (Customizer Zones) *
                                    </label>
                                    <p
                                      style={{
                                        fontSize: "11px",
                                        color: "#6b7280",
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
                                        background: "#f9fafb",
                                        padding: "10px",
                                        borderRadius: "8px",
                                        border: "1px solid #e5e7eb",
                                      }}
                                    >
                                      {customizerZones.map((z) => {
                                        const isChecked =
                                          productForm.print_zones.includes(
                                            z.id,
                                          );
                                        return (
                                          <label
                                            key={z.id}
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "6px",
                                              cursor: "pointer",
                                              fontSize: "13px",
                                              color: "#374151",
                                              margin: 0,
                                            }}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={() => {
                                                const updatedZones = isChecked
                                                  ? productForm.print_zones.filter(
                                                    (id) => id !== z.id,
                                                  )
                                                  : [
                                                    ...productForm.print_zones,
                                                    z.id,
                                                  ];
                                                const updatedSides =
                                                  generateSideOptions(
                                                    productForm.category,
                                                    updatedZones,
                                                  );
                                                setProductForm({
                                                  ...productForm,
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
                                  </div>
                                )}
                            </React.Fragment>
                          );
                        })}
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
                    onClick={() => setShowAddProductModal(false)}
                  >
                    Cancel
                  </button>
                  {addProductTab !== "specifications" ? (
                    <button
                      type="button"
                      className="ad-logout-btn"
                      style={{
                        background: "#2563eb",
                        color: "#fff",
                        border: "none",
                      }}
                      onClick={() => {
                        if (addProductTab === "details") {
                          setAddProductTab("images");
                        } else if (addProductTab === "images") {
                          setAddProductTab("specifications");
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
                      Add Product
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}

      {/* Sidebar */}
      <div
        className={`sidebar ${isCollapsed ? "collapsed" : ""} ${isMobileSidebarOpen ? "mobile-open" : ""
          }`}
      >
        <div className="sidebar-header">
          {!isCollapsed && <h2 className="sidebar-title">Admin Panel</h2>}
          <button
            type="button"
            className="collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? "→" : "←"}
          </button>
        </div>

        {!isCollapsed && (
          <div className="user-info">
            <div className="user-avatar">
              <div className="avatar-circle">
                {sidebarUser?.avatar_url ? (
                  <img src={sidebarUser.avatar_url} alt="avatar" />
                ) : (
                  <div>AD</div>
                )}
              </div>
            </div>
            <div className="user-details">
              <h4 className="user-name">
                {sidebarUser?.firstName || "Admin User"}
              </h4>
              <p className="user-role">
                {role === "admin"
                  ? "Administrator"
                  : role === "staff"
                    ? "Staff"
                    : "Customer"}
              </p>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="user-collapsed">
            <div className="avatar-small">
              {sidebarUser?.avatar_url ? (
                <img src={sidebarUser.avatar_url} alt="avatar" />
              ) : (
                <div>A</div>
              )}
            </div>
          </div>
        )}

        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`menu-item ${activeItem === item.id ? "active" : ""}`}
              onClick={() => handleMenuItemClick(item)}
            >
              <span className="menu-icon">{item.icon}</span>
              {!isCollapsed && <span className="menu-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <button type="button" className="logout-btn" onClick={handleLogout}>
            <span className="logout-icon">
              <FaSignOutAlt />
            </span>
            {!isCollapsed && <span className="logout-text">Logout</span>}
          </button>
        </div>
      </div>

      <main className="dashboard-content">
        <header className="dashboard-header">
          <div className="header-left">
            {/* ✅ Mobile hamburger + title row */}
            <div className="mobile-header-row">
              <button
                type="button"
                className="mobile-menu-btn"
                onClick={() => setIsMobileSidebarOpen(true)}
                aria-label="Open menu"
              >
                ☰
              </button>

              <div className="page-title-wrap">
                <h1 className="page-title">{pageTitle}</h1>
              </div>
            </div>
          </div>

          {/* ✅ top button ONLY (this is the one you want to keep) */}
          {/* <div className="header-actions">
            {activeItem === "products" && (
              <button
                className="header-pill"
                type="button"
                onClick={handleAddProduct}
              >
                <FaPlus /> New Product
              </button>
            )}
          </div> */}
        </header>

        <div className="content-wrapper">
          {/* ✅ DASHBOARD (UNCHANGED) */}
          {activeItem === "dashboard" && (
            <>
              <div className="dash-hero">
                <div className="dash-hero-left">
                  <div className="dash-kicker">Overview</div>
                  <h2 className="dash-title">Your store at a glance</h2>
                  <p className="dash-desc">
                    Track performance and manage operations faster.
                  </p>
                </div>

                <div className="dash-hero-right">
                  <button
                    className="dash-quick-btn"
                    type="button"
                    onClick={() => navigate("/admin/manageaccount")}
                  >
                    Manage Accounts
                  </button>

                  <button
                    className="dash-quick-btn ghost"
                    type="button"
                    onClick={() => navigate("/admin/orders")}
                  >
                    View Orders
                  </button>
                </div>
              </div>

              <div className="content-grid">
                <div className="stats-card revenue">
                  <div className="stat-top">
                    <div>
                      <h3>Total Revenue</h3>
                      <p className="stat-number">
                        ₱{" "}
                        {dashStats.totalRevenue.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    <div className="stat-icon">
                      <FaMoneyBillWave />
                    </div>
                  </div>
                  <div className="stat-foot">From all orders</div>
                </div>

                <div className="stats-card users">
                  <div className="stat-top">
                    <div>
                      <h3>Total Users</h3>
                      <p className="stat-number">
                        {(dashStats.totalUsers ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="stat-icon">
                      <FaUserPlus />
                    </div>
                  </div>
                  <div className="stat-foot">Registered customers</div>
                </div>

                <div className="stats-card orders">
                  <div className="stat-top">
                    <div>
                      <h3>Orders</h3>
                      <p className="stat-number">{dashStats.totalOrders}</p>
                    </div>
                    <div className="stat-icon">
                      <FaShoppingBag />
                    </div>
                  </div>
                  <div className="stat-foot">
                    Pending: {dashStats.pendingOrders}
                  </div>
                </div>

                <div className="stats-card out-of-stock">
                  <div className="stat-top">
                    <div>
                      <h3>Out of Stock</h3>
                      <p className="stat-number">
                        {lowStockLoading ? "..." : outOfStockCount}
                      </p>
                    </div>
                    <div className="stat-icon">
                      <FaExclamationTriangle />
                    </div>
                  </div>
                  <div className="stat-foot">Products with 0 stock</div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: "24px",
                  marginTop: "12px",
                }}
              >
                {/* Low Stock Card */}
                <div className="data-table-card" style={{ marginTop: 0 }}>
                  <div className="data-table-head">
                    <h3>Low Stock</h3>
                    <div>
                      <button
                        type="button"
                        className="row-btn"
                        onClick={() => {
                          setLowStockFilter({
                            filter: "low_stock",
                            threshold: 10,
                          });
                          navigate("/admin/products");
                        }}
                      >
                        View all
                      </button>
                    </div>
                  </div>

                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>SKU</th>
                          <th className="left">Stock</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStockLoading ? (
                          <tr>
                            <td className="empty-row" colSpan={4}>
                              Loading...
                            </td>
                          </tr>
                        ) : lowStock.products.length === 0 ? (
                          <tr>
                            <td className="empty-row" colSpan={4}>
                              No low-stock items
                            </td>
                          </tr>
                        ) : (
                          lowStock.products.map((p) => {
                            const isOos = Number(p.stock) === 0;
                            return (
                              <tr key={p.id} className={isOos ? "oos-row" : ""}>
                                <td>{p.name}</td>
                                <td>{p.sku || "—"}</td>
                                <td className="left">{p.stock}</td>
                                <td>
                                  {isOos ? (
                                    <span className="oos-badge">
                                      <FaExclamationTriangle
                                        style={{ fontSize: "10px" }}
                                      />
                                      Out of Stock
                                    </span>
                                  ) : (
                                    <span className="low-badge">Low Stock</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}

              {activeItem === "profile" && <AdminProfile />}
              {activeItem === "customers" && role !== "staff" && (
                <AdminManageAccounts />
              )}

              {/* ✅ ORDERS - Dynamic component */}
              {activeItem === "orders" && <AdminOrders />}

              {/* ✅ INQUIRIES - Dynamic component */}
              {activeItem === "inquiries" && <AdminInquiries />}

              {/* ✅ PRODUCTS - Dynamic component */}
              {activeItem === "products" && (
                <AdminProducts
                  refreshTrigger={refreshProductsKey}
                  onAddProduct={handleAddProduct}
                  lowStockFilter={lowStockFilter}
                />
              )}
            </div>
      </main>
    </div>
  );
}

export default AdminDashboard;
