// FILE: /js/interpreter_qr_scan.js

import { mountShell } from "/js/ui_shell.js";

mountShell({ scroll: "auto" });

const $ = (id) => document.getElementById(id);
const camera = $("camera");
const cancelBtn = $("cancelBtn");

let stream = null;
let detector = null;
let busy = false;

function extractRoomFromValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const u = new URL(raw);
    return String(u.searchParams.get("room") || "").trim();
  } catch {
    return "";
  }
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

async function goJoin(roomId) {
  if (busy) return;
  busy = true;

  stopCamera();

  const q = new URLSearchParams({
    room: roomId,
    v: "1"
  });

  location.href = `/pages/interpreter_join.html?${q.toString()}`;
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
        const roomId = extractRoomFromValue(raw);

        if (roomId) {
          await goJoin(roomId);
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
