import React from "react";
import { Navigate } from "react-router-dom";

// Protected admin route that only allows admin and staff roles
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

  if (!storedUser || (role !== "admin" && role !== "staff")) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Redirects already logged-in admin users away from admin login and registration pages
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

  if (storedUser && role === "admin") {
    return <Navigate to="/admin-dashboard" replace />;
  }

  return children;
}
