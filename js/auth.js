// FILE: /js/auth.js
import { supabase } from "/js/supabase_client.js";
import { STORAGE_KEY } from "/js/config.js";

const HOME_REL = "/pages/home.html";
const LOGIN_REL = "/pages/login.html";
const CALLBACK_ABS = `${location.origin}/pages/auth_callback.html`;

// ✅ Single-session local key
const ACTIVE_SESSION_LOCAL_KEY = "ITALKY_ACTIVE_SESSION_KEY";
let __singleWatcherStarted = false;

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

function nukeSupabaseLocal(){
  try{
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i);
      if(!k) continue;
      if(k.startsWith("sb-")) keys.push(k);
    }
    keys.forEach(k=>localStorage.removeItem(k));
  }catch{}
}

/* -----------------------------
   Single Active Session
   ✅ Son giren kazanır (doğru)
   - Key sadece bu cihazda yoksa üretilir
   - Watcher myKey'i sabitlemez, her tur localStorage'dan okur
------------------------------ */
function newSessionKey(){
  return (globalThis.crypto?.randomUUID?.() || `sess-${Date.now()}-${Math.floor(Math.random()*1e9)}`);
}

async function claimActiveSessionIfNeeded(userId){
  let myKey = "";
  try{ myKey = (localStorage.getItem(ACTIVE_SESSION_LOCAL_KEY) || "").trim(); }catch{}

  // ✅ Aynı cihazda key varsa DB'yi değiştirme (aksi halde döngü olur)
  if(myKey) return myKey;

  // ✅ Bu cihaz ilk kez giriş yapıyor -> DB'ye yaz (son giren kazanır)
  myKey = newSessionKey();
  const { error } = await supabase
    .from("profiles")
    .update({
      active_session_key: myKey,
      active_session_updated_at: new Date().toISOString()
    })
    .eq("id", userId);

  if(error) throw error;

  try{ localStorage.setItem(ACTIVE_SESSION_LOCAL_KEY, myKey); }catch{}
  return myKey;
}

function startSingleSessionWatcher(userId){
  if(__singleWatcherStarted) return;
  __singleWatcherStarted = true;

  setInterval(async ()=>{
    try{
      if(location.pathname === LOGIN_REL) return;

      const myKey = (localStorage.getItem(ACTIVE_SESSION_LOCAL_KEY) || "").trim();
      if(!myKey) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("active_session_key")
        .eq("id", userId)
        .single();

      if(error) return;

      const liveKey = String(data?.active_session_key || "").trim();
      if(liveKey && liveKey !== myKey){
        // başka cihaz giriş yaptı -> bu oturumu kapat
        try{ await supabase.auth.signOut({ scope:"global" }); }catch{}
        try{ localStorage.removeItem(STORAGE_KEY); }catch{}
        try{ localStorage.removeItem(ACTIVE_SESSION_LOCAL_KEY); }catch{}
        // NAC_ID'yi silmiyoruz (cihaz kilidi devam etsin)
        nukeSupabaseLocal();

        alert("Hesabınız başka bir cihaz/sekmede açıldığı için bu oturum kapatıldı.");
        location.replace(LOGIN_REL);
      }
    }catch{}
  }, 5000); // 5 sn kontrol (istersen 2000 yaparız)
}

/* -----------------------------
   Ensure profile + cache
------------------------------ */
export async function ensureAuthAndCacheUser(){
  const { data:{ session }, error: sErr } = await supabase.auth.getSession();
  if(sErr) throw sErr;
  if(!session?.user) return null;

  const user = session.user;

  // deletion request varsa iptal et (varsa)
  try{ await supabase.rpc("cancel_account_deletion"); } catch(_) {}

  // 1) NAC cihaz kilidi (aynı telefonda farklı kullanıcı yok)
  try{
    await lockThisDevice();
  }catch(e){
    // başka hesaba bağlı cihaz ise -> logout
    try{ await supabase.auth.signOut({ scope:"global" }); }catch{}
    clearCachedUser();
    nukeSupabaseLocal();
    throw new Error(e?.message || "Cihaz kilidi alınamadı.");
  }

  // 2) profile garanti
  let profile = null;
  try{
    const { data: p, error: pErr } = await supabase.rpc("ensure_profile");
    if(pErr) throw pErr;
    profile = p;
  }catch{
    const { data: p2, error: p2Err } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if(p2Err) throw p2Err;
    profile = p2;
  }

  // ✅ 3) son giren kazanır key'i (bu cihazda yoksa yaz)
  try{
    await claimActiveSessionIfNeeded(user.id);
  }catch(e){
    // key yazma başarısızsa sistemi çökertme, sadece single-session devre dışı kalır
    console.warn("claimActiveSessionIfNeeded error:", e);
  }

  // 4) cache
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
    options: { redirectTo: CALLBACK_ABS }
  });
  if(error) throw error;
}

export async function safeLogout(){
  try{ await supabase.auth.signOut({ scope:"global" }); }catch{}
  clearCachedUser();
  try{ localStorage.removeItem(ACTIVE_SESSION_LOCAL_KEY); }catch{}
  // NAC_ID kalabilir (cihaz kilidi)
  nukeSupabaseLocal();
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

        // ✅ watcher burada başlar (tüm sayfalarda çalışır)
        startSingleSessionWatcher(user.id);

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
