import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin-profile.css";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import {
  FaPen,
  FaCheckCircle,
  FaTimes,
  FaExclamationTriangle,
} from "react-icons/fa";
import { buildApiUrl } from "../config/api";
import AlertModal from "../components/AlertModal";
import { adminFetch } from "../utils/adminFetch";

// Allows letters, spaces, dot, dash
const nameRegex = /^[A-Za-z.\-\s]+$/;
const isValidName = (value) => {
  const v = String(value || "").trim();
  if (!v) return false;
  return nameRegex.test(v);
};

const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
// 09XXXXXXXXX or +639XXXXXXXXX
const phRegex = /^(09\d{9}|\+639\d{9})$/;

const isAtLeast18 = (dateStr) => {
  if (!dateStr) return false;
  const dob = new Date(dateStr);
  if (isNaN(dob.getTime())) return false;

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age >= 18;
};

// Normalize 09XXXXXXXXX -> +639XXXXXXXXX for storage
const normalizePhone = (value) => {
  const v = (value || "").trim();
  if (/^09\d{9}$/.test(v)) return "+63" + v.slice(1);
  return v;
};

function EditAdminProfile() {
  const navigate = useNavigate();

  const [admin, setAdmin] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    birthday: "",
    gender: "",
    phone: "",
    avatar_url: "",
  });

  const [errors, setErrors] = useState({});

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertOpen(true);
  };

  // Change password modal state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changePassError, setChangePassError] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // Rate-limit "Change Password" / OTP requests to 3 attempts, then a 60s cooldown.
  // The cooldown's expiration timestamp lives in sessionStorage so it survives
  // navigating away from and back to this page.
  const [otpClickCount, setOtpClickCount] = useState(0);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [showRateLimitToast, setShowRateLimitToast] = useState(false);

  useEffect(() => {
    if (showRateLimitToast) {
      const timer = setTimeout(() => {
        setShowRateLimitToast(false);
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [showRateLimitToast]);

  // Restore an in-progress cooldown on mount, and keep it ticking down
  // against the stored wall-clock expiry rather than a fresh in-memory timer.
  useEffect(() => {
    const checkCooldown = () => {
      const savedEndTime = sessionStorage.getItem("otpCooldownEnd");
      if (!savedEndTime) return;

      const remaining = Math.ceil(
        (parseInt(savedEndTime, 10) - Date.now()) / 1000,
      );

      if (remaining > 0) {
        setCooldownTime(remaining);
      } else {
        sessionStorage.removeItem("otpCooldownEnd");
        setCooldownTime(0);
        setOtpClickCount(0);
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, []);

  const [cpCriteria, setCpCriteria] = useState({
    uppercase: false,
    number: false,
    special: false,
    length: false,
  });

  // Load profile from DB
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) return;

    let user;
    try {
      user = JSON.parse(stored);
    } catch {
      return;
    }

    if (!user?.id) return;

    adminFetch(buildApiUrl(`/api/user-profile/${user.id}`))
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Failed to load profile");

        const fullName = data.name || "";
        const parts = fullName.trim().split(" ");
        const firstName = parts[0] || "";
        const lastName = parts.slice(1).join(" ") || "";

        setAdmin({
          firstName,
          lastName,
          email: user.email || "",
          role: user.role || "",
          birthday: data.birthday || "",
          gender: data.gender || "",
          phone: data.phone && String(data.phone).trim() !== "" ? data.phone : "",
          avatar_url: data.avatar_url || "",
        });
      })
      .catch((err) => {
        console.error(err);
        showAlert(err.message || "Error loading profile");
      });
  }, []);

  const handleChange = (e) => {
    setAdmin({ ...admin, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value;

    // Allow a leading '+' for international format (+63), strip all other non-digit characters
    if (value.startsWith("+")) {
      value = "+" + value.slice(1).replace(/\D/g, "");
    } else {
      value = value.replace(/\D/g, "");
    }

    setAdmin((prev) => ({ ...prev, phone: value }));
    setErrors((prev) => ({ ...prev, phone: "" }));
  };

  const handlePhoneKeyDown = (e) => {
    // Allow backspace, delete, tab, arrows, home/end, etc.
    const allowedKeys = [
      "Backspace",
      "Delete",
      "Tab",
      "ArrowLeft",
      "ArrowRight",
      "Home",
      "End",
    ];
    if (allowedKeys.includes(e.key) || e.ctrlKey || e.metaKey) return;

    // Allow '+' only as the very first character
    if (
      e.key === "+" &&
      e.currentTarget.selectionStart === 0 &&
      !e.currentTarget.value.includes("+")
    ) {
      return;
    }

    // Block anything that isn't a digit
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!isValidName(admin.firstName)) {
      newErrors.firstName =
        "First name is required and must not contain special characters.";
    }
    if (!isValidName(admin.lastName)) {
      newErrors.lastName =
        "Last name is required and must not contain special characters.";
    }

    const emailTrim = (admin.email || "").trim();
    if (!emailTrim) {
      newErrors.email = "Email is required.";
    } else if (!emailRegex.test(emailTrim)) {
      newErrors.email = "Enter a valid email address (e.g. user@domain.com).";
    }

    const phoneTrim = (admin.phone || "").trim();
    if (!phoneTrim) {
      newErrors.phone = "Phone number is required.";
    } else if (!phRegex.test(phoneTrim)) {
      newErrors.phone =
        "Enter a valid PH mobile number (09XXXXXXXXX or +639XXXXXXXXX).";
    }

    if (!admin.gender) {
      newErrors.gender = "Please select a gender.";
    }

    if (!admin.birthday) {
      newErrors.birthday = "Birthday is required.";
    } else if (!isAtLeast18(admin.birthday)) {
      newErrors.birthday = "You must be at least 18 years old.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCancel = () => {
    navigate("/admin/profile");
  };

  const handleSaveChanges = async () => {
    if (!validate()) return;

    const stored = localStorage.getItem("user");
    if (!stored) {
      showAlert("No logged-in user found.");
      return;
    }

    let user;
    try {
      user = JSON.parse(stored);
    } catch {
      showAlert("Invalid user session.");
      return;
    }

    if (!user?.id) {
      showAlert("User ID missing.");
      return;
    }

    const normalizedPhone = normalizePhone(admin.phone);

    try {
      const res = await adminFetch(buildApiUrl(`/api/user-profile/${user.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${admin.firstName} ${admin.lastName}`.trim(),
          email: admin.email,
          birthday: admin.birthday,
          gender: admin.gender,
          phone: normalizedPhone,
          address: "",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to update profile");

      const updatedUser = {
        ...user,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        avatar_url: admin.avatar_url,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      if (localStorage.getItem("adminUser")) {
        localStorage.setItem("adminUser", JSON.stringify(updatedUser));
      }
      window.dispatchEvent(new Event("profileUpdated"));

      navigate("/admin/profile");
    } catch (err) {
      console.error(err);
      showAlert(err.message || "Error updating profile");
    }
  };

  // update criteria as user types new password
  const handleCpNewPasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);

    setCpCriteria({
      uppercase: /[A-Z]/.test(value),
      number: /\d/.test(value),
      special: /[^A-Za-z0-9]/.test(value),
      length: value.length >= 8 && value.length <= 12,
    });
  };

  const cpPasswordValid = () =>
    cpCriteria.uppercase &&
    cpCriteria.number &&
    cpCriteria.special &&
    cpCriteria.length;

  const renderCpCriteria = (text, ok) => (
    <p className={`cp-criteria-item ${ok ? "ok" : ""}`} key={text}>
      {ok ? "✅" : "❌"} {text}
    </p>
  );

  // Step 1: request OTP, then open the OTP entry modal
  const requestPasswordOtp = async () => {
    setOtpError("");
    setOtpCode("");
    setOtpSending(true);

    const stored = localStorage.getItem("user");
    if (!stored) {
      showAlert("No logged-in user found.");
      setOtpSending(false);
      return;
    }

    let user;
    try {
      user = JSON.parse(stored);
    } catch {
      showAlert("Invalid user session.");
      setOtpSending(false);
      return;
    }

    if (!user?.email) {
      showAlert("User email missing.");
      setOtpSending(false);
      return;
    }

    try {
      const res = await adminFetch(buildApiUrl("/api/password/request-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to send OTP");

      setOtpSending(false);
      setShowOtpModal(true);
    } catch (err) {
      setOtpSending(false);
      showAlert(err.message || "Error sending OTP");
    }
  };

  // Rate-limited entry point for the "Change Password" button
  const handleChangePasswordClick = () => {
    if (cooldownTime > 0) {
      setShowRateLimitToast(true);
      return;
    }

    const nextCount = otpClickCount + 1;
    setOtpClickCount(nextCount);

    if (nextCount >= 3) {
      const expireTime = Date.now() + 60000;
      sessionStorage.setItem("otpCooldownEnd", expireTime.toString());
      setCooldownTime(60);
      setShowRateLimitToast(true);
      return;
    }

    requestPasswordOtp();
  };

  // Step 2: verify OTP, then open the actual Change Password modal
  const verifyPasswordOtp = async (e) => {
    e.preventDefault();
    setOtpError("");

    if (!otpCode.trim()) {
      setOtpError("Please enter the code sent to your email.");
      return;
    }

    const stored = localStorage.getItem("user");
    if (!stored) {
      setOtpError("No logged-in user found.");
      return;
    }

    let user;
    try {
      user = JSON.parse(stored);
    } catch {
      setOtpError("Invalid user session.");
      return;
    }

    setOtpLoading(true);
    try {
      const res = await adminFetch(buildApiUrl("/api/password/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, otp: otpCode.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Invalid or expired code");

      setOtpLoading(false);
      setShowOtpModal(false);
      setOtpCode("");
      openChangePassword();
    } catch (err) {
      setOtpLoading(false);
      setOtpError(err.message || "Error verifying code");
    }
  };

  const closeOtpModal = () => {
    setShowOtpModal(false);
    setOtpCode("");
    setOtpError("");
  };

  const openChangePassword = () => {
    setShowChangePassword(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setChangePassError("");

    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setCpCriteria({
      uppercase: false,
      number: false,
      special: false,
      length: false,
    });
  };

  const closeChangePassword = () => {
    setShowChangePassword(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setChangePassError("");
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setCpCriteria({
      uppercase: false,
      number: false,
      special: false,
      length: false,
    });
  };

  // Submit change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePassError("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setChangePassError("All fields are required.");
      return;
    }

    if (!cpPasswordValid()) {
      setChangePassError("New password does not meet the criteria.");
      return;
    }

    if (newPassword.trim() !== confirmNewPassword.trim()) {
      setChangePassError("New password and confirm password do not match.");
      return;
    }

    if (newPassword === currentPassword) {
      setChangePassError(
        "New password must be different from current password.",
      );
      return;
    }

    const stored = localStorage.getItem("user");
    if (!stored) {
      setChangePassError("No logged-in user found.");
      return;
    }

    let user;
    try {
      user = JSON.parse(stored);
    } catch {
      setChangePassError("Invalid user session.");
      return;
    }

    if (!user?.id) {
      setChangePassError("User ID missing.");
      return;
    }

    try {
      const res = await adminFetch(buildApiUrl(`/api/profile/${user.id}/password`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok)
        throw new Error(data?.message || "Failed to change password");

      closeChangePassword();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } catch (err) {
      setChangePassError(err.message || "Error changing password");
    }
  };

  // Avatar upload state + handlers
  const [adminAvatarUploading, setAdminAvatarUploading] = useState(false);
  const [adminAvatarError, setAdminAvatarError] = useState("");
  const [adminAvatarPreview, setAdminAvatarPreview] = useState("");

  useEffect(() => {
    setAdminAvatarPreview(admin.avatar_url || "");
  }, [admin.avatar_url]);

  const handleAdminAvatarClick = () => {
    const inp = document.getElementById("admin-avatar-input");
    if (inp) inp.click();
  };

  const handleAdminAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    setAdminAvatarError("");
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setAdminAvatarError("Only JPEG, PNG, WebP and GIF are allowed");
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAdminAvatarError("Image must be 2MB or smaller.");
      e.target.value = "";
      return;
    }

    setAdminAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const stored =
        localStorage.getItem("adminUser") || localStorage.getItem("user");
      const userId = stored ? JSON.parse(stored).id : null;

      const res = await adminFetch(buildApiUrl("/api/user/avatar-upload"), {
        method: "POST",
        body: fd,
        headers: { "x-user-id": userId || "" },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      setAdminAvatarPreview(data.url || "");
      setAdmin((prev) => ({ ...prev, avatar_url: data.url || "" }));

      if (userId) {
        try {
          const profileRes = await adminFetch(
            buildApiUrl(`/api/user-profile/${userId}`),
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ avatar_url: data.url }),
            },
          );
          if (!profileRes.ok) {
            const profileData = await profileRes.json().catch(() => ({}));
            throw new Error(profileData?.message || "Failed to save avatar");
          }
        } catch (err) {
          throw err;
        }
      }

      try {
        const storedUser = JSON.parse(
          localStorage.getItem("user") ||
          localStorage.getItem("adminUser") ||
          "{}",
        );
        const updatedUser = { ...storedUser, avatar_url: data.url };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        if (localStorage.getItem("adminUser")) {
          localStorage.setItem("adminUser", JSON.stringify(updatedUser));
        }
      } catch {
        /* ignore localStorage sync errors */
      }
      window.dispatchEvent(new Event("profileUpdated"));
    } catch (err) {
      console.error(err);
      setAdminAvatarError(err.message || "Upload failed");
    } finally {
      setAdminAvatarUploading(false);
      e.target.value = "";
    }
  };

  const isConfirmTooShort =
    confirmNewPassword.length > 0 && confirmNewPassword.length < 6;
  const isMismatch =
    confirmNewPassword.length > 0 &&
    newPassword.trim() !== confirmNewPassword.trim();
  const hasConfirmError = isConfirmTooShort || isMismatch;

  return (
    <div className="page-shell">
      <div className="section-hero">
        <div className="section-hero-left">
          <h2 className="section-title">Edit Admin Profile</h2>
          <p className="section-desc">
            Update your personal information and account settings.
          </p>
        </div>
      </div>

      <div className="settings-card">
        <div className="profile-body">
          <div className="profile-avatar-col">
            <div className="profile-avatar-wrapper">
              <div
                className="profile-avatar"
                onClick={handleAdminAvatarClick}
                role="button"
                aria-label="Change avatar"
              >
                {adminAvatarPreview ? (
                  <img src={adminAvatarPreview} alt="avatar" />
                ) : (
                  "AD"
                )}

                <input
                  id="admin-avatar-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleAdminAvatarUpload}
                  style={{ display: "none" }}
                />
              </div>

              <button
                type="button"
                className="profile-avatar-edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAdminAvatarClick();
                }}
                aria-label="Change profile photo"
              >
                <FaPen size={12} />
              </button>
            </div>

            {adminAvatarUploading && (
              <div className="profile-msg">Uploading avatar...</div>
            )}
            {adminAvatarError && (
              <div className="profile-msg profile-msg-error">
                {adminAvatarError}
              </div>
            )}
          </div>

          <div className="form-grid">
          <div className={`field${errors.firstName ? " field-invalid" : ""}`}>
            <label>First Name</label>
            <input
              type="text"
              name="firstName"
              value={admin.firstName}
              onChange={handleChange}
              data-no-realtime-validation="true"
            />
            {errors.firstName && (
              <span className="field-error-text">{errors.firstName}</span>
            )}
          </div>

          <div className={`field${errors.lastName ? " field-invalid" : ""}`}>
            <label>Last Name</label>
            <input
              type="text"
              name="lastName"
              value={admin.lastName}
              onChange={handleChange}
              data-no-realtime-validation="true"
            />
            {errors.lastName && (
              <span className="field-error-text">{errors.lastName}</span>
            )}
          </div>

          <div className={`field${errors.email ? " field-invalid" : ""}`}>
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={admin.email}
              onChange={handleChange}
              data-no-realtime-validation="true"
            />
            {errors.email && (
              <span className="field-error-text">{errors.email}</span>
            )}
          </div>

          <div className={`field${errors.phone ? " field-invalid" : ""}`}>
            <label>Phone Number</label>
            <input
              type="text"
              name="phone"
              value={admin.phone}
              placeholder="09XXXXXXXXX or +639XXXXXXXXX"
              onChange={handlePhoneChange}
              onKeyDown={handlePhoneKeyDown}
              inputMode="tel"
              data-no-realtime-validation="true"
            />
            {errors.phone && (
              <span className="field-error-text">{errors.phone}</span>
            )}
          </div>

          <div className={`field${errors.gender ? " field-invalid" : ""}`}>
            <label>Gender</label>
            <select
              name="gender"
              value={admin.gender}
              onChange={handleChange}
              data-no-realtime-validation="true"
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="prefer not to say">Prefer not to say</option>
            </select>
            {errors.gender && (
              <span className="field-error-text">{errors.gender}</span>
            )}
          </div>

          <div className={`field${errors.birthday ? " field-invalid" : ""}`}>
            <label>Birthday</label>
            <input
              type="date"
              name="birthday"
              value={admin.birthday}
              onChange={handleChange}
              data-no-realtime-validation="true"
            />
            {errors.birthday && (
              <span className="field-error-text">{errors.birthday}</span>
            )}
          </div>
          </div>
        </div>
      </div>

      <div className="profile-card-actions">
        <button
          className="secondary-action"
          onClick={handleChangePasswordClick}
          disabled={otpSending || cooldownTime > 0}
        >
          {otpSending
            ? "Sending code..."
            : cooldownTime > 0
              ? `Try again in ${cooldownTime}s`
              : "Change Password"}
        </button>

        <button className="secondary-action" onClick={handleCancel}>
          Cancel
        </button>

        <button className="primary-action" onClick={handleSaveChanges}>
          Save Changes
        </button>
      </div>

      {showOtpModal && (
        <div className="cp-modal-overlay">
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="cp-title">Verify It's You</h3>
            <p className="cp-subtext">
              We sent a 6-digit code to your email. Enter it below to continue.
            </p>

            <form onSubmit={verifyPasswordOtp}>
              <div className="cp-form-row">
                <label>OTP Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 6-digit code"
                  data-no-realtime-validation="true"
                  autoFocus
                />
              </div>

              <div className="cp-actions">
                <button type="button" className="cp-cancel" onClick={closeOtpModal}>
                  Cancel
                </button>
                <button type="submit" className="cp-save" disabled={otpLoading}>
                  {otpLoading ? "Verifying..." : "Verify"}
                </button>
              </div>
            </form>

            {otpError && <p className="cp-error">{otpError}</p>}
          </div>
        </div>
      )}

      {showChangePassword && (
        <div className="cp-modal-overlay">
          <div className="cp-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="cp-title">Change Password</h3>
            <p className="cp-subtext">Enter your current and new password</p>

            <form onSubmit={handleChangePassword}>
              <div className="cp-form-row">
                <label>Current Password</label>
                <div className="cp-input-wrapper">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    data-no-realtime-validation="true"
                  />
                  <button
                    type="button"
                    className="cp-eye-btn"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <MdVisibility />
                    ) : (
                      <MdVisibilityOff />
                    )}
                  </button>
                </div>
              </div>

              <div className="cp-form-row">
                <label>New Password</label>
                <div className="cp-input-wrapper">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={handleCpNewPasswordChange}
                    placeholder="Enter new password"
                    data-no-realtime-validation="true"
                  />
                  <button
                    type="button"
                    className="cp-eye-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <MdVisibility /> : <MdVisibilityOff />}
                  </button>
                </div>
                <div className="cp-criteria">
                  {renderCpCriteria("Uppercase letter", cpCriteria.uppercase)}
                  {renderCpCriteria("Number", cpCriteria.number)}
                  {renderCpCriteria("Special character", cpCriteria.special)}
                  {renderCpCriteria("8-12 characters", cpCriteria.length)}
                </div>
              </div>

              <div className="cp-form-row">
                <label>Confirm New Password</label>
                <div
                  className={`cp-input-wrapper${hasConfirmError ? " cp-input-error" : ""
                    }`}
                >
                  <input
                    type={showConfirmNewPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                    data-no-realtime-validation="true"
                  />
                  <button
                    type="button"
                    className="cp-eye-btn"
                    onClick={() =>
                      setShowConfirmNewPassword(!showConfirmNewPassword)
                    }
                  >
                    {showConfirmNewPassword ? (
                      <MdVisibility />
                    ) : (
                      <MdVisibilityOff />
                    )}
                  </button>
                </div>
                {isConfirmTooShort && (
                  <span className="field-error-text">
                    Password must be at least 6 characters.
                  </span>
                )}
                {isMismatch && (
                  <span className="field-error-text">
                    Passwords do not match.
                  </span>
                )}
              </div>

              <div className="cp-actions">
                <button
                  type="button"
                  className="cp-cancel"
                  onClick={closeChangePassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cp-save"
                  disabled={!cpPasswordValid()}
                >
                  Change Password
                </button>
              </div>
            </form>

            {changePassError && <p className="cp-error">{changePassError}</p>}
          </div>
        </div>
      )}

      {showToast && (
        <div className="password-toast">
          <FaCheckCircle className="password-toast-icon" />
          <span className="password-toast-text">
            Password changed successfully!
          </span>
          <button
            type="button"
            className="password-toast-close"
            onClick={() => setShowToast(false)}
            aria-label="Dismiss notification"
          >
            <FaTimes />
          </button>
        </div>
      )}

      {showRateLimitToast && (
        <div className="password-toast password-toast-warning">
          <FaExclamationTriangle className="password-toast-icon" />
          <span className="password-toast-text">
            Too many attempts. Please wait before requesting a new OTP.
          </span>
          <button
            type="button"
            className="password-toast-close"
            onClick={() => setShowRateLimitToast(false)}
            aria-label="Dismiss notification"
          >
            <FaTimes />
          </button>
        </div>
      )}

      <AlertModal
        isOpen={alertOpen}
        message={alertMessage}
        onClose={() => setAlertOpen(false)}
      />
    </div>
  );
}

export default EditAdminProfile;
