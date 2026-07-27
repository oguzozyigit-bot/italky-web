// FILE: /js/global_access.js

import { supabase } from "/js/supabase_client.js";

const API_ACCESS = "https://italky-api.onrender.com/api/session/access-state";
const MEMBERSHIP_URL = "/pages/membership.html";
const CODE_LOAD_URL = "/pages/code_load.html";
const STANDARD_SIGNATURE_HTML = `<div class="brand-seal">italkyAI @ icanyAI By Ozyigit's 2026<span class="gokturk-signature" lang="otk" dir="rtl">𐰆𐰍𐰔 𐰇𐰔𐰘𐰃𐰏𐱅</span></div>`;

const PUBLIC_PAGES = new Set([
  "/", "/index.html", "/pages/login.html", "/pages/auth_callback.html", "/pages/membership.html",
  "/pages/about.html", "/pages/faq.html", "/pages/privacy.html", "/pages/contact.html",
  "/pages/text_translate_public.html", "/pages/game_menu_public.html", "/pages/level_test_public.html",
  "/pages/level_test_hub.html", "/pages/level_test.html", "/pages/code_load.html"
]);

const ALWAYS_OPEN_PATHS = new Set([
  "/pages/home.html", "/home.html", "/pages/membership.html", "/pages/code_load.html",
  "/pages/about.html", "/pages/privacy.html", "/pages/contact.html", "/pages/profile.html",
  "/pages/login.html", "/pages/auth_callback.html"
]);

const CODE_ACCESS_KEYS = {
  mode: "italky_access_mode",
  code: "italky_activation_code",
  session: "italky_activation_session_key",
  expires: "italky_activation_expires_at"
};

let moduleGateInstalled = false;
let pendingGateContinueUrl = "";

function normalizePath(pathname = "") {
  try {
    return String(pathname || "").split("?")[0].split("#")[0].trim().replace(/\/+$/, "") || "/";
  } catch {
    return "/";
  }
}

function isPublicPage(pathname = location.pathname) {
  return PUBLIC_PAGES.has(normalizePath(pathname));
}

function isTruthy(value) {
  return value === true || value === "true" || value === 1 || value === "1" || String(value || "").toLowerCase() === "active";
}

function cleanLower(value) {
  return String(value || "").trim().toLowerCase();
}

function isAdminRole(role) {
  const r = cleanLower(role);
  return r === "admin" || r === "superadmin";
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseTime(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function secondsUntil(value) {
  const ms = parseTime(value);
  if (!ms) return 0;
  return Math.max(0, Math.floor((ms - Date.now()) / 1000));
}

function formatRemaining(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days} Gün ${hours} Saat ${minutes} Dakika`;
  if (hours > 0) return `${hours} Saat ${minutes} Dakika`;
  if (minutes > 0) return `${minutes} Dakika`;
  return "Süre doldu";
}

function isHomePath(pathname = location.pathname) {
  const p = normalizePath(pathname);
  return p === "/pages/home.html" || p === "/home.html";
}

function isOfflineLanguagePath(pathname = "") {
  return normalizePath(pathname) === "/pages/offline_languages.html";
}

function getActiveUntil(access = {}) {
  const candidates = [
    access?.active_until,
    access?.membership_ends_at,
    access?.package_ends_at,
    access?.trial_ends_at,
    access?.subscription_ends_at,
    access?.gift_ends_at
  ].map(parseTime).filter(Boolean);
  return candidates.length ? new Date(Math.max(...candidates)).toISOString() : null;
}

function getRemainingSeconds(access = {}) {
  const direct = Number(access?.remaining_seconds);
  if (Number.isFinite(direct) && direct >= 0) return direct;
  return secondsUntil(getActiveUntil(access));
}

function resetMobileViewportState() {
  try {
    document.activeElement?.blur?.();
    document.documentElement.classList.remove("keyboard-open", "input-focus");
    document.body.classList.remove("keyboard-open", "input-focus", "ui-menu-open");
    window.scrollTo?.(0, 0);
  } catch {}
}

function goLogin() {
  resetMobileViewportState();
  try {
    const here = encodeURIComponent(location.pathname + location.search + location.hash);
    location.replace(`/pages/login.html?next=${here}`);
  } catch {
    location.href = "/pages/login.html";
  }
}

function goMembership() {
  resetMobileViewportState();
  try {
    const here = encodeURIComponent(location.pathname + location.search + location.hash);
    location.href = `${MEMBERSHIP_URL}?expired=1&next=${here}`;
  } catch {
    location.href = MEMBERSHIP_URL;
  }
}

function goCodeLoad() {
  resetMobileViewportState();
  try {
    const here = encodeURIComponent(location.pathname + location.search + location.hash);
    location.href = `${CODE_LOAD_URL}?next=${here}`;
  } catch {
    location.href = CODE_LOAD_URL;
  }
}

function standardizeShellSignature() {
  try {
    ensureSealStyle();
    document.querySelectorAll(".signature-main,.menu-sign-main").forEach((el) => {
      el.innerHTML = STANDARD_SIGNATURE_HTML;
    });
    document.querySelectorAll(".signature-dot,.signature-year,.menu-sign-dot,.menu-sign-year").forEach((el) => {
      el.textContent = "";
      el.style.display = "none";
    });
    document.body?.classList?.add("shell-ready");
  } catch {}
}

function ensureSealStyle() {
  if (document.getElementById("italkyAccessSealStyle")) return;
  const style = document.createElement("style");
  style.id = "italkyAccessSealStyle";
  style.textContent = `.brand-seal{display:block;text-align:center;line-height:1.2}.gokturk-signature{display:block;margin-top:3px;font-family:"Segoe UI Historic","Noto Sans Old Turkic",serif;font-size:12px;font-weight:900;direction:rtl;unicode-bidi:isolate}`;
  document.head.appendChild(style);
}

function injectGoturkConferenceColor() {
  try {
    if (document.getElementById("italkyGoturkConferenceStyle")) return;
    const st = document.createElement("style");
    st.id = "italkyGoturkConferenceStyle";
    st.textContent = `
      .guide-conference-card{
        background:
          radial-gradient(circle at 14% 44%, rgba(125,211,252,.30), transparent 30%) !important,
          radial-gradient(circle at 92% 14%, rgba(56,189,248,.20), transparent 32%) !important,
          linear-gradient(90deg, #0b4f6c 0%, #0f6f8f 46%, #1495b6 100%) !important;
      }
    `;
    document.head.appendChild(st);
  } catch {}
}

function getCodeAccessState() {
  try {
    const mode = localStorage.getItem(CODE_ACCESS_KEYS.mode);
    const code = localStorage.getItem(CODE_ACCESS_KEYS.code) || "";
    const sessionKey = localStorage.getItem(CODE_ACCESS_KEYS.session) || "";
    const expiresAt = localStorage.getItem(CODE_ACCESS_KEYS.expires) || "";
    if (mode !== "code" || !code || !sessionKey) return null;
    return { code, sessionKey, expiresAt };
  } catch {
    return null;
  }
}

function buildCodeAccess(codeState) {
  const code = codeState?.code || "";
  const expiresAt = codeState?.expiresAt || null;
  const remainingSeconds = secondsUntil(expiresAt);
  const active = remainingSeconds > 0;
  return buildSafeAccess({
    access_open: active,
    active_until: expiresAt,
    remaining_seconds: remainingSeconds,
    membership_status: active ? "active" : "expired",
    membership_source: "activation_code",
    membership_product_id: code,
    membership_ends_at: expiresAt,
    package_active: active,
    selected_package_code: code,
    package_ends_at: expiresAt,
    has_active_membership: active,
    is_member: active,
    no_ads: active,
    ads_disabled: active
  }, null, { codeAccess: true, code });
}

function getIOSIAPPremiumState() {
  try {
    const params = new URLSearchParams(location.search || "");
    const queryPremium = params.get("premium") === "1" || params.get("ios_iap") === "1" || params.get("purchase") === "success";
    const storedPremium = localStorage.getItem("italky_premium_active") === "1" || localStorage.getItem("italky_ios_premium_active") === "1" || sessionStorage.getItem("italky_premium_active") === "1";
    if (!queryPremium && !storedPremium) return null;
    localStorage.setItem("italky_membership_active", "1");
    localStorage.setItem("italky_membership_status", "active");
    localStorage.setItem("italky_premium_active", "1");
    localStorage.setItem("italky_ios_premium_active", "1");
    sessionStorage.setItem("italky_premium_active", "1");
    return { source: queryPremium ? "ios_iap_query" : "ios_iap_storage" };
  } catch {
    return null;
  }
}

async function getSessionOrNull() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data?.session || null;
  } catch {
    return null;
  }
}

async function fetchAccessStateSafe(session) {
  try {
    if (!session?.access_token) return null;
    const resp = await fetch(API_ACCESS, {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store"
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return null;
    return json || null;
  } catch {
    return null;
  }
}

function getUsableCachedAccessForSession(session) {
  try {
    const cached = getCachedAccessState();
    if (!cached?.access_open) return null;
    const userId = String(session?.user?.id || "");
    const cachedUserId = String(cached?.user_id || "");
    if (userId && cachedUserId && cachedUserId !== userId) return null;
    return cached;
  } catch {
    return null;
  }
}

function isReklamsizProduct(productId) {
  const p = cleanLower(productId);
  return p === "reklamsiz" || p.includes("reklamsiz") || p.includes("no_ads") || p.includes("ads_free");
}

function buildSafeAccess(access = {}, session = null, extra = {}) {
  const userId = session?.user?.id || extra?.user_id || "";
  const metadata = session?.user?.user_metadata || {};
  const email = session?.user?.email || metadata?.email || access?.email || "";
  const displayName = access?.display_name || access?.full_name || metadata?.display_name || metadata?.full_name || metadata?.name || metadata?.user_name || "";
  const fullName = access?.full_name || metadata?.full_name || displayName;
  const avatarUrl = access?.avatar_url || access?.picture || metadata?.avatar_url || metadata?.picture || "";
  const role = cleanLower(access?.role || session?.user?.user_metadata?.role || "");
  const isAdmin = isAdminRole(role);
  const isSuperadmin = role === "superadmin";
  const membershipProductId = cleanLower(access?.membership_product_id || access?.subscription_product_id || access?.package_code || access?.selected_package_code || "");
  const activeUntil = getActiveUntil(access);
  const membershipEndsAt = access?.membership_ends_at || access?.subscription_ends_at || access?.package_ends_at || access?.gift_ends_at || access?.trial_ends_at || null;
  const membershipStartedAt = access?.membership_started_at || access?.subscription_started_at || access?.package_started_at || access?.gift_started_at || access?.trial_started_at || null;
  const remainingSeconds = getRemainingSeconds({ ...access, active_until: activeUntil });
  const backendHasActiveMembership = isTruthy(access?.has_active_membership) || isTruthy(access?.is_member) || isTruthy(access?.package_active) || isTruthy(access?.subscription_active);
  const hasActiveMembership = isAdmin || isSuperadmin || (backendHasActiveMembership && remainingSeconds > 0);
  const accessOpen = isAdmin || isSuperadmin || isTruthy(access?.access_open) || hasActiveMembership || remainingSeconds > 0;
  const isReklamsiz = isReklamsizProduct(membershipProductId);
  const adsDisabled = Boolean(accessOpen || isTruthy(access?.ads_disabled) || isTruthy(access?.no_ads) || isReklamsiz);
  const tokens = safeNumber(access?.tokens ?? access?.wallet?.tokens ?? 0, 0);

  return {
    ok: !!userId || !!extra?.codeAccess,
    is_logged_in: !!userId || !!extra?.codeAccess,
    code_access: !!extra?.codeAccess,
    access_mode: extra?.codeAccess ? "code" : access?.access_mode,
    app_access_mode: extra?.codeAccess ? "code" : access?.app_access_mode,
    user_id: userId || (extra?.codeAccess ? `code:${extra.code}` : ""),
    email,
    display_name: displayName || (extra?.codeAccess ? "Kodlu Üyelik" : ""),
    full_name: fullName || (extra?.codeAccess ? "Kodlu Üyelik" : ""),
    avatar_url: avatarUrl,
    picture: avatarUrl,
    access_open: accessOpen,
    active_until: activeUntil,
    remaining_seconds: remainingSeconds,
    remaining_label: formatRemaining(remainingSeconds),
    role,
    is_admin: isAdmin,
    is_superadmin: isSuperadmin,
    tokens,
    trial_started_at: access?.trial_started_at || null,
    trial_ends_at: access?.trial_ends_at || null,
    trial_used: isTruthy(access?.trial_used),
    trial_days_left: safeNumber(access?.trial_days_left, 0),
    membership_status: accessOpen ? "active" : (access?.membership_status || "expired"),
    membership_source: access?.membership_source || "",
    membership_product_id: membershipProductId,
    membership_started_at: membershipStartedAt,
    membership_ends_at: membershipEndsAt,
    membership_last_checked_at: access?.membership_last_checked_at || null,
    package_active: hasActiveMembership,
    package_code: membershipProductId,
    selected_package_code: membershipProductId,
    package_started_at: membershipStartedAt,
    package_ends_at: membershipEndsAt,
    subscription_active: hasActiveMembership,
    subscription_product_id: membershipProductId,
    subscription_started_at: membershipStartedAt,
    subscription_ends_at: membershipEndsAt,
    is_member: hasActiveMembership,
    has_active_membership: hasActiveMembership,
    no_ads: adsDisabled,
    ads_disabled: adsDisabled,
    is_no_ads_member: adsDisabled,
    membership_date_valid: accessOpen,
    membership_status_active: accessOpen,
    is_reklamsiz_product: isReklamsiz,
    server_time: access?.server_time || null,
    raw: access || {}
  };
}

function maybeShowLowTimeToast(access) {
  try {
    const remaining = Number(access?.remaining_seconds || 0);
    if (!access?.access_open || remaining <= 0 || remaining > 3600) return;
    const key = `italky_low_time_warn_${access?.active_until || "once"}`;
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
    const toast = document.createElement("div");
    toast.id = "italkyLowTimeToast";
    toast.style.cssText = "position:fixed;left:16px;right:16px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:999998;max-width:430px;margin:auto;padding:14px 16px;border-radius:18px;background:linear-gradient(180deg,rgba(20,24,39,.98),rgba(9,13,24,.98));border:1px solid rgba(245,158,11,.28);box-shadow:0 18px 42px rgba(0,0,0,.38);color:#fff;font-family:Outfit,system-ui,sans-serif;font-size:13px;font-weight:850;line-height:1.45;text-align:center;";
    toast.textContent = "Kullanım sürenizin dolmasına 60 dakika kaldı. Kesintisiz devam etmek için gün satın alabilirsiniz.";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5200);
  } catch {}
}

function hydrateMenuAccessBadge(access) {
  try {
    document.querySelectorAll("#menuProfileTop .menu-user-meta #menuAccessTime,#menuProfileTop .menu-user-meta #menuAccessTimeValue,#menuProfileTop .menu-user-meta .menu-access-badge").forEach((el) => el.remove());
    const menuTop = document.getElementById("menuProfileTop");
    if (!menuTop) { standardizeShellSignature(); return; }
    let card = document.getElementById("menuAccessCard");
    if (!card) {
      card = document.createElement("div");
      card.id = "menuAccessCard";
      card.setAttribute("data-no-translate", "1");
      card.style.cssText = "margin-top:10px;padding:12px;border-radius:18px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.09);display:grid;gap:9px;";
      card.innerHTML = `<div style="font-size:10px;font-weight:1000;letter-spacing:.7px;color:rgba(255,255,255,.58);text-transform:uppercase;">Kalan Süre</div><div id="menuAccessTimeValue" style="font-size:16px;font-weight:1000;line-height:1.25;color:#8bd3ff;">-</div><button id="menuBuyDaysBtn" type="button" style="width:100%;min-height:42px;border:0;border-radius:14px;background:linear-gradient(135deg,#ff5a5f,#ff2d55);color:#fff;font-size:13px;font-weight:1000;">Gün Satın Al</button>`;
      menuTop.insertAdjacentElement("afterend", card);
      document.getElementById("menuBuyDaysBtn")?.addEventListener("click", goMembership);
    }
    const value = document.getElementById("menuAccessTimeValue");
    const label = access?.remaining_label || formatRemaining(access?.remaining_seconds || 0);
    if (value) {
      value.textContent = access?.access_open ? label : "Kullanım süresi doldu";
      value.style.color = access?.access_open ? "#8bd3ff" : "#ffb4b4";
    }
    standardizeShellSignature();
  } catch {
    standardizeShellSignature();
  }
}

function closeGateModal() {
  try {
    document.getElementById("italkyAccessGateModal")?.remove();
    document.getElementById("italkyAccessExpiredModal")?.remove();
  } catch {}
}

function showGateModal({ title, text, buttons = [] }) {
  try {
    closeGateModal();
    const btnHtml = buttons.map((b, i) => `<button class="italkyGateBtn ${i === 0 ? "primary" : "secondary"}" type="button" data-action="${b.action}">${b.label}</button>`).join("");
    document.body.insertAdjacentHTML("beforeend", `<div id="italkyAccessGateModal" style="position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.62);backdrop-filter:blur(7px);padding:22px;"><div style="width:min(100%,404px);border-radius:24px;background:linear-gradient(180deg,#141827,#090d18);border:1px solid rgba(255,255,255,.11);box-shadow:0 22px 54px rgba(0,0,0,.42);padding:22px;color:#fff;font-family:Outfit,system-ui,sans-serif;text-align:center;"><div style="font-size:20px;font-weight:1000;margin-bottom:8px;">${title}</div><div style="font-size:14px;font-weight:750;line-height:1.48;color:rgba(255,255,255,.74);margin-bottom:16px;">${text}</div><div style="display:grid;gap:10px;">${btnHtml}</div></div></div>`);
    document.querySelectorAll("#italkyAccessGateModal [data-action]").forEach((btn) => btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      if (action === "membership") goMembership();
      else if (action === "code") goCodeLoad();
      else if (action === "continue") {
        const next = pendingGateContinueUrl;
        pendingGateContinueUrl = "";
        closeGateModal();
        if (next) location.href = next;
      } else closeGateModal();
    }));
    if (!document.getElementById("italkyAccessGateStyle")) {
      const st = document.createElement("style");
      st.id = "italkyAccessGateStyle";
      st.textContent = `.italkyGateBtn{width:100%;min-height:46px;border:0;border-radius:16px;color:#fff;font-size:14px;font-weight:1000;font-family:Outfit,system-ui,sans-serif}.italkyGateBtn.primary{background:linear-gradient(135deg,#ff5a5f,#ff2d55)}.italkyGateBtn.secondary{background:linear-gradient(135deg,#f59e0b,#a855f7)}.italkyGateBtn.secondary[data-action="continue"]{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.10)}`;
      document.head.appendChild(st);
    }
  } catch {}
}

async function showAccessExpiredPrompt() {
  showGateModal({
    title: "Kullanım süreniz bitti",
    text: "Kullanım süreniz bitmiştir. Devam etmek için lütfen gün satın alınız. Elinizde kod varsa Kod ile Gün Yükle sayfasından kodunuzu da girebilirsiniz.",
    buttons: [
      { label: "Gün Satın Al", action: "membership" },
      { label: "Kod ile Gün Yükle", action: "code" }
    ]
  });
  await new Promise((resolve) => setTimeout(resolve, 250));
}

function showLowTimeChoicePrompt(continueUrl = "") {
  pendingGateContinueUrl = continueUrl || "";
  showGateModal({
    title: "Kullanım süreniz azalıyor",
    text: "Kullanım sürenizin dolmasına 60 dakikadan az kaldı. Kesintisiz devam etmek için gün satın alabilirsiniz.",
    buttons: [
      { label: "Gün Satın Al", action: "membership" },
      { label: "Devam Et", action: "continue" }
    ]
  });
}

function showOfflineDownloadBlockedPrompt() {
  showGateModal({
    title: "Offline indirme için süre yetersiz",
    text: "Offline dil paketi indirmek için kullanım sürenizin en az 24 saat olması gerekir. Lütfen gün satın alarak devam edin.",
    buttons: [
      { label: "Gün Satın Al", action: "membership" },
      { label: "Kod ile Gün Yükle", action: "code" }
    ]
  });
}

function installGlobalModuleGate(access) {
  try {
    window.__ITALKY_ACCESS__ = access;
    if (moduleGateInstalled) return;
    moduleGateInstalled = true;
    document.addEventListener("click", (event) => {
      const link = event.target?.closest?.("a[href]");
      if (!link) return;
      const href = String(link.getAttribute("href") || "").trim();
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || /^https?:\/\//i.test(href)) return;
      let targetPath = "";
      try { targetPath = normalizePath(new URL(href, location.origin).pathname); } catch { targetPath = normalizePath(href); }
      if (ALWAYS_OPEN_PATHS.has(targetPath)) return;
      const current = getCachedAccessState();
      const remaining = getRemainingSeconds(current);
      const isAdmin = current?.is_admin || current?.is_superadmin;
      if (isOfflineLanguagePath(targetPath) && !isAdmin && remaining < 86460) {
        event.preventDefault();
        event.stopPropagation();
        showOfflineDownloadBlockedPrompt();
        return;
      }
      if (!isAdmin && remaining <= 0) {
        event.preventDefault();
        event.stopPropagation();
        showAccessExpiredPrompt();
        return;
      }
      if (!isAdmin && remaining > 0 && remaining < 3600) {
        event.preventDefault();
        event.stopPropagation();
        showLowTimeChoicePrompt(link.href || href);
      }
    }, true);
  } catch {}
}

async function guardActiveAccess(session, safe, currentPath, allowPublicPageBypass, publicPage) {
  if (safe?.access_open) return false;
  if (!session?.user?.id) return false;
  if (safe?.is_admin || safe?.is_superadmin) return false;
  if (currentPath === "/pages/membership.html" || currentPath === "/pages/code_load.html" || isHomePath(currentPath)) return false;
  if (allowPublicPageBypass && publicPage) return false;
  await showAccessExpiredPrompt();
  return true;
}

function setCachedAccess(access) {
  try {
    window.__ITALKY_ACCESS__ = access;
    localStorage.setItem("italky_access_state", JSON.stringify(access));
    hydrateMenuAccessBadge(access);
    maybeShowLowTimeToast(access);
    standardizeShellSignature();
    injectGoturkConferenceColor();
    installGlobalModuleGate(access);
  } catch {}
}

function dispatchAccessReady(access) {
  try {
    standardizeShellSignature();
    injectGoturkConferenceColor();
    window.dispatchEvent(new CustomEvent("italkyAccessReady", { detail: access }));
  } catch {}
}

export async function initGlobalAccess(options = {}) {
  standardizeShellSignature();
  injectGoturkConferenceColor();
  const { allowPublicPageBypass = true, lockMembershipBack = false } = options;
  const currentPath = normalizePath(location.pathname);
  const publicPage = isPublicPage(currentPath);
  const codeState = getCodeAccessState();

  if (codeState) {
    const codeAccess = buildCodeAccess(codeState);
    setCachedAccess(codeAccess);
    dispatchAccessReady(codeAccess);
    if (!codeAccess.access_open && currentPath !== "/pages/membership.html" && currentPath !== "/pages/code_load.html" && !isHomePath(currentPath)) await showAccessExpiredPrompt();
    return { ok: true, code_access: true, session: null, access: codeAccess };
  }

  const iosIAPState = getIOSIAPPremiumState();
  const session = await getSessionOrNull();

  if (iosIAPState && session?.user?.id) {
    if (allowPublicPageBypass && lockMembershipBack && currentPath === "/pages/membership.html") lockMembershipPageBack();
    const access = await fetchAccessStateSafe(session) || {};
    access.access_open = true;
    access.has_active_membership = true;
    access.is_member = true;
    access.package_active = true;
    access.subscription_active = true;
    access.no_ads = true;
    access.ads_disabled = true;
    access.membership_status = "active";
    access.membership_source = "ios_iap";
    const safe = buildSafeAccess(access, session);
    setCachedAccess(safe);
    dispatchAccessReady(safe);
    return { ok: true, session, access: safe };
  }

  if (session?.user?.id) {
    if (allowPublicPageBypass && lockMembershipBack && currentPath === "/pages/membership.html") lockMembershipPageBack();
    const access = await fetchAccessStateSafe(session) || getUsableCachedAccessForSession(session);
    const safe = buildSafeAccess(access || {}, session);
    setCachedAccess(safe);
    dispatchAccessReady(safe);
    const blocked = await guardActiveAccess(session, safe, currentPath, allowPublicPageBypass, publicPage);
    if (blocked) return { ok: false, redirected: "access_options", session, access: safe };
    return { ok: true, session, access: safe };
  }

  if (allowPublicPageBypass && publicPage) {
    if (lockMembershipBack && currentPath === "/pages/membership.html") lockMembershipPageBack();
    const safe = buildSafeAccess({}, null);
    setCachedAccess(safe);
    dispatchAccessReady(safe);
    return { ok: true, bypass: true, public_page: true, session: null, access: safe };
  }

  // Ortak icany bridge — tek Google (icany) ile home / konuş (italky oturumu yoksa)
  try {
    const pool = JSON.parse(localStorage.getItem("icany_shared_pool_v1") || "null");
    if (pool?.memberId && pool?.email) {
      const bridgeAccess = buildSafeAccess(
        {
          access_open: true,
          has_active_membership: true,
          is_member: true,
          package_active: true,
          subscription_active: true,
          membership_status: "active",
          membership_source: "icany_bridge",
          tokens: Number(pool.tokenBalance || 0),
          remaining_seconds: 86400 * 30
        },
        null
      );
      setCachedAccess(bridgeAccess);
      dispatchAccessReady(bridgeAccess);
      return { ok: true, icany_bridge: true, session: null, access: bridgeAccess };
    }
  } catch {}

  goLogin();
  return { ok: false, redirected: "login", session: null, access: buildSafeAccess({}, null) };
}

export function getCachedAccessState() {
  try {
    return window.__ITALKY_ACCESS__ || JSON.parse(localStorage.getItem("italky_access_state") || "null") || {
      ok: false,
      is_logged_in: false,
      access_open: false,
      tokens: 0,
      role: "",
      is_admin: false,
      is_superadmin: false,
      has_active_membership: false,
      is_member: false,
      ads_disabled: false,
      no_ads: false,
      is_no_ads_member: false,
      remaining_seconds: 0,
      remaining_label: "Süre doldu"
    };
  } catch {
    return { ok: false, is_logged_in: false, access_open: false, tokens: 0, role: "", is_admin: false, is_superadmin: false, has_active_membership: false, is_member: false, ads_disabled: false, no_ads: false, is_no_ads_member: false, remaining_seconds: 0, remaining_label: "Süre doldu" };
  }
}

export function isCurrentUserAdsDisabled() {
  const access = getCachedAccessState();
  return Boolean(isTruthy(access?.ads_disabled) || isTruthy(access?.no_ads) || isTruthy(access?.is_no_ads_member) || isTruthy(access?.subscription_active) || isTruthy(access?.has_active_membership) || isTruthy(access?.is_member) || isTruthy(access?.is_admin) || isTruthy(access?.is_superadmin));
}

export function lockMembershipPageBack() {
  try {
    const currentPath = normalizePath(location.pathname);
    if (currentPath !== "/pages/membership.html") return;
    const here = location.pathname + location.search + location.hash;
    history.replaceState({ membershipLock: true }, "", here);
    history.pushState({ membershipLock: true }, "", here);
    window.addEventListener("popstate", () => {
      try { history.pushState({ membershipLock: true }, "", here); } catch {}
    });
  } catch {}
}
