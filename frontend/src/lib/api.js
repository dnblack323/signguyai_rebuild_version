import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
const TOKEN_KEY = "signguyai_token";

export function getStoredAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";
}

export function setStoredAuthToken(token, rememberMe) {
  if (rememberMe) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.removeItem(TOKEN_KEY);
  } else {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearStoredAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

const apiInstance = axios.create({
  baseURL: `${backendUrl}/api`,
});

export async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const token = getStoredAuthToken();

  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let data = options.body;
  
  // If the body is a JSON string, we can let axios handle it directly by passing it
  // or parsing it. Standard fetch caller passes it stringified. If they passed it
  // stringified, axios can send it as a string, but to ensure headers are matched
  // and axios works correctly, we can parse it if it is a JSON string.
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (e) {
      // Keep it as a string if it's not valid JSON
    }
  }

  try {
    const response = await apiInstance({
      url: path,
      method: options.method || "GET",
      headers,
      data,
    });
    return response.data;
  } catch (error) {
    const detail = error.response?.data?.detail || error.message || "Request failed";
    throw new Error(formatApiErrorDetail(detail));
  }
}

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((entry) => (entry && typeof entry.msg === "string" ? entry.msg : JSON.stringify(entry)))
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

