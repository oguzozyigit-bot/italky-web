// italky.ai ortak kişisel cüzdan ve shell önyükleyicisi.
// Tek gerçek cüzdan kaynağı: icany business_members.personal_token_balance.

const CORPORATE_LOGIN = "https://www.icany.ai/login?audience=corporate";

function keepCorporateEntryVisible(root = document) {
  try {
    const links = root.matches?.("a[href]")
      ? [root]
      : Array.from(root.querySelectorAll?.("a[href], .site-footer-corp") || []);

    links.forEach((link) => {
      const href = String(link.getAttribute?.("href") || "").trim();
      const isCorporateEntry =
        link.classList?.contains("site-footer-corp") ||
        href === "https://icany.ai/login?audience=corporate" ||
        href === "https://www.icany.ai/login?audience=corporate" ||
        href === "https://icany.ai/dashboard" ||
        href === "https://www.icany.ai/dashboard";

      if (!isCorporateEntry) return;

      link.setAttribute("href", CORPORATE_LOGIN);
      link.removeAttribute("hidden");
      link.setAttribute("aria-hidden", "false");
      link.style.setProperty("display", "inline-flex", "important");
      link.style.setProperty("visibility", "visible", "important");
      link.style.setProperty("opacity", "1", "important");
      link.style.setProperty("pointer-events", "auto", "important");
    });
  } catch {}
}

async function bootSharedWallet() {
  keepCorporateEntryVisible();
  try {
    await import(`/js/wallet_force_fix.js?v=20260729-1704-${Date.now()}`);
  } catch (error) {
    console.warn("[account_wallet_context] shared wallet runtime failed", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootSharedWallet, { once: true });
} else {
  void bootSharedWallet();
}

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) keepCorporateEntryVisible(node);
    });

    if (mutation.type === "attributes" && mutation.target?.nodeType === 1) {
      keepCorporateEntryVisible(mutation.target);
    }
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ["class", "style", "hidden", "href", "aria-hidden"],
});

// Oturum sonrası shell yeniden çizilirse veya CSS butonu saklarsa tekrar görünür yap.
window.addEventListener("pageshow", () => keepCorporateEntryVisible());
window.addEventListener("focus", () => keepCorporateEntryVisible());
setInterval(() => keepCorporateEntryVisible(), 1500);
