// FILE: /js/profile_boot.js

import { initProfilePage } from "/js/profile_page.js";

async function boot(){
  let setHeaderTokensSafe = () => {};

  // ui_shell opsiyonel
  try{
    const shell = await import("/js/ui_shell.js");

    if(typeof shell.mountShell === "function"){
      try{
        shell.mountShell({ scroll: "auto" });
      }catch(e){
        console.error("[profile_boot mountShell call]", e);
      }
    }

    if(typeof shell.setHeaderTokens === "function"){
      setHeaderTokensSafe = shell.setHeaderTokens;
    }
  }catch(e){
    console.warn("[profile_boot ui_shell optional load fail]", e);
  }

  try{
    await initProfilePage({ setHeaderTokens: setHeaderTokensSafe });
  }catch(e){
    console.error("[profile_boot initProfilePage]", e);
  }

  document.getElementById("buyTokensBtn")?.addEventListener("click", ()=>{
    location.href = "/pages/jetonbuy.html";
  });
}

boot();
