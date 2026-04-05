// FILE: /js/facetoface_offline.js

const $ = (id) => document.getElementById(id);

const OFFLINE_PACK_KEY = "italky_offline_installed_packs_v5";

const frameRoot = $("frameRoot");
const topLangBtn = $("topLangBtn");
const botLangBtn = $("botLangBtn");
const topLangTxt = $("topLangTxt");
const botLangTxt = $("botLangTxt");
const topBody = $("topBody");
const botBody = $("botBody");
const topMic = $("topMic");
const botMic = $("botMic");
const topHelper = $("topHelper");
const botHelper = $("botHelper");
const topBack = $("topBack");
const clearChat = $("clearChat");
const homeBtn = $("homeBtn");
const offlinePill = $("offlinePill");

let currentAudio = null;
let topRec = null;
let botRec = null;
let topListening = false;
let botListening = false;
let topText = "";
let botText = "";

const BCP = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
  ru: "ru-RU",
  el: "el-GR",
  az: "az-AZ",
  ka: "ka-GE",
  ar: "ar-SA",
  fa: "fa-IR",
  hy: "hy-AM",
  kmr: "tr-TR",
  ckb: "tr-TR",
  zza: "tr-TR",
  lzz: "tr-TR",
  ady: "tr-TR",
  ab: "tr-TR"
};

const LANG_META = {
  tr:  { flag: "🇹🇷", name: "Türkçe" },
  en:  { flag: "🇬🇧", name: "İngilizce" },
  de:  { flag: "🇩🇪", name: "Almanca" },
  fr:  { flag: "🇫🇷", name: "Fransızca" },
  it:  { flag: "🇮🇹", name: "İtalyanca" },
  es:  { flag: "🇪🇸", name: "İspanyolca" },
  ru:  { flag: "🇷🇺", name: "Rusça" },
  el:  { flag: "🇬🇷", name: "Yunanca" },
  az:  { flag: "🇦🇿", name: "Azerbaycanca" },
  ka:  { flag: "🇬🇪", name: "Gürcüce" },
  ar:  { flag: "🇸🇦", name: "Arapça" },
  fa:  { flag: "🇮🇷", name: "Farsça" },
  hy:  { flag: "🇦🇲", name: "Ermenice" },
  kmr: { flag: "🟨", name: "Kürtçe (Kurmançça)" },
  ckb: { flag: "🟧", name: "Kürtçe (Sorani)" },
  zza: { flag: "🟫", name: "Zazaca" },
  lzz: { flag: "🌊", name: "Lazca" },
  ady: { flag: "🟩", name: "Çerkezce" },
  ab:  { flag: "⬛", name: "Abhazca" }
};

function canonical(code) {
  return String(code || "").trim().toLowerCase();
}

function langMeta(code) {
  const c = canonical(code);
  return LANG_META[c] || {
    flag: "🌐",
    name: c.toUpperCase()
  };
}

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function setHelpers(topText = "", botText = "") {
  if (topHelper) topHelper.textContent = topText;
  if (botHelper) botHelper.textContent = botText;
}

function setState(state) {
  if (!frameRoot) return;
  frameRoot.classList.remove("is-listening", "is-translating", "is-ready", "is-error");
  if (state) frameRoot.classList.add(`is-${state}`);
}

function pointOrbTo(side) {
  if (!frameRoot) return;
  frameRoot.classList.remove("to-top", "to-bot");
  frameRoot.classList.add(side === "top" ? "to-top" : "to-bot");
}

function showToast(message = "") {
  let toast = document.getElementById("offlineToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "offlineToast";
    toast.style.cssText = `
      position:fixed;
      left:50%;
      bottom:calc(24px + env(safe-area-inset-bottom, 0px));
      transform:translateX(-50%) translateY(120px);
      min-height:44px;
      padding:10px 16px;
      border-radius:16px;
      background:rgba(12,16,28,.96);
      border:1px solid rgba(255,255,255,.10);
      color:#fff;
      font-size:12px;
      font-weight:1000;
      display:flex;
      align-items:center;
      justify-content:center;
      text-align:center;
      max-width:min(92vw,420px);
      z-index:99999;
      box-shadow:0 18px 36px rgba(0,0,0,.35);
      transition:.22s ease;
      backdrop-filter:blur(14px);
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.transform = "translateX(-50%) translateY(0)";
  clearTimeout(window.__offlineToastTimer);
  window.__offlineToastTimer = setTimeout(() => {
    toast.style.transform = "translateX(-50%) translateY(120px)";
  }, 1800);
}

function stopAudio() {
  try {
    currentAudio?.pause?.();
    if (currentAudio) currentAudio.currentTime = 0;
  } catch {}
  currentAudio = null;

  try {
    window.speechSynthesis?.cancel?.();
  } catch {}

  try {
    window.NativeTTS?.stop?.();
  } catch {}
}

function renderBubble(container, text, latest = true, withSpeaker = false, langCode = "tr") {
  if (!container) return;

  if (latest) container.innerHTML = "";

  const bubble = document.createElement("div");
  bubble.className = `bubble me${latest ? " is-latest" : ""}`;

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = text;
  bubble.appendChild(txt);

  if (withSpeaker) {
    const spk = document.createElement("button");
    spk.className = "spk";
    spk.type = "button";
    spk.setAttribute("aria-label", "Seslendir");
    spk.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 10v4h4l5 4V6L7 10H3"></path>
        <path d="M16 8a4 4 0 0 1 0 8"></path>
        <path d="M19 5a8 8 0 0 1 0 14"></path>
      </svg>
    `;
    spk.addEventListener("click", () => speakText(text, langCode));
    bubble.appendChild(spk);
  }

  container.appendChild(bubble);
}

function getInstalledPacks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OFFLINE_PACK_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isPackActive(pack) {
  if (!pack?.expires_at) return false;
  return new Date(pack.expires_at).getTime() > Date.now();
}

function getInstalledLanguages() {
  const packs = getInstalledPacks().filter(isPackActive);
  const codes = new Set();

  for (const p of packs) {
    const code = canonical(p.lang);
    if (code) codes.add(code);
  }

  codes.add("tr");
  codes.add("en");

  return [...codes];
}

function updateLangLabels() {
  const top = langMeta(topLang);
  const bot = langMeta(botLang);

  if (topLangTxt) topLangTxt.textContent = `${top.flag} ${top.name}`;
  if (botLangTxt) botLangTxt.textContent = `${bot.flag} ${bot.name}`;
}

function createLangSheet(title, codes, selectedCode, onPick) {
  const backdrop = document.createElement("div");
  backdrop.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.58);
    backdrop-filter:blur(8px);
    z-index:999999;
    display:flex;
    align-items:flex-end;
    justify-content:center;
    padding:14px;
  `;

  const card = document.createElement("div");
  card.style.cssText = `
    width:min(100%,420px);
    max-height:72vh;
    overflow:hidden;
    border-radius:24px;
    border:1px solid rgba(255,255,255,.10);
    background:linear-gradient(180deg, rgba(18,22,36,.98), rgba(10,12,24,.98));
    box-shadow:0 24px 60px rgba(0,0,0,.45);
    display:flex;
    flex-direction:column;
  `;

  const head = document.createElement("div");
  head.style.cssText = `
    padding:14px 14px 10px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    border-bottom:1px solid rgba(255,255,255,.08);
    font-weight:1000;
    font-size:14px;
  `;
  head.innerHTML = `<div>${title}</div>`;

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Kapat";
  close.style.cssText = `
    min-height:38px;
    padding:0 12px;
    border-radius:12px;
    border:1px solid rgba(255,255,255,.10);
    background:rgba(255,255,255,.06);
    color:#fff;
    font-weight:1000;
    cursor:pointer;
  `;
  head.appendChild(close);

  const list = document.createElement("div");
  list.style.cssText = `
    overflow:auto;
