// FILE: /js/supabase_client.js
import "/js/site_language_boot.js";
import "/js/global_footer.js";
import "/js/ui_hotfixes.js";
import "/js/game_logo_patch.js";
import "/js/account_wallet_context.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://rkbwcmeqdwuewqeokfas.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Xh1B9xUhmHCV6A3ffgeIrg_yO6uTX0t";
const SUPABASE_SESSION_BACKUP_KEY = "italky_supabase_session_backup";

function normalizeSessionBackup(session) {
  if (!session?.access_token || !session?.refresh_token) return null;
  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at || null,
    token_type: session.token_type || "bearer",
    user: session.user
      ? {
          id: session.user.id || "",
          email: session.user.email || "",
          app_metadata: session.user.app_metadata || {},
          user_metadata: session.user.user_metadata || {}
        }
      : null,
    saved_at: new Date().toISOString()
  };
}

export function supportsIOSNativeSessionBridge() {
  try {
    return Boolean(
      window.__ITALKY_IOS_SESSION_BRIDGE_READY === true ||
      Number(window.__ITALKY_IOS_SESSION_BRIDGE_VERSION || 0) >= 1
    );
  } catch {
    return false;
  }
}

function postIOSAuthMessage(message) {
  try {
    if (!supportsIOSNativeSessionBridge()) return false;
    const bridge = window.webkit?.messageHandlers?.IOSAuth;
    if (!bridge || !message) return false;
    bridge.postMessage(message);
    return true;
  } catch {
    return false;
  }
}

function nativeSessionPayload(session) {
  const backup = normalizeSessionBackup(session);
  if (!backup) return null;
  return {
    access_token: backup.access_token,
    refresh_token: backup.refresh_token,
    expires_at: backup.expires_at,
    token_type: backup.token_type,
    user: backup.user ? {
      id: backup.user.id || "",
      email: backup.user.email || ""
    } : null,
    saved_at: backup.saved_at
  };
}

export function persistSupabaseSessionToNative(session) {
  try {
    if (!supportsIOSNativeSessionBridge()) return false;
    const payload = nativeSessionPayload(session);
    if (!payload) return false;
    return postIOSAuthMessage({ action: "storeSession", session: payload });
  } catch {
    return false;
  }
}

export function clearNativeSupabaseSession() {
  return postIOSAuthMessage({ action: "clearSession" });
}

export function persistSupabaseSessionBackup(session) {
  try {
    const backup = normalizeSessionBackup(session);
    if (!backup) return false;
    localStorage.setItem(SUPABASE_SESSION_BACKUP_KEY, JSON.stringify(backup));
    persistSupabaseSessionToNative(session);
    return true;
  } catch {
    return false;
  }
}

export function removeSupabaseSessionBackup() {
  try {
    localStorage.removeItem(SUPABASE_SESSION_BACKUP_KEY);
  } catch {}
  clearNativeSupabaseSession();
}

export function readSupabaseSessionBackup() {
  try {
    const raw = localStorage.getItem(SUPABASE_SESSION_BACKUP_KEY);
    if (!raw) return null;
    const backup = JSON.parse(raw);
    if (!backup?.access_token || !backup?.refresh_token) return null;
    return backup;
  } catch {
    return null;
  }
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// Session restore helpers for iOS WebView reloads.
export async function restoreSupabaseSessionFromBackup() {
  const backup = readSupabaseSessionBackup();
  if (!backup) return null;

  try {
    const { data, error } = await supabase.auth.setSession({
      access_token: backup.access_token,
      refresh_token: backup.refresh_token
    });

    if (error) {
      console.warn("[supabase_client] backup session restore failed:", error);
      return null;
    }

    if (data?.session) {
      persistSupabaseSessionBackup(data.session);
      return data.session;
    }
  } catch (error) {
    console.warn("[supabase_client] backup session restore exception:", error);
  }

  return null;
}

export async function restoreSupabaseSessionFromNative(session) {
  try {
    if (!session?.access_token || !session?.refresh_token) return null;
    const { data, error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });

    if (error) {
      console.warn("[supabase_client] native session restore failed:", error);
      clearNativeSupabaseSession();
      return null;
    }

    if (data?.session) {
      persistSupabaseSessionBackup(data.session);
      return data.session;
    }
  } catch (error) {
    console.warn("[supabase_client] native session restore exception:", error);
  }

  return null;
}

export async function italkyRestoreNativeSupabaseSession(session) {
  const restored = await restoreSupabaseSessionFromNative(session);
  if (restored?.user?.id) {
    try {
      const path = String(location.pathname || "").toLowerCase();
      if (path.endsWith("/login_ios.html")) {
        location.replace("/pages/home_ios.html?ios=1&native_restore=1");
      }
    } catch {}
  } else if (session?.access_token || session?.refresh_token) {
    try {
      const path = String(location.pathname || "").toLowerCase();
      if (path.endsWith("/home_ios.html")) {
        clearNativeSupabaseSession();
        location.replace("/pages/login_ios.html?restore=failed");
      }
    } catch {}
  }
  return restored;
}

export async function italkySignInWithAppleIdentityToken(identityToken, nonce = "") {
  const token = String(identityToken || "").trim();
  if (!token) return null;

  try {
    const payload = {
      provider: "apple",
      token
    };
    const cleanNonce = String(nonce || "").trim();
    if (cleanNonce) payload.nonce = cleanNonce;

    const { data, error } = await supabase.auth.signInWithIdToken(payload);
    if (error) throw error;

    if (data?.session) {
      persistSupabaseSessionBackup(data.session);
      try {
        window.dispatchEvent(new CustomEvent("italkyIOSAppleSupabaseSignedIn", {
          detail: { ok: true, user_id: data.session.user?.id || "" }
        }));
      } catch {}
      location.replace("/pages/home_ios.html?ios=1&apple_login=1");
      return data.session;
    }
  } catch (error) {
    console.warn("[supabase_client] Apple identity token sign-in failed:", error);
    try {
      window.dispatchEvent(new CustomEvent("italkyIOSAppleSupabaseSignedIn", {
        detail: { ok: false, message: error?.message || String(error || "") }
      }));
    } catch {}
  }

  return null;
}

export async function waitForSupabaseSession({
  timeoutMs = 5000,
  intervalMs = 250,
  restoreFromBackup = true
} = {}) {
  const startedAt = Date.now();
  let restored = false;

  while (Date.now() - startedAt <= timeoutMs) {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (!error && data?.session) {
        persistSupabaseSessionBackup(data.session);
        return data.session;
      }
    } catch {}

    if (restoreFromBackup && !restored) {
      restored = true;
      const nativeSession = window.__ITALKY_IOS_NATIVE_SESSION__;
      if (nativeSession?.access_token && nativeSession?.refresh_token) {
        const restoredNativeSession = await restoreSupabaseSessionFromNative(nativeSession);
        if (restoredNativeSession) return restoredNativeSession;
      }

      const restoredSession = await restoreSupabaseSessionFromBackup();
      if (restoredSession) return restoredSession;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return null;
}

try {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      persistSupabaseSessionBackup(session);
      return;
    }
    if (event === "SIGNED_OUT" || event === "USER_DELETED") {
      removeSupabaseSessionBackup();
    }
  });
} catch {}

if (typeof window !== "undefined") {
  window.supabase = supabase;
  window.italkyRestoreNativeSupabaseSession = italkyRestoreNativeSupabaseSession;
  window.italkySignInWithAppleIdentityToken = italkySignInWithAppleIdentityToken;
  window.addEventListener("italkyIOSNativeSessionAvailable", (event) => {
    italkyRestoreNativeSupabaseSession(event.detail).catch(() => {});
  });
  if (window.__ITALKY_IOS_NATIVE_SESSION__?.access_token && window.__ITALKY_IOS_NATIVE_SESSION__?.refresh_token) {
    italkyRestoreNativeSupabaseSession(window.__ITALKY_IOS_NATIVE_SESSION__).catch(() => {});
  }
  if (window.__ITALKY_IOS_PENDING_APPLE_IDENTITY__?.identityToken) {
    const pending = window.__ITALKY_IOS_PENDING_APPLE_IDENTITY__;
    window.__ITALKY_IOS_PENDING_APPLE_IDENTITY__ = null;
    italkySignInWithAppleIdentityToken(pending.identityToken, pending.nonce || "").catch(() => {});
  }
}
