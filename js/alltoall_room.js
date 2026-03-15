import { supabase } from "/js/supabase_client.js";

const WS_BASE = "wss://italky-api.onrender.com/api/alltoall/ws";

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
const soundToggleBtn = $("soundToggleBtn");

const params = new URLSearchParams(location.search);
const hostCode = String(params.get("host") || "").trim().toUpperCase();
const role = String(params.get("role") || "guest").trim().toLowerCase();

let roomId = hostCode || "";
let ws = null;
let myLang = localStorage.getItem("alltoall_lang") || "tr";
let autoSpeak = localStorage.getItem("alltoall_auto_speak") !== "0";
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

const LANGS = [
  { code: "tr", flag: "🇹🇷", name: "Türkçe" },
  { code: "en", flag: "🇬🇧", name: "English" },
  { code: "de", flag: "🇩🇪", name: "Deutsch" },
  { code: "fr", flag: "🇫🇷", name: "Français" },
  { code: "it", flag: "🇮🇹", name: "Italiano" },
  { code: "es", flag: "🇪🇸", name: "Español" },
  { code: "ru", flag: "🇷🇺", name: "Русский" },
  { code: "el", flag: "🇬🇷", name: "Ελληνικά" },
  { code: "az", flag: "🇦🇿", name: "Azərbaycan" },
  { code: "ka", flag: "🇬🇪", name: "ქართული" },
];

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
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
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

function buildLangSelect() {
  if (!langSelect) return;

  langSelect.innerHTML = "";
  LANGS.forEach((l) => {
    const opt = document.createElement("option");
    opt.value = l.code;
    opt.textContent = `${l.flag} ${l.name}`;
    langSelect.appendChild(opt);
  });

  langSelect.value = myLang;

  langSelect.addEventListener("change", () => {
    myLang = langSelect.value;
    localStorage.setItem("alltoall_lang", myLang);
    myProfile.me_lang = myLang;

    if (recognizer) recognizer.lang = toBCP(myLang);

    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: "profile_sync",
          from_name: myProfile.from_name,
          from_pic: myProfile.from_pic,
          me_lang: myLang,
          user_id: myProfile.user_id,
        }));
      } catch {}
    }

    addSystemMessage(`Dil güncellendi: ${myLang.toUpperCase()}`);
  });
}

function updateSoundButton() {
  if (!soundToggleBtn) return;
  soundToggleBtn.textContent = autoSpeak ? "🔊" : "🔇";
  soundToggleBtn.title = autoSpeak ? "Ses açık" : "Ses kapalı";
}

function toggleSound() {
  autoSpeak = !autoSpeak;
  localStorage.setItem("alltoall_auto_speak", autoSpeak ? "1" : "0");
  updateSoundButton();
  addSystemMessage(autoSpeak ? "Sesli okuma açıldı" : "Sesli okuma kapatıldı");
}

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

function speakText(text, langCode) {
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

function addMessage({ side = "left", sender = "", text = "", withSpeaker = false, speakLang = "tr" }) {
  const safeText = String(text || "").trim();
  if (!safeText || !chat) return;

  const row = document.createElement("div");
  row.className = `msg-row ${side}`;

  const label = document.createElement("div");
  label.className = "sender-name";
  label.textContent = sender || (side === "right" ? myProfile.from_name : "Katılımcı");

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = safeText;

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
    btn.addEventListener("click", () => speakText(safeText, speakLang));
    actions.appendChild(btn);
    row.appendChild(actions);
  }

  chat.appendChild(row);
  scrollChatBottom();
}

function autoGrowTextarea() {
  if (!msgInput) return;
  msgInput.style.height = "26px";
  msgInput.style.height = Math.min(msgInput.scrollHeight, 120) + "px";
}

function sendWs(payload) {
  try {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  } catch (e) {
    console.warn("[alltoall sendWs]", e);
  }
}

function connectSocket() {
  if (!roomId) {
    addSystemMessage("Oda bilgisi bulunamadı.");
    return;
  }

  ws = new WebSocket(`${WS_BASE}/${encodeURIComponent(roomId)}`);

  ws.onopen = () => {
    sendWs({
      type: role === "host" ? "create" : "join",
      from: myProfile.from,
      from_name: myProfile.from_name,
      from_pic: myProfile.from_pic,
      me_lang: myLang,
      role,
      user_id: myProfile.user_id,
    });
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
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
        if (roomPill) roomPill.textContent = roomId || "------";
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
        const finalText = translated || original;

        if (!finalText) return;
        if (fromId && myProfile.from && fromId === myProfile.from) return;

        addMessage({
          side: "left",
          sender: senderName,
          text: finalText,
          withSpeaker: true,
          speakLang: myLang
        });

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

        if (autoSpeak) {
          speakText(finalText, myLang);
        }
        return;
      }

      if (type === "message_sent") {
        return;
      }

      if (type === "error") {
        const msg = String(data.message || "Bağlantı hatası");
        if (msg === "ROOM_FULL") addSystemMessage("Oda dolu");
        else addSystemMessage(msg);
        return;
      }

      if (type === "room_not_found") {
        addSystemMessage(data.message || "Oda bulunamadı");
        return;
      }
    } catch (e) {
      console.warn("[alltoall ws parse]", e);
    }
  };

  ws.onerror = () => {
    addSystemMessage("Bağlantı hatası oluştu.");
  };

  ws.onclose = () => {
    addSystemMessage("Bağlantı kapandı.");
  };
}

function sendMessage() {
  const text = String(msgInput?.value || "").trim();
  if (!text) return;

  addMessage({
    side: "right",
    sender: myProfile.from_name,
    text,
    withSpeaker: false,
    speakLang: myLang
  });

  sendWs({
    type: "message",
    text,
    lang: myLang
  });

  msgInput.value = "";
  autoGrowTextarea();
}

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

function bindEvents() {
  sendBtn?.addEventListener("click", sendMessage);

  msgInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  msgInput?.addEventListener("input", autoGrowTextarea);
  micBtn?.addEventListener("click", toggleMic);
  soundToggleBtn?.addEventListener("click", toggleSound);

  roomPill?.addEventListener("click", async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      addSystemMessage(`Oda kodu kopyalandı: ${roomId}`);
    } catch {}
  });

  backBtn?.addEventListener("click", () => history.back());
  exitBtn?.addEventListener("click", () => {
    try { ws?.close?.(); } catch {}
    location.href = "/pages/alltoall.html";
  });
}

async function init() {
  roomPill.textContent = hostCode || "------";

  await hydrateMyProfile();
  buildLangSelect();
  updateSoundButton();
  initSpeech();
  bindEvents();
  ensureSelfInPeople();
  connectSocket();
  autoGrowTextarea();
}

init();
