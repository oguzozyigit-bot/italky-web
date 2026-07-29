// italky → icany SSO helper. Jeton yazımı yalnız doğrulanmış backend tarafından yapılır.
const ICANY_ORIGIN = "https://www.icany.ai";
const FROM_ITALKY_PATH = "/api/bridge/from-italky";

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

/**
 * Eski Android/web sürümleri bu yardımcıyı satın alma sonrasında çağırabilir.
 * Bakiye, Google Play doğrulaması tamamlanırken italky API tarafından zaten
 * iCany ana cüzdana yazılır. Buradan ikinci bir kredi isteği gönderilmez.
 */
export async function creditIcanyIap(input = {}) {
  const productId = String(input.productId || input.product_id || "").trim();
  const purchaseToken = String(input.purchaseToken || input.purchase_token || "").trim();
  if (!productId || !purchaseToken) return null;
  return {
    ok: true,
    delegated: true,
    already_processed: true,
    productId,
  };
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
