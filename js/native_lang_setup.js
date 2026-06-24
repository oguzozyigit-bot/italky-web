// FILE: /js/native_lang_setup.js

const LANGS = [
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "de", name: "Almanca", flag: "🇩🇪" },
  { code: "fr", name: "Fransızca", flag: "🇫🇷" },
  { code: "ru", name: "Rusça", flag: "🇷🇺" },
  { code: "bg", name: "Bulgarca", flag: "🇧🇬" },
  { code: "bn", name: "Bengalce", flag: "🇧🇩" },
  { code: "ca", name: "Katalanca", flag: "🇪🇸" },
  { code: "cs", name: "Çekçe", flag: "🇨🇿" },
  { code: "da", name: "Danca", flag: "🇩🇰" },
  { code: "el", name: "Yunanca", flag: "🇬🇷" },
  { code: "et", name: "Estonca", flag: "🇪🇪" },
  { code: "eu", name: "Baskça", flag: "🇪🇸" },
  { code: "fi", name: "Fince", flag: "🇫🇮" },
  { code: "gl", name: "Galiçyaca", flag: "🇪🇸" },
  { code: "hu", name: "Macarca", flag: "🇭🇺" },
  { code: "id", name: "Endonezce", flag: "🇮🇩" },
  { code: "lt", name: "Litvanca", flag: "🇱🇹" },
  { code: "lv", name: "Letonca", flag: "🇱🇻" },
  { code: "ms", name: "Malayca", flag: "🇲🇾" },
  { code: "nl", name: "Hollandaca", flag: "🇳🇱" },
  { code: "pl", name: "Lehçe", flag: "🇵🇱" },
  { code: "ro", name: "Romence", flag: "🇷🇴" },
  { code: "sk", name: "Slovakça", flag: "🇸🇰" },
  { code: "sl", name: "Slovence", flag: "🇸🇮" },
  { code: "sq", name: "Arnavutça", flag: "🇦🇱" },
  { code: "th", name: "Tayca", flag: "🇹🇭" },
  { code: "ur", name: "Urduca", flag: "🇵🇰" },
  { code: "vi", name: "Vietnamca", flag: "🇻🇳" },
  { code: "zh", name: "Çince", flag: "🇨🇳" }
];

const STORAGE = {
  nativeLang: "italky_native_lang_v7",
  installedV6: "italky_offline_installed_packs_v6",
  installedV5: "italky_offline_installed_packs_v5",
  installedPairsV7: "italky_offline_installed_pairs_v7",
  installing: "italky_offline_installing_v1",
  installState: "italky_offline_install_state_v1"
};
// Migrate v1 → v7 once
try {
  const v1 = localStorage.getItem("italky_native_lang_v1");
  if (v1 && !localStorage.getItem("italky_native_lang_v7")) {
    localStorage.setItem("italky_native_lang_v7", v1);
  }
} catch {}

const listEl = document.getElementById("langList");
const saveBtn = document.getElementById("saveBtn");
const statusCard = document.getElementById("installStatusCard");
const statusTitle = document.getElementById("installStatusTitle");
const statusLine = document.getElementById("installStatusLine");
const progressFill = document.getElementById("installProgressFill");
const statusPills = document.getElementById("installStatusPills");

let selected = localStorage.getItem(STORAGE.nativeLang) || "tr";
let activeInstall = null;

function safeParse(raw, fallback) {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

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

function getLangInfo(code) {
  return LANGS.find(x => x.code === code) || { code, name: code.toUpperCase(), flag: "🌐" };
}

function packKeyForLang(code) {
  return `${String(code || "").trim().toLowerCase()}-offline`;
}

function getInstalledPacks() {
  const v6 = safeParse(localStorage.getItem(STORAGE.installedV6) || "[]", []);
  const v5 = safeParse(localStorage.getItem(STORAGE.installedV5) || "[]", []);
  const map = new Map();

  [...v6, ...v5].forEach((item) => {
    if (!item?.lang_pack || !item?.lang) return;
    map.set(item.lang_pack, item);
  });

  return [...map.values()];
}

function saveInstalledPacks(list) {
  const clean = Array.isArray(list) ? list : [];
  const json = JSON.stringify(clean);
  localStorage.setItem(STORAGE.installedV6, json);
  localStorage.setItem(STORAGE.installedV5, json);

  // Mirror to v7 pairs format so offline_languages_page and facetoface_offline can read them
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE.installedPairsV7) || "{}");
    const nativeLang = localStorage.getItem(STORAGE.nativeLang) || "tr";
    const nativeLangCode = String(nativeLang).toLowerCase().split("-")[0];
    const ready = clean.filter(x => x?.status === "ready" && x?.lang);
    for (const pack of ready) {
      const lang = String(pack.lang).toLowerCase().split("-")[0];
      const expiresAt = pack.expires_at || "2099-12-31T23:59:59.000Z";
      const installedAt = pack.starts_at || new Date().toISOString();
      if (lang !== nativeLangCode) {
        const k1 = `${nativeLangCode}_${lang}`;
        const k2 = `${lang}_${nativeLangCode}`;
        existing[k1] = { from: nativeLangCode, to: lang, installedAt, expiresAt };
        existing[k2] = { from: lang, to: nativeLangCode, installedAt, expiresAt };
      }
    }
    localStorage.setItem(STORAGE.installedPairsV7, JSON.stringify(existing));
  } catch {}
}

function upsertInstalledPack(entry) {
  const list = getInstalledPacks();
  const idx = list.findIndex(x => x.lang_pack === entry.lang_pack);
  if (idx >= 0) list[idx] = { ...list[idx], ...entry };
  else list.push(entry);
  saveInstalledPacks(list);
}

function setInstallingLangs(langs) {
  localStorage.setItem(STORAGE.installing, JSON.stringify(langs));
}

function readInstallState() {
  return safeParse(localStorage.getItem(STORAGE.installState) || "null", null);
}

function writeInstallState(data) {
  localStorage.setItem(STORAGE.installState, JSON.stringify(data));
}

function clearInstallState() {
  localStorage.removeItem(STORAGE.installState);
}

function showStatus() {
  statusCard?.classList.add("show");
}

function setProgress(value) {
  const pct = Math.max(0, Math.min(100, Number(value || 0)));
  if (progressFill) progressFill.style.width = `${pct}%`;
}

function setPills(items = []) {
  if (!statusPills) return;
  statusPills.innerHTML = items.map(item => {
    const cls = item.type || "";
    return `<div class="pill ${cls}">${item.text}</div>`;
  }).join("");
}

function renderStatus(state) {
  if (!state) return;
  showStatus();

  const nativeInfo = getLangInfo(state.native_lang || "tr");
  const enInfo = getLangInfo("en");

  if (statusTitle) statusTitle.textContent = state.title || "Offline hazırlık";
  if (statusLine) statusLine.textContent = state.message || "Hazırlık sürüyor...";
  setProgress(state.progress ?? 0);

  setPills([
    { text: `${nativeInfo.flag} ${nativeInfo.name}`, type: state.native_ready ? "ok" : "warn" },
    { text: `${enInfo.flag} ${enInfo.name}`, type: state.en_ready ? "ok" : "warn" },
    { text: state.failed ? "Kurulumda sorun var" : "Hazırlanıyor", type: state.failed ? "bad" : "warn" }
  ]);
}

function seedPendingPacks(nativeLang) {
  const startedAt = new Date().toISOString();

  upsertInstalledPack({
    lang_pack: packKeyForLang(nativeLang),
    free_pack: true,
    token_spent: 0,
    starts_at: startedAt,
    expires_at: "2099-12-31T23:59:59.000Z",
    lang: nativeLang,
    status: "installing"
  });

  upsertInstalledPack({
    lang_pack: packKeyForLang("en"),
    free_pack: true,
    token_spent: 0,
    starts_at: startedAt,
    expires_at: "2099-12-31T23:59:59.000Z",
    lang: "en",
    status: "installing"
  });

  setInstallingLangs([nativeLang, "en"]);
}

function markLangInstalled(lang) {
  upsertInstalledPack({
    lang_pack: packKeyForLang(lang),
    free_pack: true,
    token_spent: 0,
    starts_at: new Date().toISOString(),
    expires_at: "2099-12-31T23:59:59.000Z",
    lang,
    status: "installed"
  });
}

function finalizeInstallingState(nativeLang, nativeReady, enReady) {
  const next = [];
  if (!nativeReady) next.push(nativeLang);
  if (!enReady) next.push("en");
  setInstallingLangs(next);
}

async function notifyAppToPrepare(lang) {
  localStorage.setItem(STORAGE.nativeLang, lang);

  seedPendingPacks(lang);

  const state = {
    native_lang: lang,
    native_ready: false,
    en_ready: false,
    failed: false,
    progress: 10,
    title: "Offline hazırlık başlatıldı",
    message: "Ana diliniz ve İngilizce hazırlanıyor..."
  };

  activeInstall = state;
  writeInstallState(state);
  renderStatus(state);

  try {
    if (window.AndroidOfflineTranslate && typeof window.AndroidOfflineTranslate.prepareOfflineLang === "function") {
      window.AndroidOfflineTranslate.prepareOfflineLang(lang);
      return true;
    }

    if (window.Android && typeof window.Android.prepareOfflineLang === "function") {
      window.Android.prepareOfflineLang(lang);
      return true;
    }
  } catch (e) {
    console.error("prepareOfflineLang error", e);
  }

  state.failed = true;
  state.progress = 100;
  state.title = "Hazırlık bildirimi gönderilemedi";
  state.message = "Uygulama indirme işlemini başlatamadı. Daha sonra Offline Languages ekranından tekrar deneyin.";
  writeInstallState(state);
  renderStatus(state);
  return false;
}

function handleNativeProgress(payload = {}) {
  const state = readInstallState() || activeInstall;
  if (!state) return;

  const progress = Number(payload.progress ?? state.progress ?? 0);
  state.progress = Math.max(state.progress || 0, progress);
  state.title = "Offline hazırlık sürüyor";
  state.message = payload.message || "Dil paketleri indiriliyor...";
  writeInstallState(state);
  renderStatus(state);
}

function handleNativeComplete(payload = {}) {
  const state = readInstallState() || activeInstall;
  if (!state) return;

  const nativeLang = state.native_lang || selected;
  const completed = Array.isArray(payload.langs)
    ? payload.langs.map(x => String(x || "").trim().toLowerCase())
    : [nativeLang, "en"];

  let nativeReady = !!state.native_ready;
  let enReady = !!state.en_ready;

  completed.forEach((lang) => {
    if (lang === nativeLang) nativeReady = true;
    if (lang === "en") enReady = true;
    markLangInstalled(lang);
  });

  state.native_ready = nativeReady;
  state.en_ready = enReady;
  state.progress = 100;
  state.failed = false;
  state.title = "Offline hazırlık tamamlandı";
  state.message = "Seçilen ana dil ve İngilizce hazır.";

  finalizeInstallingState(nativeLang, nativeReady, enReady);
  writeInstallState(state);
  renderStatus(state);
}

function handleNativeFail(payload = {}) {
  const state = readInstallState() || activeInstall;
  if (!state) return;

  state.failed = true;
  state.progress = Math.max(15, Number(state.progress || 0));
  state.title = "Offline hazırlık tamamlanamadı";
  state.message = payload.message || "İndirme sırasında sorun oluştu. Offline Languages ekranından tekrar deneyin.";

  writeInstallState(state);
  renderStatus(state);
}

window.italkyOfflineInstallProgress = function(payload) {
  handleNativeProgress(typeof payload === "string" ? safeParse(payload, {}) : payload);
};

window.italkyOfflineInstallCompleted = function(payload) {
  handleNativeComplete(typeof payload === "string" ? safeParse(payload, {}) : payload);
};

window.italkyOfflineInstallFailed = function(payload) {
  handleNativeFail(typeof payload === "string" ? safeParse(payload, {}) : payload);
};

window.addEventListener("italky-offline-progress", (e) => {
  handleNativeProgress(e.detail || {});
});

window.addEventListener("italky-offline-complete", (e) => {
  handleNativeComplete(e.detail || {});
});

window.addEventListener("italky-offline-failed", (e) => {
  handleNativeFail(e.detail || {});
});

saveBtn.addEventListener("click", async () => {
  saveBtn.disabled = true;
  await notifyAppToPrepare(selected);

  setTimeout(() => {
    location.replace("/pages/home.html");
  }, 700);
});

const savedState = readInstallState();
if (savedState) {
  activeInstall = savedState;
  renderStatus(savedState);
}

render();
