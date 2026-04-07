const LANGS = [
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "ar", name: "العربية", flag: "🇸🇦" }
];

const STORAGE_KEY = "italky_native_lang_v1";
const listEl = document.getElementById("langList");
const saveBtn = document.getElementById("saveBtn");

let selected = localStorage.getItem(STORAGE_KEY) || "tr";

function render() {
  listEl.innerHTML = LANGS.map(l => `
    <button class="lang-btn ${selected === l.code ? "active" : ""}" data-code="${l.code}">
      <span class="left"><span class="flag">${l.flag}</span>${l.name}</span>
      <span>${selected === l.code ? "✓" : ""}</span>
    </button>
  `).join("");

  listEl.querySelectorAll(".lang-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      selected = btn.dataset.code;
      render();
    });
  });
}

async function notifyAppToPrepare(lang) {
  try {
    if (window.AndroidOfflineTranslate && typeof window.AndroidOfflineTranslate.ensureCorePacks === "function") {
      // Şimdilik tr-en tek zip mantığı sende kurulu.
      // İleride dili dinamikleştireceğiz.
      window.AndroidOfflineTranslate.ensureCorePacks();
      return;
    }
    if (window.Android && typeof window.Android.ensureCorePacks === "function") {
      window.Android.ensureCorePacks();
    }
  } catch (e) {
    console.error("ensureCorePacks error", e);
  }
}

saveBtn.addEventListener("click", async () => {
  localStorage.setItem(STORAGE_KEY, selected);

  // App tarafına haber ver
  await notifyAppToPrepare(selected);

  // Bekletmeden home'a geç
  location.replace("/pages/home.html");
});

render();
