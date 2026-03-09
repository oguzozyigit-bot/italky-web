import { mountShell } from "/js/ui_shell.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const chat = $("chat");
const msgInput = $("msgInput");
const sendBtn = $("sendBtn");
const micBtn = $("micBtn");
const clearChat = $("clearChat");
const muteBtn = $("muteBtn");
const muteIcon = $("muteIcon");

let chatHistory = [];
let isSending = false;
let recognition = null;
let isListening = false;
let currentAudio = null;

const MUTE_KEY = "friend_ai_muted";
const CHAT_VOICE_KEY = "chat_ai_voice";

function getMuted() {
  return localStorage.getItem(MUTE_KEY) === "1";
}

function setMuted(value) {
  localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  refreshMuteUI();
}

function refreshMuteUI() {
  const muted = getMuted();
  muteBtn?.classList.toggle("muted", muted);
  if (!muteIcon) return;

  muteIcon.innerHTML = muted
    ? `
      <path d="M11 5L6 9H3v6h3l5 4z"></path>
      <line x1="23" y1="9" x2="17" y2="15"></line>
      <line x1="17" y1="9" x2="23" y2="15"></line>
    `
    : `
      <path d="M3 10v4h4l5 4V6L7 10H3"></path>
      <path d="M16 8a4 4 0 0 1 0 8"></path>
      <path d="M19 5a8 8 0 0 1 0 14"></path>
    `;
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

function normalizeFriendReply(text) {
  let out = String(text || "").trim();

  const lower = out.toLowerCase();

  const identityTriggers = [
    "openai",
    "gemini",
    "google tarafından",
    "google tarafından geliştirildim",
    "i was created by google",
    "created by google",
    "created by openai",
    "i was created by openai",
    "ben gemini",
    "ben openai",
    "i am gemini",
    "i am chatgpt",
    "i'm gemini",
    "i'm chatgpt",
    "large language model",
    "language model"
  ];

  if (identityTriggers.some((x) => lower.includes(x))) {
    return "Ben italky Teknoloji tarafından geliştirildim. Ben Friend AI, italkyAI ekosisteminin akıllı sohbet asistanıyım.";
  }

  return out;
}

function isBrandIdentityQuestion(text) {
  const q = String(text || "").toLowerCase();

  return [
    "sen kimsin",
    "seni kim yaptı",
    "seni kim geliştirdi",
    "seni kim oluşturdu",
    "hangi firmasın",
    "hangi şirket",
    "sen gemini misin",
    "sen openai misin",
    "sen chatgpt misin",
    "kimin yapay zekasısın",
    "who made you",
    "who created you",
    "who developed you",
    "are you gemini",
    "are you openai",
    "are you chatgpt"
  ].some((x) => q.includes(x));
}

function createSpeakerButton(text) {
  const spk = document.createElement("button");
  spk.type = "button";
  spk.className = "spkIcon";
  spk.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M3 10v4h4l5 4V6L7 10H3"></path>
      <path d="M16 8a4 4 0 0 1 0 8"></path>
      <path d="M19 5a8 8 0 0 1 0 14"></path>
    </svg>
  `;
  spk.addEventListener("click", async () => {
    await speakFriend(text);
  });
  return spk;
}

function addBubble(type, text, options = {}) {
  if (!chat) return;

  const bubble = document.createElement("div");
  bubble.className = `bubble ${type}`;

  if (type === "bot") {
    const row = document.createElement("div");
    row.className = "bubbleRow";

    const txt = document.createElement("div");
    txt.className = "bubbleText";
    txt.textContent = String(text || "").trim();

    row.appendChild(txt);
    row.appendChild(createSpeakerButton(String(text || "").trim()));
    bubble.appendChild(row);
  } else {
    bubble.textContent = String(text || "").trim();
  }

  chat.appendChild(bubble);
  scrollBottom();

  if (type === "bot" && options.autoplay) {
    setTimeout(() => {
      speakFriend(String(text || "").trim());
    }, 120);
  }
}

function addMeta(text) {
  if (!chat) return;
  const el = document.createElement("div");
  el.className = "bubble meta";
  el.textContent = String(text || "").trim();
  chat.appendChild(el);
  scrollBottom();
}

function setListening(on) {
  if (!micBtn || !msgInput) return;

  isListening = !!on;
  micBtn.classList.toggle("listening", isListening);

  if (isListening) {
    msgInput.dataset.__oldph = msgInput.getAttribute("placeholder") || "";
    msgInput.setAttribute("placeholder", "Dinliyorum...");
  } else {
    const old = msgInput.dataset.__oldph || "Yaz ya da konuş...";
    msgInput.setAttribute("placeholder", old);
  }
}

function getChatVoicePreference() {
  return localStorage.getItem(CHAT_VOICE_KEY)
    || localStorage.getItem("chat_voice")
    || localStorage.getItem("tts_voice")
    || "auto";
}

async function getCurrentUserId() {
  try {
    const supa = await import("/js/supabase_client.js");
    const { data } = await supa.supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

function stopCurrentAudio() {
  try {
    currentAudio?.pause?.();
    currentAudio = null;
  } catch {}
  try {
    window.speechSynthesis?.cancel?.();
  } catch {}
}

function base64ToBlob(base64, mime = "audio/mpeg") {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  return new Blob([new Uint8Array(byteNumbers)], { type: mime });
}

async function speakFriend(text) {
  const value = String(text || "").trim();
  if (!value || getMuted()) return;

  stopCurrentAudio();

  try {
    const userId = await getCurrentUserId();

    const r = await fetch(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: value,
        lang: "tr",
        user_id: userId,
        module: "chat",
        voice: getChatVoicePreference()
      })
    });

    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.ok || !j?.audio_base64) {
      throw new Error(j?.detail || j?.error || "TTS unavailable");
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
  } catch (e) {
    console.warn("[friend tts fallback]", e);
    try {
      const u = new SpeechSynthesisUtterance(value);
      u.lang = "tr-TR";
      u.rate = 0.95;
      u.pitch = 1.0;
      window.speechSynthesis.speak(u);
    } catch {}
  }
}

async function askFriendAI(message) {
  if (isBrandIdentityQuestion(message)) {
    return "Ben italky Teknoloji tarafından geliştirildim. Ben Friend AI, italkyAI ekosisteminin akıllı sohbet asistanıyım.";
  }

  const payload = {
    message,
    history: chatHistory.slice(-12)
  };

  const r = await fetch(`${API_BASE}/api/chat_ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const raw = await r.text();
  let data = {};
  try { data = JSON.parse(raw); } catch {}

  if (!r.ok) {
    const msg = String(data?.detail || raw || "Friend AI hatası");

    if (msg.toLowerCase().includes("404 models/")) {
      throw new Error("Friend AI şu anda hazırlanıyor. Model ayarı güncelleniyor, birazdan tekrar deneyin.");
    }

    throw new Error(msg);
  }

  return normalizeFriendReply(String(data?.reply || "").trim());
}

async function sendMessage() {
  if (isSending) return;

  const text = String(msgInput?.value || "").trim();
  if (!text) return;

  isSending = true;

  addBubble("user", text);
  chatHistory.push({ role: "user", text });

  msgInput.value = "";
  autoResize();
  setListening(false);

  try {
    const reply = await askFriendAI(text);
    addBubble("bot", reply, { autoplay: true });
    chatHistory.push({ role: "assistant", text: reply });
  } catch (e) {
    console.error(e);
    addMeta(e?.message || "Bir hata oluştu.");
  } finally {
    isSending = false;
  }
}

function initSTT() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = "tr-TR";
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => setListening(true);

  rec.onresult = (e) => {
    const text = e.results?.[0]?.[0]?.transcript || "";
    if (msgInput) {
      msgInput.value = text;
      autoResize();
    }
  };

  rec.onerror = () => setListening(false);
  rec.onend = () => setListening(false);

  return rec;
}

async function bind() {
  try {
    mountShell({ scroll: "none" });
  } catch (e) {
    console.warn("[friend shell]", e);
  }

  refreshMuteUI();

  clearChat?.addEventListener("click", () => {
    if (chat) chat.innerHTML = "";
    chatHistory = [];
    stopCurrentAudio();
    addMeta("Sohbet temizlendi.");
  });

  muteBtn?.addEventListener("click", () => {
    setMuted(!getMuted());
    if (getMuted()) stopCurrentAudio();
  });

  msgInput?.addEventListener("input", autoResize);

  msgInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn?.addEventListener("click", sendMessage);

  recognition = initSTT();

  micBtn?.addEventListener("click", () => {
    if (!recognition) {
      addMeta("Bu cihazda sesli yazma desteklenmiyor.");
      return;
    }

    try {
      if (isListening) recognition.stop();
      else recognition.start();
    } catch (e) {
      console.warn("[stt]", e);
    }
  });

  autoResize();
  addMeta("Friend AI hazır. Mesaj yazabilir veya mikrofonu kullanabilirsin.");
}

bind();
