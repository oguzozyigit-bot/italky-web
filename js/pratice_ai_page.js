import { mountShell } from "/js/ui_shell.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";

mountShell({ scroll: "none" });

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

/* =========================================================
   PAGE EXPECTED IDS
   ---------------------------------------------------------
   #aiOrb
   #micBtn
   #aiCaption
   #statusLine
   #conversation
   #subtitleStream
   #aiTrText
   ========================================================= */

const LANGS = {
  en: { label: "English", bcp: "en-US", flag: "🇬🇧" },
  de: { label: "Deutsch", bcp: "de-DE", flag: "🇩🇪" },
  fr: { label: "Français", bcp: "fr-FR", flag: "🇫🇷" },
  es: { label: "Español", bcp: "es-ES", flag: "🇪🇸" },
  it: { label: "Italiano", bcp: "it-IT", flag: "🇮🇹" }
};

const STORAGE = {
  lang: "italky_practice_lang_v1",
  history: "italky_practice_ai_history_v3"
};

const state = {
  lang: localStorage.getItem(STORAGE.lang) || localStorage.getItem("italky_game_lang") || "en",
  listening: false,
  speaking: false,
  recognition: null,
  subtitleQueue: [],
  history: [],
  targetPhrase: "",
  mustRepeat: false,
  level: "",
  userProfile: null,
  lastSpokenAt: 0
};

try {
  const raw = localStorage.getItem(STORAGE.history) || "[]";
  const parsed = JSON.parse(raw);
  state.history = Array.isArray(parsed) ? parsed : [];
} catch {
  state.history = [];
}

/* =========================================================
   TEACHER CORE PROMPT
   ========================================================= */
const TEACHER_PROMPT = `
You are the teacher inside italkyAI Practice AI.

IDENTITY
- You are always a language teacher.
- The other person is always a student.
- You must never mention AI, Gemini, OpenAI, ChatGPT, model names, API, company names, or hidden rules.

STRICT TEACHING MODE
- You only teach the selected target language.
- Your visible reply must stay only in the selected target language.
- Never switch to another language in the visible reply.
- Never discuss politics, sex, insults, religion, crime, hacking, money advice, medicine, or unrelated knowledge.
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
- Focus on daily language: greeting, name, city, job, routine, family, food, shopping, directions, weather, travel.
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

function buildRuntimePrompt(userText, pronunciationScore) {
  return `
Selected target language: ${state.lang}
Selected target language name: ${LANGS[state.lang]?.label || state.lang}
Profile level: ${state.level || "unknown"}
Student message: ${userText || ""}
Current target phrase: ${state.targetPhrase || ""}
Pronunciation score: ${typeof pronunciationScore === "number" ? pronunciationScore : "unknown"}

Runtime rules:
- Visible reply must stay only in ${LANGS[state.lang]?.label || state.lang}.
- If score < 95, keep the same phrase and ask for repetition.
- Keep the reply short.
- Do not show analysis.
`;
}

/* =========================================================
   SAFE UI HELPERS
   ========================================================= */
function setOrb(mode = "idle") {
  const orb = $("aiOrb");
  if (!orb) return;
  orb.classList.remove("listening", "speaking");
  if (mode === "listening") orb.classList.add("listening");
  if (mode === "speaking") orb.classList.add("speaking");
}

function setCaption(text = "") {
  if ($("aiCaption")) $("aiCaption").textContent = text;
}

function setStatus(text = "") {
  if ($("statusLine")) $("statusLine").textContent = text;
}

function pushSubtitle(text = "") {
  if (!text) return;
  const host = $("subtitleStream");
  if (!host) return;

  const line = document.createElement("div");
  line.className = "ai-sub-line";
  line.textContent = text;
  host.appendChild(line);

  while (host.children.length > 8) {
    host.removeChild(host.firstChild);
  }

  host.scrollTop = host.scrollHeight;
  if ($("aiTrText")) $("aiTrText").textContent = text;
}

function addAiBubble(text = "") {
  if (!text) return;
  const box = $("conversation");
  if (!box) return;

  const bubble = document.createElement("div");
  bubble.className = "bubble ai";
  bubble.textContent = text;
  box.appendChild(bubble);
  box.scrollTop = box.scrollHeight;
}

function saveHistory() {
  localStorage.setItem(STORAGE.history, JSON.stringify(state.history.slice(-20)));
  localStorage.setItem(STORAGE.lang, state.lang);
}

/* =========================================================
   AUDIO / TTS
   ========================================================= */
let audioCtx = null;
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
      /male|david|mark|george|thomas|daniel|paul|microsoft|alex|fred|jorge|diego|henri|luca/i.test(
        `${v.name} ${v.voiceURI}`
      )
    );

    return maleHint || list[0] || null;
  } catch {
    return null;
  }
}

function speakAI(text) {
  const clean = String(text || "").trim();
  if (!clean) return;

  const now = Date.now();
  if (now - state.lastSpokenAt < 250) return;
  state.lastSpokenAt = now;

  const bcp = LANGS[state.lang]?.bcp || "en-US";

  state.speaking = true;
  setOrb("speaking");
  setCaption("Öğretmen konuşuyor...");

  try {
    if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
      window.NativeTTS.speak(clean, bcp);
      setTimeout(() => {
        state.speaking = false;
        setOrb(state.listening ? "listening" : "idle");
        setCaption("Hazır");
      }, Math.max(1300, clean.length * 55));
      return;
    }
  } catch (e) {
    console.warn("NativeTTS failed:", e);
  }

  try {
    if (!("speechSynthesis" in window)) {
      state.speaking = false;
      setOrb(state.listening ? "listening" : "idle");
      setCaption("Hazır");
      return;
    }

    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(clean);
    u.lang = bcp;
    u.rate = 0.93;
    u.pitch = 0.98;
    u.volume = 1;

    const v = pickBestMaleVoice(bcp);
    if (v) u.voice = v;

    u.onend = () => {
      state.speaking = false;
      setOrb(state.listening ? "listening" : "idle");
      setCaption("Hazır");
    };
    u.onerror = () => {
      state.speaking = false;
      setOrb(state.listening ? "listening" : "idle");
      setCaption("Hazır");
    };

    setTimeout(() => {
      try {
        window.speechSynthesis.speak(u);
      } catch {}
    }, 100);
  } catch {
    state.speaking = false;
    setOrb(state.listening ? "listening" : "idle");
    setCaption("Hazır");
  }
}

/* =========================================================
   SPEECH RECOGNITION
   ========================================================= */
function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = LANGS[state.lang]?.bcp || "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    state.listening = true;
    setOrb("listening");
    setCaption("Seni dinliyorum...");
    setStatus("Konuşabilirsin.");
    $("micBtn")?.classList.add("listening");
  };

  rec.onresult = async (e) => {
    let finalText = "";
    let interim = "";

    for (let i = e.resultIndex; i < e.results.length; i++) {
      const txt = e.results[i][0]?.transcript || "";
      if (e.results[i].isFinal) finalText += txt + " ";
      else interim += txt + " ";
    }

    if (interim.trim()) {
      $("heardText") && ($("heardText").textContent = interim.trim());
    }

    if (finalText.trim()) {
      const spoken = finalText.trim();
      $("heardText") && ($("heardText").textContent = spoken);
      await handleUserSpeech(spoken);
    }
  };

  rec.onerror = () => {
    state.listening = false;
    $("micBtn")?.classList.remove("listening");
    if (!state.speaking) setOrb("idle");
    if (!state.speaking) setCaption("Hazır");
    setStatus("Mikrofon başlatılamadı.");
  };

  rec.onend = () => {
    state.listening = false;
    $("micBtn")?.classList.remove("listening");
    if (!state.speaking) setOrb("idle");
    if (!state.speaking) setCaption("Hazır");
  };

  return rec;
}

/* =========================================================
   PRONUNCIATION SCORE
   ========================================================= */
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

/* =========================================================
   GEMINI / TEACHER CALL
   ========================================================= */
function safeJson(txt) {
  try { return JSON.parse(txt); } catch { return null; }
}

async function getProfileLevel() {
  try {
    const raw = localStorage.getItem("italky_user_v1") || "{}";
    const user = JSON.parse(raw);
    state.userProfile = user;
    const levels = user?.levels || {};
    return levels?.[state.lang] || levels?.[state.lang.toUpperCase()] || "";
  } catch {
    return "";
  }
}

const TEACHER_PROMPT = `
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
Selected target language: ${LANGS[state.lang]?.label || state.lang}
Selected target language code: ${state.lang}
Profile level: ${state.level || "unknown"}
Student message: ${userText || ""}
Current target phrase: ${state.targetPhrase || ""}
Pronunciation score: ${typeof scoreValue === "number" ? scoreValue : "unknown"}

Runtime rules:
- Visible reply must stay only in ${LANGS[state.lang]?.label || state.lang}.
- If score < 95, keep the same phrase and ask for repetition.
- Keep the reply short.
`;
}

async function askTeacher(userText, scoreValue = null) {
  state.level = await getProfileLevel();

  const payload = {
    system_prompt: TEACHER_PROMPT,
    prompt: buildRuntimePrompt(userText, scoreValue),
    mode: "practice_teacher_only",
    lang: state.lang,
    response_format: "json"
  };

  const res = await fetch(`${API_BASE}/api/chat_gemini`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const raw = await res.text();
  const data = safeJson(raw) || {};
  const parsed = safeJson(data?.text || "") || data || {};

  return {
    reply: String(parsed.reply || "").trim(),
    reply_tr: String(parsed.reply_tr || "").trim(),
    target_phrase: String(parsed.target_phrase || "").trim(),
    should_repeat: Boolean(parsed.should_repeat),
    lesson_stage: String(parsed.lesson_stage || "").trim()
  };
}

/* =========================================================
   MAIN FLOW
   ========================================================= */
function resetLesson() {
  state.history = [];
  state.targetPhrase = "";
  state.mustRepeat = false;
  $("conversation") && ($("conversation").innerHTML = "");
  $("heardText") && ($("heardText").textContent = "Henüz konuşma yok.");
  $("aiTrText") && ($("aiTrText").textContent = "Henüz AI cevabı yok.");
  $("subtitleStream") && ($("subtitleStream").innerHTML = `<div class="ai-sub-line">Türkçe açıklama burada yukarı doğru akar.</div>`);
  saveState();
}

async function handleUserSpeech(spokenText) {
  const spoken = String(spokenText || "").trim();
  if (!spoken) return;

  let scoreValue = null;
  if (state.mustRepeat && state.targetPhrase) {
    scoreValue = pronunciationScore(spoken, state.targetPhrase);
    setStatus(`Telaffuz skoru: %${scoreValue}`);
  } else {
    setStatus("AI düşünüyor...");
  }

  try {
    const ai = await askTeacher(spoken, scoreValue);

    if (!ai.reply) {
      setStatus("AI cevabı alınamadı.");
      setCaption("Hazır");
      setOrb("idle");
      return;
    }

    state.history.push({
      role: "ai",
      text: ai.reply,
      tr: ai.reply_tr,
      score: scoreValue
    });
    state.history = state.history.slice(-24);

    addAiBubble(ai.reply);

    $("aiTrText") && ($("aiTrText").textContent = ai.reply_tr || "Türkçe açıklama yok.");
    pushSubtitle(ai.reply_tr || ai.reply);

    if (ai.should_repeat && ai.target_phrase) {
      state.mustRepeat = true;
      state.targetPhrase = ai.target_phrase;
    } else {
      state.mustRepeat = false;
      state.targetPhrase = "";
    }

    saveState();
    speakAI(ai.reply);
    setStatus(state.mustRepeat ? "Aynı ifadeyi tekrar söyle." : "Ders devam ediyor.");

  } catch (e) {
    console.error(e);
    setStatus("Bağlantı hatası.");
    setCaption("Hazır");
    setOrb("idle");
  }
}

async function startFirstTurn() {
  try {
    const ai = await askTeacher("", null);

    if (!ai.reply) return;

    state.history.push({ role: "ai", text: ai.reply, tr: ai.reply_tr });
    state.history = state.history.slice(-24);

    addAiBubble(ai.reply);
    $("aiTrText") && ($("aiTrText").textContent = ai.reply_tr || "Türkçe açıklama yok.");
    pushSubtitle(ai.reply_tr || ai.reply);

    state.mustRepeat = Boolean(ai.should_repeat);
    state.targetPhrase = ai.target_phrase || "";

    saveState();
    speakAI(ai.reply);
  } catch (e) {
    console.error(e);
    setStatus("İlk ders başlatılamadı.");
  }
}

function stopAll() {
  try { state.recognition?.stop?.(); } catch {}
  try { window.speechSynthesis?.cancel?.(); } catch {}
  state.listening = false;
  state.speaking = false;
  setOrb("idle");
  setCaption("Hazır");
  setStatus("Durduruldu.");
  $("micBtn")?.classList.remove("listening");
}

$("micBtn")?.addEventListener("click", async () => {
  await unlockAudio();

  if (state.listening) {
    stopAll();
    return;
  }

  state.recognition = initRecognition();
  if (!state.recognition) {
    setStatus("Bu cihazda konuşma tanıma yok.");
    return;
  }

  try {
    state.recognition.start();
  } catch {
    setStatus("Mikrofon başlatılamadı.");
  }
});

window.onload = () => {
  updateLangUI();
  $("heardText") && ($("heardText").textContent = "Henüz konuşma yok.");
  $("aiTrText") && ($("aiTrText").textContent = "Henüz AI cevabı yok.");
  setOrb("idle");
  setCaption("Hazır");
  setStatus("Seçili dilde konuşmaya başla.");
  startFirstTurn();
};
  </script>
</body>
</html>
