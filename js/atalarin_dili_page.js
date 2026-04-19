const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const frameRoot = $("frameRoot");
const topBody = $("topBody");
const botBody = $("botBody");

const botInput = $("botInput");
const botMic = $("botMic");
const botSend = $("botSend");
const botComposer = $("botComposer");

const clearBtn = $("clearBtn");
const homeBtn = $("homeBtn");
const homeLink = $("homeLink");

const genericBackdrop = $("genericBackdrop");
const genericCloseBtn = $("genericCloseBtn");
const miniToast = $("miniToast");

let recognizer = null;
let recording = false;
let currentAudio = null;

/* =========================================================
   LOCAL FALLBACK
========================================================= */

const WORD_OVERRIDES = {
  "türk": { rune: "𐱅𐰇𐰼𐰜", read: "türk" },
  "turk": { rune: "𐱅𐰇𐰼𐰜", read: "türk" },
  "göktürk": { rune: "𐰚𐰇𐰜𐱅𐰇𐰼𐰜", read: "göktürk" },
  "gokturk": { rune: "𐰚𐰇𐰜𐱅𐰇𐰼𐰜", read: "göktürk" },
  "gök": { rune: "𐰚𐰇𐰜", read: "gök" },
  "gok": { rune: "𐰚𐰇𐰜", read: "gök" },
  "tanrı": { rune: "𐱅𐰭𐰼𐰃", read: "tanrı" },
  "tanri": { rune: "𐱅𐰭𐰼𐰃", read: "tanrı" },
  "il": { rune: "𐰃𐰠", read: "il" },
  "el": { rune: "𐰠", read: "el" },
  "yurt": { rune: "𐰖𐰆𐰺𐱃", read: "yurt" },
  "ordu": { rune: "𐰆𐰺𐰑𐰆", read: "ordu" },
  "kut": { rune: "𐰴𐰆𐱃", read: "kut" },
  "tegin": { rune: "𐱅𐰏𐰃𐰤", read: "tegin" },
  "bilge": { rune: "𐰋𐰃𐰠𐰏𐰀", read: "bilge" },
  "budun": { rune: "𐰉𐰆𐰑𐰆𐰣", read: "budun" },
  "ata": { rune: "𐰀𐱃𐰀", read: "ata" },
  "ana": { rune: "𐰀𐰣𐰀", read: "ana" },
  "su": { rune: "𐰽𐰆", read: "su" },
  "taş": { rune: "𐱃𐰀𐱁", read: "taş" },
  "selam": { rune: "𐰽𐰞𐰀𐰢", read: "selam" },
  "merhaba": { rune: "𐰢𐰼𐰴𐰉𐰀", read: "merhaba" }
};

function normalizeInput(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function cleanWord(word) {
  return String(word || "").toLowerCase().replace(/[^a-zçğıöşü]/g, "");
}

function tokenizeWithSpaces(text) {
  return String(text || "").split(/(\s+)/);
}

function buildUnitsFromOverride(override) {
  const runes = [...override.rune];
  const latin = [...override.read];
  const units = [];
  let latinIndex = 0;

  for (const rune of runes) {
    if (rune === " ") {
      units.push({ space: true });
      continue;
    }

    while (latin[latinIndex] === " ") latinIndex += 1;

    units.push({
      rune,
      latin: latin[latinIndex] || ""
    });

    latinIndex += 1;
  }

  return units;
}

function localFallback(text) {
  const parts = tokenizeWithSpaces(text);
  const units = [];
  const runeWords = [];
  const readWords = [];

  for (const part of parts) {
    if (!part) continue;

    if (/^\s+$/.test(part)) {
      units.push({ space: true });
      runeWords.push(" ");
      readWords.push(" ");
      continue;
    }

    const pure = cleanWord(part);
    const found = WORD_OVERRIDES[pure];
    if (!found) return null;

    runeWords.push(found.rune);
    readWords.push(found.read);

    buildUnitsFromOverride(found).forEach((u) => units.push(u));
  }

  return {
    literalText: runeWords.join("").trim(),
    literalReading: readWords.join("").replace(/\s+/g, " ").trim(),
    historicalText: "",
    historicalReading: "",
    historicalMeaning: "",
    units
  };
}

/* =========================================================
   AI BACKEND
========================================================= */

async function aiTranslateToGokturk(text) {
  const resp = await fetch(`${API_BASE}/api/translate_ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text: String(text || "").trim(),
      from_lang: "tr",
      to_lang: "gokturk",
      mode: "normal",
      atalar_mode: true,
      atalar_source: "tr",
      atalar_target: "gokturk",
      historical_mode: true,
      reading_mode: true
    })
  });

  const json = await resp.json().catch(() => null);

  if (!resp.ok || !json?.ok) {
    throw new Error(json?.error || "atalar_translate_failed");
  }

  const literalText =
    String(json?.gokturk_text || "").trim() ||
    String(json?.translated || "").trim();

  const literalReading =
    String(json?.gokturk_reading || "").trim() ||
    String(json?.literal_reading || "").trim();

  const historicalText = String(json?.historical_text || "").trim();
  const historicalReading = String(json?.historical_reading || "").trim();
  const historicalMeaning = String(json?.historical_meaning || "").trim();

  if (!literalText) {
    throw new Error("atalar_literal_empty");
  }

  return {
    literalText,
    literalReading,
    historicalText,
    historicalReading,
    historicalMeaning
  };
}

/* =========================================================
   TTS - SADECE TÜRKÇE ANLAM SATIRI
========================================================= */

function stopAudio() {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
  } catch {}
  currentAudio = null;

  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}
}

async function speakMeaning(text) {
  const value = String(text || "").trim();
  if (!value) return;

  stopAudio();

  try {
    if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
      window.NativeTTS.speak(value, "tr");
      return;
    }
  } catch {}

  try {
    if (window.speechSynthesis) {
      const utter = new SpeechSynthesisUtterance(value);
      utter.lang = "tr-TR";
      utter.rate = 0.95;
      utter.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    }
  } catch {}
}

function createSpeakerButton(text) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "speaker-btn";
  btn.setAttribute("aria-label", "Türkçe anlamı dinle");
  btn.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M3 10v4h4l5 4V6L7 10H3"></path>
      <path d="M16 8a4 4 0 0 1 0 8"></path>
      <path d="M19 5a8 8 0 0 1 0 14"></path>
    </svg>
  `;
  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await speakMeaning(text);
  });
  return btn;
}

/* =========================================================
   UI
========================================================= */

function showToast(msg = "") {
  miniToast.textContent = String(msg || "");
  miniToast.classList.add("show");
  clearTimeout(window.__atalarToast);
  window.__atalarToast = setTimeout(() => miniToast.classList.remove("show"), 1800);
}

function closeModal() {
  genericBackdrop.classList.remove("show");
}

function autoResizeTextarea() {
  botInput.style.height = "auto";
  botInput.style.height = `${Math.min(botInput.scrollHeight, 120)}px`;
}

function syncComposerButtons() {
  const hasText = String(botInput.value || "").trim().length > 0;
  botMic.classList.toggle("hidden", hasText && !recording);
  botSend.classList.toggle("hidden", !hasText);
}

function keepVisible() {
  requestAnimationFrame(() => {
    topBody.scrollTop = topBody.scrollHeight + 300;
    botBody.scrollTop = botBody.scrollHeight + 300;
  });
}

function buildWordTrack(units) {
  const wrapper = document.createElement("div");
  wrapper.className = "word-track";

  const parts = [];
  let current = [];

  for (const unit of units || []) {
    if (unit.space) {
      if (current.length) parts.push(current);
      current = [];
      continue;
    }
    current.push(unit);
  }
  if (current.length) parts.push(current);

  const reversedWords = [...parts].reverse();

  for (const wordUnits of reversedWords) {
    const wordBlock = document.createElement("div");
    wordBlock.className = "word-block";

    const runeLine = document.createElement("div");
    runeLine.className = "rune-line";

    const latinLine = document.createElement("div");
    latinLine.className = "latin-line";

    const orderedUnits = [...wordUnits].reverse();

    for (const unit of orderedUnits) {
      const rune = document.createElement("div");
      rune.className = "rune-char";
      rune.textContent = unit.rune;

      const latin = document.createElement("div");
      latin.className = "latin-char";
      latin.textContent = unit.latin;

      runeLine.appendChild(rune);
      latinLine.appendChild(latin);
    }

    wordBlock.appendChild(runeLine);
    wordBlock.appendChild(latinLine);
    wrapper.appendChild(wordBlock);
  }

  return wrapper;
}

function addBubble(where, kind, text, opts = {}) {
  const wrap = where === "top" ? topBody : botBody;
  const row = document.createElement("div");
  row.className = `bubble ${kind}${opts.latest ? " is-latest" : ""}`;

  if (opts.gokturk && kind === "me") {
    const stack = document.createElement("div");
    stack.className = "bubble-stack";

    const inner = document.createElement("div");
    inner.className = "bubble-row";

    const txt = document.createElement("div");
    txt.className = "txt gokturk-wrap";

    // 1. literal rune
    txt.appendChild(buildWordTrack(opts.units || []));

    // 2. literal okunuş
    if (opts.literalReading) {
      const literalRead = document.createElement("div");
      literalRead.className = "semantic-read";
      literalRead.textContent = opts.literalReading;
      txt.appendChild(literalRead);
    }

    // 3. AI tarihî/anlamsal Göktürk karşılık
    if (opts.historicalText) {
      const histRune = document.createElement("div");
      histRune.className = "semantic-rune";
      histRune.textContent = opts.historicalText;
      txt.appendChild(histRune);
    }

    // 4. onun okunuşu
    if (opts.historicalReading) {
      const histRead = document.createElement("div");
      histRead.className = "semantic-read";
      histRead.textContent = opts.historicalReading;
      txt.appendChild(histRead);
    }

    // 5. Türkçe anlam/açıklama + sadece bunu oku
    if (opts.historicalMeaning) {
      const meaningWrap = document.createElement("div");
      meaningWrap.className = "semantic-block";

      const semanticMeaning = document.createElement("div");
      semanticMeaning.className = "semantic-meaning";
      semanticMeaning.textContent = opts.historicalMeaning;
      meaningWrap.appendChild(semanticMeaning);

      meaningWrap.appendChild(createSpeakerButton(opts.historicalMeaning));
      txt.appendChild(meaningWrap);
    }

    inner.appendChild(txt);
    stack.appendChild(inner);
    row.appendChild(stack);
    wrap.appendChild(row);
    keepVisible();
    return;
  }

  const stack = document.createElement("div");
  stack.className = "bubble-stack";

  const inner = document.createElement("div");
  inner.className = "bubble-row";

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "").trim();

  inner.appendChild(txt);
  stack.appendChild(inner);
  row.appendChild(stack);
  wrap.appendChild(row);
  keepVisible();
}

function clearLatest(where) {
  const wrap = where === "top" ? topBody : botBody;
  wrap.querySelectorAll(".bubble.me.is-latest").forEach((el) => el.classList.remove("is-latest"));
}

/* =========================================================
   FLOW
========================================================= */

async function processMessage(rawText) {
  const text = normalizeInput(rawText);
  if (!text) return;

  botInput.value = "";
  autoResizeTextarea();
  syncComposerButtons();

  addBubble("bot", "them", text);
  clearLatest("top");

  frameRoot.classList.remove("is-ready", "is-error");
  frameRoot.classList.add("is-translating");

  let payload = null;

  try {
    payload = await aiTranslateToGokturk(text);
  } catch {
    payload = localFallback(text);
  }

  if (!payload?.literalText) {
    frameRoot.classList.remove("is-translating");
    frameRoot.classList.add("is-error");
    addBubble("top", "me", "⚠️ Çeviri hatası", { latest: true });
    setTimeout(() => {
      frameRoot.classList.remove("is-error");
      frameRoot.classList.add("is-ready");
    }, 1200);
    return;
  }

  let units = payload.units;
  if (!units) {
    const local = localFallback(text);
    units = local?.units || [];
  }

  addBubble("top", "me", payload.literalText, {
    latest: true,
    gokturk: true,
    units,
    literalReading: payload.literalReading,
    historicalText: payload.historicalText,
    historicalReading: payload.historicalReading,
    historicalMeaning: payload.historicalMeaning
  });

  frameRoot.classList.remove("is-translating", "is-error");
  frameRoot.classList.add("is-ready");
}

/* =========================================================
   STT
========================================================= */

function extractStableRecognitionText(results) {
  let latestFinal = "";
  let latestInterim = "";

  for (let i = 0; i < results.length; i++) {
    const piece = normalizeInput(results[i]?.[0]?.transcript || "");
    if (!piece) continue;
    if (results[i].isFinal) latestFinal = piece;
    else latestInterim = piece;
  }

  return normalizeInput(latestFinal || latestInterim);
}

function stopRecognizer() {
  try { recognizer?.stop(); } catch {}
  recognizer = null;
  recording = false;
  botComposer.classList.remove("listening");
  botMic.classList.remove("listening");
  syncComposerButtons();
}

function startRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    showToast("Bu cihazda sesli giriş desteklenmiyor");
    return;
  }

  if (recording) {
    stopRecognizer();
    return;
  }

  recognizer = new SR();
  recognizer.lang = "tr-TR";
  recognizer.interimResults = true;
  recognizer.continuous = true;
  recognizer.maxAlternatives = 1;

  let finalCaptured = "";

  recognizer.onstart = () => {
    recording = true;
    finalCaptured = "";
    botComposer.classList.add("listening");
    botMic.classList.add("listening");
    syncComposerButtons();
    frameRoot.classList.remove("is-ready", "is-error");
    frameRoot.classList.add("is-listening");
  };

  recognizer.onresult = (e) => {
    const stableText = extractStableRecognitionText(e.results);
    finalCaptured = stableText;
    botInput.value = stableText;
    autoResizeTextarea();
    syncComposerButtons();
  };

  recognizer.onerror = () => {
    stopRecognizer();
    frameRoot.classList.remove("is-listening");
    frameRoot.classList.add("is-error");
    showToast("Mikrofon hatası");
    setTimeout(() => {
      frameRoot.classList.remove("is-error");
      frameRoot.classList.add("is-ready");
    }, 1200);
  };

  recognizer.onend = async () => {
    const finalText = normalizeInput(finalCaptured || botInput.value);
    stopRecognizer();
    if (finalText) {
      await processMessage(finalText);
    } else {
      frameRoot.classList.remove("is-listening");
      frameRoot.classList.add("is-ready");
    }
  };

  try {
    recognizer.start();
  } catch {
    stopRecognizer();
  }
}

/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {
  clearBtn.addEventListener("click", () => {
    stopRecognizer();
    stopAudio();
    topBody.innerHTML = "";
    botBody.innerHTML = "";
    botInput.value = "";
    autoResizeTextarea();
    syncComposerButtons();
    frameRoot.classList.remove("is-listening", "is-translating", "is-error");
    frameRoot.classList.add("is-ready");
  });

  homeLink.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = "/pages/home.html";
  });

  homeBtn.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  botInput.addEventListener("input", () => {
    autoResizeTextarea();
    syncComposerButtons();
  });

  botInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      processMessage(botInput.value);
    }
  });

  botSend.addEventListener("click", () => processMessage(botInput.value));
  botMic.addEventListener("click", startRecognition);

  genericCloseBtn.addEventListener("click", closeModal);
  genericBackdrop.addEventListener("click", (e) => {
    if (e.target === genericBackdrop) closeModal();
  });
}

function init() {
  autoResizeTextarea();
  syncComposerButtons();
  frameRoot.classList.add("is-ready");
  bindEvents();
  showToast("Ataların Dili hazır");
}

init();
