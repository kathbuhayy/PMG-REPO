import { createPortal } from "react-dom";
import { FaSignOutAlt } from "react-icons/fa";
import "./LogoutConfirmModal.css";

// Shared logout confirmation dialog used by every "Logout" button across
// the app (Customer navbar, Customer dashboard, Customer account settings,
// Admin dashboard) so the prompt looks and behaves identically everywhere.
function LogoutConfirmModal({ onCancel, onConfirm }) {
  return createPortal(
    <div
      className="lcm-overlay"
      onMouseDown={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lcm-title"
    >
      <div className="lcm-card" onMouseDown={(e) => e.stopPropagation()}>
        <div className="lcm-icon">
          <FaSignOutAlt />
        </div>

        <h3 id="lcm-title" className="lcm-title">
          Log out?
        </h3>

        <p className="lcm-subtitle">
          You'll need to sign in again to access your account.
        </p>

        <div className="lcm-actions">
          <button
            type="button"
            className="lcm-cancel-btn"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            type="button"
            className="lcm-logout-btn"
            onClick={onConfirm}
          >
            <FaSignOutAlt /> Log out
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default LogoutConfirmModal;
