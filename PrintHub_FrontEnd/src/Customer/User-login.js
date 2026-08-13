import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./User-login.css";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import backgroundImage from "../assets/images/pmg-image.jpg";
import { buildApiUrl } from "../config/api";
import AppModal from "../components/AppModal";
import { Capacitor } from "@capacitor/core";

const HTTP_STATUS_FORBIDDEN = 403;
const MAX_LOGIN_ATTEMPTS = 3;
const OTP_LENGTH = 6;

function UserLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [reactivateOtp, setReactivateOtp] = useState("");
  const [reactivateMsg, setReactivateMsg] = useState("");
  const [noticeModal, setNoticeModal] = useState(null);

  const blockClipboard = (e) => {
    e.preventDefault();
  };

  const saveLoggedInUser = (loggedInUser) => {
    const role = String(loggedInUser?.role || "").toLowerCase();

    if (role === "admin" || role === "staff") {
      if (Capacitor.isNativePlatform()) {
        localStorage.removeItem("adminUser");
        localStorage.removeItem("user");
        localStorage.removeItem("userId");
        setError("Admin and staff accounts are available on the website only.");
        return;
      }

      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.setItem("adminUser", JSON.stringify(loggedInUser));
      navigate("/admin-dashboard");
      return;
    }

    localStorage.removeItem("adminUser");
    localStorage.setItem("user", JSON.stringify(loggedInUser));
    localStorage.setItem("userId", loggedInUser.id);
    const targetPath = location.state?.from === "/" ? "/user-home" : (location.state?.from || "/user-home");
    navigate(targetPath, { replace: true });
  };

  const PostLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    try {
      const response = await fetch(buildApiUrl("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await response.json();

      if (response.status === HTTP_STATUS_FORBIDDEN && data.needsReactivation) {
        setReactivateMsg(data.message || "");
        setShowReactivateModal(true);
        return;
      }

      if (!response.ok) {
        const nextAttempts = loginAttempts + 1;
        setLoginAttempts(nextAttempts);
        if (nextAttempts >= MAX_LOGIN_ATTEMPTS) {
          setShowForgotModal(true);
        }
        setError(data.message || "Login failed");
        return;
      }

      setLoginAttempts(0);
      saveLoggedInUser(data.user);
    } catch (err) {
      console.error("[PostLogin] {ApiCall}: " + err.message);
      setError("Network error, please try again later");
    }
  };

  const PostForgotOtp = async () => {
    setError("");

    if (!email) {
      setError("Please enter your email");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      const response = await fetch(buildApiUrl("/api/password/send-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to send OTP");
        return;
      }

      setShowForgotModal(false);
      navigate("/user-forgot-otp", { state: { email } });
    } catch (err) {
      console.error("[PostForgotOtp] {ApiCall}: " + err.message);
      setError("Network error, please try again later");
    }
  };

  const PostReactivateOtp = async () => {
    setError("");

    if (!email) {
      setError("Email is required");
      return;
    }

    if (!reactivateOtp || reactivateOtp.length !== OTP_LENGTH) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    try {
      const res = await fetch(buildApiUrl("/api/reactivate/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: reactivateOtp }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Reactivation failed");
        return;
      }

      setShowReactivateModal(false);
      setReactivateOtp("");
      setReactivateMsg("");
      setError("");

      setNoticeModal({
        title: "Account reactivated",
        message: "Please login again.",
        tone: "success",
      });
    } catch (err) {
      console.error("[PostReactivateOtp] {ApiCall}: " + err.message);
      setError("Network error");
    }
  };

  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="user-login-container">
      <button
        className="back-button auth-back-button"
        onClick={handleBackClick}
      >
        ← Back
      </button>

      <div className="login-split">
        <div className="login-form-section">
          <div className="login-card">
            <div className="auth-mini-brand">
              <span>P</span>
              <strong>PrintSync</strong>
            </div>
            <div className="login-header">
              <h1>Welcome Back</h1>
              <p>Sign in and keep your print orders moving.</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={PostLogin}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    onPaste={blockClipboard}
                    onCopy={blockClipboard}
                    onCut={blockClipboard}
                    style={{ paddingRight: "48px" }}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="show-password-button"
                  >
                    {showPassword ? (
                      <MdVisibilityOff size={22} />
                    ) : (
                      <MdVisibility size={22} />
                    )}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-me-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  Remember me
                </label>
                <span
                  className="forgot-password"
                  onClick={() => setShowForgotModal(true)}
                  role="button"
                  tabIndex={0}
                >
                  Forgot password?
                </span>
              </div>

              <button type="submit" className="login-button">
                Sign In
              </button>
            </form>

            <div className="login-footer">
              <p>
                Don't have an account?{" "}
                <button
                  type="button"
                  className="auth-text-link"
                  onClick={() => navigate("/user-register")}
                >
                  Create one here
                </button>
              </p>
            </div>
          </div>
        </div>

        <div
          className="login-image-section"
          style={{
            backgroundImage: `url(${backgroundImage})`,
          }}
        >
          <div className="auth-visual-card">
            <span>PMG PRINTING HOUSE</span>
            <h2>Print-ready solutions for every brand</h2>
            <p>
              Custom shirts, signage, paper prints, IDs, packaging, and
              commercial printing services in one dedicated portal.
            </p>
          </div>
        </div>
      </div>

      {showForgotModal && (
        <div className="forgot-password-modal">
          <div className="modal-content">
            <h2>Forgot your password?</h2>
            <p>We will send you an OTP via email to reset your password</p>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>

            <div className="modal-actions">
              <button className="modal-button" onClick={PostForgotOtp}>
                Confirm
              </button>

              <button
                className="modal-button cancel"
                onClick={() => setShowForgotModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showReactivateModal && (
        <div className="forgot-password-modal">
          <div className="modal-content">
            <h2>Reactivate Account</h2>
            <p>
              {reactivateMsg ||
                "This account is archived. Enter the OTP to reactivate."}
            </p>

            <div className="form-group">
              <label>OTP</label>
              <input
                type="text"
                value={reactivateOtp}
                onChange={(e) =>
                  setReactivateOtp(e.target.value.replace(/\D/g, ""))
                }
                maxLength={OTP_LENGTH}
                placeholder="Enter 6-digit OTP"
              />
            </div>

            <div className="modal-actions">
              <button className="modal-button" onClick={PostReactivateOtp}>
                Verify OTP
              </button>

              <button
                className="modal-button cancel"
                onClick={() => {
                  setShowReactivateModal(false);
                  setReactivateOtp("");
                  setReactivateMsg("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <AppModal
        open={Boolean(noticeModal)}
        title={noticeModal?.title}
        message={noticeModal?.message}
        tone={noticeModal?.tone}
        onConfirm={() => setNoticeModal(null)}
      />
    </div>
  );
}

export default UserLoginPage;
