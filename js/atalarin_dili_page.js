import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const SHARED_VOICE_NAME_KEY = "italkyai_shared_voice_name";
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
let typewriterRunId = 0;

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
    inner.appendChild(createSpeakerButton(() => txt.textContent || ""));
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

  const resp = await fetch(`${API_BASE}/api/tts`, {
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

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

async function translateToGokturk(text) {
  const value = normalizeText(text);
  if (!value) return null;

  const resp = await fetch(`${API_BASE}/api/translate_ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: value,
      from_lang: "tr",
      to_lang: "tr",
      source: "tr",
      target: "tr",
      mode: "normal",
      use_ai: true,
      cultural: false,
      style: "balanced",
      atalar_mode: true,
      atalar_source: "tr",
      atalar_target: "gokturk"
    })
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) return null;

  const out =
    String(json?.gokturk_text || "").trim() ||
    String(json?.translated || "").trim() ||
    String(json?.translation || "").trim() ||
    "";

  return out || null;
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

  const latestRow = addBubble("top", "me", "Çevriliyor...", {
    latest: true,
    speaker: true
  });

  const latestTxt = latestRow?.querySelector(".txt");
  const translated = await translateToGokturk(text);

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
    await speak(translated);
  }

  frameRoot.classList.remove("is-translating", "is-error");
  frameRoot.classList.add("is-ready");
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

  let live = "";

  recognizer.onstart = () => {
    recording = true;
    botComposer.classList.add("listening");
    botMic.classList.add("listening");
    syncComposerButtons();
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
    botInput.value = live;
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
    const finalText = normalizeText(botInput.value || live);
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

function bindEvents() {
  settingsBtn.addEventListener("click", () => {
    location.href = "/pages/facetoface_settings.html";
  });

  clearBtn.addEventListener("click", () => {
    stopAudio();
    stopTypewriter();
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
