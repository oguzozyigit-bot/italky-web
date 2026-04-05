import { getLangPoolForSite } from "/js/lang_pool_full.js";
import { supabase } from "/js/supabase_client.js";
import { setHeaderTokens } from "/js/ui_shell.js";
import {
  commitUsage,
  resolveUsageModule,
  resolveUsageMode,
  buildUsageNote
} from "/js/usage_meter.js";

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
  kmr: "tr-TR",
  ckb: "tr-TR",
  zza: "tr-TR",
  lzz: "tr-TR",
  ady: "tr-TR",
  ab: "tr-TR",
  ar: "ar-SA",
  fa: "fa-IR",
  hy: "hy-AM"
};

const F2F_VOICE_KEY = "facetoface_voice_mode";
const F2F_TRANSLATE_KEY = "facetoface_translate_mode";
const F2F_RUNTIME_KEY = "facetoface_runtime_mode";
const OFFLINE_PACK_KEY = "italky_offline_installed_packs_v5";

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim();
}

function getQueryMode() {
  try {
    const u = new URL(location.href);
    return String(u.searchParams.get("mode") || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function isForcedOffline() {
  return getQueryMode() === "offline-forced";
}

function getRuntimeMode() {
  if (isForcedOffline()) return "offline";
  const saved = String(localStorage.getItem(F2F_RUNTIME_KEY) || "online").trim().toLowerCase();
  return saved === "offline" ? "offline" : "online";
}

function setRuntimeMode(mode) {
  if (isForcedOffline()) return;
  localStorage.setItem(F2F_RUNTIME_KEY, mode === "offline" ? "offline" : "online");
}

function isOfflineMode() {
  return getRuntimeMode() === "offline";
}

const RAW_POOL = Array.isArray(getLangPoolForSite("tr")) ? getLangPoolForSite("tr") : [];

const BASE_LANGS = RAW_POOL
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

function getOfflinePackCodes() {
  try {
    const raw = JSON.parse(localStorage.getItem(OFFLINE_PACK_KEY) || "[]");
    const rows = Array.isArray(raw) ? raw : [];
    const now = Date.now();
    const codes = new Set(["tr", "en"]);

    for (const row of rows) {
      const expiresAt = row?.expires_at ? new Date(row.expires_at).getTime() : 0;
      if (expiresAt > now && row?.lang) {
        codes.add(canonical(row.lang));
      }
    }

    return [...codes];
  } catch {
    return ["tr", "en"];
  }
}

function getRuntimeLangs() {
  if (!isOfflineMode()) return BASE_LANGS;

  const allowed = new Set(getOfflinePackCodes());
  return BASE_LANGS.filter((x) => allowed.has(canonical(x.code)));
}

function langObj(code) {
  const c = canonical(code);
  return (
    getRuntimeLangs().find((x) => x.code === c) ||
    BASE_LANGS.find((x) => x.code === c) || {
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
    speechUnsupported: "⚠️ Die Spracherkennung wird auf diesem Gerät nicht unterstützt",
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
let recognitionFinishedByUser = false;
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

function getFaceVoiceMode() {
  return String(localStorage.getItem(F2F_VOICE_KEY) || "auto").trim().toLowerCase();
}

function getFaceTranslateMode() {
  const value = String(localStorage.getItem(F2F_TRANSLATE_KEY) || "normal").trim().toLowerCase();
  return value === "cultural" ? "cultural" : "normal";
}

/* Sadece kültürel çeviri ve kendi sesim ücretli */
function isPaidFaceMode() {
  return getFaceTranslateMode() === "cultural" || getFaceVoiceMode() === "clone";
}

function faceUsageModule() {
  return resolveUsageModule({ surface: "facetoface", ai: isPaidFaceMode() });
}

function faceUsageMode() {
  return resolveUsageMode({ ai: isPaidFaceMode() });
}

function faceUsageNote(charCount) {
  const paid = isPaidFaceMode();
  const cultural = getFaceTranslateMode() === "cultural";
  const clone = getFaceVoiceMode() === "clone";

  if (!paid) {
    return buildUsageNote({
      surface: "facetoface",
      ai: false,
      custom: `FaceToFace standart kullanım (${charCount} karakter)`
    });
  }

  if (cultural && clone) {
    return `FaceToFace kültürel çeviri + kendi sesim kullanımı (${charCount} karakter)`;
  }
  if (cultural) {
    return `FaceToFace kültürel çeviri kullanımı (${charCount} karakter)`;
  }
  return `FaceToFace kendi sesim kullanımı (${charCount} karakter)`;
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

  const angryWords = [
    "saçma", "yeter", "sinir", "sinirim", "delirdim", "bıktım", "biktim",
    "rezalet", "berbat", "nefret", "uyuz", "çıldırdım", "cildirdim"
  ];

  const sadWords = [
    "üzgün", "uzgun", "kötüyüm", "kotuyum", "moralim bozuk",
    "canım sıkkın", "canim sikkin", "yoruldum", "tükendim", "tukendim"
  ];

  const happyWords = [
    "harika", "süper", "super", "müthiş", "muthis", "bayıldım",
    "bayildim", "çok iyi", "cok iyi", "sevindim", "mutlu oldum"
  ];

  const excitedWords = [
    "inanamıyorum", "inanamiyorum", "şahane", "sahane", "wow",
    "efsane", "heyecanlıyım", "heyecanliyim"
  ];

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
  if (state === "idle") frameRoot.classList.add("is-idle");
  if (state === "listening") frameRoot.classList.add("is-listening");
  if (state === "translating") frameRoot.classList.add("is-translating");
  if (state === "ready") frameRoot.classList.add("is-ready");
  if (state === "error") frameRoot.classList.add("is-error");
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

  const readyTop = isOfflineMode() ? "Offline mod hazır" : t(topLang, "ready");
  const readyBot = isOfflineMode() ? "Offline mod hazır" : t(botLang, "ready");

  setHelper(topHelper, readyTop, "helper-ready");
  setHelper(botHelper, readyBot, "helper-ready");
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
  const offline = isOfflineMode();
  modeFlag.classList.toggle("offline", offline);
  modeFlagTxt.textContent = offline ? "OFFLINE" : "ONLINE";
}

function ensureRuntimeLangsValid() {
  const runtime = getRuntimeLangs();
  const codes = runtime.map((x) => canonical(x.code));

  if (!codes.includes(canonical(topLang))) {
    topLang = codes.includes("en") ? "en" : (codes[0] || "en");
  }

  if (!codes.includes(canonical(botLang))) {
    botLang = codes.includes("tr") ? "tr" : (codes[0] || "tr");
  }

  refreshLangLabels();
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

  const runtimeLangs = getRuntimeLangs ? getRuntimeLangs() : LANGS;

  list.innerHTML = runtimeLangs.map((l) => {
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
    el.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const code = el.getAttribute("data-code") || "en";
      if (side === "top") topLang = canonical(code);
      else botLang = canonical(code);

      refreshLangLabels();
      refreshReadyTextsIfIdle?.();
      closeAllPop();
    };
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

function getVoicePreference() {
  return String(getFaceVoiceMode() || "auto").trim().toLowerCase();
}

/* Ücretsiz ses: cihaz sesi
   Ücretli ses: clone varsa API */
async function speakWithNative(text, langCode) {
  const clean = String(text || "").trim();
  if (!clean) return false;

  try {
    if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
      window.NativeTTS.speak(clean, canonical(langCode));
      return true;
    }
  } catch {}

  return false;
}

function chooseWebVoice(langCode) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const bcp = langObj(langCode).bcp.toLowerCase();
  const langBase = canonical(langCode);

  let pool = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith(langBase));
  if (!pool.length) pool = voices.filter((v) => String(v.lang || "").toLowerCase() === bcp);
  if (!pool.length) pool = voices;
  if (!pool.length) return null;

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
  const toneCfg = toneToFallbackSpeechParams(tone);

  try {
    window.speechSynthesis?.cancel?.();
  } catch {}

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

async function speakViaApi(text, langCode, tone = "neutral") {
  const myRunId = speakRunId;
  const userId = await getCurrentUserId();

  const r = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: String(text || "").trim(),
      lang: canonical(langCode),
      user_id: userId,
      module: "facetoface",
      voice: "clone",
      tone: canonTone(tone),
    }),
  });

  if (myRunId !== speakRunId) return false;

  const j = await r.json().catch(() => null);
  if (myRunId !== speakRunId) return false;

  if (!r.ok || !j?.ok || !j?.audio_base64) {
    throw new Error(j?.error || j?.detail || "TTS API unavailable");
  }

  const audio = new Audio(`data:audio/mp3;base64,${j.audio_base64}`);
  audio.preload = "auto";
  audio.playsInline = true;
  currentAudio = audio;

  audio.onended = () => {
    if (currentAudio === audio) currentAudio = null;
  };

  audio.onerror = () => {
    if (currentAudio === audio) currentAudio = null;
  };

  await warmAudio();
  if (myRunId !== speakRunId) return false;

  await audio.play();
  return true;
}

async function speak(text, langCode, tone = "neutral") {
  const value = String(text || "").trim();
  if (!value) return;

  stopAudio();
  const myRunId = ++speakRunId;
  const voiceMode = getVoicePreference();

  /* Ücretsiz ses → cihaz sesi */
  if (voiceMode !== "clone") {
    const nativeOk = await speakWithNative(value, langCode);
    if (myRunId !== speakRunId) return;

    if (nativeOk) return;
    speakFallback(value, langCode, tone);
    return;
  }

  /* Kendi sesim → ücretli */
  try {
    await speakViaApi(value, langCode, tone);
  } catch {
    if (myRunId !== speakRunId) return;
    speakFallback(value, langCode, tone);
  }
}

async function chargeFaceUsage(inputText, outputText, srcLang, dstLang) {
  const inLen = String(inputText || "").trim().length;
  const outLen = String(outputText || "").trim().length;
  const billableChars = Math.max(inLen, outLen);

  if (billableChars <= 0) return null;

  const result = await commitUsage({
    module: faceUsageModule(),
    mode: faceUsageMode(),
    charCount: billableChars,
    note: faceUsageNote(billableChars),
    meta: {
      surface: "facetoface",
      from_lang: canonical(srcLang),
      to_lang: canonical(dstLang),
      runtime_mode: getRuntimeMode(),
      translate_mode: getFaceTranslateMode(),
      voice_mode: getFaceVoiceMode(),
      input_chars: inLen,
      output_chars: outLen
    }
  });

  if (typeof result?.tokens_after === "number") {
    try { setHeaderTokens(result.tokens_after); } catch {}
  }

  return result;
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

async function translateTextOnline(text, from, to, tone = "neutral") {
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

async function translateTextOffline(text, from, to) {
  const clean = String(text || "").trim();
  if (!clean) return null;

  try {
    if (window.AndroidOfflineTranslate?.translate) {
      const result = await window.AndroidOfflineTranslate.translate(
        JSON.stringify({
          text: clean,
          from: canonical(from),
          to: canonical(to)
        })
      );
      if (result) return String(result).trim();
    }
  } catch (e) {
    console.warn("offline translate error", e);
  }

  return clean;
}

async function translateText(text, from, to, tone = "neutral") {
  if (isOfflineMode()) {
    return await translateTextOffline(text, from, to);
  }
  return await translateTextOnline(text, from, to, tone);
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
    if (!isOfflineMode()) {
      await chargeFaceUsage(cleaned, tr, src, dst);
    }
  } catch (e) {
    if (e?.code === "INSUFFICIENT_TOKENS") {
      alert("Jetonunuz yetersiz. Jeton Market'e yönlendiriliyorsunuz.");
      location.href = "/pages/jetonbuy.html";
      return;
    }
    console.error("[facetoface usage]", e);
  }

  if (latestTxt) {
    latestTxt.textContent = "";
    const speakPromise = (async () => {
      await wait(90);
      await speak(tr, dst, sourceTone);
    })();

    await typewriteText(latestTxt, tr, other);
    keepLatestVisible(other);
    await speakPromise;
  } else {
    addBubble(other, "me", tr, {
      latest: true,
      speakLang: dst,
      speakTone: sourceTone,
    });

    await wait(90);
    await speak(tr, dst, sourceTone);
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
  if (isOfflineMode()) {
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
    } catch {}
    return;
  }

  await Promise.allSettled([
    fetch(`${API_BASE}/healthz`).catch(() => {}),
    fetch(`${API_BASE}/api/translate_ai/health`).catch(() => {}),
    (async () => {
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
      } catch {}
    })(),
  ]);
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
    refreshModeFlag();
    ensureRuntimeLangsValid();
    pointOrbTo("bot");

    await Promise.allSettled([warmApis(), warmAudio()]);

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

function bind() {
  refreshLangLabels();
  refreshModeFlag();
  ensureRuntimeLangsValid();
  unlockOnFirstTouch();
  startBoot();

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
    location.href = "/pages/facetoface_open.html?edit=1";
  });

  modeFlag?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isForcedOffline()) {
      showToast("Bağlantı yokken sistem otomatik offline modda çalışır");
      return;
    }

    const next = isOfflineMode() ? "online" : "offline";
    setRuntimeMode(next);
    ensureRuntimeLangsValid();
    refreshModeFlag();
    closeAllPop();

    stopAudio();
    stopRecognizer();
    recordingSide = null;
    liveTranscript = "";
    latestPreviewTranscript = "";

    if (topBody) topBody.innerHTML = "";
    if (botBody) botBody.innerHTML = "";

    setSystemReadyUI();
    showToast(next === "offline" ? "Offline mod açıldı" : "Online mod açıldı");
  });

  window.addEventListener("online", () => {
    refreshModeFlag();
    ensureRuntimeLangsValid();
    refreshReadyTextsIfIdle();
  });

  window.addEventListener("offline", () => {
    if (isForcedOffline()) return;
    refreshModeFlag();
    ensureRuntimeLangsValid();
    refreshReadyTextsIfIdle();
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
    location.href = "/pages/facetoface_open.html?edit=1";
  });

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        voicesReady = true;
      };
      window.speechSynthesis.getVoices();
    }
  } catch {}
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
