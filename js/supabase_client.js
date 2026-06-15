// FILE: /js/supabase_client.js
import "/js/site_language_boot.js";
import "/js/global_footer.js";
import "/js/ui_hotfixes.js";
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

export function persistSupabaseSessionBackup(session) {
  try {
    const backup = normalizeSessionBackup(session);
    if (!backup) return false;
    localStorage.setItem(SUPABASE_SESSION_BACKUP_KEY, JSON.stringify(backup));
    return true;
  } catch {
    return false;
  }
}

export function removeSupabaseSessionBackup() {
  try {
    localStorage.removeItem(SUPABASE_SESSION_BACKUP_KEY);
  } catch {}
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
}
