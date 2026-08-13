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

export function adminFetch(url, options = {}) {
  const adminId = getStoredAdminId();
  const headers = { ...(options.headers || {}) };
  if (adminId) headers["X-User-Id"] = adminId;
  return fetch(url, { ...options, headers });
}