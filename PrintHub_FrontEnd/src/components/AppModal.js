import React from "react";
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

  return (
    <div className="app-modal-overlay" role="presentation">
      <div
        className={`app-modal app-modal-${tone}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
      >
        <div className="app-modal-mark" aria-hidden="true">
          {tone === "success" ? "✓" : tone === "danger" ? "!" : "i"}
        </div>
        <h2 id="app-modal-title">{title}</h2>
        {message && <p>{message}</p>}
        {children}
        <div className="app-modal-actions">
          {cancelText && (
            <button className="app-modal-cancel" type="button" onClick={onCancel}>
              {cancelText}
            </button>
          )}
          <button className="app-modal-confirm" type="button" onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AppModal;
