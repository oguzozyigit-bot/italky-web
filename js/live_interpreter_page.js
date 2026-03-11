// FILE: /js/live_interpreter_page.js

import { LANG_POOL } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

/* =========================
   DOM
========================= */
const frameRoot = $("frameRoot");

const topBody = $("topBody");
const botBody = $("botBody");

const topLangBtn = $("topLangBtn");
const topLangTxt = $("topLangTxt");
const popTop = $("pop-top");
const listTop = $("list-top");
const closeTop = $("close-top");

const topVoiceBtn = $("topVoiceBtn");
const voicePopTop = $("voice-pop-top");
const voiceListTop = $("voice-list-top");
const closeVoiceTop = $("close-voice-top");

const topMuteBtn = $("topMuteBtn");

const homeLink = $("homeLink");
const homeBtn = $("homeBtn");
const clearBtn = $("clearBtn");

const botMic = $("botMic");
const botHelper = $("botHelper");

/* =========================
   QUERY / ROOM STATE
========================= */
const query = new URLSearchParams(location.search);

const roomId = String(query.get("room") || "").trim();
const role = String(query.get("role") || "guest").trim(); // guest | host
const hostCode = String(query.get("host") || "").trim();

let myLang = String(query.get("my") || localStorage.getItem("live_interpreter_lang") || "tr").trim();
let peerLang = String(query.get("peer") || localStorage.getItem("live_interpreter_peer_lang") || "en").trim();

let myVoicePref = localStorage.getItem("live_interpreter_voice") || "female";
let isMuted = localStorage.getItem("live_interpreter_muted") === "1";

let recognition = null;
let isListening = false;
let activeUtterance = null;

let pollTimer = null;
let lastSeenMessageId = "";
let localMessageKeys = new Set();

/* =========================
   LANGS
========================= */
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
  pt: "pt-PT",
  nl: "nl-NL",
  ar: "ar-SA",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR"
};

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim();
}

myLang = canonical(myLang || "tr");
peerLang = canonical(peerLang || "en");

const LANGS = (Array.isArray(LANG_POOL) ? LANG_POOL : [])
  .map((l) => {
    const code = canonical(l.code);
    if (!code) return null;
    return {
      code,
      flag: l.flag || "🌐",
      name: l.name || code.toUpperCase(),
      bcp: BCP[code] || "en-US"
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
      bcp: BCP[c] || "en-US"
    }
  );
}

function labelChip(code) {
  const o = langObj(code);
  return `${o.flag} ${o.name}`;
}

/* =========================
   VOICE
========================= */
const VOICE_OPTIONS = [
  { id: "female", label: "Kadın Ses" },
  { id: "male", label: "Erkek Ses" },
  { id: "self", label: "Kendi Sesim" }
];

function refreshVoiceLabel() {
  const item = VOICE_OPTIONS.find((v) => v.id === myVoicePref) || VOICE_OPTIONS[0];
  if (topVoiceBtn) topVoiceBtn.textContent = `${item.label} ⌵`;
}

/* =========================
   UI HELPERS
========================= */
function setHelper(mode, text) {
  if (!botHelper) return;
  botHelper.className = "helper-text";
  if (mode === "ready") botHelper.classList.add("helper-ready");
  else if (mode === "wait") botHelper.classList.add("helper-wait");
  else if (mode === "repeat") botHelper.classList.add("helper-repeat");
  botHelper.textContent = text || "";
}

function setRootState(state) {
  if (!frameRoot) return;
  frameRoot.classList.remove("is-ready", "is-listening", "is-translating", "is-idle", "is-error");
  frameRoot.classList.add(state);
}

function closeAllPop() {
  popTop?.classList.remove("show");
  voicePopTop?.classList.remove("show");
}

function updateMuteButton() {
  if (!topMuteBtn) return;
  topMuteBtn.style.opacity = isMuted ? "0.55" : "1";
}

function clearLatest(container) {
  container?.querySelectorAll(".bubble.me.is-latest")?.forEach((el) => {
    el.classList.remove("is-latest");
  });
}

/* =========================
   POPUPS
========================= */
function renderLangPopup() {
  if (!listTop) return;

  listTop.innerHTML = LANGS.map((l) => {
    const active = canonical(l.code) === canonical(myLang) ? "active" : "";
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
      const code = el.getAttribute("data-code") || "tr";
      myLang = canonical(code);
      localStorage.setItem("live_interpreter_lang", myLang);
      if (topLangTxt) topLangTxt.textContent = labelChip(myLang);
      closeAllPop();
      rebuildRecognition();
    });
  });
}

function renderVoicePopup() {
  if (!voiceListTop) return;

  voiceListTop.innerHTML = VOICE_OPTIONS.map((v) => {
    const active = v.id === myVoicePref ? "active" : "";
    return `
      <div class="pop-item ${active}" data-voice="${v.id}">
        <div class="pop-left">
          <div class="pop-name">${v.label}</div>
        </div>
        <div class="pop-code">${v.id.toUpperCase()}</div>
      </div>
    `;
  }).join("");

  voiceListTop.querySelectorAll(".pop-item").forEach((el) => {
    el.addEventListener("click", () => {
      myVoicePref = el.getAttribute("data-voice") || "female";
      localStorage.setItem("live_interpreter_voice", myVoicePref);
      refreshVoiceLabel();
      closeAllPop();
    });
  });
}

/* =========================
   BUBBLES
========================= */
function makeSpeakerButton(text, langCode) {
  const btn = document.createElement("button");
  btn.className = "spk-icon";
  btn.type = "button";
  btn.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M3 10v4h4l5 4V6L7 10H3"></path>
      <path d="M16 9a4 4 0 0 1 0 6"></path>
      <path d="M19 5a8 8 0 0 1 0 14"></path>
    </svg>
  `;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    speak(text, langCode);
  });
  return btn;
}

function addTopBubble(text) {
  if (!topBody) return;

  const row = document.createElement("div");
  row.className = "bubble me is-latest";

  const wrap = document.createElement("div");
  wrap.className = "bubble-row";

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "").trim();

  wrap.appendChild(txt);
  wrap.appendChild(makeSpeakerButton(text, myLang));
  row.appendChild(wrap);

  clearLatest(topBody);
  topBody.appendChild(row);
  topBody.scrollTop = topBody.scrollHeight;

  demoteOld(topBody);
}

function addBottomBubble(text) {
  if (!botBody) return;

  const row = document.createElement("div");
  row.className = "bubble me is-latest";

  const wrap = document.createElement("div");
  wrap.className = "bubble-row";

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "").trim();

  wrap.appendChild(txt);
  row.appendChild(wrap);

  clearLatest(botBody);
  botBody.appendChild(row);
  botBody.scrollTop = botBody.scrollHeight;

  demoteOld(botBody);
}

function demoteOld(container) {
  const items = [...container.querySelectorAll(".bubble.me")];
  if (items.length <= 1) return;

  items.forEach((el, idx) => {
    if (idx < items.length - 1) {
      el.classList.remove("is-latest");
      el.style.opacity = idx < items.length - 3 ? ".45" : ".72";
    }
  });
}

/* =========================
   TTS
========================= */
function stopSpeech() {
  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}
  activeUtterance = null;
}

function chooseWebVoice(langCode) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const bcp = langObj(langCode).bcp.toLowerCase();
  const langBase = canonical(langCode);

  let pool = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith(langBase));
  if (!pool.length) pool = voices.filter((v) => String(v.lang || "").toLowerCase() === bcp);
  if (!pool.length) pool = voices;

  if (!pool.length) return null;

  if (myVoicePref === "female") {
    return (
      pool.find((v) => /female|woman|zira|aria|seda|helena|jenny|susan|zira/i.test(v.name)) ||
      pool[0]
    );
  }

  if (myVoicePref === "male") {
    return (
      pool.find((v) => /male|man|david|mark|george|james|alex|tom|microsoft david/i.test(v.name)) ||
      pool[0]
    );
  }

  return pool[0];
}

function speak(text, langCode) {
  const t = String(text || "").trim();
  if (!t || isMuted) return;

  stopSpeech();
  setRootState("is-translating");

  if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
    try {
      window.NativeTTS.speak(t, canonical(langCode));
      setTimeout(() => setRootState("is-ready"), 900);
      return;
    } catch {}
  }

  if (!window.speechSynthesis) {
    setRootState("is-ready");
    return;
  }

  const u = new SpeechSynthesisUtterance(t);
  u.lang = langObj(langCode).bcp;
  u.rate = 1;
  u.pitch = 1;
  u.volume = 1;

  const voice = chooseWebVoice(langCode);
  if (voice) u.voice = voice;

  u.onend = () => setRootState("is-ready");
  u.onerror = () => setRootState("is-ready");

  activeUtterance = u;
  window.speechSynthesis.speak(u);
}

/* =========================
   STT
========================= */
function createRecognizer() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = langObj(peerLang).bcp;
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  return rec;
}

function rebuildRecognition() {
  recognition = createRecognizer();
}

async function speechToTextFallback() {
  const txt = prompt(`${langObj(peerLang).name} olarak konuşmanı yaz:`) || "";
  return String(txt).trim() || null;
}

/* =========================
   API
========================= */
async function translateText(text, from, to) {
  const t = String(text || "").trim();
  if (!t) return null;

  try {
    const r = await fetch(`${API_BASE}/api/translate_ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: t,
        from_lang: from || "auto",
        to_lang: canonical(to)
      })
    });

    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    return String(j?.translated || "").trim() || null;
  } catch {
    return null;
  }
}

async function sendRoomMessage(payload) {
  try {
    const r = await fetch(`${API_BASE}/api/interpreter/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.ok) return null;
    return j;
  } catch {
    return null;
  }
}

async function fetchRoomMessages() {
  if (!roomId) return [];

  try {
    const r = await fetch(`${API_BASE}/api/interpreter/messages/${encodeURIComponent(roomId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    const j = await r.json().catch(() => null);

    if (!r.ok || !j) return [];
    if (Array.isArray(j?.messages)) return j.messages;
    if (Array.isArray(j)) return j;
    return [];
  } catch {
    return [];
  }
}

/* =========================
   LIVE FLOW
========================= */
function messageKey(msg) {
  return String(
    msg?.id ||
    msg?.message_id ||
    msg?.created_at ||
    `${msg?.role || ""}-${msg?.original_text || ""}-${msg?.translated_text || ""}`
  );
}

function isRemoteMessage(msg) {
  const msgRole = String(msg?.role || "").trim().toLowerCase();
  if (!msgRole) return true;
  return msgRole !== String(role || "").trim().toLowerCase();
}

function resolveDisplayText(msg) {
  return String(
    msg?.translated_text ||
    msg?.translated ||
    msg?.text ||
    msg?.message ||
    ""
  ).trim();
}

async function pollMessages() {
  const list = await fetchRoomMessages();
  if (!Array.isArray(list) || !list.length) return;

  for (const msg of list) {
    const key = messageKey(msg);
    if (!key || localMessageKeys.has(key) || key === lastSeenMessageId) continue;

    if (!isRemoteMessage(msg)) {
      localMessageKeys.add(key);
      lastSeenMessageId = key;
      continue;
    }

    const text = resolveDisplayText(msg);
    if (!text) continue;

    addTopBubble(text);
    speak(text, myLang);

    localMessageKeys.add(key);
    lastSeenMessageId = key;
  }
}

function startPolling() {
  stopPolling();
  pollMessages();
  pollTimer = setInterval(pollMessages, 1200);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function startListeningFlow() {
  if (isListening) return;
  isListening = true;

  botMic?.classList.add("listening");
  setRootState("is-listening");
  setHelper("wait", "Dinleniyor... konuş");

  try {
    let spoken = null;

    if (window.Native && typeof window.Native.startSpeechRecognition === "function") {
      spoken = await new Promise((resolve) => {
        let finished = false;

        const done = (val) => {
          if (finished) return;
          finished = true;
          window.onNativeSpeechResult = null;
          window.onNativeSpeechError = null;
          resolve(val);
        };

        window.onNativeSpeechResult = (payload) => {
          try {
            const txt = String(payload?.text || "").trim();
            done(txt || null);
          } catch {
            done(null);
          }
        };

        window.onNativeSpeechError = () => done(null);

        try {
          window.Native.startSpeechRecognition(langObj(peerLang).bcp, "bottom");
          setTimeout(() => done(null), 9000);
        } catch {
          done(null);
        }
      });
    } else if (recognition) {
      spoken = await new Promise((resolve) => {
        let finished = false;

        const finish = (val) => {
          if (finished) return;
          finished = true;
          try { recognition.stop(); } catch {}
          resolve(val);
        };

        recognition.onresult = (e) => {
          const txt = e.results?.[0]?.[0]?.transcript || "";
          finish(String(txt || "").trim() || null);
        };

        recognition.onerror = () => finish(null);
        recognition.onend = () => finish(null);

        try {
          recognition.start();
          setTimeout(() => finish(null), 9000);
        } catch {
          finish(null);
        }
      });
    }

    if (!spoken) {
      spoken = await speechToTextFallback();
    }

    if (!spoken) {
      setHelper("ready", "Konuşma alınamadı");
      setRootState("is-ready");
      return;
    }

    addBottomBubble(spoken);
    setRootState("is-translating");
    setHelper("repeat", "Çevriliyor...");

    const translated = await translateText(spoken, peerLang, myLang);

    if (!translated) {
      setHelper("ready", "Çeviri alınamadı");
      setRootState("is-error");
      return;
    }

    const payload = {
      room_id: roomId,
      role,
      host: hostCode,
      source_lang: peerLang,
      target_lang: myLang,
      original_text: spoken,
      translated_text: translated
    };

    const sendResult = await sendRoomMessage(payload);

    if (!sendResult) {
      setHelper("ready", "Mesaj gönderilemedi");
      setRootState("is-error");
      return;
    }

    const sendKey = messageKey(sendResult?.message || payload);
    if (sendKey) localMessageKeys.add(sendKey);

    setHelper("ready", "Konuşmaya hazır");
    setRootState("is-ready");
  } finally {
    isListening = false;
    botMic?.classList.remove("listening");
  }
}

/* =========================
   EVENTS
========================= */
topLangBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  closeAllPop();
  renderLangPopup();
  popTop?.classList.add("show");
});

topVoiceBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  closeAllPop();
  renderVoicePopup();
  voicePopTop?.classList.add("show");
});

closeTop?.addEventListener("click", () => closeAllPop());
closeVoiceTop?.addEventListener("click", () => closeAllPop());

document.addEventListener("click", (e) => {
  const inLang = popTop?.contains(e.target);
  const inVoice = voicePopTop?.contains(e.target);
  const onBtn = e.target?.closest?.("#topLangBtn,#topVoiceBtn");
  if (!inLang && !inVoice && !onBtn) closeAllPop();
}, { capture: true });

topMuteBtn?.addEventListener("click", () => {
  isMuted = !isMuted;
  localStorage.setItem("live_interpreter_muted", isMuted ? "1" : "0");
  updateMuteButton();
  if (isMuted) stopSpeech();
});

clearBtn?.addEventListener("click", () => {
  stopSpeech();
  if (topBody) topBody.innerHTML = "";
  if (botBody) botBody.innerHTML = "";
  localMessageKeys.clear();
  lastSeenMessageId = "";
  setHelper("ready", "Temizlendi");
  setRootState("is-ready");
});

homeLink?.addEventListener("click", () => {
  stopPolling();
  location.href = "/pages/home.html";
});

homeBtn?.addEventListener("click", () => {
  stopPolling();
  location.href = "/pages/home.html";
});

botMic?.addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  await startListeningFlow();
});

botMic?.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    await startListeningFlow();
  }
});

/* =========================
   INIT INFO
========================= */
function bootInfo() {
  if (hostCode) {
    addTopBubble(`Bağlantı hazır • ${hostCode}`);
  } else {
    addTopBubble("Canlı çeviri bağlantısı hazır.");
  }
}

/* =========================
   INIT
========================= */
function init() {
  if (topLangTxt) topLangTxt.textContent = labelChip(myLang);
  refreshVoiceLabel();
  updateMuteButton();
  rebuildRecognition();
  setRootState("is-ready");
  setHelper("ready", "Konuşmaya hazır");

  try {
    window.speechSynthesis?.getVoices?.();
    window.speechSynthesis.onvoiceschanged = () => {};
  } catch {}

  localStorage.setItem("live_interpreter_lang", myLang);
  localStorage.setItem("live_interpreter_peer_lang", peerLang);

  bootInfo();
  startPolling();
}

init();
window.addEventListener("beforeunload", stopPolling);
