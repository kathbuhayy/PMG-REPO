// Admin-dashboard.js (FULL UPDATED FILE)
// Redesigned to match the PMG Printing House dashboard mock: new dark sidebar
// with grouped navigation (MAIN / PRODUCTION / INVENTORY / CUSTOMERS & STAFF /
// FINANCE / REPORTS / COMMUNICATION / SETTINGS), a richer Dashboard tab
// (stat cards, production overview donut, urgent actions, today's schedule,
// low stock table, recent orders, sales overview chart).
//
// WHAT'S REAL vs MOCK
// - Today's Revenue, Pending Orders, Low Stock Items, Orders/Customers/Avg Order
//   footer stats, and the Low Stock table all use your existing API data.
// - "In Production" and "Recent Orders" are best-effort from /api/admin/orders
//   (status === "processing", sorted by created_at) — adjust the field names
//   in fetchDashboardStats() if your order objects use different keys.
// - Everything under MOCK_DASHBOARD (Deliveries/Pickup, Production Overview
//   donut breakdown, Urgent Actions, Today's Production Schedule, Sales
//   Overview trend, sidebar badge counts for Quotations/Design Approvals) is
//   placeholder data structured so it's easy to swap for real endpoints later.
// - Sidebar items with no backend/page yet (Quotations, Design Approvals,
//   Production Queue, Print Jobs, Quality Control, Inventory, Users & Staff,
//   Payments, Reports & Analytics, System Settings) render a <ComingSoonPanel />
//   instead of breaking the route.

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import "./Admin-dashboard.css";
import AdminProductionCalendar from "./AdminProductionCalendar";
import AdminProfile from "./Admin-profile";
import AdminManageAccounts from "./Admin-manageacc";
import AdminOrders from "./AdminOrders";
import AdminInquiries from "./AdminInquiries";
import AdminProducts from "./AdminProducts";
import AdminActivityLog from "./AdminActivityLog";
import { buildApiUrl } from "../config/api";
import { adminFetch } from "../utils/adminFetch";
import {
  CATEGORY_DEFAULTS,
  CATEGORY_NAMES,
  CUSTOMIZER_ZONES,
  OPTION_THEMES,
} from "../config/categoryDefaults";

import {
  FaCalendarAlt,
  FaMoneyBillWave,
  FaTimes,
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
  FaHistory,
  FaFileInvoiceDollar,
  FaClipboardCheck,
  FaListOl,
  FaPrint,
  FaCheckDouble,
  FaWarehouse,
  FaUserCog,
  FaMoneyCheckAlt,
  FaChartBar,
  FaCog,
  FaSearch,
  FaBell,
  FaSyncAlt,
  FaChevronDown,
  FaTruck,
  FaTools,
} from "react-icons/fa";

// ─────────────────────────────────────────────────────────────────────────
// MOCK DATA — clearly isolated so it's easy to find/replace with real API
// calls later. Nothing here should be treated as production data.
// ─────────────────────────────────────────────────────────────────────────
const MOCK_DASHBOARD = {
  deliveriesPickup: 5,
  revenueChangePercent: 12.5,
  sidebarBadges: {
    quotations: 8,
    designApprovals: 4,
  },
  notificationCount: 7,
  productionOverview: [
    { id: "pending", label: "Pending", value: 12, color: "#3b82f6" },
    { id: "in_production", label: "In Production", value: 8, color: "#2563eb" },
    { id: "quality_check", label: "Quality Check", value: 4, color: "#f59e0b" },
    { id: "ready", label: "Ready for Release", value: 9, color: "#eab308" },
    { id: "completed", label: "Completed Today", value: 21, color: "#10b981" },
  ],
  urgentActions: [
    {
      id: "deadline",
      tone: "red",
      icon: <FaExclamationTriangle />,
      title: "2 orders are approaching their deadline",
      subtitle: "Check production queue",
      actionLabel: "View Jobs",
      actionTab: "productionQueue",
    },
    {
      id: "lowstock",
      tone: "amber",
      icon: <FaBoxOpen />,
      title: "3 products are running low on stock",
      subtitle: "Update inventory or create purchase order",
      actionLabel: "View Inventory",
      actionTab: "inventory",
    },
    {
      id: "designs",
      tone: "blue",
      icon: <FaClipboardCheck />,
      title: "4 designs waiting for approval",
      subtitle: "Customer designs need your review",
      actionLabel: "Review Designs",
      actionTab: "designApprovals",
    },
    {
      id: "payments",
      tone: "green",
      icon: <FaMoneyCheckAlt />,
      title: "2 payment verifications pending",
      subtitle: "Payment proof needs confirmation",
      actionLabel: "View Payments",
      actionTab: "payments",
    },
  ],
  todaysSchedule: [
    {
      id: "PJ-1045",
      time: "10:00 AM",
      title: "T-Shirt Printing (50 pcs)",
      staff: "Kat",
      status: "In Production",
      statusTone: "amber",
      progress: 60,
    },
    {
      id: "PJ-1046",
      time: "1:00 PM",
      title: "Flyers (500 pcs)",
      staff: "Patrizia",
      status: "Quality Check",
      statusTone: "blue",
      progress: 75,
    },
    {
      id: "PJ-1047",
      time: "3:00 PM",
      title: "Business Cards (200 pcs)",
      staff: "Rica",
      status: "Pending",
      statusTone: "grey",
      progress: 0,
    },
  ],
  // Simple relative trend line (not tied to real dates yet)
  salesOverviewTrend: [10, 13, 12, 16, 15, 19, 18, 22, 21, 25, 24, 28, 27, 31],
};

// Builds a CSS conic-gradient string from [{ value, color }]
const buildConicGradient = (segments) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  let cursor = 0;
  const stops = segments.map((seg) => {
    const start = (cursor / total) * 360;
    cursor += seg.value;
    const end = (cursor / total) * 360;
    return `${seg.color} ${start}deg ${end}deg`;
  });
  return `conic-gradient(${stops.join(", ")})`;
};

// Builds an SVG path string for a simple line/area chart from an array of numbers
const buildSparklinePath = (points, width, height, padding = 6) => {
  if (!points || points.length === 0) return { line: "", area: "" };
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (points.length - 1 || 1);
  const coords = points.map((p, i) => {
    const x = padding + i * stepX;
    const y =
      height - padding - ((p - min) / range) * (height - padding * 2);
    return [x, y];
  });
  const line = coords
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${(
    height - padding
  ).toFixed(1)} L${coords[0][0].toFixed(1)},${(height - padding).toFixed(1)} Z`;
  return { line, area };
};

// Small reusable placeholder for sidebar destinations that don't have a
// backing page/component yet.
function ComingSoonPanel({ title, icon }) {
  return (
    <div className="coming-soon">
      <div className="coming-soon-icon">{icon || <FaTools />}</div>
      <h3>{title}</h3>
      <p>
        This section isn't wired up yet. Once the backend endpoint and page
        for &ldquo;{title}&rdquo; are ready, this is where they'll go.
      </p>
    </div>
  );
}

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

  // ✅ Logout confirm modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // ✅ Add Product modal
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

  // ✅ Dashboard stats from API
  const [dashStats, setDashStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalUsers: 0,
  });
  const [, setStatsLoading] = useState(true);
  // Best-effort derived data (see header notes for field-name caveats)
  const [inProductionCount, setInProductionCount] = useState(0);
  const [recentOrders, setRecentOrders] = useState([]);

  // Low stock state
  const [lowStock, setLowStock] = useState({ products: [], pagination: {} });
  const [outOfStockCount, setOutOfStockCount] = useState(0);
  const [lowStockLoading, setLowStockLoading] = useState(true);
  const [lowStockFilter, setLowStockFilter] = useState(null);
  const [dismissedLowStockAlert, setDismissedLowStockAlert] = useState(false);

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
  const fetchLowStock = useCallback(async () => {
    try {
      setLowStockLoading(true);
      const threshold = 10; // default threshold
      const limit = 5; // show top 5 on dashboard
      const res = await adminFetch(
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
  }, []);

  useEffect(() => {
    fetchLowStock();
    const lsInterval = setInterval(fetchLowStock, 30000);
    return () => clearInterval(lsInterval);
  }, [fetchLowStock]);

  // Fetch out-of-stock products for dashboard
  const fetchOutOfStock = useCallback(async () => {
    try {
      setOutOfStockLoading(true);
      const threshold = 0;
      const limit = 5;
      const res = await adminFetch(
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
  }, []);

  useEffect(() => {
    fetchOutOfStock();
    const oosInterval = setInterval(fetchOutOfStock, 30000);
    return () => clearInterval(oosInterval);
  }, [fetchOutOfStock]);

  // ✅ Fetch dashboard stats from API
  const fetchDashboardStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const [ordersRes, usersRes] = await Promise.all([
        adminFetch(buildApiUrl("/api/admin/orders")),
        adminFetch(buildApiUrl("/api/admin/users")),
      ]);

      const ordersData = await ordersRes.json();
      const usersData = await usersRes.json();

      const ordersList = Array.isArray(ordersData) ? ordersData : [];

      // Calculate stats
      const totalOrders = ordersList.length;
      const pendingOrders = ordersList.filter(
        (o) => o.status === "pending",
      ).length;
      const totalRevenue = ordersList
        .filter((o) => o.status === "completed")
        .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
      const totalUsers = Array.isArray(usersData)
        ? usersData.length
        : (usersData?.users?.length ?? 0);

      // Best-effort "in production" count — adjust the status string below
      // if your orders use a different value (e.g. "in_production").
      const inProduction = ordersList.filter(
        (o) => String(o.status || "").toLowerCase() === "processing",
      ).length;
      setInProductionCount(inProduction);

      // Best-effort recent orders list for the dashboard table — adjust the
      // field names below to match your actual order object shape.
      const sortedRecent = [...ordersList]
        .sort(
          (a, b) =>
            new Date(b.created_at || b.createdAt || 0) -
            new Date(a.created_at || a.createdAt || 0),
        )
        .slice(0, 5)
        .map((o) => ({
          id: o.order_number || o.orderNumber || `#${o.id ?? "—"}`,
          customer:
            o.customer_name ||
            o.customerName ||
            o.user?.name ||
            o.user_name ||
            "Customer",
          total: parseFloat(o.total || 0),
          status: o.status || "pending",
        }));
      setRecentOrders(sortedRecent);

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
  }, []);

  useEffect(() => {
    fetchDashboardStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchDashboardStats, 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardStats]);

  // ✅ Manual refresh (header button) — re-runs all dashboard fetches
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchDashboardStats(),
      fetchLowStock(),
      fetchOutOfStock(),
    ]);
    setIsRefreshing(false);
  };

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
        const res = await adminFetch(buildApiUrl(`/api/user-profile/${userId}`));
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

  // ✅ Grouped sidebar navigation — mirrors the PMG Printing House dashboard
  // design (MAIN / PRODUCTION / INVENTORY / CUSTOMERS & STAFF / FINANCE /
  // REPORTS / COMMUNICATION / SETTINGS). Items without a real page yet fall
  // back to <ComingSoonPanel /> below.
  const menuGroups = useMemo(() => {
    const groups = [
      {
        label: "MAIN",
        items: [
          { id: "dashboard", label: "Dashboard", icon: <FaTachometerAlt /> },
          {
            id: "orders",
            label: "Orders",
            icon: <FaShoppingBag />,
            badge: dashStats.totalOrders || null,
          },
          {
            id: "quotations",
            label: "Quotations",
            icon: <FaFileInvoiceDollar />,
            badge: MOCK_DASHBOARD.sidebarBadges.quotations,
          },
          {
            id: "designApprovals",
            label: "Design Approvals",
            icon: <FaClipboardCheck />,
            badge: MOCK_DASHBOARD.sidebarBadges.designApprovals,
          },
        ],
      },
      {
        label: "PRODUCTION",
        items: [
          { id: "productionQueue", label: "Production Queue", icon: <FaListOl /> },
          { id: "printJobs", label: "Print Jobs", icon: <FaPrint /> },
          { id: "calendar", label: "Production Calendar", icon: <FaCalendarAlt /> },
          { id: "qualityControl", label: "Quality Control", icon: <FaCheckDouble /> },
        ],
      },
      {
        label: "INVENTORY",
        items: [
          {
            id: "inventory",
            label: "Inventory",
            icon: <FaWarehouse />,
            badge: lowStock.pagination.total || null,
          },
          { id: "products", label: "Products", icon: <FaBoxOpen /> },
        ],
      },
      {
        label: "CUSTOMERS & STAFF",
        items: [
          { id: "customers", label: "Customers", icon: <FaUsers /> },
          { id: "usersStaff", label: "Users & Staff", icon: <FaUserCog /> },
        ],
      },
      {
        label: "FINANCE",
        items: [
          { id: "payments", label: "Payments", icon: <FaMoneyCheckAlt /> },
        ],
      },
      {
        label: "REPORTS",
        items: [
          { id: "reports", label: "Reports & Analytics", icon: <FaChartBar /> },
        ],
      },
      {
        label: "COMMUNICATION",
        items: [{ id: "inquiries", label: "Inquiries", icon: <FaEnvelope /> }],
      },
      {
        label: "SETTINGS",
        items: [
          { id: "activity", label: "Activity Log", icon: <FaHistory /> },
          { id: "profile", label: "Profile", icon: <FaUser /> },
          { id: "systemSettings", label: "System Settings", icon: <FaCog /> },
        ],
      },
    ];

    // Staff: remove Manage Accounts (same restriction as before)
    if (role === "staff") {
      return groups
        .map((g) => ({ ...g, items: g.items.filter((i) => i.id !== "customers") }))
        .filter((g) => g.items.length > 0);
    }

    return groups;
  }, [role, dashStats.totalOrders, lowStock.pagination.total]);

  const pageTitleMap = useMemo(() => {
    const map = {};
    menuGroups.forEach((g) => g.items.forEach((i) => (map[i.id] = i.label)));
    return map;
  }, [menuGroups]);

  const pageTitle = pageTitleMap[activeItem] || "Dashboard";

  const handleMenuItemClick = (item) => {
    if (role === "staff" && item.id === "customers") return;
    const targetTab = item.id === "customers" ? "manageaccount" : item.id;
    navigate(`/admin/${targetTab}`);
    setIsMobileSidebarOpen(false);
  };

  // ✅ unchanged logout logic
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

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  // ✅ Open add product modal
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
      const res = await adminFetch(buildApiUrl("/api/products/upload"), {
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
      const res = await adminFetch(buildApiUrl("/api/products"), {
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

  // ── Dashboard derived visuals ─────────────────────────────────────────
  const donutGradient = useMemo(
    () => buildConicGradient(MOCK_DASHBOARD.productionOverview),
    [],
  );
  const donutTotal = useMemo(
    () =>
      MOCK_DASHBOARD.productionOverview.reduce((s, x) => s + x.value, 0),
    [],
  );
  const salesChart = useMemo(
    () => buildSparklinePath(MOCK_DASHBOARD.salesOverviewTrend, 300, 100),
    [],
  );
  const avgOrderValue = dashStats.totalOrders
    ? dashStats.totalRevenue / dashStats.totalOrders
    : 0;

  const statCards = [
    {
      key: "revenue",
      label: "Today's Revenue",
      value: `₱${dashStats.totalRevenue.toLocaleString(undefined, {
        maximumFractionDigits: 0,
      })}`,
      icon: <FaMoneyBillWave />,
      tone: "green",
      foot: `+${MOCK_DASHBOARD.revenueChangePercent}% vs yesterday`,
    },
    {
      key: "pending",
      label: "Pending Orders",
      value: dashStats.pendingOrders,
      icon: <FaShoppingBag />,
      tone: "blue",
      foot: "View all orders",
      onClick: () => navigate("/admin/orders"),
    },
    {
      key: "production",
      label: "In Production",
      value: inProductionCount,
      icon: <FaPrint />,
      tone: "indigo",
      foot: "View production queue",
      onClick: () => navigate("/admin/productionQueue"),
    },
    {
      key: "deliveries",
      label: "Deliveries / Pickup",
      value: MOCK_DASHBOARD.deliveriesPickup,
      icon: <FaTruck />,
      tone: "orange",
      foot: "Ready for release",
    },
    {
      key: "lowstock",
      label: "Low Stock Items",
      value: lowStockLoading ? "…" : (lowStock.pagination.total ?? 0),
      icon: <FaExclamationTriangle />,
      tone: "red",
      foot: "View inventory",
      onClick: () => navigate("/admin/inventory"),
    },
  ];

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

      {/* Logout confirmation modal */}
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

      {/* Add Product modal */}
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
          {!isCollapsed && (
            <div className="brand-block">
              <span className="brand-mark">PM</span>
              <div className="brand-text">
                <h2 className="sidebar-title">
                  PM<span className="brand-accent">G</span>
                </h2>
                <span className="brand-sub">PRINTING HOUSE</span>
              </div>
            </div>
          )}
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
                  <div>{(sidebarUser?.firstName || "A").charAt(0)}</div>
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
            <span className="user-online-dot" title="Online" />
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
          {menuGroups.map((group) => (
            <div className="sidebar-group" key={group.label}>
              {!isCollapsed && (
                <div className="sidebar-group-label">{group.label}</div>
              )}
              {group.items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`menu-item ${activeItem === item.id ? "active" : ""}`}
                  onClick={() => handleMenuItemClick(item)}
                >
                  <span className="menu-icon">{item.icon}</span>
                  {!isCollapsed && (
                    <span className="menu-label">{item.label}</span>
                  )}
                  {!isCollapsed && item.badge ? (
                    <span className="menu-badge">{item.badge}</span>
                  ) : null}
                </button>
              ))}
            </div>
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
                {activeItem === "dashboard" && (
                  <p className="subtitle">
                    Overview of your printing business operations.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="header-actions">
            <button type="button" className="header-icon-btn" aria-label="Search">
              <FaSearch />
            </button>
            <button
              type="button"
              className="header-icon-btn"
              aria-label="Notifications"
            >
              <FaBell />
              {MOCK_DASHBOARD.notificationCount > 0 && (
                <span className="header-icon-badge">
                  {MOCK_DASHBOARD.notificationCount}
                </span>
              )}
            </button>
            <button type="button" className="header-daterange">
              <FaCalendarAlt />
              <span>Aug 1 – Aug 15, 2026</span>
              <FaChevronDown style={{ fontSize: "10px" }} />
            </button>
            <button
              type="button"
              className="header-refresh-btn"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <FaSyncAlt className={isRefreshing ? "spinning" : ""} />
              Refresh
            </button>
          </div>
        </header>

        <div className="content-wrapper">
          {/* ✅ DASHBOARD */}
          {activeItem === "dashboard" && (
            <>
              {!lowStockLoading &&
                !dismissedLowStockAlert &&
                (lowStock.pagination.total ?? 0) > 0 && (
                  <div className="low-stock-alert">
                    <div className="low-stock-alert-icon">
                      <FaExclamationTriangle />
                    </div>
                    <div className="low-stock-alert-body">
                      <strong>
                        {lowStock.pagination.total} product
                        {lowStock.pagination.total === 1 ? "" : "s"} running low on stock
                      </strong>
                      {outOfStockCount > 0 && (
                        <span className="low-stock-alert-sub">
                          {" "}
                          — {outOfStockCount} completely out of stock
                        </span>
                      )}
                    </div>
                    <div className="low-stock-alert-actions">
                      <button
                        type="button"
                        className="low-stock-alert-btn"
                        onClick={() => {
                          setLowStockFilter({ filter: "low_stock", threshold: 10 });
                          navigate("/admin/products");
                        }}
                      >
                        View Products
                      </button>
                      <button
                        type="button"
                        className="low-stock-alert-dismiss"
                        onClick={() => setDismissedLowStockAlert(true)}
                        aria-label="Dismiss"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  </div>
                )}

              {/* Stat cards row */}
              <div className="dash-stat-grid">
                {statCards.map((card) => (
                  <div
                    key={card.key}
                    className={`dash-stat-card tone-${card.tone} ${card.onClick ? "clickable" : ""
                      }`}
                    onClick={card.onClick}
                    role={card.onClick ? "button" : undefined}
                  >
                    <div className="dash-stat-top">
                      <span className="dash-stat-label">{card.label}</span>
                      <span className="dash-stat-icon">{card.icon}</span>
                    </div>
                    <p className="dash-stat-value">{card.value}</p>
                    <p className="dash-stat-foot">{card.foot}</p>
                  </div>
                ))}
              </div>

              {/* Production overview / urgent actions / today's schedule */}
              <div className="dash-triple-grid">
                <div className="dash-panel donut-panel">
                  <div className="dash-panel-head">
                    <h3>Production Overview</h3>
                  </div>
                  <div className="donut-body">
                    <div className="donut-wrap">
                      <div
                        className="donut-ring"
                        style={{ background: donutGradient }}
                      />
                      <div className="donut-center">
                        <span className="donut-total">{donutTotal}</span>
                        <span className="donut-total-label">Total Jobs</span>
                      </div>
                    </div>
                    <ul className="donut-legend">
                      {MOCK_DASHBOARD.productionOverview.map((seg) => (
                        <li key={seg.id}>
                          <span
                            className="legend-dot"
                            style={{ background: seg.color }}
                          />
                          <span className="legend-label">{seg.label}</span>
                          <span className="legend-value">
                            {seg.value} (
                            {Math.round((seg.value / donutTotal) * 100)}%)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    className="dash-panel-link"
                    onClick={() => navigate("/admin/productionQueue")}
                  >
                    View full production →
                  </button>
                </div>

                <div className="dash-panel urgent-panel">
                  <div className="dash-panel-head">
                    <h3>Urgent Actions</h3>
                  </div>
                  <div className="urgent-list">
                    {MOCK_DASHBOARD.urgentActions.map((action) => (
                      <div className={`urgent-item tone-${action.tone}`} key={action.id}>
                        <span className="urgent-icon">{action.icon}</span>
                        <div className="urgent-text">
                          <strong>{action.title}</strong>
                          <span>{action.subtitle}</span>
                        </div>
                        <button
                          type="button"
                          className="urgent-action-btn"
                          onClick={() => navigate(`/admin/${action.actionTab}`)}
                        >
                          {action.actionLabel}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="dash-panel schedule-panel">
                  <div className="dash-panel-head">
                    <h3>Today's Production Schedule</h3>
                    <button
                      type="button"
                      className="row-btn"
                      onClick={() => navigate("/admin/calendar")}
                    >
                      View Calendar
                    </button>
                  </div>
                  <div className="schedule-list">
                    {MOCK_DASHBOARD.todaysSchedule.map((job) => (
                      <div className="schedule-item" key={job.id}>
                        <div className="schedule-time">{job.time}</div>
                        <div className="schedule-body">
                          <div className="schedule-top">
                            <span className="schedule-id">#{job.id}</span>
                            <span className={`dashpage-pill status-${job.statusTone === "amber" ? "processing" : job.statusTone === "blue" ? "quoted" : "pending"}`}>
                              {job.status}
                            </span>
                          </div>
                          <p className="schedule-title">{job.title}</p>
                          <p className="schedule-staff">Staff: {job.staff}</p>
                          <div className="schedule-progress-track">
                            <div
                              className="schedule-progress-fill"
                              style={{ width: `${job.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="dash-panel-link"
                    onClick={() => navigate("/admin/calendar")}
                  >
                    View full schedule →
                  </button>
                </div>
              </div>

              {/* Low stock / recent orders / sales overview */}
              <div className="dash-bottom-grid">
                <div className="data-table-card" style={{ marginTop: 0 }}>
                  <div className="data-table-head">
                    <h3>Low Stock Items</h3>
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
                          <th>Item</th>
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

                <div className="data-table-card" style={{ marginTop: 0 }}>
                  <div className="data-table-head">
                    <h3>Recent Orders</h3>
                    <button
                      type="button"
                      className="row-btn"
                      onClick={() => navigate("/admin/orders")}
                    >
                      View all
                    </button>
                  </div>
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Customer</th>
                          <th>Total</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.length === 0 ? (
                          <tr>
                            <td className="empty-row" colSpan={4}>
                              No recent orders
                            </td>
                          </tr>
                        ) : (
                          recentOrders.map((o, i) => (
                            <tr key={`${o.id}-${i}`}>
                              <td>{o.id}</td>
                              <td>{o.customer}</td>
                              <td>
                                ₱
                                {o.total.toLocaleString(undefined, {
                                  maximumFractionDigits: 0,
                                })}
                              </td>
                              <td>
                                <span className={`dashpage-pill status-${o.status}`}>
                                  {o.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="data-table-card sales-card" style={{ marginTop: 0 }}>
                  <div className="data-table-head">
                    <h3>Sales Overview</h3>
                    <span className="sales-period-pill">This Month</span>
                  </div>
                  <div className="sales-card-body">
                    <div className="sales-total-row">
                      <span className="sales-total-label">Total Sales</span>
                      <p className="sales-total-value">
                        ₱
                        {dashStats.totalRevenue.toLocaleString(undefined, {
                          maximumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                    <svg
                      className="sales-chart"
                      viewBox="0 0 300 100"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(37,99,235,0.35)" />
                          <stop offset="100%" stopColor="rgba(37,99,235,0)" />
                        </linearGradient>
                      </defs>
                      <path d={salesChart.area} fill="url(#salesFill)" stroke="none" />
                      <path
                        d={salesChart.line}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="2"
                      />
                    </svg>
                    <div className="sales-footer-stats">
                      <div>
                        <span className="sales-footer-label">Orders</span>
                        <p className="sales-footer-value">
                          {dashStats.totalOrders}
                        </p>
                      </div>
                      <div>
                        <span className="sales-footer-label">Customers</span>
                        <p className="sales-footer-value">
                          {dashStats.totalUsers}
                        </p>
                      </div>
                      <div>
                        <span className="sales-footer-label">Avg. Order</span>
                        <p className="sales-footer-value">
                          ₱
                          {avgOrderValue.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeItem === "profile" && <AdminProfile />}
          {activeItem === "customers" && role !== "staff" && (
            <AdminManageAccounts />
          )}

          {/* Orders — real component */}
          {activeItem === "orders" && <AdminOrders />}

          {activeItem === "calendar" && <AdminProductionCalendar />}
          {activeItem === "activity" && <AdminActivityLog />}
          {activeItem === "inquiries" && <AdminInquiries />}

          {activeItem === "products" && (
            <AdminProducts
              refreshTrigger={refreshProductsKey}
              onAddProduct={handleAddProduct}
              lowStockFilter={lowStockFilter}
            />
          )}

          {/* New sections without a page yet — placeholders */}
          {activeItem === "quotations" && (
            <ComingSoonPanel title="Quotations" icon={<FaFileInvoiceDollar />} />
          )}
          {activeItem === "designApprovals" && (
            <ComingSoonPanel title="Design Approvals" icon={<FaClipboardCheck />} />
          )}
          {activeItem === "productionQueue" && (
            <ComingSoonPanel title="Production Queue" icon={<FaListOl />} />
          )}
          {activeItem === "printJobs" && (
            <ComingSoonPanel title="Print Jobs" icon={<FaPrint />} />
          )}
          {activeItem === "qualityControl" && (
            <ComingSoonPanel title="Quality Control" icon={<FaCheckDouble />} />
          )}
          {activeItem === "inventory" && (
            <ComingSoonPanel title="Inventory" icon={<FaWarehouse />} />
          )}
          {activeItem === "usersStaff" && (
            <ComingSoonPanel title="Users & Staff" icon={<FaUserCog />} />
          )}
          {activeItem === "payments" && (
            <ComingSoonPanel title="Payments" icon={<FaMoneyCheckAlt />} />
          )}
          {activeItem === "reports" && (
            <ComingSoonPanel title="Reports & Analytics" icon={<FaChartBar />} />
          )}
          {activeItem === "systemSettings" && (
            <ComingSoonPanel title="System Settings" icon={<FaCog />} />
          )}
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;