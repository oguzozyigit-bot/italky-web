// FILE: /js/ui_guard.js
import { startAuthState } from "/js/auth.js";

/**
 * Sayfa türleri:
 * - protected: user yoksa login'e at
 * - public: user yoksa kalabilir (login sayfası gibi)
 */
export function bootPage({
  protectedPage = false,
  header = { nameId: "userName", picId: "userPic" },
  wallet = { elId: null } // örn profile'da tokenVal
} = {}){

  const nameEl = header?.nameId ? document.getElementById(header.nameId) : null;
  const picEl  = header?.picId  ? document.getElementById(header.picId)  : null;
  const walletEl = wallet?.elId ? document.getElementById(wallet.elId) : null;

  // placeholder: "Kullanıcı" yazma → flicker biter
  if(nameEl) nameEl.textContent = "…";

  startAuthState(({ user, wallet: bal }) => {
    if(!user){
      if(protectedPage){
        location.replace("/pages/login.html");
      }
      return;
    }

    // header
    if(nameEl){
      nameEl.textContent =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email ||
        "Kullanıcı";
    }
    if(picEl){
      const url = user.user_metadata?.avatar_url || user.user_metadata?.picture || "";
      if(url) picEl.src = url;
    }

    // wallet UI
    if(walletEl && typeof bal === "number"){
      walletEl.textContent = String(bal);
    }
  });
}
