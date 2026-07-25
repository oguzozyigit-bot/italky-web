// FILE: /js/icany_bridge.js
// Ortak jeton havuzu (icany master) — `?icany_bridge=` handoff tüketimi.

const ICANY_ORIGIN = "https://www.icany.ai";
const STORAGE_KEY = "icany_shared_pool_v1";
const CONSUME_PATH = "/api/bridge/consume-handoff";
const IAP_CREDIT_PATH = "/api/bridge/iap-credit";

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
    enterToken: String(row.enterToken || "").trim(),
    enterHosgeldinizUrl: String(row.enterHosgeldinizUrl || "").trim(),
    enterMusicUrl: String(row.enterMusicUrl || "").trim(),
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
  const pool = readIcanySharedPool();
  if (pool?.enterHosgeldinizUrl) return pool.enterHosgeldinizUrl;
  return `${ICANY_ORIGIN}/hosgeldiniz`;
}

export function icanyPersonalMusicUrl() {
  const pool = readIcanySharedPool();
  if (pool?.enterMusicUrl) return pool.enterMusicUrl;
  return `${ICANY_ORIGIN}/personal/music`;
}

export function icanyDenemeHubUrl() {
  return `${ICANY_ORIGIN}/deneme`;
}

/** Play IAP sonrası ortak havuza yaz (bridge bağlıysa). */
export async function creditIcanyIap(input = {}) {
  const pool = readIcanySharedPool();
  const productId = String(input.productId || input.product_id || "").trim();
  const purchaseToken = String(input.purchaseToken || input.purchase_token || "").trim();
  if (!productId || !purchaseToken) return null;

  const payload = {
    productId,
    purchaseToken,
    source: String(input.source || "italky_web_iap"),
  };
  if (pool?.enterToken) payload.token = pool.enterToken;
  else if (input.token) payload.token = String(input.token);

  if (!payload.token) {
    console.warn("[icany_bridge] iap credit skipped — no enterToken");
    return null;
  }

  try {
    const res = await fetch(`${ICANY_ORIGIN}${IAP_CREDIT_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.ok) {
      console.warn("[icany_bridge] iap credit failed", json?.error || res.status);
      return null;
    }
    if (pool) {
      persistPool({
        ...pool,
        tokenBalance: Number(json.tokenBalance ?? pool.tokenBalance),
      });
    }
    return json;
  } catch (error) {
    console.warn("[icany_bridge] iap credit error", error);
    return null;
  }
}

export function wireHubPanelLinks() {
  const dinle = document.getElementById("hubDinle");
  const uret = document.getElementById("hubUret");
  if (dinle) dinle.setAttribute("href", icanyHosgeldinizUrl());
  if (uret) uret.setAttribute("href", icanyPersonalMusicUrl());
}

if (typeof window !== "undefined") {
  window.IcanyBridge = {
    read: readIcanySharedPool,
    clear: clearIcanySharedPool,
    consumeFromUrl: consumeIcanyBridgeFromUrl,
    hosgeldinizUrl: icanyHosgeldinizUrl,
    personalMusicUrl: icanyPersonalMusicUrl,
    denemeHubUrl: icanyDenemeHubUrl,
    creditIap: creditIcanyIap,
    wireHubPanelLinks,
  };
}
