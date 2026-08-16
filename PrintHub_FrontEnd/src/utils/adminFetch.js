export function getStoredAdminId() {
  try {
    const user =
      JSON.parse(localStorage.getItem("user")) ||
      JSON.parse(localStorage.getItem("adminUser"));
    return user?.id || null;
  } catch {
    return null;
  }
}

export function getStoredAuthToken() {
  return localStorage.getItem("authToken") || null;
}

export function adminFetch(url, options = {}) {
  const adminId = getStoredAdminId();
  const token = getStoredAuthToken();
  const headers = { ...(options.headers || {}) };

  // X-User-Id stays for now as a fallback for routes not yet migrated to
  // requireAuth — but any route using requireAuth ignores this header
  // entirely and verifies identity from the Bearer token instead.
  if (adminId) headers["X-User-Id"] = adminId;
  if (token) headers["Authorization"] = `Bearer ${token}`;

  return fetch(url, { ...options, headers });
}