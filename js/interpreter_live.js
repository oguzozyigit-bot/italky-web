import { mountShell } from "/js/ui_shell.js";
import { LANG_POOL } from "/js/lang_pool_full.js";
import { supabase } from "/js/supabase_client.js";

try {
  mountShell({ scroll: "none" });
} catch (e) {
  console.warn("[interpreter live shell]", e);
}

const API_BASE = "https://italky-api.onrender.com";

const $ = (id) => document.getElementById(id);

const chat = $("chat");
const myLang = $("myLang");
const muteBtn = $("muteBtn");
const clearBtn = $("clearBtn");
const leaveBtn = $("leaveBtn");
const peerDot = $("peerDot");
const statusText = $("statusText");
const peerLangText = $("peerLangText");
const msgInput = $("msgInput");
const micBtn = $("micBtn");
const sendBtn = $("sendBtn");
const toastEl = $("toast");

const MY_LANG_KEY = "italky_interpreter_my_lang";
const TTS_VOICE_KEY = "tts_voice";

let roomId = "";
let hostCode = "";
let roomVersion = "1";

let channel = null;
let myUser = null;
let myUserId = "";
let myLangCode = "tr";
let peerLangCode = "";
let peerOnline = false;

let isMuted = false;
let recognition = null;
let isListening = false;

/* ✅ QR'ı okutan ödeyecek */
let payerMode = false;
let payerUserId = "";

function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = String(msg || "");
  toastEl.classList.add("show");
  clearTimeout(window.__liveToastTimer);
  window.__liveToastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 1800);
}

function canonical(code) {
  return String(code || "").toLowerCase().trim();
}

function getParams() {
  const p = new URLSearchParams(location.search);
  return {
    room: String(p.get("room") || "").trim(),
    host: String(p.get("host") || "").trim(),
    version: String(p.get("v") || "1").trim(),
    my: String(p.get("my") || "").trim(),
    payer: String(p.get("payer") || "0").trim()
  };
}

function buildLangOptions() {
  const langs = Array.isArray(LANG_POOL) ? LANG_POOL : [];
  myLang.innerHTML = langs.map((l) => {
    const code = canonical(l.code);
    return `<option value="${code}">${l.flag || "🌐"} ${l.name || code.toUpperCase()}</option>`;
  }).join("");

  const hasSelected = [...myLang.options].some(o => o.value === myLangCode);
  myLang.value = hasSelected ? myLangCode : "tr";
  myLangCode = myLang.value;
}

function autoResize() {
  if (!msgInput) return;
  msgInput.style.height = "auto";
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + "px";
}

function scrollBottom() {
  if (!chat) return;
  requestAnimationFrame(() => {
    chat.scrollTop = chat.scrollHeight;
  });
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function normalizeForTTS(text) {
  return String(text || "")
    .replace(/\*\*/g, " ")
    .replace(/[_#~`]/g, " ")
    .replace(/[^\p{L}\p{N}\p{P}\p{Z}\n]/gu, " ")
    .replace(/\s+/g, " ")
    .replace(/([.,!?;:]){2,}/g, "$1")
    .replace(/\s([.,!?;:])/g, "$1")
    .trim();
}

function createSpeakerButton(text, langCode) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "spkBtn";
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
    await speak(text, langCode, false);
  });
  return btn;
}

function addMeta(text) {
  const el = document.createElement("div");
  el.className = "bubble meta";
  el.textContent = String(text || "").trim();
  chat.appendChild(el);
  scrollBottom();
}

function addBubble({ side = "me", text = "", langCode = "tr", withSpeaker = false, autoSpeak = false }) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${side}`;

  if (withSpeaker) {
    const row = document.createElement("div");
    row.className = "bubbleRow";

    const txt = document.createElement("div");
    txt.className = "bubbleTxt";
    txt.textContent = String(text || "").trim();

    row.appendChild(txt);
    row.appendChild(createSpeakerButton(String(text || "").trim(), langCode));
    bubble.appendChild(row);
  } else {
    bubble.textContent = String(text || "").trim();
  }

  chat.appendChild(bubble);
  scrollBottom();

  if (autoSpeak && !isMuted) {
    setTimeout(() => speak(String(text || "").trim(), langCode, true), 120);
  }
}

async function getCurrentUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
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

function base64ToBlob(base64, mime = "audio/mpeg") {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mime });
}

/* ✅ Ücretsiz ses = sadece çeviri, seslendirme yok */
async function speak(text, langCode, autoplay = true) {
  const cleaned = normalizeForTTS(text);
  if (!cleaned) return;
  if (autoplay && isMuted) return;

  try {
    const voice = localStorage.getItem(TTS_VOICE_KEY) || "auto";

    // ücretsiz ses: sadece çeviri, ses yok
    if (voice === "auto") return;

    const r = await fetch(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: cleaned,
        lang: canonical(langCode),
        user_id: myUserId || null,
        module: "interpreter",
        voice
      })
    });

    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.ok || !j?.audio_base64) return;

    const blob = base64ToBlob(j.audio_base64, "audio/mpeg");
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audio.onended = () => URL.revokeObjectURL(url);
    audio.onerror = () => URL.revokeObjectURL(url);

    await audio.play().catch(() => {});
  } catch (e) {
    console.warn("[interpreter tts]", e);
  }
}

async function sendPayload(event, payload) {
  if (!channel) return;
  try {
    await channel.send({
      type: "broadcast",
      event,
      payload
    });
  } catch (e) {
    console.warn("[broadcast send]", e);
  }
}

function updatePeerState({ online, langCode = "" }) {
  peerOnline = !!online;
  if (langCode) peerLangCode = langCode;

  peerDot.classList.toggle("ok", peerOnline);
  statusText.textContent = peerOnline ? "Karşı taraf bağlı" : "Karşı taraf bekleniyor...";
  peerLangText.textContent = peerLangCode ? `Onun dili: ${peerLangCode.toUpperCase()}` : "—";
}

/* ✅ QR'ı okutan kişiden kontör düş */
async function spendInterpreterUsage(usedChars) {
  const safeChars = Number(usedChars || 0);
  if (!payerMode || !payerUserId || safeChars <= 0) return;

  const r = await fetch(`${API_BASE}/api/interpreter/spend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      payer_user_id: payerUserId,
      used_chars: safeChars
    })
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok) {
    if (r.status === 402) {
      alert("Kontörünüz yetersiz. Jeton Market'e yönlendiriliyorsunuz.");
      location.href = "/pages/jetonbuy.html";
      throw new Error("insufficient_tokens");
    }
    throw new Error(j.detail || "interpreter_spend_failed");
  }

  return j;
}

async function handleIncomingMessage(payload) {
  const srcText = String(payload?.text || "").trim();
  const srcLang = canonical(payload?.lang || "");
  const senderId = String(payload?.user_id || "").trim();

  if (!srcText || !srcLang) return;
  if (senderId === myUserId) return;

  updatePeerState({ online: true, langCode: srcLang });

  const translated = await translateText(srcText, srcLang, myLangCode);
  const finalText = translated || srcText;

  /* ✅ Sadece QR'ı okutan kullanıcı öder */
  try {
    await spendInterpreterUsage(String(finalText || "").length);
  } catch (e) {
    console.warn("[interpreter spend]", e);
    if (String(e?.message || "") === "insufficient_tokens") return;
  }

  addBubble({
    side: "them",
    text: finalText,
    langCode: myLangCode,
    withSpeaker: true,
    autoSpeak: true
  });
}

function buildRecognizer() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = "tr-TR";
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  return rec;
}

function setListening(on) {
  isListening = !!on;
  micBtn.classList.toggle("listening", isListening);
}

function initSTT() {
  recognition = buildRecognizer();
  if (!recognition) return;

  recognition.onstart = () => setListening(true);

  recognition.onresult = (e) => {
    const text = e.results?.[0]?.[0]?.transcript || "";
    if (msgInput) {
      msgInput.value = String(text || "").trim();
      autoResize();
    }
  };

  recognition.onerror = () => setListening(false);
  recognition.onend = () => setListening(false);
}

async function sendMessage() {
  const text = String(msgInput.value || "").trim();
  if (!text) return;

  addBubble({
    side: "me",
    text,
    langCode: myLangCode,
    withSpeaker: false,
    autoSpeak: false
  });

  msgInput.value = "";
  autoResize();

  await sendPayload("message", {
    room: roomId,
    host: hostCode,
    user_id: myUserId,
    text,
    lang: myLangCode,
    sent_at: Date.now()
  });
}

async function joinChannel() {
  channel = supabase.channel(`interpreter-room-${roomId}`, {
    config: {
      broadcast: { self: false }
    }
  });

  channel
    .on("broadcast", { event: "join" }, async ({ payload }) => {
      if (!payload || payload.user_id === myUserId) return;
      updatePeerState({ online: true, langCode: payload.lang });
      addMeta("Karşı taraf bağlandı.");
    })
    .on("broadcast", { event: "lang-update" }, ({ payload }) => {
      if (!payload || payload.user_id === myUserId) return;
      updatePeerState({ online: true, langCode: payload.lang });
      toast(`Karşı taraf dili değiştirdi: ${String(payload.lang || "").toUpperCase()}`);
    })
    .on("broadcast", { event: "message" }, ({ payload }) => {
      handleIncomingMessage(payload);
    })
    .on("broadcast", { event: "leave" }, ({ payload }) => {
      if (!payload || payload.user_id === myUserId) return;
      updatePeerState({ online: false, langCode: "" });
      addMeta("Karşı taraf görüşmeden çıktı. Oda kapanıyor...");
      setTimeout(() => {
        location.href = "/pages/home.html";
      }, 1200);
    });

  channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await sendPayload("join", {
        room: roomId,
        host: hostCode,
        user_id: myUserId,
        lang: myLangCode,
        joined_at: Date.now()
      });
    }
  });
}

async function leaveRoom() {
  try {
    await sendPayload("leave", {
      room: roomId,
      host: hostCode,
      user_id: myUserId,
      left_at: Date.now()
    });
  } catch {}
  try {
    await channel?.unsubscribe();
  } catch {}
  location.href = "/pages/home.html";
}

async function init() {
  const params = getParams();

  if (!params.room || !params.host) {
    toast("Geçersiz oda.");
    setTimeout(() => location.href = "/pages/home.html", 800);
    return;
  }

  roomId = params.room;
  hostCode = params.host;
  roomVersion = params.version;

  myUser = await getCurrentUser();
  myUserId = myUser?.id || `guest-${Math.random().toString(36).slice(2, 10)}`;

  myLangCode = canonical(params.my || localStorage.getItem(MY_LANG_KEY) || "tr");

  /* ✅ QR okutan kullanıcı = payer */
  payerMode = String(params.payer || "0") === "1";
  payerUserId = payerMode ? myUserId : "";

  buildLangOptions();
  initSTT();

  addMeta("Odaya bağlandın. Kendi dilini istersen şimdi veya görüşme sırasında değiştirebilirsin.");

  myLang.addEventListener("change", async () => {
    myLangCode = canonical(myLang.value || "tr");
    localStorage.setItem(MY_LANG_KEY, myLangCode);

    await sendPayload("lang-update", {
      room: roomId,
      host: hostCode,
      user_id: myUserId,
      lang: myLangCode,
      changed_at: Date.now()
    });

    toast(`Dil değişti: ${myLangCode.toUpperCase()}`);
  });

  muteBtn.addEventListener("click", () => {
    isMuted = !isMuted;
    muteBtn.classList.toggle("active", isMuted);
    muteBtn.textContent = isMuted ? "🔈" : "🔇";
    toast(isMuted ? "Ses kapalı" : "Ses açık");
  });

  clearBtn.addEventListener("click", () => {
    chat.innerHTML = "";
    addMeta("Sohbet temizlendi.");
  });

  leaveBtn.addEventListener("click", leaveRoom);

  msgInput.addEventListener("input", autoResize);

  msgInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener("click", sendMessage);

  micBtn.addEventListener("click", () => {
    if (!recognition) {
      toast("Bu cihazda sesli yazma desteklenmiyor.");
      return;
    }
    try {
      if (isListening) recognition.stop();
      else recognition.start();
    } catch (e) {
      console.warn("[stt toggle]", e);
    }
  });

  window.addEventListener("beforeunload", () => {
    try {
      channel?.send({
        type: "broadcast",
        event: "leave",
        payload: {
          room: roomId,
          host: hostCode,
          user_id: myUserId,
          left_at: Date.now()
        }
      });
    } catch {}
  });

  await joinChannel();
  autoResize();
}

init();
