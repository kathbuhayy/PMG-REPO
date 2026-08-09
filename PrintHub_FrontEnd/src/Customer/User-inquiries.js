import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./User-inquiries.css";
import "./User-orders.css";
import { FaArrowLeft, FaFileInvoiceDollar } from "react-icons/fa";
import { buildApiUrl } from "../config/api";

// Helper to render design preview
const renderInquiryDesignPreview = (designData) => {
  if (!designData) return null;

  return (
    <div style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #e2e8f0" }}>
      <strong style={{ fontSize: "13px", display: "block", marginBottom: "8px" }}>
        Design Attached:
      </strong>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        {designData.zones && Object.values(designData.zones).map((zone, idx) => {
          if (!zone?.imageUrl) return null;
          return (
            <img
              key={idx}
              src={zone.imageUrl}
              alt="design"
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "4px",
                border: "1px solid #cbd5e1",
                objectFit: "cover",
              }}
            />
          );
        })}
        {designData.generatedImageUrl && (
          <img
            src={designData.generatedImageUrl}
            alt="design"
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "4px",
              border: "1px solid #cbd5e1",
              objectFit: "cover",
            }}
          />
        )}
      </div>
    </div>
  );
};

const STATUS_META = {
  new: { label: "New", color: "#e67e22" },
  quoted: { label: "Quoted", color: "#2980b9" },
  accepted: { label: "Accepted", color: "#27ae60" },
  closed: { label: "Closed", color: "#95a5a6" },
  converted: { label: "Converted to Order", color: "#8e44ad" },
};

function UserInquiries() {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const fetchInquiries = async () => {
      try {
        const stored = localStorage.getItem("user");
        if (!stored) {
          navigate("/user-login");
          return;
        }
        const user = JSON.parse(stored);
        if (!user?.id) {
          navigate("/user-login");
          return;
        }
        const res = await fetch(buildApiUrl(`/api/user/${user.id}/inquiries`));
        const data = await res.json();
        if (!res.ok)
          throw new Error(data?.message || "Failed to load inquiries");
        setInquiries(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        setError(err.message || "Failed to load inquiries");
        setInquiries([]);
      } finally {
        setLoading(false);
      }
    };
    fetchInquiries();
  }, [navigate]);

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatPrice = (price) =>
    price != null
      ? new Intl.NumberFormat("en-PH", {
          style: "currency",
          currency: "PHP",
        }).format(price)
      : null;

  return (
    <>
      <div className="uo-page fade-in-up">
        {/* Tab switcher */}
        <div className="uo-resource-nav">
          <button
            type="button"
            className="uo-resource-tab"
            onClick={() => navigate("/user-orders")}
          >
            Orders
          </button>
          <button
            type="button"
            className="uo-resource-tab active"
            onClick={() => navigate("/user-inquiries")}
          >
            Inquiries
          </button>
          <button
            type="button"
            className="uo-resource-tab"
            onClick={() => navigate("/user-payments")}
          >
            Payments
          </button>
        </div>

        <div className="uo-top">
          <button
            className="uo-back"
            type="button"
            onClick={() => navigate("/user-home")}
          >
            <FaArrowLeft /> Back
          </button>
          <h1 className="uo-title">My Inquiries</h1>
          <p className="uo-subtitle">
            Track and manage your custom quote requests and feedback.
          </p>
        </div>

        {loading && (
          <div className="uo-loading">
            <p>Loading inquiries...</p>
          </div>
        )}

        {error && (
          <div className="uo-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && inquiries.length === 0 && (
          <div className="uo-empty">
            <FaFileInvoiceDollar size={40} color="#cbd5e1" />
            <p>You haven't submitted any quote requests yet.</p>
            <button
              className="uo-shop-btn"
              type="button"
              onClick={() => navigate("/product-overview")}
            >
              Submit an Inquiry
            </button>
          </div>
        )}

        {!loading && !error && inquiries.length > 0 && (
          <div className="ui-list">
            {inquiries.map((inq) => {
              const meta = STATUS_META[inq.status] || STATUS_META.new;
              const isOpen = expanded === inq.id;
              return (
                <div key={inq.id} className="ui-card">
                  {/* Card header */}
                  <div
                    className="ui-card-header"
                    role="button"
                    tabIndex={0}
                    onClick={() => setExpanded(isOpen ? null : inq.id)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && setExpanded(isOpen ? null : inq.id)
                    }
                  >
                    <div className="ui-card-left">
                      <span className="ui-card-id">Inquiry #{inq.id}</span>
                      <span className="ui-card-date">
                        {formatDate(inq.createdAt)}
                      </span>
                      {inq.product_title && (
                        <span className="ui-card-product">
                          {inq.product_title}
                        </span>
                      )}
                    </div>
                    <div className="ui-card-right">
                      <span
                        className="ui-status-pill"
                        style={{ background: meta.color }}
                      >
                        {meta.label}
                      </span>
                      <span className="ui-chevron">{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="ui-card-body">
                      {/* Quote price banner */}
                      {inq.quoted_price != null ? (
                        <div className="ui-quoted-banner">
                          <strong>Quoted Price:</strong>{" "}
                          {formatPrice(inq.quoted_price)}
                          {inq.status === "quoted" && (
                            <p className="ui-quoted-info">
                              Our team has sent you a quote. Please contact us
                              to proceed with your order.
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="ui-pending-banner">
                          Your request is being reviewed. We'll get back to you
                          shortly.
                        </div>
                      )}

                      {/* Admin notes (visible to customer) */}
                      {inq.admin_notes && (
                        <div className="ui-admin-note">
                          <strong>Note from our team:</strong>
                          <p>{inq.admin_notes}</p>
                        </div>
                      )}

                      {inq.design_data && renderInquiryDesignPreview(inq.design_data)}

                      {/* Request details */}
                      <div className="ui-details-grid">
                        {[
                          ["Subject", inq.subject],
                          ["Product", inq.product_title],
                          ["Quantity", inq.quantity],
                          ["Size", inq.size],
                          ["Color", inq.color],
                          ["Material", inq.material],
                          ["Finishing", inq.finishing],
                          ["Printing", inq.printing],
                          ["Processing", inq.processing],
                          ["Delivery", inq.delivery],
                          ["Other", inq.other],
                        ]
                          .filter(([, val]) => val)
                          .map(([label, val]) => (
                            <div key={label} className="ui-detail-row">
                              <span className="ui-detail-label">{label}</span>
                              <span className="ui-detail-val">{val}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

export default UserInquiries;
