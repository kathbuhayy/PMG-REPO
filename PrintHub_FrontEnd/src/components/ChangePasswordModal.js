import React, { useEffect, useRef, useState } from "react";
import {
  FaEye,
  FaEyeSlash,
  FaTimes,
  FaShieldAlt,
  FaExclamationTriangle,
} from "react-icons/fa";
import { buildApiUrl } from "../config/api";
import ShadowPortal from "./ShadowPortal";
import changePasswordModalStyles from "./ChangePasswordModal.styles";

const RESEND_COOLDOWN_SECONDS = 30;
const OTP_LENGTH = 6;

// After this many OTP requests (Send Code + Resend, combined) within one
// browser session, lock out further requests for a cooldown period. This
// is a soft, client-side guard against OTP spam — the real security lives
// server-side (OTP expiry, current-password verification); this just
// keeps a chatty user from hammering the email/SMS provider.
const OTP_RATE_LIMIT_COUNT = 3;
const OTP_RATE_LIMIT_COOLDOWN_SECONDS = 60;
const OTP_RATE_LIMIT_STORAGE_KEY = "otpCooldownEnd";

function friendlyError(message) {
  const map = {
    "Wrong password": "Current password is incorrect.",
    "Password weak": "Your new password doesn't meet the requirements.",
    "Invalid OTP": "Invalid or expired code.",
    "OTP expired. Please resend OTP.": "Invalid or expired code.",
    "OTP session expired. Please verify again.":
      "Your session expired. Please verify the code again.",
    "No OTP request found. Please resend OTP.":
      "Invalid or expired code.",
  };
  return map[message] || message || "Something went wrong. Please try again.";
}

function ChangePasswordModal({ userId, email, onClose, onSuccess }) {
  const [step, setStep] = useState("form"); // "form" | "otp"

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [currentPasswordError, setCurrentPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [otpDigits, setOtpDigits] = useState(Array(OTP_LENGTH).fill(""));
  const [otpError, setOtpError] = useState("");
  const [otpInfo, setOtpInfo] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);

  // Rate-limit OTP requests to OTP_RATE_LIMIT_COUNT attempts, then a
  // cooldown. The cooldown's expiry lives in sessionStorage so it survives
  // closing and reopening this modal (otherwise a user could dodge the
  // limit just by re-clicking "Change Password").
  const [otpRequestCount, setOtpRequestCount] = useState(0);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(0);
  const [showRateLimitToast, setShowRateLimitToast] = useState(false);

  useEffect(() => {
    if (!showRateLimitToast) return;
    const timer = setTimeout(() => setShowRateLimitToast(false), 10000);
    return () => clearTimeout(timer);
  }, [showRateLimitToast]);

  useEffect(() => {
    const checkCooldown = () => {
      const savedEndTime = sessionStorage.getItem(OTP_RATE_LIMIT_STORAGE_KEY);
      if (!savedEndTime) return;

      const remaining = Math.ceil((parseInt(savedEndTime, 10) - Date.now()) / 1000);
      if (remaining > 0) {
        setRateLimitCooldown(remaining);
      } else {
        sessionStorage.removeItem(OTP_RATE_LIMIT_STORAGE_KEY);
        setRateLimitCooldown(0);
        setOtpRequestCount(0);
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Gate for every place that's about to call sendOtp(). Returns true if
  // the request may proceed; otherwise surfaces the rate-limit toast and
  // returns false.
  const tryRequestOtp = () => {
    if (rateLimitCooldown > 0) {
      setShowRateLimitToast(true);
      return false;
    }

    const nextCount = otpRequestCount + 1;
    setOtpRequestCount(nextCount);

    if (nextCount >= OTP_RATE_LIMIT_COUNT) {
      const expireTime = Date.now() + OTP_RATE_LIMIT_COOLDOWN_SECONDS * 1000;
      sessionStorage.setItem(OTP_RATE_LIMIT_STORAGE_KEY, expireTime.toString());
      setRateLimitCooldown(OTP_RATE_LIMIT_COOLDOWN_SECONDS);
      setShowRateLimitToast(true);
      return false;
    }

    return true;
  };

  const otpRefs = useRef([]);
  const currentPasswordRef = useRef(null);
  const newPasswordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const criteria = {
    length: newPassword.length >= 8 && newPassword.length <= 12,
    uppercase: /[A-Z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  };

  // Re-checks the match using the *live DOM value* of both fields rather
  // than trusting React state alone. Some browser extensions (password
  // managers, Grammarly, etc.) can write into a password input directly
  // once it's toggled to type="text" without firing a normal input event,
  // which would silently desync React's copy from what's actually on
  // screen. Reading .value straight off the input at the moments that
  // matter (typing, blur, submit) is immune to that.
  const checkPasswordsMatch = () => {
    const newVal = newPasswordRef.current ? newPasswordRef.current.value : newPassword;
    const confirmVal = confirmPasswordRef.current
      ? confirmPasswordRef.current.value
      : confirmPassword;
    if (!confirmVal) {
      setConfirmError("");
      return true;
    }
    const matches = newVal === confirmVal;
    setConfirmError(matches ? "" : "Passwords do not match.");
    return matches;
  };

  useEffect(() => {
    checkPasswordsMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmPassword, newPassword]);

  useEffect(() => {
    if (step !== "otp" || resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, resendCooldown]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const sendOtp = async () => {
    const res = await fetch(buildApiUrl("/api/password/request-otp"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(friendlyError(data.message));
  };

  const handleContinue = async (e) => {
    e.preventDefault();
    setFormError("");
    setCurrentPasswordError("");

    // Trust the live DOM values over state for this check — see
    // checkPasswordsMatch above for why. Also re-sync state to match so
    // the OTP step (which reads state, since the fields are unmounted by
    // then) uses exactly what was actually submitted here.
    const liveCurrent = currentPasswordRef.current
      ? currentPasswordRef.current.value
      : currentPassword;
    const liveNew = newPasswordRef.current ? newPasswordRef.current.value : newPassword;
    const liveConfirm = confirmPasswordRef.current
      ? confirmPasswordRef.current.value
      : confirmPassword;
    setCurrentPassword(liveCurrent);
    setNewPassword(liveNew);
    setConfirmPassword(liveConfirm);

    if (!email || !userId) {
      setFormError("We couldn't load your account. Please refresh and try again.");
      return;
    }
    if (!liveCurrent || !liveNew || !liveConfirm) {
      setFormError("Please fill in all fields.");
      return;
    }

    const liveValid =
      liveNew.length >= 8 &&
      liveNew.length <= 12 &&
      /[A-Z]/.test(liveNew) &&
      /\d/.test(liveNew) &&
      /[^A-Za-z0-9]/.test(liveNew);
    if (!liveValid) {
      setFormError("Your new password doesn't meet the requirements below.");
      return;
    }
    if (liveNew !== liveConfirm) {
      setConfirmError("Passwords do not match.");
      return;
    }

    // Gate here, before either network call: this counts every complete,
    // client-valid submission as one attempt, regardless of whether the
    // current password turns out to be right — matching what a user
    // clicking "Send Code" repeatedly would expect, rather than only
    // counting attempts that happened to succeed.
    if (!tryRequestOtp()) return;

    setSubmitting(true);
    try {
      const verifyRes = await fetch(buildApiUrl("/api/admin/verify-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email, password: liveCurrent }),
      });
      if (!verifyRes.ok) {
        if (verifyRes.status === 401) {
          setCurrentPasswordError("Current password is incorrect.");
        } else {
          setFormError("Couldn't verify your current password. Please try again.");
        }
        return;
      }

      await sendOtp();
      setOtpInfo(
        "We've sent a one-time code to your registered mobile number/email to confirm this change."
      );
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setOtpError("");
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      setStep("otp");
    } catch (err) {
      setFormError(err.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const focusOtpBox = (idx) => {
    otpRefs.current[idx]?.focus();
  };

  const handleOtpChange = (idx, rawValue) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    setOtpDigits((prev) => {
      const next = [...prev];
      next[idx] = digit;
      return next;
    });
    if (digit && idx < OTP_LENGTH - 1) focusOtpBox(idx + 1);
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) {
      focusOtpBox(idx - 1);
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setOtpDigits(next);
    focusOtpBox(Math.min(pasted.length, OTP_LENGTH - 1));
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    if (!tryRequestOtp()) return;
    setResending(true);
    setOtpError("");
    try {
      await sendOtp();
      setOtpInfo("A new code has been sent.");
      setOtpDigits(Array(OTP_LENGTH).fill(""));
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
      focusOtpBox(0);
    } catch (err) {
      setOtpError(err.message || "Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const otp = otpDigits.join("");
    if (otp.length !== OTP_LENGTH) {
      setOtpError("Please enter the 6-digit code.");
      return;
    }

    setVerifying(true);
    setOtpError("");
    try {
      const verifyOtpRes = await fetch(buildApiUrl("/api/password/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      if (!verifyOtpRes.ok) {
        setOtpError("Invalid or expired code.");
        return;
      }

      const saveRes = await fetch(buildApiUrl(`/api/profile/${userId}/password`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const saveData = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok) {
        setOtpError(friendlyError(saveData.message));
        return;
      }

      onSuccess?.();
    } catch (err) {
      setOtpError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const handleBackToForm = () => {
    setStep("form");
    setOtpError("");
    setOtpInfo("");
  };

  // Rendered inside a Shadow DOM (via ShadowPortal), appended straight
  // to <body>. Two problems this solves at once:
  //  1. This fixed-position overlay is never trapped by an ancestor's
  //     CSS transform (e.g. the page's fade-in-up entrance animation),
  //     which would otherwise turn "fixed" into "positioned relative to
  //     that ancestor" and break the full-viewport backdrop.
  //  2. A shadow root is invisible to the kind of main-document DOM
  //     scanning (document.querySelectorAll and friends) that browser
  //     extensions and built-in password-manager heuristics use to
  //     inject their own UI (autofill icons, "doesn't match" hints,
  //     colored borders) into password-shaped fields — so this form
  //     renders exactly as written, regardless of what's installed in
  //     the user's browser. See ShadowPortal.js for why "open" rather
  //     than "closed".
  return (
    <ShadowPortal styles={changePasswordModalStyles}>
    <>
    {showRateLimitToast && (
      <div className="cpm-rate-limit-toast">
        <FaExclamationTriangle className="cpm-rate-limit-icon" />
        <span className="cpm-rate-limit-text">
          Too many attempts. Please wait before requesting a new OTP.
        </span>
        <button
          type="button"
          className="cpm-rate-limit-close"
          onClick={() => setShowRateLimitToast(false)}
          aria-label="Dismiss notification"
        >
          <FaTimes />
        </button>
      </div>
    )}
    <div className="cpm-overlay" onMouseDown={onClose}>
      <div
        className="cpm-modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Change Password"
      >
        <button type="button" className="cpm-close" onClick={onClose} aria-label="Close">
          <FaTimes />
        </button>

        {step === "form" ? (
          <>
            <div className="cpm-header">
              <h2>Change Password</h2>
              <p>Update your password. We'll send a one-time code to confirm the change.</p>
            </div>

            {formError && <div className="cpm-alert cpm-alert-error">{formError}</div>}

            <form onSubmit={handleContinue} className="cpm-form">
              <label className="cpm-label">
                Current Password
                <div className="cpm-input-wrap">
                  <input
                    type={showCurrent ? "text" : "password"}
                    className="cpm-input"
                    name="current-password"
                    autoComplete="current-password"
                    spellCheck={false}
                    data-gramm="false"
                    data-gramm_editor="false"
                    data-enable-grammarly="false"
                    ref={currentPasswordRef}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      setCurrentPasswordError("");
                    }}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    className="cpm-eye-btn"
                    onClick={() => setShowCurrent((v) => !v)}
                    aria-label={showCurrent ? "Hide password" : "Show password"}
                  >
                    {showCurrent ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {currentPasswordError && (
                  <span className="cpm-field-error">{currentPasswordError}</span>
                )}
              </label>

              <label className="cpm-label">
                New Password
                <div className="cpm-input-wrap">
                  <input
                    type={showNew ? "text" : "password"}
                    className="cpm-input"
                    name="pmg-np-field"
                    id="pmg-np-field"
                    autoComplete="off"
                    spellCheck={false}
                    data-gramm="false"
                    data-gramm_editor="false"
                    data-enable-grammarly="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-dashlane-ignore="true"
                    data-form-type="other"
                    ref={newPasswordRef}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onBlur={() => {
                      if (newPasswordRef.current) setNewPassword(newPasswordRef.current.value);
                      checkPasswordsMatch();
                    }}
                    placeholder="Create a new password"
                  />
                  <button
                    type="button"
                    className="cpm-eye-btn"
                    onClick={() => setShowNew((v) => !v)}
                    aria-label={showNew ? "Hide password" : "Show password"}
                  >
                    {showNew ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </label>

              <label className="cpm-label">
                Confirm New Password
                <div className="cpm-input-wrap">
                  <input
                    type={showConfirm ? "text" : "password"}
                    className="cpm-input"
                    name="pmg-cnp-field"
                    id="pmg-cnp-field"
                    autoComplete="off"
                    spellCheck={false}
                    data-gramm="false"
                    data-gramm_editor="false"
                    data-enable-grammarly="false"
                    data-lpignore="true"
                    data-1p-ignore="true"
                    data-bwignore="true"
                    data-dashlane-ignore="true"
                    data-form-type="other"
                    ref={confirmPasswordRef}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => {
                      if (confirmPasswordRef.current)
                        setConfirmPassword(confirmPasswordRef.current.value);
                      checkPasswordsMatch();
                    }}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    className="cpm-eye-btn"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
                {confirmError && <span className="cpm-field-error">{confirmError}</span>}
              </label>

              <div className="cpm-criteria">
                <span className={criteria.length ? "ok" : ""}>8–12 characters</span>
                <span className={criteria.uppercase ? "ok" : ""}>1 uppercase letter</span>
                <span className={criteria.number ? "ok" : ""}>1 number</span>
                <span className={criteria.special ? "ok" : ""}>1 special character</span>
              </div>

              <div className="cpm-actions">
                <button type="button" className="cpm-cancel-button" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cpm-save-button"
                  disabled={submitting || rateLimitCooldown > 0}
                >
                  {submitting
                    ? "Sending code..."
                    : rateLimitCooldown > 0
                      ? `Try again in ${rateLimitCooldown}s`
                      : "Send Code"}
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="cpm-header">
              <div className="cpm-otp-icon">
                <FaShieldAlt />
              </div>
              <h2>Verify It's You</h2>
              {otpInfo && <p>{otpInfo}</p>}
            </div>

            {otpError && <div className="cpm-alert cpm-alert-error">{otpError}</div>}

            <form onSubmit={handleVerify} className="cpm-form">
              <div className="cpm-otp-boxes" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    // eslint-disable-next-line react/no-array-index-key
                    key={idx}
                    ref={(el) => (otpRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    className="cpm-otp-box"
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  />
                ))}
              </div>

              <div className="cpm-resend-row">
                {resendCooldown > 0 ? (
                  <span className="cpm-resend-cooldown">
                    Resend code in {resendCooldown}s
                  </span>
                ) : rateLimitCooldown > 0 ? (
                  <span className="cpm-resend-cooldown">
                    Try again in {rateLimitCooldown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    className="cpm-resend-link"
                    onClick={handleResend}
                    disabled={resending}
                  >
                    {resending ? "Resending..." : "Resend code"}
                  </button>
                )}
              </div>

              <button type="button" className="cpm-back-link" onClick={handleBackToForm}>
                ← Edit password
              </button>

              <div className="cpm-actions">
                <button type="button" className="cpm-cancel-button" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="cpm-save-button" disabled={verifying}>
                  {verifying ? "Verifying..." : "Verify & Save"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
    </>
    </ShadowPortal>
  );
}

export default ChangePasswordModal;
