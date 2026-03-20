const API_BASE = "https://italky-api.onrender.com/api";
const JOIN_PAGE_BASE = "https://italky.ai/pages/interpreter_join.html";

const btnGenerate = document.getElementById("btn-generate");
const btnShake = document.getElementById("btn-shake");
const btnGuest = document.getElementById("btn-guest-link");

const myLangSelect = document.getElementById("my-lang");
const setupArea = document.getElementById("setup-area");
const qrContainer = document.getElementById("qr-container");
const qrCodeDiv = document.getElementById("qr-code");
const statusText = document.getElementById("status-text");

const statusDot = document.getElementById("status-dot");
const roomIdText = document.getElementById("room-id-text");
const roomStateText = document.getElementById("room-state-text");

let pollingInterval = null;
let shakePollingTimer = null;
let isShakeArmed = false;
let isShakingBusy = false;
let lastShakeAt = 0;
let lastMagnitude = 0;
let lastMotionSampleAt = 0;
let currentShakeSearchId = null;

const SHAKE_THRESHOLD = 15;
const SHAKE_COOLDOWN_MS = 2500;
const SHAKE_POLL_TIMEOUT_MS = 6500;

const USER_ID_KEY = "italky_shake_user_id_v1";

function getStableUserId() {
  let value = localStorage.getItem(USER_ID_KEY);
  if (!value) {
    value = "u_" + Math.random().toString(36).slice(2, 12);
    localStorage.setItem(USER_ID_KEY, value);
  }
  return value;
}

const STABLE_USER_ID = getStableUserId();

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

function clearShakePolling() {
  if (shakePollingTimer) {
    clearTimeout(shakePollingTimer);
    shakePollingTimer = null;
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

function redirectShakeMatchedToLive(roomId, myLang, peerLang, role) {
  const finalRole = String(role || "guest").trim().toLowerCase();
  const url = new URL("/pages/live_interpreter.html", location.origin);
  url.searchParams.set("room", roomId);
  url.searchParams.set("role", finalRole);
  url.searchParams.set("my", String(myLang || "tr").trim().toLowerCase());
  url.searchParams.set("peer", String(peerLang || "en").trim().toLowerCase());
  url.searchParams.set("auto", "1");
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

// ===============================
// SHAKE API
// ===============================

async function apiShakeMatch(userId, lat, lon, myLang) {
  const response = await fetch(`${API_BASE}/italky/shake-match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      user_id: userId,
      lat,
      lon,
      my_lang: myLang
    })
  });

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`shake-match JSON parse hatası: ${raw}`);
  }

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || "shake_match_failed");
  }

  return data;
}

async function apiShakeStatus(searchId, userId) {
  const response = await fetch(
    `${API_BASE}/italky/shake-status/${encodeURIComponent(searchId)}?user_id=${encodeURIComponent(userId)}`
  );

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`shake-status JSON parse hatası: ${raw}`);
  }

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || "shake_status_failed");
  }

  return data;
}

async function apiCreateGuestLink(userId, myLang) {
  const response = await fetch(
    `${API_BASE}/italky/create-guest-link?user_id=${encodeURIComponent(userId)}&my_lang=${encodeURIComponent(myLang)}`
  );

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`guest-link JSON parse hatası: ${raw}`);
  }

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || "guest_link_failed");
  }

  return data;
}

// ===============================
// SHAKE FLOW
// ===============================

function ensureMotionPermissionIfNeeded() {
  if (
    typeof DeviceMotionEvent !== "undefined" &&
    typeof DeviceMotionEvent.requestPermission === "function"
  ) {
    return DeviceMotionEvent.requestPermission();
  }
  return Promise.resolve("granted");
}

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("geolocation_not_supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos.coords),
      (err) => reject(err),
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
      }
    );
  });
}

async function armShakeMode() {
  try {
    const permission = await ensureMotionPermissionIfNeeded();
    if (permission !== "granted") {
      setStatus("Hareket sensörü izni verilmedi.", "err");
      return;
    }

    isShakeArmed = true;
    setStatus("Salla-Bağlan aktif. Telefonu sallayabilirsin.", "ok");

    if (navigator.vibrate) navigator.vibrate(80);
  } catch (e) {
    console.error("Motion permission error:", e);
    setStatus("Hareket sensörü başlatılamadı.", "err");
  }
}

async function handleShakeLogic(strength) {
  const now = Date.now();

  if (!isShakeArmed) return;
  if (isShakingBusy) return;
  if (now - lastShakeAt < SHAKE_COOLDOWN_MS) return;

  lastShakeAt = now;
  isShakingBusy = true;
  matched = false;
  clearShakePolling();

  const myLang = getSelectedLang();

  try {
    setStatus("Sallama algılandı. Konum alınıyor...", "waiting");
    if (navigator.vibrate) navigator.vibrate(120);

    const coords = await getCurrentLocation();

    setStatus("Yakındaki cihaz aranıyor...", "waiting");

    const data = await apiShakeMatch(
      STABLE_USER_ID,
      coords.latitude,
      coords.longitude,
      myLang
    );

    console.log("SHAKE MATCH RESPONSE:", data);

    if (data.status === "matched" && data.room_id) {
      setStatus("Eşleşme bulundu. Odaya geçiliyor...", "ok");
      setTimeout(() => {
        redirectShakeMatchedToLive(
          String(data.room_id),
          myLang,
          myLang === "tr" ? "en" : "tr",
          String(data.client_role || "guest")
        );
      }, 500);
      return;
    }

    if (data.status === "searching" && data.search_id) {
      currentShakeSearchId = String(data.search_id);
      setStatus("Yakınlarda cihaz aranıyor...", "waiting");
      await pollShakeMatch(currentShakeSearchId, myLang);
      return;
    }

    setStatus("Yakında kimse bulunamadı. QR oda oluşturabilirsin.", "waiting");
  } catch (err) {
    console.error("Shake Match Fail:", err);
    setStatus(`Salla-Bağlan hatası: ${err.message || err}`, "err");
  } finally {
    isShakingBusy = false;
  }
}

async function pollShakeMatch(searchId, myLang) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < SHAKE_POLL_TIMEOUT_MS) {
    await new Promise((resolve) => {
      shakePollingTimer = setTimeout(resolve, 1000);
    });

    try {
      const data = await apiShakeStatus(searchId, STABLE_USER_ID);
      console.log("SHAKE STATUS:", data);

      if (data.status === "matched" && data.room_id) {
        setStatus("Eşleşme bulundu. Odaya geçiliyor...", "ok");
        clearShakePolling();

        setTimeout(() => {
          redirectShakeMatchedToLive(
            String(data.room_id),
            myLang,
            myLang === "tr" ? "en" : "tr",
            String(data.client_role || "guest")
          );
        }, 500);
        return;
      }

      if (data.status === "not_found") {
        break;
      }
    } catch (e) {
      console.error("SHAKE POLL ERROR:", e);
      break;
    }
  }

  setStatus("Eşleşme bulunamadı. QR ile devam edebilirsin.", "waiting");
}

function handleMotionEvent(event) {
  if (!isShakeArmed) return;

  const acc = event.accelerationIncludingGravity || event.acceleration;
  if (!acc) return;

  const magnitude = Math.sqrt(
    (acc.x || 0) * (acc.x || 0) +
    (acc.y || 0) * (acc.y || 0) +
    (acc.z || 0) * (acc.z || 0)
  );

  const delta = Math.abs(magnitude - lastMagnitude);
  lastMagnitude = magnitude;

  const now = Date.now();
  if (now - lastMotionSampleAt < 120) return;
  lastMotionSampleAt = now;

  if (delta > SHAKE_THRESHOLD) {
    handleShakeLogic(delta);
  }
}

async function handleGuestLinkClick() {
  try {
    const myLang = getSelectedLang();
    const data = await apiCreateGuestLink(STABLE_USER_ID, myLang);

    if (data?.join_url) {
      await navigator.clipboard.writeText(data.join_url);
      setStatus("Misafir linki panoya kopyalandı.", "ok");
      alert("Misafir linki kopyalandı:\n" + data.join_url);
    }
  } catch (e) {
    console.error("Guest link error:", e);
    setStatus("Misafir linki üretilemedi.", "err");
  }
}

// ===============================
// INIT
// ===============================

btnGenerate?.addEventListener("click", handleCreateClick);
btnShake?.addEventListener("click", armShakeMode);
btnGuest?.addEventListener("click", handleGuestLinkClick);

window.addEventListener("devicemotion", handleMotionEvent, { passive: true });

window.addEventListener("beforeunload", () => {
  clearPolling();
  clearShakePolling();
});
