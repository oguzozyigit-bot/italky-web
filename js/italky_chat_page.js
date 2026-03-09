// FILE: /js/italky_chat_page.js

import { speakText } from "/js/tts_router.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const chat = $("chat");
const msgInput = $("msgInput");
const sendBtn = $("sendBtn");
const micBtn = $("micBtn");
const clearChat = $("clearChat");
const backBtn = $("backBtn");
const logoHome = $("logoHome");

let chatHistory = [];
let isSending = false;
let recognition = null;
let isListening = false;

async function mountShellSafe() {
  try {
    const shell = await import("/js/ui_shell.js");
    if (typeof shell.mountShell === "function") {
      try {
        shell.mountShell({ scroll: "none" });
      } catch (e) {
        console.warn("[chat mountShell]", e);
      }
    }
  } catch (e) {
    console.warn("[chat ui_shell optional]", e);
  }
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

function createSpeakerButton(text) {
  const spk = document.createElement("div");
  spk.className = "spk-icon";
  spk.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M3 10v4h4l5 4V6L7 10H3"></path>
      <path d="M16 8a4 4 0 0 1 0 8"></path>
      <path d="M19 5a8 8 0 0 1 0 14"></path>
    </svg>
  `;
  spk.addEventListener("click", async () => {
    try {
      await speakText(text, "chat");
    } catch (e) {
      console.error("[speaker replay]", e);
    }
  });
  return spk;
}

function addBubble(type, text, options = {}) {
  if (!chat) return;

  const bubble = document.createElement("div");
  bubble.className = `bubble ${type}`;

  if (type === "bot") {
    const row = document.createElement("div");
    row.className = "bubble-row";

    const txt = document.createElement("div");
    txt.className = "txt";
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
    setTimeout(async () => {
      try {
        await speakText(String(text || "").trim(), "chat");
      } catch (e) {
        console.error("[autoplay chat tts]", e);
      }
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
  setListening(false);

  try {
    const reply = await askGemini(text);

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
  await mountShellSafe();

  backBtn?.addEventListener("click", () => history.back());
  logoHome?.addEventListener("click", () => location.href = "/pages/home.html");

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
      if (isListening) recognition.stop();
      else recognition.start();
    } catch (e) {
      console.warn("[stt start/stop]", e);
    }
  });

  autoResize();
  addMeta("Sohbet AI hazır. Mesaj yazabilir veya mikrofonu kullanabilirsin.");
}

bind();
