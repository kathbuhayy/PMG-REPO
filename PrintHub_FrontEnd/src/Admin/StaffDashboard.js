import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../config/api";
import { adminFetch } from "../utils/adminFetch";
import { FaClipboardList, FaListOl, FaExclamationTriangle } from "react-icons/fa";

const PRODUCTION_STATUS_LABELS = {
  PENDING_FILE_CHECK: "Awaiting Approval",
  PRINTING_QUEUE: "Printing",
  QUALITY_ASSURANCE: "Quality Check",
  PACKAGING_READY: "Packaging",
  COMPLETED: "Completed",
};

function StaffDashboard({ userName }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminFetch(buildApiUrl("/api/production/my-tasks"));
      const data = await res.json();
      if (res.ok) setTasks(data.tasks || []);
    } catch (err) {
      console.error("Failed to fetch tasks:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, [fetchTasks]);

  const dueSoon = tasks.filter((t) => {
    if (!t.order?.due_date) return false;
    const daysUntil = (new Date(t.order.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntil <= 3 && t.order.productionStatus !== "COMPLETED";
  });

  return (
    <div>
      <p className="subtitle" style={{ marginBottom: "20px" }}>
        Welcome back, {userName || "there"}. Here's what's on your plate.
      </p>

      <div className="dash-stat-grid">
        <div className="dash-stat-card tone-blue clickable" onClick={() => navigate("/admin/myTasks")}>
          <div className="dash-stat-top">
            <span className="dash-stat-label">Active Assignments</span>
            <span className="dash-stat-icon"><FaClipboardList /></span>
          </div>
          <p className="dash-stat-value">{loading ? "…" : tasks.length}</p>
          <p className="dash-stat-foot">View my tasks</p>
        </div>

        <div className="dash-stat-card tone-red clickable" onClick={() => navigate("/admin/myTasks")}>
          <div className="dash-stat-top">
            <span className="dash-stat-label">Due Within 3 Days</span>
            <span className="dash-stat-icon"><FaExclamationTriangle /></span>
          </div>
          <p className="dash-stat-value">{loading ? "…" : dueSoon.length}</p>
          <p className="dash-stat-foot">Check deadlines</p>
        </div>

        <div className="dash-stat-card tone-indigo clickable" onClick={() => navigate("/admin/productionQueue")}>
          <div className="dash-stat-top">
            <span className="dash-stat-label">Production Queue</span>
            <span className="dash-stat-icon"><FaListOl /></span>
          </div>
          <p className="dash-stat-value">—</p>
          <p className="dash-stat-foot">View your department's stage</p>
        </div>
      </div>

      <div className="data-table-card" style={{ marginTop: "20px" }}>
        <div className="data-table-head">
          <h3>Recent Assignments</h3>
          <button type="button" className="row-btn" onClick={() => navigate("/admin/myTasks")}>
            View all
          </button>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Role</th>
                <th>Stage</th>
                <th>Due</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="empty-row" colSpan={4}>Loading...</td></tr>
              ) : tasks.length === 0 ? (
                <tr><td className="empty-row" colSpan={4}>No active assignments</td></tr>
              ) : (
                tasks.slice(0, 5).map((t) => (
                  <tr key={t.id}>
                    <td>#{t.order?.id}</td>
                    <td>{t.role.replace(/_/g, " ")}</td>
                    <td>
                      <span className="dashpage-pill status-pending">
                        {PRODUCTION_STATUS_LABELS[t.order?.productionStatus] || t.order?.productionStatus}
                      </span>
                    </td>
                    <td>{t.order?.due_date ? new Date(t.order.due_date).toLocaleDateString() : "—"}</td>
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

export default StaffDashboard;