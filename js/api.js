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

// PUT/DELETE gerekirse (override)
export async function apiPUT(path, body = {}, opts = {}) {
  return apiPOST(path, body, { ...opts, headers: { ...(opts.headers || {}), "X-HTTP-Method-Override": "PUT" } });
}
