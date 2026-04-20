import { supabase } from "/js/supabase_client.js";
import { attach as attachKeyboard } from "/js/italky_keyboard.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

function apiUrl(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  return `${API_BASE}/api/${clean}`;
}

const F2F_VOICE_KEY = "facetoface_voice_mode";
const F2F_PRESET_KEY = "facetoface_voice_preset";
const F2F_AUTO_READ_KEY = "facetoface_auto_read";

const KAFKAS_POOL = [
  { code: "ab",  name: "Abhazca",        flag: "🏔️" },
  { code: "ady", name: "Adigece",        flag: "🛡️" },
  { code: "kbd", name: "Kabardeyce",     flag: "⚔️" },
  { code: "ce",  name: "Çeçence",        flag: "🦅" },
  { code: "ka",  name: "Gürcüce",        flag: "🇬🇪" },
  { code: "os",  name: "Osetçe",         flag: "⛰️" },
  { code: "lez", name: "Lezgice",        flag: "🌄" },
  { code: "av",  name: "Avarca",         flag: "🗻" }
];

const BCP = {
  tr:  "tr-TR",
  ab:  "tr-TR",
  ady: "tr-TR",
  kbd: "tr-TR",
  ce:  "tr-TR",
  ka:  "ka-GE",
  os:  "ru-RU",
  lez: "tr-TR",
  av:  "ru-RU"
};

const TTS_FALLBACK_LANG = {
  ab: "tr",
  ady: "tr",
  kbd: "tr",
  ce: "tr",
  os: "ru",
  lez: "tr",
  av: "ru"
};

const UI = {
  centerHub: $("centerHub"),

  topLangBtn: $("topLangBtn"),
  topLangTxt: $("topLangTxt"),
  topSettingsMini: $("topSettingsMini"),
  topInput: $("topInput"),
  topMic: $("topMic"),
  topSend: $("topSend"),
  topComposer: $("topComposer"),
  topBody: $("topBody"),
  popTop: $("pop-top"),
  closeTop: $("close-top"),
  listTop: $("list-top"),

  botLangBtn: $("botLangBtn"),
  botLangTxt: $("botLangTxt"),
  botSettingsMini: $("botSettingsMini"),
  botInput: $("botInput"),
  botMic: $("botMic"),
  botSend: $("botSend"),
  botComposer: $("botComposer"),
  botBody: $("botBody"),

  homeBtn: $("homeBtn"),
  homeLink: $("homeLink"),
  clearBtn: $("clearBtn"),

  genericBackdrop: $("genericBackdrop"),
  genericTitle: $("genericTitle"),
  genericText: $("genericText"),
  genericCloseBtn: $("genericCloseBtn"),
  miniToast: $("miniToast")
};

const state = {
  topLang: "ab",
  activeSide: "bot",

  topListening: false,
  botListening: false,
  topRecognizer: null,
  botRecognizer: null,

  currentAudio: null,
  speakRunId: 0,

  topLastSpeech: "",
  botLastSpeech: "",

  loadingTopRow: null,
  loadingBotRow: null,

  topKeyboardController: null,
  botKeyboardController: null
};

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function canon(code) {
  return String(code || "").trim().toLowerCase();
}

function toast(msg = "") {
  if (!UI.miniToast) return;
  UI.miniToast.textContent = String(msg || "");
  UI.miniToast.classList.add("show");
  clearTimeout(window.__kafkasToast);
  window.__kafkasToast = setTimeout(() => {
    UI.miniToast.classList.remove("show");
  }, 1800);
}

function showModal(title, text) {
  if (UI.genericTitle) UI.genericTitle.textContent = title || "Bilgi";
  if (UI.genericText) UI.genericText.textContent = text || "";
  UI.genericBackdrop?.classList.add("show");
  UI.genericBackdrop?.classList.add("open");
}

function closeModal() {
  UI.genericBackdrop?.classList.remove("show");
  UI.genericBackdrop?.classList.remove("open");
}

function currentKafkas() {
  return KAFKAS_POOL.find((x) => x.code === state.topLang) || KAFKAS_POOL[0];
}

function updateLangButtons() {
  const item = currentKafkas();
  if (UI.topLangTxt) UI.topLangTxt.textContent = `${item.flag} ${item.name}`;
  if (UI.botLangTxt) UI.botLangTxt.textContent = "🇹🇷 Türkçe";
}

function pointOrbTo(side) {
  document.body.classList.remove("to-top", "to-bot");
  document.body.classList.add(side === "top" ? "to-top" : "to-bot");
  UI.centerHub?.classList.toggle("to-top", side === "top");
  state.activeSide = side;
}

function autoResize(textarea) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 84)}px`;
}

function syncComposerButtons() {
  const topHas = normalizeText(UI.topInput?.value).length > 0;
  UI.topMic?.classList.toggle("hidden", topHas && !state.topListening);
  UI.topSend?.classList.toggle("hidden", !topHas);
  UI.topMic?.classList.toggle("listening", state.topListening);
  UI.topComposer?.classList.toggle("listening", state.topListening);

  const botHas = normalizeText(UI.botInput?.value).length > 0;
  UI.botMic?.classList.toggle("hidden", botHas && !state.botListening);
  UI.botSend?.classList.toggle("hidden", !botHas);
  UI.botMic?.classList.toggle("listening", state.botListening);
  UI.botComposer?.classList.toggle("listening", state.botListening);
}

function keepVisible(side = "bot") {
  requestAnimationFrame(() => {
    try {
      if (side === "top") {
        if (UI.topBody) UI.topBody.scrollTop = UI.topBody.scrollHeight + 400;
      } else if (side === "bot") {
        if (UI.botBody) UI.botBody.scrollTop = UI.botBody.scrollHeight + 400;
      } else {
        if (UI.topBody) UI.topBody.scrollTop = UI.topBody.scrollHeight + 400;
        if (UI.botBody) UI.botBody.scrollTop = UI.botBody.scrollHeight + 400;
      }
    } catch {}
  });
}

function clearLatest(side) {
  const wrap = side === "top" ? UI.topBody : UI.botBody;
  if (!wrap) return;
  wrap.querySelectorAll(".bubble.me.is-latest").forEach((el) => {
    el.classList.remove("is-latest");
  });
}

function createSpeakerButton(getText, getLang) {
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
    await speakText(getText(), getLang());
  });
  return btn;
}

function addBubble(where, kind, text, opts = {}) {
  const wrap = where === "top" ? UI.topBody : UI.botBody;
  if (!wrap) return null;

  const row = document.createElement("div");
  row.className = `bubble ${kind}${opts.latest ? " is-latest" : ""}`;

  const inner = document.createElement("div");
  inner.className = "bubble-row";

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "");
  inner.appendChild(txt);

  if (opts.speaker) {
    inner.appendChild(
      createSpeakerButton(
        () => opts.speakText || txt.textContent || "",
        () => opts.speakLang || "tr"
      )
    );
  }

  row.appendChild(inner);

  if (opts.subText) {
    const sub = document.createElement("div");
    sub.className = "bubble-sub";
    sub.textContent = String(opts.subText || "");
    row.appendChild(sub);
  }

  wrap.appendChild(row);
  keepVisible(where);
  return row;
}

function clearBubbles() {
  if (UI.topBody) UI.topBody.innerHTML = "";
  if (UI.botBody) UI.botBody.innerHTML = "";
  state.loadingTopRow = null;
  state.loadingBotRow = null;
}

function renderTopLangList() {
  if (!UI.listTop) return;

  UI.listTop.innerHTML = KAFKAS_POOL.map((item) => `
    <div class="pop-item ${item.code === state.topLang ? "active" : ""}" data-code="${item.code}">
      <div class="pop-left">
        <div class="pop-flag">${item.flag}</div>
        <div class="pop-name">${item.name}</div>
      </div>
      <div class="pop-code">${item.code}</div>
    </div>
  `).join("");

  UI.listTop.querySelectorAll(".pop-item").forEach((el) => {
    el.addEventListener("click", () => {
      state.topLang = el.dataset.code;
      updateLangButtons();
      renderTopLangList();
      state.topKeyboardController?.setLayout?.("latin");
      UI.popTop?.classList.remove("show");
      toast("Kafkas dili değişti");
    });
  });
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
  state.speakRunId += 1;

  try {
    if (state.currentAudio) {
      state.currentAudio.pause();
      state.currentAudio.currentTime = 0;
    }
  } catch {}

  state.currentAudio = null;
  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}
}

async function getCurrentUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

function resolveSpeechLang(langCode) {
  const code = canon(langCode);
  return TTS_FALLBACK_LANG[code] || code || "tr";
}

function chooseWebVoice(langCode) {
  const resolved = resolveSpeechLang(langCode);
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const want = String(BCP[resolved] || BCP.tr).toLowerCase();

  return voices.find(v => String(v.lang || "").toLowerCase() === want) ||
         voices.find(v => String(v.lang || "").toLowerCase().startsWith(resolved)) ||
         voices.find(v => String(v.lang || "").toLowerCase().startsWith("tr")) ||
         voices[0] ||
         null;
}

async function speakViaApi(text, langCode) {
  const selectedVoice = getSelectedVoice();
  if (!["mine", "second", "memory"].includes(selectedVoice)) return false;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const myRunId = ++state.speakRunId;

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

  const speakCode = resolveSpeechLang(langCode);

  const resp = await fetch(apiUrl("tts"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: String(text || "").trim(),
      lang: speakCode,
      user_id: userId,
      module: "kafkaslarin_dili",
      voice: apiVoice,
      voice_mode: apiVoiceMode,
      preset_voice: apiPresetVoice,
      selected_voice: selectedVoice,
      tone: "neutral"
    })
  });

  const json = await resp.json().catch(() => null);
  if (!resp.ok || !json?.audio_base64) return false;
  if (myRunId !== state.speakRunId) return false;

  const audio = new Audio(`data:audio/mp3;base64,${json.audio_base64}`);
  audio.preload = "auto";
  audio.playsInline = true;
  state.currentAudio = audio;
  await audio.play();
  return true;
}

async function speakText(text, langCode) {
  if (!isAutoReadEnabled()) return;
  const value = normalizeText(text);
  if (!value || value === "...") return;

  stopAudio();

  const ok = await speakViaApi(value, langCode).catch(() => false);
  if (ok) return;

  try {
    const speakCode = resolveSpeechLang(langCode);

    if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
      window.NativeTTS.speak(value, String(speakCode || "tr"));
      return;
    }
  } catch {}

  try {
    if (window.speechSynthesis) {
      const speakCode = resolveSpeechLang(langCode);
      const utter = new SpeechSynthesisUtterance(value);
      utter.lang = String(BCP[speakCode] || BCP.tr);
      const voice = chooseWebVoice(speakCode);
      if (voice) utter.voice = voice;
      utter.rate = 0.95;
      utter.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    }
  } catch {}
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || "";
}

async function translateAI(text, from, to) {
  const token = await getAccessToken();

  const r = await fetch(apiUrl("translate_ai"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      text,
      from_lang: from,
      to_lang: to,
      mode: "normal",
      use_ai: false,
      cultural: false,
      tone: "neutral",
      style: "balanced"
    })
  });

  const j = await r.json().catch(() => null);
  const out =
    String(j?.translated || "").trim() ||
    String(j?.translation || "").trim() ||
    "";

  if (!r.ok || !out) {
    throw new Error(j?.error || "translate_failed");
  }

  return out;
}

function removeLoadingBubble(side) {
  if (side === "top" && state.loadingTopRow) {
    state.loadingTopRow.remove();
    state.loadingTopRow = null;
  }
  if (side === "bot" && state.loadingBotRow) {
    state.loadingBotRow.remove();
    state.loadingBotRow = null;
  }
}

function showLoadingBubble(side) {
  removeLoadingBubble(side);
  const row = addBubble(side, "me", "Çevriliyor...", { latest: true });
  if (side === "top") state.loadingTopRow = row;
  else state.loadingBotRow = row;
}

async function runTranslateText(fromSide, text) {
  const sourceSide = fromSide;
  const targetSide = fromSide === "top" ? "bot" : "top";
  const cleanText = normalizeText(text);
  if (!cleanText) return;

  document.body.classList.remove("is-ready", "is-error");
  document.body.classList.add("is-translating");
  pointOrbTo(fromSide);

  clearLatest(sourceSide);
  clearLatest(targetSide);

  if (sourceSide === "top") {
    addBubble("top", "me", cleanText, { latest: true });
    showLoadingBubble("bot");
  } else {
    addBubble("bot", "me", cleanText, { latest: true });
    showLoadingBubble("top");
  }

  try {
    let translated = "";
    let speakLang = "tr";

    if (fromSide === "top") {
      translated = await translateAI(cleanText, currentKafkas().code, "tr");
      speakLang = "tr";
    } else {
      translated = await translateAI(cleanText, "tr", currentKafkas().code);
      speakLang = currentKafkas().code;
    }

    removeLoadingBubble(targetSide);

    addBubble(targetSide, "me", translated, {
      latest: true,
      speaker: true,
      speakText: translated,
      speakLang
    });

    await speakText(translated, speakLang);

    document.body.classList.remove("is-translating", "is-error");
    document.body.classList.add("is-ready");
  } catch (e) {
    removeLoadingBubble(targetSide);

    addBubble(targetSide, "me", "⚠️ Çeviri şu an yapılamadı.", {
      latest: true
    });

    document.body.classList.remove("is-translating");
    document.body.classList.add("is-error");
    toast(`Çeviri hatası: ${e?.message || "bilinmeyen hata"}`);

    setTimeout(() => {
      document.body.classList.remove("is-error");
      document.body.classList.add("is-ready");
    }, 1200);
  }
}

async function sendTyped(side) {
  const input = side === "top" ? UI.topInput : UI.botInput;
  if (!input) return;

  const text = normalizeText(input.value);
  if (!text) return;

  input.value = "";
  autoResize(input);
  syncComposerButtons();

  if (side === "top") state.topKeyboardController?.hide?.();
  else state.botKeyboardController?.hide?.();

  await runTranslateText(side, text);
}

function extractStableRecognitionText(results) {
  let latestFinal = "";
  let latestInterim = "";

  for (let i = 0; i < results.length; i++) {
    const piece = normalizeText(results[i]?.[0]?.transcript || "");
    if (!piece) continue;
    if (results[i].isFinal) latestFinal = piece;
    else latestInterim = piece;
  }
  return normalizeText(latestFinal || latestInterim);
}

function stopRecognition(side) {
  if (side === "top") {
    try { state.topRecognizer?.stop(); } catch {}
    state.topRecognizer = null;
    state.topListening = false;
    setListening("top", false);
  } else {
    try { state.botRecognizer?.stop(); } catch {}
    state.botRecognizer = null;
    state.botListening = false;
    setListening("bot", false);
  }
}

function setListening(side, on) {
  if (side === "top") {
    state.topListening = !!on;
    UI.topComposer?.classList.toggle("listening", !!on);
    UI.topMic?.classList.toggle("listening", !!on);
  } else {
    state.botListening = !!on;
    UI.botComposer?.classList.toggle("listening", !!on);
    UI.botMic?.classList.toggle("listening", !!on);
  }
  syncComposerButtons();
}

function startRecognition(side) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    toast("Bu cihazda sesli giriş desteklenmiyor");
    return;
  }

  if ((side === "top" && state.topListening) || (side === "bot" && state.botListening)) {
    stopRecognition(side);
    return;
  }

  const langCode = side === "top" ? currentKafkas().code : "tr";
  const listenCode = resolveSpeechLang(langCode);

  const recog = new SR();
  recog.lang = String(BCP[listenCode] || BCP.tr);
  recog.interimResults = true;
  recog.continuous = false;
  recog.maxAlternatives = 1;

  const inputEl = side === "top" ? UI.topInput : UI.botInput;

  recog.onstart = () => {
    pointOrbTo(side);
    setListening(side, true);
    if (side === "top") state.topLastSpeech = "";
    else state.botLastSpeech = "";
  };

  recog.onresult = (e) => {
    const stableText = extractStableRecognitionText(e.results);
    inputEl.value = stableText;
    if (side === "top") state.topLastSpeech = stableText;
    else state.botLastSpeech = stableText;
    autoResize(inputEl);
    syncComposerButtons();
  };

  recog.onerror = () => {
    stopRecognition(side);
    toast("Mikrofon hatası");
  };

  recog.onend = async () => {
    const finalText = normalizeText(side === "top" ? state.topLastSpeech : state.botLastSpeech);
    stopRecognition(side);

    if (finalText) {
      inputEl.value = "";
      autoResize(inputEl);
      syncComposerButtons();
      await runTranslateText(side, finalText);
    }
  };

  if (side === "top") state.topRecognizer = recog;
  else state.botRecognizer = recog;

  try {
    recog.start();
  } catch {
    stopRecognition(side);
  }
}

function prepareInputs() {
  [UI.topInput, UI.botInput].forEach((input) => {
    if (!input) return;

    input.readOnly = true;
    input.disabled = false;
    input.setAttribute("inputmode", "none");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("spellcheck", "false");
  });

  state.topKeyboardController = attachKeyboard({
    target: UI.topInput,
    layout: "latin",
    enableSound: true,
    enableVibration: true,
    showNumberRow: true,
    onChange(value, el) {
      autoResize(el);
      syncComposerButtons();
      pointOrbTo("top");
    },
    onEnter() {
      state.topKeyboardController?.hide?.();
      sendTyped("top");
    }
  });

  state.botKeyboardController = attachKeyboard({
    target: UI.botInput,
    layout: "tr",
    enableSound: true,
    enableVibration: true,
    showNumberRow: true,
    onChange(value, el) {
      autoResize(el);
      syncComposerButtons();
      pointOrbTo("bot");
    },
    onEnter() {
      state.botKeyboardController?.hide?.();
      sendTyped("bot");
    }
  });
}

function bindEvents() {
  UI.topLangBtn?.addEventListener("click", () => {
    renderTopLangList();
    UI.popTop?.classList.add("show");
  });

  UI.closeTop?.addEventListener("click", () => UI.popTop?.classList.remove("show"));
  UI.popTop?.addEventListener("click", (e) => {
    if (e.target === UI.popTop) UI.popTop.classList.remove("show");
  });

  UI.topSettingsMini?.addEventListener("click", () => {
    location.href = "/pages/premium_voice_settings.html?from=kafkaslarin_dili";
  });

  UI.botSettingsMini?.addEventListener("click", () => {
    location.href = "/pages/premium_voice_settings.html?from=kafkaslarin_dili";
  });

  UI.topMic?.addEventListener("click", () => startRecognition("top"));
  UI.botMic?.addEventListener("click", () => startRecognition("bot"));
  UI.topSend?.addEventListener("click", () => sendTyped("top"));
  UI.botSend?.addEventListener("click", () => sendTyped("bot"));

  UI.homeLink?.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = "/pages/home.html";
  });

  UI.homeBtn?.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  UI.clearBtn?.addEventListener("click", () => {
    if (UI.topInput) UI.topInput.value = "";
    if (UI.botInput) UI.botInput.value = "";
    autoResize(UI.topInput);
    autoResize(UI.botInput);
    stopAudio();
    stopRecognition("top");
    stopRecognition("bot");
    clearBubbles();
    state.topKeyboardController?.hide?.();
    state.botKeyboardController?.hide?.();
    syncComposerButtons();
    document.body.classList.remove("is-translating", "is-error");
    document.body.classList.add("is-ready");
    pointOrbTo("bot");
  });

  UI.genericCloseBtn?.addEventListener("click", closeModal);
  UI.genericBackdrop?.addEventListener("click", (e) => {
    if (e.target === UI.genericBackdrop) closeModal();
  });
}

async function requireLogin() {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session?.user) {
    location.replace("/pages/login.html");
    return false;
  }
  return true;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await requireLogin())) return;

  prepareInputs();
  updateLangButtons();
  renderTopLangList();
  bindEvents();
  syncComposerButtons();
  document.body.classList.add("is-ready");
  pointOrbTo("bot");
});
