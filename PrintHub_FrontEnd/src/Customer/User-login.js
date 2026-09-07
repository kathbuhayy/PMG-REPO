import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./User-login.css";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { buildApiUrl } from "../config/api";
import AppModal from "../components/AppModal";
import { Capacitor } from "@capacitor/core";
import pmgLogo from "../assets/brand/pmg-logo-nav.png";

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

  const saveLoggedInUser = (loggedInUser, authToken) => {
    const role = String(loggedInUser?.role || "").toLowerCase();

    if (role === "admin" || role === "staff") {
      if (Capacitor.isNativePlatform()) {
        localStorage.removeItem("adminUser");
        localStorage.removeItem("user");
        localStorage.removeItem("userId");
        localStorage.removeItem("authToken");

        setError(
          "Admin and staff accounts are available on the website only."
        );

        return;
      }

      localStorage.removeItem("user");
      localStorage.removeItem("userId");

      localStorage.setItem(
        "adminUser",
        JSON.stringify(loggedInUser)
      );

      if (authToken) {
        localStorage.setItem("authToken", authToken);
      }

      navigate("/admin-dashboard");
      return;
    }

    localStorage.removeItem("adminUser");

    localStorage.setItem(
      "user",
      JSON.stringify(loggedInUser)
    );

    localStorage.setItem("userId", loggedInUser.id);

    if (authToken) {
      localStorage.setItem("authToken", authToken);
    }

    const targetPath =
      location.state?.from === "/"
        ? "/user-home"
        : location.state?.from || "/user-home";

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
      const response = await fetch(
        buildApiUrl("/api/login"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            rememberMe,
          }),
        }
      );

      const data = await response.json();

      if (
        response.status === HTTP_STATUS_FORBIDDEN &&
        data.needsReactivation
      ) {
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

      saveLoggedInUser(
        data.user,
        data.token
      );
    } catch (err) {
      console.error(
        "[PostLogin] {ApiCall}: " + err.message
      );

      setError(
        "Network error, please try again later"
      );
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
      const response = await fetch(
        buildApiUrl("/api/password/send-otp"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.message || "Failed to send OTP"
        );
        return;
      }

      setShowForgotModal(false);

      navigate("/user-forgot-otp", {
        state: {
          email,
        },
      });
    } catch (err) {
      console.error(
        "[PostForgotOtp] {ApiCall}: " + err.message
      );

      setError(
        "Network error, please try again later"
      );
    }
  };

  const PostReactivateOtp = async () => {
    setError("");

    if (!email) {
      setError("Email is required");
      return;
    }

    if (
      !reactivateOtp ||
      reactivateOtp.length !== OTP_LENGTH
    ) {
      setError("Please enter the 6-digit OTP");
      return;
    }

    try {
      const res = await fetch(
        buildApiUrl("/api/reactivate/verify-otp"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp: reactivateOtp,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.message || "Reactivation failed"
        );
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
      console.error(
        "[PostReactivateOtp] {ApiCall}: " +
          err.message
      );

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
      {/* Background decorations */}
      <div className="auth-decoration auth-decoration-one" />
      <div className="auth-decoration auth-decoration-two" />
      <div className="auth-dots auth-dots-one" />
      <div className="auth-dots auth-dots-two" />

      {/* Back button */}
      <button
        className="back-button auth-back-button"
        onClick={handleBackClick}
      >
        <span>←</span>
        Back
      </button>

      <main className="auth-page login-auth-page">
        {/* PMG LOGO */}
        <div className="auth-brand">
          <img
            src={pmgLogo}
            alt="PMG Printing House"
            className="auth-brand-logo"
          />
        </div>

        {/* LOGIN CARD */}
        <div className="login-card">
          <div className="auth-card-accent" />

          <div className="login-header">
            <div className="auth-eyebrow">
              CUSTOMER PORTAL
            </div>

            <h1>
              Welcome <span>Back</span>
            </h1>

            <p>
              Sign in and keep your print orders moving.
            </p>
          </div>

          {error && (
            <div className="error-message">
              <span className="message-icon">!</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={PostLogin}>
            {/* EMAIL */}
            <div className="form-group">
              <label htmlFor="email">
                Email Address
              </label>

              <div className="auth-input-wrapper">
                <span className="input-icon">
                  @
                </span>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="customer@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="form-group">
              <label htmlFor="password">
                Password
              </label>

              <div className="auth-input-wrapper">
                <span className="input-icon lock-icon">
                  ●
                </span>

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  onPaste={blockClipboard}
                  onCopy={blockClipboard}
                  onCut={blockClipboard}
                />

                <button
                  type="button"
                  className="show-password-button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <MdVisibility size={19} />
                  ) : (
                    <MdVisibilityOff size={19} />
                  )}
                </button>
              </div>
            </div>

            {/* REMEMBER / FORGOT */}
            <div className="form-options">
              <label className="remember-me-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) =>
                    setRememberMe(
                      e.target.checked
                    )
                  }
                />

                <span className="custom-checkbox" />

                <span>
                  Remember me
                </span>
              </label>

              <button
                type="button"
                className="forgot-password"
                onClick={() =>
                  setShowForgotModal(true)
                }
              >
                Forgot password?
              </button>
            </div>

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              className="login-button"
            >
              <span>Log In</span>

              <span className="button-arrow">
                →
              </span>
            </button>
          </form>

          {/* FOOTER */}
          <div className="login-footer">
            <span>
              Don't have an account?
            </span>

            <button
              type="button"
              className="auth-text-link"
              onClick={() =>
                navigate("/user-register")
              }
            >
              Create one here
            </button>
          </div>
        </div>

        {/* BOTTOM NOTE */}
        <div className="auth-bottom-note">
          <span className="lime-dot" />
          PRINT. CREATE. DELIVER.
        </div>
      </main>

      {/* =====================================================
          FORGOT PASSWORD MODAL
          ===================================================== */}
      {showForgotModal && (
        <div className="forgot-password-modal">
          <div className="modal-content">
            <div className="modal-top-line" />

            <div className="modal-icon">
              ?
            </div>

            <h2>
              Forgot your password?
            </h2>

            <p>
              We'll send you a one-time password
              via email so you can reset your
              password.
            </p>

            <div className="form-group">
              <label htmlFor="forgot-email">
                Email Address
              </label>

              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) =>
                  setEmail(e.target.value)
                }
                placeholder="Enter your email"
              />
            </div>

            <div className="modal-actions">
              <button
                className="modal-button"
                onClick={PostForgotOtp}
              >
                Send OTP
              </button>

              <button
                className="modal-button cancel"
                onClick={() =>
                  setShowForgotModal(false)
                }
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          REACTIVATE ACCOUNT MODAL
          ===================================================== */}
      {showReactivateModal && (
        <div className="forgot-password-modal">
          <div className="modal-content">
            <div className="modal-top-line" />

            <div className="modal-icon">
              ↻
            </div>

            <h2>
              Reactivate Account
            </h2>

            <p>
              {reactivateMsg ||
                "This account is archived. Enter the OTP to reactivate your account."}
            </p>

            <div className="form-group">
              <label htmlFor="reactivate-otp">
                OTP
              </label>

              <input
                id="reactivate-otp"
                type="text"
                value={reactivateOtp}
                onChange={(e) =>
                  setReactivateOtp(
                    e.target.value
                      .replace(/\D/g, "")
                  )
                }
                maxLength={OTP_LENGTH}
                placeholder="Enter 6-digit OTP"
                inputMode="numeric"
              />
            </div>

            <div className="modal-actions">
              <button
                className="modal-button"
                onClick={PostReactivateOtp}
              >
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

      {/* =====================================================
          NOTICE MODAL
          ===================================================== */}
      <AppModal
        open={Boolean(noticeModal)}
        title={noticeModal?.title}
        message={noticeModal?.message}
        tone={noticeModal?.tone}
        onConfirm={() =>
          setNoticeModal(null)
        }
      />
    </div>
  );
}

export default UserLoginPage;