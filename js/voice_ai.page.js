// FILE: italky-web/js/voice_ai_page.js
import { BASE_DOMAIN } from "/js/config.js";

const $ = (id) => document.getElementById(id);

/* =========================
   ITALKY VOICE LIST (UI)
   =========================
   Not: OpenAI'nin gerçek voice değerleri sınırlı.
   Biz isimleri (Jale/Oğuz vs) UI'de gösteriyoruz,
   API'ye ise openaiVoice gönderiyoruz.
*/
const VOICES = [
  { id: "jale",   label: "Jale",   gender: "Kadın", openaiVoice: "shimmer" },
  { id: "huma",   label: "Hüma",   gender: "Kadın", openaiVoice: "nova" },
  { id: "selden", label: "Selden", gender: "Kadın", openaiVoice: "alloy" },
  { id: "aysem",  label: "Ayşem",  gender: "Kadın", openaiVoice: "ash" },

  { id: "ozan",   label: "Ozan",   gender: "Erkek", openaiVoice: "alloy" },
  { id: "oguz",   label: "Oğuz",   gender: "Erkek", openaiVoice: "nova" },
  { id: "baris",  label: "Barış",  gender: "Erkek", openaiVoice: "ash" },
  { id: "emrah",  label: "Emrah",  gender: "Erkek", openaiVoice: "shimmer" },
];

const VOICE_KEY = "italky_voice"; // localStorage
let selectedId = (localStorage.getItem(VOICE_KEY) || "oguz").trim();

function getSelected() {
  return VOICES.find(v => v.id === selectedId) || VOICES[0];
}

/* =========================
   NAV / TOP BUTTONS
   ========================= */
function bindTopNav(){
  $("homeBtn")?.addEventListener("click", ()=> location.href="/pages/home.html");
  $("backBtn")?.addEventListener("click", ()=>{
    if(history.length > 1) history.back();
    else location.href="/pages/home.html";
  });

  $("openVoice")?.addEventListener("click", ()=>{
    $("voiceModal")?.classList.add("show");
    renderVoices();
  });

  $("voiceModal")?.addEventListener("click", (e)=>{
    const modal = $("voiceModal");
    if(e.target === modal) modal.classList.remove("show");
  });
}

/* =========================
   OPENAI TTS CALL
   ========================= */
async function fetchOpenAITTS(text, openaiVoice){
  const base = String(BASE_DOMAIN || "").replace(/\/+$/,"");
  const r = await fetch(`${base}/api/tts_openai`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      text,
      voice: openaiVoice,     // ✅ OpenAI voice: alloy/nova/shimmer/ash
      format: "mp3",
      speed: 1.0
    })
  });

  const raw = await r.text().catch(()=> "");
  if(!r.ok){
    throw new Error(raw || `tts_openai http ${r.status}`);
  }
  let data = {};
  try{ data = JSON.parse(raw || "{}"); }catch{}
  const b64 = String(data.audio_base64 || "").trim();
  if(!b64) throw new Error("tts_openai: empty audio_base64");
  return b64;
}

async function playAudioB64(b64){
  const audio = new Audio(`data:audio/mp3;base64,${b64}`);
  // iOS bazen play() promise ister:
  await audio.play();
}

/* =========================
   VOICE MODAL LIST + DEMO
   ========================= */
function renderVoices(){
  const list = $("voiceList");
  if(!list) return;
  list.innerHTML = "";

  VOICES.forEach(v=>{
    const row = document.createElement("div");
    row.className = "voice-row" + (v.id === selectedId ? " sel" : "");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.gap = "10px";

    row.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:2px;">
        <strong style="font-weight:800">${v.label}</strong>
        <div style="font-size:11px;opacity:.65">${v.gender}</div>
      </div>
      <button type="button"
        style="width:40px;height:32px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:#fff;font-weight:900;cursor:pointer;">
        ▶
      </button>
    `;

    // Satıra tıkla => seç + kapat
    row.addEventListener("click", ()=>{
      selectedId = v.id;
      localStorage.setItem(VOICE_KEY, selectedId);
      $("voiceModal")?.classList.remove("show");
      renderVoices();
    });

    // Demo butonu
    const btn = row.querySelector("button");
    btn.addEventListener("click", async (e)=>{
      e.preventDefault();
      e.stopPropagation();

      const demoText =
        `italkyAI’ye hoş geldiniz. Benimle hem eğlenip, hem öğrenip, hem de dünyayı özgürce gezebilirsiniz. ` +
        `Hadi beni seç, ben ${v.label}.`;

      try{
        const b64 = await fetchOpenAITTS(demoText, v.openaiVoice);
        await playAudioB64(b64);
      }catch(err){
        alert("Demo sesi çalamadım. API / key kontrol: " + (err?.message || err));
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

function setUIState(mode){
  // mode: "idle" | "listening" | "speaking"
  const stage = $("stage");
  const status = $("status");
  const micBtn = $("micBtn");

  stage?.classList.remove("listening","speaking");
  micBtn?.classList.remove("listening");

  if(mode === "listening"){
    stage?.classList.add("listening");
    micBtn?.classList.add("listening");
    if(status) status.textContent = "Dinliyorum…";
  }else if(mode === "speaking"){
    stage?.classList.add("speaking");
    if(status) status.textContent = "Konuşuyorum…";
  }else{
    if(status) status.textContent = "Hazır";
  }
}

async function speakReplyWithOpenAI(text){
  // Şimdilik: kullanıcının dediğini sesli tekrar ettiriyoruz (test)
  // Sonra bunu /api/voice-ai (chat+tts) pipeline’a bağlarız.
  const v = getSelected();
  const reply =
    `Anladım. Şunu söyledin: ${text}.`;

  const b64 = await fetchOpenAITTS(reply, v.openaiVoice);
  await playAudioB64(b64);
}

/* =========================
   MIC BUTTON
   ========================= */
function bindMic(){
  const micBtn = $("micBtn");
  if(!micBtn) return;

  micBtn.addEventListener("click", async ()=>{
    // iOS/Chrome: kullanıcı gesture ile audio context / autoplay izinleri açılır
    // Burada sadece TTS call yapmıyoruz, STT başlatıyoruz.

    if(!rec){
      rec = initSTT();
      if(!rec){
        alert("Bu cihazda SpeechRecognition yok. (Gerçek STT için HTTPS + Chrome gerekir)");
        return;
      }

      rec.onresult = async (e)=>{
        const text = (e.results?.[0]?.[0]?.transcript || "").trim();
        listening = false;
        setUIState("speaking");

        try{
          if(text){
            await speakReplyWithOpenAI(text);
          }
        }catch(err){
          alert("TTS çalamadım: " + (err?.message || err));
        }

        setUIState("idle");
      };

      rec.onerror = ()=>{
        listening = false;
        setUIState("idle");
      };

      rec.onend = ()=>{
        listening = false;
        // eğer konuşmaya geçmediyse idle
        const stage = $("stage");
        if(stage && !stage.classList.contains("speaking")) setUIState("idle");
      };
    }

    // toggle
    if(listening){
      try{ rec.stop(); }catch{}
      listening = false;
      setUIState("idle");
      return;
    }

    // start listening
    listening = true;
    setUIState("listening");
    try{
      rec.start();
    }catch{
      listening = false;
      setUIState("idle");
    }
  });
}

/* =========================
   BOOT
   ========================= */
document.addEventListener("DOMContentLoaded", ()=>{
  bindTopNav();
  bindMic();

  // İlk açılışta modal açılsın (seçim yoksa)
  const saved = (localStorage.getItem(VOICE_KEY) || "").trim();
  if(!saved){
    $("voiceModal")?.classList.add("show");
    renderVoices();
  }
});
