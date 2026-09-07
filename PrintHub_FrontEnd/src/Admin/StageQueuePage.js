// StageQueue
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { buildApiUrl } from "../config/api";
import { adminFetch } from "../utils/adminFetch";
import { FaExclamationTriangle, FaArrowRight, FaSearch, FaEye, FaCube, FaTimes } from "react-icons/fa";
import { createPortal } from "react-dom";
import { render3DPreview } from "../utils/render3DPreview";

const NEXT_STATUS = {
  PENDING_FILE_CHECK: "AWAITING_PAYMENT",
  AWAITING_PAYMENT: "PRINTING_QUEUE",
  PRINTING_QUEUE: "QUALITY_ASSURANCE",
  QUALITY_ASSURANCE: "PACKAGING_READY",
  PACKAGING_READY: "COMPLETED",
  COMPLETED: null,
};

/**
 * StageQueuePage
 * One dedicated page per production stage — e.g. "Design Approvals" shows
 * only PENDING_FILE_CHECK orders. Reuses /api/admin/production-queue
 * (already scoped server-side to the staff member's held role(s)) and
 * filters client-side to this specific stage.
 *
 * Props:
 *   stage {string} — ProductionStatus id this page shows
 *   title {string} — page heading
 *   description {string} — optional subtitle, shown only with useCardHeader
 *   useCardHeader {boolean} — render the title/description as the
 *     integrated top division of the single page card (matching the
 *     standardized admin page header) instead of the legacy in-table title
 */
function StageQueuePage({ stage, title, description, useCardHeader = false }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyOrderId, setBusyOrderId] = useState(null);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [designPreviewOrder, setDesignPreviewOrder] = useState(null);
  const [ai3DPreviewModal, setAi3DPreviewModal] = useState(null);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await adminFetch(buildApiUrl("/api/admin/production-queue"));
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load queue");
      setQueue((data.queue || []).filter((o) => o.productionStatus === stage));
    } catch (err) {
      setError(err.message || "Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [stage]);

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
      (o) => String(o.id).includes(q) || (o.customer || "").toLowerCase().includes(q)
    );
  }, [queue, search]);

  if (loading) {
    return <div className="coming-soon"><p>Loading {title.toLowerCase()}...</p></div>;
  }

  if (error) {
    return (
      <div className="coming-soon">
        <div className="coming-soon-icon"><FaExclamationTriangle /></div>
        <h3>Couldn't load {title.toLowerCase()}</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      {useCardHeader && (
        <div className="admin-page-header admin-page-header-with-badge">
          <div>
            <h1 className="admin-page-header-title">{title}</h1>
            {description && (
              <p className="admin-page-header-desc">{description}</p>
            )}
          </div>
          <span className="menu-badge">{filteredQueue.length}</span>
        </div>
      )}

      {toast && (
        <div className="app-toast-container success">
          <span>{toast}</span>
        </div>
      )}

      <div className="data-table-card" style={{ marginTop: 0 }}>
        {!useCardHeader && (
          <div className="data-table-head">
            <h3>{title}</h3>
            <span className="menu-badge">{filteredQueue.length}</span>
          </div>
        )}

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
              style={{ border: "none", outline: "none", fontSize: "13px", width: "100%" }}
            />
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Branch</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredQueue.length === 0 ? (
                <tr>
                  <td className="empty-row" colSpan={6}>
                    Nothing here right now.
                  </td>
                </tr>
              ) : (
                filteredQueue.map((order) => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.customer}</td>
                    <td>{order.branch}</td>
                    <td>
                      ₱{Number(order.total).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td>
                      <span className={`dashpage-pill status-${order.payment_status}`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td>
                      {(order.items || []).some((item) => item.customizations?.design) && (
                        <button
                          type="button"
                          onClick={() => setDesignPreviewOrder(order)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            background: "#f1f5f9",
                            color: "#0f172a",
                            border: "1px solid #cbd5e1",
                            padding: "6px 10px",
                            borderRadius: 6,
                            fontSize: 12,
                            cursor: "pointer",
                            marginRight: 8,
                          }}
                        >
                          <FaEye size={11} /> View Design
                        </button>
                      )}
                      {NEXT_STATUS[order.productionStatus] ? (
                        <button
                          type="button"
                          onClick={() => advanceStatus(order)}
                          disabled={busyOrderId === order.id}
                          className="row-btn"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            background: busyOrderId === order.id ? "#94a3b8" : "#10b981",
                            color: "#fff",
                            border: "none",
                            padding: "6px 12px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            cursor: busyOrderId === order.id ? "default" : "pointer",
                          }}
                        >
                          {busyOrderId === order.id
                            ? "..."
                            : order.productionStatus === "PENDING_FILE_CHECK"
                              ? <>Approve <FaArrowRight size={10} /></>
                              : <>Advance <FaArrowRight size={10} /></>}
                        </button>
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

      {designPreviewOrder && createPortal(
        <div
          className="ad-logout-overlay"
          onClick={() => setDesignPreviewOrder(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="ad-logout-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: 16,
                borderBottom: "1px solid #e2e8f0",
                marginBottom: 16,
              }}
            >
              <h3 className="ad-logout-title" style={{ margin: 0 }}>
                Order #{designPreviewOrder.id} — Design
              </h3>
              <button
                onClick={() => setDesignPreviewOrder(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 4, fontSize: 20 }}
              >
                <FaTimes />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(designPreviewOrder.items || [])
                .filter((item) => item.customizations?.design)
                .map((item) => {
                  const design = item.customizations.design;
                  const productName =
                    item.customizations?.product_title || item.product?.name || `Product #${item.productId}`;
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        background: "#f8fafc",
                        borderRadius: 8,
                        padding: "10px 12px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      {design.generatedImageUrl && (
                        <img
                          src={design.generatedImageUrl}
                          alt="Submitted design"
                          style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: "2px solid #d4af37" }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 13, color: "#0f172a" }}>{productName}</p>
                        <button
                          type="button"
                          onClick={() => setAi3DPreviewModal({ productName, design })}
                          style={{
                            marginTop: 8,
                            padding: "6px 10px",
                            fontSize: 11,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            cursor: "pointer",
                            background: "#2563eb",
                            border: "none",
                            color: "#fff",
                            borderRadius: 4,
                            fontWeight: 600,
                          }}
                        >
                          <FaCube size={11} />
                          3D Preview
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>,
        document.body
      )}

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
            style={{ width: "100%", maxWidth: 900, height: "min(720px, 86vh)", display: "flex", flexDirection: "column" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingBottom: 16,
                borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                marginBottom: 16,
              }}
            >
              <h3 className="ad-logout-title" style={{ margin: 0 }}>3D Design Preview</h3>
              <button
                onClick={() => setAi3DPreviewModal(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", padding: 4, fontSize: 20 }}
              >
                <FaTimes />
              </button>
            </div>
            <div style={{ flex: 1, width: "100%", height: "100%", background: "rgba(15, 23, 42, 0.3)", borderRadius: 8, overflow: "hidden" }}>
              {render3DPreview(ai3DPreviewModal)}
            </div>
            <div style={{ paddingTop: 16, borderTop: "1px solid rgba(255, 255, 255, 0.08)", marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setAi3DPreviewModal(null)}
                className="ad-logout-btn ghost"
                style={{ height: 40, padding: "0 16px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default StageQueuePage;