import React, { useState, useEffect, useCallback } from "react";
import { buildApiUrl } from "../config/api";
import { adminFetch } from "../utils/adminFetch";
import {
  FaPrint,
  FaCheckDouble,
  FaBoxOpen,
  FaFlagCheckered,
  FaFileAlt,
  FaExclamationTriangle,
  FaArrowRight,
  FaMoneyCheckAlt
} from "react-icons/fa";

const STATUS_COLUMNS = [
  { id: "PENDING_FILE_CHECK", label: "Awaiting Approval", icon: <FaFileAlt /> },
  { id: "AWAITING_PAYMENT", label: "Awaiting Payment", icon: <FaMoneyCheckAlt /> },
  { id: "PRINTING_QUEUE", label: "Printing", icon: <FaPrint /> },
  { id: "QUALITY_ASSURANCE", label: "Quality Check", icon: <FaCheckDouble /> },
  { id: "PACKAGING_READY", label: "Packaging", icon: <FaBoxOpen /> },
  { id: "COMPLETED", label: "Completed", icon: <FaFlagCheckered /> },
];

const NEXT_STATUS = {
  PENDING_FILE_CHECK: "AWAITING_PAYMENT",
  AWAITING_PAYMENT: "PRINTING_QUEUE",
  PRINTING_QUEUE: "QUALITY_ASSURANCE",
  QUALITY_ASSURANCE: "PACKAGING_READY",
  PACKAGING_READY: "COMPLETED",
  COMPLETED: null,
};

function ProductionQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [toast, setToast] = useState("");

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await adminFetch(buildApiUrl("/api/admin/production-queue"));
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load queue");
      setQueue(data.queue || []);
    } catch (err) {
      setError(err.message || "Failed to load production queue");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 20000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  };

  const advanceStatus = async (order) => {
    if (order.productionStatus === "PENDING_FILE_CHECK") {
      setBusyOrderId(order.id);
      try {
        const res = await adminFetch(
          buildApiUrl(`/api/orders/${order.id}/approve-design`),
          { method: "POST" }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to approve design");
        showToast(`Order #${order.id} design approved — moved to Awaiting Payment`);
        await fetchQueue();
      } catch (err) {
        showToast(err.message || "Failed to approve design");
      } finally {
        setBusyOrderId(null);
      }
      return;
    }

    const next = NEXT_STATUS[order.productionStatus];
    if (!next) return;

    setBusyOrderId(order.id);
    try {
      const res = await adminFetch(
        buildApiUrl(`/api/production/orders/${order.id}/status`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productionStatus: next }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update status");

      if (data.lowStockAlerts?.length > 0) {
        showToast(
          `Moved to ${next.replace(/_/g, " ")} — ${data.lowStockAlerts.length} material(s) below safety threshold`
        );
      } else {
        showToast(`Order #${order.id} moved to ${next.replace(/_/g, " ")}`);
      }
      await fetchQueue();
    } catch (err) {
      showToast(err.message || "Failed to update order");
    } finally {
      setBusyOrderId(null);
    }
  };

  if (loading) {
    return <div className="coming-soon"><p>Loading production queue...</p></div>;
  }

  if (error) {
    return (
      <div className="coming-soon">
        <div className="coming-soon-icon"><FaExclamationTriangle /></div>
        <h3>Couldn't load production queue</h3>
        <p>{error}</p>
      </div>
    );
  }

  // ── Admin view: full Kanban board across every stage ─────────────────
  const columns = STATUS_COLUMNS.map((col) => ({
    ...col,
    orders: queue.filter((o) => o.productionStatus === col.id),
  }));

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-header-title">Production Queue</h1>
        <p className="admin-page-header-desc">
          Orders moving through each stage of production.
        </p>
      </div>

      {toast && (
        <div className="app-toast-container success">
          <span>{toast}</span>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "16px",
        }}
      >
        {columns.map((col) => (
          <div key={col.id} className="dash-panel" style={{ minHeight: "200px" }}>
            <div className="dash-panel-head">
              <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {col.icon} {col.label}
                <span className="menu-badge" style={{ marginLeft: "auto" }}>
                  {col.orders.length}
                </span>
              </h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
              {col.orders.length === 0 && (
                <p style={{ color: "#94a3b8", fontSize: "13px" }}>No orders here</p>
              )}

              {col.orders.map((order) => (
                <div
                  key={order.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "12px",
                    background: "#fff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <strong>#{order.id}</strong>
                    <span className={`dashpage-pill status-${order.payment_status}`}>
                      {order.payment_status}
                    </span>
                  </div>
                  <p style={{ margin: "6px 0", fontSize: "13px", color: "#475569" }}>
                    {order.customer}
                  </p>
                  <p style={{ margin: "0 0 6px 0", fontSize: "12px", color: "#94a3b8" }}>
                    📍 {order.branch}
                  </p>
                  <p style={{ margin: "0 0 10px 0", fontSize: "13px", fontWeight: 600 }}>
                    ₱{Number(order.total).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>

                  {NEXT_STATUS[order.productionStatus] && (
                    <button
                      type="button"
                      onClick={() => advanceStatus(order)}
                      disabled={busyOrderId === order.id}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        fontSize: "12px",
                        border: "none",
                        color: "#fff",
                        background: busyOrderId === order.id ? "#94a3b8" : "#10b981",
                        borderRadius: "6px",
                        cursor: busyOrderId === order.id ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "4px",
                      }}
                    >
                      {busyOrderId === order.id ? "..." : <>Advance <FaArrowRight size={10} /></>}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProductionQueue;