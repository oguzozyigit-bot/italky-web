// FILE: /js/alltoall_lobby.js

import { mountShell } from "/js/ui_shell.js";

try {
  mountShell({ scroll: "auto" });
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
let activeRoomId = "";
let busy = false;

function setMode(mode) {
  homeCards?.classList.toggle("hide", mode !== "home");
  hostPanel?.classList.toggle("hide", mode !== "host");
  joinPanel?.classList.toggle("hide", mode !== "join");
}

function setHostStatus(text, isError = false) {
  if (!hostStatus) return;
  hostStatus.textContent = String(text || "").trim();
  hostStatus.style.color = isError ? "#ff8ca8" : "var(--accent)";
}

function resetHostState() {
  activeCode = "";
  activeRoomId = "";
  if (roomCode) roomCode.textContent = "------";
  setHostStatus("Kısa kod hazır olduğunda burada görünecek");
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
  if (busy) return;
  busy = true;

  try {
    const shortCode = makeShortCode(6);

    setMode("host");
    resetHostState();
    setHostStatus("Kanal hazırlanıyor...");

    const r = await fetch(`${API_BASE}/interpreter/create-room`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host_code: shortCode,
        my_lang: "tr",
        mode: "alltoall"
      })
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok || !j?.room_id) {
      throw new Error(j?.detail || j?.error || "Oda oluşturulamadı");
    }

    activeRoomId = String(j.room_id || "").trim().toUpperCase();
    activeCode = cleanCode(j.host_code || shortCode);

    if (!activeRoomId) {
      throw new Error("room_id boş geldi");
    }

    if (!activeCode) {
      throw new Error("host_code boş geldi");
    }

    if (roomCode) roomCode.textContent = activeCode;
    setHostStatus("Kanal hazır. Odaya geçiliyor...");

    localStorage.setItem("alltoall_last_room_id", activeRoomId);
    localStorage.setItem("alltoall_last_host_code", activeCode);

    return { roomId: activeRoomId, code: activeCode };
  } finally {
    busy = false;
  }
}

async function copyCode() {
  if (!activeCode) {
    alert("Önce kanal oluştur");
    return;
  }

  try {
    await navigator.clipboard.writeText(activeCode);
    setHostStatus("Kod kopyalandı");
  } catch (e) {
    console.warn("[alltoall copyCode]", e);
    alert("Kod kopyalanamadı");
  }
}

function goHostRoom() {
  if (!activeCode || !activeRoomId) {
    alert("Önce kanal oluştur");
    return;
  }

  location.href =
    `/pages/alltoall_room.html?room=${encodeURIComponent(activeRoomId)}&host=${encodeURIComponent(activeCode)}&role=host`;
}

function joinRoom() {
  const code = cleanCode(roomInput?.value || "");

  if (code.length !== 6) {
    alert("6 haneli kod gir");
    roomInput?.focus();
    return;
  }

  location.href =
    `/pages/alltoall_room.html?host=${encodeURIComponent(code)}&role=guest`;
}

function bind() {
  setMode("home");
  resetHostState();

  goHost?.addEventListener("click", async () => {
    if (busy) return;

    try {
      const created = await createRoom();
      if (created?.roomId && created?.code) {
        goHostRoom();
      } else {
        throw new Error("Oda bilgisi eksik geldi");
      }
    } catch (e) {
      console.error("[alltoall createRoom]", e);
      resetHostState();
      setMode("home");
      setHostStatus("Kanal oluşturulamadı", true);
      alert(e?.message || "Oda oluşturulamadı");
    }
  });

  goGuest?.addEventListener("click", () => {
    setMode("join");
    setTimeout(() => roomInput?.focus(), 120);
  });

  btnBackHost?.addEventListener("click", () => {
    resetHostState();
    setMode("home");
  });

  btnBackJoin?.addEventListener("click", () => {
    setMode("home");
  });

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
