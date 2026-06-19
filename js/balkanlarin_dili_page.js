import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

function apiUrl(path) {
  return `${API_BASE}/api/${String(path || "").replace(/^\/+/, "")}`;
}

/*
  BALKANLARIN DİLİ
  - ÜST / 180 derece: /js/lang_pool_full.js full dil havuzu
  - ALT: Balkan dilleri
  - Slovence / sl çıkarıldı
  - Input yok
  - Klavye yok
  - Send yok
  - Sadece mikrofon
  - AI yok
  - /api/translate + use_ai:false + google_only:true
*/

const F2F_AUTO_READ_KEY = "facetoface_auto_read";

const BALKAN_LANG_POOL = [
  { code: "sq", name: "Arnavutça", flag: "🇦🇱" },
  { code: "bs", name: "Boşnakça", flag: "🇧🇦" },
  { code: "bg", name: "Bulgarca", flag: "🇧🇬" },
  { code: "el", name: "Yunanca", flag: "🇬🇷" },
  { code: "ro", name: "Romence", flag: "🇷🇴" },
  { code: "mk", name: "Makedonca", flag: "🇲🇰" },
  { code: "sr", name: "Sırpça", flag: "🇷🇸" },
  { code: "hr", name: "Hırvatça", flag: "🇭🇷" }
];


const TOP_LANG_FALLBACK_META = {
  tr: { name: "Türkçe", flag: "🇹🇷" },
  en: { name: "İngilizce", flag: "🇬🇧" },
  de: { name: "Almanca", flag: "🇩🇪" },
  fr: { name: "Fransızca", flag: "🇫🇷" },
  it: { name: "İtalyanca", flag: "🇮🇹" },
  es: { name: "İspanyolca", flag: "🇪🇸" },
  ru: { name: "Rusça", flag: "🇷🇺" },
  ar: { name: "Arapça", flag: "🇸🇦" },
  pt: { name: "Portekizce", flag: "🇵🇹" },
  nl: { name: "Flemenkçe", flag: "🇳🇱" },
  pl: { name: "Lehçe", flag: "🇵🇱" },
  uk: { name: "Ukraynaca", flag: "🇺🇦" },
  bg: { name: "Bulgarca", flag: "🇧🇬" },
  ro: { name: "Romence", flag: "🇷🇴" },
  el: { name: "Yunanca", flag: "🇬🇷" },
  sq: { name: "Arnavutça", flag: "🇦🇱" },
  bs: { name: "Boşnakça", flag: "🇧🇦" },
  sr: { name: "Sırpça", flag: "🇷🇸" },
  hr: { name: "Hırvatça", flag: "🇭🇷" },
  mk: { name: "Makedonca", flag: "🇲🇰" },
  ka: { name: "Gürcüce", flag: "🇬🇪" },
  ku: { name: "Kürtçe Kurmanci", flag: "☀️" },
  ckb: { name: "Kürtçe Sorani", flag: "🌙" },
  he: { name: "İbranice", flag: "✡️" },
  az: { name: "Azerbaycan Türkçesi", flag: "🇦🇿" },
  kk: { name: "Kazakça", flag: "🇰🇿" },
  ky: { name: "Kırgızca", flag: "🇰🇬" },
  uz: { name: "Özbekçe", flag: "🇺🇿" },
  tk: { name: "Türkmence", flag: "🇹🇲" },
  ug: { name: "Uygurca", flag: "🔹" },
  tt: { name: "Tatarca", flag: "🔷" },
  ba: { name: "Başkurtça", flag: "🔸" },
  crh: { name: "Kırım Tatarcası", flag: "🔹" }
};

function fallbackLangMeta(code) {
  return TOP_LANG_FALLBACK_META[canon(code)] || null;
}

const REQUIRED_TOP_LANGS = [
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  ...BALKAN_LANG_POOL
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
  ...BALKAN_LANG_POOL
];

let TOP_LANG_POOL = FALLBACK_TOP_LANG_POOL.slice();

const BCP = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
  ru: "ru-RU",
  ar: "ar-SA",
  sq: "sq-AL",
  bs: "bs-BA",
  bg: "bg-BG",
  el: "el-GR",
  ro: "ro-RO",
  mk: "mk-MK",
  sr: "sr-RS",
  hr: "hr-HR"
};

const TTS_FALLBACK_LANG = {
  sq: "tr",
  bs: "tr",
  bg: "tr",
  el: "tr",
  ro: "tr",
  mk: "tr",
  sr: "tr",
  hr: "tr"
};

const UI = {
  centerHub: $("centerHub"),

  topLangBtn: $("topLangBtn"),
  topLangTxt: $("topLangTxt"),
  topInput: $("topInput"),
  topMic: $("topMic"),
  topSend: $("topSend"),
  topComposer: $("topComposer"),
  topBody: $("topBody"),
  topKeyboardWrap: $("topKeyboardWrap"),
  popTop: $("pop-top"),
  closeTop: $("close-top"),
  listTop: $("list-top"),

  botLangBtn: $("botLangBtn"),
  botLangTxt: $("botLangTxt"),
  botInput: $("botInput"),
  botMic: $("botMic"),
  botSend: $("botSend"),
  botComposer: $("botComposer"),
  botBody: $("botBody"),
  botKeyboardWrap: $("botKeyboardWrap"),
  popBot: $("pop-bot"),
  closeBot: $("close-bot"),
  listBot: $("list-bot"),

  homeBtn: $("homeBtn"),
  homeLink: $("homeLink"),
  clearBtn: $("clearBtn"),

  genericBackdrop: $("genericBackdrop"),
  genericCloseBtn: $("genericCloseBtn"),
  miniToast: $("miniToast")
};

const state = {
  topLang: "tr",
  botLang: "sq",

  topListening: false,
  botListening: false,
  topRecognizer: null,
  botRecognizer: null,

  topLastSpeech: "",
  botLastSpeech: "",

  currentAudio: null,
  speakRunId: 0,

  loadingTopRow: null,
  loadingBotRow: null
};

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function canon(code) {
  return String(code || "").trim().toLowerCase();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  UI.genericBackdrop?.classList.remove("open");
}

function siteLang() {
  const keys = [
    "site_lang",
    "siteLanguage",
    "italky_site_lang",
    "italky_site_language",
    "italky_site_lang_v1",
    "siteLang",
    "app_lang",
    "ui_lang"
  ];

  for (const key of keys) {
    const value = canon(localStorage.getItem(key));
    if (value) return value.split("-")[0];
  }

  return canon(document.documentElement?.lang || navigator.language || "tr").split("-")[0] || "tr";
}

async function loadFullLangPoolModule() {
  try {
    return await import("/js/lang_pool_full.js");
  } catch (e) {
    console.warn("[BALKAN] lang_pool_full yüklenemedi, fallback kullanılacak", e);
    return {};
  }
}

function extractPoolFromModule(module) {
  const candidates = [
    module.LANG_POOL_FULL,
    module.LANG_FULL_POOL,
    module.FULL_LANG_POOL,
    module.LANG_POOL,
    module.LANGS,
    module.LANGUAGES,
    module.languages,
    module.default
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length) return candidate;

    if (candidate && typeof candidate === "object") {
      const values = Object.values(candidate);
      if (values.length && values.every((item) => item && typeof item === "object")) {
        return values;
      }
    }
  }

  return FALLBACK_TOP_LANG_POOL;
}

function itemName(item, code) {
  const lang = siteLang();
  const fallbackName = fallbackLangMeta(code)?.name || String(code || "").toUpperCase();

  const groups = [
    item?.names,
    item?.nameByLang,
    item?.labels,
    item?.labelByLang,
    item?.translations,
    item?.i18n
  ];

  for (const group of groups) {
    if (group && typeof group === "object") {
      const found =
        group[lang] ||
        group[lang.toUpperCase()] ||
        group.tr ||
        group.TR ||
        group.en ||
        group.EN;

      if (found && String(found).trim().toLowerCase() !== canon(code)) return String(found);
    }
  }

  const candidate = String(
    item?.[`name_${lang}`] ||
    item?.[`label_${lang}`] ||
    item?.[`${lang}_name`] ||
    item?.[`${lang}_label`] ||
    item?.tr_name ||
    item?.tr_label ||
    item?.en_name ||
    item?.en_label ||
    item?.name_tr ||
    item?.label_tr ||
    item?.tr ||
    item?.name ||
    item?.label ||
    item?.title ||
    ""
  ).trim();

  if (!candidate || candidate.toLowerCase() === canon(code)) return fallbackName;
  return candidate;
}

function normalizeLangItem(item) {
  const code = canon(item?.code || item?.value || item?.lang || item?.id || item?.key);
  if (!code) return null;

  return {
    code,
    name: itemName(item, code),
    flag: String(item?.flag || item?.emoji || item?.icon || fallbackLangMeta(code)?.flag || "🌐")
  };
}

function buildTopPool(poolItems) {
  const seen = new Set();
  const out = [];

  for (const item of poolItems || []) {
    const normalized = normalizeLangItem(item);
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

async function loadTopLangPool() {
  const module = await loadFullLangPoolModule();
  TOP_LANG_POOL = buildTopPool(extractPoolFromModule(module));

  if (!TOP_LANG_POOL.some((item) => item.code === state.topLang)) {
    state.topLang = "tr";
  }

  updateLangButtons();
  renderLangLists();
}

function langFromPool(pool, code) {
  return pool.find((x) => x.code === code) || pool[0];
}

function currentTopLang() {
  return langFromPool(TOP_LANG_POOL, state.topLang);
}

function currentBotLang() {
  return langFromPool(BALKAN_LANG_POOL, state.botLang);
}

function langForSide(side) {
  return side === "top" ? state.topLang : state.botLang;
}

function updateLangButtons() {
  const top = currentTopLang();
  const bot = currentBotLang();

  if (UI.topLangTxt) UI.topLangTxt.textContent = `${top.flag} ${top.name}`;
  if (UI.botLangTxt) UI.botLangTxt.textContent = `${bot.flag} ${bot.name}`;
}

function pointOrbTo(side) {
  document.body.classList.remove("to-top", "to-bot");
  document.body.classList.add(side === "top" ? "to-top" : "to-bot");
  UI.centerHub?.classList.toggle("to-top", side === "top");
}

function syncComposerButtons() {
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

    await speakWithFallback(getText(), getLang());
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

function selectLang(side, code) {
  const next = canon(code);
  if (!next) return;

  if (side === "top" && next === state.botLang) {
    toast("Aynı dili iki tarafta seçemezsiniz.");
    return;
  }

  if (side === "bot" && next === state.topLang) {
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

function renderLangList(listEl, pool, selectedCode, side) {
  if (!listEl) return;

  listEl.innerHTML = pool.map((item) => `
    <div class="pop-item ${item.code === selectedCode ? "active" : ""}" data-code="${item.code}">
      <div class="pop-left">
        <div class="pop-flag">${item.flag}</div>
        <div class="pop-name">${item.name}</div>
      </div>
      <div class="pop-code">${item.code}</div>
    </div>
  `).join("");

  listEl.querySelectorAll(".pop-item").forEach((el) => {
    el.addEventListener("click", () => selectLang(side, el.dataset.code));
  });
}

function renderLangLists() {
  renderLangList(UI.listTop, TOP_LANG_POOL, state.topLang, "top");
  renderLangList(UI.listBot, BALKAN_LANG_POOL, state.botLang, "bot");
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

function resolveSpeechLang(langCode) {
  const code = canon(langCode);
  return TTS_FALLBACK_LANG[code] || code || "tr";
}

function bcpForSpeak(langCode) {
  const code = canon(langCode);
  return BCP[code] || BCP[resolveSpeechLang(code)] || code || BCP.tr;
}

function chooseWebVoice(langCode) {
  const code = canon(langCode);
  const resolved = resolveSpeechLang(code);
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const wantedBcp = String(bcpForSpeak(code)).toLowerCase();

  return voices.find(v => String(v.lang || "").toLowerCase() === wantedBcp) ||
         voices.find(v => String(v.lang || "").toLowerCase().startsWith(resolved)) ||
         voices.find(v => String(v.lang || "").toLowerCase().startsWith("tr")) ||
         voices[0] ||
         null;
}

function speakWebOnce(text, langCode, timeoutMs = 700) {
  return new Promise((resolve) => {
    try {
      if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        resolve(false);
        return;
      }

      const value = normalizeText(text);
      if (!value) {
        resolve(false);
        return;
      }

      let settled = false;

      const utter = new SpeechSynthesisUtterance(value);
      utter.lang = String(bcpForSpeak(langCode));

      const voice = chooseWebVoice(langCode);
      if (voice) utter.voice = voice;

      utter.rate = 0.95;
      utter.pitch = 1;

      const finish = (ok) => {
        if (settled) return;
        settled = true;
        resolve(!!ok);
      };

      utter.onstart = () => finish(true);
      utter.onerror = () => finish(false);

      try { window.speechSynthesis.cancel(); } catch {}

      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utter);
        } catch {
          finish(false);
        }
      }, 120);

      setTimeout(() => finish(false), timeoutMs);
    } catch {
      resolve(false);
    }
  });
}

async function speakText(text, langCode) {
  if (!isAutoReadEnabled()) return false;

  const value = normalizeText(text);
  if (!value || value === "...") return false;

  stopAudio();
  await wait(80);

  try {
    const speakCode = resolveSpeechLang(langCode);

    if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
      window.NativeTTS.speak(value, String(speakCode || "tr"));
      return true;
    }
  } catch {}

  return await speakWebOnce(value, langCode, 700);
}

function fallbackSpeakLang() {
  return "tr";
}

function makeTtsReadable(text, langCode) {
  const code = canon(langCode);
  const value = String(text || "");

  if (["bg", "mk", "sr"].includes(code)) return latinizeCyrillic(value);
  if (code === "el") return latinizeGreek(value);

  return value;
}

function latinizeCyrillic(text) {
  const map = {
    "А":"A","а":"a","Б":"B","б":"b","В":"V","в":"v","Г":"G","г":"g","Д":"D","д":"d",
    "Е":"E","е":"e","Ё":"Yo","ё":"yo","Ж":"Zh","ж":"zh","З":"Z","з":"z","И":"I","и":"i",
    "Ј":"J","ј":"j","Й":"Y","й":"y","К":"K","к":"k","Л":"L","л":"l","Љ":"Lj","љ":"lj",
    "М":"M","м":"m","Н":"N","н":"n","Њ":"Nj","њ":"nj","О":"O","о":"o","П":"P","п":"p",
    "Р":"R","р":"r","С":"S","с":"s","Т":"T","т":"t","Ќ":"Kj","ќ":"kj","У":"U","у":"u",
    "Ф":"F","ф":"f","Х":"H","х":"h","Ц":"Ts","ц":"ts","Ч":"Ch","ч":"ch","Џ":"Dzh","џ":"dzh",
    "Ш":"Sh","ш":"sh","Щ":"Sht","щ":"sht","Ъ":"A","ъ":"a","Ы":"I","ы":"i","Ь":"","ь":"",
    "Э":"E","э":"e","Ю":"Yu","ю":"yu","Я":"Ya","я":"ya"
  };

  return String(text || "")
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

function latinizeGreek(text) {
  const map = {
    "Α":"A","α":"a","Β":"V","β":"v","Γ":"G","γ":"g","Δ":"D","δ":"d","Ε":"E","ε":"e",
    "Ζ":"Z","ζ":"z","Η":"I","η":"i","Θ":"Th","θ":"th","Ι":"I","ι":"i","Κ":"K","κ":"k",
    "Λ":"L","λ":"l","Μ":"M","μ":"m","Ν":"N","ν":"n","Ξ":"X","ξ":"x","Ο":"O","ο":"o",
    "Π":"P","π":"p","Ρ":"R","ρ":"r","Σ":"S","σ":"s","ς":"s","Τ":"T","τ":"t","Υ":"Y","υ":"y",
    "Φ":"F","φ":"f","Χ":"H","χ":"h","Ψ":"Ps","ψ":"ps","Ω":"O","ω":"o",
    "Ά":"A","ά":"a","Έ":"E","έ":"e","Ή":"I","ή":"i","Ί":"I","ί":"i","Ό":"O","ό":"o",
    "Ύ":"Y","ύ":"y","Ώ":"O","ώ":"o","Ϊ":"I","ϊ":"i","Ϋ":"Y","ϋ":"y"
  };

  return String(text || "")
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

async function speakWithFallback(visibleText, langCode) {
  if (!isAutoReadEnabled()) return;

  const value = normalizeText(visibleText);
  if (!value || value === "...") return;

  const readable = normalizeText(makeTtsReadable(value, langCode));

  if (readable && readable !== value) {
    stopAudio();
    await wait(120);
    await speakText(readable, fallbackSpeakLang(langCode));
    return;
  }

  await speakText(value, langCode);
}

async function getAccessToken() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || "";
  } catch {
    return "";
  }
}

async function translateGoogle(text, from, to) {
  const token = await getAccessToken();

  const r = await fetch(apiUrl("translate"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      text,
      from_lang: from,
      to_lang: to,
      mode: "normal",
      use_ai: false,
      google_only: true
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

function removeLoadingBubble(side) {
  if (side === "top" && state.loadingTopRow) {
    state.loadingTopRow.remove();
    state.loadingTopRow = null;
  }

  if (side === "bot" && state.loadingBotRow) {
    state.loadingBotRow.remove();
    state.loadingBotRow = null;
  }
}

function showLoadingBubble(side) {
  removeLoadingBubble(side);

  const row = addBubble(side, "me", "Çevriliyor...", { latest: true });

  if (side === "top") state.loadingTopRow = row;
  else state.loadingBotRow = row;
}

async function runTranslateText(fromSide, text) {
  const sourceSide = fromSide;
  const targetSide = fromSide === "top" ? "bot" : "top";
  const cleanText = normalizeText(text);

  if (!cleanText) return;

  document.body.classList.remove("is-ready", "is-error");
  document.body.classList.add("is-translating");

  pointOrbTo(fromSide);

  clearLatest(sourceSide);
  clearLatest(targetSide);

  addBubble(sourceSide, "me", cleanText, { latest: true });
  showLoadingBubble(targetSide);

  try {
    const fromLang = langForSide(sourceSide);
    const toLang = langForSide(targetSide);

    const translated = await translateGoogle(cleanText, fromLang, toLang);
    const speakLang = toLang;

    removeLoadingBubble(targetSide);

    addBubble(targetSide, "me", translated, {
      latest: true,
      speaker: true,
      speakText: translated,
      speakLang
    });

    await speakWithFallback(translated, speakLang);

    document.body.classList.remove("is-translating", "is-error");
    document.body.classList.add("is-ready");
  } catch (e) {
    removeLoadingBubble(targetSide);

    addBubble(targetSide, "me", "⚠️ Çeviri şu an yapılamadı.", {
      latest: true
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

  const langCode = langForSide(side);
  const listenCode = resolveSpeechLang(langCode);

  const recog = new SR();

  recog.lang = String(BCP[listenCode] || BCP[langCode] || listenCode || BCP.tr);
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
    const stableText = extractStableRecognitionText(e.results);

    if (side === "top") state.topLastSpeech = stableText;
    else state.botLastSpeech = stableText;
  };

  recog.onerror = () => {
    stopRecognition(side);
    toast("Mikrofon hatası");
  };

  recog.onend = async () => {
    const finalText = normalizeText(side === "top" ? state.topLastSpeech : state.botLastSpeech);

    stopRecognition(side);

    if (finalText) {
      await runTranslateText(side, finalText);
    }
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

function prepareInputs() {
  [UI.topInput, UI.botInput].forEach((input) => {
    if (!input) return;

    input.value = "";
    input.readOnly = true;
    input.disabled = true;

    input.setAttribute("inputmode", "none");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("spellcheck", "false");
    input.setAttribute("aria-hidden", "true");
    input.setAttribute("tabindex", "-1");
  });

  UI.topKeyboardWrap?.classList.remove("show");
  UI.botKeyboardWrap?.classList.remove("show");

  UI.topKeyboardWrap?.setAttribute("aria-hidden", "true");
  UI.botKeyboardWrap?.setAttribute("aria-hidden", "true");

  UI.topSend?.classList.add("hidden");
  UI.botSend?.classList.add("hidden");
}


function isIOSDevice() {
  const ua = navigator.userAgent || navigator.vendor || "";
  const platform = navigator.platform || "";
  const iPadOS = platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/i.test(ua) || iPadOS;
}

function getDefaultBackTarget() {
  return isIOSDevice() ? "facetoface_ios.html" : "facetoface.html";
}

function getSafeBackTarget() {
  const fallback = getDefaultBackTarget();

  try {
    const ref = document.referrer ? new URL(document.referrer, location.href) : null;
    if (ref && ref.origin === location.origin && ref.pathname !== location.pathname) {
      return `${ref.pathname}${ref.search || ""}${ref.hash || ""}`;
    }
  } catch {}

  return fallback;
}

function goBackToPreviousPage(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  location.href = getSafeBackTarget();
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
  UI.popTop?.addEventListener("click", (e) => {
    if (e.target === UI.popTop) UI.popTop.classList.remove("show");
  });

  UI.closeBot?.addEventListener("click", () => UI.popBot?.classList.remove("show"));
  UI.popBot?.addEventListener("click", (e) => {
    if (e.target === UI.popBot) UI.popBot.classList.remove("show");
  });

  UI.topMic?.addEventListener("click", () => startRecognition("top"));
  UI.botMic?.addEventListener("click", () => startRecognition("bot"));

  UI.topSend?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  UI.botSend?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  UI.homeLink?.addEventListener("click", goBackToPreviousPage);
  UI.homeBtn?.addEventListener("click", goBackToPreviousPage);

  const clearConversation = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (UI.topInput) UI.topInput.value = "";
    if (UI.botInput) UI.botInput.value = "";

    stopAudio();

    stopRecognition("top");
    stopRecognition("bot");

    clearBubbles();

    UI.topKeyboardWrap?.classList.remove("show");
    UI.botKeyboardWrap?.classList.remove("show");

    syncComposerButtons();

    document.body.classList.remove("is-translating", "is-error", "is-listening");
    document.body.classList.add("is-ready");

    pointOrbTo("bot");
  };

  const captureClearTap = (event) => {
    const target = event.target?.closest?.("#clearBtn,.btn-clear");
    if (!target) return;
    clearConversation(event);
  };

  UI.clearBtn?.addEventListener("pointerdown", clearConversation, { passive: false });
  UI.clearBtn?.addEventListener("touchend", clearConversation, { passive: false });
  UI.clearBtn?.addEventListener("click", clearConversation);
  document.addEventListener("pointerdown", captureClearTap, { capture: true, passive: false });
  document.addEventListener("touchend", captureClearTap, { capture: true, passive: false });

  UI.genericCloseBtn?.addEventListener("click", closeModal);
  UI.genericBackdrop?.addEventListener("click", (e) => {
    if (e.target === UI.genericBackdrop) closeModal();
  });

  document.addEventListener("click", (e) => {
    const insidePop =
      (UI.popTop && UI.popTop.contains(e.target)) ||
      (UI.popBot && UI.popBot.contains(e.target));

    const isLangBtn = e.target?.closest?.("#topLangBtn,#botLangBtn");

    if (!insidePop && !isLangBtn) {
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

  prepareInputs();

  updateLangButtons();
  renderLangLists();

  await loadTopLangPool();

  bindEvents();
  syncComposerButtons();

  document.body.classList.add("is-ready");

  pointOrbTo("bot");
});
