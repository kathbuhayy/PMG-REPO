import React, { useState } from "react";
import "./User-login.css";
import "./User-registration.css";
import { useNavigate } from "react-router-dom";
import { MdVisibility, MdVisibilityOff } from "react-icons/md";
import { buildApiUrl } from "../config/api";
import pmgLogo from "../assets/brand/pmg-logo-nav.png";

function UserRegistrationPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "+63",
    city: "",
    address: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [criteria, setCriteria] = useState({
    uppercase: false,
    number: false,
    special: false,
    length: false,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [confirmPasswordError, setConfirmPasswordError] =
    useState("");

  const [phoneError, setPhoneError] =
    useState("");

  const [missingFields, setMissingFields] =
    useState([]);

  const [isTermsOpen, setIsTermsOpen] =
    useState(false);

  const [isPrivacyOpen, setIsPrivacyOpen] =
    useState(false);

  const handleNameChange = (e) => {
    const { name, value } = e.target;

    if (/^[A-Za-z\s]*$/.test(value)) {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      setMissingFields((prev) =>
        prev.filter(
          (field) => field !== name
        )
      );
    }
  };

  const handlePhoneChange = (e) => {
    let digits = e.target.value.replace(
      /[^0-9]/g,
      ""
    );

    if (digits.startsWith("09")) {
      digits = "63" + digits.slice(1);
    }

    if (
      digits.startsWith("9") &&
      !digits.startsWith("63")
    ) {
      digits = "63" + digits;
    }

    if (!digits.startsWith("63")) {
      digits = "63";
    }

    if (digits.length > 12) {
      digits = digits.slice(0, 12);
    }

    setFormData((prev) => ({
      ...prev,
      phone: "+" + digits,
    }));

    setMissingFields((prev) =>
      prev.filter(
        (field) => field !== "phone"
      )
    );

    if (digits.length < 12) {
      setPhoneError(
        "Phone number must be +639 followed by 9 digits"
      );
    } else if (!/^639\d{9}$/.test(digits)) {
      setPhoneError(
        "Phone number must start with +639"
      );
    } else {
      setPhoneError("");
    }
  };

  const handleChange = (e) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setFormData((prevState) => ({
      ...prevState,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));

    setMissingFields((prev) =>
      prev.filter(
        (field) => field !== name
      )
    );
  };

  const handlePasswordChange = (e) => {
    const { value } = e.target;

    setFormData((prev) => ({
      ...prev,
      password: value,
    }));

    setMissingFields((prev) =>
      prev.filter(
        (field) => field !== "password"
      )
    );

    setCriteria({
      uppercase: /[A-Z]/.test(value),
      number: /\d/.test(value),
      special: /[^A-Za-z0-9]/.test(value),
      length:
        value.length >= 8 &&
        value.length <= 12,
    });

    if (
      formData.confirmPassword &&
      value !== formData.confirmPassword
    ) {
      setConfirmPasswordError(
        "Passwords do not match"
      );
    } else {
      setConfirmPasswordError("");
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const { value } = e.target;

    setFormData((prev) => ({
      ...prev,
      confirmPassword: value,
    }));

    setMissingFields((prev) =>
      prev.filter(
        (field) =>
          field !== "confirmPassword"
      )
    );

    if (
      formData.password &&
      value !== formData.password
    ) {
      setConfirmPasswordError(
        "Passwords do not match"
      );
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
      phone,
      city,
      address,
      email,
      password,
      confirmPassword,
      agreeTerms,
    } = formData;

    const requiredFields = [
      ["firstName", firstName],
      ["lastName", lastName],
      [
        "phone",
        phone && phone !== "+63"
          ? phone
          : "",
      ],
      ["city", city],
      ["address", address],
      ["email", email],
      ["password", password],
      [
        "confirmPassword",
        confirmPassword,
      ],
    ];

    const blankFields = requiredFields
      .filter(
        ([, value]) =>
          !String(value || "").trim()
      )
      .map(([field]) => field);

    if (blankFields.length > 0) {
      setMissingFields(blankFields);
      setError(
        "Please fill in all required fields"
      );
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError(
        "Please enter a valid email address"
      );
      return;
    }

    if (
      !criteria.uppercase ||
      !criteria.number ||
      !criteria.special ||
      !criteria.length
    ) {
      setError(
        "Password does not meet all criteria"
      );
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError(
        "Passwords do not match"
      );
      return;
    }

    const phoneDigits = phone.replace(
      /[^0-9]/g,
      ""
    );

    if (!/^639\d{9}$/.test(phoneDigits)) {
      setPhoneError(
        "Phone number must be +639 followed by 9 digits"
      );
      return;
    }

    if (!agreeTerms) {
      setError(
        "Please agree to the terms and conditions"
      );
      return;
    }

    try {
      const response = await fetch(
        buildApiUrl(
          "/api/register/send-otp"
        ),
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        data.message?.includes(
          "already registered"
        )
      ) {
        setError(
          data.message ||
            "Failed to send OTP"
        );
        return;
      }

      localStorage.setItem(
        "pending_registration",
        JSON.stringify(formData)
      );

      navigate("/user-otp", {
        state: {
          email: formData.email,
        },
      });
    } catch (err) {
      console.error(
        "[Registration] {ApiCall}: " +
          err.message
      );

      setError(
        "Network error, please try again later"
      );
    }
  };

  const renderCriteria = (label, met) => (
    <p
      className={
        met
          ? "criteria-met"
          : "criteria-unmet"
      }
    >
      <span>
        {met ? "✓" : "○"}
      </span>
      {label}
    </p>
  );

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/user-login");
    }
  };

  return (
    <div className="user-login-container registration-page">
      {/* Decorative background */}
      <div className="auth-decoration auth-decoration-one" />
      <div className="auth-decoration auth-decoration-two" />
      <div className="auth-dots auth-dots-one" />
      <div className="auth-dots auth-dots-two" />

      <button
        className="back-button auth-back-button"
        onClick={handleBack}
      >
        <span>←</span>
        Back
      </button>

      <main className="auth-page registration-auth-page">

        {/* =====================================================
            PMG LOGO
            ===================================================== */}
        <div className="auth-brand">
          <img
            src={pmgLogo}
            alt="PMG Printing House"
            className="auth-brand-logo"
            style={{
              width: "180px",
              height: "auto",
              maxHeight: "70px",
              objectFit: "contain",
            }}
          />
        </div>

        <div className="login-card registration-card">
          <div className="auth-card-accent" />

          <div className="login-header">
            <div className="auth-eyebrow">
              CUSTOMER REGISTRATION
            </div>

            <h1>
              Create <span>Account</span>
            </h1>

            <p>
              Join PMG Printing House and
              start creating.
            </p>
          </div>

          {error && (
            <div className="error-message">
              <span className="message-icon">
                !
              </span>

              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="success-message">
              <span>✓</span>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* =================================================
                FIRST + LAST NAME
                ================================================= */}
            <div className="form-row">
              <div
                className={`form-group ${
                  missingFields.includes(
                    "firstName"
                  )
                    ? "field-missing"
                    : ""
                }`}
              >
                <label htmlFor="firstName">
                  First Name
                </label>

                <div className="auth-input-wrapper">
                  <span className="input-icon">
                    ◇
                  </span>

                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={
                      handleNameChange
                    }
                    placeholder="Enter first name"
                    autoComplete="given-name"
                  />
                </div>
              </div>

              <div
                className={`form-group ${
                  missingFields.includes(
                    "lastName"
                  )
                    ? "field-missing"
                    : ""
                }`}
              >
                <label htmlFor="lastName">
                  Last Name
                </label>

                <div className="auth-input-wrapper">
                  <span className="input-icon">
                    ◇
                  </span>

                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={
                      handleNameChange
                    }
                    placeholder="Enter last name"
                    autoComplete="family-name"
                  />
                </div>
              </div>
            </div>

            {/* =================================================
                PHONE + CITY
                ================================================= */}
            <div className="form-row">
              <div
                className={`form-group ${
                  missingFields.includes(
                    "phone"
                  )
                    ? "field-missing"
                    : ""
                }`}
              >
                <label htmlFor="phone">
                  Phone Number
                </label>

                <div className="auth-input-wrapper">
                  <span className="input-icon">
                    ☎
                  </span>

                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={
                      handlePhoneChange
                    }
                    placeholder="+63 9XX XXX XXXX"
                    autoComplete="tel"
                  />
                </div>

                {phoneError && (
                  <div className="inline-error">
                    {phoneError}
                  </div>
                )}
              </div>

              <div
                className={`form-group ${
                  missingFields.includes(
                    "city"
                  )
                    ? "field-missing"
                    : ""
                }`}
              >
                <label htmlFor="city">
                  City / Municipality
                </label>

                <div className="auth-input-wrapper select-wrapper">
                  <span className="input-icon">
                    ◉
                  </span>

                  <select
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                  >
                    <option value="">
                      Select your city
                    </option>

                    <option value="Manila">
                      Manila
                    </option>

                    <option value="Quezon City">
                      Quezon City
                    </option>

                    <option value="Caloocan">
                      Caloocan
                    </option>

                    <option value="Pasig">
                      Pasig
                    </option>

                    <option value="Makati">
                      Makati
                    </option>

                    <option value="Taguig">
                      Taguig
                    </option>

                    <option value="Marikina">
                      Marikina
                    </option>

                    <option value="Parañaque">
                      Parañaque
                    </option>

                    <option value="Las Piñas">
                      Las Piñas
                    </option>

                    <option value="Muntinlupa">
                      Muntinlupa
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>

                  <span className="select-arrow">
                    ▼
                  </span>
                </div>
              </div>
            </div>

            {/* =================================================
                ADDRESS
                ================================================= */}
            <div
              className={`form-group ${
                missingFields.includes(
                  "address"
                )
                  ? "field-missing"
                  : ""
              }`}
            >
              <label htmlFor="address">
                Address
              </label>

              <div className="auth-input-wrapper">
                <span className="input-icon">
                  ⌂
                </span>

                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Enter your complete address"
                  autoComplete="street-address"
                />
              </div>
            </div>

            {/* =================================================
                EMAIL
                ================================================= */}
            <div
              className={`form-group ${
                missingFields.includes(
                  "email"
                )
                  ? "field-missing"
                  : ""
              }`}
            >
              <label htmlFor="email">
                Email Address
              </label>

              <div className="auth-input-wrapper">
                <span className="input-icon">
                  @
                </span>

                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* =================================================
                PASSWORD
                ================================================= */}
            <div
              className={`form-group ${
                missingFields.includes(
                  "password"
                )
                  ? "field-missing"
                  : ""
              }`}
            >
              <label htmlFor="password">
                Password
              </label>

              <div className="auth-input-wrapper">
                <span className="input-icon lock-icon">
                  ●
                </span>

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={
                    handlePasswordChange
                  }
                  placeholder="Create a password"
                  autoComplete="new-password"
                  onCopy={(e) =>
                    e.preventDefault()
                  }
                  onPaste={(e) =>
                    e.preventDefault()
                  }
                />

                <button
                  type="button"
                  className="show-password-button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                >
                  {showPassword ? (
                    <MdVisibilityOff size={21} />
                  ) : (
                    <MdVisibility size={21} />
                  )}
                </button>
              </div>
            </div>

            {/* =================================================
                PASSWORD CRITERIA
                ================================================= */}
            {formData.password.length > 0 && (
              <div className="password-criteria">
                <div className="criteria-title">
                  Password requirements
                </div>

                <div className="criteria-grid">
                  {renderCriteria(
                    "At least 1 uppercase",
                    criteria.uppercase
                  )}

                  {renderCriteria(
                    "At least 1 number",
                    criteria.number
                  )}

                  {renderCriteria(
                    "At least 1 special character",
                    criteria.special
                  )}

                  {renderCriteria(
                    "8–12 characters",
                    criteria.length
                  )}
                </div>
              </div>
            )}

            {/* =================================================
                CONFIRM PASSWORD
                ================================================= */}
            <div
              className={`form-group ${
                missingFields.includes(
                  "confirmPassword"
                )
                  ? "field-missing"
                  : ""
              }`}
            >
              <label htmlFor="confirmPassword">
                Confirm Password
              </label>

              <div className="auth-input-wrapper">
                <span className="input-icon lock-icon">
                  ●
                </span>

                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  id="confirmPassword"
                  name="confirmPassword"
                  value={
                    formData.confirmPassword
                  }
                  onChange={
                    handleConfirmPasswordChange
                  }
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  onCopy={(e) =>
                    e.preventDefault()
                  }
                  onPaste={(e) =>
                    e.preventDefault()
                  }
                />

                <button
                  type="button"
                  className="show-password-button"
                  onClick={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                >
                  {showConfirmPassword ? (
                    <MdVisibilityOff size={21} />
                  ) : (
                    <MdVisibility size={21} />
                  )}
                </button>
              </div>

              {confirmPasswordError && (
                <div className="inline-error">
                  {confirmPasswordError}
                </div>
              )}
            </div>

            {/* =================================================
                TERMS
                ================================================= */}
            <div className="form-agreement">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={
                    formData.agreeTerms
                  }
                  onChange={handleChange}
                />

                <span className="custom-checkbox" />

                <span>
                  I agree to the{" "}
                  <button
                    type="button"
                    className="legal-link"
                    onClick={() =>
                      setIsTermsOpen(true)
                    }
                  >
                    Terms and Conditions
                  </button>{" "}
                  and{" "}
                  <button
                    type="button"
                    className="legal-link"
                    onClick={() =>
                      setIsPrivacyOpen(true)
                    }
                  >
                    Privacy Policy
                  </button>
                </span>
              </label>
            </div>

            {/* =================================================
                CREATE ACCOUNT BUTTON
                ================================================= */}
            <button
              type="submit"
              className="login-button"
            >
              <span>Create Account</span>

              <span className="button-arrow">
                →
              </span>
            </button>
          </form>

          {/* =================================================
              FOOTER
              ================================================= */}
          <div className="login-footer">
            <span>
              Already have an account?
            </span>

            <button
              type="button"
              className="auth-text-link"
              onClick={() =>
                navigate("/user-login")
              }
            >
              Sign in here
            </button>
          </div>
        </div>

        <div className="auth-bottom-note">
          <span className="lime-dot" />
          PRINT. CREATE. DELIVER.
        </div>
      </main>

      {/* =====================================================
          TERMS MODAL
          ===================================================== */}
      {isTermsOpen && (
        <div
          className="legal-modal-overlay"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              setIsTermsOpen(false);
            }
          }}
        >
          <div
            className="legal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="termsTitle"
          >
            <div className="legal-modal-header">
              <div>
                <span className="modal-eyebrow">
                  PMG PRINTING HOUSE
                </span>

                <h2 id="termsTitle">
                  Terms & Conditions
                </h2>
              </div>

              <button
                type="button"
                className="legal-modal-close"
                onClick={() =>
                  setIsTermsOpen(false)
                }
              >
                ×
              </button>
            </div>

            <div className="legal-modal-body">
              <p>
                <strong>
                  Last updated:
                </strong>{" "}
                February 1, 2026
              </p>

              <h3>
                1. Acceptance of Terms
              </h3>

              <p>
                By creating an account and
                using PMG Printing House
                services, you agree to follow
                these Terms & Conditions. If
                you do not agree, please do not
                proceed with registration.
              </p>

              <h3>
                2. Account Responsibilities
              </h3>

              <ul>
                <li>
                  You are responsible for the
                  accuracy of your information
                  including name, email, phone,
                  and address.
                </li>

                <li>
                  Keep your password confidential
                  and do not share your account.
                </li>

                <li>
                  You are responsible for
                  activities done under your
                  account.
                </li>
              </ul>

              <h3>
                3. Orders & Services
              </h3>

              <ul>
                <li>
                  Service availability,
                  pricing, and processing times
                  may change without notice.
                </li>

                <li>
                  Final output may vary slightly
                  depending on materials and
                  printing conditions.
                </li>

                <li>
                  Custom orders may require
                  confirmation or approval
                  before production.
                </li>
              </ul>

              <h3>4. Payments</h3>

              <p>
                Payments, if applicable, must
                be completed based on the
                payment options provided.
                Unpaid orders may be cancelled
                or placed on hold.
              </p>

              <h3>5. Prohibited Use</h3>

              <ul>
                <li>
                  Do not use the platform for
                  fraudulent, abusive, or
                  illegal activities.
                </li>

                <li>
                  Do not attempt to access or
                  disrupt the system or other
                  users' data.
                </li>
              </ul>

              <h3>6. Termination</h3>

              <p>
                We may suspend or terminate
                accounts that violate these
                terms or misuse the platform.
              </p>

              <h3>
                7. Limitation of Liability
              </h3>

              <p>
                To the extent allowed by law,
                PMG Printing House is not liable
                for indirect damages, loss of
                data, or issues caused by
                third-party services.
              </p>

              <h3>8. Changes to Terms</h3>

              <p>
                We may update these Terms from
                time to time. Continued use
                means you accept the updated
                Terms.
              </p>
            </div>

            <div className="legal-modal-footer">
              <button
                type="button"
                className="legal-modal-btn"
                onClick={() =>
                  setIsTermsOpen(false)
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          PRIVACY MODAL
          ===================================================== */}
      {isPrivacyOpen && (
        <div
          className="legal-modal-overlay"
          onMouseDown={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              setIsPrivacyOpen(false);
            }
          }}
        >
          <div
            className="legal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacyTitle"
          >
            <div className="legal-modal-header">
              <div>
                <span className="modal-eyebrow">
                  PMG PRINTING HOUSE
                </span>

                <h2 id="privacyTitle">
                  Privacy Policy
                </h2>
              </div>

              <button
                type="button"
                className="legal-modal-close"
                onClick={() =>
                  setIsPrivacyOpen(false)
                }
              >
                ×
              </button>
            </div>

            <div className="legal-modal-body">
              <p>
                <strong>
                  Last updated:
                </strong>{" "}
                February 1, 2026
              </p>

              <h3>
                1. Information We Collect
              </h3>

              <ul>
                <li>
                  Account data: name, email,
                  phone number, and address.
                </li>

                <li>
                  Security data: password
                  stored securely using hashing
                  on the server.
                </li>

                <li>
                  Order-related data: order
                  history and transaction
                  details if you place orders.
                </li>
              </ul>

              <h3>
                2. How We Use Your Information
              </h3>

              <ul>
                <li>
                  To create and manage your
                  account.
                </li>

                <li>
                  To send OTP/verification
                  messages and service-related
                  notices.
                </li>

                <li>
                  To process orders and provide
                  customer support.
                </li>

                <li>
                  To improve system security
                  and prevent fraud.
                </li>
              </ul>

              <h3>
                3. Sharing of Information
              </h3>

              <p>
                We do not sell your personal
                data. We may share limited data
                with service providers such as
                email/OTP services only when
                necessary to deliver the service.
              </p>

              <h3>
                4. Data Retention
              </h3>

              <p>
                We keep your information only as
                long as needed for account
                operation, order records, and
                legal/security purposes.
              </p>

              <h3>5. Security</h3>

              <p>
                We use reasonable safeguards to
                protect your data. However, no
                system is 100% secure. Please use
                a strong password and keep it
                private.
              </p>

              <h3>
                6. Your Choices
              </h3>

              <ul>
                <li>
                  You may request account
                  updates or corrections where
                  applicable.
                </li>

                <li>
                  You may request account
                  deletion subject to retention
                  requirements.
                </li>
              </ul>

              <h3>
                7. Updates to this Policy
              </h3>

              <p>
                We may update this Privacy
                Policy. Continued use means you
                accept the updated policy.
              </p>
            </div>

            <div className="legal-modal-footer">
              <button
                type="button"
                className="legal-modal-btn"
                onClick={() =>
                  setIsPrivacyOpen(false)
                }
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserRegistrationPage;