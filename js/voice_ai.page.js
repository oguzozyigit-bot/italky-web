// FILE: /js/voice_ai.page.js
// FINAL — synced subtitles + 600s/day (test) + PRO unlimited
// Change back to 60 for prod later.

import { STORAGE_KEY } from "/js/config.js";
import { apiPOST } from "/js/api.js";

const $ = (id) => document.getElementById(id);
function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }

/* AUTH */
function termsKey(email = "") { return `italky_terms_accepted_at::${String(email || "").toLowerCase().trim()}`; }
function getUser() { return safeJson(localStorage.getItem(STORAGE_KEY), {}); }
function ensureLogged() {
  const u = getUser();
  if (!u?.email) { location.replace("/index.html"); return null; }
  if (!localStorage.getItem(termsKey(u.email))) { location.replace("/index.html"); return null; }
  return u;
}

/* PLAN */
function isPro(u) {
  const p = String(u?.plan || "").toUpperCase().trim();
  return p === "PRO" || p === "PREMIUM" || p === "PLUS";
}

/* ===== DAILY FREE (TEST) ===== */
const FREE_SECONDS_PER_DAY = 600; // ✅ TEST: 600s/day
const MIN_AI_WAIT_CHARGE = 1;
const MAX_AI_WAIT_CHARGE = 15;

function uidKey(u) { return String(u.user_id || u.id || u.email || "guest").toLowerCase().trim(); }
function isoDateLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function usageKey(u) { return `italky_voice_free_used_sec::${uidKey(u)}::${isoDateLocal()}`; }
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
  const next = getUsed(u) + Math.max(0, Math.floor(add));
  setUsed(u, next);
  return next;
}
function remaining(u) { return isPro(u) ? 9999 : Math.max(0, FREE_SECONDS_PER_DAY - getUsed(u)); }
function canUse(u) { return isPro(u) ? true : remaining(u) > 0; }

/* PAYWALL (same) */
let paywallEl = null;
function disableControls(disabled) {
  $("micToggle") && ($("micToggle").disabled = disabled);
  $("modeAuto") && ($("modeAuto").disabled = disabled);
  $("modeManual") && ($("modeManual").disabled = disabled);
  const s = $("btnSettings");
  if (s) s.style.pointerEvents = disabled ? "none" : "auto";
}
function showPaywall(u) {
  if (isPro(u)) return;
  if (paywallEl) return;
  stopConversation();
  setVisual("idle");
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
  paywallEl.innerHTML = `
    <div style="width:min(420px, calc(100vw - 36px));border-radius:26px;border:1px solid rgba(255,255,255,.14);background:rgba(8,8,20,.90);backdrop-filter:blur(18px);box-shadow:0 40px 120px rgba(0,0,0,.75);padding:16px;">
      <div style="font-weight:1000;font-size:16px;margin-bottom:8px;">Günlük ücretsiz süre bitti</div>
      <div style="font-weight:800;font-size:12px;color:rgba(255,255,255,.78);line-height:1.45;">
        Bugünlük ücretsiz kullanım hakkın doldu. Abonelik sadece uygulama içinden.
      </div>
      <div style="margin-top:12px;padding:10px 12px;border-radius:16px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.05);font-weight:900;font-size:12px;">
        Bugünkü kalan: ${remaining(u)}s
      </div>
      <div style="display:flex;gap:10px;margin-top:14px;">
        <button id="pwSub" style="flex:1;height:46px;border-radius:16px;border:none;cursor:pointer;font-weight:1000;color:#fff;background:linear-gradient(135deg,#A5B4FC,#4F46E5);">Uygulamadan Abone Ol</button>
        <button id="pwClose" style="flex:1;height:46px;border-radius:16px;border:1px solid rgba(255,255,255,.14);cursor:pointer;font-weight:1000;color:#fff;background:rgba(255,255,255,.06);">Kapat</button>
      </div>
    </div>
  `;
  document.body.appendChild(paywallEl);
  paywallEl.querySelector("#pwSub").onclick = () => alert("Abonelik uygulama içinden yapılır.");
  paywallEl.querySelector("#pwClose").onclick = () => { paywallEl.remove(); paywallEl = null; };
}

/* HTTPS mic */
function ensureHttpsForMic() {
  if (location.protocol === "https:" || location.hostname === "localhost") return true;
  alert("Mikrofon için HTTPS gerekli.");
  return false;
}

/* Subtitles sync */
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

/* Characters */
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
let chatHistory = [];

let silenceRetryCount = 0;
const MAX_SILENCE_RETRIES = 2;

function getSelectedVoice() { return VOICES.find(v => v.id === selectedId) || VOICES[0]; }

/* Audio */
let currentAudio = null;
function stopAudio() { if (currentAudio) { try { currentAudio.pause(); } catch {} currentAudio = null; } }

async function playRealVoice(text, openaiVoice, onEndCallback, subtitleLine = null) {
  stopAudio();
  try {
    const data = await apiPOST("/api/tts_openai", { text, voice: openaiVoice, speed: 1.1 }, { timeoutMs: 45000 });
    if (data?.audio_base64) {
      setVisual("speaking");
      const audio = new Audio("data:audio/mp3;base64," + data.audio_base64);
      currentAudio = audio;
      audio.onended = () => { currentAudio = null; fadeSubtitle(subtitleLine); onEndCallback?.(); };
      await audio.play();
    } else {
      fadeSubtitle(subtitleLine);
      onEndCallback?.();
    }
  } catch {
    fadeSubtitle(subtitleLine);
    onEndCallback?.();
  }
}

/* Visuals */
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
      status.textContent = (silenceRetryCount > 0) ? "Cevap Bekliyor..." : (isAutoMode ? "Dinliyorum..." : "Konuşun...");
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

/* Conversation */
let uGlobal = null;
let isConversationActive = false;
let recognition = null;
let silenceTimer = null;
let listenStartTs = 0;

function toggleConversation() { if (isConversationActive) stopConversation(); else startConversation(); }

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
        if (isConversationActive && stage?.classList.contains("listening")) handleSilence();
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
    if (isConversationActive && e.error !== "aborted" && isAutoMode) setTimeout(startListening, 500);
  };

  recognition.onend = () => {
    if (uGlobal && !isPro(uGlobal)) {
      const sec = (Date.now() - listenStartTs) / 1000;
      addUsed(uGlobal, sec);
      if (!canUse(uGlobal)) { showPaywall(uGlobal); return; }
    }
    if (isConversationActive && isAutoMode) {
      if (!stage?.classList.contains("thinking") && !stage?.classList.contains("speaking")) setTimeout(startListening, 250);
    }
  };

  try { recognition.start(); } catch {}
}

async function handleSilence() {
  if (!uGlobal) return;
  if (!canUse(uGlobal)) { showPaywall(uGlobal); return; }

  if (silenceRetryCount >= MAX_SILENCE_RETRIES) {
    stopConversation();
    if (status) status.textContent = "Görüşürüz...";
    return;
  }

  silenceRetryCount++;
  const nudgePrompt = `(SİSTEM UYARISI: Kullanıcı 10 saniyedir sessiz. Samimi tek cümleyle dürt.)`;
  processUserSpeech(nudgePrompt, true);
}

async function processUserSpeech(text, isSystemTrigger = false) {
  if (!uGlobal) return;
  if (!canUse(uGlobal)) { showPaywall(uGlobal); return; }

  setVisual("thinking");

  try {
    const v = getSelectedVoice();

    if (!isSystemTrigger) createSubtitle(text, "user", { autoFade: true });

    chatHistory.push({ role: "user", content: text });
    if (chatHistory.length > 8) chatHistory = chatHistory.slice(-8);

    const started = Date.now();

    const chatData = await apiPOST("/api/chat", {
      text,
      persona_name: v.label,
      history: chatHistory,
      max_tokens: 120
    }, { timeoutMs: 25000 });

    if (!isPro(uGlobal)) {
      const elapsed = (Date.now() - started) / 1000;
      const charge = Math.max(MIN_AI_WAIT_CHARGE, Math.min(MAX_AI_WAIT_CHARGE, Math.floor(elapsed)));
      addUsed(uGlobal, charge);
      if (!canUse(uGlobal)) { showPaywall(uGlobal); return; }
    }

    const aiReply = String(chatData?.text || "").trim() || "Orada mısın?";

    chatHistory.push({ role: "assistant", content: aiReply });
    if (chatHistory.length > 8) chatHistory = chatHistory.slice(-8);

    const aiLine = createSubtitle(aiReply, "ai", { autoFade: false });

    await playRealVoice(aiReply, v.openaiVoice, () => {
      if (isConversationActive && isAutoMode) startListening();
      else if (isConversationActive && !isAutoMode) stopConversation();
      else setVisual("idle");
    }, aiLine);

  } catch {
    stopConversation();
  }
}

/* Modal */
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

/* Boot */
document.addEventListener("DOMContentLoaded", () => {
  uGlobal = ensureLogged();
  if (!uGlobal) return;

  $("btnBack")?.addEventListener("click", () => location.href = "/pages/home.html");
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
