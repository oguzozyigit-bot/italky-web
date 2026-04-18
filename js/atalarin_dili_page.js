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
   GÖKTÜRK MOTORU - GELİŞTİRİLMİŞ LOCAL
   Not:
   Modern Türkçeden Göktürkçeye birebir %100 akademik dönüşüm,
   sadece tek harf eşleme ile yapılamaz. Bu yüzden burada:
   1) özel kelime sözlüğü
   2) ön/arka ünlü uyumu heuristiği
   3) rune okunuşu üretimi
   birlikte kullanılıyor.
========================================================= */

const FRONT_VOWELS = new Set(["e", "i", "ö", "ü"]);
const BACK_VOWELS  = new Set(["a", "ı", "o", "u"]);

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
  "budun": { rune: "𐰉𐰆𐰑𐰆𐰣", read: "budun" }
};

const MULTI_CHAR_MAP = [
  ["ng", { rune: "𐰭", read: "ng" }],
  ["ny", { rune: "𐰪", read: "ny" }],
  ["şt", { rune: "𐱁𐱃", read: "şt" }]
];

const FRONT_MAP = {
  "a": { rune: "𐰀", read: "a" },
  "e": { rune: "𐰀", read: "e" },
  "ı": { rune: "𐰃", read: "ı" },
  "i": { rune: "𐰃", read: "i" },
  "o": { rune: "𐰆", read: "o" },
  "ö": { rune: "𐰇", read: "ö" },
  "u": { rune: "𐰆", read: "u" },
  "ü": { rune: "𐰇", read: "ü" },

  "b": { rune: "𐰋", read: "b" },
  "c": { rune: "𐰲", read: "c" },
  "ç": { rune: "𐰲", read: "ç" },
  "d": { rune: "𐰑", read: "d" },
  "f": { rune: "𐰯", read: "f" },
  "g": { rune: "𐰏", read: "g" },
  "ğ": { rune: "𐰏", read: "g" },
  "h": { rune: "𐰚", read: "h" },
  "j": { rune: "𐰖", read: "y" },
  "k": { rune: "𐰚", read: "k" },
  "l": { rune: "𐰞", read: "l" },
  "m": { rune: "𐰢", read: "m" },
  "n": { rune: "𐰤", read: "n" },
  "p": { rune: "𐰯", read: "p" },
  "q": { rune: "𐰚", read: "k" },
  "r": { rune: "𐰼", read: "r" },
  "s": { rune: "𐰽", read: "s" },
  "ş": { rune: "𐱁", read: "ş" },
  "t": { rune: "𐱅", read: "t" },
  "v": { rune: "𐰋", read: "v" },
  "w": { rune: "𐰋", read: "v" },
  "x": { rune: "𐰴𐰽", read: "ks" },
  "y": { rune: "𐰘", read: "y" },
  "z": { rune: "𐰔", read: "z" }
};

const BACK_MAP = {
  "a": { rune: "𐰀", read: "a" },
  "e": { rune: "𐰀", read: "e" },
  "ı": { rune: "𐰃", read: "ı" },
  "i": { rune: "𐰃", read: "i" },
  "o": { rune: "𐰆", read: "o" },
  "ö": { rune: "𐰇", read: "ö" },
  "u": { rune: "𐰆", read: "u" },
  "ü": { rune: "𐰇", read: "ü" },

  "b": { rune: "𐰉", read: "b" },
  "c": { rune: "𐰲", read: "c" },
  "ç": { rune: "𐰲", read: "ç" },
  "d": { rune: "𐰑", read: "d" },
  "f": { rune: "𐰯", read: "f" },
  "g": { rune: "𐰍", read: "g" },
  "ğ": { rune: "𐰍", read: "ğ" },
  "h": { rune: "𐰴", read: "h" },
  "j": { rune: "𐰖", read: "y" },
  "k": { rune: "𐰴", read: "k" },
  "l": { rune: "𐰠", read: "l" },
  "m": { rune: "𐰢", read: "m" },
  "n": { rune: "𐰣", read: "n" },
  "p": { rune: "𐰯", read: "p" },
  "q": { rune: "𐰴", read: "k" },
  "r": { rune: "𐰺", read: "r" },
  "s": { rune: "𐰾", read: "s" },
  "ş": { rune: "𐱁", read: "ş" },
  "t": { rune: "𐱃", read: "t" },
  "v": { rune: "𐰉", read: "v" },
  "w": { rune: "𐰉", read: "v" },
  "x": { rune: "𐰴𐰽", read: "ks" },
  "y": { rune: "𐰖", read: "y" },
  "z": { rune: "𐰔", read: "z" }
};

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function tokenizeWithSpaces(text) {
  return String(text || "").split(/(\s+)/);
}

function cleanWord(word) {
  return String(word || "")
    .toLowerCase()
    .replace(/[^a-zçğıöşü]/g, "");
}

function getHarmony(word) {
  const pure = cleanWord(word);
  let front = 0;
  let back = 0;

  for (const ch of pure) {
    if (FRONT_VOWELS.has(ch)) front += 1;
    if (BACK_VOWELS.has(ch)) back += 1;
  }

  if (front > back) return "front";
  return "back";
}

function convertWordToGokturk(word) {
  const pure = cleanWord(word);

  if (!pure) {
    return { rune: word, read: word, units: [] };
  }

  if (WORD_OVERRIDES[pure]) {
    return {
      rune: WORD_OVERRIDES[pure].rune,
      read: WORD_OVERRIDES[pure].read,
      units: [...WORD_OVERRIDES[pure].rune].map((r, i) => ({
        rune: r,
        latin: [...WORD_OVERRIDES[pure].read][i] || ""
      }))
    };
  }

  const harmony = getHarmony(pure);
  const map = harmony === "front" ? FRONT_MAP : BACK_MAP;

  let runeOut = "";
  let readOut = "";
  let units = [];
  let i = 0;

  while (i < pure.length) {
    let matched = false;

    for (const [src, dst] of MULTI_CHAR_MAP) {
      if (pure.startsWith(src, i)) {
        runeOut += dst.rune;
        readOut += dst.read;
        units.push({ rune: dst.rune, latin: dst.read });
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
      readOut += rule.read;
      units.push({ rune: rule.rune, latin: rule.read });
    } else {
      runeOut += ch;
      readOut += ch;
      units.push({ rune: ch, latin: ch });
    }

    i += 1;
  }

  return {
    rune: runeOut,
    read: readOut,
    units
  };
}

function turkishToGokturk(text) {
  const parts = tokenizeWithSpaces(text);
  const converted = [];
  const units = [];
  const readings = [];

  for (const part of parts) {
    if (!part) continue;

    if (/^\s+$/.test(part)) {
      converted.push(part);
      readings.push(part);
      units.push({ space: true });
      continue;
    }

    const result = convertWordToGokturk(part);
    converted.push(result.rune);
    readings.push(result.read);

    for (const u of result.units) {
      units.push(u);
    }
  }

  return {
    rune: converted.join("").trim(),
    read: readings.join("").replace(/\s+/g, " ").trim(),
    units
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

function openModal(title, text) {
  genericTitle.textContent = title;
  genericText.textContent = text;
  genericBackdrop.classList.add("show");
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

function buildCharGrid(units) {
  const grid = document.createElement("div");
  grid.className = "char-grid";

  for (const unit of units) {
    if (unit.space) {
      const spacer = document.createElement("div");
      spacer.className = "char-space";
      grid.appendChild(spacer);
      continue;
    }

    const col = document.createElement("div");
    col.className = "char-col";

    const top = document.createElement("div");
    top.className = "char-rune";
    top.textContent = unit.rune;

    const bottom = document.createElement("div");
    bottom.className = "char-latin";
    bottom.textContent = unit.latin;

    col.appendChild(top);
    col.appendChild(bottom);
    grid.appendChild(col);
  }

  return grid;
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
    txt.appendChild(buildCharGrid(opts.units || []));

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

    return { row, txt };
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

  return { row, txt };
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

  const translated = turkishToGokturk(text);

  if (!translated?.rune) {
    frameRoot.classList.remove("is-translating");
    frameRoot.classList.add("is-error");
    addBubble("top", "me", "⚠️ Çeviri hatası", { latest: true });
    setTimeout(() => {
      frameRoot.classList.remove("is-error");
      frameRoot.classList.add("is-ready");
    }, 1200);
    return;
  }

  addBubble("top", "me", translated.rune, {
    latest: true,
    gokturk: true,
    units: translated.units,
    reading: translated.read
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
