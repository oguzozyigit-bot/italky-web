import { getLangPoolForSite } from "/js/lang_pool_full.js";
import { supabase } from "/js/supabase_client.js";
import { setHeaderTokens } from "/js/ui_shell.js";
import { ensureFaceToFacePremiumAccess } from "/js/facetoface_premium_gate.js";
import {
  canEnableDualEarPro,
  showDualEarProBlockedReason
} from "/js/dual_ear_pro.js";

const ttsMemoryCache = new Map();
const TTS_CACHE_LIMIT = 24;
const CLEAR_TRASH_FULL_CHAR_LIMIT = 1000;
const API_BASE = "https://italky-api.onrender.com";
const F2F_LIVE_CULTURAL_MODE_DISABLED = true;
const $ = (id) => document.getElementById(id);

const SITE_LANG_KEY = "site_lang";
const LEGACY_SITE_LANG_KEY = "italky_site_lang_v1";
const F2F_TOP_LANG_KEY = "f2f_top_lang";
const F2F_BOT_LANG_KEY = "f2f_bot_lang";

const BCP = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
  ar: "ar-SA",
  ru: "ru-RU",
  bg: "bg-BG",
  pt: "pt-PT",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR"
};

const PLACEHOLDERS = {
  tr: "Mesaj yaz",
  en: "Write your message here",
  de: "Schreibe hier deine Nachricht",
  fr: "Écris ici ton message",
  it: "Scrivi qui il tuo messaggio",
  es: "Escribe aquí tu mensaje",
  ar: "اكتب رسالتك هنا",
  ru: "Напишите сообщение",
  bg: "Напишете съобщението си",
  pt: "Escreva sua mensagem",
  zh: "在这里输入消息",
  ja: "ここにメッセージを入力",
  ko: "여기에 메시지를 입력"
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

const F2F_VOICE_KEY = "italkyai_voice_mode";
const DENEME_CULTURAL_MODE_KEY = "deneme_facetoface_cultural_mode";
const DENEME_CULTURAL_INFO_SEEN_KEY = "deneme_cultural_info_seen";
const DENEME_HANDS_FREE_MODE_KEY = "facetoface_handsfree_mode";
const DENEME_HANDS_FREE_SIDE = "auto";
const DENEME_HANDS_FREE_SILENCE_MS = 1450;
const DENEME_HANDS_FREE_MAX_LISTEN_MS = 14000;
const DENEME_HANDS_FREE_RESTART_MS = 650;
const DENEME_HANDS_FREE_BUSY_RETRY_MS = 850;
const DENEME_HANDS_FREE_AUDIO_GUARD_MS = 1800;
const DENEME_HANDS_FREE_EMPTY_RESTART_LIMIT = 8;
const F2F_HANDS_FREE_TIP_LOCAL_KEY = "f2f_handsfree_tip_dismissed_v1";
const F2F_HANDS_FREE_TIP_PROFILE_FIELD = "handsfree_tip_dismissed";
const F2F_HANDS_FREE_QUEUE_LIMIT = 5;
const F2F_HANDS_FREE_DUPLICATE_TTL_MS = 6500;
const F2F_HANDS_FREE_DUPLICATE_SIMILARITY = 0.92;
const F2F_HANDS_FREE_ECHO_TTL_MS = 8000;
const F2F_HANDS_FREE_ECHO_SIMILARITY = 0.84;
const F2F_HANDS_FREE_COMMAND_ENABLED = false;
const F2F_HANDS_FREE_FEATURE_ENABLED = false;
const F2F_HANDS_FREE_COMMAND_DEFAULT_SIDE = "top";
const F2F_HANDS_FREE_COMMAND_WAKE_ALIASES = [
  // Ana tetikleme: "Hey Can". SpeechRecognition farklı dillerde Can'ı
  // cen/ken/kan/chen gibi yazabildiği için fonetik varyantlar da kabul edilir.
  "hey can",
  "hey cen",
  "hey ken",
  "hey kan",
  "hey kaan",
  "hey cem",
  "hey cam",
  "hey jam",
  "hey john",
  "hey jhon",
  "hey con",
  "hey sen",
  "hey san",
  "hey cin",
  "hey jin",
  "hey jan",
  "hey gen",
  "hey chen",
  "hey chan",
  "hey jain",
  "hey jane",
  "hay can",
  "hay cen",
  "hay ken",
  "hay kan",
  "hay kaan",
  "hay cem",
  "hay cam",
  "hay ken",
  "hay john",
  "he can",
  "he cen",
  "he ken",
  "he kan",
  "he cem",
  "he cam",
  "he john",
  "hi can",
  "hi cen",
  "hi ken",
  "hi kan",
  "ey can",
  "ey cen",
  "ey ken",
  "ey kan",
  "e can",
  "e ken",
  "heycan",
  "heycen",
  "heyken",
  "heykan",
  "heycem",
  "heycam",
  "heyjohn",
  "heyitalky",
  "ok can",
  "okay can",
  "oke can",
  "hey kem",
  "hey gem",
  "hey kim",
  "hey gan",
  "hey cenk",
  "hey kenan",
  "hay kem",
  "he kem",
  "hi kem",
  "ey kem",
  "hey canon",
  "hey canyon",
  "hey cane",
  "hey candy",
  "hey italky",
  "hey italkyai",
  "hey i talky",
  "hey talky",
  "hey talkie",
  "italky",
  "italkyai",
  "i talky"
];


// Dual-Ear Pro v0.3 — Soft Near Voice Gate
// Amaç: Kalabalık ortamda çok kısa/uzak/uğultu benzeri sonuçları azaltmak.
// Bu filtre "sert kapı" değildir; gate başlatılamazsa mevcut Eller Serbest akışı bozulmadan devam eder.
const HANDS_FREE_NEAR_VOICE_GATE_ENABLED = false;
const HANDS_FREE_NOISE_CALIBRATION_MS = 900;
const HANDS_FREE_VOICE_SAMPLE_MS = 80;
const HANDS_FREE_MIN_RMS = 0.022;
const HANDS_FREE_NOISE_DELTA = 0.014;
const HANDS_FREE_HOT_GRACE_MS = 2200;
const HANDS_FREE_NEAR_VOICE_SHORT_MAX_CHARS = 14;
const HANDS_FREE_NEAR_VOICE_SHORT_MAX_WORDS = 2;
const HANDS_FREE_NEAR_VOICE_NOISE_RE = /^(ha|he|hı|hmm|ım|em|ee|aa|ya|yo|ok|okay|tamam|evet|no|yes)$/i;
const F2F_AUTO_READ_KEY = "italkyai_auto_read";
const SHARED_VOICE_NAME_KEY = "italkyai_selected_voice_name";
const SHARED_VOICE_ID_KEY = "italkyai_selected_voice_id";
const F2F_PRESET_KEY = "italkyai_voice_preset";
const OFFLINE_INSTALLED_KEY = "italky_offline_installed_pairs_v7";
const F2F_MODE_KEY = "facetoface_runtime_mode";
const NATIVE_LANG_KEY = "italky_native_lang_v7";

function isFaceAutoReadEnabled() {
  return String(localStorage.getItem(F2F_AUTO_READ_KEY) || "1") !== "0";
}

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim();
}

function getSiteLang() {
  const raw = canonical(
    localStorage.getItem(SITE_LANG_KEY) ||
    localStorage.getItem(LEGACY_SITE_LANG_KEY) ||
    localStorage.getItem(NATIVE_LANG_KEY) ||
    navigator.language ||
    "en"
  );
  return raw || "en";
}

function getNativeLang() {
  const raw = canonical(
    localStorage.getItem(NATIVE_LANG_KEY) ||
    localStorage.getItem(SITE_LANG_KEY) ||
    localStorage.getItem(LEGACY_SITE_LANG_KEY) ||
    navigator.language ||
    "en"
  );
  return raw || "en";
}

function getPreferredBaseLang() {
  const savedBot = canonical(localStorage.getItem(F2F_BOT_LANG_KEY));
  if (savedBot) return savedBot;

  const siteLang = getSiteLang();
  if (siteLang) return siteLang;

  const nativeLang = getNativeLang();
  if (nativeLang) return nativeLang;

  const navLang = canonical(navigator.language || navigator.userLanguage || "");
  if (navLang) return navLang;

  return "en";
}

const SITE_LANG = getSiteLang();
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
      name: l.name || l.tr_name || code.toUpperCase(),
      bcp: BCP[code] || `${code}-${String(code).toUpperCase()}`
    };
  })
  .filter(Boolean);

function langExists(code) {
  const c = canonical(code);
  return !!LANGS.find((x) => x.code === c);
}

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

function getInstalledOfflinePairs() {
  try {
    const localPairs = JSON.parse(localStorage.getItem(OFFLINE_INSTALLED_KEY) || "{}");
    const localMap = localPairs && typeof localPairs === "object" ? localPairs : {};

    if (!window.OfflineTranslate?.getInstalledOfflinePairs) return localMap;

    const nativePairs = JSON.parse(window.OfflineTranslate.getInstalledOfflinePairs() || "{}");
    const nativeMap = nativePairs && typeof nativePairs === "object" ? nativePairs : {};
    const merged = { ...localMap, ...nativeMap };

    localStorage.setItem(OFFLINE_INSTALLED_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return {};
  }
}

function getInstalledTargetLangsForNative(nativeLang) {
  const native = canonical(nativeLang);
  const installed = getInstalledOfflinePairs();
  const result = [];

  Object.values(installed).forEach((item) => {
    const from = canonical(item?.from);
    const to = canonical(item?.to);
    if (from === native && to && !result.includes(to)) result.push(to);
    if (to === native && from && !result.includes(from)) result.push(from);
  });

  return result.filter((code) => code !== native);
}

function getAllInstalledOfflineLangs() {
  const installed = getInstalledOfflinePairs();
  const result = new Set();

  Object.values(installed).forEach((item) => {
    const from = canonical(item?.from);
    const to = canonical(item?.to);
    if (from) result.add(from);
    if (to) result.add(to);
  });

  return Array.from(result).filter(Boolean);
}

function hasInstalledOfflinePair(source, target) {
  const s = canonical(source);
  const t = canonical(target);
  const installed = getInstalledOfflinePairs();
  return !!installed[`${s}_${t}`] || !!installed[`${t}_${s}`];
}

function getDifferentPairLang(baseLang) {
  const base = canonical(baseLang);

  const preferredOrder = base === "en"
    ? ["tr", "de", "fr", "it", "es", "ar", "ru"]
    : ["en", "tr", "de", "fr", "it", "es", "ar", "ru"];

  for (const code of preferredOrder) {
    if (code !== base && langExists(code)) return code;
  }

  const firstDifferent = LANGS.find((l) => canonical(l.code) !== base);
  return canonical(firstDifferent?.code || "en");
}

function resolveInitialTopLang(botCode) {
  const bot = canonical(botCode);
  const savedTop = canonical(localStorage.getItem(F2F_TOP_LANG_KEY));

  if (savedTop && savedTop !== bot && langExists(savedTop)) {
    return savedTop;
  }

  return getDifferentPairLang(bot);
}

function persistFaceToFaceLangs() {
  try {
    localStorage.setItem(F2F_TOP_LANG_KEY, canonical(topLang));
    localStorage.setItem(F2F_BOT_LANG_KEY, canonical(botLang));
  } catch {}
}

const frameRoot = $("frameRoot");
const centerHub = $("centerHub");

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

const topModeToggle = $("topModeToggle");
const botModeToggle = $("botModeToggle");
const topModeToggleLabel = $("topModeToggleLabel");
const botModeToggleLabel = $("botModeToggleLabel");


const clearBtn = $("clearBtn");
const homeLink = $("homeLink");
const homeBtn = $("homeBtn");
const miniToast = $("miniToast");
const cultureToggle = $("cultureToggle");
const cultureToggleText = $("cultureToggleText");
const handsFreeToggle = $("handsFreeToggle");
const topHandsFreeToggle = $("topHandsFreeToggle");
const handsFreeTipModal = $("handsFreeTipModal");
const handsFreeTipOk = $("handsFreeTipOk");
const handsFreeTipDontShow = $("handsFreeTipDontShow");


const uiModal = $("uiModal");
const uiModalTitle = $("uiModalTitle");
const uiModalText = $("uiModalText");
const uiModalGo = $("uiModalGo");
const uiModalClose = $("uiModalClose");

const offlineRequiredBackdrop = $("offlineRequiredBackdrop");
const offlineRequiredTitle = $("offlineRequiredTitle");
const offlineRequiredText = $("offlineRequiredText");
const offlineRequiredCloseBtn = $("offlineRequiredCloseBtn");

let topLang = "en";
let botLang = "en";
window.topLang = topLang;
window.botLang = botLang;

let activeSide = null;
let activeKeyboardSide = null;
let shiftState = { top: false, bot: false };

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
let offlineSpeechEventsBound = false;
let activeOfflineSpeechRecognizer = null;

let altMenuEl = null;
let holdTimer = null;

let keyboardAudioCtx = null;
let keyboardMasterGain = null;
let currentRuntimeMode = "online";
let offlinePickerPool = [];
let uiModalPurpose = "default";

let handsFreeRunId = 0;
let handsFreeSilenceTimer = null;
let handsFreeRestartTimer = null;
let handsFreeMaxListenTimer = null;
let handsFreeEmptyEndCount = 0;
let handsFreeStartPending = false;
let handsFreeLastStartAt = 0;
let handsFreeAudioGuardUntil = 0;
let handsFreeNextSide = "bot";
let handsFreeLastRoutedSide = "bot";
let handsFreeTranslateQueue = [];
let handsFreeQueueWorkerActive = false;
let handsFreeQueueSeq = 0;
let handsFreeLastTts = { text: "", at: 0 };
let handsFreeLastAccepted = { text: "", side: "", at: 0 };

let handsFreeGateStream = null;
let handsFreeGateAudioCtx = null;
let handsFreeGateAnalyser = null;
let handsFreeGateSource = null;
let handsFreeGateData = null;
let handsFreeGateTimer = null;
let handsFreeGateNoiseFloor = 0.012;
let handsFreeGateCalibratingUntil = 0;
let handsFreeVoiceHotUntil = 0;
let handsFreeGateReady = false;
let handsFreeGateLastRms = 0;
let handsFreeTipDismissedCache = null;
let handsFreeTipPendingEnable = null;

try { localStorage.setItem(DENEME_HANDS_FREE_MODE_KEY, "off"); } catch {}



function isHandsFreeTipDismissedLocal() {
  return String(localStorage.getItem(F2F_HANDS_FREE_TIP_LOCAL_KEY) || "").trim() === "1";
}

async function getHandsFreeTipDismissed() {
  if (isHandsFreeTipDismissedLocal()) {
    handsFreeTipDismissedCache = true;
    return true;
  }

  if (typeof handsFreeTipDismissedCache === "boolean") return handsFreeTipDismissedCache;

  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      handsFreeTipDismissedCache = false;
      return false;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select(F2F_HANDS_FREE_TIP_PROFILE_FIELD)
      .eq("id", userId)
      .maybeSingle();

    if (!error && data?.[F2F_HANDS_FREE_TIP_PROFILE_FIELD]) {
      localStorage.setItem(F2F_HANDS_FREE_TIP_LOCAL_KEY, "1");
      handsFreeTipDismissedCache = true;
      return true;
    }
  } catch (e) {
    console.debug("[handsfree tip read skipped]", e);
  }

  handsFreeTipDismissedCache = false;
  return false;
}

async function saveHandsFreeTipDismissed() {
  localStorage.setItem(F2F_HANDS_FREE_TIP_LOCAL_KEY, "1");
  handsFreeTipDismissedCache = true;

  try {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        handsfree_tip_dismissed: true,
        handsfree_tip_dismissed_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (error) console.debug("[handsfree tip write skipped]", error);
  } catch (e) {
    console.debug("[handsfree tip write skipped]", e);
  }
}

function closeHandsFreeTipModal() {
  handsFreeTipModal?.classList.remove("open");
}

function showHandsFreeTipModal(onAccepted) {
  if (!handsFreeTipModal || !handsFreeTipOk) {
    onAccepted?.();
    return;
  }

  handsFreeTipPendingEnable = typeof onAccepted === "function" ? onAccepted : null;
  if (handsFreeTipDontShow) handsFreeTipDontShow.checked = false;
  handsFreeTipModal.classList.add("open");
}

function bindHandsFreeTipModal() {
  handsFreeTipOk?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const shouldRemember = !!handsFreeTipDontShow?.checked;
    const pending = handsFreeTipPendingEnable;
    handsFreeTipPendingEnable = null;

    if (shouldRemember) await saveHandsFreeTipDismissed();

    closeHandsFreeTipModal();
    await pending?.();
  });
}

function showToast(msg = "") {
  if (!miniToast) return;
  miniToast.textContent = String(msg || "");
  miniToast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    miniToast.classList.remove("show");
  }, 1800);
}

function getConversationCharCount() {
  const ignored = new Set(["Çeviriliyor...", "Ceviri su anda tamamlanamadi", "⚠️ Çeviri hatası"]);
  const nodes = [
    ...(topBody?.querySelectorAll?.(".bubble:not(.preview) .txt") || []),
    ...(botBody?.querySelectorAll?.(".bubble:not(.preview) .txt") || [])
  ];

  return nodes.reduce((total, node) => {
    const value = String(node?.textContent || "").replace(/\s+/g, " ").trim();
    if (!value || ignored.has(value)) return total;
    return total + value.length;
  }, 0);
}

function syncClearTrashMeter() {
  if (!clearBtn) return;
  const count = getConversationCharCount();
  const ratio = Math.max(0, Math.min(1, count / CLEAR_TRASH_FULL_CHAR_LIMIT));
  clearBtn.style.setProperty("--clear-fill", ratio.toFixed(3));
  clearBtn.classList.toggle("is-full", ratio >= 1);
  clearBtn.setAttribute("title", `${Math.min(count, CLEAR_TRASH_FULL_CHAR_LIMIT)}/${CLEAR_TRASH_FULL_CHAR_LIMIT} karakter`);
}

function isCulturalModeEnabled() {
  if (F2F_LIVE_CULTURAL_MODE_DISABLED) return false;
  return String(localStorage.getItem(DENEME_CULTURAL_MODE_KEY) || "off").trim().toLowerCase() === "on";
}

function syncCulturalToggleUi() {
  const enabled = isCulturalModeEnabled();
  cultureToggle?.classList.toggle("on", enabled);
  cultureToggle?.setAttribute("aria-pressed", enabled ? "true" : "false");
  if (cultureToggleText) cultureToggleText.textContent = enabled ? "A\u00e7\u0131k" : "Kapal\u0131";
}

function setCulturalMode(enabled, opts = {}) {
  localStorage.setItem(DENEME_CULTURAL_MODE_KEY, enabled ? "on" : "off");
  syncCulturalToggleUi();
  if (!opts.silent) showToast(enabled ? "K\u00fclt\u00fcrel mod a\u00e7\u0131k" : "K\u00fclt\u00fcrel mod kapal\u0131");
}

function shouldShowCulturalInfo() {
  return String(localStorage.getItem(DENEME_CULTURAL_INFO_SEEN_KEY) || "") !== "1";
}

function showCulturalInfoModal() {
  if (!uiModal) return;
  uiModalPurpose = "cultural_info";
  uiModalTitle.textContent = "K\u00fclt\u00fcrel \u00c7eviri Modu";
  uiModalText.textContent = "Baz\u0131 c\u00fcmleler, deyimler ve atas\u00f6zleri kelime kelime \u00e7evrildi\u011finde anlam\u0131n\u0131 kaybeder. Mesela \u2018Sakla saman\u0131, gelir zaman\u0131\u2019 gibi bir ifadeyi birebir \u00e7evirmek kar\u015f\u0131 tarafta ayn\u0131 etkiyi olu\u015fturmaz. K\u00fclt\u00fcrel \u00e7eviri modu, c\u00fcmlenin ne demek istedi\u011fini kar\u015f\u0131 dilin do\u011fal olarak anlayaca\u011f\u0131 \u015fekilde aktar\u0131r.\n\nBu modda kelimeler birebir ve robotik bi\u00e7imde \u00e7evrilmez. italkyAI, konu\u015fman\u0131z\u0131n anlam\u0131n\u0131, tonunu ve g\u00fcnl\u00fck kullan\u0131m\u0131n\u0131 dikkate alarak daha anla\u015f\u0131l\u0131r bir terc\u00fcme \u00fcretmeye \u00e7al\u0131\u015f\u0131r.\n\nC\u00fcmle kursan\u0131z bile, k\u00fclt\u00fcrel \u00e7eviri modu a\u00e7\u0131ksa italkyAI eksik, hatal\u0131 veya devrik ifadeleri daha d\u00fczg\u00fcn ve anla\u015f\u0131l\u0131r \u015fekilde terc\u00fcme etmeye \u00e7al\u0131\u015f\u0131r.\n\nK\u00fclt\u00fcrel \u00e7eviri normal \u00e7eviriye g\u00f6re biraz daha yava\u015f olabilir ve jeton ile \u00e7al\u0131\u015f\u0131r.";
  if (uiModalGo) {
    uiModalGo.textContent = "Anlad\u0131m";
    uiModalGo.classList.add("cultural-info-primary");
  }
  if (uiModalClose) uiModalClose.textContent = "Vazge\u00e7";
  uiModal.classList.add("open");
}

function bindCulturalToggle() {
  syncCulturalToggleUi();
  if (F2F_LIVE_CULTURAL_MODE_DISABLED) return;
  cultureToggle?.addEventListener("click", () => {
    const next = !isCulturalModeEnabled();
    setCulturalMode(next);
    if (next && shouldShowCulturalInfo()) showCulturalInfoModal();
  });
}

function isHandsFreeModeEnabled() {
  return false;
}

function isValidFaceSide(side) {
  return side === "top" || side === "bot";
}

function getOtherSide(side) {
  return side === "top" ? "bot" : "top";
}

function getHandsFreeSide() {
  // Dual-Ear Pro tek fiziksel mikrofon akışıyla çalışır.
  // Web Speech API aynı anda iki dili dinleyemediği için içeride TR/EN gibi
  // seçili iki tarafın tanıma dilini dönüşümlü deneriz.
  // Kullanıcı tarafında iki mic animasyonu aynı anda canlı kalır; sıra hissi vermez.
  if (DENEME_HANDS_FREE_SIDE === "auto") {
    return isValidFaceSide(handsFreeNextSide) ? handsFreeNextSide : "bot";
  }
  return DENEME_HANDS_FREE_SIDE;
}

function setHandsFreeNextSide(side) {
  if (!isValidFaceSide(side)) return;
  handsFreeNextSide = side;
}

function getSideLang(side) {
  return side === "top" ? topLang : botLang;
}

function normalizeVoiceCommandText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getVoiceCommandLanguageAliasMap() {
  return {
    tr: ["turkce", "turkceye", "turk", "turkish", "turk dili"],
    en: ["ingilizce", "ingilizceye", "ingiliz", "ingliz", "inglizce", "english", "englis", "inglish", "ingilis", "ingiliş", "british", "ingiliz dili", "english language"],
    de: ["almanca", "almancaya", "almaca", "alamanca", "alemanca", "alemancaya", "alman", "almanya", "almanyaca", "allmanca", "all mancha", "almancha", "allmancha", "german", "germany", "germen", "deutsch", "deutsche", "doyc", "dojc", "alman dili", "german language"],
    fr: ["fransizca", "fransizcaya", "fransiz", "french", "francais", "français", "fransiz dili", "french language"],
    it: ["italyanca", "italyancaya", "italyan", "italian", "italiano", "italyan dili"],
    es: ["ispanyolca", "ispanyolcaya", "ispanyol", "spanish", "espanol", "ispanyol dili"],
    ar: ["arapca", "arapcaya", "arap", "arabic", "arabi", "arap dili"],
    ru: ["rusca", "ruscaya", "rus", "russian", "rus dili"],
    bg: ["bulgarca", "bulgarcaya", "bulgar", "bulgarian", "bulgar dili"],
    pt: ["portekizce", "portekizceye", "portekiz", "portuguese", "portugues"],
    zh: ["cince", "cinceye", "cin", "chinese", "mandarin", "cin dili"],
    ja: ["japonca", "japoncaya", "japon", "japanese", "japon dili"],
    ko: ["korece", "koreceye", "kore", "korean", "kore dili"],
    nl: ["hollandaca", "hollandacaya", "hollanda", "dutch", "flemenkce"],
    pl: ["lehce", "lehceye", "polish", "polonya dili"],
    uk: ["ukraynaca", "ukraynacaya", "ukrayna", "ukrainian"],
    fa: ["farsca", "farscaya", "fars", "persian", "farsi"],
    hi: ["hintce", "hintceye", "hindi", "hint dili"],
    ur: ["urduca", "urduya", "urdu"],
    ro: ["romence", "romenceye", "romen", "romanian", "rumence"],
    el: ["yunanca", "yunancaya", "yunan", "greek", "yunan dili"],
    he: ["ibranice", "ibraniceye", "ibrani", "hebrew", "ivrit"],
    id: ["endonezce", "endonezceye", "endonez", "indonesian"],
    vi: ["vietnamca", "vietnamcaya", "vietnam", "vietnamese"],
    th: ["tayca", "taycaya", "thai"],
    sq: ["arnavutca", "arnavutcaya", "arnavut", "albanian"],
    bs: ["bosnakca", "bosnakcaya", "bosnak", "bosnian"],
    sr: ["sirpca", "sirpcaya", "sirp", "serbian"],
    hr: ["hirvatca", "hirvatcaya", "hirvat", "croatian"],
    mk: ["makedonca", "makedoncaya", "makedon", "macedonian"],
    sl: ["slovence", "slovenceye", "sloven", "slovenian"],
    ka: ["gurcuce", "gurcuceye", "gurcu", "georgian"],
    hy: ["ermenice", "ermeniceye", "ermeni", "armenian"],
    az: ["azerice", "azericeye", "azerbaycanca", "azerbaycan", "azerbaijani"],
    kk: ["kazakca", "kazakcaya", "kazak", "kazakh"],
    ky: ["kirgizca", "kirgizcaya", "kirgiz", "kyrgyz"],
    uz: ["ozbekce", "ozbekceye", "ozbek", "uzbek"],
    tk: ["turkmence", "turkmenceye", "turkmen"],
    ug: ["uygurca", "uygurcaya", "uygur", "uyghur"],
    tt: ["tatarca", "tatarcaya", "tatar"],
    ku: ["kurtce", "kurtceye", "kurt", "kurdish"],
    kmr: ["kurmanci", "kurmancice", "kurmanciceye"],
    ckb: ["sorani", "soranice", "soraniceye"]
  };
}

function buildVoiceCommandLanguageAliases() {
  const hardcoded = getVoiceCommandLanguageAliasMap();
  const aliases = [];
  const seen = new Set();

  LANGS.forEach((item) => {
    const code = canonical(item?.code);
    if (!code) return;

    const values = [
      item?.name,
      item?.tr_name,
      item?.nativeName,
      ...(hardcoded[code] || [])
    ];

    values.forEach((value) => {
      const alias = normalizeVoiceCommandText(value);
      if (!alias || alias.length < 3) return;
      const key = `${code}:${alias}`;
      if (seen.has(key)) return;
      seen.add(key);
      aliases.push({ code, alias, exact: false });
    });

    // Kısa dil kodlarını sadece tam kelime olarak kabul ediyoruz; böylece "de" gibi kelimeler
    // yanlışlıkla Almanca komutu sayılmaz.
    if (code.length >= 3) {
      const key = `${code}:${code}`;
      if (!seen.has(key)) {
        seen.add(key);
        aliases.push({ code, alias: code, exact: true });
      }
    }
  });

  return aliases.sort((a, b) => b.alias.length - a.alias.length);
}

function stripHandsFreeCommandWake(text) {
  const norm = normalizeVoiceCommandText(text);
  if (!norm) return "";

  const wakeAliases = F2F_HANDS_FREE_COMMAND_WAKE_ALIASES
    .map(normalizeVoiceCommandText)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  for (const wake of wakeAliases) {
    if (norm === wake) return "";
    if (norm.startsWith(`${wake} `)) return norm.slice(wake.length).trim();
  }

  // Bazı cihazlar "Hey Can" içindeki Can/Cen/Ken kelimesini düşürüp sadece
  // "hey almanca" / "hey english" gibi metin döndürebiliyor. Bu durumda
  // gövdede gerçek bir dil adı varsa bunu komut kabul ediyoruz.
  const explicitWakeOnly = norm.match(/^(hey|hay|he|hi|ey|e|ok|okay|oke)\s+(.+)$/i);
  if (explicitWakeOnly?.[2]) {
    const candidate = explicitWakeOnly[2].trim();
    if (findHandsFreeCommandLanguage(candidate)) return candidate;
  }

  // SpeechRecognition bazen "Hey Can"ı "heycan", "hey ken", "hey cem",
  // "hey john" veya "hey sen" gibi yazabiliyor. Bu yüzden tetiklemeyi
  // başta ve fonetik yakalıyoruz; gövde yine dil alias'ıyla doğrulanacak.
  const phoneticWake = /^(?:(?:hey|hay|he|hi|ey|e|ok|okay|oke)\s*)?(?:can|cen|ken|kan|kaan|kem|gem|kim|gan|cenk|kenan|jan|gen|chen|chan|cem|cam|jam|john|jhon|con|sen|san|cin|jin|cane|cani|canim)\b\s*/i;
  const match = norm.match(phoneticWake);
  if (match && match[0]) {
    const body = norm.slice(match[0].length).trim();
    // "can you" gibi normal İngilizce cümleleri yanlış komut saymayalım:
    // başında hey/ok/hi yoksa ancak ardından desteklenen dil adı varsa kabul edilir.
    const hasExplicitWake = /^(hey|hay|he|hi|ey|e|ok|okay|oke)/i.test(match[0]);
    if (hasExplicitWake || body) return body;
  }

  return "";
}

function stripLooseHandsFreeCommandWake(text) {
  const norm = normalizeVoiceCommandText(text);
  if (!norm) return "";

  // Bazı cihazlar "hey" kısmını düşürüp sadece "ken almanca" bırakabiliyor.
  // Bunu sadece arkasında gerçek dil adı varsa parseHandsFreeVoiceCommand kabul eder.
  const loose = norm.match(/^(?:can|cen|ken|kan|kaan|kem|gem|kim|gan|cenk|kenan|jan|gen|chen|chan|cem|cam|jam|john|jhon|con|sen|san|cin|jin|cane|cani|canim)\s+(.+)$/i);
  return loose?.[1]?.trim?.() || "";
}

function detectHandsFreeCommandSide(body) {
  const norm = normalizeVoiceCommandText(body);

  if (/\b(alt dil|alt dili|alt tarafi|asagi dil|asagidaki dil|asagi|bottom|lower|lower language|bottom language)\b/.test(norm)) {
    return "bot";
  }

  // Kullanıcı sadece "Hey Can Almanca" / "Hey Cen English" derse varsayılan üst dil değişir.
  if (/\b(ust dil|ust dili|ust tarafi|yukari dil|yukaridaki dil|yukari|top|upper|upper language|top language)\b/.test(norm)) {
    return "top";
  }

  return F2F_HANDS_FREE_COMMAND_DEFAULT_SIDE;
}

function findHandsFreeCommandLanguage(body) {
  const norm = normalizeVoiceCommandText(body);
  if (!norm) return "";

  for (const item of buildVoiceCommandLanguageAliases()) {
    if (!item?.alias || !langExists(item.code)) continue;

    if (item.exact) {
      const re = new RegExp(`(^|\\s)${escapeRegExp(item.alias)}(\\s|$)`, "i");
      if (re.test(norm)) return canonical(item.code);
      continue;
    }

    if (norm.includes(item.alias)) return canonical(item.code);
  }

  return "";
}

function parseHandsFreeVoiceCommand(text) {
  if (!F2F_HANDS_FREE_COMMAND_ENABLED) return null;

  let body = stripHandsFreeCommandWake(text);
  let code = body ? findHandsFreeCommandLanguage(body) : "";

  if (!code) {
    const looseBody = stripLooseHandsFreeCommandWake(text);
    const looseCode = looseBody ? findHandsFreeCommandLanguage(looseBody) : "";
    if (looseCode) {
      body = looseBody;
      code = looseCode;
    }
  }

  if (!body || !code) return null;

  return {
    type: "set-language",
    side: detectHandsFreeCommandSide(body),
    code,
    body,
    rawText: String(text || "")
  };
}

function getVoiceCommandSideLabel(side) {
  return side === "top" ? "Üst dil" : "Alt dil";
}

function applyHandsFreeVoiceCommand(command) {
  if (!command || command.type !== "set-language") return false;

  const side = isValidFaceSide(command.side) ? command.side : F2F_HANDS_FREE_COMMAND_DEFAULT_SIDE;
  const code = canonical(command.code);
  if (!code || !langExists(code)) {
    showToast("Bu dil bu sayfada desteklenmiyor");
    return true;
  }

  const otherLang = side === "top" ? botLang : topLang;
  if (canonical(otherLang) === code) {
    showToast(`${getVoiceCommandSideLabel(side)} ${langObj(code).name} olamaz; iki taraf aynı dil seçilemez`);
    return true;
  }

  if (side === "top") {
    topLang = code;
    window.topLang = topLang;
  } else {
    botLang = code;
    window.botLang = botLang;
  }

  persistFaceToFaceLangs();
  refreshLangLabels();
  renderKeyboard("top");
  renderKeyboard("bot");
  closeAllPop();
  setHandsFreeNextSide(side);

  if (currentRuntimeMode === "offline" && !hasInstalledOfflinePair(topLang, botLang) && canonical(topLang) !== canonical(botLang)) {
    showToast(`${getVoiceCommandSideLabel(side)} ${langObj(code).name} oldu; bu çift offline hazır değil`);
  } else {
    showToast(`${getVoiceCommandSideLabel(side)} ${labelChip(code)} oldu`);
  }

  return true;
}

function handleHandsFreeVoiceCommand(text) {
  const command = parseHandsFreeVoiceCommand(text);
  if (!command) return false;

  console.warn("[F2F_HANDSFREE_COMMAND] handled", {
    side: command.side,
    code: command.code,
    body: command.body,
    rawText: command.rawText
  });

  return applyHandsFreeVoiceCommand(command);
}


function normalizeHandsFreeCompareText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9çğıöşü\u0600-\u06ff\u0400-\u04ff\u3040-\u30ff\u3400-\u9fff\s]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a, b) {
  const x = normalizeHandsFreeCompareText(a);
  const y = normalizeHandsFreeCompareText(b);
  if (x === y) return 0;
  if (!x) return y.length;
  if (!y) return x.length;

  let prev = Array.from({ length: y.length + 1 }, (_, i) => i);
  let curr = new Array(y.length + 1);

  for (let i = 1; i <= x.length; i += 1) {
    curr[0] = i;
    const cx = x.charAt(i - 1);
    for (let j = 1; j <= y.length; j += 1) {
      const cost = cx === y.charAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[y.length];
}

function handsFreeTextSimilarity(a, b) {
  const x = normalizeHandsFreeCompareText(a);
  const y = normalizeHandsFreeCompareText(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const maxLen = Math.max(x.length, y.length, 1);
  return 1 - (levenshteinDistance(x, y) / maxLen);
}

function rememberHandsFreeTts(text) {
  const value = cleanupFinalTranscript(text);
  if (!value) return;
  handsFreeLastTts = { text: value, at: Date.now() };
}

function isHandsFreeLikelyEcho(text) {
  const value = cleanupFinalTranscript(text);
  if (!value || !handsFreeLastTts.text) return false;
  if (Date.now() - handsFreeLastTts.at > F2F_HANDS_FREE_ECHO_TTL_MS) return false;
  const sim = handsFreeTextSimilarity(value, handsFreeLastTts.text);
  return sim >= F2F_HANDS_FREE_ECHO_SIMILARITY;
}

function isHandsFreeDuplicate(text, side) {
  const value = cleanupFinalTranscript(text);
  if (!value || !handsFreeLastAccepted.text) return false;
  if (side !== handsFreeLastAccepted.side) return false;
  if (Date.now() - handsFreeLastAccepted.at > F2F_HANDS_FREE_DUPLICATE_TTL_MS) return false;
  const sim = handsFreeTextSimilarity(value, handsFreeLastAccepted.text);
  return sim >= F2F_HANDS_FREE_DUPLICATE_SIMILARITY;
}

function enqueueHandsFreeTranscript(side, text, listeningSide, runId) {
  const cleaned = cleanupFinalTranscript(text);
  const routedSide = isValidFaceSide(side) ? side : (isValidFaceSide(listeningSide) ? listeningSide : "bot");
  if (!cleaned) return false;

  if (isHandsFreeLikelyEcho(cleaned)) {
    console.warn("[F2F_HANDSFREE_QUEUE] echo discarded", { routedSide, listeningSide, text: cleaned });
    return false;
  }

  if (isHandsFreeDuplicate(cleaned, routedSide)) {
    console.warn("[F2F_HANDSFREE_QUEUE] duplicate discarded", { routedSide, listeningSide, text: cleaned });
    return false;
  }

  handsFreeLastAccepted = { text: cleaned, side: routedSide, at: Date.now() };
  handsFreeTranslateQueue.push({
    id: ++handsFreeQueueSeq,
    side: routedSide,
    listeningSide: isValidFaceSide(listeningSide) ? listeningSide : routedSide,
    text: cleaned,
    runId: Number(runId || handsFreeRunId),
    createdAt: Date.now()
  });

  while (handsFreeTranslateQueue.length > F2F_HANDS_FREE_QUEUE_LIMIT) {
    handsFreeTranslateQueue.shift();
  }

  startHandsFreeQueueWorker();
  return true;
}

function startHandsFreeQueueWorker() {
  if (handsFreeQueueWorkerActive) return;
  handsFreeQueueWorkerActive = true;
  void processHandsFreeQueue();
}

async function processHandsFreeQueue() {
  try {
    while (handsFreeTranslateQueue.length) {
      const item = handsFreeTranslateQueue.shift();
      if (!item?.text || !isValidFaceSide(item.side)) continue;
      if (item.runId !== handsFreeRunId) continue;

      console.warn("[F2F_HANDSFREE_QUEUE] translate", {
        id: item.id,
        side: item.side,
        listeningSide: item.listeningSide,
        length: item.text.length
      });

      try {
        await finalizeRecognition(item.side, item.text);
      } catch (err) {
        console.warn("[F2F_HANDSFREE_QUEUE] translate failed", err);
      }
    }
  } finally {
    handsFreeQueueWorkerActive = false;
    if (handsFreeTranslateQueue.length) startHandsFreeQueueWorker();
  }
}

function scoreTextForLanguage(text, lang) {
  const value = String(text || "").toLowerCase();
  const c = canonical(lang);
  if (!value || !c) return 0;

  let score = 0;
  const words = value.split(/[^a-zçğıöşüâîûáéíóúàèìòùäëïöüßñ]+/i).filter(Boolean);
  const wordSet = new Set(words);

  if (c === "tr") {
    if (/[çğıöşü]/i.test(value)) score += 8;
    ["ben", "sen", "biz", "siz", "merhaba", "selam", "nasıl", "değil", "için", "şimdi", "tamam", "evet", "hayır", "var", "yok", "çok", "bir", "bu", "şu", "ile"].forEach((w) => { if (wordSet.has(w)) score += 2; });
    if (/(yorum|yorum|yorum|ıyorum|iyorum|üyor|ıyor|acak|ecek|meli|malı|dir|dır|tır|tur|mış|miş|muş|müş)\b/i.test(value)) score += 3;
  } else if (c === "en") {
    [
      "i", "me", "my", "mine", "you", "your", "we", "they", "he", "she", "it",
      "hello", "hi", "hey", "how", "what", "where", "when", "why", "who",
      "yes", "no", "not", "the", "a", "an", "and", "or", "is", "are", "am",
      "was", "were", "do", "does", "did", "can", "could", "would", "should",
      "to", "for", "with", "this", "that", "there", "here", "please", "thanks",
      "thank", "good", "morning", "evening", "name", "need", "want", "have", "has"
    ].forEach((w) => { if (wordSet.has(w)) score += 2; });
    if (/\b(the|you|your|that|with|this|please|hello|thanks|what|where|when|because|good|morning|name|need|want|have)\b/i.test(value)) score += 4;
    if (/\b(i am|i'm|my name|how are|thank you|nice to|do you|can you|where is|what is)\b/i.test(value)) score += 6;
  } else if (c === "de") {
    if (/[äöüß]/i.test(value)) score += 7;
    ["ich", "du", "wir", "sie", "hallo", "danke", "bitte", "nicht", "und", "oder", "ist", "bin", "für", "mit", "das", "der", "die"].forEach((w) => { if (wordSet.has(w)) score += 2; });
  } else if (c === "fr") {
    if (/[àâçéèêëîïôùûüÿœ]/i.test(value)) score += 7;
    ["je", "tu", "nous", "vous", "bonjour", "merci", "pas", "oui", "non", "avec", "pour", "est", "suis", "le", "la", "les"].forEach((w) => { if (wordSet.has(w)) score += 2; });
  } else if (c === "es") {
    if (/[áéíóúüñ¿¡]/i.test(value)) score += 7;
    ["yo", "tu", "usted", "hola", "gracias", "no", "si", "con", "para", "que", "el", "la", "los", "las", "estoy", "es"].forEach((w) => { if (wordSet.has(w)) score += 2; });
  } else if (c === "it") {
    ["io", "tu", "noi", "voi", "ciao", "grazie", "non", "si", "con", "per", "che", "il", "la", "sono", "è"].forEach((w) => { if (wordSet.has(w)) score += 2; });
  } else if (c === "ru") {
    if (/[а-яё]/i.test(value)) score += 9;
  } else if (c === "ar") {
    if (/[\u0600-\u06FF]/.test(value)) score += 9;
  } else if (c === "zh") {
    if (/[\u4E00-\u9FFF]/.test(value)) score += 9;
  } else if (c === "ja") {
    if (/[\u3040-\u30ff]/.test(value)) score += 9;
  } else if (c === "ko") {
    if (/[\uac00-\ud7af]/.test(value)) score += 9;
  }

  return score;
}

function resolveHandsFreeSpeakerSide(text, listeningSide) {
  if (DENEME_HANDS_FREE_SIDE !== "auto") return listeningSide;

  const topScore = scoreTextForLanguage(text, topLang);
  const botScore = scoreTextForLanguage(text, botLang);
  const topCode = canonical(topLang);
  const botCode = canonical(botLang);

  if (topCode && botCode && topCode !== botCode) {
    if (topScore >= 4 && topScore >= botScore + 2) return "top";
    if (botScore >= 4 && botScore >= topScore + 2) return "bot";
  }

  return isValidFaceSide(listeningSide) ? listeningSide : "bot";
}

function noteHandsFreeRoute(routedSide) {
  if (!isValidFaceSide(routedSide)) return;
  handsFreeLastRoutedSide = routedSide;

  // Metin geldiğinde sıradaki dinleme dilini iç tarafta değiştiriyoruz.
  // Görselde iki mic aynı anda aktif kaldığı için kullanıcıya sıra geçişi gibi görünmez.
  // Bu, özellikle bot=TR / top=EN senaryosunda İngilizceyi yakalamak için gerekli.
  if (DENEME_HANDS_FREE_SIDE === "auto") {
    setHandsFreeNextSide(getOtherSide(routedSide));
  }
}

function clearHandsFreeSilenceTimer() {
  clearTimeout(handsFreeSilenceTimer);
  handsFreeSilenceTimer = null;
}

function clearHandsFreeRestartTimer() {
  clearTimeout(handsFreeRestartTimer);
  handsFreeRestartTimer = null;
}

function clearHandsFreeMaxListenTimer() {
  clearTimeout(handsFreeMaxListenTimer);
  handsFreeMaxListenTimer = null;
}

function clearHandsFreeTimers() {
  clearHandsFreeSilenceTimer();
  clearHandsFreeRestartTimer();
  clearHandsFreeMaxListenTimer();
}

function armHandsFreeAudioGuard(ms = DENEME_HANDS_FREE_AUDIO_GUARD_MS) {
  handsFreeAudioGuardUntil = Math.max(handsFreeAudioGuardUntil, Date.now() + Math.max(0, Number(ms) || 0));
}

function isHandsFreeAudioOutputBusy() {
  if (Date.now() < handsFreeAudioGuardUntil) return true;

  try {
    if (currentAudio && !currentAudio.paused && !currentAudio.ended) return true;
  } catch {}

  try {
    if (window.speechSynthesis?.speaking || window.speechSynthesis?.pending) return true;
  } catch {}

  try {
    if (window.NativeTTS?.isSpeaking?.()) return true;
  } catch {}

  return false;
}

function getHandsFreeGateRms() {
  if (!handsFreeGateAnalyser || !handsFreeGateData) return 0;

  try {
    handsFreeGateAnalyser.getByteTimeDomainData(handsFreeGateData);
  } catch {
    return 0;
  }

  let sum = 0;
  for (let i = 0; i < handsFreeGateData.length; i += 1) {
    const v = (handsFreeGateData[i] - 128) / 128;
    sum += v * v;
  }

  const rms = Math.sqrt(sum / Math.max(1, handsFreeGateData.length));
  handsFreeGateLastRms = Number.isFinite(rms) ? rms : 0;
  return handsFreeGateLastRms;
}

function updateHandsFreeVoiceGate() {
  const rms = getHandsFreeGateRms();
  const now = Date.now();

  if (!Number.isFinite(rms) || rms <= 0) return;

  if (now < handsFreeGateCalibratingUntil) {
    handsFreeGateNoiseFloor = Math.max(
      0.006,
      Math.min(0.08, handsFreeGateNoiseFloor * 0.88 + rms * 0.12)
    );
    return;
  }

  handsFreeGateReady = true;

  const dynamicThreshold = Math.max(
    HANDS_FREE_MIN_RMS,
    handsFreeGateNoiseFloor + HANDS_FREE_NOISE_DELTA
  );

  if (rms >= dynamicThreshold) {
    handsFreeVoiceHotUntil = now + HANDS_FREE_HOT_GRACE_MS;
    return;
  }

  // Uğultu tabanı yavaş güncellensin; ani yakın konuşmayı tabana katmayalım.
  handsFreeGateNoiseFloor = Math.max(
    0.006,
    Math.min(0.08, handsFreeGateNoiseFloor * 0.985 + rms * 0.015)
  );
}

async function ensureHandsFreeVoiceGate() {
  if (!HANDS_FREE_NEAR_VOICE_GATE_ENABLED) return true;
  if (handsFreeGateAnalyser && handsFreeGateStream) return true;
  if (!navigator.mediaDevices?.getUserMedia) return false;

  try {
    handsFreeGateStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false
      }
    });

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      stopHandsFreeVoiceGate();
      return false;
    }

    handsFreeGateAudioCtx = handsFreeGateAudioCtx || new AudioCtx();
    if (handsFreeGateAudioCtx.state === "suspended") {
      try { await handsFreeGateAudioCtx.resume(); } catch {}
    }

    handsFreeGateSource = handsFreeGateAudioCtx.createMediaStreamSource(handsFreeGateStream);
    handsFreeGateAnalyser = handsFreeGateAudioCtx.createAnalyser();
    handsFreeGateAnalyser.fftSize = 1024;
    handsFreeGateAnalyser.smoothingTimeConstant = 0.2;
    handsFreeGateData = new Uint8Array(handsFreeGateAnalyser.fftSize);
    handsFreeGateSource.connect(handsFreeGateAnalyser);

    handsFreeGateNoiseFloor = 0.012;
    handsFreeVoiceHotUntil = 0;
    handsFreeGateReady = false;
    handsFreeGateLastRms = 0;
    handsFreeGateCalibratingUntil = Date.now() + HANDS_FREE_NOISE_CALIBRATION_MS;

    clearInterval(handsFreeGateTimer);
    handsFreeGateTimer = setInterval(updateHandsFreeVoiceGate, HANDS_FREE_VOICE_SAMPLE_MS);
    return true;
  } catch (e) {
    console.debug("[HandsFreeNearVoice] gate could not start", e);
    stopHandsFreeVoiceGate();
    return false;
  }
}

function stopHandsFreeVoiceGate() {
  clearInterval(handsFreeGateTimer);
  handsFreeGateTimer = null;

  try {
    handsFreeGateStream?.getTracks?.().forEach((track) => track.stop());
  } catch {}

  try { handsFreeGateSource?.disconnect?.(); } catch {}

  handsFreeGateStream = null;
  handsFreeGateSource = null;
  handsFreeGateAnalyser = null;
  handsFreeGateData = null;
  handsFreeGateReady = false;
  handsFreeVoiceHotUntil = 0;
  handsFreeGateLastRms = 0;
}

function isHandsFreeNearVoiceActive() {
  if (!HANDS_FREE_NEAR_VOICE_GATE_ENABLED) return true;
  if (!handsFreeGateAnalyser) return true;
  if (!handsFreeGateReady) return true;
  return Date.now() <= handsFreeVoiceHotUntil;
}

function shouldDropHandsFreeTranscriptByVoiceGate(text, sawNearVoice = false) {
  if (!HANDS_FREE_NEAR_VOICE_GATE_ENABLED) return false;
  if (!handsFreeGateAnalyser || !handsFreeGateReady) return false;
  if (sawNearVoice || isHandsFreeNearVoiceActive()) return false;

  const value = cleanupFinalTranscript(text);
  if (!value) return true;

  const words = value.split(/\s+/).filter(Boolean);
  const looksLikeNoise = HANDS_FREE_NEAR_VOICE_NOISE_RE.test(value.trim());

  // Yumuşak kapı: sadece kısa/kararsız parçaları engeller.
  // Uzun ve anlamlı cümleleri kesmez; böylece ses alma hattını bozmaz.
  return looksLikeNoise ||
    value.length <= HANDS_FREE_NEAR_VOICE_SHORT_MAX_CHARS ||
    words.length <= HANDS_FREE_NEAR_VOICE_SHORT_MAX_WORDS;
}

function getHandsFreeVoiceGateStatus() {
  const threshold = Math.max(
    HANDS_FREE_MIN_RMS,
    handsFreeGateNoiseFloor + HANDS_FREE_NOISE_DELTA
  );

  return {
    enabled: HANDS_FREE_NEAR_VOICE_GATE_ENABLED,
    running: !!handsFreeGateAnalyser,
    ready: !!handsFreeGateReady,
    rms: Number(handsFreeGateLastRms.toFixed(4)),
    noiseFloor: Number(handsFreeGateNoiseFloor.toFixed(4)),
    threshold: Number(threshold.toFixed(4)),
    hotForMs: Math.max(0, handsFreeVoiceHotUntil - Date.now())
  };
}

function isHandsFreeUiBusy() {
  if (recordingSide) return true;
  // Pair Queue modunda çeviri/TTS arka planda yürürken mikrofon tekrar başlayabilsin.
  if (isHandsFreeModeEnabled()) return false;
  if (frameRoot?.classList.contains("is-listening")) return true;
  if (frameRoot?.classList.contains("is-translating")) return true;
  return false;
}

function isHandsFreeListening() {
  return isHandsFreeModeEnabled() && isValidFaceSide(recordingSide);
}

function getHandsFreeButtons() {
  return [];
}

function syncHandsFreeRuntimeUi() {
  const listening = isHandsFreeListening();
  document.body?.classList.toggle("handsfree-listening", listening);
  getHandsFreeButtons().forEach((btn) => btn.classList.toggle("listening", listening));

  const bothActive = isHandsFreeModeEnabled();
  [topMic, botMic].forEach((mic) => mic?.classList.toggle("handsfree-dual-active", bothActive));
  [topComposer, botComposer].forEach((composer) => composer?.classList.toggle("handsfree-dual-active", bothActive));
}

function syncHandsFreeToggleUi() {
  const enabled = isHandsFreeModeEnabled();
  getHandsFreeButtons().forEach((btn) => {
    btn.classList.toggle("active", enabled);
    btn.classList.toggle("on", enabled);
    btn.setAttribute("aria-pressed", enabled ? "true" : "false");
    btn.setAttribute("title", enabled ? "Eller Serbest açık" : "Eller Serbest kapalı");
  });
  document.body?.classList.toggle("handsfree-mode", enabled);
  syncHandsFreeRuntimeUi();
}

function stopHandsFreeLoop(opts = {}) {
  handsFreeRunId += 1;
  handsFreeStartPending = false;
  handsFreeEmptyEndCount = 0;
  handsFreeAudioGuardUntil = 0;
  clearHandsFreeTimers();
  handsFreeTranslateQueue = [];
  handsFreeQueueWorkerActive = false;
  handsFreeLastAccepted = { text: "", side: "", at: 0 };
  syncHandsFreeToggleUi();

  if (opts.stopCurrent && isValidFaceSide(recordingSide)) {
    try { stopRecognizer(); } catch {}
  }
}

function scheduleHandsFreeRestart(reason = "cycle", delay = DENEME_HANDS_FREE_RESTART_MS) {
  clearHandsFreeRestartTimer();
  if (!isHandsFreeModeEnabled()) return;

  const runId = handsFreeRunId;
  handsFreeRestartTimer = setTimeout(() => {
    handsFreeRestartTimer = null;
    if (runId !== handsFreeRunId || !isHandsFreeModeEnabled()) return;
    if (recordingSide) {
      scheduleHandsFreeRestart(`${reason}:mic-busy`, DENEME_HANDS_FREE_BUSY_RETRY_MS);
      return;
    }
    void startHandsFreeLoop(reason);
  }, Math.max(120, Number(delay) || DENEME_HANDS_FREE_RESTART_MS));
}

function scheduleHandsFreeMaxListenStop(side, sessionId, runId) {
  if (!isHandsFreeModeEnabled() || !isValidFaceSide(side)) return;

  clearHandsFreeMaxListenTimer();
  handsFreeMaxListenTimer = setTimeout(() => {
    handsFreeMaxListenTimer = null;

    if (!isHandsFreeModeEnabled()) return;
    if (runId !== handsFreeRunId) return;
    if (recordingSide !== side || sessionId !== recognitionSessionId) return;

    const finalCandidate = cleanupFinalTranscript(
      getPreviewText(side) || latestPreviewTranscript || liveTranscript || ""
    );

    if (finalCandidate && finalCandidate.length >= 2) {
      setTranslatingUI(side);
    }

    stopRecognizer();
  }, DENEME_HANDS_FREE_MAX_LISTEN_MS);
}

function scheduleHandsFreeSilenceStop(side, sessionId, runId) {
  if (!isHandsFreeModeEnabled() || !isValidFaceSide(side)) return;

  clearHandsFreeSilenceTimer();
  handsFreeSilenceTimer = setTimeout(() => {
    handsFreeSilenceTimer = null;

    if (!isHandsFreeModeEnabled()) return;
    if (runId !== handsFreeRunId) return;
    if (recordingSide !== side || sessionId !== recognitionSessionId) return;

    const finalCandidate = cleanupFinalTranscript(
      getPreviewText(side) || latestPreviewTranscript || liveTranscript || ""
    );
    if (!finalCandidate || finalCandidate.length < 2) return;

    setTranslatingUI(side);
    stopRecognizer();
  }, DENEME_HANDS_FREE_SILENCE_MS);
}

function handleHandsFreeCycleEnd(side, hadText, runId) {
  clearHandsFreeSilenceTimer();
  clearHandsFreeMaxListenTimer();
  syncHandsFreeRuntimeUi();

  if (!isValidFaceSide(side)) return;
  if (!isHandsFreeModeEnabled() || runId !== handsFreeRunId) return;

  if (hadText) {
    handsFreeEmptyEndCount = 0;
    // Çeviri ve TTS devam etse bile yeni konuşmayı kaçırmamak için yeniden dinlemeyi bekletme.
    scheduleHandsFreeRestart("after-final", DENEME_HANDS_FREE_RESTART_MS);
    return;
  }

  handsFreeEmptyEndCount += 1;
  if (handsFreeEmptyEndCount <= DENEME_HANDS_FREE_EMPTY_RESTART_LIMIT) {
    scheduleHandsFreeRestart("empty", 900);
    return;
  }

  setHandsFreeMode(false, { silent: true, stopCurrent: false });
  showToast("Eller Serbest beklemeye alındı");
}

async function startHandsFreeLoop(reason = "manual") {
  if (!isHandsFreeModeEnabled()) return false;
  if (handsFreeStartPending) return false;

  const runId = handsFreeRunId;
  const side = getHandsFreeSide();

  if (recordingSide) {
    if (recordingSide !== side) scheduleHandsFreeRestart(`${reason}:busy`, DENEME_HANDS_FREE_BUSY_RETRY_MS);
    return false;
  }

  handsFreeStartPending = true;

  try {
    await ensureReady();
    if (runId !== handsFreeRunId || !isHandsFreeModeEnabled()) return false;

    const premiumOk = await ensureCurrentFacePremiumModeAccess();
    if (!premiumOk) {
      setHandsFreeMode(false, { silent: true, stopCurrent: false });
      return false;
    }

    // Yakın Ses Filtresi best-effort çalışır. Başlatılamazsa Eller Serbest bozulmasın.
    await ensureHandsFreeVoiceGate();

    if (recordingSide) {
      scheduleHandsFreeRestart(`${reason}:mic-busy`, DENEME_HANDS_FREE_BUSY_RETRY_MS);
      return false;
    }

    const now = Date.now();
    const waitFor = Math.max(0, 320 - (now - handsFreeLastStartAt));
    if (waitFor) await wait(waitFor);

    if (runId !== handsFreeRunId || !isHandsFreeModeEnabled() || recordingSide) return false;

    handsFreeLastStartAt = Date.now();
    startRecording(side, { handsFree: true, runId });
    return true;
  } finally {
    handsFreeStartPending = false;
  }
}

function setHandsFreeMode(enabled, opts = {}) {
  if (!F2F_HANDS_FREE_FEATURE_ENABLED) {
    try { localStorage.setItem(DENEME_HANDS_FREE_MODE_KEY, "off"); } catch {}
    stopHandsFreeLoop({ stopCurrent: true });
    return;
  }
  const next = !!enabled;
  const previous = isHandsFreeModeEnabled();

  localStorage.setItem(DENEME_HANDS_FREE_MODE_KEY, next ? "on" : "off");
  syncHandsFreeToggleUi();

  if (next) {
    if (!previous) handsFreeRunId += 1;
    handsFreeEmptyEndCount = 0;
    handsFreeTranslateQueue = [];
    handsFreeQueueWorkerActive = false;
    handsFreeLastAccepted = { text: "", side: "", at: 0 };
    clearHandsFreeTimers();
    if (!opts.silent) showToast("Çift taraflı Eller Serbest açık");
    void startHandsFreeLoop("toggle");
    return;
  }

  stopHandsFreeLoop({ stopCurrent: !!opts.stopCurrent });
  stopHandsFreeVoiceGate();
  if (!opts.silent) showToast("Eller Serbest kapalı");
}

async function requestEnableHandsFreeMode(opts = {}) {
  showToast("Eller Serbest modu kaldırıldı.");
  try { localStorage.setItem(DENEME_HANDS_FREE_MODE_KEY, "off"); } catch {}
  return false;
}

async function requestEnableHandsFreeMode_DISABLED_OLD(opts = {}) {
  if (!F2F_HANDS_FREE_FEATURE_ENABLED) {
    try { localStorage.setItem(DENEME_HANDS_FREE_MODE_KEY, "off"); } catch {}
    stopHandsFreeLoop({ stopCurrent: true });
    showToast("Eller Serbest bu modülde kapalı");
    return false;
  }
  const status = await canEnableDualEarPro({
    currentRuntimeMode,
    recordingSide,
    activeSide,
    recognizer,
    frameRoot,
    bootReady,
    ...opts
  });

  if (!status?.ok) {
    setHandsFreeMode(false, { silent: true, stopCurrent: true });
    showDualEarProBlockedReason(status?.reason || "unknown_error", showToast);
    return false;
  }

  handsFreeTranslateQueue = [];
  handsFreeQueueWorkerActive = false;
  handsFreeLastAccepted = { text: "", side: "", at: 0 };
  setHandsFreeNextSide("bot");
  setHandsFreeMode(true);
  return true;
}

function bindHandsFreeToggle() {
  try { localStorage.setItem(DENEME_HANDS_FREE_MODE_KEY, "off"); } catch {}
  syncHandsFreeToggleUi();
}

window.f2fHandsFreeState = {
  isEnabled: isHandsFreeModeEnabled,
  setEnabled: (value, opts = {}) => {
    if (value) return requestEnableHandsFreeMode(opts);
    setHandsFreeMode(false, { stopCurrent: true, ...opts });
    return Promise.resolve(true);
  },
  start: () => startHandsFreeLoop("external"),
  stop: () => setHandsFreeMode(false, { stopCurrent: true }),
  sync: syncHandsFreeToggleUi,
  getNextSide: () => handsFreeNextSide,
  routeText: (text, side = handsFreeNextSide) => resolveHandsFreeSpeakerSide(text, side),
  queue: () => handsFreeTranslateQueue.map((item) => ({ id: item.id, side: item.side, length: item.text.length, ageMs: Date.now() - item.createdAt })),
  echoSimilarity: (a, b) => handsFreeTextSimilarity(a, b),
  nearVoice: getHandsFreeVoiceGateStatus,
};

function showUiModal(message, title = "Jeton Gerekli") {
  if (!uiModal) return;
  uiModalPurpose = "default";
  uiModalTitle.textContent = title;
  uiModalText.textContent = message;
  uiModal.classList.add("open");
}

function showInsufficientTokens() {
  showUiModal(
    "Yetersiz jeton bakiyesi. L\u00fctfen Jeton Market\u2019ten y\u00fckleme yap\u0131n.",
    "Jeton Gerekli"
  );
  uiModalPurpose = "tokens";
  if (uiModalGo) uiModalGo.textContent = "Jeton Market";
  uiModalGo?.classList.remove("cultural-info-primary");
  if (uiModalClose) uiModalClose.textContent = "Atla";
}

function updateTokensFromTranslationResponse(json) {
  const tokensAfter = Number(json?.tokens_after ?? json?.wallet?.tokens_after);
  if (Number.isFinite(tokensAfter)) {
    try { setHeaderTokens(tokensAfter); } catch (e) { console.debug("[deneme cultural tokens]", e); }
  }

}

function translationError(code, message, status = 0, detail = null) {
  const err = new Error(message || code || "translation_failed");
  err.code = code || "TRANSLATION_FAILED";
  err.status = status;
  err.detail = detail;
  return err;
}

function handleTranslateError(error, latestRow, latestTxt) {
  const wasHandsFree = isHandsFreeModeEnabled();
  setErrorUI();

  if (error?.code === "INSUFFICIENT_TOKENS") {
    if (wasHandsFree) setHandsFreeMode(false, { silent: true, stopCurrent: false });
    latestRow?.remove?.();
    showInsufficientTokens();
    return true;
  }

  if (latestTxt) latestTxt.textContent = "Ceviri su anda tamamlanamadi";
  showToast("Ceviri su anda tamamlanamadi. Lutfen tekrar deneyin.");

  if (wasHandsFree) {
    bounceToReady(500);
    scheduleHandsFreeRestart("translate-error", 500);
  } else {
    bounceToReady(1200);
  }

  return true;
}

function closeUiModal() {
  uiModal?.classList.remove("open");
  uiModalPurpose = "default";
  if (uiModalGo) uiModalGo.textContent = "\u00dcyelik Paketlerini G\u00f6r";
  uiModalGo?.classList.remove("cultural-info-primary");
  if (uiModalClose) uiModalClose.textContent = "Atla";
}

uiModalGo?.addEventListener("click", () => {
  if (uiModalPurpose === "cultural_info") {
    localStorage.setItem(DENEME_CULTURAL_INFO_SEEN_KEY, "1");
    closeUiModal();
    return;
  }

  location.href = "/pages/jetonbuy.html";
});
uiModalClose?.addEventListener("click", () => {
  if (uiModalPurpose === "cultural_info") {
    setCulturalMode(false);
  }
  closeUiModal();
});
uiModal?.addEventListener("click", (e) => {
  if (e.target === uiModal) closeUiModal();
});

function getResolvedFaceVoice() {
  const mode = String(localStorage.getItem(F2F_VOICE_KEY) || "auto").trim().toLowerCase();
  const preset = String(localStorage.getItem(F2F_PRESET_KEY) || "").trim().toLowerCase();

  if (mode === "mine" || mode === "clone") return "mine";
  if (mode === "second") return "second";
  if (mode === "memory") return "memory";

  if (mode === "preset") {
    if (preset === "second") return "second";
    if (preset === "memory") return "memory";
  }

  return "auto";
}

function getFaceVoiceMode() {
  return getResolvedFaceVoice();
}

function getFaceTranslateMode() {
  return isCulturalModeEnabled() ? "cultural" : "normal";
}

function isPaidFaceTextMode() {
  return false;
}

async function hasReadyVoiceProfile() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        voice_sample_path,
        tts_voice_ready,
        tts_voice_id,
        second_voice_sample_path,
        second_tts_voice_ready,
        second_tts_voice_id,
        memory_voice_sample_path,
        memory_tts_voice_ready,
        memory_tts_voice_id
      `)
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return false;

    const mode = getResolvedFaceVoice();
    if (mode === "mine") {
      return !!data.voice_sample_path || (!!data.tts_voice_ready && !!String(data.tts_voice_id || "").trim());
    }
    if (mode === "second") {
      return !!data.second_voice_sample_path || (!!data.second_tts_voice_ready && !!String(data.second_tts_voice_id || "").trim());
    }
    if (mode === "memory") {
      return !!data.memory_voice_sample_path || (!!data.memory_tts_voice_ready && !!String(data.memory_tts_voice_id || "").trim());
    }
    return false;
  } catch {
    return false;
  }
}

function isPaidFaceVoiceMode() {
  const v = getResolvedFaceVoice();
  return v === "mine" || v === "second" || v === "memory";
}

async function ensureCurrentFacePremiumModeAccess() {
  const needsPremium = isPaidFaceVoiceMode();
  if (!needsPremium) return true;
  return await ensureFaceToFacePremiumAccess();
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

  const angryWords = ["saçma", "yeter", "sinir", "nefret", "rezalet", "berbat"];
  const sadWords = ["üzgün", "kötüyüm", "moralim bozuk", "yoruldum"];
  const happyWords = ["harika", "süper", "müthiş", "çok iyi", "sevindim"];
  const excitedWords = ["inanamıyorum", "şahane", "wow", "efsane", "heyecanlıyım"];

  const hasAny = (arr) => arr.some((w) => s.includes(w));

  if (hasAny(angryWords) || exclamations >= 2) return "angry";
  if (hasAny(sadWords)) return "sad";
  if (hasAny(excitedWords)) return "excited";
  if (hasAny(happyWords)) return "happy";
  if (exclamations === 1) return "excited";

  return "neutral";
}

function pointOrbTo(side) {
  frameRoot?.classList.remove("to-top", "to-bot");
  centerHub?.classList.remove("to-top", "to-bot");

  if (side === "top") {
    frameRoot?.classList.add("to-top");
    centerHub?.classList.add("to-top");
  } else {
    frameRoot?.classList.add("to-bot");
    centerHub?.classList.add("to-bot");
  }
}

function setMicState(side, state) {
  const mic = side === "top" ? topMic : botMic;
  const composer = side === "top" ? topComposer : botComposer;
  if (!mic || !composer) return;

  mic.classList.remove("listening", "recorded");
  composer.classList.remove("listening");

  if (state === "listening") {
    mic.classList.add("listening");
    composer.classList.add("listening");
  }

  if (state === "recorded") {
    mic.classList.add("recorded");
  }
}

function resetMics() {
  topMic?.classList.remove("listening", "recorded");
  botMic?.classList.remove("listening", "recorded");
  topComposer?.classList.remove("listening");
  botComposer?.classList.remove("listening");
}

function setFrameVisual(state) {
  if (!frameRoot) return;
  frameRoot.classList.remove("is-idle", "is-listening", "is-translating", "is-ready", "is-error");
  if (state) frameRoot.classList.add(`is-${state}`);
}

function setInputPlaceholder(side, value = "") {
  const input = side === "top" ? topInput : botInput;
  if (!input) return;
  input.placeholder = value;
}

function restoreInputPlaceholder(side) {
  const lang = side === "top" ? topLang : botLang;
  setInputPlaceholder(side, getPlaceholder(lang));
}

function setSystemReadyUI() {
  activeSide = null;
  resetMics();
  setFrameVisual("ready");
  restoreInputPlaceholder("top");
  restoreInputPlaceholder("bot");
  if (isHandsFreeModeEnabled()) syncHandsFreeRuntimeUi();
}

function setSystemPreparingUI() {
  activeSide = null;
  resetMics();
  setFrameVisual("error");
}

function setListeningUI(side) {
  activeSide = side;
  pointOrbTo(side);
  resetMics();
  setMicState(side, "listening");
  setFrameVisual("listening");
  setInputPlaceholder(side, "");
}

function setTranslatingUI(side) {
  activeSide = side;
  pointOrbTo(side);
  setMicState(side, "recorded");
  setFrameVisual("translating");
}

function setErrorUI() {
  activeSide = null;
  resetMics();
  setFrameVisual("error");
  restoreInputPlaceholder("top");
  restoreInputPlaceholder("bot");
}

function bounceToReady(delay = 1200) {
  setTimeout(() => setSystemReadyUI(), delay);
}

function refreshLangLabels() {
  if (topLangTxt) topLangTxt.textContent = labelChip(topLang);
  if (botLangTxt) botLangTxt.textContent = labelChip(botLang);

  if (topInput && recordingSide !== "top") topInput.placeholder = getPlaceholder(topLang);
  if (botInput && recordingSide !== "bot") botInput.placeholder = getPlaceholder(botLang);
}

function closeAllPop() {
  popTop?.classList.remove("show");
  popBot?.classList.remove("show");
}

function openOfflineRequiredPopup(message = "Önce dil yüklemeniz gereklidir.") {
  if (offlineRequiredTitle) offlineRequiredTitle.textContent = "Dil yüklemeniz gerekli";
  if (offlineRequiredText) offlineRequiredText.textContent = message;
  offlineRequiredBackdrop?.classList.add("show");
}

function closeOfflineRequiredPopup() {
  offlineRequiredBackdrop?.classList.remove("show");
}

function syncModeUi() {
  const online = currentRuntimeMode === "online";

  [topModeToggle, botModeToggle].forEach((el) => {
    if (!el) return;
    el.classList.toggle("online", online);
    el.classList.toggle("offline", !online);
  });

  if (topModeToggleLabel) topModeToggleLabel.textContent = online ? "ONLINE" : "OFFLINE";
  if (botModeToggleLabel) botModeToggleLabel.textContent = online ? "ONLINE" : "OFFLINE";

  localStorage.setItem(F2F_MODE_KEY, currentRuntimeMode);
}

function getOfflinePickerPool() {
  const native = canonical(botLang || getPreferredBaseLang());
  const all = getAllInstalledOfflineLangs();
  const set = new Set(all);
  if (native) set.add(native);
  return Array.from(set).filter(Boolean);
}

function applyOfflineStartLayout() {
  const base = canonical(localStorage.getItem(F2F_BOT_LANG_KEY) || getPreferredBaseLang());
  const pool = getOfflinePickerPool();
  offlinePickerPool = pool;

  botLang = base || "en";
  if (!langExists(botLang)) botLang = getPreferredBaseLang();
  if (!langExists(botLang)) botLang = "en";

  topLang = resolveInitialTopLang(botLang);

  window.topLang = topLang;
  window.botLang = botLang;
  persistFaceToFaceLangs();
  refreshLangLabels();
}

function setModeOnline() {
  currentRuntimeMode = "online";
  syncModeUi();
  refreshLangLabels();
}

function setModeOffline() {
  currentRuntimeMode = "offline";
  applyOfflineStartLayout();
  syncModeUi();
}

function tryEnableOfflineMode() {
  const pool = getOfflinePickerPool();

  if (!pool.length || pool.length < 1) {
    openOfflineRequiredPopup("Önce offline dillerden en az bir dil yüklemeniz gereklidir.");
    setModeOnline();
    return false;
  }

  applyOfflineStartLayout();

  if (!hasInstalledOfflinePair(topLang, botLang) && canonical(topLang) !== canonical(botLang)) {
    openOfflineRequiredPopup("Seçili dil çifti offline kullanım için hazır değil.");
    setModeOnline();
    return false;
  }

  setModeOffline();
  showToast("Offline mod hazır");
  return true;
}

function renderPop(side) {
  const list = side === "top" ? listTop : listBot;
  if (!list) return;

  let pool = LANGS;

  if (currentRuntimeMode === "offline") {
    const allowed = new Set(getOfflinePickerPool());
    pool = LANGS.filter((l) => allowed.has(canonical(l.code)));
  }

  const sel = side === "top" ? topLang : botLang;

  list.innerHTML = pool.map((l) => {
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
      const code = canonical(el.dataset.code || "en");

      if (side === "top") {
        topLang = code;
        if (canonical(topLang) === canonical(botLang)) {
          topLang = getDifferentPairLang(botLang);
        }
        window.topLang = topLang;
      } else {
        botLang = code;
        window.botLang = botLang;

        if (canonical(topLang) === canonical(botLang)) {
          topLang = getDifferentPairLang(botLang);
        }
        window.topLang = topLang;
      }

      persistFaceToFaceLangs();

      if (currentRuntimeMode === "offline" && !hasInstalledOfflinePair(topLang, botLang) && canonical(topLang) !== canonical(botLang)) {
        showToast("Bu iki dil arasında offline çeviri hazır değil");
      }

      refreshLangLabels();
      renderKeyboard("top");
      renderKeyboard("bot");
      closeAllPop();
    });
  });
}

function stopAudio() {
  speakRunId += 1;

  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
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

function autoResizeTextarea(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 84)}px`;
}

function syncComposerButtons(side) {
  const input = side === "top" ? topInput : botInput;
  const mic = side === "top" ? topMic : botMic;
  const send = side === "top" ? topSend : botSend;
  if (!input || !mic || !send) return;

  const hasText = String(input.value || "").trim().length > 0;
  mic.classList.toggle("hidden", hasText);
  send.classList.toggle("hidden", !hasText);
}

function syncAllComposerButtons() {
  syncComposerButtons("top");
  syncComposerButtons("bot");
}

function hideAltMenu() {
  altMenuEl?.remove();
  altMenuEl = null;
  clearTimeout(holdTimer);
  holdTimer = null;
}

function ensureKeyboardAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;

    if (!keyboardAudioCtx) {
      keyboardAudioCtx = new Ctx();
      keyboardMasterGain = keyboardAudioCtx.createGain();
      keyboardMasterGain.gain.value = 0.045;
      keyboardMasterGain.connect(keyboardAudioCtx.destination);
    }

    return keyboardAudioCtx;
  } catch {
    return null;
  }
}

async function unlockKeyboardAudio() {
  const ctx = ensureKeyboardAudio();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") await ctx.resume();
  } catch {}
}

function playKeyClick(kind = "key") {
  const ctx = ensureKeyboardAudio();
  if (!ctx || !keyboardMasterGain) return;

  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = "highpass";
  filter.frequency.value =
    kind === "space" ? 900 :
    kind === "backspace" ? 1450 :
    kind === "shift" ? 1250 : 1180;

  osc.type = kind === "space" ? "triangle" : "square";
  osc.frequency.setValueAtTime(
    kind === "space" ? 460 :
    kind === "backspace" ? 700 :
    kind === "shift" ? 620 : 560,
    now
  );
  osc.frequency.exponentialRampToValueAtTime(
    kind === "space" ? 310 : 220,
    now + 0.028
  );

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(kind === "space" ? 0.026 : 0.022, now + 0.003);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(keyboardMasterGain);

  try {
    osc.start(now);
    osc.stop(now + 0.035);
  } catch {}
}

function buildTtsCacheKey(text, langCode, tone = "neutral") {
  const voice = getResolvedFaceVoice();

  return JSON.stringify({
    t: String(text || "").trim(),
    l: canonical(langCode),
    v: voice,
    n: canonTone(tone)
  });
}

const TTS_CENSORED_TOKEN_RE = /(^|[^A-Za-zÇĞİÖŞÜçğıöşü0-9_])([A-Za-zÇĞİÖŞÜçğıöşü0-9]?\*{3,}[A-Za-zÇĞİÖŞÜçğıöşü0-9]?)(?=$|[^A-Za-zÇĞİÖŞÜçğıöşü0-9_])/g;
const TTS_CENSORED_HAS_LETTER_RE = /[A-Za-zÇĞİÖŞÜçğıöşü0-9]/;

function sanitizeCensoredTextForTts(text) {
  const value = String(text || "");

  return value.replace(TTS_CENSORED_TOKEN_RE, (match, prefix, token) => {
    const starCount = (token.match(/\*/g) || []).length;
    if (!TTS_CENSORED_HAS_LETTER_RE.test(token) && starCount < 4) return match;
    const beepCount = Math.max(1, Math.ceil(starCount / 2));
    return `${prefix}${Array(beepCount).fill("bip").join(" ")}`;
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

  await warmAudio();
  if (runId !== speakRunId) return false;

  const audio = new Audio(audioSrc);
  audio.preload = "auto";
  audio.playsInline = true;
  audio.crossOrigin = "anonymous";

  currentAudio = audio;

  audio.onended = () => {
    if (currentAudio === audio) currentAudio = null;
  };

  audio.onerror = () => {
    if (currentAudio === audio) currentAudio = null;
  };

  await audio.play();
  return true;
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

function chooseWebVoice(langCode) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const bcp = langObj(langCode).bcp.toLowerCase();
  const langBase = canonical(langCode);

  let pool = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith(langBase));
  if (!pool.length) pool = voices.filter((v) => String(v.lang || "").toLowerCase() === bcp);
  return pool[0] || voices[0] || null;
}

async function speakViaApi(text, langCode, tone = "neutral") {
  if (!isFaceAutoReadEnabled()) return false;

  const value = String(text || "").trim();
  if (!value) return false;

  const myRunId = ++speakRunId;
  const userId = await getCurrentUserId();
  const selectedVoice = getResolvedFaceVoice();

  if (!userId) throw new Error("USER_ID_MISSING");

  const { data: { session } = {} } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  const accessToken = session?.access_token || "";

  let apiVoiceMode = "auto";
  let apiVoice = "auto";
  let apiPresetVoice = "";

  if (selectedVoice === "mine") {
    apiVoiceMode = "clone";
    apiVoice = "clone";
  } else if (selectedVoice === "second") {
    apiVoiceMode = "preset";
    apiVoice = "second";
    apiPresetVoice = "second";
  } else if (selectedVoice === "memory") {
    apiVoiceMode = "preset";
    apiVoice = "memory";
    apiPresetVoice = "memory";
  }

  const payload = {
    text: value,
    lang: canonical(langCode),
    user_id: userId,
    module: "facetoface",
    voice: apiVoice,
    voice_mode: apiVoiceMode,
    preset_voice: apiPresetVoice,
    selected_voice: selectedVoice,
    tone: canonTone(tone),
  };

  const r = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {})
    },
    body: JSON.stringify(payload),
  });

  if (myRunId !== speakRunId) return false;

  const j = await r.json().catch(() => null);

  if (!r.ok || !j?.ok || !j?.audio_base64) {
    throw new Error(j?.error || j?.detail || `TTS_${r.status}`);
  }

  const audioSrc = `data:audio/mp3;base64,${j.audio_base64}`;
  rememberTtsCache(buildTtsCacheKey(value, langCode, tone), audioSrc);

  return await playCachedAudio(audioSrc, myRunId);
}

function speakFallback(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return false;

  try {
    if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
      window.NativeTTS.speak(value, canonical(langCode));
      return true;
    }
  } catch {}

  if (!window.speechSynthesis) return false;

  try {
    window.speechSynthesis.cancel();
  } catch {}

  try {
    const u = new SpeechSynthesisUtterance(value);
    u.lang = langObj(langCode).bcp;
    u.rate = 0.95;
    u.pitch = 1;
    const voice = chooseWebVoice(langCode);
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

async function speak(text, langCode, tone = "neutral") {
  if (!isFaceAutoReadEnabled()) return;

  const value = String(text || "").trim();
  if (!value) return;
  if (isHandsFreeModeEnabled()) rememberHandsFreeTts(value);
  const spokenValue = sanitizeCensoredTextForTts(value);

  stopAudio();
  await warmAudio();

  const selectedVoice = getResolvedFaceVoice();
  const cacheKey = buildTtsCacheKey(spokenValue, langCode, tone);
  const cachedAudio = ttsMemoryCache.get(cacheKey);

  if (cachedAudio) {
    try {
      const ok = await playCachedAudio(cachedAudio, ++speakRunId);
      if (ok) return;
    } catch {
      showToast("Offline Ã§eviri baÅŸarÄ±sÄ±z");
      return null;
    }
  }

  const wantsApiVoice = ["mine", "second", "memory"].includes(selectedVoice);

  if (wantsApiVoice) {
    const ready = await hasReadyVoiceProfile();

    if (!ready) {
      if (selectedVoice === "mine") showToast("Kendi Sesim hazır değil");
      else if (selectedVoice === "second") showToast("2. Ses hazır değil");
      else if (selectedVoice === "memory") showToast("Hatıra Sesi hazır değil");
      return;
    }

    try {
      const ok = await speakViaApi(spokenValue, langCode, tone);
      if (ok) return;
    } catch (e) {
      console.warn("[facetoface custom voice failed]", e);

      if (selectedVoice === "mine") showToast("Kendi Sesim şu anda üretilemedi");
      else if (selectedVoice === "second") showToast("2. Ses şu anda üretilemedi");
      else if (selectedVoice === "memory") showToast("Hatıra Sesi şu anda üretilemedi");
    }
  }

  const fallbackOk = speakFallback(spokenValue, langCode);
  if (!fallbackOk) showToast("Hoparlör sesi başlatılamadı");
}

function addBubble(side, kind, text, opts = {}) {
  const wrap = side === "top" ? topBody : botBody;
  if (!wrap) return null;

  const row = document.createElement("div");
  row.className = `bubble ${kind}${opts.latest ? " is-latest" : ""}${opts.preview ? " preview" : ""}`;

  const inner = document.createElement("div");
  inner.className = "bubble-row";

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "").trim();

  if ((opts.withSpeaker || kind === "me") && !opts.preview) {
    inner.appendChild(createSpeakerButton(() => txt.textContent || "", opts.speakLang || "en", opts.speakTone || "neutral"));
  }

  inner.appendChild(txt);
  row.appendChild(inner);
  wrap.appendChild(row);
  keepLatestVisible(side);
  requestAnimationFrame(syncClearTrashMeter);
  return row;
}

function clearLatest(side) {
  const wrap = side === "top" ? topBody : botBody;
  if (!wrap) return;
  wrap.querySelectorAll(".bubble.me.is-latest").forEach((el) => el.classList.remove("is-latest"));
}

function offlineTranslateRequest(payload) {
  return new Promise((resolve) => {
    if (!window.OfflineTranslate?.translate) {
      resolve({ ok: false, error: "offline_engine_missing" });
      return;
    }

    let timeoutId;

    const handler = (e) => {
      clearTimeout(timeoutId);
      resolve(e.detail || null);
    };

    timeoutId = setTimeout(() => {
      window.removeEventListener("offlineTranslateResult", handler);
      resolve({ ok: false, error: "offline_translate_timeout" });
    }, 12000);

    window.addEventListener("offlineTranslateResult", handler, { once: true });

    try {
      window.OfflineTranslate.translate(JSON.stringify(payload));
    } catch {
      clearTimeout(timeoutId);
      window.removeEventListener("offlineTranslateResult", handler);
      resolve({ ok: false, error: "offline_translate_failed" });
    }
  });
}

async function translateText(text, from, to, tone = "neutral", context = {}) {
  const src = canonical(from);
  const dst = canonical(to);

  if (currentRuntimeMode === "offline") {
    try {
      const offlineRaw = await offlineTranslateRequest({
        from: src,
        to: dst,
        text: String(text || "").trim(),
        sourceLang: src,
        targetLang: dst,
        source: src,
        target: dst,
        tone: canonTone(tone),
        side: context.side || "",
        targetSide: context.targetSide || "",
        messageId: context.messageId || `${Date.now()}_${Math.random().toString(36).slice(2)}`
      });

      const offlineValue = String(offlineRaw?.translatedText || "").trim();
      if (offlineRaw?.ok && offlineValue) return offlineValue;

      const offlineError = String(offlineRaw?.error || "");
      if (offlineError === "offline_engine_missing") showToast("Offline ceviri motoru bulunamadi");
      else if (offlineError === "offline_translate_timeout") showToast("Offline ceviri yanit vermedi");
      else if (offlineError === "offline_license_required") showToast("Offline ceviri icin lisans dogrulanamadi");
      else showToast("Offline ceviri basarisiz");
      return null;
    } catch {
      showToast("Offline ceviri basarisiz");
      return null;
    }
  }

  const { data: { session } = {} } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  const accessToken = session?.access_token || "";

  const endpoints = [
    `${API_BASE}/api/translate_ai`,
    `${API_BASE}/api/translate-ai`,
    `${API_BASE}/api/translate`
  ];

  for (const endpoint of endpoints) {
    try {
      const culturalMode = isCulturalModeEnabled();
      const payload = {
        text: String(text || "").trim(),
        from_lang: src,
        to_lang: dst,
        source: src,
        target: dst,
        tone: canonTone(tone),
      };

      if (culturalMode) {
        payload.surface = "facetoface_demo";
        payload.mode = "cultural";
        payload.use_ai = true;
        payload.cultural = true;
        payload.style = "cultural";
      }

      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(payload),
      });

      const j = await r.json().catch(() => null);
      if (r.status === 402) {
        console.warn("[deneme cultural insufficient tokens]", j);
        throw translationError("INSUFFICIENT_TOKENS", "insufficient_tokens", r.status, j);
      }

      if (!r.ok) {
        if (r.status >= 500 || r.status === 503) {
          throw translationError("TRANSLATION_UNAVAILABLE", "translation_unavailable", r.status, j);
        }
        continue;
      }

      const value = String(j?.translated || j?.translation || j?.text || "").trim();
      if (value) {
        if (culturalMode) updateTokensFromTranslationResponse(j);
        return value;
      }
    } catch (e) {
      if (e?.code === "INSUFFICIENT_TOKENS" || e?.code === "TRANSLATION_UNAVAILABLE") throw e;
    }
  }

  return null;
}

const OFFLINE_SPEECH_NOT_READY_MESSAGE = "Offline konu\u015fma tan\u0131ma haz\u0131r de\u011fil";

function buildSpeechResultEvent(text, isFinal = true) {
  const item = [{ transcript: String(text || "") }];
  item.isFinal = !!isFinal;
  return { results: [item] };
}

function bindOfflineSpeechEvents() {
  if (offlineSpeechEventsBound) return;
  offlineSpeechEventsBound = true;

  const prevNativeResult = window.onNativeSpeechResult;
  window.onNativeSpeechResult = (side, text, isFinal = true) => {
    try { prevNativeResult?.(side, text, isFinal); } catch {}
    const rec = activeOfflineSpeechRecognizer;
    if (rec && rec.side === side) rec.emitResult(text, isFinal !== false);
  };

  const prevNativeError = window.onNativeSpeechError;
  window.onNativeSpeechError = (error) => {
    try { prevNativeError?.(error); } catch {}
    activeOfflineSpeechRecognizer?.handleNativeError(error);
  };

  window.addEventListener("offlineSpeechPartial", (e) => {
    const d = e.detail || {};
    const rec = activeOfflineSpeechRecognizer;
    if (rec && rec.side === d.side) rec.emitResult(d.text, false);
  });

  window.addEventListener("offlineSpeechResult", (e) => {
    const d = e.detail || {};
    const rec = activeOfflineSpeechRecognizer;
    if (rec && rec.side === d.side) rec.emitResult(d.text, true);
  });

  window.addEventListener("offlineSpeechError", (e) => {
    const d = e.detail || {};
    const rec = activeOfflineSpeechRecognizer;
    if (!rec || (d.side && rec.side !== d.side)) return;
    rec.fail(d.error || "offline_speech_error");
  });

  window.addEventListener("offlineSpeechStopped", (e) => {
    const d = e.detail || {};
    const rec = activeOfflineSpeechRecognizer;
    if (!rec || (d.side && rec.side !== d.side)) return;
    rec.finish();
  });
}

function buildOfflineRecognizer(langCode, side) {
  const lang = canonical(langCode);
  const bcp = langObj(lang).bcp;
  const nativeStart = window.Native?.startSpeechRecognition || window.Native?.startNativeSpeechRecognition;
  const nativeStop = window.Native?.stopSpeechRecognition || window.Native?.stopNativeSpeechRecognition;
  const offline = window.OfflineSpeech;

  if (!nativeStart && !offline?.start) return null;

  bindOfflineSpeechEvents();

  return {
    lang: bcp,
    side,
    mode: "",
    ended: false,
    onstart: null,
    onresult: null,
    onerror: null,
    onend: null,
    start() {
      activeOfflineSpeechRecognizer = this;
      this.onstart?.();

      if (nativeStart) {
        this.mode = "native";
        try {
          nativeStart.call(window.Native, bcp, side);
          return;
        } catch {}
      }

      if (!this.startOfflineFallback()) {
        this.fail("offline_speech_not_ready");
      }
    },
    stop() {
      try {
        if (this.mode === "native") nativeStop?.call(window.Native);
        else if (this.mode === "offline") offline?.stop?.();
      } catch {}
      setTimeout(() => this.finish(), 700);
    },
    emitResult(text, isFinal = true) {
      const value = String(text || "").trim();
      if (!value || this.ended) return;
      this.onresult?.(buildSpeechResultEvent(value, isFinal));
      if (isFinal) this.finish();
    },
    handleNativeError() {
      if (this.ended) return;
      if (this.mode === "native" && this.startOfflineFallback()) return;
      this.fail("offline_speech_not_ready");
    },
    startOfflineFallback() {
      if (!offline?.start) return false;
      try {
        if (offline.isReady && !offline.isReady(lang)) return false;
        this.mode = "offline";
        offline.start(lang, side);
        return true;
      } catch {
        return false;
      }
    },
    finish() {
      if (this.ended) return;
      this.ended = true;
      if (activeOfflineSpeechRecognizer === this) activeOfflineSpeechRecognizer = null;
      this.onend?.();
    },
    fail(error) {
      if (this.ended) return;
      this.ended = true;
      if (activeOfflineSpeechRecognizer === this) activeOfflineSpeechRecognizer = null;
      this.onerror?.({ error });
    }
  };
}

function buildRecognizer(langCode, side = "") {
  if (currentRuntimeMode === "offline") return buildOfflineRecognizer(langCode, side);

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
  return String(body?.querySelector(".bubble.preview .txt")?.textContent || "").trim();
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
    if (prev && prev.startsWith(chunk)) continue;

    pieces.push(chunk);
  }

  return pieces.join(" ").replace(/\s+/g, " ").trim();
}

function cleanupFinalTranscript(text) {
  return String(text || "").replace(/\s+/g, " ").replace(/\b(\S+)( \1\b)+/gi, "$1").trim();
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

  const latestRow = addBubble(other, "me", "Çevriliyor...", {
    latest: true,
    speakLang: dst,
    speakTone: sourceTone,
  });

  const latestTxt = latestRow?.querySelector(".txt");
  let tr = "";
  try {
    tr = await translateText(cleaned, src, dst, sourceTone, { side, targetSide: other });
  } catch (e) {
    handleTranslateError(e, latestRow, latestTxt);
    return;
  }

  if (!tr) {
    setErrorUI();
    if (latestTxt) latestTxt.textContent = "⚠️ Çeviri hatası";
    bounceToReady(1200);
    return;
  }

  if (latestTxt) {
    latestTxt.textContent = "";
    await typewriteText(latestTxt, tr, other);
    await speak(tr, dst, sourceTone);
  }

  setSystemReadyUI();
}

async function finalizeTypedMessage(side, rawText) {
  const text = cleanupFinalTranscript(rawText);
  if (!text) return;

  const src = side === "top" ? topLang : botLang;
  const dst = side === "top" ? botLang : topLang;
  const other = side === "top" ? "bot" : "top";
  const tone = detectToneFromText(text);

  addBubble(side, "them", text);
  clearLatest(other);
  setTranslatingUI(side);

  const latestRow = addBubble(other, "me", "Çevriliyor...", {
    latest: true,
    speakLang: dst,
    speakTone: tone,
  });

  const latestTxt = latestRow?.querySelector(".txt");
  let tr = "";
  try {
    tr = await translateText(text, src, dst, tone, { side, targetSide: other });
  } catch (e) {
    handleTranslateError(e, latestRow, latestTxt);
    return;
  }

  if (!tr) {
    setErrorUI();
    if (latestTxt) latestTxt.textContent = "⚠️ Çeviri hatası";
    bounceToReady(1200);
    return;
  }

  if (latestTxt) {
    latestTxt.textContent = "";
    await typewriteText(latestTxt, tr, other);
    await speak(tr, dst, tone);
  }

  setSystemReadyUI();
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
    syncClearTrashMeter();

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

  await unlockKeyboardAudio();
}

function startRecording(side, opts = {}) {
  hideKeyboards();
  setInputPlaceholder(side, "");

  const handsFreeSession = !!opts.handsFree && isValidFaceSide(side);
  const handsFreeRun = Number(opts.runId || handsFreeRunId);
  const lang = side === "top" ? topLang : botLang;
  const rec = buildRecognizer(lang, side);

  if (!rec) {
    if (handsFreeSession) {
      setHandsFreeMode(false, { silent: true, stopCurrent: false });
    }

    setErrorUI();
    if (currentRuntimeMode === "offline") {
      showToast(OFFLINE_SPEECH_NOT_READY_MESSAGE);
      bounceToReady(1800);
      return;
    }
    showToast("Bu cihazda konuşma algılama desteklenmiyor");
    bounceToReady(1800);
    return;
  }

  const mySessionId = ++recognitionSessionId;
  let recognitionFinished = false;
  let handsFreeNearVoiceSeenInSession = false;
  let handsFreeCommandCandidateSeen = false;

  const markFinished = () => {
    if (recognitionFinished) return false;
    recognitionFinished = true;
    return true;
  };

  recognizer = rec;
  recordingSide = side;
  liveTranscript = "";
  latestPreviewTranscript = "";

  if (handsFreeSession) {
    clearHandsFreeTimers();
    syncHandsFreeRuntimeUi();
  }

  rec.onstart = () => {
    setListeningUI(side);
    if (handsFreeSession) {
      syncHandsFreeRuntimeUi();
      setInputPlaceholder(side, "Eller Serbest dinliyor…");
      scheduleHandsFreeMaxListenStop(side, mySessionId, handsFreeRun);
    }
  };

  rec.onresult = (e) => {
    if (mySessionId !== recognitionSessionId) return;

    const builtText = buildStableTranscript(e.results);
    if (!builtText) return;

    if (handsFreeSession && isHandsFreeNearVoiceActive()) {
      handsFreeNearVoiceSeenInSession = true;
    }

    liveTranscript = builtText;
    latestPreviewTranscript = builtText;

    const body = side === "top" ? topBody : botBody;
    let previewNode = body?.querySelector(".bubble.preview");

    if (!previewNode) {
      previewNode = addBubble(side, "them", "", { preview: true });
    }

    const txtEl = previewNode?.querySelector(".txt");
    if (txtEl) txtEl.textContent = builtText;
    keepLatestVisible(side);

    if (handsFreeSession && !handsFreeCommandCandidateSeen && parseHandsFreeVoiceCommand(builtText)) {
      handsFreeCommandCandidateSeen = true;
      latestPreviewTranscript = builtText;
      try { stopRecognizer(); } catch {}
      return;
    }

    if (handsFreeSession) {
      scheduleHandsFreeSilenceStop(side, mySessionId, handsFreeRun);
    }
  };

  rec.onerror = (e) => {
    if (mySessionId !== recognitionSessionId) return;
    if (!markFinished()) return;

    clearHandsFreeSilenceTimer();
    clearHandsFreeMaxListenTimer();

    const errorCode = String(e?.error || "").toLowerCase();
    const body = side === "top" ? topBody : botBody;
    body?.querySelector(".bubble.preview")?.remove();

    recognizer = null;
    recordingSide = null;
    liveTranscript = "";
    latestPreviewTranscript = "";

    if (handsFreeSession && (errorCode === "no-speech" || errorCode === "aborted")) {
      setSystemReadyUI();
      handleHandsFreeCycleEnd(side, false, handsFreeRun);
      return;
    }

    if (currentRuntimeMode === "offline") {
      showToast(OFFLINE_SPEECH_NOT_READY_MESSAGE);
      setErrorUI();
      bounceToReady(1600);
      if (handsFreeSession) setHandsFreeMode(false, { silent: true, stopCurrent: false });
      return;
    }

    if (handsFreeSession && !errorCode.includes("not-allowed") && !errorCode.includes("permission")) {
      setSystemReadyUI();
      handleHandsFreeCycleEnd(side, false, handsFreeRun);
      return;
    }

    if (errorCode.includes("not-allowed") || errorCode.includes("permission")) showToast("Mikrofon izni gerekli");
    else showToast("Mikrofon hatası");

    setErrorUI();
    bounceToReady(1600);
    if (handsFreeSession) setHandsFreeMode(false, { silent: true, stopCurrent: false });
  };

  rec.onend = () => {
    if (mySessionId !== recognitionSessionId) return;
    if (!markFinished()) return;

    clearHandsFreeSilenceTimer();
    clearHandsFreeMaxListenTimer();

    const sideAtEnd = side;
    const finalText = cleanupFinalTranscript(
      getPreviewText(sideAtEnd) || latestPreviewTranscript || liveTranscript || ""
    );

    recognizer = null;
    recordingSide = null;

    (sideAtEnd === "top" ? topBody : botBody)?.querySelector(".bubble.preview")?.remove();

    liveTranscript = "";
    latestPreviewTranscript = "";

    if (finalText) {
      if (handleHandsFreeVoiceCommand(finalText)) {
        setSystemReadyUI();
        if (handsFreeSession) {
          handleHandsFreeCycleEnd(sideAtEnd, true, handsFreeRun);
        }
        return;
      }

      if (handsFreeSession && shouldDropHandsFreeTranscriptByVoiceGate(finalText, handsFreeNearVoiceSeenInSession)) {
        setSystemReadyUI();
        handleHandsFreeCycleEnd(sideAtEnd, false, handsFreeRun);
        return;
      }

      const routedSide = handsFreeSession
        ? resolveHandsFreeSpeakerSide(finalText, sideAtEnd)
        : sideAtEnd;

      if (handsFreeSession) {
        noteHandsFreeRoute(routedSide);
        enqueueHandsFreeTranscript(routedSide, finalText, sideAtEnd, handsFreeRun);
        setSystemReadyUI();
        handleHandsFreeCycleEnd(routedSide, true, handsFreeRun);
        return;
      }

      Promise.resolve()
        .then(() => finalizeRecognition(routedSide, finalText));
      return;
    }

    setSystemReadyUI();
    if (handsFreeSession) {
      setHandsFreeNextSide(getOtherSide(sideAtEnd));
      handleHandsFreeCycleEnd(sideAtEnd, false, handsFreeRun);
    }
  };

  try {
    rec.start();
  } catch {
    if (!markFinished()) return;

    clearHandsFreeSilenceTimer();
    clearHandsFreeMaxListenTimer();
    recognizer = null;
    recordingSide = null;
    liveTranscript = "";
    latestPreviewTranscript = "";

    if (handsFreeSession) {
      setHandsFreeMode(false, { silent: true, stopCurrent: false });
    }

    setErrorUI();
    bounceToReady(1200);
  }
}

async function toggleRecording(side) {
  await ensureReady();
  const premiumOk = await ensureCurrentFacePremiumModeAccess();
  if (!premiumOk) return;

  if (isHandsFreeModeEnabled()) {
    setHandsFreeMode(false, { silent: true, stopCurrent: false });
    showToast("Eller Serbest kapatıldı");
  }

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

async function sendTyped(side) {
  await ensureReady();

  const premiumOk = await ensureCurrentFacePremiumModeAccess();
  if (!premiumOk) return;

  const input = side === "top" ? topInput : botInput;
  if (!input) return;

  const text = String(input.value || "").trim();
  if (!text) return;

  input.value = "";
  autoResizeTextarea(input);
  restoreInputPlaceholder(side);
  syncComposerButtons(side);

  await finalizeTypedMessage(side, text);
}

function keyboardRows(lang, shift) {
  const c = canonical(lang);
  const upper = !!shift;
  const numRow = ["1","2","3","4","5","6","7","8","9","0"];

  if (c === "tr") {
    return {
      nums: numRow,
      r1: upper ? ["Q","W","E","R","T","Y","U","I","O","P"] : ["q","w","e","r","t","y","u","ı","o","p"],
      r2: upper ? ["A","S","D","F","G","H","J","K","L"] : ["a","s","d","f","g","h","j","k","l"],
      r3: upper ? ["Z","X","C","V","B","N","M"] : ["z","x","c","v","b","n","m"],
    };
  }

  const mapRow = (row) => upper ? row.map((x) => x.toUpperCase()) : row;
  return {
    nums: numRow,
    r1: mapRow(["q","w","e","r","t","y","u","i","o","p"]),
    r2: mapRow(["a","s","d","f","g","h","j","k","l"]),
    r3: mapRow(["z","x","c","v","b","n","m"]),
  };
}

function svgShift() {
  return `
    <svg viewBox="0 0 24 24">
      <path d="M12 4l6 7h-4v8H10v-8H6l6-7z"></path>
    </svg>
  `;
}

function svgBackspace() {
  return `
    <svg viewBox="0 0 24 24">
      <path d="M21 6H9l-6 6 6 6h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"></path>
      <path d="M10 9l5 6"></path>
      <path d="M15 9l-5 6"></path>
    </svg>
  `;
}

function createKey({ label = "", html = "", onTap, onLongPress = null, className = "", sound = "key" }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `kb-key ${className}`.trim();
  if (html) btn.innerHTML = html;
  else btn.textContent = label;

  let longTriggered = false;

  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    longTriggered = false;
    unlockKeyboardAudio();
    btn.classList.add("pressing");

    if (onLongPress) {
      holdTimer = setTimeout(() => {
        longTriggered = true;
        playKeyClick(sound);
        onLongPress(btn);
      }, 320);
    }
  });

  btn.addEventListener("pointerup", (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearTimeout(holdTimer);
    holdTimer = null;
    btn.classList.remove("pressing");

    if (!longTriggered && onTap) {
      playKeyClick(sound);
      onTap();
    }
  });

  btn.addEventListener("pointerleave", () => {
    clearTimeout(holdTimer);
    holdTimer = null;
    btn.classList.remove("pressing");
  });

  btn.addEventListener("contextmenu", (e) => e.preventDefault());
  return btn;
}

function createAltMenu(hostBtn, chars, onPick) {
  hideAltMenu();
  if (!hostBtn || !chars?.length) return;

  const wrap = document.createElement("div");
  wrap.className = "alt-pop";

  chars.forEach((ch) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "alt-key";
    b.textContent = ch;
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      playKeyClick("key");
      onPick(ch);
      hideAltMenu();
    });
    wrap.appendChild(b);
  });

  hostBtn.appendChild(wrap);
  altMenuEl = wrap;
}

function renderCharKeys(rowEl, chars, side) {
  chars.forEach((ch) => {
    const alts = ALT_CHARS[ch] || ALT_CHARS[String(ch).toLowerCase()] || [];
    rowEl.appendChild(createKey({
      label: ch,
      sound: "key",
      onTap: () => {
        hideAltMenu();
        appendInputValue(side, ch);
        if (shiftState[side] && /[A-ZÇĞİÖŞÜ]/.test(ch)) {
          shiftState[side] = false;
          renderKeyboard(side);
        }
      },
      onLongPress: alts.length
        ? (btn) => createAltMenu(btn, alts, (picked) => appendInputValue(side, picked))
        : null
    }));
  });
}

function appendInputValue(side, value) {
  const input = side === "top" ? topInput : botInput;
  if (!input) return;
  input.value = `${input.value || ""}${value}`;
  autoResizeTextarea(input);
  syncComposerButtons(side);
}

function backspaceInputValue(side) {
  const input = side === "top" ? topInput : botInput;
  if (!input) return;
  input.value = String(input.value || "").slice(0, -1);
  autoResizeTextarea(input);
  syncComposerButtons(side);
}

function renderKeyboard(side) {
  const wrap = side === "top" ? topKeyboard : botKeyboard;
  const lang = side === "top" ? topLang : botLang;
  if (!wrap) return;

  const rows = keyboardRows(lang, shiftState[side]);
  wrap.innerHTML = "";

  const rowNums = document.createElement("div");
  rowNums.className = "kb-row";
  renderCharKeys(rowNums, rows.nums, side);
  wrap.appendChild(rowNums);

  const row1 = document.createElement("div");
  row1.className = "kb-row";
  renderCharKeys(row1, rows.r1, side);
  wrap.appendChild(row1);

  const row2 = document.createElement("div");
  row2.className = "kb-row";
  row2.appendChild(document.createElement("div")).style.flex = "0.35";
  renderCharKeys(row2, rows.r2, side);
  row2.appendChild(document.createElement("div")).style.flex = "0.35";
  wrap.appendChild(row2);

  const row3 = document.createElement("div");
  row3.className = "kb-row";

  row3.appendChild(createKey({
    html: svgShift(),
    className: "icon wide",
    sound: "shift",
    onTap: () => {
      hideAltMenu();
      shiftState[side] = !shiftState[side];
      renderKeyboard(side);
    }
  }));

  renderCharKeys(row3, rows.r3, side);

  row3.appendChild(createKey({
    html: svgBackspace(),
    className: "icon wide",
    sound: "backspace",
    onTap: () => {
      hideAltMenu();
      backspaceInputValue(side);
    }
  }));

  wrap.appendChild(row3);

  const row4 = document.createElement("div");
  row4.className = "kb-row";

  row4.appendChild(createKey({
    label: ",",
    sound: "key",
    onTap: () => {
      hideAltMenu();
      appendInputValue(side, ",");
    }
  }));

  row4.appendChild(createKey({
    label: ".",
    sound: "key",
    onTap: () => {
      hideAltMenu();
      appendInputValue(side, ".");
    }
  }));

  row4.appendChild(createKey({
    label: " ",
    className: "xwide",
    sound: "space",
    onTap: () => {
      hideAltMenu();
      appendInputValue(side, " ");
    }
  }));

  row4.appendChild(createKey({
    label: "?",
    sound: "key",
    onTap: () => {
      hideAltMenu();
      appendInputValue(side, "?");
    }
  }));

  row4.appendChild(createKey({
    label: "!",
    sound: "key",
    onTap: () => {
      hideAltMenu();
      appendInputValue(side, "!");
    }
  }));

  wrap.appendChild(row4);
}

function showKeyboard(side) {
  activeKeyboardSide = side;
  topKeyboardWrap?.classList.toggle("show", side === "top");
  botKeyboardWrap?.classList.toggle("show", side === "bot");
  hideAltMenu();
  renderKeyboard(side);
  keepLatestVisible(side);
}

function hideKeyboards() {
  activeKeyboardSide = null;
  hideAltMenu();
  topKeyboardWrap?.classList.remove("show");
  botKeyboardWrap?.classList.remove("show");
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
  setTimeout(apply, 40);
  setTimeout(apply, 120);
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
  } catch {}
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

function resolveStartupLang() {
  let base = getPreferredBaseLang();
  if (!langExists(base)) {
    const siteLang = getSiteLang();
    if (langExists(siteLang)) base = siteLang;
  }
  if (!langExists(base)) {
    const nativeLang = getNativeLang();
    if (langExists(nativeLang)) base = nativeLang;
  }
  if (!langExists(base)) base = langExists("en") ? "en" : (LANGS[0]?.code || "en");
  return canonical(base);
}

function startBoot() {
  if (bootStarted) return bootPromise;
  bootStarted = true;

  bootPromise = (async () => {
    setSystemPreparingUI();
    pointOrbTo("bot");

    const startupLang = resolveStartupLang();

    botLang = startupLang;
    topLang = resolveInitialTopLang(botLang);

    window.topLang = topLang;
    window.botLang = botLang;
    persistFaceToFaceLangs();

    refreshLangLabels();

    try {
      await Promise.race([
        Promise.allSettled([warmApis(), warmAudio()]),
        new Promise((resolve) => setTimeout(resolve, 1800))
      ]);
    } catch {}

    currentRuntimeMode = "online";
    syncModeUi();

    bootReady = true;
    setSystemReadyUI();
    syncAllComposerButtons();
    renderKeyboard("top");
    renderKeyboard("bot");
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

function bindMicTap(el, side) {
  if (!el) return;

  let lastTouchTs = 0;

  const run = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    await toggleRecording(side);
  };

  el.addEventListener("touchend", async (e) => {
    lastTouchTs = Date.now();
    await run(e);
  }, { passive: false });

  el.addEventListener("click", async (e) => {
    if (Date.now() - lastTouchTs < 500) return;
    await run(e);
  });
}

function bindReadonlyInput(side) {
  const input = side === "top" ? topInput : botInput;
  const send = side === "top" ? topSend : botSend;
  if (!input || !send) return;

  const open = (e) => {
    e.preventDefault();
    e.stopPropagation();
    showKeyboard(side);
  };

  input.setAttribute("readonly", "readonly");
  input.addEventListener("pointerdown", open);
  input.addEventListener("click", open);
  input.addEventListener("focus", (e) => {
    e.preventDefault();
    input.blur();
    showKeyboard(side);
  });

  send.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  send.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await sendTyped(side);
  });

  autoResizeTextarea(input);
  syncComposerButtons(side);
}

function bindModeControls() {
  window.f2fToggleMode = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (isHandsFreeModeEnabled()) {
      setHandsFreeMode(false, { silent: true, stopCurrent: true });
    }

    if (currentRuntimeMode === "online") {
      tryEnableOfflineMode();
    } else {
      closeOfflineRequiredPopup();
      setModeOnline();
      showToast("Online mod aktif");
    }
  };

  offlineRequiredCloseBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeOfflineRequiredPopup();
    setModeOnline();
  });

  offlineRequiredBackdrop?.addEventListener("click", (e) => {
    if (e.target === offlineRequiredBackdrop) {
      closeOfflineRequiredPopup();
      setModeOnline();
    }
  });
}


function bindLanguageButtons() {
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
}

function bindGlobalClicks() {
  document.addEventListener("click", (e) => {
    const insidePop =
      (popTop && popTop.contains(e.target)) ||
      (popBot && popBot.contains(e.target));
    const isLangBtn = e.target?.closest?.("#topLangBtn,#botLangBtn");
    const isInput = e.target?.closest?.("#topInput,#botInput");
    const isKb = e.target?.closest?.("#topKeyboardWrap,#botKeyboardWrap");
    const isAlt = e.target?.closest?.(".alt-pop");

    if (!insidePop && !isLangBtn) closeAllPop();
    if (!isInput && !isKb && !isAlt) hideKeyboards();
  }, { capture: true });
}

function bindUtilityButtons() {
  const clearConversation = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    stopAudio();
    stopTypewriter();
    setHandsFreeMode(false, { silent: true, stopCurrent: false });
    stopRecognizer();
    recordingSide = null;
    liveTranscript = "";
    latestPreviewTranscript = "";

    if (topBody) topBody.innerHTML = "";
    if (botBody) botBody.innerHTML = "";
    syncClearTrashMeter();

    if (topInput) {
      topInput.value = "";
      autoResizeTextarea(topInput);
    }
    if (botInput) {
      botInput.value = "";
      autoResizeTextarea(botInput);
    }

    restoreInputPlaceholder("top");
    restoreInputPlaceholder("bot");

    hideKeyboards();
    syncAllComposerButtons();
    setSystemReadyUI();
  };

  const captureClearTap = (event) => {
    const target = event.target?.closest?.("#clearBtn,.btn-clear");
    if (!target) return;
    clearConversation(event);
  };

  clearBtn?.addEventListener("pointerdown", clearConversation, { passive: false });
  clearBtn?.addEventListener("touchend", clearConversation, { passive: false });
  clearBtn?.addEventListener("click", clearConversation);
  document.addEventListener("pointerdown", captureClearTap, { capture: true, passive: false });
  document.addEventListener("touchend", captureClearTap, { capture: true, passive: false });

  homeLink?.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = safeHomeHref();
  });

  homeBtn?.addEventListener("click", () => {
    location.href = safeHomeHref();
  });

  bindKeyboardButton(homeBtn, async () => {
    location.href = safeHomeHref();
  });
}

function bindMicButtons() {
  bindMicTap(topMic, "top");
  bindMicTap(botMic, "bot");

  bindKeyboardButton(topMic, async (e) => {
    e.stopPropagation();
    await toggleRecording("top");
  });

  bindKeyboardButton(botMic, async (e) => {
    e.stopPropagation();
    await toggleRecording("bot");
  });
}

function bindInputs() {
  bindReadonlyInput("top");
  bindReadonlyInput("bot");
}

function bindSpeechVoices() {
  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        voicesReady = true;
      };
      window.speechSynthesis.getVoices();
    }
  } catch {}
}

function bindHandsFreeSafetyEvents() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && isHandsFreeModeEnabled()) {
      setHandsFreeMode(false, { silent: true, stopCurrent: true });
    }
  });

  window.addEventListener("beforeunload", () => {
    if (isHandsFreeModeEnabled()) {
      setHandsFreeMode(false, { silent: true, stopCurrent: true });
    }
  });
}

function bind() {
  refreshLangLabels();
  syncClearTrashMeter();
  unlockOnFirstTouch();
  bindCulturalToggle();
  bindHandsFreeTipModal();
  bindHandsFreeToggle();
  bindModeControls();
  bindLanguageButtons();
  bindGlobalClicks();
  bindUtilityButtons();
  bindMicButtons();
  bindInputs();
  bindSpeechVoices();
  bindHandsFreeSafetyEvents();

  try {
    startBoot();
  } catch (e) {
    console.error("[facetoface startBoot error]", e);
  }
}

const requiredDomOk =
  !!frameRoot &&
  !!topBody &&
  !!botBody &&
  !!topMic &&
  !!botMic &&
  !!topSend &&
  !!botSend &&
  !!topInput &&
  !!botInput &&
  !!topComposer &&
  !!botComposer &&
  !!topKeyboardWrap &&
  !!botKeyboardWrap &&
  !!topKeyboard &&
  !!botKeyboard &&
  !!topLangBtn &&
  !!botLangBtn &&
  !!topLangTxt &&
  !!botLangTxt &&
  !!popTop &&
  !!popBot &&
  !!listTop &&
  !!listBot &&
  !!closeTop &&
  !!closeBot &&
  !!clearBtn &&
  !!homeLink &&
  !!homeBtn &&
  !!miniToast &&
  !!topModeToggle &&
  !!botModeToggle &&
  !!topModeToggleLabel &&
  !!botModeToggleLabel &&
  !!offlineRequiredBackdrop &&
  !!offlineRequiredTitle &&
  !!offlineRequiredText &&
  !!offlineRequiredCloseBtn;

if (!requiredDomOk) {
  console.error("[facetoface] Gerekli DOM elemanları eksik.");
} else {
  try {
    bind();
  } catch (e) {
    console.error("[facetoface bind error]", e);
  }
}
