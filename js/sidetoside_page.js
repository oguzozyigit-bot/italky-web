import { LANG_POOL } from "/js/lang_pool_full.js";
import { supabase } from "/js/supabase_client.js";
import { setHeaderTokens } from "/js/ui_shell.js";
import {
  commitUsage,
  buildUsageNote
} from "/js/usage_meter.js";

const API_BASE = "https://italky-api.onrender.com/api";
const WS_BASE = "wss://italky-api.onrender.com/api";

const RETURN_CTX_KEY = "sidetoside_return_ctx_v1";
const RETURN_CTX_MAX_AGE_MS = 1000 * 60 * 30;

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

function isPaidEarToEarMode() {
  return (
    normalizeTranslateMode(myProfile.translate_mode) === "cultural" ||
    normalizeVoiceMode(myProfile.voice_mode) === "clone"
  );
}

function earToEarUsageModule() {
  return isPaidEarToEarMode() ? "eartoear_ai" : "usage_side_to_side";
}

function earToEarUsageNote(charCount) {
  const paid = isPaidEarToEarMode();
  const cultural = normalizeTranslateMode(myProfile.translate_mode) === "cultural";
  const clone = normalizeVoiceMode(myProfile.voice_mode) === "clone";

  if (!paid) {
    return buildUsageNote({
      surface: "sidetoside",
      ai: false,
      custom: `SideToSide standart kullanım (${charCount} karakter)`
    });
  }

  if (cultural && clone) {
    return `SideToSide kültürel çeviri + kendi sesim kullanımı (${charCount} karakter)`;
  }
  if (cultural) {
    return `SideToSide kültürel çeviri kullanımı (${charCount} karakter)`;
  }
  return `SideToSide kendi sesim kullanımı (${charCount} karakter)`;
}

async function chargeEarToEarUsage(textValue) {
  const charCount = String(textValue || "").trim().length;
  if (!charCount) {
    return { ok: true, tokens_after: null, tokens_charged: 0 };
  }

  if (!isPaidEarToEarMode()) {
    return { ok: true, tokens_after: null, tokens_charged: 0 };
  }

  try {
    const result = await commitUsage({
      module: earToEarUsageModule(),
      usageKind: "text",
      charCount,
      note: earToEarUsageNote(charCount),
      meta: {
        surface: "sidetoside",
        from_lang: canonical(myLang),
        to_lang: canonical(peerLang || "en"),
        translate_mode: normalizeTranslateMode(myProfile.translate_mode),
        voice_mode: normalizeVoiceMode(myProfile.voice_mode),
        char_count: charCount
      }
    });

    if (typeof result?.tokens_after === "number") {
      setHeaderTokens(result.tokens_after);
    }

    return result;
  } catch (e) {
    if (e?.code === "INSUFFICIENT_TOKENS") {
      setHelper(botHelper, "Jeton yetersiz. Jeton Market açılıyor...", "helper-wait");
      setTimeout(() => {
        location.href = "/pages/jetonbuy.html";
      }, 450);
    }
    throw e;
  }
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
    joiningRoom: "Odaya bağlanılıyor..."
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
    joiningRoom: "Joining room..."
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

const botLangBtn = $("botLangBtn");
const botLangTxt = $("botLangTxt");
const popBot = $("pop-bot");
const listBot = $("list-bot");
const closeBot = $("close-bot");

const clearBtn = $("clearBtn");
const homeLink = $("homeLink");
const homeBtn = $("homeBtn");

const peerInfoMain = $("peerInfoMain");
const peerInfoSub = $("peerInfoSub");
const peerVoicePill = $("peerVoicePill");
const peerTranslatePill = $("peerTranslatePill");

/* =========================
   URL PARAMS / RETURN CTX
========================= */
function saveReturnContext() {
  try {
    const payload = {
      roomId: String(roomId || "").trim(),
      role: String(role || "guest").trim().toLowerCase(),
      myLang: canonical(myLang || "tr"),
      peerLang: canonical(peerLang || "en"),
      ts: Date.now(),
    };
    sessionStorage.setItem(RETURN_CTX_KEY, JSON.stringify(payload));
  } catch {}
}

function readReturnContext() {
  try {
    const raw = sessionStorage.getItem(RETURN_CTX_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const ts = Number(parsed?.ts || 0);
    if (!ts || Date.now() - ts > RETURN_CTX_MAX_AGE_MS) {
      sessionStorage.removeItem(RETURN_CTX_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

const query = new URLSearchParams(location.search);

let roomId = String(query.get("room") || "").trim();
let role = String(query.get("role") || "guest").trim().toLowerCase();
const autoJoin = String(query.get("auto") || "0").trim() === "1";

let myLang = canonical(
  query.get("my") || localStorage.getItem("live_interpreter_lang") || "tr"
);

let peerLang = canonical(
  query.get("peer") || localStorage.getItem("live_interpreter_peer_lang") || "en"
);

if (!roomId) {
  const ctx = readReturnContext();
  if (ctx?.roomId) {
    roomId = String(ctx.roomId || "").trim();
    role = String(ctx.role || role || "guest").trim().toLowerCase();
    myLang = canonical(ctx.myLang || myLang || "tr");
    peerLang = canonical(ctx.peerLang || peerLang || "en");

    try {
      const next = new URL(location.href);
      next.searchParams.set("room", roomId);
      next.searchParams.set("role", role);
      next.searchParams.set("my", myLang);
      next.searchParams.set("peer", peerLang);
      history.replaceState({}, "", next.toString());
    } catch {}
  }
}

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
let reconnectTimer = null;
let reconnectCount = 0;
let manuallyClosed = false;
let peerHasExplicitlyLeft = false;
let isNavigatingHome = false;

let roomSyncTimer = null;
let profileRetryTimers = [];
let recognitionHasResult = false;
let recognitionFinalText = "";
let recognitionInterimText = "";
let manualStopRequested = false;
let finalizeFromOnEnd = false;

let lastLocalSentText = "";
let lastLocalSentAt = 0;
let myClientId = "";
let myDisplayName = "";
let peerConnected = false;
let peerEverConnected = false;
let peerProfileReceived = false;
let roomJoined = false;

let myProfile = {
  lang: myLang,
  voice_mode: normalizeVoiceMode(localStorage.getItem("facetoface_voice_mode") || "auto"),
  translate_mode: normalizeTranslateMode(localStorage.getItem("facetoface_translate_mode") || "normal"),
};

let peerProfile = {
  lang: peerLang,
  voice_mode: "auto",
  translate_mode: "normal",
  name: "",
};

/* =========================
   PROFILE / LABELS
========================= */
function displayNameOrFallback(value, fallback = "Karşı Taraf") {
  const v = String(value || "").trim();
  return v || fallback;
}

function readLocalProfile() {
  myProfile = {
    lang: canonical(localStorage.getItem("live_interpreter_lang") || myLang || "tr"),
    voice_mode: normalizeVoiceMode(localStorage.getItem("facetoface_voice_mode") || "auto"),
    translate_mode: normalizeTranslateMode(localStorage.getItem("facetoface_translate_mode") || "normal"),
  };
  myLang = canonical(myProfile.lang || myLang || "tr");
}

function renderPeerProfileBox() {
  if (!peerConnected && !peerEverConnected && !peerProfileReceived) {
    if (peerInfoMain) peerInfoMain.textContent = "Bağlantı bekleniyor...";
    if (peerInfoSub) peerInfoSub.textContent = "Ses ve çeviri tercihleri burada görünecek.";
    if (peerVoicePill) peerVoicePill.textContent = "Otomatik Ses";
    if (peerTranslatePill) peerTranslatePill.textContent = "Translate";
    return;
  }

  const showName = displayNameOrFallback(peerProfile.name, "Karşı Taraf");
  const showLang = peerProfile.lang || peerLang || "en";
  const showVoice = peerProfile.voice_mode || "auto";
  const showTranslate = peerProfile.translate_mode || "normal";

  if (peerInfoMain) peerInfoMain.textContent = showName;
  if (peerInfoSub) peerInfoSub.textContent = labelChip(showLang);
  if (peerVoicePill) peerVoicePill.textContent = voiceLabel(showVoice);
  if (peerTranslatePill) peerTranslatePill.textContent = translateLabel(showTranslate);
}

function markPeerConnected(lang = "", name = "") {
  const clean = canonical(lang || peerLang || "");
  if (clean) {
    peerLang = clean;
    peerProfile.lang = clean;
    try {
      localStorage.setItem("live_interpreter_peer_lang", clean);
    } catch {}
  }

  if (String(name || "").trim()) {
    peerProfile.name = String(name).trim();
  }

  peerConnected = true;
  peerEverConnected = true;
  renderPeerProfileBox();
}

function markPeerDisconnected() {
  peerConnected = false;
  renderPeerProfileBox();
}

async function loadMyIdentity() {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;

    const metaName =
      user?.user_metadata?.hitap ||
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.display_name ||
      "";

    if (metaName) {
      myDisplayName = String(metaName).trim();
    }

    if (!user?.id) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, full_name, display_name, hitap")
      .eq("id", user.id)
      .maybeSingle();

    const profileName =
      profile?.hitap ||
      profile?.name ||
      profile?.display_name ||
      profile?.full_name ||
      "";

    if (profileName) {
      myDisplayName = String(profileName).trim();
    }
  } catch {}
}

async function loadProfileFromSupabase() {
  try {
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id;
    if (!uid) {
      readLocalProfile();
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("tts_voice_ready, tts_voice_id, tokens")
      .eq("id", uid)
      .maybeSingle();

    readLocalProfile();

    if (typeof profile?.tokens === "number") {
      try {
        setHeaderTokens(profile.tokens);
      } catch {}
    }

    if (myProfile.voice_mode === "clone" && !(profile?.tts_voice_ready && profile?.tts_voice_id)) {
      myProfile.voice_mode = "auto";
      localStorage.setItem("facetoface_voice_mode", "auto");
    }
  } catch {
    readLocalProfile();
  }
}

/* =========================
   ROOM JOIN / SYNC
========================= */
async function ensureRoomJoined() {
  if (!roomId) throw new Error(t(myLang, "roomMissing"));
  if (roomJoined) return true;

  const payload = {
    room_id: roomId,
    my_lang: myLang
  };

  const r = await fetch(`${API_BASE}/interpreter/join-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok) {
    throw new Error(j?.detail || j?.error || t(myLang, "wsFailed"));
  }

  roomJoined = true;

  if (j?.peer_lang) {
    peerLang = canonical(j.peer_lang);
    peerProfile.lang = peerLang;
    try { localStorage.setItem("live_interpreter_peer_lang", peerLang); } catch {}
  }

  return j;
}

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

  if (peerConnected || peerEverConnected || peerProfileReceived) {
    setFrameVisual("ready");
    if (topHelper) topHelper.style.display = "none";
    setHelper(botHelper, t(myLang, "ready"), "helper-ready");
  } else {
    setFrameVisual("error");
    if (topHelper) topHelper.style.display = "none";
    setHelper(botHelper, t(myLang, "waitingPeer"), "helper-wait");
  }

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
  setTimeout(() => {
    if (!recordingSide) setSystemReadyUI();
  }, delay);
}

function refreshLangLabels() {
  if (botLangTxt) botLangTxt.textContent = labelChip(myLang);
}

function refreshReadyTextsIfIdle() {
  if (activeSide === null) setSystemReadyUI();
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

  let pool = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith(langBase));
  if (!pool.length) pool = voices.filter((v) => String(v.lang || "").toLowerCase() === bcp);
  if (!pool.length) pool = voices;
  if (!pool.length) return null;

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
  u.rate = c === "en" ? 0.78 : ["de", "fr", "it", "es", "az", "ka", "ru"].includes(c) ? 0.82 : 0.86;
  u.pitch = 1.0;
  u.volume = 1;

  const voice = chooseWebVoice(c);
  if (voice) u.voice = voice;

  setTimeout(() => {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }, 140);
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
      if (voice === "clone") {
        try {
          await speakViaApi(value, langCode, sourceUserId, "auto");
          return;
        } catch {}
      }
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
    if (voice === "clone") {
      try {
        await speakViaApi(value, langCode, "", "auto");
        return;
      } catch {}
    }
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

async function queueProfileResend() {
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
      sender_name: myDisplayName || "",
      lang: canonical(myLang),
      voice_mode: normalizeVoiceMode(myProfile.voice_mode),
      translate_mode: normalizeTranslateMode(myProfile.translate_mode)
    }));
  } catch (e) {
    console.warn("[profile_sync send]", e);
  }
}

async function sendLeaving(reason = "left") {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  try {
    ws.send(JSON.stringify({
      type: "leaving",
      reason,
      sender_name: myDisplayName || ""
    }));
  } catch {}
}

async function applyMyLanguageChange(nextLang) {
  myLang = canonical(nextLang || "tr");
  myProfile.lang = myLang;

  localStorage.setItem("live_interpreter_lang", myLang);
  localStorage.setItem("live_interpreter_peer_lang", peerLang);

  refreshLangLabels();
  refreshReadyTextsIfIdle();
  rebuildRecognizer();
  roomJoined = false;

  try {
    await ensureRoomJoined();

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: "set_lang",
        lang: myLang
      }));

      await sendSelfProfile();
      await queueProfileResend();

      setHelper(botHelper, t(myLang, "langUpdated"), "helper-ready");
      bounceToReady(800);
      return;
    }
  } catch (e) {
    console.warn("[applyMyLanguageChange join]", e);
  }

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

function scheduleReconnect() {
  if (manuallyClosed || peerHasExplicitlyLeft || reconnectTimer) return;

  const delay = Math.min(1500 + reconnectCount * 1000, 6000);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectCount += 1;
    roomJoined = false;
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
      await ensureRoomJoined();
    } catch (e) {
      console.warn("[join-room onopen]", e);
    }

    try {
      const room = await fetchRoomSnapshot();
      applyRoomSnapshot(room);
    } catch (e) {
      console.warn("[room snapshot onopen]", e);
      setSystemReadyUI();
    }

    await sendSelfProfile();
    await queueProfileResend();
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

        markPeerConnected(peerLang, payload?.sender_name || "");
        setHelper(botHelper, t(myLang, "peerJoined"), "helper-ready");

        await sendSelfProfile();
        await queueProfileResend();
        bounceToReady(600);
        return;
      }

      if (type === "profile_sync") {
        const senderId = String(payload?.sender_id || "").trim();
        if (senderId && senderId === myClientId) return;

        peerProfile = {
          lang: canonical(payload?.lang || peerLang || "en"),
          voice_mode: normalizeVoiceMode(payload?.voice_mode || "auto"),
          translate_mode: normalizeTranslateMode(payload?.translate_mode || "normal"),
          name: String(payload?.sender_name || peerProfile.name || "").trim()
        };

        peerProfileReceived = true;
        peerLang = peerProfile.lang;

        try { localStorage.setItem("live_interpreter_peer_lang", peerLang); } catch {}

        markPeerConnected(peerLang, peerProfile.name);
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
        const senderName = String(payload?.sender_name || "").trim();

        if (!translated && !original) return;
        if (senderId && myClientId && senderId === myClientId) return;

        markPeerConnected(peerLang, senderName);

        peerProfile.voice_mode = normalizeVoiceMode(
          senderVoice === "clone" ? "clone" : (peerProfile.voice_mode || "auto")
        );
        peerProfile.translate_mode = senderTranslateMode;
        if (senderName) peerProfile.name = senderName;
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
        peerConnected = false;

        const senderName = displayNameOrFallback(payload?.sender_name, peerProfile.name || "Karşı Taraf");
        peerProfile.name = senderName;

        renderPeerProfileBox();
        setErrorUI();
        setHelper(
          botHelper,
          payload?.message || `${senderName} odadan ayrıldı.`,
          "helper-wait"
        );
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
function hasUsablePeerConnection() {
  return !!(
    peerConnected ||
    peerEverConnected ||
    peerProfileReceived ||
    String(peerLang || "").trim()
  );
}

function canSend() {
  return !!(
    wsReady &&
    ws &&
    ws.readyState === WebSocket.OPEN &&
    roomId &&
    hasUsablePeerConnection()
  );
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
    setHelper(
      botHelper,
      hasUsablePeerConnection() ? t(myLang, "wsFailed") : t(myLang, "waitingPeer"),
      "helper-wait"
    );
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
  rec.interimResults = true;
  rec.continuous = true;
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

function collectRecognitionText() {
  const finalPart = String(recognitionFinalText || "").trim();
  const interimPart = String(recognitionInterimText || "").trim();
  return [finalPart, interimPart]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

async function finalizeRecognition(text) {
  const cleaned = String(text || "").trim();
  if (!cleaned) {
    setErrorUI();
    bounceToReady(1000);
    return;
  }

  if (shouldIgnoreDuplicateLocal(cleaned)) {
    setSystemReadyUI();
    return;
  }

  try {
    await chargeEarToEarUsage(cleaned);
  } catch (e) {
    console.warn("[sidetoside usage]", e);
    setErrorUI();
    if (e?.code !== "INSUFFICIENT_TOKENS") {
      setHelper(botHelper, "Jeton kontrolü yapılamadı", "helper-wait");
    }
    bounceToReady(1000);
    return;
  }

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
  if (!hasUsablePeerConnection()) {
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
  recognitionHasResult = false;
  recognitionFinalText = "";
  recognitionInterimText = "";
  manualStopRequested = false;
  finalizeFromOnEnd = false;

  rec.onstart = () => {
    setListeningUI();
  };

  rec.onresult = (e) => {
    let finalChunk = "";
    let interimChunk = "";

    for (let i = e.resultIndex; i < e.results.length; i++) {
      const chunk = String(e.results[i]?.[0]?.transcript || "").trim();
      if (!chunk) continue;

      if (e.results[i].isFinal) {
        finalChunk += ` ${chunk}`;
      } else {
        interimChunk += ` ${chunk}`;
      }
    }

    if (finalChunk.trim()) {
      recognitionHasResult = true;
      recognitionFinalText = `${recognitionFinalText} ${finalChunk}`.trim();
    }

    recognitionInterimText = interimChunk.trim();
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
      recognitionHasResult = true;
      await finalizeRecognition(fallback);
    } else {
      setErrorUI();
      bounceToReady(1200);
    }
  };

  rec.onend = async () => {
    recognizer = null;
    recordingSide = null;

    if (finalizeFromOnEnd) {
      const text = collectRecognitionText();
      finalizeFromOnEnd = false;
      manualStopRequested = false;

      if (text) {
        await finalizeRecognition(text);
        return;
      }
    }

    if (!recognitionHasResult) {
      setSystemReadyUI();
    }
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
    manualStopRequested = true;
    finalizeFromOnEnd = true;
    stopRecognizer();
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
    loadMyIdentity(),
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
    renderPeerProfileBox();
    pointOrbTo("bot");

    await Promise.allSettled([warmApis(), warmAudio()]);

    bootReady = true;
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

/* =========================
   EVENTS
========================= */
function bind() {
  refreshLangLabels();
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
    recognitionHasResult = false;
    recognitionFinalText = "";
    recognitionInterimText = "";
    manualStopRequested = false;
    finalizeFromOnEnd = false;
    lastLocalSentText = "";
    lastLocalSentAt = 0;
    if (topBody) topBody.innerHTML = "";
    if (botBody) botBody.innerHTML = "";
    setSystemReadyUI();
  });

  homeLink?.addEventListener("click", async (e) => {
    e.preventDefault();
    isNavigatingHome = true;
    await sendLeaving("home");
    stopSocket();
    location.href = "/pages/home.html";
  });

  homeBtn?.addEventListener("click", async () => {
    isNavigatingHome = true;
    await sendLeaving("home");
    stopSocket();
    location.href = "/pages/home.html";
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

    if (!roomId) {
      throw new Error(t(myLang, "roomMissing"));
    }

    saveReturnContext();
    await loadMyIdentity();

    setHelper(botHelper, t(myLang, "joiningRoom"), "helper-wait");

    try {
      await ensureRoomJoined();
    } catch (e) {
      console.warn("[bootRoom join-room]", e);
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
  saveReturnContext();
  if (!isNavigatingHome) {
    stopSocket();
  }
});
