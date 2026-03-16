// FILE: /js/alltoall_room.js

import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";
import { LANG_POOL } from "/js/lang_pool_full.js";

try {
  mountShell({ scroll: "none" });
} catch (e) {
  console.warn("[alltoall shell]", e);
}

const API_BASE = "https://italky-api.onrender.com/api";
const WS_BASE = "wss://italky-api.onrender.com/api/alltoall/ws";

const $ = (id) => document.getElementById(id);

/* =========================
   DOM
========================= */
const pageContent = $("pageContent");
const roomPill = $("roomPill");
const langSelect = $("langSelect");
const langPickerBtn = $("langPickerBtn");
const langPickerText = $("langPickerText");
const peopleScroll = $("peopleScroll");
const participantsCount = $("participantsCount");
const chat = $("chat");
const micBtn = $("micBtn");
const micHint = $("micHint");
const langSheet = $("langSheet");
const langSheetList = $("langSheetList");
const langSheetBackdrop = $("langSheetBackdrop");
const langSheetClose = $("langSheetClose");
const langSheetTitle = $("langSheetTitle");

/* =========================
   URL / STATE
========================= */
const params = new URLSearchParams(location.search);
const hostCode = String(params.get("host") || "").trim().toUpperCase();
const role = String(params.get("role") || "guest").trim().toLowerCase();
const incomingRoomId = String(params.get("room") || "").trim().toUpperCase();

let roomId = incomingRoomId || "";
let ws = null;
let wsReady = false;
let reconnectTimer = null;
let reconnectCount = 0;
let manuallyClosed = false;

let recognizer = null;
let recordingSide = null;
let currentAudio = null;
let voicesReady = false;
let audioCtx = null;
let preparedStream = null;
let bootReady = false;
let bootStarted = false;
let bootPromise = null;
let ttsDebounceAt = 0;

let siteLang = getSiteLang();
let myLang = canonical(localStorage.getItem("alltoall_lang") || "tr");
let LANGS = buildLangPoolForSite(siteLang);

let myProfile = {
  from: "",
  from_name: role === "host" ? "Host" : "Guest",
  from_pic: "",
  me_lang: myLang,
  role,
  user_id: "",
};

let joinedPeople = new Map();
let lastLocalSentText = "";
let lastLocalSentAt = 0;

/* =========================
   TEXT
========================= */
const SITE_TEXT = {
  tr: {
    speakHint: "Konuşmak için mikrofona dokun.",
    listeningHint: "Konuşmanız bitince mikrofona tekrar basınız.",
    sending: "Gönderiliyor...",
    preparing: "Sistem hazırlanıyor...",
    roomCopied: "Oda kodu kopyalandı",
    socketNotReady: "Bağlantı henüz hazır değil.",
    roomMissing: "Oda bilgisi bulunamadı.",
    roomCreated: "Bağlantı kuruldu",
    peerJoined: "Yeni katılımcı bağlandı",
    peerLeftNamed: "{name} ayrıldı",
    roomNotFound: "Kanal bulunamadı.",
    hostNotReady: "Host henüz odaya giriş yapmadı.",
    roomNotCreated: "Bu oda henüz oluşturulmamış.",
    connectionError: "Bağlantı hatası oluştu.",
    connectionClosed: "Bağlantı koptu. Yeniden bağlanıyor...",
    micUnsupported: "Bu cihazda konuşma algılama desteklenmiyor.",
    micDenied: "Mikrofon izni gerekli.",
    micFailed: "Mikrofon başlatılamadı.",
    langUpdated: "Dil güncellendi",
    selectLanguage: "Dil Seç",
    participant: "Katılımcı"
  },
  en: {
    speakHint: "Tap the microphone to speak.",
    listeningHint: "Press the microphone again when you finish speaking.",
    sending: "Sending...",
    preparing: "System is preparing...",
    roomCopied: "Room code copied",
    socketNotReady: "Connection is not ready yet.",
    roomMissing: "Room information not found.",
    roomCreated: "Connected",
    peerJoined: "A new participant joined",
    peerLeftNamed: "{name} left",
    roomNotFound: "Channel not found.",
    hostNotReady: "Host has not entered the room yet.",
    roomNotCreated: "This room has not been created yet.",
    connectionError: "A connection error occurred.",
    connectionClosed: "Connection dropped. Reconnecting...",
    micUnsupported: "Speech recognition is not supported on this device.",
    micDenied: "Microphone permission required.",
    micFailed: "Microphone could not be started.",
    langUpdated: "Language updated",
    selectLanguage: "Select Language",
    participant: "Participant"
  }
};

function st(key) {
  const pack = SITE_TEXT[siteLang] || SITE_TEXT.tr;
  return pack[key] || SITE_TEXT.tr[key] || key;
}

function stf(key, vars = {}) {
  let txt = st(key);
  Object.entries(vars).forEach(([k, v]) => {
    txt = txt.replaceAll(`{${k}}`, String(v ?? ""));
  });
  return txt;
}

/* =========================
   HELPERS
========================= */
function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim();
}

function getSiteLang() {
  const v = canonical(localStorage.getItem("system_lang") || "tr");
  return ["tr", "en", "de", "fr", "it", "es"].includes(v) ? v : "tr";
}

function toDisplayCode(code) {
  const parts = String(code || "").split("-");
  if (parts.length === 2) return `${parts[0].toLowerCase()}-${parts[1].toUpperCase()}`;
  return String(code || "").toLowerCase();
}

function getLocalizedLanguageName(code, locale) {
  const normalized = toDisplayCode(code);
  try {
    const dn = new Intl.DisplayNames([locale], { type: "language" });
    const out = dn.of(normalized) || dn.of(normalized.split("-")[0]);
    if (out) return out.charAt(0).toUpperCase() + out.slice(1);
  } catch {}
  return normalized.toUpperCase();
}

function buildLangPoolForSite(locale) {
  return (Array.isArray(LANG_POOL) ? LANG_POOL : []).map((item) => ({
    code: canonical(item.code),
    flag: item.flag || "🌐",
    name: getLocalizedLanguageName(item.code, locale),
    native: item.name || item.code.toUpperCase()
  }));
}

function toBCP(code) {
  const map = {
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
    "pt-br": "pt-BR",
    nl: "nl-NL",
    sv: "sv-SE",
    no: "no-NO",
    da: "da-DK",
    fi: "fi-FI",
    pl: "pl-PL",
    cs: "cs-CZ",
    sk: "sk-SK",
    hu: "hu-HU",
    ro: "ro-RO",
    bg: "bg-BG",
    uk: "uk-UA",
    ar: "ar-SA",
    he: "he-IL",
    fa: "fa-IR",
    ur: "ur-PK",
    hi: "hi-IN",
    bn: "bn-BD",
    id: "id-ID",
    ms: "ms-MY",
    vi: "vi-VN",
    th: "th-TH",
    zh: "zh-CN",
    ja: "ja-JP",
    ko: "ko-KR"
  };
  return map[canonical(code)] || "tr-TR";
}

function compactDisplayName(fullName) {
  const clean = String(fullName || "").trim().replace(/\s+/g, " ");
  if (!clean) return "";
  const parts = clean.split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0];
  const first = parts[0];
  const rest = parts.slice(1).map((p) => `${p.charAt(0).toUpperCase()}.`).join("");
  return `${first} ${rest}`;
}

function getLangMeta(code) {
  const c = canonical(code);
  return LANGS.find((l) => l.code === c) || {
    code: c,
    flag: "🌐",
    name: getLocalizedLanguageName(c, siteLang)
  };
}

function getDisplayNameFromUser(user) {
  const meta = user?.user_metadata || {};
  return (
    meta.display_name ||
    meta.full_name ||
    meta.name ||
    user?.email?.split("@")[0] ||
    (role === "host" ? "Host" : "Guest")
  );
}

function getAvatarFromUser(user) {
  const meta = user?.user_metadata || {};
  return meta.picture || meta.avatar_url || meta.avatar || "";
}

function getStableFromId(user) {
  return (
    user?.id ||
    user?.email ||
    `${role}-${Math.random().toString(36).slice(2, 10)}`
  );
}

function getInitials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function personKey(person) {
  return String(
    person?.from ||
    person?.user_id ||
    person?.role ||
    person?.from_name ||
    Math.random().toString(36).slice(2)
  );
}

function visibleCode() {
  return roomId || hostCode || "------";
}

/* =========================
   UI
========================= */
function refreshStaticTexts() {
  try {
    document.documentElement.setAttribute("lang", siteLang);
  } catch {}

  if (langSheetTitle) langSheetTitle.textContent = st("selectLanguage");
  updateMicUI();
}

function syncRoomPill() {
  if (roomPill) roomPill.textContent = visibleCode();
}

function renderPeople() {
  if (!peopleScroll) return;

  peopleScroll.innerHTML = "";
  const arr = [...joinedPeople.values()].slice(0, 50);

  arr.forEach((person) => {
    const wrap = document.createElement("div");
    wrap.className = "pItem";

    const avatar = document.createElement("div");
    avatar.className = "pAvatar";

    if (person.from_pic) {
      const img = document.createElement("img");
      img.src = person.from_pic;
      img.alt = person.from_name || st("participant");
      img.referrerPolicy = "no-referrer";
      avatar.appendChild(img);
    } else {
      avatar.textContent = getInitials(person.from_name || st("participant"));
    }

    const label = document.createElement("div");
    label.className = "pName";
    label.textContent = compactDisplayName(person.from_name || st("participant"));

    wrap.appendChild(avatar);
    wrap.appendChild(label);
    peopleScroll.appendChild(wrap);
  });

  if (participantsCount) {
    participantsCount.textContent = `${joinedPeople.size} / 50`;
  }
}

function ensureSelfInPeople() {
  const key = personKey(myProfile);
  joinedPeople.set(key, { ...myProfile });
  renderPeople();
}

function applyRoster(roster = []) {
  joinedPeople.clear();

  if (Array.isArray(roster)) {
    roster.forEach((person) => {
      const key = personKey(person);
      joinedPeople.set(key, {
        from: person?.from || "",
        from_name: person?.from_name || st("participant"),
        from_pic: person?.from_pic || "",
        me_lang: person?.me_lang || "tr",
        role: person?.role || "guest",
        user_id: person?.user_id || "",
      });
    });
  }

  const existsSelf = [...joinedPeople.values()].some((p) =>
    (p.from && p.from === myProfile.from) ||
    (p.user_id && p.user_id === myProfile.user_id)
  );

  if (!existsSelf) ensureSelfInPeople();
  else renderPeople();
}

function upsertPerson(person) {
  if (!person) return;
  const key = personKey(person);
  joinedPeople.set(key, {
    from: person?.from || "",
    from_name: person?.from_name || st("participant"),
    from_pic: person?.from_pic || "",
    me_lang: person?.me_lang || "tr",
    role: person?.role || "guest",
    user_id: person?.user_id || "",
  });
  renderPeople();
}

function removePerson(person) {
  if (!person) return;

  let removedName = "";

  for (const [k, v] of joinedPeople.entries()) {
    if (
      (person.from && v.from === person.from) ||
      (person.user_id && v.user_id === person.user_id) ||
      (person.from_name && v.from_name === person.from_name)
    ) {
      removedName = compactDisplayName(v.from_name || person.from_name || st("participant"));
      joinedPeople.delete(k);
    }
  }

  renderPeople();

  if (removedName) {
    addSystemMessage(stf("peerLeftNamed", { name: removedName }));
  }
}

function scrollChatBottom() {
  if (!chat) return;
  requestAnimationFrame(() => {
    try { chat.scrollTop = chat.scrollHeight; } catch {}
  });
}

function addSystemMessage(text) {
  if (!chat) return;
  const div = document.createElement("div");
  div.className = "sys-note";
  div.textContent = String(text || "").trim();
  chat.appendChild(div);
  scrollChatBottom();
}

function createSpeakerButton(text, langCode) {
  const btn = document.createElement("button");
  btn.className = "msg-spk";
  btn.type = "button";
  btn.setAttribute("aria-label", "Speak");
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
    await speakText(text, langCode);
  });
  return btn;
}

function addMessage({ side = "left", sender = "", text = "", withSpeaker = false, speakLang = "tr", fromLang = "tr" }) {
  const safeText = String(text || "").trim();
  if (!safeText || !chat) return;

  const langMeta = getLangMeta(fromLang);

  const row = document.createElement("div");
  row.className = `msg-row ${side}`;

  const card = document.createElement("div");
  card.className = "msg-card";

  const head = document.createElement("div");
  head.className = "msg-head";

  const nameEl = document.createElement("div");
  nameEl.className = "msg-name";
  nameEl.textContent = compactDisplayName(sender || st("participant"));

  const langEl = document.createElement("div");
  langEl.className = "msg-lang";
  langEl.textContent = `${langMeta.flag} ${langMeta.name}`;

  head.appendChild(nameEl);
  head.appendChild(langEl);

  if (withSpeaker) {
    head.appendChild(createSpeakerButton(safeText, speakLang));
  }

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = safeText;

  card.appendChild(head);
  card.appendChild(bubble);
  row.appendChild(card);
  chat.appendChild(row);

  scrollChatBottom();
}

function buildLanguageSelect() {
  if (!langSelect) return;

  langSelect.innerHTML = "";
  LANGS.forEach((l) => {
    const opt = document.createElement("option");
    opt.value = l.code;
    opt.textContent = `${l.flag} ${l.name}`;
    langSelect.appendChild(opt);
  });

  const exists = LANGS.some((l) => l.code === myLang);
  langSelect.value = exists ? myLang : "tr";
  myLang = langSelect.value;
  syncLangPickerLabel();
}

function syncLangPickerLabel() {
  const opt = langSelect?.options?.[langSelect.selectedIndex];
  if (!opt || !langPickerText) return;
  langPickerText.textContent = opt.textContent || "🌐";
}

function renderLangSheet() {
  if (!langSheetList || !langSelect) return;

  const options = [...langSelect.options];
  langSheetList.innerHTML = options.map((opt) => `
    <button class="sheet-item ${opt.selected ? "active" : ""}" type="button" data-value="${opt.value}">
      <div class="sheet-item-left">
        <div class="sheet-flag">${(opt.textContent || "").trim().split(" ")[0] || "🌐"}</div>
        <div class="sheet-text">
          <div class="sheet-name">${(opt.textContent || "").trim().replace(/^(\S+)\s*/, "")}</div>
          <div class="sheet-code">${String(opt.value || "").toUpperCase()}</div>
        </div>
      </div>
      <div class="sheet-check"></div>
    </button>
  `).join("");

  langSheetList.querySelectorAll(".sheet-item").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const value = canonical(btn.dataset.value || "tr");
      myLang = value;
      langSelect.value = value;
      localStorage.setItem("alltoall_lang", myLang);
      myProfile.me_lang = myLang;

      rebuildRecognizer();
      syncLangPickerLabel();
      closeLangSheet();

      if (ws && ws.readyState === WebSocket.OPEN) {
        sendWs({
          type: "profile_sync",
          from_name: myProfile.from_name,
          from_pic: myProfile.from_pic,
          me_lang: myLang,
          user_id: myProfile.user_id,
        });
      }

      addSystemMessage(st("langUpdated"));
      updateMicUI();
    });
  });
}

function openLangSheet() {
  renderLangSheet();
  langSheet?.classList.add("show");
  langSheetBackdrop?.classList.add("show");
  langSheet?.setAttribute("aria-hidden", "false");
}

function closeLangSheet() {
  langSheet?.classList.remove("show");
  langSheetBackdrop?.classList.remove("show");
  langSheet?.setAttribute("aria-hidden", "true");
}

function updateMicUI() {
  if (!micHint) return;
  micHint.className = "helper-text";
  if (recordingSide === "bot") {
    micHint.classList.add("helper-repeat");
    micHint.textContent = st("listeningHint");
  } else {
    micHint.classList.add("helper-ready");
    micHint.textContent = st("speakHint");
  }
}

/* =========================
   AUDIO / TTS
========================= */
function stopAudio() {
  try {
    currentAudio?.pause?.();
    currentAudio = null;
  } catch {}
  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}
}

async function getCurrentUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

async function getCurrentUserId() {
  const u = await getCurrentUser();
  return u?.id || null;
}

function getVoicePreference() {
  const v = String(
    localStorage.getItem("tts_voice") ||
    localStorage.getItem("live_interpreter_voice") ||
    "auto"
  ).toLowerCase().trim();

  if (["auto", "female", "male", "clone"].includes(v)) return v;
  return "auto";
}

async function warmAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
    }
  } catch {}

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      voicesReady = true;
    }
  } catch {}
}

async function prepareEnhancedMic() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return;
    if (preparedStream) return;

    preparedStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1
      },
      video: false
    });
  } catch (e) {
    console.warn("[alltoall enhanced mic]", e);
  }
}

async function hasReadyVoiceProfile() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("tts_voice_ready,tts_voice_id")
      .eq("id", user.id)
      .maybeSingle();

    if (error) return false;
    return !!data?.tts_voice_ready && !!String(data?.tts_voice_id || "").trim();
  } catch {
    return false;
  }
}

async function speakViaApi(text, langCode) {
  const userId = await getCurrentUserId();
  const voice = getVoicePreference();

  const r = await fetch(`${API_BASE}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: String(text || "").trim(),
      lang: canonical(langCode),
      user_id: userId,
      module: "alltoall",
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

  const playPromise = audio.play();
  if (playPromise && typeof playPromise.then === "function") {
    await playPromise;
  }
}

function chooseWebVoice(langCode) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  if (!voices.length) return null;

  const pref = getVoicePreference();
  const base = canonical(langCode);
  const bcp = toBCP(langCode).toLowerCase();

  let pool = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith(base));
  if (!pool.length) pool = voices.filter((v) => String(v.lang || "").toLowerCase() === bcp);
  if (!pool.length) pool = voices;

  if (pref === "female") {
    return (
      pool.find((v) => /female|woman|zira|aria|jenny|eva|emma|anna|helena/i.test(v.name)) ||
      pool[0]
    );
  }

  if (pref === "male") {
    return (
      pool.find((v) => /male|man|david|mark|alex|tom|jon|paul/i.test(v.name)) ||
      pool[0]
    );
  }

  return pool[0] || null;
}

function speakFallback(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return;

  stopAudio();

  const pref = getVoicePreference();
  const c = canonical(langCode);

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
  u.lang = toBCP(langCode);
  u.rate = c === "en" ? 0.82 : ["de", "fr", "it", "es"].includes(c) ? 0.88 : 0.92;
  u.pitch = 1.0;
  u.volume = 1;

  const voice = chooseWebVoice(langCode);
  if (voice) u.voice = voice;

  setTimeout(() => {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }, 60);
}

async function speakText(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return;

  const now = Date.now();
  if (now - ttsDebounceAt < 250) stopAudio();
  ttsDebounceAt = now;
  stopAudio();

  const voice = getVoicePreference();

  if (voice === "auto") {
    speakFallback(value, langCode);
    return;
  }

  if (voice === "clone") {
    try {
      const ready = await hasReadyVoiceProfile();
      if (!ready) {
        speakFallback(value, langCode);
        return;
      }
      await speakViaApi(value, langCode);
      return;
    } catch {
      speakFallback(value, langCode);
      return;
    }
  }

  try {
    await speakViaApi(value, langCode);
  } catch {
    speakFallback(value, langCode);
  }
}

/* =========================
   ROOM / SOCKET
========================= */
async function createRoomIfHost() {
  if (role !== "host") return null;
  if (roomId) return { room_id: roomId, host_code: hostCode || roomId };

  const r = await fetch(`${API_BASE}/interpreter/create-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      host_code: hostCode || "ALLTOALL-HOST",
      my_lang: myLang,
      mode: "alltoall"
    })
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.room_id) {
    throw new Error(j?.detail || j?.error || "room create başarısız");
  }

  roomId = String(j.room_id || "").trim().toUpperCase();
  syncRoomPill();
  return j;
}

async function resolveRoomForGuestByHost() {
  if (!hostCode || role !== "guest") return null;

  const r = await fetch(`${API_BASE}/interpreter/resolve-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      host_code: hostCode,
      my_lang: myLang,
      mode: "alltoall"
    })
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.room_id) {
    throw new Error(j?.detail || j?.error || "Room resolve failed");
  }

  roomId = String(j.room_id || "").trim().toUpperCase();
  syncRoomPill();
  return j;
}

function sendWs(payload) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    } else {
      addSystemMessage(st("socketNotReady"));
    }
  } catch (e) {
    console.warn("[alltoall sendWs]", e);
  }
}

function scheduleReconnect() {
  if (manuallyClosed || reconnectTimer) return;

  const delay = Math.min(1500 + (reconnectCount * 1000), 6000);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectCount += 1;
    addSystemMessage(st("connectionClosed"));
    connectSocket();
  }, delay);
}

function connectSocket() {
  if (!roomId) {
    addSystemMessage(st("roomMissing"));
    return;
  }

  const wsUrl = `${WS_BASE}/${encodeURIComponent(roomId)}`;
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    wsReady = true;
    reconnectCount = 0;

    sendWs({
      type: role === "host" ? "create" : "join",
      from: myProfile.from,
      from_name: myProfile.from_name,
      from_pic: myProfile.from_pic,
      me_lang: myLang,
      role,
      user_id: myProfile.user_id,
      host_code: hostCode || roomId
    });
  };

  ws.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data || "{}");
      const type = String(data?.type || "").trim();

      if (type === "room_created" || type === "room_joined") {
        if (data.self) {
          myProfile = {
            ...myProfile,
            ...data.self,
            me_lang: myLang,
          };
        }

        roomId = String(data.room || roomId || "").trim().toUpperCase();
        syncRoomPill();
        ensureSelfInPeople();
        addSystemMessage(st("roomCreated"));
        return;
      }

      if (type === "presence") {
        applyRoster(data.roster || []);
        return;
      }

      if (type === "peer_joined") {
        if (data.peer) upsertPerson(data.peer);
        if (Array.isArray(data.roster)) applyRoster(data.roster);
        addSystemMessage(st("peerJoined"));
        return;
      }

      if (type === "profile_updated") {
        if (data.peer) upsertPerson(data.peer);
        if (Array.isArray(data.roster)) applyRoster(data.roster);
        return;
      }

      if (type === "peer_left") {
        if (data.peer) removePerson(data.peer);
        if (Array.isArray(data.roster)) applyRoster(data.roster);
        return;
      }

      if (type === "translated_message") {
        const fromId = String(data.from || "").trim();
        const senderName = String(data.from_name || st("participant")).trim();
        const translated = String(data.translated_text || "").trim();
        const original = String(data.original_text || "").trim();
        const finalText = translated || original;
        const fromLang = canonical(data.from_lang || data.lang || "tr");

        if (!finalText) return;
        if (fromId && myProfile.from && fromId === myProfile.from) return;

        addMessage({
          side: "left",
          sender: senderName,
          text: finalText,
          withSpeaker: true,
          speakLang: myLang,
          fromLang
        });

        if (data.from || data.from_name || data.from_pic) {
          upsertPerson({
            from: data.from || "",
            from_name: data.from_name || senderName,
            from_pic: data.from_pic || "",
            me_lang: fromLang,
            role: data.role || "guest",
            user_id: data.from_user_id || "",
          });
        }

        await speakText(finalText, myLang);
        return;
      }

      if (type === "room_not_found") {
        addSystemMessage(data.message || st("roomNotFound"));
        return;
      }

      if (type === "error") {
        const msg = String(data.message || "");
        if (msg === "HOST_NOT_READY") {
          addSystemMessage(st("hostNotReady"));
        } else {
          addSystemMessage(msg || st("connectionError"));
        }
      }
    } catch (e) {
      console.warn("[alltoall ws parse]", e);
    }
  };

  ws.onerror = () => {
    wsReady = false;
    addSystemMessage(st("connectionError"));
  };

  ws.onclose = () => {
    wsReady = false;
    if (!manuallyClosed) scheduleReconnect();
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

function sendSpeechMessage(text) {
  const value = String(text || "").trim();
  if (!value) return;
  if (shouldIgnoreDuplicateLocal(value)) return;

  addMessage({
    side: "right",
    sender: myProfile.from_name,
    text: value,
    withSpeaker: false,
    speakLang: myLang,
    fromLang: myLang
  });

  if (!canSend()) {
    addSystemMessage(st("socketNotReady"));
    return;
  }

  sendWs({
    type: "message",
    text: value,
    lang: myLang
  });
}

/* =========================
   SPEECH
========================= */
function buildRecognizer(langCode) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = toBCP(langCode);
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
  const typed = prompt(`${getLangMeta(myLang).name} olarak konuşmanı yaz:`) || "";
  return String(typed).trim() || null;
}

function initSpeech() {
  rebuildRecognizer();

  if (!recognizer) {
    addSystemMessage(st("micUnsupported"));
    return;
  }

  recognizer.onstart = () => {
    recordingSide = "bot";
    micBtn?.classList.add("listening");
    updateMicUI();
  };

  recognizer.onresult = (e) => {
    const text = String(e.results?.[0]?.[0]?.transcript || "").trim();

    recordingSide = null;
    micBtn?.classList.remove("listening");
    micBtn?.classList.add("recorded");
    setTimeout(() => micBtn?.classList.remove("recorded"), 700);
    updateMicUI();

    if (!text) {
      addSystemMessage(st("micFailed"));
      return;
    }

    sendSpeechMessage(text);
  };

  recognizer.onend = () => {
    recordingSide = null;
    micBtn?.classList.remove("listening");
    updateMicUI();
  };

  recognizer.onerror = async (e) => {
    recordingSide = null;
    micBtn?.classList.remove("listening");
    updateMicUI();

    const err = String(e?.error || "").toLowerCase();

    if (err.includes("not-allowed")) {
      addSystemMessage(st("micDenied"));
      return;
    }

    if (err.includes("aborted")) {
      return;
    }

    const fallback = await speechToTextFallback();
    if (fallback) {
      sendSpeechMessage(fallback);
      return;
    }

    addSystemMessage(st("micFailed"));
  };
}

async function toggleMic() {
  await ensureReady();

  try {
    await warmAudio();
    await prepareEnhancedMic();
  } catch {}

  if (recordingSide === "bot") {
    stopRecognizer();
    recordingSide = null;
    micBtn?.classList.remove("listening");
    updateMicUI();
    return;
  }

  rebuildRecognizer();

  if (!recognizer) {
    addSystemMessage(st("micUnsupported"));
    return;
  }

  try {
    recognizer.lang = toBCP(myLang);
    recognizer.start();
  } catch (e) {
    console.warn("[alltoall mic start]", e);
    const fallback = await speechToTextFallback();
    if (fallback) {
      sendSpeechMessage(fallback);
      return;
    }
    addSystemMessage(st("micFailed"));
  }
}

/* =========================
   READY / BOOT
========================= */
async function startBoot() {
  if (bootStarted) return bootPromise;
  bootStarted = true;

  bootPromise = (async () => {
    if (micHint) {
      micHint.className = "helper-text helper-wait";
      micHint.textContent = st("preparing");
    }

    await Promise.allSettled([
      warmAudio(),
      prepareEnhancedMic()
    ]);

    bootReady = true;
    updateMicUI();
  })();

  return bootPromise;
}

async function ensureReady() {
  if (bootReady) return true;
  if (!bootStarted) startBoot();
  try {
    await bootPromise;
  } catch {}
  return true;
}

/* =========================
   LAYOUT
========================= */
function fixLayout() {
  try {
    const footerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--footerH")) || 0;
    document.documentElement.style.setProperty("--footerSafe", `${footerH}px`);

    if (window.visualViewport && pageContent) {
      pageContent.style.height = `${window.visualViewport.height}px`;
      pageContent.style.minHeight = `${window.visualViewport.height}px`;
    }
  } catch {}
}

/* =========================
   EVENTS
========================= */
function bindEvents() {
  roomPill?.addEventListener("click", async () => {
    const code = visibleCode();
    if (!code || code === "------") return;
    try {
      await navigator.clipboard.writeText(code);
      addSystemMessage(`${st("roomCopied")}: ${code}`);
    } catch {}
  });

  langPickerBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openLangSheet();
  });

  langSheetBackdrop?.addEventListener("click", closeLangSheet);
  langSheetClose?.addEventListener("click", closeLangSheet);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLangSheet();

    if ((e.key === "Enter" || e.key === " ") && document.activeElement === micBtn) {
      e.preventDefault();
      toggleMic();
    }
  });

  micBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleMic();
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", fixLayout);
    window.visualViewport.addEventListener("scroll", fixLayout);
  }

  window.addEventListener("resize", fixLayout);
  window.addEventListener("orientationchange", fixLayout);

  window.addEventListener("focus", () => {
    const nextSiteLang = getSiteLang();
    if (nextSiteLang !== siteLang) {
      siteLang = nextSiteLang;
      LANGS = buildLangPoolForSite(siteLang);
      refreshStaticTexts();
      buildLanguageSelect();
      renderLangSheet();
      renderPeople();
      syncRoomPill();
      rebuildRecognizer();
    }
  });

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        try { window.speechSynthesis.getVoices(); } catch {}
        voicesReady = true;
      };
    }
  } catch {}
}

/* =========================
   PROFILE
========================= */
async function hydrateMyProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    myProfile = {
      from: getStableFromId(user),
      from_name: getDisplayNameFromUser(user),
      from_pic: getAvatarFromUser(user),
      me_lang: myLang,
      role,
      user_id: user?.id || "",
    };
  } catch (e) {
    console.warn("[alltoall hydrateMyProfile]", e);
  }
}

/* =========================
   INIT
========================= */
async function init() {
  siteLang = getSiteLang();
  LANGS = buildLangPoolForSite(siteLang);

  refreshStaticTexts();
  buildLanguageSelect();
  syncRoomPill();
  updateMicUI();
  fixLayout();

  await hydrateMyProfile();
  ensureSelfInPeople();

  initSpeech();
  bindEvents();

  try {
    await startBoot();
  } catch {}

  try {
    if (role === "host") {
      await createRoomIfHost();
    } else if (role === "guest" && !incomingRoomId && hostCode) {
      await resolveRoomForGuestByHost();
    }
  } catch (e) {
    console.error("[alltoall room init]", e);
    addSystemMessage(st("roomNotCreated"));
    return;
  }

  syncRoomPill();
  connectSocket();
}

init();

window.addEventListener("beforeunload", () => {
  manuallyClosed = true;
  stopAudio();
  try { ws?.close?.(); } catch {}
  try { preparedStream?.getTracks?.().forEach((t) => t.stop()); } catch {}
});
