// FILE: /js/facetoface_page.js

import { getLangPoolForSite } from "/js/lang_pool_full.js";
import { supabase } from "/js/supabase_client.js";
import { setHeaderTokens } from "/js/ui_shell.js";
import { ensureFaceToFacePremiumAccess } from "/js/facetoface_premium_gate.js";
import {
  commitUsage,
  buildUsageNote
} from "/js/usage_meter.js";

const ttsMemoryCache = new Map();
const TTS_CACHE_LIMIT = 24;

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

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
  ab: "tr-TR",
};

const F2F_VOICE_KEY = "facetoface_voice_mode";
const F2F_TRANSLATE_KEY = "facetoface_translate_mode";
const F2F_MODE_KEY = "facetoface_runtime_mode";
const OFFLINE_PACK_KEY = "italky_offline_installed_packs_v5";

function canonical(code) {
  return String(code || "")
    .toLowerCase()
    .split("-")[0]
    .trim();
}

function getQueryMode() {
  try {
    const u = new URL(location.href);
    return String(u.searchParams.get("mode") || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function getForcedOfflineMode() {
  return getQueryMode() === "offline-forced";
}

function getStoredModePreference() {
  return String(localStorage.getItem(F2F_MODE_KEY) || "auto").trim().toLowerCase();
}

function setStoredModePreference(mode) {
  localStorage.setItem(F2F_MODE_KEY, String(mode || "auto").trim().toLowerCase());
}

function getInstalledPacksForOffline() {
  try {
    const raw = JSON.parse(localStorage.getItem(OFFLINE_PACK_KEY) || "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function isOfflinePackActive(pack) {
  if (!pack?.expires_at) return false;
  return new Date(pack.expires_at).getTime() > Date.now();
}

function getInstalledOfflineCodes() {
  const packs = getInstalledPacksForOffline().filter(isOfflinePackActive);
  const codes = new Set();

  for (const p of packs) {
    const c = canonical(p.lang);
    if (c) codes.add(c);
  }

  codes.add("tr");
  codes.add("en");
  return [...codes];
}

function isOfflineRuntime() {
  if (getForcedOfflineMode()) return true;

  const pref = getStoredModePreference();
  if (pref === "offline") return true;
  if (pref === "online") return false;

  return navigator.onLine === false;
}

function getOfflineLangMeta(code) {
  const map = {
    tr:  { flag: "🇹🇷", name: "Türkçe" },
    en:  { flag: "🇬🇧", name: "English" },
    de:  { flag: "🇩🇪", name: "Deutsch" },
    fr:  { flag: "🇫🇷", name: "Français" },
    it:  { flag: "🇮🇹", name: "Italiano" },
    es:  { flag: "🇪🇸", name: "Español" },
    ru:  { flag: "🇷🇺", name: "Русский" },
    el:  { flag: "🇬🇷", name: "Ελληνικά" },
    az:  { flag: "🇦🇿", name: "Azərbaycanca" },
    ka:  { flag: "🇬🇪", name: "ქართული" },
    ar:  { flag: "🇸🇦", name: "العربية" },
    fa:  { flag: "🇮🇷", name: "فارسی" },
    hy:  { flag: "🇦🇲", name: "Հայերեն" },
    kmr: { flag: "🟨", name: "Kürtçe (Kurmançça)" },
    ckb: { flag: "🟧", name: "Kürtçe (Sorani)" },
    zza: { flag: "🟫", name: "Zazaca" },
    lzz: { flag: "🌊", name: "Lazca" },
    ady: { flag: "🟩", name: "Çerkezce" },
    ab:  { flag: "⬛", name: "Abhazca" }
  };
  return map[canonical(code)] || { flag: "🌐", name: canonical(code).toUpperCase() };
}

const SITE_LANG = "tr";

const RAW_LANG_POOL = Array.isArray(getLangPoolForSite(SITE_LANG))
  ? getLangPoolForSite(SITE_LANG)
  : [];

const BASE_LANGS = RAW_LANG_POOL
  .map((l) => {
    const code = canonical(l.code);
    if (!code) return null;

    return {
      code,
      flag: l.flag || getOfflineLangMeta(code).flag || "🌐",
      name: l.name || getOfflineLangMeta(code).name || code.toUpperCase(),
      bcp: BCP[code] || "en-US",
    };
  })
  .filter(Boolean);

function getRuntimeLangPool() {
  if (!isOfflineRuntime()) return BASE_LANGS;

  const allowed = new Set(getInstalledOfflineCodes());
  let filtered = BASE_LANGS.filter((x) => allowed.has(canonical(x.code)));

  const missing = [...allowed].filter((c) => !filtered.find((x) => canonical(x.code) === c));
  for (const code of missing) {
    const meta = getOfflineLangMeta(code);
    filtered.push({
      code,
      flag: meta.flag,
      name: meta.name,
      bcp: BCP[code] || "tr-TR"
    });
  }

  return filtered;
}

function langObj(code) {
  const c = canonical(code);
  const runtimePool = getRuntimeLangPool();

  return (
    runtimePool.find((x) => x.code === c) ||
    BASE_LANGS.find((x) => x.code === c) || {
      code: c || "en",
      flag: getOfflineLangMeta(c).flag || "🌐",
      name: getOfflineLangMeta(c).name || (c || "en").toUpperCase(),
      bcp: BCP[c] || "en-US",
    }
  );
}

function labelChip(code) {
  const o = langObj(code);
  return `${o.flag} ${o.name}`;
}

const UI_TEXT = {
  tr: {
    ready: "Konuşmak için mikrofona dokununuz.",
    preparing: "Sistem hazırlanıyor...",
    repeat: "Konuşmanız bitince mikrofona tekrar basınız.",
    wait: "Lütfen bekleyiniz...",
    translating: "Çevriliyor...",
    translateError: "⚠️ Çeviri servisine ulaşılamadı",
    micBlocked: "⚠️ Mikrofon izni gerekli",
    speechUnsupported: "⚠️ Bu cihazda konuşma algılama desteklenmiyor",
    offlineForced: "Offline mod aktif • indirilen dillerle çalışıyor",
  },
  en: {
    ready: "Tap the microphone to speak.",
    preparing: "System is preparing...",
    repeat: "Press the microphone again when you finish speaking.",
    wait: "Please wait...",
    translating: "Translating...",
    translateError: "⚠️ Translation service unavailable",
    micBlocked: "⚠️ Microphone permission required",
    speechUnsupported: "⚠️ Speech recognition is not supported on this device",
    offlineForced: "Offline mode active",
  }
};

function t(langCode, key) {
  const c = canonical(langCode);
  const pack = UI_TEXT[c] || UI_TEXT.en;
  return pack[key] || UI_TEXT.en[key] || "";
}

const frameRoot = $("frameRoot");
const topBody = $("topBody");
const botBody = $("botBody");
const topMic = $("topMic");
const botMic = $("botMic");
const topHelper = $("topHelper");
const botHelper = $("botHelper");
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
const settingsBtn = $("settingsBtn");
const modeFlag = $("modeFlag");
const modeFlagTxt = $("modeFlagTxt");
const miniToast = $("miniToast");

const uiModal = $("uiModal");
const uiModalTitle = $("uiModalTitle");
const uiModalText = $("uiModalText");
const uiModalGo = $("uiModalGo");
const uiModalClose = $("uiModalClose");

let topLang = "en";
let botLang = "tr";
let activeSide = null;
let recognizer = null;
let recordingSide = null;
let currentAudio = null;
let audioCtx = null;
let bootReady = false;
let bootStarted = false;
let bootPromise = null;
let voicesReady = false;
let speakRunId = 0;
let liveTranscript = "";
let latestPreviewTranscript = "";
let recognitionSessionId = 0;
let typewriterRunId = 0;

function showToast(message = "") {
  if (!miniToast) return;
  miniToast.textContent = String(message || "");
  miniToast.classList.add("show");
  clearTimeout(window.__faceToastTimer);
  window.__faceToastTimer = setTimeout(() => {
    miniToast.classList.remove("show");
  }, 1800);
}

function showUiModal(message, title = "Bilgi") {
  if (!uiModal) return;
  uiModalTitle.textContent = title;
  uiModalText.textContent = message;
  if (uiModalGo) uiModalGo.textContent = "Tamam";
  if (uiModalClose) uiModalClose.style.display = "none";
  uiModal.classList.add("open");
}

function closeUiModal() {
  uiModal?.classList.remove("open");
}

uiModalGo?.addEventListener("click", closeUiModal);
uiModalClose?.addEventListener("click", closeUiModal);
uiModal?.addEventListener("click", (e) => {
  if (e.target === uiModal) closeUiModal();
});

function canOpenFaceSettings() {
  return !getForcedOfflineMode();
}

function getFaceVoiceMode() {
  return String(localStorage.getItem(F2F_VOICE_KEY) || "auto").trim().toLowerCase();
}

function getFaceTranslateMode() {
  const value = String(localStorage.getItem(F2F_TRANSLATE_KEY) || "normal").trim().toLowerCase();
  return value === "cultural" ? "cultural" : "normal";
}

function isPaidFaceTextMode() {
  return !isOfflineRuntime() && getFaceTranslateMode() === "cultural";
}

function isPaidFaceVoiceMode() {
  if (isOfflineRuntime()) return false;
  const v = getFaceVoiceMode();
  return v === "clone" || v === "female" || v === "male" || v === "preset";
}

async function ensureCurrentFacePremiumModeAccess() {
  if (isOfflineRuntime()) return true;

  const needsPremium = isPaidFaceTextMode() || isPaidFaceVoiceMode();
  if (!needsPremium) return true;

  return await ensureFaceToFacePremiumAccess();
}

function faceTextUsageModule() {
  return getFaceTranslateMode() === "cultural" ? "facetoface_ai" : "usage_face_to_face";
}

function faceVoiceUsageModule() {
  const v = getFaceVoiceMode();
  if (v === "clone") return "voice_clone";
  if (v === "preset") return "voice_preset_use";
  if (v === "female" || v === "male") return "voice_ai";
  return "voice_ai";
}

function faceTextUsageNote() {
  return buildUsageNote({
    surface: "facetoface",
    usageKind: "text",
    mode: getFaceTranslateMode() === "cultural" ? "cultural" : "normal"
  });
}

function faceVoiceUsageNote() {
  const v = getFaceVoiceMode();
  let mode = "normal";
  if (v === "clone") mode = "clone";
  else if (v === "preset") mode = "preset";
  else if (v === "female" || v === "male") mode = "ai";

  return buildUsageNote({
    surface: "facetoface",
    usageKind: "voice",
    mode
  });
}

function canonTone(value) {
  const v = String(value || "neutral").trim().toLowerCase();
  return ["neutral", "happy", "angry", "sad", "excited"].includes(v) ? v : "neutral";
}

function detectToneFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) return "neutral";
  const s = raw.toLowerCase();
  if (/[!]{2,}/.test(raw)) return "excited";
  if (["saçma", "yeter", "sinir", "nefret"].some((w) => s.includes(w))) return "angry";
  if (["üzgün", "kötüyüm", "yoruldum"].some((w) => s.includes(w))) return "sad";
  if (["harika", "süper", "mutlu"].some((w) => s.includes(w))) return "happy";
  return "neutral";
}

function pointOrbTo(side) {
  if (!frameRoot) return;
  frameRoot.classList.remove("to-top", "to-bot");
  frameRoot.classList.add(side === "top" ? "to-top" : "to-bot");
}

function setMicState(side, state) {
  const mic = side === "top" ? topMic : botMic;
  if (!mic) return;
  mic.classList.remove("listening", "recorded");
  if (state === "listening") mic.classList.add("listening");
  if (state === "recorded") mic.classList.add("recorded");
}

function resetMics() {
  topMic?.classList.remove("listening", "recorded");
  botMic?.classList.remove("listening", "recorded");
}

function setFrameVisual(state) {
  if (!frameRoot) return;
  frameRoot.classList.remove("is-idle", "is-listening", "is-translating", "is-ready", "is-error");
  if (state) frameRoot.classList.add(`is-${state}`);
}

function setHelper(el, text, tone) {
  if (!el) return;
  el.className = "helper-text";
  if (tone) el.classList.add(tone);
  el.textContent = text || "";
}

function setSystemReadyUI() {
  activeSide = null;
  resetMics();
  setFrameVisual("ready");

  if (isOfflineRuntime()) {
    const msg = t(topLang, "offlineForced");
    setHelper(topHelper, msg, "helper-ready");
    setHelper(botHelper, msg, "helper-ready");
    return;
  }

  setHelper(topHelper, t(topLang, "ready"), "helper-ready");
  setHelper(botHelper, t(botLang, "ready"), "helper-ready");
}

function setSystemPreparingUI() {
  activeSide = null;
  resetMics();
  setFrameVisual("error");
  setHelper(topHelper, t(topLang, "preparing"), "helper-wait");
  setHelper(botHelper, t(botLang, "preparing"), "helper-wait");
}

function setListeningUI(side) {
  activeSide = side;
  pointOrbTo(side);
  resetMics();
  setMicState(side, "listening");
  setFrameVisual("listening");

  if (side === "top") {
    setHelper(topHelper, t(topLang, "repeat"), "helper-repeat");
    setHelper(botHelper, t(botLang, "wait"), "helper-wait");
  } else {
    setHelper(topHelper, t(topLang, "wait"), "helper-wait");
    setHelper(botHelper, t(botLang, "repeat"), "helper-repeat");
  }
}

function setTranslatingUI(side) {
  activeSide = side;
  pointOrbTo(side);
  setMicState(side, "recorded");
  setFrameVisual("translating");

  if (side === "top") {
    setHelper(topHelper, t(topLang, "repeat"), "helper-repeat");
    setHelper(botHelper, t(botLang, "wait"), "helper-wait");
  } else {
    setHelper(topHelper, t(topLang, "wait"), "helper-wait");
    setHelper(botHelper, t(botLang, "repeat"), "helper-repeat");
  }
}

function setErrorUI() {
  activeSide = null;
  resetMics();
  setFrameVisual("error");
  setHelper(topHelper, t(topLang, "translateError"), "helper-wait");
  setHelper(botHelper, t(botLang, "translateError"), "helper-wait");
}

function bounceToReady(delay = 1200) {
  setTimeout(() => setSystemReadyUI(), delay);
}

function refreshLangLabels() {
  if (topLangTxt) topLangTxt.textContent = labelChip(topLang);
  if (botLangTxt) botLangTxt.textContent = labelChip(botLang);
}

function updateModeFlagUI() {
  if (!modeFlag || !modeFlagTxt) return;
  const offline = isOfflineRuntime();
  modeFlag.classList.toggle("offline", offline);
  modeFlagTxt.textContent = offline ? "OFFLINE" : "ONLINE";
}

function ensureRuntimeLanguagesStillValid() {
  const runtimePool = getRuntimeLangPool();
  const codes = runtimePool.map((x) => canonical(x.code));

  if (!codes.includes(canonical(topLang))) {
    topLang = codes.includes("en") ? "en" : (codes[0] || "en");
  }

  if (!codes.includes(canonical(botLang))) {
    botLang = codes.includes("tr") ? "tr" : (codes[0] || "tr");
  }

  refreshLangLabels();
}

function refreshReadyTextsIfIdle() {
  if (activeSide === null) setSystemReadyUI();
}

function closeAllPop() {
  popTop?.classList.remove("show");
  popBot?.classList.remove("show");
}

function renderPop(side) {
  const list = side === "top" ? listTop : listBot;
  const sel = side === "top" ? topLang : botLang;
  if (!list) return;

  const runtimePool = getRuntimeLangPool();

  list.innerHTML = runtimePool.map((l) => {
    const active = canonical(l.code) === canonical(sel) ? "active" : "";
    return `
      <div class="pop-item ${active}" data-code="${l.code}">
        <div class="pop-left">
          <div class="pop-flag">${l.flag}</div>
          <div class="pop-name">${l.name}</div>
        </div>
        <div class="pop-code">${l.code.toUpperCase()}</div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".pop-item").forEach((el) => {
    el.addEventListener("click", () => {
      const code = el.dataset.code || "en";
      if (side === "top") topLang = canonical(code);
      else botLang = canonical(code);

      refreshLangLabels();
      refreshReadyTextsIfIdle();
      closeAllPop();
    });
  });
}

function stopAudio() {
  speakRunId += 1;

  try { currentAudio?.pause?.(); } catch {}
  try { if (currentAudio) currentAudio.currentTime = 0; } catch {}
  currentAudio = null;

  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}
}

function stopTypewriter() {
  typewriterRunId += 1;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTypingProfile(text) {
  const len = String(text || "").trim().length;
  if (len <= 24) return { startChunk: 1, midChunk: 2, endChunk: 1, base: 9 };
  if (len <= 70) return { startChunk: 1, midChunk: 2, endChunk: 1, base: 8 };
  if (len <= 130) return { startChunk: 1, midChunk: 3, endChunk: 1, base: 7 };
  return { startChunk: 2, midChunk: 3, endChunk: 1, base: 6 };
}

function getTypingDelay(ch, index, total, text) {
  const profile = getTypingProfile(text);
  const progress = total ? index / total : 0;
  const tailBoost = progress > 0.82 ? 3 : 0;

  if (ch === " ") return 0;
  if (/[.!?]/.test(ch)) return 95 + tailBoost;
  if (/[,]/.test(ch)) return 65 + tailBoost;
  if (/[;:]/.test(ch)) return 50 + tailBoost;
  if (/[\n]/.test(ch)) return 45 + tailBoost;

  return profile.base + tailBoost;
}

function getTypingChunkSize(index, total, text) {
  const profile = getTypingProfile(text);
  const progress = total ? index / total : 0;
  if (progress < 0.18) return profile.startChunk;
  if (progress < 0.78) return profile.midChunk;
  return profile.endChunk;
}

async function typewriteText(el, finalText, side) {
  if (!el) return;

  stopTypewriter();
  const runId = typewriterRunId;
  const full = String(finalText || "").trim();

  el.textContent = "";
  if (!full) return;

  let i = 0;
  while (i < full.length) {
    if (runId !== typewriterRunId) return;

    const chunkSize = getTypingChunkSize(i, full.length, full);
    const next = Math.min(full.length, i + chunkSize);

    el.textContent = full.slice(0, next);
    i = next;

    const lastChar = full.charAt(i - 1);
    keepLatestVisible(side);

    await wait(getTypingDelay(lastChar, i, full.length, full));
  }
}

async function getCurrentUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

function getSelectedPresetVoice() {
  return String(localStorage.getItem("facetoface_voice_preset") || "huma").trim().toLowerCase();
}

function getVoicePreference() {
  const faceMode = getFaceVoiceMode();
  if (["auto", "female", "male", "clone", "preset"].includes(faceMode)) return faceMode;
  return "auto";
}

async function hasReadyVoiceProfile() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("tts_voice_ready,tts_voice_id")
      .eq("id", userId)
      .maybeSingle();

    if (error) return false;
    return !!data?.tts_voice_ready && !!String(data?.tts_voice_id || "").trim();
  } catch {
    return false;
  }
}

async function warmAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") await audioCtx.resume();
    }
  } catch {}

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      voicesReady = true;
    }
  } catch {}
}

function buildTtsCacheKey(text, langCode, tone = "neutral") {
  const voice = getVoicePreference();
  const finalVoice = voice === "preset" ? getSelectedPresetVoice() : voice;

  return JSON.stringify({
    t: String(text || "").trim(),
    l: canonical(langCode),
    v: String(finalVoice || "auto").trim().toLowerCase(),
    n: canonTone(tone)
  });
}

function rememberTtsCache(key, audioSrc) {
  if (!key || !audioSrc) return;
  if (ttsMemoryCache.has(key)) ttsMemoryCache.delete(key);
  ttsMemoryCache.set(key, audioSrc);

  while (ttsMemoryCache.size > TTS_CACHE_LIMIT) {
    const firstKey = ttsMemoryCache.keys().next().value;
    ttsMemoryCache.delete(firstKey);
  }
}

async function playCachedAudio(audioSrc, runId) {
  if (!audioSrc || runId !== speakRunId) return false;

  const nextAudio = new Audio(audioSrc);
  nextAudio.preload = "auto";
  nextAudio.playsInline = true;
  nextAudio.crossOrigin = "anonymous";

  await warmAudio();
  if (runId !== speakRunId) return false;

  currentAudio = nextAudio;

  nextAudio.onended = () => {
    if (currentAudio === nextAudio) currentAudio = null;
  };

  nextAudio.onerror = () => {
    if (currentAudio === nextAudio) currentAudio = null;
  };

  await nextAudio.play();

  if (runId !== speakRunId) {
    try {
      nextAudio.pause();
      nextAudio.currentTime = 0;
    } catch {}
    if (currentAudio === nextAudio) currentAudio = null;
    return false;
  }

  return true;
}

async function speakViaApi(text, langCode, tone = "neutral") {
  const myRunId =
