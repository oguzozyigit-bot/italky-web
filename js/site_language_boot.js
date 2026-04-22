import { initSiteLanguageManager } from "/js/site_language_manager.js";

(async () => {
  try {
    const manager = await initSiteLanguageManager();

    setTimeout(async () => {
      try {
        const current = manager?.getCurrentLanguage?.() || "tr";
        if (current && current !== "tr") {
          await manager.setLanguage(current);
        }
      } catch (e) {
        console.warn("[site language delayed apply]", e);
      }
    }, 700);
  } catch (e) {
    console.warn("[site language boot]", e);
  }
})();
