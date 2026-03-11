// FILE: /js/interpreter_qr_host.js
import { mountShell } from "/js/ui_shell.js";

const API_BASE = "https://italky-api.onrender.com";

mountShell({ scroll: "auto" });

const $ = (id) => document.getElementById(id);

const qrBox = $("qrBox");
const pairDot = $("pairDot");
const pairText = $("pairText");
const cancelBtn = $("cancelBtn");

function getParams() {
  const p = new URLSearchParams(location.search);
  return {
    my: String(p.get("my") || "tr").trim().toLowerCase(),
    host: String(p.get("host") || "").trim()
  };
}

function setWaitingUI(text = "Karşı taraf bekleniyor...") {
  pairDot?.classList.remove("ok");
  if (pairText) pairText.textContent = text;
}

function setPairedUI() {
  pairDot?.classList.add("ok");
  if (pairText) pairText.textContent = "Bağlantı kuruldu. Odaya geçiliyor...";
}

async function loadQrLibrary() {
  if (window.QRCode) return window.QRCode;

  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });

  return window.QRCode;
}

async function renderQr(text) {
  if (!qrBox) return;
  qrBox.innerHTML = "";

  try {
    const QRCode = await loadQrLibrary();
    new QRCode(qrBox, {
      text,
      width: 220,
      height: 220,
      colorDark: "#111111",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (e) {
    console.error("[qr render]", e);
    qrBox.innerHTML = `<div style="padding:14px;color:#111;text-align:center;font:700 12px Outfit,sans-serif;word-break:break-all;">QR oluşturulamadı.<br><br>${text}</div>`;
  }
}

async function createRoom(myLang) {
  const r = await fetch(`${API_BASE}/interpreter/create-room`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ my_lang: myLang || "tr" })
  });

  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok || !j?.room_id) {
    throw new Error(j?.detail || j?.error || "room_create_failed");
  }
  return j;
}

async function fetchRoomInfo(roomId) {
  const r = await fetch(`${API_BASE}/interpreter/room/${encodeURIComponent(roomId)}`);
  const j = await r.json().catch(() => null);

  if (!r.ok || !j?.ok) {
    throw new Error(j?.detail || j?.error || "room_fetch_failed");
  }
  return j;
}

function buildGuestJoinUrl(roomId) {
  const url = new URL("/pages/interpreter_join.html", location.origin);
  url.searchParams.set("room", roomId);
  url.searchParams.set("v", "1");
  return url.toString();
}

function buildHostLiveUrl(roomId, hostCode, myLang, guestLang) {
  const url = new URL("/pages/live_interpreter.html", location.origin);
  url.searchParams.set("room", roomId);
  if (hostCode) url.searchParams.set("host", hostCode);
  url.searchParams.set("role", "host");
  url.searchParams.set("my", myLang || "tr");
  url.searchParams.set("peer", guestLang || "en");
  return url.toString();
}

async function watchPairing(roomId, hostCode, myLang) {
  let stopped = false;
  let moved = false;

  async function checkRoom() {
    if (stopped || moved) return false;

    try {
      const info = await fetchRoomInfo(roomId);
      console.log("[HOST ROOM INFO]", info);

      if (info?.status === "active" && info?.guest_lang) {
        setPairedUI();
        moved = true;

        const liveUrl = buildHostLiveUrl(
          roomId,
          hostCode,
          myLang,
          String(info.guest_lang || "en").trim().toLowerCase()
        );

        setTimeout(() => {
          location.href = liveUrl;
        }, 700);

        return true;
      }
    } catch (e) {
      console.warn("[pair check]", e);
    }
    return false;
  }

  if (await checkRoom()) return;

  const timer = setInterval(async () => {
    const done = await checkRoom();
    if (done) {
      clearInterval(timer);
      stopped = true;
    }
  }, 1200);

  window.addEventListener("beforeunload", () => {
    stopped = true;
    clearInterval(timer);
  });
}

async function init() {
  const { my, host } = getParams();

  try {
    setWaitingUI("Oda hazırlanıyor...");

    const room = await createRoom(my);
    const roomId = String(room.room_id || "").trim();
    if (!roomId) throw new Error("room_id_missing");

    const qrTarget = buildGuestJoinUrl(roomId);
    await renderQr(qrTarget);

    setWaitingUI("Karşı taraf bekleniyor...");
    await watchPairing(roomId, host, my);
  } catch (e) {
    console.error("[interpreter_qr_host]", e);

    if (qrBox) {
      qrBox.innerHTML = `<div style="padding:18px;color:#111;text-align:center;font:800 13px Outfit,sans-serif;">Oda oluşturulamadı.</div>`;
    }
    if (pairText) pairText.textContent = "Bağlantı hazırlanamadı.";
  }

  cancelBtn?.addEventListener("click", () => {
    location.href = "/pages/interpreter.html";
  });
}

init();
