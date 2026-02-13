// FILE: /js/auth.js
import { supabase } from "/js/supabase_client.js";
import { STORAGE_KEY } from "/js/config.js";

// Supabase user -> standart user objesi
function toStdUser(u){
  if(!u) return null;
  const md = u.user_metadata || {};
  const name = (md.full_name || md.name || u.email || "Kullanıcı").trim();
  const email = (u.email || "").trim();
  const picture = (md.avatar_url || md.picture || "").trim();
  return { name, email, picture };
}

// ✅ session varsa STORAGE_KEY’e yaz + profile/wallet kur + wallet cache
export async function ensureAuthAndCacheUser(){
  try{
    const { data, error } = await supabase.auth.getSession();
    if(error){
      console.error("[auth] getSession error:", error);
      return null;
    }

    const session = data?.session;
    if(!session?.user) return null;

    const std = toStdUser(session.user);
    if(std){
      try{
        localStorage.setItem(STORAGE_KEY, JSON.stringify(std));
      }catch(e){
        console.error("[auth] localStorage set STORAGE_KEY failed:", e);
      }
    }

    // ✅ İlk giriş: profile + 10 token hediye (RPC)
    try{
      const { error: rpcErr } = await supabase.rpc("ensure_profile_and_welcome", {
        p_full_name: std?.name || "",
        p_email: std?.email || "",
        p_avatar_url: std?.picture || ""
      });
      if(rpcErr) console.error("[auth] ensure_profile_and_welcome error:", rpcErr);
    }catch(e){
      console.error("[auth] ensure_profile_and_welcome exception:", e);
    }

    // ✅ Wallet çek (row yoksa sorun çıkarma)
    try{
      const { data: w, error: wErr } = await supabase
        .from("wallets")
        .select("balance, earned_total, spent_total")
        .maybeSingle();

      if(wErr){
        console.error("[auth] wallets select error:", wErr);
      }else if(w && typeof w.balance === "number"){
        localStorage.setItem("italky_wallet", JSON.stringify({
          balance: w.balance,
          earned: w.earned_total || 0,
          spent: w.spent_total || 0
        }));
      }
    }catch(e){
      console.error("[auth] wallets fetch exception:", e);
    }

    return std;
  }catch(e){
    console.error("[auth] ensureAuthAndCacheUser fatal:", e);
    return null;
  }
}

// Google login başlat
export async function loginWithGoogle(){
  const redirectTo = `${window.location.origin}/pages/home.html`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo }
  });
  if(error){
    console.error("[auth] signInWithOAuth error:", error);
    alert("Google Login Hata: " + error.message);
  }
}

// Logout (Supabase + local)
export async function logoutEverywhere(){
  try{ await supabase.auth.signOut(); }catch(e){ console.error("[auth] signOut error:", e); }
  try{ localStorage.removeItem(STORAGE_KEY); }catch{}
  try{ localStorage.removeItem("italky_wallet"); }catch{}
}

// ✅ Eski login sayfalarının uyumu (istersen kullan, zarar yok)
export async function redirectIfLoggedIn(){
  const u = await ensureAuthAndCacheUser();
  return !!u;
}

// ✅ Eski login sayfalarının uyumu (GSI yerine Supabase butonu kullanıyoruz)
export function initAuth(){
  // Bu fonksiyon eskiden GSI render ediyordu; artık gerek yok.
  // Boş bırakıyoruz ki eski sayfalar patlamasın.
}
