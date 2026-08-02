import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { buildApiUrl } from "../config/api";
import "./User-payment-return.css";

function UserPaymentReturn() {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState({
    loading: true,
    message: "Verifying payment...",
    mockEmail: null,
    isPaid: false,
  });

  const query = useMemo(
    () => new URLSearchParams(location.search),
    [location.search],
  );
  const orderId = query.get("orderId");
  const returnStatus = query.get("status");

  useEffect(() => {
    const verifyPaymentStatus = async () => {
      if (!orderId) {
        setState({
          loading: false,
          message: "Missing order reference from payment return.",
          mockEmail: null,
          isPaid: false,
        });
        return;
      }

      try {
        const res = await fetch(buildApiUrl(`/api/payments/${orderId}/status`));
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Unable to verify payment status.");
        }

        const isPaid = data?.payment_status === "paid";

        if (isPaid) {
          setState({
            loading: false,
            message: `Payment confirmed for Order #${orderId}.`,
            mockEmail: data?.receipt?.mockEmail || null,
            isPaid: true,
          });
          return;
        }

        if (data?.payment_status === "expired") {
          setState({
            loading: false,
            message:
              "Your payment session has expired. " +
              "Redirecting you back to My Orders...",
            mockEmail: null,
            isPaid: false,
          });
          setTimeout(() => {
            navigate("/user-orders");
          }, 3000);
          return;
        }

        if (data?.payment_status === "failed") {
          setState({
            loading: false,
            message:
              "Your payment attempt failed. " +
              "Please check your payment details and try again.",
            mockEmail: {
              subject: `Payment failed - PMG Order #${orderId}`,
              body: `Your payment for Order #${orderId} has failed.`,
            },
            isPaid: false,
          });
          return;
        }

        if (returnStatus === "cancelled") {
          setState({
            loading: false,
            message: "Payment was cancelled. You can try again from My Orders.",
            mockEmail: {
              subject: `Payment cancelled - PMG Order #${orderId}`,
              body: `Your payment for Order #${orderId} was cancelled. You can retry payment from My Orders.`,
            },
            isPaid: false,
          });
          return;
        }

        setState({
          loading: false,
          message:
            "Payment is still pending confirmation. If you completed payment, please wait a moment and refresh My Orders.",
          mockEmail: {
            subject: `Payment pending - PMG Order #${orderId}`,
            body: `Your payment for Order #${orderId} is still pending confirmation.`,
          },
          isPaid: false,
        });
      } catch (error) {
        setState({
          loading: false,
          message:
            error.message ||
            "Could not verify payment status. Please check My Orders.",
          mockEmail: null,
          isPaid: false,
        });
      }
    };

    verifyPaymentStatus();
  }, [orderId, returnStatus, navigate]);

  return (
    <>
      <div className="upr-page fade-in-up">
        <div className="upr-card">
          <h1 className="upr-title">Payment Return</h1>
          <p className="upr-message">
            {state.loading
              ? "Verifying payment with PayMongo..."
              : state.message}
          </p>

          {!state.loading && state.mockEmail && (
            <div className={`upr-email ${state.isPaid ? "success" : "failed"}`}>
              <strong>Mock email notification</strong>
              {state.mockEmail.to && <p>To: {state.mockEmail.to}</p>}
              <p>Subject: {state.mockEmail.subject}</p>
              <p>{state.mockEmail.body}</p>
            </div>
          )}

          <div className="upr-actions">
            <button
              type="button"
              className="upr-btn upr-btn-primary"
              onClick={() => navigate("/user-orders")}
            >
              Go to My Orders
            </button>
            <button
              type="button"
              className="upr-btn"
              onClick={() => navigate("/user-home")}
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default UserPaymentReturn;
