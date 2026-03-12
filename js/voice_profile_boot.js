// FILE: /js/voice_profile_boot.js

async function boot(){

  try{

    const shell = await import("/js/ui_shell.js")

    if(typeof shell.mountShell === "function"){
      shell.mountShell({scroll:"auto"})
    }

  }catch(e){
    console.warn("[voice_profile_boot shell]", e)
  }

  try{

    const page = await import("/js/voice_profile_page.js?v=pro2")

    if(page.initVoiceProfile){
      page.initVoiceProfile()
    }

  }catch(e){
    console.error("[voice_profile_boot page]", e)
  }

}

boot()
