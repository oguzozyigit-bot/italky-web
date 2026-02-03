// FILE: italky-web/js/voice_ai_page.js
import { BASE_DOMAIN } from "/js/config.js";

const $ = (id)=>document.getElementById(id);

/* =========================
   OPENAI VOICE MAP (SABİT)
   ========================= */
const VOICES = [
  { id:"jale",   label:"Jale",   gender:"Kadın" },
  { id:"huma",   label:"Hüma",   gender:"Kadın" },
  { id:"selden", label:"Selden", gender:"Kadın" },
  { id:"aysem",  label:"Ayşem",  gender:"Kadın" },

  { id:"ozan",   label:"Ozan",   gender:"Erkek" },
  { id:"oguz",   label:"Oğuz",   gender:"Erkek" },
  { id:"baris",  label:"Barış",  gender:"Erkek" },
  { id:"emrah",  label:"Emrah",  gender:"Erkek" },
];

let selectedVoice = localStorage.getItem("italky_voice") || "oguz";

/* =========================
   VOICE MODAL
   ========================= */
const modal = $("voiceModal");
const list  = $("voiceList");

function renderVoices(){
  list.innerHTML = "";

  VOICES.forEach(v=>{
    const row = document.createElement("div");
    row.className = "voice-row" + (v.id===selectedVoice ? " sel" : "");
    row.innerHTML = `
      <div>
        <strong>${v.label}</strong>
        <div style="font-size:11px;opacity:.6">${v.gender}</div>
      </div>
      <button data-id="${v.id}">▶</button>
    `;

    // SEÇ
    row.onclick = ()=>{
      selectedVoice = v.id;
      localStorage.setItem("italky_voice", v.id);
      renderVoices();
    };

    // DEMO
    row.querySelector("button").onclick = async (e)=>{
      e.stopPropagation();
      await playDemo(v.id, v.label);
    };

    list.appendChild(row);
  });
}

$("openVoice").onclick = ()=>{
  modal.classList.add("show");
  renderVoices();
};

modal.onclick = (e)=>{
  if(e.target === modal) modal.classList.remove("show");
};

/* =========================
   OPENAI TTS DEMO
   ========================= */
async function playDemo(voiceId, name){
  const text = `Merhaba, ben ${name}. italkyAI’ye hoş geldin.`;

  const res = await fetch(`${BASE_DOMAIN}/api/tts_openai`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      text,
      voice: voiceId,
      format: "mp3"
    })
  });

  const data = await res.json();
  const audio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
  audio.play();
}

/* =========================
   MICROPHONE (GERÇEK STT)
   ========================= */
const micBtn = $("micBtn");
const stage  = $("stage");
const status = $("status");

let rec = null;
let listening = false;

function initSTT(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    alert("Bu cihaz mikrofonu desteklemiyor.");
    return null;
  }
  const r = new SR();
  r.lang = "tr-TR";
  r.interimResults = false;
  r.continuous = false;
  return r;
}

micBtn.onclick = ()=>{
  if(!rec){
    rec = initSTT();
    if(!rec) return;
  }

  if(listening){
    rec.stop();
    return;
  }

  listening = true;
  micBtn.classList.add("listening");
  stage.classList.add("listening");
  status.textContent = "Dinliyorum…";

  rec.start();

  rec.onresult = async (e)=>{
    const text = e.results[0][0].transcript;

    listening = false;
    micBtn.classList.remove("listening");
    stage.classList.remove("listening");
    stage.classList.add("speaking");
    status.textContent = "Konuşuyorum…";

    await speakWithOpenAI(text);

    stage.classList.remove("speaking");
    status.textContent = "Hazır";
  };

  rec.onend = ()=>{
    listening = false;
    micBtn.classList.remove("listening");
    stage.classList.remove("listening");
  };
};

/* =========================
   OPENAI TTS RESPONSE
   ========================= */
async function speakWithOpenAI(text){
  const res = await fetch(`${BASE_DOMAIN}/api/tts_openai`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      text,
      voice: selectedVoice,
      format: "mp3"
    })
  });

  const data = await res.json();
  const audio = new Audio(`data:audio/mp3;base64,${data.audio_base64}`);
  await audio.play();
}
