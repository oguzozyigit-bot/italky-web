// FILE: italky-web/js/voice_ai_page.js
import { BASE_DOMAIN } from "/js/config.js";

const $ = (id)=>document.getElementById(id);

/* =========================
   VOICE LIST (UI names) -> OpenAI voices
   ========================= */
const VOICES = [
  { id:"jale",   label:"Jale",   gender:"Kadın", openaiVoice:"shimmer" },
  { id:"huma",   label:"Hüma",   gender:"Kadın", openaiVoice:"nova" },
  { id:"selden", label:"Selden", gender:"Kadın", openaiVoice:"alloy" },
  { id:"aysem",  label:"Ayşem",  gender:"Kadın", openaiVoice:"ash" },

  { id:"ozan",   label:"Ozan",   gender:"Erkek", openaiVoice:"alloy" },
  { id:"oguz",   label:"Oğuz",   gender:"Erkek", openaiVoice:"nova" },
  { id:"baris",  label:"Barış",  gender:"Erkek", openaiVoice:"ash" },
  { id:"emrah",  label:"Emrah",  gender:"Erkek", openaiVoice:"shimmer" },
];

const KEY = "italky_voice";
let selectedId = (localStorage.getItem(KEY) || "oguz").trim();

function selected(){
  return VOICES.find(v=>v.id===selectedId) || VOICES[0];
}

/* =========================
   NAV
   ========================= */
function bindNav(){
  $("homeBtn")?.addEventListener("click", ()=> location.href="/pages/home.html");
  $("backBtn")?.addEventListener("click", ()=>{
    if(history.length > 1) history.back();
    else location.href="/pages/home.html";
  });
}

/* =========================
   MODAL
   ========================= */
function openModal(){
  $("voiceModal")?.classList.add("show");
  renderList();
}
function closeModal(){
  $("voiceModal")?.classList.remove("show");
}

function bindModal(){
  $("openVoice")?.addEventListener("click", (e)=>{ e.preventDefault(); openModal(); });
  $("closeVoice")?.addEventListener("click", (e)=>{ e.preventDefault(); closeModal(); });
  $("voiceModal")?.addEventListener("click", (e)=>{
    if(e.target === $("voiceModal")) closeModal();
  });
}

/* =========================
   OPENAI TTS
   ========================= */
async function tts(text, openaiVoice){
  const base = String(BASE_DOMAIN || "").replace(/\/+$/,"");
  const r = await fetch(`${base}/api/tts_openai`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      text,
      voice: openaiVoice,
      format: "mp3",
      speed: 1.0
    })
  });
  const raw = await r.text().catch(()=> "");
  if(!r.ok) throw new Error(raw || `tts http ${r.status}`);
  let data = {};
  try{ data = JSON.parse(raw || "{}"); }catch{}
  const b64 = String(data.audio_base64 || "").trim();
  if(!b64) throw new Error("empty audio_base64");
  return b64;
}

async function playB64(b64){
  const a = new Audio(`data:audio/mp3;base64,${b64}`);
  await a.play();
}

/* =========================
   LIST RENDER + DEMO
   ========================= */
function renderList(){
  const list = $("voiceList");
  if(!list) return;
  list.innerHTML = "";

  VOICES.forEach(v=>{
    const row = document.createElement("div");
    row.className = "voice-row" + (v.id===selectedId ? " sel" : "");
    row.innerHTML = `
      <div class="vLeft">
        <div class="vName">${v.label}</div>
        <div class="vMeta">${v.gender}</div>
      </div>
      <button class="vPlay" type="button">▶</button>
    `;

    // select
    row.addEventListener("click", ()=>{
      selectedId = v.id;
      localStorage.setItem(KEY, selectedId);
      renderList();
      closeModal();
    });

    // demo
    const btn = row.querySelector(".vPlay");
    btn.addEventListener("click", async (e)=>{
      e.preventDefault();
      e.stopPropagation();

      const demo =
        `italkyAI’ye hoş geldiniz. Benimle hem eğlenip, hem öğrenip, hem de dünyayı özgürce gezebilirsiniz. ` +
        `Hadi beni seç, ben ${v.label}.`;

      try{
        const b64 = await tts(demo, v.openaiVoice);
        await playB64(b64);
      }catch(err){
        alert("Demo sesi çalamadım. /api/tts_openai çalışıyor mu?\n" + (err?.message || err));
      }
    });

    list.appendChild(row);
  });
}

/* =========================
   REAL STT (SpeechRecognition)
   ========================= */
let rec = null;
let listening = false;

function initSTT(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;

  const r = new SR();
  r.lang = "tr-TR";
  r.interimResults = false;
  r.continuous = false;
  return r;
}

function setState(mode){
  const stage = $("stage");
  const status = $("status");
  const mic = $("micBtn");

  stage?.classList.remove("listening","speaking");
  mic?.classList.remove("listening");

  if(mode==="listening"){
    stage?.classList.add("listening");
    mic?.classList.add("listening");
    if(status) status.textContent = "Dinliyorum…";
  }else if(mode==="speaking"){
    stage?.classList.add("speaking");
    if(status) status.textContent = "Konuşuyorum…";
  }else{
    if(status) status.textContent = "Hazır";
  }
}

async function speakAnswer(userText){
  const v = selected();
  const reply = `Anladım. Şunu söyledin: ${userText}.`;
  const b64 = await tts(reply, v.openaiVoice);
  await playB64(b64);
}

/* =========================
   MIC CLICK (tap works)
   + long-press opens voice
   ========================= */
function bindMic(){
  const micBtn = $("micBtn");
  if(!micBtn) return;

  // long press => voice modal
  let pressT = null;
  micBtn.addEventListener("pointerdown", ()=>{
    pressT = setTimeout(()=> openModal(), 520);
  });
  micBtn.addEventListener("pointerup", ()=>{ if(pressT) clearTimeout(pressT); pressT=null; });
  micBtn.addEventListener("pointercancel", ()=>{ if(pressT) clearTimeout(pressT); pressT=null; });

  micBtn.addEventListener("click", async ()=>{
    // init once
    if(!rec){
      rec = initSTT();
      if(!rec){
        alert("Bu cihazda SpeechRecognition yok. (Android Chrome + HTTPS gerekir)");
        return;
      }

      rec.onresult = async (e)=>{
        const text = (e.results?.[0]?.[0]?.transcript || "").trim();
        listening = false;

        if(!text){
          setState("idle");
          return;
        }

        setState("speaking");
        try{
          await speakAnswer(text);
        }catch(err){
          alert("Ses üretemedim. /api/tts_openai kontrol et.\n" + (err?.message || err));
        }
        setState("idle");
      };

      rec.onerror = ()=>{
        listening = false;
        setState("idle");
      };

      rec.onend = ()=>{
        listening = false;
        // speaking değilse idle
        const stage = $("stage");
        if(stage && !stage.classList.contains("speaking")) setState("idle");
      };
    }

    // toggle
    if(listening){
      try{ rec.stop(); }catch{}
      listening = false;
      setState("idle");
      return;
    }

    listening = true;
    setState("listening");
    try{ rec.start(); }
    catch{
      listening = false;
      setState("idle");
    }
  });
}

/* =========================
   BOOT
   ========================= */
document.addEventListener("DOMContentLoaded", ()=>{
  bindNav();
  bindModal();
  bindMic();

  // ilk defa ise modal aç
  const saved = (localStorage.getItem(KEY) || "").trim();
  if(!saved){
    openModal();
  }
});
