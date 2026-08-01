import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./User-reset-password.css";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { buildApiUrl } from "../config/api";

function UserResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ✅ criteria states
  const [criteria, setCriteria] = useState({
    uppercase: false,
    number: false,
    special: false,
    length: false,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  if (!email) {
    navigate("/user-login");
  }

  // ✅ handle new password typing
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);

    setCriteria({
      uppercase: /[A-Z]/.test(value),
      number: /\d/.test(value),
      special: /[^A-Za-z0-9]/.test(value),
      length: value.length >= 8 && value.length <= 12,
    });

    if (confirmPassword && value !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const nocopypaste = (e) => {
    e.preventDefault();
  };

  // ✅ handle confirm password typing
  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);

    if (newPassword && value !== newPassword) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  // ✅ submit reset
  const handleReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (
      !criteria.uppercase ||
      !criteria.number ||
      !criteria.special ||
      !criteria.length
    ) {
      setError("Password does not meet all criteria");
      return;
    }

    if (newPassword !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return;
    }

    try {
      const response = await fetch(buildApiUrl("/api/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Password reset failed");
        return;
      }

      setSuccess("Password changed successfully!");
      setTimeout(() => navigate("/user-login"), 1200);
    } catch (err) {
      setError("Network error");
    }
  };

  // ✅ helper for criteria display
  const renderCriteria = (label, met) => (
    <p
      style={{
        color: met ? "green" : "red",
        margin: "2px 0",
        fontSize: "13px",
      }}
    >
      {met ? "✔" : "✖"} {label}
    </p>
  );

  return (
    <div className="forgot-password-modal">
      <div className="modal-content">
        <h2>Reset Password</h2>
        <p>Create a strong new password</p>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleReset}>
          {/* New Password */}
          <div className="form-group">
            <label>New Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={handlePasswordChange}
              placeholder="Enter new password"
              onCopy={nocopypaste}
              onPaste={nocopypaste}
              onCut={nocopypaste}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="show-password-button"
              style={{ paddingTop: "35px" }}
            >
              {showPassword ? (
                <MdVisibilityOff size={22} color="#555" />
              ) : (
                <MdVisibility size={22} color="#555" />
              )}
            </button>
          </div>

          {/* Live Criteria */}
          {newPassword.length > 0 && (
            <div style={{ marginBottom: "15px", textAlign: "left" }}>
              {renderCriteria("At least 1 Uppercase", criteria.uppercase)}
              {renderCriteria("At least 1 Number", criteria.number)}
              {renderCriteria("At least 1 Special Character", criteria.special)}
              {renderCriteria("8-12 Characters", criteria.length)}
            </div>
          )}

          {/* Confirm Password */}
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              placeholder="Confirm new password"
              onCopy={nocopypaste}
              onPaste={nocopypaste}
              onCut={nocopypaste}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="show-password-button"
              style={{ paddingTop: "35px" }}
            >
              {showConfirmPassword ? (
                <MdVisibilityOff size={22} color="#555" />
              ) : (
                <MdVisibility size={22} color="#555" />
              )}
            </button>
          </div>

          {confirmPasswordError && (
            <div className="error-message">{confirmPasswordError}</div>
          )}

          <button type="submit" className="reset-password-button">
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}

export default UserResetPasswordPage;
