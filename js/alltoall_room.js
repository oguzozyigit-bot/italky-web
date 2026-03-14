// FILE: /js/alltoall_room.js

import { mountShell } from "/js/ui_shell.js";
import { LANG_POOL } from "/js/lang_pool_full.js";

try { mountShell({ scroll: "none" }); } catch (e) {}

const API_BASE = "https://italky-api.onrender.com/api";
const WS_BASE = "wss://italky-api.onrender.com";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);

const roomId = String(params.get("room") || "").trim().toUpperCase();
const role = String(params.get("role") || "guest").trim().toLowerCase();

const roomPill = $("roomPill");
const peopleCount = $("peopleCount");
const peopleScroll = $("peopleScroll");
const chat = $("chat");
const langSelect = $("langSelect");
const msgInput = $("msgInput");
const sendBtn = $("sendBtn");
const micBtn = $("micBtn");
const backBtn = $("backBtn");
const exitBtn = $("exitBtn");

let myLang = localStorage.getItem("alltoall_lang") || "tr";
let ws = null;
let wsReady = false;
let recognizer = null;
let isRecording = false;

const participants = new Map();

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim();
}

function langObj(code) {
  const c = canonical(code);
  const found = (Array.isArray(LANG_POOL) ? LANG_POOL : []).find(
    (x) => canonical(x.code) === c
  );
  return found || { code: c, name: c.toUpperCase(), flag: "🌐" };
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "👤";
  return parts.slice(0, 2).map((x) => x[0]?.toUpperCase() || "").join("");
}

function renderLangs() {
  const langs = (Array.isArray(LANG_POOL) ? LANG_POOL : [])
    .map((l) => ({
      code: canonical(l.code),
      name: l.name || l.code,
      flag: l.flag || "🌐",
    }))
    .filter(Boolean);

  const uniq = [];
  const seen = new Set();

  langs.forEach((l) => {
    if (!l.code || seen.has(l.code)) return;
    seen.add(l.code);
    uniq.push(l);
  });

  langSelect.innerHTML = uniq
    .map(
      (l) =>
        `<option value="${l.code}" ${
          l.code === canonical(myLang) ? "selected" : ""
        }>${l.flag} ${l.name}</option>`
    )
    .join("");
}

function renderParticipants() {
  const arr = [...participants.values()];
  peopleCount.textContent = String(Math.max(1, arr.length || 1));

  peopleScroll.innerHTML = arr.length
    ? arr
        .map(
          (p) => `
      <div class="pItem">
        <div class="pAvatar">${p.avatar ? `<img src="${p.avatar}" alt="">` : initials(p.name)}</div>
        <div class="pName">${p.name || "Katılımcı"}</div>
      </div>
    `
        )
        .join("")
    : `
      <div class="pItem">
        <div class="pAvatar">👤</div>
        <div class="pName">Sen</div>
      </div>
    `;
}

function scrollChatBottom() {
  requestAnimationFrame(() => {
    try {
      chat.scrollTop = chat.scrollHeight;
    } catch {}
  });
}

function addSystemNote(text) {
  const div = document.createElement("div");
  div.className = "sys-note";
  div.textContent = String(text || "").trim();
  chat.appendChild(div);
  scrollChatBottom();
}

function speakFallback(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return;

  try {
    window.speechSynthesis?.cancel?.();
  } catch {}

  if (!window.speechSynthesis) return;

  const u = new SpeechSynthesisUtterance(value);
  u.lang = canonical(langCode);

  setTimeout(() => {
    try {
      window.speechSynthesis.speak(u);
    } catch {}
  }, 50);
}

function addMessage({
  side = "left",
  name = "Katılımcı",
  text = "",
  withSpeaker = false,
  speakLang = "tr",
}) {
  const row = document.createElement("div");
  row.className = `msg-row ${side}`;

  const label = document.createElement("div");
  label.className = "sender-name";
  label.textContent = name;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = text;

  row.appendChild(label);
  row.appendChild(bubble);

  if (withSpeaker) {
    const actions = document.createElement("div");
    actions.className = "msg-actions";

    const btn = document.createElement("button");
    btn.className = "mini-btn";
    btn.type = "button";
    btn.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M3 10v4h4l5 4V6L7 10H3"></path>
        <path d="M16 8a4 4 0 0 1 0 8"></path>
        <path d="M19 5a8 8 0 0 1 0 14"></path>
      </svg>
    `;
    btn.addEventListener("click", () => speakFallback(text, speakLang));
    actions.appendChild(btn);
    row.appendChild(actions);
  }

  chat.appendChild(row);
  scrollChatBottom();
}

function autoGrowTextarea() {
  msgInput.style.height = "26px";
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + "px";
}

async function sendText(rawText) {
  const text = String(rawText || "").trim();
  if (!text || !wsReady || !ws || ws.readyState !== WebSocket.OPEN) return;

  addMessage({
    side: "right",
    name: "Sen",
    text,
    withSpeaker: false,
    speakLang: myLang,
  });

  try {
    ws.send(
      JSON.stringify({
        type: "text_message",
        text,
        from_lang: myLang,
      })
    );
  } catch (e) {
    console.warn("[alltoall send]", e);
    addSystemNote("Mesaj gönderilemedi.");
  }
}

function buildRecognizer(langCode) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = canonical(langCode);
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  return rec;
}

function stopRecognizer() {
  try {
    recognizer?.stop?.();
  } catch {}
  recognizer = null;
  isRecording = false;
  micBtn.classList.remove("listening");
}

function startRecording() {
  const rec = buildRecognizer(myLang);
  if (!rec) {
    addSystemNote("Bu cihazda konuşma algılama desteklenmiyor.");
    return;
  }

  recognizer = rec;

  rec.onstart = () => {
    isRecording = true;
    micBtn.classList.add("listening");
  };

  rec.onresult = (e) => {
    const heard = e.results?.[0]?.[0]?.transcript || "";
    if (heard) sendText(heard);
  };

  rec.onerror = () => {
    stopRecognizer();
  };

  rec.onend = () => {
    stopRecognizer();
  };

  try {
    rec.start();
  } catch {
    stopRecognizer();
  }
}

function wsUrl() {
  if (!roomId) return null;
  return `${WS_BASE}/api/ws/interpreter/${encodeURIComponent(
    roomId
  )}?role=${encodeURIComponent(role)}&lang=${encodeURIComponent(myLang)}`;
}

function connectSocket() {
  const url = wsUrl();
  if (!url) {
    addSystemNote("Oda bilgisi bulunamadı.");
    return;
  }

  try {
    ws = new WebSocket(url);
  } catch (e) {
    addSystemNote("Bağlantı kurulamadı.");
    return;
  }

  ws.onopen = async () => {
    wsReady = true;
    addSystemNote("Kanal bağlantısı kuruldu.");

    if (role === "guest") {
      try {
        await fetch(`${API_BASE}/interpreter/join-room`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room_id: roomId,
            my_lang: myLang,
          }),
        });
      } catch (e) {
        console.warn("[alltoall join-room]", e);
      }
    }
  };

  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      const type = String(payload?.type || "").trim();

      if (type === "presence") {
        const guestLang = payload?.guest_lang || "";

        participants.clear();
        participants.set("self", {
          name: role === "host" ? "Host" : "Sen",
          avatar: "",
        });

        if (guestLang) {
          participants.set("guest", {
            name: "Katılımcı",
            avatar: "",
          });
        }

        renderParticipants();
        return;
      }

      if (type === "peer_joined") {
        participants.set("guest", {
          name: "Katılımcı",
          avatar: "",
        });
        renderParticipants();
        addSystemNote("Yeni bir katılımcı bağlandı.");
        return;
      }

      if (type === "translated_message") {
        const sender = String(payload?.sender || "").trim().toLowerCase();
        const translated = String(payload?.translated_text || "").trim();
        const original = String(payload?.original_text || "").trim();
        const text = translated || original;

        if (!text) return;
        if (sender === role) return;

        addMessage({
          side: "left",
          name: "Katılımcı",
          text,
          withSpeaker: true,
          speakLang: myLang,
        });
        return;
      }

      if (type === "peer_left") {
        participants.delete("guest");
        renderParticipants();
        addSystemNote("Bir katılımcı odadan ayrıldı.");
        return;
      }

      if (type === "error") {
        addSystemNote(payload?.message || "Sunucu hatası.");
      }
    } catch (e) {
      console.warn("[alltoall ws parse]", e);
    }
  };

  ws.onerror = () => {
    wsReady = false;
    addSystemNote("Bağlantı hatası oluştu.");
  };

  ws.onclose = () => {
    wsReady = false;
    addSystemNote("Bağlantı kapandı.");
  };
}

function init() {
  roomPill.textContent = roomId || "------";

  roomPill.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      addSystemNote("Oda kodu kopyalandı.");
    } catch {}
  });

  renderLangs();
  renderParticipants();
  connectSocket();

  langSelect.addEventListener("change", () => {
    myLang = canonical(langSelect.value || "tr");
    localStorage.setItem("alltoall_lang", myLang);
    addSystemNote(`Dil güncellendi: ${langObj(myLang).name}`);

    try {
      ws?.close?.();
    } catch {}
    wsReady = false;
    connectSocket();
  });

  msgInput.addEventListener("input", autoGrowTextarea);

  msgInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const text = msgInput.value.trim();
      if (!text) return;
      sendText(text);
      msgInput.value = "";
      autoGrowTextarea();
    }
  });

  sendBtn.addEventListener("click", () => {
    const text = msgInput.value.trim();
    if (!text) return;
    sendText(text);
    msgInput.value = "";
    autoGrowTextarea();
  });

  micBtn.addEventListener("click", () => {
    if (isRecording) {
      stopRecognizer();
      return;
    }
    startRecording();
  });

  backBtn.addEventListener("click", () => {
    history.back();
  });

  exitBtn.addEventListener("click", () => {
    location.href = "/pages/alltoall.html";
  });

  autoGrowTextarea();
}

init();
