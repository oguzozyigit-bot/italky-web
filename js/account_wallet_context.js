// italky.ai hesap bağlamı
// Bireysel sayfalarda yalnız personal_token_balance gösterilir.
// Kurumsal giriş icany.ai/dashboard üzerinden başlar.

const CORPORATE_DASHBOARD = "https://www.icany.ai/dashboard";
const PERSONAL_WALLET_ENDPOINT = "https://www.icany.ai/api/bridge/personal-wallet";
const TOKEN_IDS = ["drawerTokens", "officialMenuTokens", "menuTokens"];

let lastPersonalBalance = null;
let refreshInFlight = null;

function setText(id, value) {
  const el = document.getElementById(id);
  if (el && el.textContent !== String(value)) el.textContent = String(value);
}

function setPersonalBalance(value) {
  const amount = Math.max(0, Math.floor(Number(value) || 0));
  lastPersonalBalance = amount;
  TOKEN_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.dataset.walletSource = "personal";
    if (el.textContent !== String(amount)) el.textContent = String(amount);
  });
  document.querySelectorAll?.("[data-personal-token-balance]").forEach((el) => {
    el.dataset.walletSource = "personal";
    if (el.textContent !== String(amount)) el.textContent = String(amount);
  });
}

function restoreLastPersonalBalance() {
  if (lastPersonalBalance == null) return;
  setPersonalBalance(lastPersonalBalance);
}

function fixCorporateEntry(root = document) {
  const links = root.matches?.("a[href]") ? [root] : Array.from(root.querySelectorAll?.("a[href]") || []);
  links.forEach((link) => {
    const href = String(link.getAttribute("href") || "").trim();
    if (
      link.classList.contains("site-footer-corp") ||
      href === "https://icany.ai/login?audience=corporate" ||
      href === "https://www.icany.ai/login?audience=corporate"
    ) {
      link.setAttribute("href", CORPORATE_DASHBOARD);
    }
  });
}

async function waitForSupabase(timeoutMs = 6000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const client = window.supabase;
    if (client?.auth?.getSession) return client;
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  return null;
}

async function loadPersonalWallet(session) {
  const userId = String(session?.user?.id || "").trim();
  const email = String(session?.user?.email || "").trim().toLowerCase();
  if (!userId || !email || !session?.access_token) return null;

  const response = await fetch(PERSONAL_WALLET_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    mode: "cors",
    credentials: "omit",
    cache: "no-store",
    body: JSON.stringify({ userId, email }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok || (payload.wallet && payload.wallet !== "personal")) {
    const error = new Error(payload?.error || `personal_wallet_${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return Math.max(0, Number(payload.personalTokenBalance ?? payload.tokenBalance ?? 0));
}

async function refreshPersonalBalance() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const supabase = await waitForSupabase();
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !session?.access_token) {
        lastPersonalBalance = null;
        setPersonalBalance(0);
        return;
      }

      const balance = await loadPersonalWallet(session);
      setPersonalBalance(balance ?? 0);
      window.dispatchEvent(new CustomEvent("italkyPersonalWalletLoaded", {
        detail: { ok: true, balance: balance ?? 0, wallet: "personal" },
      }));
    } catch (error) {
      console.warn("[account_wallet_context] personal wallet could not be loaded", error);
      // Kurumsal bakiyeye geri düşme. Daha önce doğru değer geldiyse onu koru.
      if (lastPersonalBalance == null) setPersonalBalance(0);
      window.dispatchEvent(new CustomEvent("italkyPersonalWalletLoaded", {
        detail: { ok: false, balance: lastPersonalBalance ?? 0 },
      }));
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function bootAccountWalletContext() {
  fixCorporateEntry();
  void refreshPersonalBalance();

  [300, 1000, 2500, 5000].forEach((delay) => window.setTimeout(refreshPersonalBalance, delay));
  window.addEventListener("focus", refreshPersonalBalance);
  window.addEventListener("pageshow", refreshPersonalBalance);

  const observer = new MutationObserver((mutations) => {
    let shouldRefresh = false;
    let shouldRestore = false;
    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        const parent = mutation.target?.parentElement;
        if (parent && (TOKEN_IDS.includes(parent.id) || parent.matches?.("[data-personal-token-balance]"))) {
          shouldRestore = true;
        }
        continue;
      }
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        fixCorporateEntry(node);
        if (
          TOKEN_IDS.includes(node.id) ||
          node.matches?.("[data-personal-token-balance]") ||
          node.querySelector?.("#drawerTokens,#officialMenuTokens,#menuTokens,[data-personal-token-balance]")
        ) {
          shouldRefresh = true;
        }
      });
    }
    if (shouldRestore) window.setTimeout(restoreLastPersonalBalance, 0);
    if (shouldRefresh) window.setTimeout(refreshPersonalBalance, 0);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootAccountWalletContext, { once: true });
} else {
  bootAccountWalletContext();
}
