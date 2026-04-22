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
  "/pages/contact.html"
]);

function normalizePath(pathname) {
  return String(pathname || "").split("?")[0].split("#")[0];
}

function isPublicPage(pathname = location.pathname) {
  return PUBLIC_PAGES.has(normalizePath(pathname));
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

function buildSafeAccess(access = {}, session = null) {
  const userId = session?.user?.id || "";

  return {
    ok: !!userId,
    is_logged_in: !!userId,
    user_id: userId,

    // Eski alanlarla uyumluluk için bırakıyoruz ama üyelik kapısına çevirmiyoruz
    access_open: true,

    gift_started_at: access?.gift_started_at || access?.trial_started_at || null,
    gift_ends_at: access?.gift_ends_at || access?.trial_ends_at || null,

    package_code: access?.package_code || access?.selected_package_code || "",
    package_started_at: access?.package_started_at || null,
    package_ends_at: access?.package_ends_at || null,
    membership_ends_at:
      access?.membership_ends_at ||
      access?.package_ends_at ||
      access?.gift_ends_at ||
      access?.trial_ends_at ||
      null,

    tokens: Number(
      access?.tokens ??
      access?.wallet?.tokens ??
      0
    ),

    role: String(
      access?.role ||
      session?.user?.user_metadata?.role ||
      ""
    ).trim().toLowerCase()
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

  // Artık membership'e zorla yönlendirme yok.
  // Giriş yapan kullanıcı sayfaya girer.
  // Jeton / reklam / modül erişim kontrolü ilgili modülün kendi içinde yapılır.
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
    role: ""
  };
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
