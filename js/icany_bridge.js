// FILE: /js/icany_bridge.js
// Ortak jeton havuzu (icany master) — italky → icany SSO + handoff.

/** Canonical apex — www kullanılmaz (cookie Domain=.icany.ai). */
const ICANY_ORIGIN = "https://icany.ai";
const STORAGE_KEY = "icany_shared_pool_v1";
const CONSUME_PATH = "/api/bridge/consume-handoff";
const IAP_CREDIT_PATH = "/api/bridge/iap-credit";
const FROM_ITALKY_PATH = "/api/bridge/from-italky";

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

/** italky Supabase access_token ile icany Dinle/Üret SSO URL. */
export function buildFromItalkyUrl(nextPath, accessToken) {
  const next = String(nextPath || "/hosgeldiniz").startsWith("/")
    ? String(nextPath || "/hosgeldiniz")
    : `/${nextPath}`;
  const url = new URL(`${ICANY_ORIGIN}${FROM_ITALKY_PATH}`);
  url.searchParams.set("next", next);
  const token = String(accessToken || "").trim();
  if (token) url.searchParams.set("access_token", token);
  return url.toString();
}

export function icanyHosgeldinizUrl() {
  const pool = readIcanySharedPool();
  if (pool?.enterHosgeldinizUrl) {
    // Eski www URL'lerini apex'e çevir
    return String(pool.enterHosgeldinizUrl).replace(
      /^https:\/\/www\.icany\.ai/i,
      ICANY_ORIGIN
    );
  }
  return buildFromItalkyUrl("/hosgeldiniz");
}

export function icanyPersonalMusicUrl() {
  const pool = readIcanySharedPool();
  if (pool?.enterMusicUrl) {
    return String(pool.enterMusicUrl).replace(/^https:\/\/www\.icany\.ai/i, ICANY_ORIGIN);
  }
  return buildFromItalkyUrl("/personal/music");
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

async function resolveItalkyAccessToken() {
  try {
    if (typeof window !== "undefined" && window.__ITALKY_ACCESS_TOKEN__) {
      return String(window.__ITALKY_ACCESS_TOKEN__ || "").trim();
    }
  } catch {
    /* ignore */
  }
  try {
    const mod = await import("/js/supabase_client.js");
    const client = mod.supabase || mod.default;
    if (!client?.auth?.getSession) return "";
    const { data } = await client.auth.getSession();
    return String(data?.session?.access_token || "").trim();
  } catch {
    return "";
  }
}

/**
 * Dinle / Üret: italky oturumu ile https://icany.ai/api/bridge/from-italky
 * UI'ye /hosgeldiniz DOM müdahalesi yok — sadece link hedefi.
 */
export async function navigateToIcany(nextPath) {
  const token = await resolveItalkyAccessToken();
  const pool = readIcanySharedPool();
  const next = String(nextPath || "/hosgeldiniz");

  // Eldeki enter URL (handoff) varsa ve token yoksa onu kullan
  if (!token && next.startsWith("/hosgeldiniz") && pool?.enterHosgeldinizUrl) {
    location.href = String(pool.enterHosgeldinizUrl).replace(
      /^https:\/\/www\.icany\.ai/i,
      ICANY_ORIGIN
    );
    return;
  }
  if (!token && next.startsWith("/personal") && pool?.enterMusicUrl) {
    location.href = String(pool.enterMusicUrl).replace(/^https:\/\/www\.icany\.ai/i, ICANY_ORIGIN);
    return;
  }

  location.href = buildFromItalkyUrl(next, token);
}

export function wireHubPanelLinks() {
  const dinle = document.getElementById("hubDinle");
  const uret = document.getElementById("hubUret");

  if (dinle) {
    dinle.setAttribute("href", buildFromItalkyUrl("/hosgeldiniz"));
    dinle.onclick = (event) => {
      event.preventDefault();
      void navigateToIcany("/hosgeldiniz");
    };
  }
  if (uret) {
    uret.setAttribute("href", buildFromItalkyUrl("/personal/music"));
    uret.onclick = (event) => {
      event.preventDefault();
      void navigateToIcany("/personal/music");
    };
  }
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
    navigateToIcany,
    buildFromItalkyUrl,
    origin: ICANY_ORIGIN,
  };
}
