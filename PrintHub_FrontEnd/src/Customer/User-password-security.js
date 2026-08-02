import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./User-password-security.css";
import { FaLock, FaShieldAlt } from "react-icons/fa";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { buildApiUrl } from "../config/api";

function UserPasswordSecurityPage() {
  const navigate = useNavigate();

  // ✅ pull user from localStorage (based on your login response structure)
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  }, []);

  const userId = storedUser?.id;
  const email = storedUser?.email;

  const normalizeOtpMessage = (message) =>
    String(message || "")
      .toLowerCase()
      .includes("dev mode")
      ? "OTP sent. Please check your email."
      : message || "OTP sent to your email.";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [criteria, setCriteria] = useState({
    uppercase: false,
    number: false,
    special: false,
    length: false,
  });

  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  const [otpMsg, setOtpMsg] = useState("");
  const [otpErr, setOtpErr] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ block copy/paste/cut
  const blockClipboard = (e) => {
    e.preventDefault();
  };

  useEffect(() => {
    // basic guard
    if (!userId || !email) navigate("/user-login");
  }, [userId, email, navigate]);

  // ✅ update criteria live
  useEffect(() => {
    setCriteria({
      uppercase: /[A-Z]/.test(newPassword),
      number: /\d/.test(newPassword),
      special: /[^A-Za-z0-9]/.test(newPassword),
      length: newPassword.length >= 8 && newPassword.length <= 12,
    });
  }, [newPassword]);

  const openOtpModal = async () => {
    setOtpModalOpen(true);
    setOtp("");
    setOtpErr("");
    setOtpMsg("Sending OTP...");

    try {
      const res = await fetch(buildApiUrl("/api/password/request-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpMsg("");
        setOtpErr(data.message || "Failed to send OTP");
        return;
      }

      setOtpMsg(normalizeOtpMessage(data.message));
      setOtpErr("");
    } catch (e) {
      setOtpMsg("");
      setOtpErr("Network error while requesting OTP");
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setOtpErr("");
    setOtpMsg("");

    if (!otp || otp.length !== 6) {
      setOtpErr("Please enter the 6-digit OTP");
      return;
    }

    try {
      const res = await fetch(buildApiUrl("/api/password/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await res.json();
      if (!res.ok) {
        setOtpErr(data.message || "OTP verification failed");
        return;
      }

      setOtpVerified(true);
      setOtpModalOpen(false);
      setOtp("");
      setOtpMsg("");
      setOtpErr("");
      setSuccess("OTP verified. You can now change your password.");
      setError("");
    } catch (e) {
      setOtpErr("Network error");
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!otpVerified) {
      setError("Please verify OTP first.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError("Please complete all fields.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    const passOk =
      criteria.uppercase &&
      criteria.number &&
      criteria.special &&
      criteria.length;

    if (!passOk) {
      setError("Password must meet the requirements.");
      return;
    }

    try {
      const res = await fetch(buildApiUrl(`/api/profile/${userId}/password`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to change password");
        return;
      }

      setSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      // ✅ require OTP again for next change
      setOtpVerified(false);
    } catch (e) {
      setError("Network error");
    }
  };

  return (
    <div className="ups-page fade-in-up">
      <div className="ups-topbar">
        {/* <button
          className="ups-back"
          type="button"
          onClick={() => navigate(-1)}
        >
          <FaArrowLeft /> Back
        </button> */}
        <div className="ups-title">
          <FaShieldAlt /> Passwords & Security
        </div>
      </div>

      <div className="ups-wrap">
        <div className="ups-card">
          <div className="ups-card-head">
            <div className="ups-card-icon">
              <FaLock />
            </div>
            <div>
              <h2>Change Password</h2>
              <p>
                For your security, you need to verify an OTP before updating
                your password.
              </p>
            </div>
          </div>

          {error && <div className="ups-alert ups-alert-error">{error}</div>}
          {success && (
            <div className="ups-alert ups-alert-success">{success}</div>
          )}

          <div className="ups-row">
            <div className="ups-email">
              <span>Email</span>
              <strong>{email}</strong>
            </div>

            <button
              className="ups-otp-btn"
              type="button"
              onClick={openOtpModal}
            >
              {otpVerified ? "OTP Verified ✅" : "Send OTP"}
            </button>
          </div>

          <form onSubmit={handleChangePassword} className="ups-form">
            <label className="ups-label">
              Current Password
              <div style={{ position: "relative" }}>
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  className="ups-input"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  onPaste={blockClipboard}
                  onCopy={blockClipboard}
                  onCut={blockClipboard}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="show-password-button"
                >
                  {showCurrentPassword ? (
                    <MdVisibilityOff size={22} color="#64748b" />
                  ) : (
                    <MdVisibility size={22} color="#64748b" />
                  )}
                </button>
              </div>
            </label>

            <label className="ups-label">
              New Password
              <div style={{ position: "relative" }}>
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="ups-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Create a new password"
                  onPaste={blockClipboard}
                  onCopy={blockClipboard}
                  onCut={blockClipboard}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="show-password-button"
                >
                  {showNewPassword ? (
                    <MdVisibilityOff size={22} color="#64748b" />
                  ) : (
                    <MdVisibility size={22} color="#64748b" />
                  )}
                </button>
              </div>
            </label>

            <label className="ups-label">
              Confirm New Password
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmNewPassword ? "text" : "password"}
                  className="ups-input"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm new password"
                  onPaste={blockClipboard}
                  onCopy={blockClipboard}
                  onCut={blockClipboard}
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowConfirmNewPassword(!showConfirmNewPassword)
                  }
                  className="show-password-button"
                >
                  {showConfirmNewPassword ? (
                    <MdVisibilityOff size={22} color="#64748b" />
                  ) : (
                    <MdVisibility size={22} color="#64748b" />
                  )}
                </button>
              </div>
            </label>

            <div className="ups-criteria">
              <div className={criteria.uppercase ? "ok" : ""}>
                • At least 1 uppercase letter
              </div>
              <div className={criteria.number ? "ok" : ""}>
                • At least 1 number
              </div>
              <div className={criteria.special ? "ok" : ""}>
                • At least 1 special character
              </div>
              <div className={criteria.length ? "ok" : ""}>
                • 8–12 characters
              </div>
            </div>

            <button className="ups-save" type="submit">
              Change Password
            </button>

            {!otpVerified && (
              <div className="ups-note">
                You can’t change your password until OTP is verified.
              </div>
            )}
          </form>
        </div>
      </div>

      {/* ✅ OTP POPUP MODAL */}
      {otpModalOpen && (
        <div
          className="otp-modal-overlay"
          onMouseDown={() => setOtpModalOpen(false)}
        >
          <div
            className="otp-modal-card"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="otp-icon">
              <FaShieldAlt />
            </div>

            <div className="otp-modal-header">
              <h2>Email Verification</h2>
              <p>
                Enter the OTP sent to <strong>{email}</strong>
              </p>
            </div>

            {otpErr && <div className="otp-error">{otpErr}</div>}
            {otpMsg && <div className="otp-msg">{otpMsg}</div>}

            <form onSubmit={verifyOtp}>
              <input
                type="text"
                className="otp-input"
                inputMode="numeric"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                maxLength={6}
                onPaste={blockClipboard}
                onCopy={blockClipboard}
                onCut={blockClipboard}
              />

              <button type="submit" className="otp-button">
                Verify OTP
              </button>
            </form>

            <div className="otp-modal-actions">
              <button
                type="button"
                className="otp-cancel"
                onClick={() => setOtpModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="otp-resend"
                onClick={openOtpModal}
              >
                Resend OTP
              </button>
            </div>

            <div className="otp-footer">
              Didn't receive the code? Check spam.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserPasswordSecurityPage;
