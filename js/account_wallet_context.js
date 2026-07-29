// italky.ai ortak kişisel cüzdan ve kurumsal giriş önyükleyicisi.
// Tek gerçek cüzdan kaynağı: icany business_members.personal_token_balance.

const CORPORATE_LOGIN = "https://www.icany.ai/login?audience=corporate";
const FALLBACK_ID = "italkyCorporateEntryFixed";
const STYLE_ID = "italkyCorporateEntryStyle";

function ensureCorporateStyle() {
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${FALLBACK_ID}{
      position:fixed;
      left:50%;
      bottom:calc(34px + env(safe-area-inset-bottom,0px));
      z-index:9990;
      transform:translateX(-50%);
      display:inline-flex;
      align-items:center;
      justify-content:center;
      min-height:28px;
      padding:5px 15px;
      border:1px solid rgba(53,213,208,.62);
      border-radius:999px;
      background:rgba(6,17,29,.96);
      color:#f6fbff;
      box-shadow:0 10px 28px rgba(0,0,0,.34);
      font:900 10px/1.1 Manrope,Arial,sans-serif;
      text-decoration:none;
      white-space:nowrap;
      pointer-events:auto;
    }
    @media(max-width:700px){
      #${FALLBACK_ID}{
        bottom:calc(30px + env(safe-area-inset-bottom,0px));
        min-height:25px;
        padding:4px 12px;
        font-size:9px;
      }
    }
  `;
  document.head.appendChild(style);
}

function showCorporateLink(link) {
  if (!(link instanceof HTMLAnchorElement)) return;
  link.setAttribute("href", CORPORATE_LOGIN);
  link.removeAttribute("hidden");
  link.setAttribute("aria-hidden", "false");
  link.style.setProperty("display", "inline-flex", "important");
  link.style.setProperty("visibility", "visible", "important");
  link.style.setProperty("opacity", "1", "important");
  link.style.setProperty("pointer-events", "auto", "important");
}

function findPageCorporateLink() {
  const candidates = Array.from(document.querySelectorAll(
    ".site-footer-corp, a[href='https://icany.ai/login?audience=corporate'], a[href='https://www.icany.ai/login?audience=corporate'], a[href='https://icany.ai/dashboard'], a[href='https://www.icany.ai/dashboard']"
  ));
  return candidates.find((link) => link.id !== FALLBACK_ID) || null;
}

function ensureCorporateEntry() {
  try {
    ensureCorporateStyle();

    const pageLink = findPageCorporateLink();
    const fallback = document.getElementById(FALLBACK_ID);

    if (pageLink) {
      showCorporateLink(pageLink);
      if (fallback && fallback !== pageLink) fallback.remove();
      return;
    }

    if (fallback instanceof HTMLAnchorElement) {
      showCorporateLink(fallback);
      return;
    }

    const link = document.createElement("a");
    link.id = FALLBACK_ID;
    link.href = CORPORATE_LOGIN;
    link.textContent = "Kurumsal Giriş";
    link.setAttribute("aria-label", "Kurumsal giriş sayfasını aç");
    showCorporateLink(link);
    document.body.appendChild(link);
  } catch {}
}

async function bootSharedWallet() {
  ensureCorporateEntry();
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

// Yalnız yeni DOM düğümlerini izler. Stil/href değişiklikleri izlenmediği için döngü oluşturmaz.
const observer = new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.addedNodes.length > 0)) {
    ensureCorporateEntry();
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true });
