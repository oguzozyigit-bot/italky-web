// FILE: /js/auth_state.js
import { supabase } from "/js/supabase_client.js";

let _started = false;
let _user = null;

/**
 * Tek yerden auth yönetimi:
 * - session yoksa callback(null)
 * - session varsa: (INITIAL_SESSION / SIGNED_IN) => RPC ensure_profile_and_welcome çağır
 * - sonra wallet'ı çekip callback(user, walletBalance)
 */
export function startAuthState(onChange){
  if(_started) return;
  _started = true;

  const emit = async (session, event) => {
    if(!session?.user){
      _user = null;
      onChange?.({ user: null, wallet: null, event });
      return;
    }

    _user = session.user;

    // ✅ İlk girişte / session restore’da profile+wallet garanti
    if(event === "SIGNED_IN" || event === "INITIAL_SESSION"){
      try{
        await supabase.rpc("ensure_profile_and_welcome", {
          p_full_name: _user.user_metadata?.full_name || _user.user_metadata?.name || "",
          p_email: _user.email || "",
          p_avatar_url: _user.user_metadata?.avatar_url || _user.user_metadata?.picture || ""
        });
      }catch(e){
        console.error("[auth_state] ensure_profile_and_welcome error:", e);
      }
    }

    // ✅ wallet çek
    let wallet = null;
    try{
      const { data, error } = await supabase
        .from("wallets")
        .select("balance")
        .maybeSingle();
      if(!error && data) wallet = data.balance;
    }catch(e){
      console.error("[auth_state] wallet fetch error:", e);
    }

    onChange?.({ user: _user, wallet, event });
  };

  // 1) İlk session restore
  supabase.auth.getSession().then(({ data }) => emit(data?.session, "INITIAL_SESSION"));

  // 2) Sonraki auth eventleri
  supabase.auth.onAuthStateChange((event, session) => {
    emit(session, event);
  });
}

export function getUser(){
  return _user;
}
