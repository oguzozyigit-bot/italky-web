// FILE: /js/auth_session_unifier.js
// Ortak giriş / güvenli çıkış düzeltmesi.
// Amaç: italky Web, Android WebView ve icanyAI köprüsünde oturum cache'lerinin farklı davranmasını engellemek.

import { supabase, removeSupabaseSessionBackup, clearNativeSupabaseSession } from "/js/supabase_client.js";

const ITALKY_HOME = "https://italky.ai/hosgeldiniz";
const STORAGE_KEY = "italky_user_v1";
const LOGOUT_MARKER_KEY = "italky_force_logged_out_at";
const NATIVE_GOOGLE_NEXT_KEY = "italky_native_google_login_next";

const DIRECT_AUTH_KEYS = [
  STORAGE_KEY,
  LOGOUT_MARKER_KEY,
  NATIVE_GOOGLE_NEXT_KEY,
  "italky_icany_pending_target",
  "italky_protected_after_login",
  "redirectAfterLogin",
  "italky_supabase_session_backup",
  "italky_pending_sso",
  "italky_auth_token",
  "italky_access_token",
  "italky_refresh_token"
];

function shouldRemoveStorageKey(key) {
  const k = String(key || "");
  return (
    DIRECT_AUTH_KEYS.includes(k) ||
    k.startsWith("sb-") ||
    k.includes("supabase") ||
    k.includes("auth-token") ||
    k.includes("access_token") ||
    k.includes("refresh_token") ||
    k.includes("italky_native_google") ||
    k.includes("italky_icany_pending") ||
    k.includes("italky_protected_after_login")
  );
}

function clearStorageArea(area) {
  try {
    const keys = [];
    for (let i = 0; i < area.length; i += 1) {
      const key = area.key(i);
      if (key && shouldRemoveStorageKey(key)) keys.push(key);
    }
    keys.forEach((key) => area.removeItem(key));
  } catch {}
}

export function clearItalkyAuthArtifacts() {
  try { localStorage.setItem(LOGOUT_MARKER_KEY, String(Date.now())); } catch {}
  try { removeSupabaseSessionBackup(); } catch {}
  try { clearNativeSupabaseSession(); } catch {}
  try { clearStorageArea(localStorage); } catch {}
  try { clearStorageArea(sessionStorage); } catch {}
  try { sessionStorage.clear(); } catch {}

  try {
    document.body?.classList.remove("signed", "drawer-open", "open", "ui-menu-open");
    document.documentElement?.classList.remove("signed", "drawer-open", "open", "ui-menu-open");
  } catch {}
}

export async function italkyFullLogout({ redirect = true, target = ITALKY_HOME } = {}) {
  try { await supabase.auth.signOut({ scope: "global" }); } catch {}
  clearItalkyAuthArtifacts();

  // Android WebView native oturumu ayrıca temizler: GoogleSignIn, SharedPreferences, CookieManager, WebStorage.
  try {
    if (typeof window.Native?.logoutNativeGoogle === "function") {
      window.Native.logoutNativeGoogle();
    }
  } catch {}

  if (redirect) {
    const url = new URL(target || ITALKY_HOME, ITALKY_HOME);
    url.searchParams.set("logged_out", "1");
    setTimeout(() => window.location.replace(url.toString()), 80);
  }
}

function isLogoutClickTarget(node) {
  const el = node instanceof Element ? node.closest("button,a,[role='button']") : null;
  if (!el) return null;
  const text = `${el.textContent || ""} ${el.getAttribute("aria-label") || ""} ${el.getAttribute("title") || ""}`
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
  const id = String(el.id || "").toLowerCase();
  const action = String(el.getAttribute("data-italky-personal-action") || "").toLowerCase();
  if (action === "logout") return el;
  if (id === "logout" || id === "logoutbtn") return el;
  if (/\b(guvenli cikis|cikis yap|oturumu kapat|logout|sign out)\b/.test(text)) return el;
  return null;
}

function installLogoutClickGuard() {
  if (window.__ITALKY_LOGOUT_GUARD_INSTALLED__) return;
  window.__ITALKY_LOGOUT_GUARD_INSTALLED__ = true;

  document.addEventListener("click", (event) => {
    const logoutEl = isLogoutClickTarget(event.target);
    if (!logoutEl) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void italkyFullLogout();
  }, true);
}

function installLogoutQueryHandler() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    if (params.get("logout") === "1" || params.get("force_logout") === "1") {
      void italkyFullLogout({ redirect: true, target: ITALKY_HOME });
      return;
    }
    if (params.get("logged_out") === "1") {
      clearItalkyAuthArtifacts();
      params.delete("logged_out");
      const clean = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash || ""}`;
      window.history.replaceState({}, "", clean);
    }
  } catch {}
}

function cloneFetchInitWithAuth(init, accessToken) {
  const nextInit = { ...(init || {}) };
  const headers = new Headers(init?.headers || {});
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");
  nextInit.headers = headers;
  return nextInit;
}

function installIcanyBridgeRetry() {
  if (window.__ITALKY_ICANY_BRIDGE_RETRY_INSTALLED__) return;
  window.__ITALKY_ICANY_BRIDGE_RETRY_INSTALLED__ = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function italkyFetch(input, init) {
    const url = typeof input === "string" ? input : String(input?.url || "");
    const isBridge = url.includes("www.icany.ai/api/bridge/from-italky") || url.includes("icany.ai/api/bridge/from-italky");
    if (!isBridge) return originalFetch(input, init);

    let firstResponse = await originalFetch(input, init);
    if (firstResponse.status !== 401) return firstResponse;

    try {
      const refreshed = await supabase.auth.refreshSession();
      const accessToken = refreshed?.data?.session?.access_token || "";
      if (!accessToken) return firstResponse;
      const retryInit = cloneFetchInitWithAuth(init, accessToken);
      const retryResponse = await originalFetch(input, retryInit);
      return retryResponse;
    } catch (error) {
      console.warn("[italky auth bridge retry] failed", error);
      return firstResponse;
    }
  };
}

try {
  installLogoutClickGuard();
  installLogoutQueryHandler();
  installIcanyBridgeRetry();
  window.italkyFullLogout = italkyFullLogout;
  window.clearItalkyAuthArtifacts = clearItalkyAuthArtifacts;
} catch (error) {
  console.warn("[italky auth session unifier] install failed", error);
}
