// FILE: /js/interpreter_page.js

const API_BASE = "https://italky-api.onrender.com/api";
const JOIN_PAGE_BASE = "https://italky.ai/pages/interpreter_join.html";

const btnGenerate = document.getElementById("btn-generate");
const myLangSelect = document.getElementById("my-lang");
const setupArea = document.getElementById("setup-area");
const qrContainer = document.getElementById("qr-container");
const qrCodeDiv = document.getElementById("qr-code");
const statusText = document.getElementById("status-text");

const statusDot = document.getElementById("status-dot");
const roomIdText = document.getElementById("room-id-text");
const roomStateText = document.getElementById("room-state-text");

let pollingInterval = null;

function setStatus(text, mode = "waiting") {
  if (statusText) statusText.innerText = text;

  if (statusDot) {
    statusDot.classList.remove("ok", "err");
    if (mode === "ok") statusDot.classList.add("ok");
    if (mode === "err") statusDot.classList.add("err");
  }

  if (roomStateText) {
    roomStateText.textContent =
      mode === "ok" ? "active" :
      mode === "err" ? "error" :
      "waiting";
  }
}

function clearPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

function getSelectedLang() {
  return String(myLangSelect?.value || "tr").trim().toLowerCase();
}

function buildJoinUrl(roomId) {
  return `${JOIN_PAGE_BASE}?room=${encodeURIComponent(roomId)}&v=1`;
}

function buildQrUrl(joinUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=10&data=${encodeURIComponent(joinUrl)}`;
}

async function createRoom(myLang) {
  const payload = { my_lang: myLang };

  console.log("CREATE ROOM REQUEST:", payload);
  setStatus(`API çağrılıyor... dil: ${myLang}`, "waiting");

  const response = await fetch(`${API_BASE}/interpreter/create-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const rawText = await response.text();
  console.log("CREATE ROOM RAW RESPONSE:", rawText);

  let data = null;
  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(`JSON parse edilemedi: ${rawText}`);
  }

  if (!response.ok || !data?.ok || !data?.room_id) {
    throw new Error(data?.detail || data?.error || rawText || "room_create_failed");
  }

  return data;
}

function displayQR(roomId) {
  const joinUrl = buildJoinUrl(roomId);
  const qrApiUrl = buildQrUrl(joinUrl);

  if (setupArea) setupArea.classList.add("hidden");
  if (qrContainer) qrContainer.classList.add("show");

  if (qrCodeDiv) {
    qrCodeDiv.innerHTML = `<img src="${qrApiUrl}" alt="Interpreter QR Code">`;
  }

  if (roomIdText) roomIdText.textContent = roomId;
  if (roomStateText) roomStateText.textContent = "waiting";

  setStatus(`Room oluştu: ${roomId}`, "ok");

  console.log("ROOM ID:", roomId);
  console.log("JOIN URL:", joinUrl);
}

function redirectHostToLive(roomId, hostLang, guestLang) {
  const url = new URL("/pages/live_interpreter.html", location.origin);
  url.searchParams.set("room", roomId);
  url.searchParams.set("role", "host");
  url.searchParams.set("my", hostLang);
  url.searchParams.set("peer", guestLang || "en");
  window.location.href = url.toString();
}

function startPolling(roomId, hostLang) {
  clearPolling();

  pollingInterval = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/interpreter/room/${encodeURIComponent(roomId)}`);
      const raw = await res.text();
      console.log("ROOM POLL RAW:", raw);

      let roomData = null;
      try {
        roomData = JSON.parse(raw);
      } catch {
        return;
      }

      if (!res.ok || !roomData?.ok) {
        return;
      }

      if (roomStateText) {
        roomStateText.textContent = String(roomData.status || "waiting");
      }

      if (roomData.status === "active" && roomData.guest_lang) {
        clearPolling();
        setStatus("Guest bağlandı. Live ekrana geçiliyor...", "ok");

        setTimeout(() => {
          redirectHostToLive(
            roomId,
            String(hostLang || "tr").trim().toLowerCase(),
            String(roomData.guest_lang || "en").trim().toLowerCase()
          );
        }, 900);
      }
    } catch (e) {
      console.error("Polling hatası:", e);
    }
  }, 1500);
}

async function handleCreateClick() {
  const selectedLang = getSelectedLang();

  if (!btnGenerate) return;

  btnGenerate.disabled = true;
  setStatus("Oda oluşturuluyor...", "waiting");

  try {
    const data = await createRoom(selectedLang);
    const roomId = String(data.room_id || "").trim();

    if (!roomId) {
      throw new Error("room_id_missing");
    }

    displayQR(roomId);
    startPolling(roomId, selectedLang);
  } catch (error) {
    console.error("Interpreter create error:", error);
    setStatus(`Oda oluşmadı: ${error.message || error}`, "err");
    if (roomIdText) roomIdText.textContent = "yok";
    btnGenerate.disabled = false;
  }
}

btnGenerate?.addEventListener("click", handleCreateClick);

window.addEventListener("beforeunload", () => {
  clearPolling();
});
