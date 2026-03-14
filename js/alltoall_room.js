// FILE: /js/alltoall_room.js

import { supabase } from "/js/supabase_client.js";

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

let roomId = hostCode || "";
let ws = null;
let myLang = localStorage.getItem("alltoall_lang") || "tr";
let recognizing = false;
let recognizer = null;

let myProfile = {
  from: "",
  from_name: role === "host" ? "Host" : "Guest",
  from_pic: "",
  me_lang: myLang,
  role,
  user_id: "",
};

let joinedPeople = new Map();

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

    myProfile.me_lang = myLang;

    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: "profile_sync",
          from_name: myProfile.from_name,
          from_pic: myProfile.from_pic,
          me_lang: myLang,
          user_id: myProfile.user_id
        }));
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
   PROFILE
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
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "?";

  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return (parts[0][0] + parts[1][0]).toUpperCase();
}

async function hydrateMyProfile() {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;
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

/* ==============================
   CHAT UI
================================*/
function scrollChatBottom() {
  if (!chat) return;
  requestAnimationFrame(() => {
    try { chat.scrollTop = chat.scrollHeight; } catch {}
  });
}

function addMessage(text, side = "left", sender = "", withSpeaker = false, speakLang = "tr") {
  if (!chat) return;

  const safe = String(text || "").trim();
  if (!safe) return;

  const row = document.createElement("div");
  row.className = "msg-row " + side;

  const name = document.createElement("div");
  name.className = "sender-name";
  name.textContent = sender || (side === "right" ? myProfile.from_name : "Katılımcı");

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = safe;

  row.appendChild(name);
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
    btn.addEventListener("click", () => speakFallback(safe, speakLang));
    actions.appendChild(btn);
    row.appendChild(actions);
  }

  chat.appendChild(row);
  scrollChatBottom();
}

function addSystemMessage(text) {
  if (!chat) return;

  const note = document.createElement("div");
  note.className = "sys-note";
  note.textContent = String(text || "").trim();

  chat.appendChild(note);
  scrollChatBottom();
}

function speakFallback(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return;

  try { window.speechSynthesis?.cancel?.(); } catch {}
  if (!window.speechSynthesis) return;

  const u = new SpeechSynthesisUtterance(value);
  u.lang = toBCP(langCode);

  setTimeout(() => {
    try { window.speechSynthesis.speak(u); } catch {}
  }, 50);
}

/* ==============================
   PEOPLE
================================*/
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

  const arr = [...joinedPeople.values()];

  arr.forEach((person) => {
    const wrap = document.createElement("div");
    wrap.className = "pItem";

    const avatar = document.createElement("div");
    avatar.className = "pAvatar";

    if (person.from_pic) {
      const img = document.createElement("img");
      img.src = person.from_pic;
      img.alt = person.from_name || "Avatar";
      img.referrerPolicy = "no-referrer";
      avatar.appendChild(img);
    } else {
      avatar.textContent = getInitials(person.from_name);
    }

    const label = document.createElement("div");
    label.className = "pName";
    label.textContent = person.from_name || "Katılımcı";

    wrap.appendChild(avatar);
    wrap.appendChild(label);
    peopleScroll.appendChild(wrap);
  });

  if (peopleCount) peopleCount.textContent = String(arr.length || 0);
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
        from_name: person?.from_name || "Katılımcı",
        from_pic: person?.from_pic || "",
        me_lang: person?.me_lang || "tr",
        role: person?.role || "guest",
        user_id: person?.user_id || "",
      });
    });
  }

  if (![...joinedPeople.values()].some(p => p.from === myProfile.from || p.user_id === myProfile.user_id || p.role === myProfile.role && p.from_name === myProfile.from_name)) {
    ensureSelfInPeople();
  } else {
    renderPeople();
  }
}

function upsertPerson(person) {
  if (!person) return;
  const key = personKey(person);
  joinedPeople.set(key, {
    from: person?.from || "",
    from_name: person?.from_name || "Katılımcı",
    from_pic: person?.from_pic || "",
    me_lang: person?.me_lang || "tr",
    role: person?.role || "guest",
    user_id: person?.user_id || "",
  });
  renderPeople();
}

function removePerson(person) {
  if (!person) return;

  const key = personKey(person);

  if (joinedPeople.has(key)) {
    joinedPeople.delete(key);
  } else {
    for (const [k, v] of joinedPeople.entries()) {
      if (
        (person.from && v.from === person.from) ||
        (person.user_id && v.user_id === person.user_id) ||
        (person.role && person.from_name && v.role === person.role && v.from_name === person.from_name)
      ) {
        joinedPeople.delete(k);
      }
    }
  }

  renderPeople();
}

/* ==============================
   WS
================================*/
function connectSocket() {
  if (!roomId) {
    alert("Room bulunamadı");
    return;
  }

  ws = new WebSocket(`${WS_BASE}/alltoall/ws/${encodeURIComponent(roomId)}`);

  ws.onopen = () => {
    const joinPayload = {
      type: role === "host" ? "create" : "join",
      from: myProfile.from,
      from_name: myProfile.from_name,
      from_pic: myProfile.from_pic,
      me_lang: myLang,
      role,
      user_id: myProfile.user_id,
    };

    try {
      ws.send(JSON.stringify(joinPayload));
    } catch (e) {
      console.warn("[alltoall create/join send]", e);
    }
  };

  ws.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      const type = String(data.type || "").trim();

      if (type === "room_created" || type === "room_joined") {
        if (data.self) {
          myProfile = {
            ...myProfile,
            ...data.self,
            me_lang: myLang
          };
        }
        ensureSelfInPeople();
        addSystemMessage("Bağlantı kuruldu");
        return;
      }

      if (type === "presence") {
        applyRoster(data.roster || []);
        return;
      }

      if (type === "peer_joined") {
        if (data.peer) upsertPerson(data.peer);
        if (Array.isArray(data.roster)) applyRoster(data.roster);
        addSystemMessage("Yeni katılımcı bağlandı");
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
        addSystemMessage("Bir katılımcı ayrıldı");
        return;
      }

      if (type === "translated_message") {
        const fromId = String(data.from || "").trim();
        const senderName = String(data.from_name || "Katılımcı").trim();
        const translated = String(data.translated_text || "").trim();
        const original = String(data.original_text || "").trim();

        if (fromId && myProfile.from && fromId === myProfile.from) return;

        addMessage(
          translated || original,
          "left",
          senderName,
          true,
          myLang
        );

        if (data.from || data.from_name || data.from_pic) {
          upsertPerson({
            from: data.from || "",
            from_name: data.from_name || senderName,
            from_pic: data.from_pic || "",
            me_lang: data.from_lang || "tr",
            role: data.role || "guest",
            user_id: data.from_user_id || "",
          });
        }
        return;
      }

      if (type === "message_sent") {
        return;
      }

      if (type === "typing") {
        return;
      }

      if (type === "error") {
        const msg = String(data.message || "Bağlantı hatası");
        if (msg === "ROOM_FULL") {
          addSystemMessage("Oda dolu");
          return;
        }
        addSystemMessage(msg);
        return;
      }

      if (type === "room_not_found") {
        addSystemMessage(data.message || "Oda bulunamadı");
        return;
      }
    } catch (err) {
      console.warn("[alltoall ws parse]", err);
    }
  };

  ws.onclose = () => {
    addSystemMessage("Bağlantı kapandı");
  };

  ws.onerror = () => {
    addSystemMessage("Bağlantı hatası oluştu");
  };
}

/* ==============================
   SEND
================================*/
function sendMessage() {
  const text = String(msgInput?.value || "").trim();
  if (!text) return;

  addMessage(text, "right", myProfile.from_name);

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

  recognizer.onerror = () => {
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

  await hydrateMyProfile();
  buildLangSelect();
  initSpeech();
  bindEvents();
  ensureSelfInPeople();
  connectSocket();
  autoGrowTextarea();
}

init();
