import React from "react";
import "./LoginRequiredModal.css"; // create this for basic styling if you want

function LoginRequiredModal({ onClose, onLogin, onRegister }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Login Required</h2>
        <p>You need to log in or create an account to continue.</p>

        <div className="modal-buttons">
          <button className="login-btn" onClick={onLogin}>
            Log In
          </button>
          <button className="register-btn" onClick={onRegister}>
            Create Account
          </button>
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginRequiredModal;
