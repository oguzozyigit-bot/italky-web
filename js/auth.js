// FILE: /js/auth.js
import { supabase } from "/js/supabase_client.js";
import { STORAGE_KEY } from "/js/config.js";

// Supabase user -> bizim standart user objemiz
function toStdUser(u){
  if(!u) return null;
  const md = u.user_metadata || {};
  const name = (md.full_name || md.name || u.email || "Kullanıcı").trim();
  const email = (u.email || "").trim();
  const picture = (md.avatar_url || md.picture || "").trim();
  return { name, email, picture };
}

// ✅ En kritik fonksiyon: session varsa STORAGE_KEY’e yaz + profile/wallet kur
export async function ensureAuthAndCacheUser(){
  try{
    const { data: { session } } = await supabase.auth.getSession();
    if(!session?.user) return null;

    const std = toStdUser(session.user);
    if(std){
      localStorage.setItem(STORAGE_KEY, JSON.stringify(std));
    }

    // ✅ İlk girişte profile + 10 token hediye (RPC)
    // (Fonksiyonu daha önce SQL ile oluşturduk)
    await supabase.rpc("ensure_profile_and_welcome", {
      p_full_name: std?.name || "",
      p_email: std?.email || "",
      p_avatar_url: std?.picture || ""
    });

    // Wallet balance'i çek (UI için local cache)
    // wallets tablosu: user_id = auth.uid()
    const { data: w } = await supabase
      .from("wallets")
      .select("balance, earned_total, spent_total")
      .single();

    if(w && typeof w.balance === "number"){
      localStorage.setItem("italky_wallet", JSON.stringify({
        balance: w.balance,
        earned: w.earned_total || 0,
        spent: w.spent_total || 0
      }));
    }

    return std;
  }catch{
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
  if(error) alert("Google Login Hata: " + error.message);
}

// Logout (Supabase + local)
export async function logoutEverywhere(){
  try{ await supabase.auth.signOut(); }catch{}
  try{ localStorage.removeItem(STORAGE_KEY); }catch{}
  // (İstersen wallet’ı da sil: localStorage.removeItem("italky_wallet"))
}
