// FILE: /js/interpreter_live.js

import { LANG_POOL } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com";
const WS_BASE = "wss://italky-api.onrender.com/api/ws/interpreter";

const $ = (id) => document.getElementById(id);

const chat = $("chat");
const msgInput = $("msgInput");
const sendBtn = $("sendBtn");
const micBtn = $("micBtn");
const backBtn = $("backBtn");
const logoHome = $("logoHome");
const helperText = $("helperText");
const langPair = $("langPair");
const liveText = $("liveText");

let recognizer = null;
let isListening = false;
let ttsDebounceAt = 0;
let socket = null;
let reconnectTimer = null;
let reconnectCount = 0;

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
  return String(code || "").toLowerCase().trim();
}

function getParams() {
  const u = new URL(location.href);
  return {
    room: (u.searchParams.get("room") || "").trim(),
    my: canonical(u.searchParams.get("my") || "tr"),
    peer: canonical(u.searchParams.get("peer") || "en"),
    role: (u.searchParams.get("role") || "host").trim().toLowerCase(),
  };
}

function getLangMeta(code) {
  const c = canonical(code);
  const item = (Array.isArray(LANG_POOL) ? LANG_POOL : []).find(
    (x) => canonical(x.code) === c
  );
  return {
    code: c,
    flag: item?.flag || "🌐",
    name: item?.name || c.toUpperCase(),
    bcp: BCP[c] || "en-US",
  };
}

function setTopInfo() {
  const p = getParams();
  const my = getLangMeta(p.my);
  const peer = getLangMeta(p.peer);
  langPair.textContent = `${my.flag} ${my.name} → ${peer.flag} ${peer.name}`;
  setState("ready", "Bağlantı kuruluyor...");
}

function setState(type, text) {
  liveText.textContent =
    type === "ready"
      ? "Hazır"
      : type === "listening"
      ? "Dinleniyor"
      : type === "translating"
      ? "Çevriliyor"
      : type === "offline"
      ? "Bağlantı Yok"
      : "Uyarı";

  helperText.textContent = text || "";
  micBtn.classList.toggle("listening", type === "listening");
}

function stopAudio() {
  try {
    window.speechSynthesis?.cancel?.();
  } catch {}
  try {
    window.NativeTTS?.stop?.();
  } catch {}
}

function speak(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return;

  const now = Date.now();
  if (now - ttsDebounceAt < 250) stopAudio();
  ttsDebounceAt = now;

  stopAudio();

  const c = canonical(langCode);

  if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
    try {
      window.NativeTTS.speak(value, c);
      return;
    } catch {}
  }

  if (!window.speechSynthesis) return;

  const meta = getLangMeta(c);
  const u = new SpeechSynthesisUtterance(value);
  u.lang = meta.bcp;
  u.pitch = 1.0;

  if (c === "en") u.rate = 0.82;
  else if (c === "de" || c === "fr" || c === "it" || c === "es") u.rate = 0.88;
  else u.rate = 0.92;

  u.volume = 1;

  setTimeout(() => {
    try {
      window.speechSynthesis.speak(u);
    } catch {}
  }, 60);
}

function keepLatestVisible() {
  const apply = () => {
    try {
      chat.scrollTop = chat.scrollHeight + 9999;
    } catch {}
  };
  apply();
  requestAnimationFrame(apply);
  setTimeout(apply, 30);
  setTimeout(apply, 120);
}

function clearLatestBot() {
  chat.querySelectorAll(".bubble.bot.latest-bot").forEach((el) => {
    el.classList.remove("latest-bot");
  });
}

function addMeta(text) {
  const row = document.createElement("div");
  row.className = "bubble meta";

  const inner = document.createElement("div");
  inner.className = "bubble-inner";
  inner.textContent = text;

  row.appendChild(inner);
  chat.appendChild(row);
  keepLatestVisible();
}

function addUserBubble(text) {
  const row = document.createElement("div");
  row.className = "bubble user";

  const inner = document.createElement("div");
  inner.className = "bubble-inner";

  const block = document.createElement("div");
  block.className = "text-block user-text";
  block.textContent = String(text || "").trim();

  inner.appendChild(block);
  row.appendChild(inner);
  chat.appendChild(row);
  keepLatestVisible();
}

function addBotBubble(originalText, translatedText, speakLang) {
  const row = document.createElement("div");
  row.className = "bubble bot latest-bot";

  const inner = document.createElement("div");
  inner.className = "bubble-inner";

  const spk = document.createElement("button");
  spk.type = "button";
  spk.className = "spk-btn";
  spk.setAttribute("aria-label", "Tekrar dinle");
  spk.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M3 10v4h4l5 4V6L7 10H3"></path>
      <path d="M16 8a4 4 0 0 1 0 8"></path>
      <path d="M19 5a8 8 0 0 1 0 14"></path>
    </svg>
  `;

  const block = document.createElement("div");
  block.className = "text-block";

  const original = document.createElement("span");
  original.className = "original-text";
  original.textContent = originalText ? `Orijinal: ${originalText}` : "";

  const translated = document.createElement("div");
  translated.className = "translated-text";
  translated.textContent = translatedText || "";

  if (originalText) block.appendChild(original);
  block.appendChild(translated);

  spk.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    speak(translated.textContent || "", speakLang);
  });

  inner.appendChild(spk);
  inner.appendChild(block);
  row.appendChild(inner);
  chat.appendChild(row);
  keepLatestVisible();

  return { row, translated, original };
}

function buildRecognizer(langCode) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = getLangMeta(langCode).bcp;
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  return rec;
}

function stopRecognizer() {
  if (recognizer) {
    try {
      recognizer.stop();
    } catch {}
    recognizer = null;
  }
}

function connectSocket() {
  const p = getParams();

  if (!p.room) {
    setState("warn", "Oda bilgisi bulunamadı.");
    addMeta("Oda bilgisi eksik. Lütfen QR ile tekrar bağlanın.");
    return;
  }

  clearTimeout(reconnectTimer);

  const url =
    `${WS_BASE}/${encodeURIComponent(p.room)}` +
    `?role=${encodeURIComponent(p.role)}` +
    `&lang=${encodeURIComponent(p.my)}`;

  try {
    socket = new WebSocket(url);
  } catch {
    setState("offline", "Bağlantı kurulamadı.");
    scheduleReconnect();
    return;
  }

  socket.onopen = () => {
    reconnectCount = 0;
    setState("ready", "Bağlantı aktif. Yazabilir veya konuşabilirsiniz.");
    addMeta("Interpreter odasına bağlandınız.");
  };

  socket.onclose = () => {
    setState("offline", "Bağlantı koptu. Yeniden bağlanılıyor...");
    scheduleReconnect();
  };

  socket.onerror = () => {
    setState("offline", "Bağlantı hatası.");
  };

  socket.onmessage = (evt) => {
    try {
      const data = JSON.parse(evt.data || "{}");
      const me = getParams().role;

      if (data.type === "presence") {
        setState("ready", "Bağlantı aktif. Yazabilir veya konuşabilirsiniz.");
        return;
      }

      if (data.type === "peer_joined") {
        addMeta("Karşı taraf bağlandı.");
        return;
      }

      if (data.type === "peer_left") {
        addMeta("Karşı taraf odadan çıktı.");
        return;
      }

      if (data.type === "typing") {
        if (data.sender !== me) {
          setState("ready", "Karşı taraf yazıyor...");
          setTimeout(() => {
            if (socket?.readyState === 1) {
              setState("ready", "Bağlantı aktif. Yazabilir veya konuşabilirsiniz.");
            }
          }, 900);
        }
        return;
      }

      if (data.type === "translated_message") {
        if (data.sender === me) return;

        clearLatestBot();
        addBotBubble(
          data.original_text || "",
          data.translated_text || "",
          getParams().my
        );
        speak(data.translated_text || "", getParams().my);
        setState("ready", "Yeni çeviri geldi.");
        return;
      }

      if (data.type === "error") {
        addMeta(`Hata: ${data.message || "Bilinmeyen hata"}`);
        return;
      }
    } catch {}
  };
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectCount += 1;

  const wait = Math.min(1500 * reconnectCount, 7000);

  reconnectTimer = setTimeout(() => {
    connectSocket();
  }, wait);
}

function sendSocketText(text) {
  if (!socket || socket.readyState !== 1) return false;

  const p = getParams();

  socket.send(
    JSON.stringify({
      type: "text_message",
      text,
      from_lang: p.my,
      to_lang: p.peer,
    })
  );

  return true;
}

function sendTyping() {
  if (!socket || socket.readyState !== 1) return;

  try {
    socket.send(JSON.stringify({ type: "typing" }));
  } catch {}
}

async function processMessage(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return;

  addUserBubble(text);
  setState("translating", "Mesaj gönderiliyor ve çevriliyor...");

  const ok = sendSocketText(text);
  if (!ok) {
    addMeta("Mesaj gönderilemedi. Bağlantı yok.");
    setState("offline", "Bağlantı koptu.");
    return;
  }

  setState("ready", "Bağlantı aktif. Yazabilir veya konuşabilirsiniz.");
}

function startListening() {
  const p = getParams();
  const rec = buildRecognizer(p.my);

  if (!rec) {
    setState("warn", "Bu cihazda konuşma tanıma desteklenmiyor.");
    return;
  }

  recognizer = rec;
  isListening = true;
  setState("listening", "Konuşun. Bitince tekrar mikrofona dokunun.");

  rec.onresult = (e) => {
    const heard = e.results?.[0]?.[0]?.transcript || "";
    Promise.resolve().then(() => processMessage(heard));
  };

  rec.onerror = () => {
    recognizer = null;
    isListening = false;
    micBtn.classList.remove("listening");
    setState("warn", "Konuşma alınamadı. Tekrar deneyin.");
    setTimeout(() => {
      if (socket?.readyState === 1) {
        setState("ready", "Bağlantı aktif. Yazabilir veya konuşabilirsiniz.");
      }
    }, 1500);
  };

  rec.onend = () => {
    recognizer = null;
    isListening = false;
    micBtn.classList.remove("listening");
  };

  try {
    rec.start();
  } catch {
    recognizer = null;
    isListening = false;
    setState("warn", "Mikrofon başlatılamadı.");
  }
}

function toggleListening() {
  if (isListening) {
    stopRecognizer();
    isListening = false;
    micBtn.classList.remove("listening");
    setState("translating", "Ses işleniyor...");
    return;
  }
  startListening();
}

async function sendTypedMessage() {
  const text = msgInput.value.trim();
  if (!text) return;
  msgInput.value = "";
  autoGrowTextarea();
  await processMessage(text);
}

function autoGrowTextarea() {
  msgInput.style.height = "auto";
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + "px";
}

function goBack() {
  history.back();
}

backBtn?.addEventListener("click", goBack);
logoHome?.addEventListener("click", () => {
  location.href = "/pages/home.html";
});

micBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  toggleListening();
});

sendBtn?.addEventListener("click", sendTypedMessage);

msgInput?.addEventListener("input", () => {
  autoGrowTextarea();
  sendTyping();
});

msgInput?.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    await sendTypedMessage();
  }
});

setTopInfo();
autoGrowTextarea();
connectSocket();
