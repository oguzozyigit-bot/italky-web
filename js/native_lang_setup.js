const LANGS = [
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "bg", name: "Bulgarca", flag: "🇧🇬" },
  { code: "bn", name: "Bengalce", flag: "🇧🇩" },
  { code: "ca", name: "Katalanca", flag: "🇪🇸" },
  { code: "cs", name: "Çekçe", flag: "🇨🇿" },
  { code: "da", name: "Danca", flag: "🇩🇰" },
  { code: "de", name: "Almanca", flag: "🇩🇪" },
  { code: "el", name: "Yunanca", flag: "🇬🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "et", name: "Estonca", flag: "🇪🇪" },
  { code: "eu", name: "Baskça", flag: "🇪🇸" },
  { code: "fi", name: "Fince", flag: "🇫🇮" },
  { code: "fr", name: "Fransızca", flag: "🇫🇷" },
  { code: "gl", name: "Galiçyaca", flag: "🇪🇸" },
  { code: "hu", name: "Macarca", flag: "🇭🇺" },
  { code: "id", name: "Endonezce", flag: "🇮🇩" },
  { code: "lt", name: "Litvanca", flag: "🇱🇹" },
  { code: "lv", name: "Letonca", flag: "🇱🇻" },
  { code: "ms", name: "Malayca", flag: "🇲🇾" },
  { code: "nl", name: "Hollandaca", flag: "🇳🇱" },
  { code: "pl", name: "Lehçe", flag: "🇵🇱" },
  { code: "ro", name: "Romence", flag: "🇷🇴" },
  { code: "ru", name: "Rusça", flag: "🇷🇺" },
  { code: "sk", name: "Slovakça", flag: "🇸🇰" },
  { code: "sl", name: "Slovence", flag: "🇸🇮" },
  { code: "sq", name: "Arnavutça", flag: "🇦🇱" },
  { code: "th", name: "Tayca", flag: "🇹🇭" },
  { code: "ur", name: "Urduca", flag: "🇵🇰" },
  { code: "vi", name: "Vietnamca", flag: "🇻🇳" },
  { code: "zh", name: "Çince", flag: "🇨🇳" }
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
