import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com/api";

function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function safeGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export async function getCurrentUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

export function getDeviceId() {
  try {
    if (window.Native?.getDeviceId) {
      return String(window.Native.getDeviceId() || "").trim();
    }
  } catch {}
  return "web-unknown-device";
}

export function getLastNfcUid() {
  try {
    if (window.Native?.getNfcUid) {
      const uid = String(window.Native.getNfcUid() || "").trim().toUpperCase();
      if (uid) return uid;
    }
  } catch {}

  const cached = safeGet("italky_last_nfc_uid", "");
  return String(cached || "").trim().toUpperCase();
}

export async function activateNfc(uid) {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const cleanUid = String(uid || "").trim().toUpperCase();
  if (!cleanUid) return null;

  const r = await fetch(`${API_BASE}/nfc/activate`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      user_id: userId,
      uid: cleanUid,
      device_id: getDeviceId(),
      platform: "android"
    })
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(j?.detail || "NFC aktivasyon başarısız");
  }

  safeSet("italky_access_rights", j);
  safeSet("italky_last_nfc_uid", cleanUid);
  return j;
}

export async function checkAccess() {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const uid = getLastNfcUid();

  const r = await fetch(`${API_BASE}/nfc/check`, {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      user_id: userId,
      uid,
      device_id: getDeviceId()
    })
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(j?.detail || "Erişim kontrolü başarısız");
  }

  safeSet("italky_access_rights", j);
  return j;
}

export function canUse(featureName) {
  const rights = safeGet("italky_access_rights", null);
  return !!rights?.features?.[featureName];
}

export function getAccessMode() {
  const rights = safeGet("italky_access_rights", null);
  return rights?.mode || "basic";
}

window.addEventListener("native-nfc-detected", async (ev) => {
  const uid = ev?.detail?.uid || "";
  if (!uid) return;

  safeSet("italky_last_nfc_uid", String(uid).trim().toUpperCase());

  try {
    await activateNfc(uid);
    window.dispatchEvent(new CustomEvent("italky-access-updated"));
  } catch (e) {
    console.warn("[nfc activate]", e);
  }
});
