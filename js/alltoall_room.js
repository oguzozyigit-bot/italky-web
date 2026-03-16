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

const LANGS_BASE = (Array.isArray(LANG_POOL) ? LANG_POOL : [])
  .map((l) => {
    const code = canonical(l.code);
    if (!code) return null;
    return {
      code,
      flag: l.flag || "🌐",
      rawName: l.name || code.toUpperCase(),
      bcp: BCP[code] || "en-US",
    };
  })
  .filter(Boolean);

function getSiteLang() {
  const v = canonical(localStorage.getItem("system_lang") || "tr");
  return ["tr", "en", "de", "fr", "it", "es"].includes(v) ? v : "tr";
}

function getLocalizedLanguageName(code, locale) {
  try {
    const dn = new Intl.DisplayNames([locale], { type: "language" });
    const out = dn.of(code) || dn.of(code.split("-")[0]);
    if (out) return out.charAt(0).toUpperCase() + out.slice(1);
  } catch {}
  return code.toUpperCase();
}

function buildLangPoolForSite(locale) {
  return LANGS_BASE.map((l) => ({
    code: l.code,
    flag: l.flag,
    name: getLocalizedLanguageName(l.code, locale),
    rawName: l.rawName,
    bcp: l.bcp,
  }));
}

let siteLang = getSiteLang();
let LANGS = buildLangPoolForSite(siteLang);

function langObj(code) {
  const c = canonical(code);
  return (
    LANGS.find((x) => x.code === c) || {
      code: c,
      flag: "🌐",
      name: c.toUpperCase(),
      rawName: c.toUpperCase(),
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
    ready: "Konuşmak için mikrofona dokun.",
    preparing: "Sistem hazırlanıyor...",
    repeat: "Konuşmanız bitince mikrofona tekrar basınız.",
    wait: "Lütfen bekleyiniz...",
    translating: "Gönderiliyor...",
    micBlocked: "⚠️ Mikrofon izni gerekli",
    speechUnsupported: "⚠️ Bu cihazda konuşma algılama desteklenmiyor",
    micFailed: "⚠️ Mikrofon başlatılamadı",
    wsFailed: "Bağlantı kurulamadı",
    reconnecting: "Bağlantı yenileniyor...",
    peerJoined: "Yeni katılımcı bağlandı",
    peerLeftNamed: "{name} ayrıldı",
    roomCreated: "Bağlantı kuruldu",
    roomNotCreated: "Bu oda henüz oluşturulmamış.",
    hostNotReady: "Host henüz odaya giriş yapmadı.",
    connectionError: "Bağlantı hatası oluştu.",
    connectionClosed: "Bağlantı koptu. Yeniden bağlanıyor...",
    socketNotReady: "Bağlantı henüz hazır değil.",
    roomMissing: "Oda bilgisi bulunamadı.",
    roomCopied: "Oda kodu kopyalandı",
    langUpdated: "Dil güncellendi",
    participant: "Katılımcı"
  },
  en: {
    ready: "Tap the microphone to speak.",
    preparing: "System is preparing...",
    repeat: "Press the microphone again when you finish speaking.",
    wait: "Please wait...",
    translating: "Sending...",
    micBlocked: "⚠️ Microphone permission required",
    speechUnsupported: "⚠️ Speech recognition is not supported on this device",
    micFailed: "⚠️ Microphone could not be started",
    wsFailed: "Connection failed",
    reconnecting: "Reconnecting...",
    peerJoined: "A new participant joined",
    peerLeftNamed: "{name} left",
    roomCreated: "Connected",
    roomNotCreated: "This room has not been created yet.",
    hostNotReady: "Host has not entered the room yet.",
    connectionError: "A connection error occurred.",
    connectionClosed: "Connection dropped. Reconnecting...",
    socketNotReady: "Connection is not ready yet.",
    roomMissing: "Room information not found.",
    roomCopied: "Room code copied",
    langUpdated: "Language updated",
    participant: "Participant"
  },
};

function t(langCode, key) {
  const c = canonical(langCode);
  const pack = UI_TEXT[c] || UI_TEXT.en;
  return pack[key] || UI_TEXT.en[key] || "";
}

function tf(langCode, key, vars = {}) {
  let txt = t(langCode, key);
  Object.entries(vars).forEach(([k, v]) => {
    txt = txt.replaceAll(`{${k}}`, String(v ?? ""));
  });
  return txt;
}

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
   PARAMS / STATE
========================= */
const query = new URLSearchParams(location.search);

let roomId = String(query.get("room") || "").trim().toUpperCase();
const hostCode = String(query.get("host") || "").trim().toUpperCase();
const role = String(query.get("role") || "guest").trim().toLowerCase();

let myLang = String(
  query.get("my") || localStorage.getItem("alltoall_lang") || "tr"
).trim().toLowerCase();

myLang = canonical(myLang || "tr");

let recognizer = null;
let recordingSide = null;
let currentAudio = null;
let audioCtx = null;
let bootReady = false;
let bootStarted = false;
let bootPromise = null;
let voicesReady = false;
let preparedStream = null;
let ttsDebounceAt = 0;

let ws = null;
let wsReady = false;
let reconnectTimer = null;
let reconnectCount = 0;
let manuallyClosed = false;

let lastLocalSentText = "";
let lastLocalSentAt = 0;

let myProfile = {
  from: "",
  from_name: role === "host" ? "Host" : "Guest",
  from_pic: "",
  me_lang: myLang,
  role,
  user_id: "",
};

let joinedPeople = new Map();

/* =========================
   LAYOUT / SHELL PATCH
========================= */
function patchShell() {
  try {
    const footerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--footerH")) || 0;
    document.documentElement.style.setProperty("--footerSafe", `${footerH}px`);

    const overlays = [
      ".shell-overlay",
      ".shell-backdrop",
      ".shell-scrim",
      "[data-shell-overlay]",
      "[data-shell-backdrop]"
    ];

    overlays.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        el.style.pointerEvents = "none";
      });
    });

    if (pageContent) {
      pageContent.style.position = "relative";
      pageContent.style.zIndex = "20";
      pageContent.style.pointerEvents = "auto";
    }

    if (langPickerBtn) {
      langPickerBtn.style.pointerEvents = "auto";
      langPickerBtn.style.zIndex = "40";
      langPickerBtn.style.position = "relative";
    }

    if (roomPill) {
      roomPill.style.pointerEvents = "auto";
      roomPill.style.zIndex = "40";
      roomPill.style.position = "relative";
    }

    if (micBtn) {
      micBtn.style.pointerEvents = "auto";
      micBtn.style.zIndex = "60";
      micBtn.style.position = "relative";
    }

    if (langSheet) {
      langSheet.style.zIndex = "9999";
      langSheet.style.pointerEvents = "auto";
    }

    if (langSheetBackdrop) {
      langSheetBackdrop.style.zIndex = "9998";
    }

    if (window.visualViewport && pageContent) {
      const h = Math.max(320, Math.round(window.visualViewport.height - footerH));
      pageContent.style.height = `${h}px`;
      pageContent.style.minHeight = `${h}px`;
    }
  } catch (e) {
    console.warn("[alltoall patchShell]", e);
  }
}

function fixLayout() {
  patchShell();
}

/* =========================
   VISUAL STATE
========================= */
function setMicState(state) {
  if (!micBtn) return;
  micBtn.classList.remove("listening", "recorded");
  if (state === "listening") micBtn.classList.add("listening");
  if (state === "recorded") micBtn.classList.add("recorded");
}

function resetMic() {
  micBtn?.classList.remove("listening", "recorded");
}

function setHelper(el, text, tone) {
  if (!el) return;
  el.className = "helper-text";
  if (tone) el.classList.add(tone);
  el.textContent = text || "";
}

function setSystemReadyUI() {
  resetMic();
  setHelper(micHint, t(myLang, "ready"), "helper-ready");
}

function setSystemPreparingUI() {
  resetMic();
  setHelper(micHint, t(myLang, "preparing"), "helper-wait");
}

function setListeningUI() {
  setMicState("listening");
  setHelper(micHint, t(myLang, "repeat"), "helper-repeat");
}

function setTranslatingUI() {
  setMicState("recorded");
  setHelper(micHint, t(myLang, "translating"), "helper-repeat");
}

function setErrorUI(text) {
  resetMic();
  setHelper(micHint, text || t(myLang, "preparing"), "helper-wait");
}

function bounceToReady(delay = 1200) {
  setTimeout(() => setSystemReadyUI(), delay);
}

function refreshLangLabels() {
  if (langPickerText) langPickerText.textContent = labelChip(myLang);
}

function refreshReadyTextsIfIdle() {
  if (!recordingSide) setSystemReadyUI();
}

/* =========================
   LANGUAGE SHEET
========================= */
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
  refreshLangLabels();
}

function renderLangSheet() {
  if (!langSheetList) return;

  langSheetList.innerHTML = LANGS.map((l) => {
    const active = canonical(l.code) === canonical(myLang) ? "active" : "";
    return `
      <button class="sheet-item ${active}" type="button" data-code="${l.code}">
        <div class="sheet-item-left">
          <div class="sheet-flag">${l.flag}</div>
          <div class="sheet-text">
            <div class="sheet-name">${l.name}</div>
            <div class="sheet-code">${l.code.toUpperCase()}</div>
          </div>
        </div>
        <div class="sheet-check"></div>
      </button>
    `;
  }).join("");

  langSheetList.querySelectorAll(".sheet-item").forEach((el) => {
    const choose = async () => {
      await applyMyLanguageChange(el.dataset.code || "tr");
      closeLangSheet();
    };

    ["click", "touchend", "pointerup"].forEach((evt) => {
      el.addEventListener(evt, async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await choose();
      }, { passive: false });
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

async function applyMyLanguageChange(nextLang) {
  myLang = canonical(nextLang || "tr");
  localStorage.setItem("alltoall_lang", myLang);
  myProfile.me_lang = myLang;

  refreshLangLabels();
  refreshReadyTextsIfIdle();
  rebuildRecognizer();

  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({
        type: "profile_sync",
        from_name: myProfile.from_name,
        from_pic: myProfile.from_pic,
        me_lang: myLang,
        user_id: myProfile.user_id
      }));
      setHelper(micHint, t(myLang, "langUpdated"), "helper-ready");
      bounceToReady(800);
    } catch (e) {
      console.warn("[alltoall lang sync]", e);
    }
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
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

function getVoicePreference() {
  return String(
    localStorage.getItem("tts_voice") ||
    localStorage.getItem("live_interpreter_voice") ||
    "auto"
  ).toLowerCase().trim();
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

async function warmAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }
    }
  } catch (e) {
    console.warn("[alltoall warmAudio]", e);
  }

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      voicesReady = true;
    }
  } catch {}
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
    } catch (e) {
      console.warn("[alltoall NativeTTS fallback]", e);
    }
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
    } catch (e) {
      console.warn("[alltoall speech fallback]", e);
    }
  }, 80);
}

async function speak(text, langCode) {
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
    } catch (e) {
      console.warn("[alltoall clone fallback]", e);
      speakFallback(value, langCode);
      return;
    }
  }

  try {
    await speakViaApi(value, langCode);
  } catch (e) {
    console.warn("[alltoall TTS fallback]", e);
    speakFallback(value, langCode);
  }
}

/* =========================
   PEOPLE / PROFILE
========================= */
function personKey(person) {
  return String(
    person?.from ||
    person?.user_id ||
    person?.role ||
    person?.from_name ||
    Math.random().toString(36).slice(2)
  );
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
      img.alt = person.from_name || t(myLang, "participant");
      img.referrerPolicy = "no-referrer";
      avatar.appendChild(img);
    } else {
      avatar.textContent = getInitials(person.from_name || t(myLang, "participant"));
    }

    const label = document.createElement("div");
    label.className = "pName";
    label.textContent = compactDisplayName(person.from_name || t(myLang, "participant"));

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
        from_name: person?.from_name || t(myLang, "participant"),
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
    from_name: person?.from_name || t(myLang, "participant"),
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
      removedName = compactDisplayName(v.from_name || person.from_name || t(myLang, "participant"));
      joinedPeople.delete(k);
    }
  }

  renderPeople();

  if (removedName) {
    addSystemMessage(tf(myLang, "peerLeftNamed", { name: removedName }));
  }
}

async function hydrateMyProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    myProfile = {
      from: user?.id || user?.email || `${role}-${Math.random().toString(36).slice(2, 10)}`,
      from_name:
        user?.user_metadata?.display_name ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        user?.email?.split("@")[0] ||
        (role === "host" ? "Host" : "Guest"),
      from_pic:
        user?.user_metadata?.picture ||
        user?.user_metadata?.avatar_url ||
        user?.user_metadata?.avatar ||
        "",
      me_lang: myLang,
      role,
      user_id: user?.id || "",
    };
  } catch (e) {
    console.warn("[alltoall hydrate profile]", e);
  }
}

/* =========================
   CHAT
========================= */
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
    await speak(text, langCode);
  });
  return btn;
}

function addMessage({ side = "left", sender = "", text = "", withSpeaker = false, speakLang = "tr", fromLang = "tr" }) {
  const safeText = String(text || "").trim();
  if (!safeText || !chat) return;

  const langMeta = langObj(fromLang);

  const row = document.createElement("div");
  row.className = `msg-row ${side}`;

  const card = document.createElement("div");
  card.className = "msg-card";

  const head = document.createElement("div");
  head.className = "msg-head";

  const nameEl = document.createElement("div");
  nameEl.className = "msg-name";
  nameEl.textContent = compactDisplayName(sender || t(myLang, "participant"));

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

/* =========================
   SOCKET
========================= */
function sendWs(payload) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    } else {
      addSystemMessage(t(myLang, "socketNotReady"));
    }
  } catch (e) {
    console.warn("[alltoall sendWs]", e);
  }
}

async function resolveRoomForGuestByHost() {
  if (!hostCode || role !== "guest") return;

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
  if (roomPill) roomPill.textContent = roomId;
}

function scheduleReconnect() {
  if (manuallyClosed || reconnectTimer) return;

  const delay = Math.min(1500 + (reconnectCount * 1000), 6000);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectCount += 1;
    setErrorUI(t(myLang, "reconnecting"));
    connectSocket();
  }, delay);
}

function connectSocket() {
  if (!roomId) {
    addSystemMessage(t(myLang, "roomMissing"));
    return;
  }

  const wsUrl = `${WS_BASE}/${encodeURIComponent(roomId)}`;

  try {
    ws = new WebSocket(wsUrl);
  } catch (e) {
    console.error("[alltoall ws create]", e);
    setErrorUI(t(myLang, "wsFailed"));
    scheduleReconnect();
    return;
  }

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

    setSystemReadyUI();
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
        if (roomPill) roomPill.textContent = roomId;

        ensureSelfInPeople();
        addSystemMessage(t(myLang, "roomCreated"));
        setSystemReadyUI();
        return;
      }

      if (type === "presence") {
        applyRoster(data.roster || []);
        return;
      }

      if (type === "peer_joined") {
        if (data.peer) upsertPerson(data.peer);
        if (Array.isArray(data.roster)) applyRoster(data.roster);
        addSystemMessage(t(myLang, "peerJoined"));
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
        const senderName = String(data.from_name || t(myLang, "participant")).trim();
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

        await speak(finalText, myLang);
        setSystemReadyUI();
        return;
      }

      if (type === "room_not_found") {
        addSystemMessage(t(myLang, "roomNotCreated"));
        return;
      }

      if (type === "error") {
        const msg = String(data.message || "");
        if (msg === "HOST_NOT_READY") {
          addSystemMessage(t(myLang, "hostNotReady"));
        } else {
          addSystemMessage(msg || t(myLang, "connectionError"));
        }
      }
    } catch (e) {
      console.warn("[alltoall ws parse]", e);
    }
  };

  ws.onerror = () => {
    wsReady = false;
    addSystemMessage(t(myLang, "connectionError"));
  };

  ws.onclose = () => {
    wsReady = false;
    if (!manuallyClosed) {
      addSystemMessage(t(myLang, "connectionClosed"));
      scheduleReconnect();
    }
  };
}

/* =========================
   SEND / DUPLICATE GUARD
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
    setErrorUI(t(myLang, "wsFailed"));
    bounceToReady(1200);
    return;
  }

  try {
    ws.send(JSON.stringify({
      type: "message",
      text,
      lang: canonical(myLang)
    }));
  } catch (e) {
    console.error("[alltoall ws send]", e);
    setErrorUI(t(myLang, "wsFailed"));
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
    setErrorUI(t(myLang, "micFailed"));
    bounceToReady(1000);
    return;
  }

  if (shouldIgnoreDuplicateLocal(cleaned)) return;

  addMessage({
    side: "right",
    sender: myProfile.from_name,
    text: cleaned,
    withSpeaker: false,
    speakLang: myLang,
    fromLang: myLang
  });

  setTranslatingUI();
  sendTextMessage(cleaned);
  bounceToReady(1000);
}

function startRecording() {
  const rec = buildRecognizer(myLang);

  if (!rec) {
    setErrorUI(t(myLang, "speechUnsupported"));
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
    console.warn("[alltoall speech error]", e);

    if (String(e?.error || "").includes("not-allowed")) {
      setErrorUI(t(myLang, "micBlocked"));
      bounceToReady(1600);
      return;
    }

    const fallback = await speechToTextFallback();
    if (fallback) {
      await finalizeRecognition(fallback);
    } else {
      setErrorUI(t(myLang, "micFailed"));
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
    console.warn("[alltoall rec.start error]", e);
    recognizer = null;
    recordingSide = null;
    setErrorUI(t(myLang, "micFailed"));
    bounceToReady(1200);
  }
}

async function toggleRecording() {
  await ensureReady();

  try {
    await warmAudio();
  } catch {}

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
   BOOT / READY
========================= */
async function warmApis() {
  await Promise.allSettled([
    fetch(`${API_BASE}/healthz`).catch(() => {}),
  ]);
}

function unlockOnFirstTouch() {
  const once = async () => {
    try {
      await warmAudio();
      await prepareEnhancedMic();
    } catch {}
    window.removeEventListener("touchstart", once);
    window.removeEventListener("pointerdown", once);
    window.removeEventListener("click", once);
  };

  window.addEventListener("touchstart", once, { passive: true });
  window.addEventListener("pointerdown", once, { passive: true });
  window.addEventListener("click", once, { passive: true });
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

function startBoot() {
  if (bootStarted) return bootPromise;
  bootStarted = true;

  bootPromise = (async () => {
    setSystemPreparingUI();
    refreshLangLabels();

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

/* =========================
   EVENTS
========================= */
function bind() {
  refreshLangLabels();
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

  const openLang = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openLangSheet();
  };

  ["click", "touchend", "pointerup"].forEach((evt) => {
    langPickerBtn?.addEventListener(evt, openLang, { passive: false });
  });

  const closeLang = (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeLangSheet();
  };

  ["click", "touchend", "pointerup"].forEach((evt) => {
    langSheetClose?.addEventListener(evt, closeLang, { passive: false });
    langSheetBackdrop?.addEventListener(evt, closeLang, { passive: false });
  });

  document.addEventListener("click", (e) => {
    const inside = langSheet && langSheet.contains(e.target);
    const isBtn = e.target?.closest?.("#langPickerBtn");
    if (!inside && !isBtn) closeLangSheet();
  }, { capture: true });

  roomPill?.addEventListener("click", async () => {
    const code = roomId || hostCode || "------";
    if (!code || code === "------") return;
    try {
      await navigator.clipboard.writeText(code);
      addSystemMessage(`${t(myLang, "roomCopied")}: ${code}`);
    } catch {}
  });

  const micHandler = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleRecording();
  };

  ["click", "touchend", "pointerup"].forEach((evt) => {
    micBtn?.addEventListener(evt, micHandler, { passive: false });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLangSheet();

    if ((e.key === "Enter" || e.key === " ") && document.activeElement === micBtn) {
      e.preventDefault();
      toggleRecording();
    }
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", fixLayout);
    window.visualViewport.addEventListener("scroll", fixLayout);
  }

  window.addEventListener("resize", fixLayout);
  window.addEventListener("orientationchange", fixLayout);
  window.addEventListener("focus", () => {
    siteLang = getSiteLang();
    LANGS = buildLangPoolForSite(siteLang);
    buildLanguageSelect();
    refreshLangLabels();
    renderLangSheet();
    renderPeople();
    fixLayout();
  });

  setTimeout(patchShell, 50);
  setTimeout(patchShell, 250);
  setTimeout(patchShell, 700);
}

/* =========================
   MAIN INIT
========================= */
async function init() {
  siteLang = getSiteLang();
  LANGS = buildLangPoolForSite(siteLang);

  buildLanguageSelect();
  refreshLangLabels();
  if (langSheetTitle) langSheetTitle.textContent = t(myLang, "selectLanguage");
  if (roomPill) roomPill.textContent = roomId || hostCode || "------";
  fixLayout();

  await hydrateMyProfile();
  ensureSelfInPeople();

  rebuildRecognizer();
  bind();

  try {
    if (role === "guest" && !roomId && hostCode) {
      await resolveRoomForGuestByHost();
      if (roomPill) roomPill.textContent = roomId || hostCode || "------";
    }
  } catch (e) {
    console.error("[alltoall resolve guest room]", e);
    addSystemMessage(t(myLang, "roomNotCreated"));
    return;
  }

  connectSocket();
}

init();

window.addEventListener("beforeunload", () => {
  manuallyClosed = true;
  stopAudio();
  stopRecognizer();
  try { ws?.close?.(); } catch {}
  try { preparedStream?.getTracks?.().forEach((t) => t.stop()); } catch {}
});
