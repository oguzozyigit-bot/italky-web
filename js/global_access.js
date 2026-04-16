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
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data?.session || null;
}

async function fetchAccessState(session) {
  const resp = await fetch(API_ACCESS, {
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  const json = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    throw new Error(json?.detail || "Erişim bilgisi alınamadı");
  }

  return json;
}

function goLogin() {
  const here = encodeURIComponent(location.pathname + location.search + location.hash);
  location.replace(`/pages/login.html?next=${here}`);
}

function goMembership() {
  const here = encodeURIComponent(location.pathname + location.search + location.hash);
  location.replace(`/pages/membership.html?next=${here}`);
}

function buildSafeAccess(access = {}, session = null) {
  const giftEndsAt =
    access?.gift_ends_at ||
    access?.trial_ends_at ||
    null;

  const accessEndsAt =
    access?.membership_ends_at ||
    access?.package_ends_at ||
    giftEndsAt ||
    null;

  return {
    ok: !!access?.access_open,
    is_logged_in: !!session?.user?.id,
    user_id: session?.user?.id || "",
    access_open: !!access?.access_open,
    gift_started_at: access?.gift_started_at || access?.trial_started_at || null,
    gift_ends_at: giftEndsAt,
    package_code: access?.package_code || access?.selected_package_code || "",
    package_started_at: access?.package_started_at || null,
    package_ends_at: access?.package_ends_at || null,
    membership_ends_at: accessEndsAt,
    tokens: Number(access?.tokens || 0)
  };
}

export async function initGlobalAccess(options = {}) {
  const {
    allowPublicPageBypass = true,
    lockMembershipBack = true
  } = options;

  const currentPath = normalizePath(location.pathname);

  if (allowPublicPageBypass && isPublicPage(currentPath)) {
    if (lockMembershipBack && currentPath === "/pages/membership.html") {
      lockMembershipPageBack();
    }
    return {
      ok: true,
      bypass: true,
      public_page: true
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

  const access = await fetchAccessState(session);
  const safe = buildSafeAccess(access, session);

  window.__ITALKY_ACCESS__ = safe;

  if (!safe.access_open) {
    goMembership();
    return {
      ok: false,
      redirected: "membership",
      access: safe
    };
  }

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
    tokens: 0
  };
}

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
