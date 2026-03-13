// FILE: /js/live_interpreter_page.js

const $ = (id) => document.getElementById(id);
const WS_BASE = "wss://italky-api.onrender.com";

const roleBadge = $("role-badge");
const roomTitle = $("room-title");
const roomMetaText = $("room-meta-text");
const chatLog = $("chat-log");
const emptyState = $("empty-state");
const statusDot = $("status-dot");
const wsStatus = $("ws-status");

const query = new URLSearchParams(location.search);

const roomId = String(query.get("room") || "").trim();
const role = String(query.get("role") || "guest").trim().toLowerCase();
const hostCode = String(query.get("host") || "").trim();
const version = String(query.get("v") || "1").trim();

let myLang = String(query.get("my") || "tr").trim().toLowerCase();
let peerLang = String(query.get("peer") || "en").trim().toLowerCase();

let ws = null;
let wsReady = false;
let pingTimer = null;

function setStatus(mode, text) {
  if (wsStatus) wsStatus.textContent = text || "";

  if (!statusDot) return;
  statusDot.classList.remove("ok", "err");

  if (mode === "ok") statusDot.classList.add("ok");
  else if (mode === "err") statusDot.classList.add("err");
}

function hideEmptyState() {
  if (emptyState) emptyState.style.display = "none";
}

function addMessage(text, type = "sys") {
  if (!chatLog) return;

  hideEmptyState();

  const el = document.createElement("div");
  el.className =
    type === "host" ? "msg host-msg" :
    type === "guest" ? "msg guest-msg" :
    "msg sys-msg";

  el.textContent = String(text || "").trim();
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function renderHeader() {
  if (roleBadge) {
    roleBadge.textContent = role === "host" ? "Host" : "Guest";
  }

  if (roomTitle) {
    if (roomId) roomTitle.textContent = "Canlı Tercüme • Room";
    else if (hostCode) roomTitle.textContent = "Canlı Tercüme • Host";
    else roomTitle.textContent = "Canlı Tercüme";
  }

  if (roomMetaText) {
    if (roomId) {
      roomMetaText.textContent = `Room: ${roomId}`;
    } else if (hostCode) {
      roomMetaText.textContent = `Host: ${hostCode} • v${version}`;
    } else {
      roomMetaText.textContent = "Room bilgisi bulunamadı";
    }
  }
}

function buildWsUrl() {
  if (roomId) {
    const url = new URL(`${WS_BASE}/ws/interpreter/${encodeURIComponent(roomId)}`);
    url.searchParams.set("role", role);
    url.searchParams.set("lang", myLang);
    return url.toString();
  }

  if (hostCode) {
    const url = new URL(`${WS_BASE}/ws/interpreter/${encodeURIComponent(hostCode)}`);
    url.searchParams.set("role", role);
    url.searchParams.set("lang", myLang);
    return url.toString();
  }

  return "";
}

function stopSocket() {
  try { ws?.close?.(); } catch {}
  ws = null;
  wsReady = false;

  if (pingTimer) clearInterval(pingTimer);
  pingTimer = null;
}

function handleSocketMessage(payload) {
  const type = String(payload?.type || "").trim();

  if (type === "presence") {
    setStatus("ok", "Bağlantı kuruldu");
    addMessage("Odaya giriş yapıldı", "sys");
    return;
  }

  if (type === "peer_joined") {
    setStatus("ok", "Karşı taraf bağlandı");
    addMessage("Karşı taraf bağlandı", "sys");
    return;
  }

  if (type === "translated_message") {
    const sender = String(payload?.sender || "").trim().toLowerCase();
    const translated = String(payload?.translated_text || "").trim();
    const original = String(payload?.original_text || "").trim();

    if (!translated && !original) return;

    if (sender === "host") {
      addMessage(translated || original, "host");
    } else if (sender === "guest") {
      addMessage(translated || original, "guest");
    } else {
      addMessage(translated || original, "sys");
    }

    setStatus("ok", "Canlı akış aktif");
    return;
  }

  if (type === "text_message") {
    const sender = String(payload?.sender || "").trim().toLowerCase();
    const text = String(payload?.text || "").trim();
    if (!text) return;

    if (sender === "host") addMessage(text, "host");
    else if (sender === "guest") addMessage(text, "guest");
    else addMessage(text, "sys");

    return;
  }

  if (type === "peer_left") {
    setStatus("err", "Karşı taraf ayrıldı");
    addMessage("Karşı taraf ayrıldı", "sys");
    return;
  }

  if (type === "error") {
    const msg = String(payload?.message || "Bağlantı hatası").trim();
    setStatus("err", msg);
    addMessage(msg, "sys");
  }
}

function startSocket() {
  const url = buildWsUrl();

  if (!url) {
    setStatus("err", "Room veya host bilgisi bulunamadı");
    addMessage("Bağlantı başlatılamadı: room/host eksik", "sys");
    return;
  }

  stopSocket();

  try {
    ws = new WebSocket(url);
  } catch (e) {
    console.error("[live ws create]", e);
    setStatus("err", "WebSocket açılamadı");
    addMessage("WebSocket açılamadı", "sys");
    return;
  }

  ws.onopen = () => {
    wsReady = true;
    setStatus("ok", "WebSocket bağlandı");
    addMessage("WebSocket bağlantısı kuruldu", "sys");

    pingTimer = setInterval(() => {
      try {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      } catch {}
    }, 15000);
  };

  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      console.log("[live ws message]", payload);
      handleSocketMessage(payload);
    } catch (e) {
      console.warn("[live ws parse]", e, event.data);
    }
  };

  ws.onerror = (e) => {
    console.warn("[live ws error]", e);
    wsReady = false;
    setStatus("err", "Bağlantı sorunu");
    addMessage("WebSocket hata verdi", "sys");
  };

  ws.onclose = () => {
    wsReady = false;
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;

    setStatus("err", "Bağlantı kapandı");
    addMessage("WebSocket bağlantısı kapandı", "sys");
  };
}

function bootInfo() {
  if (roomId) {
    addMessage(`Room hazır: ${roomId}`, "sys");
  } else if (hostCode) {
    addMessage(`Host hazır: ${hostCode}`, "sys");
  } else {
    addMessage("Canlı bağlantı bilgisi bulunamadı", "sys");
  }

  addMessage(`Rol: ${role.toUpperCase()} • Dil: ${myLang} • Peer: ${peerLang}`, "sys");
}

function init() {
  renderHeader();
  setStatus("", "WebSocket bağlanıyor...");
  bootInfo();
  startSocket();
}

init();
window.addEventListener("beforeunload", stopSocket);
