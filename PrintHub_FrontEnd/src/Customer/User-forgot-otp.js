import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaClock,
  FaEnvelopeOpenText,
  FaKey,
  FaShieldAlt,
} from "react-icons/fa";
import "./User-otp.css";
import pmgLogo from "../assets/brand/pmg-logo-nav.png";
import { buildApiUrl } from "../config/api";

function UserForgotOtpPage() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  useEffect(() => {
    if (!email) {
      navigate("/user-login", { replace: true });
    }
  }, [email, navigate]);

  if (!email) {
    return null;
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");

    if (!otp) {
      setError("Please enter the OTP");
      return;
    }

    try {
      const response = await fetch(buildApiUrl("/api/password/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "OTP verification failed");
        return;
      }

      navigate("/user-reset-password", {
        replace: true,
        state: { email },
      });
    } catch (err) {
      setError("Network error");
    }
  };

  return (
    <div className="user-otp-container">
      {/* Background decorations */}
      <div className="otp-decoration otp-decoration-one" />
      <div className="otp-decoration otp-decoration-two" />
      <div className="otp-dots otp-dots-one" />
      <div className="otp-dots otp-dots-two" />

      <button
        className="otp-back-button"
        type="button"
        onClick={() => navigate("/user-login", { replace: true })}
      >
        <span>←</span>
        Back
      </button>

      <main className="otp-page">
        <div className="otp-brand">
          <img
            src={pmgLogo}
            alt="PMG Printing House"
            className="otp-brand-logo"
          />
        </div>

        <div className="otp-card">
          <div className="otp-card-accent" />

          <div className="otp-header">
            <div className="otp-eyebrow">PASSWORD RESET</div>

            <h1>
              Check your <span>Email</span>
            </h1>

            <p>
              Enter the 6-digit code sent to{" "}
              <strong>{email}</strong>
            </p>
          </div>

          <div className="otp-progress-list">
            <span>
              <FaEnvelopeOpenText /> Code sent
            </span>
            <span>
              <FaShieldAlt /> Identity check
            </span>
            <span>
              <FaKey /> Reset password
            </span>
          </div>

          {error && (
            <div className="otp-error">
              <span className="otp-message-icon">!</span>
              {error}
            </div>
          )}

          <form onSubmit={handleVerify}>
            <div className="otp-form-group">
              <label className="otp-label" htmlFor="forgot-otp">
                Verification code
              </label>
              <input
                id="forgot-otp"
                type="text"
                inputMode="numeric"
                className="otp-input"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                maxLength={6}
              />
            </div>

            <button type="submit" className="otp-button">
              <span>Continue</span>
              <span className="otp-button-arrow">→</span>
            </button>
          </form>

          <div className="otp-help-strip">
            <FaClock />
            <span>The code expires in 5 minutes.</span>
          </div>

          <div className="otp-footer">
            Didn't receive the code? Check your spam folder.
          </div>
        </div>

        <div className="otp-bottom-note">
          <span className="otp-lime-dot" />
          PRINT. CREATE. DELIVER.
        </div>
      </main>
    </div>
  );
}

export default UserForgotOtpPage;