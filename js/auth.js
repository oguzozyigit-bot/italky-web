import { supabase } from "/js/supabase_client.js";
import { STORAGE_KEY } from "/js/config.js";

/* =========================================================
   🔐 DOMAIN SABİT
========================================================= */
const CANONICAL_ORIGIN = "https://italky.ai";
const HOME_REL = "/pages/home.html";
const LOGIN_REL = "/pages/login.html";

/* =========================================================
   🔐 SINGLE SESSION KEY
========================================================= */
const ACTIVE_SESSION_LOCAL_KEY = "ITALKY_ACTIVE_SESSION_KEY";
let __singleWatcherStarted = false;

/* =========================================================
   📱 NAC ID
========================================================= */
function getOrCreateNacId() {
  const key = "NAC_ID";
  try {
    const existing = localStorage.getItem(key);
    if (existing && existing.length >= 6) return existing;

    const id =
      crypto?.randomUUID?.() ||
      `web-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

    localStorage.setItem(key, id);
    return id;
  } catch {
    return `web-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

async function lockThisDevice() {
  const nacId = getOrCreateNacId();
  const { error } = await supabase.rpc("lock_device", { p_nac_id: nacId });
  if (error) throw error;
  return nacId;
}

/* =========================================================
   🧠 CACHE
========================================================= */
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
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function nukeSupabaseLocal() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-")) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {}
}

function clearLocalAuthArtifacts() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  try {
    localStorage.removeItem(ACTIVE_SESSION_LOCAL_KEY);
  } catch {}
  nukeSupabaseLocal();
}

/* =========================================================
   🔑 ACTIVE SESSION
========================================================= */
function newSessionKey() {
  return crypto?.randomUUID?.() || `sess-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

async function claimActiveSessionIfNeeded(userId) {
  let myKey = (localStorage.getItem(ACTIVE_SESSION_LOCAL_KEY) || "").trim();

  if (!myKey) {
    myKey = newSessionKey();
    localStorage.setItem(ACTIVE_SESSION_LOCAL_KEY, myKey);
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      active_session_key: myKey,
      active_session_updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) throw error;

  return myKey;
}

function startSingleSessionWatcher(userId) {
  if (__singleWatcherStarted) return;
  __singleWatcherStarted = true;

  setInterval(async () => {
    try {
      if (location.pathname === LOGIN_REL) return;

      const myKey = (localStorage.getItem(ACTIVE_SESSION_LOCAL_KEY) || "").trim();
      if (!myKey) return;

      const { data } = await supabase
        .from("profiles")
        .select("active_session_key")
        .eq("id", userId)
        .single();

      const liveKey = String(data?.active_session_key || "").trim();

      if (liveKey && liveKey !== myKey) {
        await supabase.auth.signOut({ scope: "global" });
        clearLocalAuthArtifacts();
        alert("Hesabınız başka bir cihazda açıldığı için bu oturum kapatıldı.");
        location.replace(LOGIN_REL);
      }
    } catch {}
  }, 5000);
}

/* =========================================================
   🛠 PROFILE
========================================================= */
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
    const { data, error } = await supabase.rpc("ensure_profile");
    if (error) throw error;
    if (data) profile = data;
  } catch {}

  if (profile) return profile;

  try {
    profile = await readProfile(user.id);
    if (profile) return profile;
  } catch {}

  const fallbackProfile = {
    id: user.id,
    email: user.email || "",
    full_name:
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      "",
    avatar_url:
      user?.user_metadata?.avatar_url ||
      user?.user_metadata?.picture ||
      "",
    tokens: 0,
  };

  const { error } = await supabase
    .from("profiles")
    .upsert(fallbackProfile, { onConflict: "id" });

  if (error) throw error;

  return await readProfile(user.id);
}

/* =========================================================
   🛠 ENSURE PROFILE + CACHE
========================================================= */
export async function ensureAuthAndCacheUser() {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;
  if (!session?.user) return null;

  const user = session.user;

  await lockThisDevice();

  const profile = await ensureProfileFallback(user);

  if (!profile?.id) {
    throw new Error("Profil oluşturulamadı");
  }

  await claimActiveSessionIfNeeded(user.id);

  const cached = buildCache(user, profile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));

  return cached;
}

/* =========================================================
   🚀 GOOGLE LOGIN (SADECE WEB OAUTH)
========================================================= */
export async function loginWithGoogle(nextTarget = "") {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {}

  clearLocalAuthArtifacts();

  let redirectTo = `${CANONICAL_ORIGIN}/pages/auth_callback.html`;

  const cleanNext = String(nextTarget || "").trim();
  if (cleanNext) {
    redirectTo += `?next=${encodeURIComponent(cleanNext)}`;
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "select_account consent",
      },
    },
  });

  if (error) throw error;
}

/* =========================================================
   🔓 LOGOUT
========================================================= */
export async function safeLogout() {
  try {
    await supabase.auth.signOut({ scope: "global" });
  } catch {}
  clearLocalAuthArtifacts();
  location.replace(LOGIN_REL);
}

/* =========================================================
   🧭 AUTH STATE WATCHER
========================================================= */
export async function startAuthState(callback) {
  const handleAuth = async (session) => {
    const user = session?.user || null;

    if (user) {
      try {
        const cached = await ensureAuthAndCacheUser();
        const wallet = Number(cached?.tokens ?? 0);

        startSingleSessionWatcher(user.id);

        callback({ user, wallet });
        return;
      } catch (e) {
        console.error("startAuthState ensureAuthAndCacheUser error:", e);
        try {
          await supabase.auth.signOut({ scope: "global" });
        } catch {}
        clearLocalAuthArtifacts();
        callback({ user: null, wallet: 0 });
        location.replace(LOGIN_REL);
        return;
      }
    }

    callback({ user: null, wallet: 0 });
  };

  const {
    data: { session },
  } = await supabase.auth.getSession();

  await handleAuth(session);

  supabase.auth.onAuthStateChange(async (_event, session2) => {
    await handleAuth(session2);
  });
}

/* =========================================================
   📲 NATIVE BRIDGE TEST İÇİN KAPALI
========================================================= */
window.onNativeLoginSuccess = async function () {
  console.warn("[NATIVE LOGIN DISABLED] Native login geçici olarak kapatıldı.");
  alert("Native Google login test için kapatıldı. Lütfen normal Google giriş yolunu kullanın.");
};
