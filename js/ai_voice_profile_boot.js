// FILE: /js/ai_voice_profile_boot.js

async function boot() {
  try {
    const shell = await import("/js/ui_shell.js");
    if (typeof shell.mountShell === "function") {
      try {
        shell.mountShell({ scroll: "auto" });
      } catch (e) {
        console.warn("[ai_voice_profile_boot mountShell]", e);
      }
    }
  } catch (e) {
    console.warn("[ai_voice_profile_boot shell optional]", e);
  }

  try {
    await import("/js/ai_voice_profile_page.js?v=1");
  } catch (e) {
    console.error("[ai_voice_profile_boot page import]", e);
  }
}

boot();
