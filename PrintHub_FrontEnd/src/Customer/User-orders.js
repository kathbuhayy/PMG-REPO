import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./User-orders.css";
import "./User-inquiries.css";
import { FaArrowLeft } from "react-icons/fa";
import { buildApiUrl } from "../config/api";
import { Capacitor } from "@capacitor/core";
import AppModal from "../components/AppModal";

const ORDER_TABS = [
  { key: "all", label: "All" },
  { key: "to_pay", label: "To pay" },
  { key: "to_receive", label: "To receive" },
  // { key: "to_review", label: "To review" },
  // { key: "return", label: "Return" },
];

async function readApiResponse(response, fallbackMessage) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const body = await response.text();
  const looksLikeHtml = body.trim().startsWith("<");
  return {
    message: response.ok
      ? fallbackMessage
      : looksLikeHtml
        ? "The payment service is not updated yet. Please restart or redeploy the backend."
        : body || fallbackMessage,
    nonJson: true,
  };
}

function getOrderBucket(order) {
  if (order.status === "return_requested") return "return";
  if (order.payment_status !== "paid" && order.status !== "cancelled") {
    return "to_pay";
  }
  if (
    order.payment_status === "paid" &&
    ["delivered", "completed"].includes(order.status)
  ) {
    return "to_review";
  }
  if (
    order.payment_status === "paid" &&
    !["delivered", "completed", "cancelled", "return_requested"].includes(
      order.status,
    )
  ) {
    return "to_receive";
  }
  return "all";
}

function UserOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [cancellingId, setCancellingId] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [complaintOrder, setComplaintOrder] = useState(null);
  const [complaintReason, setComplaintReason] = useState("");
  const [complaintDetails, setComplaintDetails] = useState("");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [noticeModal, setNoticeModal] = useState(null);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [qrPayment, setQrPayment] = useState(null);
  const [checkingQrPayment, setCheckingQrPayment] = useState(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, []);

  const fetchOrders = async () => {
    try {
      if (!currentUser?.id) {
        navigate("/user-login", { state: { from: "/user-orders" } });
        return;
      }

      const res = await fetch(
        buildApiUrl(`/api/user/${currentUser.id}/orders`),
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to load orders");

      const sortedOrders = Array.isArray(data)
        ? data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        : [];
      setOrders(sortedOrders);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load orders");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  useEffect(() => {
    let intervalId;
    if (qrPayment?.order_id) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(
            buildApiUrl(`/api/payments/${qrPayment.order_id}/status`)
          );
          const data = await res.json();
          if (res.ok && data.payment_status === "paid") {
            setOrders((prev) =>
              prev.map((order) =>
                order.id === qrPayment.order_id
                  ? {
                      ...order,
                      payment_status: "paid",
                      status: data.order?.status || "confirmed",
                      payment_method: data.order?.payment_method || "qrph",
                      payment_reference: data.order?.payment_reference,
                    }
                  : order,
              ),
            );
            setQrPayment(null);
            setPayingId(null);
            setNoticeModal({
              title: "Payment confirmed",
              message:
                "Your payment was verified and your order is confirmed.",
              tone: "success",
            });
          } else if (
            data.payment_status === "expired" ||
            data.payment_status === "failed"
          ) {
            setOrders((prev) =>
              prev.map((order) =>
                order.id === qrPayment.order_id
                  ? { ...order, payment_status: data.payment_status }
                  : order,
              ),
            );
            setQrPayment(null);
            setPayingId(null);
            setNoticeModal({
              title:
                data.payment_status === "expired"
                  ? "Payment Expired"
                  : "Payment Failed",
              message:
                data.payment_status === "expired"
                  ? "The QR code has expired. Please try paying again."
                  : "Your payment attempt failed. Please try again.",
              tone: "danger",
            });
          }
        } catch (err) {
          console.error("Error polling status:", err);
        }
      }, 5000); // Poll status every 5 seconds
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [qrPayment, navigate]);

  const filteredOrders = useMemo(() => {
    const activeOrders = orders.filter(
      (order) => order.status !== "cancelled"
    );
    if (activeFilter === "all") return activeOrders;
    return activeOrders.filter(
      (order) => getOrderBucket(order) === activeFilter
    );
  }, [activeFilter, orders]);

  const tabCounts = useMemo(() => {
    const activeOrders = orders.filter(
      (order) => order.status !== "cancelled"
    );
    return ORDER_TABS.reduce((acc, tab) => {
      acc[tab.key] =
        tab.key === "all"
          ? activeOrders.length
          : activeOrders.filter(
              (order) => getOrderBucket(order) === tab.key
            ).length;
      return acc;
    }, {});
  }, [orders]);

  const performCancelOrder = async (orderId) => {
    setCancelTargetId(null);
    setCancellingId(orderId);
    try {
      const res = await fetch(buildApiUrl(`/api/orders/${orderId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to cancel order");
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "cancelled" } : o)),
      );
      setNoticeModal({
        title: "Order cancelled",
        message: "Your order has been cancelled.",
        tone: "success",
      });
    } catch (err) {
      setNoticeModal({
        title: "Could not cancel order",
        message: err.message || "Please try again.",
        tone: "danger",
      });
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelOrder = async (orderId) => {
    setCancelTargetId(orderId);
  };

  const handlePayNow = async (order) => {
    setPayingId(order.id);
    try {
      if (Capacitor.isNativePlatform()) {
        const res = await fetch(buildApiUrl("/api/payments/qrph"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order.id }),
        });
        const data = await readApiResponse(res, "Failed to create QR payment");
        if (!res.ok || !data.qr_image_url) {
          throw new Error(
            data.message ||
            data.details?.[0]?.detail ||
            "Could not create the GCash QR code. Please restart or redeploy the backend with the latest payment update.",
          );
        }

        setQrPayment({
          ...data,
          order,
          createdAt: Date.now(),
        });
        return;
      }

      const paymentReturnBase = Capacitor.isNativePlatform()
        ? process.env.REACT_APP_PAYMENT_RETURN_BASE ||
        process.env.REACT_APP_PUBLIC_FRONTEND_URL ||
        "https://project-n80jh.vercel.app"
        : window.location.origin;

      const res = await fetch(buildApiUrl("/api/payments/checkout"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          returnBase: paymentReturnBase,
          compactCheckout: false,
        }),
      });
      const data = await readApiResponse(
        res,
        "Failed to create payment session",
      );
      if (!res.ok || !data.checkout_url) {
        throw new Error(
          data.message ||
          data.details?.[0]?.detail ||
          "Failed to create payment session",
        );
      }
      window.location.assign(data.checkout_url);
    } catch (err) {
      setNoticeModal({
        title: "Payment could not start",
        message: err.message || "Could not initiate payment. Please try again.",
        tone: "danger",
      });
      setPayingId(null);
    }
  };

  const handleCheckQrPayment = async () => {
    if (!qrPayment?.order_id) return;
    setCheckingQrPayment(true);
    try {
      const res = await fetch(
        buildApiUrl(`/api/payments/${qrPayment.order_id}/status`),
      );
      const data = await readApiResponse(res, "Could not verify payment");
      if (!res.ok) throw new Error(data.message || "Could not verify payment");

      if (data.payment_status === "paid") {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === qrPayment.order_id
              ? {
                  ...order,
                  payment_status: "paid",
                  status: data.order?.status || "confirmed",
                  payment_method: data.order?.payment_method || "qrph",
                  payment_reference: data.order?.payment_reference,
                }
              : order,
          ),
        );
        setQrPayment(null);
        setPayingId(null);
        setNoticeModal({
          title: "Payment confirmed",
          message: "Your payment was verified and your order is now confirmed.",
          tone: "success",
        });
      } else if (data.payment_status === "expired") {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === qrPayment.order_id
              ? { ...order, payment_status: "expired" }
              : order,
          ),
        );
        setQrPayment(null);
        setPayingId(null);
        setNoticeModal({
          title: "Payment Expired",
          message:
            "The QR code has expired. " +
            "Please try paying again to generate a new QR code.",
          tone: "danger",
        });
      } else if (data.payment_status === "failed") {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === qrPayment.order_id
              ? { ...order, payment_status: "failed" }
              : order,
          ),
        );
        setQrPayment(null);
        setPayingId(null);
        setNoticeModal({
          title: "Payment Failed",
          message:
            "Your payment attempt failed. " +
            "Please check your details and try again.",
          tone: "danger",
        });
      } else {
        setNoticeModal({
          title: "Payment not confirmed yet",
          message:
            "If you already paid in GCash, " +
            "wait a few seconds and tap Check Payment again.",
          tone: "info",
        });
      }
    } catch (err) {
      setNoticeModal({
        title: "Could not verify payment",
        message: err.message || "Please try checking again.",
        tone: "danger",
      });
    } finally {
      setCheckingQrPayment(false);
    }
  };

  const closeQrPayment = () => {
    setQrPayment(null);
    setPayingId(null);
  };

  const handleViewReceipt = async (orderId) => {
    try {
      const res = await fetch(buildApiUrl(`/api/orders/${orderId}/receipt`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load receipt");
      setReceipt(data);
    } catch (err) {
      setNoticeModal({
        title: "Receipt unavailable",
        message: err.message || "Could not load e-receipt.",
        tone: "danger",
      });
    }
  };

  const handleOrderReceived = async (orderId) => {
    try {
      const res = await fetch(buildApiUrl(`/api/orders/${orderId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update order");

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: "completed" } : order,
        ),
      );
      setNoticeModal({
        title: "Order received",
        message: "Your order has been marked as completed.",
        tone: "success",
      });
    } catch (err) {
      setNoticeModal({
        title: "Could not update order",
        message: err.message || "Please try again.",
        tone: "danger",
      });
    }
  };

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    if (!complaintOrder || !complaintReason.trim()) return;
    setSubmittingComplaint(true);
    try {
      const res = await fetch(
        buildApiUrl(`/api/orders/${complaintOrder.id}/return-complaint`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            reason: complaintReason,
            details: complaintDetails,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.message || "Failed to submit complaint");
      setOrders((prev) =>
        prev.map((order) =>
          order.id === complaintOrder.id
            ? { ...order, status: "return_requested" }
            : order,
        ),
      );
      setComplaintOrder(null);
      setComplaintReason("");
      setComplaintDetails("");
      setNoticeModal({
        title: "Return request submitted",
        message: `${data.message}. Mock email: ${data.mockEmail?.subject || "received"}`,
        tone: "success",
      });
    } catch (err) {
      setNoticeModal({
        title: "Could not submit return",
        message: err.message || "Could not submit return complaint.",
        tone: "danger",
      });
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const formatCurrency = (price) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(price || 0));

  const getStatusLabel = (order) => {
    if (order.status === "return_requested") return "Return requested";
    if (order.status === "cancelled") return "Cancelled";
    if (order.payment_status !== "paid" && !order.proofApproved) {
      return "Waiting for approval";
    }
    if (order.payment_status !== "paid") return "Payment pending";
    if (order.status === "delivered") return "Delivered";
    return order.status?.charAt(0).toUpperCase() + order.status?.slice(1);
  };

  const getStatusClass = (order) => {
    if (order.status === "return_requested") return "return";
    if (order.status === "cancelled") return "cancelled";
    if (order.payment_status !== "paid") return "pending";
    if (order.status === "delivered") return "delivered";
    return "paid";
  };

  const renderTimeline = (order) => {
    if (order.status === "cancelled" || order.status === "return_requested") return null;
    const steps = [
      { key: "placed", label: "Placed" },
      { key: "approved", label: "Approved" },
      { key: "paid", label: "Paid" },
      { key: "processing", label: "Processing" },
      { key: "delivered", label: "Delivered" },
      { key: "completed", label: "Completed" },
    ];
    const currentIdx = 
      order.status === "completed" ? 5 :
      order.status === "delivered" ? 4 :
      order.status === "processing" ? 3 :
      order.payment_status === "paid" ? 2 :
      order.proofApproved ? 1 : 0;

    return (
      <div className="uo-timeline">
        {steps.map((step, idx) => {
          let className = "uo-timeline-step";
          if (idx < currentIdx) className += " completed";
          else if (idx === currentIdx) className += " active";
          return <div key={step.key} className={className}>{step.label}</div>;
        })}
      </div>
    );
  };

  const renderOrder = (order) => (
    <div key={order.id} className="uo-order-card">
      <div className="uo-order-header">
        <div className="uo-order-info">
          <h3>Order #{order.id}</h3>
          <p className="uo-date">
            {new Date(order.createdAt).toLocaleDateString("en-PH", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className={`uo-status ${getStatusClass(order)}`}>
          {getStatusLabel(order)}
        </div>
      </div>
      {renderTimeline(order)}

      <div className="uo-items">
        <h4>Items</h4>
        {order.items?.length ? (
          <div className="uo-items-list">
            {order.items.map((item) => {
              const design = item.customizations?.design;
              const productImg = item.product?.images?.[0];
              const productName =
                item.product?.name || `Product #${item.productId}`;
              const zoneImgs = Object.values(design?.zones || {})
                .filter((z) => z?.imageUrl)
                .map((z) => z.imageUrl);
              const imgs = zoneImgs.length
                ? zoneImgs
                : design?.generatedImageUrl
                  ? [design.generatedImageUrl]
                  : [];

              return (
                <div key={item.id} className="uo-item-row">
                  <div className="uo-item-thumbs">
                    {productImg && (
                      <img
                        src={productImg}
                        alt={productName}
                        className="uo-item-thumb"
                      />
                    )}
                    {imgs.map((src, i) => (
                      <div key={i} className="uo-item-design-wrap">
                        <img
                          src={src}
                          alt={`Design ${i + 1}`}
                          className="uo-item-thumb uo-item-thumb-design"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="uo-item-details">
                    <p className="uo-item-name">{productName}</p>
                    {design?.prompt && (
                      <p className="uo-item-design-prompt">
                        "
                        {design.prompt.length > 80
                          ? design.prompt.slice(0, 80) + "..."
                          : design.prompt}
                        "
                      </p>
                    )}
                    <p className="uo-item-qty">Qty: {item.quantity}</p>
                  </div>
                  <div className="uo-item-price">
                    {formatCurrency(item.unit_price)} x {item.quantity} ={" "}
                    {formatCurrency(item.total_price)}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="uo-no-items">No items in this order</p>
        )}
      </div>

      {order.shipping_address && (
        <div className="uo-shipping">
          <h4>Shipping Address</h4>
          <p>{order.shipping_address}</p>
        </div>
      )}

      <div className="uo-order-footer">
        <div className="uo-total">
          <strong>Total:</strong>
          <strong>{formatCurrency(order.total)}</strong>
        </div>
        <div className="uo-action-row">
          {order.payment_status !== "paid" && order.status !== "cancelled" && (
            <>
              <button
                type="button"
                className="uo-cancel-btn"
                disabled={cancellingId === order.id}
                onClick={() => handleCancelOrder(order.id)}
              >
                {cancellingId === order.id ? "Cancelling..." : "Cancel Order"}
              </button>
              {order.proofApproved ? (
                <button
                  type="button"
                  className="uo-pay-btn"
                  disabled={payingId === order.id}
                  onClick={() => handlePayNow(order)}
                >
                  {payingId === order.id ? "Redirecting..." : "Pay Now"}
                </button>
              ) : (
                <button type="button" className="uo-pay-btn" disabled>
                  Waiting for seller
                </button>
              )}
            </>
          )}

          {order.payment_status === "paid" && (
            <button
              type="button"
              className="uo-receipt-btn"
              onClick={() => handleViewReceipt(order.id)}
            >
              E-Receipt
            </button>
          )}

          {order.payment_status === "paid" &&
            !["completed", "cancelled", "return_requested"].includes(
              order.status,
            ) && (
              <button
                type="button"
                className="uo-return-btn"
                onClick={() => handleOrderReceived(order.id)}
              >
                Order Received
              </button>
            )}

          {order.payment_status === "paid" && order.status === "delivered" && (
            <button
              type="button"
              className="uo-return-btn"
              onClick={() => setComplaintOrder(order)}
            >
              File complaint
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="uo-page fade-in-up">
        {/* Tab switcher */}
        <div className="uo-resource-nav">
          <button
            type="button"
            className="uo-resource-tab active"
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
          <h1 className="uo-title">My Orders</h1>
          <p className="uo-subtitle">
            Track and manage your custom printing orders and approvals.
          </p>
        </div>

        <div className="uo-filter-tabs">
          {ORDER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`uo-filter-tab ${activeFilter === tab.key ? "active" : ""
                }`}
              onClick={() => setActiveFilter(tab.key)}
            >
              {tab.label}
              <span>{tabCounts[tab.key] || 0}</span>
            </button>
          ))}
        </div>

        {loading && (
          <div className="uo-loading">
            <p>Loading orders...</p>
          </div>
        )}

        {error && (
          <div className="uo-error">
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="uo-empty">
            <p>No orders yet.</p>
            <button
              className="uo-shop-btn"
              type="button"
              onClick={() => navigate("/product-overview")}
            >
              Start Shopping
            </button>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="uo-orders">
            {filteredOrders.length ? (
              filteredOrders.map(renderOrder)
            ) : (
              <div className="uo-empty">
                <p>No orders in this tab.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {receipt && (
        <div className="uo-modal" role="dialog" aria-modal="true">
          <div className="uo-modal-card">
            <button
              type="button"
              className="uo-modal-close"
              onClick={() => setReceipt(null)}
            >
              x
            </button>
            <h2>E-Receipt</h2>
            <div className="uo-receipt-meta">
              <span>{receipt.receiptNo}</span>
              <span>{receipt.paymentStatus.toUpperCase()}</span>
            </div>
            <p>
              <strong>Customer:</strong> {receipt.customerName}
            </p>
            <p>
              <strong>Payment Reference:</strong>{" "}
              {receipt.paymentReference || "Pending confirmation"}
            </p>
            <div className="uo-receipt-items">
              {(receipt.items || []).map((item) => (
                <div key={item.id}>
                  <span>
                    {item.productName} x {item.quantity}
                  </span>
                  <strong>{formatCurrency(item.totalPrice)}</strong>
                </div>
              ))}
            </div>
            <div className="uo-receipt-total">
              <span>Total</span>
              <strong>{formatCurrency(receipt.total)}</strong>
            </div>
            <div className="uo-mock-email">
              <strong>Mock email notification</strong>
              <p>To: {receipt.mockEmail?.to || receipt.customerEmail}</p>
              <p>Subject: {receipt.mockEmail?.subject || "Payment update"}</p>
              <p>
                {receipt.mockEmail?.body ||
                  "Payment details are available in this receipt."}
              </p>
            </div>
          </div>
        </div>
      )}

      {qrPayment && (
        <div className="uo-modal" role="dialog" aria-modal="true">
          <div className="uo-modal-card uo-qr-card">
            <button
              type="button"
              className="uo-modal-close"
              onClick={closeQrPayment}
              aria-label="Close QR payment"
            >
              x
            </button>
            <h2>Scan to Pay</h2>
            <p className="uo-qr-copy">
              Open GCash, Maya, or any QR Ph banking app and scan this code.
            </p>
            <div className="uo-qr-frame">
              <img
                src={qrPayment.qr_image_url}
                alt="GCash QR Ph payment code"
              />
            </div>
            <div className="uo-qr-total">
              <span>Total Due</span>
              <strong>{formatCurrency((qrPayment.amount || 0) / 100)}</strong>
            </div>
            <p className="uo-qr-note">
              This QR is single-use and expires after about 30 minutes.
            </p>
            <button
              type="button"
              className="uo-submit-return"
              onClick={handleCheckQrPayment}
              disabled={checkingQrPayment}
            >
              {checkingQrPayment ? "Checking..." : "Check Payment"}
            </button>
          </div>
        </div>
      )}

      {complaintOrder && (
        <div className="uo-modal" role="dialog" aria-modal="true">
          <form className="uo-modal-card" onSubmit={handleSubmitComplaint}>
            <button
              type="button"
              className="uo-modal-close"
              onClick={() => setComplaintOrder(null)}
            >
              x
            </button>
            <h2>Return Complaint</h2>
            <p>Order #{complaintOrder.id}</p>
            <label>
              Reason
              <select
                value={complaintReason}
                onChange={(e) => setComplaintReason(e.target.value)}
                required
              >
                <option value="">Select a reason</option>
                <option value="Faulty or damaged product">
                  Faulty or damaged product
                </option>
                <option value="Wrong item or print">Wrong item or print</option>
                <option value="Poor print quality">Poor print quality</option>
                <option value="Missing item">Missing item</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>
              Details
              <textarea
                value={complaintDetails}
                onChange={(e) => setComplaintDetails(e.target.value)}
                rows="4"
                placeholder="Describe the problem so staff can review it."
              />
            </label>
            <button
              type="submit"
              className="uo-submit-return"
              disabled={submittingComplaint || !complaintReason}
            >
              {submittingComplaint ? "Submitting..." : "Submit complaint"}
            </button>
          </form>
        </div>
      )}

      <AppModal
        open={Boolean(cancelTargetId)}
        title="Cancel this order?"
        message="This will mark the order as cancelled. You can place a new order anytime."
        tone="danger"
        confirmText="Cancel Order"
        cancelText="Keep Order"
        onCancel={() => setCancelTargetId(null)}
        onConfirm={() => performCancelOrder(cancelTargetId)}
      />

      <AppModal
        open={Boolean(noticeModal)}
        title={noticeModal?.title}
        message={noticeModal?.message}
        tone={noticeModal?.tone}
        onConfirm={() => setNoticeModal(null)}
      />
    </>
  );
}

export default UserOrders;
