import { BASE_DOMAIN } from "/js/config.js";

const $ = (id) => document.getElementById(id);

// --- KARAKTER LİSTESİ ---
const VOICES = [
  { id: "dora",   label: "Dora",   gender: "Kadın", openaiVoice: "nova",    desc: "Enerjik ve Neşeli ⚡" },
  { id: "ayda",   label: "Ayda",   gender: "Kadın", openaiVoice: "shimmer", desc: "Parlak ve Net ✨" },
  { id: "umay",   label: "Umay",   gender: "Kadın", openaiVoice: "alloy",   desc: "Dengeli ve Akıcı 💧" },
  { id: "sencer", label: "Sencer", gender: "Erkek", openaiVoice: "echo",    desc: "Sıcak ve Yankılı 🔥" },
  { id: "toygar", label: "Toygar", gender: "Erkek", openaiVoice: "fable",   desc: "Anlatıcı ve Vurgulu 🎭" },
  { id: "sungur", label: "Sungur", gender: "Erkek", openaiVoice: "onyx",    desc: "Derin ve Karizmatik 🗿" }
];

const KEY = "italky_voice_pref";
let selectedId = (localStorage.getItem(KEY) || "dora").trim();
let stagedId = selectedId; 
let isAutoMode = true;

// ✅ HAFIZA (HISTORY) LİSTESİ
// Sohbet boyunca konuşmaları burada tutacağız.
let chatHistory = []; 

function apiBase() { return String(BASE_DOMAIN || "").replace(/\/+$/, ""); }
function getSelectedVoice() { return VOICES.find(v => v.id === selectedId) || VOICES[0]; }

/* --- SES MOTORU --- */
let currentAudio = null;

function stopAudio() {
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
}

async function playRealVoice(text, openaiVoice, onEndCallback) {
  stopAudio();
  
  try {
    const res = await fetch(`${apiBase()}/api/tts_openai`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: openaiVoice, speed: 1.1 })
    });
    const data = await res.json();
    
    if (data.audio_base64) {
      setVisual("speaking"); // Görsel Tetikleyici
      const audio = new Audio("data:audio/mp3;base64," + data.audio_base64);
      currentAudio = audio;
      audio.onended = () => { 
        currentAudio = null; 
        if(onEndCallback) onEndCallback(); 
      };
      await audio.play();
    } else {
      if(onEndCallback) onEndCallback();
    }
  } catch (err) {
    console.error("TTS Hatası:", err);
    if(onEndCallback) onEndCallback();
  }
}

/* --- GÖRSEL --- */
const stage = $("aiStage");
const status = $("statusText");
const micBtn = $("micToggle");

function setVisual(state) {
  stage?.classList.remove("listening", "speaking", "thinking");
  micBtn?.classList.remove("active");
  status?.classList.remove("show");

  const v = getSelectedVoice();

  if (state === "listening") {
    stage?.classList.add("listening"); 
    micBtn?.classList.add("active");
    if(status) { 
      status.textContent = isAutoMode ? "Dinliyorum..." : "Konuşun..."; 
      status.classList.add("show"); 
    }
  } else if (state === "thinking") {
    stage?.classList.add("thinking");
    micBtn?.classList.add("active");
    if(status) { status.textContent = "Düşünüyor..."; status.classList.add("show"); }
  } else if (state === "speaking") {
    stage?.classList.add("speaking");
    micBtn?.classList.add("active");
    if(status) { status.textContent = v.label + " Konuşuyor..."; status.classList.add("show"); }
  } else {
    if(status) { status.textContent = "Başlat"; status.classList.add("show"); }
  }
}

/* --- SOHBET LOOP --- */
let isConversationActive = false;
let recognition = null;
let silenceTimer = null;

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
  if (recognition) { try{ recognition.stop(); }catch(e){} recognition = null; }
  if (silenceTimer) clearTimeout(silenceTimer);
  stopAudio();
  setVisual("idle");
}

function startListening() {
  if (!isConversationActive) return;
  
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = "tr-TR";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    if (isConversationActive) {
      setVisual("listening");
      if (isAutoMode) {
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          if (isConversationActive && stage.classList.contains("listening")) {
            console.log("Sessizlik timeout.");
            stopConversation();
            if(status) status.textContent = "Ses gelmedi.";
          }
        }, 6000);
      }
    }
  };

  recognition.onresult = (event) => {
    if(silenceTimer) clearTimeout(silenceTimer);
    const text = event.results[0][0].transcript;
    if (text && isConversationActive) processUserSpeech(text);
  };

  recognition.onerror = (e) => {
    if (isConversationActive && e.error !== 'aborted' && isAutoMode) {
      setTimeout(startListening, 300);
    }
  };

  try{ recognition.start(); }catch(e){}
}

async function processUserSpeech(userText) {
  setVisual("thinking");
  
  try {
    const v = getSelectedVoice();
    
    // 1. Kullanıcı mesajını hafızaya ekle
    chatHistory.push({ role: "user", content: userText });

    // 2. Backend'e gönder (Tarihçe ile birlikte)
    const chatRes = await fetch(`${apiBase()}/api/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        text: userText, 
        persona_name: v.label,
        history: chatHistory, // ✅ İŞTE KRİTİK NOKTA: Hafızayı gönderiyoruz
        max_tokens: 150
      })
    });
    
    const chatData = await chatRes.json();
    const aiReply = chatData.text || "Anlaşılamadı.";

    // 3. Yapay zeka cevabını da hafızaya ekle
    chatHistory.push({ role: "assistant", content: aiReply });
    
    // Hafıza çok şişerse son 20 mesajı tut (Optimizasyon)
    if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

    // 4. Konuş
    await playRealVoice(aiReply, v.openaiVoice, () => {
      if (isConversationActive && isAutoMode) startListening();
      else if (isConversationActive && !isAutoMode) stopConversation();
      else setVisual("idle");
    });

  } catch (err) {
    console.error(err);
    stopConversation();
  }
}

/* --- MODAL --- */
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
        <button class="play-btn" type="button"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>
        <div class="v-details"><div class="v-name">${v.label}</div><div class="v-lang">${v.gender} • ${v.desc}</div></div>
      </div>${isSelected ? '<div style="color:#6366f1">✓</div>' : ''}`;

    row.addEventListener("click", (e) => {
      if (e.target.closest(".play-btn")) return;
      stagedId = v.id;
      renderVoiceList();
    });

    row.querySelector(".play-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const btn = e.currentTarget;
      btn.style.opacity = "0.5";
      setVisual("speaking");
      playRealVoice(`Benim adım ${v.label}.`, v.openaiVoice, () => { 
        btn.style.opacity = "1"; setVisual("idle"); 
      });
    });

    listContainer.appendChild(row);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  $("btnBack")?.addEventListener("click", () => location.href="/pages/home.html");
  $("btnSettings")?.addEventListener("click", openModal);
  $("closeVoiceModal")?.addEventListener("click", closeModal);
  $("saveVoiceBtn")?.addEventListener("click", () => {
    selectedId = stagedId;
    localStorage.setItem(KEY, selectedId);
    // Karakter değişince hafızayı sıfırlayalım mı? 
    // Bence sıfırlamayalım, Oğuz olduğunu bilsin ama karakter değişsin.
    closeModal();
  });

  const btnAuto = $("modeAuto");
  const btnManual = $("modeManual");
  btnAuto?.addEventListener("click", () => { isAutoMode = true; btnAuto.classList.add("active"); btnManual.classList.remove("active"); stopConversation(); });
  btnManual?.addEventListener("click", () => { isAutoMode = false; btnManual.classList.add("active"); btnAuto.classList.remove("active"); stopConversation(); });

  micBtn?.addEventListener("click", toggleConversation);
  setVisual("idle");
  if (!localStorage.getItem(KEY)) setTimeout(openModal, 600);
});
