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
    localStorage.setItem(STORAGE_KEY, lang);

    if (window.AndroidOfflineTranslate && typeof window.AndroidOfflineTranslate.prepareOfflineLang === "function") {
      window.AndroidOfflineTranslate.prepareOfflineLang(lang);
      return;
    }

    if (window.Android && typeof window.Android.prepareOfflineLang === "function") {
      window.Android.prepareOfflineLang(lang);
    }
  } catch (e) {
    console.error("prepareOfflineLang error", e);
  }
}

saveBtn.addEventListener("click", async () => {
  await notifyAppToPrepare(selected);
  location.replace("/pages/home.html");
});

render();
