import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaClock,
  FaEnvelopeOpenText,
  FaKey,
  FaShieldAlt,
} from "react-icons/fa";
import "./User-otp.css";
import { buildApiUrl } from "../config/api";

function UserForgotOtpPage() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  if (!email) {
    navigate("/user-login");
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

      navigate("/user-reset-password", { state: { email } });
    } catch (err) {
      setError("Network error");
    }
  };

  return (
    <div className="user-otp-container">
      <button
        className="otp-back-button"
        type="button"
        onClick={() => navigate("/user-login")}
      >
        Back
      </button>

      <div className="otp-brand-panel">
        <div className="otp-brand-mark">PMG</div>
        <h1>Secure reset, no fuss.</h1>
        <p>Confirm the code we emailed before creating your new password.</p>
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
      </div>

      <div className="otp-card">
        <div className="otp-icon">
          <FaKey />
        </div>

        <div className="otp-header">
          <h2>Password Reset</h2>
          <p>
            Enter the OTP sent to <strong>{email}</strong>
          </p>
        </div>

        {error && <div className="otp-error">{error}</div>}

        <form onSubmit={handleVerify}>
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

          <button type="submit" className="otp-button">
            Continue
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
    </div>
  );
}

export default UserForgotOtpPage;
