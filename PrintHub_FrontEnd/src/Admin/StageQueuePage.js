import React, { useState, useEffect, useCallback, useMemo } from "react";
import { buildApiUrl } from "../config/api";
import { adminFetch } from "../utils/adminFetch";
import { FaExclamationTriangle, FaArrowRight, FaSearch } from "react-icons/fa";

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
 */
function StageQueuePage({ stage, title }) {
  const [queue, setQueue] = useState([]);
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
      {toast && (
        <div className="app-toast-container success">
          <span>{toast}</span>
        </div>
      )}

      <div className="data-table-card" style={{ marginTop: 0 }}>
        <div className="data-table-head">
          <h3>{title}</h3>
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
    </div>
  );
}

export default StageQueuePage;