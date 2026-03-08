import { mountShell } from "/js/ui_shell.js";
import { LANG_POOL } from "/js/lang_pool_full.js";

mountShell({ scroll: "auto" });

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const roomCodeView = $("roomCodeView");
const modeView = $("modeView");
const myLangView = $("myLangView");
const peerLangView = $("peerLangView");
const pairDot = $("pairDot");
const pairText = $("pairText");
const headsetDot = $("headsetDot");
const headsetText = $("headsetText");
const liveHelper = $("liveHelper");
const liveMic = $("liveMic");
const conversation = $("conversation");
const clearBtn = $("clearBtn");
const leaveBtn = $("leaveBtn");
const page = $("pageContent");

let recognizer = null;
let isRecording = false;
let ttsDebounceAt = 0;

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
  return String(code || "").toLowerCase().trim();
}

function getLangMeta(code) {
  const c = canonical(code);
  const item = (Array.isArray(LANG_POOL) ? LANG_POOL : []).find(
    (x) => canonical(x.code) === c
  );
  return {
    code: c,
    flag: item?.flag || "🌐",
    name: item?.name || c.toUpperCase(),
    bcp: BCP[c] || "en-US",
  };
}

function getLangLabel(code) {
  const x = getLangMeta(code);
  return `${x.flag} ${x.name}`;
}

function getParams() {
  const u = new URL(location.href);
  return {
    room: (u.searchParams.get("room") || "").trim().toUpperCase(),
    my: canonical(u.searchParams.get("my") || "tr"),
    peer: canonical(u.searchParams.get("peer") || "en"),
    mode: (u.searchParams.get("mode") || "host").trim(),
  };
}

function paintHeader() {
  const p = getParams();
  roomCodeView.textContent = p.room || "------";
  modeView.textContent = p.mode === "host" ? "Host" : "Guest";
  myLangView.textContent = getLangLabel(p.my);
  peerLangView.textContent = getLangLabel(p.peer);

  pairDot.classList.add("ok");
  pairText.textContent = "Canlı tercüman modu hazır.";
}

function getHeadsetState() {
  try {
    if (window.Android && typeof window.Android.isHeadsetConnected === "function") {
      return !!window.Android.isHeadsetConnected();
    }
  } catch {}
  return false;
}

function paintHeadsetState() {
  const connected = getHeadsetState();
  headsetDot.classList.remove("ok", "warn");

  if (connected) {
    headsetDot.classList.add("ok");
    headsetText.textContent = "Kulaklık bağlı. Çeviri kulaklığa verilmeye hazır.";
  } else {
    headsetDot.classList.add("warn");
    headsetText.textContent = "Kulaklık algılanmadı. Devam edebilirsiniz ama kulaklık önerilir.";
  }
}

function setHelper(text, kind = "ready") {
  liveHelper.className = `helper ${kind}`;
  liveHelper.textContent = text;
}

function setPageState(state) {
  page.classList.remove("is-listening", "is-translating");
  liveMic.classList.remove("listening");

  if (state === "listening") {
    page.classList.add("is-listening");
    liveMic.classList.add("listening");
  }
  if (state === "translating") {
    page.classList.add("is-translating");
  }
}

function keepLatestVisible() {
  const apply = () => {
    try {
      conversation.scrollTop = conversation.scrollHeight + 9999;
    } catch {}
  };
  apply();
  requestAnimationFrame(apply);
  setTimeout(apply, 30);
  setTimeout(apply, 120);
}

function clearLatestTranslated() {
  conversation.querySelectorAll(".bubble.translated.is-latest").forEach((el) => {
    el.classList.remove("is-latest");
  });
}

function stopAudio() {
  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}
}

function speak(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return;

  const now = Date.now();
  if (now - ttsDebounceAt < 250) stopAudio();
  ttsDebounceAt = now;

  stopAudio();

  const c = canonical(langCode);

  if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
    try {
      window.NativeTTS.speak(value, c);
      return;
    } catch {}
  }

  if (!window.speechSynthesis) return;

  const meta = getLangMeta(c);
  const u = new SpeechSynthesisUtterance(value);
  u.lang = meta.bcp;
  u.pitch = 1.0;

  if (c === "en") u.rate = 0.82;
  else if (c === "de" || c === "fr" || c === "it" || c === "es") u.rate = 0.88;
  else u.rate = 0.92;

  u.volume = 1;

  setTimeout(() => {
    try { window.speechSynthesis.speak(u); } catch {}
  }, 60);
}

function addBubble(kind, text, opts = {}) {
  const row = document.createElement("div");
  row.className = `bubble ${kind}` + (opts.latest ? " is-latest" : "");

  const inner = document.createElement("div");
  inner.className = "bubbleInner";

  if (kind === "translated") {
    const spk = document.createElement("button");
    spk.type = "button";
    spk.className = "spk";
    spk.setAttribute("aria-label", "Tekrar dinle");
    spk.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M3 10v4h4l5 4V6L7 10H3"></path>
        <path d="M16 8a4 4 0 0 1 0 8"></path>
        <path d="M19 5a8 8 0 0 1 0 14"></path>
      </svg>
    `;
    spk.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      speak(text, opts.speakLang || getParams().peer);
    });
    inner.appendChild(spk);
  }

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "").trim();
  inner.appendChild(txt);

  row.appendChild(inner);
  conversation.appendChild(row);
  keepLatestVisible();

  return row;
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

function buildRecognizer(langCode) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = getLangMeta(langCode).bcp;
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
}

async function finalizeSpeech(text) {
  const p = getParams();
  const heard = String(text || "").trim();

  if (!heard) {
    setPageState("");
    setHelper("Ses algılanamadı. Tekrar deneyiniz.", "wait");
    setTimeout(() => setHelper("Konuşmak için mikrofona dokununuz.", "ready"), 1400);
    return;
  }

  addBubble("me", heard);
  clearLatestTranslated();

  setPageState("translating");
  setHelper("Çevriliyor...", "live");

  const placeholder = addBubble("translated", "Çevriliyor...", {
    latest: true,
    speakLang: p.peer,
  });

  const txtEl = placeholder.querySelector(".txt");
  const translated = await translateText(heard, p.my, p.peer);

  if (!translated) {
    if (txtEl) txtEl.textContent = "⚠️ Çeviri servisine ulaşılamadı";
    keepLatestVisible();
    setPageState("");
    setHelper("Çeviri başarısız. Tekrar deneyiniz.", "wait");
    setTimeout(() => setHelper("Konuşmak için mikrofona dokununuz.", "ready"), 1600);
    return;
  }

  if (txtEl) txtEl.textContent = translated;
  keepLatestVisible();

  speak(translated, p.peer);
  setPageState("");
  setHelper("Konuşmak için mikrofona dokununuz.", "ready");
}

function startRecording() {
  const p = getParams();
  const rec = buildRecognizer(p.my);

  if (!rec) {
    setHelper("Bu cihazda konuşma tanıma desteklenmiyor.", "wait");
    return;
  }

  recognizer = rec;
  isRecording = true;
  setPageState("listening");
  setHelper("Konuşmanız bitince mikrofona tekrar basınız.", "live");

  rec.onresult = (e) => {
    const heard = e.results?.[0]?.[0]?.transcript || "";
    Promise.resolve().then(() => finalizeSpeech(heard));
  };

  rec.onerror = () => {
    recognizer = null;
    isRecording = false;
    setPageState("");
    setHelper("Konuşma alınamadı. Tekrar deneyiniz.", "wait");
    setTimeout(() => setHelper("Konuşmak için mikrofona dokununuz.", "ready"), 1600);
  };

  rec.onend = () => {
    recognizer = null;
    isRecording = false;
  };

  try {
    rec.start();
  } catch {
    recognizer = null;
    isRecording = false;
    setPageState("");
    setHelper("Mikrofon başlatılamadı.", "wait");
    setTimeout(() => setHelper("Konuşmak için mikrofona dokununuz.", "ready"), 1600);
  }
}

function toggleRecording() {
  if (isRecording) {
    stopRecognizer();
    isRecording = false;
    setPageState("");
    setHelper("Ses işleniyor...", "live");
    return;
  }
  startRecording();
}

function clearConversation() {
  stopAudio();
  stopRecognizer();
  isRecording = false;
  conversation.innerHTML = "";
  setPageState("");
  setHelper("Konuşmak için mikrofona dokununuz.", "ready");
}

function leaveRoom() {
  const p = getParams();
  const q = new URLSearchParams({
    room: p.room,
    my: p.my,
    peer: p.peer,
    mode: p.mode,
  });
  location.href = `/pages/interpreter_room.html?${q.toString()}`;
}

liveMic?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  toggleRecording();
});

clearBtn?.addEventListener("click", clearConversation);
leaveBtn?.addEventListener("click", leaveRoom);

paintHeader();
paintHeadsetState();
setHelper("Konuşmak için mikrofona dokununuz.", "ready");
fetch(`${API_BASE}/api/translate_ai/health`).catch(() => {});
setInterval(paintHeadsetState, 2500);
