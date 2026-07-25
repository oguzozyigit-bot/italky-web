// FILE: /js/icany_bridge.js
// Ortak jeton havuzu (icany master) — `?icany_bridge=` handoff tüketimi.

const ICANY_ORIGIN = "https://www.icany.ai";
const STORAGE_KEY = "icany_shared_pool_v1";
const CONSUME_PATH = "/api/bridge/consume-handoff";

function safeParse(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readIcanySharedPool() {
  try {
    const row = safeParse(localStorage.getItem(STORAGE_KEY));
    if (!row?.memberId || !row?.email) return null;
    return row;
  } catch {
    return null;
  }
}

export function clearIcanySharedPool() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    delete window.__ICANY_SHARED_POOL__;
  } catch {
    /* ignore */
  }
}

function persistPool(row) {
  const next = {
    memberId: String(row.memberId || "").trim(),
    email: String(row.email || "").trim().toLowerCase(),
    name: String(row.name || "").trim(),
    tokenBalance: Math.max(0, Number(row.tokenBalance || 0)),
    pool: "shared",
    master: "icany",
    linkedAt: new Date().toISOString(),
  };
  if (!next.memberId || !next.email) return null;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  window.__ICANY_SHARED_POOL__ = next;
  try {
    window.dispatchEvent(new CustomEvent("icanySharedPoolReady", { detail: next }));
  } catch {
    /* ignore */
  }
  return next;
}

function stripBridgeFromUrl() {
  try {
    const url = new URL(location.href);
    if (!url.searchParams.has("icany_bridge") && !url.searchParams.has("from")) return;
    url.searchParams.delete("icany_bridge");
    if (url.searchParams.get("from") === "icany") url.searchParams.delete("from");
    const next = `${url.pathname}${url.search}${url.hash}`;
    history.replaceState(history.state, "", next);
  } catch {
    /* ignore */
  }
}

/**
 * URL'deki icany_bridge token'ını doğrula ve ortak profili sakla.
 * Token yoksa mevcut localStorage kaydını döner.
 */
export async function consumeIcanyBridgeFromUrl(options = {}) {
  const params = new URLSearchParams(location.search || "");
  const token = String(params.get("icany_bridge") || "").trim();
  const existing = readIcanySharedPool();
  if (existing) window.__ICANY_SHARED_POOL__ = existing;

  if (!token) return existing;

  const origin = String(options.icanyOrigin || ICANY_ORIGIN).replace(/\/$/, "");
  try {
    const res = await fetch(`${origin}${CONSUME_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      console.warn("[icany_bridge] consume failed", json?.error || res.status);
      stripBridgeFromUrl();
      return existing;
    }
    const saved = persistPool(json);
    stripBridgeFromUrl();
    return saved;
  } catch (error) {
    console.warn("[icany_bridge] consume error", error);
    stripBridgeFromUrl();
    return existing;
  }
}

export function icanyHosgeldinizUrl() {
  return `${ICANY_ORIGIN}/hosgeldiniz`;
}

export function icanyPersonalMusicUrl() {
  return `${ICANY_ORIGIN}/personal/music`;
}

export function icanyDenemeHubUrl() {
  return `${ICANY_ORIGIN}/deneme`;
}

if (typeof window !== "undefined") {
  window.IcanyBridge = {
    read: readIcanySharedPool,
    clear: clearIcanySharedPool,
    consumeFromUrl: consumeIcanyBridgeFromUrl,
    hosgeldinizUrl: icanyHosgeldinizUrl,
    personalMusicUrl: icanyPersonalMusicUrl,
    denemeHubUrl: icanyDenemeHubUrl,
  };
}
