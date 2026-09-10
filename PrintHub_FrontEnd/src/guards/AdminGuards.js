//AdminGuards.js
import React from "react";
import { Navigate } from "react-router-dom";

// ============================================================
// PROTECTED ADMIN ROUTE
// Allows:
// 0 = admin
// 1 = staff
// 3 = branch_admin
// ============================================================
export function ProtectedAdminRoute({ children }) {
  const storedUser = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem("adminUser")) ||
        JSON.parse(localStorage.getItem("user")) ||
        null
      );
    } catch {
      return null;
    }
  })();

  const role = storedUser?.role || "user";

  // Admin, Staff, and Branch Admin can access the admin dashboard
  if (
    !storedUser ||
    !["admin", "staff", "branch_admin"].includes(role)
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// ============================================================
// ADMIN LOGIN / REGISTRATION GUARD
// If already logged in as ANY admin-side role,
// don't allow them to open the login/register pages.
// ============================================================
export function AdminLoginRegisterGuard({ children }) {
  const storedUser = (() => {
    try {
      return (
        JSON.parse(localStorage.getItem("adminUser")) ||
        JSON.parse(localStorage.getItem("user")) ||
        null
      );
    } catch {
      return null;
    }
  })();

  const role = storedUser?.role || "user";

  // Admin, Staff, and Branch Admin are already logged in
  if (
    storedUser &&
    ["admin", "staff", "branch_admin"].includes(role)
  ) {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return children;
}