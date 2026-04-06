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
};

const F2F_VOICE_KEY = "facetoface_voice_mode";
const F2F_TRANSLATE_KEY = "facetoface_translate_mode";

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim();
}

const SITE_LANG = "tr";

const RAW_LANG_POOL = Array.isArray(getLangPoolForSite(SITE_LANG))
  ? getLangPoolForSite(SITE_LANG)
  : [];

const LANGS = RAW_LANG_POOL
  .map((l) => {
    const code = canonical(l.code);
    if (!code) return null;
    return {
      code,
      flag: l.flag || "🌐",
      name: l.name || code.toUpperCase(),
      bcp: BCP[code] || "en-US",
    };
  })
  .filter(Boolean);

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
  },
  de: {
    ready: "Tippen Sie zum Sprechen auf das Mikrofon.",
    preparing: "System wird vorbereitet...",
    repeat: "Drücken Sie das Mikrofon erneut, wenn Sie fertig gesprochen haben.",
    wait: "Bitte warten...",
    translating: "Wird übersetzt...",
    translateError: "⚠️ Übersetzungsdienst nicht erreichbar",
    micBlocked: "⚠️ Mikrofonberechtigung erforderlich",
    speechUnsupported: "⚠️ Spracherkennung wird auf diesem Gerät nicht unterstützt",
  },
  fr: {
    ready: "Touchez le micro pour parler.",
    preparing: "Le système se prépare...",
    repeat: "Appuyez de nouveau sur le micro quand vous avez fini de parler.",
    wait: "Veuillez patienter...",
    translating: "Traduction en cours...",
    translateError: "⚠️ Service de traduction indisponible",
    micBlocked: "⚠️ Autorisation micro requise",
    speechUnsupported: "⚠️ La reconnaissance vocale n'est pas prise en charge sur cet appareil",
  },
  it: {
    ready: "Tocca il microfono per parlare.",
    preparing: "Sistema in preparazione...",
    repeat: "Premi di nuovo il microfono quando hai finito di parlare.",
    wait: "Attendere prego...",
    translating: "Traduzione in corso...",
    translateError: "⚠️ Servizio di traduzione non disponibile",
    micBlocked: "⚠️ Autorizzazione microfono richiesta",
    speechUnsupported: "⚠️ Il riconoscimento vocale non è supportato su questo dispositivo",
  },
  es: {
    ready: "Toque el micrófono para hablar.",
    preparing: "El sistema se está preparando...",
    repeat: "Pulse el micrófono otra vez cuando termine de hablar.",
    wait: "Por favor espere...",
    translating: "Traduciendo...",
    translateError: "⚠️ Servicio de traducción no disponible",
    micBlocked: "⚠️ Se requiere permiso de micrófono",
    speechUnsupported: "⚠️ El reconocimiento de voz no es compatible con este dispositivo",
  },
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

function showToast(msg = "") {
  if (!miniToast) return;
  miniToast.textContent = String(msg || "");
  miniToast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    miniToast.classList.remove("show");
  }, 1800);
}

function showUiModal(message, title = "Jeton Gerekli") {
  if (!uiModal) return;
  uiModalTitle.textContent = title;
  uiModalText.textContent = message;
  uiModal.classList.add("open");
}

function closeUiModal() {
  uiModal?.classList.remove("open");
}

uiModalGo?.addEventListener("click", () => {
  location.href = "/pages/jetonbuy.html";
});
uiModalClose?.addEventListener("click", closeUiModal);
uiModal?.addEventListener("click", (e) => {
  if (e.target === uiModal) closeUiModal();
});

function getFaceVoiceMode() {
  return String(localStorage.getItem(F2F_VOICE_KEY) || "auto").trim().toLowerCase();
}

function getFaceTranslateMode() {
  const value = String(localStorage.getItem(F2F_TRANSLATE_KEY) || "normal").trim().toLowerCase();
  return value === "cultural" ? "cultural" : "normal";
}

function isPaidFaceTextMode() {
  return getFaceTranslateMode() === "cultural";
}

function isPaidFaceVoiceMode() {
  const v = getFaceVoiceMode();
  return v === "clone" || v === "female" || v === "male" || v === "preset";
}

async function ensureCurrentFacePremiumModeAccess() {
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
  const exclamations = (raw.match(/!/g) || []).length;
  const upperRatio = (() => {
    const letters = raw.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "");
    if (!letters.length) return 0;
    const upper = letters.replace(/[^A-ZÇĞİÖŞÜ]/g, "").length;
    return upper / letters.length;
  })();

  const angryWords = ["saçma", "yeter", "sinir", "nefret", "rezalet", "berbat"];
  const sadWords = ["üzgün", "kötüyüm", "moralim bozuk", "yoruldum"];
  const happyWords = ["harika", "süper", "müthiş", "çok iyi", "sevindim"];
  const excitedWords = ["inanamıyorum", "şahane", "wow", "efsane", "heyecanlıyım"];

  const hasAny = (arr) => arr.some((w) => s.includes(w));

  if (hasAny(angryWords) || exclamations >= 2 || upperRatio > 0.55) return "angry";
  if (hasAny(sadWords)) return "sad";
  if (hasAny(excitedWords)) return "excited";
  if (hasAny(happyWords)) return "happy";
  if (exclamations === 1) return "excited";

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
  setHelper(topHelper, t(topLang, "preparing"), "helper-wait");
  setHelper(botHelper, t(botLang, "preparing"), "helper-wait");
}

function bounceToReady(delay = 1200) {
  setTimeout(() => setSystemReadyUI(), delay);
}

function refreshLangLabels() {
  if (topLangTxt) topLangTxt.textContent = labelChip(topLang);
  if (botLangTxt) botLangTxt.textContent = labelChip(botLang);
}

function refreshModeFlag() {
  if (!modeFlag || !modeFlagTxt) return;
  modeFlag.classList.remove("offline");
  modeFlagTxt.textContent = "ONLINE";
}

function refreshReadyTextsIfIdle() {
  if (activeSide === null) {
    if (frameRoot?.classList.contains("is-ready")) setSystemReadyUI();
    if (frameRoot?.classList.contains("is-error")) setSystemPreparingUI();
  }
}

function closeAllPop() {
  popTop?.classList.remove("show");
  popBot?.classList.remove("show");
}

function renderPop(side) {
  const list = side === "top" ? listTop : listBot;
  const sel = side === "top" ? topLang : botLang;
  if (!list) return;

  list.innerHTML = LANGS.map((l) => {
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
  try {
    if (currentAudio) currentAudio.currentTime = 0;
  } catch {}

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
    return data?.user?.id || localStorage.getItem("user_id") || null;
  } catch {
    return localStorage.getItem("user_id") || null;
  }
}

function getSelectedPresetVoice() {
  return String(localStorage.getItem("facetoface_voice_preset") || "huma").trim().toLowerCase();
}

function getVoicePreference() {
  const faceMode = getFaceVoiceMode();

  if (["auto", "female", "male", "clone", "preset"].includes(faceMode)) {
    return faceMode;
  }

  return String(
    localStorage.getItem("tts_voice") ||
    localStorage.getItem("live_interpreter_voice") ||
    "auto"
  ).toLowerCase().trim();
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

  if (ttsMemoryCache.has(key)) {
    ttsMemoryCache.delete(key);
  }

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
  const myRunId = speakRunId;
  const userId = await getCurrentUserId();
  const voice = getVoicePreference();
  const finalVoice = voice === "preset" ? getSelectedPresetVoice() : voice;

  const r = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: String(text || "").trim(),
      lang: canonical(langCode),
      user_id: userId,
      module: "facetoface",
      voice: finalVoice,
      tone: canonTone(tone),
    }),
  });

  if (myRunId !== speakRunId) return false;

  const j = await r.json().catch(() => null);
  if (myRunId !== speakRunId) return false;

  if (!r.ok || !j?.ok || !j?.audio_base64) {
    throw new Error(j?.error || j?.detail || "TTS API unavailable");
  }

  const audioSrc = `data:audio/mp3;base64,${j.audio_base64}`;
  const cacheKey = buildTtsCacheKey(text, langCode, tone);
  rememberTtsCache(cacheKey, audioSrc);

  return await playCachedAudio(audioSrc, myRunId);
}

function chooseWebVoice(langCode) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const bcp = langObj(langCode).bcp.toLowerCase();
  const langBase = canonical(langCode);
  const pref = getVoicePreference();

  let pool = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith(langBase));
  if (!pool.length) pool = voices.filter((v) => String(v.lang || "").toLowerCase() === bcp);
  if (!pool.length) pool = voices;
  if (!pool.length) return null;

  if (pref === "female") {
    return pool.find((v) => /female|woman|zira|aria|seda|helena|jenny|susan|eva|anna|emma/i.test(v.name)) || pool[0];
  }

  if (pref === "male") {
    return pool.find((v) => /male|man|david|mark|george|james|alex|tom|jon|paul/i.test(v.name)) || pool[0];
  }

  return pool[0];
}

function toneToFallbackSpeechParams(tone) {
  const tt = canonTone(tone);
  if (tt === "happy") return { rate: 1.03, pitch: 1.15 };
  if (tt === "angry") return { rate: 1.08, pitch: 1.0 };
  if (tt === "sad") return { rate: 0.88, pitch: 0.9 };
  if (tt === "excited") return { rate: 1.12, pitch: 1.2 };
  return { rate: 1.0, pitch: 1.0 };
}

function speakFallback(text, langCode, tone = "neutral") {
  const myRunId = speakRunId;
  const value = String(text || "").trim();
  if (!value) return;

  const c = canonical(langCode);
  const pref = getVoicePreference();
  const toneCfg = toneToFallbackSpeechParams(tone);

  try {
    window.speechSynthesis?.cancel?.();
  } catch {}

  if (pref === "auto" && window.NativeTTS && typeof window.NativeTTS.speak === "function") {
    try {
      if (myRunId !== speakRunId) return;
      window.NativeTTS.speak(value, c);
      return;
    } catch {}
  }

  if (!window.speechSynthesis) return;

  try {
    if (!voicesReady) {
      window.speechSynthesis.getVoices();
      voicesReady = true;
    }
  } catch {}

  const u = new SpeechSynthesisUtterance(value);
  u.lang = langObj(c).bcp;

  const baseRate = c === "en" ? 0.82 : ["de", "fr", "it", "es"].includes(c) ? 0.88 : 0.92;
  u.rate = Math.max(0.7, Math.min(1.35, baseRate * toneCfg.rate));
  u.pitch = Math.max(0.7, Math.min(1.4, toneCfg.pitch));
  u.volume = 1;

  const voice = chooseWebVoice(c);
  if (voice) u.voice = voice;

  setTimeout(() => {
    if (myRunId !== speakRunId) return;
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }, 80);
}

async function speak(text, langCode, tone = "neutral") {
  const value = String(text || "").trim();
  if (!value) return;

  stopAudio();
  const myRunId = ++speakRunId;
  const voice = getVoicePreference();

  const cacheKey = buildTtsCacheKey(value, langCode, tone);
  const cachedAudioSrc = ttsMemoryCache.get(cacheKey);

  if (voice === "auto") {
    if (myRunId !== speakRunId) return;
    speakFallback(value, langCode, tone);
    return;
  }

  if (cachedAudioSrc) {
    try {
      await playCachedAudio(cachedAudioSrc, myRunId);
      return;
    } catch (e) {
      console.warn("[facetoface cached audio replay failed]", e);
      ttsMemoryCache.delete(cacheKey);
    }
  }

  if (myRunId !== speakRunId) return;

  let played = false;

  if (voice === "clone") {
    try {
      const ready = await hasReadyVoiceProfile();
      if (myRunId !== speakRunId) return;

      if (!ready) {
        speakFallback(value, langCode, tone);
        played = true;
      } else {
        const ok = await speakViaApi(value, langCode, tone);
        if (myRunId !== speakRunId) return;
        if (ok) played = true;
        else {
          speakFallback(value, langCode, tone);
          played = true;
        }
      }
    } catch (e) {
      console.warn("[facetoface clone speak fallback]", e);
      if (myRunId !== speakRunId) return;
      speakFallback(value, langCode, tone);
      played = true;
    }
  } else {
    try {
      const ok = await speakViaApi(value, langCode, tone);
      if (myRunId !== speakRunId) return;
      if (ok) played = true;
      else {
        speakFallback(value, langCode, tone);
        played = true;
      }
    } catch (e) {
      console.warn("[facetoface preset speak fallback]", e);
      if (myRunId !== speakRunId) return;
      speakFallback(value, langCode, tone);
      played = true;
    }
  }

  if (!played || myRunId !== speakRunId) return;

  if (isPaidFaceVoiceMode()) {
    Promise.resolve().then(async () => {
      try {
        const voiceUsageResult = await commitUsage({
          module: faceVoiceUsageModule(),
          usageKind: "voice",
          charCount: value.length,
          note: faceVoiceUsageNote(),
          meta: {
            surface: "facetoface",
            lang: canonical(langCode),
            tone: canonTone(tone),
            voice_mode: getFaceVoiceMode(),
            output_chars: value.length,
            billable_chars: value.length
          }
        });

        if (typeof voiceUsageResult?.tokens_after === "number") {
          try { setHeaderTokens(voiceUsageResult.tokens_after); } catch {}
        }
      } catch (e) {
        if (e?.code === "INSUFFICIENT_TOKENS") {
          console.warn("[facetoface voice usage] insufficient tokens after playback");
          return;
        }
        console.error("[facetoface voice usage]", e);
      }
    });
  }
}

async function chargeFaceUsage(inputText, outputText, srcLang, dstLang) {
  const inLen = String(inputText || "").trim().length;
  const outLen = String(outputText || "").trim().length;
  const billableChars = Math.max(inLen, outLen);

  if (billableChars <= 0) return null;

  let latestResult = null;

  if (isPaidFaceTextMode()) {
    latestResult = await commitUsage({
      module: faceTextUsageModule(),
      usageKind: "text",
      charCount: billableChars,
      note: faceTextUsageNote(),
      meta: {
        surface: "facetoface",
        from_lang: canonical(srcLang),
        to_lang: canonical(dstLang),
        translate_mode: getFaceTranslateMode(),
        voice_mode: getFaceVoiceMode(),
        input_chars: inLen,
        output_chars: outLen,
        billable_chars: billableChars
      }
    });
  }

  if (typeof latestResult?.tokens_after === "number") {
    try { setHeaderTokens(latestResult.tokens_after); } catch {}
  }

  return latestResult;
}

function keepLatestVisible(side) {
  const wrap = side === "top" ? topBody : botBody;
  if (!wrap) return;

  const apply = () => {
    try {
      wrap.scrollTop = wrap.scrollHeight;
    } catch {}
  };

  apply();
  requestAnimationFrame(apply);
  setTimeout(apply, 30);
  setTimeout(apply, 100);
}

function createSpeakerButton(getText, langCode, tone = "neutral") {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "spk-icon";
  btn.setAttribute("aria-label", "Tekrar dinle");
  btn.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M3 10v4h4l5 4V6L7 10H3"></path>
      <path d="M16 8a4 4 0 0 1 0 8"></path>
      <path d="M19 5a8 8 0 0 1 0 14"></path>
    </svg>
  `;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const value = typeof getText === "function" ? String(getText() || "").trim() : "";
    if (!value) return;

    const premiumOk = await ensureCurrentFacePremiumModeAccess();
    if (!premiumOk) return;

    await speak(value, langCode, tone);
  });

  return btn;
}

function addBubble(side, kind, text, opts = {}) {
  const wrap = side === "top" ? topBody : botBody;
  if (!wrap) return null;

  const row = document.createElement("div");
  row.className = `bubble ${kind}${opts.latest ? " is-latest" : ""}`;

  const inner = document.createElement("div");
  inner.className = "bubble-row";

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "").trim();

  if (opts.withSpeaker || kind === "me") {
    const spk = createSpeakerButton(
      () => txt.textContent || "",
      opts.speakLang || "en",
      opts.speakTone || "neutral"
    );
    inner.appendChild(spk);
  }

  inner.appendChild(txt);
  row.appendChild(inner);
  wrap.appendChild(row);
  keepLatestVisible(side);
  return row;
}

function clearLatest(side) {
  const wrap = side === "top" ? topBody : botBody;
  if (!wrap) return;
  wrap.querySelectorAll(".bubble.me.is-latest").forEach((el) => el.classList.remove("is-latest"));
}

async function translateText(text, from, to, tone = "neutral") {
  const src = canonical(from);
  const dst = canonical(to);
  const mode = getFaceTranslateMode();
  const style = mode === "cultural" ? "warm" : "balanced";
  const endpoints = [
    `${API_BASE}/api/translate_ai`,
    `${API_BASE}/api/translate-ai`,
    `${API_BASE}/api/translate`
  ];

  for (const endpoint of endpoints) {
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: String(text || "").trim(),
          from_lang: src,
          to_lang: dst,
          source: src,
          target: dst,
          mode,
          use_ai: mode === "cultural",
          cultural: mode === "cultural",
          tone: canonTone(tone),
          style
        }),
      });

      if (!r.ok) continue;

      const j = await r.json().catch(() => null);
      const value = String(
        j?.translated ||
        j?.translation ||
        j?.text ||
        ""
      ).trim();

      if (value) return value;
    } catch (e) {
      console.error("translate error", endpoint, e);
    }
  }

  return null;
}

function buildRecognizer(langCode) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = langObj(langCode).bcp;
  rec.interimResults = true;
  rec.continuous = true;
  rec.maxAlternatives = 1;
  return rec;
}

function stopRecognizer() {
  if (recognizer) {
    try { recognizer.stop(); } catch {}
  }
}

function getPreviewText(side) {
  const body = side === "top" ? topBody : botBody;
  const previewNode = body?.querySelector(".bubble.them.preview .txt");
  return String(previewNode?.textContent || "").trim();
}

function buildStableTranscript(results) {
  const pieces = [];

  for (let i = 0; i < results.length; i++) {
    const chunk = String(results[i]?.[0]?.transcript || "").replace(/\s+/g, " ").trim();
    if (!chunk) continue;

    const prev = pieces[pieces.length - 1] || "";
    if (prev === chunk) continue;
    if (prev && chunk.startsWith(prev)) {
      pieces[pieces.length - 1] = chunk;
      continue;
    }
    if (prev && prev.startsWith(chunk)) {
      continue;
    }

    pieces.push(chunk);
  }

  return pieces.join(" ").replace(/\s+/g, " ").trim();
}

function cleanupFinalTranscript(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\b(\S+)( \1\b)+/gi, "$1")
    .trim();
}

async function finalizeRecognition(side, text) {
  const src = side === "top" ? topLang : botLang;
  const dst = side === "top" ? botLang : topLang;
  const sourceTone = detectToneFromText(text);
  const other = side === "top" ? "bot" : "top";

  const cleaned = cleanupFinalTranscript(text);
  if (!cleaned) {
    setErrorUI();
    bounceToReady(1000);
    return;
  }

  addBubble(side, "them", cleaned);
  clearLatest(other);

  setTranslatingUI(side);

  const speakStatusLang = other === "top" ? topLang : botLang;
  const speakHelper = other === "top" ? topHelper : botHelper;
  setHelper(speakHelper, t(speakStatusLang, "translating"), "helper-repeat");

  const latestRow = addBubble(other, "me", t(dst, "translating"), {
    latest: true,
    speakLang: dst,
    speakTone: sourceTone,
  });

  const latestTxt = latestRow?.querySelector(".txt");
  const tr = await translateText(cleaned, src, dst, sourceTone);

  if (!tr) {
    setErrorUI();
    if (latestTxt) {
      latestTxt.textContent = t(dst, "translateError");
      keepLatestVisible(other);
    }
    bounceToReady(1200);
    return;
  }

  try {
    await chargeFaceUsage(cleaned, tr, src, dst);
  } catch (e) {
    if (e?.code === "INSUFFICIENT_TOKENS") {
      await ensureFaceToFacePremiumAccess();
      return;
    }
    console.error("[facetoface usage]", e);
  }

  if (latestTxt) {
    latestTxt.textContent = "";
    const speakPromise = speak(tr, dst, sourceTone);
    await typewriteText(latestTxt, tr, other);
    keepLatestVisible(other);
    try {
      await speakPromise;
    } catch {}
  } else {
    addBubble(other, "me", tr, {
      latest: true,
      speakLang: dst,
      speakTone: sourceTone,
    });

    try {
      await speak(tr, dst, sourceTone);
    } catch {}
  }

  setSystemReadyUI();
}

function startRecording(side) {
  const lang = side === "top" ? topLang : botLang;
  const rec = buildRecognizer(lang);

  if (!rec) {
    setErrorUI();
    const helper = side === "top" ? topHelper : botHelper;
    setHelper(helper, t(lang, "speechUnsupported"), "helper-wait");
    bounceToReady(1800);
    return;
  }

  const mySessionId = ++recognitionSessionId;

  recognizer = rec;
  recordingSide = side;
  liveTranscript = "";
  latestPreviewTranscript = "";
  recognitionFinishedByUser = false;

  rec.onstart = () => {
    setListeningUI(side);
  };

  rec.onresult = (e) => {
    if (mySessionId !== recognitionSessionId) return;

    const builtText = buildStableTranscript(e.results);
    if (!builtText) return;

    liveTranscript = builtText;
    latestPreviewTranscript = builtText;

    const body = side === "top" ? topBody : botBody;
    let previewNode = body?.querySelector(".bubble.them.preview");

    if (!previewNode) {
      previewNode = document.createElement("div");
      previewNode.className = "bubble them preview";
      previewNode.innerHTML = `<div class="bubble-row"><span class="txt"></span></div>`;
      body?.appendChild(previewNode);
    }

    const txtEl = previewNode.querySelector(".txt");
    if (txtEl) txtEl.textContent = builtText;

    keepLatestVisible(side);
  };

  rec.onerror = (e) => {
    if (mySessionId !== recognitionSessionId) return;

    const helper = side === "top" ? topHelper : botHelper;

    if (String(e?.error || "").includes("not-allowed")) {
      setHelper(helper, t(lang, "micBlocked"), "helper-wait");
    } else {
      setHelper(helper, t(lang, "preparing"), "helper-wait");
    }

    recognizer = null;
    recordingSide = null;
    liveTranscript = "";
    latestPreviewTranscript = "";
    recognitionFinishedByUser = false;

    setErrorUI();
    bounceToReady(1600);
  };

  rec.onend = () => {
    if (mySessionId !== recognitionSessionId) return;

    const sideAtEnd = side;
    const previewText = getPreviewText(sideAtEnd);
    const finalText = cleanupFinalTranscript(
      previewText || latestPreviewTranscript || liveTranscript || ""
    );

    recognizer = null;
    recordingSide = null;

    const previewNode = (sideAtEnd === "top" ? topBody : botBody)?.querySelector(".bubble.them.preview");
    previewNode?.remove();

    const shouldFinalize = !!finalText;

    liveTranscript = "";
    latestPreviewTranscript = "";
    recognitionFinishedByUser = false;

    if (shouldFinalize) {
      Promise.resolve().then(() => finalizeRecognition(sideAtEnd, finalText));
      return;
    }

    setSystemReadyUI();
  };

  try {
    rec.start();
  } catch {
    recognizer = null;
    recordingSide = null;
    liveTranscript = "";
    latestPreviewTranscript = "";
    recognitionFinishedByUser = false;
    setErrorUI();
    bounceToReady(1200);
  }
}

async function toggleRecording(side) {
  await ensureReady();

  const premiumOk = await ensureCurrentFacePremiumModeAccess();
  if (!premiumOk) return;

  if (recordingSide === side) {
    recognitionFinishedByUser = true;
    setTranslatingUI(side);

    setTimeout(() => {
      stopRecognizer();
    }, 120);

    return;
  }

  if (recordingSide && recordingSide !== side) {
    recognitionFinishedByUser = true;
    setTranslatingUI(recordingSide);

    setTimeout(() => {
      stopRecognizer();
    }, 80);

    return;
  }

  startRecording(side);
}

async function warmApis() {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id;
    if (!uid) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("tokens")
      .eq("id", uid)
      .maybeSingle();

    if (typeof profile?.tokens === "number") {
      setHeaderTokens(profile.tokens);
    }
  } catch (e) {
    console.warn("[facetoface warmApis]", e);
  }
}

function unlockOnFirstTouch() {
  const once = async () => {
    try { await warmAudio(); } catch {}
    window.removeEventListener("touchstart", once);
    window.removeEventListener("pointerdown", once);
    window.removeEventListener("click", once);
  };

  window.addEventListener("touchstart", once, { passive: true });
  window.addEventListener("pointerdown", once, { passive: true });
  window.addEventListener("click", once, { passive: true });
}

function startBoot() {
  if (bootStarted) return bootPromise;
  bootStarted = true;

  bootPromise = (async () => {
    setSystemPreparingUI();
    refreshLangLabels();
    pointOrbTo("bot");

    try {
      await Promise.race([
        Promise.allSettled([warmApis(), warmAudio()]),
        new Promise((resolve) => setTimeout(resolve, 1800))
      ]);
    } catch (e) {
      console.warn("[facetoface boot fallback]", e);
    }

    bootReady = true;
    setSystemReadyUI();
  })();

  return bootPromise;
}
async function ensureReady() {
  if (bootReady) return true;
  if (!bootStarted) startBoot();
  try { await bootPromise; } catch {}
  return true;
}

function safeHomeHref() {
  return "/pages/home.html";
}

function bindKeyboardButton(el, handler) {
  if (!el) return;
  el.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      await handler(e);
    }
  });
}

function bindTap(el, handler) {
  if (!el) return;

  let lastPointerUp = 0;

  el.addEventListener("pointerup", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    lastPointerUp = Date.now();
    await handler(e);
  });

  el.addEventListener("click", async (e) => {
    if (Date.now() - lastPointerUp < 400) return;
    e.preventDefault();
    e.stopPropagation();
    await handler(e);
  });
}

function bind() {
  refreshLangLabels();
  refreshModeFlag();
  unlockOnFirstTouch();

  topLangBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
    renderPop("top");
    popTop?.classList.add("show");
  });

  botLangBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
    renderPop("bot");
    popBot?.classList.add("show");
  });

  closeTop?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
  });

  closeBot?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
  });

  document.addEventListener("click", (e) => {
    const inside =
      (popTop && popTop.contains(e.target)) ||
      (popBot && popBot.contains(e.target));
    const isBtn = e.target?.closest?.("#topLangBtn,#botLangBtn");
    if (!inside && !isBtn) closeAllPop();
  }, { capture: true });

  clearBtn?.addEventListener("click", () => {
    stopAudio();
    stopTypewriter();
    stopRecognizer();
    recordingSide = null;
    liveTranscript = "";
    latestPreviewTranscript = "";
    if (topBody) topBody.innerHTML = "";
    if (botBody) botBody.innerHTML = "";
    setSystemReadyUI();
  });

  homeLink?.addEventListener("click", () => {
    location.href = safeHomeHref();
  });

  homeBtn?.addEventListener("click", () => {
    location.href = safeHomeHref();
  });

  settingsBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = "/pages/translation_settings.html?from=facetoface";
  });

  bindTap(modeFlag, async () => {
    showToast("Offline geçiş henüz bağlanmadı");
  });

  topMic?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleRecording("top");
  });

  botMic?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleRecording("bot");
  });

  bindKeyboardButton(topMic, async (e) => {
    e.stopPropagation();
    await toggleRecording("top");
  });

  bindKeyboardButton(botMic, async (e) => {
    e.stopPropagation();
    await toggleRecording("bot");
  });

  bindKeyboardButton(homeBtn, async () => {
    location.href = safeHomeHref();
  });

  bindKeyboardButton(settingsBtn, async () => {
    location.href = "/pages/translation_settings.html?from=facetoface";
  });

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        voicesReady = true;
      };
      window.speechSynthesis.getVoices();
    }
  } catch {}

  try {
    startBoot();
  } catch (e) {
    console.error("[facetoface startBoot error]", e);
  }
}
if (
  !frameRoot || !topBody || !botBody || !topMic || !botMic ||
  !topHelper || !botHelper || !topLangBtn || !botLangBtn ||
  !topLangTxt || !botLangTxt || !popTop || !popBot ||
  !listTop || !listBot || !closeTop || !closeBot ||
  !clearBtn || !homeLink || !homeBtn || !settingsBtn ||
  !modeFlag || !modeFlagTxt || !miniToast
) {
  console.error("[facetoface] Gerekli DOM elemanları eksik.");
} else {
  try {
    bind();
  } catch (e) {
    console.error("[facetoface bind error]", e);
  }
}
