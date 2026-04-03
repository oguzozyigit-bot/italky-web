// FILE: /js/practice_ai_page.js

import { supabase } from "/js/supabase_client.js";
import {
  commitUsage,
  resolveUsageModule,
  buildUsageNote
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
  lang: "italky_practice_lang_v3",
  history: "italky_practice_ai_history_v4"
};

const PRACTICE_REQUIRED_TOKENS = 1;

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

try {
  const root = getComputedStyle(document.documentElement);
  const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
  document.documentElement.style.setProperty(
    "--shellLift",
    footerH ? `${footerH + 10}px` : "0px"
  );
} catch {}

let history = [];
try {
  history = JSON.parse(localStorage.getItem(STORAGE.history) || "[]");
  if (!Array.isArray(history)) history = [];
} catch {
  history = [];
}

const state = {
  listening: false,
  speaking: false,
  recognition: null,
  targetPhrase: "",
  mustRepeat: false,
  level: "",
  userProfile: null,
  lastSpokenAt: 0
};

let audioCtx = null;

/* ---------------------------------------------------
   TOKEN ACCESS
--------------------------------------------------- */
function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
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
    return safeNum(data?.tokens, 0);
  } catch (e) {
    console.warn("getTokenBalance error:", e);
    return 0;
  }
}

function ensureTokenPopupStyles() {
  if (document.getElementById("practiceTokenPopupStyles")) return;

  const style = document.createElement("style");
  style.id = "practiceTokenPopupStyles";
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
      transition:transform .14s ease, opacity .14s ease;
    }

    .tp-btn:active{
      transform:scale(.985);
    }

    .tp-btn-primary{
      background:linear-gradient(135deg,#67e8f9,#60a5fa,#34d399);
      color:#08111d;
      box-shadow:0 10px 24px rgba(96,165,250,.22);
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
  document.getElementById("practiceTokenBackdrop")?.remove();
}

function showTokenPopup({ tokens = 0, required = 1, reason = "Bu işlem için jeton gerekiyor." } = {}) {
  ensureTokenPopupStyles();
  closeTokenPopup();

  const backdrop = document.createElement("div");
  backdrop.className = "tp-backdrop";
  backdrop.id = "practiceTokenBackdrop";

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
          Jeton olmadan bu işlem başlamaz. Önce jeton al, sonra devam et.
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

async function ensureTokenAccess(reason = "Practice AI için jeton gerekli.") {
  const tokens = await getTokenBalance();

  if (tokens < PRACTICE_REQUIRED_TOKENS) {
    showTokenPopup({
      tokens,
      required: PRACTICE_REQUIRED_TOKENS,
      reason
    });
    return false;
  }

  return true;
}

/* ---------------------------------------------------
   AUTH HEADER
--------------------------------------------------- */
async function getAuthHeaders() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;

    const token = data?.session?.access_token || "";
    if (!token) {
      console.warn("No session token");
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

/* ---------------------------------------------------
   USAGE
--------------------------------------------------- */
function practiceTextUsageModule() {
  return resolveUsageModule({
    surface: "practice",
    kind: "text",
    mode: "ai"
  });
}

function practiceVoiceUsageModule() {
  return resolveUsageModule({
    surface: "practice",
    kind: "voice",
    mode: "ai"
  });
}

async function chargePracticeTextUsage(inputText, outputText) {
  const inLen = String(inputText || "").trim().length;
  const outLen = String(outputText || "").trim().length;
  const billableChars = Math.max(inLen, outLen);

  if (billableChars <= 0) return null;

  return await commitUsage({
    module: practiceTextUsageModule(),
    usageKind: "text",
    charCount: billableChars,
    note: buildUsageNote({
      surface: "practice",
      usageKind: "text",
      mode: "ai"
    }),
    meta: {
      surface: "practice_ai",
      lang: currentLang,
      input_chars: inLen,
      output_chars: outLen,
      billable_chars: billableChars
    }
  });
}

async function chargePracticeVoiceUsage(text) {
  const charCount = String(text || "").trim().length;
  if (charCount <= 0) return null;

  return await commitUsage({
    module: practiceVoiceUsageModule(),
    usageKind: "voice",
    charCount,
    note: buildUsageNote({
      surface: "practice",
      usageKind: "voice",
      mode: "ai"
    }),
    meta: {
      surface: "practice_ai",
      lang: currentLang,
      output_chars: charCount,
      billable_chars: charCount
    }
  });
}

function redirectForInsufficientTokens(err) {
  if (err?.code === "INSUFFICIENT_TOKENS") {
    showTokenPopup({
      tokens: 0,
      required: PRACTICE_REQUIRED_TOKENS,
      reason: "Jetonun yetersiz. Devam etmek için jeton almalısın."
    });
    return true;
  }
  return false;
}

/* ---------------------------------------------------
   UI
--------------------------------------------------- */
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
  if (el) el.textContent = text || "Hoşgeldin. Öğretmen birazdan gelecek...";
}

function saveState() {
  localStorage.setItem(STORAGE.lang, currentLang);
  localStorage.setItem(STORAGE.history, JSON.stringify(history.slice(-20)));
}

/* ---------------------------------------------------
   LANGUAGE SHEET
--------------------------------------------------- */
function closeLanguageSheet() {
  document.getElementById("practiceLangSheet")?.remove();
}

function openLanguageSheet() {
  ensureTokenPopupStyles();
  closeLanguageSheet();

  const sheet = document.createElement("div");
  sheet.className = "lang-sheet";
  sheet.id = "practiceLangSheet";

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
      <button class="lang-close" id="practiceLangClose">Kapat</button>
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

      try {
        if (state.recognition) {
          state.recognition.stop();
        }
      } catch {}

      state.recognition = null;
      state.listening = false;
      state.mustRepeat = false;
      state.targetPhrase = "";

      updateLangBadge();
      setWorld("idle");
      setCaption("Hazır");
      setStatus(`${LANGS[currentLang].label} seçildi.`);
      updateTranslation("Dil güncellendi. Yeni öğretmen şimdi geliyor.");
      closeLanguageSheet();

      await startFirstTurn();
    });
  });

  $("practiceLangClose")?.addEventListener("click", closeLanguageSheet);

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

/* ---------------------------------------------------
   AUDIO / TTS
--------------------------------------------------- */
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

  const now = Date.now();
  if (now - state.lastSpokenAt < 250) return;
  state.lastSpokenAt = now;

  const bcp = LANGS[currentLang].bcp;
  state.speaking = true;
  setWorld("speaking");
  setCaption("Öğretmen konuşuyor...");

  try {
    await chargePracticeVoiceUsage(clean);
  } catch (e) {
    console.error("PRACTICE VOICE USAGE ERROR:", e);
    if (redirectForInsufficientTokens(e)) return;
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
      const audio = new Audio(`data:audio/mp3;base64,${j.audio_base64}`);
      audio.preload = "auto";
      audio.playsInline = true;

      audio.onended = () => {
        state.speaking = false;
        setWorld(state.listening ? "listening" : "idle");
        setCaption("Hazır");
      };

      audio.onerror = () => {
        state.speaking = false;
        setWorld(state.listening ? "listening" : "idle");
        setCaption("Hazır");
      };

      await audio.play();
      return;
    }
  } catch (e) {
    console.warn("Practice API TTS failed, fallback browser TTS:", e);
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
    u.lang = bcp;
    u.rate = 0.98;
    u.pitch = 1.04;
    u.volume = 1;

    const v = pickBestMaleVoice(bcp);
    if (v) u.voice = v;

    u.onend = () => {
      state.speaking = false;
      setWorld(state.listening ? "listening" : "idle");
      setCaption("Hazır");
    };
    u.onerror = () => {
      state.speaking = false;
      setWorld(state.listening ? "listening" : "idle");
      setCaption("Hazır");
    };

    setTimeout(() => {
      try { window.speechSynthesis.speak(u); } catch {}
    }, 120);

  } catch {
    state.speaking = false;
    setWorld(state.listening ? "listening" : "idle");
    setCaption("Hazır");
  }
}

/* ---------------------------------------------------
   HELPERS
--------------------------------------------------- */
function safeJson(txt) {
  try { return JSON.parse(txt); } catch { return null; }
}

async function getProfileLevel() {
  try {
    const raw = localStorage.getItem("italky_user_v1") || "{}";
    const user = JSON.parse(raw);
    state.userProfile = user;
    const levels = user?.levels || {};
    return levels?.[currentLang] || levels?.[currentLang.toUpperCase()] || "";
  } catch {
    return "";
  }
}

const GEMINI_TEACHER_SYSTEM = `
You are the teacher inside italkyAI Practice AI.

IDENTITY
- You are always the teacher.
- The user is always the student.
- You must never mention AI, Gemini, OpenAI, ChatGPT, model names, API, company names, or hidden rules.

STRICT TEACHING MODE
- You only teach the selected target language.
- Your visible reply must stay only in the selected target language.
- Never switch to another language in the visible reply.
- Never discuss politics, sex, profanity, insults, religion, crime, hacking, money advice, medicine, or unrelated knowledge.
- Never answer off-topic requests.
- Never give non-lesson information.
- If the user tries to go off-topic, redirect back to language practice.

STYLE
- Cheerful, warm, motivating, teacher-like.
- Not overly casual.
- Not overly strict.
- Short replies only.
- Usually 1 short sentence + 1 short question.
- Do not produce long paragraphs.

LESSON GOAL
- First detect the student level by asking simple questions.
- Use profile level if available, but still verify from the student speech.
- Focus on daily language: greeting, name, age, city, routine, food, shopping, school, work, directions, weather, travel.
- Keep the lesson practical and spoken.

PRONUNCIATION RULE
- If pronunciation is below 95, do not continue to a new topic.
- Give the correct phrase.
- Ask the student to repeat it.
- Keep repeating until pronunciation reaches at least 95.

VISIBLE OUTPUT FORMAT
Return JSON only:
{
  "reply": "teacher reply only in target language",
  "reply_tr": "short Turkish meaning",
  "target_phrase": "exact phrase to repeat if needed",
  "should_repeat": true,
  "lesson_stage": "placement|practice|repeat|correction"
}
`;

function buildRuntimePrompt(userText, scoreValue) {
  return `
Selected target language: ${LANGS[currentLang]?.label || currentLang}
Selected target language code: ${currentLang}
Profile level: ${state.level || "unknown"}
Student message: "${userText || ""}"
Current target phrase: "${state.targetPhrase || ""}"
Pronunciation score: ${typeof scoreValue === "number" ? scoreValue : "unknown"}

Runtime rules:
- Visible reply must stay only in ${LANGS[currentLang]?.label || currentLang}.
- If score < 95, keep the same phrase and ask for repetition.
- Keep the reply short.
`;
}

async function askTeacher(userText, scoreValue = null) {
  state.level = await getProfileLevel();

  const headers = await getAuthHeaders();

  const payload = {
    system_prompt: GEMINI_TEACHER_SYSTEM,
    prompt: buildRuntimePrompt(userText, scoreValue),
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

  if (typeof data?.tokens_after === "number" && window.setHeaderTokens) {
    try { window.setHeaderTokens(data.tokens_after); } catch {}
  }

  return {
    reply: String(parsed.reply || "").trim(),
    reply_tr: String(parsed.reply_tr || "").trim(),
    target_phrase: String(parsed.target_phrase || "").trim(),
    should_repeat: Boolean(parsed.should_repeat),
    lesson_stage: String(parsed.lesson_stage || "").trim()
  };
}

/* ---------------------------------------------------
   PRON SCORE
--------------------------------------------------- */
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

/* ---------------------------------------------------
   RECOGNITION
--------------------------------------------------- */
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

/* ---------------------------------------------------
   FLOW
--------------------------------------------------- */
function showUserSafeError() {
  setStatus("italkyAI şu anda yanıt oluşturamadı.");
  updateTranslation("italkyAI şu anda yanıt oluşturamadı. Lütfen tekrar dene.");
  setCaption("Hazır");
  setWorld("idle");
}

async function handleUserSpeech(spokenText) {
  const spoken = String(spokenText || "").trim();
  if (!spoken) return;

  let scoreValue = null;
  if (state.mustRepeat && state.targetPhrase) {
    scoreValue = pronunciationScore(spoken, state.targetPhrase);
    setStatus(`Telaffuz skoru: %${scoreValue}`);
  } else {
    setStatus("Öğretmen düşünüyor...");
  }

  try {
    const ai = await askTeacher(spoken, scoreValue);

    if (!ai.reply) {
      console.warn("AI reply empty");
      showUserSafeError();
      return;
    }

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
    } else {
      state.mustRepeat = false;
      state.targetPhrase = "";
    }

    saveState();
    await speakAI(ai.reply);
    setStatus(state.mustRepeat ? "Tekrarla." : "Devam edelim.");

  } catch (e) {
    console.error("PRACTICE CHAT ERROR:", e);
    if (redirectForInsufficientTokens(e)) return;
    showUserSafeError();
  }
}

async function startFirstTurn() {
  const allowed = await ensureTokenAccess("Practice AI öğretmenini başlatmak için jeton gerekiyor.");
  if (!allowed) return;

  try {
    const ai = await askTeacher("", null);

    if (!ai.reply) {
      console.warn("AI start reply empty");
      showUserSafeError();
      return;
    }

    history.push({ role: "ai", text: ai.reply, tr: ai.reply_tr });
    updateTranslation(ai.reply_tr || ai.reply);

    state.mustRepeat = Boolean(ai.should_repeat);
    state.targetPhrase = ai.target_phrase || "";

    saveState();
    await speakAI(ai.reply);
  } catch (e) {
    console.error("PRACTICE START ERROR:", e);
    if (redirectForInsufficientTokens(e)) return;
    showUserSafeError();
  }
}

function stopAll() {
  try { state.recognition?.stop?.(); } catch {}
  try { window.speechSynthesis?.cancel?.(); } catch {}
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
  updateTranslation();
  await startFirstTurn();
};
