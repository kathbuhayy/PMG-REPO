import React, { useState, useEffect, useCallback } from "react";
import { buildApiUrl } from "../config/api";
import { adminFetch } from "../utils/adminFetch";
import {
  FaChartLine,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaShoppingBag,
  FaCheckCircle,
} from "react-icons/fa";

function AdminReports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await adminFetch(
        buildApiUrl(`/api/admin/reports/sales?${params.toString()}`)
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load report");
      setReport(data);
    } catch (err) {
      setError(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const money = (v) =>
    `₱${Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  if (loading && !report) {
    return <div className="coming-soon"><p>Loading report...</p></div>;
  }

  if (error) {
    return (
      <div className="coming-soon">
        <div className="coming-soon-icon"><FaExclamationTriangle /></div>
        <h3>Couldn't load report</h3>
        <p>{error}</p>
      </div>
    );
  }

  const { summary, byStatus, topProducts, recentOrders } = report;

  return (
    <div>
      <div className="admin-page-header">
        <h1 className="admin-page-header-title">Reports &amp; Analytics</h1>
        <p className="admin-page-header-desc">
          Revenue, orders, and performance over a chosen date range.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "flex-end",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <div className="dashform-group" style={{ margin: 0 }}>
          <label>From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="dashform-group" style={{ margin: 0 }}>
          <label>To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button
          type="button"
          className="row-btn"
          onClick={fetchReport}
          style={{ height: "38px" }}
        >
          Apply
        </button>
      </div>

      <div className="dash-stat-grid">
        <div className="dash-stat-card tone-green">
          <div className="dash-stat-top">
            <span className="dash-stat-label">Revenue</span>
            <span className="dash-stat-icon"><FaMoneyBillWave /></span>
          </div>
          <p className="dash-stat-value">{money(summary.revenue)}</p>
          <p className="dash-stat-foot">from {summary.paidOrders} paid orders</p>
        </div>

        <div className="dash-stat-card tone-blue">
          <div className="dash-stat-top">
            <span className="dash-stat-label">Total Orders</span>
            <span className="dash-stat-icon"><FaShoppingBag /></span>
          </div>
          <p className="dash-stat-value">{summary.orders}</p>
          <p className="dash-stat-foot">in selected range</p>
        </div>

        <div className="dash-stat-card tone-indigo">
          <div className="dash-stat-top">
            <span className="dash-stat-label">Completed</span>
            <span className="dash-stat-icon"><FaCheckCircle /></span>
          </div>
          <p className="dash-stat-value">{summary.completedOrders}</p>
          <p className="dash-stat-foot">completed or delivered</p>
        </div>

        <div className="dash-stat-card tone-purple">
          <div className="dash-stat-top">
            <span className="dash-stat-label">Avg. Order Value</span>
            <span className="dash-stat-icon"><FaChartLine /></span>
          </div>
          <p className="dash-stat-value">{money(summary.averageOrderValue)}</p>
          <p className="dash-stat-foot">per paid order</p>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginTop: "20px",
        }}
      >
        <div className="data-table-card" style={{ marginTop: 0 }}>
          <div className="data-table-head">
            <h3>Orders by Status</h3>
          </div>
          <div style={{ padding: "16px 20px" }}>
            {Object.keys(byStatus).length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "13px" }}>No data</p>
            ) : (
              Object.entries(byStatus).map(([status, count]) => (
                <div
                  key={status}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid #f1f5f9",
                    fontSize: "13px",
                  }}
                >
                  <span style={{ textTransform: "capitalize" }}>{status.replace(/_/g, " ")}</span>
                  <strong>{count}</strong>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="data-table-card" style={{ marginTop: 0 }}>
          <div className="data-table-head">
            <h3>Top Products</h3>
          </div>
          <div style={{ padding: "16px 20px" }}>
            {topProducts.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "13px" }}>No data</p>
            ) : (
              topProducts.map((p) => (
                <div
                  key={p.productId}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid #f1f5f9",
                    fontSize: "13px",
                  }}
                >
                  <span>{p.name} <span style={{ color: "#94a3b8" }}>× {p.quantity}</span></span>
                  <strong>{money(p.revenue)}</strong>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="data-table-card" style={{ marginTop: "16px" }}>
        <div className="data-table-head">
          <h3>Recent Orders</h3>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length === 0 ? (
                <tr><td className="empty-row" colSpan={6}>No orders in this range</td></tr>
              ) : (
                recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td>#{o.id}</td>
                    <td>{o.customer}</td>
                    <td style={{ textTransform: "capitalize" }}>{o.status}</td>
                    <td>
                      <span className={`dashpage-pill status-${o.payment_status}`}>
                        {o.payment_status}
                      </span>
                    </td>
                    <td>{money(o.total)}</td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
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

export default AdminReports;