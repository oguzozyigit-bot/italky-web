// FILE: /js/italky_chat_page.js

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const chat = $("chat");
const msgInput = $("msgInput");
const sendBtn = $("sendBtn");
const micBtn = $("micBtn");
const clearChat = $("clearChat");

let chatHistory = [];
let isSending = false;
let recognition = null;
let isListening = false;

function addBubble(type, text) {
  if (!chat) return;

  const el = document.createElement("div");
  el.className = `bubble ${type}`;
  el.textContent = String(text || "").trim();
  chat.appendChild(el);

  requestAnimationFrame(() => {
    chat.scrollTop = chat.scrollHeight;
  });
}

function addMeta(text) {
  if (!chat) return;

  const el = document.createElement("div");
  el.className = "bubble meta";
  el.textContent = String(text || "").trim();
  chat.appendChild(el);

  requestAnimationFrame(() => {
    chat.scrollTop = chat.scrollHeight;
  });
}

function autoResize() {
  if (!msgInput) return;
  msgInput.style.height = "auto";
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + "px";
}

function setListening(on) {
  if (!micBtn || !msgInput) return;

  isListening = !!on;
  micBtn.classList.toggle("listening", isListening);

  if (isListening) {
    msgInput.dataset.__oldph = msgInput.getAttribute("placeholder") || "";
    msgInput.setAttribute("placeholder", "Dinliyorum…");
  } else {
    const old = msgInput.dataset.__oldph || "Yaz ya da konuş…";
    msgInput.setAttribute("placeholder", old);
  }
}

async function askGemini(message) {
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
    throw new Error(data?.detail || raw || "Sohbet AI hatası");
  }

  return String(data?.reply || "").trim();
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

  try {
    const reply = await askGemini(text);

    addBubble("bot", reply);
    chatHistory.push({ role: "assistant", text: reply });

    // Sonra buraya ses bağlarız:
    // import("/js/tts_router.js").then(({ speakText }) => speakText(reply, "chat"));
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

function bind() {
  addMeta("Sohbet AI hazır. Mesaj yazabilir veya mikrofonu kullanabilirsin.");

  clearChat?.addEventListener("click", () => {
    if (chat) chat.innerHTML = "";
    chatHistory = [];
    addMeta("Sohbet temizlendi.");
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
      if (isListening) {
        recognition.stop();
      } else {
        recognition.start();
      }
    } catch (e) {
      console.warn("[stt start/stop]", e);
    }
  });

  autoResize();
}

bind();
