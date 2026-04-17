import { supabase } from "/js/supabase_client.js";

const $ = (id) => document.getElementById(id);

const F2F_VOICE_KEY = "facetoface_voice_mode";
const F2F_PRESET_KEY = "facetoface_voice_preset";
const F2F_AUTO_READ_KEY = "facetoface_auto_read";

const frameRoot = $("frameRoot");
const topBody = $("topBody");
const botBody = $("botBody");

const botInput = $("botInput");
const botMic = $("botMic");
const botSend = $("botSend");
const botComposer = $("botComposer");

const settingsBtn = $("settingsBtn");
const clearBtn = $("clearBtn");
const homeBtn = $("homeBtn");
const homeLink = $("homeLink");

const genericBackdrop = $("genericBackdrop");
const genericTitle = $("genericTitle");
const genericText = $("genericText");
const genericCloseBtn = $("genericCloseBtn");
const miniToast = $("miniToast");

let recognizer = null;
let recording = false;
let currentAudio = null;
let speakRunId = 0;

/* =========================================================
   GÖKTÜRK MOTORU - LOCAL
========================================================= */

const WORD_OVERRIDES = {
  "türk": "𐱅𐰇𐰼𐰜",
  "turk": "𐱅𐰇𐰼𐰜",
  "göktürk": "𐰚𐰇𐰜𐱅𐰇𐰼𐰜",
  "gokturk": "𐰚𐰇𐰜𐱅𐰇𐰼𐰜",
  "gök": "𐰚𐰇𐰜",
  "gok": "𐰚𐰇𐰜",
  "tanrı": "𐱅𐰭𐰼𐰃",
  "tanri": "𐱅𐰭𐰼𐰃"
};

const MULTI_CHAR_MAP = [
  ["ng", "𐰭"],
  ["ny", "𐰪"]
];

const CHAR_MAP = {
  "a": "𐰀",
  "b": "𐰉",
  "c": "𐰲",
  "ç": "𐰲",
  "d": "𐰑",
  "e": "𐰀",
  "f": "𐰯",
  "g": "𐰏",
  "ğ": "𐰍",
  "h": "𐰴",
  "ı": "𐰃",
  "i": "𐰃",
  "j": "𐰖",
  "k": "𐰚",
  "l": "𐰞",
  "m": "𐰢",
  "n": "𐰤",
  "o": "𐰆",
  "ö": "𐰇",
  "p": "𐰯",
  "q": "𐰚",
  "r": "𐰼",
  "s": "𐰽",
  "ş": "𐱁",
  "t": "𐱅",
  "u": "𐰆",
  "ü": "𐰇",
  "v": "𐰉",
  "w": "𐰉",
  "x": "𐰴𐰽",
  "y": "𐰖",
  "z": "𐰔"
};

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function tokenizeWithSpaces(text) {
  return String(text || "").split(/(\s+)/);
}

function cleanWord(word) {
  return String(word || "").toLowerCase().replace(/[^\wçğıöşü]/g, "");
}

function convertWordToGokturk(word) {
  const pure = cleanWord(word);

  if (WORD_OVERRIDES[pure]) {
    return WORD_OVERRIDES[pure];
  }

  let out = "";
  let i = 0;
  const lower = String(word || "").toLowerCase();

  while (i < lower.length) {
    let matched = false;

    for (const [src, dst] of MULTI_CHAR_MAP) {
      if (lower.startsWith(src, i)) {
        out += dst;
        i += src.length;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    const ch = lower[i];
    out += CHAR_MAP[ch] || ch;
    i += 1;
  }

  return out;
}

function turkishToGokturk(text) {
  const parts = tokenizeWithSpaces(text);
  return parts.map((part) => {
    if (!part) return "";
    if (/^\s+$/.test(part)) return part;
    return convertWordToGokturk(part);
  }).join("").trim();
}

/* =========================================================
   UI
========================================================= */

function showToast(msg = "") {
  miniToast.textContent = String(msg || "");
  miniToast.classList.add("show");
  clearTimeout(window.__atalarToast);
  window.__atalarToast = setTimeout(() => {
    miniToast.classList.remove("show");
  }, 1800);
}

function openModal(title, text) {
  genericTitle.textContent = title;
  genericText.textContent = text;
  genericBackdrop.classList.add("show");
}

function closeModal() {
  genericBackdrop.classList.remove("show");
}

function getSelectedVoice() {
  const mode = String(localStorage.getItem(F2F_VOICE_KEY) || "auto").trim().toLowerCase();
  const preset = String(localStorage.getItem(F2F_PRESET_KEY) || "").trim().toLowerCase();

  if (mode === "clone") return "mine";
  if (mode === "preset" && preset === "second") return "second";
  if (mode === "preset" && preset === "memory") return "memory";
  return "auto";
}

function isAutoReadEnabled() {
  return String(localStorage.getItem(F2F_AUTO_READ_KEY) || "1") !== "0";
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

function autoResizeTextarea() {
  botInput.style.height = "auto";
  botInput.style.height = `${Math.min(botInput.scrollHeight, 120)}px`;
}

function syncComposerButtons() {
  const hasText = String(botInput.value || "").trim().length > 0;
  botMic.classList.toggle("hidden", hasText && !recording);
  botSend.classList.toggle("hidden", !hasText);
}

function keepVisible() {
  requestAnimationFrame(() => {
    topBody.scrollTop = topBody.scrollHeight + 300;
    botBody.scrollTop = botBody.scrollHeight + 300;
  });
}

function createSpeakerButton(getText) {
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
    await speak(value);
  });

  return btn;
}

function buildCharGrid(gokturkText, latinText) {
  const grid = document.createElement("div");
  grid.className = "char-grid";

  const latinChars = [...String(latinText || "")];
  const gokturkChars = [...String(gokturkText || "")];

  let latinIndex = 0;

  for (let i = 0; i < gokturkChars.length; i++) {
    const rune = gokturkChars[i];

    if (rune === " ") {
      const spacer = document.createElement("div");
      spacer.className = "char-space";
      grid.appendChild(spacer);

      while (latinChars[latinIndex] === " ") {
        latinIndex += 1;
      }
      continue;
    }

    while (latinChars[latinIndex] === " ") {
      latinIndex += 1;
    }

    const latinChar = latinChars[latinIndex] || "";
    latinIndex += 1;

    const col = document.createElement("div");
    col.className = "char-col";

    const top = document.createElement("div");
    top.className = "char-rune";
    top.textContent = rune;

    const bottom = document.createElement("div");
    bottom.className = "char-latin";
    bottom.textContent = latinChar;

    col.appendChild(top);
    col.appendChild(bottom);
    grid.appendChild(col);
  }

  return grid;
}

function addBubble(where, kind, text, opts = {}) {
  const wrap = where === "top" ? topBody : botBody;
  const row = document.createElement("div");
  row.className = `bubble ${kind}${opts.latest ? " is-latest" : ""}`;

  if (opts.charMap && kind === "me") {
    const stack = document.createElement("div");
    stack.className = "bubble-stack";

    const inner = document.createElement("div");
    inner.className = "bubble-row";

    if (opts.speaker) {
      inner.appendChild(createSpeakerButton(() => opts.speakText || ""));
    }

    const txt = document.createElement("div");
    txt.className = "txt";
    txt.appendChild(buildCharGrid(text, opts.subText || ""));
    inner.appendChild(txt);
    stack.appendChild(inner);

    row.appendChild(stack);
    wrap.appendChild(row);
    keepVisible();

    return { row, txt };
  }

  const stack = document.createElement("div");
  stack.className = "bubble-stack";

  const inner = document.createElement("div");
  inner.className = "bubble-row";

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "").trim();

  if (opts.speaker && kind === "me") {
    inner.appendChild(createSpeakerButton(() => opts.speakText || txt.textContent || ""));
  }

  inner.appendChild(txt);
  stack.appendChild(inner);
  row.appendChild(stack);
  wrap.appendChild(row);
  keepVisible();

  return { row, txt };
}

function clearLatest(where) {
  const wrap = where === "top" ? topBody : botBody;
  wrap.querySelectorAll(".bubble.me.is-latest").forEach((el) => el.classList.remove("is-latest"));
}

/* =========================================================
   SES
========================================================= */

async function getCurrentUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

function chooseWebVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return voices.find(v => String(v.lang || "").toLowerCase().startsWith("tr")) || voices[0] || null;
}

async function speakViaApi(text) {
  const selectedVoice = getSelectedVoice();
  if (!["mine", "second", "memory"].includes(selectedVoice)) return false;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const myRunId = ++speakRunId;

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

  const resp = await fetch("https://italky-api.onrender.com/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: String(text || "").trim(),
      lang: "tr",
      user_id: userId,
      module: "atalarin_dili",
      voice: apiVoice,
      voice_mode: apiVoiceMode,
      preset_voice: apiPresetVoice,
      selected_voice: selectedVoice,
      tone: "neutral"
    })
  });

  const json = await resp.json().catch(() => null);
  if (!resp.ok || !json?.ok || !json?.audio_base64) return false;
  if (myRunId !== speakRunId) return false;

  const audio = new Audio(`data:audio/mp3;base64,${json.audio_base64}`);
  audio.preload = "auto";
  audio.playsInline = true;
  currentAudio = audio;
  await audio.play();
  return true;
}

async function speak(text) {
  if (!isAutoReadEnabled()) return;
  const value = String(text || "").trim();
  if (!value) return;

  stopAudio();

  const ok = await speakViaApi(value).catch(() => false);
  if (ok) return;

  try {
    if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
      window.NativeTTS.speak(value, "tr");
      return;
    }
  } catch {}

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(value);
      utter.lang = "tr-TR";
      const voice = chooseWebVoice();
      if (voice) utter.voice = voice;
      utter.rate = 0.95;
      utter.pitch = 1;
      window.speechSynthesis.speak(utter);
    }
  } catch {
    showToast("Ses başlatılamadı");
  }
}

/* =========================================================
   AKIŞ
========================================================= */

async function processMessage(rawText) {
  const text = normalizeText(rawText);
  if (!text) return;

  botInput.value = "";
  autoResizeTextarea();
  syncComposerButtons();

  addBubble("bot", "them", text);
  clearLatest("top");

  frameRoot.classList.remove("is-ready", "is-error");
  frameRoot.classList.add("is-translating");

  const translated = turkishToGokturk(text);

  if (!translated) {
    frameRoot.classList.remove("is-translating");
    frameRoot.classList.add("is-error");
    addBubble("top", "me", "⚠️ Çeviri hatası", { latest: true });
    setTimeout(() => {
      frameRoot.classList.remove("is-error");
      frameRoot.classList.add("is-ready");
    }, 1200);
    return;
  }

  addBubble("top", "me", translated, {
    latest: true,
    speaker: true,
    speakText: text,
    subText: text,
    charMap: true
  });

  await speak(text);

  frameRoot.classList.remove("is-translating", "is-error");
  frameRoot.classList.add("is-ready");
}

/* =========================================================
   STT
========================================================= */

function normalizeRecognitionPieces(results) {
  let finalText = "";
  let interimText = "";

  for (let i = 0; i < results.length; i++) {
    const piece = normalizeText(results[i]?.[0]?.transcript || "");
    if (!piece) continue;

    if (results[i].isFinal) {
      finalText = normalizeText(`${finalText} ${piece}`);
    } else {
      interimText = normalizeText(piece);
    }
  }

  return normalizeText(`${finalText} ${interimText}`);
}

function stopRecognizer() {
  try { recognizer?.stop(); } catch {}
  recognizer = null;
  recording = false;
  botComposer.classList.remove("listening");
  botMic.classList.remove("listening");
  syncComposerButtons();
}

function startRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    showToast("Bu cihazda sesli giriş desteklenmiyor");
    return;
  }

  if (recording) {
    stopRecognizer();
    return;
  }

  recognizer = new SR();
  recognizer.lang = "tr-TR";
  recognizer.interimResults = true;
  recognizer.continuous = true;
  recognizer.maxAlternatives = 1;

  let finalCaptured = "";

  recognizer.onstart = () => {
    recording = true;
    finalCaptured = "";
    botComposer.classList.add("listening");
    botMic.classList.add("listening");
    syncComposerButtons();
    frameRoot.classList.remove("is-ready", "is-error");
    frameRoot.classList.add("is-listening");
  };

  recognizer.onresult = (e) => {
    const merged = normalizeRecognitionPieces(e.results);
    finalCaptured = merged;
    botInput.value = merged;
    autoResizeTextarea();
    syncComposerButtons();
  };

  recognizer.onerror = () => {
    stopRecognizer();
    frameRoot.classList.remove("is-listening");
    frameRoot.classList.add("is-error");
    showToast("Mikrofon hatası");
    setTimeout(() => {
      frameRoot.classList.remove("is-error");
      frameRoot.classList.add("is-ready");
    }, 1200);
  };

  recognizer.onend = async () => {
    const finalText = normalizeText(finalCaptured || botInput.value);
    stopRecognizer();
    if (finalText) {
      await processMessage(finalText);
    } else {
      frameRoot.classList.remove("is-listening");
      frameRoot.classList.add("is-ready");
    }
  };

  try {
    recognizer.start();
  } catch {
    stopRecognizer();
  }
}

/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {
  settingsBtn.addEventListener("click", () => {
    location.href = "/pages/premium_voice_settings.html?from=atalarin_dili";
  });

  clearBtn.addEventListener("click", () => {
    stopAudio();
    stopRecognizer();
    topBody.innerHTML = "";
    botBody.innerHTML = "";
    botInput.value = "";
    autoResizeTextarea();
    syncComposerButtons();
    frameRoot.classList.remove("is-listening", "is-translating", "is-error");
    frameRoot.classList.add("is-ready");
  });

  homeLink.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = "/pages/home.html";
  });

  homeBtn.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  botInput.addEventListener("input", () => {
    autoResizeTextarea();
    syncComposerButtons();
  });

  botInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      processMessage(botInput.value);
    }
  });

  botSend.addEventListener("click", () => processMessage(botInput.value));
  botMic.addEventListener("click", startRecognition);

  genericCloseBtn.addEventListener("click", closeModal);
  genericBackdrop.addEventListener("click", (e) => {
    if (e.target === genericBackdrop) closeModal();
  });
}

function init() {
  autoResizeTextarea();
  syncComposerButtons();
  frameRoot.classList.add("is-ready");
  bindEvents();
  showToast("Ataların Dili hazır");
}

init();
