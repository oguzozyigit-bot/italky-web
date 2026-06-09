// FILE: /js/global_access_ios.js

import { supabase } from "/js/supabase_client.js";

const API_ACCESS = "https://italky-api.onrender.com/api/session/access-state";
const IOS_DAYS_URL = "/pages/ios_days.html?ios=1";
const STANDARD_SIGNATURE = "italkyAI By Özyiğit's 2026";

const PUBLIC_PAGES = new Set([
  "/",
  "/index.html",
  "/pages/login_ios.html",
  "/pages/auth_callback.html",
  "/pages/ios_days.html",
  "/pages/ios_iap_confirm.html",
  "/pages/about.html",
  "/pages/faq.html",
  "/pages/privacy.html",
  "/pages/contact.html",
  "/pages/terms.html"
]);

const ALWAYS_OPEN_PATHS = new Set([
  "/pages/home_ios.html",
  "/facetoface_ios.html",
  "/pages/ios_days.html",
  "/pages/ios_iap_confirm.html",
  "/pages/about.html",
  "/pages/privacy.html",
  "/pages/contact.html",
  "/pages/terms.html",
  "/pages/login_ios.html",
  "/pages/auth_callback.html"
]);

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
  return value === true || value === "true" || value === 1 || value === "1";
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanLower(value) {
  return String(value || "").trim().toLowerCase();
}

function isAdminRole(role) {
  const r = cleanLower(role);
  return r === "admin" || r === "superadmin";
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
  if (days > 0) return `${days} Gun ${hours} Saat ${minutes} Dakika`;
  if (hours > 0) return `${hours} Saat ${minutes} Dakika`;
  if (minutes > 0) return `${minutes} Dakika`;
  return "Sure doldu";
}

function isIOSHomePath(pathname = location.pathname) {
  return normalizePath(pathname) === "/pages/home_ios.html";
}

function isIOSDaysPath(pathname = location.pathname) {
  return normalizePath(pathname) === "/pages/ios_days.html";
}

function isOfflineLanguagePath(pathname = "") {
  const p = normalizePath(pathname);
  return p === "/pages/offline_languages.html" || p === "/pages/offline_languages_ios.html";
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
  if (!candidates.length) return null;
  return new Date(Math.max(...candidates)).toISOString();
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
    for (const el of [document.documentElement, document.body]) {
      el.style.transform = "";
      el.style.height = "";
      el.style.minHeight = "";
      el.style.overflow = "";
      el.style.position = "";
      el.style.top = "";
      el.style.bottom = "";
    }
    window.scrollTo?.(0, 0);
  } catch {}
}

function goLogin() {
  resetMobileViewportState();
  try {
    const here = encodeURIComponent(location.pathname + location.search + location.hash);
    location.replace(`/pages/login_ios.html?next=${here}`);
  } catch {
    location.href = "/pages/login_ios.html";
  }
}

function goDays() {
  resetMobileViewportState();
  try {
    const here = encodeURIComponent(location.pathname + location.search + location.hash);
    location.href = `${IOS_DAYS_URL}&next=${here}`;
  } catch {
    location.href = IOS_DAYS_URL;
  }
}

async function getSessionOrNull() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("[global_access_ios] getSession error:", error);
      return null;
    }
    return data?.session || null;
  } catch (err) {
    console.warn("[global_access_ios] getSession exception:", err);
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
    if (!resp.ok) {
      console.warn("[global_access_ios] access-state not ok:", resp.status, json);
      return null;
    }
    return json || null;
  } catch (err) {
    console.warn("[global_access_ios] access-state fetch failed:", err);
    return null;
  }
}

function buildSafeAccess(access = {}, session = null) {
  const userId = session?.user?.id || "";
  const metadata = session?.user?.user_metadata || {};
  const email = session?.user?.email || metadata?.email || access?.email || "";
  const displayName = access?.display_name || access?.full_name || metadata?.display_name || metadata?.full_name || metadata?.name || metadata?.user_name || "";
  const fullName = access?.full_name || metadata?.full_name || displayName;
  const avatarUrl = access?.avatar_url || access?.picture || metadata?.avatar_url || metadata?.picture || "";
  const role = cleanLower(access?.role || session?.user?.user_metadata?.role || "");
  const tokens = safeNumber(access?.tokens ?? access?.wallet?.tokens ?? 0, 0);
  const membershipStatus = cleanLower(access?.membership_status || "");
  const membershipProductId = cleanLower(access?.membership_product_id || access?.subscription_product_id || access?.package_code || access?.selected_package_code || "");
  const activeUntil = getActiveUntil(access);
  const membershipEndsAt = access?.membership_ends_at || access?.subscription_ends_at || access?.package_ends_at || access?.gift_ends_at || access?.trial_ends_at || null;
  const membershipStartedAt = access?.membership_started_at || access?.subscription_started_at || access?.package_started_at || access?.gift_started_at || access?.trial_started_at || null;
  const isAdmin = isAdminRole(role);
  const isSuperadmin = role === "superadmin";
  const remainingSeconds = getRemainingSeconds({ ...access, active_until: activeUntil });
  const backendHasActiveMembership = isTruthy(access?.has_active_membership) || isTruthy(access?.is_member) || isTruthy(access?.package_active) || isTruthy(access?.subscription_active);
  const hasActiveMembership = Boolean(isAdmin || (backendHasActiveMembership && remainingSeconds > 0) || (membershipStatus === "active" && remainingSeconds > 0));
  const subscriptionActive = Boolean(isTruthy(access?.subscription_active));
  const accessOpen = Boolean(isAdmin || isTruthy(access?.access_open) || hasActiveMembership || remainingSeconds > 0);
  const adsDisabled = Boolean(isAdmin || isTruthy(access?.ads_disabled) || isTruthy(access?.no_ads) || isTruthy(access?.is_no_ads_member) || hasActiveMembership);

  return {
    ok: !!userId,
    is_logged_in: !!userId,
    user_id: userId,
    email,
    display_name: displayName,
    full_name: fullName,
    avatar_url: avatarUrl,
    picture: avatarUrl,
    access_open: accessOpen,
    active_until: activeUntil,
    remaining_seconds: remainingSeconds,
    remaining_label: formatRemaining(remainingSeconds),
    role,
    is_admin: role === "admin",
    is_superadmin: isSuperadmin,
    tokens,
    trial_started_at: access?.trial_started_at || null,
    trial_ends_at: access?.trial_ends_at || null,
    trial_used: isTruthy(access?.trial_used),
    trial_days_left: safeNumber(access?.trial_days_left, 0),
    gift_started_at: access?.gift_started_at || access?.trial_started_at || null,
    gift_ends_at: access?.gift_ends_at || access?.trial_ends_at || null,
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
    subscription_active: subscriptionActive,
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
    is_reklamsiz_product: false,
    server_time: access?.server_time || null,
    raw: access || {}
  };
}

function standardizeShellSignature() {
  try {
    document.querySelectorAll(".signature-main,.menu-sign-main,.footer").forEach((el) => {
      el.textContent = STANDARD_SIGNATURE;
    });
    document.querySelectorAll(".signature-dot,.signature-year,.menu-sign-dot,.menu-sign-year").forEach((el) => {
      el.textContent = "";
      el.style.display = "none";
    });
    document.body?.classList?.add("shell-ready");
  } catch {}
}

function disableIOSOfflineLinks() {
  try {
    document.querySelectorAll("a[href],a[data-ios-offline-disabled]").forEach((link) => {
      const rawHref = String(link.getAttribute("href") || "");
      let targetPath = "";
      try {
        targetPath = normalizePath(new URL(rawHref || "#", location.origin).pathname);
      } catch {
        targetPath = normalizePath(rawHref);
      }
      if (!isOfflineLanguagePath(targetPath) && link.getAttribute("data-ios-offline-disabled") !== "1") return;
      link.setAttribute("data-ios-offline-disabled", "1");
      link.setAttribute("aria-hidden", "true");
      link.setAttribute("tabindex", "-1");
      link.classList.add("hidden");
      link.style.display = "none";
    });
  } catch {}
}

function maybeShowLowTimeToast(access) {
  try {
    const remaining = Number(access?.remaining_seconds || 0);
    if (!access?.access_open || remaining <= 0 || remaining > 3600) return;
    const key = `italky_ios_low_time_warn_${access?.active_until || "once"}`;
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
    const toast = document.createElement("div");
    toast.id = "italkyIOSLowTimeToast";
    toast.style.cssText = "position:fixed;left:16px;right:16px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:999998;max-width:430px;margin:auto;padding:14px 16px;border-radius:18px;background:linear-gradient(180deg,rgba(20,24,39,.98),rgba(9,13,24,.98));border:1px solid rgba(245,158,11,.28);box-shadow:0 18px 42px rgba(0,0,0,.38);color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:850;line-height:1.45;text-align:center;";
    toast.textContent = "Kullanim surenizin dolmasina 60 dakika kaldi. Kesintisiz devam etmek icin gun yukleyebilirsiniz.";
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5200);
  } catch {}
}

function hydrateMenuAccessBadge(access) {
  try {
    document.querySelectorAll("#menuProfileTop .menu-user-meta #menuAccessTime,#menuProfileTop .menu-user-meta #menuAccessTimeValue,#menuProfileTop .menu-user-meta .menu-access-badge").forEach((el) => el.remove());
    const menuTop = document.getElementById("menuProfileTop");
    if (!menuTop) {
      standardizeShellSignature();
      return;
    }
    let card = document.getElementById("menuAccessCard");
    if (!card) {
      card = document.createElement("div");
      card.id = "menuAccessCard";
      card.setAttribute("data-no-translate", "1");
      card.style.cssText = "margin-top:10px;padding:12px;border-radius:18px;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.09);display:grid;gap:9px;";
      card.innerHTML = `<div style="font-size:10px;font-weight:1000;letter-spacing:.7px;color:rgba(255,255,255,.58);text-transform:uppercase;">Kalan Sure</div><div id="menuAccessTimeValue" style="font-size:16px;font-weight:1000;line-height:1.25;color:#8bd3ff;">-</div><button id="menuBuyDaysBtn" type="button" style="width:100%;min-height:42px;border:0;border-radius:14px;background:linear-gradient(135deg,#ff5a5f,#ff2d55);color:#fff;font-size:13px;font-weight:1000;">Gun Yukle</button>`;
      menuTop.insertAdjacentElement("afterend", card);
      document.getElementById("menuBuyDaysBtn")?.addEventListener("click", goDays);
    }
    const value = document.getElementById("menuAccessTimeValue");
    const label = access?.remaining_label || formatRemaining(access?.remaining_seconds || 0);
    if (value) {
      value.textContent = access?.access_open ? label : "Kullanim suresi doldu";
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
    document.body.insertAdjacentHTML("beforeend", `<div id="italkyAccessGateModal" style="position:fixed;inset:0;z-index:999999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.62);backdrop-filter:blur(7px);padding:22px;"><div style="width:min(100%,404px);border-radius:24px;background:linear-gradient(180deg,#141827,#090d18);border:1px solid rgba(255,255,255,.11);box-shadow:0 22px 54px rgba(0,0,0,.42);padding:22px;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;text-align:center;"><div style="font-size:20px;font-weight:1000;margin-bottom:8px;">${title}</div><div style="font-size:14px;font-weight:750;line-height:1.48;color:rgba(255,255,255,.74);margin-bottom:16px;">${text}</div><div style="display:grid;gap:10px;">${btnHtml}</div></div></div>`);
    document.querySelectorAll("#italkyAccessGateModal [data-action]").forEach((btn) => btn.addEventListener("click", () => {
      const action = btn.getAttribute("data-action");
      if (action === "days") goDays();
      else if (action === "continue") {
        const next = pendingGateContinueUrl;
        pendingGateContinueUrl = "";
        closeGateModal();
        if (next) location.href = next;
      } else {
        closeGateModal();
      }
    }));
    if (!document.getElementById("italkyAccessGateStyle")) {
      const st = document.createElement("style");
      st.id = "italkyAccessGateStyle";
      st.textContent = `.italkyGateBtn{width:100%;min-height:46px;border:0;border-radius:16px;color:#fff;font-size:14px;font-weight:1000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}.italkyGateBtn.primary{background:linear-gradient(135deg,#ff5a5f,#ff2d55)}.italkyGateBtn.secondary{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.10)}`;
      document.head.appendChild(st);
    }
  } catch {}
}

async function showAccessExpiredPrompt() {
  showGateModal({
    title: "Kullanim sureniz doldu",
    text: "Kullanim sureniz doldu. Devam etmek icin iOS Gun Yukle sayfasindan sure ekleyebilirsiniz.",
    buttons: [{ label: "Gun Yukle", action: "days" }]
  });
  await new Promise((resolve) => setTimeout(resolve, 250));
}

function showLowTimeChoicePrompt(continueUrl = "") {
  pendingGateContinueUrl = continueUrl || "";
  showGateModal({
    title: "Kullanim sureniz azaliyor",
    text: "Kullanim surenizin dolmasina 60 dakikadan az kaldi. Kesintisiz devam etmek icin gun yukleyebilirsiniz.",
    buttons: [{ label: "Gun Yukle", action: "days" }, { label: "Devam Et", action: "continue" }]
  });
}

function showIOSOfflineUnsupportedPrompt() {
  showGateModal({
    title: "Offline diller",
    text: "iOS'ta cevrimdisi dil paketleri su anda desteklenmiyor.",
    buttons: [{ label: "Tamam", action: "close" }]
  });
}

function installGlobalModuleGate(access) {
  try {
    window.__ITALKY_ACCESS__ = access;
    disableIOSOfflineLinks();
    if (moduleGateInstalled) return;
    moduleGateInstalled = true;
    document.addEventListener("click", (event) => {
      const link = event.target?.closest?.("a[href],a[data-ios-offline-disabled]");
      if (!link) return;
      const href = String(link.getAttribute("href") || "").trim();
      if (link.getAttribute("data-ios-offline-disabled") === "1") {
        event.preventDefault();
        event.stopPropagation();
        showIOSOfflineUnsupportedPrompt();
        return;
      }
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || /^https?:\/\//i.test(href)) return;
      let targetPath = "";
      try {
        targetPath = normalizePath(new URL(href, location.origin).pathname);
      } catch {
        targetPath = normalizePath(href);
      }
      if (isOfflineLanguagePath(targetPath)) {
        event.preventDefault();
        event.stopPropagation();
        showIOSOfflineUnsupportedPrompt();
        return;
      }
      if (ALWAYS_OPEN_PATHS.has(targetPath)) return;
      const current = getCachedAccessState();
      const remaining = getRemainingSeconds(current);
      const isAdmin = current?.is_admin || current?.is_superadmin;
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
  if (isIOSHomePath(currentPath) || isIOSDaysPath(currentPath)) return false;
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
    installGlobalModuleGate(access);
    disableIOSOfflineLinks();
  } catch {}
}

function dispatchAccessReady(access) {
  try {
    standardizeShellSignature();
    disableIOSOfflineLinks();
    window.dispatchEvent(new CustomEvent("italkyAccessReady", { detail: access }));
  } catch {}
}

export async function initGlobalAccess(options = {}) {
  standardizeShellSignature();
  disableIOSOfflineLinks();
  const { allowPublicPageBypass = true } = options;
  const currentPath = normalizePath(location.pathname);
  const publicPage = isPublicPage(currentPath);
  const session = await getSessionOrNull();
  if (session?.user?.id) {
    const access = await fetchAccessStateSafe(session);
    const safe = buildSafeAccess(access || {}, session);
    setCachedAccess(safe);
    dispatchAccessReady(safe);
    const blocked = await guardActiveAccess(session, safe, currentPath, allowPublicPageBypass, publicPage);
    if (blocked) return { ok: false, redirected: "access_options", session, access: safe };
    return { ok: true, session, access: safe };
  }

  if (allowPublicPageBypass && publicPage) {
    const safe = buildSafeAccess({}, null);
    setCachedAccess(safe);
    dispatchAccessReady(safe);
    return { ok: true, bypass: true, public_page: true, session: null, access: safe };
  }

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
      remaining_label: "Sure doldu"
    };
  } catch {
    return {
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
      remaining_label: "Sure doldu"
    };
  }
}

export function isCurrentUserAdsDisabled() {
  const access = getCachedAccessState();
  return Boolean(
    isTruthy(access?.ads_disabled) ||
    isTruthy(access?.no_ads) ||
    isTruthy(access?.is_no_ads_member) ||
    isTruthy(access?.has_active_membership) ||
    isTruthy(access?.is_member) ||
    isTruthy(access?.is_admin) ||
    isTruthy(access?.is_superadmin)
  );
}
