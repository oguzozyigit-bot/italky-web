// FILE: /js/voice_ai.page.js
// FINAL — Voice AI (OpenAI text + OpenAI TTS) + subtitles dissolve + 60s/day FREE gate + PRO unlimited
// - Text generation: POST /api/chat_openai   ✅ (NEW)
// - TTS:            POST /api/tts_openai     ✅ (your existing base64 endpoint)
// - STT:            Web SpeechRecognition (browser)
//
// Requires voice_ai.html contains: <div id="subtitleStream" class="subtitles"></div>

import { STORAGE_KEY } from "/js/config.js";
import { apiPOST } from "/js/api.js";

const $ = (id) => document.getElementById(id);
function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }

/* ===============================
   AUTH GUARD (home/profile standard)
   =============================== */
function termsKey(email = "") {
  return `italky_terms_accepted_at::${String(email || "").toLowerCase().trim()}`;
}
function getUser() {
  return safeJson(localStorage.getItem(STORAGE_KEY), {});
}
function ensureLogged() {
  const u = getUser();
  if (!u || !u.email) { location.replace("/index.html"); return null; }
  if (!localStorage.getItem(termsKey(u.email))) { location.replace("/index.html"); return null; }
  return u;
}

/* ===============================
   PLAN
   =============================== */
function isPro(u) {
  const p = String(u?.plan || "").toUpperCase().trim();
  return p === "PRO" || p === "PREMIUM" || p === "PLUS";
}

/* ===============================
   DAILY FREE 60s (voice)
   - counts: mic listening seconds + AI wait seconds
   =============================== */
const FREE_SECONDS_PER_DAY = 60; // PROD: 60 (testte 600 yapabilirsin)
const MIN_AI_WAIT_CHARGE = 1;
const MAX_AI_WAIT_CHARGE = 15;

function uidKey(u) {
  return String(u.user_id || u.id || u.email || "guest").toLowerCase().trim();
}
function isoDateLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function usageKey(u) {
  return `italky_voice_free_used_sec::${uidKey(u)}::${isoDateLocal()}`;
}
function getUsed(u) {
  if (isPro(u)) return 0;
  const v = Number(localStorage.getItem(usageKey(u)) || "0");
  return Number.isFinite(v) ? Math.max(0, v) : 0;
}
function setUsed(u, sec) {
  if (isPro(u)) return;
  localStorage.setItem(usageKey(u), String(Math.max(0, Math.floor(sec))));
}
function addUsed(u, add) {
  if (isPro(u)) return 0;
  const cur = getUsed(u);
  const next = cur + Math.max(0, Math.floor(add));
  setUsed(u, next);
  return next;
}
function remaining(u) {
  if (isPro(u)) return 9999;
  return Math.max(0, FREE_SECONDS_PER_DAY - getUsed(u));
}
function canUse(u) {
  if (isPro(u)) return true;
  return remaining(u) > 0;
}

/* ===============================
   PAYWALL
   =============================== */
let paywallEl = null;

function disableControls(disabled) {
  const mic = $("micToggle");
  const modeA = $("modeAuto");
  const modeM = $("modeManual");
  const settings = $("btnSettings");

  if (mic) mic.disabled = disabled;
  if (modeA) modeA.disabled = disabled;
  if (modeM) modeM.disabled = disabled;
  if (settings) settings.style.pointerEvents = disabled ? "none" : "auto";
}

function showPaywall(u) {
  if (isPro(u)) return;
  if (paywallEl) return;

  stopConversation();
  setVisual("idle");
  if (status) { status.textContent = "Süre Bitti"; status.classList.add("show"); }
  disableControls(true);

  paywallEl = document.createElement("div");
  paywallEl.style.position = "fixed";
  paywallEl.style.inset = "0";
  paywallEl.style.zIndex = "99998";
  paywallEl.style.background = "rgba(0,0,0,.85)";
  paywallEl.style.display = "flex";
  paywallEl.style.alignItems = "center";
  paywallEl.style.justifyContent = "center";
  paywallEl.style.padding = "18px";

  const card = document.createElement("div");
  card.style.width = "min(420px, calc(100vw - 36px))";
  card.style.borderRadius = "26px";
  card.style.border = "1px solid rgba(255,255,255,.14)";
  card.style.background = "rgba(8,8,20,.90)";
  card.style.backdropFilter = "blur(18px)";
  card.style.boxShadow = "0 40px 120px rgba(0,0,0,.75)";
  card.style.padding = "16px";

  const title = document.createElement("div");
  title.style.fontWeight = "1000";
  title.style.fontSize = "16px";
  title.style.marginBottom = "8px";
  title.textContent = "Günlük ücretsiz süre bitti";

  const body = document.createElement("div");
  body.style.fontWeight = "800";
  body.style.fontSize = "12px";
  body.style.color = "rgba(255,255,255,.78)";
  body.style.lineHeight = "1.45";
  body.textContent = "Bugünlük 60 saniyelik ücretsiz kullanım hakkın doldu. Abonelik sadece uygulama içinden (Play Store / yakında App Store).";

  const meter = document.createElement("div");
  meter.style.marginTop = "12px";
  meter.style.padding = "10px 12px";
  meter.style.borderRadius = "16px";
  meter.style.border = "1px solid rgba(255,255,255,.10)";
  meter.style.background = "rgba(255,255,255,.05)";
  meter.style.fontWeight = "900";
  meter.style.fontSize = "12px";
  meter.textContent = `Bugünkü kalan: ${remaining(u)}s`;

  const row = document.createElement("div");
  row.style.display = "flex";
  row.style.gap = "10px";
  row.style.marginTop = "14px";

  const btnSub = document.createElement("button");
  btnSub.type = "button";
  btnSub.textContent = "Uygulamadan Abone Ol";
  btnSub.style.flex = "1";
  btnSub.style.height = "46px";
  btnSub.style.borderRadius = "16px";
  btnSub.style.border = "none";
  btnSub.style.cursor = "pointer";
  btnSub.style.fontWeight = "1000";
  btnSub.style.color = "#fff";
  btnSub.style.background = "linear-gradient(135deg, #A5B4FC, #4F46E5)";
  btnSub.addEventListener("click", () => {
    alert("Abonelik uygulama içinden yapılır.");
  });

  const btnClose = document.createElement("button");
  btnClose.type = "button";
  btnClose.textContent = "Kapat";
  btnClose.style.flex = "1";
  btnClose.style.height = "46px";
  btnClose.style.borderRadius = "16px";
  btnClose.style.border = "1px solid rgba(255,255,255,.14)";
  btnClose.style.cursor = "pointer";
  btnClose.style.fontWeight = "1000";
  btnClose.style.color = "#fff";
  btnClose.style.background = "rgba(255,255,255,.06)";
  btnClose.addEventListener("click", () => {
    paywallEl?.remove?.();
    paywallEl = null;
    alert("Ücretsiz süre bitti.");
  });

  row.appendChild(btnSub);
  row.appendChild(btnClose);

  card.appendChild(title);
  card.appendChild(body);
  card.appendChild(meter);
  card.appendChild(row);

  paywallEl.appendChild(card);
  paywallEl.addEventListener("click", (e) => { if (e.target === paywallEl) btnClose.click(); });

  document.body.appendChild(paywallEl);
}

/* ===============================
   HTTPS check for mic
   =============================== */
function ensureHttpsForMic() {
  if (location.protocol === "https:" || location.hostname === "localhost") return true;
  alert("Mikrofon için HTTPS gerekli. (Vercel/HTTPS kullan)");
  return false;
}

/* ===============================
   SUBTITLES STREAM (SYNCED)
   - user text shows immediately and fades
   - ai text shows immediately but fades only after audio ends
   =============================== */
function createSubtitle(text, who = "ai", { autoFade = true } = {}) {
  const stream = $("subtitleStream");
  if (!stream) return null;

  const t = String(text || "").trim();
  if (!t) return null;

  while (stream.children.length > 2) {
    try { stream.removeChild(stream.firstChild); } catch { break; }
  }

  const line = document.createElement("div");
  line.className = `subline ${who === "user" ? "user" : "ai"}`;
  line.textContent = t;
  stream.appendChild(line);

  if (autoFade) {
    setTimeout(() => line.classList.add("fadeout"), 900);
    setTimeout(() => { try { line.remove(); } catch {} }, 900 + 2800);
  }

  return line;
}

function fadeSubtitle(line) {
  if (!line) return;
  try {
    line.classList.add("fadeout");
    setTimeout(() => { try { line.remove(); } catch {} }, 2800);
  } catch {}
}

/* ===============================
   YOUR CHARACTER LIST
   =============================== */
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

// ✅ voice chat memory (OpenAI text)
let chatHistory = [];

let silenceRetryCount = 0;
const MAX_SILENCE_RETRIES = 2;

function getSelectedVoice() { return VOICES.find(v => v.id === selectedId) || VOICES[0]; }

/* ===============================
   AUDIO (OpenAI TTS via backend)
   =============================== */
let currentAudio = null;

function stopAudio() {
  if (currentAudio) { try { currentAudio.pause(); } catch {} currentAudio = null; }
}

async function playRealVoice(text, openaiVoice, onEndCallback, subtitleLine = null) {
  stopAudio();

  try {
    const data = await apiPOST("/api/tts_openai", { text, voice: openaiVoice, speed: 1.1 }, { timeoutMs: 45000 });

    if (data?.audio_base64) {
      setVisual("speaking");

      const audio = new Audio("data:audio/mp3;base64," + data.audio_base64);
      currentAudio = audio;

      audio.onended = () => {
        currentAudio = null;
        fadeSubtitle(subtitleLine);
        if (onEndCallback) onEndCallback();
      };

      await audio.play();
    } else {
      fadeSubtitle(subtitleLine);
      if (onEndCallback) onEndCallback();
    }
  } catch (err) {
    console.error("TTS Hatası:", err);
    fadeSubtitle(subtitleLine);
    if (onEndCallback) onEndCallback();
  }
}

/* ===============================
   VISUAL
   =============================== */
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
    if (status) {
      if (silenceRetryCount > 0) status.textContent = "Cevap Bekliyor...";
      else status.textContent = isAutoMode ? "Dinliyorum..." : "Konuşun...";
      status.classList.add("show");
    }
  } else if (state === "thinking") {
    stage?.classList.add("thinking");
    micBtn?.classList.add("active");
    if (status) { status.textContent = "Düşünüyor..."; status.classList.add("show"); }
  } else if (state === "speaking") {
    stage?.classList.add("speaking");
    micBtn?.classList.add("active");
    if (status) { status.textContent = v.label + " Konuşuyor..."; status.classList.add("show"); }
  } else {
    if (status) { status.textContent = "Başlat"; status.classList.add("show"); }
  }
}

/* ===============================
   OpenAI CHAT (NEW endpoint)
   POST /api/chat_openai
   =============================== */
async function apiVoiceTextOpenAI(text, personaName, history) {
  const data = await apiPOST("/api/chat_openai", {
    text,
    persona_name: personaName,
    history: (history || []).slice(-6),
    max_tokens: 140
  }, { timeoutMs: 25000 });

  return String(data?.text || "").trim() || "...";
}

/* ===============================
   Conversation loop
   =============================== */
let uGlobal = null;

let isConversationActive = false;
let recognition = null;
let silenceTimer = null;

// quota timing (mic)
let listenStartTs = 0;

function toggleConversation() {
  if (isConversationActive) stopConversation();
  else startConversation();
}

function startConversation() {
  if (!uGlobal) return;
  if (!canUse(uGlobal)) { showPaywall(uGlobal); return; }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { alert("Tarayıcı desteklemiyor."); return; }
  if (!ensureHttpsForMic()) return;

  isConversationActive = true;
  silenceRetryCount = 0;
  startListening();
}

function stopConversation() {
  isConversationActive = false;
  if (recognition) { try { recognition.stop(); } catch {} recognition = null; }
  if (silenceTimer) { try { clearTimeout(silenceTimer); } catch {} silenceTimer = null; }
  stopAudio();
  setVisual("idle");
}

function startListening() {
  if (!uGlobal || !isConversationActive) return;

  if (!canUse(uGlobal)) { showPaywall(uGlobal); return; }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.lang = "tr-TR";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    if (!isConversationActive) return;
    setVisual("listening");
    listenStartTs = Date.now();

    if (isAutoMode) {
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        if (isConversationActive && stage?.classList.contains("listening")) {
          handleSilence();
        }
      }, 10000);
    }
  };

  recognition.onresult = (event) => {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceRetryCount = 0;

    const text = String(event.results?.[0]?.[0]?.transcript || "").trim();
    if (text && isConversationActive) processUserSpeech(text, false);
  };

  recognition.onerror = (e) => {
    if (isConversationActive && e.error !== "aborted" && isAutoMode) {
      setTimeout(startListening, 500);
    }
  };

  recognition.onend = () => {
    // ✅ charge mic listening seconds (FREE only)
    if (uGlobal && !isPro(uGlobal)) {
      const sec = (Date.now() - listenStartTs) / 1000;
      addUsed(uGlobal, sec);
      if (!canUse(uGlobal)) { showPaywall(uGlobal); return; }
    }

    if (isConversationActive && isAutoMode) {
      if (!stage?.classList.contains("thinking") && !stage?.classList.contains("speaking")) {
        setTimeout(() => startListening(), 250);
      }
    }
  };

  try { recognition.start(); } catch {}
}

// silence nudge
async function handleSilence() {
  if (!uGlobal) return;
  if (!canUse(uGlobal)) { showPaywall(uGlobal); return; }

  if (silenceRetryCount >= MAX_SILENCE_RETRIES) {
    stopConversation();
    if (status) status.textContent = "Görüşürüz...";
    return;
  }

  silenceRetryCount++;

  const nudgePrompt =
    `(SİSTEM UYARISI: Kullanıcı 10 saniyedir sessiz. Eğer kullanıcının ismini biliyorsan ismini kullanarak, bilmiyorsan samimi bir şekilde: "Ne oldu sustun? Sohbet hoşuna gitmedi mi? Konuşmanı bekliyorum" minvalinde, biraz trip atan, samimi ve canlı tek bir cümle kur.)`;

  processUserSpeech(nudgePrompt, true);
}

async function processUserSpeech(text, isSystemTrigger = false) {
  if (!uGlobal) return;
  if (!canUse(uGlobal)) { showPaywall(uGlobal); return; }

  setVisual("thinking");

  try {
    const v = getSelectedVoice();

    // ✅ user subtitle now
    if (!isSystemTrigger) createSubtitle(text, "user", { autoFade: true });

    // ✅ voice chat memory (OpenAI)
    chatHistory.push({ role: "user", content: text });
    if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);

    const started = Date.now();

    // ✅ TEXT from OpenAI endpoint
    const aiReply = await apiVoiceTextOpenAI(text, v.label, chatHistory);

    // ✅ charge AI wait seconds (FREE only)
    if (!isPro(uGlobal)) {
      const elapsed = (Date.now() - started) / 1000;
      const charge = Math.max(MIN_AI_WAIT_CHARGE, Math.min(MAX_AI_WAIT_CHARGE, Math.floor(elapsed)));
      addUsed(uGlobal, charge);
      if (!canUse(uGlobal)) { showPaywall(uGlobal); return; }
    }

    const replyText = aiReply || "Orada mısın?";

    // ✅ save assistant in memory
    chatHistory.push({ role: "assistant", content: replyText });
    if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);

    // ✅ subtitle shown now, fades when audio ends
    const aiLine = createSubtitle(replyText, "ai", { autoFade: false });

    await playRealVoice(replyText, v.openaiVoice, () => {
      if (isConversationActive && isAutoMode) startListening();
      else if (isConversationActive && !isAutoMode) stopConversation();
      else setVisual("idle");
    }, aiLine);

  } catch (err) {
    console.error(err);
    stopConversation();
  }
}

/* ===============================
   MODAL
   =============================== */
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

    row.querySelector(".play-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!uGlobal) return;
      if (!canUse(uGlobal)) { showPaywall(uGlobal); return; }

      const btn = e.currentTarget;
      btn.style.opacity = "0.5";
      setVisual("speaking");
      const line = createSubtitle(`Benim adım ${v.label}.`, "ai", { autoFade: false });

      await playRealVoice(`Benim adım ${v.label}.`, v.openaiVoice, () => {
        btn.style.opacity = "1";
        setVisual("idle");
      }, line);
    });

    listContainer.appendChild(row);
  });
}

/* ===============================
   BOOT
   =============================== */
document.addEventListener("DOMContentLoaded", () => {
  uGlobal = ensureLogged();
  if (!uGlobal) return;

  $("btnBack")?.addEventListener("click", () => location.href="/pages/home.html");
  $("btnSettings")?.addEventListener("click", openModal);
  $("closeVoiceModal")?.addEventListener("click", closeModal);
  $("saveVoiceBtn")?.addEventListener("click", () => {
    selectedId = stagedId;
    localStorage.setItem(KEY, selectedId);
    closeModal();
  });

  const btnAuto = $("modeAuto");
  const btnManual = $("modeManual");
  btnAuto?.addEventListener("click", () => {
    isAutoMode = true;
    btnAuto.classList.add("active");
    btnManual?.classList.remove("active");
    stopConversation();
  });
  btnManual?.addEventListener("click", () => {
    isAutoMode = false;
    btnManual.classList.add("active");
    btnAuto?.classList.remove("active");
    stopConversation();
  });

  micBtn?.addEventListener("click", () => {
    if (!uGlobal) return;
    if (!canUse(uGlobal)) { showPaywall(uGlobal); return; }
    toggleConversation();
  });

  setVisual("idle");
  if (!localStorage.getItem(KEY)) setTimeout(openModal, 600);
  if (!canUse(uGlobal)) showPaywall(uGlobal);
});
