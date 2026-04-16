import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const BCP = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
  ku: "tr-TR",
  kmr: "tr-TR",
  ckb: "tr-TR",
  zza: "tr-TR",
  lzz: "tr-TR",
  ab: "ru-RU",
  ady: "ru-RU",
};

const TOP_LANGS = [
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "en", name: "İngilizce", flag: "🇬🇧" },
  { code: "de", name: "Almanca", flag: "🇩🇪" },
  { code: "fr", name: "Fransızca", flag: "🇫🇷" },
  { code: "it", name: "İtalyanca", flag: "🇮🇹" },
  { code: "es", name: "İspanyolca", flag: "🇪🇸" }
];

const GEOGRAPHY_LANGS = [
  { code: "ku",  name: "Kürtçe", flag: "☀️" },
  { code: "kmr", name: "Kürtçe (Kurmancî)", flag: "☀️" },
  { code: "ckb", name: "Kürtçe (Soranî)", flag: "☀️" },
  { code: "zza", name: "Zazaca", flag: "🟤" },
  { code: "lzz", name: "Lazca", flag: "🌊" },
  { code: "ab",  name: "Abhazca", flag: "🏔️" },
  { code: "ady", name: "Çerkesce", flag: "🛡️" }
];

const SHARED_VOICE_NAME_KEY = "italkyai_shared_voice_name";
const F2F_PRESET_KEY = "facetoface_voice_preset";
const F2F_AUTO_READ_KEY = "facetoface_auto_read";

const frameRoot = $("frameRoot");
const centerHub = $("centerHub");

const topBody = $("topBody");
const botBody = $("botBody");

const topInput = $("topInput");
const botInput = $("botInput");

const topMic = $("topMic");
const botMic = $("botMic");
const topSend = $("topSend");
const botSend = $("botSend");

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

const topSettingsMini = $("topSettingsMini");
const botSettingsMini = $("botSettingsMini");

const clearBtn = $("clearBtn");
const homeBtn = $("homeBtn");
const homeLink = $("homeLink");

const genericBackdrop = $("genericBackdrop");
const genericTitle = $("genericTitle");
const genericText = $("genericText");
const genericCloseBtn = $("genericCloseBtn");

const miniToast = $("miniToast");

let topLang = "tr";
let botLang = "ku";

let recognizer = null;
let recordingSide = null;
let currentAudio = null;
let speakRunId = 0;
let typewriterRunId = 0;
let activeInputSide = null;

const KEYBOARD_ROWS = [
  ["q","w","e","r","t","y","u","ı","o","p","ğ","ü"],
  ["a","s","d","f","g","h","j","k","l","ş","i"],
  ["z","x","c","v","b","n","m","ö","ç"],
  ["123","space","backspace","clear","close"]
];

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim();
}

function getSelectedVoice() {
  const mode = String(localStorage.getItem(SHARED_VOICE_NAME_KEY) || "tts").trim().toLowerCase();
  const preset = String(localStorage.getItem(F2F_PRESET_KEY) || "").trim().toLowerCase();

  if (mode === "clone") return "mine";
  if (mode === "preset" && preset === "second") return "second";
  if (mode === "preset" && preset === "memory") return "memory";
  if (["mine", "second", "memory", "tts", "auto"].includes(mode)) return mode;
  return "tts";
}

function isAutoReadEnabled() {
  return String(localStorage.getItem(F2F_AUTO_READ_KEY) || "1") !== "0";
}

function langObjTop(code) {
  return TOP_LANGS.find((x) => canonical(x.code) === canonical(code)) || { code, name: code, flag: "🌐" };
}

function langObjBot(code) {
  return GEOGRAPHY_LANGS.find((x) => canonical(x.code) === canonical(code)) || { code, name: code, flag: "🧿" };
}

function refreshLangLabels() {
  const top = langObjTop(topLang);
  const bot = langObjBot(botLang);

  topLangTxt.textContent = `${top.flag} ${top.name}`;
  botLangTxt.textContent = `${bot.flag} ${bot.name}`;
}

function showToast(msg = "") {
  miniToast.textContent = String(msg || "");
  miniToast.classList.add("show");
  clearTimeout(window.__geoToast);
  window.__geoToast = setTimeout(() => {
    miniToast.classList.remove("show");
  }, 1800);
}

function closeModal() {
  genericBackdrop.classList.remove("show");
}

function closeAllPop() {
  popTop.classList.remove("show");
  popBot.classList.remove("show");
}

function renderTopLangs() {
  listTop.innerHTML = TOP_LANGS.map((l) => {
    const active = canonical(l.code) === canonical(topLang) ? "active" : "";
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

  listTop.querySelectorAll(".pop-item").forEach((el) => {
    el.addEventListener("click", () => {
      topLang = canonical(el.dataset.code || "tr");
      refreshLangLabels();
      closeAllPop();
    });
  });
}

function renderBotLangs() {
  listBot.innerHTML = GEOGRAPHY_LANGS.map((l) => {
    const active = canonical(l.code) === canonical(botLang) ? "active" : "";
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

  listBot.querySelectorAll(".pop-item").forEach((el) => {
    el.addEventListener("click", () => {
      botLang = canonical(el.dataset.code || "ku");
      refreshLangLabels();
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
  const listening = recordingSide === side;
  const hasText = String(input.value || "").trim().length > 0;

  mic.classList.toggle("hidden", hasText && !listening);
  send.classList.toggle("hidden", !hasText);
}

function syncAllComposerButtons() {
  syncComposerButtons("top");
  syncComposerButtons("bot");
}

function keepVisible() {
  requestAnimationFrame(() => {
    topBody.scrollTop = topBody.scrollHeight + 300;
    botBody.scrollTop = botBody.scrollHeight + 300;
  });
}

function openKeyboard(side) {
  activeInputSide = side;
  if (side === "top") {
    topKeyboardWrap.classList.add("show");
    botKeyboardWrap.classList.remove("show");
  } else {
    botKeyboardWrap.classList.add("show");
    topKeyboardWrap.classList.remove("show");
  }
}

function closeKeyboard() {
  activeInputSide = null;
  topKeyboardWrap.classList.remove("show");
  botKeyboardWrap.classList.remove("show");
}

function getActiveInput() {
  if (activeInputSide === "top") return topInput;
  if (activeInputSide === "bot") return botInput;
  return null;
}

function insertTextToActiveInput(text) {
  const input = getActiveInput();
  if (!input) return;

  input.value = `${input.value || ""}${text}`;
  autoResizeTextarea(input);
  syncComposerButtons(activeInputSide);
}

function backspaceActiveInput() {
  const input = getActiveInput();
  if (!input) return;

  input.value = String(input.value || "").slice(0, -1);
  autoResizeTextarea(input);
  syncComposerButtons(activeInputSide);
}

function clearActiveInput() {
  const input = getActiveInput();
  if (!input) return;

  input.value = "";
  autoResizeTextarea(input);
  syncComposerButtons(activeInputSide);
}

function pressKeyVisual(btn) {
  btn.classList.add("pressing");
  setTimeout(() => btn.classList.remove("pressing"), 90);
}

function buildKeyboard(container) {
  container.innerHTML = "";

  KEYBOARD_ROWS.forEach((rowKeys) => {
    const row = document.createElement("div");
    row.className = "kb-row";

    rowKeys.forEach((key) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "kb-key";

      if (key === "space") {
        btn.classList.add("xwide");
        btn.textContent = "BOŞLUK";
      } else if (key === "backspace") {
        btn.classList.add("wide", "icon");
        btn.innerHTML = `
          <svg viewBox="0 0 24 24">
            <path d="M21 4H8l-6 8 6 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
            <path d="M10 9l5 6"></path>
            <path d="M15 9l-5 6"></path>
          </svg>
        `;
      } else if (key === "clear") {
        btn.classList.add("wide");
        btn.textContent = "TEMİZLE";
      } else if (key === "close") {
        btn.classList.add("wide");
        btn.textContent = "KAPAT";
      } else if (key === "123") {
        btn.classList.add("wide");
        btn.textContent = "123";
      } else {
        btn.textContent = key;
      }

      btn.addEventListener("click", () => {
        pressKeyVisual(btn);

        if (key === "space") {
          insertTextToActiveInput(" ");
          return;
        }

        if (key === "backspace") {
          backspaceActiveInput();
          return;
        }

        if (key === "clear") {
          clearActiveInput();
          return;
        }

        if (key === "close") {
          closeKeyboard();
          return;
        }

        if (key === "123") {
          showToast("Şimdilik harf klavyesi aktif");
          return;
        }

        insertTextToActiveInput(key);
      });

      row.appendChild(btn);
    });

    container.appendChild(row);
  });
}

function createSpeakerButton(getText, langCode) {
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
    await speak(value, langCode);
  });

  return btn;
}

function addBubble(where, kind, text, opts = {}) {
  const wrap = where === "top" ? topBody : botBody;

  const row = document.createElement("div");
  row.className = `bubble ${kind}${opts.latest ? " is-latest" : ""}`;

  const inner = document.createElement("div");
  inner.className = "bubble-row";

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "").trim();

  if (opts.speaker && kind === "me") {
    inner.appendChild(createSpeakerButton(() => txt.textContent || "", opts.speakLang || "tr"));
  }

  inner.appendChild(txt);
  row.appendChild(inner);
  wrap.appendChild(row);
  keepVisible();
  return row;
}

function clearLatest(where) {
  const wrap = where === "top" ? topBody : botBody;
  wrap.querySelectorAll(".bubble.me.is-latest").forEach((el) => el.classList.remove("is-latest"));
}

async function getCurrentUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

function chooseWebVoice(langCode) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const base = canonical(langCode);
  let pool = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith(base));
  if (!pool.length) pool = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith("tr"));
  return pool[0] || voices[0] || null;
}

async function speakViaApi(text, langCode) {
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

  const resp = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: String(text || "").trim(),
      lang: canonical(langCode),
      user_id: userId,
      module: "cografyanin_dili",
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

async function speak(text, langCode) {
  if (!isAutoReadEnabled()) return;
  const value = String(text || "").trim();
  if (!value) return;

  stopAudio();

  const ok = await speakViaApi(value, langCode).catch(() => false);
  if (ok) return;

  try {
    if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
      window.NativeTTS.speak(value, canonical(langCode));
      return;
    }
  } catch {}

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(value);
      utter.lang = BCP[canonical(langCode)] || "tr-TR";
      const voice = chooseWebVoice(langCode);
      if (voice) utter.voice = voice;
      utter.rate = 0.95;
      utter.pitch = 1;
      window.speechSynthesis.speak(utter);
    }
  } catch {
    showToast("Ses başlatılamadı");
  }
}

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

async function translateText(text, fromLang, toLang) {
  const resp = await fetch(`${API_BASE}/translate_ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: String(text || "").trim(),
      from_lang: canonical(fromLang),
      to_lang: canonical(toLang),
      mode: "normal",
      tone: "neutral",
      style: "balanced"
    })
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) return null;

  const value = String(json?.translated || json?.translation || json?.text || "").trim();
  return value || null;
}

async function typewriteText(el, finalText) {
  stopTypewriter();
  const runId = typewriterRunId;
  const full = String(finalText || "").trim();
  el.textContent = "";
  if (!full) return;

  let i = 0;
  while (i < full.length) {
    if (runId !== typewriterRunId) return;
    const next = Math.min(full.length, i + (i < 14 ? 1 : 2));
    el.textContent = full.slice(0, next);
    i = next;
    keepVisible();
    const ch = full.charAt(i - 1);
    if (ch === " ") await wait(0);
    else if (/[.!?]/.test(ch)) await wait(75);
    else if (/[,]/.test(ch)) await wait(45);
    else await wait(8);
  }
}

async function processMessage(side, rawText) {
  const text = normalizeText(rawText);
  if (!text) return;

  const src = side === "top" ? topLang : botLang;
  const dst = side === "top" ? botLang : topLang;
  const other = side === "top" ? "bot" : "top";

  const input = side === "top" ? topInput : botInput;
  input.value = "";
  autoResizeTextarea(input);
  syncComposerButtons(side);

  addBubble(side, "them", text);
  clearLatest(other);

  frameRoot.classList.remove("is-ready", "is-error");
  frameRoot.classList.add("is-translating");

  const latestRow = addBubble(other, "me", "Çevriliyor...", {
    latest: true,
    speaker: true,
    speakLang: dst
  });

  const latestTxt = latestRow?.querySelector(".txt");
  const translated = await translateText(text, src, dst);

  if (!translated) {
    frameRoot.classList.remove("is-translating");
    frameRoot.classList.add("is-error");
    if (latestTxt) latestTxt.textContent = "⚠️ Çeviri hatası";
    setTimeout(() => {
      frameRoot.classList.remove("is-error");
      frameRoot.classList.add("is-ready");
    }, 1200);
    return;
  }

  if (latestTxt) {
    latestTxt.textContent = "";
    await typewriteText(latestTxt, translated);
    await speak(translated, dst);
  }

  frameRoot.classList.remove("is-translating", "is-error");
  frameRoot.classList.add("is-ready");
}

function stopRecognizer() {
  try { recognizer?.stop(); } catch {}
  recognizer = null;
  const prevSide = recordingSide;
  recordingSide = null;
  if (prevSide === "top") {
    topComposer.classList.remove("listening");
    topMic.classList.remove("listening");
  }
  if (prevSide === "bot") {
    botComposer.classList.remove("listening");
    botMic.classList.remove("listening");
  }
  syncAllComposerButtons();
}

function startRecognition(side) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    showToast("Bu cihazda sesli giriş desteklenmiyor");
    return;
  }

  if (recordingSide === side) {
    stopRecognizer();
    return;
  }

  stopRecognizer();

  recognizer = new SR();
  recognizer.lang = BCP[canonical(side === "top" ? topLang : botLang)] || "tr-TR";
  recognizer.interimResults = true;
  recognizer.continuous = true;
  recognizer.maxAlternatives = 1;

  let live = "";
  recordingSide = side;

  recognizer.onstart = () => {
    if (side === "top") {
      topComposer.classList.add("listening");
      topMic.classList.add("listening");
    } else {
      botComposer.classList.add("listening");
      botMic.classList.add("listening");
    }
    syncAllComposerButtons();
    frameRoot.classList.remove("is-ready", "is-error");
    frameRoot.classList.add("is-listening");
  };

  recognizer.onresult = (e) => {
    const parts = [];
    for (let i = 0; i < e.results.length; i++) {
      const t = String(e.results[i]?.[0]?.transcript || "").trim();
      if (t) parts.push(t);
    }
    live = normalizeText(parts.join(" "));
    const input = side === "top" ? topInput : botInput;
    input.value = live;
    autoResizeTextarea(input);
    syncComposerButtons(side);
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
    const input = side === "top" ? topInput : botInput;
    const finalText = normalizeText(input.value || live);
    stopRecognizer();

    if (finalText) {
      await processMessage(side, finalText);
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

function bindKeyboardFocus() {
  topInput.addEventListener("click", () => openKeyboard("top"));
  botInput.addEventListener("click", () => openKeyboard("bot"));

  topInput.addEventListener("focus", (e) => {
    e.target.blur();
    openKeyboard("top");
  });

  botInput.addEventListener("focus", (e) => {
    e.target.blur();
    openKeyboard("bot");
  });
}

function bindEvents() {
  topLangBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
    renderTopLangs();
    popTop.classList.add("show");
  });

  botLangBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
    renderBotLangs();
    popBot.classList.add("show");
  });

  closeTop.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
  });

  closeBot.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
  });

  document.addEventListener("click", (e) => {
    const insideTop = popTop.contains(e.target);
    const insideBot = popBot.contains(e.target);
    const isBtn = e.target.closest("#topLangBtn,#botLangBtn");
    const isKb = e.target.closest("#topKeyboardWrap,#botKeyboardWrap,.composer-input");
    if (!insideTop && !insideBot && !isBtn) closeAllPop();
    if (!isKb && !e.target.closest("#topComposer,#botComposer")) closeKeyboard();
  }, { capture: true });

  topSettingsMini.addEventListener("click", () => {
    location.href = "/pages/facetoface_settings.html";
  });

  botSettingsMini.addEventListener("click", () => {
    location.href = "/pages/facetoface_settings.html";
  });

  clearBtn.addEventListener("click", () => {
    stopAudio();
    stopTypewriter();
    stopRecognizer();
    topBody.innerHTML = "";
    botBody.innerHTML = "";
    topInput.value = "";
    botInput.value = "";
    autoResizeTextarea(topInput);
    autoResizeTextarea(botInput);
    syncAllComposerButtons();
    closeKeyboard();
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

  topSend.addEventListener("click", () => processMessage("top", topInput.value));
  botSend.addEventListener("click", () => processMessage("bot", botInput.value));

  topMic.addEventListener("click", () => startRecognition("top"));
  botMic.addEventListener("click", () => startRecognition("bot"));

  genericCloseBtn.addEventListener("click", closeModal);
  genericBackdrop.addEventListener("click", (e) => {
    if (e.target === genericBackdrop) closeModal();
  });

  bindKeyboardFocus();
}

function init() {
  buildKeyboard(topKeyboard);
  buildKeyboard(botKeyboard);
  autoResizeTextarea(topInput);
  autoResizeTextarea(botInput);
  refreshLangLabels();
  syncAllComposerButtons();
  frameRoot.classList.add("is-ready");
  bindEvents();
  showToast("Coğrafyanın Dili hazır");
}

init();
