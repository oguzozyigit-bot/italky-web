// FILE: /js/auth.js
import { supabase } from "/js/supabase_client.js";
import { STORAGE_KEY } from "/js/config.js";

/**
 * Redirect URL mutlaka Supabase Auth -> URL Configuration -> Redirect URLs ile birebir eşleşmeli.
 * Domain kullanman doğru: italky.ai
 */
const HOME_ABS = "https://italky.ai/pages/home.html";
const LOGIN_REL = "/pages/login.html";

/* -----------------------------
   NAC ID (Cihaz kilidi)
------------------------------ */
function getOrCreateNacId(){
  // Web: localStorage UUID (APK’da native NAC ID ile değiştirilecek)
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
  // SQL’de public.lock_device(p_nac_id text) olmalı
  const nacId = getOrCreateNacId();
  const { error } = await supabase.rpc("lock_device", { p_nac_id: nacId });
  if(error) throw error;
  return nacId;
}

/* -----------------------------
   Profile ensure + cache
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
    last_login_at: profile?.last_login_at || null,
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
  try{ localStorage.removeItem(STORAGE_KEY); }catch(_e){}
}

/**
 * ✅ Giriş sonrası veya sayfa açılışında çağır:
 * - session kontrol
 * - NAC cihaz kilidi (aynı telefonda başka kullanıcıyı engeller)
 * - ensure_profile RPC ile profile satırını garanti eder (tokens=400 ilk kayıtta)
 * - cache’e yazar (ui_shell / ui_guard buradan da beslenebilir)
 */
export async function ensureAuthAndCacheUser(){
  const { data: { session }, error: sErr } = await supabase.auth.getSession();
  if(sErr) throw sErr;
  if(!session?.user) return null;

  const user = session.user;
try { await supabase.rpc("cancel_account_deletion"); } catch(_) {}

  // 1) cihaz kilidi
  try{
    await lockThisDevice();
  }catch(e){
    // Bu cihaz başka bir hesaba bağlıysa => güvenli çıkış + login
    await supabase.auth.signOut();
    clearCachedUser();
    throw new Error(e?.message || "Cihaz kilidi alınamadı.");
  }

  // 2) profile garanti (RPC)
  let profile = null;
  const { data: p, error: pErr } = await supabase.rpc("ensure_profile");
  if(pErr){
    // RPC yoksa/bozuksa en azından okumayı dene
    const { data: p2, error: p2Err } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if(p2Err) throw p2Err;
    profile = p2;
  }else{
    profile = p;
  }

  // 3) cache
  const cached = buildCache(user, profile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  return cached;
}

/* -----------------------------
   Login / Logout
------------------------------ */

/**
 * ✅ Login sayfandaki butona bunu bağla:
 * document.getElementById("googleBtn").addEventListener("click", loginWithGoogle);
 */
export async function loginWithGoogle(){
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: HOME_ABS
    }
  });
  if(error) throw error;
}

/**
 * ✅ Profilde “Güvenli Çıkış”
 */
export async function safeLogout(){
  await supabase.auth.signOut();
  clearCachedUser();
  location.replace(LOGIN_REL);
}

/* -----------------------------
   ui_guard.js köprüsü (senin sistem)
------------------------------ */
export async function startAuthState(callback) {
  const handleAuth = async (session) => {
    const user = session?.user || null;
    let wallet = 0;

    if(user){
      try{
        const cached = await ensureAuthAndCacheUser();
        wallet = Number(cached?.tokens ?? 0);
        callback({ user, wallet });
        return;
      }catch(e){
        // Cihaz başka hesaba bağlı vs.
        callback({ user: null, wallet: 0 });
        if(location.pathname !== "/pages/login.html"){
          location.replace(LOGIN_REL);
        }
        return;
      }
    }

    callback({ user: null, wallet: 0 });
  };

  const { data: { session } } = await supabase.auth.getSession();
  await handleAuth(session);

  supabase.auth.onAuthStateChange(async (_event, session) => {
    await handleAuth(session);
  });
}
