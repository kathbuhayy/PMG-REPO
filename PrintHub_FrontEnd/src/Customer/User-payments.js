import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { buildApiUrl } from "../config/api";

import {
  FaArrowLeft,
  FaSearch,
  FaDownload,
  FaShareAlt,
  FaCalendarAlt,
  FaFileInvoiceDollar,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaShoppingBag,
  FaCreditCard,
  FaChevronRight,
  FaCopy,
  FaEnvelope,
  FaMapMarkerAlt,
  FaBoxOpen,
} from "react-icons/fa";

import "./User-payments.css";

function UserPayments() {
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    const loadPayments = async () => {
      try {
        const stored = localStorage.getItem("user");

        if (!stored) {
          navigate("/user-login", {
            state: { from: "/user-payments" },
          });
          return;
        }

        const user = JSON.parse(stored);

        if (!user?.id) {
          navigate("/user-login", {
            state: { from: "/user-payments" },
          });
          return;
        }

        const res = await fetch(
          buildApiUrl(`/api/user/${user.id}/payment-logs`)
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.message || "Failed to load payment logs."
          );
        }

        const paymentLogs = Array.isArray(data) ? data : [];

        setLogs(paymentLogs);

        if (paymentLogs.length > 0) {
          setSelected(paymentLogs[0]);
        }
      } catch (err) {
        setError(err.message || "Failed to load payment logs.");
      } finally {
        setLoading(false);
      }
    };

    loadPayments();
  }, [navigate]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(amount || 0));
  };

  const formatDate = (date) => {
    if (!date) return "Not paid yet";

    return new Date(date).toLocaleString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const displayLogs = useMemo(() => {
    return logs.filter((log) => {
      if (log.paymentStatus === "cancelled") {
        return false;
      }

      const status = log.paymentStatus || "";

      let matchesFilter = true;

      if (filter === "to-pay") {
        matchesFilter = status !== "paid";
      }

      if (filter === "paid") {
        matchesFilter = status === "paid";
      }

      if (filter === "failed") {
        matchesFilter =
          status === "failed" ||
          status === "cancelled";
      }

      const query = search.trim().toLowerCase();

      const matchesSearch =
        !query ||
        String(log.receiptNo || "")
          .toLowerCase()
          .includes(query) ||
        String(log.orderId || "")
          .toLowerCase()
          .includes(query) ||
        String(log.customerName || "")
          .toLowerCase()
          .includes(query);

      let matchesDate = true;

      if (dateFilter) {
        const paymentDate = log.paidAt || log.issuedAt;

        if (paymentDate) {
          const date = new Date(paymentDate);

          const selectedMonth = date.getMonth() + 1;
          const selectedYear = date.getFullYear();

          const [year, month] = dateFilter
            .split("-")
            .map(Number);

          matchesDate =
            selectedYear === year &&
            selectedMonth === month;
        } else {
          matchesDate = false;
        }
      }

      return (
        matchesFilter &&
        matchesSearch &&
        matchesDate
      );
    });
  }, [logs, filter, search, dateFilter]);

  const stats = useMemo(() => {
    const activeLogs = logs.filter(
      (log) => log.paymentStatus !== "cancelled"
    );

    const paidLogs = activeLogs.filter(
      (log) => log.paymentStatus === "paid"
    );

    const pendingLogs = activeLogs.filter(
      (log) => log.paymentStatus !== "paid"
    );

    const totalSpent = paidLogs.reduce(
      (sum, log) => sum + Number(log.total || 0),
      0
    );

    const pendingAmount = pendingLogs.reduce(
      (sum, log) => sum + Number(log.total || 0),
      0
    );

    return {
      totalOrders: activeLogs.length,
      totalSpent,
      paidAmount: totalSpent,
      pendingAmount,
      paidCount: paidLogs.length,
      pendingCount: pendingLogs.length,
    };
  }, [logs]);

  const getStatusInfo = (log) => {
    const status = String(
      log?.paymentStatus || ""
    ).toLowerCase();

    if (status === "paid") {
      return {
        label: "Paid",
        className: "paid",
        icon: <FaCheckCircle />,
      };
    }

    if (
      status === "failed" ||
      status === "cancelled"
    ) {
      return {
        label: "Failed",
        className: "failed",
        icon: <FaTimesCircle />,
      };
    }

    return {
      label: "Awaiting Payment",
      className: "pending",
      icon: <FaClock />,
    };
  };

  const handleSelect = (log) => {
    setSelected(log);
  };

  const copyReceiptNumber = async () => {
    if (!selected?.receiptNo) return;

    try {
      await navigator.clipboard.writeText(
        selected.receiptNo
      );
    } catch (err) {
      console.log("Unable to copy receipt number.");
    }
  };

  const handleShare = async () => {
    if (!selected) return;

    const shareText = `PMG Printing House
Receipt: ${selected.receiptNo}
Order #${selected.orderId}
Amount: ${formatCurrency(selected.total)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `PMG Invoice ${selected.receiptNo}`,
          text: shareText,
        });
      } catch (err) {
        // User cancelled sharing.
      }
    } else {
      try {
        await navigator.clipboard.writeText(
          shareText
        );
        alert("Invoice information copied.");
      } catch (err) {
        alert("Unable to share invoice information.");
      }
    }
  };

  const handleDownload = () => {
    if (!selected) return;

    // Customers can only download invoices after payment
    if (selected.paymentStatus !== "paid") {
      return;
    }

    window.print();
  };

  return (
    <main className="uo-page">
      {/* =====================================================
          RESOURCE NAVIGATION
          ===================================================== */}
      <div className="uo-resource-nav">
        <button
          type="button"
          className="uo-resource-tab"
          onClick={() => navigate("/user-orders")}
        >
          <FaShoppingBag />
          <span>Orders</span>
        </button>

        <button
          type="button"
          className="uo-resource-tab"
          onClick={() => navigate("/user-inquiries")}
        >
          <FaEnvelope />
          <span>Inquiries</span>
        </button>

        <button
          type="button"
          className="uo-resource-tab active"
          onClick={() => navigate("/user-payments")}
        >
          <FaCreditCard />
          <span>Payments</span>
        </button>
      </div>

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}
      <section className="upay-page-header">
        <button
          type="button"
          className="upay-back"
          onClick={() => navigate("/user-home")}
        >
          <FaArrowLeft />
          Back
        </button>

        <div className="upay-header-row">
          <div>
            <h1>Payment Logs & Invoices</h1>

            <p>
              Keep every receipt, status, and payment
              trail in one simple place.
            </p>
          </div>

          <div className="upay-header-icon">
            <FaFileInvoiceDollar />
          </div>
        </div>
      </section>

      {/* =====================================================
          SUMMARY CARDS
          ===================================================== */}
      {!loading && !error && (
        <section className="upay-summary-grid">
          <div className="upay-summary-card">
            <div className="upay-summary-icon green">
              <FaFileInvoiceDollar />
            </div>

            <div>
              <span>Total Spent</span>
              <strong>
                {formatCurrency(stats.totalSpent)}
              </strong>
              <small>All time</small>
            </div>
          </div>

          <div className="upay-summary-card">
            <div className="upay-summary-icon blue">
              <FaCheckCircle />
            </div>

            <div>
              <span>Paid</span>
              <strong>
                {formatCurrency(stats.paidAmount)}
              </strong>
              <small>
                {stats.paidCount} payment
                {stats.paidCount !== 1 ? "s" : ""}
              </small>
            </div>
          </div>

          <div className="upay-summary-card">
            <div className="upay-summary-icon orange">
              <FaClock />
            </div>

            <div>
              <span>Pending</span>
              <strong>
                {formatCurrency(stats.pendingAmount)}
              </strong>
              <small>
                {stats.pendingCount} payment
                {stats.pendingCount !== 1 ? "s" : ""}
              </small>
            </div>
          </div>

          <div className="upay-summary-card">
            <div className="upay-summary-icon purple">
              <FaShoppingBag />
            </div>

            <div>
              <span>Total Orders</span>
              <strong>{stats.totalOrders}</strong>
              <small>This account</small>
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          FILTER BAR
          ===================================================== */}
      {!loading && !error && logs.length > 0 && (
        <section className="upay-filter-card">
          <div className="upay-filter-group">
            <span className="upay-filter-label">
              Filter by status
            </span>

            <div className="upay-filter-tabs">
              <button
                type="button"
                className={
                  filter === "all" ? "active" : ""
                }
                onClick={() => setFilter("all")}
              >
                All
                <b>{logs.length}</b>
              </button>

              <button
                type="button"
                className={
                  filter === "to-pay" ? "active" : ""
                }
                onClick={() => setFilter("to-pay")}
              >
                To pay
                <b>{stats.pendingCount}</b>
              </button>

              <button
                type="button"
                className={
                  filter === "paid" ? "active" : ""
                }
                onClick={() => setFilter("paid")}
              >
                Paid
                <b>{stats.paidCount}</b>
              </button>

              <button
                type="button"
                className={
                  filter === "failed" ? "active" : ""
                }
                onClick={() => setFilter("failed")}
              >
                Failed
              </button>
            </div>
          </div>

          <div className="upay-date-filter">
            <span className="upay-filter-label">
              Date range
            </span>

            <div className="upay-date-input">
              <FaCalendarAlt />

              <input
                type="month"
                value={dateFilter}
                onChange={(e) =>
                  setDateFilter(e.target.value)
                }
              />

              {dateFilter && (
                <button
                  type="button"
                  onClick={() => setDateFilter("")}
                  aria-label="Clear date filter"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className="upay-search-wrapper">
            <FaSearch />

            <input
              type="text"
              placeholder="Search by receipt no., order no..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          <button
            type="button"
            className="upay-export-btn"
            onClick={handleDownload}
          >
            <FaDownload />
            Export
          </button>
        </section>
      )}

      {/* =====================================================
          LOADING
          ===================================================== */}
      {loading && (
        <div className="upay-state-card">
          <div className="upay-spinner"></div>
          <p>Loading payment logs...</p>
        </div>
      )}

      {/* =====================================================
          ERROR
          ===================================================== */}
      {!loading && error && (
        <div className="upay-state-card error">
          <FaTimesCircle />
          <p>{error}</p>
        </div>
      )}

      {/* =====================================================
          EMPTY
          ===================================================== */}
      {!loading &&
        !error &&
        logs.length === 0 && (
          <div className="upay-state-card">
            <FaFileInvoiceDollar />
            <h3>No payment logs yet</h3>
            <p>
              Your invoices and payment records will
              appear here once you have an order.
            </p>
          </div>
        )}

      {/* =====================================================
          MAIN PAYMENT WORKSPACE
          ===================================================== */}
      {!loading &&
        !error &&
        displayLogs.length > 0 && (
          <section className="upay-workspace">

            {/* =================================================
                PAYMENT LOG LIST
                ================================================= */}
            <div className="upay-log-panel">
              <div className="upay-log-table-header">
                <span>Receipt No.</span>
                <span>Order</span>
                <span>Date & Time</span>
                <span>Status</span>
                <span>Amount</span>
                <span></span>
              </div>

              <div className="upay-log-list">
                {displayLogs.map((log) => {
                  const status = getStatusInfo(log);

                  const isSelected =
                    selected?.orderId === log.orderId;

                  return (
                    <button
                      key={log.orderId}
                      type="button"
                      className={`upay-log-row ${isSelected ? "selected" : ""
                        }`}
                      onClick={() =>
                        handleSelect(log)
                      }
                    >
                      <div className="upay-receipt-cell">
                        <div
                          className={`upay-log-icon ${status.className}`}
                        >
                          {status.icon}
                        </div>

                        <div>
                          <div className="upay-receipt-title">
                            <strong>
                              {log.receiptNo}
                            </strong>

                            <FaCopy
                              className="upay-copy-icon"
                              onClick={(event) => {
                                event.stopPropagation();

                                navigator.clipboard
                                  ?.writeText(
                                    log.receiptNo
                                  );
                              }}
                            />
                          </div>

                          <span
                            className={`upay-mini-badge ${status.className}`}
                          >
                            {status.label ===
                              "Awaiting Payment"
                              ? "TO PAY"
                              : status.label.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="upay-order-cell">
                        Order #{log.orderId}
                      </div>

                      <div className="upay-date-cell">
                        <strong>
                          {formatShortDate(
                            log.paidAt || log.issuedAt
                          )}
                        </strong>

                        <span>
                          {log.paidAt || log.issuedAt
                            ? new Date(
                              log.paidAt ||
                              log.issuedAt
                            ).toLocaleTimeString(
                              "en-PH",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )
                            : "—"}
                        </span>
                      </div>

                      <div>
                        <span
                          className={`upay-status-pill ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </div>

                      <strong className="upay-row-amount">
                        {formatCurrency(log.total)}
                      </strong>

                      <FaChevronRight className="upay-row-arrow" />
                    </button>
                  );
                })}
              </div>

              <div className="upay-list-footer">
                <span>
                  Showing {displayLogs.length} of{" "}
                  {logs.filter(
                    (log) =>
                      log.paymentStatus !==
                      "cancelled"
                  ).length}
                </span>
              </div>
            </div>

            {/* =================================================
                INVOICE DETAIL
                ================================================= */}
            {selected && (
              <aside className="upay-invoice-panel">

                <div className="upay-invoice-top">
                  <div className="upay-invoice-heading">
                    <div
                      className={`upay-invoice-status-icon ${getStatusInfo(selected).className
                        }`}
                    >
                      {getStatusInfo(selected).icon}
                    </div>

                    <div>
                      <h2>
                        Receipt:{" "}
                        {selected.receiptNo}
                      </h2>

                      <p>
                        Order #{selected.orderId}
                        {" • "}
                        {formatDate(
                          selected.paidAt ||
                          selected.issuedAt
                        )}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`upay-invoice-status ${getStatusInfo(selected).className
                      }`}
                  >
                    {getStatusInfo(
                      selected
                    ).label.toUpperCase()}
                  </span>
                </div>

                <div className="upay-invoice-actions">
                  <button
                    type="button"
                    className={
                      selected.paymentStatus === "paid"
                        ? ""
                        : "disabled"
                    }
                    onClick={handleDownload}
                    disabled={selected.paymentStatus !== "paid"}
                    title={
                      selected.paymentStatus === "paid"
                        ? "Download invoice"
                        : "Invoice can only be downloaded after payment"
                    }
                  >
                    <FaDownload />

                    {selected.paymentStatus === "paid"
                      ? "Download Invoice"
                      : "Download After Payment"}
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                  >
                    <FaShareAlt />
                    Share
                  </button>
                </div>

                {/* CUSTOMER + PAYMENT */}
                <div className="upay-detail-grid">

                  <div className="upay-detail-box">
                    <div className="upay-detail-title">
                      <FaEnvelope />
                      <span>
                        Customer Details
                      </span>
                    </div>

                    <strong>
                      {selected.customerName ||
                        "Customer"}
                    </strong>

                    <p>
                      {selected.customerEmail ||
                        "No email available"}
                    </p>
                  </div>

                  <div className="upay-detail-box">
                    <div className="upay-detail-title">
                      <FaCreditCard />
                      <span>
                        Payment Details
                      </span>
                    </div>

                    <strong>
                      Method:{" "}
                      {selected.paymentMethod ||
                        "Online payment"}
                    </strong>

                    <p>
                      Ref:{" "}
                      {selected.paymentReference ||
                        "Pending confirmation"}
                    </p>
                  </div>
                </div>

                {/* SHIPPING */}
                {selected.shippingAddress && (
                  <div className="upay-shipping-box">
                    <div className="upay-section-heading">
                      <FaMapMarkerAlt />
                      <span>
                        Shipping Address
                      </span>
                    </div>

                    <strong>
                      {selected.shippingAddress}
                    </strong>
                  </div>
                )}

                {/* ITEMS */}
                <div className="upay-invoice-items">
                  <div className="upay-section-heading">
                    <FaBoxOpen />
                    <span>Items</span>
                  </div>

                  <div className="upay-items-table-head">
                    <span>Item</span>
                    <span>Qty</span>
                    <span>Price</span>
                    <span>Total</span>
                  </div>

                  <div className="upay-items-table">
                    {(selected.items || []).map(
                      (item) => (
                        <div
                          key={item.id}
                          className="upay-invoice-item"
                        >
                          <div className="upay-invoice-product">
                            <div className="upay-product-placeholder">
                              <FaBoxOpen />
                            </div>

                            <div>
                              <strong>
                                {item.productName}
                              </strong>

                              {item.customizationLabel && (
                                <small>
                                  {
                                    item.customizationLabel
                                  }
                                </small>
                              )}
                            </div>
                          </div>

                          <span>
                            {item.quantity}
                          </span>

                          <span>
                            {formatCurrency(
                              item.unitPrice
                            )}
                          </span>

                          <strong>
                            {formatCurrency(
                              item.totalPrice
                            )}
                          </strong>
                        </div>
                      )
                    )}

                    {(selected.items || []).length ===
                      0 && (
                        <div className="upay-no-items">
                          No item details available.
                        </div>
                      )}
                  </div>
                </div>

                {/* TOTAL */}
                <div className="upay-invoice-summary">
                  <div>
                    <span>Subtotal</span>
                    <strong>
                      {formatCurrency(
                        selected.subtotal
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Shipping Fee</span>
                    <strong>
                      {formatCurrency(
                        selected.shippingCost
                      )}
                    </strong>
                  </div>

                  <div className="grand-total">
                    <span>Total Paid</span>
                    <strong>
                      {formatCurrency(
                        selected.total
                      )}
                    </strong>
                  </div>
                </div>

                {/* EMAIL STATUS */}
                {selected.emailSent ? (
                  <div className="upay-email-notice success">
                    <FaCheckCircle />

                    <div>
                      <strong>
                        Confirmation Sent
                      </strong>

                      <p>
                        An e-receipt has been sent
                        to{" "}
                        {
                          selected.customerEmail
                        }
                        .
                      </p>
                    </div>
                  </div>
                ) : (
                  selected.mockEmail && (
                    <div className="upay-email-notice">
                      <FaEnvelope />

                      <div>
                        <strong>
                          Mock email notification
                        </strong>

                        <p>
                          <b>To:</b>{" "}
                          {selected.mockEmail
                            ?.to ||
                            selected.customerEmail}
                        </p>

                        <p>
                          <b>Subject:</b>{" "}
                          {selected.mockEmail
                            ?.subject ||
                            "Payment update"}
                        </p>

                        <p>
                          {selected.mockEmail
                            ?.body ||
                            "Payment details are available in this invoice."}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </aside>
            )}
          </section>
        )}
    </main>
  );
}

export default UserPayments;