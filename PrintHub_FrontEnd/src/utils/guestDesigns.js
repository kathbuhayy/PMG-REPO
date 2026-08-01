// Shared helpers for saving, loading, removing, and migrating guest AI-generated designs in localStorage

const GUEST_DESIGNS_KEY = "ai_guest_designs";

/**
 * Saves a guest AI-generated design to localStorage, limiting to the last 3 designs.
 * @param {Object} design The design metadata object to save
 */
export function saveGuestDesign(design) {
  try {
    const existing = JSON.parse(
      localStorage.getItem(GUEST_DESIGNS_KEY) || "[]"
    );

    if (existing.some((d) => d.imageUrl === design.imageUrl)) {
      return;
    }

    existing.push(design);

    localStorage.setItem(
      GUEST_DESIGNS_KEY,
      JSON.stringify(existing.slice(-3))
    );
  } catch (e) {
    console.error("Failed to save guest design to local storage", e);
  }
}

/**
 * Removes a guest design by its image URL from localStorage.
 * @param {string} imageUrl The URL of the image to remove
 */
export function removeGuestDesign(imageUrl) {
  try {
    const existing = JSON.parse(
      localStorage.getItem(GUEST_DESIGNS_KEY) || "[]"
    );

    const filtered = existing.filter((d) => d.imageUrl !== imageUrl);

    localStorage.setItem(GUEST_DESIGNS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to remove guest design from local storage", e);
  }
}

/**
 * Loads the list of staged guest designs from localStorage.
 * @returns {Array} List of staged guest designs
 */
export function loadGuestDesigns() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_DESIGNS_KEY) || "[]");
  } catch {
    return [];
  }
}

/**
 * Clears all staged guest designs from localStorage.
 */
export function clearGuestDesigns() {
  try {
    localStorage.removeItem(GUEST_DESIGNS_KEY);
  } catch (e) {
    console.error("Failed to clear guest designs from local storage", e);
  }
}
