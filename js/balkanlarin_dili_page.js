import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const F2F_VOICE_KEY = "facetoface_voice_mode";
const F2F_PRESET_KEY = "facetoface_voice_preset";
const F2F_AUTO_READ_KEY = "facetoface_auto_read";

const BALKAN_POOL = [
  { code: "sq", name: "Arnavutça", flag: "🟢" },
  { code: "bs", name: "Boşnakça", flag: "🔵" },
  { code: "sr", name: "Sırpça", flag: "🔴" },
  { code: "hr", name: "Hırvatça", flag: "⚪" },
  { code: "mk", name: "Makedonca", flag: "🟡" },
  { code: "bg", name: "Bulgarca", flag: "🟩" },
  { code: "ro", name: "Romence", flag: "🔷" },
  { code: "el", name: "Yunanca", flag: "🏛️" }
];

const UI = {
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
  topLang: "sq",
  activeSide: "bot",
  topListening: false,
  botListening: false,
  topRecognizer: null,
  botRecognizer: null,
  currentAudio: null,
  speakRunId: 0,
  shiftTop: false,
  shiftBot: false,
  topLastSpeech: "",
  botLastSpeech: "",
  keyboardAudioCtx: null,
  keyboardMasterGain: null
};

const KB_NUM_ROW = ["1","2","3","4","5","6","7","8","9","0"];
const KB_ROWS = [
  ["q","w","e","r","t","y","u","ı","o","p","ğ","ü"],
  ["a","s","d","f","g","h","j","k","l","ş","i"],
  ["z","x","c","v","b","n","m","ö","ç"]
];

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function toast(msg = "") {
  if (!UI.miniToast) return;
  UI.miniToast.textContent = String(msg || "");
  UI.miniToast.classList.add("show");
  clearTimeout(window.__balkanToast);
  window.__balkanToast = setTimeout(() => {
    UI.miniToast.classList.remove("show");
  }, 1800);
}

function closeModal() {
  UI.genericBackdrop?.classList.remove("show");
}

function currentBalkan() {
  return BALKAN_POOL.find((x) => x.code === state.topLang) || BALKAN_POOL[0];
}

function updateLangButtons() {
  const item = currentBalkan();
  if (UI.topLangTxt) UI.topLangTxt.textContent = `${item.flag} ${item.name}`;
  if (UI.botLangTxt) UI.botLangTxt.textContent = "🇹🇷 Türkçe";
}

function pointOrbTo(side) {
  document.body.classList.remove("to-top", "to-bot");
  document.body.classList.add(side === "top" ? "to-top" : "to-bot");
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

function keepVisible() {
  requestAnimationFrame(() => {
    if (UI.topBody) UI.topBody.scrollTop = UI.topBody.scrollHeight + 300;
    if (UI.botBody) UI.botBody.scrollTop = UI.botBody.scrollHeight + 300;
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
  if (!wrap) return;

  const row = document.createElement("div");
  row.className = `bubble ${kind}${opts.latest ? " is-latest" : ""}`;

  const inner = document.createElement("div");
  inner.className = "bubble-row";

  if (opts.speaker) {
    inner.appendChild(createSpeakerButton(
      () => opts.speakText || text,
      () => opts.speakLang || "tr"
    ));
  }

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "");
  inner.appendChild(txt);
  row.appendChild(inner);

  if (opts.subText) {
    const sub = document.createElement("div");
    sub.className = "bubble-sub";
    sub.textContent = String(opts.subText || "");
    row.appendChild(sub);
  }

  wrap.appendChild(row);
  keepVisible();
}

function clearBubbles() {
  if (UI.topBody) UI.topBody.innerHTML = "";
  if (UI.botBody) UI.botBody.innerHTML = "";
}

function renderTopLangList() {
  if (!UI.listTop) return;

  UI.listTop.innerHTML = BALKAN_POOL.map((item) => `
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
      UI.popTop?.classList.remove("show");
      toast("Balkan dili değişti");
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
      state.keyboardMasterGain.gain.value = 0.08;
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

function playKeyClick(kind = "key") {
  const ctx = ensureKeyboardAudio();
  if (!ctx || !state.keyboardMasterGain) return;

  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime;
  const oscA = ctx.createOscillator();
  const oscB = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  filter.type = "bandpass";
  filter.frequency.value =
    kind === "space" ? 1300 :
    kind === "backspace" ? 1900 :
    kind === "enter" ? 1700 :
    kind === "shift" ? 1500 : 1600;

  oscA.type = "square";
  oscB.type = "triangle";

  const base =
    kind === "space" ? 120 :
    kind === "backspace" ? 210 :
    kind === "enter" ? 185 :
    kind === "shift" ? 165 : 175;

  oscA.frequency.setValueAtTime(base, now);
  oscB.frequency.setValueAtTime(base * 2.6, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.11, now + 0.002);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045
