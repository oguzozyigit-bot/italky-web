import { mountShell } from "/js/ui_shell.js";

const API_BASE = "https://italky-api.onrender.com";

mountShell({ scroll: "auto" });

const $ = (id) => document.getElementById(id);
const qrBox = $("qrBox");
const pairDot = $("pairDot");
const pairText = $("pairText");
const cancelBtn = $("cancelBtn");

function getParams(){
  const u = new URL(location.href);
  return {
    room: (u.searchParams.get("room") || "").trim(),
    my: (u.searchParams.get("my") || "tr").trim(),
    joinUrl: (u.searchParams.get("join_url") || "").trim()
  };
}

function renderQr(url){
  // pratik gerçek QR
  const img = document.createElement("img");
  img.alt = "Join QR";
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;
  qrBox.innerHTML = "";
  qrBox.appendChild(img);
}

async function pollRoom(){
  const p = getParams();

  try{
    const r = await fetch(`${API_BASE}/api/interpreter/room/${encodeURIComponent(p.room)}`);
    const j = await r.json().catch(()=>null);
    if(!r.ok || !j?.status) return;

    if(j.status === "active" && j.guest_lang){
      pairDot.classList.add("ok");
      pairText.textContent = "Karşı taraf bağlandı. Canlı odaya geçiliyor...";

      const q = new URLSearchParams({
        room: p.room,
        my: p.my,
        peer: j.guest_lang,
        role: "host"
      });

      setTimeout(()=>{
        location.href = `/pages/interpreter_live.html?${q.toString()}`;
      }, 500);
    }
  }catch{}
}

cancelBtn?.addEventListener("click", ()=>{
  location.href = "/pages/interpreter.html";
});

const p = getParams();
renderQr(p.joinUrl || `https://italky.ai/pages/interpreter_qr_scan.html?room=${encodeURIComponent(p.room)}`);
setInterval(pollRoom, 1200);
pollRoom();
