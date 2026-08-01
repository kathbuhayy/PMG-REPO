import React from "react";
import { render, screen } from "@testing-library/react";
import { ProtectedAdminRoute, AdminLoginRegisterGuard } from "./AdminGuards";

const mockNavigate = jest.fn();

// Mock react-router-dom virtually to avoid Jest ESM resolve issues
jest.mock(
  "react-router-dom",
  () => ({
    Navigate: (props) => {
      mockNavigate(props);
      return <div data-testid="mock-navigate" data-to={props.to} />;
    },
  }),
  { virtual: true }
);

describe("AdminGuards routing controls with mocked react-router-dom", () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockClear();
  });

  // Tests ProtectedAdminRoute behavior for staff/admin user
  test("ProtectedAdminRoute renders child elements if role is admin or staff", () => {
    localStorage.setItem("user", JSON.stringify({ role: "admin", id: 1 }));

    render(
      <ProtectedAdminRoute>
        <div data-testid="secret">Secret Area</div>
      </ProtectedAdminRoute>
    );

    expect(screen.getByTestId("secret")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // Tests ProtectedAdminRoute block logic for standard customer role
  test("ProtectedAdminRoute routes non-admin/staff role back to home page", () => {
    localStorage.setItem("user", JSON.stringify({ role: "customer", id: 2 }));

    render(
      <ProtectedAdminRoute>
        <div data-testid="secret">Secret Area</div>
      </ProtectedAdminRoute>
    );

    expect(screen.queryByTestId("secret")).toBeNull();
    expect(screen.getByTestId("mock-navigate")).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/", replace: true });
  });

  // Tests AdminLoginRegisterGuard redirects logged in admin
  test("AdminLoginRegisterGuard redirects admin away from auth screens", () => {
    localStorage.setItem("adminUser", JSON.stringify({ role: "admin", id: 1 }));

    render(
      <AdminLoginRegisterGuard>
        <div data-testid="form">Login Form</div>
      </AdminLoginRegisterGuard>
    );

    expect(screen.queryByTestId("form")).toBeNull();
    expect(screen.getByTestId("mock-navigate")).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/admin-dashboard",
      replace: true,
    });
  });
});

