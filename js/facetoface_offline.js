import { getLangPoolForSite } from "/js/lang_pool_full.js";

const $ = (id) => document.getElementById(id);

const topBody = $("topBody");
const botBody = $("botBody");

const topMic = $("topMic");
const botMic = $("botMic");
const topSend = $("topSend");
const botSend = $("botSend");
const topInput = $("topInput");
const botInput = $("botInput");
const topComposer = $("topComposer");
const botComposer = $("botComposer");

const topKeyboardWrap = $("topKeyboardWrap");
const botKeyboardWrap = $("botKeyboardWrap");
const topKeyboard = $("topKeyboard");
const botKeyboard = $("botKeyboard");

const topLangBtn = $("topLangBtn");
const botLangBtn = $("botLangBtn");
const topLangTxt = $("topLangTxt");
const botLangTxt = $("botLangTxt");
const popTop = $("pop-top");
const popBot = $("pop-bot");
const listTop = $("list-top");
const listBot = $("list-bot");
const closeTop = $("close-top");
const closeBot = $("close-bot");

const clearBtn = $("clearBtn");
const homeLink = $("homeLink");
const homeBtn = $("homeBtn");
const homeText = $("homeText");
const clearText = $("clearText");
const centerHub = $("centerHub");
const topSettingsMini = $("topSettingsMini");
const botSettingsMini = $("botSettingsMini");
const miniToast = $("miniToast");
const frameRoot = $("frameRoot");

const BCP = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
  ru: "ru-RU",
  ar: "ar-SA",
  zh: "zh-CN",
  tg: "tg-TJ"
};

const PLACEHOLDERS = {
  tr: "Mesajını buraya yaz",
  en: "Write your message here",
  de: "Schreibe hier deine Nachricht",
  fr: "Écris ici ton message",
  it: "Scrivi qui il tuo messaggio",
  es: "Escribe aquí tu mensaje",
  ru: "Введите сообщение",
  ar: "اكتب رسالتك هنا",
  zh: "在这里输入消息",
  tg: "Паёми худро ин ҷо нависед"
};

const HOME_LABELS = {
  tr: "ANA SAYFA",
  en: "HOME",
  de: "START",
  fr: "ACCUEIL",
  it: "HOME",
  es: "INICIO",
  ru: "ГЛАВНАЯ",
  ar: "الرئيسية",
  zh: "首页",
  tg: "АСОСӢ"
};

const CLEAR_LABELS = {
  tr: "TEMİZLE",
  en: "CLEAR",
  de: "LÖSCHEN",
  fr: "EFFACER",
  it: "PULISCI",
  es: "LIMPIAR",
  ru: "ОЧИСТИТЬ",
  ar: "مسح",
  zh: "清除",
  tg: "ПОК КУН"
};

const ALT_CHARS = {
  a: ["â", "á", "à"],
  A: ["Â", "Á", "À"],
  c: ["ç"],
  C: ["Ç"],
  g: ["ğ"],
  G: ["Ğ"],
  i: ["ı", "î"],
  I: ["İ", "Î"],
  o: ["ö", "ô", "ó"],
  O: ["Ö", "Ô", "Ó"],
  s: ["ş"],
  S: ["Ş"],
  u: ["ü", "û", "ú"],
  U: ["Ü", "Û", "Ú"],
  e: ["é", "è", "ê"],
  E: ["É", "È", "Ê"],
  n: ["ñ"],
  N: ["Ñ"]
};

const SITE_LANG = "tr";
const RAW_LANG_POOL = Array.isArray(getLangPoolForSite(SITE_LANG))
  ? getLangPoolForSite(SITE_LANG)
  : [];

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim();
}

const RAW_LANGS = RAW_LANG_POOL
  .map((l) => {
    const code = canonical(l.code);
    if (!code) return null;

    return {
      code,
      flag: l.flag || "🌐",
      name: l.name || l.tr_name || code.toUpperCase(),
      bcp: BCP[code] || `${code}-${String(code).toUpperCase()}`
    };
  })
  .filter(Boolean);

const OFFLINE_STORAGE_CANDIDATES = [
  "italky_offline_installed_pairs_v7",
  "italky_offline_installed_pairs_v6",
  "italky_offline_installed_pairs_v5",
  "italky_offline_installed_pairs_v4",
  "italky_offline_installed_pairs_v3",
  "italky_offline_installed_pairs_v2",
  "italky_offline_installed_pairs_v1"
];

const NATIVE_LANG_STORAGE_CANDIDATES = [
  "italky_native_lang_v7",
  "italky_native_lang_v6",
  "italky_native_lang_v5",
  "italky_native_lang_v4",
  "italky_native_lang_v3",
  "italky_native_lang_v2",
  "italky_native_lang_v1"
];

function safeJsonParse(raw, fallback) {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function getSavedNativeLang() {
  for (const key of NATIVE_LANG_STORAGE_CANDIDATES) {
    const val = String(localStorage.getItem(key) || "").trim().toLowerCase();
    if (val) return val;
  }
  return "tr";
}

function getInstalledPairsMap() {
  for (const key of OFFLINE_STORAGE_CANDIDATES) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    const parsed = safeJsonParse(raw, {});
    if (parsed && typeof parsed === "object" && Object.keys(parsed).length) {
      return parsed;
    }
  }
  return {};
}

function getInstalledOfflineLanguageCodes() {
  const map = getInstalledPairsMap();
  const codes = new Set();

  Object.values(map).forEach((item) => {
    if (!item || typeof item !== "object") return;
    const from = canonical(item.from || "");
    const to = canonical(item.to || "");
    if (from) codes.add(from);
    if (to) codes.add(to);
  });

  const nativeLang = getSavedNativeLang();
  if (nativeLang) codes.add(nativeLang);

  return [...codes];
}

const INSTALLED_CODES = getInstalledOfflineLanguageCodes();

const LANGS = RAW_LANGS.filter((lang) => INSTALLED_CODES.includes(lang.code));

let topLang = INSTALLED_CODES.includes("en") ? "en" : (getSavedNativeLang() || "tr");
let botLang = getSavedNativeLang() || "tr";

if (topLang === botLang) {
  const other = LANGS.find((x) => x.code !== botLang);
  if (other) topLang = other.code;
}

let activeKeyboardSide = null;
let activeUiSide = "bot";
let shiftState = { top: false, bot: false };
let altMenuEl = null;
let holdTimer = null;
let currentAudio = null;
let speakRunId = 0;
let typewriterRunId = 0;
let nativeSpeechSide = null;
let audioCtx = null;

function langObj(code) {
  const c = canonical(code);
  return (
    LANGS.find((x) => x.code === c) || {
      code: c || "en",
      flag: "🌐",
      name: (c || "en").toUpperCase(),
      bcp: BCP[c] || "en-US",
    }
  );
}

function labelChip(code) {
  const o = langObj(code);
  return `${o.flag} ${o.name}`;
}

function getPlaceholder(code) {
  return PLACEHOLDERS[canonical(code)] || PLACEHOLDERS.en;
}

function translateUiLabel(map, lang) {
  return map[canonical(lang)] || map.en;
}

function setCenterUiSide(side) {
  activeUiSide = side === "top" ? "top" : "bot";
  centerHub?.classList.toggle("to-top", activeUiSide === "top");
  const lang = activeUiSide === "top" ? topLang : botLang;
  if (homeText) homeText.textContent = translateUiLabel(HOME_LABELS, lang);
  if (clearText) clearText.textContent = translateUiLabel(CLEAR_LABELS, lang);
}

function showToast(msg = "") {
  if (!miniToast) return;
  miniToast.textContent = String(msg || "");
  miniToast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    miniToast.classList.remove("show");
  }, 1900);
}

function setErrorUI() {
  frameRoot?.classList.remove("is-idle", "is-listening", "is-translating", "is-ready");
  frameRoot?.classList.add("is-error");
}

function setReadyUI() {
  frameRoot?.classList.remove("is-idle", "is-listening", "is-translating", "is-error");
  frameRoot?.classList.add("is-ready");
  topComposer?.classList.remove("listening");
  botComposer?.classList.remove("listening");
  topMic?.classList.remove("listening");
  botMic?.classList.remove("listening");
}

function setListeningUI(side) {
  frameRoot?.classList.remove("is-idle", "is-translating", "is-error", "is-ready");
  frameRoot?.classList.add("is-listening");
  pointOrbTo(side);
  setCenterUiSide(side);

  if (side === "top") {
    topComposer?.classList.add("listening");
    topMic?.classList.add("listening");
  } else {
    botComposer?.classList.add("listening");
    botMic?.classList.add("listening");
  }
}

function pointOrbTo(side) {
  if (!frameRoot) return;
  frameRoot.classList.remove("to-top", "to-bot");
  frameRoot.classList.add(side === "
