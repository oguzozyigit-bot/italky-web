import { STORAGE_KEY } from "/js/config.js";

const FALLBACK_VERSION_CODE = 83;
const FOOTER_PREFIX = "italkyAI By Ozyigit's 2026 V.";
const MEMBERSHIP_SUBSCRIPTION_PRODUCT_ID = "reklamsiz";
const MEMBERSHIP_BASE_PLAN_IDS = new Set([
  "1-ay-abonelik",
  "3-ay-abonelik",
  "6-ay-abonelik",
  "12-ay-abonelik"
]);
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

function ensureGlobalFooterStyle() {
  if (document.getElementById("italkyGlobalFooterStyle")) return;

  const style = document.createElement("style");
  style.id = "italkyGlobalFooterStyle";
  style.textContent = `
    [data-italky-footer],
    .italky-global-footer{
      color:rgba(255,255,255,.84)!important;
      font-size:11px!important;
      font-weight:900!important;
      letter-spacing:.25px!important;
      text-align:center!important;
      text-shadow:none!important;
      filter:none!important;
      opacity:1!important;
      -webkit-font-smoothing:antialiased;
      text-rendering:geometricPrecision;
    }
    body.ui-menu-open [data-italky-footer],
    body.italky-shell-menu-open [data-italky-footer],
    body.ui-menu-open .italky-global-footer,
    body.italky-shell-menu-open .italky-global-footer{
      display:none!important;
    }
    .brand-group::after{
      content:"BE FREE";
      display:block;
      margin-top:2px;
      font-size:9px;
      line-height:1;
      font-weight:1000;
      letter-spacing:2.8px;
      color:rgba(103,232,249,.78);
      text-align:left;
    }
    .menu-panel{
      overflow-y:auto!important;
      padding-bottom:calc(92px + env(safe-area-inset-bottom,0px))!important;
    }
    .menu-user-card{
      align-items:center;
    }
    .menu-user-card img{
      object-fit:cover;
      background:rgba(15,23,42,.92);
    }
    .menu-membership-left{
      margin-top:6px;
      display:none;
      width:max-content;
      max-width:100%;
      padding:5px 8px;
      border-radius:999px;
      background:rgba(20,184,166,.12);
      border:1px solid rgba(45,212,191,.20);
      color:#a7f3d0;
      font-size:11px;
      line-height:1;
      font-weight:1000;
      white-space:nowrap;
    }
    .menu-membership-left.show{display:inline-flex;}
    .menu-membership-left.warning{
      background:rgba(239,68,68,.13);
      border-color:rgba(248,113,113,.34);
      color:#fecaca;
    }
  `;
  document.head.appendChild(style);
}

function styleFooter(el) {
  if (!el) return;
  el.setAttribute("data-no-translate", "1");
  el.setAttribute("data-italky-footer", "1");
  el.style.color = "rgba(255,255,255,.84)";
  el.style.fontSize = "11px";
  el.style.fontWeight = "900";
  el.style.letterSpacing = ".25px";
  el.style.textAlign = "center";
  el.style.textShadow = "none";
  el.style.filter = "none";
  el.style.opacity = "1";
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

function readCachedUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function initialsFrom(value) {
  const raw = String(value || "").trim();
  if (!raw) return "AI";
  const parts = raw.replace(/@.*/, "").split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0] || ""}${parts[1][0] || ""}` : raw.slice(0, 2);
  return letters.toUpperCase();
}

function avatarFallbackDataUrl(label) {
  const initials = initialsFrom(label);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#0ea5e9"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs><rect width="96" height="96" rx="48" fill="url(#g)"/><text x="48" y="57" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="white">${initials}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function cachedAvatarUrl(user) {
  const meta = user?.user_metadata || {};
  return String(
    user?.avatar_url ||
    user?.picture ||
    user?.avatar ||
    meta.avatar_url ||
    meta.picture ||
    ""
  ).trim();
}

function upsertMembershipNode() {
  let node = document.getElementById("menuMembershipLeft");
  if (node) return node;

  const anchor = document.getElementById("menuLoginDate");
  if (!anchor?.parentElement) return null;

  node = document.createElement("div");
  node.id = "menuMembershipLeft";
  node.className = "menu-membership-left";
  anchor.insertAdjacentElement("afterend", node);
  return node;
}

function readAccessEndDate(access) {
  if (!access || typeof access !== "object") return "";
  const raw = access.raw && typeof access.raw === "object" ? access.raw : {};
  return String(
    access.membership_ends_at ||
    access.package_ends_at ||
    access.subscription_ends_at ||
    access.expires_at ||
    raw.membership_ends_at ||
    raw.package_ends_at ||
    raw.subscription_ends_at ||
    raw.expires_at ||
    ""
  ).trim();
}

function hydrateShellExtras(access = window.__ITALKY_ACCESS__) {
  ensureGlobalFooterStyle();

  const cachedUser = readCachedUser();
  const name = cachedUser?.full_name || cachedUser?.name || cachedUser?.hitap || cachedUser?.email || "italkyAI";
  const pic = cachedAvatarUrl(cachedUser);
  const avatar = document.getElementById("menuUserPic");

  if (avatar) {
    avatar.src = pic || avatarFallbackDataUrl(name);
    avatar.alt = String(name || "Profil");
  }

  const node = upsertMembershipNode();
  if (!node) return;

  const hasAccess = !!(
    access?.access_open ||
    access?.has_active_membership ||
    access?.is_member ||
    access?.package_active ||
    access?.subscription_active
  );
  const endsAtRaw = readAccessEndDate(access);
  const endsAt = endsAtRaw ? new Date(endsAtRaw).getTime() : NaN;
  const remainingDays = Math.ceil((endsAt - Date.now()) / 86400000);

  if (!hasAccess || !Number.isFinite(remainingDays) || remainingDays < 0) {
    node.classList.remove("show", "warning");
    node.textContent = "";
    return;
  }

  node.textContent = remainingDays <= 7
    ? `! Kalan süre: ${remainingDays} gün`
    : `Kalan süre: ${remainingDays} gün`;
  node.classList.toggle("warning", remainingDays <= 7);
  node.classList.add("show");
}

function ensureMembershipCancelStyle() {
  if (document.getElementById("italkyMembershipCancelStyle")) return;
  const style = document.createElement("style");
  style.id = "italkyMembershipCancelStyle";
  style.textContent = `
    .italky-membership-cancel-btn{
      width:100%;
      min-height:50px;
      border-radius:17px;
      border:1px solid rgba(148,163,184,.20);
      background:rgba(255,255,255,.045);
      color:rgba(226,232,240,.82);
      font:inherit;
      font-size:14px;
      font-weight:900;
      cursor:pointer;
      display:none;
      align-items:center;
      justify-content:center;
      margin-top:10px;
      touch-action:manipulation;
    }
    .italky-membership-cancel-btn:active{transform:scale(.99)}
    body.signed-out #signinCancelBtn{display:flex}
    body:not(.signed-out):not(.access-open) #membershipCancelBtn{display:flex}
    body.access-open #signinCancelBtn,
    body.access-open #membershipCancelBtn{display:none!important}
  `;
  document.head.appendChild(style);
}

function createCancelButton(id) {
  const btn = document.createElement("button");
  btn.id = id;
  btn.type = "button";
  btn.className = "italky-membership-cancel-btn";
  btn.textContent = "Vazgeç";
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    location.href = "/pages/login_entry.html";
  });
  return btn;
}

function installMembershipCancelButtons() {
  ensureMembershipCancelStyle();

  const signinBtn = document.getElementById("signinBtn");
  if (signinBtn && !document.getElementById("signinCancelBtn")) {
    signinBtn.insertAdjacentElement("afterend", createCancelButton("signinCancelBtn"));
  }

  const actions = document.querySelector(".actions");
  if (actions && !document.getElementById("membershipCancelBtn")) {
    actions.appendChild(createCancelButton("membershipCancelBtn"));
  }
}

function installMembershipBillingBridgePatch() {
  try {
    const bridge = window.AndroidBilling;
    if (!bridge || bridge.__italkyBasePlanBillingPatched) return;

    const originalBuy = typeof bridge.buy === "function" ? bridge.buy.bind(bridge) : null;
    if (originalBuy) {
      bridge.buy = function(productId, basePlanId) {
        const rawProductId = String(productId || "").trim();
        const rawBasePlanId = String(basePlanId || "").trim();

        if (MEMBERSHIP_BASE_PLAN_IDS.has(rawProductId) && !rawBasePlanId) {
          return originalBuy(MEMBERSHIP_SUBSCRIPTION_PRODUCT_ID, rawProductId);
        }

        if (rawProductId === MEMBERSHIP_SUBSCRIPTION_PRODUCT_ID && rawBasePlanId) {
          return originalBuy(rawProductId, rawBasePlanId);
        }

        return originalBuy(rawProductId || MEMBERSHIP_SUBSCRIPTION_PRODUCT_ID, rawBasePlanId || undefined);
      };
    }

    bridge.__italkyBasePlanBillingPatched = true;
  } catch {}
}

function installMembershipHelpers() {
  if (!location.pathname.endsWith("/pages/membership.html")) return;

  installMembershipCancelButtons();
  installMembershipBillingBridgePatch();
  setTimeout(() => {
    installMembershipCancelButtons();
    installMembershipBillingBridgePatch();
  }, 500);
  setTimeout(installMembershipBillingBridgePatch, 1600);

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
  ensureGlobalFooterStyle();
  const count = updateKnownFooters();
  if (!count) appendFooterIfMissing();
  hydrateShellExtras();
}

function boot() {
  applyGlobalFooter();
  installMembershipHelpers();
  setTimeout(applyGlobalFooter, 500);
  setTimeout(applyGlobalFooter, 1600);
  setTimeout(hydrateShellExtras, 2400);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}

window.addEventListener("load", applyGlobalFooter, { once: true });
window.addEventListener("italkyAccessReady", (event) => hydrateShellExtras(event.detail));
