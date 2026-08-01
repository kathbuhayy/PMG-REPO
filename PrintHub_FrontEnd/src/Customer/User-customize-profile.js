import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaShoppingBag,
  FaLock,
  FaComments,
  FaCreditCard,
} from "react-icons/fa";
import "./User-customize-profile.css";
import { buildApiUrl } from "../config/api";
import { usePsgcAddress } from "../hooks/usePsgcAddress";

const syncAvatarToLocalStorage = (avatarUrl) => {
  if (avatarUrl) {
    localStorage.setItem("userAvatar", avatarUrl);
  }
};

function UserCustomizeProfile() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    birthday: "",
    gender: "",
    phone: "+63",
    address: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
    street: "",
  });

  const [isEditing, setIsEditing] = useState(false);

  const [initialForm, setInitialForm] = useState({
    name: "",
    birthday: "",
    gender: "",
    phone: "+63",
    address: "",
    region: "",
    province: "",
    city: "",
    barangay: "",
    street: "",
  });

  const [userId, setUserId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [toast, setToast] = useState({
    show: false,
    type: "success",
    message: "",
  });
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarPreview, setAvatarPreview] = useState("");

  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const [stats, setStats] = useState({
    orders: 0,
    inquiries: 0,
    payments: 0,
  });

  const profileAddr = usePsgcAddress();

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(
      () =>
        setToast({
          show: false,
          type: message ? type : "success",
          message: "",
        }),
      2200
    );
  };

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
    setUserId(user.id);

    const loadProfile = async () => {
      try {
        const res = await fetch(buildApiUrl(`/api/user-profile/${user.id}`));
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "Failed to load profile");
        }

        const loadedAddress = data.address || "";
        const parts = loadedAddress.split(",").map((s) => s.trim());
        let region = "";
        let province = "";
        let city = "";
        let barangay = "";
        let street = "";

        if (parts.length >= 4) {
          region = parts[parts.length - 1] || "";
          province = parts[parts.length - 2] || "";
          city = parts[parts.length - 3] || "";
          barangay = parts[parts.length - 4] || "";
          if (barangay.toLowerCase().startsWith("brgy.")) {
            barangay = barangay.substring(5).trim();
          }
          street = parts.slice(0, parts.length - 4).join(", ");
        } else {
          street = loadedAddress;
        }

        const loaded = {
          name: data.name || "",
          birthday: data.birthday || "",
          gender: data.gender || "",
          phone: data.phone || "+63",
          address: loadedAddress,
          avatar_url: data.avatar_url || "",
          region,
          province,
          city,
          barangay,
          street: street || barangay,
        };

        if (!loaded.phone.startsWith("+63")) loaded.phone = "+63";

        setForm(loaded);
        setInitialForm(loaded);
        setAvatarPreview(loaded.avatar_url || "");
        syncAvatarToLocalStorage(loaded.avatar_url || "");

        if (region) {
          await profileAddr.loadSavedAddressSequentially(
            region,
            province,
            city,
            barangay
          );
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Error loading profile");
      }
    };

    loadProfile();

    Promise.all([
      fetch(buildApiUrl(`/api/user/${user.id}/orders`)),
      fetch(buildApiUrl(`/api/user/${user.id}/inquiries`)),
      fetch(buildApiUrl(`/api/user/${user.id}/payment-logs`)),
    ])
      .then(async ([ordersRes, inquiriesRes, paymentsRes]) => {
        const ordersData = ordersRes.ok ? await ordersRes.json() : [];
        const inquiriesData = inquiriesRes.ok
          ? await inquiriesRes.json()
          : [];
        const paymentsData = paymentsRes.ok ? await paymentsRes.json() : [];

        setStats({
          orders: Array.isArray(ordersData) ? ordersData.length : 0,
          inquiries: Array.isArray(inquiriesData) ? inquiriesData.length : 0,
          payments: Array.isArray(paymentsData) ? paymentsData.length : 0,
        });
      })
      .catch((err) => {
        console.error("Failed to load user profile statistics:", err);
      });
  }, []);

  const handleRegionChange = async (regionName) => {
    await profileAddr.handleRegionChange(regionName, (vals) => {
      setForm((prev) => ({
        ...prev,
        region: vals.region,
        province: vals.province,
        city: vals.city,
        barangay: vals.barangay,
      }));
    });
  };

  const handleProvinceChange = async (provinceName) => {
    await profileAddr.handleProvinceChange(provinceName, (vals) => {
      setForm((prev) => ({
        ...prev,
        province: vals.province,
        city: vals.city,
        barangay: vals.barangay,
      }));
    });
  };

  const handleCityChange = async (cityName) => {
    await profileAddr.handleCityChange(cityName, (vals) => {
      setForm((prev) => ({
        ...prev,
        city: vals.city,
        barangay: vals.barangay,
      }));
    });
  };

  const isDirty = useMemo(() => {
    const normalize = (v) => String(v ?? "").trim();
    const addrParts = [
      form.street,
      form.barangay && `Brgy. ${form.barangay}`,
      form.city,
      form.province && form.province !== "N/A" ? form.province : "",
      form.region,
    ].filter(Boolean);
    const formAddress = addrParts.join(", ");

    return (
      normalize(form.name) !== normalize(initialForm.name) ||
      normalize(form.birthday) !== normalize(initialForm.birthday) ||
      normalize(form.gender) !== normalize(initialForm.gender) ||
      normalize(form.phone) !== normalize(initialForm.phone) ||
      normalize(formAddress) !== normalize(initialForm.address) ||
      normalize(form.avatar_url) !== normalize(initialForm.avatar_url)
    );
  }, [form, initialForm]);

  const validate = () => {
    const name = String(form.name || "").trim();
    const phone = String(form.phone || "").trim();
    const birthday = String(form.birthday || "").trim();

    if (!name) return "Name is required.";

    const nameParts = name.split(/\s+/);
    if (nameParts.length < 2) {
      return "Please provide both first name and surname.";
    }

    if (!/^[A-Za-z.\-\s]+$/.test(name)) {
      return "Name must not contain numbers or special characters.";
    }

    if (!/^\+63\d{10}$/.test(phone)) {
      return "Phone number must be +63 followed by 10 digits.";
    }

    if (birthday) {
      const year = new Date(birthday).getFullYear();
      if (year > 2011) {
        return "Only users born in 2011 or earlier are allowed.";
      }
    }

    if (
      !form.region.trim() ||
      !form.province.trim() ||
      !form.city.trim() ||
      !form.barangay.trim() ||
      !form.street.trim()
    ) {
      return "All address fields are required.";
    }

    return "";
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!userId) {
      setError("No logged-in user found.");
      return;
    }

    if (!isDirty) {
      showToast("error", "No changes to save.");
      return;
    }

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      showToast("error", validationError);
      return;
    }

    const addrParts = [
      form.street,
      form.barangay && `Brgy. ${form.barangay}`,
      form.city,
      form.province && form.province !== "N/A" ? form.province : "",
      form.region,
    ].filter(Boolean);
    const serializedAddress = addrParts.join(", ");

    const payload = {
      name: form.name,
      birthday: form.birthday,
      gender: form.gender,
      phone: form.phone,
      address: serializedAddress,
      avatar_url: form.avatar_url,
    };

    try {
      const res = await fetch(buildApiUrl(`/api/user-profile/${userId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to update profile");
      }

      const stored = localStorage.getItem("user");
      if (stored) {
        const user = JSON.parse(stored);
        const firstName = form.name.split(" ")[0];
        localStorage.setItem(
          "user",
          JSON.stringify({ ...user, firstName })
        );
      }

      showToast("success", "Profile updated!");
      window.dispatchEvent(
        new CustomEvent("profileUpdated", {
          detail: { avatarUrl: form.avatar_url },
        })
      );
      const savedForm = {
        ...form,
        address: serializedAddress,
      };
      setInitialForm(savedForm);
      setForm(savedForm);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error updating profile");
      showToast("error", err.message || "Error updating profile");
    }
  };

  const handleAvatarClick = () => {
    if (!isEditing) return;
    const inp = document.getElementById("ucp-avatar-input");
    if (inp) inp.click();
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    setAvatarError("");
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setAvatarError("Only JPEG, PNG, WebP and GIF are allowed");
      e.target.value = "";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image must be 2MB or smaller.");
      e.target.value = "";
      return;
    }

    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(buildApiUrl("/api/user/avatar-upload"), {
        method: "POST",
        body: fd,
        headers: { "x-user-id": userId || "" },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Upload failed");

      // ONLY update preview and form state - NO SAVING TO BACKEND
      setAvatarPreview(data.url || "");
      setForm((prev) => ({ ...prev, avatar_url: data.url }));
    } catch (err) {
      console.error(err);
      setAvatarError(err.message || "Upload failed");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const handleDiscard = () => {
    setShowDiscardModal(false);
    setIsEditing(false);
    setForm(initialForm);
    setAvatarPreview(initialForm.avatar_url || ""); // Reset avatar preview to original
  };

  const handleBackOrCancel = () => {
    if (isEditing && isDirty) {
      setShowDiscardModal(true);
    } else if (isEditing && !isDirty) {
      setIsEditing(false);
      setForm(initialForm);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="ucp-adminlike-page fade-in-up">
      <div className="ucp-dashboard-layout">
        <div className="ucp-left-column">
          <div className="ucp-profile-card">
            <div className="ucp-profile-top">
              <div className="ucp-profile-avatar-wrapper">
                <div
                  className="ucp-profile-avatar"
                  onClick={handleAvatarClick}
                  role="button"
                  aria-label={isEditing ? "Change avatar" : ""}
                  style={{
                    cursor: isEditing ? "pointer" : "default",
                  }}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="avatar" />
                  ) : (
                    "👤"
                  )}

                  {isEditing && (
                    <>
                      <input
                        id="ucp-avatar-input"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        onChange={handleAvatarUpload}
                        style={{ display: "none" }}
                      />
                      <div className="ucp-avatar-overlay" aria-hidden>
                        Edit
                      </div>
                    </>
                  )}

                  {avatarUploading && (
                    <div className="ucp-avatar-loading">Uploading...</div>
                  )}
                </div>
              </div>
              <div className="ucp-profile-info">
                <h2 className="ucp-profile-name">
                  {form.name || "Your Name"}
                </h2>
                <p className="ucp-profile-role">Customer</p>
              </div>
              {!isEditing && (
                <button
                  className="ucp-edit-button"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>
              )}
            </div>

            {!isEditing ? (
              <>
                <div className="ucp-profile-details">
                  <div className="ucp-detail-row">
                    <label>Name</label>
                    <span>{form.name || "—"}</span>
                  </div>
                  <div className="ucp-detail-row">
                    <label>Birthday</label>
                    <span>{form.birthday || "—"}</span>
                  </div>
                  <div className="ucp-detail-row">
                    <label>Gender</label>
                    <span>{form.gender || "—"}</span>
                  </div>
                  <div className="ucp-detail-row">
                    <label>Phone Number</label>
                    <span>{form.phone || "—"}</span>
                  </div>
                  <div className="ucp-detail-row">
                    <label>Address</label>
                    <span>{form.address || "—"}</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="ucp-profile-form">
                  <div className="ucp-form-row">
                    <label>Name</label>
                    <input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="Enter full name"
                    />
                  </div>

                  <div className="ucp-form-row">
                    <label>Birthday</label>
                    <input
                      type="date"
                      value={form.birthday}
                      max="2011-12-31"
                      onChange={(e) =>
                        setForm({ ...form, birthday: e.target.value })
                      }
                    />
                  </div>

                  <div className="ucp-form-row">
                    <label>Gender</label>
                    <select
                      value={form.gender}
                      onChange={(e) =>
                        setForm({ ...form, gender: e.target.value })
                      }
                    >
                      <option value="">Select...</option>
                      <option>Female</option>
                      <option>Male</option>
                      <option>Prefer not to say</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div className="ucp-form-row">
                    <label>Phone Number</label>
                    <input
                      value={form.phone}
                      inputMode="numeric"
                      onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9+]/g, "");
                        if (!val.startsWith("+63")) val = "+63";
                        if (val.length > 13) return;
                        setForm({ ...form, phone: val });
                      }}
                      placeholder="+63XXXXXXXXXX"
                    />
                  </div>

                  <div className="ucp-form-row">
                    <label>Region</label>
                    <select
                      value={form.region}
                      onChange={(e) => handleRegionChange(e.target.value)}
                    >
                      <option value="">Select Region...</option>
                      {profileAddr.regions.map((r) => (
                        <option key={r.code} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ucp-form-row">
                    <label>Province</label>
                    <select
                      value={form.province}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      disabled={
                        !form.region ||
                        profileAddr.provinces.length === 0
                      }
                    >
                      {profileAddr.provinces.length === 0 ? (
                        <option value="N/A">N/A (No provinces)</option>
                      ) : (
                        <>
                          <option value="">Select Province...</option>
                          {profileAddr.provinces.map((p) => (
                            <option key={p.code} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </>
                      )}
                    </select>
                  </div>

                  <div className="ucp-form-row">
                    <label>City / Municipality</label>
                    <select
                      value={form.city}
                      onChange={(e) => handleCityChange(e.target.value)}
                      disabled={
                        !form.region ||
                        (profileAddr.provinces.length > 0 &&
                          !form.province)
                      }
                    >
                      <option value="">Select City...</option>
                      {profileAddr.cities.map((c) => (
                        <option key={c.code} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ucp-form-row">
                    <label>Barangay</label>
                    <select
                      value={form.barangay}
                      onChange={(e) =>
                        setForm({ ...form, barangay: e.target.value })
                      }
                      disabled={!form.city}
                    >
                      <option value="">Select Barangay...</option>
                      {profileAddr.barangays.map((b) => (
                        <option key={b.code} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="ucp-form-row">
                    <label>Street Address</label>
                    <input
                      value={form.street}
                      onChange={(e) =>
                        setForm({ ...form, street: e.target.value })
                      }
                      placeholder="House No., Street name, etc."
                    />
                  </div>
                </div>

                <div className="ucp-profile-actions">
                  <button
                    className="ucp-cancel-button"
                    onClick={() => {
                      if (isDirty) {
                        setShowDiscardModal(true);
                      } else {
                        setIsEditing(false);
                        setForm(initialForm);
                        setAvatarPreview(initialForm.avatar_url || "");
                      }
                    }}
                  >
                    Cancel
                  </button>
                  <button className="ucp-save-button" onClick={handleSave}>
                    Save Changes
                  </button>
                </div>
              </>
            )}

            {error && (
              <div className="ucp-message ucp-message-error">{error}</div>
            )}
            {success && (
              <div className="ucp-message ucp-message-success">
                {success}
              </div>
            )}
          </div>
        </div>

        <div className="ucp-right-column">
          <div className="ucp-stats-card">
            <h3 className="ucp-section-title">Quick Stats</h3>
            <div className="ucp-stats-grid">
              <div className="ucp-stat-item">
                <span className="ucp-stat-value">{stats.orders}</span>
                <span className="ucp-stat-label">Total Orders</span>
              </div>
              <div className="ucp-stat-item">
                <span className="ucp-stat-value">{stats.inquiries}</span>
                <span className="ucp-stat-label">Inquiries</span>
              </div>
              <div className="ucp-stat-item">
                <span className="ucp-stat-value">{stats.payments}</span>
                <span className="ucp-stat-label">Payments</span>
              </div>
            </div>
          </div>

          <div className="ucp-hub-card">
            <h3 className="ucp-section-title">Account Hub</h3>
            <div className="ucp-hub-grid">
              <div
                className="ucp-hub-item"
                onClick={() => navigate("/user-orders")}
              >
                <div className="ucp-hub-icon">
                  <FaShoppingBag />
                </div>
                <div className="ucp-hub-content">
                  <h4>My Orders</h4>
                  <p>Track your prints and active orders.</p>
                </div>
              </div>

              <div
                className="ucp-hub-item"
                onClick={() => navigate("/user-password-security")}
              >
                <div className="ucp-hub-icon">
                  <FaLock />
                </div>
                <div className="ucp-hub-content">
                  <h4>Passwords & Security</h4>
                  <p>Update your password and verify OTP.</p>
                </div>
              </div>

              <div
                className="ucp-hub-item"
                onClick={() => navigate("/user-inquiries")}
              >
                <div className="ucp-hub-icon">
                  <FaComments />
                </div>
                <div className="ucp-hub-content">
                  <h4>Inquiries</h4>
                  <p>Check answers for custom prints.</p>
                </div>
              </div>

              <div
                className="ucp-hub-item"
                onClick={() => navigate("/user-payments")}
              >
                <div className="ucp-hub-icon">
                  <FaCreditCard />
                </div>
                <div className="ucp-hub-content">
                  <h4>Payment Logs</h4>
                  <p>View transaction histories and receipts.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {toast.show && (
        <div
          className={`ucp-toast ${
            toast.type === "error"
              ? "ucp-toast-error"
              : "ucp-toast-success"
          }`}
        >
          {toast.message}
        </div>
      )}

      {showDiscardModal && (
        <div
          className="ucp-discard-overlay"
          onClick={() => setShowDiscardModal(false)}
        >
          <div
            className="ucp-discard-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="ucp-discard-title">Discard changes?</h3>
            <p className="ucp-discard-text">
              Your unsaved changes will be lost.
            </p>
            <div className="ucp-discard-actions">
              <button
                type="button"
                className="ucp-discard-cancel"
                onClick={() => setShowDiscardModal(false)}
              >
                Stay
              </button>
              <button
                type="button"
                className="ucp-discard-confirm"
                onClick={handleDiscard}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserCustomizeProfile;
