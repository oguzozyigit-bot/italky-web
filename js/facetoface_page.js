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
};

const PLACEHOLDERS = {
  tr: "Mesajını buraya yaz",
  en: "Write your message here",
  de: "Schreibe hier deine Nachricht",
  fr: "Écris ici ton message",
  it: "Scrivi qui il tuo messaggio",
  es: "Escribe aquí tu mensaje",
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

const F2F_VOICE_KEY = "facetoface_voice_mode";
const F2F_TRANSLATE_KEY = "facetoface_translate_mode";
const F2F_AUTO_READ_KEY = "facetoface_auto_read";

function isFaceAutoReadEnabled() {
  return String(localStorage.getItem(F2F_AUTO_READ_KEY) || "1") !== "0";
}

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
      name: l.name || l.tr_name || code.toUpperCase(),
      bcp: BCP[code] || `${code}-${String(code).toUpperCase()}`
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

function getPlaceholder(code) {
  return PLACEHOLDERS[canonical(code)] || PLACEHOLDERS.en;
}

const frameRoot = $("frameRoot");
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
const settingsBtn = $("settingsBtn");
const miniToast = $("miniToast");

const uiModal = $("uiModal");
const uiModalTitle = $("uiModalTitle");
const uiModalText = $("uiModalText");
const uiModalGo = $("uiModalGo");
const uiModalClose = $("uiModalClose");

let topLang = "en";
let botLang = "tr";
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

let altMenuEl = null;
let holdTimer = null;

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

const SHARED_VOICE_NAME_KEY = "italkyai_shared_voice_name";
const F2F_PRESET_KEY = "facetoface_voice_preset";

function getResolvedFaceVoice() {
  const shared = String(localStorage.getItem(SHARED_VOICE_NAME_KEY) || "").trim().toLowerCase();
  if (["auto", "mine", "second", "memory"].includes(shared)) {
    return shared;
  }

  const mode = String(localStorage.getItem(F2F_VOICE_KEY) || "auto").trim().toLowerCase();
  const preset = String(localStorage.getItem(F2F_PRESET_KEY) || "").trim().toLowerCase();

  if (mode === "clone") return "mine";
  if (mode === "preset" && preset === "second") return "second";
  if (mode === "preset" && preset === "memory") return "memory";

  return "auto";
}

function getFaceVoiceMode() {
  return getResolvedFaceVoice();
}

function getSelectedPresetVoice() {
  const resolved = getResolvedFaceVoice();
  return resolved === "second" || resolved === "memory" ? resolved : "";
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
  const needsPremium = isPaidFaceTextMode() || isPaidFaceVoiceMode();
  if (!needsPremium) return true;
  return await ensureFaceToFacePremiumAccess();
}

function faceTextUsageModule() {
  return getFaceTranslateMode() === "cultural" ? "facetoface_ai" : "usage_face_to_face";
}

function faceTextUsageNote() {
  return buildUsageNote({
    surface: "facetoface",
    usageKind: "text",
    mode: getFaceTranslateMode() === "cultural" ? "cultural" : "normal"
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
  if (!frameRoot) return;
  frameRoot.classList.remove("to-top", "to-bot");
  frameRoot.classList.add(side === "top" ? "to-top" : "to-bot");
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
      const code = canonical(el.dataset.code || "en");
      if (side === "top") topLang = code;
      else botLang = code;

      refreshLangLabels();
      renderKeyboard(side);
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

function createKey({ label = "", html = "", onTap, onLongPress = null, className = "" }) {
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

    if (onLongPress) {
      holdTimer = setTimeout(() => {
        longTriggered = true;
        onLongPress(btn);
      }, 320);
    }
  });

  btn.addEventListener("pointerup", (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearTimeout(holdTimer);
    holdTimer = null;
    if (!longTriggered && onTap) onTap();
  });

  btn.addEventListener("pointerleave", () => {
    clearTimeout(holdTimer);
    holdTimer = null;
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
      onTap: () => {
        hideAltMenu();
        appendInputValue(side, ch);
        if (shiftState[side] && /[A-ZÇĞİÖŞÜ]/.test(ch)) {
          shiftState[side] = false;
          renderKeyboard(side);
        }
      },
      onLongPress: alts.length ? (btn) => {
        createAltMenu(btn, alts, (picked) => appendInputValue(side, picked));
      } : null
    }));
  });
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
    onTap: () => {
      hideAltMenu();
      appendInputValue(side, ",");
    }
  }));

  row4.appendChild(createKey({
    label: ".",
    onTap: () => {
      hideAltMenu();
      appendInputValue(side, ".");
    }
  }));

  row4.appendChild(createKey({
    label: " ",
    className: "xwide",
    onTap: () => {
      hideAltMenu();
      appendInputValue(side, " ");
    }
  }));

  row4.appendChild(createKey({
    label: "?",
    onTap: () => {
      hideAltMenu();
      appendInputValue(side, "?");
    }
  }));

  row4.appendChild(createKey({
    label: "!",
    onTap: () => {
      hideAltMenu();
      appendInputValue(side, "!");
    }
  }));

  wrap.appendChild(row4);
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

  if (!userId) {
    throw new Error("USER_ID_MISSING");
  }

  const payload = {
    text: value,
    lang: canonical(langCode),
    user_id: userId,
    module: "facetoface",
    voice: selectedVoice,
    voice_mode: selectedVoice,
    preset_voice: selectedVoice === "auto" ? "" : selectedVoice,
    tone: canonTone(tone),
  };

  const r = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

  stopAudio();
  await warmAudio();

  const selectedVoice = getResolvedFaceVoice();
  const cacheKey = buildTtsCacheKey(value, langCode, tone);
  const cachedAudio = ttsMemoryCache.get(cacheKey);

  if (cachedAudio) {
    try {
      const ok = await playCachedAudio(cachedAudio, ++speakRunId);
      if (ok) return;
    } catch {}
  }

  const wantsApiVoice = ["mine", "second", "memory"].includes(selectedVoice);

  if (wantsApiVoice) {
    const ready = await hasReadyVoiceProfile();

    if (!ready) {
      if (selectedVoice === "mine") {
        showToast("Kendi Sesim hazır değil");
      } else if (selectedVoice === "second") {
        showToast("2. Ses hazır değil");
      } else if (selectedVoice === "memory") {
        showToast("Hatıra Sesi hazır değil");
      }
      return;
    }

    try {
      const ok = await speakViaApi(value, langCode, tone);
      if (ok) return;
    } catch (e) {
      console.warn("[facetoface custom voice failed]", e);

      if (selectedVoice === "mine") {
        showToast("Kendi Sesim üretilemedi, normal sese dönüldü");
      } else if (selectedVoice === "second") {
        showToast("2. Ses üretilemedi, normal sese dönüldü");
      } else if (selectedVoice === "memory") {
        showToast("Hatıra Sesi üretilemedi, normal sese dönüldü");
      }
    }
  }

  const fallbackOk = speakFallback(value, langCode);
  if (!fallbackOk) showToast("Hoparlör sesi başlatılamadı");
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
      const value = String(j?.translated || j?.translation || j?.text || "").trim();
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
  const tr = await translateText(cleaned, src, dst, sourceTone);

  if (!tr) {
    setErrorUI();
    if (latestTxt) latestTxt.textContent = "⚠️ Çeviri hatası";
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
  const tr = await translateText(text, src, dst, tone);

  if (!tr) {
    setErrorUI();
    if (latestTxt) latestTxt.textContent = "⚠️ Çeviri hatası";
    bounceToReady(1200);
    return;
  }

  try {
    await chargeFaceUsage(text, tr, src, dst);
  } catch (e) {
    if (e?.code === "INSUFFICIENT_TOKENS") {
      await ensureFaceToFacePremiumAccess();
      return;
    }
  }

  if (latestTxt) {
    latestTxt.textContent = "";
    await typewriteText(latestTxt, tr, other);
    await speak(tr, dst, tone);
  }

  setSystemReadyUI();
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

function startRecording(side) {
  hideKeyboards();
  setInputPlaceholder(side, "");

  const lang = side === "top" ? topLang : botLang;
  const rec = buildRecognizer(lang);

  if (!rec) {
    setErrorUI();
    showToast("Bu cihazda konuşma algılama desteklenmiyor");
    bounceToReady(1800);
    return;
  }

  const mySessionId = ++recognitionSessionId;

  recognizer = rec;
  recordingSide = side;
  liveTranscript = "";
  latestPreviewTranscript = "";

  rec.onstart = () => setListeningUI(side);

  rec.onresult = (e) => {
    if (mySessionId !== recognitionSessionId) return;

    const builtText = buildStableTranscript(e.results);
    if (!builtText) return;

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
  };

  rec.onerror = (e) => {
    if (mySessionId !== recognitionSessionId) return;

    if (String(e?.error || "").includes("not-allowed")) showToast("Mikrofon izni gerekli");
    else showToast("Mikrofon hatası");

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
    const finalText = cleanupFinalTranscript(
      getPreviewText(sideAtEnd) || latestPreviewTranscript || liveTranscript || ""
    );

    recognizer = null;
    recordingSide = null;

    (sideAtEnd === "top" ? topBody : botBody)?.querySelector(".bubble.preview")?.remove();

    liveTranscript = "";
    latestPreviewTranscript = "";

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
    } catch {}

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

  el.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

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

function bind() {
  refreshLangLabels();
  unlockOnFirstTouch();

  settingsBtn?.addEventListener("click", () => {
    location.href = "/pages/facetoface_settings.html";
  });

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

  clearBtn?.addEventListener("click", () => {
    stopAudio();
    stopTypewriter();
    stopRecognizer();
    recordingSide = null;
    liveTranscript = "";
    latestPreviewTranscript = "";

    if (topBody) topBody.innerHTML = "";
    if (botBody) botBody.innerHTML = "";

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
  });

  homeLink?.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = safeHomeHref();
  });

  homeBtn?.addEventListener("click", () => {
    location.href = safeHomeHref();
  });

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

  bindKeyboardButton(homeBtn, async () => {
    location.href = safeHomeHref();
  });

  bindReadonlyInput("top");
  bindReadonlyInput("bot");

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
  !!miniToast;

if (!requiredDomOk) {
  console.error("[facetoface] Gerekli DOM elemanları eksik.");
} else {
  try {
    bind();
  } catch (e) {
    console.error("[facetoface bind error]", e);
  }
}
