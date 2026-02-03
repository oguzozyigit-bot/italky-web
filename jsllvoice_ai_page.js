import { BASE_DOMAIN, STORAGE_KEY } from "/js/config.js";

const $ = id => document.getElementById(id);

const VOICES = [
  "Jale","Hüma","Selden","Ayşem","Eles",
  "Ozan","Oğuz","Barış","Emrah","Yavuz","Yılmaz"
];

const VOICE_MAP = {
  "Jale":"shimmer","Hüma":"nova","Selden":"alloy","Ayşem":"shimmer","Eles":"nova",
  "Ozan":"ash","Oğuz":"alloy","Barış":"ash","Emrah":"alloy","Yavuz":"ash","Yılmaz":"alloy"
};

let currentVoice = localStorage.getItem("italky_voice") || "Jale";
let busy = false;
let audio = null;

function setStage(mode){
  $("stage").className = "stage" + (mode ? " "+mode : "");
}
function setStatus(t){ $("status").textContent = t; }

function openModal(){
  $("voiceModal").classList.add("show");
  renderVoiceList();
}
function closeModal(){
  $("voiceModal").classList.remove("show");
}

function renderVoiceList(){
  const list = $("voiceList");
  list.innerHTML = "";
  VOICES.forEach(v=>{
    const d = document.createElement("div");
    d.className = "voice-row" + (v===currentVoice ? " sel":"");
    d.textContent = v;
    d.onclick = ()=>{
      currentVoice = v;
      localStorage.setItem("italky_voice", v);
      closeModal();
      setStatus(`Ses: ${v}`);
      setTimeout(()=>setStatus("Hazır"),800);
    };
    list.appendChild(d);
  });
}

async function speak(text){
  setStage("speaking");
  setStatus("Konuşuyor…");

  const r = await fetch(`${BASE_DOMAIN}/api/tts_openai`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      text,
      voice: VOICE_MAP[currentVoice],
      format:"mp3"
    })
  });

  const j = await r.json();
  audio = new Audio(`data:audio/mpeg;base64,${j.audio_base64}`);
  audio.onended = ()=>{
    setStage("");
    setStatus("Hazır");
  };
  audio.play();
}

function startSTT(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR || busy) return;

  busy = true;
  setStage("listening");
  setStatus("Dinliyorum…");
  $("micBtn").classList.add("listening");

  const rec = new SR();
  rec.lang = "tr-TR";
  rec.onresult = async e=>{
    const text = e.results[0][0].transcript;
    setStage("");
    $("micBtn").classList.remove("listening");
    busy = false;

    const cr = await fetch(`${BASE_DOMAIN}/api/chat`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ text })
    });
    const cj = await cr.json();
    await speak(cj.text);
  };
  rec.onerror = ()=>{ busy=false; setStage(""); };
  rec.start();
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("backBtn").onclick = ()=> location.href="/pages/home.html";
  $("homeBtn").onclick = ()=> location.href="/pages/home.html";
  $("openVoice").onclick = openModal;
  $("voiceModal").onclick = e=>{ if(e.target===$("voiceModal")) closeModal(); };
  $("micBtn").onclick = startSTT;
});
