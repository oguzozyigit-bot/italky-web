// FILE: /js/live_interpreter_page.js

import { LANG_POOL } from "/js/lang_pool_full.js";

const $ = (id) => document.getElementById(id);

/* =========================
   API / WS
========================= */

const API_BASE = "https://italky-api.onrender.com/api";
const WS_BASE = "wss://italky-api.onrender.com/api";

/* =========================
   DOM
========================= */

const roomTitle = $("room-title");
const roleBadge = $("role-badge");
const roomMetaText = $("room-meta-text");
const chatLog = $("chat-log");
const statusDot = $("status-dot");
const wsStatus = $("ws-status");
const emptyState = $("empty-state");

/* =========================
   URL PARAMS
========================= */

const query = new URLSearchParams(location.search);

let roomId = String(query.get("room") || "").trim();
const hostCode = String(query.get("host") || "").trim().toUpperCase();
const role = String(query.get("role") || "guest").trim().toLowerCase();

let myLang = String(query.get("my") || localStorage.getItem("live_interpreter_lang") || "tr").trim().toLowerCase();
let peerLang = String(query.get("peer") || localStorage.getItem("live_interpreter_peer_lang") || "en").trim().toLowerCase();

/* =========================
   LANG
========================= */

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
  ka: "ka-GE"
};

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim();
}

myLang = canonical(myLang || "tr");
peerLang = canonical(peerLang || "en");

const LANGS = (Array.isArray(LANG_POOL) ? LANG_POOL : [])
  .map((l) => {
    const code = canonical(l.code);
    if (!code) return null;
    return {
      code,
      flag: l.flag || "🌐",
      name: l.name || code.toUpperCase(),
      bcp: BCP[code] || "en-US"
    };
  })
  .filter(Boolean);

function langObj(code) {
  const c = canonical(code);
  return LANGS.find((x) => x.code === c) || {
    code: c,
    flag: "🌐",
    name: c.toUpperCase(),
    bcp: BCP[c] || "en-US"
  };
}

/* =========================
   STATE
========================= */

let ws = null;
let wsReady = false;
let pingTimer = null;

/* =========================
   UI
========================= */

function setStatus(state, text){
  if(!statusDot || !wsStatus) return;

  statusDot.classList.remove("ok","err");

  if(state === "ok") statusDot.classList.add("ok");
  if(state === "err") statusDot.classList.add("err");

  wsStatus.textContent = text || "";
}

function hideEmpty(){
  if(emptyState) emptyState.style.display = "none";
}

function addSystem(text){
  if(!chatLog) return;

  hideEmpty();

  const row = document.createElement("div");
  row.className = "sys-msg";
  row.textContent = String(text || "").trim();

  chatLog.appendChild(row);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function addMessage(text, side){
  if(!chatLog) return;

  hideEmpty();

  const row = document.createElement("div");
  row.className = "msg " + (side === "host" ? "host-msg" : "guest-msg");
  row.textContent = String(text || "").trim();

  chatLog.appendChild(row);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderHeader(){
  if(roleBadge){
    roleBadge.textContent = role === "host" ? "HOST" : "GUEST";
  }

  if(roomTitle){
    roomTitle.textContent = "Canlı Tercüme";
  }

  if(roomMetaText){
    if(roomId){
      roomMetaText.textContent = `Room: ${roomId}`;
    }else if(hostCode){
      roomMetaText.textContent = `Host: ${hostCode}`;
    }else{
      roomMetaText.textContent = "Room hazırlanıyor...";
    }
  }
}

function updateRoomMeta(){
  if(roomMetaText){
    if(roomId){
      roomMetaText.textContent = `Room: ${roomId}`;
    }else if(hostCode){
      roomMetaText.textContent = `Host: ${hostCode}`;
    }else{
      roomMetaText.textContent = "Room bulunamadı";
    }
  }
}

/* =========================
   API
========================= */

async function resolveRoomByHost(){
  if(!hostCode) return null;

  const r = await fetch(`${API_BASE}/interpreter/resolve-room`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      host_code: hostCode,
      my_lang: myLang,
      mode: "interpreter"
    })
  });

  const j = await r.json().catch(() => ({}));

  if(!r.ok || !j?.room_id){
    throw new Error(j?.detail || j?.error || "room resolve başarısız");
  }

  return j;
}

async function joinRoomIfNeeded(){
  if(!roomId) return;
  if(role !== "guest") return;

  try{
    const r = await fetch(`${API_BASE}/interpreter/join-room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        room_id: roomId,
        my_lang: myLang
      })
    });

    const j = await r.json().catch(() => ({}));

    if(!r.ok){
      throw new Error(j?.detail || "join-room başarısız");
    }

    addSystem("Odaya katılım bildirildi");
  }catch(e){
    console.warn("[join room]", e);
    addSystem("Join-room çağrısı başarısız");
  }
}

/* =========================
   WS URL
========================= */

function wsUrl(){
  if(!roomId) return null;
  return `${WS_BASE}/ws/interpreter/${encodeURIComponent(roomId)}?role=${encodeURIComponent(role)}&lang=${encodeURIComponent(myLang)}`;
}

/* =========================
   SOCKET
========================= */

function stopSocket(){
  try{ ws?.close?.(); }catch{}
  ws = null;
  wsReady = false;

  if(pingTimer){
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

function startPing(){
  if(pingTimer) clearInterval(pingTimer);

  pingTimer = setInterval(() => {
    try{
      if(ws && ws.readyState === WebSocket.OPEN){
        ws.send(JSON.stringify({ type: "ping" }));
      }
    }catch{}
  }, 15000);
}

function startSocket(){
  const url = wsUrl();

  if(!url){
    setStatus("err","Room bilgisi yok");
    addSystem("WebSocket için room bilgisi bulunamadı");
    return;
  }

  stopSocket();

  try{
    ws = new WebSocket(url);
  }catch(e){
    console.error("[ws create]", e);
    setStatus("err","WebSocket açılamadı");
    addSystem("WebSocket açılamadı");
    return;
  }

  setStatus("","WebSocket bağlanıyor...");

  ws.onopen = () => {
    wsReady = true;
    setStatus("ok","Bağlantı kuruldu");
    addSystem("Bağlantı hazır");
    startPing();
  };

  ws.onmessage = (event) => {
    try{
      const payload = JSON.parse(event.data);
      const type = String(payload?.type || "").trim();

      if(type === "presence"){
        if(payload?.room_id && !roomId){
          roomId = String(payload.room_id).trim();
          updateRoomMeta();
        }

        if(payload?.guest_lang){
          peerLang = canonical(payload.guest_lang);
          localStorage.setItem("live_interpreter_peer_lang", peerLang);
        }

        addSystem("Odaya bağlantı kuruldu");
        return;
      }

      if(type === "peer_joined"){
        if(payload?.guest_lang){
          peerLang = canonical(payload.guest_lang);
          localStorage.setItem("live_interpreter_peer_lang", peerLang);
        }

        addSystem("Karşı taraf bağlandı");
        return;
      }

      if(type === "translated_message"){
        const sender = String(payload?.sender || "").trim().toLowerCase();
        const translated = String(payload?.translated_text || "").trim();
        const original = String(payload?.original_text || "").trim();

        const text = translated || original;
        if(!text) return;

        addMessage(text, sender === "host" ? "host" : "guest");
        return;
      }

      if(type === "peer_left"){
        addSystem("Karşı taraf ayrıldı");
        return;
      }

      if(type === "pong"){
        return;
      }

      if(type === "error"){
        console.warn("[ws error payload]", payload);
        setStatus("err", payload.message || "Sunucu hatası");
        addSystem(payload.message || "Sunucu hatası");
      }

    }catch(e){
      console.warn("[ws parse error]", e);
    }
  };

  ws.onerror = () => {
    wsReady = false;
    setStatus("err","WebSocket hata verdi");
    addSystem("WebSocket hata verdi");
  };

  ws.onclose = () => {
    wsReady = false;
    if(pingTimer){
      clearInterval(pingTimer);
      pingTimer = null;
    }
    setStatus("err","Bağlantı kapandı");
    addSystem("Bağlantı kapandı");
  };
}

/* =========================
   BOOT
========================= */

async function boot(){

  renderHeader();
  localStorage.setItem("live_interpreter_lang", myLang);

  if(roomId){
    addSystem("Room hazır • " + roomId);
  }else if(hostCode){
    addSystem("Host hazır • " + hostCode);
    setStatus("", "Oda çözülüyor...");

    try{
      const resolved = await resolveRoomByHost();
      roomId = String(resolved.room_id || "").trim();

      if(!roomId){
        throw new Error("room_id boş geldi");
      }

      updateRoomMeta();
      addSystem("Room çözüldü • " + roomId);
    }catch(e){
      console.error("[resolve room]", e);
      setStatus("err", e?.message || "Room çözülemedi");
      addSystem(e?.message || "Room çözülemedi");
      return;
    }
  }else{
    addSystem("Bağlantı hazırlanıyor...");
    setStatus("err","Host veya room bilgisi yok");
    return;
  }

  await joinRoomIfNeeded();
  startSocket();
}

boot();
window.addEventListener("beforeunload", stopSocket);
