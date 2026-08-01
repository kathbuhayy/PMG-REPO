import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../config/api";
import {
  FaArrowLeft,
  FaEnvelope,
  FaFileInvoiceDollar,
  FaCheckCircle,
} from "react-icons/fa";
import "./User-payments.css";

function UserPayments() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const loadPayments = async () => {
      try {
        const stored = localStorage.getItem("user");
        if (!stored) {
          navigate("/user-login", { state: { from: "/user-payments" } });
          return;
        }

        const user = JSON.parse(stored);
        if (!user?.id) {
          navigate("/user-login", { state: { from: "/user-payments" } });
          return;
        }

        const res = await fetch(buildApiUrl(`/api/user/${user.id}/payment-logs`));
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load payments");
        setLogs(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Failed to load payments");
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, [navigate]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(amount || 0));

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleString("en-PH", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Not paid yet";

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
            className="uo-resource-tab"
            onClick={() => navigate("/user-inquiries")}
          >
            Inquiries
          </button>
          <button
            type="button"
            className="uo-resource-tab active"
            onClick={() => navigate("/user-payments")}
          >
            Payments
          </button>
        </div>

        <div className="uo-top">
          <button
            type="button"
            className="uo-back"
            onClick={() => navigate("/user-home")}
          >
            <FaArrowLeft /> Back
          </button>
          <div>
            <h1 className="uo-title">Payment Logs & Invoices</h1>
            <p className="uo-subtitle">
              Keep every receipt, status, and payment trail in one simple place.
            </p>
          </div>
        </div>

        {loading && <div className="uo-loading">Loading payment logs...</div>}
        {error && <div className="uo-error">{error}</div>}

        {!loading && !error && logs.length === 0 && (
          <div className="uo-empty">
            <FaFileInvoiceDollar size={36} />
            <p>No payment logs yet.</p>
          </div>
        )}

        {!loading && !error && logs.length > 0 && (
          <div className="upay-list">
            {logs.map((log) => (
              <article key={log.orderId} className="upay-card">
                <div className="upay-card-main">
                  <span
                    className={`upay-status-badge ${
                      log.paymentStatus === "paid" ? "paid" : "pending"
                    }`}
                  >
                    {log.paymentStatus === "paid" ? "Paid" : "To pay"}
                  </span>
                  <h2 className="upay-receipt-no">{log.receiptNo}</h2>
                  <p className="upay-order-id">Order #{log.orderId}</p>
                  <p className="upay-date">
                    {formatDate(log.paidAt || log.issuedAt)}
                  </p>
                </div>
                <div className="upay-card-side">
                  <span className="upay-amount">
                    {formatCurrency(log.total)}
                  </span>
                  <button
                    type="button"
                    className="upay-view-btn"
                    onClick={() => setSelected(log)}
                  >
                    {log.paymentStatus === "paid"
                      ? "View E-Receipt"
                      : "View Invoice"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {selected && createPortal(
          <div
            className="upay-modal-overlay"
            onClick={() => setSelected(null)}
          >
            <div
              className="upay-modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header block with brand gradient */}
              <div className="upay-modal-header-strip">
                <span className="upay-modal-brand">PrintHub</span>
                <span className="upay-modal-receipt-label">
                  {selected.paymentStatus === "paid" ? "E-RECEIPT" : "INVOICE"}
                </span>
              </div>

              <button
                type="button"
                className="upay-modal-close"
                onClick={() => setSelected(null)}
              >
                &times;
              </button>

              <div className="upay-modal-meta-section">
                <div className="upay-modal-receipt-no">
                  Receipt: {selected.receiptNo}
                </div>
                <div className="upay-modal-date-label">
                  Date: {formatDate(selected.paidAt || selected.issuedAt)}
                </div>
                <span className={`upay-status-badge ${selected.paymentStatus}`}>
                  {selected.paymentStatus.toUpperCase()}
                </span>
              </div>

              <div className="upay-modal-details-grid">
                <div className="upay-modal-detail-col">
                  <strong>Customer details</strong>
                  <p>{selected.customerName}</p>
                  <p className="upay-detail-sub">{selected.customerEmail}</p>
                </div>
                <div className="upay-modal-detail-col">
                  <strong>Payment details</strong>
                  <p>Method: {selected.paymentMethod}</p>
                  <p className="upay-detail-sub">
                    Ref: {selected.paymentReference || "Pending confirmation"}
                  </p>
                </div>
              </div>

              {selected.shippingAddress && (
                <div className="upay-modal-shipping-block">
                  <strong>Shipping Address</strong>
                  <p>{selected.shippingAddress}</p>
                </div>
              )}

              <div className="upay-modal-items-section">
                <div className="upay-items-header">
                  <span>Item</span>
                  <span style={{ textAlign: "center" }}>Qty</span>
                  <span style={{ textAlign: "right" }}>Price</span>
                  <span style={{ textAlign: "right" }}>Total</span>
                </div>
                <div className="upay-items-list-container">
                  {(selected.items || []).map((item) => (
                    <div key={item.id} className="upay-item-row-detail">
                      <span className="upay-item-name-cell">
                        <strong>{item.productName}</strong>
                        {item.customizationLabel && (
                          <small className="upay-item-customizations-label">
                            {item.customizationLabel}
                          </small>
                        )}
                      </span>
                      <span className="upay-item-qty-cell">
                        {item.quantity}
                      </span>
                      <span className="upay-item-price-cell">
                        {formatCurrency(item.unitPrice)}
                      </span>
                      <span className="upay-item-total-cell">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="upay-modal-summary-section">
                <div className="upay-summary-row">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selected.subtotal)}</span>
                </div>
                <div className="upay-summary-row">
                  <span>Shipping:</span>
                  <span>{formatCurrency(selected.shippingCost)}</span>
                </div>
                <div className="upay-summary-row upay-summary-grand">
                  <span>Total paid:</span>
                  <span>{formatCurrency(selected.total)}</span>
                </div>
              </div>

              {/* Conditional indicator or mock email block */}
              {selected.emailSent ? (
                <div className="upay-modal-email-sent">
                  <FaCheckCircle className="upay-email-icon" />
                  <div className="upay-email-content">
                    <strong>Confirmation Sent</strong>
                    <p>
                      An e-receipt has been sent to {selected.customerEmail}.
                    </p>
                  </div>
                </div>
              ) : (
                selected.mockEmail && (
                  <div className="upay-modal-mock-email">
                    <FaEnvelope className="upay-email-icon" />
                    <div className="upay-email-content">
                      <strong>Mock email notification (SMTP disabled)</strong>
                      <p>
                        <strong>To:</strong>{" "}
                        {selected.mockEmail?.to || selected.customerEmail}
                      </p>
                      <p>
                        <strong>Subject:</strong>{" "}
                        {selected.mockEmail?.subject || "Payment update"}
                      </p>
                      <p className="upay-email-body">
                        {selected.mockEmail?.body ||
                          "Payment details are available in this invoice."}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>,
          document.body
        )}
      </div>
    </>
  );
}

export default UserPayments;
