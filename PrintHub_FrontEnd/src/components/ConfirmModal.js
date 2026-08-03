import React from "react";
import "./GenericModal.css";

function ConfirmModal({ isOpen, message, title = "Confirm Action", onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="generic-modal-overlay">
      <div className="generic-modal-content">
        <h2>{title}</h2>
        <p>{message}</p>

        <div className="generic-modal-buttons">
          <button className="generic-modal-btn secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="generic-modal-btn danger" onClick={onConfirm}>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
