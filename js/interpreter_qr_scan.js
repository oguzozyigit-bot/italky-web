import { mountShell } from "/js/ui_shell.js";

const API_BASE = "https://italky-api.onrender.com";

mountShell({ scroll: "auto" });

const $ = (id) => document.getElementById(id);
const camera = $("camera");
const cancelBtn = $("cancelBtn");

let stream = null;
let detector = null;
let busy = false;

function getParams() {
  const u = new URL(location.href);
  return {
    my: (u.searchParams.get("my") || "tr").trim(),
    room: (u.searchParams.get("room") || "").trim(),
    selfHost: (u.searchParams.get("self_host") || "").trim()
  };
}

async function startCamera() {
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" },
    audio: false
  });
  camera.srcObject = stream;
}

function stopCamera() {
  try {
    stream?.getTracks?.().forEach((t) => t.stop());
  } catch {}
}

function extractPayloadFromValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return { roomId: "", hostCode: "" };

  try {
    const u = new URL(raw);

    const hostCode = (u.searchParams.get("host") || "").trim();
    const roomId = (u.searchParams.get("room") || "").trim();

    return { roomId, hostCode };
  } catch {
    return { roomId: "", hostCode: "" };
  }
}

async function joinRoom(roomId, hostCode) {
  if (busy) return;
  busy = true;

  const p = getParams();

  try {
    // Yeni sistem: host kod varsa direkt live_interpreter'a git
    if (hostCode) {
      stopCamera();

      const q = new URLSearchParams({
        host: hostCode,
        my: p.my,
        role: "guest"
      });

      location.href = `/pages/live_interpreter.html?${q.toString()}`;
      return;
    }

    // Eski sistem fallback: room ile join-room
    if (!roomId) {
      busy = false;
      return;
    }

    const r = await fetch(`${API_BASE}/api/interpreter/join-room`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_id: roomId,
        my_lang: p.my
      })
    });

    const j = await r.json().catch(() => null);

    if (!r.ok || !j?.ok) {
      busy = false;
      return;
    }

    stopCamera();

    const roomInfo = await fetch(`${API_BASE}/api/interpreter/room/${encodeURIComponent(roomId)}`)
      .then((x) => x.json())
      .catch(() => null);

    const peer = roomInfo?.host_lang || "tr";
    const host = roomInfo?.host_code || "";

    const q = new URLSearchParams({
      room: roomId,
      my: p.my,
      peer,
      role: "guest",
      host
    });

    location.href = `/pages/live_interpreter.html?${q.toString()}`;
  } catch (e) {
    console.error("[joinRoom]", e);
    busy = false;
  }
}

async function scanLoop() {
  if (!("BarcodeDetector" in window)) {
    alert("Bu cihazda QR tarama desteklenmiyor.");
    return;
  }

  detector = new BarcodeDetector({ formats: ["qr_code"] });

  async function tick() {
    try {
      const codes = await detector.detect(camera);

      if (codes?.length) {
        const raw = String(codes[0].rawValue || "").trim();
        const payload = extractPayloadFromValue(raw);

        if (payload.hostCode || payload.roomId) {
          await joinRoom(payload.roomId, payload.hostCode);
          return;
        }
      }
    } catch {}

    if (!busy) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

cancelBtn?.addEventListener("click", () => {
  stopCamera();
  location.href = "/pages/interpreter.html";
});

startCamera()
  .then(scanLoop)
  .catch(() => {
    alert("Kamera açılamadı.");
  });
