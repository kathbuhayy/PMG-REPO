import React from "react";
import "./GenericModal.css";

function AlertModal({ isOpen, message, title = "Alert", onClose }) {
  if (!isOpen) return null;

  return (
    <div className="generic-modal-overlay">
      <div className="generic-modal-content">
        <h2>{title}</h2>
        <p>{message}</p>

        <div className="generic-modal-buttons">
          <button className="generic-modal-btn primary" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlertModal;
