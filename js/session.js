const API_BASE = "https://italky-api.onrender.com/api";

export async function createSession(userId) {
  const res = await fetch(`${API_BASE}/session/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      user_id: String(userId || "").trim()
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.ok || !data?.session_id) {
    throw new Error(data?.detail || data?.error || "SESSION_CREATE_FAILED");
  }

  localStorage.setItem("session_id", data.session_id);
  return data.session_id;
}

export function getSessionId() {
  return localStorage.getItem("session_id") || "";
}
