// FILE: /js/voice_ai.page.js
// TEACHER COURSE ENGINE v1 (Immersion + Repeat Drill + 95% similarity + 3 attempts)
// - Text generation: POST /api/chat_openai
// - TTS:            POST /api/tts_openai
// - STT:            Web SpeechRecognition
//
// Rules:
// - Teacher NEVER speaks Turkish. If Turkish detected: English-only warning + template.
// - Teacher MUST output:
//    TEACH: ...
//    REPEAT: <one sentence>
// - Subtitles DO NOT fade. Keep last 20 lines.
// - Similarity threshold: 0.95, attempts: 3

import { STORAGE_KEY } from "/js/config.js";
import { apiPOST } from "/js/api.js";

const $ = (id) => document.getElementById(id);
function safeJson(s, fb = {}) { try { return JSON.parse(s || ""); } catch { return fb; } }

/* ===============================
   AUTH GUARD
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
   PLAN / FREE GATE (kept from your code)
   =============================== */
function isPro(u) {
  const p = String(u?.plan || "").toUpperCase().trim();
  return p === "PRO" || p === "PREMIUM" || p === "PLUS";
}
const FREE_SECONDS_PER_DAY = 600; // PROD: 60
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
   PAYWALL (same)
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
  body.textContent = "Bugünlük ücretsiz kullanım hakkın doldu. Abonelik sadece uygulama içinden (Play Store / yakında App Store).";

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
   SUBTITLES STREAM (NO FADE, keep last 20)
   =============================== */
const MAX_LINES = 20;
function createSubtitle(text, who = "ai") {
  const stream = $("subtitleStream");
  if (!stream) return null;

  const t = String(text || "").trim();
  if (!t) return null;

  while (stream.children.length >= MAX_LINES) {
    try { stream.removeChild(stream.firstChild); } catch { break; }
  }

  const line = document.createElement("div");
  line.className = `subline ${who === "user" ? "user" : "ai"}`;
  line.textContent = t;
  stream.appendChild(line);
  return line;
}

/* ===============================
   YOUR TEACHERS (language mapping)
   =============================== */
const TEACHERS = [
  { id:"dora",   label:"Dora",   lang:"en", stt:"en-US", openaiVoice:"nova",    desc:"🇬🇧 English Teacher" },
  { id:"sencer", label:"Sencer", lang:"it", stt:"it-IT", openaiVoice:"echo",    desc:"🇮🇹 Italian Teacher" },
  { id:"jale",   label:"Jale",   lang:"fr", stt:"fr-FR", openaiVoice:"alloy",   desc:"🇫🇷 French Teacher" },
  { id:"ozan",   label:"Ozan",   lang:"es", stt:"es-ES", openaiVoice:"fable",   desc:"🇪🇸 Spanish Teacher" },
  { id:"ayda",   label:"Ayda",   lang:"de", stt:"de-DE", openaiVoice:"shimmer", desc:"🇩🇪 German Teacher" },
  { id:"sungur", label:"Sungur", lang:"ru", stt:"ru-RU", openaiVoice:"onyx",    desc:"🇷🇺 Russian Teacher" },
  { id:"huma",   label:"Hüma",   lang:"ja", stt:"ja-JP", openaiVoice:"nova",    desc:"🇯🇵 Japanese Teacher" }
];

const KEY = "italky_teacher_pref";
let selectedId = (localStorage.getItem(KEY) || "dora").trim();
let stagedId = selectedId;

function getSelectedTeacher(){ return TEACHERS.find(t=>t.id===selectedId) || TEACHERS[0]; }

/* ===============================
   STRICT IMMERSION RULES
   =============================== */
function looksTurkish(s){
  const t = String(s||"").toLowerCase();
  // türkçe karakter + bazı tipik kelimeler
  if (/[çğıöşü]/.test(t)) return true;
  if (/\b(ve|ama|neden|nasıl|ben|sen|biz|siz|çok|şimdi|bugün|yarın|ders|öğretmen|anlamadım)\b/.test(t)) return true;
  return false;
}

function englishOnlyMessage(teacher){
  // teacher.lang dilinde kısa uyarı + örnek şablon
  // (teacher.lang zaten hedef dil)
  const L = teacher.lang;
  if (L === "en") return "English only. Try: “I don’t understand. Can you repeat, please?”";
  if (L === "de") return "Nur Deutsch. Versuch: „Ich verstehe nicht. Können Sie das bitte wiederholen?“";
  if (L === "fr") return "Français seulement. Essaie : « Je ne comprends pas. Pouvez-vous répéter, s’il vous plaît ? »";
  if (L === "it") return "Solo italiano. Prova: « Non capisco. Puoi ripetere, per favore? »";
  if (L === "es") return "Solo español. Intenta: « No entiendo. ¿Puedes repetir, por favor? »";
  if (L === "ru") return "Только по-русски. Скажи: «Я не понимаю. Повторите, пожалуйста.»";
  if (L === "ja") return "日本語だけ。言ってみて：『わかりません。もう一度お願いします。』";
  return "This class is target-language only. Please try again.";
}

/* ===============================
   SIMILARITY (95% token-based)
   =============================== */
function normText(s){
  return String(s||"")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu," ")
    .replace(/\s+/g," ")
    .trim();
}
function tokenSimilarity(a,b){
  const A = normText(a).split(" ").filter(Boolean);
  const B = normText(b).split(" ").filter(Boolean);
  if(!A.length && !B.length) return 1;
  if(!A.length || !B.length) return 0;

  // simple token match ratio with position sensitivity
  const len = Math.max(A.length, B.length);
  let hit = 0;
  for(let i=0;i<Math.min(A.length,B.length);i++){
    if(A[i] === B[i]) hit++;
  }
  // allow unordered bonus
  const setB = new Set(B);
  let bagHit = 0;
  for(const w of A){ if(setB.has(w)) bagHit++; }
  const posScore = hit / len;
  const bagScore = bagHit / len;
  return Math.max(posScore, bagScore);
}

const TARGET_SIM = 0.95;
const MAX_TRIES = 3;

/* ===============================
   AUDIO (OpenAI TTS via backend)
   =============================== */
let currentAudio = null;

function stopAudio() {
  if (currentAudio) { try { currentAudio.pause(); } catch {} currentAudio = null; }
}

async function playRealVoice(text, openaiVoice, onEndCallback) {
  stopAudio();
  try {
    const data = await apiPOST("/api/tts_openai", { text, voice: openaiVoice, speed: 1.05 }, { timeoutMs: 45000 });
    if (data?.audio_base64) {
      setVisual("speaking");
      const audio = new Audio("data:audio/mp3;base64," + data.audio_base64);
      currentAudio = audio;
      audio.onended = () => {
        currentAudio = null;
        if (onEndCallback) onEndCallback();
      };
      await audio.play();
    } else {
      if (onEndCallback) onEndCallback();
    }
  } catch (err) {
    console.error("TTS Hatası:", err);
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

  const t = getSelectedTeacher();

  if (state === "listening") {
    stage?.classList.add("listening");
    micBtn?.classList.add("active");
    if (status) { status.textContent = "Listening…"; status.classList.add("show"); }
  } else if (state === "thinking") {
    stage?.classList.add("thinking");
    micBtn?.classList.add("active");
    if (status) { status.textContent = "Thinking…"; status.classList.add("show"); }
  } else if (state === "speaking") {
    stage?.classList.add("speaking");
    micBtn?.classList.add("active");
    if (status) { status.textContent = `${t.label} speaking…`; status.classList.add("show"); }
  } else {
    if (status) { status.textContent = "Start"; status.classList.add("show"); }
  }
}

/* ===============================
   OpenAI CHAT (Teacher prompt)
   =============================== */
function teacherSystemPrompt(teacher){
  // NEVER mention OpenAI/Gemini/AI. Always be the teacher of italkyAI.
  // Force output format TEACH/REPEAT.
  const lang = teacher.lang;
  const teacherName = teacher.label;

  return `
You are ${teacherName}, a professional ${lang.toUpperCase()} language teacher inside the italkyAI app.
CRITICAL RULES:
- You never speak Turkish. You never translate to Turkish.
- You never mention OpenAI, GPT, model, AI, Gemini or any provider. You are simply the teacher in italkyAI.
- You teach like a real teacher who does not know Turkish.
- Keep responses short and structured.
OUTPUT FORMAT (mandatory):
TEACH: (1-2 short lines in the target language)
REPEAT: (ONE single sentence in the target language, easy A1/A2 style)
The REPEAT sentence must be the exact sentence the student should say.
If the student uses Turkish, respond with English-only warning in the target language and still provide a REPEAT line.
`.trim();
}

async function apiTeacherText(text, teacher, history) {
  // We embed system prompt as first "assistant" message in history
  const sys = teacherSystemPrompt(teacher);

  const h = [
    { role:"assistant", content: sys },
    ...(history || []).slice(-6)
  ];

  const data = await apiPOST("/api/chat_openai", {
    text,
    persona_name: teacher.label, // label only; never "OpenAI"
    history: h,
    max_tokens: 180
  }, { timeoutMs: 25000 });

  return String(data?.text || "").trim() || "";
}

function parseTeachRepeat(reply){
  const raw = String(reply||"").trim();
  // Find TEACH and REPEAT lines (robust)
  let teach = raw;
  let repeat = "";

  const mRepeat = raw.match(/REPEAT:\s*([^\n\r]+)/i);
  if(mRepeat) repeat = String(mRepeat[1]||"").trim();

  const mTeach = raw.match(/TEACH:\s*([\s\S]*?)(?:\n|\r|$)REPEAT:/i);
  if(mTeach) teach = String(mTeach[1]||"").trim();

  // fallback: if no REPEAT found, use last sentence of raw as repeat
  if(!repeat){
    const parts = raw.split(/[\n\r]+/).map(x=>x.trim()).filter(Boolean);
    repeat = parts[parts.length-1] || "";
  }
  if(!teach) teach = raw;

  return { teach, repeat };
}

/* ===============================
   Conversation state machine
   =============================== */
let uGlobal = null;
let isAutoMode = true;
let isConversationActive = false;
let recognition = null;
let silenceTimer = null;

// FREE quota timing (mic)
let listenStartTs = 0;

// Lesson/Repeat state
let pendingRepeatText = ""; // what student must repeat
let triesLeft = MAX_TRIES;

let chatHistory = []; // {role, content}

function resetRepeat(){
  pendingRepeatText = "";
  triesLeft = MAX_TRIES;
}

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
  resetRepeat();
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
  const teacher = getSelectedTeacher();

  recognition = new SR();
  recognition.lang = teacher.stt; // ✅ teacher language STT
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
          // nudge in target language
          const msg = englishOnlyMessage(teacher);
          createSubtitle(msg, "ai");
          playRealVoice(msg, teacher.openaiVoice, () => {
            if (isConversationActive && isAutoMode) startListening();
          });
        }
      }, 12000);
    }
  };

  recognition.onresult = (event) => {
    if (silenceTimer) clearTimeout(silenceTimer);

    const text = String(event.results?.[0]?.[0]?.transcript || "").trim();
    if (text && isConversationActive) processUserSpeech(text);
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

async function processUserSpeech(text) {
  if (!uGlobal) return;
  if (!canUse(uGlobal)) { showPaywall(uGlobal); return; }

  const teacher = getSelectedTeacher();

  // user line (keep)
  createSubtitle(text, "user");

  // Turkish check (teacher never speaks Turkish)
  if (looksTurkish(text)) {
    const msg = englishOnlyMessage(teacher);
    createSubtitle(msg, "ai");
    await playRealVoice(msg, teacher.openaiVoice, () => {
      if (isConversationActive && isAutoMode) startListening();
      else if (isConversationActive && !isAutoMode) stopConversation();
      else setVisual("idle");
    });
    return;
  }

  // If we are in REPEAT CHECK mode:
  if (pendingRepeatText) {
    const score = tokenSimilarity(text, pendingRepeatText);
    if (score >= TARGET_SIM) {
      const okMsg = teacher.lang === "en" ? "Good." :
                    teacher.lang === "de" ? "Gut." :
                    teacher.lang === "fr" ? "Bien." :
                    teacher.lang === "it" ? "Bene." :
                    teacher.lang === "es" ? "Bien." :
                    teacher.lang === "ru" ? "Хорошо." :
                    teacher.lang === "ja" ? "いいですね。" : "Good.";
      createSubtitle(`${okMsg} (${Math.round(score*100)}%)`, "ai");
      await playRealVoice(okMsg, teacher.openaiVoice, () => {});
      // Clear repeat and continue with next lesson step by calling teacher again with a short "continue"
      resetRepeat();
      await teacherNext("Continue.");
      return;
    } else {
      triesLeft -= 1;
      const msg =
        teacher.lang === "en" ? `Not yet. Try again. (${Math.round(score*100)}% • tries left: ${triesLeft})` :
        teacher.lang === "de" ? `Noch nicht. Versuch es noch mal. (${Math.round(score*100)}% • Versuche: ${triesLeft})` :
        teacher.lang === "fr" ? `Pas encore. Réessaie. (${Math.round(score*100)}% • essais: ${triesLeft})` :
        teacher.lang === "it" ? `Non ancora. Riprova. (${Math.round(score*100)}% • tentativi: ${triesLeft})` :
        teacher.lang === "es" ? `Aún no. Inténtalo otra vez. (${Math.round(score*100)}% • intentos: ${triesLeft})` :
        teacher.lang === "ru" ? `Пока нет. Попробуй ещё раз. (${Math.round(score*100)}% • попыток: ${triesLeft})` :
        teacher.lang === "ja" ? `まだです。もう一度。(${Math.round(score*100)}% • 残り: ${triesLeft})` :
        `Try again. (${Math.round(score*100)}% • ${triesLeft})`;

      createSubtitle(msg, "ai");
      await playRealVoice(msg, teacher.openaiVoice, () => {});

      if (triesLeft <= 0) {
        // Move on
        const move =
          teacher.lang === "en" ? "Okay. We move on." :
          teacher.lang === "de" ? "Okay. Wir machen weiter." :
          teacher.lang === "fr" ? "D’accord. On continue." :
          teacher.lang === "it" ? "Ok. Andiamo avanti." :
          teacher.lang === "es" ? "Vale. Seguimos." :
          teacher.lang === "ru" ? "Ладно. Продолжим." :
          teacher.lang === "ja" ? "わかりました。次に行きます。" : "Okay. We move on.";
        createSubtitle(move, "ai");
        await playRealVoice(move, teacher.openaiVoice, () => {});
        resetRepeat();
        await teacherNext("Continue.");
        return;
      }

      // Repeat target sentence again
      const again = pendingRepeatText;
      createSubtitle(`REPEAT: ${again}`, "ai");
      await playRealVoice(again, teacher.openaiVoice, () => {
        if (isConversationActive && isAutoMode) startListening();
        else if (isConversationActive && !isAutoMode) stopConversation();
        else setVisual("idle");
      });

      return;
    }
  }

  // Otherwise: normal teacher step
  await teacherNext(text);
}

async function teacherNext(userText){
  if(!uGlobal) return;
  if(!canUse(uGlobal)) { showPaywall(uGlobal); return; }

  const teacher = getSelectedTeacher();
  setVisual("thinking");

  // voice chat memory
  chatHistory.push({ role:"user", content: userText });
  if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);

  const started = Date.now();

  let reply = "";
  try{
    reply = await apiTeacherText(userText, teacher, chatHistory);
  }catch(e){
    console.error(e);
    reply = "";
  }

  // charge AI wait seconds
  if (!isPro(uGlobal)) {
    const elapsed = (Date.now() - started) / 1000;
    const charge = Math.max(MIN_AI_WAIT_CHARGE, Math.min(MAX_AI_WAIT_CHARGE, Math.floor(elapsed)));
    addUsed(uGlobal, charge);
    if (!canUse(uGlobal)) { showPaywall(uGlobal); return; }
  }

  const { teach, repeat } = parseTeachRepeat(reply);
  const teachText = teach ? String(teach).trim() : "";
  const repeatText = repeat ? String(repeat).trim() : "";

  // Store assistant memory (raw)
  chatHistory.push({ role:"assistant", content: reply || "" });
  if (chatHistory.length > 10) chatHistory = chatHistory.slice(-10);

  // Show TEACH
  if(teachText){
    createSubtitle(`TEACH: ${teachText}`, "ai");
    await playRealVoice(teachText, teacher.openaiVoice, () => {});
  }

  // Prepare repeat drill
  if(repeatText){
    pendingRepeatText = repeatText;
    triesLeft = MAX_TRIES;
    createSubtitle(`REPEAT: ${repeatText}`, "ai");
    await playRealVoice(repeatText, teacher.openaiVoice, () => {
      if (isConversationActive && isAutoMode) startListening();
      else if (isConversationActive && !isAutoMode) stopConversation();
      else setVisual("idle");
    });
    return;
  }

  // Fallback: if no repeat, continue listening
  if (isConversationActive && isAutoMode) startListening();
  else if (isConversationActive && !isAutoMode) stopConversation();
  else setVisual("idle");
}

/* ===============================
   MODAL (Teacher Select)
   =============================== */
const modal = $("voiceModal");
const listContainer = $("voiceListContainer");

function openModal() { modal?.classList.add("show"); renderTeacherList(); }
function closeModal() { modal?.classList.remove("show"); }

function renderTeacherList() {
  if (!listContainer) return;
  listContainer.innerHTML = "";

  TEACHERS.forEach(t => {
    const isSelected = (t.id === stagedId);
    const row = document.createElement("div");
    row.className = `voice-item ${isSelected ? "selected" : ""}`;
    row.innerHTML = `
      <div class="v-left">
        <button class="play-btn" type="button"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></button>
        <div class="v-details">
          <div class="v-name">${t.label}</div>
          <div class="v-lang">${t.desc}</div>
        </div>
      </div>
      ${isSelected ? '<div style="color:#6366f1;font-weight:1000;">✓</div>' : ''}
    `;

    row.addEventListener("click", (e) => {
      if (e.target.closest(".play-btn")) return;
      stagedId = t.id;
      renderTeacherList();
    });

    row.querySelector(".play-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!uGlobal) return;
      if (!canUse(uGlobal)) { showPaywall(uGlobal); return; }

      const btn = e.currentTarget;
      btn.style.opacity = "0.5";

      setVisual("speaking");
      const sample =
        t.lang === "en" ? "Hello. I am your English teacher." :
        t.lang === "de" ? "Hallo. Ich bin deine Deutschlehrerin." :
        t.lang === "fr" ? "Bonjour. Je suis votre prof de français." :
        t.lang === "it" ? "Ciao. Sono il tuo insegnante di italiano." :
        t.lang === "es" ? "Hola. Soy tu profesor de español." :
        t.lang === "ru" ? "Привет. Я ваш преподаватель русского." :
        t.lang === "ja" ? "こんにちは。日本語の先生です。" :
        "Hello. I am your teacher.";

      createSubtitle(sample, "ai");
      await playRealVoice(sample, t.openaiVoice, () => {
        btn.style.opacity = "1";
        setVisual("idle");
      });
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
    // reset lesson state on teacher change
    chatHistory = [];
    resetRepeat();
    setVisual("idle");
    const t = getSelectedTeacher();
    createSubtitle(`${t.desc}`, "ai");
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

  $("micToggle")?.addEventListener("click", () => {
    if (!uGlobal) return;
    if (!canUse(uGlobal)) { showPaywall(uGlobal); return; }
    toggleConversation();
  });

  setVisual("idle");

  // auto open teacher select first time
  if (!localStorage.getItem(KEY)) setTimeout(openModal, 500);

  // show remaining info
  createSubtitle(isPro(uGlobal) ? "PRO: unlimited" : `Daily remaining: ${remaining(uGlobal)}s`, "ai");
  if (!canUse(uGlobal)) showPaywall(uGlobal);
});
