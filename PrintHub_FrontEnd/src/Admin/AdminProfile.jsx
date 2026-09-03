import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Admin-profile.css";
import { buildApiUrl } from "../config/api";
import AlertModal from "../components/AlertModal";
import { adminFetch } from "../utils/adminFetch";

function AdminProfile() {
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

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const showAlert = (msg) => {
    setAlertMessage(msg);
    setAlertOpen(true);
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

  return (
    <>
      <div className="admin-page-header">
        <h1 className="admin-page-header-title">Admin Profile</h1>
        <p className="admin-page-header-desc">
          Manage your personal information and account settings.
        </p>
      </div>

      <div className="profile-body">
        <div className="profile-avatar-col">
          <div className="profile-avatar" aria-label="Profile photo">
            {admin.avatar_url ? (
              <img src={admin.avatar_url} alt="avatar" />
            ) : (
              "AD"
            )}
          </div>
          <div className="profile-avatar-status" />
        </div>

        <div className="form-grid">
          <div className="field">
            <label>First Name</label>
            <input type="text" value={admin.firstName} disabled />
          </div>

          <div className="field">
            <label>Last Name</label>
            <input type="text" value={admin.lastName} disabled />
          </div>

          <div className="field">
            <label>Email</label>
            <input type="email" value={admin.email} disabled />
          </div>

          <div className="field">
            <label>Phone Number</label>
            <input type="text" value={admin.phone} disabled />
          </div>

          <div className="field">
            <label>Gender</label>
            <input type="text" value={admin.gender} disabled />
          </div>

          <div className="field">
            <label>Birthday</label>
            <input type="date" value={admin.birthday} disabled />
          </div>
        </div>
      </div>

      <div className="profile-card-actions">
        <button
          className="primary-action"
          onClick={() => navigate("/admin/profile/edit")}
        >
          Edit
        </button>
      </div>

      <AlertModal
        isOpen={alertOpen}
        message={alertMessage}
        onClose={() => setAlertOpen(false)}
      />
    </>
  );
}

export default AdminProfile;
