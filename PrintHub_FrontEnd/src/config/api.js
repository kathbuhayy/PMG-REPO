/**
 * Centralized API configuration
 * Dynamically resolves backend host for dev, Android WebView, and tunnel.
 */

const getDynamicApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }

  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    if (
      hostname.includes("trycloudflare.com") ||
      hostname.includes("ngrok") ||
      hostname.includes("loca.lt")
    ) {
      return `${protocol}//${hostname}`;
    }

    if (hostname === "10.0.2.2") {
      return "http://10.0.2.2:3000";
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:3000";
    }

    if (hostname.startsWith("192.168.") || hostname.startsWith("10.")) {
      return `${protocol}//${hostname}:3000`;
    }
  }

  return "http://localhost:3000";
};

/**
 * Build a complete API endpoint URL
 * @param {string} endpoint - API endpoint (e.g., '/api/products')
 * @returns {string} Full API URL
 */
export const buildApiUrl = (endpoint) => {
  const base = getDynamicApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;

  return `${base}${cleanEndpoint}`;
};

/**
 * Standard fetch wrapper with consistent error handling
 */
export const apiCall = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);

  try {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const cType = response.headers.get("content-type");

    if (!cType || !cType.includes("application/json")) {
      throw new Error(
        `Server returned non-JSON response (${response.status})`
      );
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || `API Error: ${response.statusText}`
      );
    }

    return data;
  } catch (error) {
    console.error(`API call failed for ${endpoint}:`, error);
    throw error;
  }
};

export default {
  buildApiUrl,
  apiCall,
};
