import { STORAGE_KEY } from "/js/config.js";

const FALLBACK_VERSION_CODE = 83;
const STANDARD_SIGNATURE_TEXT = "italkyAI @ icanyAI By Ozyigit's 2026";
const STANDARD_SIGNATURE_RUNE = "𐰆𐰍𐰔 𐰇𐰔𐰘𐰃𐰏𐱅";
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
  ".brand-seal",
  ".prestige-signature",
  ".drawer-footer-seal",
  ".signature",
  ".menu-sign"
].join(",");

const HOME_I18N = {
  tr: {
    heroTitle: "Dünya’yı Küçülttük, Cebinize Sığdırdık",
    heroWelcome: "Hoş geldin",
    heroReady: "ana panel hazır.",
    faceKicker: "Tek Telefon",
    faceTitle: "YüzYüze Çeviri",
    faceDesc: "Konuşmaları tek ekranda anlık çevir. Günlük kullanım için hızlı ve hazır.",
    btKicker: "LİSANS",
    btTitle: "İki Telefon",
    btDesc: "Kodu al, diğer telefonda gir. İki cihaz arasında canlı çeviri yap.",
    guideKicker: "Rehber / Toplantı",
    guideTitle: "Gezi & Konferans",
    guideDesc: "Rehber veya konuşmacı anlatır. Katılımcılar kendi dilinde dinler. Tur, gezi ve toplantılar için hazır.",
    offlineTitle: "Offline Dil Paketleri",
    offlineDesc: "129 offline dil paketini indir. İnternet yokken de çeviri hazırlığını yanında taşı. Seyahatlerde güvenle kullan.",
    textTitle: "Yazıdan Çeviri",
    textDesc: "Metni yaz, çevir, dinle ve paylaş. Kısa notlardan uzun metinlere kadar pratik kullanım sağlar.",
    funTitle: "Eğlenerek Öğren",
    funDesc: "Oyunlarla kelime tekrar et. Hafızanı güçlendir. Dili daha kalıcı öğren.",
    levelTitle: "Seviye Tespit",
    levelDesc: "Seviyeni ölç. Doğru yerden başla. Gelişimini daha net takip et."
  },
  en: {
    heroTitle: "We Made the World Smaller and Put It in Your Pocket",
    heroWelcome: "Welcome",
    heroReady: "your dashboard is ready.",
    faceKicker: "One Phone",
    faceTitle: "FaceToFace Translate",
    faceDesc: "Translate conversations instantly on one screen. Fast and ready for daily use.",
    btKicker: "LICENSE",
    btTitle: "Two Phones",
    btDesc: "Get the code, enter it on the other phone, and translate live between two devices.",
    guideKicker: "Guide / Meeting",
    guideTitle: "Travel & Conference",
    guideDesc: "A guide or speaker talks. Participants listen in their own language. Ready for tours, trips and meetings.",
    offlineTitle: "Offline Language Packs",
    offlineDesc: "Download 129 offline language packs. Keep translation ready without internet. Use it confidently while traveling.",
    textTitle: "Text Translate",
    textDesc: "Type, translate, listen and share. Practical for short notes and longer text.",
    funTitle: "Learn with Games",
    funDesc: "Practice words through games. Strengthen memory. Learn the language more permanently.",
    levelTitle: "Level Check",
    levelDesc: "Measure your level. Start from the right place. Track your progress more clearly."
  }
};

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
  return STANDARD_SIGNATURE_TEXT;
}

function footerHtml() {
  return `${STANDARD_SIGNATURE_TEXT}<span class="gokturk-signature" lang="otk" dir="rtl">${STANDARD_SIGNATURE_RUNE}</span>`;
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
    .brand-seal,
    [data-italky-footer] .brand-seal,
    .italky-global-footer .brand-seal{
      display:block!important;
      color:rgba(255,255,255,.84)!important;
      font-size:11px!important;
      font-weight:900!important;
      letter-spacing:.25px!important;
      text-align:center!important;
      line-height:1.2!important;
    }
    .gokturk-signature{
      display:block!important;
      margin-top:3px!important;
      font-family:"Segoe UI Historic","Noto Sans Old Turkic",serif!important;
      font-size:12px!important;
      font-weight:900!important;
      line-height:1!important;
      direction:rtl!important;
      unicode-bidi:isolate!important;
    }
    body.ui-menu-open [data-italky-footer],
    body.italky-shell-menu-open [data-italky-footer],
    body.ui-menu-open .italky-global-footer,
    body.italky-shell-menu-open .italky-global-footer{display:none!important;}
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
    .menu-panel{overflow-y:auto!important;padding-bottom:calc(92px + env(safe-area-inset-bottom,0px))!important;}
    .menu-user-card{align-items:center;}
    .menu-user-card img{object-fit:cover;background:rgba(15,23,42,.92);}
    .menu-membership-left{
      margin-top:6px;display:none;width:max-content;max-width:100%;padding:5px 8px;border-radius:999px;
      background:rgba(20,184,166,.12);border:1px solid rgba(45,212,191,.20);color:#a7f3d0;
      font-size:11px;line-height:1;font-weight:1000;white-space:nowrap;
    }
    .menu-membership-left.show{display:inline-flex;}
    .menu-membership-left.warning{background:rgba(239,68,68,.13);border-color:rgba(248,113,113,.34);color:#fecaca;}
    #faceCard.primary-card,#bluetoothCard.primary-card{min-height:330px!important;padding-bottom:122px!important;}
    #faceCard.primary-card .card-icon,#bluetoothCard.primary-card .card-icon{bottom:16px!important;}
    #faceCard.primary-card .arrow-chip,#bluetoothCard.primary-card .arrow-chip{bottom:16px!important;}
    #faceCard .primary-art,#bluetoothCard .primary-art{bottom:84px!important;}
    @media(max-width:390px){
      #faceCard.primary-card,#bluetoothCard.primary-card{min-height:300px!important;padding-bottom:114px!important;}
      #faceCard .primary-art,#bluetoothCard .primary-art{bottom:82px!important;}
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
  const html = footerHtml();
  const nodes = Array.from(document.querySelectorAll(FOOTER_SELECTOR));

  nodes.forEach((el) => {
    if (!el) return;
    styleFooter(el);
    if (el.classList.contains("brand-seal")) {
      el.innerHTML = html;
    } else {
      el.innerHTML = `<div class="brand-seal">${html}</div>`;
    }
  });

  return nodes.length;
}

function appendFooterIfMissing() {
  if (document.querySelector(FOOTER_SELECTOR)) return;

  const el = document.createElement("div");
  el.className = "italky-global-footer";
  el.innerHTML = `<div class="brand-seal">${footerHtml()}</div>`;
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
  return String(user?.avatar_url || user?.picture || user?.avatar || meta.avatar_url || meta.picture || "").trim();
}

function setMenuAvatar(pic, name) {
  const avatar = document.getElementById("menuUserPic");
  if (!avatar) return;
  avatar.referrerPolicy = "no-referrer";
  avatar.onerror = () => { avatar.src = avatarFallbackDataUrl(name); };
  avatar.src = pic || avatarFallbackDataUrl(name);
  avatar.alt = String(name || "Profil");
}

async function hydrateMenuAvatarFromSession() {
  try {
    const { supabase } = await import("/js/supabase_client.js");
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const meta = user.user_metadata || {};
    const name = meta.full_name || meta.name || user.email || "italkyAI";
    const sessionPic = meta.avatar_url || meta.picture || meta.avatar || "";

    let profilePic = "";
    try {
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url,full_name,email")
        .eq("id", user.id)
        .maybeSingle();
      profilePic = String(data?.avatar_url || "").trim();
      if (data?.full_name) document.getElementById("menuUserName").textContent = data.full_name;
    } catch {}

    setMenuAvatar(sessionPic || profilePic, name);
  } catch {}
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
  return String(access.membership_ends_at || access.package_ends_at || access.subscription_ends_at || access.expires_at || raw.membership_ends_at || raw.package_ends_at || raw.subscription_ends_at || raw.expires_at || "").trim();
}

function hydrateShellExtras(access = window.__ITALKY_ACCESS__) {
  ensureGlobalFooterStyle();

  const cachedUser = readCachedUser();
  const name = cachedUser?.full_name || cachedUser?.name || cachedUser?.hitap || cachedUser?.email || "italkyAI";
  const pic = cachedAvatarUrl(cachedUser);
  setMenuAvatar(pic, name);
  hydrateMenuAvatarFromSession();

  const node = upsertMembershipNode();
  if (!node) return;

  const hasAccess = !!(access?.access_open || access?.has_active_membership || access?.is_member || access?.package_active || access?.subscription_active);
  const endsAtRaw = readAccessEndDate(access);
  const endsAt = endsAtRaw ? new Date(endsAtRaw).getTime() : NaN;
  const remainingDays = Math.ceil((endsAt - Date.now()) / 86400000);

  if (!hasAccess || !Number.isFinite(remainingDays) || remainingDays < 0) {
    node.classList.remove("show", "warning");
    node.textContent = "";
    return;
  }

  node.textContent = remainingDays <= 7 ? `! Kalan süre: ${remainingDays} gün` : `Kalan süre: ${remainingDays} gün`;
  node.classList.toggle("warning", remainingDays <= 7);
  node.classList.add("show");
}

function getSiteLang() {
  const raw = String(window.ITalkySiteLang || localStorage.getItem("site_lang") || localStorage.getItem("italky_site_lang_v1") || localStorage.getItem("siteLang") || "tr").toLowerCase();
  return raw.startsWith("en") ? "en" : "tr";
}

function setText(selector, value) {
  const el = document.querySelector(selector);
  if (el && typeof value === "string") el.textContent = value;
}

function applyHomeLanguage(lang = getSiteLang()) {
  if (!document.getElementById("faceCard")) return;
  const t = HOME_I18N[lang] || HOME_I18N.tr;

  setText(".heroTitle", t.heroTitle);
  const heroName = document.getElementById("heroUserName");
  if (heroName) {
    const current = String(heroName.textContent || "").trim();
    const first = current.includes(",") ? current.split(",")[0] : "";
    heroName.textContent = first ? `${first}, ${t.heroReady}` : t.heroWelcome;
  }

  setText("#faceCard .card-kicker", t.faceKicker);
  setText("#faceCard .card-title", t.faceTitle);
  setText("#faceCard .card-desc", t.faceDesc);
  setText("#bluetoothCard .card-kicker", t.btKicker);
  setText("#bluetoothCard .card-title", t.btTitle);
  setText("#bluetoothCard .card-desc", t.btDesc);
  setText("#guideConferenceCard .wide-kicker", t.guideKicker);
  setText("#guideConferenceCard .wide-title", t.guideTitle);
  setText("#guideConferenceCard .wide-desc", t.guideDesc);
  setText("#offlineCard .wide-title", t.offlineTitle);
  setText("#offlineCard .wide-desc", t.offlineDesc);
  setText("#textCard .wide-title", t.textTitle);
  setText("#textCard .wide-desc", t.textDesc);
  setText("#funCard .wide-title", t.funTitle);
  setText("#funCard .wide-desc", t.funDesc);
  setText("#levelCard .wide-title", t.levelTitle);
  setText("#levelCard .wide-desc", t.levelDesc);
}

function installHomeLanguagePatch() {
  if (!document.getElementById("faceCard")) return;
  applyHomeLanguage();
  window.addEventListener("italky-site-lang-changed", (event) => applyHomeLanguage(event.detail?.lang));
  document.addEventListener("italky-site-lang-ready", (event) => applyHomeLanguage(event.detail?.lang));
  setTimeout(applyHomeLanguage, 700);
  setTimeout(applyHomeLanguage, 1700);
}

function ensureMembershipCancelStyle() {
  if (document.getElementById("italkyMembershipCancelStyle")) return;
  const style = document.createElement("style");
  style.id = "italkyMembershipCancelStyle";
  style.textContent = `
    .italky-membership-cancel-btn{width:100%;min-height:50px;border-radius:17px;border:1px solid rgba(148,163,184,.20);background:rgba(255,255,255,.045);color:rgba(226,232,240,.82);font:inherit;font-size:14px;font-weight:900;cursor:pointer;display:none;align-items:center;justify-content:center;margin-top:10px;touch-action:manipulation;}
    .italky-membership-cancel-btn:active{transform:scale(.99)}
    body.signed-out #signinCancelBtn{display:flex}
    body:not(.signed-out):not(.access-open) #membershipCancelBtn{display:flex}
    body.access-open #signinCancelBtn,body.access-open #membershipCancelBtn{display:none!important}
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
  if (signinBtn && !document.getElementById("signinCancelBtn")) signinBtn.insertAdjacentElement("afterend", createCancelButton("signinCancelBtn"));
  const actions = document.querySelector(".actions");
  if (actions && !document.getElementById("membershipCancelBtn")) actions.appendChild(createCancelButton("membershipCancelBtn"));
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
        if (MEMBERSHIP_BASE_PLAN_IDS.has(rawProductId) && !rawBasePlanId) return originalBuy(MEMBERSHIP_SUBSCRIPTION_PRODUCT_ID, rawProductId);
        if (rawProductId === MEMBERSHIP_SUBSCRIPTION_PRODUCT_ID && rawBasePlanId) return originalBuy(rawProductId, rawBasePlanId);
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
  setTimeout(() => { installMembershipCancelButtons(); installMembershipBillingBridgePatch(); }, 500);
  setTimeout(installMembershipBillingBridgePatch, 1600);

  let redirected = false;
  const redirectIfActive = () => {
    if (redirected || !document.body.classList.contains("access-open")) return;
    redirected = true;
    setTimeout(() => location.replace("/hosgeldiniz"), 700);
  };
  const observer = new MutationObserver(redirectIfActive);
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  redirectIfActive();

  let callback = window.onProductDetailsLoaded;
  Object.defineProperty(window, "onProductDetailsLoaded", {
    configurable: true,
    get() { return callback; },
    set(handler) {
      if (typeof handler !== "function") { callback = handler; return; }
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
  installHomeLanguagePatch();
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
