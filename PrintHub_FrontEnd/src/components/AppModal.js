import React from "react";
import { createPortal } from "react-dom";
import "./AppModal.css";

function AppModal({
  open,
  title,
  message,
  confirmText = "OK",
  cancelText,
  tone = "info",
  onConfirm,
  onCancel,
  children,
}) {
  if (!open) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
  };

  const modal = (
    <div className="app-modal-overlay" role="presentation">
      <div
        className={`app-modal app-modal-${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
      >
        <h2 id="app-modal-title">{title}</h2>

        {message && <p>{message}</p>}

        {children}

        <div className="app-modal-actions">
          {cancelText && (
            <button
              className="app-modal-cancel"
              type="button"
              onClick={onCancel}
            >
              {cancelText}
            </button>
          )}

          <button
            className="app-modal-confirm"
            type="button"
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

export default AppModal;