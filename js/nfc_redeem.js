// FILE: /js/nfc_redeem.js

import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

export async function redeemNfcTokenCard(uid) {
  const { data } = await supabase.auth.getUser();
  const user = data?.user || null;

  if (!user?.id) {
    location.href = "/pages/login.html";
    return { ok: false, reason: "NO_USER" };
  }

  const res = await fetch(`${API_BASE}/api/nfc/redeem-token-card`, {
    method: "POST",
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      uid: String(uid || "").trim(),
      user_id: user.id
    })
  });

  const json = await res.json().catch(() => null);

  if (!json) {
    return { ok: false, reason: "INVALID_RESPONSE" };
  }

  if (json.ok && typeof json.tokens_after === "number" && window.setHeaderTokens) {
    try { window.setHeaderTokens(json.tokens_after); } catch {}
  }

  return json;
}
