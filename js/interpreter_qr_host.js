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
    room: String(p.get("room") || "").trim(),
    my: String(p.get("my") || "tr").trim(),
    host: String(p.get("host") || "").trim(),
    joinUrl: String(p.get("join_url") || "").trim(),
  };
}

function buildJoinUrl({ room, my, host, joinUrl }) {
  if (joinUrl) return joinUrl;

  const url = new URL("/pages/interpreter_live.html", location.origin);
  if (room) url.searchParams.set("room", room);
  if (my) url.searchParams.set("my", my);
  if (host) url.searchParams.set("host", host);
  url.searchParams.set("role", "host");
  return url.toString();
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
    qrBox.innerHTML = `
      <div style="
        width:100%;
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        padding:14px;
        text-align:center;
        color:#111;
        font:700 12px Outfit, sans-serif;
        word-break:break-all;
      ">
        QR oluşturulamadı.<br><br>${text}
      </div>
    `;
  }
}

async function fetchRoomInfo(roomId) {
  const r = await fetch(`${API_BASE}/api/interpreter/room/${encodeURIComponent(roomId)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  });

  const j = await r.json().catch(() => null);

  if (!r.ok || !j) {
    throw new Error(j?.error || "room_fetch_failed");
  }

  return j;
}

function isGuestConnected(info) {
  if (!info || typeof info !== "object") return false;

  // olabildiğince geniş kontrol
  return !!(
    info.guest_lang ||
    info.peer_lang ||
    info.guest_connected === true ||
    info.joined === true ||
    info.guest === true ||
    info.guest_joined_at ||
    info.peer_joined_at ||
    info.guest_user_id ||
    info.peer_user_id ||
    info.member_count >= 2 ||
    info.participant_count >= 2 ||
    (Array.isArray(info.members) && info.members.length >= 2) ||
    (Array.isArray(info.participants) && info.participants.length >= 2) ||
    (info.room && (
      info.room.guest_lang ||
      info.room.peer_lang ||
      info.room.guest_connected === true ||
      info.room.member_count >= 2 ||
      info.room.participant_count >= 2
    ))
  );
}

async function watchPairing({ room, my, host, joinUrl }) {
  const roomId = String(room || "").trim();
  const roomUrl = buildJoinUrl({ room, my, host, joinUrl });

  if (!roomId) return;

  let stopped = false;
  let moved = false;
  let tries = 0;

  async function checkRoom() {
    if (stopped || moved) return false;

    try {
      const info = await fetchRoomInfo(roomId);
      console.log("[HOST ROOM INFO]", info);

      if (isGuestConnected(info)) {
        setPairedUI();
        moved = true;

        setTimeout(() => {
          location.href = roomUrl;
        }, 700);

        return true;
      }

      tries += 1;
      if (tries % 3 === 0) {
        setWaitingUI("Karşı taraf bağlanıyor...");
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
  const params = getParams();
  const finalJoinUrl = buildJoinUrl(params);

  if (!params.room && !params.host && !params.joinUrl) {
    qrBox.innerHTML = `
      <div style="
        width:100%;
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        color:#111;
        font:800 13px Outfit, sans-serif;
        padding:18px;
      ">
        Geçerli Interpreter bilgisi bulunamadı.
      </div>
    `;
    if (pairText) pairText.textContent = "QR hazırlanamadı.";
    return;
  }

  setWaitingUI();
  await renderQr(finalJoinUrl);
  await watchPairing(params);

  cancelBtn?.addEventListener("click", () => {
    location.href = "/pages/interpreter.html";
  });
}

init();
