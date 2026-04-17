import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const F2F_VOICE_KEY = "facetoface_voice_mode";
const F2F_PRESET_KEY = "facetoface_voice_preset";
const F2F_AUTO_READ_KEY = "facetoface_auto_read";

const TURAN_POOL = [
  { code:"az", name:"Azerbaycan Türkçesi", flag:"🇦🇿" },
  { code:"kk", name:"Kazakça", flag:"🇰🇿" },
  { code:"ky", name:"Kırgızca", flag:"🇰🇬" },
  { code:"uz", name:"Özbekçe", flag:"🇺🇿" },
  { code:"tk", name:"Türkmence", flag:"🇹🇲" },
  { code:"ug", name:"Uygurca", flag:"🌐" },
  { code:"tt", name:"Tatarca", flag:"🌐" },
  { code:"ba", name:"Başkurtça", flag:"🌐" },
  { code:"gag", name:"Gagavuzca", flag:"🌐" },
  { code:"crh", name:"Kırım Tatarcası", flag:"🌐" },
  { code:"nog", name:"Nogayca", flag:"🌐" }
];

const UI = {
  settingsBtn: $("settingsBtn"),

  topTuranBtn: $("topTuranBtn"),
  topTuranFlag: $("topTuranFlag"),
  topTuranText: $("topTuranText"),
  topInput: $("topInput"),
  topMicBtn: $("topMicBtn"),
  topSendBtn: $("topSendBtn"),
  topResultBubble: $("topResultBubble"),
  topResultSub: $("topResultSub"),

  botTuranBtn: $("botTuranBtn"),
  botTuranFlag: $("botTuranFlag"),
  botTuranText: $("botTuranText"),
  botInput: $("botInput"),
  botMicBtn: $("botMicBtn"),
  botSendBtn: $("botSendBtn"),
  botResultBubble: $("botResultBubble"),
  botResultSub: $("botResultSub"),

  homeBtn: $("homeBtn"),
  homeLink: $("homeLink"),
  clearBtn: $("clearBtn"),

  langPopover: $("langPopover"),
  popoverTitle: $("popoverTitle"),
  popoverClose: $("popoverClose"),
  langSearch: $("langSearch"),
  langList: $("langList"),

  toast: $("toast")
};

const state = {
  popoverTarget: null,
  top: {
    turan: "az",
    listening: false,
    recognizer: null
  },
  bot: {
    turan: "az",
    listening: false,
    recognizer: null
  },
  currentAudio: null,
  speakRunId: 0
};

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function toast(msg) {
  UI.toast.textContent = String(msg || "");
  UI.toast.classList.add("show");
  clearTimeout(window.__turanToast);
  window.__turanToast = setTimeout(() => {
    UI.toast.classList.remove("show");
  }, 1800);
}

function findTuran(code) {
  return TURAN_POOL.find((x) => x.code === code) || TURAN_POOL[0];
}

function updateLangPills() {
  const top = findTuran(state.top.turan);
  UI.topTuranFlag.textContent = top.flag;
  UI.topTuranText.textContent = top.name;

  const bot = findTuran(state.bot.turan);
  UI.botTuranFlag.textContent = bot.flag;
  UI.botTuranText.textContent = bot.name;
}

function syncSendButtons() {
  const topHasText = normalizeText(UI.topInput.value).length > 0;
  UI.topMicBtn.classList.toggle("hidden", topHasText && !state.top.listening);
  UI.topSendBtn.classList.toggle("hidden", !topHasText);
  UI.topMicBtn.classList.toggle("listening", state.top.listening);

  const botHasText = normalizeText(UI.botInput.value).length > 0;
  UI.botMicBtn.classList.toggle("hidden", botHasText && !state.bot.listening);
  UI.botSendBtn.classList.toggle("hidden", !botHasText);
  UI.botMicBtn.classList.toggle("listening", state.bot.listening);
}

function setResult(targetSide, main, sub = "") {
  const bubble = targetSide === "top" ? UI.topResultBubble : UI.botResultBubble;
  const subEl = targetSide === "top" ? UI.topResultSub : UI.botResultSub;

  bubble.textContent = String(main || "");
  subEl.textContent = String(sub || "");
  bubble.className = `bubble ${String(main || "").trim() && String(main || "").trim() !== "..." ? "latest" : "normal"}`;
}

function openPopover(target) {
  state.popoverTarget = target;
  UI.popoverTitle.textContent = "Turan Dili Seç";
  UI.langSearch.value = "";
  renderPopoverList("");
  UI.langPopover.classList.add("show");
  setTimeout(() => UI.langSearch.focus(), 40);
}

function closePopover() {
  state.popoverTarget = null;
  UI.langPopover.classList.remove("show");
}

function renderPopoverList(query = "") {
  if (!state.popoverTarget) return;

  const { side } = state.popoverTarget;
  const currentCode = state[side].turan;
  const q = normalizeText(query).toLowerCase();

  const filtered = !q
    ? TURAN_POOL
    : TURAN_POOL.filter((item) => `${item.name} ${item.code}`.toLowerCase().includes(q));

  if (!filtered.length) {
    UI.langList.innerHTML = `<div style="padding:22px 14px;text-align:center;color:rgba(255,255,255,.52);font-size:13px;">Dil bulunamadı.</div>`;
    return;
  }

  UI.langList.innerHTML = filtered.map((item) => `
    <button class="lang-option ${item.code === currentCode ? "active" : ""}" type="button" data-code="${item.code}">
      <div class="lang-option-left">
        <div class="lang-option-flag">${item.flag}</div>
        <div class="lang-option-text">
          <div class="lang-option-name">${item.name}</div>
          <div class="lang-option-code">${item.code}</div>
        </div>
      </div>
      <div class="lang-option-check">✓</div>
    </button>
  `).join("");

  UI.langList.querySelectorAll(".lang-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = btn.dataset.code;
      state[side].turan = code;
      updateLangPills();
      closePopover();
    });
  });
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

async function runTranslate(fromSide) {
  const inputEl = fromSide === "top" ? UI.topInput : UI.botInput;
  const targetSide = fromSide === "top" ? "bot" : "top";
  const text = normalizeText(inputEl.value);

  if (!text) return;

  document.getElementById("frameRoot").classList.remove("is-ready", "is-error");
  document.getElementById("frameRoot").classList.add("is-translating");

  setResult(targetSide, "Çevriliyor...", text);

  try {
    let translated = "";
    let speakLang = "tr";

    if (fromSide === "bot") {
      translated = await translateAI(text, "tr", state.bot.turan);
      speakLang = state.bot.turan;
    } else {
      translated = await translateAI(text, state.top.turan, "tr");
      speakLang = "tr";
    }

    setResult(targetSide, translated, text);
    await speakText(translated, speakLang);

    document.getElementById("frameRoot").classList.remove("is-translating", "is-error");
    document.getElementById("frameRoot").classList.add("is-ready");
  } catch (e) {
    setResult(targetSide, "⚠️ Çeviri şu an yapılamadı.", text);
    document.getElementById("frameRoot").classList.remove("is-translating");
    document.getElementById("frameRoot").classList.add("is-error");
    toast(`Çeviri hatası: ${e?.message || "bilinmeyen hata"}`);
    setTimeout(() => {
      document.getElementById("frameRoot").classList.remove("is-error");
      document.getElementById("frameRoot").classList.add("is-ready");
    }, 1200);
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

function stopRecognition(side) {
  const s = state[side];
  try { s.recognizer?.stop(); } catch {}
  s.recognizer = null;
  s.listening = false;
  syncSendButtons();
}

function startRecognition(side) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    toast("Bu cihazda sesli giriş desteklenmiyor");
    return;
  }

  if (state[side].listening) {
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
    state[side].listening = true;
    syncSendButtons();
  };

  recog.onresult = (e) => {
    const stableText = extractStableRecognitionText(e.results);
    inputEl.value = stableText;
    inputEl.style.height = "auto";
    inputEl.style.height = `${Math.min(inputEl.scrollHeight, 140)}px`;
    syncSendButtons();
  };

  recog.onerror = () => {
    stopRecognition(side);
    toast("Mikrofon hatası");
  };

  recog.onend = () => {
    state[side].listening = false;
    syncSendButtons();
  };

  state[side].recognizer = recog;

  try {
    recog.start();
  } catch {
    stopRecognition(side);
  }
}

function bindEvents() {
  UI.settingsBtn.addEventListener("click", () => {
    location.href = "/pages/premium_voice_settings.html?from=turan_dilleri";
  });

  UI.topTuranBtn.addEventListener("click", () => openPopover({ side:"top" }));
  UI.botTuranBtn.addEventListener("click", () => openPopover({ side:"bot" }));

  UI.popoverClose.addEventListener("click", closePopover);
  UI.langPopover.addEventListener("click", (e) => {
    if (e.target === UI.langPopover) closePopover();
  });
  UI.langSearch.addEventListener("input", (e) => {
    renderPopoverList(e.target.value || "");
  });

  UI.topInput.addEventListener("input", () => {
    UI.topInput.style.height = "auto";
    UI.topInput.style.height = `${Math.min(UI.topInput.scrollHeight, 140)}px`;
    syncSendButtons();
  });

  UI.botInput.addEventListener("input", () => {
    UI.botInput.style.height = "auto";
    UI.botInput.style.height = `${Math.min(UI.botInput.scrollHeight, 140)}px`;
    syncSendButtons();
  });

  UI.topInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runTranslate("top");
    }
  });

  UI.botInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      runTranslate("bot");
    }
  });

  UI.topMicBtn.addEventListener("click", () => startRecognition("top"));
  UI.botMicBtn.addEventListener("click", () => startRecognition("bot"));
  UI.topSendBtn.addEventListener("click", () => runTranslate("top"));
  UI.botSendBtn.addEventListener("click", () => runTranslate("bot"));

  UI.homeLink.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = "/pages/home.html";
  });

  UI.homeBtn.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  UI.clearBtn.addEventListener("click", () => {
    UI.topInput.value = "";
    UI.botInput.value = "";
    UI.topInput.style.height = "auto";
    UI.botInput.style.height = "auto";
    stopAudio();
    stopRecognition("top");
    stopRecognition("bot");
    setResult("top", "...", "");
    setResult("bot", "...", "");
    syncSendButtons();
    document.getElementById("frameRoot").classList.remove("is-translating", "is-error");
    document.getElementById("frameRoot").classList.add("is-ready");
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

  updateLangPills();
  bindEvents();
  syncSendButtons();
  setResult("top", "...", "");
  setResult("bot", "...", "");
  document.getElementById("frameRoot").classList.add("is-ready");
});
