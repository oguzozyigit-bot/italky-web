// FILE: /js/alltoall_lobby.js

import { mountShell } from "/js/ui_shell.js";

try {
  mountShell({ scroll: "none" });
} catch (e) {
  console.warn("[alltoall shell]", e);
}

const API_BASE = "https://italky-api.onrender.com/api";

const $ = (id) => document.getElementById(id);

const goHost = $("goHost");
const goGuest = $("goGuest");

const hostPanel = $("hostPanel");
const joinPanel = $("joinPanel");
const homeCards = $("homeCards");

const roomCode = $("roomCode");
const hostStatus = $("hostStatus");

const btnGoCall = $("btnGoCall");
const btnCopy = $("btnCopy");
const btnJoin = $("btnJoin");
const roomInput = $("roomInput");

const btnBackHost = $("btnBackHost");
const btnBackJoin = $("btnBackJoin");

let activeCode = "";

function setMode(mode) {
  homeCards?.classList.toggle("hide", mode !== "home");
  hostPanel?.classList.toggle("hide", mode !== "host");
  joinPanel?.classList.toggle("hide", mode !== "join");
}

function setHostStatus(text) {
  if (hostStatus) hostStatus.textContent = text || "";
}

function makeShortCode(len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function cleanCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

async function createRoom() {
  const shortCode = makeShortCode(6);

  setHostStatus("Kanal hazırlanıyor...");

  try {
    const r = await fetch(`${API_BASE}/interpreter/create-room`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host_code: shortCode,
        my_lang: "tr",
        mode: "interpreter"
      })
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok || !j?.room_id) {
      throw new Error(j?.detail || j?.error || "Oda oluşturulamadı");
    }

    activeCode = shortCode;

    if (roomCode) roomCode.textContent = activeCode;
    setHostStatus("Kod hazır. Kopyalayabilir veya kanalı açabilirsin.");
  } catch (e) {
    console.error("[alltoall createRoom]", e);
    activeCode = "";
    if (roomCode) roomCode.textContent = "------";
    setHostStatus("Kanal oluşturulamadı");
    alert(e?.message || "Oda oluşturulamadı");
  }
}

async function copyCode() {
  if (!activeCode) return;

  try {
    await navigator.clipboard.writeText(activeCode);
    setHostStatus("Kod kopyalandı");
  } catch {
    alert("Kod kopyalanamadı");
  }
}

function goHostRoom() {
  if (!activeCode) {
    alert("Önce kanal oluştur");
    return;
  }

  location.href =
    `/pages/alltoall_room.html?host=${encodeURIComponent(activeCode)}&role=host`;
}

function joinRoom() {
  const code = cleanCode(roomInput?.value || "");

  if (!code) {
    alert("Kod gir");
    roomInput?.focus();
    return;
  }

  location.href =
    `/pages/alltoall_room.html?host=${encodeURIComponent(code)}&role=guest`;
}

function bind() {
  setMode("home");

  goHost?.addEventListener("click", async () => {
    setMode("host");
    await createRoom();
  });

  goGuest?.addEventListener("click", () => {
    setMode("join");
    setTimeout(() => roomInput?.focus(), 80);
  });

  btnBackHost?.addEventListener("click", () => setMode("home"));
  btnBackJoin?.addEventListener("click", () => setMode("home"));

  btnGoCall?.addEventListener("click", goHostRoom);
  btnCopy?.addEventListener("click", copyCode);
  btnJoin?.addEventListener("click", joinRoom);

  roomInput?.addEventListener("input", () => {
    roomInput.value = cleanCode(roomInput.value);
  });

  roomInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      joinRoom();
    }
  });
}

bind();
