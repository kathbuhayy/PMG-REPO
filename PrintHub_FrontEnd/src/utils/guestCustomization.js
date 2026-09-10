// ============================================================
// PMG - Guest Customization Usage
// ============================================================

const GUEST_USAGE_KEY = "guestCustomizationUsage";
const GUEST_DESIGN_KEY = "guestDesignDraft";

export const GUEST_CUSTOMIZATION_LIMIT = 3;


// ============================================================
// GET GUEST USAGE COUNT
// ============================================================

export const getGuestUsageCount = () => {
  try {
    const count = parseInt(
      localStorage.getItem(GUEST_USAGE_KEY) || "0",
      10
    );

    if (!Number.isFinite(count)) {
      return 0;
    }

    return Math.max(
      0,
      Math.min(
        count,
        GUEST_CUSTOMIZATION_LIMIT
      )
    );
  } catch {
    return 0;
  }
};


// ============================================================
// GET REMAINING GUEST USES
// ============================================================

export const getGuestUsageRemaining = () => {
  return Math.max(
    0,
    GUEST_CUSTOMIZATION_LIMIT -
      getGuestUsageCount()
  );
};


// ============================================================
// CHECK IF GUEST CAN STILL CUSTOMIZE
// ============================================================

export const hasGuestUsageRemaining = () => {
  return (
    getGuestUsageCount() <
    GUEST_CUSTOMIZATION_LIMIT
  );
};


// ============================================================
// INCREMENT GUEST USAGE
//
// This is called ONLY when the guest chooses
// "Continue Designing".
//
// Opening the modal does NOT consume a use.
// ============================================================

export const incrementGuestUsage = () => {
  try {
    const current =
      getGuestUsageCount();

    if (
      current >=
      GUEST_CUSTOMIZATION_LIMIT
    ) {
      return current;
    }

    const next = current + 1;

    localStorage.setItem(
      GUEST_USAGE_KEY,
      String(next)
    );

    return next;
  } catch {
    return getGuestUsageCount();
  }
};


// ============================================================
// RESET GUEST USAGE
//
// Keep this function available for your existing system.
// Do NOT call it on page refresh.
// ============================================================

export const resetGuestUsage = () => {
  try {
    localStorage.removeItem(
      GUEST_USAGE_KEY
    );
  } catch {
    // Ignore storage errors
  }
};


// ============================================================
// SAVE GUEST DESIGN DRAFT
// ============================================================

export const saveGuestDesignDraft = (
  draft
) => {
  try {
    localStorage.setItem(
      GUEST_DESIGN_KEY,
      JSON.stringify({
        ...draft,
        savedAt: Date.now(),
      })
    );

    return true;
  } catch {
    return false;
  }
};


// ============================================================
// GET GUEST DESIGN DRAFT
// ============================================================

export const getGuestDesignDraft = () => {
  try {
    const raw =
      localStorage.getItem(
        GUEST_DESIGN_KEY
      );

    return raw
      ? JSON.parse(raw)
      : null;
  } catch {
    return null;
  }
};


// ============================================================
// CLEAR GUEST DESIGN DRAFT
// ============================================================

export const clearGuestDesignDraft = () => {
  try {
    localStorage.removeItem(
      GUEST_DESIGN_KEY
    );
  } catch {
    // Ignore storage errors
  }
};