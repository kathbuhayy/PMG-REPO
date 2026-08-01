import React, { useState } from "react";
import "./Admin-login.css";
import { useNavigate } from "react-router-dom";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import backgroundImage from "../assets/images/pmg-image.jpg";
import { buildApiUrl } from "../config/api";

function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(buildApiUrl("/api/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }

      const role = String(data.user?.role || "").toLowerCase();
      if (role !== "admin" && role !== "staff") {
        setError("Access denied. Admin credentials required.");
        setLoading(false);
        return;
      }

      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.setItem("adminUser", JSON.stringify(data.user));
      navigate("/admin-dashboard");
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <button
        className="back-button"
        onClick={() => navigate(-1)}
        title="Go back"
      >
        ← Back
      </button>

      <div className="login-split">
        <div className="login-form-section">
          <div className="login-card">
            <div className="auth-mini-brand">
              <span>P</span>
              <strong>PrintHub Admin</strong>
            </div>

            <div className="login-header">
              <h1>Welcome Back!</h1>
              <p>Sign in to access control panel</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  placeholder="admin@printhub.com"
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    placeholder="••••••••"
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingRight: "48px" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="show-password-button"
                  >
                    {showPassword ? (
                      <MdVisibilityOff size={20} />
                    ) : (
                      <MdVisibility size={20} />
                    )}
                  </button>
                </div>
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </button>
            </form>
          </div>
        </div>

        <div
          className="login-image-section"
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="auth-visual-card">
            <span>PMG PRINT HOUSE</span>
            <h2>Administration Control</h2>
            <p>
              Manage orders, inquiries, product inventory, and customer assets
              in a consolidated admin dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLoginPage;
