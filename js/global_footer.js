const FALLBACK_VERSION_CODE = 83;
const FOOTER_PREFIX = "italkyAI By Oyzigit's 2026 V.";
const FOOTER_SELECTOR = [
  "[data-italky-footer]",
  ".footer",
  ".prestige-signature",
  ".drawer-footer-seal",
  ".signature",
  ".menu-sign"
].join(",");

function readVersionFromBridge(bridge) {
  try {
    if (!bridge || typeof bridge.getVersionCode !== "function") return null;
    const value = Number(String(bridge.getVersionCode() ?? "").trim());
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function getVersionCode() {
  return readVersionFromBridge(window.AndroidBridge)
    || readVersionFromBridge(window.Native)
    || FALLBACK_VERSION_CODE;
}

function footerText() {
  return `${FOOTER_PREFIX}${getVersionCode()}`;
}

function styleFooter(el) {
  if (!el) return;
  el.setAttribute("data-no-translate", "1");
  el.setAttribute("data-italky-footer", "1");
  el.style.color = el.style.color || "rgba(255,255,255,.46)";
  el.style.fontSize = el.style.fontSize || "11px";
  el.style.fontWeight = el.style.fontWeight || "900";
  el.style.letterSpacing = el.style.letterSpacing || ".4px";
  el.style.textAlign = el.style.textAlign || "center";
}

function updateKnownFooters() {
  const text = footerText();
  const nodes = Array.from(document.querySelectorAll(FOOTER_SELECTOR));

  nodes.forEach((el) => {
    if (!el) return;
    styleFooter(el);
    el.textContent = text;
  });

  return nodes.length;
}

function appendFooterIfMissing() {
  if (document.querySelector(FOOTER_SELECTOR)) return;

  const el = document.createElement("div");
  el.className = "italky-global-footer";
  el.textContent = footerText();
  styleFooter(el);
  el.style.position = "fixed";
  el.style.left = "0";
  el.style.right = "0";
  el.style.bottom = "calc(8px + env(safe-area-inset-bottom, 0px))";
  el.style.zIndex = "90";
  el.style.pointerEvents = "none";
  el.style.padding = "0 12px";
  document.body.appendChild(el);
}

function installMembershipHelpers() {
  if (!location.pathname.endsWith("/pages/membership.html")) return;

  let redirected = false;
  const redirectIfActive = () => {
    if (redirected) return;
    if (!document.body.classList.contains("access-open")) return;
    redirected = true;
    setTimeout(() => {
      location.replace("/pages/home.html");
    }, 700);
  };

  const observer = new MutationObserver(redirectIfActive);
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  redirectIfActive();

  let callback = window.onProductDetailsLoaded;
  Object.defineProperty(window, "onProductDetailsLoaded", {
    configurable: true,
    get() {
      return callback;
    },
    set(handler) {
      if (typeof handler !== "function") {
        callback = handler;
        return;
      }
      callback = function(details) {
        console.warn("[MEMBERSHIP_BILLING] product details loaded", details);
        return handler.apply(this, arguments);
      };
    }
  });
}

export function applyGlobalFooter() {
  const count = updateKnownFooters();
  if (!count) appendFooterIfMissing();
}

function boot() {
  applyGlobalFooter();
  installMembershipHelpers();
  setTimeout(applyGlobalFooter, 500);
  setTimeout(applyGlobalFooter, 1600);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

window.addEventListener("load", applyGlobalFooter, { once: true });
