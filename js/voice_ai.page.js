import { BASE_DOMAIN } from "/js/config.js";

const $ = (id) => document.getElementById(id);

/* =========================
   SES LİSTESİ (OpenAI Modelleri)
   ========================= */
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

// Seçili sesi bul, yoksa ilkini döndür
function getSelectedVoice() {
  return VOICES.find(v => v.id === selectedId) || VOICES[0];
}

/* =========================
   TTS (METİNDEN SESE)
   ========================= */
async function tts(text, openaiVoice) {
  // Config yoksa boş string al, hata vermesin
  const base = String(BASE_DOMAIN || "").replace(/\/+$/, "");
  
  // API Çağrısı (Senin sunucuna)
  const r = await fetch(`${base}/api/tts_openai`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voice: openaiVoice,
      format: "mp3",
      speed: 1.0
    })
  });

  const raw = await r.text().catch(() => "");
  if (!r.ok) throw new Error(raw || `TTS Hatası: ${r.status}`);
  
  let data = {};
  try { data = JSON.parse(raw || "{}"); } catch {}
  
  const b64 = String(data.audio_base64 || "").trim();
  if (!b64) throw new Error("Ses verisi boş döndü.");
  
  return b64;
}

// Base64 sesi çal
async function playB64(b64) {
  return new Promise((resolve, reject) => {
    const a = new Audio(`data:audio/mp3;base64,${b64}`);
    a.onended = resolve;
    a.onerror = reject;
    a.play().catch(reject);
  });
}

/* =========================
   SES SEÇİM PENCERESİ (MODAL)
   ========================= */
function openModal() {
  const modal = $("voiceModal");
  if (modal) {
    modal.classList.add("show");
    renderVoiceList();
  }
}

function closeModal() {
  $("voiceModal")?.classList.remove("show");
}

function renderVoiceList() {
  const container = $("voiceListContainer");
  if (!container) return;
  
  container.innerHTML = "";

  VOICES.forEach(v => {
    const isSelected = (v.id === selectedId);
    
    const div = document.createElement("div");
    div.className = `voice-item ${isSelected ? "selected" : ""}`;
    div.innerHTML = `
      <div class="v-left">
        <button class="play-btn" title="Önizle">
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <div class="v-details">
          <div class="v-name">${v.label}</div>
          <div class="v-lang">${v.gender} • ${v.desc}</div>
        </div>
      </div>
      ${isSelected ? `<div style="color:#6366f1">✓</div>` : ""}
    `;

    // Satıra tıklayınca seç
    div.addEventListener("click", (e) => {
      // Play butonuna basıldıysa seçimi tetikleme
      if (e.target.closest(".play-btn")) return;
      
      // Seçimi güncelle
      document.querySelectorAll(".voice-item").forEach(el => el.classList.remove("selected"));
      div.classList.add("selected");
      selectedId = v.id; // Geçici seçim (Kaydet diyene kadar)
    });

    // Play butonu (Demo)
    const btn = div.querySelector(".play-btn");
    btn.addEventListener("click", async () => {
      const demoText = `Merhaba, ben ${v.label}. italkyAI ile konuşmaya hazır mısın?`;
      try {
        const b64 = await tts(demoText, v.openaiVoice);
        await playB64(b64);
      } catch (err) {
        alert("Demo çalınamadı: " + err.message);
      }
    });

    container.appendChild(div);
  });
}

/* =========================
   ANİMASYON DURUMLARI
   ========================= */
function setVisualState(state) {
  const stage = $("aiStage");
  const status = $("statusText");
  const mic = $("micToggle"); // Pro HTML'deki ID

  // Temizle
  stage?.classList.remove("listening", "speaking");
  mic?.classList.remove("active");
  status?.classList.remove("show");

  if (state === "listening") {
    // KULLANICI KONUŞUYOR
    stage?.classList.add("listening");
    mic?.classList.add("active");
    if (status) { status.textContent = "Dinliyorum..."; status.classList.add("show"); }
  
  } else if (state === "thinking") {
    // AI DÜŞÜNÜYOR
    if (status) { status.textContent = "Düşünüyor..."; status.classList.add("show"); }
  
  } else if (state === "speaking") {
    // AI KONUŞUYOR
    stage?.classList.add("speaking");
    if (status) { status.textContent = "Cevap Veriyor..."; status.classList.add("show"); }
  
  } else {
    // BOŞTA (IDLE)
    if (status) { status.textContent = "Dokun ve Konuş"; status.classList.add("show"); }
  }
}

/* =========================
   STT & MANTIK
   ========================= */
let recognition = null;
let isListening = false;

function initSTT() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = "tr-TR";
  r.interimResults = false; 
  r.continuous = false; 
  return r;
}

// Ana Mikrofon Butonu
function bindMic() {
  const btn = $("micToggle");
  if (!btn) return;

  btn.addEventListener("click", () => {
    // 1. Tarayıcı desteği kontrolü
    if (!recognition) {
      recognition = initSTT();
      if (!recognition) {
        alert("Tarayıcınız sesli komutu desteklemiyor. (Chrome/Android kullanın)");
        return;
      }

      // --- EVENTLER ---
      recognition.onstart = () => {
        isListening = true;
        setVisualState("listening");
      };

      recognition.onend = () => {
        isListening = false;
        // Eğer cevap verme moduna geçmediysek (hata olduysa veya sessizse) idle yap
        const stage = $("aiStage");
        if (stage && !stage.classList.contains("speaking")) {
          setVisualState("idle");
        }
      };

      recognition.onresult = async (e) => {
        const text = e.results[0][0].transcript;
        if (!text) return;

        // Düşünüyor moduna geç
        setVisualState("thinking");

        try {
          // A) Cevabı oluştur (Şimdilik basit echo, buraya AI Chat API gelecek)
          // const aiResponseText = await askAI(text); // İleride burası açılacak
          const aiResponseText = `Bunu söyledin: ${text}. Harika bir cümle!`;

          // B) Konuşuyor moduna geç
          setVisualState("speaking");

          // C) Sesi üret ve çal
          const currentVoice = getSelectedVoice();
          const b64 = await tts(aiResponseText, currentVoice.openaiVoice);
          await playB64(b64);

        } catch (err) {
          console.error(err);
          alert("Bir hata oluştu.");
        } finally {
          setVisualState("idle");
        }
      };
      
      recognition.onerror = (e) => {
        console.warn("STT Hatası:", e.error);
        setVisualState("idle");
      };
    }

    // Toggle Mantığı
    if (isListening) {
      recognition.stop();
    } else {
      try { recognition.start(); } catch (e) { console.error(e); }
    }
  });
}

/* =========================
   BAŞLAT
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  // Navigasyon
  $("settingsBtn")?.addEventListener("click", openModal);
  $("closeVoiceModal")?.addEventListener("click", closeModal);
  
  // Kaydet Butonu
  $("saveVoiceBtn")?.addEventListener("click", () => {
    if (selectedId) {
      localStorage.setItem(KEY, selectedId);
      closeModal();
      // Onay sesi (Opsiyonel)
    }
  });

  // Mikrofonu Bağla
  bindMic();

  // İlk açılışta ses seçili değilse modalı aç
  if (!localStorage.getItem(KEY)) {
    setTimeout(openModal, 500); // Animasyon otursun diye az bekle
  } else {
    // Ses varsa IDLE modunda başlat
    setVisualState("idle");
  }
});
