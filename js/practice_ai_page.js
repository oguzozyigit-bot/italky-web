// FILE: /js/practice_ai_page.js

import { supabase } from "/js/supabase_client.js";
import { setHeaderTokens } from "/js/ui_shell.js";
import { STORAGE_KEY } from "/js/config.js";
import {
  commitUsage
} from "/js/usage_meter.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const LANGS = {
  en: { name: "English", flag: "🇬🇧", bcp: "en-US", label: "İngilizce" },
  de: { name: "Deutsch", flag: "🇩🇪", bcp: "de-DE", label: "Almanca" },
  fr: { name: "Français", flag: "🇫🇷", bcp: "fr-FR", label: "Fransızca" },
  es: { name: "Español", flag: "🇪🇸", bcp: "es-ES", label: "İspanyolca" },
  it: { name: "Italiano", flag: "🇮🇹", bcp: "it-IT", label: "İtalyanca" }
};

const STORAGE = {
  lang: "italky_practice_ai_lang",
  history: "italky_practice_ai_history",
  usageTextIn: "italky_practice_ai_usage_text_in",
  usageTextOut: "italky_practice_ai_usage_text_out",
  usageVoiceOut: "italky_practice_ai_usage_voice_out"
};

const PRACTICE_REQUIRED_TOKENS = 1;
const PRACTICE_TEXT_STEP = 1500;
const PRACTICE_VOICE_STEP = 1500;
const MAX_REPEAT_FAIL = 5;

function resolveLang() {
  const q = new URLSearchParams(location.search);
  const fromQuery = String(q.get("lang") || "").trim().toLowerCase();
  const fromPractice = String(localStorage.getItem(STORAGE.lang) || "").trim().toLowerCase();
  const fromGame = String(localStorage.getItem("italky_game_lang") || "").trim().toLowerCase();

  const picked =
    (LANGS[fromQuery] && fromQuery) ||
    (LANGS[fromPractice] && fromPractice) ||
    (LANGS[fromGame] && fromGame) ||
    "en";

  localStorage.setItem(STORAGE.lang, picked);
  localStorage.setItem("italky_game_lang", picked);
  return picked;
}

let currentLang = resolveLang();

const state = {
  listening: false,
  speaking: false,
  recognition: null,
  targetPhrase: "",
  mustRepeat: false,
  level: "",
  lastSpokenAt: 0,
  repeatFailCount: 0
};

let audioCtx = null;
let currentPracticeAudio = null;
let currentSpeechUtterance = null;
let history = [];

try {
  history = JSON.parse(localStorage.getItem(STORAGE.history) || "[]");
  if (!Array.isArray(history)) history = [];
} catch {
  history = [];
}

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function patchCachedTokens(tokens) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const cached = raw ? JSON.parse(raw) : {};
    cached.tokens = Number(tokens || 0);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {}
}

function syncTokenUI(tokens) {
  const n = safeNum(tokens, 0);
  try { setHeaderTokens(n); } catch {}
  try { window.setHeaderTokens?.(n); } catch {}
  patchCachedTokens(n);
}

async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data?.user || null;
  } catch (e) {
    console.warn("getCurrentUser error:", e);
    return null;
  }
}

async function getTokenBalance() {
  try {
    const user = await getCurrentUser();
    if (!user?.id) return 0;

    const { data, error } = await supabase
      .from("profiles")
      .select("tokens")
      .eq("id", user.id)
      .maybeSingle();

    if (error) throw error;

    const tokens = safeNum(data?.tokens, 0);
    syncTokenUI(tokens);
    return tokens;
  } catch (e) {
    console.warn("getTokenBalance error:", e);
    return 0;
  }
}

function ensureTokenPopupStyles() {
  if (document.getElementById("practiceAiTokenPopupStyles")) return;

  const style = document.createElement("style");
  style.id = "practiceAiTokenPopupStyles";
  style.textContent = `
    .tp-backdrop{
      position:fixed;
      inset:0;
      z-index:999999;
      display:flex;
      align-items:center;
      justify-content:center;
      padding:18px;
      background:rgba(3,7,18,.72);
      backdrop-filter:blur(10px);
    }

    .tp-card{
      width:min(100%, 430px);
      border-radius:28px;
      overflow:hidden;
      border:1px solid rgba(255,255,255,.12);
      background:linear-gradient(180deg, rgba(10,14,28,.98), rgba(6,10,22,.98));
      box-shadow:0 24px 80px rgba(0,0,0,.45);
      color:#fff;
      font-family:Outfit,system-ui,sans-serif;
    }

    .tp-top{
      padding:20px 20px 14px;
      background:linear-gradient(135deg,#67e8f9,#60a5fa,#34d399);
      color:#08111d;
    }

    .tp-badge{
      display:inline-flex;
      align-items:center;
      gap:8px;
      padding:8px 12px;
      border-radius:999px;
      font-size:12px;
      font-weight:900;
      background:rgba(255,255,255,.24);
      border:1px solid rgba(255,255,255,.25);
    }

    .tp-title{
      margin:14px 0 6px;
      font-size:25px;
      font-weight:900;
      line-height:1.12;
    }

    .tp-sub{
      margin:0;
      font-size:14px;
      line-height:1.5;
      color:rgba(8,17,29,.86);
      font-weight:700;
    }

    .tp-body{
      padding:18px 20px 20px;
      display:grid;
      gap:12px;
    }

    .tp-box{
      border:1px solid rgba(255,255,255,.08);
      background:rgba(255,255,255,.04);
      border-radius:18px;
      padding:14px;
    }

    .tp-label{
      font-size:12px;
      color:rgba(255,255,255,.6);
      margin-bottom:6px;
    }

    .tp-value{
      font-size:18px;
      font-weight:900;
      color:#fff;
    }

    .tp-note{
      margin:2px 0 0;
      color:rgba(255,255,255,.76);
      font-size:13px;
      line-height:1.5;
    }

    .tp-actions{
      display:grid;
      gap:10px;
      margin-top:4px;
    }

    .tp-btn{
      appearance:none;
      border:none;
      width:100%;
      min-height:52px;
      border-radius:16px;
      cursor:pointer;
      font-weight:900;
      font-size:15px;
    }

    .tp-btn-primary{
      background:linear-gradient(135deg,#67e8f9,#60a5fa,#34d399);
      color:#08111d;
    }

    .tp-btn-secondary{
      background:rgba(255,255,255,.06);
      color:#fff;
      border:1px solid rgba(255,255,255,.1);
    }

    .lang-sheet{
      position:fixed;
      inset:0;
      z-index:999998;
      display:flex;
      align-items:flex-end;
      justify-content:center;
      background:rgba(3,7,18,.55);
      backdrop-filter:blur(8px);
      padding:14px;
    }

    .lang-sheet-card{
      width:min(100%, 460px);
      border-radius:24px;
      border:1px solid rgba(255,255,255,.12);
      background:linear-gradient(180deg, rgba(10,14,28,.98), rgba(6,10,22,.98));
      box-shadow:0 24px 80px rgba(0,0,0,.45);
      color:#fff;
      padding:16px;
      font-family:Outfit,system-ui,sans-serif;
    }

    .lang-sheet-title{
      margin:0 0 12px;
      font-size:20px;
      font-weight:900;
    }

    .lang-list{
      display:grid;
      gap:10px;
    }

    .lang-item{
      min-height:52px;
      border:none;
      border-radius:16px;
      cursor:pointer;
      padding:0 14px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      background:rgba(255,255,255,.05);
      border:1px solid rgba(255,255,255,.08);
      color:#fff;
      font-weight:800;
      font-size:15px;
    }

    .lang-item.active{
      background:linear-gradient(135deg, rgba(103,232,249,.18), rgba(96,165,250,.16));
      border-color:rgba(103,232,249,.34);
    }

    .lang-close{
      margin-top:12px;
      width:100%;
      min-height:48px;
      border:none;
      border-radius:16px;
      cursor:pointer;
      font-weight:900;
      font-size:15px;
      background:rgba(255,255,255,.06);
      color:#fff;
      border:1px solid rgba(255,255,255,.1);
    }
  `;
  document.head.appendChild(style);
}

function closeTokenPopup() {
  document.getElementById("practiceAiTokenBackdrop")?.remove();
}

function showTokenPopup({ tokens = 0, required = 1, reason = "Bu işlem için jeton gerekiyor." } = {}) {
  ensureTokenPopupStyles();
  closeTokenPopup();

  const backdrop = document.createElement("div");
  backdrop.className = "tp-backdrop";
  backdrop.id = "practiceAiTokenBackdrop";

  backdrop.innerHTML = `
    <div class="tp-card">
      <div class="tp-top">
        <div class="tp-badge">italkyAI • Jeton Gerekli</div>
        <div class="tp-title">Önce jeton lazım</div>
        <p class="tp-sub">${reason}</p>
      </div>

      <div class="tp-body">
        <div class="tp-box">
          <div class="tp-label">Mevcut jeton</div>
          <div class="tp-value">${tokens}</div>
        </div>

        <div class="tp-box">
          <div class="tp-label">Gerekli jeton</div>
          <div class="tp-value">${required}</div>
        </div>

        <p class="tp-note">
          Jeton olmadan Practice AI devam etmez.
        </p>

        <div class="tp-actions">
          <button class="tp-btn tp-btn-primary" id="tpBuyBtn">Jeton Al</button>
          <button class="tp-btn tp-btn-secondary" id="tpCloseBtn">Kapat</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  document.getElementById("tpBuyBtn")?.addEventListener("click", () => {
    location.href = "/pages/jetonbuy.html";
  });

  document.getElementById("tpCloseBtn")?.addEventListener("click", closeTokenPopup);

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeTokenPopup();
  });
}

function stopPracticeAudio() {
  try {
    if (currentPracticeAudio) {
      currentPracticeAudio.pause();
      currentPracticeAudio.currentTime = 0;
    }
  } catch {}
  currentPracticeAudio = null;

  try {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  } catch {}

  currentSpeechUtterance = null;
  state.speaking = false;
}

function lockPracticeForNoTokens(message = "Jetonun bitti. Practice AI devam etmek için jeton almalısın.") {
  try { state.recognition?.stop?.(); } catch {}
  try { window.speechSynthesis?.cancel?.(); } catch {}

  state.listening = false;
  state.speaking = false;
  state.mustRepeat = false;
  state.targetPhrase = "";
  state.repeatFailCount = 0;

  $("micBtn")?.classList.remove("listening");
  updateRepeatGuide("", "");
  setWorld("idle");
  setCaption("Jeton gerekli");
  setStatus("Jetonun bitti.");
  updateTranslation("Jetonun bitti. Devam etmek için jeton almalısın.");

  showTokenPopup({
    tokens: 0,
    required: PRACTICE_REQUIRED_TOKENS,
    reason: message
  });
}

async function ensureTokenAccess(reason = "Practice AI için jeton gerekli.") {
  const tokens = await getTokenBalance();

  if (tokens < PRACTICE_REQUIRED_TOKENS) {
    lockPracticeForNoTokens(reason);
    return false;
  }

  return true;
}

function getUsageCounter(key) {
  return safeNum(localStorage.getItem(key), 0);
}

function setUsageCounter(key, value) {
  localStorage.setItem(key, String(safeNum(value, 0)));
}

async function commitPracticeUsageIfNeeded(kind, chunkCount, meta = {}) {
  if (!chunkCount || chunkCount <= 0) return null;

  const result = await commitUsage({
    module: "practice_ai",
    usageKind: kind,
    charCount: chunkCount,
    note: `Practice AI ${kind} kullanımı`,
    meta: {
      surface: "practice_ai",
      ...meta
    }
  });

  if (typeof result?.tokens_after === "number") {
    syncTokenUI(result.tokens_after);
  }

  return result;
}

async function accumulatePracticeTextIn(text) {
  const len = String(text || "").trim().length;
  if (len <= 0) return;

  let current = getUsageCounter(STORAGE.usageTextIn);
  current += len;

  const chunks = Math.floor(current / PRACTICE_TEXT_STEP);
  current = current % PRACTICE_TEXT_STEP;
  setUsageCounter(STORAGE.usageTextIn, current);

  if (chunks > 0) {
    await commitPracticeUsageIfNeeded("text_in", chunks * PRACTICE_TEXT_STEP, {
      lang: currentLang,
      input_chars: len,
      billed_chunks: chunks
    });
  }
}

async function accumulatePracticeTextOut(text) {
  const len = String(text || "").trim().length;
  if (len <= 0) return;

  let current = getUsageCounter(STORAGE.usageTextOut);
  current += len;

  const chunks = Math.floor(current / PRACTICE_TEXT_STEP);
  current = current % PRACTICE_TEXT_STEP;
  setUsageCounter(STORAGE.usageTextOut, current);

  if (chunks > 0) {
    await commitPracticeUsageIfNeeded("text_out", chunks * PRACTICE_TEXT_STEP, {
      lang: currentLang,
      output_chars: len,
      billed_chunks: chunks
    });
  }
}

async function accumulatePracticeVoiceOut(text) {
  const len = String(text || "").trim().length;
  if (len <= 0) return;

  let current = getUsageCounter(STORAGE.usageVoiceOut);
  current += len;

  const chunks = Math.floor(current / PRACTICE_VOICE_STEP);
  current = current % PRACTICE_VOICE_STEP;
  setUsageCounter(STORAGE.usageVoiceOut, current);

  if (chunks > 0) {
    await commitPracticeUsageIfNeeded("voice_out", chunks * PRACTICE_VOICE_STEP, {
      lang: currentLang,
      output_chars: len,
      billed_chunks: chunks
    });
  }
}

async function getAuthHeaders() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const token = data?.session?.access_token || "";
    if (!token) {
      return { "Content-Type": "application/json" };
    }

    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    };
  } catch (e) {
    console.warn("getAuthHeaders error:", e);
    return { "Content-Type": "application/json" };
  }
}

function updateLangBadge() {
  const badge = $("langBadge");
  if (badge) badge.textContent = LANGS[currentLang]?.flag || "🌐";
}

function setWorld(mode = "idle") {
  const world = $("aiWorld");
  if (!world) return;
  world.classList.remove("listening", "speaking");
  if (mode === "listening") world.classList.add("listening");
  if (mode === "speaking") world.classList.add("speaking");
}

function setCaption(text = "") {
  const el = $("aiCaption");
  if (el) el.textContent = text;
}

function setStatus(text = "") {
  const el = $("statusLine");
  if (el) el.textContent = text;
}

function updateTranslation(text = "") {
  const el = $("turkishTranslation");
  if (el) el.textContent = text || "Öğretmeninin Türkçe açıklaması burada görünecek.";
}

function updateRepeatGuide(targetPhrase = "", repeatHintTr = "") {
  const wrap = $("repeatWrap");
  const phrase = $("repeatPhrase");
  const hint = $("repeatHint");

  const cleanPhrase = String(targetPhrase || "").trim();
  const cleanHint = String(repeatHintTr || "").trim();

  if (phrase) phrase.textContent = cleanPhrase;
  if (hint) hint.textContent = cleanHint;

  if (wrap) {
    wrap.style.display = cleanPhrase ? "flex" : "none";
  }
}

function saveState() {
  localStorage.setItem(STORAGE.lang, currentLang);
  localStorage.setItem(STORAGE.history, JSON.stringify(history.slice(-20)));
}

function closeLanguageSheet() {
  document.getElementById("practiceAiLangSheet")?.remove();
}

function openLanguageSheet() {
  ensureTokenPopupStyles();
  closeLanguageSheet();

  const sheet = document.createElement("div");
  sheet.className = "lang-sheet";
  sheet.id = "practiceAiLangSheet";

  const listHtml = Object.entries(LANGS).map(([code, item]) => {
    const active = code === currentLang ? "active" : "";
    return `
      <button class="lang-item ${active}" data-lang-code="${code}">
        <span>${item.flag} ${item.label}</span>
        <span>${code === currentLang ? "Seçili" : "Seç"}</span>
      </button>
    `;
  }).join("");

  sheet.innerHTML = `
    <div class="lang-sheet-card">
      <h3 class="lang-sheet-title">Dil seç</h3>
      <div class="lang-list">${listHtml}</div>
      <button class="lang-close" id="practiceAiLangClose">Kapat</button>
    </div>
  `;

  document.body.appendChild(sheet);

  sheet.querySelectorAll("[data-lang-code]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const code = String(btn.getAttribute("data-lang-code") || "").trim().toLowerCase();
      if (!LANGS[code]) return;

      currentLang = code;
      localStorage.setItem(STORAGE.lang, currentLang);
      localStorage.setItem("italky_game_lang", currentLang);

      try { state.recognition?.stop?.(); } catch {}

      state.recognition = null;
      state.listening = false;
      state.mustRepeat = false;
      state.targetPhrase = "";
      state.repeatFailCount = 0;
      updateRepeatGuide("", "");

      updateLangBadge();
      setWorld("idle");
      setCaption("Hazır");
      setStatus(`${LANGS[currentLang].label} seçildi.`);
      updateTranslation("Dil güncellendi. Öğretmen yeni dille devam edecek.");
      closeLanguageSheet();

      await startFirstTurn();
    });
  });

  $("practiceAiLangClose")?.addEventListener("click", closeLanguageSheet);

  sheet.addEventListener("click", (e) => {
    if (e.target === sheet) closeLanguageSheet();
  });
}

function bindLanguagePicker() {
  const badge = $("langBadge");
  if (!badge) return;

  badge.style.cursor = "pointer";
  badge.title = "Dil seç";

  badge.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const allowed = await ensureTokenAccess("Dil seçimini değiştirmek için jeton gerekiyor.");
    if (!allowed) return;

    openLanguageSheet();
  });
}

function ensureAudio() {
  try {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = AC ? new AC() : null;
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
  } catch {}
  return audioCtx;
}

function pickBestMaleVoice(bcp) {
  try {
    const voices = window.speechSynthesis?.getVoices?.() || [];
    if (!voices.length) return null;

    const short = bcp.split("-")[0].toLowerCase();
    const list = voices.filter(v =>
      String(v.lang || "").toLowerCase().startsWith(short)
    );
    if (!list.length) return null;

    const maleHint = list.find(v =>
      /male|david|mark|george|thomas|daniel|paul|alex|fred|jorge|diego|henri|luca|microsoft/i.test(
        `${v.name} ${v.voiceURI}`
      )
    );

    return maleHint || list[0] || null;
  } catch {
    return null;
  }
}

async function speakAI(text) {
  const clean = String(text || "").trim();
  if (!clean) return;

  stopPracticeAudio();

  const now = Date.now();
  if (now - state.lastSpokenAt < 120) return;
  state.lastSpokenAt = now;

  const bcp = LANGS[currentLang].bcp;
  state.speaking = true;
  setWorld("speaking");
  setCaption("Öğretmen konuşuyor...");

  try {
    await accumulatePracticeVoiceOut(clean);
  } catch (e) {
    console.error("PRACTICE VOICE USAGE ERROR:", e);

    if (String(e?.code || "").includes("INSUFFICIENT_TOKENS")) {
      lockPracticeForNoTokens("Seslendirme için jetonun bitti.");
      return;
    }
  }

  try {
    const { data } = await supabase.auth.getUser();
    const userId = data?.user?.id || null;

    const r = await fetch(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: clean,
        lang: currentLang,
        user_id: userId,
        voice: "male",
        tone: "neutral",
        module: "practice_ai"
      })
    });

    const j = await r.json().catch(() => null);
    if (r.ok && j?.ok && j?.audio_base64) {
      if (typeof j?.tokens_after === "number") {
        syncTokenUI(j.tokens_after);
      }

      const audio = new Audio(`data:audio/mp3;base64,${j.audio_base64}`);
      currentPracticeAudio = audio;
      audio.preload = "auto";
      audio.playsInline = true;

      audio.onended = () => {
        if (currentPracticeAudio === audio) currentPracticeAudio = null;
        state.speaking = false;
        setWorld(state.listening ? "listening" : "idle");
        setCaption("Hazır");
      };

      audio.onerror = () => {
        if (currentPracticeAudio === audio) currentPracticeAudio = null;
        state.speaking = false;
        setWorld(state.listening ? "listening" : "idle");
        setCaption("Hazır");
      };

      await audio.play();
      return;
    }
  } catch (e) {
    console.warn("Practice AI API TTS fallback:", e);
  }

  try {
    if (!("speechSynthesis" in window)) {
      state.speaking = false;
      setWorld(state.listening ? "listening" : "idle");
      setCaption("Hazır");
      return;
    }

    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(clean);
    currentSpeechUtterance = u;
    u.lang = bcp;
    u.rate = 1.0;
    u.pitch = 1.03;
    u.volume = 1;

    const v = pickBestMaleVoice(bcp);
    if (v) u.voice = v;

    u.onend = () => {
      if (currentSpeechUtterance === u) currentSpeechUtterance = null;
      state.speaking = false;
      setWorld(state.listening ? "listening" : "idle");
      setCaption("Hazır");
    };
    u.onerror = () => {
      if (currentSpeechUtterance === u) currentSpeechUtterance = null;
      state.speaking = false;
      setWorld(state.listening ? "listening" : "idle");
      setCaption("Hazır");
    };

    setTimeout(() => {
      try { window.speechSynthesis.speak(u); } catch {}
    }, 80);

  } catch {
    state.speaking = false;
    setWorld(state.listening ? "listening" : "idle");
    setCaption("Hazır");
  }
}

function safeJson(txt) {
  try { return JSON.parse(txt); } catch { return null; }
}

async function getProfileLevel() {
  try {
    const raw = localStorage.getItem("italky_user_v1") || "{}";
    const user = JSON.parse(raw);
    const levels = user?.levels || {};
    return levels?.[currentLang] || levels?.[currentLang.toUpperCase()] || "";
  } catch {
    return "";
  }
}

function detectLikelyTurkish(text) {
  const s = String(text || "").toLowerCase();
  if (!s.trim()) return false;

  const trChars = /[çğıöşü]/i.test(s);
  const trWords = [
    "ve", "ama", "çünkü", "merhaba", "nasılsın", "iyiyim", "ben", "sen",
    "bugün", "yarın", "bir", "iki", "evet", "hayır", "tamam", "neden"
  ];

  let hit = 0;
  for (const w of trWords) {
    if (s.includes(w)) hit++;
  }

  return trChars || hit >= 2;
}

function isWrongLanguageForLesson(spoken) {
  const clean = String(spoken || "").trim();
  if (!clean) return false;

  if (currentLang === "en") {
    return detectLikelyTurkish(clean);
  }

  return false;
}

function showUserSafeError() {
  setStatus("italkyAI şu anda yanıt oluşturamadı.");
  updateTranslation("italkyAI şu anda yanıt oluşturamadı. Lütfen tekrar dene.");
  updateRepeatGuide("", "");
  setCaption("Hazır");
  setWorld("idle");
}

async function askTeacher(userText, scoreValue = null) {
  const level = await getProfileLevel();
  const headers = await getAuthHeaders();

  const payload = {
    system_prompt: "practice_ai_teacher",
    prompt: `
Selected target language: ${LANGS[currentLang]?.label || currentLang}
Selected target language code: ${currentLang}
Profile level: ${level || "unknown"}
Student message: "${userText || ""}"
Current target phrase: "${state.targetPhrase || ""}"
Pronunciation score: ${typeof scoreValue === "number" ? scoreValue : "unknown"}
`,
    mode: "practice_teacher_only",
    lang: currentLang,
    response_format: "json",
    module: "practice_ai"
  };

  const res = await fetch(`${API_BASE}/api/practice/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  const raw = await res.text();
  console.log("PRACTICE CHAT RAW:", raw);

  if (!res.ok) {
    const parsedErr = safeJson(raw) || {};
    const detail = parsedErr.detail || raw || `HTTP ${res.status}`;

    if (String(detail).includes("insufficient_tokens")) {
      const err = new Error("Yetersiz jeton");
      err.code = "INSUFFICIENT_TOKENS";
      throw err;
    }

    throw new Error(`practice_chat_http_${res.status}: ${detail}`);
  }

  const data = safeJson(raw) || {};
  const parsed = safeJson(data?.text || "") || data || {};

  if (typeof data?.tokens_after === "number") {
    syncTokenUI(data.tokens_after);
  }

  return {
    reply: String(parsed.reply || "").trim(),
    reply_tr: String(parsed.reply_tr || "").trim(),
    target_phrase: String(parsed.target_phrase || "").trim(),
    repeat_hint_tr: String(parsed.repeat_hint_tr || "").trim(),
    should_repeat: Boolean(parsed.should_repeat),
    lesson_stage: String(parsed.lesson_stage || "").trim()
  };
}

function stripForCompare(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  const s = stripForCompare(a);
  const t = stripForCompare(b);
  const m = s.length;
  const n = t.length;

  if (!m) return n;
  if (!n) return m;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

function pronunciationScore(spoken, target) {
  const a = stripForCompare(spoken);
  const b = stripForCompare(target);
  if (!a || !b) return 0;
  if (a === b) return 100;
  const dist = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length) || 1;
  return Math.max(0, Math.round((1 - dist / maxLen) * 100));
}

function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = LANGS[currentLang].bcp;
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    state.listening = true;
    setWorld("listening");
    setCaption("Seni dinliyorum...");
    setStatus("Konuşabilirsin.");
    $("micBtn")?.classList.add("listening");
  };

  rec.onresult = async (e) => {
    let finalText = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const txt = e.results[i][0]?.transcript || "";
      if (e.results[i].isFinal) finalText += txt + " ";
    }

    if (finalText.trim()) {
      const spoken = finalText.trim();
      await handleUserSpeech(spoken);
    }
  };

  rec.onerror = () => {
    state.listening = false;
    $("micBtn")?.classList.remove("listening");
    if (!state.speaking) setWorld("idle");
    if (!state.speaking) setCaption("Hazır");
    setStatus("Mikrofon başlatılamadı.");
  };

  rec.onend = () => {
    state.listening = false;
    $("micBtn")?.classList.remove("listening");
    if (!state.speaking) setWorld("idle");
    if (!state.speaking) setCaption("Hazır");
  };

  return rec;
}

async function handleUserSpeech(spokenText) {
  const spoken = String(spokenText || "").trim();
  if (!spoken) return;

  if (isWrongLanguageForLesson(spoken)) {
    state.mustRepeat = false;
    state.targetPhrase = "";
    state.repeatFailCount = 0;
    updateRepeatGuide("", "");
    setStatus("Seçili dilde konuş.");
    updateTranslation("Seçili ders dili dışında konuştun. Lütfen seçili dilde cevap ver.");
    await speakAI(currentLang === "en"
      ? "Please answer in English."
      : "Please answer in the selected lesson language.");
    return;
  }

  let scoreValue = null;
  if (state.mustRepeat && state.targetPhrase) {
    scoreValue = pronunciationScore(spoken, state.targetPhrase);
    setStatus(`Telaffuz skoru: %${scoreValue}`);

    if (scoreValue >= 95) {
      state.repeatFailCount = 0;
    } else {
      state.repeatFailCount += 1;
    }
  } else {
    setStatus("Öğretmen düşünüyor...");
  }

  if (state.mustRepeat && state.targetPhrase && state.repeatFailCount >= MAX_REPEAT_FAIL) {
    state.mustRepeat = false;
    state.targetPhrase = "";
    state.repeatFailCount = 0;
    updateRepeatGuide("", "");
    updateTranslation("Olmadı ama bunu başaracağına eminim. Şimdi bir sonraki adıma geçelim.");
    setStatus("Devam edelim.");
    await speakAI(
      currentLang === "en"
        ? "That one was not easy, but I believe you can do it. Let us move on and come back to it later."
        : "Let us move on and come back to this later."
    );
    return;
  }

  try {
    await accumulatePracticeTextIn(spoken);

    const ai = await askTeacher(spoken, scoreValue);

    if (!ai.reply) {
      showUserSafeError();
      return;
    }

    await accumulatePracticeTextOut(ai.reply);

    history.push({
      role: "ai",
      text: ai.reply,
      tr: ai.reply_tr,
      score: scoreValue
    });
    history = history.slice(-24);

    updateTranslation(ai.reply_tr || ai.reply);

    if (ai.should_repeat && ai.target_phrase) {
      state.mustRepeat = true;
      state.targetPhrase = ai.target_phrase;
      updateRepeatGuide(ai.target_phrase, ai.repeat_hint_tr || "");
    } else {
      state.mustRepeat = false;
      state.targetPhrase = "";
      state.repeatFailCount = 0;
      updateRepeatGuide("", "");
    }

    saveState();
    await speakAI(ai.reply);
    setStatus(state.mustRepeat ? "Tekrarla." : "Devam edelim.");
  } catch (e) {
    console.error("PRACTICE CHAT ERROR:", e);

    if (String(e?.code || "").includes("INSUFFICIENT_TOKENS")) {
      lockPracticeForNoTokens("Jetonun bitti. Practice AI devam etmek için jeton almalısın.");
      return;
    }

    showUserSafeError();
  }
}

async function startFirstTurn() {
  const allowed = await ensureTokenAccess("Practice AI öğretmenini başlatmak için jeton gerekiyor.");
  if (!allowed) return;

  try {
    const ai = await askTeacher("", null);

    if (!ai.reply) {
      showUserSafeError();
      return;
    }

    await accumulatePracticeTextOut(ai.reply);

    history.push({ role: "ai", text: ai.reply, tr: ai.reply_tr });
    updateTranslation(ai.reply_tr || ai.reply);

    state.mustRepeat = Boolean(ai.should_repeat);
    state.targetPhrase = ai.target_phrase || "";
    state.repeatFailCount = 0;

    if (state.mustRepeat && state.targetPhrase) {
      updateRepeatGuide(ai.target_phrase, ai.repeat_hint_tr || "");
    } else {
      updateRepeatGuide("", "");
    }

    saveState();
    await speakAI(ai.reply);
  } catch (e) {
    console.error("PRACTICE START ERROR:", e);

    if (String(e?.code || "").includes("INSUFFICIENT_TOKENS")) {
      lockPracticeForNoTokens("Practice AI öğretmenini başlatmak için jeton gerekiyor.");
      return;
    }

    showUserSafeError();
  }
}

function stopAll() {
  try { state.recognition?.stop?.(); } catch {}
  stopPracticeAudio();
  state.listening = false;
  state.speaking = false;
  setWorld("idle");
  setCaption("Hazır");
  setStatus("Durduruldu.");
  $("micBtn")?.classList.remove("listening");
}

$("micBtn")?.addEventListener("click", async () => {
  ensureAudio();
  try {
    if (window.speechSynthesis?.getVoices) window.speechSynthesis.getVoices();
  } catch {}

  const allowed = await ensureTokenAccess("Practice AI konuşmasını başlatmak için jeton gerekiyor.");
  if (!allowed) return;

  stopPracticeAudio();

  if (state.listening) {
    stopAll();
    return;
  }

  state.recognition = initRecognition();
  if (!state.recognition) {
    setStatus("Ses tanıma yok.");
    return;
  }

  try {
    state.recognition.start();
  } catch {
    setStatus("Mikrofon başlatılamadı.");
  }
});

window.addEventListener("click", () => {
  try { window.speechSynthesis?.getVoices?.(); } catch {}
}, { once: true });

window.addEventListener("touchstart", () => {
  try { window.speechSynthesis?.getVoices?.(); } catch {}
}, { once: true });

window.onload = async () => {
  updateLangBadge();
  bindLanguagePicker();
  setWorld("idle");
  setCaption("Hazır");
  updateTranslation("Öğretmen birazdan başlayacak.");
  updateRepeatGuide("", "");
  await getTokenBalance();
  await startFirstTurn();
};
