import React from "react";
import "./GenericModal.css";

function LoginRequiredModal({ onClose, onLogin, onRegister, variant = "default" }) {
  const copy = {
    default: {
      title: "Login Required",
      message: "You need to log in or create an account to continue.",
    },
    limitReached: {
      title: "Free Customizations Used Up",
      message:
        "You've used all 3 free customizations as a guest. Log in or create a free account to keep designing — nothing you've made is lost.",
    },
    checkout: {
      title: "Almost there!",
      message:
        "We've saved your design so it won't be lost. Log in or create an account to add it to your cart and check out.",
    },
  };

  const { title, message } = copy[variant] || copy.default;

  return (
    <div className="generic-modal-overlay">
      <div className="generic-modal-content">
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="generic-modal-buttons stacked">
          <button className="generic-modal-btn primary" onClick={onLogin}>Log In</button>
          <button className="generic-modal-btn secondary" onClick={onRegister}>Create Account</button>
          <button className="generic-modal-btn secondary ghost" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default LoginRequiredModal;