import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaCheckCircle,
  FaClock,
  FaEnvelopeOpenText,
  FaShieldAlt,
} from "react-icons/fa";
import "./User-otp.css";
import { buildApiUrl } from "../config/api";
import AppModal from "../components/AppModal";
import { loadGuestDesigns, clearGuestDesigns } from "../utils/guestDesigns";

function UserOtpPage() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  if (!email) {
    navigate("/user-register");
  }

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");

    if (!otp) {
      setError("Please enter the OTP");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(buildApiUrl("/api/register/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "OTP verification failed");
        setLoading(false);
        return;
      }

      const saved = localStorage.getItem("pending_registration");

      if (!saved) {
        setError("Registration data missing. Please register again.");
        setLoading(false);
        return;
      }

      let regData;
      try {
        regData = JSON.parse(saved);
      } catch {
        setError("Registration data invalid. Please register again.");
        setLoading(false);
        return;
      }

      if (!regData?.email || regData.email !== email) {
        setError("Email mismatch. Please register again.");
        setLoading(false);
        return;
      }

      const completeRes = await fetch(buildApiUrl("/api/register/complete"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(regData),
      });

      const completeData = await completeRes.json();

      if (!completeRes.ok) {
        setError(completeData.message || "Registration failed");
        setLoading(false);
        return;
      }

      // Migrate guest-generated AI designs to the new user account
      const guestDesigns = loadGuestDesigns();

      if (guestDesigns.length > 0 && completeData.userId) {
        try {
          await fetch(buildApiUrl("/api/builder/migrate-guest-designs"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: completeData.userId,
              designs: guestDesigns,
            }),
          });
        } catch (migrateErr) {
          console.error("Failed to migrate guest designs:", migrateErr);
        }
      }

      clearGuestDesigns();
      localStorage.removeItem("ai_guest_generations");
      localStorage.removeItem("pending_registration");

      setSuccessModal(true);
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-otp-container">
      <button
        className="otp-back-button"
        type="button"
        onClick={() => navigate("/user-register")}
      >
        Back
      </button>

      <div className="otp-brand-panel">
        <div className="otp-brand-mark">PMG</div>
        <h1>One quick check, then you are in.</h1>
        <p>We sent a secure 6-digit code to protect your new PrintHub account.</p>
        <div className="otp-progress-list">
          <span>
            <FaCheckCircle /> Details saved
          </span>
          <span>
            <FaEnvelopeOpenText /> Code sent
          </span>
          <span>
            <FaShieldAlt /> Verify account
          </span>
        </div>
      </div>

      <div className="otp-card">
        <div className="otp-icon">
          <FaEnvelopeOpenText />
        </div>

        <div className="otp-header">
          <h2>Email Verification</h2>
          <p>
            Enter the OTP sent to <strong>{email}</strong>
          </p>
        </div>

        {error && <div className="otp-error">{error}</div>}

        <form onSubmit={handleVerify}>
          <label className="otp-label" htmlFor="registration-otp">
            Verification code
          </label>
          <input
            id="registration-otp"
            type="text"
            inputMode="numeric"
            className="otp-input"
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            maxLength={6}
            disabled={loading}
          />

          <button type="submit" className="otp-button" disabled={loading}>
            {loading ? "Verifying..." : "Verify OTP"}
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
      <AppModal
        open={successModal}
        title="Account verified"
        message="Your PMG account is ready. Please login to continue."
        tone="success"
        onConfirm={() => navigate("/user-login")}
      />
    </div>
  );
}

export default UserOtpPage;
