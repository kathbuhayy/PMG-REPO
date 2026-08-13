const GUEST_USAGE_KEY = "guestCustomizationUsage";
const GUEST_DESIGN_KEY = "guestDesignDraft";
export const GUEST_CUSTOMIZATION_LIMIT = 3;

export const getGuestUsageCount = () => {
  const count = parseInt(localStorage.getItem(GUEST_USAGE_KEY), 10);
  return Number.isFinite(count) ? count : 0;
};

export const incrementGuestUsage = () => {
  const next = getGuestUsageCount() + 1;
  localStorage.setItem(GUEST_USAGE_KEY, String(next));
  return next;
};

export const hasGuestUsageRemaining = () =>
  getGuestUsageCount() < GUEST_CUSTOMIZATION_LIMIT;

export const getGuestUsageRemaining = () =>
  Math.max(0, GUEST_CUSTOMIZATION_LIMIT - getGuestUsageCount());

// Call this once the guest actually logs in / registers,
// since the limit is a "guest" concept only.
export const resetGuestUsage = () => {
  localStorage.removeItem(GUEST_USAGE_KEY);
};

// --- Design draft, so a guest's work is never lost ---

export const saveGuestDesignDraft = (draft) => {
  try {
    localStorage.setItem(
      GUEST_DESIGN_KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() })
    );
    return true;
  } catch {
    return false; // e.g. storage full/disabled — caller should warn the user
  }
};

export const getGuestDesignDraft = () => {
  try {
    const raw = localStorage.getItem(GUEST_DESIGN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearGuestDesignDraft = () => {
  localStorage.removeItem(GUEST_DESIGN_KEY);
};