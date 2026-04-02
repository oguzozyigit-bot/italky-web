import { getLangPoolForSite } from "/js/lang_pool_full.js";
import { supabase } from "/js/supabase_client.js";
import { setHeaderTokens } from "/js/ui_shell.js";
import {
  commitUsage,
  resolveUsageModule,
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

function normalizePackageCode(raw) {
  const code = String(raw || "").trim().toLowerCase();
  if (!code) return "";
  if (code.startsWith("premium")) return "premium";
  if (code.startsWith("translate")) return "translate";
  if (code.startsWith("education")) return "education";
  if (code.startsWith("edu")) return "education";
  return code;
}

const LANGS = (Array.isArray(getLangPoolForSite("tr")) ? getLangPoolForSite("tr") : [])
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

const uiModal = $("uiModal");
const uiModalTitle = $("uiModalTitle");
const uiModalText = $("uiModalText");
const uiModalGo = $("uiModalGo");
const uiModalClose = $("uiModalClose");

let accessState = {
  trialActive: false,
  packageCode: "",
  lockedAll: false
};

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

function showUiModal(message, title = "Üyelik Gerekli") {
  if (!uiModal) return;
  uiModalTitle.textContent = title;
  uiModalText.textContent = message;
  uiModal.classList.add("open");
}

function closeUiModal() {
  uiModal?.classList.remove("open");
}

uiModalGo?.addEventListener("click", () => {
  location.href = "/pages/upgrade_pack.html";
});
uiModalClose?.addEventListener("click", closeUiModal);
uiModal?.addEventListener("click", (e) => {
  if (e.target === uiModal) closeUiModal();
});

async function readAccessState() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      accessState = { trialActive: false, packageCode: "", lockedAll: false };
      return;
    }

    const { data: row } = await supabase
      .from("user_access_state")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (row) {
      const rawCode = String(row.selected_package_code || "").trim().toLowerCase();
      const packageCode = normalizePackageCode(rawCode);
      const packageActive = !!packageCode && row.package_active === true &&
        (!row.package_ends_at || new Date(row.package_ends_at).getTime() > Date.now());

      const trialActive = !packageActive && (
        Number(row.trial_days_left || 0) > 0 ||
        (!!row.trial_ends_at && new Date(row.trial_ends_at).getTime() > Date.now())
      );

      accessState = {
        trialActive,
        packageCode: packageActive ? packageCode : "",
        lockedAll: !packageActive && !trialActive
      };
      return;
    }

    accessState = { trialActive: false, packageCode: "", lockedAll: false };
  } catch {
    accessState = { trialActive: false, packageCode: "", lockedAll: false };
  }
}

function canOpenFaceSettings() {
  if (accessState.lockedAll) return false;
  if (accessState.trialActive) return false;
  return true;
}

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

function faceTextUsageModule() {
  return resolveUsageModule({
    surface: "facetoface",
    kind: "text",
    mode: getFaceTranslateMode() === "cultural" ? "cultural" : "normal"
  });
}

function faceVoiceUsageModule() {
  const v = getFaceVoiceMode();

  let mode = "normal";
  if (v === "clone") mode = "clone";
  else if (v === "preset") mode = "preset";
  else if (v === "female" || v === "male") mode = "ai";

  return resolveUsageModule({
    surface: "facetoface",
    kind: "voice",
    mode
  });
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
  if (!audioSrc) return false;
  if (runId !== speakRunId) return false;

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

from __future__ import annotations

import os
import re
from typing import Optional

import requests
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["translate_ai"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip()
GOOGLE_TRANSLATE_API_KEY = os.getenv("GOOGLE_TRANSLATE_API_KEY", "").strip()
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash").strip()


class TranslateBody(BaseModel):
    text: str
    from_lang: str
    to_lang: str
    mode: Optional[str] = "normal"      # normal | cultural
    tone: Optional[str] = "neutral"     # neutral | happy | angry | sad | excited
    style: Optional[str] = "balanced"   # balanced | warm | clear | social


def canonical(code: str) -> str:
    return str(code or "").strip().lower().split("-")[0]


def normalize_text(text: str) -> str:
    return str(text or "").strip()


def canonical_tone(tone: str) -> str:
    v = str(tone or "neutral").strip().lower()
    if v in {"neutral", "happy", "angry", "sad", "excited"}:
        return v
    return "neutral"


def canonical_style(style: str) -> str:
    v = str(style or "balanced").strip().lower()
    if v in {"balanced", "warm", "clear", "social"}:
        return v
    return "balanced"


def detect_register_hint(text: str) -> str:
    s = normalize_text(text).lower()

    formal_markers = [
        "sayın", "saygılarımla", "arz ederim", "rica ederim", "teşekkür ederim",
        "lütfen", "bilginize", "tarafınıza", "konu hakkında", "gerekmektedir",
        "uygundur", "hususunda", "talep ediyorum", "değerlendirmenizi"
    ]

    casual_markers = [
        "ya", "abi", "abla", "kanka", "bence", "hadi", "vallahi", "valla",
        "tamam", "olur", "aynen", "şöyle", "şoyle", "yani", "off", "wow"
    ]

    formal_score = sum(1 for x in formal_markers if x in s)
    casual_score = sum(1 for x in casual_markers if x in s)

    if formal_score >= casual_score + 2:
        return "formal"
    if casual_score >= formal_score + 1:
        return "casual"
    return "neutral"


def should_use_ai_for_cultural(text: str, tone: str, style: str) -> bool:
    s = normalize_text(text)
    low = s.lower()

    if not s:
        return False

    # kısa ve düz cümlelerde AI'a gitme
    words = re.findall(r"\S+", s)
    word_count = len(words)
    char_count = len(s)

    if char_count <= 60 and word_count <= 8:
        simple_hits = [
            "selam", "merhaba", "günaydın", "iyi geceler", "iyi akşamlar",
            "nasılsın", "nasilsin", "iyiyim", "teşekkürler", "tesekkurler",
            "tamam", "olur", "evet", "hayır", "hayir", "görüşürüz", "gorusuruz",
            "hoşça kal", "hosca kal", "kaç para", "yardım eder misin", "adres nerede"
        ]
        if any(x in low for x in simple_hits):
            return False

    # kültürel fark gerektiren tetikleyiciler
    emotional_hits = [
        "kırıldım", "kirildim", "alındım", "alindim", "gönül", "gonul",
        "kalbim", "içim", "icim", "ayıp oldu", "ayip oldu", "bozuldu",
        "üzgünüm", "uzgunum", "mutluyum", "çok sevindim", "cok sevindim"
    ]

    idiom_hits = [
        "lafın gelişi", "lafin gelisi", "üstü kapalı", "ustu kapali",
        "ince ince", "iğneleme", "igneleme", "ima", "imalı", "imali",
        "taş atmak", "tas atmak", "gönlünü almak", "gonlunu almak"
    ]

    formal_hits = [
        "sayın", "saygılarımla", "arz ederim", "rica ederim",
        "tarafınıza", "hususunda", "değerlendirmenizi"
    ]

    if tone != "neutral":
        return True

    if style in {"warm", "social"} and char_count >= 50:
        return True

    if any(x in low for x in emotional_hits):
        return True

    if any(x in low for x in idiom_hits):
        return True

    if any(x in low for x in formal_hits):
        return True

    if char_count >= 180:
        return True

    if word_count >= 20:
        return True

    if "!" in s or "?" in s:
        if char_count >= 70:
            return True

    return False


def google_translate_free(text: str, source: str, target: str) -> str:
    url = "https://translate.googleapis.com/translate_a/single"
    params = {
        "client": "gtx",
        "sl": source,
        "tl": target,
        "dt": "t",
        "q": text,
    }

    r = requests.get(url, params=params, timeout=12)
    r.raise_for_status()
    data = r.json()

    translated = ""
    if isinstance(data, list) and data and isinstance(data[0], list):
        for item in data[0]:
            if isinstance(item, list) and item:
                translated += str(item[0] or "")
    return translated.strip()


def google_translate_official(text: str, source: str, target: str) -> str:
    if not GOOGLE_TRANSLATE_API_KEY:
        raise RuntimeError("GOOGLE_TRANSLATE_API_KEY missing")

    url = "https://translation.googleapis.com/language/translate/v2"
    payload = {
        "q": text,
        "source": source,
        "target": target,
        "format": "text",
        "key": GOOGLE_TRANSLATE_API_KEY,
    }

    r = requests.post(url, data=payload, timeout=12)
    r.raise_for_status()
    data = r.json()
    translated = (
        data.get("data", {})
        .get("translations", [{}])[0]
        .get("translatedText", "")
    )
    return str(translated).strip()


def openai_cultural_translate(
    text: str,
    source: str,
    target: str,
    tone: str = "neutral",
    style: str = "balanced"
) -> str:
    if not OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY missing")

    tone = canonical_tone(tone)
    style = canonical_style(style)
    register_hint = detect_register_hint(text)

    tone_map = {
        "neutral": "Keep the tone natural, clear, smooth and human.",
        "happy": "Keep the tone warm, friendly, positive and lively.",
        "angry": "Keep the emotional intensity, but make it sound natural, socially appropriate and human.",
        "sad": "Keep the tone soft, sincere, empathetic and emotionally gentle.",
        "excited": "Keep the tone energetic, vivid, enthusiastic and natural."
    }

    style_map = {
        "balanced": "Use balanced, natural, everyday phrasing.",
        "warm": "Prefer warmer, softer, more human phrasing when possible.",
        "clear": "Prefer simpler, clearer, easier-to-understand phrasing.",
        "social": "Prefer slightly more conversational spoken-language phrasing."
    }

    register_map = {
        "formal": "If the source sounds formal, keep it respectful but do not make it stiff or robotic.",
        "casual": "If the source sounds casual, keep it relaxed, natural and conversational.",
        "neutral": "Prefer natural daily phrasing over overly formal or rigid wording."
    }

    tone_rule = tone_map.get(tone, tone_map["neutral"])
    style_rule = style_map.get(style, style_map["balanced"])
    register_rule = register_map.get(register_hint, register_map["neutral"])

    prompt = f"""
You are a highly natural conversational translator.

Translate the following text from "{source}" to "{target}".

Core rules:
- Preserve the exact meaning.
- Do not sound robotic, stiff, or overly literal.
- Make the result feel like something a real person would naturally say.
- Keep the speaker's emotional tone.
- Keep the social intent and politeness level.
- Prefer fluent, human, culturally appropriate phrasing.
- If a sentence sounds too formal in the target language, soften it slightly into natural spoken language without losing meaning.
- If the source is already casual, keep it casual and natural.
- Do not add extra explanation.
- Do not add quotation marks.
- Do not mention translation systems, AI tools, model names, brands, or technology.
- Return only the translated text.

Tone guidance:
{tone_rule}

Style guidance:
{style_rule}

Register guidance:
{register_rule}

Text:
{text}
""".strip()

    payload = {
        "model": OPENAI_MODEL,
        "input": prompt,
    }

    headers = {
        "Authorization": f"Bearer {OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    r = requests.post(
        "https://api.openai.com/v1/responses",
        headers=headers,
        json=payload,
        timeout=18,
    )
    r.raise_for_status()
    data = r.json()

    chunks = []
    for item in data.get("output", []) or []:
        for content in item.get("content", []) or []:
            if content.get("type") in {"output_text", "text"}:
                txt = str(content.get("text") or "").strip()
                if txt:
                    chunks.append(txt)

    out = "".join(chunks).strip()
    if not out:
        out = str(data.get("output_text") or data.get("text") or "").strip()

    if not out:
        raise RuntimeError("OpenAI empty text")

    return out


def gemini_cultural_translate(
    text: str,
    source: str,
    target: str,
    tone: str = "neutral",
    style: str = "balanced"
) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY missing")

    tone = canonical_tone(tone)
    style = canonical_style(style)
    register_hint = detect_register_hint(text)

    tone_map = {
        "neutral": "Keep the tone natural, clear, smooth and human.",
        "happy": "Keep the tone warm, friendly, positive and lively.",
        "angry": "Keep the emotional intensity, but make it sound natural, socially appropriate and human.",
        "sad": "Keep the tone soft, sincere, empathetic and emotionally gentle.",
        "excited": "Keep the tone energetic, vivid, enthusiastic and natural."
    }

    style_map = {
        "balanced": "Use balanced, natural, everyday phrasing.",
        "warm": "Prefer warmer, softer, more human phrasing when possible.",
        "clear": "Prefer simpler, clearer, easier-to-understand phrasing.",
        "social": "Prefer slightly more conversational spoken-language phrasing."
    }

    register_map = {
        "formal": "If the source sounds formal, keep it respectful but do not make it stiff or robotic.",
        "casual": "If the source sounds casual, keep it relaxed, natural and conversational.",
        "neutral": "Prefer natural daily phrasing over overly formal or rigid wording."
    }

    tone_rule = tone_map.get(tone, tone_map["neutral"])
    style_rule = style_map.get(style, style_map["balanced"])
    register_rule = register_map.get(register_hint, register_map["neutral"])

    prompt = f"""
You are a highly natural conversational translator.

Translate the following text from "{source}" to "{target}".

Core rules:
- Preserve the exact meaning.
- Do not sound robotic, stiff, or overly literal.
- Make the result feel like something a real person would naturally say.
- Keep the speaker's emotional tone.
- Keep the social intent and politeness level.
- Prefer fluent, human, culturally appropriate phrasing.
- If a sentence sounds too formal in the target language, soften it slightly into natural spoken language without losing meaning.
- If the source is already casual, keep it casual and natural.
- Do not add extra explanation.
- Do not add quotation marks.
- Do not mention translation systems, AI tools, model names, brands, or technology.
- Return only the translated text.

Tone guidance:
{tone_rule}

Style guidance:
{style_rule}

Register guidance:
{register_rule}

Text:
{text}
""".strip()

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.42,
            "topP": 0.9,
            "maxOutputTokens": 512
        }
    }

    r = requests.post(url, json=payload, timeout=16)
    r.raise_for_status()
    data = r.json()

    candidates = data.get("candidates") or []
    if not candidates:
        raise RuntimeError("Gemini empty candidates")

    parts = candidates[0].get("content", {}).get("parts", [])
    out = "".join(str(p.get("text", "")) for p in parts).strip()

    if not out:
        raise RuntimeError("Gemini empty text")

    return out


def fast_translate_fallback(text: str, source: str, target: str) -> str:
    try:
        print("[translate_ai] trying google free")
        translated = google_translate_free(text, source, target)
        if translated:
            return translated
    except Exception as e1:
        print("[translate_ai] google_free failed:", e1)

    print("[translate_ai] trying google official fallback")
    translated = google_translate_official(text, source, target)
    return translated


@router.get("/translate_ai/health")
def translate_ai_health():
    return {"ok": True, "service": "translate_ai"}


@router.post("/translate_ai")
def translate_ai(body: TranslateBody):
    text = normalize_text(body.text)
    source = canonical(body.from_lang)
    target = canonical(body.to_lang)
    mode = str(body.mode or "normal").strip().lower()
    tone = canonical_tone(body.tone or "neutral")
    style = canonical_style(body.style or "balanced")

    print("[translate_ai] request:", {
        "text": text,
        "source": source,
        "target": target,
        "mode": mode,
        "tone": tone,
        "style": style,
    })

    if not text:
        return {"ok": False, "error": "empty_text"}

    if not source or not target:
        return {"ok": False, "error": "missing_lang"}

    if source == target:
        return {"ok": True, "translated": text}

    if mode == "normal":
        try:
            translated = fast_translate_fallback(text, source, target)
            if translated:
                return {"ok": True, "translated": translated}
        except Exception as e:
            print("[translate_ai] normal failed:", e)

        return {"ok": False, "error": "normal_translate_failed"}

    if mode == "cultural":
        # hız için: basit cümlelerde AI'a hiç gitme
        if not should_use_ai_for_cultural(text, tone, style):
          try:
              print("[translate_ai] cultural fast path -> google")
              translated = fast_translate_fallback(text, source, target)
              if translated:
                  return {"ok": True, "translated": translated}
          except Exception as e0:
              print("[translate_ai] cultural fast path failed:", e0)

        try:
            print("[translate_ai] trying gemini cultural")
            translated = gemini_cultural_translate(text, source, target, tone, style)
            if translated:
                return {"ok": True, "translated": translated}
        except Exception as e1:
            print("[translate_ai] gemini failed:", e1)

        try:
            print("[translate_ai] trying openai cultural fallback")
            translated = openai_cultural_translate(text, source, target, tone, style)
            if translated:
                return {"ok": True, "translated": translated}
        except Exception as e2:
            print("[translate_ai] openai failed:", e2)

        try:
            print("[translate_ai] trying google official fallback")
            translated = google_translate_official(text, source, target)
            if translated:
                return {"ok": True, "translated": translated}
        except Exception as e3:
            print("[translate_ai] google_official fallback failed:", e3)

        try:
            print("[translate_ai] trying google free fallback")
            translated = google_translate_free(text, source, target)
            if translated:
                return {"ok": True, "translated": translated}
        except Exception as e4:
            print("[translate_ai] google_free fallback failed:", e4)

        return {"ok": False, "error": "cultural_translate_failed"}

    return {"ok": False, "error": "invalid_mode"}

async function chargeFaceUsage(inputText, outputText, srcLang, dstLang) {
  const inLen = String(inputText || "").trim().length;
  const outLen = String(outputText || "").trim().length;
  const billableChars = Math.max(inLen, outLen);

  if (billableChars <= 0) return null;

  let latestResult = null;

  // 1) Kültürel çeviri varsa text usage düş
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

      if (!r.ok) {
        continue;
      }

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
      showUiModal("Jetonunuz yetersiz. Jeton Market'e yönlendiriliyorsunuz.", "Yetersiz Jeton");
      return;
    }
    console.error("[facetoface usage]", e);
  }

  if (latestTxt) {
    latestTxt.textContent = "";

    // sesi hemen paralel başlat
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

  if (accessState.lockedAll) {
    showUiModal("Deneme süreniz doldu. Sistemi kullanabilmek için üyelik paketi satın almanız gereklidir.");
    return;
  }

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
    pointOrbTo("bot");

    await Promise.allSettled([warmApis(), warmAudio(), readAccessState()]);

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
    if (accessState.lockedAll) {
      showUiModal("Deneme süreniz doldu. Sistemi kullanabilmek için üyelik paketi satın almanız gereklidir.");
      return;
    }

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

    if (!canOpenFaceSettings()) {
      showUiModal("Bu menüyü kullanabilmek için üyelik paketi satın almanız gereklidir.");
      return;
    }

    location.href = "/pages/translation_settings.html?from=facetoface";
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
    if (!canOpenFaceSettings()) {
      showUiModal("Bu menüyü kullanabilmek için üyelik paketi satın almanız gereklidir.");
      return;
    }
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
}

if (
  !frameRoot || !topBody || !botBody || !topMic || !botMic ||
  !topHelper || !botHelper || !topLangBtn || !botLangBtn ||
  !topLangTxt || !botLangTxt || !popTop || !popBot ||
  !listTop || !listBot || !closeTop || !closeBot ||
  !clearBtn || !homeLink || !homeBtn
) {
  console.error("[facetoface] Gerekli DOM elemanları eksik.");
} else {
  bind();
}
