// italky.ai hesap bağlamı
// Bireysel sayfalarda yalnız personal_token_balance gösterilir.
// Kurumsal giriş icany.ai/dashboard üzerinden başlar.

const CORPORATE_DASHBOARD = "https://www.icany.ai/dashboard";
const PERSONAL_WALLET_ENDPOINT = "https://www.icany.ai/api/bridge/personal-wallet";

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function setPersonalBalance(value) {
  const amount = Math.max(0, Math.floor(Number(value) || 0));
  ["drawerTokens", "officialMenuTokens", "menuTokens"].forEach((id) => setText(id, amount));
  document.querySelectorAll?.("[data-personal-token-balance]").forEach((el) => {
    el.textContent = String(amount);
  });
}

function fixCorporateEntry(root = document) {
  root.querySelectorAll?.("a[href]").forEach((link) => {
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

async function refreshPersonalBalance() {
  try {
    const { supabase } = await import("/js/supabase_client.js");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user || !session?.access_token) {
      setPersonalBalance(0);
      return;
    }

    // Eski kurumsal profiles.tokens değeri görünmesin.
    setPersonalBalance(0);

    const response = await fetch(PERSONAL_WALLET_ENDPOINT, {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
      mode: "cors",
      credentials: "omit",
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.ok || (payload.wallet && payload.wallet !== "personal")) {
      setPersonalBalance(0);
      return;
    }

    setPersonalBalance(payload.personalTokenBalance ?? payload.tokenBalance ?? 0);
  } catch {
    // Kurumsal bakiyeye geri düşme; yanlış bakiye yerine 0 göster.
    setPersonalBalance(0);
  }
}

function bootAccountWalletContext() {
  fixCorporateEntry();
  void refreshPersonalBalance();

  window.setTimeout(refreshPersonalBalance, 400);
  window.setTimeout(refreshPersonalBalance, 1500);
  window.addEventListener("focus", refreshPersonalBalance);

  const observer = new MutationObserver((mutations) => {
    let shouldRefresh = false;
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return;
        fixCorporateEntry(node);
        if (
          node.id === "drawerTokens" ||
          node.id === "officialMenuTokens" ||
          node.querySelector?.("#drawerTokens,#officialMenuTokens,[data-personal-token-balance]")
        ) {
          shouldRefresh = true;
        }
      });
    }
    if (shouldRefresh) window.setTimeout(refreshPersonalBalance, 0);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootAccountWalletContext, { once: true });
} else {
  bootAccountWalletContext();
}
