const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || "";

export async function api(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${backendUrl}/api${path}`, {
    ...options,
    headers: { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error((await response.json()).detail || "Request failed");
  return response.json();
}
