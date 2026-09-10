// Styles for ChangePasswordModal, injected into its Shadow DOM host (see
// ShadowPortal.js) rather than imported as a normal .css file — a
// shadow root does not inherit stylesheets from the main document, so
// this string is the single source of truth for this component's CSS.
const changePasswordModalStyles = `
/* PMG brand green — same values as Product-detail.css's --pmg-green.
   Defined on :host (rather than relying on the outer page's :root)
   so this modal's styling is self-contained inside its shadow root,
   regardless of which page opens it. */
:host {
  --ucp-green: #57e000;
  --ucp-green-dark: #31b900;
  --ucp-green-soft: #efffe8;
}

/* --- OVERLAY & MODAL SHELL --- */
.cpm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 9999;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.cpm-modal {
  position: relative;
  width: min(100%, 440px);
  max-height: calc(100vh - 40px);
  overflow-y: auto;
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow:
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  padding: 32px;
  box-sizing: border-box;
}

.cpm-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s, color 0.2s;
}

.cpm-close:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}

/* --- HEADER --- */
.cpm-header {
  margin-bottom: 20px;
  padding-right: 24px;
}

.cpm-header h2 {
  margin: 0 0 6px;
  color: #0f172a;
  font-size: 20px;
  font-weight: 700;
}

.cpm-header p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.cpm-otp-icon {
  width: 44px;
  height: 44px;
  margin-bottom: 12px;
  border-radius: 10px;
  background-color: var(--ucp-green-soft);
  color: var(--ucp-green-dark);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* --- ALERTS --- */
.cpm-alert {
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
}

.cpm-alert-error {
  background-color: #fef2f2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

/* --- RATE LIMIT TOAST --- */
.cpm-rate-limit-toast {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10000;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: min(92vw, 420px);
  padding: 14px 16px;
  border-radius: 10px;
  background-color: #0f2a1a;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.25);
}

.cpm-rate-limit-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: #fbbf24;
  font-size: 16px;
}

.cpm-rate-limit-text {
  flex: 1;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  line-height: 1.4;
}

.cpm-rate-limit-close {
  flex-shrink: 0;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cpm-rate-limit-close:hover {
  color: #ffffff;
}

/* --- FORM FIELDS --- */
.cpm-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cpm-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.cpm-input-wrap {
  position: relative;
}

.cpm-input {
  width: 100%;
  padding: 10px 44px 10px 14px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  font-size: 14px;
  font-weight: 400;
  color: #0f172a;
  background-color: #ffffff;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.cpm-input:focus {
  border-color: var(--ucp-green);
  box-shadow: 0 0 0 3px rgba(87, 224, 0, 0.2);
}

.cpm-eye-btn {
  position: absolute;
  top: 50%;
  right: 10px;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #64748b;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}

.cpm-eye-btn:hover {
  background-color: #f1f5f9;
  color: #0f172a;
}

.cpm-field-error {
  font-size: 12px;
  font-weight: 500;
  color: #ef4444;
}

/* --- PASSWORD CRITERIA CHECKLIST --- */
.cpm-criteria {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  padding: 12px 14px;
  background-color: #f8fafc;
  border: 1px solid #f1f5f9;
  border-radius: 8px;
}

.cpm-criteria span {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.cpm-criteria span.ok {
  color: #16a34a;
}

.cpm-criteria span::before {
  content: "○ ";
}

.cpm-criteria span.ok::before {
  content: "✓ ";
}

/* --- OTP STEP --- */
.cpm-otp-boxes {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.cpm-otp-box {
  width: 100%;
  aspect-ratio: 1 / 1;
  min-width: 0;
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.cpm-otp-box:focus {
  border-color: var(--ucp-green);
  box-shadow: 0 0 0 3px rgba(87, 224, 0, 0.2);
}

.cpm-resend-row {
  display: flex;
  justify-content: center;
  margin-top: 4px;
}

.cpm-resend-cooldown {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

.cpm-resend-link {
  border: none;
  background: transparent;
  color: var(--ucp-green-dark);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  padding: 0;
}

.cpm-resend-link:hover {
  color: #1d6800;
  text-decoration: underline;
}

.cpm-resend-link:disabled {
  color: #94a3b8;
  cursor: default;
  text-decoration: none;
}

.cpm-back-link {
  align-self: center;
  border: none;
  background: transparent;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.cpm-back-link:hover {
  color: #0f172a;
  text-decoration: underline;
}

/* --- ACTIONS --- */
.cpm-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  border-top: 1px solid #e2e8f0;
  padding-top: 20px;
}

.cpm-cancel-button {
  flex: 1;
  height: 44px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background-color: #ffffff;
  color: #475569;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cpm-cancel-button:hover {
  background-color: #f8fafc;
}

.cpm-save-button {
  flex: 1;
  height: 44px;
  border: none;
  border-radius: 8px;
  background-color: var(--ucp-green);
  color: #122000;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cpm-save-button:hover {
  background-color: var(--ucp-green-dark);
  color: #ffffff;
}

.cpm-save-button:disabled,
.cpm-cancel-button:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* --- MOBILE --- */
@media (max-width: 480px) {
  .cpm-modal {
    padding: 24px;
  }

  .cpm-otp-box {
    font-size: 18px;
  }

  .cpm-actions {
    flex-direction: column-reverse;
  }
}
`;

export default changePasswordModalStyles;
