// italky → iCany SSO helper. Jeton yazımı yalnız doğrulanmış backend tarafından yapılır.
const ICANY_ORIGIN = "https://www.icany.ai";
const FROM_ITALKY_PATH = "/api/bridge/from-italky";
const PERSONAL_WALLET_PATH = "/api/bridge/personal-wallet";
const ITALKY_SUPABASE_URL = "https://rkbwcmeqdwuewqeokfas.supabase.co";
const ITALKY_SUPABASE_KEY = "sb_publishable_Xh1B9xUhmHCV6A3ffgeIrg_yO6uTX0t";
const TOKEN_VIEW_IDS = [
  "currentTokens",
  "headerTokens",
  "drawerTokens",
  "menuTokens",
  "officialMenuTokens",
];

let walletClientPromise = null;
let walletRefreshPromise = null;

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

function formatTokens(value) {
  const amount = Math.max(0, Math.floor(Number(value) || 0));
  try {
    return amount.toLocaleString("tr-TR");
  } catch {
    return String(amount);
  }
}

function setPersonalWalletViews(value) {
  const text = formatTokens(value);
  for (const id of TOKEN_VIEW_IDS) {
    const element = document.getElementById(id);
    if (!element) continue;
    element.dataset.walletSource = "icany-personal";
    element.textContent = text;
  }
  document.querySelectorAll?.("[data-personal-token-balance]").forEach((element) => {
    element.dataset.walletSource = "icany-personal";
    element.textContent = text;
  });
}

async function getWalletClient() {
  if (!walletClientPromise) {
    walletClientPromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm")
      .then(({ createClient }) =>
        createClient(ITALKY_SUPABASE_URL, ITALKY_SUPABASE_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        })
      )
      .catch(() => null);
  }
  return walletClientPromise;
}

/**
 * iCany ana bireysel cüzdanını okur ve italky ekranlarındaki eski
 * profiles.tokens görünümünün üzerine doğru bakiyeyi yazar.
 */
export async function refreshIcanyPersonalWallet() {
  if (walletRefreshPromise) return walletRefreshPromise;

  walletRefreshPromise = (async () => {
    try {
      const client = await getWalletClient();
      if (!client?.auth?.getSession) return null;

      const { data } = await client.auth.getSession();
      const session = data?.session;
      const userId = String(session?.user?.id || "").trim();
      const email = String(session?.user?.email || "").trim().toLowerCase();
      const accessToken = String(session?.access_token || "").trim();
      if (!userId || !email || !accessToken) return null;

      const response = await fetch(`${ICANY_ORIGIN}${PERSONAL_WALLET_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
        body: JSON.stringify({ userId, email }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok || payload?.wallet !== "personal") {
        throw new Error(payload?.error || `personal_wallet_${response.status}`);
      }

      const balance = Math.max(
        0,
        Number(payload.personalTokenBalance ?? payload.tokenBalance ?? 0)
      );
      setPersonalWalletViews(balance);
      window.dispatchEvent(
        new CustomEvent("italkyPersonalWalletLoaded", {
          detail: { ok: true, balance, wallet: "personal" },
        })
      );
      return balance;
    } catch (error) {
      console.warn("[icany_bridge] personal wallet refresh failed", error);
      return null;
    } finally {
      walletRefreshPromise = null;
    }
  })();

  return walletRefreshPromise;
}

/**
 * Eski Android/web sürümleri bu yardımcıyı satın alma sonrasında çağırabilir.
 * Bakiye, Google Play doğrulaması tamamlanırken italky API tarafından zaten
 * iCany ana cüzdana yazılır. Buradan ikinci bir kredi isteği gönderilmez;
 * yalnız ekrandaki ana bakiye yeniden okunur.
 */
export async function creditIcanyIap(input = {}) {
  const productId = String(input.productId || input.product_id || "").trim();
  const purchaseToken = String(input.purchaseToken || input.purchase_token || "").trim();
  if (!productId || !purchaseToken) return null;

  [300, 900, 1800].forEach((delay) => {
    window.setTimeout(() => void refreshIcanyPersonalWallet(), delay);
  });

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
    refreshPersonalWallet: refreshIcanyPersonalWallet,
    creditIap: (detail) => {
      void creditIcanyIap(detail || {});
    },
  };

  const path = String(location.pathname || "").toLowerCase();
  if (path === "/pages/jetonbuy.html" || path === "/jetonbuy.html") {
    [0, 350, 1000, 2500].forEach((delay) => {
      window.setTimeout(() => void refreshIcanyPersonalWallet(), delay);
    });
    window.addEventListener("focus", () => void refreshIcanyPersonalWallet());
    window.addEventListener("pageshow", () => void refreshIcanyPersonalWallet());
  }
} catch {
  /* ignore */
}
