import { mountShell } from "/js/ui_shell.js";
import { maybeShowOfflineDownloadAd } from "/js/ad_gate.js?v=8";

const $ = (id) => document.getElementById(id);

const installedList = $("installedList");
const searchInput = $("searchInput");
const licenseInfo = $("licenseInfo");

const myLangPickerBtn = $("myLangPickerBtn");
const myLangFlag = $("myLangFlag");
const myLangTitle = $("myLangTitle");

const confirmBackdrop = $("confirmBackdrop");
const confirmTitle = $("confirmTitle");
const confirmText = $("confirmText");
const confirmCancel = $("confirmCancel");
const confirmOk = $("confirmOk");

const langPickerBackdrop = $("langPickerBackdrop");
const langPickerList = $("langPickerList");
const langPickerClose = $("langPickerClose");

const toastEl = $("toast");

const STORAGE = {
  installed: "italky_offline_installed_pairs_v7",
  downloading: "italky_offline_downloading_pairs_v7",
  nativeLang: "italky_native_lang_v7",
  offlineLicenseDays: "italky_offline_license_days_v7",
  siteLang: "site_lang",
  legacySiteLang: "italky_site_lang_v1"
};

const ALL_OFFLINE_LANGS = [
  { code: "af", name: "Afrikanca", flag: "🇿🇦" },
  { code: "ar", name: "Arapça", flag: "🇸🇦" },
  { code: "be", name: "Belarusça", flag: "🇧🇾" },
  { code: "bg", name: "Bulgarca", flag: "🇧🇬" },
  { code: "bn", name: "Bengalce", flag: "🇧🇩" },
  { code: "ca", name: "Katalanca", flag: "🇪🇸" },
  { code: "cs", name: "Çekçe", flag: "🇨🇿" },
  { code: "cy", name: "Galce", flag: "🏴" },
  { code: "da", name: "Danca", flag: "🇩🇰" },
  { code: "de", name: "Almanca", flag: "🇩🇪" },
  { code: "el", name: "Yunanca", flag: "🇬🇷" },
  { code: "en", name: "İngilizce", flag: "🇬🇧" },
  { code: "eo", name: "Esperanto", flag: "🌍" },
  { code: "es", name: "İspanyolca", flag: "🇪🇸" },
  { code: "et", name: "Estonca", flag: "🇪🇪" },
  { code: "fa", name: "Farsça", flag: "🇮🇷" },
  { code: "fi", name: "Fince", flag: "🇫🇮" },
  { code: "fr", name: "Fransızca", flag: "🇫🇷" },
  { code: "ga", name: "İrlandaca", flag: "🇮🇪" },
  { code: "gl", name: "Galiçyaca", flag: "🇪🇸" },
  { code: "gu", name: "Guceratça", flag: "🇮🇳" },
  { code: "he", name: "İbranice", flag: "🇮🇱" },
  { code: "hi", name: "Hintçe", flag: "🇮🇳" },
  { code: "hr", name: "Hırvatça", flag: "🇭🇷" },
  { code: "ht", name: "Haiti Kreyolu", flag: "🇭🇹" },
  { code: "hu", name: "Macarca", flag: "🇭🇺" },
  { code: "id", name: "Endonezce", flag: "🇮🇩" },
  { code: "is", name: "İzlandaca", flag: "🇮🇸" },
  { code: "it", name: "İtalyanca", flag: "🇮🇹" },
  { code: "ja", name: "Japonca", flag: "🇯🇵" },
  { code: "ka", name: "Gürcüce", flag: "🇬🇪" },
  { code: "kn", name: "Kannada", flag: "🇮🇳" },
  { code: "ko", name: "Korece", flag: "🇰🇷" },
  { code: "lt", name: "Litvanca", flag: "🇱🇹" },
  { code: "lv", name: "Letonca", flag: "🇱🇻" },
  { code: "mk", name: "Makedonca", flag: "🇲🇰" },
  { code: "mr", name: "Marathi", flag: "🇮🇳" },
  { code: "ms", name: "Malayca", flag: "🇲🇾" },
  { code: "mt", name: "Maltaca", flag: "🇲🇹" },
  { code: "nl", name: "Hollandaca", flag: "🇳🇱" },
  { code: "no", name: "Norveççe", flag: "🇳🇴" },
  { code: "pl", name: "Lehçe", flag: "🇵🇱" },
  { code: "pt", name: "Portekizce", flag: "🇵🇹" },
  { code: "ro", name: "Romence", flag: "🇷🇴" },
  { code: "ru", name: "Rusça", flag: "🇷🇺" },
  { code: "sk", name: "Slovakça", flag: "🇸🇰" },
  { code: "sl", name: "Slovence", flag: "🇸🇮" },
  { code: "sq", name: "Arnavutça", flag: "🇦🇱" },
  { code: "sv", name: "İsveççe", flag: "🇸🇪" },
  { code: "sw", name: "Svahili", flag: "🇹🇿" },
  { code: "ta", name: "Tamilce", flag: "🇮🇳" },
  { code: "te", name: "Telugu", flag: "🇮🇳" },
  { code: "th", name: "Tayca", flag: "🇹🇭" },
  { code: "tl", name: "Tagalog", flag: "🇵🇭" },
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "uk", name: "Ukraynaca", flag: "🇺🇦" },
  { code: "ur", name: "Urduca", flag: "🇵🇰" },
  { code: "vi", name: "Vietnamca", flag: "🇻🇳" },
  { code: "zh", name: "Çince", flag: "🇨🇳" }
];

const PRIORITY_ORDER = ["tr", "en", "de", "fr", "ru", "ar", "es", "it"];
const OFFLINE_PAGE_SESSION_KEY = "offline_languages_page";

let LANGS = [];
let busy = false;
let confirmResolver = null;
let globalDownloadLock = false;

function toast(message = "") {
  if (!toastEl) return;
  toastEl.textContent = String(message || "");
  toastEl.classList.add("show");
  clearTimeout(window.__offlineToastTimer);
  window.__offlineToastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2400);
}

function ensureMockOfflineLicenseOnce() {
  try {
    if (
      !window.OfflineTranslate ||
      typeof window.OfflineTranslate.setMockOfflineLicense !== "function"
    ) {
      return;
    }

    const key = "italky_offline_mock_license_offline_page_v2";
    if (localStorage.getItem(key) === "1") return;

    window.OfflineTranslate.setMockOfflineLicense(365);
    localStorage.setItem(key, "1");
  } catch (e) {
    console.error("Mock lisans yazılamadı:", e);
  }
}

function safeJsonParse(raw, fallback) {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function canonical(code) {
  return String(code || "").trim().toLowerCase();
}

function getOfflineLicenseDays() {
  const v = Number(localStorage.getItem(STORAGE.offlineLicenseDays) || "365");
  return Number.isFinite(v) && v > 0 ? v : 365;
}

function getPreferredInitialNativeLang() {
  const savedNative = canonical(localStorage.getItem(STORAGE.nativeLang) || "");
  if (savedNative) return savedNative;

  const siteLang = canonical(
    localStorage.getItem(STORAGE.siteLang) ||
    localStorage.getItem(STORAGE.legacySiteLang) ||
    ""
  );
  if (siteLang) return siteLang;

  return "tr";
}

function canUseNativeMirror() {
  return !!(
    window.OfflineTranslate &&
    typeof window.OfflineTranslate.getNativeOfflineLang === "function" &&
    typeof window.OfflineTranslate.setNativeOfflineLang === "function" &&
    typeof window.OfflineTranslate.getInstalledOfflinePairs === "function" &&
    typeof window.OfflineTranslate.setInstalledOfflinePairs === "function" &&
    typeof window.OfflineTranslate.clearInstalledOfflinePairs === "function"
  );
}

function getNativeInstalledPairs() {
  try {
    if (!window.OfflineTranslate || typeof window.OfflineTranslate.getInstalledOfflinePairs !== "function") {
      return {};
    }

    const raw = window.OfflineTranslate.getInstalledOfflinePairs() || "{}";
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    console.error("Native installed pairs okunamadı:", e);
    return {};
  }
}

function syncStorageFromNative() {
  if (!canUseNativeMirror()) return;

  try {
    const nativeLang = canonical(window.OfflineTranslate.getNativeOfflineLang() || "");
    if (nativeLang) {
      localStorage.setItem(STORAGE.nativeLang, nativeLang);
    }
  } catch (e) {
    console.warn("Native dil okunamadı:", e);
  }

  try {
    const installed = window.OfflineTranslate.getInstalledOfflinePairs() || "{}";
    localStorage.setItem(STORAGE.installed, installed);
  } catch (e) {
    console.warn("Native installed pair okunamadı:", e);
  }
}

function syncStorageToNative() {
  if (!canUseNativeMirror()) return;

  try {
    window.OfflineTranslate.setNativeOfflineLang(getNativeLang());
  } catch (e) {
    console.warn("Native dil yazılamadı:", e);
  }

  try {
    window.OfflineTranslate.setInstalledOfflinePairs(
      localStorage.getItem(STORAGE.installed) || "{}"
    );
  } catch (e) {
    console.warn("Native installed pair yazılamadı:", e);
  }
}

function mergeInstalledPairsWithNative() {
  const localPairs = getInstalledPairs();
  const nativePairs = getNativeInstalledPairs();

  const merged = {
    ...localPairs,
    ...nativePairs
  };

  saveInstalledPairs(merged);
  return merged;
}

function getNativeLang() {
  const raw = canonical(localStorage.getItem(STORAGE.nativeLang) || getPreferredInitialNativeLang());
  return raw || "tr";
}

function setNativeLang(code) {
  localStorage.setItem(STORAGE.nativeLang, canonical(code || "tr"));
  syncStorageToNative();
}

function priorityIndex(code) {
  const idx = PRIORITY_ORDER.indexOf(canonical(code));
  return idx === -1 ? 999 : idx;
}

function buildSupportedLangList() {
  const uniq = [];
  const seen = new Set();

  for (const item of ALL_OFFLINE_LANGS) {
    const code = canonical(item.code);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    uniq.push({
      code,
      name: String(item.name || code.toUpperCase()).trim(),
      flag: String(item.flag || "🌐").trim()
    });
  }

  uniq.sort((a, b) => {
    const pa = priorityIndex(a.code);
    const pb = priorityIndex(b.code);
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name, "tr");
  });

  return uniq;
}

function pairKey(from, to) {
  return `${canonical(from)}_${canonical(to)}`;
}

function getInstalledPairs() {
  const data = safeJsonParse(localStorage.getItem(STORAGE.installed) || "{}", {});
  return data && typeof data === "object" ? data : {};
}

function saveInstalledPairs(map) {
  localStorage.setItem(STORAGE.installed, JSON.stringify(map || {}));
  syncStorageToNative();
}

function getDownloadingMap() {
  const data = safeJsonParse(localStorage.getItem(STORAGE.downloading) || "{}", {});
  return data && typeof data === "object" ? data : {};
}

function saveDownloadingMap(map) {
  localStorage.setItem(STORAGE.downloading, JSON.stringify(map || {}));
}

function getLangInfo(code) {
  return LANGS.find((l) => l.code === canonical(code)) || {
    code: canonical(code),
    name: String(code || "").toUpperCase(),
    flag: "🌐"
  };
}

function isLangInstalledBiDirectional(langCode) {
  const nativeLang = getNativeLang();
  const installed = getInstalledPairs();
  return !!installed[pairKey(nativeLang, langCode)] && !!installed[pairKey(langCode, nativeLang)];
}

function getLangProgress(langCode) {
  const downloading = getDownloadingMap();
  return downloading[canonical(langCode)] || null;
}

function setLangProgress(langCode, patch) {
  const code = canonical(langCode);
  const downloading = getDownloadingMap();
  downloading[code] = {
    ...(downloading[code] || {}),
    ...patch,
    updatedAt: Date.now()
  };
  saveDownloadingMap(downloading);
}

function clearLangProgress(langCode) {
  const code = canonical(langCode);
  const downloading = getDownloadingMap();
  delete downloading[code];
  saveDownloadingMap(downloading);
}

function markInstalledBiDirectional(langCode) {
  const nativeLang = getNativeLang();
  const installed = getInstalledPairs();
  const expiresAt = new Date(Date.now() + getOfflineLicenseDays() * 24 * 60 * 60 * 1000).toISOString();

  installed[pairKey(nativeLang, langCode)] = {
    from: nativeLang,
    to: canonical(langCode),
    installedAt: new Date().toISOString(),
    expiresAt
  };

  installed[pairKey(langCode, nativeLang)] = {
    from: canonical(langCode),
    to: nativeLang,
    installedAt: new Date().toISOString(),
    expiresAt
  };

  saveInstalledPairs(installed);
}

function clearAllInstalledPairs() {
  saveInstalledPairs({});
}

function clearAllDownloadingPairs() {
  saveDownloadingMap({});
}

function clearStaleDownloadingState() {
  const map = getDownloadingMap();
  const now = Date.now();
  let changed = false;

  Object.keys(map).forEach((code) => {
    const item = map[code];
    const updatedAt = Number(item?.updatedAt || 0);

    if (!updatedAt || now - updatedAt > 6 * 60 * 1000) {
      delete map[code];
      changed = true;
      return;
    }

    if (isLangInstalledBiDirectional(code)) {
      delete map[code];
      changed = true;
    }
  });

  if (changed) saveDownloadingMap(map);
}

function normalizeInstalledVsProgress() {
  const installed = getInstalledPairs();
  const downloading = getDownloadingMap();
  let changed = false;

  Object.keys(downloading).forEach((code) => {
    const nativeLang = getNativeLang();
    const okA = installed[pairKey(nativeLang, code)];
    const okB = installed[pairKey(code, nativeLang)];

    if (okA && okB) {
      delete downloading[code];
      changed = true;
    }
  });

  if (changed) saveDownloadingMap(downloading);
}

function showConfirm(title, text, okText = "İndir") {
  return new Promise((resolve) => {
    confirmResolver = resolve;
    if (confirmTitle) confirmTitle.textContent = title;
    if (confirmText) confirmText.textContent = text;
    if (confirmOk) confirmOk.textContent = okText;
    confirmBackdrop?.classList.add("show");
  });
}

function closeConfirm(result) {
  confirmBackdrop?.classList.remove("show");
  if (confirmOk) confirmOk.textContent = "İndir";
  const resolver = confirmResolver;
  confirmResolver = null;
  if (typeof resolver === "function") resolver(result);
}

confirmCancel?.addEventListener("click", () => closeConfirm(false));
confirmOk?.addEventListener("click", () => closeConfirm(true));
confirmBackdrop?.addEventListener("click", (e) => {
  if (e.target === confirmBackdrop) closeConfirm(false);
});

function openLangPicker() {
  renderLangPickerOptions();
  langPickerBackdrop?.classList.add("show");
}

function closeLangPicker() {
  langPickerBackdrop?.classList.remove("show");
}

langPickerClose?.addEventListener("click", closeLangPicker);
langPickerBackdrop?.addEventListener("click", (e) => {
  if (e.target === langPickerBackdrop) closeLangPicker();
});
myLangPickerBtn?.addEventListener("click", openLangPicker);

function renderMyLanguageButton() {
  const info = getLangInfo(getNativeLang());
  if (myLangFlag) myLangFlag.textContent = info.flag;
  if (myLangTitle) myLangTitle.textContent = info.name;
}

async function tryChangeNativeLanguage(newCode) {
  const current = getNativeLang();
  const next = canonical(newCode);

  if (!next || next === current) {
    closeLangPicker();
    return;
  }

  if (globalDownloadLock || Object.keys(getDownloadingMap()).length > 0 || busy) {
    toast("Dil indirme sürerken kendi diliniz değiştirilemez.");
    return;
  }

  const confirmed = await showConfirm(
    "Kendi diliniz değişecek",
    `Kendi diliniz ${getLangInfo(next).name} olarak değiştirilecek.

Bu işlem mevcut offline dil yüklemelerinizi sıfırlar.
Eski hazır diller silinecek ve yeni kendi dilinize göre dilleri tekrar indirmeniz gerekecek.

Devam etmek istiyor musunuz?`,
    "Devam Et"
  );

  if (!confirmed) return;

  setNativeLang(next);
  clearAllInstalledPairs();
  clearAllDownloadingPairs();

  try {
    if (window.OfflineTranslate && typeof window.OfflineTranslate.clearInstalledOfflinePairs === "function") {
      window.OfflineTranslate.clearInstalledOfflinePairs();
    }
  } catch (e) {
    console.warn("Native installed pair temizlenemedi:", e);
  }

  globalDownloadLock = false;
  busy = false;

  renderMyLanguageButton();
  renderLicenseInfo();
  renderInstalledList();
  closeLangPicker();
  toast(`${getLangInfo(next).name} seçildi. Offline kurulum sıfırlandı.`);
}

function renderLangPickerOptions() {
  if (!langPickerList) return;

  const current = getNativeLang();

  langPickerList.innerHTML = LANGS.map((lang) => `
    <button class="picker-option ${lang.code === current ? "active" : ""}" type="button" data-lang="${lang.code}">
      <div class="picker-option-left">
        <div class="picker-option-flag">${lang.flag}</div>
        <div class="picker-option-name">${lang.name}</div>
      </div>
      <div class="picker-option-check">✓</div>
    </button>
  `).join("");

  langPickerList.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.onclick = async () => {
      const newCode = canonical(btn.getAttribute("data-lang") || "tr");
      await tryChangeNativeLanguage(newCode);
    };
  });
}

function setBusy(flag) {
  busy = !!flag;
}

function renderLicenseInfo() {
  if (!licenseInfo) return;
  const days = getOfflineLicenseDays();
  const nativeInfo = getLangInfo(getNativeLang());
  licenseInfo.textContent = `Benim dilim: ${nativeInfo.name} ${nativeInfo.flag} • Offline lisans: ${days} gün`;
}

function renderInstalledList() {
  if (!installedList) return;

  const q = String(searchInput?.value || "").trim().toLowerCase();
  const nativeLang = getNativeLang();
  const downloadingMap = getDownloadingMap();
  const hasActiveDownload = Object.keys(downloadingMap).length > 0;
  globalDownloadLock = hasActiveDownload;

  const filtered = LANGS
    .filter((l) => l.code !== nativeLang)
    .filter((l) => !q || l.name.toLowerCase().includes(q) || l.code.includes(q));

  if (!filtered.length) {
    installedList.innerHTML = `
      <div class="lang-card">
        <div class="lang-head">
          <div class="flag">✅</div>
          <div>
            <h3 class="lang-name">Uygun dil bulunamadı</h3>
            <div class="lang-sub">Arama filtresini değiştirerek tekrar deneyin.</div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  installedList.innerHTML = filtered.map((lang) => {
    const installed = isLangInstalledBiDirectional(lang.code);
    const progress = getLangProgress(lang.code);
    const isDownloading = !!progress;

    let btnClass = "lang-btn free";
    let btnText = "İndir";
    let disabled = false;

    if (installed) {
      btnClass = "lang-btn installed";
      btnText = "Kurulu";
      disabled = true;
    } else if (isDownloading) {
      btnClass = "lang-btn installing";
      btnText = progress.label || "İndiriliyor...";
      disabled = true;
    }

    const progressHtml = isDownloading ? `
      <div class="progress-wrap">
        <div class="progress-bar">
          <div class="progress-fill" style="width:${Math.max(4, Math.min(100, Number(progress.percent || 0)))}%"></div>
        </div>
        <div class="progress-text">${progress.message || "Lütfen bekleyiniz. Kurulum devam ediyor."}</div>
      </div>
    ` : "";

    return `
      <div class="lang-card">
        <div class="lang-head">
          <div class="flag">${lang.flag}</div>
          <div>
            <h3 class="lang-name">${lang.name}</h3>
            <div class="lang-sub">Offline kullanım için hazırla</div>
          </div>
        </div>

        <button
          class="${btnClass}"
          type="button"
          data-lang="${lang.code}"
          ${busy || disabled ? "disabled" : ""}
        >
          ${btnText}
        </button>

        ${progressHtml}
      </div>
    `;
  }).join("");

  installedList.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.onclick = async () => {
      const lang = btn.getAttribute("data-lang");
      await startLanguageInstallFlow(lang);
    };
  });
}

async function ensureOfflinePageAccess() {
  return await maybeShowOfflineDownloadAd({
    sessionKey: OFFLINE_PAGE_SESSION_KEY,
    skipInfoModal: false,
    title: "Bu modül için kısa bir reklam gösterilecek",
    text: "Offline diller sayfasını kullanabilmeniz için 1 kısa reklam izlemeniz gerekmektedir.\nReklamı tamamladıktan sonra bu sayfayı 24 saat boyunca tekrar reklam görmeden kullanabilirsiniz."
  });
}

async function startLanguageInstallFlow(langCode) {
  const code = canonical(langCode);
  if (!code || busy || globalDownloadLock) return;

  const info = getLangInfo(code);
  const nativeInfo = getLangInfo(getNativeLang());

  if (isLangInstalledBiDirectional(code)) {
    toast(`${info.name} zaten hazır`);
    renderInstalledList();
    return;
  }

  if (getLangProgress(code)) {
    toast("Bu dil için indirme zaten devam ediyor.");
    renderInstalledList();
    return;
  }

  const confirmed = await showConfirm(
    `${info.name} indirilsin mi?`,
    `${nativeInfo.name} ve ${info.name} birlikte hazırlanacak.

İnternet bağlantınıza göre indirme süresi değişebilir.
Bu sayfaya erişiminiz açık olduğu için tekrar reklam gösterilmeyecektir.`,
    "İndir"
  );

  if (!confirmed) {
    renderInstalledList();
    return;
  }

  busy = true;
  try {
    await installBiDirectionalPair(code);
  } finally {
    busy = false;
  }
}

function canUseNativeOfflineInstaller() {
  return !!(
    window.OfflineTranslate &&
    typeof window.OfflineTranslate.downloadBiDirectionalPair === "function"
  );
}

async function installBiDirectionalPair(langCode) {
  const code = canonical(langCode);
  const info = getLangInfo(code);
  const nativeLang = getNativeLang();

  globalDownloadLock = true;

  try {
    setLangProgress(code, {
      percent: 4,
      label: "Hazırlanıyor...",
      message: `${info.name} kurulumu hazırlanıyor. Lütfen bekleyiniz.`
    });
    renderInstalledList();

    if (!canUseNativeOfflineInstaller()) {
      clearLangProgress(code);
      globalDownloadLock = false;
      renderInstalledList();
      toast("Gerçek kurulum için uygulama tarafı hazır değil.");
      return;
    }

    const payload = JSON.stringify({
      source: nativeLang,
      target: code
    });

    window.OfflineTranslate.downloadBiDirectionalPair(payload);
    toast(`${info.name} indirilmeye başladı`);
  } catch (e) {
    console.error("[offline_languages_page] installBiDirectionalPair:", e);
    clearLangProgress(code);
    globalDownloadLock = false;
    renderInstalledList();
    toast(`${info.name} şu an indirilemedi`);
  }
}

window.addEventListener("offlinePairDownloadStarted", (e) => {
  const d = e.detail || {};
  const code = canonical(d.target || "");
  const info = getLangInfo(code);
  if (!code) return;

  setLangProgress(code, {
    percent: 10,
    label: "Başlatılıyor...",
    message: d.message || `Lütfen bekleyiniz. Şu anda ${info.name} için indirme başladı.`
  });
  renderInstalledList();
});

window.addEventListener("offlinePairDownloadProgress", (e) => {
  const d = e.detail || {};
  const code = canonical(d.target || "");
  const info = getLangInfo(code);
  if (!code) return;

  setLangProgress(code, {
    percent: Number(d.percent || 0),
    label: d.label || "İndiriliyor...",
    message: d.message || `Lütfen bekleyiniz. Şu anda ${info.name} kurulumu devam ediyor.`
  });
  renderInstalledList();
});

window.addEventListener("offlinePairDownloadCompleted", (e) => {
  const d = e.detail || {};
  const code = canonical(d.target || "");
  if (!code) return;

  markInstalledBiDirectional(code);

  try {
    if (window.OfflineTranslate && typeof window.OfflineTranslate.setInstalledOfflinePairs === "function") {
      window.OfflineTranslate.setInstalledOfflinePairs(JSON.stringify(getInstalledPairs()));
    }
  } catch (err) {
    console.error("Native installed pair sync failed:", err);
  }

  clearLangProgress(code);
  globalDownloadLock = false;
  busy = false;
  renderInstalledList();
  toast(`${getLangInfo(code).name} artık hazır`);
});

window.addEventListener("offlinePairDownloadFailed", (e) => {
  const d = e.detail || {};
  const code = canonical(d.target || "");
  const info = getLangInfo(code);
  const message = d.error || `${info.name} şu an indirilemedi. Daha sonra tekrar deneyebilirsiniz.`;

  if (code) clearLangProgress(code);
  globalDownloadLock = false;
  busy = false;
  renderInstalledList();
  toast(message);
});

async function init() {
  try {
    mountShell({ scroll: "auto" });
  } catch (e) {
    console.warn("[offline_languages_page] shell:", e);
  }

  try {
    const applyShellVars = () => {
      const root = getComputedStyle(document.documentElement);
      const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
      const headerH = parseFloat(root.getPropertyValue("--headerH")) || 0;
      document.documentElement.style.setProperty("--shellLift", footerH ? `${footerH + 8}px` : "0px");
      document.documentElement.style.setProperty("--safe-top", headerH ? `${Math.max(0, headerH - 6)}px` : "0px");
    };

    applyShellVars();
    setTimeout(applyShellVars, 120);
    setTimeout(applyShellVars, 500);
    window.addEventListener("resize", applyShellVars);
  } catch (e) {
    console.warn("[offline_languages_page] shell vars:", e);
  }

  const initialNative = getPreferredInitialNativeLang();
  if (!localStorage.getItem(STORAGE.nativeLang)) {
    localStorage.setItem(STORAGE.nativeLang, initialNative || "tr");
  }

  syncStorageFromNative();
  clearStaleDownloadingState();

  if (!localStorage.getItem(STORAGE.nativeLang)) {
    localStorage.setItem(STORAGE.nativeLang, initialNative || "tr");
  }

  const pageAccessOk = await ensureOfflinePageAccess();
  if (!pageAccessOk) {
    location.href = "/pages/home.html";
    return;
  }

  LANGS = buildSupportedLangList();

  ensureMockOfflineLicenseOnce();

  mergeInstalledPairsWithNative();
  normalizeInstalledVsProgress();

  renderMyLanguageButton();
  renderLicenseInfo();
  renderInstalledList();

  searchInput?.addEventListener("input", renderInstalledList);

  console.log("OFFLINE_LANGUAGES_READY", {
    langs: LANGS.length,
    native: getNativeLang(),
    nativeMirror: canUseNativeMirror()
  });
}

init();
