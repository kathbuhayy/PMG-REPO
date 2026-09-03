import React, { useState, useEffect, useMemo } from "react";
import {
  FaSearch,
  FaFilter,
  FaCheckCircle,
  FaClock,
  FaExclamationTriangle,
  FaTrash,
  FaBox,
  FaCheck,
  FaEye,
  FaTimes,
  FaDownload,
  FaCube,
} from "react-icons/fa";
import "./Admin-dashboard.css";
import { buildApiUrl } from "../config/api";
import TshirtPreview3D from "../components/TshirtCustomizer/TshirtPreview3D";
import CapPreview3D from "../components/CapCustomizer/CapPreview3D";
import MugPreview3D from "../components/MugCustomizer/MugPreview3D";
import NotebookPreview3D from "../components/NotebookCustomizer/NotebookPreview3D";
import JerseyPreview3D from "../components/JerseyCustomizer/JerseyPreview3D";
import FlatPreview3D from "../components/FlatCustomizer/FlatPreview3D";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import AppModal from "../components/AppModal";
import { adminFetch } from "../utils/adminFetch";

// Extract pcs count per item pack from customizations object
function getPcsFromCustomizations(customizations) {
  if (!customizations) return 1;

  const qtyStr =
    typeof customizations.quantity === "object"
      ? customizations.quantity?.label || ""
      : String(customizations.quantity || "");

  const match = qtyStr.match(/(\d+)\s*(?:pc|pcs|piece|pieces)?/i);
  if (match && match[1]) {
    const parsed = parseInt(match[1], 10);
    return parsed > 0 ? parsed : 1;
  }

  return 1;
}

// Rush order helpers — an order/item is "rush" if any item's
// customizations carries isRushOrder; fee is summed across items.
function orderHasRushOrder(order) {
  return (order.items || []).some((item) => item.customizations?.isRushOrder);
}

function getOrderRushFee(order) {
  return (order.items || []).reduce(
    (sum, item) => sum + Number(item.customizations?.rushOrderFee || 0),
    0,
  );
}

function inferCustomizerCategory({ category, name }) {
  const rawCategory = String(category || "").toLowerCase();
  const label = String(name || "").toLowerCase();

  if (label.includes("flyer")) return "flyers";
  if (label.includes("poster")) return "posters";
  if (label.includes("sticker") || label.includes("label")) return "stickers";
  if (label.includes("hang tag") || label.includes("hangtag")) {
    return "hang_tags";
  }
  if (label.includes("tarpaulin") || label.includes("banner")) {
    return "banners";
  }
  if (label.includes("business card") || label.includes("calling card")) {
    return "business_card";
  }
  if (label.includes("thank you")) return "thank_you_card";
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

function render3DPreview(ai3DPreviewModal) {
  const category = inferCustomizerCategory({
    name: ai3DPreviewModal.productName,
    category: ai3DPreviewModal.design?.type || ai3DPreviewModal.design?.category
  });

  const baseColor =
    ai3DPreviewModal.design?.shirtColor ||
    ai3DPreviewModal.design?.productColor ||
    ai3DPreviewModal.design?.baseColor ||
    "#ffffff";

  const zoneDesigns = ai3DPreviewModal.design?.zones || {
    front: { imageUrl: ai3DPreviewModal.imageUrl },
  };

 const zoneTexts = ai3DPreviewModal.design?.zoneTexts || {}; 

  console.log("FULL DESIGN OBJECT:", ai3DPreviewModal.design);
  console.log("ZONE TEXTS:", zoneTexts);

  if (category === "tshirt") {
    return (
      <TshirtPreview3D
        modelPath="/models/tshirt.glb"
        shirtColor={baseColor}
        zoneDesigns={zoneDesigns}
        zoneTexts={zoneTexts}
        fillParent={true}
      />
    );
  }
  if (category === "cap") {
    return (
      <CapPreview3D
        modelPath="/models/cap.glb"
        shirtColor={baseColor}
        zoneDesigns={zoneDesigns}
        zoneTexts={zoneTexts}
        fillParent={true}
        projectionMode="decal"
        decalScale={{
          front: {
            w: 0.34,
            h: 0.3,
            depth: 0.32,
            surfaceOffset: 0.025,
            y: -0.08,
            z: -0.32,
          },
          back: {
            w: 0.32,
            h: 0.28,
            depth: 0.28,
            surfaceOffset: 0.015,
            y: 0.15,
          },
          left_side: {
            w: 0.28,
            h: 0.28,
            depth: 0.28,
            surfaceOffset: 0.015,
            y: 0.1,
            z: -0.15,
          },
          right_side: {
            w: 0.28,
            h: 0.28,
            depth: 0.28,
            surfaceOffset: 0.015,
            y: 0.1,
            z: -0.15,
          },
        }}
      />
    );
  }
  if (category === "mug") {
    return (
      <MugPreview3D
        modelPath="/models/mug.glb"
        shirtColor={baseColor}
        zoneDesigns={zoneDesigns}
        zoneTexts={zoneTexts}
        fillParent={true}
      />
    );
  }
  if (category === "notebook") {
    return (
      <NotebookPreview3D
        modelPath="/models/notebook.glb"
        shirtColor={baseColor}
        zoneDesigns={zoneDesigns}
        zoneTexts={zoneTexts}
        fillParent={true}
      />
    );
  }
  if (category === "jersey") {
    return (
      <JerseyPreview3D
        modelPath="/models/jersey.glb"
        shirtColor={baseColor}
        zoneDesigns={zoneDesigns}
        fillParent={true}
      />
    );
  }

  return (
    <FlatPreview3D
      productType={category}
      baseColor={baseColor}
      zoneDesigns={zoneDesigns}
      zoneTexts={zoneTexts}
      fillParent={true}
    />
  );
}

const formatCustomizationValue = (v) => {
  if (!v) return "";
  let parsed = v;
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://")
    ) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <a
            href={trimmed}
            download
            rel="noopener noreferrer"
            style={{
              color: "#2563eb",
              textDecoration: "none",
              fontWeight: "600",
              fontSize: "11px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <FaDownload size={10} /> Download Attachment
          </a>
        </div>
      );
    }
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {
        // Not valid JSON
      }
    }
  }

  if (typeof parsed === "object" && parsed !== null) {
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => formatCustomizationValue(item))
        .join(", ");
    }
    return Object.entries(parsed)
      .map(([key, val]) => {
        const displayK = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());
        const displayV =
          typeof val === "object" ? JSON.stringify(val) : val;
        return `${displayK}: ${displayV}`;
      })
      .join(" | ");
  }



  const str = String(parsed);
  if (str.includes("|")) {
    const parts = str.split("|");
    const label = parts[0].trim();
    const price = parts[1].trim();
    if (price.toLowerCase() === "free") {
      return `${label} (Free)`;
    }
    return `${label} (+${price})`;
  }
  return str;
};

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ordersQuery, setOrdersQuery] = useState("");
  const [ordersStatus, setOrdersStatus] = useState("all");
  const [ordersBranch, setOrdersBranch] = useState("all");
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [detailOrder, setDetailOrder] = useState(null);
  const [aiPreviewModal, setAiPreviewModal] = useState(null); // { imageUrl, productName }
  const [ai3DPreviewModal, setAi3DPreviewModal] = useState(null); // { imageUrl, productName }
  const [deleteOrderTarget, setDeleteOrderTarget] = useState(null);
  const [noticeModal, setNoticeModal] = useState(null);

  const [searchParams, setSearchParams] = useSearchParams();
  // Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await adminFetch(buildApiUrl("/api/admin/orders"));
        if (!response.ok) throw new Error("Failed to fetch orders");

        const data = await response.json();

        // Transform API data to match UI format
        const transformedOrders = data.map((order) => ({
          id: `ORD-${String(order.id).padStart(4, "0")}`,
          customer: order.user
            ? `${order.user.first_name} ${order.user.last_name}`
            : "Unknown",
          total: parseFloat(order.total),
          status: order.status || "pending",
          proofApproved: Boolean(order.proofApproved),
          designReviewStatus: order.designReviewStatus || "submitted",
          designReviewNotes: order.designReviewNotes || null,
          paymentStatus:
            order.status === "cancelled"
              ? "cancelled"
              : order.payment_status || "unpaid",
          branch: order.branch?.name || "—",
          date: new Date(order.createdAt).toISOString().slice(0, 10),
          dbId: order.id,
          items: order.items || [],
        }));

        setOrders(transformedOrders);
        setError(null);
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
    
    // Refresh orders every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
  const openOrderId = searchParams.get("openOrder");
  if (openOrderId && orders.length > 0) {
    const match = orders.find((o) => String(o.dbId) === String(openOrderId));
    if (match) {
      setDetailOrder(match);
      searchParams.delete("openOrder");
      setSearchParams(searchParams, { replace: true });
    }
  }
}, [orders, searchParams, setSearchParams]);

  // Filter orders based on search query and status
  const filteredOrders = useMemo(() => {
    const q = ordersQuery.trim().toLowerCase();
    return orders
      .filter((o) => {
        const matchQuery =
          !q ||
          o.id.toLowerCase().includes(q) ||
          o.customer.toLowerCase().includes(q) ||
          String(o.total).includes(q) ||
          o.branch.toLowerCase().includes(q);

        const matchStatus =
          ordersStatus === "all" ? true : o.status === ordersStatus;

        const matchBranch =
          ordersBranch === "all" ? true : o.branch === ordersBranch;

        return matchQuery && matchStatus && matchBranch;
      })
      .sort((a, b) => b.dbId - a.dbId); // Sort descending - newest orders first
  }, [orders, ordersQuery, ordersStatus, ordersBranch]);

  const STATUS_GROUPS = [
    "pending",
    "confirmed",
    "processing",
    "delivered",
    "completed",
    "return_requested",
    "cancelled",
  ];

  const STATUS_LABELS = {
    pending: "Pending",
    confirmed: "Confirmed",
    processing: "Processing",
    delivered: "Delivered",
    completed: "Completed",
    return_requested: "Return Requested",
    cancelled: "Cancelled",
  };

  const groupedOrders = useMemo(() => {
    return STATUS_GROUPS.reduce((groups, status) => {
      const ordersForStatus = filteredOrders.filter(
        (order) => order.status === status,
      );

      if (ordersForStatus.length > 0) {
        groups[status] = ordersForStatus;
      }

      return groups;
    }, {});
  }, [filteredOrders]);

  // Calculate stats from orders
  const ordersStats = useMemo(() => {
    const pending = orders.filter((o) => o.status === "pending").length;
    const confirmed = orders.filter((o) => o.status === "confirmed").length;
    const processing = orders.filter((o) => o.status === "processing").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const completed = orders.filter((o) => o.status === "completed").length;
    const cancelled = orders.filter((o) => o.status === "cancelled").length;
    return {
      pending,
      confirmed,
      processing,
      delivered,
      completed,
      cancelled,
      total: orders.length,
    };
  }, [orders]);

  const handleClearFilters = () => {
    setOrdersQuery("");
    setOrdersStatus("all");
  };

  // ✅ Delete order
  const confirmDeleteOrder = async () => {
    const order = deleteOrderTarget;
    if (!order) return;
    setDeleteOrderTarget(null);

    try {
      const res = await adminFetch(buildApiUrl(`/api/orders/${order.dbId}`), {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to delete order");
      }

      setOrders((prev) => prev.filter((o) => o.dbId !== order.dbId));
      const pcsText =
        data.totalPcsRestored !== undefined
          ? `${data.totalPcsRestored} total pcs were restored.`
          : "stock was restored.";
      setNoticeModal({
        title: "Order deleted",
        message: `${order.id} was deleted and ${pcsText}`,
        tone: "success",
      });
    } catch (err) {
      console.error("Error deleting order:", err);
      setNoticeModal({
        title: "Could not delete order",
        message: err.message || "Error deleting order",
        tone: "danger",
      });
    }
  };

  const handleDeleteOrder = (order) => {
    setDeleteOrderTarget(order);
  };

  const [reviewNotesDraft, setReviewNotesDraft] = useState("");
  const [reviewSubmittingStatus, setReviewSubmittingStatus] = useState(null);

  const submitDesignReview = async (order, status) => {
    setReviewSubmittingStatus(status);
    try {
      const res = await adminFetch(
        buildApiUrl(`/api/orders/${order.dbId}/design-review`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, notes: reviewNotesDraft.trim() || null }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to update design review");

      const patch = {
        designReviewStatus: status,
        designReviewNotes: reviewNotesDraft.trim() || null,
        ...(status === "approved" ? { proofApproved: true } : {}),
        ...(status === "needs_revision" || status === "rejected"
          ? { proofApproved: false }
          : {}),
      };
      setOrders((prev) =>
        prev.map((o) => (o.dbId === order.dbId ? { ...o, ...patch } : o)),
      );
      setDetailOrder((current) =>
        current?.dbId === order.dbId ? { ...current, ...patch } : current,
      );
      setReviewNotesDraft("");
      setNoticeModal({
        title: "Design review updated",
        message:
          status === "approved"
            ? `${order.id} is approved. The customer can now pay.`
            : `${order.id}'s design status is now "${status.replace(/_/g, " ")}".`,
        tone: status === "needs_revision" || status === "rejected" ? "warning" : "success",
      });
    } catch (err) {
      console.error("Error updating design review:", err);
      setNoticeModal({
        title: "Could not update design review",
        message: err.message || "Error updating design review",
        tone: "danger",
      });
    } finally {
      setReviewSubmittingStatus(null);
    }
  };

  const approveOrderDesign = async (order) => {
    try {
      const res = await adminFetch(
        buildApiUrl(`/api/orders/${order.dbId}/approve-design`),
        { method: "POST" },
      );
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to approve design");
      }

      setOrders((prev) =>
        prev.map((o) =>
          o.dbId === order.dbId ? { ...o, proofApproved: true } : o,
        ),
      );
      setDetailOrder((current) =>
        current?.dbId === order.dbId
          ? { ...current, proofApproved: true }
          : current,
      );
      setNoticeModal({
        title: "Design approved",
        message: `${order.id} is approved. The customer can now pay.`,
        tone: "success",
      });
    } catch (err) {
      console.error("Error approving design:", err);
      setNoticeModal({
        title: "Could not approve design",
        message: err.message || "Error approving design",
        tone: "danger",
      });
    }
  };

  // ✅ Update order status
  const updateOrderStatus = async (order, newStatus) => {
    try {
      const res = await adminFetch(buildApiUrl(`/api/orders/${order.dbId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error("Failed to update order status");

      const data = await res.json().catch(() => ({}));
      let stockMsg = "";

      if (data.stockRestored > 0) {
        stockMsg = ` (${data.stockRestored} total pcs restored to stock)`;
      } else if (data.stockDeducted > 0) {
        stockMsg = ` (${data.stockDeducted} total pcs deducted from stock)`;
      }

      // ✅ Update local state
      setOrders((prev) =>
        prev.map((o) =>
          o.dbId === order.dbId
            ? {
                ...o,
                status: newStatus,
                paymentStatus:
                  newStatus === "cancelled"
                    ? "cancelled"
                    : data.order?.payment_status || o.paymentStatus,
              }
            : o,
        ),
      );

      setDetailOrder((current) =>
        current?.dbId === order.dbId
          ? {
              ...current,
              status: newStatus,
              paymentStatus:
                newStatus === "cancelled"
                  ? "cancelled"
                  : data.order?.payment_status || current.paymentStatus,
            }
          : current,
      );

      const messages = {
        processing: "marked as processing",
        delivered: "marked as delivered",
        completed: "marked as completed",
        cancelled: "cancelled",
      };

      setNoticeModal({
        title: "Order status updated",
        message:
          `Order ${order.id} was ` +
          `${messages[newStatus] || "updated"}${stockMsg}.`,
        tone: "success",
      });
    } catch (err) {
      console.error("Error updating order status:", err);
      setNoticeModal({
        title: "Could not update order",
        message: err.message || "Error updating order status",
        tone: "danger",
      });
    }
  };

  // Handlers for different status transitions
  const handleProcessOrder = (order) => updateOrderStatus(order, "processing");
  const handleDeliverOrder = (order) => updateOrderStatus(order, "delivered");
  const handleCompleteOrder = (order) => updateOrderStatus(order, "completed");

  // Download AI-generated image
  const handleDownloadAiImage = async (imageUrl, productName) => {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error("Failed to download image");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${productName.replace(/\s+/g, "-")}-ai-design.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error downloading AI image:", err);
      setNoticeModal({
        title: "Download failed",
        message: "Failed to download image",
        tone: "danger"
      });
    }
  };

  if (loading) {
    return (
      <div className="dashpage dashpage-orders">
        <div className="dashpage-loading">Loading orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashpage dashpage-orders">
        <div className="dashpage-error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="dashpage dashpage-orders">
      <div className="admin-page-header">
        <h1 className="admin-page-header-title">Orders</h1>
        <p className="admin-page-header-desc">
          Track and manage every customer order.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="dashpage-stats">
        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">Total</div>
          <div className="dashpage-stat-value">{ordersStats.total}</div>
        </div>

        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">Pending</div>
          <div className="dashpage-stat-value orange">
            {ordersStats.pending}
          </div>
        </div>

        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">Confirmed</div>
          <div className="dashpage-stat-value grey">
            {ordersStats.confirmed}
          </div>
        </div>

        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">Processing</div>
          <div className="dashpage-stat-value blue">
            {ordersStats.processing}
          </div>
        </div>

        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">Delivered</div>
          <div className="dashpage-stat-value green">
            {ordersStats.delivered}
          </div>
        </div>

        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">Completed</div>
          <div className="dashpage-stat-value green">
            {ordersStats.completed}
          </div>
        </div>

        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">Cancelled</div>
          <div className="dashpage-stat-value red">
            {ordersStats.cancelled}
          </div>
        </div>
      </div>

      {/* Toolbar with Search and Filters */}
      <div className="dashpage-toolbar">
        <div className="dashpage-search">
          <span className="dashpage-search-icon">
            <FaSearch size={14} />
          </span>

          <input
            type="text"
            placeholder="Search order ID, customer, total..."
            value={ordersQuery}
            onChange={(e) => setOrdersQuery(e.target.value)}
          />
        </div>

        <div className="dashpage-filters">
          <select
            value={ordersStatus}
            onChange={(e) => setOrdersStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="return_requested">Return Requested</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={ordersBranch}
            onChange={(e) => setOrdersBranch(e.target.value)}
          >
            <option value="all">All Branches</option>
            {[...new Set(orders.map((o) => o.branch))]
              .filter((b) => b !== "—")
              .sort()
              .map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
          </select>

          <button
            className="dashpage-filterbtn"
            type="button"
            onClick={handleClearFilters}
            title="Clear filters"
          >
            <FaFilter />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="dashpage-table-card">
        <table className="dashpage-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Branch</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {Object.entries(groupedOrders).map(([statusKey, statusOrders]) => (
              <React.Fragment key={statusKey}>
                <tr>
                  <td colSpan="6" className="dashpage-category-row">
                    {STATUS_LABELS[statusKey] || statusKey}
                  </td>
                </tr>

                {statusOrders.map((o) => (
                  <React.Fragment key={o.dbId}>
                <tr>
                  <td data-label="Order">
                    <div className="dashpage-rowmain">
                      <div className="dashpage-rowtitle">
                        {o.id}
                        {orderHasRushOrder(o) && (
                          <span
                            style={{
                              marginLeft: 6,
                              fontSize: 9,
                              fontWeight: 700,
                              color: "#9333ea",
                              background: "rgba(147, 51, 234, 0.12)",
                              border: "1px solid rgba(147, 51, 234, 0.35)",
                              borderRadius: 999,
                              padding: "1px 6px",
                            }}
                            title="Rush order"
                          >
                            ⚡
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td data-label="Customer">{o.customer}</td>
                  <td data-label="Branch">{o.branch}</td>
                  <td data-label="Total">₱ {o.total.toLocaleString()}</td>
                  <td data-label="Status">
                    <span className={`dashpage-pill status-${o.status}`}>
                      {o.status === "pending" && (
                        <FaClock style={{ marginRight: 6 }} />
                      )}
                      {o.status === "processing" && (
                        <FaClock style={{ marginRight: 6 }} />
                      )}
                      {o.status === "completed" && (
                        <FaCheckCircle style={{ marginRight: 6 }} />
                      )}
                      {o.status === "return_requested" && (
                        <FaExclamationTriangle style={{ marginRight: 6 }} />
                      )}
                      {o.status === "cancelled" && (
                        <FaExclamationTriangle style={{ marginRight: 6 }} />
                      )}
                      {o.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td data-label="Date">{o.date}</td>
                  <td data-label="Actions">
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        flexWrap: "wrap",
                        justifyContent: "left",
                      }}
                    >
                      {/* View Details button */}
                      <button
                        type="button"
                        className="dashaction-btn ghost"
                        onClick={() => setDetailOrder(o)}
                        title="View order details"
                      >
                        <FaEye size={11} />
                        Details
                      </button>
                      {/* Items expand button */}
                      <button
                        type="button"
                        className={`dashaction-btn ${expandedOrderId === o.dbId ? "blue" : "ghost"}`}
                        onClick={() =>
                          setExpandedOrderId(
                            expandedOrderId === o.dbId ? null : o.dbId,
                          )
                        }
                        title="View items"
                      >
                        {expandedOrderId === o.dbId
                          ? "Hide Items"
                          : `Items (${o.items.length})`}
                      </button>
                      {!o.proofApproved &&
                        o.paymentStatus !== "paid" &&
                        !["cancelled", "completed"].includes(o.status) && (
                          <button
                            type="button"
                            className="dashaction-btn green"
                            onClick={() => approveOrderDesign(o)}
                            title="Approve design and allow payment"
                          >
                            <FaCheck size={11} />
                            Approve
                          </button>
                        )}
                      {o.proofApproved &&
                        o.paymentStatus !== "paid" &&
                        !["cancelled", "completed"].includes(o.status) && (
                        <span
                          title="Design approved; waiting for customer payment"
                          className="dashpage-pill status-completed"
                          style={{
                            fontSize: "11px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            padding: "6px 8px",
                            borderRadius: "4px",
                          }}
                        >
                          <FaCheck size={11} />
                          Approved
                        </span>
                      )}
                      {/* Process button - pending or confirmed orders */}
                      {(o.status === "pending" ||
                        o.status === "confirmed") && (
                        <button
                          type="button"
                          className="dashaction-btn blue"
                          onClick={() => handleProcessOrder(o)}
                          title="Mark as processing"
                        >
                          <FaClock size={11} />
                          Process
                        </button>
                      )}

                      {/* Deliver button - for processing orders */}
                      {o.status === "processing" && (
                        <button
                          type="button"
                          className="dashaction-btn green"
                          onClick={() => handleDeliverOrder(o)}
                          title="Mark as delivered"
                        >
                          <FaBox size={11} />
                          Deliver
                        </button>
                      )}

                      {/* Complete button - for delivered orders */}
                      {o.status === "delivered" && (
                        <button
                          type="button"
                          className="dashaction-btn green"
                          onClick={() => handleCompleteOrder(o)}
                          title="Mark as completed"
                        >
                          <FaCheck size={11} />
                          Complete
                        </button>
                      )}

                      {/* Delete button - not available for completed orders */}
                      {o.status !== "completed" && (
                        <button
                          type="button"
                          className="dashaction-btn red"
                          onClick={() => handleDeleteOrder(o)}
                          title="Delete order"
                        >
                          <FaTrash size={11} />
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>

                {/* Expandable items row */}
                {expandedOrderId === o.dbId && (
                  <tr key={`${o.dbId}-items`}>
                    <td
                      colSpan="6"
                      style={{
                        padding: "0 12px 12px",
                        background: "rgba(15, 23, 42, 0.4)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          paddingTop: 10,
                        }}
                      >
                        {o.items.length === 0 && (
                          <p style={{ margin: 0, fontSize: 13, color: "#cbd5e1" }}>
                            No items.
                          </p>
                        )}
                        {o.items.map((item) => {
                          const design = item.customizations?.design;
                          const productImg = item.product?.images?.[0];
                          const productName =
                            item.customizations?.product_title ||
                            item.product?.name ||
                            `Product #${item.productId}`;
                          return (
                            <div
                              key={item.id}
                              style={{
                                display: "flex",
                                alignItems: "flex-start",
                                gap: 10,
                                background: "#f8fafc",
                                borderRadius: 8,
                                padding: "10px 12px",
                                border: "1px solid #e2e8f0",
                              }}
                            >
                              {/* Product thumbnail */}
                              {productImg && (
                                <img
                                  src={productImg}
                                  alt={productName}
                                  style={{
                                    width: 52,
                                    height: 52,
                                    objectFit: "cover",
                                    borderRadius: 6,
                                    border: "1px solid #cbd5e1",
                                    flexShrink: 0,
                                  }}
                                />
                              )}
                              {/* AI design thumbnail */}
                              {design?.generatedImageUrl && (
                                <div
                                  style={{
                                    position: "relative",
                                    flexShrink: 0,
                                    cursor: "pointer",
                                  }}
                                  onClick={() =>
                                    setAiPreviewModal({
                                      imageUrl: design.generatedImageUrl,
                                      productName,
                                      design,
                                    })
                                  }
                                  title="Click to preview AI design"
                                >
                                  <img
                                    src={design.generatedImageUrl}
                                    alt="AI Design"
                                    style={{
                                      width: 52,
                                      height: 52,
                                      objectFit: "cover",
                                      borderRadius: 6,
                                      border: "2px solid #d4af37",
                                    }}
                                  />
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#0f172a" }}>
                                  {productName}
                                  {item.customizations?.isRushOrder && (
                                    <span
                                      style={{
                                        marginLeft: 8,
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: "#9333ea",
                                        background: "rgba(147, 51, 234, 0.12)",
                                        border: "1px solid rgba(147, 51, 234, 0.35)",
                                        borderRadius: 999,
                                        padding: "2px 8px",
                                      }}
                                    >
                                      ⚡ RUSH +₱{Number(item.customizations.rushOrderFee || 0).toLocaleString()}
                                    </span>
                                  )}
                                </p>
                                {design?.prompt && (
                                  <p
                                    style={{
                                      margin: "3px 0 0",
                                      fontSize: 11,
                                      color: "#475569",
                                      fontStyle: "italic",
                                    }}
                                  >
                                    "
                                    {design.prompt.length > 100
                                      ? design.prompt.slice(0, 100) + "…"
                                      : design.prompt}
                                    "
                                  </p>
                                )}
                                {item.customizations?.sizeSurcharge > 0 && (
                                  <p style={{ margin: "3px 0 0", fontSize: 11, color: "#475569" }}>
                                    <strong>Size Surcharge:</strong> +₱
                                    {Number(item.customizations.sizeSurcharge).toLocaleString()}
                                  </p>
                                )}
                                <p
                                  style={{
                                    margin: "3px 0 0",
                                    fontSize: 12,
                                    color: "#475569",
                                  }}
                                >
                                  Qty: {item.quantity}{" "}
                                  {getPcsFromCustomizations(
                                    item.customizations,
                                  ) > 1
                                    ? `(${
                                        getPcsFromCustomizations(
                                          item.customizations,
                                        ) * item.quantity
                                      } total pcs deducted)`
                                    : "pc(s)"}
                                </p>
                                <button
                                  type="button"
                                  className="dashaction-btn blue"
                                  style={{
                                    marginTop: 8,
                                    padding: "6px 10px",
                                    fontSize: "11px",
                                    gap: "4px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    cursor: "pointer",
                                    background: "#2563eb",
                                    border: "none",
                                    color: "#fff",
                                    borderRadius: "4px",
                                    fontWeight: "600",
                                  }}
                                  onClick={() =>
                                    setAi3DPreviewModal({
                                      imageUrl:
                                        design?.generatedImageUrl || "",
                                      productName,
                                      design: design || {},
                                    })
                                  }
                                >
                                  <FaCube size={11} />
                                  3D Preview
                                </button>
                              </div>
                              <div
                                style={{
                                  whiteSpace: "nowrap",
                                  fontWeight: 700,
                                  fontSize: 13,
                                  color: "#059669",
                                  paddingTop: 2,
                                }}
                              >
                                ₱{parseFloat(item.unit_price).toLocaleString()}{" "}
                                × {item.quantity}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}

            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan="6" className="dashpage-empty">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Order Details Modal */}
      {detailOrder && createPortal(
        <div
          className="ad-logout-overlay"
          onClick={() => setDetailOrder(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="ad-logout-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "16px",
                borderBottom: "1px solid #e2e8f0",
                marginBottom: "16px",
              }}
            >
              <div>
                <h3 className="ad-logout-title" style={{ margin: 0 }}>
                  {detailOrder.id}
                </h3>
                <span style={{ fontSize: 12, color: "#475569" }}>
                  {detailOrder.date}
                </span>
              </div>
              <button
                onClick={() => setDetailOrder(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#475569",
                  padding: 4,
                }}
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Order Info */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                paddingBottom: "16px",
                borderBottom: "1px solid #e2e8f0",
                marginBottom: "16px",
              }}
            >
              <div style={{ flex: 1, minWidth: 140 }}>
                <div
                  style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}
                >
                  CUSTOMER
                </div>
                <div
                  style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}
                >
                  {detailOrder.customer}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 120 }}>
                <div
                  style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}
                >
                  STATUS
                </div>
                <span
                  className={`dashpage-pill status-${detailOrder.status}`}
                  style={{ fontSize: 12 }}
                >
                  {detailOrder.status === "pending" && (
                    <FaClock style={{ marginRight: 5 }} />
                  )}
                  {detailOrder.status === "processing" && (
                    <FaClock style={{ marginRight: 5 }} />
                  )}
                  {detailOrder.status === "completed" && (
                    <FaCheckCircle style={{ marginRight: 5 }} />
                  )}
                  {detailOrder.status === "cancelled" && (
                    <FaExclamationTriangle style={{ marginRight: 5 }} />
                  )}
                  {detailOrder.status}
                </span>
              </div>
              {!["cancelled", "completed"].includes(detailOrder.status) && (
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#475569",
                      marginBottom: 2,
                    }}
                  >
                    DESIGN
                  </div>
                                    <span
                    className={`dashpage-pill ${
                      detailOrder.proofApproved
                        ? "status-completed"
                        : detailOrder.designReviewStatus === "needs_revision"
                        ? "status-cancelled"
                        : "status-pending"
                    }`}
                    style={{ fontSize: 12 }}
                  >
                    {detailOrder.proofApproved ? (
                      <>
                        <FaCheckCircle style={{ marginRight: 5 }} />
                        Approved
                      </>
                    ) : detailOrder.designReviewStatus === "needs_revision" ? (
                      <>
                        <FaExclamationTriangle style={{ marginRight: 5 }} />
                        Needs Revision
                      </>
                    ) : detailOrder.designReviewStatus === "under_review" ? (
                      <>
                        <FaClock style={{ marginRight: 5 }} />
                        Under Review
                      </>
                    ) : (
                      <>
                        <FaClock style={{ marginRight: 5 }} />
                        Needs approval
                      </>
                    )}
                  </span>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 120 }}>
                <div
                  style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}
                >
                  PAYMENT
                </div>
                <div
                  style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}
                >
                  {detailOrder.paymentStatus?.replace(/_/g, " ") || "unpaid"}
                </div>
              </div>
              {orderHasRushOrder(detailOrder) && (
                <div style={{ flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}>
                    RUSH ORDER
                  </div>
                  <span
                    style={{
                      color: "#9333ea",
                      background: "rgba(147, 51, 234, 0.12)",
                      border: "1px solid rgba(147, 51, 234, 0.35)",
                      fontWeight: 700,
                      fontSize: 12,
                      padding: "3px 10px",
                      borderRadius: 999,
                      display: "inline-block",
                    }}
                  >
                    ⚡ +₱{getOrderRushFee(detailOrder).toLocaleString()}
                  </span>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 120 }}>
                <div
                  style={{ fontSize: 11, color: "#475569", marginBottom: 2 }}
                >
                  ORDER TOTAL
                </div>
                <div
                  style={{ fontSize: 16, fontWeight: 700, color: "#059669" }}
                >
                  ₱ {detailOrder.total.toLocaleString()}
                </div>
              </div>
            </div>

              {detailOrder.paymentStatus !== "paid" &&
              !["cancelled", "completed"].includes(detailOrder.status) && (
                <div
                  style={{
                    paddingBottom: "16px",
                    borderBottom: "1px solid #e2e8f0",
                    marginBottom: "16px",
                  }}
                >
                  {detailOrder.designReviewStatus &&
                    detailOrder.designReviewStatus !== "submitted" && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "#475569",
                          marginBottom: 8,
                        }}
                      >
                        Current status:{" "}
                        <strong>
                          {detailOrder.designReviewStatus.replace(/_/g, " ")}
                        </strong>
                        {detailOrder.designReviewNotes && (
                          <> — "{detailOrder.designReviewNotes}"</>
                        )}
                      </div>
                    )}
                  <textarea
                    placeholder="Feedback for the customer (optional for approval, recommended for revision requests)"
                    value={reviewNotesDraft}
                    onChange={(e) => setReviewNotesDraft(e.target.value)}
                    rows={2}
                    style={{
                      width: "100%",
                      fontSize: 13,
                      padding: "8px 10px",
                      borderRadius: 6,
                      border: "1px solid #cbd5e1",
                      marginBottom: 10,
                      resize: "vertical",
                      fontFamily: "inherit",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button
                      type="button"
                      className="dashaction-btn"
                      disabled={reviewSubmittingStatus !== null}
                      onClick={() => submitDesignReview(detailOrder, "under_review")}
                    >
                      <FaClock size={12} />
                      {reviewSubmittingStatus === "under_review" ? "Saving…" : "Mark Under Review"}
                    </button>
                    <button
                      type="button"
                      className="dashaction-btn"
                      style={{ color: "#b45309", borderColor: "#fde68a" }}
                      disabled={reviewSubmittingStatus !== null}
                      onClick={() => submitDesignReview(detailOrder, "needs_revision")}
                    >
                      Needs Revision
                    </button>
                    {!detailOrder.proofApproved && (
                      <button
                        type="button"
                        className="dashaction-btn green"
                        disabled={reviewSubmittingStatus !== null}
                        onClick={() => submitDesignReview(detailOrder, "approved")}
                      >
                        <FaCheck size={12} />
                        {reviewSubmittingStatus === "approved" ? "Saving…" : "Approve Design"}
                      </button>
                    )}
                  </div>
                </div>
              )}

            {/* Items */}
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#475569",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                Items ({detailOrder.items.length})
              </div>
              {detailOrder.items.length === 0 && (
                <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
                  No items.
                </p>
              )}
              <div
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                {detailOrder.items.map((item) => {
                  const design = item.customizations?.design;
                  const productImg = item.product?.images?.[0];
                  const productName =
                    item.customizations?.product_title ||
                    item.product?.name ||
                    `Product #${item.productId}`;
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        background: "#f8fafc",
                        borderRadius: 8,
                        padding: "10px 12px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      {productImg && (
                        <img
                          src={productImg}
                          alt={productName}
                          style={{
                            width: 56,
                            height: 56,
                            objectFit: "cover",
                            borderRadius: 6,
                            border: "1px solid #cbd5e1",
                            flexShrink: 0,
                          }}
                        />
                      )}
                      {design?.generatedImageUrl && (
                        <div
                          style={{
                            position: "relative",
                            flexShrink: 0,
                            cursor: "pointer",
                          }}
                          onClick={() =>
                            setAiPreviewModal({
                              imageUrl: design.generatedImageUrl,
                              productName,
                              design,
                            })
                          }
                          title="Click to preview AI design"
                        >
                          <img
                            src={design.generatedImageUrl}
                            alt="AI Design"
                            style={{
                              width: 56,
                              height: 56,
                              objectFit: "cover",
                              borderRadius: 6,
                              border: "2px solid #d4af37",
                            }}
                          />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#0f172a" }}>
                          {productName}
                          {item.customizations?.isRushOrder && (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 10,
                                fontWeight: 700,
                                color: "#9333ea",
                                background: "rgba(147, 51, 234, 0.12)",
                                border: "1px solid rgba(147, 51, 234, 0.35)",
                                borderRadius: 999,
                                padding: "2px 8px",
                              }}
                            >
                              ⚡ RUSH +₱{Number(item.customizations.rushOrderFee || 0).toLocaleString()}
                            </span>
                          )}
                        </p>
                        {design?.prompt && (
                          <p
                            style={{
                              margin: "3px 0 0",
                              fontSize: 11,
                              color: "#475569",
                              fontStyle: "italic",
                            }}
                          >
                            "
                            {design.prompt.length > 120
                              ? design.prompt.slice(0, 120) + "…"
                              : design.prompt}
                            "
                          </p>
                        )}
                        {item.customizations &&
                          Object.entries(item.customizations)
                            .filter(
                              ([k]) =>
                                ![
                                  "design",
                                  "isRushOrder",
                                  "rushOrderFee",
                                  "sizeSurcharge",
                                ].includes(k),
                            )
                            .map(([k, v]) => {
                              const displayKey = k
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (char) =>
                                  char.toUpperCase(),
                                );
                              const valElement = formatCustomizationValue(v);
                              if (!valElement) return null;
                              return (
                                <p
                                  key={k}
                                  style={{
                                    margin: "2px 0 0",
                                    fontSize: 11,
                                    color: "#475569",
                                  }}
                                >
                                  <strong>{displayKey}:</strong>{" "}
                                  {valElement}
                                </p>
                              );
                            })}
                        {item.customizations?.sizeSurcharge > 0 && (
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#475569" }}>
                            <strong>Size Surcharge:</strong> +₱
                            {Number(item.customizations.sizeSurcharge).toLocaleString()}
                          </p>
                        )}
                        {item.customizations?.isRushOrder && (
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: "#9333ea", fontWeight: 600 }}>
                            ⚡ Rush Order: +₱
                            {Number(item.customizations.rushOrderFee || 0).toLocaleString()}
                          </p>
                        )}
                        <p
                          style={{
                            margin: "4px 0 0",
                            fontSize: 12,
                            color: "#475569",
                          }}
                        >
                          Qty: {item.quantity}{" "}
                          {getPcsFromCustomizations(
                            item.customizations,
                          ) > 1
                            ? `(${
                                getPcsFromCustomizations(
                                  item.customizations,
                                ) * item.quantity
                              } total pcs deducted)`
                            : "pc(s)"}
                        </p>
                        <button
                          type="button"
                          className="dashaction-btn blue"
                          style={{
                            marginTop: 8,
                            padding: "6px 10px",
                            fontSize: "11px",
                            gap: "4px",
                            display: "inline-flex",
                            alignItems: "center",
                            cursor: "pointer",
                            background: "#2563eb",
                            border: "none",
                            color: "#fff",
                            borderRadius: "4px",
                            fontWeight: "600",
                          }}
                          onClick={() =>
                            setAi3DPreviewModal({
                              imageUrl:
                                design?.generatedImageUrl || "",
                              productName,
                              design: design || {},
                            })
                          }
                        >
                          <FaCube size={11} />
                          3D Preview
                        </button>
                      </div>
                      <div
                        style={{
                          whiteSpace: "nowrap",
                          fontWeight: 700,
                          fontSize: 13,
                          color: "#059669",
                          paddingTop: 2,
                        }}
                      >
                        ₱{parseFloat(item.unit_price).toLocaleString()}
                        <div
                          style={{
                            fontWeight: 400,
                            fontSize: 11,
                            color: "#475569",
                          }}
                        >
                          × {item.quantity} = ₱
                          {(
                            parseFloat(item.unit_price) * item.quantity
                          ).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* AI Image Preview Modal */}
      {aiPreviewModal && createPortal(
        <div
          className="ad-logout-overlay"
          onClick={() => setAiPreviewModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="ad-logout-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 600,
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "16px",
                borderBottom: "1px solid #e2e8f0",
                marginBottom: "16px",
              }}
            >
              <h3 className="ad-logout-title" style={{ margin: 0 }}>
                AI Generated Design
              </h3>
              <button
                onClick={() => setAiPreviewModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#475569",
                  padding: 4,
                  fontSize: 20,
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Preview Image / Zones */}
            <div
              style={{
                padding: "10px 0",
                display: "flex",
                flexDirection: "column",
                gap: "20px",
                maxHeight: "60vh",
                overflowY: "auto",
              }}
            >
              {aiPreviewModal.design?.zones &&
              Object.keys(aiPreviewModal.design.zones).length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "16px",
                    width: "100%",
                  }}
                >
                  {Object.entries(aiPreviewModal.design.zones)
                    .filter(([_, z]) => z?.imageUrl)
                    .map(([zoneId, zoneData]) => {
                      const zoneLabel = zoneId
                        .replace(/_/g, " ")
                        .toUpperCase();
                      return (
                        <div
                          key={zoneId}
                          style={{
                            background: "#f8fafc",
                            borderRadius: 8,
                            padding: 12,
                            border: "1px solid #e2e8f0",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: "#475569",
                              marginBottom: 8,
                            }}
                          >
                            {zoneLabel}
                          </span>
                          <img
                            src={zoneData.imageUrl}
                            alt={zoneLabel}
                            style={{
                              width: "100%",
                              aspectRatio: "1",
                              objectFit: "contain",
                              borderRadius: 6,
                              background: "#f1f5f9",
                              border: "1px solid #cbd5e1",
                              marginBottom: 10,
                            }}
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadAiImage(
                                zoneData.imageUrl,
                                `${aiPreviewModal.productName}-${zoneLabel}`
                              )
                            }
                            className="ad-logout-btn ghost"
                            style={{
                              width: "100%",
                              height: "32px",
                              fontSize: "12px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                            }}
                          >
                            <FaDownload size={10} />
                            Download
                          </button>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <img
                    src={aiPreviewModal.imageUrl}
                    alt="AI Design Preview"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "400px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      marginBottom: 16,
                    }}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer with Download Button */}
            <div
              style={{
                paddingTop: "16px",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <button
                onClick={() => setAiPreviewModal(null)}
                className="ad-logout-btn ghost"
                style={{ height: "40px", padding: "0 16px" }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setAi3DPreviewModal({
                    imageUrl: aiPreviewModal.imageUrl,
                    productName: aiPreviewModal.productName,
                    design: aiPreviewModal.design,
                  });
                }}
                className="ad-logout-btn ghost"
                style={{
                  height: "40px",
                  padding: "0 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <FaCube size={12} />
                3D Preview
              </button>
              <button
                onClick={async () => {
                  const zones = aiPreviewModal.design?.zones;
                  if (zones && Object.keys(zones).length > 0) {
                    const entries = Object.entries(zones).filter(
                      ([_, z]) => z?.imageUrl
                    );
                    for (const [zoneId, zoneData] of entries) {
                      const zoneLabel = zoneId
                        .replace(/_/g, " ")
                        .toUpperCase();
                      await handleDownloadAiImage(
                        zoneData.imageUrl,
                        `${aiPreviewModal.productName}-${zoneLabel}`
                      );
                    }
                  } else {
                    handleDownloadAiImage(
                      aiPreviewModal.imageUrl,
                      aiPreviewModal.productName
                    );
                  }
                }}
                className="ad-logout-btn"
                style={{
                  height: "40px",
                  padding: "0 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <FaDownload size={12} />
                {aiPreviewModal.design?.zones &&
                Object.keys(aiPreviewModal.design.zones).length > 0
                  ? "Download All"
                  : "Download"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* 3D Preview Modal */}
      {ai3DPreviewModal && createPortal(
        <div
          className="ad-logout-overlay"
          onClick={() => setAi3DPreviewModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="ad-logout-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 900,
              height: "min(720px, 86vh)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: "16px",
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                marginBottom: "16px",
              }}
            >
              <h3 className="ad-logout-title" style={{ margin: 0 }}>
                3D Design Preview
              </h3>
              <button
                onClick={() => setAi3DPreviewModal(null)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#cbd5e1",
                  padding: 4,
                  fontSize: 20,
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* 3D Canvas */}
            <div
              style={{
                flex: 1,
                display: "block",
                width: "100%",
                height: "100%",
                background: "rgba(15, 23, 42, 0.3)",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              {render3DPreview(ai3DPreviewModal)}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                paddingTop: "16px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                marginTop: "16px",
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                onClick={() => setAi3DPreviewModal(null)}
                className="ad-logout-btn ghost"
                style={{ height: "40px", padding: "0 16px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <AppModal
        open={Boolean(deleteOrderTarget)}
        title="Delete this order?"
        message={
          deleteOrderTarget
            ? `Delete ${deleteOrderTarget.id}? This will restore item stock.`
            : ""
        }
        tone="danger"
        confirmText="Delete Order"
        cancelText="Cancel"
        onCancel={() => setDeleteOrderTarget(null)}
        onConfirm={confirmDeleteOrder}
      />

      <AppModal
        open={Boolean(noticeModal)}
        title={noticeModal?.title}
        message={noticeModal?.message}
        tone={noticeModal?.tone}
        onConfirm={() => setNoticeModal(null)}
      />
    </div>
  );
}

export default AdminOrders;