// FILE: /js/voice_profile_boot.js

let __voiceProfileBooted = false;

async function boot() {
  if (__voiceProfileBooted) return;
  __voiceProfileBooted = true;

  try {
    const shell = await import("/js/ui_shell.js");
    if (typeof shell.mountShell === "function") {
      try {
        shell.mountShell({ scroll: "auto" });
      } catch (e) {
        console.warn("[voice_profile_boot shell]", e);
      }
    }
  } catch (e) {
    console.warn("[voice_profile_boot shell import]", e);
  }

  try {
    await import("/js/voice_profile_page.js?v=final_free_all");
  } catch (e) {
    console.error("[voice_profile_boot page]", e);
  }
}

boot();
