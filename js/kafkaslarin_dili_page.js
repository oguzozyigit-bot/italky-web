import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

function apiUrl(path) {
  const clean = String(path || "").replace(/^\/+/, "");
  return `${API_BASE}/api/${clean}`;
}

const F2F_VOICE_KEY = "facetoface_voice_mode";
const F2F_PRESET_KEY = "facetoface_voice_preset";
const F2F_AUTO_READ_KEY = "facetoface_auto_read";

const KAFKAS_POOL = [
  { code: "ab", name: "Abhazca", flag: "🏔️" },
  { code: "ady", name: "Adigece", flag: "🛡️" },
  { code: "kbd", name: "Kabardeyce", flag: "⚔️" },
  { code: "ce", name: "Çeçence", flag: "🦅" },
  { code: "ka", name: "Gürcüce", flag: "🇬🇪" },
  { code: "os", name: "Osetçe", flag: "⛰️" },
  { code: "lez", name: "Lezgice", flag: "🌄" },
  { code: "av", name: "Avarca", flag: "🗻" }
];

const BCP = {
  tr: "tr-TR",
  ab: "tr-TR",
  ady: "tr-TR",
  kbd: "tr-TR",
  ce: "tr-TR",
  ka: "ka-GE",
  os: "ru-RU",
  lez: "tr-TR",
  av: "ru-RU"
};

const TTS_FALLBACK_LANG = {
  ab: "tr",
  ady: "tr",
  kbd: "tr",
  ce: "tr",
  os: "ru",
  lez: "tr",
  av: "ru"
};

const ALT_CHARS = {
  a: ["â", "á", "à"],
  A: ["Â", "Á", "À"],
  c: ["ç"],
  C: ["Ç"],
  g: ["ğ"],
  G: ["Ğ"],
  i: ["ı", "î", "í", "i"],
  I: ["İ", "Î", "Í", "I"],
  ı: ["i", "î", "í", "ı"],
  İ: ["I", "Î", "Í", "İ"],
  o: ["ö", "ô", "ó"],
  O: ["Ö", "Ô", "Ó"],
  s: ["ş"],
  S: ["Ş"],
  u: ["ü", "û", "ú"],
  U: ["Ü", "Û", "Ú"],
  e: ["é", "è", "ê"],
  E: ["É", "È", "Ê"],
  n: ["ñ"],
  N: ["Ñ"]
};

const KB_NUM_ROW = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const KB_ROWS_TR = {
  r1: ["q", "w", "e", "r", "t", "y", "u", "ı", "o", "p"],
  r2: ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  r3: ["z", "x", "c", "v", "b", "n", "m"]
};
const KB_ROWS_LATIN = {
  r1: ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  r2: ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
  r3: ["z", "x", "c", "v", "b", "n", "m"]
};

const UI = {
  frameRoot: document.getElementById("frameRoot"),
  centerHub: $("centerHub"),

  topLangBtn: $("topLangBtn"),
  topLangTxt: $("topLangTxt"),
  topSettingsMini: $("topSettingsMini"),
  topInput: $("topInput"),
  topMic: $("topMic"),
  topSend: $("topSend"),
  topComposer: $("topComposer"),
  topBody: $("topBody"),
  topKeyboardWrap: $("topKeyboardWrap"),
  topKeyboard: $("topKeyboard"),
  popTop: $("pop-top"),
  closeTop: $("close-top"),
  listTop: $("list-top"),

  botLangBtn: $("botLangBtn"),
  botLangTxt: $("botLangTxt"),
  botSettingsMini: $("botSettingsMini"),
  botInput: $("botInput"),
  botMic: $("botMic"),
  botSend: $("botSend"),
  botComposer: $("botComposer"),
  botBody: $("botBody"),
  botKeyboardWrap: $("botKeyboardWrap"),
  botKeyboard: $("botKeyboard"),

  homeBtn: $("homeBtn"),
  homeLink: $("homeLink"),
  clearBtn: $("clearBtn"),

  genericBackdrop: $("genericBackdrop"),
  genericTitle: $("genericTitle"),
  genericText: $("genericText"),
  genericCloseBtn: $("genericCloseBtn"),
  miniToast: $("miniToast")
};

const state = {
  topLang: "ab",
  activeSide: "bot",

  topListening: false,
  botListening: false,
  topRecognizer: null,
  botRecognizer: null,

  currentAudio: null,
  speakRunId: 0,

  topLastSpeech: "",
  botLastSpeech: "",

  loadingTopRow: null,
  loadingBotRow: null,

  topShift: false,
  botShift: false,
  topAltMenuEl: null,
  botAltMenuEl: null,
  topHoldTimer: null,
  botHoldTimer: null,

  keyboardAudioCtx: null,
  keyboardMasterGain: null
};

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function canon(code) {
  return String(code || "").trim().toLowerCase();
}

function toast(msg = "") {
  if (!UI.miniToast) return;
  UI.miniToast.textContent = String(msg || "");
  UI.miniToast.classList.add("show");
  clearTimeout(window.__kafkasToast);
  window.__kafkasToast = setTimeout(() => {
    UI.miniToast.classList.remove("show");
  }, 1800);
}

function showModal(title, text) {
  if (UI.genericTitle) UI.genericTitle.textContent = title || "Bilgi";
  if (UI.genericText) UI.genericText.textContent = text || "";
  UI.genericBackdrop?.classList.add("show");
  UI.genericBackdrop?.classList.add("open");
}

function closeModal() {
  UI.genericBackdrop?.classList.remove("show");
  UI.genericBackdrop?.classList.remove("open");
}

function currentKafkas() {
  return KAFKAS_POOL.find((x) => x.code === state.topLang) || KAFKAS_POOL[0];
}

function updateLangButtons() {
  const item = currentKafkas();
  if (UI.topLangTxt) UI.topLangTxt.textContent = `${item.flag} ${item.name}`;
  if (UI.botLangTxt) UI.botLangTxt.textContent = "🇹🇷 Türkçe";
}

function pointOrbTo(side) {
  UI.frameRoot?.classList.remove("to-top", "to-bot");
  UI.frameRoot?.classList.add(side === "top" ? "to-top" : "to-bot");
  UI.centerHub?.classList.toggle("to-top", side === "top");
  state.activeSide = side;
}

function autoResize(textarea) {
  if (!textarea) return;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 84)}px`;
}

function syncComposerButtons() {
  const topHas = normalizeText(UI.topInput?.value).length > 0;
  UI.topMic?.classList.toggle("hidden", topHas && !state.topListening);
  UI.topSend?.classList.toggle("hidden", !topHas);
  UI.topMic?.classList.toggle("listening", state.topListening);
  UI.topComposer?.classList.toggle("listening", state.topListening);

  const botHas = normalizeText(UI.botInput?.value).length > 0;
  UI.botMic?.classList.toggle("hidden", botHas && !state.botListening);
  UI.botSend?.classList.toggle("hidden", !botHas);
  UI.botMic?.classList.toggle("listening", state.botListening);
  UI.botComposer?.classList.toggle("listening", state.botListening);
}

function keepVisible(side = "bot") {
  requestAnimationFrame(() => {
    try {
      if (side === "top") {
        if (UI.topBody) UI.topBody.scrollTop = UI.topBody.scrollHeight + 400;
      } else if (side === "bot") {
        if (UI.botBody) UI.botBody.scrollTop = UI.botBody.scrollHeight + 400;
      } else {
        if (UI.topBody) UI.topBody.scrollTop = UI.topBody.scrollHeight + 400;
        if (UI.botBody) UI.botBody.scrollTop = UI.botBody.scrollHeight + 400;
      }
    } catch {}
  });
}

function clearLatest(side) {
  const wrap = side === "top" ? UI.topBody : UI.botBody;
  if (!wrap) return;
  wrap.querySelectorAll(".bubble.me.is-latest").forEach((el) => {
    el.classList.remove("is-latest");
  });
}

function createSpeakerButton(getText, getLang) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "spk-icon";
  btn.setAttribute("aria-label", "Tekrar dinle");
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
    await speakText(getText(), getLang());
  });
  return btn;
}

function addBubble(where, kind, text, opts = {}) {
  const wrap = where === "top" ? UI.topBody : UI.botBody;
  if (!wrap) return null;

  const row = document.createElement("div");
  row.className = `bubble ${kind}${opts.latest ? " is-latest" : ""}`;

  const inner = document.createElement("div");
  inner.className = "bubble-row";

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "");
  inner.appendChild(txt);

  if (opts.speaker) {
    inner.appendChild(
      createSpeakerButton(
        () => opts.speakText || txt.textContent || "",
        () => opts.speakLang || "tr"
      )
    );
  }

  row.appendChild(inner);

  if (opts.subText) {
    const sub = document.createElement("div");
    sub.className = "bubble-sub";
    sub.textContent = String(opts.subText || "");
    row.appendChild(sub);
  }

  wrap.appendChild(row);
  keepVisible(where);
  return row;
}

function clearBubbles() {
  if (UI.topBody) UI.topBody.innerHTML = "";
  if (UI.botBody) UI.botBody.innerHTML = "";
  state.loadingTopRow = null;
  state.loadingBotRow = null;
}

function renderTopLangList() {
  if (!UI.listTop) return;

  UI.listTop.innerHTML = KAFKAS_POOL.map((item) => `
    <div class="pop-item ${item.code === state.topLang ? "active" : ""}" data-code="${item.code}">
      <div class="pop-left">
        <div class="pop-flag">${item.flag}</div>
        <div class="pop-name">${item.name}</div>
      </div>
      <div class="pop-code">${item.code}</div>
    </div>
  `).join("");

  UI.listTop.querySelectorAll(".pop-item").forEach((el) => {
    el.addEventListener("click", () => {
      state.topLang = el.dataset.code;
      updateLangButtons();
      renderTopLangList();
      renderKeyboard("top");
      UI.popTop?.classList.remove("show");
      toast("Kafkas dili değişti");
    });
  });
}

function ensureKeyboardAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;

    if (!state.keyboardAudioCtx) {
      state.keyboardAudioCtx = new Ctx();
      state.keyboardMasterGain = state.keyboardAudioCtx.createGain();
      state.keyboardMasterGain.gain.value = 0.09;
      state.keyboardMasterGain.connect(state.keyboardAudioCtx.destination);
    }

    return state.keyboardAudioCtx;
  } catch {
    return null;
  }
}

async function unlockKeyboardAudio() {
  const ctx = ensureKeyboardAudio();
  if (!ctx) return;
  try {
    if (ctx.state === "suspended") await ctx.resume();
  } catch {}
}

function vibrate(ms = 14) {
  try {
    if (navigator.vibrate) navigator.vibrate([ms]);
  } catch {}
}

function playKeyClick(kind = "key") {
  const ctx = ensureKeyboardAudio();
  if (!ctx || !state.keyboardMasterGain) return;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = "bandpass";
  filter.frequency.value =
    kind === "space" ? 2100 :
    kind === "backspace" ? 1750 :
    kind === "enter" ? 1950 :
    kind === "shift" ? 1850 :
    2250;
  filter.Q.value = 1.4;

  osc.type = "square";
  osc.frequency.setValueAtTime(
    kind === "space" ? 950 :
    kind === "backspace" ? 820 :
    kind === "enter" ? 900 :
    kind === "shift" ? 860 :
    1080,
    now
  );
  osc.frequency.exponentialRampToValueAtTime(
    kind === "space" ? 720 : 760,
    now + 0.022
  );

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(kind === "space" ? 0.03 : 0.04, now + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(state.keyboardMasterGain);

  try {
    osc.start(now);
    osc.stop(now + 0.032);
  } catch {}
}

function getKeyboardWrap(side) {
  return side === "top" ? UI.topKeyboardWrap : UI.botKeyboardWrap;
}

function getKeyboardRoot(side) {
  return side === "top" ? UI.topKeyboard : UI.botKeyboard;
}

function getInput(side) {
  return side === "top" ? UI.topInput : UI.botInput;
}

function getAltMenu(side) {
  return side === "top" ? state.topAltMenuEl : state.botAltMenuEl;
}

function setAltMenu(side, el) {
  if (side === "top") state.topAltMenuEl = el;
  else state.botAltMenuEl = el;
}

function getHoldTimer(side) {
  return side === "top" ? state.topHoldTimer : state.botHoldTimer;
}

function setHoldTimer(side, timer) {
  if (side === "top") state.topHoldTimer = timer;
  else state.botHoldTimer = timer;
}

function getShift(side) {
  return side === "top" ? state.topShift : state.botShift;
}

function setShift(side, val) {
  if (side === "top") state.topShift = val;
  else state.botShift = val;
}

function hideAltMenu(side) {
  const el = getAltMenu(side);
  if (el) el.remove();
  setAltMenu(side, null);

  const timer = getHoldTimer(side);
  clearTimeout(timer);
  setHoldTimer(side, null);
}

function createAltMenu(side, hostBtn, chars, onPick) {
  hideAltMenu(side);
  if (!hostBtn || !chars?.length) return;

  const wrap = document.createElement("div");
  wrap.className = "alt-pop";

  chars.forEach((ch) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "alt-key";
    b.textContent = ch;

    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      vibrate(14);
      playKeyClick("key");
      onPick(ch);
      hideAltMenu(side);
    });

    wrap.appendChild(b);
  });

  hostBtn.appendChild(wrap);
  setAltMenu(side, wrap);

  const rect = wrap.getBoundingClientRect();
  const pad = 8;
  if (rect.left < pad) {
    wrap.style.left = "0";
    wrap.style.transform = "translateX(0)";
  } else if (rect.right > window.innerWidth - pad) {
    wrap.style.left = "auto";
    wrap.style.right = "0";
    wrap.style.transform = "translateX(0)";
  }
}

function createKey(side, { label = "", html = "", onTap, onLongPress = null, className = "", sound = "key" }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `kb-key ${className}`.trim();
  if (html) btn.innerHTML = html;
  else btn.textContent = label;

  let longTriggered = false;

  btn.addEventListener("pointerdown", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    longTriggered = false;
    btn.classList.add("pressing");
    await unlockKeyboardAudio();

    if (onLongPress) {
      const timer = setTimeout(() => {
        longTriggered = true;
        vibrate(20);
        playKeyClick(sound);
        onLongPress(btn);
      }, 320);
      setHoldTimer(side, timer);
    }
  });

  btn.addEventListener("pointerup", (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearTimeout(getHoldTimer(side));
    setHoldTimer(side, null);
    btn.classList.remove("pressing");

    if (!longTriggered && onTap) {
      vibrate(14);
      playKeyClick(sound);
      onTap();
    }
  });

  btn.addEventListener("pointerleave", () => {
    clearTimeout(getHoldTimer(side));
    setHoldTimer(side, null);
    btn.classList.remove("pressing");
  });

  btn.addEventListener("contextmenu", (e) => e.preventDefault());
  return btn;
}

function svgShift() {
  return `
    <svg viewBox="0 0 24 24">
      <path d="M12 4l6 7h-4v8H10v-8H6l6-7z"></path>
    </svg>
  `;
}

function svgBackspace() {
  return `
    <svg viewBox="0 0 24 24">
      <path d="M21 6H9l-6 6 6 6h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"></path>
      <path d="M10 9l5 6"></path>
      <path d="M15 9l-5 6"></path>
    </svg>
  `;
}

function keyboardRows(side) {
  const lang = side === "top" ? state.topLang : "tr";
  const shifted = getShift(side);
  const base = lang === "tr" ? KB_ROWS_TR : KB_ROWS_LATIN;

  const make = (row) => shifted ? row.map((x) => x.toUpperCase()) : row.slice();

  return {
    nums: KB_NUM_ROW.slice(),
    r1: make(base.r1),
    r2: make(base.r2),
    r3: make(base.r3)
  };
}

function bringInputAboveKeyboard(side) {
  const input = getInput(side);
  const wrap = getKeyboardWrap(side);
  if (!input || !wrap || !wrap.classList.contains("show")) return;

  requestAnimationFrame(() => {
    try {
      input.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch {}
  });
}

function insertText(side, text) {
  const input = getInput(side);
  if (!input) return;

  input.value = `${input.value || ""}${text}`;
  autoResize(input);
  syncComposerButtons();
  pointOrbTo(side);

  requestAnimationFrame(() => {
    bringInputAboveKeyboard(side);
  });
}

function backspaceText(side) {
  const input = getInput(side);
  if (!input) return;

  input.value = String(input.value || "").slice(0, -1);
  autoResize(input);
  syncComposerButtons();
  pointOrbTo(side);

  requestAnimationFrame(() => {
    bringInputAboveKeyboard(side);
  });
}

function renderCharKeys(rowEl, chars, side) {
  chars.forEach((ch) => {
    const alts = ALT_CHARS[ch] || ALT_CHARS[String(ch).toLowerCase()] || [];
    rowEl.appendChild(createKey(side, {
      label: ch,
      sound: "key",
      onTap: () => {
        hideAltMenu(side);
        insertText(side, ch);

        if (getShift(side) && /[A-ZÇĞİÖŞÜI]/.test(ch)) {
          setShift(side, false);
          renderKeyboard(side);
        }
      },
      onLongPress: alts.length
        ? (btn) => createAltMenu(side, btn, alts, (picked) => insertText(side, picked))
        : null
    }));
  });
}

function renderKeyboard(side) {
  const root = getKeyboardRoot(side);
  if (!root) return;

  const rows = keyboardRows(side);
  root.innerHTML = "";

  const rowNums = document.createElement("div");
  rowNums.className = "kb-row";
  renderCharKeys(rowNums, rows.nums, side);
  root.appendChild(rowNums);

  const row1 = document.createElement("div");
  row1.className = "kb-row";
  renderCharKeys(row1, rows.r1, side);
  root.appendChild(row1);

  const row2 = document.createElement("div");
  row2.className = "kb-row";
  const padL = document.createElement("div");
  padL.style.flex = "0.35";
  row2.appendChild(padL);

  renderCharKeys(row2, rows.r2, side);

  const padR = document.createElement("div");
  padR.style.flex = "0.35";
  row2.appendChild(padR);
  root.appendChild(row2);

  const row3 = document.createElement("div");
  row3.className = "kb-row";

  row3.appendChild(createKey(side, {
    html: svgShift(),
    className: "icon wide",
    sound: "shift",
    onTap: () => {
      hideAltMenu(side);
      setShift(side, !getShift(side));
      renderKeyboard(side);
    }
  }));

  renderCharKeys(row3, rows.r3, side);

  row3.appendChild(createKey(side, {
    html: svgBackspace(),
    className: "icon wide",
    sound: "backspace",
    onTap: () => {
      hideAltMenu(side);
      backspaceText(side);
    }
  }));

  root.appendChild(row3);

  const row4 = document.createElement("div");
  row4.className = "kb-row";

  row4.appendChild(createKey(side, {
    label: ",",
    sound: "key",
    onTap: () => {
      hideAltMenu(side);
      insertText(side, ",");
    }
  }));

  row4.appendChild(createKey(side, {
    label: ".",
    sound: "key",
    onTap: () => {
      hideAltMenu(side);
      insertText(side, ".");
    }
  }));

  row4.appendChild(createKey(side, {
    label: "italkyAI",
    className: "xwide",
    sound: "space",
    onTap: () => {
      hideAltMenu(side);
      insertText(side, " ");
    }
  }));

  row4.appendChild(createKey(side, {
    label: "?",
    sound: "key",
    onTap: () => {
      hideAltMenu(side);
      insertText(side, "?");
    }
  }));

  row4.appendChild(createKey(side, {
    label: "tamam",
    className: "wide",
    sound: "enter",
    onTap: async () => {
      hideAltMenu(side);
      toggleKeyboard(side, false);
      await sendTyped(side);
    }
  }));

  root.appendChild(row4);
}

function toggleKeyboard(side, force = null) {
  const wrap = getKeyboardWrap(side);
  const otherWrap = side === "top" ? UI.botKeyboardWrap : UI.topKeyboardWrap;
  if (!wrap) return;

  hideAltMenu(side);
  otherWrap?.classList.remove("show");
  hideAltMenu(side === "top" ? "bot" : "top");

  const willShow = force === null ? !wrap.classList.contains("show") : !!force;
  wrap.classList.toggle("show", willShow);
  pointOrbTo(side);

  if (willShow) {
    requestAnimationFrame(() => {
      renderKeyboard(side);
      bringInputAboveKeyboard(side);
      setTimeout(() => bringInputAboveKeyboard(side), 100);
    });
  }
}

function startRecognition(side) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    toast("Bu cihazda sesli giriş desteklenmiyor");
    return;
  }

  if ((side === "top" && state.topListening) || (side === "bot" && state.botListening)) {
    stopRecognition(side);
    return;
  }

  const langCode = side === "top" ? currentKafkas().code : "tr";
  const listenCode = resolveSpeechLang(langCode);

  const recog = new SR();
  recog.lang = String(BCP[listenCode] || BCP.tr);
  recog.interimResults = true;
  recog.continuous = false;
  recog.maxAlternatives = 1;

  const inputEl = side === "top" ? UI.topInput : UI.botInput;

  recog.onstart = () => {
    pointOrbTo(side);
    setListening(side, true);
    if (side === "top") state.topLastSpeech = "";
    else state.botLastSpeech = "";
  };

  recog.onresult = (e) => {
    const stableText = extractStableRecognitionText(e.results);
    inputEl.value = stableText;
    if (side === "top") state.topLastSpeech = stableText;
    else state.botLastSpeech = stableText;
    autoResize(inputEl);
    syncComposerButtons();
  };

  recog.onerror = () => {
    stopRecognition(side);
    toast("Mikrofon hatası");
  };

  recog.onend = async () => {
    const finalText = normalizeText(side === "top" ? state.topLastSpeech : state.botLastSpeech);
    stopRecognition(side);

    if (finalText) {
      inputEl.value = "";
      autoResize(inputEl);
      syncComposerButtons();
      await runTranslateText(side, finalText);
    }
  };

  if (side === "top") state.topRecognizer = recog;
  else state.botRecognizer = recog;

  try {
    recog.start();
  } catch {
    stopRecognition(side);
  }
}

function setListening(side, on) {
  if (side === "top") {
    state.topListening = !!on;
    UI.topComposer?.classList.toggle("listening", !!on);
    UI.topMic?.classList.toggle("listening", !!on);
  } else {
    state.botListening = !!on;
    UI.botComposer?.classList.toggle("listening", !!on);
    UI.botMic?.classList.toggle("listening", !!on);
  }
  syncComposerButtons();
}

function stopRecognition(side) {
  if (side === "top") {
    try { state.topRecognizer?.stop(); } catch {}
    state.topRecognizer = null;
    state.topListening = false;
    setListening("top", false);
  } else {
    try { state.botRecognizer?.stop(); } catch {}
    state.botRecognizer = null;
    state.botListening = false;
    setListening("bot", false);
  }
}

function extractStableRecognitionText(results) {
  let latestFinal = "";
  let latestInterim = "";

  for (let i = 0; i < results.length; i++) {
    const piece = normalizeText(results[i]?.[0]?.transcript || "");
    if (!piece) continue;
    if (results[i].isFinal) latestFinal = piece;
    else latestInterim = piece;
  }
  return normalizeText(latestFinal || latestInterim);
}

function prepareInputs() {
  [UI.topInput, UI.botInput].forEach((input) => {
    if (!input) return;

    input.readOnly = true;
    input.disabled = false;
    input.setAttribute("inputmode", "none");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("spellcheck", "false");

    input.addEventListener("pointerdown", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const side = input === UI.topInput ? "top" : "bot";
      await unlockKeyboardAudio();
      toggleKeyboard(side, true);
    });

    input.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const side = input === UI.topInput ? "top" : "bot";
      await unlockKeyboardAudio();
      toggleKeyboard(side, true);
    });

    input.addEventListener("focus", () => {
      try { input.blur(); } catch {}
    });

    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const side = input === UI.topInput ? "top" : "bot";
        await sendTyped(side);
      }
    });
  });
}

function bindEvents() {
  UI.topLangBtn?.addEventListener("click", () => {
    renderTopLangList();
    UI.popTop?.classList.add("show");
  });

  UI.closeTop?.addEventListener("click", () => UI.popTop?.classList.remove("show"));
  UI.popTop?.addEventListener("click", (e) => {
    if (e.target === UI.popTop) UI.popTop.classList.remove("show");
  });

  UI.topSettingsMini?.addEventListener("click", () => {
    location.href = "/pages/premium_voice_settings.html?from=kafkaslarin_dili";
  });

  UI.botSettingsMini?.addEventListener("click", () => {
    location.href = "/pages/premium_voice_settings.html?from=kafkaslarin_dili";
  });

  UI.topMic?.addEventListener("click", () => startRecognition("top"));
  UI.botMic?.addEventListener("click", () => startRecognition("bot"));
  UI.topSend?.addEventListener("click", () => sendTyped("top"));
  UI.botSend?.addEventListener("click", () => sendTyped("bot"));

  UI.homeLink?.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = "/pages/home.html";
  });

  UI.homeBtn?.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  UI.clearBtn?.addEventListener("click", () => {
    if (UI.topInput) UI.topInput.value = "";
    if (UI.botInput) UI.botInput.value = "";
    autoResize(UI.topInput);
    autoResize(UI.botInput);
    stopAudio();
    stopRecognition("top");
    stopRecognition("bot");
    clearBubbles();
    UI.topKeyboardWrap?.classList.remove("show");
    UI.botKeyboardWrap?.classList.remove("show");
    hideAltMenu("top");
    hideAltMenu("bot");
    syncComposerButtons();
    document.body.classList.remove("is-translating", "is-error");
    document.body.classList.add("is-ready");
    pointOrbTo("bot");
  });

  UI.genericCloseBtn?.addEventListener("click", closeModal);
  UI.genericBackdrop?.addEventListener("click", (e) => {
    if (e.target === UI.genericBackdrop) closeModal();
  });

  document.addEventListener("click", (e) => {
    const insidePop = UI.popTop && UI.popTop.contains(e.target);
    const isLangBtn = e.target?.closest?.("#topLangBtn");
    const isInput = e.target?.closest?.("#topInput,#botInput");
    const isKb = e.target?.closest?.("#topKeyboardWrap,#botKeyboardWrap");
    const isAlt = e.target?.closest?.(".alt-pop");

    if (!insidePop && !isLangBtn) UI.popTop?.classList.remove("show");

    if (!isInput && !isKb && !isAlt) {
      UI.topKeyboardWrap?.classList.remove("show");
      UI.botKeyboardWrap?.classList.remove("show");
      hideAltMenu("top");
      hideAltMenu("bot");
    }
  }, { capture: true });
}

async function requireLogin() {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session?.user) {
    location.replace("/pages/login.html");
    return false;
  }
  return true;
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await requireLogin())) return;

  prepareInputs();
  updateLangButtons();
  renderTopLangList();
  renderKeyboard("top");
  renderKeyboard("bot");
  bindEvents();
  syncComposerButtons();
  document.body.classList.add("is-ready");
  pointOrbTo("bot");
});
