import { LANG_POOL } from "/js/lang_pool_full.js";
import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com/api";
const WS_BASE = "wss://italky-api.onrender.com/api";

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
  const c = canonical(code || "en");
  return (
    LANGS.find((x) => x.code === c) || {
      code: c || "en",
      flag: "🌐",
      name: (c || "en").toUpperCase(),
      bcp: BCP[c] || "en-US",
    }
  );
}

function labelChip(code) {
  const o = langObj(code);
  return `${o.flag} ${o.name}`;
}

function normalizeVoiceMode(v) {
  return String(v || "").trim().toLowerCase() === "clone" ? "clone" : "auto";
}

function normalizeTranslateMode(v) {
  return String(v || "").trim().toLowerCase() === "cultural" ? "cultural" : "normal";
}

function voiceLabel(v) {
  return normalizeVoiceMode(v) === "clone" ? "Kendi Sesim" : "Otomatik Ses";
}

function translateLabel(v) {
  return normalizeTranslateMode(v) === "cultural" ? "Kültürel Translate" : "Translate";
}

const UI_TEXT = {
  tr: {
    ready: "Konuşmak için mikrofona dokununuz.",
    preparing: "Sistem hazırlanıyor...",
    repeat: "Konuşmanız bitince mikrofona tekrar basınız.",
    wait: "Lütfen bekleyiniz...",
    sending: "Gönderiliyor...",
    micBlocked: "⚠️ Mikrofon izni gerekli",
    speechUnsupported: "⚠️ Bu cihazda konuşma algılama desteklenmiyor",
    wsFailed: "Bağlantı kurulamadı",
    reconnecting: "Bağlantı yenileniyor...",
    peerJoined: "Karşı taraf bağlandı",
    peerGoneHome: "Karşı taraf ayrıldı",
    langUpdated: "Dil güncellendi",
    roomMissing: "Oda bulunamadı",
    waitingPeer: "Karşı taraf bekleniyor...",
  },
  en: {
    ready: "Tap the microphone to speak.",
    preparing: "System is preparing...",
    repeat: "Press the microphone again when you finish speaking.",
    wait: "Please wait...",
    sending: "Sending...",
    micBlocked: "⚠️ Microphone permission required",
    speechUnsupported: "⚠️ Speech recognition is not supported on this device",
    wsFailed: "Connection failed",
    reconnecting: "Reconnecting...",
    peerJoined: "The other side connected",
    peerGoneHome: "The other side left",
    langUpdated: "Language updated",
    roomMissing: "Room not found",
    waitingPeer: "Waiting for the other side...",
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

const botLangBtn = $("botLangBtn");
const botLangTxt = $("botLangTxt");
const popBot = $("pop-bot");
const listBot = $("list-bot");
const closeBot = $("close-bot");

const clearBtn = $("clearBtn");
const homeLink = $("homeLink");
const homeBtn = $("homeBtn");
const settingsBtn = $("settingsBtn");

const myInfoMain = $("myInfoMain");
const myInfoSub = $("myInfoSub");
const peerInfoMain = $("peerInfoMain");
const peerInfoSub = $("peerInfoSub");

/* =========================
   URL PARAMS
========================= */
const query = new URLSearchParams(location.search);

let roomId = String(query.get("room") || "").trim();
const role = String(query.get("role") || "guest").trim().toLowerCase();
const autoJoin = String(query.get("auto") || "0").trim() === "1";

let myLang = canonical(
  query.get("my") || localStorage.getItem("live_interpreter_lang") || "tr"
);

let peerLang = canonical(
  query.get("peer") || localStorage.getItem("live_interpreter_peer_lang") || "en"
);

/* =========================
   STATE
========================= */
let activeSide = null;
let recognizer = null;
let recordingSide = null;
let currentAudio = null;
let audioCtx = null;
let bootReady = false;
let bootStarted = false;
let bootPromise = null;
let voicesReady = false;

let ws = null;
let wsReady = false;
let pingTimer = null;
let leavingTimer = null;
let reconnectTimer = null;
let reconnectCount = 0;
let manuallyClosed = false;
let peerHasExplicitlyLeft = false;

let roomSyncTimer = null;
let profileRetryTimers = [];

let lastLocalSentText = "";
let lastLocalSentAt = 0;
let myClientId = "";
let peerConnected = false;
let peerEverConnected = false;
let peerProfileReceived = false;

let myProfile = {
  lang: myLang,
  voice_mode: normalizeVoiceMode(localStorage.getItem("facetoface_voice_mode") || "auto"),
  translate_mode: normalizeTranslateMode(localStorage.getItem("facetoface_translate_mode") || "normal"),
};

let peerProfile = {
  lang: peerLang,
  voice_mode: "auto",
  translate_mode: "normal",
};

/* =========================
   PROFILE / LABELS
========================= */
function readLocalProfile() {
  myProfile = {
    lang: canonical(localStorage.getItem("live_interpreter_lang") || myLang || "tr"),
    voice_mode: normalizeVoiceMode(localStorage.getItem("facetoface_voice_mode") || "auto"),
    translate_mode: normalizeTranslateMode(localStorage.getItem("facetoface_translate_mode") || "normal"),
  };
  myLang = canonical(myProfile.lang || myLang || "tr");
}

function renderMyProfileBox() {
  if (myInfoMain) {
    myInfoMain.textContent = `${labelChip(myLang)} • ${voiceLabel(myProfile.voice_mode)}`;
  }
  if (myInfoSub) {
    myInfoSub.textContent = `Çeviri: ${translateLabel(myProfile.translate_mode)}`;
  }
}

function renderPeerProfileBox() {
  if (!peerConnected && !peerEverConnected) {
    if (peerInfoMain) peerInfoMain.textContent = "Bağlantı bekleniyor...";
    if (peerInfoSub) peerInfoSub.textContent = "Dil, ses ve çeviri modeli burada görünecek.";
    return;
  }

  const showLang = peerProfile.lang || peerLang || "en";
  const showVoice = peerProfile.voice_mode || "auto";
  const showTranslate = peerProfile.translate_mode || "normal";

  if (peerInfoMain) {
    peerInfoMain.textContent = `${labelChip(showLang)} • ${voiceLabel(showVoice)}`;
  }
  if (peerInfoSub) {
    peerInfoSub.textContent = `Çeviri: ${translateLabel(showTranslate)}`;
  }
}

function markPeerConnected(lang = "") {
  const clean = canonical(lang || peerLang || "");
  if (clean) {
    peerLang = clean;
    peerProfile.lang = clean;
    try {
      localStorage.setItem("live_interpreter_peer_lang", clean);
    } catch {}
  }

  peerConnected = true;
  peerEverConnected = true;
  renderPeerProfileBox();
}

function markPeerDisconnected() {
  peerConnected = false;
  renderPeerProfileBox();
}

async function loadProfileFromSupabase() {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id;
    if (!uid) {
      readLocalProfile();
      renderMyProfileBox();
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tts_voice_ready, tts_voice_id")
      .eq("id", uid)
      .maybeSingle();

    readLocalProfile();

    if (myProfile.voice_mode === "clone" && !(profile?.tts_voice_ready && profile?.tts_voice_id)) {
      myProfile.voice_mode = "auto";
      localStorage.setItem("facetoface_voice_mode", "auto");
    }

    renderMyProfileBox();
  } catch {
    readLocalProfile();
    renderMyProfileBox();
  }
}

/* =========================
   ROOM SYNC FALLBACK
========================= */
async function fetchRoomSnapshot() {
  if (!roomId) return null;
  const r = await fetch(`${API_BASE}/interpreter/room/${encodeURIComponent(roomId)}`, {
    method: "GET",
    cache: "no-store",
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.room_id) {
    throw new Error(j?.detail || j?.error || "Room okunamadı");
  }
  return j;
}

function stopRoomSync() {
  if (roomSyncTimer) {
    clearInterval(roomSyncTimer);
    roomSyncTimer = null;
  }
}

function applyRoomSnapshot(room) {
  if (!room) return;

  const hostLang = canonical(room?.host_lang || "");
  const guestLang = canonical(room?.guest_lang || "");
  const status = String(room?.status || "").trim().toLowerCase();
  const peerCount = Number(room?.peer_count || 0);

  let snapshotSaysConnected = false;

  if (role === "host") {
    if (guestLang) {
      peerLang = guestLang;
      peerProfile.lang = guestLang;
    }
    snapshotSaysConnected = !!(guestLang || status === "active" || peerCount >= 2);
  } else {
    if (hostLang) {
      peerLang = hostLang;
      peerProfile.lang = hostLang;
    }
    snapshotSaysConnected = !!(hostLang && (status === "active" || peerCount >= 2 || guestLang));
  }

  if (snapshotSaysConnected) {
    markPeerConnected(peerLang);
  } else if (!peerEverConnected && !peerProfileReceived) {
    peerConnected = false;
    renderPeerProfileBox();
  }

  if (peerConnected && !peerProfile.lang) {
    peerProfile.lang = peerLang || "en";
  }

  renderPeerProfileBox();
  setSystemReadyUI();
}

function startRoomSync() {
  stopRoomSync();

  roomSyncTimer = setInterval(async () => {
    if (!roomId || peerHasExplicitlyLeft) return;

    try {
      const room = await fetchRoomSnapshot();
      applyRoomSnapshot(room);
    } catch (e) {
      console.warn("[room sync]", e);
    }
  }, 1800);
}

/* =========================
   CLIENT ID
========================= */
function getOrCreateClientId() {
  const key = "live_interpreter_client_id";
  try {
    let v = localStorage.getItem(key);
    if (v) return v;
    v = `cli_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(key, v);
    return v;
  } catch {
    return `cli_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

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

  if (peerConnected || peerEverConnected) {
    setFrameVisual("ready");
    if (topHelper) topHelper.style.display = "none";
    setHelper(botHelper, t(myLang, "ready"), "helper-ready");
  } else {
    setFrameVisual("error");
    if (topHelper) topHelper.style.display = "none";
    setHelper(botHelper, t(myLang, "waitingPeer"), "helper-wait");
  }

  renderMyProfileBox();
  renderPeerProfileBox();
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

function setSendingUI() {
  activeSide = "bot";
  pointOrbTo("bot");
  setMicState("recorded");
  setFrameVisual("translating");
  if (topHelper) topHelper.style.display = "none";
  setHelper(botHelper, t(myLang, "sending"), "helper-repeat");
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

function refreshLangLabels() {
  if (botLangTxt) botLangTxt.textContent = labelChip(myLang);
}

function refreshReadyTextsIfIdle() {
  if (activeSide === null) {
    setSystemReadyUI();
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
  try {
    currentAudio?.pause?.();
    if (currentAudio) currentAudio.currentTime = 0;
    currentAudio = null;
  } catch {}
  try {
    window.speechSynthesis?.cancel?.();
  } catch {}
  try {
    window.NativeTTS?.stop?.();
  } catch {}
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
  const localVoiceMode = normalizeVoiceMode(localStorage.getItem("facetoface_voice_mode") || "auto");
  if (localVoiceMode === "clone") return "clone";

  return String(
    localStorage.getItem("tts_voice") ||
    localStorage.getItem("live_interpreter_voice") ||
    "auto"
  ).toLowerCase().trim();
}

async function warmAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") await audioCtx.resume();
    }
  } catch {}

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      voicesReady = true;
    }
  } catch {}
}

async function speakViaApi(text, langCode, sourceUserId = "", sourceVoice = "auto") {
  const fallbackUserId = await getCurrentUserId();
  const userId = String(sourceUserId || fallbackUserId || "").trim();
  const voice = String(sourceVoice || getVoicePreference() || "auto").trim().toLowerCase();

  const r = await fetch(`${API_BASE}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: String(text || "").trim(),
      lang: canonical(langCode),
      user_id: userId,
      module: "sidetoside",
      voice
    }),
  });

  const j = await r.json().catch(() => null);

  if (!r.ok || !j?.ok || !j?.audio_base64) {
    throw new Error(j?.error || j?.detail || "TTS API unavailable");
  }

  const audio = new Audio(`data:audio/mp3;base64,${j.audio_base64}`);
  audio.preload = "auto";
  audio.playsInline = true;
  currentAudio = audio;

  audio.onended = () => {
    if (currentAudio === audio) currentAudio = null;
  };

  audio.onerror = () => {
    if (currentAudio === audio) currentAudio = null;
  };

  await warmAudio();
  await audio.play();
  return true;
}

function chooseWebVoice(langCode) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const bcp = langObj(langCode).bcp.toLowerCase();
  const langBase = canonical(langCode);
  const pref = getVoicePreference();

  let pool = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith(langBase));
  if (!pool.length) pool = voices.filter((v) => String(v.lang || "").toLowerCase() === bcp);
  if (!pool.length) pool = voices;
  if (!pool.length) return null;

  if (pref === "female") {
    return pool.find((v) => /female|woman|zira|aria|seda|helena|jenny|susan|eva|anna|emma/i.test(v.name)) || pool[0];
  }

  if (pref === "male") {
    return pool.find((v) => /male|man|david|mark|george|james|alex|tom|jon|paul/i.test(v.name)) || pool[0];
  }

  return pool[0];
}

function speakFallback(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return;

  const c = canonical(langCode);
  const pref = getVoicePreference();

  try {
    window.speechSynthesis?.cancel?.();
  } catch {}

  if (pref === "auto" && window.NativeTTS && typeof window.NativeTTS.speak === "function") {
    try {
      window.NativeTTS.speak(value, c);
      return;
    } catch {}
  }

  if (!window.speechSynthesis) return;

  try {
    if (!voicesReady) {
      window.speechSynthesis.getVoices();
      voicesReady = true;
    }
  } catch {}

  const u = new SpeechSynthesisUtterance(value);
  u.lang = langObj(c).bcp;
  u.rate = c === "en" ? 0.82 : ["de", "fr", "it", "es"].includes(c) ? 0.88 : 0.92;
  u.pitch = 1.0;
  u.volume = 1;

  const voice = chooseWebVoice(c);
  if (voice) u.voice = voice;

  setTimeout(() => {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }, 80);
}

async function speak(text, langCode, sourceUserId = "", sourceVoice = "auto") {
  const value = String(text || "").trim();
  if (!value) return;

  stopAudio();

  const voice = String(sourceVoice || getVoicePreference() || "auto").trim().toLowerCase();
  const hasRemoteOwner = !!String(sourceUserId || "").trim();

  if (hasRemoteOwner) {
    try {
      await speakViaApi(value, langCode, sourceUserId, voice);
      return;
    } catch {
      speakFallback(value, langCode);
      return;
    }
  }

  if (voice === "auto") {
    speakFallback(value, langCode);
    return;
  }

  try {
    await speakViaApi(value, langCode, "", voice);
  } catch {
    speakFallback(value, langCode);
  }
}

/* =========================
   WS
========================= */
function wsUrl() {
  if (!roomId) return null;
  return `${WS_BASE}/ws/interpreter/${encodeURIComponent(roomId)}?role=${encodeURIComponent(role)}&lang=${encodeURIComponent(myLang)}`;
}

function clearProfileRetryTimers() {
  profileRetryTimers.forEach((id) => clearTimeout(id));
  profileRetryTimers = [];
}

function queueProfileResend() {
  clearProfileRetryTimers();

  [800, 1800, 3200].forEach((ms) => {
    const id = setTimeout(() => {
      sendSelfProfile().catch(() => {});
    }, ms);
    profileRetryTimers.push(id);
  });
}

async function sendSelfProfile() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  try {
    ws.send(JSON.stringify({
      type: "profile_sync",
      sender_id: myClientId,
      lang: canonical(myLang),
      voice_mode: normalizeVoiceMode(myProfile.voice_mode),
      translate_mode: normalizeTranslateMode(myProfile.translate_mode)
    }));
  } catch (e) {
    console.warn("[profile_sync send]", e);
  }
}

async function applyMyLanguageChange(nextLang) {
  myLang = canonical(nextLang || "tr");
  myProfile.lang = myLang;

  localStorage.setItem("live_interpreter_lang", myLang);
  localStorage.setItem("live_interpreter_peer_lang", peerLang);

  refreshLangLabels();
  renderMyProfileBox();
  refreshReadyTextsIfIdle();
  rebuildRecognizer();

  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "set_lang",
        lang: myLang
      }));

      await sendSelfProfile();
      queueProfileResend();

      setHelper(botHelper, t(myLang, "langUpdated"), "helper-ready");
      bounceToReady(800);
      return;
    }
  } catch {}

  try {
    if (ws) {
      manuallyClosed = true;
      ws.close();
    }
  } catch {}

  ws = null;
  wsReady = false;
  manuallyClosed = false;

  startSocket();
}

function stopSocket() {
  manuallyClosed = true;

  try { ws?.close?.(); } catch {}
  ws = null;
  wsReady = false;

  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  stopRoomSync();
  clearProfileRetryTimers();
}

function goHomeDelayed() {
  if (leavingTimer) clearTimeout(leavingTimer);
  leavingTimer = setTimeout(() => {
    location.href = "/pages/home.html";
  }, 2500);
}

function scheduleReconnect() {
  if (manuallyClosed || peerHasExplicitlyLeft || reconnectTimer) return;

  const delay = Math.min(1500 + reconnectCount * 1000, 6000);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectCount += 1;
    setHelper(botHelper, t(myLang, "reconnecting"), "helper-wait");
    startSocket();
  }, delay);
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

function startSocket() {
  manuallyClosed = false;

  const url = wsUrl();
  if (!url) {
    setErrorUI();
    setHelper(botHelper, t(myLang, "roomMissing"), "helper-wait");
    return;
  }

  try {
    if (ws && ws.readyState === WebSocket.OPEN) return;
  } catch {}

  try {
    ws = new WebSocket(url);
  } catch (e) {
    console.error("[ws create]", e);
    setErrorUI();
    setHelper(botHelper, t(myLang, "wsFailed"), "helper-wait");
    scheduleReconnect();
    return;
  }

  ws.onopen = async () => {
    wsReady = true;
    reconnectCount = 0;
    peerHasExplicitlyLeft = false;
    startPing();
    startRoomSync();
    setSystemPreparingUI();

    try {
      const room = await fetchRoomSnapshot();
      applyRoomSnapshot(room);
    } catch (e) {
      console.warn("[room snapshot onopen]", e);
      setSystemReadyUI();
    }

    await sendSelfProfile();
    queueProfileResend();
  };

  ws.onmessage = async (event) => {
    try {
      const payload = JSON.parse(event.data);
      const type = String(payload?.type || "").trim();

      if (type === "presence") {
        const guestLang = canonical(payload?.guest_lang || "");
        const hostLang = canonical(payload?.host_lang || "");
        const status = String(payload?.status || "").trim().toLowerCase();
        const peerCount = Number(payload?.peer_count || 0);
        const peerConnectedFlag = payload?.peer_connected === true;

        let liveConnected = false;

        if (role === "host") {
          if (guestLang) {
            peerLang = guestLang;
            peerProfile.lang = guestLang;
            try { localStorage.setItem("live_interpreter_peer_lang", peerLang); } catch {}
          }

          liveConnected = !!(peerConnectedFlag || guestLang || status === "active" || peerCount >= 2);
        }

        if (role === "guest") {
          if (hostLang) {
            peerLang = hostLang;
            peerProfile.lang = hostLang;
            try { localStorage.setItem("live_interpreter_peer_lang", peerLang); } catch {}
          }

          liveConnected = !!(hostLang && (peerConnectedFlag || status === "active" || peerCount >= 2 || guestLang));
        }

        if (liveConnected) {
          markPeerConnected(peerLang);
        } else if (!peerEverConnected && !peerProfileReceived) {
          peerConnected = false;
        }

        renderPeerProfileBox();
        setSystemReadyUI();
        return;
      }

      if (type === "peer_joined") {
        if (payload?.guest_lang && role === "host") {
          peerLang = canonical(payload.guest_lang);
          peerProfile.lang = peerLang;
          try { localStorage.setItem("live_interpreter_peer_lang", peerLang); } catch {}
        }

        markPeerConnected(peerLang);
        renderPeerProfileBox();
        setHelper(botHelper, t(myLang, "peerJoined"), "helper-ready");

        await sendSelfProfile();
        queueProfileResend();

        bounceToReady(600);
        return;
      }

      if (type === "profile_sync") {
        const senderId = String(payload?.sender_id || "").trim();
        if (senderId && senderId === myClientId) return;

        peerProfile = {
          lang: canonical(payload?.lang || peerLang || "en"),
          voice_mode: normalizeVoiceMode(payload?.voice_mode || "auto"),
          translate_mode: normalizeTranslateMode(payload?.translate_mode || "normal")
        };

        peerProfileReceived = true;
        peerLang = peerProfile.lang;

        try { localStorage.setItem("live_interpreter_peer_lang", peerLang); } catch {}

        markPeerConnected(peerLang);
        renderPeerProfileBox();
        setSystemReadyUI();
        return;
      }

      if (type === "translated_message") {
        const senderId = String(payload?.sender_id || "").trim();
        const senderUserId = String(payload?.sender_user_id || "").trim();
        const senderVoice = String(payload?.sender_voice || "auto").trim().toLowerCase();
        const translated = String(payload?.translated_text || "").trim();
        const original = String(payload?.original_text || "").trim();
        const senderTranslateMode = normalizeTranslateMode(
          payload?.sender_translate_mode || peerProfile.translate_mode || "normal"
        );

        if (!translated && !original) return;
        if (senderId && myClientId && senderId === myClientId) return;

        markPeerConnected(peerLang);

        peerProfile.voice_mode = normalizeVoiceMode(
  senderVoice || peerProfile.voice_mode || "auto"
);
        peerProfile.translate_mode = senderTranslateMode;
        renderPeerProfileBox();

        const text = translated || original;

        clearLatest("top");
        addBubble("top", "me", text, {
          latest: true,
          withSpeaker: true,
          speakLang: myLang
        });

        await speak(text, myLang, senderUserId, senderVoice);
        setSystemReadyUI();
        return;
      }

      if (type === "peer_left") {
        peerHasExplicitlyLeft = true;
        peerEverConnected = false;
        peerProfileReceived = false;
        markPeerDisconnected();
        setErrorUI();
        setHelper(botHelper, payload?.message || t(myLang, "peerGoneHome"), "helper-wait");
        goHomeDelayed();
        return;
      }

      if (type === "pong") return;

      if (type === "error") {
        console.warn("[ws error payload]", payload);
        setErrorUI();
        setHelper(botHelper, payload?.message || t(myLang, "wsFailed"), "helper-wait");
      }
    } catch (e) {
      console.warn("[ws parse error]", e);
    }
  };

  ws.onerror = () => {
    wsReady = false;
    if (!peerHasExplicitlyLeft) {
      setErrorUI();
      setHelper(botHelper, t(myLang, "reconnecting"), "helper-wait");
      scheduleReconnect();
    }
  };

  ws.onclose = () => {
    wsReady = false;

    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }

    if (!manuallyClosed && !peerHasExplicitlyLeft) {
      setErrorUI();
      setHelper(botHelper, t(myLang, "reconnecting"), "helper-wait");
      scheduleReconnect();
    }
  };
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
    el.style.opacity = "";
    el.style.fontSize = "";
    el.style.fontWeight = "";
  });

  if (!items.length) return;

  const reversed = [...items].reverse();
  reversed.forEach((el, idx) => {
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
  row.className = `bubble ${kind}${opts.latest ? " is-latest" : ""}`;

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
   SEND
========================= */
function canSend() {
  return !!(wsReady && ws && ws.readyState === WebSocket.OPEN && roomId && peerConnected);
}

function shouldIgnoreDuplicateLocal(text) {
  const value = String(text || "").trim();
  const now = Date.now();

  if (!value) return true;

  if (value === lastLocalSentText && now - lastLocalSentAt < 2500) {
    return true;
  }

  lastLocalSentText = value;
  lastLocalSentAt = now;
  return false;
}

async function sendTextMessage(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return;

  if (!canSend()) {
    setErrorUI();
    setHelper(botHelper, peerConnected ? t(myLang, "wsFailed") : t(myLang, "waitingPeer"), "helper-wait");
    bounceToReady(1200);
    return;
  }

  try {
    const senderUserId = await getCurrentUserId();
    const senderVoice = myProfile.voice_mode === "clone" ? "clone" : getVoicePreference();

    ws.send(JSON.stringify({
      type: "text_message",
      text,
      from_lang: canonical(myLang),
      to_lang: canonical(peerLang || (role === "host" ? "en" : "tr")),
      sender_id: myClientId,
      sender_user_id: senderUserId || "",
      sender_voice: senderVoice || "auto",
      sender_translate_mode: normalizeTranslateMode(myProfile.translate_mode)
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

  if (shouldIgnoreDuplicateLocal(cleaned)) return;

  clearLatest("bottom");
  addBubble("bottom", "me", cleaned, {
    latest: true,
    withSpeaker: false
  });

  setSendingUI();
  await sendTextMessage(cleaned);
  bounceToReady(900);
}

function startRecording() {
  if (!peerConnected) {
    setErrorUI();
    setHelper(botHelper, t(myLang, "waitingPeer"), "helper-wait");
    bounceToReady(1200);
    return;
  }

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
      setErrorUI();
      setHelper(botHelper, t(myLang, "micBlocked"), "helper-wait");
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
    setSendingUI();
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
async function warmApis() {
  await Promise.allSettled([
    fetch(`${API_BASE}/healthz`).catch(() => {}),
    loadProfileFromSupabase(),
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
    readLocalProfile();
    refreshLangLabels();
    renderMyProfileBox();
    renderPeerProfileBox();
    pointOrbTo("bot");

    await Promise.allSettled([warmApis(), warmAudio()]);

    bootReady = true;
    renderMyProfileBox();
    renderPeerProfileBox();
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
  renderMyProfileBox();
  renderPeerProfileBox();
  unlockOnFirstTouch();
  startBoot();

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        voicesReady = true;
      };
      window.speechSynthesis.getVoices();
    }
  } catch {}

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

  homeLink?.addEventListener("click", (e) => {
    e.preventDefault();
    stopSocket();
    location.href = safeHomeHref();
  });

  homeBtn?.addEventListener("click", () => {
    stopSocket();
    location.href = safeHomeHref();
  });

  settingsBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = "/pages/facetoface_open.html?edit=1&from=sidetoside";
  });

  botMic?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleRecording();
  });
}

/* =========================
   MAIN
========================= */
async function bootRoom() {
  try {
    myClientId = getOrCreateClientId();
    readLocalProfile();
    renderMyProfileBox();

    if (!roomId) {
      throw new Error(t(myLang, "roomMissing"));
    }

    if (roomMetaText) {
      roomMetaText.textContent = roomId;
    }

    if (autoJoin) {
      console.log("[sidetoside] auto join active", {
        roomId,
        role,
        myLang,
        peerLang,
      });
    }

    try {
      const room = await fetchRoomSnapshot();
      applyRoomSnapshot(room);
    } catch (e) {
      console.warn("[bootRoom room snapshot]", e);
    }

    startSocket();
  } catch (e) {
    console.error("[sidetoside bootRoom]", e);
    setErrorUI();
    setHelper(botHelper, e?.message || t(myLang, "wsFailed"), "helper-wait");
  }
}

bind();
bootRoom();

window.addEventListener("beforeunload", () => {
  stopSocket();
});
