import {
  supabase,
  persistSupabaseSessionBackup,
  removeSupabaseSessionBackup,
  waitForSupabaseSession
} from "/js/supabase_client.js";
import { STORAGE_KEY } from "/js/config.js";

const NATIVE_GOOGLE_NEXT_KEY = "italky_native_google_login_next";
const DEFAULT_NATIVE_GOOGLE_NEXT = "/pages/membership.html";
const HOME_PAGE = "/pages/home.html";
const MEMBERSHIP_PAGE = "/pages/membership.html";
const ACCESS_STATE_API = "https://italky-api.onrender.com/api/session/access-state";
let oauthRedirectStarted = false;

function safeRedirectPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://")) return "";
  if (raw.startsWith("https://")) return "";
  if (raw.startsWith("//")) return "";
  if (!raw.startsWith("/")) return "";
  return raw;
}

function readNativeIdToken(payload) {
  try {
    if (typeof payload === "string") {
      const raw = payload.trim();
      if (!raw) return "";
      try {
        const data = JSON.parse(raw);
        return String(data?.id_token || data?.idToken || data?.token || data?.credential || "").trim();
      } catch {
        return raw;
      }
    }
    return String(
      payload?.id_token ||
      payload?.idToken ||
      payload?.token ||
      payload?.credential ||
      ""
    ).trim();
  } catch {
    return "";
  }
}

function rememberNativeGoogleNext(next = "") {
  const safeNext = safeRedirectPath(next) || DEFAULT_NATIVE_GOOGLE_NEXT;
  try { localStorage.setItem(NATIVE_GOOGLE_NEXT_KEY, safeNext); } catch {}
  return safeNext;
}

function readNativeGoogleNext() {
  try {
    const stored = safeRedirectPath(localStorage.getItem(NATIVE_GOOGLE_NEXT_KEY) || "");
    if (stored) return stored;
  } catch {}
  try {
    const params = new URLSearchParams(location.search || "");
    const next = safeRedirectPath(params.get("next") || "");
    if (next) return next;
  } catch {}
  return DEFAULT_NATIVE_GOOGLE_NEXT;
}

function clearNativeGoogleNext() {
  try { localStorage.removeItem(NATIVE_GOOGLE_NEXT_KEY); } catch {}
}

function hasNativeGoogleLogin() {
  try {
    return typeof window.Native?.startGoogleLogin === "function";
  } catch {
    return false;
  }
}

function isAndroidWebView() {
  try {
    return !!(
      hasNativeGoogleLogin() ||
      window.AndroidBridge ||
      window.AndroidBilling ||
      /; wv\)/i.test(navigator.userAgent || "")
    );
  } catch {
    return false;
  }
}

function isActiveAccess(access) {
  return Boolean(
    access?.access_open ||
    access?.ads_disabled ||
    access?.no_ads ||
    access?.is_no_ads_member ||
    access?.subscription_active ||
    access?.has_active_membership ||
    access?.is_member ||
    access?.package_active ||
    access?.plan === "premium" ||
    access?.app_access_mode === "premium" ||
    access?.promo_active ||
    access?.nfc_active
  );
}

async function fetchAccessStateSafe(session) {
  try {
    if (!session?.access_token) return null;
    const response = await fetch(ACCESS_STATE_API, {
      method: "GET",
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store"
    });
    const json = await response.json().catch(() => ({}));
    return response.ok ? json : null;
  } catch (e) {
    console.warn("[ITALKY AUTH] access-state failed", e);
    return null;
  }
}

async function resolveNativeRedirectTarget(session, requestedTarget) {
  const access = await fetchAccessStateSafe(session);
  if (isActiveAccess(access)) return safeRedirectPath(requestedTarget) || HOME_PAGE;
  const safeRequested = safeRedirectPath(requestedTarget);
  if (safeRequested && safeRequested !== HOME_PAGE) return safeRequested;
  return MEMBERSHIP_PAGE;
}

function toAndroidBrowserIntent(url) {
  const parsed = new URL(url);
  const path = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
  return `intent://${path}#Intent;scheme=${parsed.protocol.replace(":", "")};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
}

function redirectToOAuthUrl(url) {
  if (!url) throw new Error("Google OAuth adresi alınamadı.");
  if (oauthRedirectStarted) return;
  oauthRedirectStarted = true;

  if (hasNativeGoogleLogin()) {
    throw new Error("Uygulama içinde Google girişi native akışla tamamlanmalı.");
  }

  if (isAndroidWebView()) {
    try {
      location.assign(toAndroidBrowserIntent(url));
      return;
    } catch (e) {
      console.warn("[ITALKY AUTH] Chrome intent failed", e);
    }
  }

  location.assign(url);
}

function installNativeGoogleLoginCompletionGuard() {
  try {
    window.onNativeLoginSuccess = async function(payload) {
      try {
        const idToken = readNativeIdToken(payload);
        if (!idToken) throw new Error("Google giriş token boş geldi.");

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken
        });
        if (error) throw error;

        persistSupabaseSessionBackup(data?.session);
        try { await ensureAuthAndCacheUser(); } catch (e) { console.warn("[ITALKY AUTH] cache after native login failed", e); }
        try {
          const userId = data?.user?.id || data?.session?.user?.id || "";
          if (userId && typeof window.Native?.setUserId === "function") window.Native.setUserId(userId);
        } catch {}

        const requestedTarget = readNativeGoogleNext();
        const target = await resolveNativeRedirectTarget(data?.session, requestedTarget);
        clearNativeGoogleNext();
        window.dispatchEvent(new CustomEvent("italky-native-login-success"));
        location.replace(target);
      } catch (e) {
        console.error("[ITALKY AUTH] native login completion failed", e);
        window.dispatchEvent(new CustomEvent("italky-native-login-error", {
          detail: { message: e?.message || String(e || "") }
        }));
        throw e;
      }
    };

    window.onNativeLoginError = function(payload) {
      window.dispatchEvent(new CustomEvent("italky-native-login-error", {
        detail: { message: typeof payload === "string" ? payload : payload?.message || "native_google_error" }
      }));
    };
  } catch (e) {
    console.warn("[ITALKY AUTH] native completion guard failed", e);
  }
}

installNativeGoogleLoginCompletionGuard();

export async function loginWithGoogle(next = "") {
  const safeNext = safeRedirectPath(next);

  if (hasNativeGoogleLogin()) {
    const target = rememberNativeGoogleNext(safeNext || DEFAULT_NATIVE_GOOGLE_NEXT);
    window.Native.startGoogleLogin();
    return { native: true, next: target };
  }

  const callbackUrl = new URL("/pages/auth_callback.html", location.origin);
  if (safeNext) callbackUrl.searchParams.set("next", safeNext);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
      skipBrowserRedirect: true,
      queryParams: {
        access_type: "offline",
        prompt: "select_account"
      }
    }
  });

  if (error) throw error;
  redirectToOAuthUrl(data?.url || "");
  return data;
}

export async function loginWithApple(next = "") {
  const safeNext = safeRedirectPath(next);
  const callbackUrl = new URL("/pages/auth_callback.html", location.origin);
  if (safeNext) callbackUrl.searchParams.set("next", safeNext);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "apple",
    options: {
      redirectTo: callbackUrl.toString(),
      skipBrowserRedirect: true
    }
  });

  if (error) throw error;
  redirectToOAuthUrl(data?.url || "");
  return data;
}

function buildCache(user, profile) {
  return {
    id: profile?.id || user?.id || null,
    email: profile?.email || user?.email || "",
    name:
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      "Kullanıcı",
    picture:
      profile?.avatar_url ||
      user?.user_metadata?.picture ||
      user?.user_metadata?.avatar_url ||
      "",
    tokens: Number(profile?.tokens ?? 0),
    member_no: profile?.member_no || null,
    offline_langs: Array.isArray(profile?.offline_langs) ? profile.offline_langs : [],
  };
}

export function readCachedUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearCachedUser() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

function clearLocalAuthArtifacts() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

async function readProfile(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

async function ensureProfileFallback(user) {
  let profile = null;

  try {
    const { data, error } = await supabase.rpc("ensure_profile_and_welcome");
    if (!error && data) profile = data;
  } catch {}
  if (profile) return profile;

  try {
    const { data, error } = await supabase.rpc("ensure_profile");
    if (!error && data) profile = data;
  } catch {}
  if (profile) return profile;

  profile = await readProfile(user.id);
  if (profile) return profile;

  const fallbackProfile = {
    id: user.id,
    email: user.email || "",
    full_name: user?.user_metadata?.full_name || user?.user_metadata?.name || "",
    avatar_url: user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "",
    tokens: 0,
    package_active: false,
    selected_package_code: null,
    package_started_at: null,
    package_ends_at: null,
    trial_started_at: null,
    trial_ends_at: null,
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(fallbackProfile, { onConflict: "id" });
  if (error) throw error;
  return await readProfile(user.id);
}

export async function ensureAuthAndCacheUser() {
  const session = await waitForSupabaseSession({
    timeoutMs: 5000,
    intervalMs: 250,
    restoreFromBackup: true
  });
  if (!session?.user) return null;

  const user = session.user;
  persistSupabaseSessionBackup(session);

  const profile = await ensureProfileFallback(user);
  if (!profile?.id) throw new Error("Profil oluşturulamadı");

  const cached = buildCache(user, profile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  return cached;
}

export async function safeLogout() {
  try { await supabase.auth.signOut({ scope: "global" }); } catch {}
  removeSupabaseSessionBackup();
  clearLocalAuthArtifacts();
  location.replace("/pages/login.html");
}
