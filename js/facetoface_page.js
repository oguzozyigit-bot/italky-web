import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const F2F_VOICE_KEY = "facetoface_voice_mode";
const F2F_PRESET_KEY = "facetoface_voice_preset";
const F2F_AUTO_READ_KEY = "facetoface_auto_read";

const TURAN_POOL = [
  { code: "az", name: "Azerbaycan Türkçesi", flag: "🇦🇿" },
  { code: "kk", name: "Kazakça", flag: "🇰🇿" },
  { code: "ky", name: "Kırgızca", flag: "🇰🇬" },
  { code: "uz", name: "Özbekçe", flag: "🇺🇿" },
  { code: "tk", name: "Türkmence", flag: "🇹🇲" },
  { code: "ug", name: "Uygurca", flag: "🌐" },
  { code: "tt", name: "Tatarca", flag: "🌐" },
  { code: "ba", name: "Başkurtça", flag: "🌐" },
  { code: "gag", name: "Gagavuzca", flag: "🌐" },
  { code: "crh", name: "Kırım Tatarcası", flag: "🌐" },
  { code: "nog", name: "Nogayca", flag: "🌐" }
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
  topKbdBtn: $("topKbdBtn"),
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
  botKbdBtn: $("botKbdBtn"),

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
  topLang: "az",
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
  botLastSpeech: ""
};

const KB_NUM_ROW = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
const KB_ROWS = [
  ["q", "w", "e", "r", "t", "y", "u", "ı", "o", "p", "ğ", "ü"],
  ["a", "s", "d", "f", "g", "h", "j", "k", "l", "ş", "i"],
  ["z", "x", "c", "v", "b", "n", "m", "ö", "ç"]
];

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function toast(msg = "") {
  if (!UI.miniToast) return;
  UI.miniToast.textContent = String(msg || "");
  UI.miniToast.classList.add("show");
  clearTimeout(window.__turanToast);
  window.__turanToast = setTimeout(() => {
    UI.miniToast.classList.remove("show");
  }, 1800);
}

function currentTuran() {
  return TURAN_POOL.find((x) => x.code === state.topLang) || TURAN_POOL[0];
}

function updateLangButtons() {
  const item = currentTuran();
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

  UI.listTop.innerHTML = TURAN_POOL.map((item) => `
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
      toast("Turan dili değişti");
    });
  });
}

function createKey(label, cls = "", onClick = null) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `kb-key ${cls}`.trim();
  btn.textContent = label;
  if (onClick) btn.addEventListener("click", onClick);
  return btn;
}

function createIconKey(svg, cls = "", onClick = null) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `kb-key icon ${cls}`.trim();
  btn.innerHTML = svg;
  if (onClick) btn.addEventListener("click", onClick);
  return btn;
}

function insertText(side, text) {
  const input = side === "top" ? UI.topInput : UI.botInput;
  if (!input) return;

  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = input.value.slice(0, start) + text + input.value.slice(end);

  const nextPos = start + text.length;
  requestAnimationFrame(() => {
    input.focus();
    input.setSelectionRange(nextPos, nextPos);
  });

  autoResize(input);
  syncComposerButtons();
  pointOrbTo(side);
}

function backspaceText(side) {
  const input = side === "top" ? UI.topInput : UI.botInput;
  if (!input) return;

  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;

  if (start !== end) {
    input.value = input.value.slice(0, start) + input.value.slice(end);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start, start);
    });
  } else if (start > 0) {
    input.value = input.value.slice(0, start - 1) + input.value.slice(end);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start - 1, start - 1);
    });
  }

  autoResize(input);
  syncComposerButtons();
  pointOrbTo(side);
}

function toggleShift(side) {
  if (side === "top") state.shiftTop = !state.shiftTop;
  else state.shiftBot = !state.shiftBot;
  buildKeyboard(side === "top" ? UI.topKeyboard : UI.botKeyboard, side);
}

function currentShift(side) {
  return side === "top" ? state.shiftTop : state.shiftBot;
}

function buildKeyboard(root, side) {
  if (!root) return;
  root.innerHTML = "";
  const shifted = currentShift(side);

  const rowNums = document.createElement("div");
  rowNums.className = "kb-row";
  KB_NUM_ROW.forEach((ch) => {
    rowNums.appendChild(createKey(ch, "", () => insertText(side, ch)));
  });
  root.appendChild(rowNums);

  KB_ROWS.forEach((chars, rowIndex) => {
    const row = document.createElement("div");
    row.className = "kb-row";

    if (rowIndex === 2) {
      const shiftKey = createIconKey(
        `<svg viewBox="0 0 24 24"><path d="M12 4l7 8h-4v8H9v-8H5l7-8z"></path></svg>`,
        "wide",
        () => toggleShift(side)
      );
      if (shifted) shiftKey.classList.add("pressing");
      row.appendChild(shiftKey);
    }

    chars.forEach((ch) => {
      const out = shifted ? ch.toUpperCase() : ch;
      row.appendChild(createKey(out, "", () => {
        insertText(side, out);
        if (currentShift(side)) {
          if (side === "top") state.shiftTop = false;
          else state.shiftBot = false;
          buildKeyboard(root, side);
        }
      }));
    });

    if (rowIndex === 2) {
      row.appendChild(createIconKey(
        `<svg viewBox="0 0 24 24">
          <path d="M21 4H8l-5 8 5 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
          <path d="M10 9l5 6"></path>
          <path d="M15 9l-5 6"></path>
        </svg>`,
        "wide",
        () => backspaceText(side)
      ));
    }

    root.appendChild(row);
  });

  const row4 = document.createElement("div");
  row4.className = "kb-row";

  row4.appendChild(createKey(",", "", () => insertText(side, ",")));
  row4.appendChild(createKey(".", "", () => insertText(side, ".")));
  row4.appendChild(createKey("?", "", () => insertText(side, "?")));
  row4.appendChild(createKey("boşluk", "xwide", () => insertText(side, " ")));
  row4.appendChild(createKey("tamam", "wide", async () => {
    toggleKeyboard(side, false);
    await sendTyped(side);
  }));

  root.appendChild(row4);
}

function toggleKeyboard(side, force = null) {
  const wrap = side === "top" ? UI.topKeyboardWrap : UI.botKeyboardWrap;
  const other = side === "top" ? UI.botKeyboardWrap : UI.topKeyboardWrap;
  if (!wrap) return;

  other?.classList.remove("show");

  const willShow = force === null ? !wrap.classList.contains("show") : !!force;
  wrap.classList.toggle("show", willShow);
  pointOrbTo(side);

  const input = side === "top" ? UI.topInput : UI.botInput;
  if (willShow && input) {
    setTimeout(() => {
      try {
        input.focus();
      } catch {}
    }, 30);
  }
}

function getSelectedVoice() {
  const mode = String(localStorage.getItem(F2F_VOICE_KEY) || "auto").trim().toLowerCase();
  const preset = String(localStorage.getItem(F2F_PRESET_KEY) || "").trim().toLowerCase();

  if (mode === "clone") return "mine";
  if (mode === "preset" && preset === "second") return "second";
  if (mode === "preset" && preset === "memory") return "memory";
  return "auto";
}

function isAutoReadEnabled() {
  return String(localStorage.getItem(F2F_AUTO_READ_KEY) || "1") !== "0";
}

function stopAudio() {
  state.speakRunId += 1;

  try {
    if (state.currentAudio) {
      state.currentAudio.pause();
      state.currentAudio.currentTime = 0;
    }
  } catch {}

  state.currentAudio = null;
  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}
}

async function getCurrentUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  } catch {
    return null;
  }
}

function chooseWebVoice(langCode) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return voices.find(v => String(v.lang || "").toLowerCase().startsWith(String(langCode || "").toLowerCase())) ||
         voices.find(v => String(v.lang || "").toLowerCase().startsWith("tr")) ||
         voices[0] ||
         null;
}

async function speakViaApi(text, langCode) {
  const selectedVoice = getSelectedVoice();
  if (!["mine", "second", "memory"].includes(selectedVoice)) return false;

  const userId = await getCurrentUserId();
  if (!userId) return false;

  const myRunId = ++state.speakRunId;

  let apiVoiceMode = "auto";
  let apiVoice = "auto";
  let apiPresetVoice = "";

  if (selectedVoice === "mine") {
    apiVoiceMode = "clone";
    apiVoice = "clone";
  } else if (selectedVoice === "second") {
    apiVoiceMode = "preset";
    apiVoice = "second";
    apiPresetVoice = "second";
  } else if (selectedVoice === "memory") {
    apiVoiceMode = "preset";
    apiVoice = "memory";
    apiPresetVoice = "memory";
  }

  const resp = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: String(text || "").trim(),
      lang: String(langCode || "tr").trim().toLowerCase(),
      user_id: userId,
      module: "turan_dilleri",
      voice: apiVoice,
      voice_mode: apiVoiceMode,
      preset_voice: apiPresetVoice,
      selected_voice: selectedVoice,
      tone: "neutral"
    })
  });

  const json = await resp.json().catch(() => null);
  if (!resp.ok || !json?.audio_base64) return false;
  if (myRunId !== state.speakRunId) return false;

  const audio = new Audio(`data:audio/mp3;base64,${json.audio_base64}`);
  audio.preload = "auto";
  audio.playsInline = true;
  state.currentAudio = audio;
  await audio.play();
  return true;
}

async function speakText(text, langCode) {
  if (!isAutoReadEnabled()) return;
  const value = normalizeText(text);
  if (!value || value === "...") return;

  stopAudio();

  const ok = await speakViaApi(value, langCode).catch(() => false);
  if (ok) return;

  try {
    if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
      window.NativeTTS.speak(value, String(langCode || "tr"));
      return;
    }
  } catch {}

  try {
    if (window.speechSynthesis) {
      const utter = new SpeechSynthesisUtterance(value);
      utter.lang = String(langCode || "tr");
      const voice = chooseWebVoice(langCode);
      if (voice) utter.voice = voice;
      utter.rate = 0.95;
      utter.pitch = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    }
  } catch {}
}

async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || "";
}

async function translateAI(text, from, to) {
  const token = await getAccessToken();
  const r = await fetch(`${API_BASE}/translate_ai`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      text,
      from_lang: from,
      to_lang: to,
      mode: "cultural",
      tone: "neutral",
      style: "balanced"
    })
  });

  const j = await r.json().catch(() => null);
  const out =
    String(j?.translated || "").trim() ||
    String(j?.translation || "").trim() ||
    "";

  if (!r.ok || !out) {
    throw new Error(j?.error || "translate_failed");
  }

  return out;
}

async function runTranslate(fromSide) {
  const inputEl = fromSide === "top" ? UI.topInput : UI.botInput;
  const targetSide = fromSide === "top" ? "bot" : "top";
  const text = normalizeText(inputEl?.value || "");

  if (!text) return;

  document.body.classList.remove("is-ready", "is-error");
  document.body.classList.add("is-translating");
  pointOrbTo(fromSide);

  addBubble(targetSide, "me", "Çevriliyor...", { latest: true });

  try {
    let translated = "";
    let speakLang = "tr";

    if (fromSide === "top") {
      translated = await translateAI(text, currentTuran().code, "tr");
      speakLang = "tr";
    } else {
      translated = await translateAI(text, "tr", currentTuran().code);
      speakLang = currentTuran().code;
    }

    addBubble(targetSide, "me", translated, {
      latest: true,
      speaker: true,
      speakText: translated,
      speakLang,
      subText: text
    });

    await speakText(translated, speakLang);

    document.body.classList.remove("is-translating", "is-error");
    document.body.classList.add("is-ready");
  } catch (e) {
    addBubble(targetSide, "me", "⚠️ Çeviri şu an yapılamadı.", {
      latest: true,
      subText: text
    });

    document.body.classList.remove("is-translating");
    document.body.classList.add("is-error");
    toast(`Çeviri hatası: ${e?.message || "bilinmeyen hata"}`);

    setTimeout(() => {
      document.body.classList.remove("is-error");
      document.body.classList.add("is-ready");
    }, 1200);
  }
}

async function sendTyped(side) {
  const input = side === "top" ? UI.topInput : UI.botInput;
  if (!input) return;

  const text = normalizeText(input.value);
  if (!text) return;

  await runTranslate(side);

  input.value = "";
  autoResize(input);
  syncComposerButtons();
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

  const recog = new SR();
  recog.lang = "tr-TR";
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
      await sendTyped(side);
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

function prepareInputs() {
  [UI.topInput, UI.botInput].forEach((input) => {
    if (!input) return;
    input.readOnly = false;
    input.disabled = false;
    input.setAttribute("inputmode", "none");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("spellcheck", "false");

    input.addEventListener("focus", () => {
      input.blur();
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
    location.href = "/pages/premium_voice_settings.html?from=turan_dilleri";
  });

  UI.botSettingsMini?.addEventListener("click", () => {
    location.href = "/pages/premium_voice_settings.html?from=turan_dilleri";
  });

  UI.topInput?.addEventListener("input", () => {
    autoResize(UI.topInput);
    syncComposerButtons();
  });

  UI.botInput?.addEventListener("input", () => {
    autoResize(UI.botInput);
    syncComposerButtons();
  });

  UI.topInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendTyped("top");
    }
  });

  UI.botInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendTyped("bot");
    }
  });

  UI.topMic?.addEventListener("click", () => startRecognition("top"));
  UI.botMic?.addEventListener("click", () => startRecognition("bot"));
  UI.topSend?.addEventListener("click", () => sendTyped("top"));
  UI.botSend?.addEventListener("click", () => sendTyped("bot"));

  UI.topKbdBtn?.addEventListener("click", () => toggleKeyboard("top"));
  UI.botKbdBtn?.addEventListener("click", () => toggleKeyboard("bot"));

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
    syncComposerButtons();
    document.body.classList.remove("is-translating", "is-error");
    document.body.classList.add("is-ready");
    pointOrbTo("bot");
  });

  UI.genericCloseBtn?.addEventListener("click", closeModal);
  UI.genericBackdrop?.addEventListener("click", (e) => {
    if (e.target === UI.genericBackdrop) closeModal();
  });
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
  buildKeyboard(UI.topKeyboard, "top");
  buildKeyboard(UI.botKeyboard, "bot");
  bindEvents();
  syncComposerButtons();
  document.body.classList.add("is-ready");
  pointOrbTo("bot");
});
