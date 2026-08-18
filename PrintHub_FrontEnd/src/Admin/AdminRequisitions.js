import React, { useState, useEffect, useCallback } from "react";
import { buildApiUrl } from "../config/api";
import { adminFetch } from "../utils/adminFetch";
import { FaExclamationTriangle, FaFileDownload } from "react-icons/fa";

const STATUS_TABS = ["PENDING", "ORDERED", "RECEIVED", "CANCELLED"];

function AdminRequisitions() {
  const [requisitions, setRequisitions] = useState([]);
  const [activeTab, setActiveTab] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState("");

  const fetchRequisitions = useCallback(async (status) => {
    try {
      setLoading(true);
      setError("");
      const res = await adminFetch(
        buildApiUrl(`/api/production/requisitions?status=${status}`)
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load requisitions");
      setRequisitions(data.requisitions || []);
    } catch (err) {
      setError(err.message || "Failed to load requisitions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequisitions(activeTab);
  }, [activeTab, fetchRequisitions]);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  };

  const updateStatus = async (id, status) => {
    setBusyId(id);
    try {
      const res = await adminFetch(buildApiUrl(`/api/production/requisitions/${id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update requisition");

      showToast(`Requisition #${id} marked as ${status}`);
      await fetchRequisitions(activeTab);
    } catch (err) {
      showToast(err.message || "Failed to update requisition");
    } finally {
      setBusyId(null);
    }
  };

  const downloadDocument = async (id) => {
    try {
      const res = await adminFetch(
        buildApiUrl(`/api/production/requisitions/${id}/document`)
      );
      if (!res.ok) throw new Error("Failed to fetch document");
      const text = await res.text();
      const blob = new Blob([text], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `requisition-${id}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err.message || "Failed to download document");
    }
  };

  return (
    <div>
      {toast && (
        <div className="app-toast-container success">
          <span>{toast}</span>
        </div>
      )}

      <div className="data-table-card" style={{ marginTop: 0 }}>
        <div className="data-table-head">
          <h3>Purchase Requisitions</h3>
        </div>

        <div style={{ display: "flex", gap: "8px", padding: "0 20px 12px" }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 14px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 600,
                border: activeTab === tab ? "none" : "1px solid #d1d5db",
                background: activeTab === tab ? "#2563eb" : "transparent",
                color: activeTab === tab ? "#fff" : "#475569",
                cursor: "pointer",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ padding: "0 20px 12px", color: "#e74c3c", fontSize: "13px" }}>
            <FaExclamationTriangle style={{ marginRight: "6px" }} />
            {error}
          </div>
        )}

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Material</th>
                <th className="left">Current Stock</th>
                <th className="left">Requested</th>
                <th>Order #</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="empty-row" colSpan={8}>Loading...</td>
                </tr>
              ) : requisitions.length === 0 ? (
                <tr>
                  <td className="empty-row" colSpan={8}>No {activeTab.toLowerCase()} requisitions</td>
                </tr>
              ) : (
                requisitions.map((req) => (
                  <tr key={req.id}>
                    <td>#{req.id}</td>
                    <td style={{ textTransform: "capitalize" }}>{req.materialType}</td>
                    <td>{req.materialName}</td>
                    <td className="left">{req.currentStock}</td>
                    <td className="left">{req.requestedAmount.toFixed(2)}</td>
                    <td>{req.triggeredByOrderId ? `#${req.triggeredByOrderId}` : "—"}</td>
                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => downloadDocument(req.id)}
                          title="Download document"
                          style={{
                            padding: "4px 8px",
                            fontSize: "11px",
                            border: "1px solid #d1d5db",
                            background: "transparent",
                            borderRadius: "6px",
                            cursor: "pointer",
                          }}
                        >
                          <FaFileDownload size={11} />
                        </button>

                        {req.status === "PENDING" && (
                          <button
                            type="button"
                            disabled={busyId === req.id}
                            onClick={() => updateStatus(req.id, "ORDERED")}
                            style={{
                              padding: "4px 8px",
                              fontSize: "11px",
                              border: "none",
                              background: "#2563eb",
                              color: "#fff",
                              borderRadius: "6px",
                              cursor: "pointer",
                            }}
                          >
                            Mark Ordered
                          </button>
                        )}

                        {req.status === "ORDERED" && (
                          <button
                            type="button"
                            disabled={busyId === req.id}
                            onClick={() => updateStatus(req.id, "RECEIVED")}
                            style={{
                              padding: "4px 8px",
                              fontSize: "11px",
                              border: "none",
                              background: "#10b981",
                              color: "#fff",
                              borderRadius: "6px",
                              cursor: "pointer",
                            }}
                          >
                            Mark Received
                          </button>
                        )}

                        {(req.status === "PENDING" || req.status === "ORDERED") && (
                          <button
                            type="button"
                            disabled={busyId === req.id}
                            onClick={() => updateStatus(req.id, "CANCELLED")}
                            style={{
                              padding: "4px 8px",
                              fontSize: "11px",
                              border: "1px solid #ef4444",
                              background: "transparent",
                              color: "#ef4444",
                              borderRadius: "6px",
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
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

export default AdminRequisitions;