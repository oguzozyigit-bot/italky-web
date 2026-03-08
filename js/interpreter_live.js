import { LANG_POOL } from "/js/lang_pool_full.js";
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
  ru: "ru-RU",
  el: "el-GR",
  az: "az-AZ",
  ka: "ka-GE",
};

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim();
}

const LANGS = (Array.isArray(LANG_POOL) ? LANG_POOL : [])
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
      code: c,
      flag: "🌐",
      name: c.toUpperCase(),
      bcp: BCP[c] || "en-US",
    }
  );
}

function labelChip(code) {
  const o = langObj(code);
  return `${o.flag} ${o.name}`;
}

const chatArea = $("chatArea");
const msgInput = $("msgInput");
const micBtn = $("micBtn");
const sendBtn = $("sendBtn");
const statusPill = $("statusPill");
const toastEl = $("toast");

const sourceLangBtn = $("sourceLangBtn");
const targetLangBtn = $("targetLangBtn");
const sourceLangTxt = $("sourceLangTxt");
const targetLangTxt = $("targetLangTxt");

const sheetBackdrop = $("sheetBackdrop");
const optionSheet = $("optionSheet");
const sheetTitle = $("sheetTitle");
const sheetList = $("sheetList");

let sourceLang = "tr";
let targetLang = "en";
let recognizer = null;
let isListening = false;
let currentAudio = null;
let ttsDebounceAt = 0;

function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = String(msg || "");
  toastEl.classList.add("show");
  clearTimeout(window.__interpToast);
  window.__interpToast = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

function refreshLangLabels() {
  if (sourceLangTxt) sourceLangTxt.textContent = labelChip(sourceLang);
  if (targetLangTxt) targetLangTxt.textContent = labelChip(targetLang);
}

function openSheet(kind) {
  if (!sheetList || !sheetTitle) return;

  const current = kind === "source" ? sourceLang : targetLang;
  sheetTitle.textContent = kind === "source" ? "Benim Dilim" : "Karşı Taraf Dili";

  sheetList.innerHTML = LANGS.map((l) => {
    const active = canonical(l.code) === canonical(current) ? "active" : "";
    return `
      <div class="sheetItem ${active}" data-kind="${kind}" data-code="${l.code}">
        <div class="sheetItemLabel">${l.flag} ${l.name}</div>
        <div class="sheetItemCheck"></div>
      </div>
    `;
  }).join("");

  sheetList.querySelectorAll(".sheetItem").forEach((el) => {
    el.addEventListener("click", () => {
      const k = el.dataset.kind;
      const code = el.dataset.code || "en";
      if (k === "source") sourceLang = code;
      else targetLang = code;
      refreshLangLabels();
      closeSheet();
    });
  });

  sheetBackdrop?.classList.add("show");
  optionSheet?.classList.add("show");
}

function closeSheet() {
  sheetBackdrop?.classList.remove("show");
  optionSheet?.classList.remove("show");
}

function autoGrowTextarea() {
  if (!msgInput) return;
  msgInput.style.height = "auto";
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + "px";
}

function keepBottom() {
  if (!chatArea) return;
  const apply = () => {
    try { chatArea.scrollTop = chatArea.scrollHeight + 9999; } catch {}
  };
  apply();
  requestAnimationFrame(apply);
  setTimeout(apply, 30);
  setTimeout(apply, 120);
}

function addMeta(text) {
  const el = document.createElement("div");
  el.className = "bubble meta";
  el.textContent = text;
  chatArea?.appendChild(el);
  keepBottom();
}

function addMe(text) {
  const el = document.createElement("div");
  el.className = "bubble me";
  el.textContent = String(text || "").trim();
  chatArea?.appendChild(el);
  keepBottom();
}

function addTranslated(text, speakLang) {
  const bubble = document.createElement("div");
  bubble.className = "bubble translated";

  const row = document.createElement("div");
  row.className = "bubbleRow";

  const spk = document.createElement("button");
  spk.type = "button";
  spk.className = "spkBtn";
  spk.setAttribute("aria-label", "Dinle");
  spk.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M3 10v4h4l5 4V6L7 10H3"></path>
      <path d="M16 8a4 4 0 0 1 0 8"></path>
      <path d="M19 5a8 8 0 0 1 0 14"></path>
    </svg>
  `;

  const txt = document.createElement("div");
  txt.textContent = String(text || "").trim();

  spk.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await speak(txt.textContent || "", speakLang);
  });

  row.appendChild(spk);
  row.appendChild(txt);
  bubble.appendChild(row);
  chatArea?.appendChild(bubble);
  keepBottom();
}

async function getCurrentUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

function getVoicePreference() {
  return localStorage.getItem("tts_voice") || "auto";
}

function stopAudio() {
  try {
    currentAudio?.pause?.();
    currentAudio = null;
  } catch {}
  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}
}

function base64ToBlob(base64, mime = "audio/mpeg") {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mime });
}

async function speakViaApi(text, langCode) {
  const userId = await getCurrentUserId();

  const r = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: String(text || "").trim(),
      lang: canonical(langCode),
      user_id: userId,
      module: "interpreter",
      voice: getVoicePreference(),
    }),
  });

  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok || !j?.audio_base64) {
    throw new Error(j?.error || j?.detail || "TTS unavailable");
  }

  const blob = base64ToBlob(j.audio_base64, "audio/mpeg");
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;

  audio.onended = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  };

  audio.onerror = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  };

  await audio.play();
}

function speakFallback(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return;

  const c = canonical(langCode);

  if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
    try {
      window.NativeTTS.speak(value, c);
      return;
    } catch {}
  }

  if (!window.speechSynthesis) return;

  const u = new SpeechSynthesisUtterance(value);
  u.lang = langObj(c).bcp;
  u.rate = c === "tr" ? 0.92 : 0.88;
  u.pitch = 1.0;
  u.volume = 1;
  setTimeout(() => {
    try { window.speechSynthesis.speak(u); } catch {}
  }, 60);
}

async function speak(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return;

  const now = Date.now();
  if (now - ttsDebounceAt < 250) stopAudio();
  ttsDebounceAt = now;
  stopAudio();

  try {
    await speakViaApi(value, langCode);
  } catch (e) {
    console.warn("Interpreter TTS fallback", e);
    speakFallback(value, langCode);
  }
}

async function translateText(text, from, to) {
  try {
    const r = await fetch(`${API_BASE}/api/translate_ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: String(text || "").trim(),
        from_lang: canonical(from),
        to_lang: canonical(to),
      }),
    });

    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    return String(j?.translated || "").trim() || null;
  } catch {
    return null;
  }
}

async function submitText(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return;

  addMe(text);
  addMeta("Çevriliyor...");

  const tr = await translateText(text, sourceLang, targetLang);

  const metas = [...(chatArea?.querySelectorAll(".bubble.meta") || [])];
  const lastMeta = metas[metas.length - 1];
  lastMeta?.remove?.();

  if (!tr) {
    addMeta("⚠️ Çeviri servisine ulaşılamadı");
    return;
  }

  addTranslated(tr, targetLang);
  await speak(tr, targetLang);

  if (msgInput) {
    msgInput.value = "";
    autoGrowTextarea();
  }
}

function buildRecognizer(langCode) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = langObj(langCode).bcp;
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  return rec;
}

function stopRecognizer() {
  if (recognizer) {
    try { recognizer.stop(); } catch {}
    recognizer = null;
  }
  isListening = false;
  micBtn?.classList.remove("listening");
  if (statusPill) statusPill.textContent = "Kulaklık önerilir";
}

function startRecognizer() {
  const rec = buildRecognizer(sourceLang);
  if (!rec) {
    toast("Bu cihaz konuşma algılamayı desteklemiyor");
    return;
  }

  recognizer = rec;
  isListening = true;
  micBtn?.classList.add("listening");
  if (statusPill) statusPill.textContent = "Dinleniyor...";

  rec.onresult = async (e) => {
    const heard = e.results?.[0]?.[0]?.transcript || "";
    stopRecognizer();
    await submitText(heard);
  };

  rec.onerror = () => {
    stopRecognizer();
    toast("Mikrofon algılanamadı");
  };

  rec.onend = () => {
    recognizer = null;
    isListening = false;
    micBtn?.classList.remove("listening");
    if (statusPill) statusPill.textContent = "Kulaklık önerilir";
  };

  try {
    rec.start();
  } catch {
    stopRecognizer();
    toast("Mikrofon başlatılamadı");
  }
}

function bind() {
  refreshLangLabels();
  addMeta("Interpreter hazır");

  sourceLangBtn?.addEventListener("click", () => openSheet("source"));
  targetLangBtn?.addEventListener("click", () => openSheet("target"));
  sheetBackdrop?.addEventListener("click", closeSheet);

  msgInput?.addEventListener("input", autoGrowTextarea);

  msgInput?.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      await submitText(msgInput.value);
    }
  });

  sendBtn?.addEventListener("click", async () => {
    await submitText(msgInput?.value || "");
  });

  micBtn?.addEventListener("click", () => {
    if (isListening) {
      stopRecognizer();
      return;
    }
    startRecognizer();
  });
}

try {
  const shell = await import("/js/ui_shell.js");
  try { shell.mountShell({ scroll: "none" }); } catch {}
} catch {}

bind();
