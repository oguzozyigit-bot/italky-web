// FILE: /js/auth.js
import { supabase } from "/js/supabase_client.js";
import { STORAGE_KEY } from "/js/config.js";

const HOME_REL = "/pages/home.html";
const LOGIN_REL = "/pages/login.html";
const CALLBACK_ABS = `${location.origin}/pages/auth_callback.html`;

/* -----------------------------
   NAC ID (Cihaz kilidi)
------------------------------ */
function getOrCreateNacId(){
  const key = "NAC_ID";
  try{
    const existing = localStorage.getItem(key);
    if(existing && existing.length >= 6) return existing;

    const id = (globalThis.crypto?.randomUUID?.() || `web-${Date.now()}-${Math.floor(Math.random()*1e9)}`);
    localStorage.setItem(key, id);
    return id;
  }catch{
    return `web-${Date.now()}-${Math.floor(Math.random()*1e9)}`;
  }
}

async function lockThisDevice(){
  const nacId = getOrCreateNacId();
  const { error } = await supabase.rpc("lock_device", { p_nac_id: nacId });
  if(error) throw error;
  return nacId;
}

/* -----------------------------
   Cache helpers
------------------------------ */
function buildCache(user, profile){
  return {
    id: profile?.id || user?.id || null,
    email: profile?.email || user?.email || "",
    name: profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || "Kullanıcı",
    picture: profile?.avatar_url || user?.user_metadata?.picture || user?.user_metadata?.avatar_url || "",
    tokens: Number(profile?.tokens ?? 0),
    member_no: profile?.member_no || null,
    offline_langs: Array.isArray(profile?.offline_langs) ? profile.offline_langs : [],
    created_at: profile?.created_at || null,
    last_login_at: profile?.last_login_at || null
  };
}

export function readCachedUser(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  }catch{
    return null;
  }
}

export function clearCachedUser(){
  try{ localStorage.removeItem(STORAGE_KEY); }catch{}
}

/* -----------------------------
   Ensure profile + cache
------------------------------ */
export async function ensureAuthAndCacheUser(){
  const { data:{ session }, error: sErr } = await supabase.auth.getSession();
  if(sErr) throw sErr;
  if(!session?.user) return null;

  const user = session.user;

  // ✅ OAuth callback anında race olabiliyor: auth hazır değilse bekle
  // (özellikle mobil webview)
  // Burada kısa bekleme de güvenli:
  // (session varsa yine de token refresh vs bitmemiş olabilir)
  try{ await supabase.rpc("cancel_account_deletion"); } catch(_) {}

  // 1) cihaz kilidi
  try{
    await lockThisDevice();
  }catch(e){
    // başka hesaba bağlı cihaz: logout + login
    try{ await supabase.auth.signOut(); }catch{}
    clearCachedUser();
    throw new Error(e?.message || "Cihaz kilidi alınamadı.");
  }

  // 2) profile garanti
  let profile = null;
  try{
    const { data: p, error: pErr } = await supabase.rpc("ensure_profile");
    if(pErr) throw pErr;
    profile = p;
  }catch{
    // fallback read
    const { data: p2, error: p2Err } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if(p2Err) throw p2Err;
    profile = p2;
  }

  // 3) cache
  const cached = buildCache(user, profile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  return cached;
}

/* -----------------------------
   Login / Logout
------------------------------ */
export async function loginWithGoogle(){
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      // ✅ HOME'a değil, callback'e dön
      redirectTo: CALLBACK_ABS
    }
  });
  if(error) throw error;
}

export async function safeLogout(){
  try{ await supabase.auth.signOut({ scope:"global" }); }catch{}
  clearCachedUser();
  // NAC_ID’yi silme: cihaz kilidi modelin var (istersen silersin)
  location.replace(LOGIN_REL);
}

/* -----------------------------
   ui_guard.js köprüsü
------------------------------ */
export async function startAuthState(callback) {
  const handleAuth = async (session) => {
    const user = session?.user || null;

    if(user){
      try{
        const cached = await ensureAuthAndCacheUser();
        const wallet = Number(cached?.tokens ?? 0);
        callback({ user, wallet });
        return;
      }catch(e){
        callback({ user: null, wallet: 0 });
        if(location.pathname !== LOGIN_REL){
          location.replace(LOGIN_REL);
        }
        return;
      }
    }

    callback({ user: null, wallet: 0 });
  };

  const { data:{ session } } = await supabase.auth.getSession();
  await handleAuth(session);

  supabase.auth.onAuthStateChange(async (_event, session2) => {
    await handleAuth(session2);
  });
}
