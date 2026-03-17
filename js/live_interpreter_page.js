// FILE: /js/live_interpreter_page.js

import { supabase } from "/js/supabase_client.js";

const WS_BASE = "wss://italky-api.onrender.com";

const query = new URLSearchParams(location.search);

let roomId = String(query.get("room") || "").trim();
const role = String(query.get("role") || "guest").trim().toLowerCase();
let myLang = String(query.get("my") || "tr").trim().toLowerCase();

let ws = null;
let myClientId = "";

// =========================
// CLIENT ID
// =========================

function getClientId() {
  const key = "client_id";
  let v = localStorage.getItem(key);
  if (v) return v;

  v = "cli_" + Math.random().toString(36).slice(2);
  localStorage.setItem(key, v);
  return v;
}

// =========================
// WS
// =========================

function connect() {
  ws = new WebSocket(
    `${WS_BASE}/api/ws/interpreter/${roomId}?role=${role}&lang=${myLang}`
  );

  ws.onmessage = async (e) => {
    const data = JSON.parse(e.data);

    if (data.type === "translated_message") {

      // 🔥 KRİTİK
      if (data.sender_id === myClientId) return;

      console.log("GELEN:", data.text);

      await speak(data.text);
    }
  };
}

// =========================
// SEND
// =========================

function send(text) {
  if (!ws || ws.readyState !== 1) return;

  ws.send(JSON.stringify({
    type: "text_message",
    text,
    sender_id: myClientId
  }));
}

// =========================
// MIC
// =========================

function startMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return alert("Speech API yok");

  const rec = new SR();
  rec.lang = myLang;
  rec.continuous = true;

  rec.onresult = (e) => {
    const text = e.results[e.results.length - 1][0].transcript;
    send(text);
  };

  rec.start();
}

// =========================
// TTS
// =========================

async function speak(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = myLang;
  speechSynthesis.speak(u);
}

// =========================
// INIT
// =========================

function init() {
  myClientId = getClientId();
  connect();

  document.getElementById("btnStartMic")?.addEventListener("click", startMic);
}

init();
