import { supabase } from "/js/supabase_client.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";
import { LANG_POOL } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const frameRoot = $("frameRoot");

const fromBtn = $("fromBtn");
const toBtn = $("toBtn");
const swapBtn = $("swapBtn");
const fromFlag = $("fromFlag");
const toFlag = $("toFlag");
const fromText = $("fromText");
const toText = $("toText");

const soundToggle = $("soundToggle");

const resultBubble = $("resultBubble");
const resultSub = $("resultSub");
const resultArea = $("resultArea");

const inputBox = $("inputBox");
const inputPreviewBubble = $("inputPreviewBubble");
const micBtn = $("micBtn");
const translateBtn = $("translateBtn");

const homeBtn = $("homeBtn");
const homeLink = $("homeLink");
const clearBtn = $("clearBtn");

const langPopover = $("langPopover");
const popoverTitle = $("popoverTitle");
const popoverClose = $("popoverClose");
const langSearch = $("langSearch");
const langList = $("langList");

const toastEl = $("toast");

const BCP = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
  ar: "ar-SA",
  ru: "ru-RU",
  bg: "bg-BG",
  pt: "pt-PT",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR"
};

let fromLang = localStorage.getItem("text_single_from_lang") || "tr";
let toLang = localStorage.getItem("text_single_to_lang") || "en";
let ALL_LANGS = [];
let popoverMode = "from";

let audio = null;
let speakCtl = null;
let speakToken = 0;
let lastTranslateToken = 0;

let recognizer = null;
let listening = false;
let booted = false;

let soundEnabled = localStorage.getItem("text_single_sound_enabled") !== "0";

function canonical(code) {
  return String(code || "").trim().toLowerCase().split("-")[0];
}

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toast(msg) {
  if (!toastEl) return;

  toastEl.textContent = String(msg || "");
  toastEl.classList.add("show");

  clearTimeout(window.__textSingleToast);
  window.__textSingleToast = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2200);
}

function setState(state) {
  if (!frameRoot) return;

  frameRoot.classList.remove("is-ready", "is-error", "is-translating", "is-idle");

  if (state === "translating") frameRoot.classList.add("is-translating");
  else if (state === "error") frameRoot.classList.add("is-error");
  else if (state === "idle") frameRoot.classList.add("is-idle");
  else frameRoot.classList.add("is-ready");
}

function setOutput(main, sub = "") {
  if (!resultBubble || !resultSub) return;

  const value = String(main || "");
  resultBubble.textContent = value || "...";
  resultSub.textContent = sub || "";

  resultBubble.className =
    `bubble ${value.trim() && value.trim() !== "..." ? "latest" : "normal"}`;

  try {
    resultArea.scrollTop = resultArea.scrollHeight + 300;
  } catch {}
}

function syncInputPreview() {
  if (!inputPreviewBubble || !inputBox) return;
  inputPreviewBubble.textContent = normalizeText(inputBox.value);
}

function syncInputButtons() {
  if (!inputBox || !micBtn || !translateBtn) return;

  const hasText = normalizeText(inputBox.value).length > 0;

  if (listening) {
    micBtn.classList.remove("hidden");
    micBtn.classList.add("listening");
    translateBtn.classList.add("hidden");
    return;
  }

  micBtn.classList.remove("listening");

  if (hasText) {
    micBtn.classList.add("hidden");
    translateBtn.classList.remove("hidden");
  } else {
    micBtn.classList.remove("hidden");
    translateBtn.classList.add("hidden");
  }
}

function autoResizeInput() {
  if (!inputBox) return;
  inputBox.style.height = "auto";
  inputBox.style.height = `${Math.min(inputBox.scrollHeight, 140)}px`;
}

function stopSpeak() {
  try {
    speakCtl?.abort?.();
  } catch {}

  speakCtl = null;

  try {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
  } catch {}

  audio = null;

  try { window.NativeTTS?.stop?.(); } catch {}
  try { window.speechSynthesis?.cancel?.(); } catch {}
}

function chooseWebVoice(langCode) {
  const lang = canonical(langCode);
  const voices = window.speechSynthesis?.getVoices?.() || [];

  return (
    voices.find((v) => String(v.lang || "").toLowerCase().startsWith(lang)) ||
    voices.find((v) => String(v.lang || "").toLowerCase().startsWith("en")) ||
    voices[0] ||
    null
  );
}

function speakNativeFallback(text, langCode) {
  const value = normalizeText(text);
  if (!value) return false;

  if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
    try { window.NativeTTS.stop?.(); } catch {}

    setTimeout(() => {
      try {
        window.NativeTTS.speak(value, canonical(langCode || "en"));
      } catch {}
    }, 80);

    return true;
  }

  if (!window.speechSynthesis) return false;

  try { window.speechSynthesis.cancel(); } catch {}

  const u = new SpeechSynthesisUtterance(value);
  u.lang = BCP[canonical(langCode)] || String(langCode || "en-US");

  const voice = chooseWebVoice(langCode);
  if (voice) u.voice = voice;

  setTimeout(() => {
    try {
      window.speechSynthesis.speak(u);
    } catch {}
  }, 60);

  return true;
}

async function speakText(text, langCode) {
  if (!soundEnabled) return;

  const value = normalizeText(text);
  if (!value || value === "...") return;

  stopSpeak();

  const myToken = ++speakToken;

  try {
    speakCtl = new AbortController();

    const r = await fetch(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: value,
        lang: canonical(langCode || "en")
      }),
      signal: speakCtl.signal
    });

    if (myToken !== speakToken) return;

    const j = await r.json().catch(() => null);

    if (myToken !== speakToken) return;

    if (j?.audio_base64) {
      audio = new Audio("data:audio/mpeg;base64," + j.audio_base64);
      audio.playsInline = true;
      audio.onended = () => {
        if (myToken === speakToken) audio = null;
      };
      audio.onerror = () => {
        if (myToken === speakToken) audio = null;
      };

      await audio.play();
      return;
    }

    speakNativeFallback(value, canonical(langCode));
  } catch (e) {
    if (e?.name !== "AbortError") {
      speakNativeFallback(value, canonical(langCode));
    }
  }
}

async function translateViaBackend(text, from, to) {
  const endpoints = [
    `${API_BASE}/api/translate_ai`,
    `${API_BASE}/api/translate-ai`,
    `${API_BASE}/api/translate`
  ];

  for (const endpoint of endpoints) {
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: normalizeText(text),
          from_lang: canonical(from),
          to_lang: canonical(to),
          source: canonical(from),
          target: canonical(to),
          mode: "normal",
          use_ai: false,
          cultural: false,
          tone: "neutral",
          style: "warm"
        })
      });

      const j = await r.json().catch(() => null);
      const value = normalizeText(j?.translated || j?.translation || j?.text || "");

      if (r.ok && value) return value;
    } catch {}
  }

  return null;
}

async function translateGoogleFree(text, from, to) {
  const params = new URLSearchParams({
    client: "gtx",
    sl: canonical(from),
    tl: canonical(to),
    dt: "t",
    q: text
  });

  const r = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`);

  if (!r.ok) {
    throw new Error("google_free_failed");
  }

  const data = await r.json().catch(() => null);
  let translated = "";

  if (Array.isArray(data) && Array.isArray(data[0])) {
    for (const item of data[0]) {
      if (Array.isArray(item) && item[0]) {
        translated += String(item[0]);
      }
    }
  }

  translated = normalizeText(translated);
  if (!translated) throw new Error("google_free_empty");

  return translated;
}

async function translateAny(text, from, to) {
  const backend = await translateViaBackend(text, from, to);
  if (backend) return backend;

  return await translateGoogleFree(text, from, to);
}

const TURKISH_LANG_NAMES = {
  af:"Afrikanca", sq:"Arnavutça", am:"Amharca", ar:"Arapça", hy:"Ermenice", az:"Azerbaycanca",
  eu:"Baskça", be:"Belarusça", bn:"Bengalce", bs:"Boşnakça", bg:"Bulgarca", ca:"Katalanca",
  ceb:"Cebuano", zh:"Çince", "zh-cn":"Basitleştirilmiş Çince", "zh-tw":"Geleneksel Çince",
  co:"Korsikaca", hr:"Hırvatça", cs:"Çekçe", da:"Danca", nl:"Hollandaca", en:"İngilizce",
  eo:"Esperanto", et:"Estonca", fi:"Fince", fr:"Fransızca", fy:"Frizce", gl:"Galiçyaca",
  ka:"Gürcüce", de:"Almanca", el:"Yunanca", gu:"Guceratça", ht:"Haiti Kreyolu", ha:"Hausa",
  haw:"Hawaii Dili", he:"İbranice", iw:"İbranice", hi:"Hintçe", hmn:"Hmongca", hu:"Macarca",
  is:"İzlandaca", ig:"İgbo", id:"Endonezce", ga:"İrlandaca", it:"İtalyanca", ja:"Japonca",
  jv:"Cava Dili", kn:"Kannada", kk:"Kazakça", km:"Kmerce", rw:"Kinyarwanda", ko:"Korece",
  ku:"Kürtçe", ky:"Kırgızca", lo:"Laoca", la:"Latince", lv:"Letonca", lt:"Litvanca",
  lb:"Lüksemburgca", mk:"Makedonca", mg:"Malgaşça", ms:"Malayca", ml:"Malayalamca", mt:"Maltaca",
  mi:"Maorice", mr:"Marathi", mn:"Moğolca", my:"Burmaca", ne:"Nepalce", no:"Norveççe",
  ny:"Nyanja", or:"Oriyaca", ps:"Peştuca", fa:"Farsça", pl:"Lehçe", pt:"Portekizce",
  pa:"Pencapça", ro:"Romence", ru:"Rusça", sm:"Samoaca", gd:"İskoç Galcesi", sr:"Sırpça",
  st:"Sotho", sn:"Shona", sd:"Sindhi", si:"Sinhalaca", sk:"Slovakça", sl:"Slovence",
  so:"Somalice", es:"İspanyolca", su:"Sundaca", sw:"Svahili", sv:"İsveççe", tl:"Tagalog",
  tg:"Tacikçe", ta:"Tamilce", tt:"Tatarca", te:"Teluguca", th:"Tayca", tr:"Türkçe",
  tk:"Türkmence", uk:"Ukraynaca", ur:"Urduca", ug:"Uygurca", uz:"Özbekçe", vi:"Vietnamca",
  cy:"Galce", xh:"Xhosa", yi:"Yidiş", yo:"Yorubaca", zu:"Zuluca"
};

const FLAG_MAP = {
  tr:"🇹🇷", en:"🇬🇧", de:"🇩🇪", fr:"🇫🇷", it:"🇮🇹", es:"🇪🇸", ru:"🇷🇺", ar:"🇸🇦", zh:"🇨🇳",
  ja:"🇯🇵", ko:"🇰🇷", pt:"🇵🇹", nl:"🇳🇱", el:"🇬🇷", uk:"🇺🇦", pl:"🇵🇱", ro:"🇷🇴", bg:"🇧🇬",
  he:"🇮🇱", hi:"🇮🇳", id:"🇮🇩", fa:"🇮🇷", ur:"🇵🇰", th:"🇹🇭", vi:"🇻🇳"
};

function getFlag(code, item) {
  return item?.flag || FLAG_MAP[canonical(code)] || "🌐";
}

function getTurkishName(item) {
  const code = canonical(item?.code);

  return (
    TURKISH_LANG_NAMES[code] ||
    item?.tr ||
    item?.tr_name ||
    item?.name_tr ||
    item?.nativeName ||
    item?.name ||
    code.toUpperCase()
  );
}

function sanitizeLangPool() {
  const raw = Array.isArray(LANG_POOL) ? LANG_POOL : [];
  const seen = new Set();

  return raw
    .map((item) => {
      const code = canonical(item?.code);
      if (!code || seen.has(code) || code === "auto" || code === "detect") return null;

      seen.add(code);

      const trName = getTurkishName(item);

      return {
        code,
        flag: getFlag(code, item),
        trName,
        searchText: [
          code,
          trName,
          item?.name || "",
          item?.nativeName || ""
        ].join(" ").toLowerCase()
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.trName.localeCompare(b.trName, "tr"));
}

function getLangByCode(code) {
  return ALL_LANGS.find((x) => x.code === canonical(code)) || {
    code: canonical(code),
    flag: "🌐",
    trName: String(code || "").toUpperCase()
  };
}

function ensureValidLanguages() {
  if (!ALL_LANGS.find((x) => x.code === canonical(fromLang))) fromLang = "tr";
  if (!ALL_LANGS.find((x) => x.code === canonical(toLang))) toLang = "en";

  if (canonical(fromLang) === canonical(toLang)) {
    const fallback = canonical(fromLang) === "en" ? "tr" : "en";
    if (ALL_LANGS.find((x) => x.code === fallback)) {
      toLang = fallback;
    }
  }
}

function renderTopLanguageButtons() {
  const fromObj = getLangByCode(fromLang);
  const toObj = getLangByCode(toLang);

  if (fromFlag) fromFlag.textContent = fromObj.flag;
  if (toFlag) toFlag.textContent = toObj.flag;
  if (fromText) fromText.textContent = fromObj.trName;
  if (toText) toText.textContent = toObj.trName;

  localStorage.setItem("text_single_from_lang", canonical(fromLang));
  localStorage.setItem("text_single_to_lang", canonical(toLang));
}

function renderToggles() {
  if (soundToggle) {
    soundToggle.classList.toggle("active", !!soundEnabled);
    soundToggle.classList.toggle("inactive", !soundEnabled);
  }

  localStorage.setItem("text_single_sound_enabled", soundEnabled ? "1" : "0");
}

function renderLangList(query = "") {
  if (!langList) return;

  const q = String(query || "").trim().toLowerCase();
  const currentCode = popoverMode === "from" ? canonical(fromLang) : canonical(toLang);

  const filtered = !q
    ? ALL_LANGS
    : ALL_LANGS.filter((item) => item.searchText.includes(q));

  if (!filtered.length) {
    langList.innerHTML = `<div style="padding:22px 14px;text-align:center;color:rgba(255,255,255,.52);font-size:13px;">Aradığın dil bulunamadı.</div>`;
    return;
  }

  langList.innerHTML = filtered.map((item) => `
    <button class="lang-option ${item.code === currentCode ? "active" : ""}" type="button" data-code="${item.code}">
      <div class="lang-option-left">
        <div class="lang-option-flag">${item.flag}</div>
        <div class="lang-option-text">
          <div class="lang-option-name">${escapeHtml(item.trName)}</div>
          <div class="lang-option-code">${escapeHtml(item.code)}</div>
        </div>
      </div>
      <div class="lang-option-check">✓</div>
    </button>
  `).join("");

  langList.querySelectorAll(".lang-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = canonical(btn.dataset.code);
      if (!code) return;

      if (popoverMode === "from") {
        fromLang = code;

        if (canonical(fromLang) === canonical(toLang)) {
          const other = ALL_LANGS.find((x) => x.code !== canonical(fromLang));
          if (other) toLang = other.code;
        }
      } else {
        toLang = code;

        if (canonical(toLang) === canonical(fromLang)) {
          const other = ALL_LANGS.find((x) => x.code !== canonical(toLang));
          if (other) fromLang = other.code;
        }
      }

      renderTopLanguageButtons();
      closeLangPopover();
    });
  });
}

function openLangPopover(mode) {
  popoverMode = mode === "to" ? "to" : "from";

  if (popoverTitle) {
    popoverTitle.textContent = popoverMode === "from" ? "Kaynak Dil Seç" : "Hedef Dil Seç";
  }

  langPopover?.classList.add("show");

  if (langSearch) {
    langSearch.value = "";
  }

  renderLangList("");

  setTimeout(() => {
    try { langSearch?.focus?.(); } catch {}
  }, 40);
}

function closeLangPopover() {
  langPopover?.classList.remove("show");
}

async function translateText() {
  const sourceText = normalizeText(inputBox?.value || "");

  if (!sourceText) {
    setOutput("...");
    toast("Önce çevrilecek bir metin yaz.");
    syncInputButtons();
    return;
  }

  const myToken = ++lastTranslateToken;
  const from = canonical(fromLang);
  const to = canonical(toLang);

  const originalText = sourceText;

  if (inputBox) {
    inputBox.value = "";
    autoResizeInput();
  }

  syncInputPreview();
  syncInputButtons();

  setState("translating");
  setOutput("Çevriliyor...");

  try {
    const out = await translateAny(originalText, from, to);

    if (myToken !== lastTranslateToken) return;

    setOutput(out);
    setState("ready");

    if (soundEnabled) {
      setTimeout(() => {
        speakText(out, to);
      }, 140);
    }
  } catch (e) {
    if (myToken !== lastTranslateToken) return;

    setOutput("⚠️ Çeviri şu an yapılamadı.");
    setState("error");
    toast(`Çeviri hatası: ${e?.message || "bilinmeyen hata"}`);

    setTimeout(() => {
      setState("ready");
    }, 1200);
  }
}

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

function stopRecognition() {
  try { recognizer?.stop?.(); } catch {}
  try { recognizer?.abort?.(); } catch {}

  recognizer = null;
  listening = false;
  syncInputButtons();
}

window.onNativeSpeechResult = function(payload) {
  try {
    const data = typeof payload === "string" ? JSON.parse(payload) : payload;
    const value = normalizeText(data?.text || data?.result || "");

    if (value && inputBox) {
      inputBox.value = value;
      autoResizeInput();
      syncInputPreview();
      syncInputButtons();
    }
  } catch {}

  listening = false;
  syncInputButtons();
};

window.onNativeSpeechError = function() {
  listening = false;
  syncInputButtons();
  toast("Mikrofon hatası");
};

function startRecognition() {
  if (listening) {
    stopRecognition();
    return;
  }

  const langCode = BCP[canonical(fromLang)] || `${canonical(fromLang)}-${canonical(fromLang).toUpperCase()}`;

  if (window.Native && typeof window.Native.startSpeechRecognition === "function") {
    try {
      listening = true;
      syncInputButtons();
      window.Native.startSpeechRecognition(langCode, "text");
      return;
    } catch {
      listening = false;
      syncInputButtons();
    }
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    toast("Bu cihazda sesli giriş desteklenmiyor");
    return;
  }

  recognizer = new SR();
  recognizer.lang = langCode;
  recognizer.interimResults = true;
  recognizer.continuous = false;
  recognizer.maxAlternatives = 1;

  recognizer.onstart = () => {
    listening = true;
    syncInputButtons();
  };

  recognizer.onresult = (e) => {
    const stableText = extractStableRecognitionText(e.results);

    if (inputBox) {
      inputBox.value = stableText;
      autoResizeInput();
    }

    syncInputPreview();
    syncInputButtons();
  };

  recognizer.onerror = () => {
    stopRecognition();
    toast("Mikrofon hatası");
  };

  recognizer.onend = () => {
    listening = false;
    syncInputButtons();
  };

  try {
    recognizer.start();
  } catch {
    stopRecognition();
  }
}

async function requireLogin() {
  const { data: { session } = {} } = await supabase.auth.getSession();

  if (!session?.user) {
    location.replace("/pages/login.html");
    return false;
  }

  try {
    await ensureAuthAndCacheUser();
  } catch {}

  return true;
}

function bindEvents() {
  fromBtn?.addEventListener("click", () => openLangPopover("from"));
  toBtn?.addEventListener("click", () => openLangPopover("to"));

  swapBtn?.addEventListener("click", () => {
    const oldFrom = fromLang;
    fromLang = toLang;
    toLang = oldFrom;

    renderTopLanguageButtons();
    toast("Diller değiştirildi");
  });

  popoverClose?.addEventListener("click", closeLangPopover);

  langPopover?.addEventListener("click", (e) => {
    if (e.target === langPopover) closeLangPopover();
  });

  langSearch?.addEventListener("input", (e) => {
    renderLangList(e.target.value || "");
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && langPopover?.classList.contains("show")) {
      closeLangPopover();
    }
  });

  soundToggle?.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    renderToggles();

    if (!soundEnabled) stopSpeak();

    toast(soundEnabled ? "Ses açıldı" : "Ses kapatıldı");
  });

  translateBtn?.addEventListener("click", translateText);

  inputBox?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      translateText();
    }
  });

  inputBox?.addEventListener("input", () => {
    autoResizeInput();
    syncInputPreview();
    syncInputButtons();
  });

  micBtn?.addEventListener("click", startRecognition);

  homeLink?.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = "/pages/home.html";
  });

  homeBtn?.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  clearBtn?.addEventListener("click", () => {
    if (inputBox) {
      inputBox.value = "";
      autoResizeInput();
    }

    setOutput("...");
    syncInputPreview();
    stopSpeak();
    stopRecognition();
    setState("ready");
  });
}

async function boot() {
  if (booted) return;
  booted = true;

  if (!(await requireLogin())) return;

  ALL_LANGS = sanitizeLangPool();

  ensureValidLanguages();
  renderTopLanguageButtons();
  renderToggles();
  bindEvents();

  setOutput("...");

  if (inputBox) {
    inputBox.removeAttribute("readonly");
    inputBox.disabled = false;
    autoResizeInput();
  }

  syncInputPreview();
  syncInputButtons();
  setState("ready");

  console.log("TEXT_TRANSLATE_READY_V7", {
    fromLang,
    toLang,
    langs: ALL_LANGS.length
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}

window.addEventListener("beforeunload", () => {
  stopSpeak();
  stopRecognition();
});
