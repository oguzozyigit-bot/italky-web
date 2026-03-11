import { LANG_POOL } from "/js/lang_pool_full.js";

const $ = (id)=>document.getElementById(id);

const topBody = $("topBody");
const botBody = $("botBody");

const mic = $("botMic");
const clearBtn = $("clearBtn");

const langBtn = $("langBtn");
const voiceBtn = $("voiceBtn");
const muteBtn = $("muteBtn");

let myLang = "tr";
let muted = false;

let recognition = null;

function canonical(code){
  return String(code||"").toLowerCase().trim();
}

/* ===============================
   bubble
================================ */

function addBubbleTop(text){
  const row = document.createElement("div");
  row.className="bubble them";
  row.textContent=text;
  topBody.appendChild(row);
  topBody.scrollTop = topBody.scrollHeight;
}

function addBubbleBottom(text){
  const row = document.createElement("div");
  row.className="bubble me is-latest";
  row.textContent=text;
  botBody.appendChild(row);
  botBody.scrollTop = botBody.scrollHeight;
}

/* ===============================
   speech recognition
================================ */

function initSpeech(){

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return;

  recognition = new SR();

  recognition.lang = "tr-TR";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onresult = async (e)=>{

    const text = e.results?.[0]?.[0]?.transcript || "";

    if(!text) return;

    addBubbleBottom(text);

    translate(text);
  };

}

/* ===============================
   translate
================================ */

async function translate(text){

  try{

    const r = await fetch("https://italky-api.onrender.com/api/translate_ai",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      },
      body:JSON.stringify({
        text:text,
        from_lang:"tr",
        to_lang:"en"
      })
    });

    if(!r.ok) return;

    const j = await r.json();

    const translated = j?.translated || "";

    if(!translated) return;

    addBubbleTop(translated);

    speak(translated);

  }catch(e){
    console.log(e);
  }

}

/* ===============================
   speak
================================ */

function speak(text){

  if(muted) return;

  if(!window.speechSynthesis) return;

  const u = new SpeechSynthesisUtterance(text);
  u.lang="en-US";

  speechSynthesis.speak(u);

}

/* ===============================
   mic
================================ */

mic?.addEventListener("click",()=>{

  if(!recognition){
    alert("Speech API yok");
    return;
  }

  recognition.start();

});

/* ===============================
   clear
================================ */

clearBtn?.addEventListener("click",()=>{

  topBody.innerHTML="";
  botBody.innerHTML="";

});

/* ===============================
   mute
================================ */

muteBtn?.addEventListener("click",()=>{

  muted=!muted;

  muteBtn.style.opacity = muted ? 0.4 : 1;

});

/* ===============================
   init
================================ */

initSpeech();
