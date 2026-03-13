// FILE: /js/live_interpreter_page.js

import { LANG_POOL } from "/js/lang_pool_full.js";

const $ = (id) => document.getElementById(id);

/* =========================
   API / WS
========================= */

const API_BASE = "https://italky-api.onrender.com";
const WS_BASE = "wss://italky-api.onrender.com/api";

/* =========================
   DOM
========================= */

const chatLog = $("chat-log");
const statusDot = $("status-dot");
const wsStatus = $("ws-status");
const emptyState = $("empty-state");

/* =========================
   URL PARAMS
========================= */

const query = new URLSearchParams(location.search);

const roomId = String(query.get("room") || "").trim();
const hostCode = String(query.get("host") || "").trim();
const role = String(query.get("role") || "guest").trim().toLowerCase();

let myLang = String(query.get("my") || "tr").trim().toLowerCase();
let peerLang = String(query.get("peer") || "en").trim().toLowerCase();

/* =========================
   STATE
========================= */

let ws = null;
let wsReady = false;

/* =========================
   UTILS
========================= */

function setStatus(state, text){

  if(!statusDot || !wsStatus) return;

  statusDot.classList.remove("ok","err");

  if(state === "ok") statusDot.classList.add("ok");
  if(state === "err") statusDot.classList.add("err");

  wsStatus.textContent = text || "";
}

function addSystem(text){

  if(!chatLog) return;

  if(emptyState) emptyState.remove();

  const row = document.createElement("div");
  row.className = "sys-msg";
  row.textContent = text;

  chatLog.appendChild(row);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function addMessage(text, side){

  if(!chatLog) return;

  if(emptyState) emptyState.remove();

  const row = document.createElement("div");

  row.className = "msg " + (side === "host" ? "host-msg" : "guest-msg");

  row.textContent = text;

  chatLog.appendChild(row);
  chatLog.scrollTop = chatLog.scrollHeight;
}

/* =========================
   WS URL
========================= */

function wsUrl(){

  if(roomId){
    return `${WS_BASE}/ws/interpreter/${encodeURIComponent(roomId)}?role=${role}&lang=${myLang}`;
  }

  if(hostCode){
    return `${WS_BASE}/ws/interpreter/${encodeURIComponent(hostCode)}?role=${role}&lang=${myLang}`;
  }

  return null;
}

/* =========================
   SOCKET
========================= */

function startSocket(){

  const url = wsUrl();

  if(!url){
    setStatus("err","Room bilgisi yok");
    return;
  }

  try{
    ws = new WebSocket(url);
  }catch(e){
    console.error(e);
    setStatus("err","WebSocket açılamadı");
    return;
  }

  setStatus("","WebSocket bağlanıyor...");

  ws.onopen = () => {

    wsReady = true;

    setStatus("ok","Bağlantı kuruldu");

    addSystem("Bağlantı hazır");

  };

  ws.onmessage = (event) => {

    try{

      const payload = JSON.parse(event.data);

      const type = payload.type;

      if(type === "presence"){
        addSystem("Odaya bağlantı kuruldu");
        return;
      }

      if(type === "peer_joined"){
        addSystem("Karşı taraf bağlandı");
        return;
      }

      if(type === "translated_message"){

        const sender = payload.sender;
        const text = payload.translated_text;

        addMessage(text, sender);

        return;
      }

      if(type === "peer_left"){
        addSystem("Karşı taraf ayrıldı");
        return;
      }

      if(type === "pong"){
        return;
      }

      if(type === "error"){
        console.warn(payload);
        setStatus("err", payload.message || "Sunucu hatası");
      }

    }catch(e){
      console.warn("WS parse error",e);
    }

  };

  ws.onerror = () => {

    wsReady = false;
    setStatus("err","WebSocket hata verdi");

  };

  ws.onclose = () => {

    wsReady = false;

    setStatus("err","Bağlantı kapandı");

  };

}

/* =========================
   BOOT
========================= */

function boot(){

  if(roomId){
    addSystem("Room hazır • " + roomId);
  }
  else if(hostCode){
    addSystem("Host hazır • " + hostCode);
  }
  else{
    addSystem("Bağlantı hazırlanıyor...");
  }

  startSocket();

}

boot();
