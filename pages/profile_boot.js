// FILE: /js/profile_boot.js

import { mountShell, setHeaderTokens } from "/js/ui_shell.js";
import { initProfilePage } from "/js/profile_page.js";

async function boot(){
  try{
    mountShell({ scroll: "auto" });
  }catch(e){
    console.error("[profile_boot mountShell]", e);
  }

  try{
    await import("/js/voice_profile_page.js?v=final_free_all_2");
  }catch(e){
    console.error("[profile_boot initProfilePage]", e);
  }

  document.getElementById("buyTokensBtn")?.addEventListener("click", ()=>{
    location.href = "/pages/jetonbuy.html";
  });
}

boot();
