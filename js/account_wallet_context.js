// italky.ai ortak kişisel cüzdan önyükleyicisi.
// Tek gerçek kaynak: icany business_members.personal_token_balance.

const CORPORATE_DASHBOARD = "https://icany.ai/dashboard";

function fixCorporateEntry(root = document) {
  try {
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
  } catch {}
}

async function bootSharedWallet() {
  fixCorporateEntry();
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
      if (node.nodeType === 1) fixCorporateEntry(node);
    });
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });