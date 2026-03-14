// FILE: /js/alltoall_lobby.js

import { mountShell } from "/js/ui_shell.js";

try { mountShell({ scroll: "none" }); } catch(e){}

const API_BASE = "https://italky-api.onrender.com/api";

const $ = (id)=>document.getElementById(id);

const goHost = $("goHost");
const goGuest = $("goGuest");

const hostPanel = $("hostPanel");
const joinPanel = $("joinPanel");
const homeCards = $("homeCards");

const qrImg = $("qrImg");
const roomCode = $("roomCode");

const btnGoCall = $("btnGoCall");
const btnCopy = $("btnCopy");
const btnJoin = $("btnJoin");
const roomInput = $("roomInput");

const btnBackHost = $("btnBackHost");
const btnBackJoin = $("btnBackJoin");

let activeRoom = "";

function setMode(mode){

  homeCards.classList.toggle("hide",mode!=="home");
  hostPanel.classList.toggle("hide",mode!=="host");
  joinPanel.classList.toggle("hide",mode!=="join");

}

async function createRoom(){

  const r = await fetch(`${API_BASE}/interpreter/create-room`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({
      host_code:"ALLTOALL",
      my_lang:"tr",
      mode:"interpreter"
    })
  });

  const j = await r.json().catch(()=>({}));

  if(!r.ok || !j?.room_id){
    alert("Oda oluşturulamadı");
    return;
  }

  activeRoom = j.room_id;

  roomCode.textContent = activeRoom;

  const joinUrl = `${location.origin}/pages/alltoall_room.html?room=${activeRoom}&role=guest`;

  qrImg.src =
    "https://api.qrserver.com/v1/create-qr-code/?size=260x260&data="
    + encodeURIComponent(joinUrl);

}

function copyCode(){

  if(!activeRoom) return;

  navigator.clipboard.writeText(activeRoom)
  .then(()=>alert("Kod kopyalandı"));

}

function goHostRoom(){

  if(!activeRoom) return;

  location.href =
    `/pages/alltoall_room.html?room=${activeRoom}&role=host`;

}

function joinRoom(){

  const code = String(roomInput.value||"")
  .trim()
  .toUpperCase();

  if(!code){
    alert("Kod gir");
    return;
  }

  location.href =
    `/pages/alltoall_room.html?room=${code}&role=guest`;

}

function bind(){

  goHost.onclick = async()=>{
    setMode("host");
    await createRoom();
  };

  goGuest.onclick = ()=>{
    setMode("join");
  };

  btnBackHost.onclick = ()=>setMode("home");
  btnBackJoin.onclick = ()=>setMode("home");

  btnGoCall.onclick = goHostRoom;
  btnCopy.onclick = copyCode;
  btnJoin.onclick = joinRoom;

}

bind();
