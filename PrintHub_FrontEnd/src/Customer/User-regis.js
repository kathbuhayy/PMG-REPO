// User-registration.js (FULL UPDATED FILE — only adds modal logic + markup, no UI/layout changes)
import React, { useState } from "react";
import "./User-login.css";
import "./User-registration.css";
import { useNavigate } from "react-router-dom";
import backgroundImage from "../assets/images/pmg-image.jpg";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { buildApiUrl } from "../config/api";

function UserRegistrationPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "+63",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [criteria, setCriteria] = useState({
    uppercase: false,
    number: false,
    special: false,
    length: false,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [missingFields, setMissingFields] = useState([]);
  const navigate = useNavigate();

  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const handleNameChange = (e) => {
    const { name, value } = e.target;
    if (/^[A-Za-z\s]*$/.test(value)) {
      setFormData((prev) => ({ ...prev, [name]: value }));
      setMissingFields((prev) => prev.filter((field) => field !== name));
    }
  };

  const handlePhoneChange = (e) => {
    // keep only digits
    let digits = e.target.value.replace(/[^0-9]/g, "");

    // allow user to type 09xxxxxxxxx or 9xxxxxxxxx -> normalize to 63...
    if (digits.startsWith("09")) digits = "63" + digits.slice(1); // 09... -> 639...
    if (digits.startsWith("9")) digits = "63" + digits; // 9...  -> 639...

    // always start with 63
    if (!digits.startsWith("63")) digits = "63";

    // max: 63 + 10 digits = 12 total digits
    if (digits.length > 12) digits = digits.slice(0, 12);

    setFormData((prev) => ({ ...prev, phone: "+" + digits }));
    setMissingFields((prev) => prev.filter((field) => field !== "phone"));

    // validation: must be 639 + 9 digits  => total 12 digits and starts with 639
    if (digits.length < 12) {
      setPhoneError("Phone number must be +639 followed by 9 digits");
    } else if (!/^639\d{9}$/.test(digits)) {
      setPhoneError("Phone number must start with +639");
    } else {
      setPhoneError("");
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: type === "checkbox" ? checked : value,
    }));
    setMissingFields((prev) => prev.filter((field) => field !== name));
  };

  const handlePasswordChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, password: value }));
    setMissingFields((prev) => prev.filter((field) => field !== "password"));

    setCriteria({
      uppercase: /[A-Z]/.test(value),
      number: /\d/.test(value),
      special: /[^A-Za-z0-9]/.test(value),
      length: value.length >= 8 && value.length <= 12,
    });

    if (formData.confirmPassword && value !== formData.confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({ ...prev, confirmPassword: value }));
    setMissingFields((prev) =>
      prev.filter((field) => field !== "confirmPassword"),
    );

    if (formData.password && value !== formData.password) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setConfirmPasswordError("");
    setPhoneError("");
    setMissingFields([]);

    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      agreeTerms,
      phone,
    } = formData;

    const requiredFields = [
      ["firstName", firstName],
      ["lastName", lastName],
      ["phone", phone && phone !== "+63" ? phone : ""],
      ["email", email],
      ["password", password],
      ["confirmPassword", confirmPassword],
    ];
    const blankFields = requiredFields
      .filter(([, value]) => !String(value || "").trim())
      .map(([field]) => field);

    if (blankFields.length > 0) {
      setMissingFields(blankFields);
      setError("Please fill in all required fields");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (
      !criteria.uppercase ||
      !criteria.number ||
      !criteria.special ||
      !criteria.length
    ) {
      setError("Password does not meet all criteria");
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return;
    }

    const phoneDigits = phone.replace(/[^0-9]/g, "");
    if (!/^639\d{9}$/.test(phoneDigits)) {
      setPhoneError("Phone number must be +639 followed by 9 digits");
      return;
    }

    if (!agreeTerms) {
      setError("Please agree to the terms and conditions");
      return;
    }

    try {
      const response = await fetch(buildApiUrl("/api/register/send-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok || data.message?.includes("already registered")) {
        setError(data.message || "Failed to send OTP");
        return;
      }

      navigate("/user-otp", { state: { email: formData.email } });
      localStorage.setItem("pending_registration", JSON.stringify(formData));
    } catch (err) {
      setError("Network error, please try again later");
    }
  };

  const renderCriteria = (label, met) => (
    <p
      style={{
        color: met ? "green" : "red",
        margin: "2px 0",
        fontSize: "13px",
      }}
    >
      {met ? "✔" : "✖"} {label}
    </p>
  );

  return (
    <div className="user-login-container">

      <button
        className="back-button auth-back-button"
        onClick={() => {
          if (window.history.length > 1) navigate(-1);
          else navigate("/user-login");
        }}
        title="Go back"
      >
        ← Back
      </button>

      <div className="login-split">
        <div className="login-form-section">
          <div className="login-card registration-card">
            <div className="auth-mini-brand">
              <span>P</span>
              <strong>PrintSync</strong>
            </div>
            <div className="login-header">
              <h1>Create Account</h1>
              <p>Join PMG Printing House and start creating.</p>
            </div>

            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className={`form-group ${missingFields.includes("firstName") ? "field-missing" : ""}`}>
                  <label htmlFor="firstName">First Name</label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleNameChange}
                    aria-invalid={missingFields.includes("firstName")}
                  />
                </div>

                <div className={`form-group ${missingFields.includes("lastName") ? "field-missing" : ""}`}>
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleNameChange}
                    aria-invalid={missingFields.includes("lastName")}
                  />
                </div>
              </div>

              <div className={`form-group ${missingFields.includes("phone") ? "field-missing" : ""}`}>
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  aria-invalid={missingFields.includes("phone")}
                />
                {phoneError && (
                  <div className="error-message" style={{ marginTop: "5px" }}>
                    {phoneError}
                  </div>
                )}
              </div>



              <div className={`form-group ${missingFields.includes("email") ? "field-missing" : ""}`}>
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  aria-invalid={missingFields.includes("email")}
                />
              </div>

              <div className={`form-group ${missingFields.includes("password") ? "field-missing" : ""}`} style={{ position: "relative" }}>
                <label htmlFor="password">Password *</label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handlePasswordChange}
                  onCopy={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                  aria-invalid={missingFields.includes("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="show-password-button"
                  style={{ paddingTop: "35px" }}
                >
                  {showPassword ? (
                    <MdVisibilityOff size={22} color="#555" />
                  ) : (
                    <MdVisibility size={22} color="#555" />
                  )}
                </button>
              </div>

              {formData.password.length > 0 && (
                <div className="password-criteria">
                  {renderCriteria("At least 1 Uppercase", criteria.uppercase)}
                  {renderCriteria("At least 1 Number", criteria.number)}
                  {renderCriteria(
                    "At least 1 Special Character",
                    criteria.special,
                  )}
                  {renderCriteria("8-12 Characters", criteria.length)}
                </div>
              )}

              <div className={`form-group ${missingFields.includes("confirmPassword") ? "field-missing" : ""}`} style={{ position: "relative" }}>
                <label htmlFor="confirmPassword">Confirm Password *</label>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  onCopy={(e) => e.preventDefault()}
                  onPaste={(e) => e.preventDefault()}
                  aria-invalid={missingFields.includes("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="show-password-button"
                  style={{ paddingTop: "35px" }}
                >
                  {showConfirmPassword ? (
                    <MdVisibilityOff size={22} color="#555" />
                  ) : (
                    <MdVisibility size={22} color="#555" />
                  )}
                </button>
              </div>

              {confirmPasswordError && (
                <div className="error-message" style={{ marginTop: "5px" }}>
                  {confirmPasswordError}
                </div>
              )}

              <div className="form-agreement">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="agreeTerms"
                    checked={formData.agreeTerms}
                    onChange={handleChange}
                  />
                  <span>
                    I agree to the{" "}
                    <a
                      href="#terms"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsTermsOpen(true);
                      }}
                    >
                      Terms and Conditions
                    </a>{" "}
                    and{" "}
                    <a
                      href="#privacy"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsPrivacyOpen(true);
                      }}
                    >
                      Privacy Policy
                    </a>
                  </span>
                </label>
              </div>

              <button type="submit" className="login-button">
                Create Account
              </button>
            </form>

            <div className="login-footer">
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  className="auth-text-link"
                  onClick={() => navigate("/user-login")}
                >
                  Sign in here
                </button>
              </p>
            </div>

            {/* ===== TERMS MODAL (ADDED) ===== */}
            {isTermsOpen && (
              <div
                className="legal-modal-overlay"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) setIsTermsOpen(false);
                }}
              >
                <div
                  className="legal-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="termsTitle"
                >
                  <div className="legal-modal-header">
                    <h2 id="termsTitle">Terms & Conditions</h2>
                    <button
                      type="button"
                      className="legal-modal-close"
                      onClick={() => setIsTermsOpen(false)}
                      aria-label="Close Terms and Conditions"
                    >
                      ×
                    </button>
                  </div>

                  <div className="legal-modal-body">
                    <p>
                      <strong>Last updated:</strong> February 1, 2026
                    </p>

                    <h3>1. Acceptance of Terms</h3>
                    <p>
                      By creating an account and using PMG Printing House
                      services, you agree to follow these Terms & Conditions. If
                      you do not agree, please do not proceed with registration.
                    </p>

                    <h3>2. Account Responsibilities</h3>
                    <ul>
                      <li>
                        You are responsible for the accuracy of your information
                        (name, email, phone, address).
                      </li>
                      <li>
                        Keep your password confidential and do not share your
                        account.
                      </li>
                      <li>
                        You are responsible for activities done under your
                        account.
                      </li>
                    </ul>

                    <h3>3. Orders & Services</h3>
                    <ul>
                      <li>
                        Service availability, pricing, and processing times may
                        change without notice.
                      </li>
                      <li>
                        Final output may vary slightly depending on materials
                        and printing conditions.
                      </li>
                      <li>
                        Custom orders may require confirmation/approval before
                        production.
                      </li>
                    </ul>

                    <h3>4. Payments</h3>
                    <p>
                      Payments (if applicable) must be completed based on the
                      payment options provided. Unpaid orders may be cancelled
                      or placed on hold.
                    </p>

                    <h3>5. Prohibited Use</h3>
                    <ul>
                      <li>
                        Do not use the platform for fraudulent, abusive, or
                        illegal activities.
                      </li>
                      <li>
                        Do not attempt to access or disrupt the system or other
                        users’ data.
                      </li>
                    </ul>

                    <h3>6. Termination</h3>
                    <p>
                      We may suspend or terminate accounts that violate these
                      terms or misuse the platform.
                    </p>

                    <h3>7. Limitation of Liability</h3>
                    <p>
                      To the extent allowed by law, PMG Printing House is not
                      liable for indirect damages, loss of data, or issues
                      caused by third-party services.
                    </p>

                    <h3>8. Changes to Terms</h3>
                    <p>
                      We may update these Terms from time to time. Continued use
                      means you accept the updated Terms.
                    </p>
                  </div>

                  <div className="legal-modal-footer">
                    <button
                      type="button"
                      className="legal-modal-btn"
                      onClick={() => setIsTermsOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ===== PRIVACY MODAL (ADDED) ===== */}
            {isPrivacyOpen && (
              <div
                className="legal-modal-overlay"
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget) setIsPrivacyOpen(false);
                }}
              >
                <div
                  className="legal-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="privacyTitle"
                >
                  <div className="legal-modal-header">
                    <h2 id="privacyTitle">Privacy Policy</h2>
                    <button
                      type="button"
                      className="legal-modal-close"
                      onClick={() => setIsPrivacyOpen(false)}
                      aria-label="Close Privacy Policy"
                    >
                      ×
                    </button>
                  </div>

                  <div className="legal-modal-body">
                    <p>
                      <strong>Last updated:</strong> February 1, 2026
                    </p>

                    <h3>1. Information We Collect</h3>
                    <ul>
                      <li>Account data: name, email, phone number, address</li>
                      <li>
                        Security data: password (stored securely using hashing
                        on the server)
                      </li>
                      <li>
                        Order-related data: order history and transaction
                        details (if you place orders)
                      </li>
                    </ul>

                    <h3>2. How We Use Your Information</h3>
                    <ul>
                      <li>To create and manage your account</li>
                      <li>
                        To send OTP/verification messages and service-related
                        notices
                      </li>
                      <li>To process orders and provide customer support</li>
                      <li>To improve system security and prevent fraud</li>
                    </ul>

                    <h3>3. Sharing of Information</h3>
                    <p>
                      We do not sell your personal data. We may share limited
                      data with service providers (e.g., email/OTP services)
                      only when necessary to deliver the service.
                    </p>

                    <h3>4. Data Retention</h3>
                    <p>
                      We keep your information only as long as needed for
                      account operation, order records, and legal/security
                      purposes.
                    </p>

                    <h3>5. Security</h3>
                    <p>
                      We use reasonable safeguards to protect your data.
                      However, no system is 100% secure. Please use a strong
                      password and keep it private.
                    </p>

                    <h3>6. Your Choices</h3>
                    <ul>
                      <li>
                        You may request account updates/corrections where
                        applicable.
                      </li>
                      <li>
                        You may request account deletion subject to retention
                        requirements.
                      </li>
                    </ul>

                    <h3>7. Updates to this Policy</h3>
                    <p>
                      We may update this Privacy Policy. Continued use means you
                      accept the updated policy.
                    </p>
                  </div>

                  <div className="legal-modal-footer">
                    <button
                      type="button"
                      className="legal-modal-btn"
                      onClick={() => setIsPrivacyOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div
          className="login-image-section"
          style={{
            backgroundImage: `url(${backgroundImage})`,
          }}
        >
          <div className="auth-visual-card">
            <span>PMG PRINTING HOUSE</span>
            <h2>Print-ready solutions for every brand</h2>
            <p>
              Custom shirts, signage, paper prints, IDs, packaging, and
              commercial printing services in one dedicated portal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserRegistrationPage;
