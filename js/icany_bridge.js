// italky → icany SSO + IAP credit helpers (DOM'a dokunmaz).
const ICANY_ORIGIN = "https://icany.ai";
const FROM_ITALKY_PATH = "/api/bridge/from-italky";
const IAP_CREDIT_PATH = "/api/bridge/iap-credit";
const STORAGE_KEY = "icany_shared_pool_v1";

/** Build GET URL: https://icany.ai/api/bridge/from-italky?next=...&access_token=... */
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

function readPool() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

async function resolveAccessToken() {
  try {
    if (window.__ITALKY_ACCESS_TOKEN__) return String(window.__ITALKY_ACCESS_TOKEN__);
  } catch {
    /* ignore */
  }
  try {
    const mod = await import("/js/supabase_client.js");
    const client = mod.supabase || mod.default;
    const { data } = await client?.auth?.getSession?.();
    return String(data?.session?.access_token || "").trim();
  } catch {
    return "";
  }
}

/** Play IAP sonrası ortak icany jeton havuzuna yaz. */
export async function creditIcanyIap(input = {}) {
  const productId = String(input.productId || input.product_id || "").trim();
  const purchaseToken = String(input.purchaseToken || input.purchase_token || "").trim();
  if (!productId || !purchaseToken) return null;

  const pool = readPool();
  const accessToken = await resolveAccessToken();
  const payload = {
    productId,
    purchaseToken,
    source: String(input.source || "italky_web_iap"),
  };
  if (pool?.enterToken) payload.token = pool.enterToken;
  else if (input.token) payload.token = String(input.token);

  const headers = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  try {
    const res = await fetch(`${ICANY_ORIGIN}${IAP_CREDIT_PATH}`, {
      method: "POST",
      headers,
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
    return json;
  } catch (error) {
    console.warn("[icany_bridge] iap credit error", error);
    return null;
  }
}

try {
  window.IcanyBridge = {
    ...(window.IcanyBridge || {}),
    buildFromItalkyUrl,
    creditIap: (detail) => {
      void creditIcanyIap(detail || {});
    },
  };
} catch {
  /* ignore */
}
