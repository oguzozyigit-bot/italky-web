// FILE: /js/facetoface_offline.js

const $ = (id) => document.getElementById(id);

const OFFLINE_PACK_KEY = "italky_offline_installed_packs_v5";
const F2F_RUNTIME_KEY = "facetoface_runtime_mode";

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
const homeLink = $("homeLink");
const homeBtn = $("homeBtn");
const clearBtn = $("clearBtn");
const settingsBtn = $("settingsBtn");
const modeFlag = $("modeFlag");
const modeFlagTxt = $("modeFlagTxt");
const miniToast = $("miniToast");

let currentAudio = null;
let topRec = null;
let botRec = null;
let topListening = false;
let botListening = false;
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
  ab: "tr-TR"
};

const LANG_META = {
  tr:  { flag: "🇹🇷", name: "Türkçe" },
  en:  { flag: "🇬🇧", name: "İngilizce" },
  de:  { flag: "🇩🇪", name: "Almanca" },
  fr:  { flag: "🇫🇷", name: "Fransızca" },
  it:  { flag: "🇮🇹", name: "İtalyanca" },
  es:  { flag: "🇪🇸", name: "İspanyolca" },
  ru:  { flag: "🇷🇺", name: "Rusça" },
  el:  { flag: "🇬🇷", name: "Yunanca" },
  az:  { flag: "🇦🇿", name: "Azerbaycanca" },
  ka:  { flag: "🇬🇪", name: "Gürcüce" },
  ar:  { flag: "🇸🇦", name: "Arapça" },
  fa:  { flag: "🇮🇷", name: "Farsça" },
  hy:  { flag: "🇦🇲", name: "Ermenice" },
  kmr: { flag: "🟨", name: "Kürtçe (Kurmançça)" },
  ckb: { flag: "🟧", name: "Kürtçe (Sorani)" },
  zza: { flag: "🟫", name: "Zazaca" },
  lzz: { flag: "🌊", name: "Lazca" },
  ady: { flag: "🟩", name: "Çerkezce" },
  ab:  { flag: "⬛", name: "Abhazca" }
};

function canonical(code) {
  return String(code || "").trim().toLowerCase().split("-")[0];
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

function showToast(message = "") {
  if (!miniToast) return;
  miniToast.textContent = String(message || "");
  miniToast.classList.add("show");
  clearTimeout(window.__offlineToastTimer);
  window.__offlineToastTimer = setTimeout(() => {
    miniToast.classList.remove("show");
  }, 1800);
}

function setRuntimeOffline() {
  try {
    localStorage.setItem(F2F_RUNTIME_KEY, "offline");
  } catch {}
}

function updateModeFlag() {
  if (!modeFlag || !modeFlagTxt) return;
  modeFlag.classList.add("offline");
  modeFlagTxt.textContent = "OFFLINE";
}

function setHelpers(topText = "", botText = "") {
  if (topHelper) topHelper.textContent = topText;
  if (botHelper) botHelper.textContent = botText;
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

function stopAudio() {
  try {
    currentAudio?.pause?.();
    if (currentAudio) currentAudio.currentTime = 0;
  } catch {}
  currentAudio = null;

  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}
}

function renderBubble(container, text, latest = true, withSpeaker = false, langCode = "tr") {
  if (!container) return;

  if (latest) container.innerHTML = "";

  const bubble = document.createElement("div");
  bubble.className = `bubble me${latest ? " is-latest" : ""}`;

  const row = document.createElement("div");
  row.className = "bubble-row";

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = text;
  row.appendChild(txt);

  if (withSpeaker) {
    const spk = document.createElement("button");
    spk.className = "spk-icon";
    spk.type = "button";
    spk.setAttribute("aria-label", "Seslendir");
    spk.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M3 10v4h4l5 4V6L7 10H3"></path>
        <path d="M16 8a4 4 0 0 1 0 8"></path>
        <path d="M19 5a8 8 0 0 1 0 14"></path>
      </svg>
    `;
    spk.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      speakText(text, langCode);
    });
    row.appendChild(spk);
  }

  bubble.appendChild(row);
  container.appendChild(bubble);

  try {
    container.scrollTop = container.scrollHeight;
  } catch {}
}

function getInstalledPacks() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OFFLINE_PACK_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isPackActive(pack) {
  if (!pack?.expires_at) return false;
  return new Date(pack.expires_at).getTime() > Date.now();
}

function getInstalledLanguages() {
  const packs = getInstalledPacks().filter(isPackActive);
  const codes = new Set(["tr", "en"]);

  for (const p of packs) {
    const code = canonical(p.lang);
    if (code) codes.add(code);
  }

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
  const clean = normalizeText(text);
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

  clearBtn?.addEventListener("click", () => {
    stopAudio();
    topBody.innerHTML = "";
    botBody.innerHTML = "";
    topRec = null;
    botRec = null;
    setTopListening(false);
    setBotListening(false);
    setHelpers("Konuşmak için mikrofona dokununuz.", "Konuşmak için mikrofona dokununuz.");
  });

  homeLink?.addEventListener("click", (e) => {
    e.preventDefault();
    showToast("Offline modda sadece FaceToFace kullanılabilir");
  });

  homeBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    showToast("Offline modda sadece FaceToFace kullanılabilir");
  });

  settingsBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    showToast("Offline modda ayarlar sınırlı çalışır");
  });

  modeFlag?.addEventListener("click", (e) => {
    e.preventDefault();
    showToast("Online moda geçiliyor...");
    setTimeout(() => {
      location.href = "/pages/facetoface.html?mode=online";
    }, 180);
  });
}

function init() {
  setRuntimeOffline();
  updateModeFlag();

  const installed = getInstalledLanguages();

  if (!installed.includes("tr")) botLang = installed[0] || "tr";
  if (!installed.includes("en")) {
    topLang = installed.find((x) => x !== botLang) || "en";
  }

  updateLangLabels();
  setState("ready");
  pointOrbTo("bot");
  setHelpers("Konuşmak için mikrofona dokununuz.", "Konuşmak için mikrofona dokununuz.");
  bind();
}

init();
