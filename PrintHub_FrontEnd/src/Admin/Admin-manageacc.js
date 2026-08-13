import React, { useMemo, useState, useEffect, useCallback } from "react";
import "./Admin-manageacc.css";
import {
  FaEdit,
  FaTrash,
  FaSearch,
  FaPlus,
  FaTimes,
  FaInfoCircle,
  FaTrashRestore
} from "react-icons/fa";
import { buildApiUrl } from "../config/api";

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last =
    parts.length > 1 ? parts[parts.length - 1][0] : parts[0]?.[1] || "";
  return (first + last).toUpperCase();
}

function formatDateOnly(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function AdminManageAccounts() {
  const [users, setUsers] = useState([]);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [showRecycleBin, setShowRecycleBin] = useState(false);
  const [archivedUsers, setArchivedUsers] = useState([]);
  const [archivedSearch, setArchivedSearch] = useState("");
  const [confirmRestoreUser, setConfirmRestoreUser] = useState(null);
  const [confirmPermDeleteUser, setConfirmPermDeleteUser] = useState(null);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [pendingAction, setPendingAction] = useState(null);
  const [verifyingPassword, setVerifyingPassword] = useState(false);

  // selected user for edit/delete
  const [selectedUser, setSelectedUser] = useState(null);
  const [toast, setToast] = useState({ message: "", type: "" });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: "", type: "" });
    }, 3000);
  };

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "customer",
    status: "active",
    password: "",
  });

  // get currently logged-in user (admin)
  const currentUser = useMemo(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("adminUser")) ||
        JSON.parse(localStorage.getItem("user")) ||
        null
      );
    } catch {
      return null;
    }
  }, []);

  const requestPasswordConfirm = (actionFn) => {
    setPendingAction(() => actionFn);
    setPasswordInput("");
    setPasswordError("");
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    if (verifyingPassword) return;
    setShowPasswordModal(false);
    setPendingAction(null);
    setPasswordInput("");
    setPasswordError("");
  };

  const submitPasswordConfirm = async (e) => {
    e.preventDefault();

    if (!passwordInput.trim()) {
      setPasswordError("Password is required");
      return;
    }
    if (!currentUser?.id && !currentUser?.email) {
      setPasswordError("No active admin session found. Please log in again.");
      return;
    }

    setVerifyingPassword(true);
    try {
      const res = await fetch(buildApiUrl("/api/admin/verify-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser?.id,
          email: currentUser?.email,
          password: passwordInput,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data?.message || "Incorrect password");
        setVerifyingPassword(false);
        return;
      }

      const action = pendingAction;
      setShowPasswordModal(false);
      setPendingAction(null);
      setPasswordInput("");
      setPasswordError("");
      setVerifyingPassword(false);

      if (action) await action();
    } catch (err) {
      console.error(err);
      setPasswordError("Verification failed. Please try again.");
      setVerifyingPassword(false);
    }
  };

  // Fetches the list of all users from the admin API endpoint
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl("/api/admin/users"));
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to fetch users");
      }
      setUsers(data);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Error fetching users", "error");
    }
  }, []);

  const fetchArchivedUsers = useCallback(async () => {
  try {
    const res = await fetch(buildApiUrl("/api/admin/archived-users"));
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Failed to fetch archived users");
    setArchivedUsers(data);
  } catch (err) {
    console.error(err);
    showToast(err.message || "Error fetching recycle bin", "error");
  }
}, []);

const openRecycleBin = () => {
  fetchArchivedUsers();
  setShowRecycleBin(true);
};
const closeRecycleBin = () => setShowRecycleBin(false);

const filteredArchivedUsers = useMemo(() => {
  const q = archivedSearch.trim().toLowerCase();
  if (!q) return archivedUsers;
  return archivedUsers.filter(
    (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
  );
}, [archivedUsers, archivedSearch]);

const restoreUser = async (u) => {
  try {
    const res = await fetch(buildApiUrl(`/api/admin/archived-users/${u.id}/restore`), {
      method: "POST",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Restore failed");

    showToast(`${u.name} restored successfully!`, "success");
    setConfirmRestoreUser(null);
    await fetchArchivedUsers();
    await fetchUsers();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Error restoring user", "error");
  }
};

const permanentlyDeleteUser = async (u) => {
  try {
    const res = await fetch(buildApiUrl(`/api/admin/archived-users/${u.id}`), {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Delete failed");

    showToast(`${u.name} permanently deleted.`, "success");
    setConfirmPermDeleteUser(null);
    await fetchArchivedUsers();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Error deleting user", "error");
  }
};

  // Fetch users from db on mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === "active").length;
    const admins = users.filter((u) => u.role === "admin").length;
    const suspended = users.filter((u) => u.status === "suspended").length;
    return { total, active, admins, suspended };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return users.filter((u) => {
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);

      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus = statusFilter === "all" || u.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  // open modal
  const handleAddUser = () => {
    setForm({
      name: "",
      email: "",
      role: "customer",
      status: "active",
      password: "",
    });
    setShowAddModal(true);
  };
  // ✅ check if row user is the currently logged-in admin
  const isSelf = (u) => {
    if (!u || !currentUser) return false;

    // best check: ID
    if (currentUser.id != null && u.id != null) {
      return String(u.id) === String(currentUser.id);
    }

    // fallback: email
    if (currentUser.email && u.email) {
      return currentUser.email.toLowerCase() === u.email.toLowerCase();
    }

    return false;
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      role: (user.role || "customer").toLowerCase(),
      status: (user.status || "active").toLowerCase(),
      password: "",
    });
    setShowEditModal(true);
  };

  const handleDelete = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  // sumbit modal
  const submitAdd = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      showToast("Name is required", "error");
      return;
    }
    if (!form.email.trim()) {
      showToast("Email is required", "error");
      return;
    }
    if (!form.password.trim()) {
      showToast("Temporary password is required", "error");
      return;
    }

    try {
      const res = await fetch(buildApiUrl("/api/admin/users"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          role: form.role,
          status: form.status,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to add user");

      setShowAddModal(false);
      showToast("User added successfully!", "success");
      await fetchUsers();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Error adding user", "error");
    }
  };

  const performEditSubmit = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch(
        buildApiUrl(`/api/admin/users/${selectedUser.id}`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            role: form.role,
            status: form.status,
          }),
        },
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data?.message || data?.error?.sqlMessage || "Database update error",
        );
      }

      setShowEditModal(false);
      setSelectedUser(null);
      showToast("User updated successfully!", "success");
      await fetchUsers();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Error updating user", "error");
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (!form.name.trim()) {
      showToast("Name is required", "error");
      return;
    }
    if (!form.email.trim()) {
      showToast("Email is required", "error");
      return;
    }

    const roleChanged =
      (selectedUser.role || "").toLowerCase() !== form.role.toLowerCase();

    if (roleChanged) {
      requestPasswordConfirm(performEditSubmit);
    } else {
      await performEditSubmit();
    }
  };

  const confirmDelete = async () => {
    if (!selectedUser) return;

    try {
      const res = await fetch(
        buildApiUrl(`/api/admin/users/${selectedUser.id}`),
        { method: "DELETE" },
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to delete user");

      setShowDeleteModal(false);
      setSelectedUser(null);
      showToast("User deleted successfully!", "success");
      await fetchUsers();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Error deleting user", "error");
    }
  };

  // close modal
  const closeAdd = () => setShowAddModal(false);
  const closeEdit = () => {
    setShowEditModal(false);
    setSelectedUser(null);
  };
  const closeDelete = () => {
    setShowDeleteModal(false);
    setSelectedUser(null);
  };

  return (
    <div className="manageacc">
      {toast.message && (
        <div className={`app-toast-container ${toast.type}`}>
          <FaInfoCircle />
          <span>{toast.message}</span>
        </div>
      )}
      {/* top row */}
      <div className="manageacc-top">
        <div>
          <p className="manageacc-subtitle">
            Control user access and permissions
          </p>
        </div>

        <div className="manageacc-top-actions">
          <button
            className="manageacc-recyclebin-btn"
            type="button"
            onClick={openRecycleBin}
          >
            <FaTrashRestore size={14} />
            Recycle Bin{archivedUsers.length > 0 ? ` (${archivedUsers.length})` : ""}
          </button>

          <button
            className="manageacc-add-btn"
            type="button"
            onClick={handleAddUser}
          >
            <span className="manageacc-plus">
              <FaPlus size={14} />
            </span>
            Add User
          </button>
        </div>
      </div>

      {/* stat cards */}
      <div className="manageacc-stats">
        <div className="manageacc-stat-card">
          <div className="manageacc-stat-label">Total Users</div>
          <div className="manageacc-stat-value">{stats.total}</div>
        </div>

        <div className="manageacc-stat-card">
          <div className="manageacc-stat-label">Active Users</div>
          <div className="manageacc-stat-value green">{stats.active}</div>
        </div>

        <div className="manageacc-stat-card">
          <div className="manageacc-stat-label">Administrators</div>
          <div className="manageacc-stat-value purple">{stats.admins}</div>
        </div>

        <div className="manageacc-stat-card">
          <div className="manageacc-stat-label">Suspended</div>
          <div className="manageacc-stat-value red">{stats.suspended}</div>
        </div>
      </div>

      {/* toolbar */}
      <div className="manageacc-toolbar">
        <div className="manageacc-search">
          <span className="manageacc-search-icon">
            <FaSearch size={14} />
          </span>

          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="manageacc-filters">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
            <option value="customer">Customer</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* table */}
      <div className="manageacc-table-card">
        <table className="manageacc-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Join Date</th>
              <th className="manageacc-actions-col">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td>
                  <div className="manageacc-usercell">
                    <div className="manageacc-avatar">
                      {getInitials(u.name)}
                    </div>
                    <div className="manageacc-usertext">
                      <div className="manageacc-name">{u.name}</div>
                      <div className="manageacc-email">{u.email}</div>
                    </div>
                  </div>
                </td>

                <td>
                  <span className={`manageacc-pill role-${u.role}`}>
                    {u.role}
                  </span>
                </td>

                <td>
                  <span className={`manageacc-pill status-${u.status}`}>
                    {u.status}
                  </span>
                </td>

                {/* ✅ CHANGED: date only */}
                <td>{formatDateOnly(u.lastLogin)}</td>

                {/* ✅ CHANGED: show join date */}
                <td>{formatDateOnly(u.joinDate)}</td>

                <td className="manageacc-actions-col">
                  <div className="manageacc-actions">
                    <button
                      type="button"
                      className="manageacc-btn-edit"
                      onClick={() => handleEdit(u)}
                      title="Edit user"
                    >
                      <FaEdit size={12} />
                      Edit
                    </button>
                    <button
                      type="button"
                      className={`manageacc-btn-delete ${
                        isSelf(u) ? "disabled" : ""
                      }`}
                      title={
                        isSelf(u)
                          ? "You can't delete your own account"
                          : "Delete"
                      }
                      onClick={() => !isSelf(u) && handleDelete(u)}
                      disabled={isSelf(u)}
                    >
                      <FaTrash size={12} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="6" className="manageacc-empty">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* add modal */}
      {showAddModal && (
        <div className="manageacc-modal-overlay" onMouseDown={closeAdd}>
          <div
            className="manageacc-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="manageacc-modal-header">
              <h3>Add User</h3>
              <button
                className="manageacc-modal-close"
                onClick={closeAdd}
                type="button"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={submitAdd} className="manageacc-modal-body">
              <div className="manageacc-modal-grid">
                <div className="manageacc-field">
                  <label>Full Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>

                <div className="manageacc-field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="Enter email"
                  />
                </div>

                <div className="manageacc-field">
                  <label>Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="admin">admin</option>
                    <option value="staff">staff</option>
                    <option value="customer">customer</option>
                  </select>
                </div>

                <div className="manageacc-field">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="suspended">suspended</option>
                  </select>
                </div>

                <div className="manageacc-field manageacc-field-full">
                  <label>Temporary Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    placeholder="Enter temporary password"
                  />
                </div>
              </div>

              <div className="manageacc-modal-actions">
                <button
                  type="button"
                  className="manageacc-btn ghost"
                  onClick={closeAdd}
                >
                  Cancel
                </button>
                <button type="submit" className="manageacc-btn primary">
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* edit modal */}
      {showEditModal && (
        <div className="manageacc-modal-overlay" onMouseDown={closeEdit}>
          <div
            className="manageacc-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="manageacc-modal-header">
              <h3>Edit User</h3>
              <button
                className="manageacc-modal-close"
                onClick={closeEdit}
                type="button"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={submitEdit} className="manageacc-modal-body">
              <div className="manageacc-modal-grid">
                <div className="manageacc-field">
                  <label>Full Name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>

                <div className="manageacc-field">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) =>
                      setForm({ ...form, email: e.target.value })
                    }
                    placeholder="Enter email"
                  />
                </div>

                <div className="manageacc-field">
                  <label>Role</label>
                  <select
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="admin">admin</option>
                    <option value="staff">staff</option>
                    <option value="customer">customer</option>
                  </select>
                </div>

                <div className="manageacc-field">
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({ ...form, status: e.target.value })
                    }
                  >
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="suspended">suspended</option>
                  </select>
                </div>
              </div>

              <div className="manageacc-modal-actions">
                <button
                  type="button"
                  className="manageacc-btn ghost"
                  onClick={closeEdit}
                >
                  Cancel
                </button>
                <button type="submit" className="manageacc-btn primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* delete modal */}
      {showDeleteModal && (
        <div className="manageacc-modal-overlay" onMouseDown={closeDelete}>
          <div
            className="manageacc-modal small"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="manageacc-modal-header">
              <h3>Delete User</h3>
              <button
                className="manageacc-modal-close"
                onClick={closeDelete}
                type="button"
              >
                <FaTimes />
              </button>
            </div>

            <div className="manageacc-modal-body">
              <p className="manageacc-delete-text">
                Are you sure you want to delete{" "}
                <strong>{selectedUser?.name}</strong>?
              </p>

              <div className="manageacc-modal-actions">
                <button
                  type="button"
                  className="manageacc-btn ghost"
                  onClick={closeDelete}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="manageacc-btn danger"
                  onClick={() => requestPasswordConfirm(confirmDelete)}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRecycleBin && (
        <div className="manageacc-modal-overlay" onMouseDown={closeRecycleBin}>
          <div className="manageacc-modal large" onMouseDown={(e) => e.stopPropagation()}>
            <div className="manageacc-modal-header">
              <h3>Recycle Bin — Archived Accounts</h3>
              <button className="manageacc-modal-close" onClick={closeRecycleBin} type="button">
                <FaTimes />
              </button>
            </div>

            <div className="manageacc-modal-body">
              <div className="manageacc-search" style={{ marginBottom: "12px" }}>
                <span className="manageacc-search-icon"><FaSearch size={14} /></span>
                <input
                  type="text"
                  placeholder="Search archived accounts..."
                  value={archivedSearch}
                  onChange={(e) => setArchivedSearch(e.target.value)}
                />
              </div>

              <table className="manageacc-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Archived On</th>
                    <th className="manageacc-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredArchivedUsers.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="manageacc-usercell">
                          <div className="manageacc-avatar">{getInitials(u.name)}</div>
                          <div className="manageacc-usertext">
                            <div className="manageacc-name">{u.name}</div>
                            <div className="manageacc-email">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className={`manageacc-pill role-${u.role}`}>{u.role}</span></td>
                      <td>{formatDateOnly(u.archivedAt)}</td>
                      <td className="manageacc-actions-col">
                        <div className="manageacc-actions">
                          <button
                            type="button"
                            className="manageacc-btn-edit"
                            onClick={() => setConfirmRestoreUser(u)}
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            className="manageacc-btn-delete"
                            onClick={() => setConfirmPermDeleteUser(u)}
                          >
                            <FaTrash size={12} />
                            Delete Forever
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredArchivedUsers.length === 0 && (
                    <tr>
                      <td colSpan="4" className="manageacc-empty">Recycle bin is empty.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* restore confirmation */}
      {confirmRestoreUser && (
        <div className="manageacc-modal-overlay" onMouseDown={() => setConfirmRestoreUser(null)}>
          <div className="manageacc-modal small" onMouseDown={(e) => e.stopPropagation()}>
            <div className="manageacc-modal-header">
              <h3>Restore Account</h3>
              <button className="manageacc-modal-close" onClick={() => setConfirmRestoreUser(null)} type="button">
                <FaTimes />
              </button>
            </div>
            <div className="manageacc-modal-body">
              <p className="manageacc-delete-text">
                Restore <strong>{confirmRestoreUser.name}</strong>'s account? They'll be able to log in again immediately.
              </p>
              <div className="manageacc-modal-actions">
                <button type="button" className="manageacc-btn ghost" onClick={() => setConfirmRestoreUser(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="manageacc-btn primary"
                  onClick={() => requestPasswordConfirm(() => restoreUser(confirmRestoreUser))}
                >
                  Restore
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* permanent delete confirmation */}
      {confirmPermDeleteUser && (
        <div className="manageacc-modal-overlay" onMouseDown={() => setConfirmPermDeleteUser(null)}>
          <div className="manageacc-modal small" onMouseDown={(e) => e.stopPropagation()}>
            <div className="manageacc-modal-header">
              <h3>Permanently Delete</h3>
              <button className="manageacc-modal-close" onClick={() => setConfirmPermDeleteUser(null)} type="button">
                <FaTimes />
              </button>
            </div>
            <div className="manageacc-modal-body">
              <p className="manageacc-delete-text">
                This will <strong>permanently</strong> delete <strong>{confirmPermDeleteUser.name}</strong>'s
                account and cannot be undone.
              </p>
              <div className="manageacc-modal-actions">
                <button type="button" className="manageacc-btn ghost" onClick={() => setConfirmPermDeleteUser(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="manageacc-btn danger"
                  onClick={() => requestPasswordConfirm(() => permanentlyDeleteUser(confirmPermDeleteUser))}
                >
                  Permanent Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="manageacc-modal-overlay" onMouseDown={closePasswordModal}>
          <div className="manageacc-modal small" onMouseDown={(e) => e.stopPropagation()}>
            <div className="manageacc-modal-header">
              <h3>Confirm Your Password</h3>
              <button
                className="manageacc-modal-close"
                onClick={closePasswordModal}
                type="button"
                disabled={verifyingPassword}
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={submitPasswordConfirm} className="manageacc-modal-body">
              <p className="manageacc-delete-text" style={{ marginBottom: "16px" }}>
                For security, please re-enter your password to continue.
              </p>

              <div className="manageacc-field">
                <label>Password</label>
                <input
                  type="password"
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (passwordError) setPasswordError("");
                  }}
                  placeholder="Enter your password"
                />
              </div>

              {passwordError && (
                <p className="manageacc-password-error">{passwordError}</p>
              )}

              <div className="manageacc-modal-actions">
                <button
                  type="button"
                  className="manageacc-btn ghost"
                  onClick={closePasswordModal}
                  disabled={verifyingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="manageacc-btn primary"
                  disabled={verifyingPassword}
                >
                  {verifyingPassword ? "Verifying..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminManageAccounts;
