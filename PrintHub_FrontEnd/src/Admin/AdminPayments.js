import React, { useState, useEffect, useCallback } from "react";
import { buildApiUrl } from "../config/api";
import { adminFetch } from "../utils/adminFetch";
import { FaExclamationTriangle, FaMoneyBillWave } from "react-icons/fa";

const STATUS_TABS = [
  { id: "", label: "All" },
  { id: "awaiting_payment", label: "Awaiting Payment" },
  { id: "partially_paid", label: "Partially Paid" },
  { id: "paid", label: "Paid" },
];

function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPayments = useCallback(async (status) => {
    try {
      setLoading(true);
      setError("");
      const params = status ? `?status=${status}` : "";
      const res = await adminFetch(buildApiUrl(`/api/admin/payments${params}`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load payments");
      setPayments(data.payments || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPayments(activeTab);
  }, [activeTab, fetchPayments]);

  const money = (v) =>
    `₱${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  if (loading && payments.length === 0) {
    return <div className="coming-soon"><p>Loading payments...</p></div>;
  }

  if (error) {
    return (
      <div className="coming-soon">
        <div className="coming-soon-icon"><FaExclamationTriangle /></div>
        <h3>Couldn't load payments</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div>
      {summary && (
        <div className="dash-stat-grid" style={{ marginBottom: "20px" }}>
          <div className="dash-stat-card tone-green">
            <div className="dash-stat-top">
              <span className="dash-stat-label">Total Collected</span>
              <span className="dash-stat-icon"><FaMoneyBillWave /></span>
            </div>
            <p className="dash-stat-value">{money(summary.totalCollected)}</p>
          </div>
          <div className="dash-stat-card tone-blue">
            <div className="dash-stat-top"><span className="dash-stat-label">Fully Paid</span></div>
            <p className="dash-stat-value">{summary.fullyPaid}</p>
          </div>
          <div className="dash-stat-card tone-indigo">
            <div className="dash-stat-top"><span className="dash-stat-label">Partially Paid</span></div>
            <p className="dash-stat-value">{summary.partiallyPaid}</p>
          </div>
          <div className="dash-stat-card tone-red">
            <div className="dash-stat-top"><span className="dash-stat-label">Awaiting Payment</span></div>
            <p className="dash-stat-value">{summary.awaitingPayment}</p>
          </div>
        </div>
      )}

      <div className="data-table-card" style={{ marginTop: 0 }}>
        <div className="data-table-head">
          <h3>Payments</h3>
        </div>

        <div style={{ display: "flex", gap: "8px", padding: "0 20px 12px" }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "6px 14px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 600,
                border: activeTab === tab.id ? "none" : "1px solid #d1d5db",
                background: activeTab === tab.id ? "#2563eb" : "transparent",
                color: activeTab === tab.id ? "#fff" : "#475569",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Remaining</th>
                <th>Status</th>
                <th>Method</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td className="empty-row" colSpan={8}>No payments found</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.orderId}>
                    <td>#{p.orderId}{p.isBulkOrder && <span style={{ marginLeft: 6, fontSize: 10, color: "#94a3b8" }}>BULK</span>}</td>
                    <td>{p.customer}</td>
                    <td>{money(p.total)}</td>
                    <td>{money(p.amountPaid)}</td>
                    <td>{p.remaining > 0 ? money(p.remaining) : "—"}</td>
                    <td>
                      <span className={`dashpage-pill status-${p.paymentStatus}`}>
                        {p.paymentStatus?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ textTransform: "capitalize" }}>{p.paymentMethod || "—"}</td>
                    <td>{new Date(p.createdAt).toLocaleDateString()}</td>
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

export default AdminPayments;