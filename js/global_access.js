// FILE: /js/global_access.js

import { supabase } from "/js/supabase_client.js";

const API_ACCESS = "https://italky-api.onrender.com/api/session/access-state";

/*
  Public sayfalar:
  Bu sayfalarda kullanıcı giriş yapmamış olsa bile sayfa açılır.
  Login öncesi FaceToFace / oyun / seviye / yazıdan çeviri gibi alanlar burada kalmalı.
*/
const PUBLIC_PAGES = new Set([
  "/",
  "/index.html",

  "/pages/login.html",
  "/pages/auth_callback.html",
  "/pages/membership.html",

  "/pages/about.html",
  "/pages/faq.html",
  "/pages/privacy.html",
  "/pages/contact.html",

  "/pages/text_translate_public.html",
  "/pages/game_menu_public.html",
  "/pages/level_test_public.html",
  "/pages/level_test_hub.html",
  "/pages/level_test.html",

  "/pages/word_cracker.html",
  "/pages/echo_rush.html",
  "/pages/gap_master.html",
  "/pages/glitch.html",
  "/pages/hangman.html",
  "/pages/memory_pulse.html",
  "/pages/meteor.html",
  "/pages/morse_game.html",
  "/pages/neural_box.html",
  "/pages/duo_friend.html",
  "/pages/sentence_master.html",
  "/pages/signal_hunt.html"
]);

const CODE_ACCESS_KEYS = {
  mode: "italky_access_mode",
  code: "italky_activation_code",
  session: "italky_activation_session_key",
  expires: "italky_activation_expires_at"
};

function normalizePath(pathname = "") {
  try {
    return String(pathname || "")
      .split("?")[0]
      .split("#")[0]
      .trim()
      .replace(/\/+$/, "") || "/";
  } catch {
    return "/";
  }
}

function isPublicPage(pathname = location.pathname) {
  const clean = normalizePath(pathname);
  return PUBLIC_PAGES.has(clean);
}

function isTruthy(value) {
  return value === true || value === "true" || value === 1 || value === "1";
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
  return {
    ok: true,
    is_logged_in: true,
    code_access: true,
    access_mode: "code",
    app_access_mode: "code",
    user_id: `code:${code}`,
    email: "",
    display_name: "Kodlu Üyelik",
    full_name: "Kodlu Üyelik",
    access_open: true,
    role: "",
    is_admin: false,
    is_superadmin: false,
    tokens: 0,
    trial_started_at: null,
    trial_ends_at: null,
    trial_used: false,
    trial_days_left: 0,
    gift_started_at: null,
    gift_ends_at: expiresAt,
    membership_status: "active",
    membership_source: "activation_code",
    membership_product_id: code,
    membership_started_at: null,
    membership_ends_at: expiresAt,
    membership_last_checked_at: null,
    package_active: true,
    package_code: code,
    selected_package_code: code,
    package_started_at: null,
    package_ends_at: expiresAt,
    subscription_active: false,
    subscription_product_id: "",
    subscription_started_at: null,
    subscription_ends_at: null,
    is_member: true,
    has_active_membership: true,
    no_ads: true,
    ads_disabled: true,
    is_no_ads_member: true,
    membership_date_valid: true,
    membership_status_active: true,
    is_reklamsiz_product: false,
    server_time: null,
    raw: { code_access: true, code, expires_at: expiresAt }
  };
}

function safeStorageGet(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(storage, key, value) {
  try {
    storage.setItem(key, value);
  } catch {}
}

function getIOSIAPPremiumState() {
  try {
    const params = new URLSearchParams(location.search || "");
    const queryPremium =
      params.get("premium") === "1" ||
      params.get("ios_iap") === "1" ||
      params.get("purchase") === "success";

    const storedPremium =
      safeStorageGet(localStorage, "italky_premium_active") === "1" ||
      safeStorageGet(localStorage, "italky_ios_premium_active") === "1" ||
      safeStorageGet(sessionStorage, "italky_premium_active") === "1";

    if (!queryPremium && !storedPremium) return null;

    safeStorageSet(localStorage, "italky_membership_active", "1");
    safeStorageSet(localStorage, "italky_membership_status", "active");
    safeStorageSet(localStorage, "italky_premium_active", "1");
    safeStorageSet(localStorage, "italky_ios_premium_active", "1");
    safeStorageSet(localStorage, "italky_premium_source", "ios_iap");
    safeStorageSet(sessionStorage, "italky_membership_active", "1");
    safeStorageSet(sessionStorage, "italky_premium_active", "1");

    return { source: queryPremium ? "ios_iap_query" : "ios_iap_storage" };
  } catch {
    return null;
  }
}

function mergeIOSIAPPremiumFlags(access = {}, iapState = null) {
  if (!iapState) return access;
  return {
    ...access,
    ios_iap_access: true,
    access_open: true,
    has_active_membership: true,
    is_member: true,
    package_active: true,
    subscription_active: true,
    no_ads: true,
    ads_disabled: true,
    is_no_ads_member: true,
    membership_status: "active",
    membership_source: "ios_iap",
    membership_status_active: true,
    raw: {
      ...(access?.raw || {}),
      ios_iap_access: true,
      ios_iap_source: iapState?.source || "ios_iap"
    }
  };
}

async function getSessionOrNull() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("[global_access] getSession error:", error);
      return null;
    }

    return data?.session || null;
  } catch (err) {
    console.warn("[global_access] getSession exception:", err);
    return null;
  }
}

async function fetchAccessStateSafe(session) {
  try {
    if (!session?.access_token) return null;

    const resp = await fetch(API_ACCESS, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`
      },
      cache: "no-store"
    });

    const json = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      console.warn("[global_access] access-state not ok:", resp.status, json);
      return null;
    }

    return json || null;
  } catch (err) {
    console.warn("[global_access] access-state fetch failed:", err);
    return null;
  }
}

function goLogin() {
  try {
    const here = encodeURIComponent(location.pathname + location.search + location.hash);
    location.replace(`/pages/login.html?next=${here}`);
  } catch {
    location.href = "/pages/login.html";
  }
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

function isReklamsizProduct(productId) {
  const p = cleanLower(productId);
  return (
    p === "reklamsiz" ||
    p.includes("reklamsiz") ||
    p.includes("no_ads") ||
    p.includes("ads_free")
  );
}

function buildSafeAccess(access = {}, session = null) {
  const userId = session?.user?.id || "";
  const metadata = session?.user?.user_metadata || {};
  const email = session?.user?.email || metadata?.email || access?.email || "";
  const displayName =
    access?.display_name ||
    access?.full_name ||
    metadata?.display_name ||
    metadata?.full_name ||
    metadata?.name ||
    metadata?.user_name ||
    "";
  const fullName = access?.full_name || metadata?.full_name || displayName;
  const avatarUrl = access?.avatar_url || access?.picture || metadata?.avatar_url || metadata?.picture || "";

  const role = cleanLower(
    access?.role ||
    session?.user?.user_metadata?.role ||
    ""
  );

  const tokens = safeNumber(
    access?.tokens ??
    access?.wallet?.tokens ??
    0,
    0
  );

  const membershipStatus = cleanLower(access?.membership_status || "");
  const membershipProductId = cleanLower(
    access?.membership_product_id ||
    access?.subscription_product_id ||
    access?.package_code ||
    access?.selected_package_code ||
    ""
  );

  const membershipEndsAt =
    access?.membership_ends_at ||
    access?.subscription_ends_at ||
    access?.package_ends_at ||
    access?.gift_ends_at ||
    access?.trial_ends_at ||
    null;

  const membershipStartedAt =
    access?.membership_started_at ||
    access?.subscription_started_at ||
    access?.package_started_at ||
    access?.gift_started_at ||
    access?.trial_started_at ||
    null;

  const isAdmin = isAdminRole(role);
  const isSuperadmin = role === "superadmin";
  const isReklamsiz = isReklamsizProduct(membershipProductId);

  const backendHasActiveMembership =
    isTruthy(access?.has_active_membership) ||
    isTruthy(access?.is_member) ||
    isTruthy(access?.package_active) ||
    isTruthy(access?.subscription_active);

  const backendAdsDisabled =
    isTruthy(access?.ads_disabled) ||
    isTruthy(access?.no_ads) ||
    isTruthy(access?.is_no_ads_member);

  const hasActiveMembership = Boolean(
    isAdmin ||
    backendHasActiveMembership ||
    (
      membershipStatus === "active" &&
      !!membershipEndsAt
    )
  );

  const subscriptionActive = Boolean(
    isTruthy(access?.subscription_active) ||
    (
      hasActiveMembership &&
      isReklamsiz
    )
  );

  const adsDisabled = Boolean(
    isAdmin ||
    backendAdsDisabled ||
    subscriptionActive ||
    hasActiveMembership
  );

  /*
    KRİTİK:
    access_open artık uygulamaya giriş kapısı değildir.
    Giriş yapan kullanıcı uygulamaya girer.
    Reklam / jeton / modül kilidi ilgili modülün kendi içinde yönetilir.
  */
  const accessOpen = !!userId;

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

    membership_status: access?.membership_status || "",
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

    membership_date_valid: isTruthy(access?.membership_date_valid),
    membership_status_active: isTruthy(access?.membership_status_active),
    is_reklamsiz_product: isReklamsiz,

    server_time: access?.server_time || null,

    raw: access || {}
  };
}

function setCachedAccess(access) {
  try {
    window.__ITALKY_ACCESS__ = access;
  } catch {}
}

function dispatchAccessReady(access) {
  try {
    window.dispatchEvent(
      new CustomEvent("italkyAccessReady", {
        detail: access
      })
    );
  } catch {}
}

export async function initGlobalAccess(options = {}) {
  const {
    allowPublicPageBypass = true,
    lockMembershipBack = false
  } = options;

  const currentPath = normalizePath(location.pathname);
  const publicPage = isPublicPage(currentPath);
  const codeState = getCodeAccessState();

  if (codeState) {
    const codeAccess = buildCodeAccess(codeState);
    setCachedAccess(codeAccess);
    dispatchAccessReady(codeAccess);
    return {
      ok: true,
      code_access: true,
      session: null,
      access: codeAccess
    };
  }

  const iosIAPState = getIOSIAPPremiumState();

  if (iosIAPState) {
    const session = await getSessionOrNull();

    if (session?.user?.id) {
      if (allowPublicPageBypass && lockMembershipBack && currentPath === "/pages/membership.html") {
        lockMembershipPageBack();
      }

      const access = await fetchAccessStateSafe(session);
      const safe = mergeIOSIAPPremiumFlags(buildSafeAccess(access || {}, session), iosIAPState);

      setCachedAccess(safe);
      dispatchAccessReady(safe);

      return {
        ok: true,
        session,
        access: safe
      };
    }

    console.warn("[global_access] ios_iap state ignored because there is no Supabase session");

    if (!(allowPublicPageBypass && publicPage)) {
      goLogin();

      return {
        ok: false,
        redirected: "login",
        session: null,
        access: buildSafeAccess({}, null)
      };
    }
  }

  const session = await getSessionOrNull();

  if (session?.user?.id) {
    if (allowPublicPageBypass && lockMembershipBack && currentPath === "/pages/membership.html") {
      lockMembershipPageBack();
    }

    const access = await fetchAccessStateSafe(session);
    const safe = buildSafeAccess(access || {}, session);

    setCachedAccess(safe);
    dispatchAccessReady(safe);

    return {
      ok: true,
      session,
      access: safe
    };
  }

  /*
    Public sayfalar:
    Giriş yoksa bile açılır.
  */
  if (allowPublicPageBypass && publicPage) {
    if (lockMembershipBack && currentPath === "/pages/membership.html") {
      lockMembershipPageBack();
    }

    const safe = buildSafeAccess({}, null);

    setCachedAccess(safe);
    dispatchAccessReady(safe);

    return {
      ok: true,
      bypass: true,
      public_page: true,
      session: null,
      access: safe
    };
  }

  goLogin();

  return {
    ok: false,
    redirected: "login",
    session: null,
    access: buildSafeAccess({}, null)
  };
}

export function getCachedAccessState() {
  try {
    return window.__ITALKY_ACCESS__ || {
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
      is_no_ads_member: false
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
      is_no_ads_member: false
    };
  }
}

export function isCurrentUserAdsDisabled() {
  const access = getCachedAccessState();

  return Boolean(
    isTruthy(access?.ads_disabled) ||
    isTruthy(access?.no_ads) ||
    isTruthy(access?.is_no_ads_member) ||
    isTruthy(access?.subscription_active) ||
    isTruthy(access?.has_active_membership) ||
    isTruthy(access?.is_member) ||
    isTruthy(access?.is_admin) ||
    isTruthy(access?.is_superadmin)
  );
}

/*
  Geri uyumluluk için bırakıldı.
  Eski membership sayfası çağırırsa bile sistemi bozmasın.
*/
export function lockMembershipPageBack() {
  try {
    const currentPath = normalizePath(location.pathname);
    if (currentPath !== "/pages/membership.html") return;

    const here = location.pathname + location.search + location.hash;

    history.replaceState({ membershipLock: true }, "", here);
    history.pushState({ membershipLock: true }, "", here);

    window.addEventListener("popstate", () => {
      try {
        history.pushState({ membershipLock: true }, "", here);
      } catch {}
    });
  } catch {}
}
