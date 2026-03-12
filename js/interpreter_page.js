// FILE: /js/live_interpreter_page.js

const API_BASE = "https://italky-api.onrender.com/api";
const WS_BASE = "wss://italky-api.onrender.com/api";

const params = new URLSearchParams(window.location.search);
const roomId = String(params.get("room") || "").trim();
const role = String(params.get("role") || "guest").trim().toLowerCase();
const myLang = String(params.get("my") || "tr").trim().toLowerCase();
const peerLang = String(params.get("peer") || "").trim().toLowerCase();

const roomTitle = document.getElementById("room-title");
const roleBadge = document.getElementById("role-badge");
const roomMetaText = document.getElementById("room-meta-text");
const chatLog = document.getElementById("chat-log");
const wsStatus = document.getElementById("ws-status");
const statusDot = document.getElementById("status-dot");
const emptyState = document.getElementById("empty-state");

let socket = null;
let pingTimer = null;

function setStatus(text, mode = "waiting") {
  if (wsStatus) wsStatus.innerText = text;

  if (statusDot) {
    statusDot.classList.remove("ok", "err");
    if (mode === "ok") statusDot.classList.add("ok");
    if (mode === "err") statusDot.classList.add("err");
  }
}

function hideEmptyState() {
  if (emptyState) emptyState.style.display = "none";
}

function showSystemMessage(text) {
  hideEmptyState();

  const msgDiv = document.createElement("div");
  msgDiv.className = "sys-msg";
  msgDiv.innerText = text;

  chatLog?.appendChild(msgDiv);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function showChatMessage(text, senderRole) {
  hideEmptyState();

  const msgDiv = document.createElement("div");
  msgDiv.className = `msg ${senderRole === "host" ? "host-msg" : "guest-msg"}`;
  msgDiv.innerText = text;

  chatLog?.appendChild(msgDiv);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function stopSocket() {
  try {
    socket?.close?.();
  } catch {}

  socket = null;

  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

async function fetchRoomInfo() {
  const res = await fetch(`${API_BASE}/interpreter/room/${encodeURIComponent(roomId)}`);
  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.ok) {
    throw new Error(data?.detail || data?.error || "room_fetch_failed");
  }

  return data;
}

function updateHeader(info) {
  if (roomTitle) {
    roomTitle.innerText = `Room • ${roomId}`;
  }

  if (roleBadge) {
    roleBadge.innerText = `${role.toUpperCase()} • ${myLang.toUpperCase()}`;
  }

  if (roomMetaText) {
    const parts = [
      `Status: ${info?.status || "waiting"}`,
      `Host: ${(info?.host_lang || "-").toUpperCase()}`,
      `Guest: ${((info?.guest_lang || peerLang || "-") || "-").toUpperCase()}`
    ];
    roomMetaText.innerText = parts.join(" • ");
  }
}

function buildWsUrl() {
  const url = new URL(`${WS_BASE}/ws/interpreter/${encodeURIComponent(roomId)}`);
  url.searchParams.set("role", role);
  url.searchParams.set("lang", myLang);
  return url.toString();
}

function handleSocketMessage(data) {
  if (!data || typeof data !== "object") return;

  if (data.type === "translated_message") {
    const sender = String(data.sender || "").trim().toLowerCase();
    const translatedText = String(data.translated_text || "").trim();
    const originalText = String(data.original_text || "").trim();
    const fromLang = String(data.from_lang || "").trim().toLowerCase();
    const toLang = String(data.to_lang || "").trim().toLowerCase();

    if (translatedText) {
      showChatMessage(
        `${translatedText}${toLang ? ` (${toLang.toUpperCase()})` : ""}`,
        sender || "guest"
      );
    }

    if (originalText) {
      showSystemMessage(
        `Orijinal: ${originalText}${fromLang ? ` (${fromLang.toUpperCase()})` : ""}`
      );
    }

    return;
  }

  if (data.type === "peer_joined") {
    showSystemMessage(`Karşı taraf bağlandı • ${String(data.guest_lang || "").toUpperCase() || "-"}`);
    return;
  }

  if (data.type === "peer_left") {
    showSystemMessage("Karşı taraf odadan ayrıldı.");
    return;
  }

  if (data.type === "presence") {
    if (roomMetaText) {
      const parts = [
        `Status: ${data.status || "waiting"}`,
        `Host: ${String(data.host_lang || "-").toUpperCase()}`,
        `Guest: ${String(data.guest_lang || "-").toUpperCase()}`
      ];
      roomMetaText.innerText = parts.join(" • ");
    }
    return;
  }

  if (data.type === "pong") {
    return;
  }

  if (data.type === "error") {
    showSystemMessage(`Hata: ${data.message || "Bilinmeyen hata"}`);
    setStatus("Bağlantı hatası", "err");
    return;
  }

  showSystemMessage(`Sistem olayı: ${data.type || "bilinmeyen"}`);
}

function startSocket() {
  stopSocket();

  const wsUrl = buildWsUrl();

  try {
    socket = new WebSocket(wsUrl);
  } catch (err) {
    console.error("WS başlatılamadı:", err);
    setStatus("WebSocket açılamadı", "err");
    showSystemMessage("WebSocket başlatılamadı.");
    return;
  }

  socket.onopen = () => {
    setStatus("Bağlantı aktif", "ok");
    showSystemMessage("WebSocket bağlantısı kuruldu.");

    pingTimer = setInterval(() => {
      try {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "ping" }));
        }
      } catch {}
    }, 15000);
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleSocketMessage(data);
    } catch (e) {
      console.error("WS mesaj parse hatası:", e);
      showSystemMessage("Mesaj okunamadı.");
    }
  };

  socket.onclose = () => {
    setStatus("Bağlantı kesildi", "err");
    showSystemMessage("WebSocket bağlantısı kapandı.");

    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
  };

  socket.onerror = (err) => {
    console.error("WS hatası:", err);
    setStatus("Bağlantı hatası", "err");
    showSystemMessage("WebSocket bağlantısında hata oluştu.");
  };
}

async function initLiveSession() {
  if (!roomId) {
    if (roomTitle) roomTitle.innerText = "Room bulunamadı";
    if (roleBadge) roleBadge.innerText = "Interpreter";
    if (roomMetaText) roomMetaText.innerText = "Room ID eksik";
    setStatus("Room ID bulunamadı", "err");
    showSystemMessage("Live Interpreter ekranı room parametresi olmadan açılamaz.");
    return;
  }

  if (roomTitle) roomTitle.innerText = `Room • ${roomId}`;
  if (roleBadge) roleBadge.innerText = `${role.toUpperCase()} • ${myLang.toUpperCase()}`;

  setStatus("Room bilgisi alınıyor...");
  showSystemMessage("Room doğrulanıyor...");

  try {
    const info = await fetchRoomInfo();
    updateHeader(info);
    setStatus("WebSocket bağlanıyor...");
    startSocket();
  } catch (error) {
    console.error("Room info error:", error);
    setStatus("Room bilgisi alınamadı", "err");
    showSystemMessage("Room bilgisi alınamadı. Oda kapanmış veya geçersiz olabilir.");
  }
}

initLiveSession();

window.addEventListener("beforeunload", () => {
  stopSocket();
});
