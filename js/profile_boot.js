// FILE: /js/voice_profile_boot.js

async function boot(){
  // ui_shell opsiyonel
  try{
    const shell = await import("/js/ui_shell.js");
    if(typeof shell.mountShell === "function"){
      try{
        shell.mountShell({ scroll: "auto" });
      }catch(e){
        console.error("[voice_profile_boot mountShell call]", e);
      }
    }
  }catch(e){
    console.warn("[voice_profile_boot ui_shell optional load fail]", e);
  }

  try{
    await import("/js/voice_profile_page.js?v=fix1");
  }catch(e){
    console.error("[voice_profile_boot page import fail]", e);
  }
}

boot();
