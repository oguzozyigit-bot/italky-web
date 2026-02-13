// /js/auth_state.js
import { supabase } from "/js/supabase_client.js";

let currentUser = null;

export function getCurrentUser() {
  return currentUser;
}

export function initAuthState(onReady) {

  supabase.auth.onAuthStateChange(async (event, session) => {

    if (!session?.user) {
      currentUser = null;
      onReady(null);
      return;
    }

    // İlk giriş / profil & wallet garanti
    await supabase.rpc("ensure_profile_and_welcome", {
      p_full_name: session.user.user_metadata?.full_name || "",
      p_email: session.user.email || "",
      p_avatar_url: session.user.user_metadata?.avatar_url || ""
    });

    currentUser = session.user;

    onReady(session.user);
  });

}
