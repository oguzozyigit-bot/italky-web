const STORAGE_KEYS = ["site_lang", "italky_site_lang_v1", "siteLang"];
const FALLBACK_LANG = "en";
const IP_LOOKUP_TIMEOUT_MS = 1200;

const SUPPORTED_LANGS = new Set([
  "tr", "en", "de", "fr", "it", "es", "pt", "ru", "ar", "zh", "ja", "ko",
  "fa", "uz", "kz", "uk", "nl", "pl", "hi"
]);

const COUNTRY_TO_LANG = {
  TR: "tr",
  DE: "de", AT: "de", CH: "de",
  FR: "fr",
  IT: "it",
  ES: "es", MX: "es", AR: "es", CL: "es", CO: "es", PE: "es",
  PT: "pt", BR: "pt",
  RU: "ru",
  SA: "ar", AE: "ar", QA: "ar", KW: "ar", EG: "ar", JO: "ar", LB: "ar", IQ: "ar",
  CN: "zh",
  JP: "ja",
  KR: "ko",
  IR: "fa",
  UZ: "uz",
  KZ: "kz",
  UA: "uk",
  NL: "nl", BE: "nl",
  PL: "pl",
  IN: "hi"
};

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

function applySiteLang(lang) {
  const finalLang = normalizeSiteLang(lang) || FALLBACK_LANG;
  safeLocalStorageSet("site_lang", finalLang);
  safeLocalStorageSet("italky_site_lang_v1", finalLang);
  window.ITalkySiteLang = finalLang;
  document.documentElement.lang = finalLang;
  document.dispatchEvent(new CustomEvent("italky-site-lang-ready", { detail: { lang: finalLang } }));
  return finalLang;
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
