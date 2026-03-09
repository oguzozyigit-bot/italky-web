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
let currentUserName = "arkadaşım";

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

function normalizeChatVoice(value) {
  const v = String(value || "").trim().toLowerCase();

  if (["auto", "otomatik", "automatic"].includes(v)) return "auto";
  if (["male", "erkek", "erkek sesi", "man"].includes(v)) return "male";
  if (["female", "kadın", "kadin", "kadın sesi", "kadin sesi", "woman"].includes(v)) return "female";
  if (["own", "benim sesim", "benimsesim", "myvoice"].includes(v)) return "own";
  if (["ai_custom", "ai sesi", "sohbet ai sesi", "ozel ses", "özel ses", "custom"].includes(v)) return "ai_custom";

  return "auto";
}

function getChatVoicePreference() {
  return normalizeChatVoice(
    localStorage.getItem(CHAT_VOICE_KEY) ||
    localStorage.getItem("chat_voice") ||
    localStorage.getItem("tts_voice") ||
    "auto"
  );
}

function sanitizeForTTS(text) {
  let s = String(text || "").trim();
  if (!s) return "";

  // markdown temizle
  s = s.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/\*\*(.*?)\*\*/g, "$1");
  s = s.replace(/\*(.*?)\*/g, "$1");
  s = s.replace(/__(.*?)__/g, "$1");
  s = s.replace(/_(.*?)_/g, "$1");
  s = s.replace(/~~(.*?)~~/g, "$1");
  s = s.replace(/\[(.*?)\]\((.*?)\)/g, "$1");

  // emoji ve sembolleri büyük ölçüde temizle
  s = s.replace(/[\u{1F300}-\u{1FAFF}]/gu, " ");
  s = s.replace(/[\u{2600}-\u{27BF}]/gu, " ");

  // gereksiz simgeler
  s = s.replace(/[#^~|<>{}\[\]\\/@+=_%$`]/g, " ");
  s = s.replace(/[•▪️◾◽◆◇■□▲△▼▽★☆]/g, " ");

  // birden fazla noktalama sadeleştir
  s = s.replace(/([!?.,:;]){2,}/g, "$1");
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

function normalizeFriendReply(text) {
  let out = String(text || "").trim();

  const lower = out.toLowerCase();

  const identityTriggers = [
    "openai",
    "gemini",
    "google tarafından",
    "google tarafından geliştirildim",
    "created by google",
    "created by openai",
    "i am gemini",
    "i'm gemini",
    "i am chatgpt",
    "i'm chatgpt",
    "large language model",
    "language model"
  ];

  if (identityTriggers.some((x) => lower.includes(x))) {
    return "Ben italky Teknoloji tarafından geliştirildim. Ben Friend AI, italkyAI ekosisteminin samimi sohbet asistanıyım.";
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

async function getCurrentUserId() {
  try {
    const supa = await import("/js/supabase_client.js");
    const { data } = await supa.supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

async function loadFriendlyUserName() {
  try {
    const hitap =
      localStorage.getItem("kaynana_hitap") ||
      localStorage.getItem("user_hitap") ||
      localStorage.getItem("profile_hitap");

    if (hitap && String(hitap).trim()) {
      currentUserName = String(hitap).trim();
      return;
    }

    const supa = await import("/js/supabase_client.js");
    const { data } = await supa.supabase.auth.getUser();
    const user = data?.user;

    const metaName =
      user?.user_metadata?.hitap ||
      user?.user_metadata?.name ||
      user?.user_metadata?.full_name ||
      user?.email?.split("@")?.[0];

    if (metaName && String(metaName).trim()) {
      currentUserName = String(metaName).trim().split(" ")[0];
    }
  } catch {}
}

function buildHiddenMemory() {
  return [
    {
      role: "assistant",
      text: `Sen Friend AI'sın. Samimi, sıcak, doğal ve kısa-orta uzunlukta konuş. Gereksiz resmi olma. Emoji kullanma. Markdown kullanma. Yıldız, hashtag, madde imi, özel semboller kullanma. Kullanıcıya uygun olduğunda adıyla hitap et. Kullanıcının adı: ${currentUserName}. Kim geliştirdi sorulursa: 'Ben italky Teknoloji tarafından geliştirildim.' de. OpenAI, Gemini, ChatGPT veya Google kimliği sahiplenme.`
    }
  ];
}

function resetChatMemory() {
  chatHistory = buildHiddenMemory();
}

async function speakFriend(text) {
  const clean = sanitizeForTTS(text);
  if (!clean || getMuted()) return;

  stopCurrentAudio();

  try {
    const userId = await getCurrentUserId();

    const r = await fetch(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: clean,
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
      const u = new SpeechSynthesisUtterance(clean);
      u.lang = "tr-TR";
      u.rate = 0.95;
      u.pitch = 1.0;
      window.speechSynthesis.speak(u);
    } catch {}
  }
}

async function askFriendAI(message) {
  if (isBrandIdentityQuestion(message)) {
    return "Ben italky Teknoloji tarafından geliştirildim. Ben Friend AI, italkyAI ekosisteminin samimi sohbet asistanıyım.";
  }

  const payload = {
    message,
    history: chatHistory.slice(-14)
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

  await loadFriendlyUserName();
  resetChatMemory();
  refreshMuteUI();

  clearChat?.addEventListener("click", () => {
    if (chat) chat.innerHTML = "";
    stopCurrentAudio();
    resetChatMemory();
    addMeta(`${currentUserName}, sohbet temizlendi. Kaldığımız tonda devam edebiliriz.`);
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
  addMeta(`Merhaba ${currentUserName}. Friend AI hazır, yazabilir ya da konuşabilirsin.`);
}

bind();v
