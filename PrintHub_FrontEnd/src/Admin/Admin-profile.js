import React, { useState, useEffect } from "react";
import { FaEdit, FaKey } from "react-icons/fa";
import "./Admin-profile.css";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { buildApiUrl } from "../config/api";

function AdminProfile() {

  const [admin, setAdmin] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "",
    birthday: "",
    gender: "",
    phone: "+63", // ✅ +63 pre-filled
    avatar_url: "",
  });

  const [isEditing, setIsEditing] = useState(false);

  // ✅ Change password modal state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [changePassError, setChangePassError] = useState("");
  const [changePassSuccess, setChangePassSuccess] = useState("");

  // ✅ eye toggles for change password modal
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // ✅ criteria for change password modal (same rules)
  const [cpCriteria, setCpCriteria] = useState({
    uppercase: false,
    number: false,
    special: false,
    length: false,
  });

  // ✅ ADDED: Inline name validation message (replaces alert for name only)
  const [nameError, setNameError] = useState("");

  // ✅ ADDED: name validation (not empty, no special characters)
  // Allows letters, spaces, dot, dash
  const nameRegex = /^[A-Za-z.\-\s]+$/;
  const isValidName = (value) => {
    const v = String(value || "").trim();
    if (!v) return false;
    return nameRegex.test(v);
  };

  // ✅ Load profile from DB
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

    fetch(buildApiUrl(`/api/user-profile/${user.id}`))
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
          phone:
            data.phone && String(data.phone).trim() !== "" ? data.phone : "+63", // ✅ fallback to +63
          avatar_url: data.avatar_url || "",
        });
      })
      .catch((err) => {
        console.error(err);
        alert(err.message || "Error loading profile");
      });
  }, []);

  const handleChange = (e) => {
    setAdmin({ ...admin, [e.target.name]: e.target.value });
  };

  const handleEdit = () => {
    setIsEditing(true);
    // ✅ ADDED: clear name error when editing
    setNameError("");
  };

  const handleSave = async () => {
    const stored = localStorage.getItem("user");
    if (!stored) {
      alert("No logged-in user found.");
      return;
    }

    let user;
    try {
      user = JSON.parse(stored);
    } catch {
      alert("Invalid user session.");
      return;
    }

    if (!user?.id) {
      alert("User ID missing.");
      return;
    }

    // ✅ ADDED: First/Last name validation (NO alerts — shows inline message)
    setNameError("");
    if (!isValidName(admin.firstName) || !isValidName(admin.lastName)) {
      setNameError("Name is required and must not contain special character.");
      return;
    }

    // ✅ Philippines phone validation
    // Allowed:
    // - "+63" only (treated as empty/not provided)
    // - "+639XXXXXXXXX" (PH mobile)
    const phoneTrim = (admin.phone || "").trim();
    if (phoneTrim !== "" && phoneTrim !== "+63") {
      const phoneRegex = /^\+639\d{9}$/;
      if (!phoneRegex.test(phoneTrim)) {
        alert(
          "Phone must be a Philippine mobile number: +639 followed by 9 digits",
        );
        return;
      }
    }

    try {
      const res = await fetch(buildApiUrl(`/api/user-profile/${user.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${admin.firstName} ${admin.lastName}`.trim(),

          // ✅ ADDED ONLY: send email so server can update it
          email: admin.email,

          birthday: admin.birthday,
          gender: admin.gender,

          // ✅ if only "+63", send empty so backend treats as not provided
          phone: phoneTrim === "+63" ? "" : phoneTrim,
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

      setIsEditing(false);
      // ✅ ADDED: clear name error on successful save
      setNameError("");

      alert("Profile Updated Successfully!");
    } catch (err) {
      console.error(err);
      alert(err.message || "Error updating profile");
    }
  };

  // ✅ update criteria as user types new password
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

  const openChangePassword = () => {
    setShowChangePassword(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setChangePassError("");
    setChangePassSuccess("");

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

      const res = await fetch(buildApiUrl("/api/user/avatar-upload"), {
        method: "POST",
        body: fd,
        headers: { "x-user-id": userId || "" },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      setAdminAvatarPreview(data.url || "");
      setAdmin((prev) => ({ ...prev, avatar_url: data.url || "" }));

      // Save to profile (best-effort)
      if (userId) {
        try {
          const profileRes = await fetch(
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

  const closeChangePassword = () => {
    setShowChangePassword(false);
    setChangePassError("");
    setChangePassSuccess("");
  };

  // ✅ Submit change password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setChangePassError("");
    setChangePassSuccess("");

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setChangePassError("All fields are required.");
      return;
    }

    if (!cpPasswordValid()) {
      setChangePassError("New password does not meet the criteria.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
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
      const res = await fetch(buildApiUrl(`/api/profile/${user.id}/password`), {
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

      setChangePassSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      setCpCriteria({
        uppercase: false,
        number: false,
        special: false,
        length: false,
      });
    } catch (err) {
      setChangePassError(err.message || "Error changing password");
    }
  };

  return (
    <div className="page-shell">
      <div className="section-hero">
        <div className="section-hero-left">
          <div className="section-kicker">Account</div>
          <h2 className="section-title">Admin Profile</h2>
          <p className="section-desc">
            Manage your personal information and account settings.
          </p>
        </div>
        <div className="section-hero-right">
          <button
            className="primary-action"
            onClick={handleEdit}
            disabled={isEditing}
          >
            <FaEdit /> Edit
          </button>

          <button
            className="primary-action"
            onClick={handleSave}
            disabled={!isEditing}
          >
            ✓ Save
          </button>

          <button className="secondary-action" onClick={openChangePassword}>
            <FaKey />
            Change Password
          </button>
        </div>
      </div>

      {nameError && (
        <div className="profile-msg profile-msg-error">{nameError}</div>
      )}

      <div className="settings-card">
        <div className="profile-avatar-row">
          <div
            className="profile-avatar"
            onClick={isEditing ? handleAdminAvatarClick : undefined}
            role={isEditing ? "button" : undefined}
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
          <div className="field">
            <label>First Name</label>
            <input
              type="text"
              name="firstName"
              value={admin.firstName}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>

          <div className="field">
            <label>Last Name</label>
            <input
              type="text"
              name="lastName"
              value={admin.lastName}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>

          <div className="field">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={admin.email}
              onChange={handleChange}
              disabled={!isEditing}
            />
          </div>

          <div className="field">
            <label>Phone Number</label>
            <input
              type="text"
              name="phone"
              value={admin.phone}
              disabled={!isEditing}
              placeholder="+639XXXXXXXXX"
              inputMode="numeric"
              maxLength={13}
              onChange={(e) => {
                let value = e.target.value || "";

                // Always keep +63
                if (!value.startsWith("+63")) value = "+63";

                // Only allow digits after +63
                const restDigits = value.slice(3).replace(/\D/g, "");

                // Build final value
                const next = "+63" + restDigits;

                setAdmin({ ...admin, phone: next });
              }}
            />
          </div>

          <div className="field">
            <label>Gender</label>
            <select
              name="gender"
              value={admin.gender}
              onChange={handleChange}
              disabled={!isEditing}
            >
              <option value="">Select...</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="prefer not to say">Prefer not to say</option>
            </select>
          </div>

          <div className="field">
            <label>Birthday</label>
            <input
              type="date"
              name="birthday"
              value={admin.birthday}
              onChange={handleChange}
              disabled={!isEditing}
              max="2010-12-31"
            />
          </div>
        </div>
      </div>

      {/* ✅ Change Password Modal */}
      {showChangePassword && (
        <div className="cp-modal-overlay" onClick={closeChangePassword}>
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
                  />
                  <button
                    type="button"
                    className="cp-eye-btn"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <MdVisibilityOff />
                    ) : (
                      <MdVisibility />
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
                  />
                  <button
                    type="button"
                    className="cp-eye-btn"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <MdVisibilityOff /> : <MdVisibility />}
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
                <div className="cp-input-wrapper">
                  <input
                    type={showConfirmNewPassword ? "text" : "password"}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    className="cp-eye-btn"
                    onClick={() =>
                      setShowConfirmNewPassword(!showConfirmNewPassword)
                    }
                  >
                    {showConfirmNewPassword ? (
                      <MdVisibilityOff />
                    ) : (
                      <MdVisibility />
                    )}
                  </button>
                </div>
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
            {changePassSuccess && (
              <p className="cp-success">{changePassSuccess}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminProfile;
