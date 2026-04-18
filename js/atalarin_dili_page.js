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
   LOCAL SÖZLÜK + HARF ALT EŞLEME
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
  ["ng", { rune: "𐰭", latin: "ng" }],
  ["ny", { rune: "𐰪", latin: "ny" }]
];

const FRONT_MAP = {
  "a": { rune: "𐰀", latin: "a" },
  "e": { rune: "𐰀", latin: "e" },
  "ı": { rune: "𐰃", latin: "ı" },
  "i": { rune: "𐰃", latin: "i" },
  "o": { rune: "𐰆", latin: "o" },
  "ö": { rune: "𐰇", latin: "ö" },
  "u": { rune: "𐰆", latin: "u" },
  "ü": { rune: "𐰇", latin: "ü" },

  "b": { rune: "𐰋", latin: "b" },
  "c": { rune: "𐰲", latin: "c" },
  "ç": { rune: "𐰲", latin: "ç" },
  "d": { rune: "𐰑", latin: "d" },
  "f": { rune: "𐰯", latin: "f" },
  "g": { rune: "𐰏", latin: "g" },
  "ğ": { rune: "𐰏", latin: "ğ" },
  "h": { rune: "𐰚", latin: "h" },
  "j": { rune: "𐰘", latin: "y" },
  "k": { rune: "𐰚", latin: "k" },
  "l": { rune: "𐰞", latin: "l" },
  "m": { rune: "𐰢", latin: "m" },
  "n": { rune: "𐰤", latin: "n" },
  "p": { rune: "𐰯", latin: "p" },
  "q": { rune: "𐰚", latin: "k" },
  "r": { rune: "𐰼", latin: "r" },
  "s": { rune: "𐰽", latin: "s" },
  "ş": { rune: "𐱁", latin: "ş" },
  "t": { rune: "𐱅", latin: "t" },
  "v": { rune: "𐰋", latin: "v" },
  "w": { rune: "𐰋", latin: "v" },
  "x": { rune: "𐰴𐰽", latin: "ks" },
  "y": { rune: "𐰘", latin: "y" },
  "z": { rune: "𐰔", latin: "z" }
};

const BACK_MAP = {
  "a": { rune: "𐰀", latin: "a" },
  "e": { rune: "𐰀", latin: "e" },
  "ı": { rune: "𐰃", latin: "ı" },
  "i": { rune: "𐰃", latin: "i" },
  "o": { rune: "𐰆", latin: "o" },
  "ö": { rune: "𐰇", latin: "ö" },
  "u": { rune: "𐰆", latin: "u" },
  "ü": { rune: "𐰇", latin: "ü" },

  "b": { rune: "𐰉", latin: "b" },
  "c": { rune: "𐰲", latin: "c" },
  "ç": { rune: "𐰲", latin: "ç" },
  "d": { rune: "𐰑", latin: "d" },
  "f": { rune: "𐰯", latin: "f" },
  "g": { rune: "𐰍", latin: "g" },
  "ğ": { rune: "𐰍", latin: "ğ" },
  "h": { rune: "𐰴", latin: "h" },
  "j": { rune: "𐰖", latin: "y" },
  "k": { rune: "𐰴", latin: "k" },
  "l": { rune: "𐰠", latin: "l" },
  "m": { rune: "𐰢", latin: "m" },
  "n": { rune: "𐰣", latin: "n" },
  "p": { rune: "𐰯", latin: "p" },
  "q": { rune: "𐰴", latin: "k" },
  "r": { rune: "𐰺", latin: "r" },
  "s": { rune: "𐰾", latin: "s" },
  "ş": { rune: "𐱁", latin: "ş" },
  "t": { rune: "𐱃", latin: "t" },
  "v": { rune: "𐰉", latin: "v" },
  "w": { rune: "𐰉", latin: "v" },
  "x": { rune: "𐰴𐰽", latin: "ks" },
  "y": { rune: "𐰖", latin: "y" },
  "z": { rune: "𐰔", latin: "z" }
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

function localWordToGokturk(word) {
  const pure = cleanWord(word);
  if (!pure) {
    return { rune: word, units: [] };
  }

  if (WORD_OVERRIDES[pure]) {
    return {
      rune: WORD_OVERRIDES[pure].rune,
      units: buildUnitsFromOverride(WORD_OVERRIDES[pure])
    };
  }

  const harmony = getHarmony(pure);
  const map = harmony === "front" ? FRONT_MAP : BACK_MAP;

  let runeOut = "";
  const units = [];
  let i = 0;

  while (i < pure.length) {
    let matched = false;

    for (const [src, dst] of MULTI_CHAR_MAP) {
      if (pure.startsWith(src, i)) {
        runeOut += dst.rune;
        units.push({ rune: dst.rune, latin: dst.latin });
        i += src.length;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    const ch = pure[i];
    const rule = map[ch] || FRONT_MAP[ch] || BACK_MAP[ch];

    if (rule) {
      runeOut += rule.rune;
      units.push({ rune: rule.rune, latin: rule.latin });
    } else {
      runeOut += ch;
      units.push({ rune: ch, latin: ch });
    }

    i += 1;
  }

  return { rune: runeOut, units };
}

function localTurkishToGokturk(text) {
  const parts = tokenizeWithSpaces(text);
  const runeParts = [];
  const units = [];

  for (const part of parts) {
    if (!part) continue;

    if (/^\s+$/.test(part)) {
      runeParts.push(part);
      units.push({ space: true });
      continue;
    }

    const result = localWordToGokturk(part);
    runeParts.push(result.rune);
    result.units.forEach((u) => units.push(u));
  }

  return {
    rune: runeParts.join("").trim(),
    units
  };
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
   BACKEND AI
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
      historical_mode: true
    })
  });

  const json = await resp.json().catch(() => null);

  const translated =
    String(json?.gokturk_text || "").trim() ||
    String(json?.translated || "").trim();

  if (!resp.ok || !translated) {
    throw new Error(json?.error || "atalar_translate_failed");
  }

  return {
    translated,
    historicalText: String(json?.historical_text || "").trim(),
    historicalReading: String(json?.historical_reading || "").trim()
  };
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

function buildRuneTrack(units) {
  const track = document.createElement("div");
  track.className = "rune-track";

  for (const unit of units) {
    if (unit.space) {
      const spacer = document.createElement("div");
      spacer.className = "rune-space";
      track.appendChild(spacer);
      continue;
    }

    const col = document.createElement("div");
    col.className = "rune-col";

    const rune = document.createElement("div");
    rune.className = "rune-char";
    rune.textContent = unit.rune;

    const latin = document.createElement("div");
    latin.className = "latin-char";
    latin.textContent = unit.latin;

    col.appendChild(rune);
    col.appendChild(latin);
    track.appendChild(col);
  }

  return track;
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
    txt.appendChild(buildRuneTrack(opts.units || []));

    if (opts.semanticText && opts.semanticReading) {
      const semanticBlock = document.createElement("div");
      semanticBlock.className = "semantic-block";

      const semanticRune = document.createElement("div");
      semanticRune.className = "semantic-rune";
      semanticRune.textContent = opts.semanticText;

      const semanticRead = document.createElement("div");
      semanticRead.className = "semantic-read";
      semanticRead.textContent = opts.semanticReading;

      semanticBlock.appendChild(semanticRune);
      semanticBlock.appendChild(semanticRead);
      txt.appendChild(semanticBlock);
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
  let semanticText = "";
  let semanticReading = "";

  try {
    const ai = await aiTranslateToGokturk(text);
    gokturkText = ai.translated || "";
    semanticText = ai.historicalText || "";
    semanticReading = ai.historicalReading || "";
  } catch {
    const local = localTurkishToGokturk(text);
    gokturkText = local.rune || "";
  }

  const localMap = localTurkishToGokturk(text);

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

  if (!semanticText || !semanticReading) {
    semanticText = "";
    semanticReading = "";
  }

  addBubble("top", "me", gokturkText, {
    latest: true,
    gokturk: true,
    units: localMap.units,
    semanticText,
    semanticReading
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
