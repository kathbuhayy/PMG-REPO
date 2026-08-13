import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  FaChevronLeft,
  FaChevronRight,
  FaCalendarAlt,
  FaSearch,
  FaTimes,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSyncAlt,
  FaDatabase,
  FaExternalLinkAlt,
} from "react-icons/fa";
import "./Admin-dashboard.css";
import { buildApiUrl } from "../config/api";
import { adminFetch } from "../utils/adminFetch";

/* ─────────────────────────────────────────────────────────────────────────
 * STATUS → COLOR MAPPING
 * This is the ONLY place you need to touch to re-bucket a status into a
 * different color. Every order.status value from the DB must appear in
 * exactly one group below.
 * ───────────────────────────────────────────────────────────────────────── */
const STATUS_COLOR_GROUPS = {
  orange: {
    label: "Approval / Pending Payment",
    statuses: ["pending", "confirmed", "return_requested"],
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    border: "rgba(245, 158, 11, 0.35)",
  },
  blue: {
    label: "Processing",
    statuses: ["processing", "delivered"],
    color: "#2563eb",
    bg: "rgba(37, 99, 235, 0.12)",
    border: "rgba(37, 99, 235, 0.35)",
  },
  green: {
    label: "Complete",
    statuses: ["completed"],
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.35)",
  },
  red: {
    label: "Cancelled",
    statuses: ["cancelled"],
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.35)",
  },
};

function colorKeyForStatus(status) {
  for (const [key, group] of Object.entries(STATUS_COLOR_GROUPS)) {
    if (group.statuses.includes(status)) return key;
  }
  return "orange"; // fallback bucket for any future/unknown status
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function startOfMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  return gridStart;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function AdminProductionCalendar() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastSynced, setLastSynced] = useState(null);

  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(new Date());
  const [dateField, setDateField] = useState("createdAt"); // "createdAt" | "due_date"
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState(
    Object.keys(STATUS_COLOR_GROUPS),
  );
  const [selectedDay, setSelectedDay] = useState(null); // Date or null
  const [selectedOrder, setSelectedOrder] = useState(null); // order object or null

  /* ── Fetch orders from the live database ────────────────────────────── */
  const fetchOrders = async () => {
    try {
      setError(null);
      const res = await adminFetch(buildApiUrl("/api/admin/orders"));
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      setLastSynced(new Date());
    } catch (err) {
      console.error("Error fetching orders for calendar:", err);
      setError(err.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000); // stay in sync, same cadence as AdminOrders
    return () => clearInterval(interval);
  }, []);

  /* ── Transform + filter ──────────────────────────────────────────────── */
  const visibleOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders
      .filter((o) => {
        const colorKey = colorKeyForStatus(o.status);
        if (!activeFilters.includes(colorKey)) return false;
        if (!q) return true;
        const customer = o.user
          ? `${o.user.first_name} ${o.user.last_name}`
          : "";
        return (
          String(o.id).includes(q) ||
          customer.toLowerCase().includes(q) ||
          String(o.total).includes(q)
        );
      })
      .map((o) => {
        const raw = o[dateField] || o.createdAt;
        const d = raw ? new Date(raw) : null;
        return { ...o, __calDate: d && !isNaN(d) ? d : null };
      })
      .filter((o) => o.__calDate);
  }, [orders, query, activeFilters, dateField]);

  const ordersByDay = useMemo(() => {
    const map = new Map();
    visibleOrders.forEach((o) => {
      const key = dateKey(o.__calDate);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(o);
    });
    return map;
  }, [visibleOrders]);

  const stats = useMemo(() => {
    const counts = { orange: 0, blue: 0, green: 0, red: 0 };
    orders.forEach((o) => {
      counts[colorKeyForStatus(o.status)] += 1;
    });
    return counts;
  }, [orders]);

  /* ── Calendar grid (6 weeks x 7 days, classic month view) ────────────── */
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const gridStart = startOfMonthGrid(year, month);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  const goToday = () => setViewDate(new Date());
  const goPrev = () => setViewDate(new Date(year, month - 1, 1));
  const goNext = () => setViewDate(new Date(year, month + 1, 1));

  const toggleFilter = (key) => {
    setActiveFilters((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const customerName = (o) =>
    o.user ? `${o.user.first_name} ${o.user.last_name}` : "Unknown";

  if (loading) {
    return (
      <div className="dashpage dashpage-orders">
        <div className="dashpage-loading">Loading production calendar...</div>
      </div>
    );
  }

  return (
    <div className="dashpage dashpage-orders">
      {/* Connection / sync indicator */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
          fontSize: 12,
          color: error ? "#ef4444" : "#475569",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <FaDatabase size={11} />
          {error
            ? `Database connection issue: ${error}`
            : `Connected — synced ${
                lastSynced ? lastSynced.toLocaleTimeString() : "..."
              }`}
        </span>
        <button
          type="button"
          onClick={fetchOrders}
          className="dashaction-btn ghost"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          title="Refresh now"
        >
          <FaSyncAlt size={11} />
          Refresh
        </button>
      </div>

      {/* Stats cards — reuses the same classes/colors as the Orders tab */}
      <div className="dashpage-stats">
        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">Total Orders</div>
          <div className="dashpage-stat-value">{orders.length}</div>
        </div>
        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">
            {STATUS_COLOR_GROUPS.orange.label}
          </div>
          <div className="dashpage-stat-value orange">{stats.orange}</div>
        </div>
        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">
            {STATUS_COLOR_GROUPS.blue.label}
          </div>
          <div className="dashpage-stat-value blue">{stats.blue}</div>
        </div>
        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">
            {STATUS_COLOR_GROUPS.green.label}
          </div>
          <div className="dashpage-stat-value green">{stats.green}</div>
        </div>
        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">
            {STATUS_COLOR_GROUPS.red.label}
          </div>
          <div className="dashpage-stat-value red">{stats.red}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="dashpage-toolbar">
        <div className="dashpage-search">
          <span className="dashpage-search-icon">
            <FaSearch size={14} />
          </span>
          <input
            type="text"
            placeholder="Search order ID, customer, total..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="dashpage-filters" style={{ gap: 8 }}>
          <select
            value={dateField}
            onChange={(e) => setDateField(e.target.value)}
          >
            <option value="createdAt">Schedule by Order Date</option>
            <option value="due_date">Schedule by Due Date</option>
          </select>

          <button
            type="button"
            className="dashaction-btn ghost"
            onClick={goToday}
          >
            Today
          </button>
        </div>
      </div>

      {/* Legend / filters — click to toggle a color on/off */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          margin: "4px 0 16px",
        }}
      >
        {Object.entries(STATUS_COLOR_GROUPS).map(([key, group]) => {
          const active = activeFilters.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleFilter(key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 999,
                border: `1px solid ${group.border}`,
                background: active ? group.bg : "transparent",
                color: active ? group.color : "#94a3b8",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                opacity: active ? 1 : 0.6,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: group.color,
                  display: "inline-block",
                }}
              />
              {group.label}
              <span style={{ opacity: 0.7 }}>
                ({stats[key]})
              </span>
            </button>
          );
        })}
      </div>

      {/* Calendar card */}
      <div className="dashpage-table-card" style={{ padding: 16 }}>
        {/* Month nav */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <FaCalendarAlt style={{ color: "#2563eb" }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              {MONTH_NAMES[month]} {year}
            </h3>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="dashaction-btn ghost"
              onClick={goPrev}
              aria-label="Previous month"
            >
              <FaChevronLeft size={11} />
            </button>
            <button
              type="button"
              className="dashaction-btn ghost"
              onClick={goNext}
              aria-label="Next month"
            >
              <FaChevronRight size={11} />
            </button>
          </div>
        </div>

        {/* Weekday header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 6,
            marginBottom: 6,
          }}
        >
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              style={{
                textAlign: "center",
                fontSize: 11,
                fontWeight: 700,
                color: "#94a3b8",
                textTransform: "uppercase",
                letterSpacing: 0.5,
                padding: "4px 0",
              }}
            >
              {w}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gridAutoRows: "minmax(92px, auto)",
            gap: 6,
          }}
        >
          {cells.map((d) => {
            const inMonth = d.getMonth() === month;
            const isToday = isSameDay(d, today);
            const dayOrders = ordersByDay.get(dateKey(d)) || [];
            const visible = dayOrders.slice(0, 3);
            const overflow = dayOrders.length - visible.length;

            return (
              <div
                key={d.toISOString()}
                style={{
                  border: isToday
                    ? "1.5px solid #2563eb"
                    : "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: 6,
                  background: inMonth ? "#fff" : "#f8fafc",
                  opacity: inMonth ? 1 : 0.55,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  cursor: dayOrders.length ? "pointer" : "default",
                }}
                onClick={() => dayOrders.length && setSelectedDay(d)}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: isToday ? 800 : 600,
                    color: isToday ? "#2563eb" : "#334155",
                  }}
                >
                  {d.getDate()}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {visible.map((o) => {
                    const group = STATUS_COLOR_GROUPS[colorKeyForStatus(o.status)];
                    return (
                      <div
                        key={o.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(o);
                        }}
                        title={`ORD-${String(o.id).padStart(4, "0")} — ${customerName(o)}`}
                        style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 5,
                          background: group.bg,
                          color: group.color,
                          border: `1px solid ${group.border}`,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        #{o.id} · {customerName(o)}
                      </div>
                    );
                  })}
                  {overflow > 0 && (
                    <div
                      style={{
                        fontSize: 10,
                        color: "#64748b",
                        fontWeight: 600,
                        paddingLeft: 4,
                      }}
                    >
                      +{overflow} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDay &&
        createPortal(
          <div
            className="ad-logout-overlay"
            onClick={() => setSelectedDay(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="ad-logout-modal"
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 480, maxHeight: "80vh", overflowY: "auto" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <h3 className="ad-logout-title" style={{ margin: 0 }}>
                  {selectedDay.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <button
                  onClick={() => setSelectedDay(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#475569" }}
                >
                  <FaTimes size={16} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(ordersByDay.get(dateKey(selectedDay)) || []).map((o) => {
                  const group = STATUS_COLOR_GROUPS[colorKeyForStatus(o.status)];
                  return (
                    <div
                      key={o.id}
                      onClick={() => {
                        setSelectedOrder(o);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: 8,
                        border: `1px solid ${group.border}`,
                        background: group.bg,
                        cursor: "pointer",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                          ORD-{String(o.id).padStart(4, "0")} — {customerName(o)}
                        </div>
                        <div style={{ fontSize: 11.5, color: group.color, fontWeight: 600 }}>
                          {o.status.replace(/_/g, " ")}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#059669" }}>
                        ₱{parseFloat(o.total).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Order detail modal */}
      {selectedOrder &&
        createPortal(
          <div
            className="ad-logout-overlay"
            onClick={() => setSelectedOrder(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="ad-logout-modal"
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 460 }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 16,
                  paddingBottom: 16,
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <h3 className="ad-logout-title" style={{ margin: 0 }}>
                  ORD-{String(selectedOrder.id).padStart(4, "0")}
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/admin/orders?openOrder=${selectedOrder.id}`)
                    }
                    className="dashaction-btn blue"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                    }}
                    title="Open this order in the Orders tab"
                  >
                    <FaExternalLinkAlt size={11} />
                    View Details
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#475569" }}
                  >
                    <FaTimes size={16} />
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                <div>
                  <strong>Customer:</strong> {customerName(selectedOrder)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <strong>Status:</strong>
                  <span className={`dashpage-pill status-${selectedOrder.status}`}>
                    {selectedOrder.status === "cancelled" && (
                      <FaExclamationTriangle style={{ marginRight: 5 }} />
                    )}
                    {selectedOrder.status === "completed" && (
                      <FaCheckCircle style={{ marginRight: 5 }} />
                    )}
                    {["pending", "processing"].includes(selectedOrder.status) && (
                      <FaClock style={{ marginRight: 5 }} />
                    )}
                    {selectedOrder.status.replace(/_/g, " ")}
                  </span>
                </div>
                <div>
                  <strong>Payment:</strong>{" "}
                  {(selectedOrder.payment_status || "unpaid").replace(/_/g, " ")}
                </div>
                <div>
                  <strong>Items:</strong> {selectedOrder.items?.length || 0}
                </div>
                <div>
                  <strong>Order date:</strong>{" "}
                  {new Date(selectedOrder.createdAt).toLocaleString()}
                </div>
                {selectedOrder.due_date && (
                  <div>
                    <strong>Due date:</strong>{" "}
                    {new Date(selectedOrder.due_date).toLocaleString()}
                  </div>
                )}
                <div style={{ fontSize: 16, fontWeight: 700, color: "#059669", marginTop: 6 }}>
                  ₱{parseFloat(selectedOrder.total).toLocaleString()}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

export default AdminProductionCalendar;