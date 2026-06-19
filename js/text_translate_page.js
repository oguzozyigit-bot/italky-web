// /js/text_translate_page.js

import { supabase } from "/js/supabase_client.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";
import { LANG_POOL } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const frameRoot = $("frameRoot");
const fromBtn = $("fromBtn");
const toBtn = $("toBtn");
const swapBtn = $("swapBtn");
const fromFlag = $("fromFlag");
const toFlag = $("toFlag");
const fromText = $("fromText");
const toText = $("toText");
const soundToggle = $("soundToggle");
const resultBubble = $("resultBubble");
const resultSub = $("resultSub");
const resultArea = $("resultArea");
const inputBox = $("inputBox");
const inputPreviewBubble = $("inputPreviewBubble");
const micBtn = $("micBtn");
const translateBtn = $("translateBtn");
const homeBtn = $("homeBtn");
const homeLink = $("homeLink");
const clearBtn = $("trashClearBtn");
const backLink = $("backLink");
const langPopover = $("langPopover");
const popoverTitle = $("popoverTitle");
const popoverClose = $("popoverClose");
const langSearch = $("langSearch");
const langList = $("langList");
const toastEl = $("toast");

const BCP = {
  tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", it: "it-IT", es: "es-ES",
  ar: "ar-SA", ru: "ru-RU", bg: "bg-BG", pt: "pt-PT", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR"
};

const TR_NAMES = {
  tr: "Türkçe", en: "İngilizce", de: "Almanca", fr: "Fransızca", it: "İtalyanca", es: "İspanyolca",
  ar: "Arapça", ru: "Rusça", bg: "Bulgarca", pt: "Portekizce", zh: "Çince", ja: "Japonca", ko: "Korece",
  nl: "Hollandaca", pl: "Lehçe", uk: "Ukraynaca", fa: "Farsça", hi: "Hintçe", ur: "Urduca",
  ro: "Romence", el: "Yunanca", he: "İbranice", id: "Endonezce", vi: "Vietnamca", th: "Tayca"
};

const FLAGS = {
  tr: "🇹🇷", en: "🇬🇧", de: "🇩🇪", fr: "🇫🇷", it: "🇮🇹", es: "🇪🇸", ru: "🇷🇺", ar: "🇸🇦",
  zh: "🇨🇳", ja: "🇯🇵", ko: "🇰🇷", pt: "🇵🇹", nl: "🇳🇱", el: "🇬🇷", uk: "🇺🇦", pl: "🇵🇱",
  ro: "🇷🇴", bg: "🇧🇬", he: "🇮🇱", hi: "🇮🇳", id: "🇮🇩", fa: "🇮🇷", ur: "🇵🇰", th: "🇹🇭", vi: "🇻🇳"
};

let fromLang = localStorage.getItem("text_single_from_lang") || "tr";
let toLang = localStorage.getItem("text_single_to_lang") || "en";
let allLangs = [];
let popoverMode = "from";
let soundEnabled = localStorage.getItem("text_single_sound_enabled") !== "0";
let listening = false;
let recognizer = null;
let audio = null;
let speakToken = 0;
let translateToken = 0;
let speechTranslateTimer = null;
let suppressSpeechErrorUntil = 0;
let lastSpeechResultAt = 0;
let booted = false;

function canonical(code) {
  return String(code || "").trim().toLowerCase().replace("_", "-").split("-")[0] || "en";
}

function cleanText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function logAuthFlow(step, extra = {}) {
  console.warn("[TEXT_TRANSLATE_SPEECH]", step, extra);
}

function toast(message) {
  if (!toastEl) return;
  toastEl.textContent = String(message || "");
  toastEl.classList.add("show");
  clearTimeout(window.__textSingleToast);
  window.__textSingleToast = setTimeout(() => toastEl.classList.remove("show"), 2200);
}

function setState(state) {
  if (!frameRoot) return;
  frameRoot.classList.remove("is-ready", "is-error", "is-translating", "is-idle");
  frameRoot.classList.add(state === "translating" ? "is-translating" : state === "error" ? "is-error" : state === "idle" ? "is-idle" : "is-ready");
}

function setOutput(main, sub = "") {
  const value = String(main || "");
  if (resultBubble) {
    resultBubble.textContent = value || "...";
    resultBubble.className = `bubble ${value.trim() && value.trim() !== "..." ? "latest" : "normal"}`;
  }
  if (resultSub) resultSub.textContent = sub || "";
  try { resultArea.scrollTop = resultArea.scrollHeight + 300; } catch {}
}

function syncInputPreview() {
  if (inputPreviewBubble && inputBox) inputPreviewBubble.textContent = cleanText(inputBox.value);
}

function autoResizeInput() {
  if (!inputBox) return;
  inputBox.style.height = "auto";
  inputBox.style.height = `${Math.min(inputBox.scrollHeight, 140)}px`;
}

function syncInputButtons() {
  if (!inputBox || !micBtn || !translateBtn) return;
  const hasText = cleanText(inputBox.value).length > 0;
  micBtn.classList.toggle("listening", listening);
  if (listening) {
    micBtn.classList.remove("hidden");
    translateBtn.classList.add("hidden");
  } else if (hasText) {
    micBtn.classList.add("hidden");
    translateBtn.classList.remove("hidden");
  } else {
    micBtn.classList.remove("hidden");
    translateBtn.classList.add("hidden");
  }
}

function langName(item) {
  const code = canonical(item?.code || item);
  return TR_NAMES[code] || item?.tr || item?.tr_name || item?.name_tr || item?.nativeName || item?.name || code.toUpperCase();
}

function langFlag(item) {
  const code = canonical(item?.code || item);
  return item?.flag || FLAGS[code] || "🌐";
}

function buildLangs() {
  const seen = new Set();
  return (Array.isArray(LANG_POOL) ? LANG_POOL : [])
    .map((item) => {
      const code = canonical(item?.code);
      if (!code || code === "auto" || code === "detect" || seen.has(code)) return null;
      seen.add(code);
      const name = langName(item);
      return { code, name, flag: langFlag(item), search: `${code} ${name} ${item?.name || ""} ${item?.nativeName || ""}`.toLowerCase() };
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

function getLang(code) {
  const lang = allLangs.find((item) => item.code === canonical(code));
  return lang || { code: canonical(code), name: TR_NAMES[canonical(code)] || canonical(code).toUpperCase(), flag: FLAGS[canonical(code)] || "🌐" };
}

function ensureLangs() {
  if (!allLangs.some((item) => item.code === canonical(fromLang))) fromLang = "tr";
  if (!allLangs.some((item) => item.code === canonical(toLang))) toLang = "en";
  if (canonical(fromLang) === canonical(toLang)) toLang = canonical(fromLang) === "en" ? "tr" : "en";
}

function renderTopLanguageButtons() {
  const from = getLang(fromLang);
  const to = getLang(toLang);
  if (fromFlag) fromFlag.textContent = from.flag;
  if (toFlag) toFlag.textContent = to.flag;
  if (fromText) fromText.textContent = from.name;
  if (toText) toText.textContent = to.name;
  localStorage.setItem("text_single_from_lang", canonical(fromLang));
  localStorage.setItem("text_single_to_lang", canonical(toLang));
}

function renderToggles() {
  if (soundToggle) {
    soundToggle.classList.toggle("active", !!soundEnabled);
    soundToggle.classList.toggle("inactive", !soundEnabled);
  }
  localStorage.setItem("text_single_sound_enabled", soundEnabled ? "1" : "0");
}

function renderLangList(query = "") {
  if (!langList) return;
  const q = String(query || "").trim().toLowerCase();
  const current = popoverMode === "from" ? canonical(fromLang) : canonical(toLang);
  const items = q ? allLangs.filter((item) => item.search.includes(q)) : allLangs;
  if (!items.length) {
    langList.innerHTML = `<div style="padding:22px 14px;text-align:center;color:rgba(255,255,255,.52);font-size:13px;">Aradığın dil bulunamadı.</div>`;
    return;
  }
  langList.innerHTML = items.map((item) => `
    <button class="lang-option ${item.code === current ? "active" : ""}" type="button" data-code="${item.code}">
      <div class="lang-option-left">
        <div class="lang-option-flag">${item.flag}</div>
        <div class="lang-option-text">
          <div class="lang-option-name">${escapeHtml(item.name)}</div>
          <div class="lang-option-code">${escapeHtml(item.code)}</div>
        </div>
      </div>
      <div class="lang-option-check">✓</div>
    </button>`).join("");
  langList.querySelectorAll(".lang-option").forEach((button) => {
    button.addEventListener("click", () => {
      const code = canonical(button.dataset.code);
      if (popoverMode === "from") fromLang = code;
      else toLang = code;
      if (canonical(fromLang) === canonical(toLang)) {
        if (popoverMode === "from") toLang = code === "en" ? "tr" : "en";
        else fromLang = code === "en" ? "tr" : "en";
      }
      renderTopLanguageButtons();
      closeLangPopover();
    });
  });
}

function openLangPopover(mode) {
  popoverMode = mode === "to" ? "to" : "from";
  if (popoverTitle) popoverTitle.textContent = popoverMode === "from" ? "Kaynak Dil Seç" : "Hedef Dil Seç";
  if (langSearch) langSearch.value = "";
  renderLangList("");
  langPopover?.classList.add("show");
  setTimeout(() => langSearch?.focus?.(), 40);
}

function closeLangPopover() {
  langPopover?.classList.remove("show");
}

function stopSpeak() {
  speakToken += 1;
  try { if (audio) { audio.pause(); audio.currentTime = 0; } } catch {}
  audio = null;
  try { window.NativeTTS?.stop?.(); } catch {}
  try { window.AndroidBridge?.stopTts?.(); } catch {}
  try { window.speechSynthesis?.cancel?.(); } catch {}
}

function chooseWebVoice(langCode) {
  const lang = canonical(langCode);
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return voices.find((v) => String(v.lang || "").toLowerCase().startsWith(lang)) || voices.find((v) => String(v.lang || "").toLowerCase().startsWith("en")) || voices[0] || null;
}

async function speakText(text, langCode) {
  if (!soundEnabled) return;
  const value = cleanText(text);
  if (!value || value === "...") return;
  stopRecognition();
  stopSpeak();
  const token = ++speakToken;
  const lang = canonical(langCode || "en");
  try {
    if (window.NativeTTS?.speak) {
      window.NativeTTS.speak(value, lang);
      return;
    }
    if (window.AndroidBridge?.speak) {
      window.AndroidBridge.speak(value, lang);
      return;
    }
  } catch (e) {
    console.warn("[TEXT_TRANSLATE_TTS] native failed", e);
  }
  try {
    const res = await fetch(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: value, lang })
    });
    const data = await res.json().catch(() => null);
    if (token !== speakToken) return;
    if (data?.audio_base64) {
      audio = new Audio("data:audio/mpeg;base64," + data.audio_base64);
      audio.playsInline = true;
      await audio.play();
      return;
    }
  } catch (e) {
    console.warn("[TEXT_TRANSLATE_TTS] api failed", e);
  }
  if (!window.speechSynthesis) return;
  try {
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = BCP[lang] || `${lang}-${lang.toUpperCase()}`;
    const voice = chooseWebVoice(lang);
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn("[TEXT_TRANSLATE_TTS] web failed", e);
  }
}

async function translateViaBackend(text, from, to) {
  const endpoints = [`${API_BASE}/api/translate_ai`, `${API_BASE}/api/translate-ai`, `${API_BASE}/api/translate`];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: cleanText(text), from_lang: canonical(from), to_lang: canonical(to),
          source: canonical(from), target: canonical(to), mode: "normal", use_ai: false, cultural: false, tone: "neutral", style: "warm"
        })
      });
      const data = await res.json().catch(() => null);
      const value = cleanText(data?.translated || data?.translation || data?.text || "");
      if (res.ok && value) return value;
    } catch (e) {
      console.warn("[TEXT_TRANSLATE] backend failed", { endpoint, error: e?.message });
    }
  }
  return null;
}

async function translateGoogleFree(text, from, to) {
  const params = new URLSearchParams({ client: "gtx", sl: canonical(from), tl: canonical(to), dt: "t", q: text });
  const res = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`);
  if (!res.ok) throw new Error("translate_fallback_failed");
  const data = await res.json().catch(() => null);
  let out = "";
  if (Array.isArray(data?.[0])) {
    for (const item of data[0]) if (Array.isArray(item) && item[0]) out += String(item[0]);
  }
  out = cleanText(out);
  if (!out) throw new Error("translate_empty");
  return out;
}

async function translateAny(text, from, to) {
  return (await translateViaBackend(text, from, to)) || (await translateGoogleFree(text, from, to));
}

async function translateText() {
  const sourceText = cleanText(inputBox?.value || "");
  if (!sourceText) {
    setOutput("...");
    toast("Önce çevrilecek bir metin yaz.");
    syncInputButtons();
    return;
  }
  const token = ++translateToken;
  const from = canonical(fromLang);
  const to = canonical(toLang);
  const originalText = sourceText;
  if (inputBox) {
    inputBox.value = "";
    autoResizeInput();
  }
  if (inputPreviewBubble) inputPreviewBubble.textContent = originalText;
  syncInputButtons();
  setState("translating");
  setOutput("Çevriliyor...");
  console.warn("[TEXT_TRANSLATE] translate triggered", { from, to, length: originalText.length });
  try {
    const out = await translateAny(originalText, from, to);
    if (token !== translateToken) return;
    setOutput(out);
    setState("ready");
    console.warn("[TEXT_TRANSLATE] translate success", { length: out.length });
    if (soundEnabled) setTimeout(() => speakText(out, to), 140);
  } catch (e) {
    if (token !== translateToken) return;
    console.warn("[TEXT_TRANSLATE] translate failure", e);
    setOutput("Çeviri şu anda tamamlanamadı. Lütfen tekrar deneyin.");
    setState("error");
    toast("Çeviri şu anda tamamlanamadı. Lütfen tekrar deneyin.");
    setTimeout(() => setState("ready"), 1200);
  }
}

function dispatchInputUpdated() {
  try { inputBox?.dispatchEvent(new Event("input", { bubbles: true })); } catch {}
}

function applyTranscriptToInput(transcript, autoTranslate = true) {
  const value = cleanText(transcript);
  console.warn("[TEXT_TRANSLATE_SPEECH] speech result received", { length: value.length });
  if (!value || !inputBox) return;
  inputBox.value = value;
  autoResizeInput();
  syncInputPreview();
  syncInputButtons();
  dispatchInputUpdated();
  console.warn("[TEXT_TRANSLATE_SPEECH] input updated", { length: value.length });
  if (autoTranslate && value.length > 1) {
    clearTimeout(speechTranslateTimer);
    speechTranslateTimer = setTimeout(() => {
      console.warn("[TEXT_TRANSLATE_SPEECH] translate triggered");
      translateText();
    }, 180);
  }
}

function parseNativeSpeechPayload(payload) {
  if (typeof payload === "string") {
    try { return JSON.parse(payload); } catch { return { text: payload }; }
  }
  return payload || {};
}

window.onNativeSpeechResult = function(payload, maybeText, maybeFinal) {
  const data = typeof payload === "string" && (payload === "text" || payload === "text_public")
    ? { text: maybeText, isFinal: maybeFinal !== false }
    : parseNativeSpeechPayload(payload);
  const transcript = data?.text || data?.result || data?.transcript || data?.value || "";
  const isFinal = data?.isFinal !== false && data?.final !== false;
  if (transcript) {
    lastSpeechResultAt = Date.now();
    applyTranscriptToInput(transcript, isFinal);
  }
  if (isFinal) {
    listening = false;
    syncInputButtons();
  }
};

function friendlySpeechError(error) {
  const code = String(error || "").toLowerCase();
  if (code.includes("permission") || code.includes("denied") || code.includes("not_allowed")) {
    return "Mikrofonu kullanmak için izin vermeniz gerekiyor.";
  }
  if (code.includes("no_speech") || code.includes("no speech") || code.includes("timeout") || code.includes("empty")) {
    return "Ses algılanamadı. Tekrar deneyebilirsiniz.";
  }
  return "Mikrofon şu anda başlatılamadı. Lütfen tekrar deneyin.";
}

function isSoftSpeechError(error) {
  const code = String(error || "").toLowerCase();
  return code.includes("no_speech") ||
    code.includes("no speech") ||
    code.includes("timeout") ||
    code.includes("empty") ||
    code.includes("aborted") ||
    code.includes("abort") ||
    code.includes("cancelled") ||
    code.includes("canceled") ||
    code.includes("stopped");
}

function markSpeechStopGrace(ms = 1400) {
  suppressSpeechErrorUntil = Date.now() + Math.max(0, Number(ms) || 0);
}

function shouldIgnoreSpeechError(error) {
  if (!isSoftSpeechError(error)) return false;
  const now = Date.now();
  if (now < suppressSpeechErrorUntil) return true;
  if (lastSpeechResultAt && now - lastSpeechResultAt < 1800) return true;
  return false;
}

function goBackToFaceToFace(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();

  const fallback = "/facetoface.html";

  try {
    const ref = document.referrer || "";
    if (ref) {
      const refUrl = new URL(ref, location.origin);
      const currentUrl = new URL(location.href);
      const sameOrigin = refUrl.origin === currentUrl.origin;
      const isFaceToFace = /\/facetoface(?:_ios)?\.html$/i.test(refUrl.pathname);

      if (sameOrigin && isFaceToFace) {
        location.href = refUrl.href;
        return;
      }
    }
  } catch {}

  location.href = fallback;
}

window.onNativeSpeechError = function(error) {
  console.warn("[TEXT_TRANSLATE_SPEECH] speech failure", { error });
  listening = false;
  syncInputButtons();

  if (shouldIgnoreSpeechError(error)) {
    console.warn("[TEXT_TRANSLATE_SPEECH] soft speech error ignored", { error });
    return;
  }

  toast(friendlySpeechError(error));
};

function extractStableRecognitionText(results) {
  let latestFinal = "";
  let latestInterim = "";
  for (let i = 0; i < results.length; i += 1) {
    const piece = cleanText(results[i]?.[0]?.transcript || "");
    if (!piece) continue;
    if (results[i].isFinal) latestFinal = piece;
    else latestInterim = piece;
  }
  return cleanText(latestFinal || latestInterim);
}


function getNativeSpeechStarter() {
  const candidates = [
    { bridge: window.Native, names: ["startSpeechRecognition", "startNativeSpeechRecognition"], label: "Native" },
    { bridge: window.AndroidBridge, names: ["startSpeechRecognition", "startNativeSpeechRecognition"], label: "AndroidBridge" }
  ];

  for (const candidate of candidates) {
    const bridge = candidate.bridge;
    if (!bridge) continue;

    for (const name of candidate.names) {
      const fn = bridge?.[name];
      if (typeof fn === "function") {
        return { bridge, fn, name, label: candidate.label };
      }
    }
  }

  return null;
}

function startNativeRecognition(langCode, reason = "fallback") {
  const starter = getNativeSpeechStarter();
  if (!starter) return false;

  try {
    listening = true;
    syncInputButtons();
    console.warn("[TEXT_TRANSLATE_SPEECH] native speech start requested", {
      bridge: starter.label,
      method: starter.name,
      langCode,
      reason
    });

    try {
      starter.fn.call(starter.bridge, langCode, "text");
    } catch (firstError) {
      console.warn("[TEXT_TRANSLATE_SPEECH] native text mode failed, retrying text_public", firstError);
      starter.fn.call(starter.bridge, langCode, "text_public");
    }

    return true;
  } catch (e) {
    console.warn("[TEXT_TRANSLATE_SPEECH] native start failed", e);
    listening = false;
    syncInputButtons();
    return false;
  }
}

function startBrowserRecognition(langCode) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return false;

  recognizer = new SpeechRecognition();
  recognizer.lang = langCode;
  recognizer.interimResults = true;
  recognizer.continuous = false;
  recognizer.maxAlternatives = 1;

  recognizer.onstart = () => {
    listening = true;
    syncInputButtons();
    console.warn("[TEXT_TRANSLATE_SPEECH] browser speech started", { langCode });
  };

  recognizer.onresult = (event) => {
    const text = extractStableRecognitionText(event.results);
    if (text) {
      lastSpeechResultAt = Date.now();
      applyTranscriptToInput(text, false);
    }

    const last = event.results[event.results.length - 1];
    if (last?.isFinal && text) {
      lastSpeechResultAt = Date.now();
      applyTranscriptToInput(text, true);
    }
  };

  recognizer.onerror = (event) => {
    const error = event?.error || "";
    console.warn("[TEXT_TRANSLATE_SPEECH] browser speech error", error);

    try { recognizer?.stop?.(); } catch {}
    try { recognizer?.abort?.(); } catch {}
    recognizer = null;
    listening = false;
    syncInputButtons();

    if (shouldIgnoreSpeechError(error)) {
      console.warn("[TEXT_TRANSLATE_SPEECH] soft browser error ignored", { error });
      return;
    }

    const code = String(error || "").toLowerCase();
    const isPermissionError = code.includes("permission") || code.includes("denied") || code.includes("not-allowed");

    if (!isPermissionError && startNativeRecognition(langCode, `browser-error:${error || "unknown"}`)) {
      return;
    }

    toast(friendlySpeechError(error));
  };

  recognizer.onend = () => {
    listening = false;
    syncInputButtons();
  };

  try {
    recognizer.start();
    return true;
  } catch (e) {
    console.warn("[TEXT_TRANSLATE_SPEECH] browser start failed", e);
    try { recognizer?.abort?.(); } catch {}
    recognizer = null;
    listening = false;
    syncInputButtons();
    return false;
  }
}

function stopRecognition() {
  markSpeechStopGrace();
  try { recognizer?.stop?.(); } catch {}
  try { recognizer?.abort?.(); } catch {}
  try { window.Native?.stopSpeechRecognition?.(); } catch {}
  try { window.AndroidBridge?.stopSpeechRecognition?.(); } catch {}
  recognizer = null;
  listening = false;
  syncInputButtons();
}

function startRecognition() {
  console.warn("[TEXT_TRANSLATE_SPEECH] mic button clicked");

  if (listening) {
    stopRecognition();
    return;
  }

  stopSpeak();

  const langCode = BCP[canonical(fromLang)] || `${canonical(fromLang)}-${canonical(fromLang).toUpperCase()}`;

  // Önce tarayıcı Web Speech hattını deniyoruz. Android/WebView tarafında native köprü
  // bazen var görünüp asenkron hata döndürüyor; bu da çalışan mikrofonu "başlatılamadı"
  // toastına düşürüyordu. Web Speech yoksa veya başlatılamazsa native köprüye düşüyoruz.
  if (startBrowserRecognition(langCode)) return;
  if (startNativeRecognition(langCode, "browser-unavailable")) return;

  toast("Bu cihazda sesli giriş desteklenmiyor.");
}

async function requireLogin() {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session?.user) {
    location.replace("/pages/login.html");
    return false;
  }
  try { await ensureAuthAndCacheUser(); } catch {}
  return true;
}

function bindEvents() {
  fromBtn?.addEventListener("click", () => openLangPopover("from"));
  toBtn?.addEventListener("click", () => openLangPopover("to"));
  swapBtn?.addEventListener("click", () => {
    const oldFrom = fromLang;
    fromLang = toLang;
    toLang = oldFrom;
    renderTopLanguageButtons();
    toast("Diller değiştirildi.");
  });
  popoverClose?.addEventListener("click", closeLangPopover);
  langPopover?.addEventListener("click", (event) => { if (event.target === langPopover) closeLangPopover(); });
  langSearch?.addEventListener("input", (event) => renderLangList(event.target.value || ""));
  window.addEventListener("keydown", (event) => { if (event.key === "Escape" && langPopover?.classList.contains("show")) closeLangPopover(); });
  soundToggle?.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    renderToggles();
    if (!soundEnabled) stopSpeak();
    toast(soundEnabled ? "Ses açıldı." : "Ses kapatıldı.");
  });
  translateBtn?.addEventListener("click", translateText);
  inputBox?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      translateText();
    }
  });
  inputBox?.addEventListener("input", () => {
    autoResizeInput();
    syncInputPreview();
    syncInputButtons();
  });
  micBtn?.addEventListener("click", startRecognition);
  backLink?.addEventListener("click", goBackToFaceToFace);
  homeLink?.addEventListener("click", (event) => { event.preventDefault(); location.href = "/pages/home.html"; });
  homeBtn?.addEventListener("click", () => { location.href = "/pages/home.html"; });
  clearBtn?.addEventListener("click", (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    markSpeechStopGrace(1800);
    if (inputBox) {
      inputBox.value = "";
      autoResizeInput();
    }
    clearTimeout(speechTranslateTimer);
    setOutput("...");
    syncInputPreview();
    stopSpeak();
    stopRecognition();
    setState("ready");
  });
}

async function boot() {
  if (booted) return;
  booted = true;
  if (!(await requireLogin())) return;
  allLangs = buildLangs();
  ensureLangs();
  renderTopLanguageButtons();
  renderToggles();
  bindEvents();
  setOutput("...");
  if (inputBox) {
    inputBox.removeAttribute("readonly");
    inputBox.disabled = false;
    autoResizeInput();
  }
  syncInputPreview();
  syncInputButtons();
  setState("ready");
  console.warn("[TEXT_TRANSLATE] ready", { fromLang, toLang, langs: allLangs.length });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
else boot();

window.addEventListener("beforeunload", () => {
  stopSpeak();
  stopRecognition();
});
