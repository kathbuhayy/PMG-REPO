import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  inventory: "Inventory",
  auth: "Authentication",
};

// Maps each filter dropdown value to the set of substrings that should count
// as a match against a log's raw `module`/`action` string. The backend
// writes a wider variety of literal action strings (e.g. "stock_added",
// "requisition_status_changed", "staff_role_granted") than the dropdown has
// options for, so matching is substring-based rather than exact-equality —
// that's what lets "Status Changed" also catch "requisition_status_changed",
// "Restored" catch a differently-cased/spaced variant, etc.
const MODULE_FILTER_MATCHERS = {
  orders: ["order"],
  products: ["product"],
  users: ["user", "account", "staff"],
  inquiries: ["inquir", "support"],
  inventory: ["inventor", "requisition", "material", "stock"],
  auth: ["auth", "login", "logged", "session"],
};

const ACTION_FILTER_MATCHERS = {
  created: ["create", "add"],
  updated: ["update", "edit"],
  deleted: ["delete", "remove"],
  status_changed: ["status", "change"],
  restored: ["restor", "recover"],
  logged_in: ["login", "logged", "signed_in", "sign_in"],
};

// Case-insensitive substring test against a normalized (lowercased,
// underscores/hyphens turned into spaces) copy of the raw value, so
// "Logged In" filters match "logged_in", "logged-in", "LOGIN", etc.
const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .trim();

const matchesFilter = (rawValue, filterValue, matchers) => {
  if (!filterValue) return true; // "All" — ignore this filter entirely
  const normalizedValue = normalize(rawValue);
  const normalizedFilter = normalize(filterValue);
  const substrings = matchers[filterValue] || [normalizedFilter];
  return substrings.some((s) => normalizedValue.includes(normalize(s)));
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

  // Module/Action matching now happens client-side (below), since the
  // backend only exact-matches its raw action/module strings and those
  // don't line up 1:1 with the dropdown's canonical values. When either
  // filter is active we fetch a much larger batch for that date range so
  // there's a meaningful pool to filter against, instead of narrowing an
  // already-tiny 25-row page down to nothing.
  const hasModuleOrActionFilter = Boolean(filters.module || filters.action);
  const FILTER_FETCH_LIMIT = 1000;

  const fetchLogs = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(hasModuleOrActionFilter ? 1 : page),
          limit: String(
            hasModuleOrActionFilter ? FILTER_FETCH_LIMIT : pagination.limit,
          ),
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
    [filters, pagination.limit, hasModuleOrActionFilter],
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

  // Case-insensitive, substring-based AND match on Module + Action; either
  // side is skipped entirely when its filter is "All" (empty string).
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesModule = matchesFilter(
        log.module,
        filters.module,
        MODULE_FILTER_MATCHERS,
      );
      const matchesAction = matchesFilter(
        log.action,
        filters.action,
        ACTION_FILTER_MATCHERS,
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
                    <td>{ACTION_LABELS[log.action] || log.action}</td>
                    <td>{log.description}</td>
                    <td>{formatTimestamp(log.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!hasModuleOrActionFilter && pagination.pages > 1 && (
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