const STORAGE_KEYS = ["site_lang", "italky_site_lang_v1", "siteLang"];
const FALLBACK_LANG = "en";
const IP_LOOKUP_TIMEOUT_MS = 1200;

const SUPPORTED_LANGS = new Set(["tr", "en"]);
const COUNTRY_TO_LANG = { TR: "tr" };

function safeLocalStorageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeLocalStorageSet(key, value) {
  try { localStorage.setItem(key, value); } catch {}
}

export function normalizeSiteLang(value) {
  const raw = String(value || "").trim().toLowerCase().replace("_", "-");
  if (!raw) return "";
  const base = raw.split("-")[0];
  return SUPPORTED_LANGS.has(base) ? base : FALLBACK_LANG;
}

function normalizeCountry(value) {
  const raw = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(raw) ? raw : "";
}

function readStoredLang() {
  for (const key of STORAGE_KEYS) {
    const lang = normalizeSiteLang(safeLocalStorageGet(key));
    if (lang) return lang;
  }
  return "";
}

function langFromCountry(countryCode) {
  const country = normalizeCountry(countryCode);
  if (!country) return "";
  return COUNTRY_TO_LANG[country] || FALLBACK_LANG;
}

async function getNativeCountryCode() {
  const bridges = [window.AndroidBridge, window.Native, window.NativeLocale, window.DeviceBridge];
  const methods = ["getCountryCode", "getDeviceCountry", "getLocaleCountry", "getCountry", "getSimCountry", "getNetworkCountry"];

  for (const bridge of bridges) {
    if (!bridge) continue;
    for (const method of methods) {
      try {
        if (typeof bridge[method] !== "function") continue;
        const value = bridge[method]();
        const resolved = value && typeof value.then === "function" ? await value : value;
        const country = normalizeCountry(resolved);
        if (country) return country;
      } catch {}
    }
  }

  return "";
}

async function fetchJsonWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IP_LOOKUP_TIMEOUT_MS);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) return null;
    return await response.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getCountryFromIp() {
  const endpoints = [
    "https://freeipapi.com/api/json",
    "https://ipapi.co/json/",
    "https://ipwho.is/"
  ];

  for (const url of endpoints) {
    const data = await fetchJsonWithTimeout(url);
    const country = normalizeCountry(
      data?.countryCode ||
      data?.country_code ||
      data?.country ||
      data?.location?.country_code
    );
    if (country) return country;
  }

  return "";
}

function getNavigatorLang() {
  try {
    const langs = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator.language || navigator.userLanguage || ""];

    for (const item of langs) {
      const lang = normalizeSiteLang(item);
      if (lang) return lang;
    }
  } catch {}
  return "";
}

function emitSiteLangReady(lang) {
  const detail = { lang };
  try { window.dispatchEvent(new CustomEvent("italky-site-lang-changed", { detail })); } catch {}
  try { document.dispatchEvent(new CustomEvent("italky-site-lang-ready", { detail })); } catch {}
}

function applySiteLang(lang) {
  const finalLang = normalizeSiteLang(lang) || FALLBACK_LANG;
  safeLocalStorageSet("site_lang", finalLang);
  safeLocalStorageSet("italky_site_lang_v1", finalLang);
  safeLocalStorageSet("siteLang", finalLang);
  window.ITalkySiteLang = finalLang;
  document.documentElement.lang = finalLang;
  emitSiteLangReady(finalLang);
  return finalLang;
}

function installUiSafetyStyle() {
  if (document.getElementById("italkySiteLanguageUiSafety")) return;

  const style = document.createElement("style");
  style.id = "italkySiteLanguageUiSafety";
  style.textContent = `
    #siteLangGrid .site-lang-item:not([data-lang="tr"]):not([data-lang="en"]) { display: none !important; }
    .section-grid.primary-grid { align-items: stretch !important; }
    #faceCard.primary-card,
    #bluetoothCard.primary-card {
      min-height: 300px !important;
      padding-bottom: 126px !important;
    }
    #faceCard .primary-art,
    #bluetoothCard .primary-art {
      bottom: 78px !important;
      height: 72px !important;
      pointer-events: none !important;
    }
    #faceCard.primary-card .card-desc,
    #bluetoothCard.primary-card .card-desc {
      margin-bottom: 8px !important;
    }
    #faceCard.primary-card .card-icon,
    #bluetoothCard.primary-card .card-icon,
    #faceCard.primary-card .arrow-chip,
    #bluetoothCard.primary-card .arrow-chip {
      bottom: 16px !important;
      z-index: 4 !important;
    }
    .wide-card {
      height: auto !important;
      min-height: 144px !important;
      padding-right: 72px !important;
    }
    .wide-card .wide-body { min-width: 0 !important; padding-right: 4px !important; }
    .wide-card .arrow-chip {
      right: 16px !important;
      top: 50% !important;
      bottom: auto !important;
      transform: translateY(-50%) !important;
    }
    @media (max-width: 390px) {
      #faceCard.primary-card,
      #bluetoothCard.primary-card {
        min-height: 280px !important;
        padding-bottom: 118px !important;
      }
      #faceCard .primary-art,
      #bluetoothCard .primary-art {
        bottom: 74px !important;
        height: 68px !important;
      }
      .wide-card { min-height: 144px !important; padding-right: 66px !important; }
    }
  `;
  document.head.appendChild(style);
}

async function detectSiteLang() {
  const stored = readStoredLang();
  if (stored) return stored;

  const nativeCountry = await getNativeCountryCode();
  const nativeLang = langFromCountry(nativeCountry);
  if (nativeLang) return nativeLang;

  const ipCountry = await getCountryFromIp();
  const ipLang = langFromCountry(ipCountry);
  if (ipLang) return ipLang;

  const navLang = getNavigatorLang();
  return navLang || FALLBACK_LANG;
}

export async function resolveSiteLanguage() {
  installUiSafetyStyle();

  if (window.__ITALKY_SITE_LANG_BOOT_PROMISE__) return window.__ITALKY_SITE_LANG_BOOT_PROMISE__;

  window.__ITALKY_SITE_LANG_BOOT_PROMISE__ = (async () => {
    try {
      return applySiteLang(await detectSiteLang());
    } catch {
      return applySiteLang(FALLBACK_LANG);
    }
  })();

  return window.__ITALKY_SITE_LANG_BOOT_PROMISE__;
}

await resolveSiteLanguage();
