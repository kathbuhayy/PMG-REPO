import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FaHistory } from "react-icons/fa";
import { buildApiUrl } from "../config/api";

// Known literal `action` strings (see ACTIVITY_ACTION_FILTER_GROUPS in
// PrintHub_Backend/server.js) mapped to clean display titles. Anything not
// listed here falls back to auto-titleizing the raw snake_case string —
// see formatActionLabel below.
const ACTION_LABELS = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  status_changed: "Status Changed",
  restored: "Restored",
  logged_in: "Logged In",
  staff_role_granted: "Role Granted",
  staff_role_revoked: "Role Revoked",
  role_updated: "Role Updated",
  account_status_changed: "Account Status Changed",
  stock_added: "Stock Added",
  payment_recorded: "Payment Recorded",
  design_approved: "Design Approved",
  delivered: "Delivered",
  item_removed: "Item Removed",
  requisition_status_changed: "Requisition Status Changed",
  converted: "Converted",
};

const MODULE_LABELS = {
  orders: "Orders",
  products: "Products",
  users: "Manage Accounts",
  inquiries: "Inquiries",
  inventory: "Inventory",
  auth: "Authentication",
};

// Formats a raw action string for the table's Action column: uses the
// curated label above when known, otherwise auto-titleizes the raw
// snake_case value (e.g. an action added later without an ACTION_LABELS
// entry yet still renders as "Some New Action" instead of "some_new_action").
const formatActionLabel = (action) => {
  if (!action) return "";
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// Maps each filter dropdown value to every literal module/action string
// that should count as a match. Mirrors ACTIVITY_MODULE_FILTER_GROUPS /
// ACTIVITY_ACTION_FILTER_GROUPS in PrintHub_Backend/server.js — the server
// applies these same groups via a Prisma `{ in: [...] }` clause, so this
// copy is a client-side safety-net re-check on whatever page comes back,
// not an independent guess. Keep both lists in sync if either changes.
const MODULE_FILTER_GROUPS = {
  orders: ["orders"],
  products: ["products"],
  users: ["users"],
  inquiries: ["inquiries"],
  inventory: ["inventory"],
  auth: ["auth"],
};

const ACTION_FILTER_GROUPS = {
  created: ["created"],
  updated: [
    "updated",
    "stock_added",
    "staff_role_granted",
    "staff_role_revoked",
    "role_updated",
  ],
  deleted: ["deleted", "item_removed"],
  status_changed: [
    "status_changed",
    "requisition_status_changed",
    "delivered",
    "converted",
    "payment_recorded",
    "design_approved",
    "account_status_changed",
  ],
  restored: ["restored"],
  logged_in: ["logged_in"],
};

// Case-insensitive, whitespace/underscore/hyphen-tolerant normalization so
// "logged_in", "logged-in", "LOGIN " etc. all compare equal.
const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();

const matchesFilter = (rawValue, filterValue, groups) => {
  if (!filterValue) return true; // "All" — ignore this filter entirely
  const normalizedValue = normalize(rawValue);
  const members = groups[filterValue] || [filterValue];
  return members.some((member) => normalize(member) === normalizedValue);
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

  // The backend now expands each Module/Action filter into its full group
  // of matching literal values (see ACTIVITY_*_FILTER_GROUPS in server.js),
  // so normal server-side pagination works correctly again — the client
  // just re-applies the same category/substring matching below as a
  // safety-net refinement over whatever page comes back.
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

  // Safety-net re-check on top of the server's own filtering (case- and
  // formatting-tolerant); AND match on Module + Action, either side
  // skipped entirely when its filter is "All" (empty string).
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesModule = matchesFilter(
        log.module,
        filters.module,
        MODULE_FILTER_GROUPS,
      );
      const matchesAction = matchesFilter(
        log.action,
        filters.action,
        ACTION_FILTER_GROUPS,
      );
      return matchesModule && matchesAction;
    });
  }, [logs, filters.module, filters.action]);

  return (
    <div className="activity-log-page">
      <div className="admin-page-header">
        <h1 className="admin-page-header-title">Activity Log</h1>
        <p className="admin-page-header-desc">
          Every action admins and staff take across orders, products,
          accounts, and inquiries.
        </p>
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
                <option value="inventory">Inventory</option>
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
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td className="empty-row" colSpan={7}>
                    {hasActiveFilters
                      ? "No activity matches the selected filters"
                      : "No activity recorded yet"}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.userName || "Unknown"}</td>
                    <td>{log.userEmail || "—"}</td>
                    <td style={{ textTransform: "capitalize" }}>
                      {log.userRole || "—"}
                    </td>
                    <td>{MODULE_LABELS[log.module] || log.module}</td>
                    <td>{formatActionLabel(log.action)}</td>
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
              alignItems: "center",
              justifyContent: "flex-end",
              gap: "8px",
              padding: "16px 24px 20px",
              borderTop: "1px solid rgba(15, 23, 42, 0.06)",
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