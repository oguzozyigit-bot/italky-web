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
   ACCESS
--------------------------------------------------- */
function getAccessState() {
  const a = window.__ITALKY_ACCESS__ || {};
  return {
    raw: a,
    is_logged_in: a.is_logged_in === true,
    package_code: String(
      a.package_code ||
      a.selected_package_code ||
      a.plan ||
      "none"
    ).toLowerCase(),
    trial_active: a.trial_active === true,
    jeton_balance: Number(a.jeton_balance ?? a.tokens ?? 0),
    can_practice: a.can_practice === true
  };
}

function openMembershipModalFallback(message) {
  alert(message || "Bu modülü kullanabilmek için üyelik gerekir.");
  location.href = "/pages/upgrade_pack.html";
  return false;
}

function ensurePracticeAccess() {
  const access = getAccessState();
  console.log("PRACTICE ACCESS RAW:", access.raw);
  console.log("PRACTICE ACCESS PARSED:", access);

  const TEST_BYPASS = true;
  if (TEST_BYPASS) return true;

  if (!access.is_logged_in) {
    return openMembershipModalFallback("Bu modülü kullanabilmek için üye olmanız gerekir. Lütfen üyelik sayfasına gidin.");
  }

  if (access.trial_active) {
    return openMembershipModalFallback("Practice AI deneme paketinde kapalıdır. Devam etmek için uygun üyelik almalısınız.");
  }

  if (String(access.package_code).includes("translate")) {
    return openMembershipModalFallback("Practice AI, Translate paketinde kapalıdır. Bu modül için uygun üyelik almalısınız.");
  }

  if (!access.can_practice) {
    return openMembershipModalFallback("Bu modülü kullanabilmek için uygun üyelik gerekir. Lütfen üyelik sayfasına gidin.");
  }

  return true;
}

async function ensureTokenAccess() {
  const access = getAccessState();

  const TEST_BYPASS = true;
  if (TEST_BYPASS) return true;

  if (access.jeton_balance <= 0) {
    alert("Practice AI için jeton gerekli.");
    location.href = "/pages/jetonbuy.html";
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
    alert("Jetonunuz yetersiz. Jeton Market'e yönlendiriliyorsunuz.");
    location.href = "/pages/jetonbuy.html";
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

  // Önce backend TTS
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

  // Son fallback cihaz/browser TTS
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

  if (!ensurePracticeAccess()) return;
  if (!(await ensureTokenAccess())) return;

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
  if (!ensurePracticeAccess()) return;
  if (!(await ensureTokenAccess())) return;

  updateLangBadge();
  setWorld("idle");
  setCaption("Hazır");
  updateTranslation();
  startFirstTurn();
};
