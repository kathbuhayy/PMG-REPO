import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { FaSearch, FaFilter, FaEye, FaTimes } from "react-icons/fa";
import "./Admin-dashboard.css";
import { buildApiUrl } from "../config/api";

const STATUS_COLORS = {
  new: "status-pending",
  quoted: "status-processing",
  accepted: "status-completed",
  closed: "status-cancelled",
  converted: "status-completed",
};

function AdminInquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [editFields, setEditFields] = useState({
    status: "new",
    quoted_price: "",
    admin_notes: "",
    quantity: 0,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const fetchInquiries = async () => {
    try {
      setLoading(true);
      const url =
        filterStatus !== "all"
          ? buildApiUrl(`/api/inquiries?status=${filterStatus}`)
          : buildApiUrl("/api/inquiries");
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch inquiries");
      const data = await res.json();
      setInquiries(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inquiries;
    return inquiries.filter(
      (i) =>
        i.name?.toLowerCase().includes(q) ||
        i.email?.toLowerCase().includes(q) ||
        i.product_title?.toLowerCase().includes(q) ||
        i.subject?.toLowerCase().includes(q),
    );
  }, [inquiries, query]);

  const stats = useMemo(() => {
    return {
      total: inquiries.length,
      new: inquiries.filter((i) => i.status === "new").length,
      quoted: inquiries.filter((i) => i.status === "quoted").length,
      accepted: inquiries.filter((i) => i.status === "accepted").length,
    };
  }, [inquiries]);

  const handleOpenDetail = (inquiry) => {
    setSelectedInquiry(inquiry);
    setEditFields({
      status: inquiry.status || "new",
      quoted_price:
        inquiry.quoted_price != null ? String(inquiry.quoted_price) : "",
      admin_notes: inquiry.admin_notes || "",
    });
    setSaveError("");
    setSaveSuccess("");
    setShowDetailModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      const res = await fetch(
        buildApiUrl(`/api/inquiries/${selectedInquiry.id}`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: editFields.status,
            quoted_price:
              editFields.quoted_price !== ""
                ? parseFloat(editFields.quoted_price)
                : null,
            admin_notes: editFields.admin_notes,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save");

      // Detect if a new order was auto-created (inquiry now has order_id and didn't before)
      const newlyConverted =
        data.inquiry?.order_id && !selectedInquiry.order_id;

      setInquiries((prev) =>
        prev.map((i) =>
          i.id === selectedInquiry.id ? { ...i, ...data.inquiry } : i,
        ),
      );
      setSelectedInquiry((prev) => ({ ...prev, ...data.inquiry }));
      setEditFields((prev) => ({
        ...prev,
        status: data.inquiry.status || prev.status,
      }));

      if (newlyConverted) {
        setSaveSuccess(
          `✔ Quoted price saved — Order #${data.inquiry.order_id} created automatically. Customer can now pay.`,
        );
      } else {
        setSaveSuccess("✔ Inquiry updated.");
        setTimeout(() => setShowDetailModal(false), 800);
      }
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="dashpage dashpage-products">
        <div className="dashpage-loading">Loading inquiries...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashpage dashpage-products">
        <div className="dashpage-error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="dashpage dashpage-products">
      {/* Header */}
      <div className="dashpage-top">
        <div>
          <p className="dashpage-subtitle">
            Quote requests submitted by customers
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="dashpage-stats">
        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">Total</div>
          <div className="dashpage-stat-value">{stats.total}</div>
        </div>
        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">New</div>
          <div className="dashpage-stat-value" style={{ color: "#e67e22" }}>
            {stats.new}
          </div>
        </div>
        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">Quoted</div>
          <div className="dashpage-stat-value" style={{ color: "#2980b9" }}>
            {stats.quoted}
          </div>
        </div>
        <div className="dashpage-stat-card">
          <div className="dashpage-stat-label">Accepted</div>
          <div className="dashpage-stat-value green">{stats.accepted}</div>
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
            placeholder="Search name, email, product..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="dashpage-filters">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="converted">Converted</option>
            <option value="closed">Closed</option>
          </select>
          <button
            className="dashpage-filterbtn"
            type="button"
            onClick={() => {
              setQuery("");
              setFilterStatus("all");
            }}
            title="Clear filters"
          >
            <FaFilter />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="dashpage-table-card">
        <table className="dashpage-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Name</th>
              <th>Email</th>
              <th>Product</th>
              <th>Status</th>
              <th>Quoted Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inq) => (
              <tr key={inq.id}>
                <td data-label="Date">{formatDate(inq.createdAt)}</td>
                <td data-label="Name" className="strong">
                  {inq.name}
                </td>
                <td data-label="Email">{inq.email}</td>
                <td data-label="Product">{inq.product_title || "—"}</td>
                <td data-label="Status">
                  <span
                    className={`dashpage-pill ${STATUS_COLORS[inq.status] || "status-pending"}`}
                  >
                    {inq.status}
                  </span>
                </td>
                <td data-label="Quoted Price">
                  {inq.quoted_price != null
                    ? `₱${parseFloat(inq.quoted_price).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`
                    : "—"}
                </td>
                <td data-label="Actions">
                  <button
                    type="button"
                    className="dashaction-btn blue"
                    onClick={() => handleOpenDetail(inq)}
                    title="View / Edit inquiry"
                  >
                    <FaEye size={12} />
                    View
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan="7" className="dashpage-empty">
                  No inquiries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail / Edit modal */}
      {showDetailModal && selectedInquiry && createPortal(
        <div
          className="ad-logout-overlay"
          onMouseDown={() => setShowDetailModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="ad-logout-modal"
            onMouseDown={(e) => e.stopPropagation()}
            style={{ maxHeight: "90vh", overflowY: "auto", maxWidth: "560px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3 className="ad-logout-title" style={{ margin: 0 }}>
                Inquiry #{selectedInquiry.id}
              </h3>
              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "18px",
                  color: "#cbd5e1",
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Read-only details */}
            <div className="dashmodal-details">
              <p>
                <strong>Date:</strong> {formatDate(selectedInquiry.createdAt)}
              </p>
              <p>
                <strong>Name:</strong> {selectedInquiry.name}
              </p>
              <p>
                <strong>Email:</strong> {selectedInquiry.email}
              </p>
              <p>
                <strong>Subject:</strong> {selectedInquiry.subject}
              </p>
              <p>
                <strong>Product:</strong> {selectedInquiry.product_title || "—"}
              </p>
              <hr />
              <p>
                <strong>Quantity:</strong> {selectedInquiry.quantity || "—"}
              </p>
              <p>
                <strong>Size:</strong> {selectedInquiry.size || "—"}
              </p>
              <p>
                <strong>Color:</strong> {selectedInquiry.color || "—"}
              </p>
              <p>
                <strong>Material:</strong> {selectedInquiry.material || "—"}
              </p>
              <p>
                <strong>Finishing:</strong> {selectedInquiry.finishing || "—"}
              </p>
              <p>
                <strong>Printing:</strong> {selectedInquiry.printing || "—"}
              </p>
              <p>
                <strong>Processing:</strong> {selectedInquiry.processing || "—"}
              </p>
              <p>
                <strong>Delivery:</strong> {selectedInquiry.delivery || "—"}
              </p>
              {selectedInquiry.other && (
                <p>
                  <strong>Other:</strong> {selectedInquiry.other}
                </p>
              )}
            </div>

            {/* Editable admin fields */}
            <form onSubmit={handleSave}>
              <div className="dashform-group">
                <label>Status</label>
                <select
                  value={editFields.status}
                  onChange={(e) =>
                    setEditFields({ ...editFields, status: e.target.value })
                  }
                >
                  <option value="new">New</option>
                  <option value="converted">Converted</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="dashform-group">
                <label>Quoted Price (₱)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFields.quoted_price}
                  onChange={(e) =>
                    setEditFields({
                      ...editFields,
                      quoted_price: e.target.value,
                      status:
                        e.target.value && editFields.status === "new"
                          ? "converted"
                          : editFields.status,
                    })
                  }
                  placeholder="e.g. 1500.00"
                />
              </div>

              <div className="dashform-group">
                <label>Admin Notes</label>
                <textarea
                  value={editFields.admin_notes}
                  onChange={(e) =>
                    setEditFields({
                      ...editFields,
                      admin_notes: e.target.value,
                    })
                  }
                  placeholder="Internal notes for this inquiry..."
                  rows="3"
                />
              </div>

              {saveError && (
                <div className="profile-msg profile-msg-error">
                  {saveError}
                </div>
              )}

              {saveSuccess && (
                <div className="profile-msg profile-msg-success">
                  {saveSuccess}
                </div>
              )}

              <div className="ad-logout-actions">
                <button
                  type="button"
                  className="ad-logout-btn ghost"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="ad-logout-btn"
                  disabled={saving}
                  style={{ opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default AdminInquiries;
