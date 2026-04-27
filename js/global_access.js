// FILE: /js/global_access.js

import { supabase } from "/js/supabase_client.js";

const API_ACCESS = "https://italky-api.onrender.com/api/session/access-state";

const PUBLIC_PAGES = new Set([
  "/pages/login.html",
  "/pages/auth_callback.html",
  "/pages/membership.html",
  "/pages/about.html",
  "/pages/faq.html",
  "/pages/privacy.html",
  "/pages/contact.html",
  "/pages/text_translate_public.html",
  "/pages/game_menu_public.html",
  "/pages/level_test_public.html"
]);

function normalizePath(pathname) {
  return String(pathname || "").split("?")[0].split("#")[0];
}

function isPublicPage(pathname = location.pathname) {
  return PUBLIC_PAGES.has(normalizePath(pathname));
}

function nowMs() {
  return Date.now();
}

function toMs(value) {
  if (!value) return 0;

  try {
    const n = Date.parse(String(value));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function isFuture(value) {
  const ms = toMs(value);
  return ms > nowMs();
}

function str(value) {
  return String(value || "").trim();
}

function lower(value) {
  return str(value).toLowerCase();
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
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    const json = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      return null;
    }

    return json || null;
  } catch {
    return null;
  }
}

function goLogin() {
  const here = encodeURIComponent(location.pathname + location.search + location.hash);
  location.replace(`/pages/login.html?next=${here}`);
}

/*
  Reklamsız üyelik mantığı:
  - Play aboneliği ürün id: reklamsiz
  - package_code / selected_package_code / plan / product_id içinde reklamsiz varsa aktif üyelik sayılır.
  - package_active / subscription_active / is_member true ise ve bitiş tarihi geçmemişse aktif sayılır.
  - role admin/superadmin ise reklam kapısı kapalı sayılır.
*/
function computeMembership(access = {}, session = null) {
  const role = lower(access?.role || session?.user?.user_metadata?.role || "");

  const packageCode = lower(
    access?.package_code ||
    access?.selected_package_code ||
    access?.plan ||
    access?.product_id ||
    access?.subscription_product_id ||
    access?.subscription?.product_id ||
    ""
  );

  const membershipEndsAt =
    access?.membership_ends_at ||
    access?.subscription_ends_at ||
    access?.package_ends_at ||
    access?.expires_at ||
    access?.entitlement_ends_at ||
    access?.gift_ends_at ||
    access?.trial_ends_at ||
    null;

  const subscriptionEndsAt =
    access?.subscription_ends_at ||
    access?.membership_ends_at ||
    access?.package_ends_at ||
    access?.expires_at ||
    null;

  const packageActive =
    access?.package_active === true ||
    access?.subscription_active === true ||
    access?.is_member === true ||
    access?.member === true ||
    access?.access_open === true ||
    access?.subscription?.active === true;

  const hasNoAdsProduct =
    packageCode === "reklamsiz" ||
    packageCode.includes("reklamsiz") ||
    packageCode.includes("no_ads") ||
    packageCode.includes("ads_free");

  const hasValidEndDate =
    isFuture(membershipEndsAt) ||
    isFuture(subscriptionEndsAt);

  const isAdmin =
    role === "admin" ||
    role === "superadmin";

  /*
    Burada kritik karar:
    - Sadece giriş yaptı diye reklamsız saymıyoruz.
    - 12 aylık reklamsız üyelik veya admin/superadmin reklamsız.
    - Eğer backend package_active=true dönüyorsa ve bitiş tarihi varsa aktif kabul ediyoruz.
  */
  const hasActiveMembership =
    isAdmin ||
    (
      packageActive &&
      (
        hasValidEndDate ||
        hasNoAdsProduct
      )
    ) ||
    (
      hasNoAdsProduct &&
      (
        hasValidEndDate ||
        packageActive
      )
    );

  const noAds =
    isAdmin ||
    hasActiveMembership ||
    access?.no_ads === true ||
    access?.ads_disabled === true ||
    access?.is_no_ads_member === true;

  return {
    role,
    packageCode,
    membershipEndsAt,
    subscriptionEndsAt,
    packageActive,
    hasNoAdsProduct,
    hasValidEndDate,
    hasActiveMembership,
    noAds,
    isAdmin
  };
}

function buildSafeAccess(access = {}, session = null) {
  const userId = session?.user?.id || "";
  const membership = computeMembership(access, session);

  const membershipEndsAt =
    membership.membershipEndsAt ||
    access?.membership_ends_at ||
    access?.package_ends_at ||
    access?.gift_ends_at ||
    access?.trial_ends_at ||
    null;

  const subscriptionProductId =
    access?.subscription_product_id ||
    access?.product_id ||
    access?.subscription?.product_id ||
    membership.packageCode ||
    "";

  return {
    ok: !!userId,
    is_logged_in: !!userId,
    user_id: userId,

    // Eski alanlarla uyumluluk.
    access_open: true,

    gift_started_at: access?.gift_started_at || access?.trial_started_at || null,
    gift_ends_at: access?.gift_ends_at || access?.trial_ends_at || null,

    package_code: access?.package_code || access?.selected_package_code || membership.packageCode || "",
    selected_package_code: access?.selected_package_code || access?.package_code || membership.packageCode || "",
    package_started_at: access?.package_started_at || null,
    package_ends_at: access?.package_ends_at || null,

    membership_ends_at: membershipEndsAt,
    subscription_ends_at: membership.subscriptionEndsAt || null,
    subscription_product_id: subscriptionProductId,

    membership_source:
      access?.membership_source ||
      access?.source_type ||
      access?.subscription?.source ||
      "",

    tokens: Number(
      access?.tokens ??
      access?.wallet?.tokens ??
      0
    ),

    role: membership.role,

    // Yeni net alanlar
    is_member: !!membership.hasActiveMembership,
    has_active_membership: !!membership.hasActiveMembership,
    package_active: !!membership.packageActive,
    subscription_active: !!membership.hasActiveMembership,

    no_ads: !!membership.noAds,
    ads_disabled: !!membership.noAds,
    is_no_ads_member: !!membership.noAds,

    is_admin: !!membership.isAdmin,
    is_superadmin: membership.role === "superadmin",

    raw_access: access || {}
  };
}

export async function initGlobalAccess(options = {}) {
  const {
    allowPublicPageBypass = true,
    lockMembershipBack = false
  } = options;

  const currentPath = normalizePath(location.pathname);

  if (allowPublicPageBypass && isPublicPage(currentPath)) {
    if (lockMembershipBack && currentPath === "/pages/membership.html") {
      lockMembershipPageBack();
    }

    const session = await getSessionOrNull();
    const access = session ? await fetchAccessStateSafe(session) : null;
    const safe = buildSafeAccess(access || {}, session || null);

    window.__ITALKY_ACCESS__ = safe;

    return {
      ok: true,
      bypass: true,
      public_page: true,
      session,
      access: safe
    };
  }

  const session = await getSessionOrNull();

  if (!session?.user?.id) {
    goLogin();
    return {
      ok: false,
      redirected: "login"
    };
  }

  const access = await fetchAccessStateSafe(session);
  const safe = buildSafeAccess(access || {}, session);

  window.__ITALKY_ACCESS__ = safe;

  return {
    ok: true,
    session,
    access: safe
  };
}

export function getCachedAccessState() {
  return window.__ITALKY_ACCESS__ || {
    ok: false,
    is_logged_in: false,
    access_open: false,
    tokens: 0,
    role: "",
    is_member: false,
    has_active_membership: false,
    no_ads: false,
    ads_disabled: false,
    is_no_ads_member: false
  };
}

export function isNoAdsUser() {
  const access = getCachedAccessState();
  return !!(
    access?.ads_disabled ||
    access?.no_ads ||
    access?.is_no_ads_member ||
    access?.is_admin ||
    access?.is_superadmin
  );
}

export function hasActiveMembership() {
  const access = getCachedAccessState();
  return !!(
    access?.has_active_membership ||
    access?.is_member ||
    access?.subscription_active ||
    access?.is_admin ||
    access?.is_superadmin
  );
}

// Geri uyumluluk için bırakıldı.
// Eski sayfalarda çağrılsa bile sistemi bozmasın.
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
