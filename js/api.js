// /js/api.js
// ITALKY API helper (single source of truth) — FINAL

import { BASE_DOMAIN } from "/js/config.js";

const API_TOKEN_KEY = "italky_api_token";

function base() {
  return String(BASE_DOMAIN || "").replace(/\/+$/, "");
}

function getApiToken() {
  return (localStorage.getItem(API_TOKEN_KEY) || "").trim();
}

function getGoogleIdToken() {
  return (localStorage.getItem("google_id_token") || "").trim();
}

function buildHeaders(extra = {}) {
  const h = { "Content-Type": "application/json", ...extra };

  const apiToken = getApiToken();
  const googleIdToken = getGoogleIdToken();

  if (apiToken) {
    h["Authorization"] = `Bearer ${apiToken}`;
    h["X-Api-Token"] = apiToken;
  }

  if (googleIdToken) {
    h["X-Google-Id-Token"] = googleIdToken;
    h["X-Id-Token"] = googleIdToken;
  }

  return h;
}

async function readTextSafe(res) {
  try { return await res.text(); } catch { return ""; }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(to);
  }
}

export async function apiGET(path, { headers = {}, raw = false, timeoutMs = 20000 } = {}) {
  const url = `${base()}${path}`;
  const res = await fetchWithTimeout(url, {
    method: "GET",
    headers: buildHeaders(headers),
  }, timeoutMs);

  if (raw) return res;

  const txt = await readTextSafe(res);
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch {}

  if (!res.ok) {
    const msg = (data?.detail || data?.message || txt || `HTTP ${res.status}`).toString();
    throw new Error(msg);
  }

  return data;
}

export async function apiPOST(path, body = {}, { headers = {}, raw = false, timeoutMs = 20000 } = {}) {
  const url = `${base()}${path}`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: buildHeaders(headers),
    body: JSON.stringify(body ?? {}),
  }, timeoutMs);

  if (raw) return res;

  const txt = await readTextSafe(res);
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch {}

  if (!res.ok) {
    const msg = (data?.detail || data?.message || txt || `HTTP ${res.status}`).toString();
    throw new Error(msg);
  }

  return data;
}

// ===============================
// ITALKY PROXIMITY & SHAKE MATCH
// ===============================

/**
 * Telefon sallandığında yakınlardaki cihazla eşleşme başlatır.
 * @param {string} userId
 * @param {number} lat
 * @param {number} lon
 * @param {string} myLang
 * @param {number|null} accuracyM
 */
export async function apiShakeMatch(userId, lat, lon, myLang = "tr", accuracyM = null) {
  return await apiPOST("/api/italky/shake-match", {
    user_id: String(userId || "").trim(),
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    my_lang: String(myLang || "tr").trim().toLowerCase(),
    accuracy_m: accuracyM == null ? null : Number(accuracyM)
  });
}

/**
 * İlk sallayan kullanıcı eşleşti mi diye polling yapar.
 * @param {string} searchId
 * @param {string} userId
 */
export async function apiShakeStatus(searchId, userId) {
  return await apiGET(
    `/api/italky/shake-status/${encodeURIComponent(searchId)}?user_id=${encodeURIComponent(userId)}`
  );
}

/**
 * Uygulaması olmayan misafirler için hızlı oda linki oluşturur.
 * @param {string} userId
 * @param {string} myLang
 * @param {string} roomId
 */
export async function apiCreateGuestLink(userId, myLang = "tr", roomId = "") {
  const qs = new URLSearchParams();
  qs.set("user_id", String(userId || "").trim());
  qs.set("my_lang", String(myLang || "tr").trim().toLowerCase());
  if (String(roomId || "").trim()) {
    qs.set("room_id", String(roomId).trim());
  }

  return await apiGET(`/api/italky/create-guest-link?${qs.toString()}`);
}
