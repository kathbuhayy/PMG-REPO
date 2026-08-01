import React from "react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * Protected route for customers.
 * Redirects to /user-login if the user is not authenticated.
 */
export function ProtectedCustomerRoute({ children }) {
  const location = useLocation();

  const storedUser = (() => {
    try {
      const item = localStorage.getItem("user");
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  })();

  const role = String(storedUser?.role || "").toLowerCase();
  const isLoggedInCustomer = Boolean(
    storedUser?.id &&
      role !== "admin" &&
      role !== "staff" &&
      role !== "guest"
  );

  if (!isLoggedInCustomer) {
    return (
      <Navigate
        to="/user-login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return children;
}
