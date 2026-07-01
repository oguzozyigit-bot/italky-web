// /js/offline_languages_page.js

import { mountShell } from "/js/ui_shell.js";
import {
  listOfflineLanguages,
  getLangEntry,
  normalizeLangCode,
  modelParent,
  OFFLINE_ONLINE_LANG_TARGET
} from "/js/language_registry_129.js";

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
  installedPairs: "italky_offline_installed_pairs_v7",
  installedLangs: "italky_offline_installed_langs_v1",
  downloading: "italky_offline_downloading_pairs_v7",
  nativeLang: "italky_native_lang_v7",
  offlineLicenseDays: "italky_offline_license_days_v7",
  siteLang: "site_lang",
  legacySiteLang: "italky_site_lang_v1"
};

const HOME_LANG_WIDGET_KEY = "italky_home_lang_pack_widget_v1";

const ALL_OFFLINE_LANGS = listOfflineLanguages().map((e) => ({
  code: e.code,
  name: e.name,
  flag: e.flag,
  parent: e.parent
}));

const PRIORITY_ORDER = ["tr", "en", "de", "fr", "ru", "ar", "es", "it"];

let LANGS = [];
let busy = false;
let confirmResolver = null;
let globalDownloadLock = false;

function toast(message = "") {
  if (!toastEl) return;
  toastEl.textContent = String(message || "");
  toastEl.classList.add("show");
  clearTimeout(window.__offlineToastTimer);
  window.__offlineToastTimer = setTimeout(() => toastEl.classList.remove("show"), 2400);
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
  return normalizeLangCode(code).split("-")[0];
}

function displayCode(code) {
  const entry = getLangEntry(code);
  return entry ? entry.code : normalizeLangCode(code);
}

function pairKey(from, to) {
  return `${displayCode(from)}_${displayCode(to)}`;
}

function getLangInfo(code) {
  const entry = getLangEntry(code);
  if (entry) return { code: entry.code, name: entry.name, flag: entry.flag };
  const normalized = displayCode(code);
  return LANGS.find((l) => l.code === normalized) || {
    code: normalized,
    name: String(code || "").toUpperCase(),
    flag: "🌐"
  };
}

function getOfflineLicenseDays() {
  const v = Number(localStorage.getItem(STORAGE.offlineLicenseDays) || "365");
  return Number.isFinite(v) && v > 0 ? v : 365;
}

function ensurePremiumOfflineLicense() {
  try {
    localStorage.setItem(STORAGE.offlineLicenseDays, "365");
    window.OfflineTranslate?.setMockOfflineLicense?.(365);
  } catch (e) {
    console.warn("Offline lisans yazılamadı:", e);
  }
}

function getPreferredInitialNativeLang() {
  const savedNative = canonical(localStorage.getItem(STORAGE.nativeLang) || "");
  if (savedNative) return savedNative;

  const siteLang = canonical(
    localStorage.getItem(STORAGE.siteLang) ||
    localStorage.getItem(STORAGE.legacySiteLang) ||
    document.documentElement.lang ||
    ""
  );

  return siteLang || "tr";
}

function getNativeLang() {
  return canonical(localStorage.getItem(STORAGE.nativeLang) || getPreferredInitialNativeLang()) || "tr";
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

function canUseNativeWarmupState() {
  return !!(
    window.OfflineTranslate &&
    typeof window.OfflineTranslate.isNativeWarmupInProgress === "function"
  );
}

function isNativeWarmupInProgress() {
  try {
    if (!canUseNativeWarmupState()) return false;
    return !!window.OfflineTranslate.isNativeWarmupInProgress();
  } catch (e) {
    console.warn("Native warmup durumu okunamadı:", e);
    return false;
  }
}

function getNativeInstalledPairs() {
  try {
    if (!window.OfflineTranslate?.getInstalledOfflinePairs) return {};
    const parsed = JSON.parse(window.OfflineTranslate.getInstalledOfflinePairs() || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (e) {
    console.warn("Native installed pairs okunamadı:", e);
    return {};
  }
}

function syncStorageFromNative() {
  if (!canUseNativeMirror()) return;

  try {
    const nativeLang = canonical(window.OfflineTranslate.getNativeOfflineLang() || "");
    if (nativeLang) localStorage.setItem(STORAGE.nativeLang, nativeLang);
  } catch (e) {
    console.warn("Native dil okunamadı:", e);
  }

  try {
    const installed = window.OfflineTranslate.getInstalledOfflinePairs() || "{}";
    localStorage.setItem(STORAGE.installedPairs, installed);
  } catch (e) {
    console.warn("Native kurulu çiftler okunamadı:", e);
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
    window.OfflineTranslate.setInstalledOfflinePairs(localStorage.getItem(STORAGE.installedPairs) || "{}");
  } catch (e) {
    console.warn("Native kurulu çiftler yazılamadı:", e);
  }
}

function getInstalledPairs() {
  const data = safeJsonParse(localStorage.getItem(STORAGE.installedPairs) || "{}", {});
  return data && typeof data === "object" ? data : {};
}

function saveInstalledPairs(map) {
  localStorage.setItem(STORAGE.installedPairs, JSON.stringify(map || {}));
  updateInstalledLangsStorage(map || {});
  syncStorageToNative();
}

function mergeInstalledPairsWithNative() {
  const merged = { ...getInstalledPairs(), ...getNativeInstalledPairs() };
  saveInstalledPairs(merged);
  return merged;
}

function getDownloadingMap() {
  const data = safeJsonParse(localStorage.getItem(STORAGE.downloading) || "{}", {});
  return data && typeof data === "object" ? data : {};
}

function saveDownloadingMap(map) {
  localStorage.setItem(STORAGE.downloading, JSON.stringify(map || {}));
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
  const seen = new Set();
  const uniq = [];

  for (const item of ALL_OFFLINE_LANGS) {
    const code = canonical(item.code);
    if (!code || seen.has(code)) continue;
    seen.add(code);
    uniq.push({ code, name: item.name, flag: item.flag || "🌐" });
  }

  uniq.sort((a, b) => {
    const pa = priorityIndex(a.code);
    const pb = priorityIndex(b.code);
    if (pa !== pb) return pa - pb;
    return a.name.localeCompare(b.name, "tr");
  });

  return uniq;
}

function getInstalledLangCodes(map = getInstalledPairs()) {
  const nativeLang = getNativeLang();
  const codes = new Set();

  Object.values(map || {}).forEach((item) => {
    const from = canonical(item?.from);
    const to = canonical(item?.to);
    if (from) codes.add(from);
    if (to) codes.add(to);
  });

  codes.delete("");
  if (Object.keys(map || {}).length) codes.add(nativeLang);
  return [...codes].sort();
}

function updateInstalledLangsStorage(map = getInstalledPairs()) {
  const langs = getInstalledLangCodes(map).map((code) => {
    const info = getLangInfo(code);
    return { code, name: info.name, flag: info.flag };
  });

  try {
    localStorage.setItem(STORAGE.installedLangs, JSON.stringify(langs));
  } catch (e) {
    console.warn("Kurulu dil listesi yazılamadı:", e);
  }

  return langs;
}

function getLatestInstalledPair(map = getInstalledPairs()) {
  let latest = null;

  Object.values(map || {}).forEach((item) => {
    const from = canonical(item?.from);
    const to = canonical(item?.to);
    if (!from || !to || from === to) return;

    const time = Date.parse(item?.installedAt || item?.createdAt || "") || 0;
    if (!latest || time >= latest.time) latest = { source: from, target: to, time };
  });

  if (latest) return latest;

  const nativeLang = getNativeLang();
  const firstTarget = getInstalledLangCodes(map).find((code) => code !== nativeLang);
  return firstTarget ? { source: nativeLang, target: firstTarget, time: 0 } : null;
}

function saveHomeLangPackWidget(sourceCode, targetCode, status = "ready", percent = null) {
  try {
    localStorage.removeItem(HOME_LANG_WIDGET_KEY);
  } catch (e) {
    console.warn("Ana sayfa offline widget kaydı temizlenemedi:", e);
  }
}

function refreshHomeWidgetFromInstalled(status = "ready") {
  try {
    localStorage.removeItem(HOME_LANG_WIDGET_KEY);
  } catch {}
}

function isLangInstalledBiDirectional(langCode) {
  const nativeLang = getNativeLang();
  const code = canonical(langCode);
  const installed = getInstalledPairs();
  return !!installed[pairKey(nativeLang, code)] && !!installed[pairKey(code, nativeLang)];
}

function getLangProgress(langCode) {
  return getDownloadingMap()[canonical(langCode)] || null;
}

function setLangProgress(langCode, patch) {
  const code = canonical(langCode);
  const downloading = getDownloadingMap();
  downloading[code] = { ...(downloading[code] || {}), ...patch, updatedAt: Date.now() };
  saveDownloadingMap(downloading);
}

function clearLangProgress(langCode) {
  const downloading = getDownloadingMap();
  delete downloading[canonical(langCode)];
  saveDownloadingMap(downloading);
}

function markInstalledBiDirectional(langCode) {
  const nativeLang = getNativeLang();
  const targetLang = canonical(langCode);
  const installed = getInstalledPairs();
  const installedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + getOfflineLicenseDays() * 24 * 60 * 60 * 1000).toISOString();

  installed[pairKey(nativeLang, targetLang)] = { from: nativeLang, to: targetLang, installedAt, expiresAt };
  installed[pairKey(targetLang, nativeLang)] = { from: targetLang, to: nativeLang, installedAt, expiresAt };
  saveInstalledPairs(installed);
}

function clearAllInstalledPairs() {
  saveInstalledPairs({});
  refreshHomeWidgetFromInstalled("empty");
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
    if (!updatedAt || now - updatedAt > 30 * 60 * 1000 || isLangInstalledBiDirectional(code)) {
      delete map[code];
      changed = true;
    }
  });

  if (changed) saveDownloadingMap(map);
}

function normalizeInstalledVsProgress() {
  const downloading = getDownloadingMap();
  let changed = false;

  Object.keys(downloading).forEach((code) => {
    if (isLangInstalledBiDirectional(code)) {
      delete downloading[code];
      changed = true;
    }
  });

  if (changed) saveDownloadingMap(downloading);
}

function syncWarmupProgressState() {
  const targetCode = "en";
  const installed = isLangInstalledBiDirectional(targetCode);
  const inProgress = isNativeWarmupInProgress();
  const current = getLangProgress(targetCode);

  if (inProgress && !installed) {
    setLangProgress(targetCode, {
      autoWarmup: true,
      percent: Math.max(6, Number(current?.percent || 0)),
      label: "Kuruluyor...",
      message: "Arka planda otomatik kurulum devam ediyor. Lütfen bekleyiniz."
    });
    globalDownloadLock = true;
    return true;
  }

  if (current?.autoWarmup) {
    clearLangProgress(targetCode);
    // Warmup just finished — pull fresh installed pairs from native in case
    // they were saved after the page's initial load.
    syncStorageFromNative();
    mergeInstalledPairsWithNative();
    return true;
  }
  return false;
}

/**
 * Defensive re-sync: if the local installed-pairs map looks empty but native
 * reports real pairs, pull them in.  Handles the race where warmup completes
 * (or was already done) before the page had a chance to read the pairs, and
 * no offlinePairDownloadCompleted event was fired.
 */
function maybeResyncPairsFromNative() {
  if (!canUseNativeMirror()) return false;
  if (Object.keys(getDownloadingMap()).length > 0) return false;

  const localPairs = getInstalledPairs();
  const hasRealLocal = Object.keys(localPairs).some((k) => !k.startsWith("__"));
  if (hasRealLocal) return false;

  const nativePairs = getNativeInstalledPairs();
  const hasRealNative = Object.keys(nativePairs).some((k) => !k.startsWith("__"));
  if (!hasRealNative) return false;

  mergeInstalledPairsWithNative();
  return true;
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
    `Kendi diliniz ${getLangInfo(next).name} olarak değiştirilecek.\n\nBu işlem mevcut offline dil yüklemelerinizi sıfırlar. Eski hazır diller silinecek ve yeni kendi dilinize göre dilleri tekrar indirmeniz gerekecek.`,
    "Devam Et"
  );

  if (!confirmed) return;

  setNativeLang(next);
  clearAllInstalledPairs();
  clearAllDownloadingPairs();

  try {
    window.OfflineTranslate?.clearInstalledOfflinePairs?.();
  } catch (e) {
    console.warn("Native kurulu çiftler temizlenemedi:", e);
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
    btn.onclick = async () => tryChangeNativeLanguage(btn.getAttribute("data-lang") || "tr");
  });
}

function setBusy(flag) {
  busy = !!flag;
}

function renderLicenseInfo() {
  if (!licenseInfo) return;
  const nativeInfo = getLangInfo(getNativeLang());
  const installedCount = getInstalledLangCodes().length;
  licenseInfo.textContent = `Benim dilim: ${nativeInfo.name} ${nativeInfo.flag} • Kurulu dil: ${installedCount} / ${OFFLINE_ONLINE_LANG_TARGET} • Offline izin: ${getOfflineLicenseDays()} gün`;
}

function renderInstalledList() {
  if (!installedList) return;

  const q = String(searchInput?.value || "").trim().toLowerCase();
  const nativeLang = getNativeLang();
  const downloadingMap = getDownloadingMap();
  globalDownloadLock = Object.keys(downloadingMap).length > 0;

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
      btnText = "Hazır";
      disabled = true;
    } else if (isDownloading) {
      btnClass = "lang-btn installing";
      btnText = progress.label || "İndiriliyor...";
      disabled = true;
    }

    const progressHtml = isDownloading ? `
      <div class="progress-wrap">
        <div class="progress-bar"><div class="progress-fill" style="width:${Math.max(4, Math.min(100, Number(progress.percent || 0)))}%"></div></div>
        <div class="progress-text">${progress.message || "Lütfen bekleyiniz. Kurulum devam ediyor."}</div>
      </div>
    ` : "";

    return `
      <div class="lang-card">
        <div class="lang-head">
          <div class="flag">${lang.flag}</div>
          <div>
            <h3 class="lang-name">${lang.name}</h3>
            <div class="lang-sub">${getLangInfo(nativeLang).name} ⇄ ${lang.name}</div>
          </div>
        </div>
        <button class="${btnClass}" type="button" data-lang="${lang.code}" ${busy || disabled ? "disabled" : ""}>${btnText}</button>
        ${progressHtml}
      </div>
    `;
  }).join("");

  installedList.querySelectorAll("[data-lang]").forEach((btn) => {
    btn.onclick = async () => startLanguageInstallFlow(btn.getAttribute("data-lang"));
  });
}

async function startLanguageInstallFlow(langCode) {
  const code = canonical(langCode);
  if (!code || busy || globalDownloadLock) return;

  if (code === "en" && isNativeWarmupInProgress()) {
    setLangProgress(code, {
      autoWarmup: true,
      percent: Math.max(8, Number(getLangProgress(code)?.percent || 0)),
      label: "Kuruluyor...",
      message: "Bu dil arka planda otomatik kuruluyor."
    });
    globalDownloadLock = true;
    renderInstalledList();
    toast("İngilizce arka planda kuruluyor. Lütfen bekleyiniz.");
    return;
  }

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
    `${nativeInfo.name} ve ${info.name} birlikte hazırlanacak.\n\nPremium hesabınızda reklam gösterilmeden indirme başlayacaktır.`,
    "İndir"
  );

  if (!confirmed) {
    renderInstalledList();
    return;
  }

  setBusy(true);
  try {
    ensurePremiumOfflineLicense();
    await installBiDirectionalPair(code);
  } finally {
    setBusy(false);
    renderInstalledList();
  }
}

function canUseNativeOfflineInstaller() {
  return !!(window.OfflineTranslate && typeof window.OfflineTranslate.downloadBiDirectionalPair === "function");
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
    saveHomeLangPackWidget(nativeLang, code, "downloading", 4);
    renderInstalledList();

    if (!canUseNativeOfflineInstaller()) {
      clearLangProgress(code);
      globalDownloadLock = false;
      saveHomeLangPackWidget(nativeLang, code, "failed");
      renderInstalledList();
      toast("Gerçek kurulum için uygulama tarafı hazır değil.");
      return;
    }

    window.OfflineTranslate.downloadBiDirectionalPair(
      JSON.stringify({
        source: modelParent(nativeLang),
        target: modelParent(code),
        displaySource: displayCode(nativeLang),
        displayTarget: displayCode(code)
      })
    );
    toast(`${info.name} dil paketiniz indiriliyor.`);
  } catch (e) {
    console.error("[offline_languages_page] installBiDirectionalPair:", e);
    clearLangProgress(code);
    globalDownloadLock = false;
    saveHomeLangPackWidget(nativeLang, code, "failed");
    renderInstalledList();
    toast(`${info.name} şu an indirilemedi`);
  }
}

window.addEventListener("offlinePairDownloadStarted", (e) => {
  const d = e.detail || {};
  const code = canonical(d.target || "");
  const source = canonical(d.source || getNativeLang());
  const info = getLangInfo(code);
  if (!code) return;

  setLangProgress(code, {
    percent: 10,
    label: "Başlatılıyor...",
    message: d.message || `Lütfen bekleyiniz. Şu anda ${info.name} için indirme başladı.`
  });
  saveHomeLangPackWidget(source, code, "downloading", 10);
  renderInstalledList();
});

window.addEventListener("offlinePairDownloadProgress", (e) => {
  const d = e.detail || {};
  const code = canonical(d.target || "");
  const source = canonical(d.source || getNativeLang());
  const info = getLangInfo(code);
  const percent = Number(d.percent || 0);
  if (!code) return;

  setLangProgress(code, {
    percent,
    label: d.label || "İndiriliyor...",
    message: d.message || `Lütfen bekleyiniz. Şu anda ${info.name} kurulumu devam ediyor.`
  });
  saveHomeLangPackWidget(source, code, "downloading", percent);
  renderInstalledList();
});

window.addEventListener("offlinePairDownloadCompleted", (e) => {
  const d = e.detail || {};
  const code = canonical(d.target || "");
  const source = canonical(d.source || getNativeLang());
  if (!code) return;

  markInstalledBiDirectional(code);

  try {
    window.OfflineTranslate?.setInstalledOfflinePairs?.(JSON.stringify(getInstalledPairs()));
  } catch (err) {
    console.error("Native installed pair sync failed:", err);
  }

  saveHomeLangPackWidget(source, code, "ready");
  clearLangProgress(code);
  globalDownloadLock = false;
  busy = false;
  renderLicenseInfo();
  renderInstalledList();
  toast(`${getLangInfo(code).name} dil paketiniz indirildi.`);
});

const _retryCount = {};
const RETRYABLE_REASONS = ["timeout_or_pending", "model_download_timeout", "pending"];

function isRetryableFailure(errorStr) {
  const s = String(errorStr || "").toLowerCase();
  return RETRYABLE_REASONS.some((r) => s.includes(r));
}

window.addEventListener("offlinePairDownloadFailed", (e) => {
  const d = e.detail || {};
  const code = canonical(d.target || "");
  const source = canonical(d.source || getNativeLang());
  const info = getLangInfo(code);
  const errorMsg = d.error || d.reason || "";

  if (code && isRetryableFailure(errorMsg)) {
    const attempts = (_retryCount[code] || 0) + 1;
    _retryCount[code] = attempts;

    if (attempts <= 3) {
      const delaySec = attempts * 15;
      toast(`${info.name} modeli bekleniyor, ${delaySec}sn sonra yeniden deneniyor... (${attempts}/3)`);
      setTimeout(() => {
        _retryCount[code] = attempts;
        startLanguageInstallFlow(code);
      }, delaySec * 1000);
      return;
    }

    delete _retryCount[code];
  }

  if (code) {
    clearLangProgress(code);
    saveHomeLangPackWidget(source, code, "failed");
  }

  globalDownloadLock = false;
  busy = false;
  renderInstalledList();
  const message = errorMsg && !isRetryableFailure(errorMsg)
    ? errorMsg
    : `${info.name} şu an indirilemedi. Daha sonra tekrar deneyebilirsiniz.`;
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

  LANGS = buildSupportedLangList();

  if (!localStorage.getItem(STORAGE.nativeLang)) {
    localStorage.setItem(STORAGE.nativeLang, getPreferredInitialNativeLang() || "tr");
  }

  ensurePremiumOfflineLicense();
  syncStorageFromNative();
  clearStaleDownloadingState();
  mergeInstalledPairsWithNative();
  normalizeInstalledVsProgress();
  syncWarmupProgressState();
  refreshHomeWidgetFromInstalled("ready");

  renderMyLanguageButton();
  renderLicenseInfo();
  renderInstalledList();

  // Sayfa açıldığında event kaçtıysa warmup durumunu ve kurulu çiftleri periyodik eşitle
  setInterval(() => {
    const warmupChanged = syncWarmupProgressState();
    const pairsChanged = maybeResyncPairsFromNative();
    if (warmupChanged || pairsChanged) {
      renderLicenseInfo();
      renderInstalledList();
    }
  }, 3000);

  searchInput?.addEventListener("input", renderInstalledList);

  console.log("OFFLINE_LANGUAGES_READY_PREMIUM", {
    langs: LANGS.length,
    native: getNativeLang(),
    nativeMirror: canUseNativeMirror(),
    nativeInstaller: canUseNativeOfflineInstaller(),
    adPerDownload: false,
    homeLangWidget: false
  });
}

init();
