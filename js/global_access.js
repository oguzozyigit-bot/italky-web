// FILE: /js/global_access.js

import { supabase } from "/js/supabase_client.js";

const API_ACCESS = "https://italky-api.onrender.com/api/session/access-state";

const PUBLIC_PAGES = new Set([
  "/pages/login.html",
  "/pages/membership.html",
  "/pages/trial.html",
  "/pages/register.html",
  "/pages/forgot-password.html"
]);

function normalizePath(pathname) {
  return String(pathname || "").split("?")[0].split("#")[0];
}

function isPublicPage(pathname = location.pathname) {
  return PUBLIC_PAGES.has(normalizePath(pathname));
}

async function getSessionOrNull() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    console.error("[global_access] session error:", error);
    return null;
  }
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
  location.replace("/pages/membership.html");
}

export async function initGlobalAccess(options = {}) {
  const {
    requireAccessOpen = true,
    allowPublicPageBypass = true
  } = options;

  const currentPath = normalizePath(location.pathname);

  if (allowPublicPageBypass && isPublicPage(currentPath)) {
    return { ok: true, bypass: true };
  }

  const session = await getSessionOrNull();
  if (!session?.user?.id) {
    goLogin();
    return { ok: false, redirected: "login" };
  }

  const access = await fetchAccessState(session);

  if (requireAccessOpen && !access?.access_open) {
    goMembership();
    return { ok: false, redirected: "membership", access };
  }

  return {
    ok: true,
    session,
    access
  };
}
