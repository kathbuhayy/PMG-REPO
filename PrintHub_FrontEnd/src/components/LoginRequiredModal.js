import React from "react";
import "./GenericModal.css";

function LoginRequiredModal({ onClose, onLogin, onRegister }) {
  return (
    <div className="generic-modal-overlay">
      <div className="generic-modal-content">
        <h2>Login Required</h2>
        <p>You need to log in or create an account to continue.</p>

        <div className="generic-modal-buttons stacked">
          <button className="generic-modal-btn primary" onClick={onLogin}>
            Log In
          </button>
          <button className="generic-modal-btn secondary" onClick={onRegister}>
            Create Account
          </button>
          <button className="generic-modal-btn secondary ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginRequiredModal;
