import { supabase } from "/js/supabase_client.js";

let LangPoolModule = {};
try {
  LangPoolModule = await import("/LANG_POOL/langpool.js");
} catch {
  try { LangPoolModule = await import("/js/LANG_POOL/langpool.js"); } catch {}
}

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const BOT_LANG_POOL = [
  { code: "ku", name: "Kürtçe Kurmanci", flag: "☀️" },
  { code: "ckb", name: "Kürtçe Sorani", flag: "🌙" },
  { code: "he", name: "İbranice", flag: "✡️" }
];

const REQUIRED_TOP_LANGS = [
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  ...BOT_LANG_POOL
];

const FALLBACK_TOP_LANG_POOL = [
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "en", name: "İngilizce", flag: "🇬🇧" },
  { code: "de", name: "Almanca", flag: "🇩🇪" },
  { code: "fr", name: "Fransızca", flag: "🇫🇷" },
  { code: "it", name: "İtalyanca", flag: "🇮🇹" },
  { code: "es", name: "İspanyolca", flag: "🇪🇸" },
  { code: "ru", name: "Rusça", flag: "🇷🇺" },
  { code: "ar", name: "Arapça", flag: "🇸🇦" },
  ...BOT_LANG_POOL
];

const BCP = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
  ru: "ru-RU",
  ar: "ar-SA",
  ku: "tr-TR",
  ckb: "ar-IQ",
  he: "he-IL"
};

const SPEECH_FALLBACK = {
  ku: "tr",
  ckb: "ar",
  he: "he"
};

const UI = {
  centerHub: $("centerHub"),
  topLangBtn: $("topLangBtn"),
  topLangTxt: $("topLangTxt"),
  topMic: $("topMic"),
  topComposer: $("topComposer"),
  topBody: $("topBody"),
  popTop: $("pop-top"),
  closeTop: $("close-top"),
  listTop: $("list-top"),
  topInput: $("topInput"),
  topSend: $("topSend"),
  topKeyboardWrap: $("topKeyboardWrap"),
  botLangBtn: $("botLangBtn"),
  botLangTxt: $("botLangTxt"),
  botMic: $("botMic"),
  botComposer: $("botComposer"),
  botBody: $("botBody"),
  popBot: $("pop-bot"),
  closeBot: $("close-bot"),
  listBot: $("list-bot"),
  botInput: $("botInput"),
  botSend: $("botSend"),
  botKeyboardWrap: $("botKeyboardWrap"),
  homeBtn: $("homeBtn"),
  homeLink: $("homeLink"),
  clearBtn: $("clearBtn"),
  genericBackdrop: $("genericBackdrop"),
  genericCloseBtn: $("genericCloseBtn"),
  miniToast: $("miniToast")
};

const state = {
  topLang: "tr",
  botLang: "ku",
  topListening: false,
  botListening: false,
  topRecognizer: null,
  botRecognizer: null,
  topLastSpeech: "",
  botLastSpeech: "",
  loadingTopRow: null,
  loadingBotRow: null
};

function canon(v) {
  return String(v || "").trim().toLowerCase();
}

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function apiUrl(path) {
  return `${API_BASE}/api/${String(path || "").replace(/^\/+/, "")}`;
}

function toast(msg) {
  if (!UI.miniToast) return;
  UI.miniToast.textContent = String(msg || "");
  UI.miniToast.classList.add("show");
  clearTimeout(window.__mezoToast);
  window.__mezoToast = setTimeout(() => UI.miniToast.classList.remove("show"), 1800);
}

function siteLang() {
  const keys = ["site_lang", "siteLanguage", "italky_site_lang", "italky_site_language", "app_lang", "ui_lang"];
  for (const key of keys) {
    const value = canon(localStorage.getItem(key));
    if (value) return value.split("-")[0];
  }
  return canon(document.documentElement?.lang || navigator.language || "tr").split("-")[0] || "tr";
}

function modulePool() {
  const candidates = [
    LangPoolModule.LANG_POOL,
    LangPoolModule.LANGPOOL,
    LangPoolModule.LANGS,
    LangPoolModule.LANGUAGES,
    LangPoolModule.languages,
    LangPoolModule.default
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) return candidate;
    if (candidate && typeof candidate === "object") {
      const values = Object.values(candidate);
      if (values.length && values.every((item) => item && typeof item === "object")) return values;
    }
  }

  return FALLBACK_TOP_LANG_POOL;
}

function itemName(item, code) {
  const lang = siteLang();
  const groups = [item?.names, item?.nameByLang, item?.labels, item?.labelByLang, item?.translations, item?.i18n];

  for (const group of groups) {
    if (group && typeof group === "object") {
      const found = group[lang] || group[lang.toUpperCase()] || group.tr || group.TR || group.en || group.EN;
      if (found) return String(found);
    }
  }

  return String(
    item?.[`name_${lang}`] ||
    item?.[`label_${lang}`] ||
    item?.name_tr ||
    item?.label_tr ||
    item?.tr ||
    item?.name ||
    item?.label ||
    item?.title ||
    code.toUpperCase()
  );
}

function normalizeLang(item) {
  const code = canon(item?.code || item?.value || item?.lang || item?.id || item?.key);
  if (!code) return null;

  return {
    code,
    name: itemName(item, code),
    flag: String(item?.flag || item?.emoji || item?.icon || "🌐")
  };
}

function buildTopPool() {
  const seen = new Set();
  const out = [];

  for (const item of modulePool()) {
    const normalized = normalizeLang(item);
    if (!normalized || seen.has(normalized.code)) continue;
    seen.add(normalized.code);
    out.push(normalized);
  }

  for (const item of REQUIRED_TOP_LANGS) {
    if (seen.has(item.code)) continue;
    seen.add(item.code);
    out.push(item);
  }

  return out.length ? out : FALLBACK_TOP_LANG_POOL;
}

const TOP_LANG_POOL = buildTopPool();

function langFrom(pool, code) {
  return pool.find((item) => item.code === code) || pool[0];
}

function topLang() {
  return langFrom(TOP_LANG_POOL, state.topLang);
}

function botLang() {
  return langFrom(BOT_LANG_POOL, state.botLang);
}

function sideLang(side) {
  return side === "top" ? state.topLang : state.botLang;
}

function updateLangButtons() {
  const top = topLang();
  const bot = botLang();
  if (UI.topLangTxt) UI.topLangTxt.textContent = `${top.flag} ${top.name}`;
  if (UI.botLangTxt) UI.botLangTxt.textContent = `${bot.flag} ${bot.name}`;
}

function pointOrbTo(side) {
  document.body.classList.remove("to-top", "to-bot");
  document.body.classList.add(side === "top" ? "to-top" : "to-bot");
  UI.centerHub?.classList.toggle("to-top", side === "top");
}

function syncMicState() {
  UI.topSend?.classList.add("hidden");
  UI.botSend?.classList.add("hidden");
  UI.topMic?.classList.remove("hidden");
  UI.botMic?.classList.remove("hidden");
  UI.topMic?.classList.toggle("listening", state.topListening);
  UI.botMic?.classList.toggle("listening", state.botListening);
  UI.topComposer?.classList.toggle("listening", state.topListening);
  UI.botComposer?.classList.toggle("listening", state.botListening);
  document.body.classList.toggle("is-listening", state.topListening || state.botListening);
}

function keepVisible(side) {
  requestAnimationFrame(() => {
    const body = side === "top" ? UI.topBody : UI.botBody;
    if (body) body.scrollTop = body.scrollHeight + 400;
  });
}

function clearLatest(side) {
  const body = side === "top" ? UI.topBody : UI.botBody;
  body?.querySelectorAll(".bubble.me.is-latest").forEach((el) => el.classList.remove("is-latest"));
}

function speakerButton(textFn, langFn) {
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
    speakText(textFn(), langFn());
  });
  return btn;
}

function addBubble(side, kind, text, opts = {}) {
  const body = side === "top" ? UI.topBody : UI.botBody;
  if (!body) return null;

  const row = document.createElement("div");
  row.className = `bubble ${kind}${opts.latest ? " is-latest" : ""}`;

  const inner = document.createElement("div");
  inner.className = "bubble-row";

  const span = document.createElement("span");
  span.className = "txt";
  span.textContent = String(text || "");
  inner.appendChild(span);

  if (opts.speaker) {
    inner.appendChild(speakerButton(
      () => opts.speakText || span.textContent || "",
      () => opts.speakLang || "tr"
    ));
  }

  row.appendChild(inner);
  body.appendChild(row);
  keepVisible(side);
  return row;
}

function clearBubbles() {
  if (UI.topBody) UI.topBody.innerHTML = "";
  if (UI.botBody) UI.botBody.innerHTML = "";
  state.loadingTopRow = null;
  state.loadingBotRow = null;
}

function selectLang(side, code) {
  const next = canon(code);
  if (!next) return;

  if ((side === "top" && next === state.botLang) || (side === "bot" && next === state.topLang)) {
    toast("Aynı dili iki tarafta seçemezsiniz.");
    return;
  }

  if (side === "top") state.topLang = next;
  else state.botLang = next;

  updateLangButtons();
  renderLangLists();
  UI.popTop?.classList.remove("show");
  UI.popBot?.classList.remove("show");
  toast("Dil değişti");
}

function renderList(el, pool, selected, side) {
  if (!el) return;

  el.innerHTML = pool.map((item) => `
    <div class="pop-item ${item.code === selected ? "active" : ""}" data-code="${item.code}">
      <div class="pop-left">
        <div class="pop-flag">${item.flag}</div>
        <div class="pop-name">${item.name}</div>
      </div>
      <div class="pop-code">${item.code}</div>
    </div>
  `).join("");

  el.querySelectorAll(".pop-item").forEach((item) => {
    item.addEventListener("click", () => selectLang(side, item.dataset.code));
  });
}

function renderLangLists() {
  renderList(UI.listTop, TOP_LANG_POOL, state.topLang, "top");
  renderList(UI.listBot, BOT_LANG_POOL, state.botLang, "bot");
}

function speechLang(code) {
  const normalized = canon(code);
  return SPEECH_FALLBACK[normalized] || normalized || "tr";
}

function speakText(text, langCode) {
  const value = clean(text);
  if (!value || value === "...") return;

  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}

  const code = speechLang(langCode);

  try {
    if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
      window.NativeTTS.speak(value, code || "tr");
      return;
    }
  } catch {}

  try {
    if (!window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(value);
    utter.lang = String(BCP[code] || BCP.tr);
    const voices = window.speechSynthesis.getVoices?.() || [];
    const want = utter.lang.toLowerCase();
    utter.voice =
      voices.find((v) => String(v.lang || "").toLowerCase() === want) ||
      voices.find((v) => String(v.lang || "").toLowerCase().startsWith(code)) ||
      voices.find((v) => String(v.lang || "").toLowerCase().startsWith("tr")) ||
      voices[0] ||
      null;
    utter.rate = 0.95;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  } catch {}
}

async function translateText(text, from, to) {
  const res = await fetch(apiUrl("translate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      from_lang: from,
      to_lang: to,
      mode: "normal",
      use_ai: false,
      google_only: true
    })
  });

  const json = await res.json().catch(() => null);
  const out = String(json?.translated || json?.translation || "").trim();
  if (!res.ok || !out) throw new Error(json?.error || "translate_failed");
  return out;
}

function removeLoading(side) {
  if (side === "top" && state.loadingTopRow) {
    state.loadingTopRow.remove();
    state.loadingTopRow = null;
  }
  if (side === "bot" && state.loadingBotRow) {
    state.loadingBotRow.remove();
    state.loadingBotRow = null;
  }
}

function showLoading(side) {
  removeLoading(side);
  const row = addBubble(side, "me", "Çevriliyor...", { latest: true });
  if (side === "top") state.loadingTopRow = row;
  else state.loadingBotRow = row;
}

async function runTranslate(fromSide, text) {
  const source = fromSide;
  const target = fromSide === "top" ? "bot" : "top";
  const value = clean(text);
  if (!value) return;

  document.body.classList.remove("is-ready", "is-error");
  document.body.classList.add("is-translating");
  pointOrbTo(source);

  clearLatest(source);
  clearLatest(target);
  addBubble(source, "me", value, { latest: true });
  showLoading(target);

  try {
    const translated = await translateText(value, sideLang(source), sideLang(target));
    removeLoading(target);
    addBubble(target, "me", translated, {
      latest: true,
      speaker: true,
      speakText: translated,
      speakLang: sideLang(target)
    });
    speakText(translated, sideLang(target));
    document.body.classList.remove("is-translating", "is-error");
    document.body.classList.add("is-ready");
  } catch (err) {
    removeLoading(target);
    addBubble(target, "me", "⚠️ Çeviri şu an yapılamadı.", { latest: true });
    document.body.classList.remove("is-translating");
    document.body.classList.add("is-error");
    toast(`Çeviri hatası: ${err?.message || "bilinmeyen hata"}`);
    setTimeout(() => {
      document.body.classList.remove("is-error");
      document.body.classList.add("is-ready");
    }, 1200);
  }
}

function stableSpeechText(results) {
  let finalText = "";
  let interimText = "";

  for (let i = 0; i < results.length; i++) {
    const part = clean(results[i]?.[0]?.transcript || "");
    if (!part) continue;
    if (results[i].isFinal) finalText = part;
    else interimText = part;
  }

  return clean(finalText || interimText);
}

function setListening(side, on) {
  if (side === "top") state.topListening = !!on;
  else state.botListening = !!on;
  syncMicState();
}

function stopRecognition(side) {
  if (side === "top") {
    try { state.topRecognizer?.stop(); } catch {}
    state.topRecognizer = null;
    state.topListening = false;
  } else {
    try { state.botRecognizer?.stop(); } catch {}
    state.botRecognizer = null;
    state.botListening = false;
  }
  setListening(side, false);
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

  const code = speechLang(sideLang(side));
  const recog = new SR();
  recog.lang = String(BCP[code] || BCP.tr);
  recog.interimResults = true;
  recog.continuous = false;
  recog.maxAlternatives = 1;

  recog.onstart = () => {
    pointOrbTo(side);
    setListening(side, true);
    if (side === "top") state.topLastSpeech = "";
    else state.botLastSpeech = "";
  };

  recog.onresult = (e) => {
    const text = stableSpeechText(e.results);
    if (side === "top") state.topLastSpeech = text;
    else state.botLastSpeech = text;
  };

  recog.onerror = () => {
    stopRecognition(side);
    toast("Mikrofon hatası");
  };

  recog.onend = async () => {
    const text = clean(side === "top" ? state.topLastSpeech : state.botLastSpeech);
    stopRecognition(side);
    if (text) await runTranslate(side, text);
  };

  if (side === "top") state.topRecognizer = recog;
  else state.botRecognizer = recog;

  try {
    recog.start();
  } catch {
    stopRecognition(side);
    toast("Mikrofon başlatılamadı");
  }
}

function prepareMicOnly() {
  [UI.topInput, UI.botInput].forEach((input) => {
    if (!input) return;
    input.value = "";
    input.disabled = true;
    input.readOnly = true;
    input.setAttribute("inputmode", "none");
    input.setAttribute("aria-hidden", "true");
    input.setAttribute("tabindex", "-1");
  });

  UI.topSend?.classList.add("hidden");
  UI.botSend?.classList.add("hidden");
  UI.topKeyboardWrap?.setAttribute("aria-hidden", "true");
  UI.botKeyboardWrap?.setAttribute("aria-hidden", "true");
}

function bindEvents() {
  UI.topLangBtn?.addEventListener("click", () => {
    renderLangLists();
    UI.popTop?.classList.add("show");
  });

  UI.botLangBtn?.addEventListener("click", () => {
    renderLangLists();
    UI.popBot?.classList.add("show");
  });

  UI.closeTop?.addEventListener("click", () => UI.popTop?.classList.remove("show"));
  UI.closeBot?.addEventListener("click", () => UI.popBot?.classList.remove("show"));

  UI.topMic?.addEventListener("click", () => startRecognition("top"));
  UI.botMic?.addEventListener("click", () => startRecognition("bot"));

  UI.homeLink?.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = "/pages/home.html";
  });

  UI.homeBtn?.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  UI.clearBtn?.addEventListener("click", () => {
    stopRecognition("top");
    stopRecognition("bot");
    clearBubbles();
    syncMicState();
    document.body.classList.remove("is-translating", "is-error", "is-listening");
    document.body.classList.add("is-ready");
    pointOrbTo("bot");
  });

  UI.genericCloseBtn?.addEventListener("click", () => {
    UI.genericBackdrop?.classList.remove("show", "open");
  });

  UI.genericBackdrop?.addEventListener("click", (e) => {
    if (e.target === UI.genericBackdrop) UI.genericBackdrop.classList.remove("show", "open");
  });

  document.addEventListener("click", (e) => {
    const insidePopover =
      (UI.popTop && UI.popTop.contains(e.target)) ||
      (UI.popBot && UI.popBot.contains(e.target));
    const languageButton = e.target?.closest?.("#topLangBtn,#botLangBtn");

    if (!insidePopover && !languageButton) {
      UI.popTop?.classList.remove("show");
      UI.popBot?.classList.remove("show");
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

  prepareMicOnly();
  updateLangButtons();
  renderLangLists();
  bindEvents();
  syncMicState();
  document.body.classList.add("is-ready");
  pointOrbTo("bot");
});