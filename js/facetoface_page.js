// FILE: /js/facetoface_page.js

import { getLangPoolForSite } from "/js/lang_pool_full.js";
import { supabase } from "/js/supabase_client.js";
import { setHeaderTokens } from "/js/ui_shell.js";
import { ensureFaceToFacePremiumAccess } from "/js/facetoface_premium_gate.js";
import {
  commitUsage,
  buildUsageNote
} from "/js/usage_meter.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const F2F_VOICE_KEY = "facetoface_voice_mode";
const F2F_TRANSLATE_KEY = "facetoface_translate_mode";
const F2F_MODE_KEY = "facetoface_runtime_mode";
const OFFLINE_PACK_KEY = "italky_offline_installed_packs_v5";

const SITE_LANG = "tr";

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

const UI_TEXT = {
  tr: {
    ready: "Konuşmak için mikrofona dokununuz.",
    repeat: "Konuşmanız bitince mikrofona tekrar basınız.",
    wait: "Lütfen bekleyiniz...",
    translating: "Çevriliyor...",
    preparing: "Sistem hazırlanıyor...",
    translateError: "⚠️ Çeviri servisine ulaşılamadı",
    micBlocked: "⚠️ Mikrofon izni gerekli",
    speechUnsupported: "⚠️ Bu cihazda konuşma algılama desteklenmiyor",
    offlineForced: "Offline mod aktif • indirilen dillerle çalışıyor"
  },
  en: {
    ready: "Tap the microphone to speak.",
    repeat: "Press the microphone again when you finish speaking.",
    wait: "Please wait...",
    translating: "Translating...",
    preparing: "System is preparing...",
    translateError: "⚠️ Translation service unavailable",
    micBlocked: "⚠️ Microphone permission required",
    speechUnsupported: "⚠️ Speech recognition is not supported on this device",
    offlineForced: "Offline mode active"
  }
};

function t(langCode, key) {
  const c = canonical(langCode);
  const pack = UI_TEXT[c] || UI_TEXT.en;
  return pack[key] || UI_TEXT.en[key] || "";
}

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

function getForcedOfflineMode() {
  return getQueryMode() === "offline-forced";
}

function getStoredModePreference() {
  return String(localStorage.getItem(F2F_MODE_KEY) || "auto").trim().toLowerCase();
}

function setStoredModePreference(mode) {
  localStorage.setItem(F2F_MODE_KEY, String(mode || "auto").trim().toLowerCase());
}

function isOfflinePackActive(pack) {
  if (!pack?.expires_at) return false;
  return new Date(pack.expires_at).getTime() > Date.now();
}

function getInstalledOfflineCodes() {
  try {
    const raw = JSON.parse(localStorage.getItem(OFFLINE_PACK_KEY) || "[]");
    const rows = Array.isArray(raw) ? raw : [];
    const codes = new Set();

    for (const row of rows) {
      if (isOfflinePackActive(row) && row?.lang) {
        codes.add(canonical(row.lang));
      }
    }

    codes.add("tr");
    codes.add("en");
    return [...codes];
  } catch {
    return ["tr", "en"];
  }
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
    tr: { flag: "🇹🇷", name: "Türkçe" },
    en: { flag: "🇬🇧", name: "English" },
    de: { flag: "🇩🇪", name: "Deutsch" },
    fr: { flag: "🇫🇷", name: "Français" },
    it: { flag: "🇮🇹", name: "Italiano" },
    es: { flag: "🇪🇸", name: "Español" },
    ru: { flag: "🇷🇺", name: "Русский" },
    el: { flag: "🇬🇷", name: "Ελληνικά" },
    az: { flag: "🇦🇿", name: "Azərbaycanca" },
    ka: { flag: "🇬🇪", name: "ქართული" },
    ar: { flag: "🇸🇦", name: "العربية" },
    fa: { flag: "🇮🇷", name: "فارسی" },
    hy: { flag: "🇦🇲", name: "Հայերեն" },
    kmr: { flag: "🟨", name: "Kürtçe (Kurmançça)" },
    ckb: { flag: "🟧", name: "Kürtçe (Sorani)" },
    zza: { flag: "🟫", name: "Zazaca" },
    lzz: { flag: "🌊", name: "Lazca" },
    ady: { flag: "🟩", name: "Çerkezce" },
    ab: { flag: "⬛", name: "Abhazca" }
  };

  return map[canonical(code)] || {
    flag: "🌐",
    name: canonical(code).toUpperCase()
  };
}

const RAW_LANG_POOL = Array.isArray(getLangPoolForSite(SITE_LANG))
  ? getLangPoolForSite(SITE_LANG)
  : [];

const BASE_LANGS = RAW_LANG_POOL
  .map((l) => {
    const code = canonical(l.code);
    if (!code) return null;

    const fallback = getOfflineLangMeta(code);

    return {
      code,
      flag: l.flag || fallback.flag || "🌐",
      name: l.name || l.label || fallback.name || code.toUpperCase(),
      bcp: BCP[code] || "en-US"
    };
  })
  .filter(Boolean);

function getRuntimeLangPool() {
  if (!isOfflineRuntime()) return BASE_LANGS;

  const allowed = new Set(getInstalledOfflineCodes());
  const pool = BASE_LANGS.filter((x) => allowed.has(canonical(x.code)));

  for (const code of allowed) {
    if (!pool.find((x) => canonical(x.code) === code)) {
      const meta = getOfflineLangMeta(code);
      pool.push({
        code,
        flag: meta.flag,
        name: meta.name,
        bcp: BCP[code] || "tr-TR"
      });
    }
  }

  return pool;
}

function langObj(code) {
  const c = canonical(code);
  const pool = getRuntimeLangPool();

  return (
    pool.find((x) => x.code === c) ||
    BASE_LANGS.find((x) => x.code === c) || {
      code: c || "en",
      flag: getOfflineLangMeta(c).flag,
      name: getOfflineLangMeta(c).name,
      bcp: BCP[c] || "en-US"
    }
  );
}

function labelChip(code) {
  const o = langObj(code);
  return `${o.flag} ${o.name}`;
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
let voicesReady = false;
let speakRunId = 0;

let bootReady = false;
let bootStarted = false;
let bootPromise = null;

let liveTranscript = "";
let latestPreviewTranscript = "";
let recognitionSessionId = 0;
let typewriterRunId = 0;

function showToast(message = "") {
  let toast = miniToast || document.getElementById("miniToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "miniToast";
    toast.className = "mini-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = String(message || "");
  toast.classList.add("show");
  clearTimeout(window.__faceToastTimer);
  window.__faceToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1800);
}

function showUiModal(message) {
  showToast(message);
}

function closeUiModal() {
  if (!uiModal) return;
  uiModal.classList.remove("open");
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
      tone: canonTone(tone)
    })
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

  try { window.speechSynthesis?.cancel?.(); } catch {}

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

  if (isOfflineRuntime()) {
    stopAudio();
    const myRunId = ++speakRunId;
    if (myRunId !== speakRunId) return;
    speakFallback(value, langCode, tone);
    return;
  }

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
    } catch {
      ttsMemoryCache.delete(cacheKey);
    }
  }

  if (myRunId !== speakRunId) return;

  try {
    if (voice === "clone") {
      const ready = await hasReadyVoiceProfile();
      if (myRunId !== speakRunId) return;

      if (!ready) {
        speakFallback(value, langCode, tone);
      } else {
        const ok = await speakViaApi(value, langCode, tone);
        if (!ok) speakFallback(value, langCode, tone);
      }
    } else {
      const ok = await speakViaApi(value, langCode, tone);
      if (!ok) speakFallback(value, langCode, tone);
    }
  } catch {
    speakFallback(value, langCode, tone);
  }

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
      } catch {}
    });
  }
}

async function chargeFaceUsage(inputText, outputText, srcLang, dstLang) {
  if (isOfflineRuntime()) {
    return { ok: true, skipped: true, reason: "offline_mode" };
  }

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
    try { wrap.scrollTop = wrap.scrollHeight; } catch {}
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

async function translateTextOffline(text) {
  const value = String(text || "").trim();
  if (!value) return null;

  try {
    if (window.AndroidOfflineTranslate?.translate) {
      const result = await window.AndroidOfflineTranslate.translate(
        JSON.stringify({
          text: value,
          from: canonical(topLang),
          to: canonical(botLang)
        })
      );
      if (result) return String(result).trim();
    }
  } catch {}

  return value;
}

async function translateText(text, from, to, tone = "neutral") {
  const src = canonical(from);
  const dst = canonical(to);

  if (isOfflineRuntime()) {
    return await translateTextOffline(text, src, dst);
  }

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
        })
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
    } catch {}
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
    speakTone: sourceTone
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
  }

  if (latestTxt) {
    latestTxt.textContent = "";
    const speakPromise = speak(tr, dst, sourceTone);
    await typewriteText(latestTxt, tr, other);
    keepLatestVisible(other);
    try { await speakPromise; } catch {}
  } else {
    addBubble(other, "me", tr, {
      latest: true,
      speakLang: dst,
      speakTone: sourceTone
    });

    try { await speak(tr, dst, sourceTone); } catch {}
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
    liveTranscript = "";
    latestPreviewTranscript = "";

    const previewNode = (sideAtEnd === "top" ? topBody : botBody)?.querySelector(".bubble.them.preview");
    previewNode?.remove();

    if (finalText) {
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
    setErrorUI();
    bounceToReady(1200);
  }
}

async function toggleRecording(side) {
  await ensureReady();

  const premiumOk = await ensureCurrentFacePremiumModeAccess();
  if (!premiumOk) return;

  if (recordingSide === side) {
    setTranslatingUI(side);
    setTimeout(() => stopRecognizer(), 120);
    return;
  }

  if (recordingSide && recordingSide !== side) {
    setTranslatingUI(recordingSide);
    setTimeout(() => stopRecognizer(), 80);
    return;
  }

  startRecording(side);
}

async function warmApis() {
  if (isOfflineRuntime()) {
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
    })()
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
    ensureRuntimeLanguagesStillValid();
    updateModeFlagUI();
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

function bindModeFlagHandler() {
  modeFlag?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (getForcedOfflineMode()) {
      showToast("Bağlantı yokken sistem otomatik offline modda çalışır");
      return;
    }

    const current = isOfflineRuntime() ? "offline" : "online";
    const next = current === "offline" ? "online" : "offline";

    setStoredModePreference(next);
    ensureRuntimeLanguagesStillValid();
    updateModeFlagUI();
    closeAllPop();

    stopAudio();
    stopRecognizer();
    recordingSide = null;
    liveTranscript = "";
    latestPreviewTranscript = "";

    if (topBody) topBody.innerHTML = "";
    if (botBody) botBody.innerHTML = "";

    setSystemReadyUI();

    showToast(
      next === "offline"
        ? "Offline mod açıldı"
        : "Online mod açıldı"
    );
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

  homeLink?.addEventListener("click", (e) => {
    if (getForcedOfflineMode()) {
      e.preventDefault();
      showToast("Offline modda sadece FaceToFace kullanılabilir");
      return;
    }
    location.href = safeHomeHref();
  });

  homeBtn?.addEventListener("click", () => {
    if (getForcedOfflineMode()) {
      showToast("Offline modda sadece FaceToFace kullanılabilir");
      return;
    }
    location.href = safeHomeHref();
  });

  settingsBtn?.addEventListener("click", (e) => {
    if (!canOpenFaceSettings()) {
      e.preventDefault();
      showToast("Offline zorunlu modda ayarlar kapalıdır");
      return;
    }
    e.preventDefault();
    location.href = "/pages/translation_settings.html?from=facetoface";
  });

  bindModeFlagHandler();

  window.addEventListener("online", () => {
    updateModeFlagUI();
    ensureRuntimeLanguagesStillValid();
    refreshReadyTextsIfIdle();
  });

  window.addEventListener("offline", () => {
    updateModeFlagUI();
    ensureRuntimeLanguagesStillValid();
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
    if (!getForcedOfflineMode()) location.href = safeHomeHref();
  });

  bindKeyboardButton(settingsBtn, async () => {
    if (canOpenFaceSettings()) {
      location.href = "/pages/translation_settings.html?from=facetoface";
    }
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

const required = {
  frameRoot,
  topBody,
  botBody,
  topMic,
  botMic,
  topHelper,
  botHelper,
  topLangBtn,
  botLangBtn,
  topLangTxt,
  botLangTxt,
  popTop,
  popBot,
  listTop,
  listBot,
  closeTop,
  closeBot,
  clearBtn,
  homeLink,
  homeBtn,
  settingsBtn,
  modeFlag,
  modeFlagTxt
};

const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missing.length) {
  console.error("[facetoface] Eksik DOM elemanları:", missing);
} else {
  bind();
}
