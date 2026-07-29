// italky.ai hesap bağlamı
// Bireysel sayfalarda yalnız iCany business_members.personal_token_balance gösterilir.
// Eski profiles.tokens ve kurumsal token_balance bu görünümü değiştiremez.

const CORPORATE_DASHBOARD = "https://www.icany.ai/dashboard";
const PERSONAL_WALLET_ENDPOINT = "https://www.icany.ai/api/bridge/personal-wallet";
const TOKEN_IDS = [
  "drawerTokens",
  "officialMenuTokens",
  "menuTokens",
  "currentTokens",
  "headerTokens",
  "tokenVal",
  "currentBalance",
  "summaryBalance",
];

let lastPersonalBalance = null;
let refreshInFlight = null;

function formatBalance(value) {
  const amount = Math.max(0, Math.floor(Number(value) || 0));
  try {
    return amount.toLocaleString("tr-TR");
  } catch {
    return String(amount);
  }
}

function isTokenElement(el) {
  return Boolean(
    el &&
      el.nodeType === 1 &&
      (TOKEN_IDS.includes(el.id) || el.matches?.("[data-personal-token-balance]"))
  );
}

function setPersonalBalance(value) {
  const amount = Math.max(0, Math.floor(Number(value) || 0));
  const text = formatBalance(amount);
  lastPersonalBalance = amount;
  TOKEN_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.dataset.walletSource = "icany-personal";
    if (el.textContent !== text) el.textContent = text;
  });
  document.querySelectorAll?.("[data-personal-token-balance]").forEach((el) => {
    el.dataset.walletSource = "icany-personal";
    if (el.textContent !== text) el.textContent = text;
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
    if (window.supabase?.auth?.getSession) return window.supabase;
    try {
      const module = await import("/js/supabase_client.js");
      if (module?.supabase?.auth?.getSession) return module.supabase;
    } catch {
      /* module is still booting; retry */
    }
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
  if (!response.ok || !payload?.ok || payload?.wallet !== "personal") {
    const error = new Error(payload?.error || `personal_wallet_${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return Math.max(0, Number(payload.personalTokenBalance ?? 0));
}

async function refreshPersonalBalance() {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const supabase = await waitForSupabase();
      if (!supabase) return null;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !session?.access_token) return null;

      const balance = await loadPersonalWallet(session);
      if (balance == null) return null;
      setPersonalBalance(balance);
      window.dispatchEvent(new CustomEvent("italkyPersonalWalletLoaded", {
        detail: { ok: true, balance, wallet: "personal" },
      }));
      return balance;
    } catch (error) {
      console.warn("[account_wallet_context] personal wallet could not be loaded", error);
      // Hata halinde profiles.tokens veya kurumsal bakiyeye dönme; son doğru değeri koru.
      restoreLastPersonalBalance();
      window.dispatchEvent(new CustomEvent("italkyPersonalWalletLoaded", {
        detail: { ok: false, balance: lastPersonalBalance },
      }));
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

function bootAccountWalletContext() {
  fixCorporateEntry();
  void refreshPersonalBalance();

  [150, 500, 1000, 1800, 3000, 5000].forEach((delay) =>
    window.setTimeout(refreshPersonalBalance, delay)
  );
  window.addEventListener("focus", refreshPersonalBalance);
  window.addEventListener("pageshow", refreshPersonalBalance);
  window.addEventListener("italkyPersonalWalletLoaded", () =>
    window.setTimeout(restoreLastPersonalBalance, 0)
  );

  const observer = new MutationObserver((mutations) => {
    let shouldRefresh = false;
    let shouldRestore = false;

    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        if (isTokenElement(mutation.target?.parentElement)) shouldRestore = true;
        continue;
      }

      // textContent ataması çoğu tarayıcıda childList olarak gelir.
      if (isTokenElement(mutation.target)) shouldRestore = true;

      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 3 && isTokenElement(mutation.target)) {
          shouldRestore = true;
          return;
        }
        if (node.nodeType !== 1) return;
        fixCorporateEntry(node);
        if (
          isTokenElement(node) ||
          node.querySelector?.(`#${TOKEN_IDS.join(",#")},[data-personal-token-balance]`)
        ) {
          shouldRefresh = true;
        }
      });
    }

    if (shouldRestore) window.setTimeout(restoreLastPersonalBalance, 0);
    if (shouldRefresh) window.setTimeout(refreshPersonalBalance, 0);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootAccountWalletContext, { once: true });
} else {
  bootAccountWalletContext();
}
