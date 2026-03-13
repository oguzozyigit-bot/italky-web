// FILE: /js/live_interpreter_page.js

import { LANG_POOL } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com/api";
const WS_BASE = "wss://italky-api.onrender.com";

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

const UI_TEXT = {
  tr: {
    ready: "Konuşmak için mikrofona dokununuz.",
    preparing: "Sistem hazırlanıyor...",
    repeat: "Konuşmanız bitince mikrofona tekrar basınız.",
    wait: "Lütfen bekleyiniz...",
    translating: "Çevriliyor...",
    micBlocked: "⚠️ Mikrofon izni gerekli",
    speechUnsupported: "⚠️ Bu cihazda konuşma algılama desteklenmiyor",
    peerJoined: "Karşı taraf bağlandı",
    wsFailed: "Bağlantı kurulamadı",
    peerGoneHome: "Karşı taraf ayrıldı. Lütfen bekleyiniz...",
    peerWaiting: "Bağlantı bekleniyor...",
  },
  en: {
    ready: "Tap the microphone to speak.",
    preparing: "System is preparing...",
    repeat: "Press the microphone again when you finish speaking.",
    wait: "Please wait...",
    translating: "Translating...",
    micBlocked: "⚠️ Microphone permission required",
    speechUnsupported: "⚠️ Speech recognition is not supported on this device",
    peerJoined: "The other side connected",
    wsFailed: "Connection failed",
    peerGoneHome: "The other side left. Please wait...",
    peerWaiting: "Waiting for connection...",
  },
};

function t(langCode, key) {
  const c = canonical(langCode);
  const pack = UI_TEXT[c] || UI_TEXT.en;
  return pack[key] || UI_TEXT.en[key] || "";
}

/* =========================
   DOM
========================= */
const frameRoot = $("frameRoot");
const topBody = $("topBody");
const botBody = $("botBody");
const botMic = $("botMic");
const topHelper = $("topHelper");
const botHelper = $("botHelper");
const roomMetaText = $("roomMetaText");

const peerCard = $("peerCard");
const peerAvatar = $("peerAvatar");
const peerName = $("peerName");
const peerSub = $("peerSub");

const botLangBtn = $("botLangBtn");
const botLangTxt = $("botLangTxt");
const popBot = $("pop-bot");
const listBot = $("list-bot");
const closeBot = $("close-bot");

const clearBtn = $("clearBtn");
const homeLink = $("homeLink");
const homeBtn = $("homeBtn");

/* =========================
   URL PARAMS
========================= */
const query = new URLSearchParams(location.search);

let roomId = String(query.get("room") || "").trim();
const hostCode = String(query.get("host") || "").trim().toUpperCase();
const role = String(query.get("role") || "guest").trim().toLowerCase();

let myLang = String(
  query.get("my") || localStorage.getItem("live_interpreter_lang") || "tr"
).trim().toLowerCase();

let peerLang = String(
  query.get("peer") || localStorage.getItem("live_interpreter_peer_lang") || "en"
).trim().toLowerCase();

let userId = String(
  query.get("user_id") || localStorage.getItem("user_id") || ""
).trim();

myLang = canonical(myLang || "tr");
peerLang = canonical(peerLang || "en");

/* =========================
   STATE
========================= */
let ttsDebounceAt = 0;
let activeSide = null;
let recognizer = null;
let recordingSide = null;
let audioCtx = null;
let bootReady = false;
let bootStarted = false;
let bootPromise = null;

let ws = null;
let wsReady = false;
let pingTimer = null;
let leavingTimer = null;

let lastLocalSentText = "";
let lastLocalSentAt = 0;

let peerProfile = {
  full_name: "Karşı Taraf",
  avatar_url: "",
  voice: "",
};

/* =========================
   VISUAL STATE
========================= */
function pointOrbTo(side) {
  if (!frameRoot) return;
  frameRoot.classList.remove("to-top", "to-bot");
  frameRoot.classList.add(side === "top" ? "to-top" : "to-bot");
}

function setMicState(state) {
  if (!botMic) return;
  botMic.classList.remove("listening", "recorded");
  if (state === "listening") botMic.classList.add("listening");
  if (state === "recorded") botMic.classList.add("recorded");
}

function resetMics() {
  botMic?.classList.remove("listening", "recorded");
}

function setFrameVisual(state) {
  if (!frameRoot) return;
  frameRoot.classList.remove("is-idle", "is-listening", "is-translating", "is-ready", "is-error");
  if (state === "idle") frameRoot.classList.add("is-idle");
  if (state === "listening") frameRoot.classList.add("is-listening");
  if (state === "translating") frameRoot.classList.add("is-translating");
  if (state === "ready") frameRoot.classList.add("is-ready");
  if (state === "error") frameRoot.classList.add("is-error");
}

function setHelper(el, text, tone) {
  if (!el) return;
  el.className = "helper-text";
  if (tone) el.classList.add(tone);
  el.textContent = text || "";
}

function setSystemReadyUI() {
  activeSide = null;
  resetMics();
  setFrameVisual("ready");
  if (topHelper) topHelper.style.display = "none";
  setHelper(botHelper, t(myLang, "ready"), "helper-ready");
}

function setSystemPreparingUI() {
  activeSide = null;
  resetMics();
  setFrameVisual("error");
  if (topHelper) topHelper.style.display = "none";
  setHelper(botHelper, t(myLang, "preparing"), "helper-wait");
}

function setListeningUI() {
  activeSide = "bot";
  pointOrbTo("bot");
  resetMics();
  setMicState("listening");
  setFrameVisual("listening");
  if (topHelper) topHelper.style.display = "none";
  setHelper(botHelper, t(myLang, "repeat"), "helper-repeat");
}

function setTranslatingUI() {
  activeSide = "bot";
  pointOrbTo("bot");
  setMicState("recorded");
  setFrameVisual("translating");
  if (topHelper) topHelper.style.display = "none";
  setHelper(botHelper, t(myLang, "translating"), "helper-repeat");
}

function setErrorUI() {
  activeSide = null;
  resetMics();
  setFrameVisual("error");
  if (topHelper) topHelper.style.display = "none";
  setHelper(botHelper, t(myLang, "preparing"), "helper-wait");
}

function bounceToReady(delay = 1200) {
  setTimeout(() => setSystemReadyUI(), delay);
}

function updateRoomMeta() {
  if (!roomMetaText) return;
  roomMetaText.textContent = roomId ? `Room • ${roomId}` : "";
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "👤";
  return parts.slice(0, 2).map((x) => x[0]?.toUpperCase() || "").join("");
}

function updatePeerCard() {
  if (peerName) peerName.textContent = peerProfile.full_name || "Karşı Taraf";
  if (peerSub) peerSub.textContent = t(myLang, "peerWaiting");

  if (!peerAvatar) return;

  const avatarUrl = String(peerProfile.avatar_url || "").trim();

  if (avatarUrl) {
    peerAvatar.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
  } else {
    peerAvatar.textContent = initials(peerProfile.full_name);
  }
}

function setPeerConnectedSubtext() {
  if (peerSub) peerSub.textContent = t(myLang, "peerJoined");
}

function setPeerLeftSubtext() {
  if (peerSub) peerSub.textContent = t(myLang, "peerGoneHome");
}

function refreshLangLabels() {
  if (botLangTxt) botLangTxt.textContent = labelChip(myLang);
}

function refreshReadyTextsIfIdle() {
  if (activeSide === null) {
    if (frameRoot?.classList.contains("is-ready")) setSystemReadyUI();
    if (frameRoot?.classList.contains("is-error")) setSystemPreparingUI();
  }
}

function closeAllPop() {
  popBot?.classList.remove("show");
}

function renderPop() {
  if (!listBot) return;

  listBot.innerHTML = LANGS.map((l) => {
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

  listBot.querySelectorAll(".pop-item").forEach((el) => {
    el.addEventListener("click", async () => {
      await applyMyLanguageChange(el.dataset.code || "tr");
      closeAllPop();
    });
  });
}

/* =========================
   AUDIO / TTS
========================= */
function stopAudio() {
  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}
}

function getVoicePreference() {
  const v =
    peerProfile.voice ||
    localStorage.getItem("tts_voice") ||
    localStorage.getItem("live_interpreter_voice") ||
    "female";

  return String(v).toLowerCase().trim();
}

function chooseWebVoice(langCode) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const bcp = langObj(langCode).bcp.toLowerCase();
  const langBase = canonical(langCode);

  let pool = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith(langBase));
  if (!pool.length) pool = voices.filter((v) => String(v.lang || "").toLowerCase() === bcp);
  if (!pool.length) pool = voices;
  if (!pool.length) return null;

  const pref = getVoicePreference();

  if (pref === "female") {
    return pool.find((v) => /female|woman|zira|aria|seda|helena|jenny|susan/i.test(v.name)) || pool[0];
  }
  if (pref === "male") {
    return pool.find((v) => /male|man|david|mark|george|james|alex|tom/i.test(v.name)) || pool[0];
  }
  return pool[0];
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
  u.rate = c === "en" ? 0.82 : ["de", "fr", "it", "es"].includes(c) ? 0.88 : 0.92;
  u.pitch = 1.0;
  u.volume = 1;

  const voice = chooseWebVoice(c);
  if (voice) u.voice = voice;

  setTimeout(() => {
    try { window.speechSynthesis.speak(u); } catch {}
  }, 50);
}

async function speak(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return;

  const now = Date.now();
  if (now - ttsDebounceAt < 250) stopAudio();
  ttsDebounceAt = now;
  stopAudio();

  speakFallback(value, langCode);
}

/* =========================
   API
========================= */
async function createRoomIfHost() {
  if (role !== "host") return null;
  if (roomId) return { room_id: roomId };

  const r = await fetch(`${API_BASE}/interpreter/create-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      host_code: hostCode || "LIVE-HOST",
      my_lang: myLang,
      user_id: userId,
      mode: "interpreter"
    })
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.room_id) {
    throw new Error(j?.detail || j?.error || "room create başarısız");
  }
  return j;
}

async function resolveRoomByHost() {
  if (!hostCode) return null;

  const r = await fetch(`${API_BASE}/interpreter/resolve-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      host_code: hostCode,
      my_lang: myLang,
      user_id: userId
    })
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.room_id) {
    throw new Error(j?.detail || j?.error || "room resolve başarısız");
  }
  return j;
}

async function joinRoomIfNeeded() {
  if (!roomId) return;
  if (role !== "guest") return;

  const r = await fetch(`${API_BASE}/interpreter/join-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      room_id: roomId,
      my_lang: myLang
    })
  });

  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(j?.detail || "join-room başarısız");
  }
}

async function applyMyLanguageChange(nextLang) {
  myLang = canonical(nextLang || "tr");
  localStorage.setItem("live_interpreter_lang", myLang);
  refreshLangLabels();
  refreshReadyTextsIfIdle();
  rebuildRecognizer();

  stopSocket();

  try {
    if (role === "guest" && roomId) {
      await joinRoomIfNeeded();
    }
  } catch (e) {
    console.warn("[lang change join]", e);
  }

  startSocket();
}

/* =========================
   BUBBLES
========================= */
function keepLatestVisible(side) {
  const wrap = side === "top" ? topBody : botBody;
  if (!wrap) return;

  const apply = () => {
    try { wrap.scrollTop = wrap.scrollHeight; } catch {}
  };

  apply();
  requestAnimationFrame(apply);
  setTimeout(apply, 30);
  setTimeout(apply, 100);
}

function createSpeakerButton(text, langCode) {
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
    await speak(text, langCode);
  });
  return btn;
}

function demoteOldMessages(side) {
  const wrap = side === "top" ? topBody : botBody;
  if (!wrap) return;

  const items = [...wrap.querySelectorAll(".bubble.me")];
  items.forEach((el) => {
    el.classList.remove("is-latest");
  });

  if (!items.length) return;

  const reversed = [...items].reverse();

  reversed.forEach((el, idx) => {
    el.style.opacity = "1";
    el.style.fontSize = "";
    el.style.fontWeight = "";

    if (idx === 0) {
      el.classList.add("is-latest");
      return;
    }
    if (idx === 1) {
      el.style.opacity = ".76";
      el.style.fontSize = "24px";
      el.style.fontWeight = "800";
      return;
    }
    if (idx === 2) {
      el.style.opacity = ".58";
      el.style.fontSize = "20px";
      el.style.fontWeight = "700";
      return;
    }

    el.style.opacity = ".38";
    el.style.fontSize = "18px";
    el.style.fontWeight = "650";
  });
}

function clearLatest(side) {
  const wrap = side === "top" ? topBody : botBody;
  if (!wrap) return;
  wrap.querySelectorAll(".bubble.me.is-latest").forEach((el) => el.classList.remove("is-latest"));
}

function addBubble(side, kind, text, opts = {}) {
  const wrap = side === "top" ? topBody : botBody;
  if (!wrap) return null;

  const row = document.createElement("div");
  row.className = `bubble ${kind}` + (opts.latest ? " is-latest" : "");

  const inner = document.createElement("div");
  inner.className = "bubble-row";

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "").trim();

  if (opts.withSpeaker) {
    const spk = createSpeakerButton(txt.textContent || "", opts.speakLang || myLang);
    inner.appendChild(spk);
  }

  inner.appendChild(txt);
  row.appendChild(inner);
  wrap.appendChild(row);

  if (opts.latest) demoteOldMessages(side);

  keepLatestVisible(side);
  return row;
}

/* =========================
   WS
========================= */
function wsUrl() {
  if (!roomId) return null;

  const params = new URLSearchParams({
    role,
    lang: myLang
  });

  if (userId) params.set("user_id", userId);

  return `${WS_BASE}/api/ws/interpreter/${encodeURIComponent(roomId)}?${params.toString()}`;
}

function stopSocket() {
  try { ws?.close?.(); } catch {}
  ws = null;
  wsReady = false;

  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

function goHomeDelayed() {
  if (leavingTimer) clearTimeout(leavingTimer);
  leavingTimer = setTimeout(() => {
    location.href = "/pages/home.html";
  }, 5000);
}

function startPing() {
  if (pingTimer) clearInterval(pingTimer);

  pingTimer = setInterval(() => {
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    } catch {}
  }, 15000);
}

function syncPeerProfileFromPayload(payload) {
  const name =
    payload?.sender_name ||
    payload?.peer_name ||
    peerProfile.full_name ||
    "Karşı Taraf";

  const avatar =
    payload?.sender_avatar ||
    payload?.peer_avatar ||
    peerProfile.avatar_url ||
    "";

  const voice =
    payload?.sender_voice ||
    payload?.peer_voice ||
    peerProfile.voice ||
    "";

  peerProfile = {
    full_name: String(name || "Karşı Taraf"),
    avatar_url: String(avatar || ""),
    voice: String(voice || ""),
  };

  updatePeerCard();
}

function startSocket() {
  const url = wsUrl();

  if (!url) {
    setErrorUI();
    setHelper(botHelper, t(myLang, "wsFailed"), "helper-wait");
    return;
  }

  stopSocket();

  try {
    ws = new WebSocket(url);
  } catch (e) {
    console.error("[ws create]", e);
    setErrorUI();
    setHelper(botHelper, t(myLang, "wsFailed"), "helper-wait");
    return;
  }

  ws.onopen = () => {
    wsReady = true;
    startPing();
    setSystemReadyUI();
  };

  ws.onmessage = async (event) => {
    try {
      const payload = JSON.parse(event.data);
      const type = String(payload?.type || "").trim();

      if (type === "presence") {
        if (payload?.room_id && !roomId) {
          roomId = String(payload.room_id).trim();
          updateRoomMeta();
        }

        if (payload?.guest_lang && role === "host") {
          peerLang = canonical(payload.guest_lang);
          localStorage.setItem("live_interpreter_peer_lang", peerLang);
        }

        if (payload?.host_lang && role === "guest") {
          peerLang = canonical(payload.host_lang);
          localStorage.setItem("live_interpreter_peer_lang", peerLang);
        }

        syncPeerProfileFromPayload(payload);
        setSystemReadyUI();
        return;
      }

      if (type === "peer_joined") {
        syncPeerProfileFromPayload(payload);
        setPeerConnectedSubtext();
        setHelper(botHelper, t(myLang, "peerJoined"), "helper-ready");
        bounceToReady(1200);
        return;
      }

      if (type === "translated_message") {
        const sender = String(payload?.sender || "").trim().toLowerCase();
        const translated = String(payload?.translated_text || "").trim();
        const original = String(payload?.original_text || "").trim();

        if (!translated && !original) return;
        if (sender === role) return;

        syncPeerProfileFromPayload(payload);

        const text = translated || original;

        clearLatest("top");
        addBubble("top", "me", text, {
          latest: true,
          withSpeaker: true,
          speakLang: myLang
        });

        await speak(text, myLang);
        setSystemReadyUI();
        return;
      }

      if (type === "peer_left") {
        syncPeerProfileFromPayload(payload);
        setPeerLeftSubtext();
        setHelper(botHelper, t(myLang, "peerGoneHome"), "helper-wait");
        goHomeDelayed();
        return;
      }

      if (type === "pong") {
        return;
      }

      if (type === "error") {
        console.warn("[ws error payload]", payload);
        setErrorUI();
        setHelper(botHelper, payload.message || t(myLang, "wsFailed"), "helper-wait");
      }
    } catch (e) {
      console.warn("[ws parse error]", e);
    }
  };

  ws.onerror = () => {
    wsReady = false;
    setErrorUI();
    setHelper(botHelper, t(myLang, "wsFailed"), "helper-wait");
  };

  ws.onclose = () => {
    wsReady = false;

    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }

    setErrorUI();
    setHelper(botHelper, t(myLang, "peerGoneHome"), "helper-wait");
    goHomeDelayed();
  };
}

/* =========================
   SEND
========================= */
function canSend() {
  return !!(wsReady && ws && ws.readyState === WebSocket.OPEN && roomId);
}

function shouldIgnoreDuplicateLocal(text) {
  const value = String(text || "").trim();
  const now = Date.now();

  if (!value) return true;

  if (value === lastLocalSentText && (now - lastLocalSentAt) < 2500) {
    return true;
  }

  lastLocalSentText = value;
  lastLocalSentAt = now;
  return false;
}

function sendTextMessage(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return;

  if (!canSend()) {
    setErrorUI();
    setHelper(botHelper, t(myLang, "wsFailed"), "helper-wait");
    bounceToReady(1200);
    return;
  }

  try {
    ws.send(JSON.stringify({
      type: "text_message",
      text,
      from_lang: canonical(myLang)
    }));
  } catch (e) {
    console.error("[ws send]", e);
    setErrorUI();
    setHelper(botHelper, t(myLang, "wsFailed"), "helper-wait");
    bounceToReady(1200);
  }
}

/* =========================
   RECOGNIZER
========================= */
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

function rebuildRecognizer() {
  recognizer = buildRecognizer(myLang);
}

function stopRecognizer() {
  if (recognizer) {
    try { recognizer.stop(); } catch {}
    recognizer = null;
  }
}

async function speechToTextFallback() {
  const txt = prompt(`${langObj(myLang).name} olarak konuşmanı yaz:`) || "";
  return String(txt).trim() || null;
}

async function finalizeRecognition(text) {
  const cleaned = String(text || "").trim();
  if (!cleaned) {
    setErrorUI();
    bounceToReady(1000);
    return;
  }

  if (shouldIgnoreDuplicateLocal(cleaned)) {
    return;
  }

  clearLatest("bottom");
  addBubble("bottom", "me", cleaned, {
    latest: true,
    withSpeaker: false
  });

  setTranslatingUI();
  sendTextMessage(cleaned);
  bounceToReady(1000);
}

function startRecording() {
  const rec = buildRecognizer(myLang);

  if (!rec) {
    setErrorUI();
    setHelper(botHelper, t(myLang, "speechUnsupported"), "helper-wait");
    bounceToReady(1800);
    return;
  }

  recognizer = rec;
  recordingSide = "bot";

  rec.onstart = () => {
    setListeningUI();
  };

  rec.onresult = (e) => {
    const heard = e.results?.[0]?.[0]?.transcript || "";
    Promise.resolve().then(() => finalizeRecognition(heard));
  };

  rec.onerror = async (e) => {
    console.warn("speech error", e);

    if (String(e?.error || "").includes("not-allowed")) {
      setHelper(botHelper, t(myLang, "micBlocked"), "helper-wait");
      setErrorUI();
      bounceToReady(1600);
      return;
    }

    const fallback = await speechToTextFallback();
    if (fallback) {
      await finalizeRecognition(fallback);
    } else {
      setErrorUI();
      bounceToReady(1200);
    }
  };

  rec.onend = () => {
    recognizer = null;
    recordingSide = null;
  };

  try {
    rec.start();
  } catch (e) {
    console.warn("rec.start error", e);
    recognizer = null;
    recordingSide = null;
    setErrorUI();
    bounceToReady(1200);
  }
}

async function toggleRecording() {
  await ensureReady();

  if (recordingSide === "bot") {
    stopRecognizer();
    recordingSide = null;
    setTranslatingUI();
    return;
  }

  if (recordingSide) {
    stopRecognizer();
    recordingSide = null;
  }

  startRecording();
}

/* =========================
   BOOT / WARM
========================= */
async function warmAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") await audioCtx.resume();
  } catch (e) {
    console.warn("warmAudio", e);
  }
}

async function warmApis() {
  await Promise.allSettled([
    fetch(`${API_BASE}/healthz`).catch(() => {}),
  ]);
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
    updateRoomMeta();
    updatePeerCard();

    await Promise.allSettled([
      warmApis(),
      warmAudio(),
    ]);

    bootReady = true;
    setSystemReadyUI();
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

/* =========================
   EVENTS
========================= */
function bind() {
  refreshLangLabels();
  unlockOnFirstTouch();
  startBoot();

  botLangBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
    renderPop();
    popBot?.classList.add("show");
  });

  closeBot?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
  });

  document.addEventListener("click", (e) => {
    const inside = popBot && popBot.contains(e.target);
    const isBtn = e.target?.closest?.("#botLangBtn");
    if (!inside && !isBtn) closeAllPop();
  }, { capture: true });

  clearBtn?.addEventListener("click", () => {
    stopAudio();
    stopRecognizer();
    recordingSide = null;
    lastLocalSentText = "";
    lastLocalSentAt = 0;
    if (topBody) topBody.innerHTML = "";
    if (botBody) botBody.innerHTML = "";
    setSystemReadyUI();
  });

  homeLink?.addEventListener("click", () => {
    stopSocket();
    location.href = safeHomeHref();
  });

  homeBtn?.addEventListener("click", () => {
    stopSocket();
    location.href = safeHomeHref();
  });

  botMic?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleRecording();
  });

  updateRoomMeta();
  updatePeerCard();
}

/* =========================
   MAIN BOOT
========================= */
async function bootRoom() {
  try {
    if (roomId) {
      updateRoomMeta();
    } else if (hostCode) {
      if (role === "host") {
        const created = await createRoomIfHost();
        roomId = String(created?.room_id || "").trim();
        if (!roomId) throw new Error("Host room oluşturulamadı");
      } else {
        const resolved = await resolveRoomByHost();
        roomId = String(resolved?.room_id || "").trim();
        if (!roomId) throw new Error("Room çözülemedi");
      }
      updateRoomMeta();
    } else {
      throw new Error("Host veya room bilgisi yok");
    }

    await joinRoomIfNeeded();
    startSocket();
  } catch (e) {
    console.error("[live interpreter bootRoom]", e);
    setErrorUI();
    setHelper(botHelper, e?.message || t(myLang, "wsFailed"), "helper-wait");
  }
}

bind();
bootRoom();
window.addEventListener("beforeunload", stopSocket);
