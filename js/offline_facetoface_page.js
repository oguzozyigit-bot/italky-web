// FILE: /js/offline_facetoface_page.js

const $ = (id) => document.getElementById(id);

const OFFLINE_PACK_KEYS = [
  "italky_offline_installed_packs_v6",
  "italky_offline_installed_packs_v5"
];
const OFFLINE_PAIRS_V7_KEY = "italky_offline_installed_pairs_v7";

const frameRoot = $("frameRoot");
const topLangBtn = $("topLangBtn");
const botLangBtn = $("botLangBtn");
const topLangTxt = $("topLangTxt");
const botLangTxt = $("botLangTxt");
const topBody = $("topBody");
const botBody = $("botBody");
const topMic = $("topMic");
const botMic = $("botMic");
const topHelper = $("topHelper");
const botHelper = $("botHelper");
const topBack = $("topBack");
const clearChat = $("clearChat");
const homeBtn = $("homeBtn");
const offlinePill = $("offlinePill");

let currentAudio = null;
let topRec = null;
let botRec = null;
let topListening = false;
let botListening = false;
let topText = "";
let botText = "";

let topLang = "en";
let botLang = "tr";

const BCP = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
  ru: "ru-RU",
  el: "el-GR",
  az: "az-AZ",
  ka: "ka-GE",
  ar: "ar-SA",
  fa: "fa-IR",
  hy: "hy-AM",
  kmr: "tr-TR",
  ckb: "tr-TR",
  zza: "tr-TR",
  lzz: "tr-TR",
  ady: "tr-TR",
  ab: "tr-TR",
  bg: "bg-BG",
  bn: "bn-BD",
  ca: "ca-ES",
  cs: "cs-CZ",
  da: "da-DK",
  et: "et-EE",
  eu: "eu-ES",
  fi: "fi-FI",
  gl: "gl-ES",
  hu: "hu-HU",
  id: "id-ID",
  lt: "lt-LT",
  lv: "lv-LV",
  ms: "ms-MY",
  nl: "nl-NL",
  pl: "pl-PL",
  ro: "ro-RO",
  sk: "sk-SK",
  sl: "sl-SI",
  sq: "sq-AL",
  th: "th-TH",
  ur: "ur-PK",
  vi: "vi-VN",
  zh: "zh-CN"
};

const LANG_META = {
  tr: { flag: "🇹🇷", name: "Türkçe" },
  en: { flag: "🇬🇧", name: "İngilizce" },
  de: { flag: "🇩🇪", name: "Almanca" },
  fr: { flag: "🇫🇷", name: "Fransızca" },
  it: { flag: "🇮🇹", name: "İtalyanca" },
  es: { flag: "🇪🇸", name: "İspanyolca" },
  ru: { flag: "🇷🇺", name: "Rusça" },
  el: { flag: "🇬🇷", name: "Yunanca" },
  az: { flag: "🇦🇿", name: "Azerbaycanca" },
  ka: { flag: "🇬🇪", name: "Gürcüce" },
  ar: { flag: "🇸🇦", name: "Arapça" },
  fa: { flag: "🇮🇷", name: "Farsça" },
  hy: { flag: "🇦🇲", name: "Ermenice" },
  kmr: { flag: "🟨", name: "Kürtçe (Kurmançça)" },
  ckb: { flag: "🟧", name: "Kürtçe (Sorani)" },
  zza: { flag: "🟫", name: "Zazaca" },
  lzz: { flag: "🌊", name: "Lazca" },
  ady: { flag: "🟩", name: "Çerkezce" },
  ab: { flag: "⬛", name: "Abhazca" },
  bg: { flag: "🇧🇬", name: "Bulgarca" },
  bn: { flag: "🇧🇩", name: "Bengalce" },
  ca: { flag: "🇪🇸", name: "Katalanca" },
  cs: { flag: "🇨🇿", name: "Çekçe" },
  da: { flag: "🇩🇰", name: "Danca" },
  et: { flag: "🇪🇪", name: "Estonca" },
  eu: { flag: "🇪🇸", name: "Baskça" },
  fi: { flag: "🇫🇮", name: "Fince" },
  gl: { flag: "🇪🇸", name: "Galiçyaca" },
  hu: { flag: "🇭🇺", name: "Macarca" },
  id: { flag: "🇮🇩", name: "Endonezce" },
  lt: { flag: "🇱🇹", name: "Litvanca" },
  lv: { flag: "🇱🇻", name: "Letonca" },
  ms: { flag: "🇲🇾", name: "Malayca" },
  nl: { flag: "🇳🇱", name: "Hollandaca" },
  pl: { flag: "🇵🇱", name: "Lehçe" },
  ro: { flag: "🇷🇴", name: "Romence" },
  sk: { flag: "🇸🇰", name: "Slovakça" },
  sl: { flag: "🇸🇮", name: "Slovence" },
  sq: { flag: "🇦🇱", name: "Arnavutça" },
  th: { flag: "🇹🇭", name: "Tayca" },
  ur: { flag: "🇵🇰", name: "Urduca" },
  vi: { flag: "🇻🇳", name: "Vietnamca" },
  zh: { flag: "🇨🇳", name: "Çince" }
};

function canonical(code) {
  return String(code || "").trim().toLowerCase();
}

function langMeta(code) {
  const c = canonical(code);
  return LANG_META[c] || {
    flag: "🌐",
    name: c.toUpperCase()
  };
}

function normalizeText(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function setHelpers(topTextValue = "", botTextValue = "") {
  if (topHelper) topHelper.textContent = topTextValue;
  if (botHelper) botHelper.textContent = botTextValue;
}

function setState(state) {
  if (!frameRoot) return;
  frameRoot.classList.remove("is-listening", "is-translating", "is-ready", "is-error");
  if (state) frameRoot.classList.add(`is-${state}`);
}

function pointOrbTo(side) {
  if (!frameRoot) return;
  frameRoot.classList.remove("to-top", "to-bot");
  frameRoot.classList.add(side === "top" ? "to-top" : "to-bot");
}

function showToast(message = "") {
  let toast = document.getElementById("offlineToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "offlineToast";
    toast.style.cssText = `
      position:fixed;
      left:50%;
      bottom:calc(24px + env(safe-area-inset-bottom, 0px));
      transform:translateX(-50%) translateY(120px);
      min-height:44px;
      padding:10px 16px;
      border-radius:16px;
      background:rgba(12,16,28,.96);
      border:1px solid rgba(255,255,255,.10);
      color:#fff;
      font-size:12px;
      font-weight:1000;
      display:flex;
      align-items:center;
      justify-content:center;
      text-align:center;
      max-width:min(92vw,420px);
      z-index:99999;
      box-shadow:0 18px 36px rgba(0,0,0,.35);
      transition:.22s ease;
      backdrop-filter:blur(14px);
    `;
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.style.transform = "translateX(-50%) translateY(0)";
  clearTimeout(window.__offlineToastTimer);
  window.__offlineToastTimer = setTimeout(() => {
    toast.style.transform = "translateX(-50%) translateY(120px)";
  }, 1800);
}

function stopAudio() {
  try {
    currentAudio?.pause?.();
    if (currentAudio) currentAudio.currentTime = 0;
  } catch {}
  currentAudio = null;

  try {
    window.speechSynthesis?.cancel?.();
  } catch {}

  try {
    window.NativeTTS?.stop?.();
  } catch {}
}

function renderBubble(container, text, latest = true, withSpeaker = false, langCode = "tr") {
  if (!container) return;

  if (latest) container.innerHTML = "";

  const bubble = document.createElement("div");
  bubble.className = `bubble me${latest ? " is-latest" : ""}`;

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = text;
  bubble.appendChild(txt);

  if (withSpeaker) {
    const spk = document.createElement("button");
    spk.className = "spk";
    spk.type = "button";
    spk.setAttribute("aria-label", "Seslendir");
    spk.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 10v4h4l5 4V6L7 10H3"></path>
        <path d="M16 8a4 4 0 0 1 0 8"></path>
        <path d="M19 5a8 8 0 0 1 0 14"></path>
      </svg>
    `;
    spk.addEventListener("click", () => speakText(text, langCode));
    bubble.appendChild(spk);
  }

  container.appendChild(bubble);
}

function normalizePack(entry) {
  if (!entry || typeof entry !== "object") return null;

  const langPack = String(entry.lang_pack || "").trim();
  const lang = String(entry.lang || "").trim().toLowerCase();
  const expiresAt = entry.expires_at || null;

  if (!langPack || !lang) return null;

  return {
    lang_pack: langPack,
    free_pack: entry.free_pack === true,
    token_spent: Number(entry.token_spent || 0),
    starts_at: entry.starts_at || null,
    expires_at: expiresAt,
    lang
  };
}

function getInstalledPacks() {
  const merged = [];

  for (const key of OFFLINE_PACK_KEYS) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      if (Array.isArray(parsed)) merged.push(...parsed);
    } catch {}
  }

  // Also read from v7 pairs format used by offline_languages_page
  try {
    const pairs = JSON.parse(localStorage.getItem(OFFLINE_PAIRS_V7_KEY) || "{}");
    const langs = new Set();
    for (const pair of Object.values(pairs)) {
      if (pair?.from) langs.add(String(pair.from).toLowerCase().split("-")[0]);
      if (pair?.to) langs.add(String(pair.to).toLowerCase().split("-")[0]);
    }
    for (const lang of langs) {
      const anyPair = Object.values(pairs).find(
        (p) => p?.from === lang || p?.to === lang
      );
      merged.push({
        lang_pack: `${lang}-offline`,
        lang,
        free_pack: true,
        token_spent: 0,
        starts_at: anyPair?.installedAt || new Date().toISOString(),
        expires_at: anyPair?.expiresAt || "2099-12-31T23:59:59.000Z"
      });
    }
  } catch {}

  const map = new Map();
  for (const raw of merged) {
    const pack = normalizePack(raw);
    if (!pack) continue;
    map.set(pack.lang_pack, pack);
  }

  return [...map.values()];
}

function isPackActive(pack) {
  if (!pack?.expires_at) return false;
  return new Date(pack.expires_at).getTime() > Date.now();
}

function getInstalledLanguages() {
  const packs = getInstalledPacks().filter(isPackActive);
  const codes = new Set();

  for (const p of packs) {
    const code = canonical(p.lang);
    if (code) codes.add(code);
  }

  codes.add("tr");
  codes.add("en");

  return [...codes];
}

function updateLangLabels() {
  const top = langMeta(topLang);
  const bot = langMeta(botLang);

  if (topLangTxt) topLangTxt.textContent = `${top.flag} ${top.name}`;
  if (botLangTxt) botLangTxt.textContent = `${bot.flag} ${bot.name}`;
}

function createLangSheet(title, codes, selectedCode, onPick) {
  const backdrop = document.createElement("div");
  backdrop.style.cssText = `
    position:fixed;
    inset:0;
    background:rgba(0,0,0,.58);
    backdrop-filter:blur(8px);
    z-index:999999;
    display:flex;
    align-items:flex-end;
    justify-content:center;
    padding:14px;
  `;

  const card = document.createElement("div");
  card.style.cssText = `
    width:min(100%,420px);
    max-height:72vh;
    overflow:hidden;
    border-radius:24px;
    border:1px solid rgba(255,255,255,.10);
    background:linear-gradient(180deg, rgba(18,22,36,.98), rgba(10,12,24,.98));
    box-shadow:0 24px 60px rgba(0,0,0,.45);
    display:flex;
    flex-direction:column;
  `;

  const head = document.createElement("div");
  head.style.cssText = `
    padding:14px 14px 10px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    border-bottom:1px solid rgba(255,255,255,.08);
    font-weight:1000;
    font-size:14px;
  `;
  head.innerHTML = `<div>${title}</div>`;

  const close = document.createElement("button");
  close.type = "button";
  close.textContent = "Kapat";
  close.style.cssText = `
    min-height:38px;
    padding:0 12px;
    border-radius:12px;
    border:1px solid rgba(255,255,255,.10);
    background:rgba(255,255,255,.06);
    color:#fff;
    font-weight:1000;
    cursor:pointer;
  `;
  head.appendChild(close);

  const list = document.createElement("div");
  list.style.cssText = `
    overflow:auto;
    padding:10px;
    display:grid;
    gap:8px;
  `;

  codes.forEach((code) => {
    const meta = langMeta(code);
    const item = document.createElement("button");
    item.type = "button";
    item.style.cssText = `
      min-height:52px;
      border-radius:16px;
      border:1px solid ${canonical(code) === canonical(selectedCode) ? "rgba(99,102,241,.30)" : "rgba(255,255,255,.08)"};
      background:${canonical(code) === canonical(selectedCode) ? "rgba(99,102,241,.14)" : "rgba(255,255,255,.04)"};
      color:#fff;
      font-weight:1000;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      padding:0 14px;
      cursor:pointer;
    `;
    item.innerHTML = `
      <span>${meta.flag} ${meta.name}</span>
      <span style="opacity:.7">${code.toUpperCase()}</span>
    `;
    item.addEventListener("click", () => {
      onPick(code);
      backdrop.remove();
    });
    list.appendChild(item);
  });

  close.addEventListener("click", () => backdrop.remove());
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) backdrop.remove();
  });

  card.appendChild(head);
  card.appendChild(list);
  backdrop.appendChild(card);
  document.body.appendChild(backdrop);
}

function openTopLangPicker() {
  const codes = getInstalledLanguages().filter((c) => c !== botLang);
  createLangSheet("HEDEF DİL", codes, topLang, (code) => {
    topLang = code;
    updateLangLabels();
  });
}

function openBotLangPicker() {
  const codes = getInstalledLanguages().filter((c) => c !== topLang);
  createLangSheet("İNDİRİLEN DİLLER", codes, botLang, (code) => {
    botLang = code;
    updateLangLabels();
  });
}

function createRecognizer(langCode) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = BCP[canonical(langCode)] || "tr-TR";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  return rec;
}

async function speakText(text, langCode) {
  const clean = String(text || "").trim();
  if (!clean) return;

  stopAudio();

  try {
    if (window.NativeTTS?.speak) {
      window.NativeTTS.speak(clean, canonical(langCode));
      return;
    }
  } catch {}

  try {
    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = BCP[canonical(langCode)] || "tr-TR";
    utter.rate = 0.95;
    utter.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch {}
}

async function runNativeOfflineTranslate(text, fromLang, toLang) {
  const clean = normalizeText(text);
  if (!clean) return "";

  try {
    if (window.AndroidOfflineTranslate?.translate) {
      const result = await window.AndroidOfflineTranslate.translate(
        JSON.stringify({
          text: clean,
          from: canonical(fromLang),
          to: canonical(toLang)
        })
      );
      if (result) return String(result).trim();
    }
  } catch {}

  try {
    if (window.OfflineBridge?.translate) {
      const result = await window.OfflineBridge.translate(
        clean,
        canonical(fromLang),
        canonical(toLang)
      );
      if (result) return String(result).trim();
    }
  } catch {}

  try {
    if (window.NativeOfflineTranslate?.translate) {
      const result = await window.NativeOfflineTranslate.translate(
        clean,
        canonical(fromLang),
        canonical(toLang)
      );
      if (result) return String(result).trim();
    }
  } catch {}

  return "";
}

function fallbackOfflineTranslate(text, fromLang, toLang) {
  const clean = normalizeText(text);
  if (!clean) return "";

  if (fromLang === toLang) return clean;

  const lexicon = {
    "selam": { tr: "selam", en: "hello", de: "hallo", fr: "bonjour", es: "hola", it: "ciao" },
    "merhaba": { tr: "merhaba", en: "hello", de: "hallo", fr: "bonjour", es: "hola", it: "ciao" },
    "nasılsın": { tr: "nasılsın", en: "how are you", de: "wie geht's", fr: "comment ça va", es: "cómo estás", it: "come stai" },
    "teşekkür ederim": { tr: "teşekkür ederim", en: "thank you", de: "danke", fr: "merci", es: "gracias", it: "grazie" }
  };

  const key = clean.toLowerCase();
  if (lexicon[key]?.[canonical(toLang)]) return lexicon[key][canonical(toLang)];

  return clean;
}

async function translateOffline(text, fromLang, toLang) {
  const nativeResult = await runNativeOfflineTranslate(text, fromLang, toLang);
  if (nativeResult) return nativeResult;
  return fallbackOfflineTranslate(text, fromLang, toLang);
}

function toggleMicVisual(el, on) {
  if (!el) return;
  el.classList.toggle("listening", !!on);
}

function setTopListening(on) {
  topListening = on;
  toggleMicVisual(topMic, on);
  pointOrbTo("top");
  setState(on ? "listening" : "ready");
}

function setBotListening(on) {
  botListening = on;
  toggleMicVisual(botMic, on);
  pointOrbTo("bot");
  setState(on ? "listening" : "ready");
}

function startTopRecognition() {
  if (topListening) {
    try { topRec?.stop?.(); } catch {}
    return;
  }

  const rec = createRecognizer(topLang);
  if (!rec) {
    showToast("Bu cihazda ses tanıma desteklenmiyor");
    return;
  }

  topRec = rec;
  let live = "";

  rec.onstart = () => {
    setTopListening(true);
    setHelpers("Konuşmayı bitirince bekleyin...", botHelper?.textContent || "");
  };

  rec.onresult = (e) => {
    let finalText = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const txt = e.results[i][0]?.transcript || "";
      if (e.results[i].isFinal) finalText += txt + " ";
    }

    if (finalText.trim()) {
      live = normalizeText(finalText);
      renderBubble(topBody, live, true, true, topLang);
    }
  };

  rec.onerror = () => {
    setTopListening(false);
    setHelpers("Mikrofon başlatılamadı", botHelper?.textContent || "");
  };

  rec.onend = async () => {
    setTopListening(false);

    const finalText = normalizeText(live);
    if (!finalText) {
      setHelpers("Konuşmak için mikrofona dokununuz.", botHelper?.textContent || "");
      return;
    }

    const translated = await translateOffline(finalText, topLang, botLang);
    renderBubble(botBody, translated, true, true, botLang);
    speakText(translated, botLang);
    setHelpers("Konuşmak için mikrofona dokununuz.", "Offline çeviri hazır");
  };

  try {
    rec.start();
  } catch {
    setTopListening(false);
  }
}

function startBotRecognition() {
  if (botListening) {
    try { botRec?.stop?.(); } catch {}
    return;
  }

  const rec = createRecognizer(botLang);
  if (!rec) {
    showToast("Bu cihazda ses tanıma desteklenmiyor");
    return;
  }

  botRec = rec;
  let live = "";

  rec.onstart = () => {
    setBotListening(true);
    setHelpers(topHelper?.textContent || "", "Konuşmayı bitirince bekleyin...");
  };

  rec.onresult = (e) => {
    let finalText = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const txt = e.results[i][0]?.transcript || "";
      if (e.results[i].isFinal) finalText += txt + " ";
    }

    if (finalText.trim()) {
      live = normalizeText(finalText);
      renderBubble(botBody, live, true, true, botLang);
    }
  };

  rec.onerror = () => {
    setBotListening(false);
    setHelpers(topHelper?.textContent || "", "Mikrofon başlatılamadı");
  };

  rec.onend = async () => {
    setBotListening(false);

    const finalText = normalizeText(live);
    if (!finalText) {
      setHelpers(topHelper?.textContent || "", "Konuşmak için mikrofona dokununuz.");
      return;
    }

    const translated = await translateOffline(finalText, botLang, topLang);
    renderBubble(topBody, translated, true, true, topLang);
    speakText(translated, topLang);
    setHelpers("Offline çeviri hazır", "Konuşmak için mikrofona dokununuz.");
  };

  try {
    rec.start();
  } catch {
    setBotListening(false);
  }
}

function bind() {
  topLangBtn?.addEventListener("click", openTopLangPicker);
  botLangBtn?.addEventListener("click", openBotLangPicker);

  topMic?.addEventListener("click", startTopRecognition);
  botMic?.addEventListener("click", startBotRecognition);

  clearChat?.addEventListener("click", () => {
    stopAudio();
    topBody.innerHTML = "";
    botBody.innerHTML = "";
    topRec = null;
    botRec = null;
    setTopListening(false);
    setBotListening(false);
    topText = "";
    botText = "";
    setHelpers("Konuşmak için mikrofona dokununuz.", "Konuşmak için mikrofona dokununuz.");
  });

  topBack?.addEventListener("click", () => {
    if (navigator.onLine) {
      location.href = "/pages/home.html";
    } else {
      showToast("Offline modda sadece FaceToFace kullanılabilir");
    }
  });

  homeBtn?.addEventListener("click", () => {
    if (navigator.onLine) {
      location.href = "/pages/home.html";
    } else {
      showToast("Offline modda sadece FaceToFace kullanılabilir");
    }
  });
}

function chooseInitialLangs() {
  const installed = getInstalledLanguages();

  botLang = installed.includes("tr") ? "tr" : (installed[0] || "tr");
  topLang = installed.includes("en")
    ? "en"
    : (installed.find((x) => x !== botLang) || "en");

  if (topLang === botLang) {
    topLang = installed.find((x) => x !== botLang) || "en";
  }
}

function init() {
  if (offlinePill) {
    offlinePill.textContent = navigator.onLine ? "Offline Çeviri (Manuel)" : "Offline Çeviri";
  }

  chooseInitialLangs();
  updateLangLabels();
  setState("ready");
  pointOrbTo("bot");
  setHelpers("Konuşmak için mikrofona dokununuz.", "Konuşmak için mikrofona dokununuz.");
  bind();
}

init();
