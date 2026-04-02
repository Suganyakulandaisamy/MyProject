const BASE_URL = "https://myproject-8okl.onrender.com/api";

export function getStoredUser() {
  const raw = localStorage.getItem("aaqap_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeUser(user) {
  localStorage.setItem("aaqap_user", JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem("aaqap_user");
}

function authHeaders() {
  const user = getStoredUser();
  return user?.token
    ? {
        Authorization: `Bearer ${user.token}`
      }
    : {};
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data.error || data.message || "Request failed";
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/csv")) {
    return response.text();
  }
  return response.json();
}
