import axios from "axios";

const backendUrl = process.env.REACT_APP_BACKEND_URL || "";

const apiInstance = axios.create({
  baseURL: `${backendUrl}/api`,
});

export async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
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
    throw new Error(detail);
  }
}
