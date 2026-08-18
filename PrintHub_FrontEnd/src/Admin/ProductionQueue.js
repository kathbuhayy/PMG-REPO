import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  FaSearch,
  FaMoneyCheckAlt,
} from "react-icons/fa";

const STATUS_COLUMNS = [
  { id: "PENDING_FILE_CHECK", label: "Awaiting Approval", icon: <FaFileAlt /> },
  { id: "AWAITING_PAYMENT", label: "Awaiting Payment", icon: <FaMoneyCheckAlt /> },
  { id: "PRINTING_QUEUE", label: "Printing", icon: <FaPrint /> },
  { id: "QUALITY_ASSURANCE", label: "Quality Check", icon: <FaCheckDouble /> },
  { id: "PACKAGING_READY", label: "Packaging", icon: <FaBoxOpen /> },
  { id: "COMPLETED", label: "Completed", icon: <FaFlagCheckered /> },
];

const STATUS_LABELS = Object.fromEntries(STATUS_COLUMNS.map((c) => [c.id, c.label]));

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
  const [scoped, setScoped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await adminFetch(buildApiUrl("/api/admin/production-queue"));
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load queue");
      setQueue(data.queue || []);
      setScoped(!!data.scoped);
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

  const filteredQueue = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return queue;
    return queue.filter(
      (o) =>
        String(o.id).includes(q) ||
        (o.customer || "").toLowerCase().includes(q)
    );
  }, [queue, search]);

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

  // ── Staff view: table layout, matching AdminOrders' pattern ──────────
  if (scoped) {
    return (
      <div>
        {toast && (
          <div className="app-toast-container success">
            <span>{toast}</span>
          </div>
        )}

        <div className="data-table-card" style={{ marginTop: 0 }}>
          <div className="data-table-head">
            <h3>My Production Queue</h3>
            <span className="menu-badge">{filteredQueue.length}</span>
          </div>

          <div style={{ padding: "0 20px 16px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                padding: "8px 12px",
                maxWidth: "320px",
              }}
            >
              <FaSearch size={12} color="#94a3b8" />
              <input
                type="text"
                placeholder="Search by order # or customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  border: "none",
                  outline: "none",
                  fontSize: "13px",
                  width: "100%",
                }}
              />
            </div>
          </div>

          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Stage</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.length === 0 ? (
                  <tr>
                    <td className="empty-row" colSpan={6}>
                      No orders need your attention right now.
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>{order.customer}</td>
                      <td>
                        ₱{Number(order.total).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                      <td>
                        <span className={`dashpage-pill status-${order.payment_status}`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td>{STATUS_LABELS[order.productionStatus] || order.productionStatus}</td>
                      <td>
                        {NEXT_STATUS[order.productionStatus] ? (
                          (() => {
                            // AWAITING_PAYMENT is the one stage genuinely
                            // blocked by money — disable rather than let
                            // the click fail against the backend guard.
                            const paymentNotCleared =
                              order.productionStatus === "AWAITING_PAYMENT" &&
                              !["paid", "partially_paid"].includes(order.payment_status);
                            const isDisabled = busyOrderId === order.id || paymentNotCleared;

                            return (
                              <button
                                type="button"
                                onClick={() => advanceStatus(order)}
                                disabled={isDisabled}
                                title={paymentNotCleared ? "Waiting for customer payment" : undefined}
                                className="row-btn"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  background: isDisabled ? "#cbd5e1" : "#10b981",
                                  color: "#fff",
                                  border: "none",
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  cursor: isDisabled ? "not-allowed" : "pointer",
                                }}
                              >
                                {busyOrderId === order.id
                                  ? "..."
                                  : order.productionStatus === "PENDING_FILE_CHECK"
                                    ? <>Approve Design <FaArrowRight size={10} /></>
                                    : <>Advance <FaArrowRight size={10} /></>}
                              </button>
                            );
                          })()
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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