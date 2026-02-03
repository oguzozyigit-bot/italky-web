import { BASE_DOMAIN } from "/js/config.js";

const $ = (id) => document.getElementById(id);

// --- KARAKTER LİSTESİ (YENİ VE FARKLI SESLER) ---
const VOICES = [
  // KADINLAR
  { id: "dora",   label: "Dora",   gender: "Kadın", openaiVoice: "nova",    desc: "Enerjik ve Neşeli ⚡" },
  { id: "ayda",   label: "Ayda",   gender: "Kadın", openaiVoice: "shimmer", desc: "Parlak ve Net ✨" },
  { id: "umay",   label: "Umay",   gender: "Kadın", openaiVoice: "alloy",   desc: "Dengeli ve Akıcı 💧" },

  // ERKEKLER
  { id: "sencer", label: "Sencer", gender: "Erkek", openaiVoice: "echo",    desc: "Sıcak ve Yankılı 🔥" },
  { id: "toygar", label: "Toygar", gender: "Erkek", openaiVoice: "fable",   desc: "Anlatıcı ve Vurgulu 🎭" },
  { id: "sungur", label: "Sungur", gender: "Erkek", openaiVoice: "onyx",    desc: "Derin ve Karizmatik 🗿" }
];

const KEY = "italky_voice_pref";
let selectedId = (localStorage.getItem(KEY) || "dora").trim();
let stagedId = selectedId; 

function apiBase() {
  return String(BASE_DOMAIN || "").replace(/\/+$/, "");
}

function getSelectedVoice() {
  return VOICES.find(v => v.id === selectedId) || VOICES[0];
}

/* --- YARDIMCI: GERÇEK SES ÇALMA (API) --- */
async function playRealVoice(text, openaiVoice) {
  try {
    const res = await fetch(`${apiBase()}/api/tts_openai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text,
        voice: openaiVoice,
        speed: 1.0
      })
    });

    if (!res.ok) throw new Error("TTS API Hatası");
    const data = await res.json();
    
    if (data.audio_base64) {
      const audio = new Audio("data:audio/mp3;base64," + data.audio_base64);
      await audio.play();
      return audio;
    }
  } catch (err) {
    console.error("Ses Çalma Hatası:", err);
    alert("Ses sunucusuna ulaşılamadı. Backend çalışıyor mu?");
  }
  return null;
}

/* --- GÖRSEL DURUMLAR --- */
const stage   = $("aiStage");
const status  = $("statusText");
const micBtn  = $("micToggle");

function setVisual(state) {
  stage?.classList.remove("listening", "speaking");
  micBtn?.classList.remove("active");
  status?.classList.remove("show");

  if (state === "listening") {
    stage?.classList.add("listening");
    micBtn?.classList.add("active");
    if(status) { status.textContent = "Dinliyorum..."; status.classList.add("show"); }
  } else if (state === "thinking") {
    micBtn?.classList.add("active");
    if(status) { status.textContent = "Düşünüyor..."; status.classList.add("show"); }
  } else if (state === "speaking") {
    stage?.classList.add("speaking");
    micBtn?.classList.add("active");
    if(status) { status.textContent = "Cevap Veriyor..."; status.classList.add("show"); }
  } else {
    if(status) { status.textContent = "Sohbet Başlat"; status.classList.add("show"); }
  }
}

/* --- SÜREKLİ SOHBET (LOOP) --- */
let isConversationActive = false;
let recognition = null;
let currentAudio = null;

function toggleConversation() {
  if (isConversationActive) stopConversation();
  else startConversation();
}

function startConversation() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert("Tarayıcı desteklemiyor."); return; }
  isConversationActive = true;
  startListening();
}

function stopConversation() {
  isConversationActive = false;
  if (recognition) { try { recognition.stop(); } catch(e){} recognition = null; }
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
  window.speechSynthesis.cancel();
  setVisual("idle");
}

function startListening() {
  if (!isConversationActive) return;
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = "tr-TR";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => { if (isConversationActive) setVisual("listening"); };
  
  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    if (text && isConversationActive) processUserSpeech(text);
  };

  recognition.onerror = (e) => {
    if (isConversationActive && e.error !== 'aborted') setTimeout(startListening, 500);
  };

  try { recognition.start(); } catch(e){}
}

async function processUserSpeech(userText) {
  setVisual("thinking");
  try {
    const chatRes = await fetch(`${apiBase()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: userText })
    });
    
    const chatData = await chatRes.json();
    const aiReply = chatData.text || "Anlaşılamadı.";

    await speakResponse(aiReply);

  } catch (err) {
    console.error(err);
    if (isConversationActive) { setVisual("idle"); setTimeout(startListening, 1000); }
  }
}

async function speakResponse(text) {
  if (!isConversationActive) return;
  
  const v = getSelectedVoice();
  setVisual("speaking");

  try {
    const res = await fetch(`${apiBase()}/api/tts_openai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text, voice: v.openaiVoice })
    });
    const data = await res.json();

    if (data.audio_base64) {
      const audio = new Audio("data:audio/mp3;base64," + data.audio_base64);
      currentAudio = audio;
      
      audio.onended = () => {
        currentAudio = null;
        if (isConversationActive) startListening();
        else setVisual("idle");
      };
      await audio.play();
    } else {
      if (isConversationActive) startListening();
    }
  } catch (e) {
    if (isConversationActive) startListening();
  }
}

/* --- MODAL & DEMO --- */
const modal = $("voiceModal");
const listContainer = $("voiceListContainer");

function openModal() { modal?.classList.add("show"); renderVoiceList(); }
function closeModal() { modal?.classList.remove("show"); }

function renderVoiceList() {
  if (!listContainer) return;
  listContainer.innerHTML = "";

  VOICES.forEach(v => {
    const isSelected = (v.id === stagedId);
    const row = document.createElement("div");
    row.className = `voice-item ${isSelected ? "selected" : ""}`;
    row.innerHTML = `
      <div class="v-left">
        <button class="play-btn" type="button">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <div class="v-details">
          <div class="v-name">${v.label}</div>
          <div class="v-lang">${v.gender} • ${v.desc}</div>
        </div>
      </div>
      ${isSelected ? '<div style="color:#6366f1">✓</div>' : ''}
    `;

    // Seçim
    row.addEventListener("click", (e) => {
      if (e.target.closest(".play-btn")) return;
      stagedId = v.id;
      renderVoiceList();
    });

    // Demo (Gerçek Ses)
    const btn = row.querySelector(".play-btn");
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      btn.style.opacity = "0.5";
      const demoText = `Merhaba, ben ${v.label}. italkyAI ile konuşmaya hazırım!`;
      await playRealVoice(demoText, v.openaiVoice);
      btn.style.opacity = "1";
    });

    listContainer.appendChild(row);
  });
}

/* --- INIT --- */
document.addEventListener("DOMContentLoaded", () => {
  $("btnBack")?.addEventListener("click", () => location.href="/pages/home.html");
  $("btnSettings")?.addEventListener("click", openModal);
  $("closeVoiceModal")?.addEventListener("click", closeModal);
  
  $("saveVoiceBtn")?.addEventListener("click", () => {
    selectedId = stagedId;
    localStorage.setItem(KEY, selectedId);
    closeModal();
  });

  micBtn?.addEventListener("click", toggleConversation);
  setVisual("idle");

  if (!localStorage.getItem(KEY)) setTimeout(openModal, 600);
});
