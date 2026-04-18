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
const genericTitle = $("genericTitle");
const genericText = $("genericText");
const genericCloseBtn = $("genericCloseBtn");
const miniToast = $("miniToast");

let recognizer = null;
let recording = false;

/* =========================================================
   LOCAL SÖZLÜK + OKUNUŞ
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
  "taş": { rune: "𐱃𐰀𐱁", read: "taş" }
};

const FRONT_VOWELS = new Set(["e", "i", "ö", "ü"]);
const BACK_VOWELS  = new Set(["a", "ı", "o", "u"]);

const MULTI_CHAR_MAP = [
  ["ng", "𐰭"],
  ["ny", "𐰪"]
];

const FRONT_MAP = {
  "a": "𐰀", "e": "𐰀", "ı": "𐰃", "i": "𐰃", "o": "𐰆", "ö": "𐰇", "u": "𐰆", "ü": "𐰇",
  "b": "𐰋", "c": "𐰲", "ç": "𐰲", "d": "𐰑", "f": "𐰯", "g": "𐰏", "ğ": "𐰏",
  "h": "𐰚", "j": "𐰘", "k": "𐰚", "l": "𐰞", "m": "𐰢", "n": "𐰤", "p": "𐰯",
  "q": "𐰚", "r": "𐰼", "s": "𐰽", "ş": "𐱁", "t": "𐱅", "v": "𐰋", "w": "𐰋",
  "x": "𐰴𐰽", "y": "𐰘", "z": "𐰔"
};

const BACK_MAP = {
  "a": "𐰀", "e": "𐰀", "ı": "𐰃", "i": "𐰃", "o": "𐰆", "ö": "𐰇", "u": "𐰆", "ü": "𐰇",
  "b": "𐰉", "c": "𐰲", "ç": "𐰲", "d": "𐰑", "f": "𐰯", "g": "𐰍", "ğ": "𐰍",
  "h": "𐰴", "j": "𐰖", "k": "𐰴", "l": "𐰠", "m": "𐰢", "n": "𐰣", "p": "𐰯",
  "q": "𐰴", "r": "𐰺", "s": "𐰾", "ş": "𐱁", "t": "𐱃", "v": "𐰉", "w": "𐰉",
  "x": "𐰴𐰽", "y": "𐰖", "z": "𐰔"
};

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function cleanWord(word) {
  return String(word || "").toLowerCase().replace(/[^a-zçğıöşü]/g, "");
}

function tokenizeWithSpaces(text) {
  return String(text || "").split(/(\s+)/);
}

function getHarmony(word) {
  const pure = cleanWord(word);
  let front = 0;
  let back = 0;

  for (const ch of pure) {
    if (FRONT_VOWELS.has(ch)) front += 1;
    if (BACK_VOWELS.has(ch)) back += 1;
  }

  return front > back ? "front" : "back";
}

function localWordToGokturk(word) {
  const pure = cleanWord(word);
  if (!pure) return word;

  if (WORD_OVERRIDES[pure]) {
    return WORD_OVERRIDES[pure].rune;
  }

  const harmony = getHarmony(pure);
  const map = harmony === "front" ? FRONT_MAP : BACK_MAP;

  let out = "";
  let i = 0;

  while (i < pure.length) {
    let matched = false;

    for (const [src, dst] of MULTI_CHAR_MAP) {
      if (pure.startsWith(src, i)) {
        out += dst;
        i += src.length;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    const ch = pure[i];
    out += map[ch] || ch;
    i += 1;
  }

  return out;
}

function localTurkishToGokturk(text) {
  const parts = tokenizeWithSpaces(text);
  return parts.map((part) => {
    if (!part) return "";
    if (/^\s+$/.test(part)) return part;
    return localWordToGokturk(part);
  }).join("").trim();
}

function getKnownReadingLine(text) {
  const parts = tokenizeWithSpaces(text);
  const out = [];

  for (const part of parts) {
    if (!part) continue;

    if (/^\s+$/.test(part)) {
      out.push(part);
      continue;
    }

    const pure = cleanWord(part);
    if (!pure) continue;

    if (!WORD_OVERRIDES[pure]?.read) {
      return "";
    }

    out.push(WORD_OVERRIDES[pure].read);
  }

  return out.join("").replace(/\s+/g, " ").trim();
}

/* =========================================================
   BACKEND BAĞLANTISI
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
      atalar_target: "gokturk"
    })
  });

  const json = await resp.json().catch(() => null);
  const translated =
    String(json?.gokturk_text || "").trim() ||
    String(json?.translated || "").trim();

  if (!resp.ok || !translated) {
    throw new Error(json?.error || "atalar_translate_failed");
  }

  return translated;
}

/* =========================================================
   UI
========================================================= */

function showToast(msg = "") {
  miniToast.textContent = String(msg || "");
  miniToast.classList.add("show");
  clearTimeout(window.__atalarToast);
  window.__atalarToast = setTimeout(() => {
    miniToast.classList.remove("show");
  }, 1800);
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

    const line = document.createElement("div");
    line.className = "gokturk-line";
    line.textContent = String(text || "").trim();
    txt.appendChild(line);

    if (opts.reading) {
      const read = document.createElement("div");
      read.className = "reading-line";
      read.textContent = opts.reading;
      txt.appendChild(read);
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
   AKIŞ
========================================================= */

async function processMessage(rawText) {
  const text = normalizeText(rawText);
  if (!text) return;

  botInput.value = "";
  autoResizeTextarea();
  syncComposerButtons();

  addBubble("bot", "them", text);
  clearLatest("top");

  frameRoot.classList.remove("is-ready", "is-error");
  frameRoot.classList.add("is-translating");

  let gokturkText = "";
  try {
    gokturkText = await aiTranslateToGokturk(text);
  } catch {
    gokturkText = localTurkishToGokturk(text);
  }

  if (!gokturkText) {
    frameRoot.classList.remove("is-translating");
    frameRoot.classList.add("is-error");
    addBubble("top", "me", "⚠️ Çeviri hatası", { latest: true });
    setTimeout(() => {
      frameRoot.classList.remove("is-error");
      frameRoot.classList.add("is-ready");
    }, 1200);
    return;
  }

  const reading = getKnownReadingLine(text);

  addBubble("top", "me", gokturkText, {
    latest: true,
    gokturk: true,
    reading
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
    const piece = normalizeText(results[i]?.[0]?.transcript || "");
    if (!piece) continue;

    if (results[i].isFinal) {
      latestFinal = piece;
    } else {
      latestInterim = piece;
    }
  }

  return normalizeText(latestFinal || latestInterim);
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
    const finalText = normalizeText(finalCaptured || botInput.value);
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
