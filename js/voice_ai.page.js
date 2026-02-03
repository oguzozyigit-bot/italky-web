// FILE: italky-web/js/voice_ai_page.js
import { BASE_DOMAIN } from "/js/config.js";

const $ = (id)=>document.getElementById(id);

/* ✅ KULLANILAN SES İSİMLERİ (TEMİZLENMİŞ) */
const VOICES = [
  // Kadın
  "Jale",
  "Hüma",
  "Selden",
  "Ayşem",

  // Erkek
  "Ozan",
  "Oğuz",
  "Barış",
  "Emrah",
];

let selectedName = localStorage.getItem("italky_voice_name") || null;

/* ========= UI ========= */
function renderVoiceList(){
  const box = $("voiceList");
  box.innerHTML = "";

  VOICES.forEach(name=>{
    const d = document.createElement("div");
    d.className = "voice-row" + (name === selectedName ? " sel" : "");
    d.textContent = name;

    d.onclick = ()=>{
      document.querySelectorAll(".voice-row").forEach(x=>x.classList.remove("sel"));
      d.classList.add("sel");
      selectedName = name;
    };

    box.appendChild(d);
  });
}

/* ========= SAVE ========= */
$("openVoice").onclick = ()=>{
  $("voiceModal").classList.add("show");
  renderVoiceList();
};

$("saveVoiceBtn").onclick = ()=>{
  if(!selectedName) return;
  localStorage.setItem("italky_voice_name", selectedName);
  $("voiceModal").classList.remove("show");
};

/* ========= TTS ========= */
async function speak(text){
  const name = selectedName || "Ozan"; // default
  const url = `${BASE_DOMAIN.replace(/\/+$/,"")}/api/tts_openai`;

  const r = await fetch(url,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      text,
      name,      // 👈 BACKEND SPEED BURADAN OKUR
      voice: "ash",
      format: "mp3"
    })
  });

  const data = await r.json();
  if(!data?.audio_base64) return;

  const audio = new Audio(`data:audio/${data.format};base64,${data.audio_base64}`);
  audio.play();
}

/* ========= DEMO ========= */
$("micBtn").onclick = ()=>{
  speak("Merhaba. Ben italkyAI. Sesim kişiye göre ayarlanmıştır.");
};
