import { mountShell } from "/js/ui_shell.js";

const API_BASE = "https://italky-api.onrender.com";

mountShell({ scroll: "auto" });

const $ = (id) => document.getElementById(id);
const camera = $("camera");
const cancelBtn = $("cancelBtn");

let stream = null;
let detector = null;
let busy = false;

function getParams(){
  const u = new URL(location.href);
  return {
    my: (u.searchParams.get("my") || "tr").trim(),
    room: (u.searchParams.get("room") || "").trim()
  };
}

async function startCamera(){
  stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" },
    audio: false
  });
  camera.srcObject = stream;
}

function stopCamera(){
  try{
    stream?.getTracks?.().forEach(t => t.stop());
  }catch{}
}

function extractRoomFromValue(value){
  try{
    const u = new URL(value);
    return (u.searchParams.get("room") || "").trim();
  }catch{
    return "";
  }
}

async function joinRoom(roomId){
  if(busy) return;
  busy = true;

  const p = getParams();

  const r = await fetch(`${API_BASE}/api/interpreter/join-room`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({
      room_id: roomId,
      my_lang: p.my
    })
  });

  const j = await r.json().catch(()=>null);

  if(!r.ok || !j?.ok){
    busy = false;
    return;
  }

  stopCamera();

  const roomInfo = await fetch(`${API_BASE}/api/interpreter/room/${encodeURIComponent(roomId)}`)
    .then(x => x.json())
    .catch(()=>null);

  const peer = roomInfo?.host_lang || "tr";

  const q = new URLSearchParams({
    room: roomId,
    my: p.my,
    peer,
    role: "guest"
  });

  location.href = `/pages/interpreter_live.html?${q.toString()}`;
}

async function scanLoop(){
  if(!("BarcodeDetector" in window)){
    alert("Bu cihazda QR tarama desteklenmiyor.");
    return;
  }

  detector = new BarcodeDetector({ formats: ["qr_code"] });

  async function tick(){
    try{
      const codes = await detector.detect(camera);
      if(codes?.length){
        const raw = String(codes[0].rawValue || "").trim();
        const roomId = extractRoomFromValue(raw);
        if(roomId){
          await joinRoom(roomId);
          return;
        }
      }
    }catch{}

    if(!busy) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

cancelBtn?.addEventListener("click", ()=>{
  stopCamera();
  location.href = "/pages/interpreter.html";
});

startCamera().then(scanLoop).catch(()=>{
  alert("Kamera açılamadı.");
});
