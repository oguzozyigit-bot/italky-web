// FILE: /js/voice_profile_boot.js

async function boot() {
  try {
    const shell = await import("/js/ui_shell.js");
    if (typeof shell.mountShell === "function") {
      try {
        shell.mountShell({ scroll: "auto" });
      } catch (e) {
        console.warn("[voice_profile_boot mountShell]", e);
      }
    }
  } catch (e) {
    console.warn("[voice_profile_boot shell optional]", e);
  }

  try {
    await import("/js/voice_profile_page.js?v=pro1");
  } catch (e) {
    console.error("[voice_profile_boot page import]", e);
  }
}

boot();
