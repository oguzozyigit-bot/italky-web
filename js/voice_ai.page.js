// FILE: italky-web/js/voice_ai.page.js
import { BASE_DOMAIN } from "/js/config.js";

const $ = (id) => document.getElementById(id);

const VOICES = [
  { id: "jale",   label: "Jale",   gender: "Kadın", openaiVoice: "shimmer", desc: "Net ve İddialı" },
  { id: "huma",   label: "Hüma",   gender: "Kadın", openaiVoice: "nova",    desc: "Enerjik ve Sıcak" },
  { id: "selden", label: "Selden", gender: "Kadın", openaiVoice: "alloy",   desc: "Çok Yönlü ve Nötr" },
  { id: "aysem",  label: "Ayşem",  gender: "Kadın", openaiVoice: "ash",     desc: "Sakin ve Profesyonel" },

  { id: "ozan",   label: "Ozan",   gender: "Erkek", openaiVoice: "alloy",   desc: "Dengeli ve Net" },
  { id: "oguz",   label: "Oğuz",   gender: "Erkek", openaiVoice: "echo",    desc: "Tok ve Yankılı" },
  { id: "baris",  label: "Barış",  gender: "Erkek", openaiVoice: "fable",   desc: "Anlatıcı Tonu" },
  { id: "emrah",  label: "Emrah",  gender: "Erkek", openaiVoice: "onyx",    desc: "Derin ve Ciddi" },
];

const KEY = "italky_voice_pref";
let selectedId = (localStorage.getItem(KEY) || "").trim();
let stagedId = selectedId || VOICES[0].id;

function baseUrl() {
  return String(BASE_DOMAIN || "").replace(/\/+$/, "");
}
function getVoiceById(id) {
  return VOICES.find(v => v.id === id) || VOICES[0];
}

function welcomeText(name){
  return `italkyAI’ye hoş geldiniz. Benimle hem eğlenip, hem öğrenip hem de dünyayı özgürce gezebilirsiniz. Hadi beni seç, ben ${name}.`;
}

/* ======= VISUAL ======= */
const stage  = $("stage");
const status = $("status");
const micBtn = $("micBtn");

function setState(s){
  stage?.classList.remove("listening","speaking");
  micBtn?.classList.remove("active","listening");

  if (s === "listening"){
    stage?.classList.add("listening");
    micBtn?.classList.add("active","listening");
    if(status) status.textContent = "Dinliyorum…";
  } else if (s === "thinking"){
    micBtn?.classList.add("active");
    if(status) status.textContent = "Düşünüyorum…";
  } else if (s === "speaking"){
    stage?.classList.add("speaking");
    micBtn?.classList.add("active");
    if(status) status.textContent = "Cevap veriyorum…";
  } else {
    if(status) status.textContent = "Dokun ve Konuş";
  }
}

/* ======= OPENAI TTS ======= */
async function tts(text, openaiVoice) {
  const url = `${baseUrl()}/api/tts_openai`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voice: openaiVoice,
      format: "mp3",
      speed: 1.0,
    }),
  });

  const raw = await r.text().catch(() => "");
  if (!r.ok) throw new Error(raw || `TTS Hatası: ${r.status}`);

  let data = {};
  try { data = JSON.parse(raw || "{}"); } catch {}
  const b64 = String(data.audio_base64 || "").trim();
  if (!b64) throw new Error("Ses verisi boş döndü.");
  return b64;
}

function playB64(b64) {
  return new Promise((resolve, reject) => {
    const a = new Audio(`data:audio/mp3;base64,${b64}`);
    a.onended = resolve;
    a.onerror = reject;
    a.play().catch(reject);
  });
}

/* ======= MODAL ======= */
const modal = $("voiceModal");
const list  = $("voiceList");

function openModal(){
  modal?.classList.add("show");
  renderList();
}
function closeModal(){
  modal?.classList.remove("show");
}

function renderList(){
  if(!list) return;
  list.innerHTML = "";

  VOICES.forEach(v=>{
    const row = document.createElement("div");
    row.className = "voice-row" + (v.id===stagedId ? " sel" : "");
    row.innerHTML = `
      <div class="vLeft">
        <div class="vText">
          <div class="vName">${v.label}</div>
          <div class="vMeta">${v.gender} • ${v.desc}</div>
        </div>
      </div>
      <button class="vPlay" type="button" data-play="${v.id}">▶</button>
    `;

    row.addEventListener("click",(e)=>{
      const btn = e.target.closest("[data-play]");
      if(btn) return;
      stagedId = v.id;
      renderList();
    });

    row.querySelector("[data-play]")?.addEventListener("click", async (e)=>{
      e.preventDefault(); e.stopPropagation();
      try{
        const b64 = await tts(welcomeText(v.label), v.openaiVoice);
        await playB64(b64);
      }catch(err){
        console.error(err);
        alert("Demo çalınamadı. (API / Key / Route kontrol)");
      }
    });

    list.appendChild(row);
  });
}

/* ======= STT ======= */
let rec = null;
let sttBusy = false;

function initSTT(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const r = new SR();
  r.lang = "tr-TR";
  r.interimResults = false;
  r.continuous = false;
  return r;
}

async function answerAndSpeak(userText){
  const v = getVoiceById(selectedId || stagedId);
  const reply = `italkyAI burada. Bunu söyledin: ${userText}.`;
  const b64 = await tts(reply, v.openaiVoice);
  await playB64(b64);
}

/* ======= BIND ======= */
function bind(){
  $("backBtn")?.addEventListener("click", ()=> location.href="/pages/home.html");
  $("homeBtn")?.addEventListener("click", ()=> location.href="/pages/home.html");

  $("openVoice")?.addEventListener("click", openModal);
  $("closeVoice")?.addEventListener("click", closeModal);
  modal?.addEventListener("click",(e)=>{ if(e.target === modal) closeModal(); });

  $("saveVoice")?.addEventListener("click", async ()=>{
    selectedId = stagedId;
    localStorage.setItem(KEY, selectedId);
    closeModal();
    try{
      const v = getVoiceById(selectedId);
      const b64 = await tts(welcomeText(v.label), v.openaiVoice);
      await playB64(b64);
    }catch{}
  });

  // ✅ MOBILE CLICK FIX: pointerup + click
  const fireMic = async ()=>{
    if(sttBusy){
      try{ rec?.stop?.(); }catch{}
      return;
    }

    rec = rec || initSTT();
    if(!rec){
      alert("Bu cihaz sesli komutu desteklemiyor. (Chrome/Android deneyin)");
      return;
    }

    sttBusy = true;
    setState("listening");

    rec.onresult = async (e)=>{
      const txt = (e.results?.[0]?.[0]?.transcript || "").trim();
      if(!txt) return;

      setState("thinking");
      try{
        setState("speaking");
        await answerAndSpeak(txt);
      }catch(err){
        console.error(err);
        alert("Ses üretilemedi. (/api/tts_openai çalışmıyor)");
      }finally{
        setState("idle");
      }
    };

    rec.onerror = (e)=>{
      console.warn("STT error:", e?.error);
      setState("idle");
    };

    rec.onend = ()=>{
      sttBusy = false;
      if(!stage?.classList.contains("speaking")) setState("idle");
    };

    try{ rec.start(); }
    catch(err){
      console.error(err);
      sttBusy = false;
      setState("idle");
    }
  };

  micBtn?.addEventListener("pointerup", (e)=>{ e.preventDefault(); fireMic(); });
  micBtn?.addEventListener("click", (e)=>{ e.preventDefault(); fireMic(); });

  setState("idle");

  if(!localStorage.getItem(KEY)){
    setTimeout(openModal, 350);
  }
}

document.addEventListener("DOMContentLoaded", bind);
