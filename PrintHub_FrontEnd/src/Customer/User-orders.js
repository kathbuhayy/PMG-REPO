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
  { key: "to_review", label: "To review" },
  { key: "return", label: "Refunds" },
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
  if (order.status === "return_requested") {
    return "return";
  }

  if (
    order.payment_status !== "paid" &&
    order.status !== "cancelled"
  ) {
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
    ![
      "delivered",
      "completed",
      "cancelled",
      "return_requested",
    ].includes(order.status)
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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  const [cancellingId, setCancellingId] = useState(null);
  const [payingId, setPayingId] = useState(null);

  const [receipt, setReceipt] = useState(null);

  const [complaintOrder, setComplaintOrder] = useState(null);
  const [complaintReason, setComplaintReason] = useState("");
  const [complaintDetails, setComplaintDetails] = useState("");
  const [submittingComplaint, setSubmittingComplaint] =
    useState(false);

  const [ratingOrder, setRatingOrder] = useState(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const [reviewItem, setReviewItem] = useState(null); // { id, productName }
  const [reviewStars, setReviewStars] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewFiles, setReviewFiles] = useState([]); // File[]
  const [uploadingReviewMedia, setUploadingReviewMedia] = useState(false);

  const [noticeModal, setNoticeModal] = useState(null);
  const [cancelTargetId, setCancelTargetId] = useState(null);

  const [qrPayment, setQrPayment] = useState(null);
  const [checkingQrPayment, setCheckingQrPayment] =
    useState(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, []);

  /* =========================================================
     LOAD ORDERS
     ========================================================= */

  const fetchOrders = async () => {
    try {
      if (!currentUser?.id) {
        navigate("/user-login", {
          state: { from: "/user-orders" },
        });
        return;
      }

      const res = await fetch(
        buildApiUrl(`/api/user/${currentUser.id}/orders`)
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.message || "Failed to load orders"
        );
      }

      const sortedOrders = Array.isArray(data)
        ? data.sort(
            (a, b) =>
              new Date(b.createdAt) -
              new Date(a.createdAt)
          )
        : [];

      setOrders(sortedOrders);

      /*
        Keep the currently expanded order if it still exists.
        Otherwise, automatically open the newest order.
      */
      setExpandedOrderId((current) => {
        if (
          current !== null &&
          sortedOrders.some(
            (order) => order.id === current
          )
        ) {
          return current;
        }

        return sortedOrders[0]?.id ?? null;
      });

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

  /* =========================================================
     QR PAYMENT POLLING
     ========================================================= */

  useEffect(() => {
    let intervalId;

    if (qrPayment?.order_id) {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch(
            buildApiUrl(
              `/api/payments/${qrPayment.order_id}/status`
            )
          );

          const data = await res.json();

          if (
            res.ok &&
            data.payment_status === "paid"
          ) {
            setOrders((prev) =>
              prev.map((order) =>
                order.id === qrPayment.order_id
                  ? {
                      ...order,
                      payment_status: "paid",
                      status:
                        data.order?.status ||
                        "confirmed",
                      payment_method:
                        data.order?.payment_method ||
                        "qrph",
                      payment_reference:
                        data.order?.payment_reference,
                    }
                  : order
              )
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
                  ? {
                      ...order,
                      payment_status:
                        data.payment_status,
                    }
                  : order
              )
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
          console.error(
            "Error polling status:",
            err
          );
        }
      }, 5000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [qrPayment]);

  /* =========================================================
     FILTER / SEARCH / SORT
     ========================================================= */

  const filteredOrders = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const activeOrders = orders
      .filter(
        (order) => order.status !== "cancelled"
      )
      .filter((order) => {
        if (!query) {
          return true;
        }

        const orderId = String(
          order.id || ""
        ).toLowerCase();

        const productNames = (order.items || [])
          .map(
            (item) =>
              item.product?.name ||
              `Product #${item.productId || ""}`
          )
          .join(" ")
          .toLowerCase();

        const shipping = String(
          order.shipping_address || ""
        ).toLowerCase();

        return (
          orderId.includes(query) ||
          productNames.includes(query) ||
          shipping.includes(query)
        );
      });

    const bucketed =
      activeFilter === "all"
        ? activeOrders
        : activeOrders.filter(
            (order) =>
              getOrderBucket(order) ===
              activeFilter
          );

    return [...bucketed].sort((a, b) => {
      const aDate = new Date(
        a.createdAt
      ).getTime();

      const bDate = new Date(
        b.createdAt
      ).getTime();

      return sortOrder === "oldest"
        ? aDate - bDate
        : bDate - aDate;
    });
  }, [
    activeFilter,
    orders,
    searchQuery,
    sortOrder,
  ]);

  const tabCounts = useMemo(() => {
    const activeOrders = orders.filter(
      (order) => order.status !== "cancelled"
    );

    return ORDER_TABS.reduce(
      (acc, tab) => {
        acc[tab.key] =
          tab.key === "all"
            ? activeOrders.length
            : activeOrders.filter(
                (order) =>
                  getOrderBucket(order) ===
                  tab.key
              ).length;

        return acc;
      },
      {}
    );
  }, [orders]);

  /* =========================================================
     CANCEL ORDER
     ========================================================= */

  const performCancelOrder = async (orderId) => {
    setCancelTargetId(null);
    setCancellingId(orderId);

    try {
      const res = await fetch(
        buildApiUrl(`/api/orders/${orderId}`),
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "cancelled",
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            "Failed to cancel order"
        );
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: "cancelled",
              }
            : order
        )
      );

      setNoticeModal({
        title: "Order cancelled",
        message:
          "Your order has been cancelled.",
        tone: "success",
      });
    } catch (err) {
      setNoticeModal({
        title: "Could not cancel order",
        message:
          err.message || "Please try again.",
        tone: "danger",
      });
    } finally {
      setCancellingId(null);
    }
  };

  const handleCancelOrder = (orderId) => {
    setCancelTargetId(orderId);
  };

  /* =========================================================
     PAYMENT
     ========================================================= */

  const handlePayNow = async (order) => {
    setPayingId(order.id);

    try {
      if (Capacitor.isNativePlatform()) {
        const res = await fetch(
          buildApiUrl("/api/payments/qrph"),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              orderId: order.id,
            }),
          }
        );

        const data = await readApiResponse(
          res,
          "Failed to create QR payment"
        );

        if (
          !res.ok ||
          !data.qr_image_url
        ) {
          throw new Error(
            data.message ||
              data.details?.[0]?.detail ||
              "Could not create the GCash QR code. Please restart or redeploy the backend with the latest payment update."
          );
        }

        setQrPayment({
          ...data,
          order,
          createdAt: Date.now(),
        });

        return;
      }

      const paymentReturnBase =
        Capacitor.isNativePlatform()
          ? process.env
              .REACT_APP_PAYMENT_RETURN_BASE ||
            process.env
              .REACT_APP_PUBLIC_FRONTEND_URL ||
            "https://project-n80jh.vercel.app"
          : window.location.origin;

      const res = await fetch(
        buildApiUrl(
          "/api/payments/checkout"
        ),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            orderId: order.id,
            returnBase:
              paymentReturnBase,
            compactCheckout: false,
          }),
        }
      );

      const data = await readApiResponse(
        res,
        "Failed to create payment session"
      );

      if (
        !res.ok ||
        !data.checkout_url
      ) {
        throw new Error(
          data.message ||
            data.details?.[0]?.detail ||
            "Failed to create payment session"
        );
      }

      window.location.assign(
        data.checkout_url
      );
    } catch (err) {
      setNoticeModal({
        title: "Payment could not start",
        message:
          err.message ||
          "Could not initiate payment. Please try again.",
        tone: "danger",
      });

      setPayingId(null);
    }
  };

  /* =========================================================
     CHECK QR PAYMENT
     ========================================================= */

  const handleCheckQrPayment = async () => {
    if (!qrPayment?.order_id) {
      return;
    }

    setCheckingQrPayment(true);

    try {
      const res = await fetch(
        buildApiUrl(
          `/api/payments/${qrPayment.order_id}/status`
        )
      );

      const data = await readApiResponse(
        res,
        "Could not verify payment"
      );

      if (!res.ok) {
        throw new Error(
          data.message ||
            "Could not verify payment"
        );
      }

      if (
        data.payment_status === "paid"
      ) {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === qrPayment.order_id
              ? {
                  ...order,
                  payment_status: "paid",
                  status:
                    data.order?.status ||
                    "confirmed",
                  payment_method:
                    data.order
                      ?.payment_method ||
                    "qrph",
                  payment_reference:
                    data.order
                      ?.payment_reference,
                }
              : order
          )
        );

        setQrPayment(null);
        setPayingId(null);

        setNoticeModal({
          title: "Payment confirmed",
          message:
            "Your payment was verified and your order is now confirmed.",
          tone: "success",
        });
      } else if (
        data.payment_status === "expired"
      ) {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === qrPayment.order_id
              ? {
                  ...order,
                  payment_status:
                    "expired",
                }
              : order
          )
        );

        setQrPayment(null);
        setPayingId(null);

        setNoticeModal({
          title: "Payment Expired",
          message:
            "The QR code has expired. Please try paying again to generate a new QR code.",
          tone: "danger",
        });
      } else if (
        data.payment_status === "failed"
      ) {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === qrPayment.order_id
              ? {
                  ...order,
                  payment_status: "failed",
                }
              : order
          )
        );

        setQrPayment(null);
        setPayingId(null);

        setNoticeModal({
          title: "Payment Failed",
          message:
            "Your payment attempt failed. Please check your details and try again.",
          tone: "danger",
        });
      } else {
        setNoticeModal({
          title:
            "Payment not confirmed yet",
          message:
            "If you already paid in GCash, wait a few seconds and tap Check Payment again.",
          tone: "info",
        });
      }
    } catch (err) {
      setNoticeModal({
        title:
          "Could not verify payment",
        message:
          err.message ||
          "Please try checking again.",
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

  /* =========================================================
     RECEIPT
     ========================================================= */

  const handleViewReceipt = async (
    orderId
  ) => {
    try {
      const res = await fetch(
        buildApiUrl(
          `/api/orders/${orderId}/receipt`
        )
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            "Failed to load receipt"
        );
      }

      setReceipt(data);
    } catch (err) {
      setNoticeModal({
        title: "Receipt unavailable",
        message:
          err.message ||
          "Could not load e-receipt.",
        tone: "danger",
      });
    }
  };

  /* =========================================================
     ORDER RECEIVED
     ========================================================= */

  const handleOrderReceived = async (
    orderId
  ) => {
    try {
      const res = await fetch(
        buildApiUrl(`/api/orders/${orderId}`),
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            status: "completed",
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            "Failed to update order"
        );
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                status: "completed",
              }
            : order
        )
      );

      setNoticeModal({
        title: "Order received",
        message:
          "Your order has been marked as completed.",
        tone: "success",
      });
    } catch (err) {
      setNoticeModal({
        title: "Could not update order",
        message:
          err.message ||
          "Please try again.",
        tone: "danger",
      });
    }
  };

  /* =========================================================
     COMPLAINT / RETURN
     ========================================================= */

  const handleSubmitComplaint = async (
    e
  ) => {
    e.preventDefault();

    if (
      !complaintOrder ||
      !complaintReason.trim()
    ) {
      return;
    }

    setSubmittingComplaint(true);

    try {
      const res = await fetch(
        buildApiUrl(
          `/api/orders/${complaintOrder.id}/return-complaint`
        ),
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            userId: currentUser.id,
            reason: complaintReason,
            details: complaintDetails,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message ||
            "Failed to submit complaint"
        );
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === complaintOrder.id
            ? {
                ...order,
                status:
                  "return_requested",
              }
            : order
        )
      );

      setComplaintOrder(null);
      setComplaintReason("");
      setComplaintDetails("");

      setNoticeModal({
        title:
          "Return request submitted",
        message: `${data.message}. Mock email: ${
          data.mockEmail?.subject ||
          "received"
        }`,
        tone: "success",
      });
    } catch (err) {
      setNoticeModal({
        title:
          "Could not submit return",
        message:
          err.message ||
          "Could not submit return complaint.",
        tone: "danger",
      });
    } finally {
      setSubmittingComplaint(false);
    }
  };

  
  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (!ratingOrder || !ratingStars) return;

    setSubmittingRating(true);

    try {
      const res = await fetch(
        buildApiUrl(`/api/orders/${ratingOrder.id}/rating`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            stars: ratingStars,
            comment: ratingComment,
          }),
        }
      );

      const data = await readApiResponse(res, "Rating saved");

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit rating.");
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === ratingOrder.id
            ? { ...order, rating: data.rating }
            : order
        )
      );

      setRatingOrder(null);
      setRatingStars(0);
      setRatingComment("");

      setNoticeModal({
        title: "Rating submitted",
        message: "Thanks for rating your order!",
        tone: "success",
      });
    } catch (err) {
      setNoticeModal({
        title: "Could not submit rating",
        message: err.message || "Please try again.",
        tone: "danger",
      });
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleReviewFilesChange = (e) => {
    const files = Array.from(e.target.files || []);
    setReviewFiles((prev) => [...prev, ...files].slice(0, 5));
    e.target.value = "";
  };

  const removeReviewFile = (idx) => {
    setReviewFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewItem || !reviewStars) return;

    setSubmittingReview(true);

    try {
      let imageUrls = [];
      let videoUrls = [];

      if (reviewFiles.length > 0) {
        setUploadingReviewMedia(true);
        const formData = new FormData();
        reviewFiles.forEach((file) => formData.append("files", file));

        const uploadRes = await fetch(buildApiUrl("/api/reviews/upload"), {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(uploadData.message || "Failed to upload media");
        }

        imageUrls = uploadData.imageUrls || [];
        videoUrls = uploadData.videoUrls || [];
        setUploadingReviewMedia(false);
      }

      const res = await fetch(
        buildApiUrl(`/api/order-items/${reviewItem.id}/review`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUser.id,
            stars: reviewStars,
            comment: reviewComment,
            images: imageUrls,
            videos: videoUrls,
          }),
        }
      );

      const data = await readApiResponse(res, "Review saved");

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit review.");
      }

      setOrders((prev) =>
        prev.map((order) => ({
          ...order,
          items: (order.items || []).map((item) =>
            item.id === reviewItem.id
              ? { ...item, productReview: data.review }
              : item
          ),
        }))
      );

      setReviewItem(null);
      setReviewStars(0);
      setReviewComment("");
      setReviewFiles([]);

      setNoticeModal({
        title: "Review submitted",
        message: "Thanks for reviewing this product!",
        tone: "success",
      });
    } catch (err) {
      setNoticeModal({
        title: "Could not submit review",
        message: err.message || "Please try again.",
        tone: "danger",
      });
    } finally {
      setSubmittingReview(false);
      setUploadingReviewMedia(false);
    }
  };

  /* =========================================================
     HELPERS
     ========================================================= */

  const formatCurrency = (price) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(Number(price || 0));

  const getStatusLabel = (order) => {
    if (
      order.status ===
      "return_requested"
    ) {
      return "Return requested";
    }

    if (order.status === "cancelled") {
      return "Cancelled";
    }

    if (
      order.designReviewStatus ===
      "needs_revision"
    ) {
      return "Design needs revision";
    }

    if (
      order.designReviewStatus ===
      "under_review"
    ) {
      return "Design under review";
    }

    if (
      order.payment_status !== "paid" &&
      !order.proofApproved
    ) {
      return "Waiting for approval";
    }

    if (
      order.payment_status ===
      "partially_paid"
    ) {
      const paid = Number(
        order.amountPaid || 0
      );

      const remaining = Math.max(
        Number(order.total || 0) -
          paid,
        0
      );

      return `Partially paid — ${formatCurrency(
        remaining
      )} remaining`;
    }

    if (
      order.payment_status !== "paid"
    ) {
      return "Payment pending";
    }

    if (order.status === "delivered") {
      return "Delivered";
    }

    return (
      order.status
        ?.charAt(0)
        .toUpperCase() +
      order.status?.slice(1)
    );
  };

  const getStatusClass = (order) => {
    if (
      order.status ===
      "return_requested"
    ) {
      return "return";
    }

    if (order.status === "cancelled") {
      return "cancelled";
    }

    if (
      order.payment_status ===
      "partially_paid"
    ) {
      return "pending";
    }

    if (
      order.payment_status !== "paid"
    ) {
      return "pending";
    }

    if (order.status === "delivered") {
      return "delivered";
    }

    return "paid";
  };

  const getTimelineIndex = (order) =>
    order.status === "completed"
      ? 5
      : order.status === "delivered"
        ? 4
        : order.status === "processing"
          ? 3
          : order.payment_status ===
              "paid"
            ? 2
            : order.proofApproved
              ? 1
              : 0;

  /* =========================================================
     TIMELINE
     ========================================================= */

  const renderTimeline = (
    order,
    compact = false
  ) => {
    if (
      order.status === "cancelled" ||
      order.status ===
        "return_requested"
    ) {
      return null;
    }

    const steps = [
      "Placed",
      "Approved",
      "Paid",
      "Processing",
      "Delivered",
      "Completed",
    ];

    const currentIdx =
      getTimelineIndex(order);

    return (
      <div
        className={`uo-timeline ${
          compact ? "compact" : ""
        }`}
      >
        {steps.map((label, index) => {
          let className =
            "uo-timeline-step";

          if (index < currentIdx) {
            className += " completed";
          } else if (
            index === currentIdx
          ) {
            className += " active";
          }

          return (
            <div
              key={label}
              className={className}
            >
              <span className="uo-timeline-dot" />
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    );
  };

  /* =========================================================
     ORDER SUMMARY
     ========================================================= */

  const getOrderSummary = (order) => ({
    itemCount: (order.items || []).reduce(
      (sum, item) =>
        sum + Number(item.quantity || 0),
      0
    ),
  });

  /* =========================================================
     ITEM
     ========================================================= */

  const renderItem = (item, order) => {
    const design =
      item.customizations?.design;

    const productImg =
      item.product?.images?.[0];

    const productName =
      item.product?.name ||
      `Product #${item.productId || ""}`;

    const zoneImgs = Object.values(
      design?.zones || {}
    )
      .filter(
        (zone) => zone?.imageUrl
      )
      .map(
        (zone) => zone.imageUrl
      );

    const designImgs =
      zoneImgs.length
        ? zoneImgs
        : design?.generatedImageUrl
          ? [design.generatedImageUrl]
          : [];

    return (
      <div
        key={item.id}
        className="uo-item-row"
      >
        <div className="uo-item-thumbs">
          {productImg && (
            <img
              src={productImg}
              alt={productName}
              className="uo-item-thumb"
            />
          )}

          {designImgs
            .slice(0, 2)
            .map((src, index) => (
              <div
                key={index}
                className="uo-item-design-wrap"
              >
                <img
                  src={src}
                  alt={`Design ${
                    index + 1
                  }`}
                  className="uo-item-thumb uo-item-thumb-design"
                />
              </div>
            ))}
        </div>

        <div className="uo-item-details">
          <p className="uo-item-name">
            {productName}
          </p>

          {design?.prompt && (
            <p className="uo-item-design-prompt">
              "
              {design.prompt.length >
              80
                ? design.prompt.slice(
                    0,
                    80
                  ) + "..."
                : design.prompt}
              "
            </p>
          )}

          <p className="uo-item-qty">
            Qty: {item.quantity}
          </p>
        </div>

        <div className="uo-item-price">
          <span>
            {formatCurrency(
              item.unit_price
            )}{" "}
            each
          </span>

          <strong>
            {formatCurrency(
              item.total_price
            )}
          </strong>

          {order.payment_status === "paid" &&
            ["delivered", "completed"].includes(order.status) &&
            (item.productReview ? (
              <span className="uo-rating-stars" style={{ fontSize: 13 }}>
                {"★".repeat(item.productReview.stars)}
                {"☆".repeat(5 - item.productReview.stars)}
              </span>
            ) : (
              <button
                type="button"
                className="uo-view-btn secondary"
                style={{ marginTop: 6 }}
                onClick={() => {
                  setReviewItem({
                    id: item.id,
                    productName:
                      item.product?.name || `Product #${item.productId}`,
                  });
                  setReviewStars(0);
                  setReviewComment("");
                  setReviewFiles([]);
                }}
              >
                Review product
              </button>
            ))}
        </div>
      </div>
    );
  };

  /* =========================================================
     ACTIONS
     ========================================================= */

  const renderActions = (order) => (
    <div className="uo-action-row">
      {order.payment_status !==
        "paid" &&
        order.status !== "cancelled" && (
          <>
            <button
              type="button"
              className="uo-cancel-btn"
              disabled={
                cancellingId ===
                order.id
              }
              onClick={() =>
                handleCancelOrder(
                  order.id
                )
              }
            >
              {cancellingId ===
              order.id
                ? "Cancelling..."
                : "Cancel Order"}
            </button>

            {order.proofApproved ? (
              <button
                type="button"
                className="uo-pay-btn"
                disabled={
                  payingId ===
                  order.id
                }
                onClick={() =>
                  handlePayNow(
                    order
                  )
                }
              >
                {payingId ===
                order.id
                  ? "Redirecting..."
                  : order.payment_status ===
                      "partially_paid"
                    ? "Pay Remaining Balance"
                    : "Pay Now"}
              </button>
            ) : (
              <button
                type="button"
                className="uo-pay-btn"
                disabled
              >
                Waiting for seller
              </button>
            )}
          </>
        )}

      {order.payment_status ===
        "paid" && (
        <button
          type="button"
          className="uo-receipt-btn"
          onClick={() =>
            handleViewReceipt(
              order.id
            )
          }
        >
          E-Receipt
        </button>
      )}

      {(order.payment_status ===
        "paid" ||
        order.payment_status ===
          "partially_paid") && (
        <button
          type="button"
          className="uo-receipt-btn light"
          onClick={() =>
            window.open(
              buildApiUrl(
                `/api/orders/${order.id}/invoice`
              ),
              "_blank"
            )
          }
        >
          Download Invoice
        </button>
      )}

      {order.payment_status ===
        "paid" &&
        ![
          "completed",
          "cancelled",
          "return_requested",
        ].includes(
          order.status
        ) && (
          <button
            type="button"
            className="uo-return-btn"
            onClick={() =>
              handleOrderReceived(
                order.id
              )
            }
          >
            Order Received
          </button>
        )}

      {order.payment_status ===
        "paid" &&
        order.status ===
          "delivered" && (
          <button
            type="button"
            className="uo-return-btn"
            onClick={() =>
              setComplaintOrder(
                order
              )
            }
          >
            File complaint
          </button>
        )}

      {order.payment_status === "paid" &&
        ["delivered", "completed"].includes(order.status) &&
        !order.rating && (
          <button
            type="button"
            className="uo-return-btn"
            onClick={() => {
              setRatingOrder(order);
              setRatingStars(0);
              setRatingComment("");
            }}
          >
            Rate this order
          </button>
        )}
    </div>
  );
  

  /* =========================================================
     ORDER CARD
     ========================================================= */

  const renderOrder = (
    order,
    index
  ) => {
    const isFeatured = index === 0;

    const isExpanded =
      expandedOrderId === order.id;

    const summary =
      getOrderSummary(order);

    /*
      Every order can now be expanded or collapsed.
      The newest order is opened automatically
      when the orders are first loaded.
    */

    if (!isExpanded) {
      return (
        <div
          key={order.id}
          className="uo-compact-order"
        >
          <div className="uo-compact-main">
            <div className="uo-compact-icon">
              #{order.id}
            </div>

            <div className="uo-compact-info">
              <div className="uo-compact-title-row">
                <h3>
                  Order #{order.id}
                </h3>

                <span
                  className={`uo-status ${getStatusClass(
                    order
                  )}`}
                >
                  {getStatusLabel(
                    order
                  )}
                </span>
              </div>

              <p>
                {new Date(
                  order.createdAt
                ).toLocaleDateString(
                  "en-PH",
                  {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }
                )}
                {" • "}
                {
                  summary.itemCount
                }{" "}
                {summary.itemCount ===
                1
                  ? "item"
                  : "items"}
              </p>
            </div>
          </div>

          <div className="uo-compact-progress">
            {renderTimeline(
              order,
              true
            )}
          </div>

          <div className="uo-compact-total">
            <span>Total</span>

            <strong>
              {formatCurrency(
                order.total
              )}
            </strong>
          </div>

          <button
            type="button"
            className="uo-view-btn"
            onClick={() =>
              setExpandedOrderId(
                order.id
              )
            }
          >
            View Details{" "}
            <span>›</span>
          </button>
        </div>
      );
    }

    return (
      <div
        key={order.id}
        className={`uo-order-card ${
          isFeatured
            ? "featured"
            : ""
        }`}
      >
        <div className="uo-order-header">
          <div className="uo-order-heading">
            <div className="uo-order-icon">
              #
            </div>

            <div className="uo-order-info">
              <div className="uo-order-title-row">
                <h3>
                  Order #{order.id}
                </h3>

                <span
                  className={`uo-status ${getStatusClass(
                    order
                  )}`}
                >
                  {getStatusLabel(
                    order
                  )}
                </span>
              </div>

              <p className="uo-date">
                {new Date(
                  order.createdAt
                ).toLocaleDateString(
                  "en-PH",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
                {" • "}
                {
                  summary.itemCount
                }{" "}
                {summary.itemCount ===
                1
                  ? "item"
                  : "items"}
              </p>
            </div>
          </div>

          <div className="uo-order-header-actions">
            <span className="uo-order-total-mobile">
              {formatCurrency(
                order.total
              )}
            </span>

            {/* EVERY ORDER CAN NOW BE COLLAPSED */}
            <button
              type="button"
              className="uo-view-btn secondary"
              onClick={() =>
                setExpandedOrderId(
                  null
                )
              }
              aria-expanded="true"
              aria-label={`Collapse Order #${order.id}`}
            >
              Hide Details
              <span>‹</span>
            </button>
          </div>
        </div>

        <div className="uo-progress-section">
          <div className="uo-progress-label">
            <span>
              Order progress
            </span>

            <strong>
              {getStatusLabel(
                order
              )}
            </strong>
          </div>

          {renderTimeline(order)}
        </div>

        <div className="uo-order-grid">
          <section className="uo-section uo-items">
            <div className="uo-section-heading">
              <div>
                <span className="uo-section-eyebrow">
                  ORDER ITEMS
                </span>

                <h4>
                  {
                    summary.itemCount
                  }{" "}
                  {summary.itemCount ===
                  1
                    ? "item"
                    : "items"}
                </h4>
              </div>
            </div>

            {order.items?.length ? (
              <div className="uo-items-list">
                {order.items.map((item) =>
                  renderItem(item, order)
                )}
              </div>
            ) : (
              <p className="uo-no-items">
                No items in this order.
              </p>
            )}

            <div className="uo-summary-box">
              <div>
                <span>
                  Subtotal
                </span>

                <strong>
                  {formatCurrency(
                    order.total
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Shipping fee
                </span>

                <strong>
                  {formatCurrency(0)}
                </strong>
              </div>

              <div className="grand-total">
                <span>
                  Total amount
                </span>

                <strong>
                  {formatCurrency(
                    order.total
                  )}
                </strong>
              </div>
            </div>
          </section>

          <section className="uo-section uo-shipping">
            <div className="uo-section-heading">
              <div>
                <span className="uo-section-eyebrow">
                  DELIVERY
                </span>

                <h4>
                  Shipping address
                </h4>
              </div>
            </div>

            <div className="uo-address-box">
              <p>
                {order.shipping_address ||
                  "No shipping address provided."}
              </p>
            </div>

            {order.designReviewStatus ===
              "needs_revision" && (
              <div className="uo-review-notice revision">
                <strong>
                  Your design needs a
                  revision.
                </strong>

                <p>
                  {order.designReviewNotes ||
                    "Please update your design and submit it again for review."}
                </p>
              </div>
            )}

            {order.designReviewStatus ===
              "under_review" && (
              <div className="uo-review-notice">
                <strong>
                  Your design is being
                  reviewed.
                </strong>

                <p>
                  We'll let you know once
                  it's approved or if any
                  changes are needed.
                </p>
              </div>
            )}

            {order.refundStatus === "requested" && (
              <div className="uo-review-notice">
                <strong>Your refund request is under review.</strong>
                <p>Our team will get back to you shortly.</p>
              </div>
            )}

            {order.refundStatus === "rejected" && (
              <div className="uo-review-notice revision">
                <strong>Your refund request was declined.</strong>
                {order.refundNotes && <p>{order.refundNotes}</p>}
              </div>
            )}

            {order.refundStatus === "refunded" && (
              <div className="uo-review-notice refunded">
                <strong>
                  Refunded {formatCurrency(order.refundAmount)}.
                </strong>
                <p>It should reflect on your original payment method soon.</p>
              </div>
            )}

            {order.rating && (
              <div className="uo-rating-display">
                <span className="uo-rating-stars">
                  {"★".repeat(order.rating.stars)}
                  {"☆".repeat(5 - order.rating.stars)}
                </span>
                {order.rating.comment && (
                  <p className="uo-rating-comment">
                    "{order.rating.comment}"
                  </p>
                )}
              </div>
            )}

            <div className="uo-payment-box">
              <div>
                <span>
                  Payment status
                </span>

                <strong>
                  {getStatusLabel(
                    order
                  )}
                </strong>
              </div>

              {order.payment_method && (
                <div>
                  <span>
                    Payment method
                  </span>

                  <strong>
                    {String(
                      order.payment_method
                    ).toUpperCase()}
                  </strong>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="uo-order-footer">
          {renderActions(order)}
        </div>
      </div>
    );
  };

  /* =========================================================
     PAGE
     ========================================================= */

  return (
    <>
      <div className="uo-page fade-in-up">

        {/* RESOURCE NAVIGATION */}

        <div className="uo-resource-nav">
          <button
            type="button"
            className="uo-resource-tab active"
            onClick={() =>
              navigate("/user-orders")
            }
          >
            Orders
          </button>

          <button
            type="button"
            className="uo-resource-tab"
            onClick={() =>
              navigate(
                "/user-inquiries"
              )
            }
          >
            Inquiries
          </button>

          <button
            type="button"
            className="uo-resource-tab"
            onClick={() =>
              navigate(
                "/user-payments"
              )
            }
          >
            Payments
          </button>
        </div>

        {/* PAGE INTRO */}

        <div className="uo-top">
          <button
            className="uo-back"
            type="button"
            onClick={() =>
              navigate("/user-home")
            }
          >
            <FaArrowLeft />
            Back to Dashboard
          </button>

          <h1 className="uo-title">
            My Orders
          </h1>

          <p className="uo-subtitle">
            Track and manage your custom
            printing orders and approvals.
          </p>
        </div>

        {/* FILTER / SEARCH TOOLBAR */}

        <div className="uo-toolbar">
          <div className="uo-filter-tabs">
            {ORDER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`uo-filter-tab ${
                  activeFilter ===
                  tab.key
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setActiveFilter(
                    tab.key
                  )
                }
              >
                {tab.label}

                <span>
                  {tabCounts[
                    tab.key
                  ] || 0}
                </span>
              </button>
            ))}
          </div>

          <div className="uo-tools">
            <label className="uo-search">
              <span aria-hidden="true">
                ⌕
              </span>

              <input
                type="search"
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(
                    e.target.value
                  )
                }
                placeholder="Search orders..."
                aria-label="Search orders"
              />
            </label>

            <select
              className="uo-sort"
              value={sortOrder}
              onChange={(e) =>
                setSortOrder(
                  e.target.value
                )
              }
              aria-label="Sort orders"
            >
              <option value="newest">
                Newest
              </option>

              <option value="oldest">
                Oldest
              </option>
            </select>
          </div>
        </div>

        {/* LOADING */}

        {loading && (
          <div className="uo-loading">
            <p>
              Loading orders...
            </p>
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="uo-error">
            <p>{error}</p>
          </div>
        )}

        {/* EMPTY ACCOUNT */}

        {!loading &&
          !error &&
          orders.length === 0 && (
            <div className="uo-empty">
              <p>
                No orders yet.
              </p>

              <button
                className="uo-shop-btn"
                type="button"
                onClick={() =>
                  navigate(
                    "/product-overview"
                  )
                }
              >
                Start Shopping
              </button>
            </div>
          )}

        {/* ORDERS */}

        {!loading &&
          !error &&
          orders.length > 0 && (
            <div className="uo-orders">
              {filteredOrders.length ? (
                filteredOrders.map(
                  (
                    order,
                    index
                  ) =>
                    renderOrder(
                      order,
                      index
                    )
                )
              ) : (
                <div className="uo-empty">
                  <p>
                    No orders in this
                    tab.
                  </p>
                </div>
              )}
            </div>
          )}
      </div>

      {/* =====================================================
          RECEIPT MODAL
          ===================================================== */}

      {receipt && (
        <div
          className="uo-modal"
          role="dialog"
          aria-modal="true"
        >
          <div className="uo-modal-card">

            <button
              type="button"
              className="uo-modal-close"
              onClick={() =>
                setReceipt(null)
              }
              aria-label="Close receipt"
            >
              x
            </button>

            <h2>
              E-Receipt
            </h2>

            <div className="uo-receipt-meta">
              <span>
                {receipt.receiptNo}
              </span>

              <span>
                {receipt.paymentStatus.toUpperCase()}
              </span>
            </div>

            <p>
              <strong>
                Customer:
              </strong>{" "}
              {receipt.customerName}
            </p>

            <p>
              <strong>
                Payment Reference:
              </strong>{" "}
              {receipt.paymentReference ||
                "Pending confirmation"}
            </p>

            <div className="uo-receipt-items">
              {(receipt.items || []).map((item) => {
                const breakdownParts = [];
                if (item.setupFee != null) {
                  breakdownParts.push(`Setup ${formatCurrency(item.setupFee)}`);
                }
                if (item.materialCost && item.materialCost.length > 0) {
                  const materialTotal = item.materialCost.reduce(
                    (sum, m) => sum + (m.lineCost || 0),
                    0
                  );
                  breakdownParts.push(`Material ${formatCurrency(materialTotal)}`);
                }
                if (
                  item.quantityDiscountFactor != null &&
                  item.quantityDiscountFactor < 1
                ) {
                  const pct = Math.round((1 - item.quantityDiscountFactor) * 100);
                  breakdownParts.push(`Bulk discount -${pct}%`);
                }

                return (
                  <div key={item.id} className="uo-receipt-item">
                    <div className="uo-receipt-item-main">
                      <span>
                        {item.productName} x {item.quantity}
                      </span>

                      <strong>{formatCurrency(item.totalPrice)}</strong>
                    </div>

                    {breakdownParts.length > 0 && (
                      <div className="uo-receipt-item-breakdown">
                        {breakdownParts.join("  ·  ")}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="uo-receipt-total">
              <span>
                Total
              </span>

              <strong>
                {formatCurrency(
                  receipt.total
                )}
              </strong>
            </div>

            <div className="uo-mock-email">
              <strong>
                Mock email
                notification
              </strong>

              <p>
                To:{" "}
                {receipt.mockEmail
                  ?.to ||
                  receipt.customerEmail}
              </p>

              <p>
                Subject:{" "}
                {receipt.mockEmail
                  ?.subject ||
                  "Payment update"}
              </p>

              <p>
                {receipt.mockEmail
                  ?.body ||
                  "Payment details are available in this receipt."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          QR PAYMENT MODAL
          ===================================================== */}

      {qrPayment && (
        <div
          className="uo-modal"
          role="dialog"
          aria-modal="true"
        >
          <div className="uo-modal-card uo-qr-card">

            <button
              type="button"
              className="uo-modal-close"
              onClick={
                closeQrPayment
              }
              aria-label="Close QR payment"
            >
              x
            </button>

            <h2>
              Scan to Pay
            </h2>

            <p className="uo-qr-copy">
              Open GCash, Maya, or any
              QR Ph banking app and
              scan this code.
            </p>

            <div className="uo-qr-frame">
              <img
                src={
                  qrPayment.qr_image_url
                }
                alt="GCash QR Ph payment code"
              />
            </div>

            <div className="uo-qr-total">
              <span>
                Total Due
              </span>

              <strong>
                {formatCurrency(
                  (qrPayment.amount ||
                    0) / 100
                )}
              </strong>
            </div>

            <p className="uo-qr-note">
              This QR is single-use and
              expires after about 30
              minutes.
            </p>

            <button
              type="button"
              className="uo-submit-return"
              onClick={
                handleCheckQrPayment
              }
              disabled={
                checkingQrPayment
              }
            >
              {checkingQrPayment
                ? "Checking..."
                : "Check Payment"}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================
          COMPLAINT MODAL
          ===================================================== */}
      {ratingOrder && (
        <div
          className="uo-modal"
          role="dialog"
          aria-modal="true"
        >
          <form
            className="uo-modal-card"
            onSubmit={handleSubmitRating}
          >
            <button
              type="button"
              className="uo-modal-close"
              onClick={() => setRatingOrder(null)}
              aria-label="Close rating"
            >
              x
            </button>

            <h2>Rate your order</h2>
            <p>Order #{ratingOrder.id}</p>

            <div className="uo-star-picker">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`uo-star-btn ${n <= ratingStars ? "filled" : ""}`}
                  onClick={() => setRatingStars(n)}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                >
                  ★
                </button>
              ))}
            </div>

            <label>
              Comments (optional)
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                rows="4"
                placeholder="Tell us what you liked or what we could improve."
              />
            </label>

            <button
              type="submit"
              className="uo-submit-return"
              disabled={submittingRating || !ratingStars}
            >
              {submittingRating ? "Submitting..." : "Submit rating"}
            </button>
          </form>
        </div>
      )}

      {reviewItem && (
        <div
          className="uo-modal"
          role="dialog"
          aria-modal="true"
        >
          <form
            className="uo-modal-card"
            onSubmit={handleSubmitReview}
          >
            <button
              type="button"
              className="uo-modal-close"
              onClick={() => setReviewItem(null)}
              aria-label="Close review"
            >
              x
            </button>

            <h2>Review this product</h2>
            <p>{reviewItem.productName}</p>

            <div className="uo-star-picker">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={`uo-star-btn ${n <= reviewStars ? "filled" : ""}`}
                  onClick={() => setReviewStars(n)}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                >
                  ★
                </button>
              ))}
            </div>

            <label>
              Comments (optional)
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows="4"
                placeholder="What did you think of this product?"
              />
            </label>

            <label>
              Add photos or videos (optional)
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleReviewFilesChange}
              />
            </label>

            {reviewFiles.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {reviewFiles.map((file, idx) => (
                  <div key={idx} style={{ position: "relative" }}>
                    {file.type.startsWith("video/") ? (
                      <video
                        src={URL.createObjectURL(file)}
                        style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6 }}
                        muted
                      />
                    ) : (
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`preview ${idx}`}
                        style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6 }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => removeReviewFile(idx)}
                      style={{
                        position: "absolute",
                        top: -6,
                        right: -6,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: "none",
                        background: "#ef4444",
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 12,
                        lineHeight: "20px",
                      }}
                      aria-label="Remove file"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              className="uo-submit-return"
              disabled={submittingReview || !reviewStars}
            >
              {uploadingReviewMedia
                ? "Uploading media..."
                : submittingReview
                ? "Submitting..."
                : "Submit review"}
            </button>
          </form>
        </div>
      )}

      {complaintOrder && (
        <div
          className="uo-modal"
          role="dialog"
          aria-modal="true"
        >
          <form
            className="uo-modal-card"
            onSubmit={
              handleSubmitComplaint
            }
          >
            <button
              type="button"
              className="uo-modal-close"
              onClick={() =>
                setComplaintOrder(
                  null
                )
              }
              aria-label="Close return complaint"
            >
              x
            </button>

            <h2>
              Return Complaint
            </h2>

            <p>
              Order #
              {
                complaintOrder.id
              }
            </p>

            <label>
              Reason

              <select
                value={
                  complaintReason
                }
                onChange={(e) =>
                  setComplaintReason(
                    e.target.value
                  )
                }
                required
              >
                <option value="">
                  Select a reason
                </option>

                <option value="Faulty or damaged product">
                  Faulty or damaged
                  product
                </option>

                <option value="Wrong item or print">
                  Wrong item or print
                </option>

                <option value="Poor print quality">
                  Poor print quality
                </option>

                <option value="Missing item">
                  Missing item
                </option>

                <option value="Other">
                  Other
                </option>
              </select>
            </label>

            <label>
              Details

              <textarea
                value={
                  complaintDetails
                }
                onChange={(e) =>
                  setComplaintDetails(
                    e.target.value
                  )
                }
                rows="4"
                placeholder="Describe the problem so staff can review it."
              />
            </label>

            <button
              type="submit"
              className="uo-submit-return"
              disabled={
                submittingComplaint ||
                !complaintReason
              }
            >
              {submittingComplaint
                ? "Submitting..."
                : "Submit complaint"}
            </button>
          </form>
        </div>
      )}

      {/* =====================================================
          CANCEL MODAL
          ===================================================== */}

      <AppModal
        open={Boolean(
          cancelTargetId
        )}
        title="Cancel this order?"
        message="This will mark the order as cancelled. You can place a new order anytime."
        tone="danger"
        confirmText="Cancel Order"
        cancelText="Keep Order"
        onCancel={() =>
          setCancelTargetId(null)
        }
        onConfirm={() =>
          performCancelOrder(
            cancelTargetId
          )
        }
      />

      {/* =====================================================
          NOTICE MODAL
          ===================================================== */}

      <AppModal
        open={Boolean(
          noticeModal
        )}
        title={
          noticeModal?.title
        }
        message={
          noticeModal?.message
        }
        tone={
          noticeModal?.tone
        }
        onConfirm={() =>
          setNoticeModal(null)
        }
      />
    </>
  );
}

export default UserOrders;