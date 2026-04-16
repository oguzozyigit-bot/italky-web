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
};

const GOKTURK_LABEL = "𐱅𐰇𐰼𐰚 • Göktürkçe";
const GOKTURK_CODE = "gokturk";
const TR_CODE = "tr";

const TARGET_LANGS = [
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "en", name: "İngilizce", flag: "🇬🇧" },
  { code: "de", name: "Almanca", flag: "🇩🇪" },
  { code: "fr", name: "Fransızca", flag: "🇫🇷" },
  { code: "it", name: "İtalyanca", flag: "🇮🇹" },
  { code: "es", name: "İspanyolca", flag: "🇪🇸" }
];

const SHARED_VOICE_NAME_KEY = "italkyai_shared_voice_name";
const F2F_PRESET_KEY = "facetoface_voice_preset";
const F2F_AUTO_READ_KEY = "facetoface_auto_read";

const frameRoot = $("frameRoot");
const topBody = $("topBody");
const botBody = $("botBody");

const sourceLangTxt = $("sourceLangTxt");
const targetLangTxt = $("targetLangTxt");
const targetLangBtn = $("targetLangBtn");
const targetLangPopover = $("targetLangPopover");
const targetLangList = $("targetLangList");
const targetLangClose = $("targetLangClose");

const settingsBtn = $("settingsBtn");

const botInput = $("botInput");
const botMic = $("botMic");
const botSend = $("botSend");
const botComposer = $("botComposer");

const clearBtn = $("clearBtn");
const homeBtn = $("homeBtn");
const homeLink = $("homeLink");

const genericBackdrop = $("genericBackdrop");
const genericTitle = $("genericTitle");
const genericText = $("genericText");
const genericCloseBtn = $("genericCloseBtn");

const miniToast = $("miniToast");

let direction = "gokturk_to_target";
let targetLang = "tr";
let recognizer = null;
let recording = false;
let currentAudio = null;
let speakRunId = 0;
let typewriterRunId = 0;

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

function langLabel(code) {
  if (canonical(code) === GOKTURK_CODE) return GOKTURK_LABEL;
  const found = TARGET_LANGS.find((x) => x.code === canonical(code));
  return found ? `${found.flag} ${found.name}` : code.toUpperCase();
}

function sourceCode() {
  return direction === "gokturk_to_target" ? GOKTURK_CODE : targetLang;
}

function targetCode() {
  return direction === "gokturk_to_target" ? targetLang : GOKTURK_CODE;
}

function refreshDirectionUi() {
  sourceLangTxt.textContent = langLabel(sourceCode());
  targetLangTxt.textContent = langLabel(targetCode());

  botInput.placeholder =
    direction === "gokturk_to_target"
      ? "Göktürkçe metni yaz veya konuş"
      : "Türkçe metni yaz veya konuş";
}

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

function keepBottomVisible() {
  requestAnimationFrame(() => {
    botBody.scrollTop = botBody.scrollHeight + 300;
    topBody.scrollTop = topBody.scrollHeight + 300;
  });
}

function addBubble(where, kind, text, opts = {}) {
  const wrap = where === "top" ? topBody : botBody;
  const row = document.createElement("div");
  row.className = `bubble ${kind}${opts.latest ? " is-latest" : ""}`;

  const inner = document.createElement("div");
  inner.className = "bubble-row";

  if (opts.speaker && kind === "me") {
    inner.appendChild(createSpeakerButton(() => txt.textContent || "", opts.speakLang || "tr"));
  }

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "").trim();

  if (opts.speaker && kind === "me") {
    inner.innerHTML = "";
    inner.appendChild(createSpeakerButton(() => txt.textContent || "", opts.speakLang || "tr"));
    inner.appendChild(txt);
  } else {
    inner.appendChild(txt);
  }

  row.appendChild(inner);
  wrap.appendChild(row);
  keepBottomVisible();
  return row;
}

function clearLatest(where) {
  const wrap = where === "top" ? topBody : botBody;
  wrap.querySelectorAll(".bubble.me.is-latest").forEach((el) => el.classList.remove("is-latest"));
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
    keepBottomVisible();
    const ch = full.charAt(i - 1);
    if (ch === " ") await wait(0);
    else if (/[.!?]/.test(ch)) await wait(75);
    else if (/[,]/.test(ch)) await wait(45);
    else await wait(8);
  }
}

function chooseWebVoice(langCode) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const base = canonical(langCode);
  let pool = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith(base));
  if (!pool.length && base === "gokturk") pool = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith("tr"));
  return pool[0] || voices[0] || null;
}

async function getCurrentUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
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
      lang: canonical(langCode) === GOKTURK_CODE ? "tr" : canonical(langCode),
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

async function speak(text, langCode) {
  if (!isAutoReadEnabled()) return;
  const value = String(text || "").trim();
  if (!value) return;

  stopAudio();

  const ok = await speakViaApi(value, langCode).catch(() => false);
  if (ok) return;

  try {
    if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
      window.NativeTTS.speak(value, canonical(langCode) === GOKTURK_CODE ? "tr" : canonical(langCode));
      return;
    }
  } catch {}

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(value);
      utter.lang = canonical(langCode) === GOKTURK_CODE ? "tr-TR" : (BCP[canonical(langCode)] || "tr-TR");
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

async function translateAtalar(text, fromLang, toLang) {
  const resp = await fetch(`${API_BASE}/api/translate_ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: String(text || "").trim(),
      from_lang: canonical(fromLang) === GOKTURK_CODE ? "tr" : canonical(fromLang),
      to_lang: canonical(toLang) === GOKTURK_CODE ? "tr" : canonical(toLang),
      source: canonical(fromLang) === GOKTURK_CODE ? "tr" : canonical(fromLang),
      target: canonical(toLang) === GOKTURK_CODE ? "tr" : canonical(toLang),
      mode: "normal",
      use_ai: true,
      cultural: false,
      style: "balanced",
      atalar_mode: true,
      atalar_source: canonical(fromLang),
      atalar_target: canonical(toLang)
    })
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) return null;

  let value = String(json?.translated || json?.translation || json?.text || "").trim();
  if (!value) return null;

  if (canonical(toLang) === GOKTURK_CODE) {
    if (json?.gokturk_text) value = String(json.gokturk_text).trim();
  }

  return value;
}

async function processMessage(rawText) {
  const text = normalizeText(rawText);
  if (!text) return;

  botInput.value = "";
  autoResizeTextarea();
  syncComposerButtons();

  const src = sourceCode();
  const dst = targetCode();

  addBubble("bot", "them", text);
  clearLatest("top");

  frameRoot.classList.remove("is-ready", "is-error");
  frameRoot.classList.add("is-translating");

  const latestRow = addBubble("top", "me", "Çevriliyor...", {
    latest: true,
    speaker: true,
    speakLang: dst
  });

  const latestTxt = latestRow?.querySelector(".txt");
  const translated = await translateAtalar(text, src, dst);

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
  recording = false;
  botComposer.classList.remove("listening");
  botMic.classList.remove("listening");
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
  recognizer.lang = canonical(sourceCode()) === GOKTURK_CODE ? "tr-TR" : (BCP[canonical(sourceCode())] || "tr-TR");
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

function renderTargetLangs() {
  targetLangList.innerHTML = TARGET_LANGS.map((l) => {
    const active = canonical(l.code) === canonical(targetLang) ? "active" : "";
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

  targetLangList.querySelectorAll(".pop-item").forEach((el) => {
    el.addEventListener("click", () => {
      targetLang = canonical(el.dataset.code || "tr");
      refreshDirectionUi();
      closeTargetLangPopover();
      showToast(`${langLabel(targetLang)} seçildi`);
    });
  });
}

function openTargetLangPopover() {
  renderTargetLangs();
  targetLangPopover.classList.add("show");
}

function closeTargetLangPopover() {
  targetLangPopover.classList.remove("show");
}

function bindEvents() {
  targetLangBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openTargetLangPopover();
  });

  targetLangClose.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeTargetLangPopover();
  });

  document.addEventListener("click", (e) => {
    if (!targetLangPopover.contains(e.target) && !e.target.closest("#targetLangBtn")) {
      closeTargetLangPopover();
    }
  }, { capture: true });

  $("swapDirectionBtn").addEventListener("click", async () => {
    direction = direction === "gokturk_to_target" ? "target_to_gokturk" : "gokturk_to_target";
    refreshDirectionUi();
    stopAudio();
    stopTypewriter();
    showToast("Çeviri yönü değiştirildi");
  });

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
  refreshDirectionUi();
  autoResizeTextarea();
  syncComposerButtons();
  frameRoot.classList.add("is-ready");
  bindEvents();
  showToast("Ataların Dili hazır");
}

init();
