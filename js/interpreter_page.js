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
// --- SALLA-BAĞLAN YAMASI BAŞLANGIÇ ---
import { apiShakeMatch } from "/js/api.js"; // Az önce güncellediğimiz api.js'den çekiyoruz

let isShaking = false;
const SHAKE_THRESHOLD = 15;
let lastShakeTime = 0;

// 1. Hareket Sensörünü Başlat
if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', (event) => {
        const acc = event.accelerationIncludingGravity;
        if (!acc) return;

        const curTime = Date.now();
        if ((curTime - lastShakeTime) > 100) {
            const diffTime = curTime - lastShakeTime;
            lastShakeTime = curTime;

            const speed = Math.abs(acc.x + acc.y + acc.z) / diffTime * 10000;

            if (speed > SHAKE_THRESHOLD && !isShaking) {
                isShaking = true;
                handleShakeLogic();
                // 3 saniye koruma (üst üste tetiklenmesin)
                setTimeout(() => { isShaking = false; }, 3000);
            }
        }
    });
}

// 2. Sallama Mantığı
async function handleShakeLogic() {
    setStatus("Sallama algılandı! Yakınlarda cihaz aranıyor...", "waiting");
    
    // Titreşimle geri bildirim ver (Hissiyat önemli)
    if (navigator.vibrate) navigator.vibrate(200);

    navigator.geolocation.getCurrentPosition(async (pos) => {
        try {
            // Backend'deki Radara sor: "Kimse var mı?"
            const data = await apiShakeMatch(
                "user_" + Math.floor(Math.random() * 1000), // Geçici ID veya gerçek UserID
                pos.coords.latitude,
                pos.coords.longitude
            );

            if (data.status === 'matched') {
                setStatus("Eşleşme Sağlandı! Bağlanılıyor...", "ok");
                // Eğer bir eşleşme varsa, doğrudan o odaya yönlendir veya oda kur
                // Not: Burada peer_id ile doğrudan live ekrana geçiş tetiklenebilir
            } else {
                // KİMSE YOKSA: Otomatik QR Oluştur (Senin mevcut fonksiyonun)
                setStatus("Yakınlarda kimse yok. QR kod oluşturuluyor...", "waiting");
                handleCreateClick(); 
            }
        } catch (err) {
            console.error("Shake Match Fail:", err);
            handleCreateClick(); // Hata olursa normal sürece dön
        }
    }, () => {
        // Konum kapalıysa normal QR sürecine dön
        handleCreateClick();
    });
}
// --- SALLA-BAĞLAN YAMASI BİTİŞ ---
