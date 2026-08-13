import React, { useState, useEffect, useCallback } from "react";
import { FaHistory } from "react-icons/fa";
import { buildApiUrl } from "../config/api";

const ACTION_LABELS = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  status_changed: "Status Changed",
  restored: "Restored",
  logged_in: "Logged In",
};

const MODULE_LABELS = {
  orders: "Orders",
  products: "Products",
  users: "Manage Accounts",
  inquiries: "Inquiries",
  auth: "Authentication",
};

function AdminActivityLog() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    module: "",
    action: "",
    from: "",
    to: "",
  });

  const fetchLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(pagination.limit),
          ...(filters.module && { module: filters.module }),
          ...(filters.action && { action: filters.action }),
          ...(filters.from && { from: filters.from }),
          ...(filters.to && { to: filters.to }),
        });
        const res = await fetch(
          buildApiUrl(`/api/admin/activity-logs?${params.toString()}`),
        );
        const data = await res.json();
        setLogs(data.logs || []);
        setPagination(
          data.pagination || { page: 1, limit: 25, total: 0, pages: 1 },
        );
      } catch (err) {
        console.error("Error fetching activity logs:", err);
      } finally {
        setLoading(false);
      }
    },
    [filters, pagination.limit],
  );

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const formatTimestamp = (ts) => {
    if (!ts) return "—";
    const d = new Date(ts);
    return d.toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const hasActiveFilters =
    filters.module || filters.action || filters.from || filters.to;

  return (
    <div className="activity-log-page">
      <div className="dash-hero">
        <div className="dash-hero-left">
          <div className="dash-kicker">Admin &amp; Staff</div>
          <h2 className="dash-title">Activity Log</h2>
          <p className="dash-desc">
            Every action admins and staff take across orders, products,
            accounts, and inquiries.
          </p>
        </div>
      </div>

      <div className="data-table-card" style={{ marginTop: 0 }}>
        <div
          className="data-table-head"
          style={{ flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}
        >
          <h3>
            <FaHistory style={{ marginRight: "6px" }} />
            Recent Activity
          </h3>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div className="dashform-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: "12px" }}>Module</label>
              <select
                value={filters.module}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, module: e.target.value }))
                }
              >
                <option value="">All</option>
                <option value="orders">Orders</option>
                <option value="products">Products</option>
                <option value="users">Manage Accounts</option>
                <option value="inquiries">Inquiries</option>
                <option value="auth">Authentication</option>
              </select>
            </div>

            <div className="dashform-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: "12px" }}>Action</label>
              <select
                value={filters.action}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, action: e.target.value }))
                }
              >
                <option value="">All</option>
                <option value="created">Created</option>
                <option value="updated">Updated</option>
                <option value="deleted">Deleted</option>
                <option value="status_changed">Status Changed</option>
                <option value="restored">Restored</option>
                <option value="logged_in">Logged In</option>
              </select>
            </div>

            <div className="dashform-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: "12px" }}>From</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, from: e.target.value }))
                }
              />
            </div>

            <div className="dashform-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: "12px" }}>To</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, to: e.target.value }))
                }
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="row-btn"
                onClick={() =>
                  setFilters({ module: "", action: "", from: "", to: "" })
                }
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Module</th>
                <th>Action</th>
                <th>Description</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="empty-row" colSpan={7}>
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td className="empty-row" colSpan={7}>
                    No activity recorded yet
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.userName || "Unknown"}</td>
                    <td>{log.userEmail || "—"}</td>
                    <td style={{ textTransform: "capitalize" }}>
                      {log.userRole || "—"}
                    </td>
                    <td>{MODULE_LABELS[log.module] || log.module}</td>
                    <td>{ACTION_LABELS[log.action] || log.action}</td>
                    <td>{log.description}</td>
                    <td>{formatTimestamp(log.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              padding: "12px 4px 0",
            }}
          >
            <button
              type="button"
              className="row-btn"
              disabled={pagination.page <= 1}
              onClick={() => fetchLogs(pagination.page - 1)}
            >
              Previous
            </button>
            <span
              style={{ fontSize: "13px", color: "#64748b", alignSelf: "center" }}
            >
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              type="button"
              className="row-btn"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchLogs(pagination.page + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminActivityLog;