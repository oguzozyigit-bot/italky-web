// FILE: /js/alltoall_room.js

import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com/api";
const WS_BASE = "wss://italky-api.onrender.com/api";

const $ = (id) => document.getElementById(id);

const chat = $("chat");
const msgInput = $("msgInput");
const sendBtn = $("sendBtn");
const micBtn = $("micBtn");
const peopleScroll = $("peopleScroll");
const peopleCount = $("peopleCount");
const langSelect = $("langSelect");
const roomPill = $("roomPill");
const backBtn = $("backBtn");
const exitBtn = $("exitBtn");

const params = new URLSearchParams(location.search);
const hostCode = String(params.get("host") || "").trim().toUpperCase();
const role = String(params.get("role") || "guest").trim().toLowerCase();

let roomId = "";
let ws = null;
let myLang = localStorage.getItem("alltoall_lang") || "tr";
let recognizing = false;
let recognizer = null;
let joinedPeople = new Map();
let myName = role === "host" ? "Host" : "Guest";

/* ==============================
   LANG
================================*/
const LANGS = ["tr", "en", "de", "fr", "it", "es", "ru", "el", "az", "ka"];

function buildLangSelect() {
  if (!langSelect) return;

  langSelect.innerHTML = "";

  LANGS.forEach((code) => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = code.toUpperCase();
    langSelect.appendChild(opt);
  });

  langSelect.value = myLang;

  langSelect.onchange = () => {
    myLang = langSelect.value;
    localStorage.setItem("alltoall_lang", myLang);

    if (recognizer) recognizer.lang = toBCP(myLang);

    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({ type: "set_lang", lang: myLang }));
      } catch {}
    }
  };
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
  };
  return map[String(code || "tr").toLowerCase()] || "tr-TR";
}

/* ==============================
   NAME / INITIALS
================================*/
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

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "?";

  if (parts.length === 1) {
    return parts[0].slice(0, 1).toUpperCase();
  }

  return (parts[0][0] + parts[1][0]).toUpperCase();
}

async function hydrateMyName() {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;
    if (!user) return;

    myName = getDisplayNameFromUser(user);
  } catch (e) {
    console.warn("[alltoall hydrateMyName]", e);
  }
}

/* ==============================
   CHAT UI
================================*/
function addMessage(text, side = "left", sender = "") {
  if (!chat) return;

  const safe = String(text || "").trim();
  if (!safe) return;

  const row = document.createElement("div");
  row.className = "msg-row " + side;

  const name = document.createElement("div");
  name.className = "sender-name";
  name.textContent = sender || (side === "right" ? myName : "Katılımcı");

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = safe;

  row.appendChild(name);
  row.appendChild(bubble);

  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
}

function addSystemMessage(text) {
  if (!chat) return;

  const row = document.createElement("div");
  row.className = "msg-row left";

  const name = document.createElement("div");
  name.className = "sender-name";
  name.textContent = "Sistem";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = String(text || "").trim();

  row.appendChild(name);
  row.appendChild(bubble);

  chat.appendChild(row);
  chat.scrollTop = chat.scrollHeight;
}

/* ==============================
   PEOPLE
================================*/
function renderPeople() {
  if (!peopleScroll) return;

  peopleScroll.innerHTML = "";

  [...joinedPeople.values()].forEach((person) => {
    const wrap = document.createElement("div");
    wrap.className = "pItem";

    const avatar = document.createElement("div");
    avatar.className = "pAvatar";
    avatar.textContent = getInitials(person.name);

    const label = document.createElement("div");
    label.className = "pName";
    label.textContent = person.name || "Katılımcı";

    wrap.appendChild(avatar);
    wrap.appendChild(label);
    peopleScroll.appendChild(wrap);
  });

  if (peopleCount) peopleCount.textContent = String(joinedPeople.size || 0);
}

function ensureSelfInPeople() {
  if (!joinedPeople.has(role)) {
    joinedPeople.set(role, {
      key: role,
      name: myName,
      lang: myLang,
    });
    renderPeople();
  }
}

/* ==============================
   API
================================*/
async function resolveRoom() {
  if (!hostCode) {
    alert("Kod bulunamadı");
    return false;
  }

  try {
    const r = await fetch(`${API_BASE}/interpreter/resolve-room`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host_code: hostCode,
        my_lang: myLang,
        mode: "interpreter",
      }),
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok || !j?.room_id) {
      throw new Error(j?.detail || j?.error || "Room resolve başarısız");
    }

    roomId = String(j.room_id || "").trim();
    return true;
  } catch (e) {
    console.error("[alltoall resolveRoom]", e);
    alert(e?.message || "Oda bulunamadı");
    return false;
  }
}

async function joinRoomIfNeeded() {
  if (!roomId) return;
  if (role !== "guest") return;

  try {
    const r = await fetch(`${API_BASE}/interpreter/join-room`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_id: roomId,
        my_lang: myLang,
      }),
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok) {
      throw new Error(j?.detail || "join-room başarısız");
    }
  } catch (e) {
    console.error("[alltoall joinRoom]", e);
    alert(e?.message || "Odaya katılım başarısız");
  }
}

/* ==============================
   WS
================================*/
function connectSocket() {
  if (!roomId) {
    alert("Room bulunamadı");
    return;
  }

  ws = new WebSocket(
    `${WS_BASE}/ws/interpreter/${encodeURIComponent(roomId)}?role=${encodeURIComponent(role)}&lang=${encodeURIComponent(myLang)}`
  );

  ws.onopen = async () => {
    ensureSelfInPeople();

    if (role === "guest") {
      await joinRoomIfNeeded();
    }

    addSystemMessage("Bağlantı kuruldu");
  };

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      const type = String(data.type || "").trim();

      if (type === "presence") {
        ensureSelfInPeople();

        if (data.host_lang) {
          joinedPeople.set("host", {
            key: "host",
            name: role === "host" ? myName : "Host",
            lang: data.host_lang,
          });
        }

        if (data.guest_lang) {
          joinedPeople.set("guest", {
            key: "guest",
            name: role === "guest" ? myName : "Guest",
            lang: data.guest_lang,
          });
        } else if (joinedPeople.has("guest") && !data.guest_lang) {
          joinedPeople.delete("guest");
        }

        renderPeople();
        return;
      }

      if (type === "peer_joined") {
        joinedPeople.set("guest", {
          key: "guest",
          name: role === "guest" ? myName : "Guest",
          lang: data.guest_lang || "en",
        });
        renderPeople();
        addSystemMessage("Yeni katılımcı bağlandı");
        return;
      }

      if (type === "peer_left") {
        if (data.sender) {
          joinedPeople.delete(String(data.sender));
          renderPeople();
        }
        addSystemMessage(data.message || "Bir katılımcı ayrıldı");
        return;
      }

      if (type === "translated_message") {
        const sender = String(data.sender || "").trim().toLowerCase();
        const translated = String(data.translated_text || "").trim();
        const original = String(data.original_text || "").trim();

        if (sender === role) return;

        addMessage(
          translated || original,
          "left",
          sender === "host" ? "Host" : "Guest"
        );
        return;
      }

      if (type === "error") {
        addSystemMessage(data.message || "Bağlantı hatası");
        return;
      }
    } catch (err) {
      console.warn("[alltoall ws parse]", err);
    }
  };

  ws.onclose = () => {
    addSystemMessage("Bağlantı kapandı");
  };
}

/* ==============================
   SEND
================================*/
function sendMessage() {
  const text = String(msgInput?.value || "").trim();
  if (!text) return;

  addMessage(text, "right", myName);

  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify({
      type: "text_message",
      text,
      from_lang: myLang,
    }));
  }

  msgInput.value = "";
  autoGrowTextarea();
}

/* ==============================
   SPEECH
================================*/
function initSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    if (micBtn) micBtn.style.display = "none";
    return;
  }

  recognizer = new SR();
  recognizer.lang = toBCP(myLang);
  recognizer.interimResults = false;
  recognizer.continuous = false;
  recognizer.maxAlternatives = 1;

  recognizer.onresult = (e) => {
    const text = e.results?.[0]?.[0]?.transcript || "";
    msgInput.value = text;
    sendMessage();
  };

  recognizer.onend = () => {
    recognizing = false;
    micBtn?.classList.remove("listening");
  };
}

function toggleMic() {
  if (!recognizer) return;

  if (recognizing) {
    recognizer.stop();
    recognizing = false;
    micBtn?.classList.remove("listening");
    return;
  }

  recognizing = true;
  micBtn?.classList.add("listening");
  recognizer.lang = toBCP(myLang);
  recognizer.start();
}

/* ==============================
   INPUT
================================*/
function autoGrowTextarea() {
  if (!msgInput) return;
  msgInput.style.height = "26px";
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + "px";
}

/* ==============================
   EVENTS
================================*/
function bindEvents() {
  sendBtn && (sendBtn.onclick = sendMessage);

  msgInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  msgInput?.addEventListener("input", autoGrowTextarea);

  micBtn && (micBtn.onclick = toggleMic);

  roomPill?.addEventListener("click", async () => {
    if (!hostCode) return;
    try {
      await navigator.clipboard.writeText(hostCode);
      addSystemMessage(`Kod kopyalandı: ${hostCode}`);
    } catch {}
  });

  backBtn?.addEventListener("click", () => history.back());
  exitBtn?.addEventListener("click", () => {
    location.href = "/pages/alltoall.html";
  });
}

/* ==============================
   INIT
================================*/
async function init() {
  if (roomPill) roomPill.textContent = hostCode || "---";

  await hydrateMyName();
  buildLangSelect();
  initSpeech();
  bindEvents();
  ensureSelfInPeople();

  const ok = await resolveRoom();
  if (!ok) return;

  connectSocket();
  autoGrowTextarea();
}

init();
