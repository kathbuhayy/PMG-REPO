import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin-profile.css";
import { FaPen, FaCheckCircle, FaTimes } from "react-icons/fa";
import { buildApiUrl } from "../config/api";
import AlertModal from "../components/AlertModal";
import ChangePasswordModal from "../components/ChangePasswordModal";
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

const MIN_BIRTHDAY = "1950-01-01";
// Always today's actual date, so the upper bound advances on its own each year.
const getTodayStr = () => new Date().toISOString().slice(0, 10);

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

  // Change Password — same modal/flow as the customer User Profile page
  // (see src/components/ChangePasswordModal.js), reused as-is so the two
  // surfaces can never drift apart.
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [adminUserId, setAdminUserId] = useState(null);

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

    setAdminUserId(user.id);

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

  // Some browsers let the year segment of a native date input grow past 4
  // digits while typing, even with min/max set. Cap it defensively here, and
  // clamp the whole date to the 1950 – today range.
  const handleBirthdayChange = (e) => {
    let value = e.target.value;
    const [year, month, day] = value.split("-");

    if (year && year.length > 4) {
      value = [year.slice(0, 4), month, day].filter(Boolean).join("-");
    }

    if (value) {
      if (value < MIN_BIRTHDAY) {
        value = MIN_BIRTHDAY;
      } else {
        const todayStr = getTodayStr();
        if (value > todayStr) {
          value = todayStr;
        }
      }
    }

    setAdmin((prev) => ({ ...prev, birthday: value }));
    setErrors((prev) => ({ ...prev, birthday: "" }));
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
    } else if (admin.birthday < MIN_BIRTHDAY || admin.birthday > getTodayStr()) {
      newErrors.birthday = `Birthday must be between ${MIN_BIRTHDAY} and today.`;
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

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-header-title">Edit Admin Profile</h1>
        <p className="admin-page-header-desc">
          Update your personal information and account settings.
        </p>
      </div>

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

            <div className="profile-avatar-status">
              {adminAvatarUploading && (
                <span className="profile-avatar-msg">Uploading avatar...</span>
              )}
              {adminAvatarError && (
                <span className="profile-avatar-msg profile-avatar-msg-error">
                  {adminAvatarError}
                </span>
              )}
            </div>
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
              onChange={handleBirthdayChange}
              min={MIN_BIRTHDAY}
              max={getTodayStr()}
              data-no-realtime-validation="true"
            />
            {errors.birthday && (
              <span className="field-error-text">{errors.birthday}</span>
            )}
          </div>
          </div>
          </div>

          <div className="profile-card-actions">
            <button
              className="secondary-action"
              onClick={() => setShowChangePasswordModal(true)}
            >
              Change Password
            </button>

            <button className="secondary-action" onClick={handleCancel}>
              Cancel
            </button>

            <button className="primary-action" onClick={handleSaveChanges}>
              Save Changes
            </button>
          </div>

      {showChangePasswordModal && (
        <ChangePasswordModal
          userId={adminUserId}
          email={admin.email}
          onClose={() => setShowChangePasswordModal(false)}
          onSuccess={() => {
            setShowChangePasswordModal(false);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 5000);
          }}
        />
      )}

      {showToast && (
        <div className="password-toast">
          <FaCheckCircle className="password-toast-icon" />
          <span className="password-toast-text">
            Password updated successfully.
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

      <AlertModal
        isOpen={alertOpen}
        message={alertMessage}
        onClose={() => setAlertOpen(false)}
      />
    </>
  );
}

export default EditAdminProfile;
