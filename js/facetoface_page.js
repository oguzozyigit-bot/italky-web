import { LANG_POOL } from "/js/lang_pool_full.js";
import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

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
};

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim();
}

const LANGS = (Array.isArray(LANG_POOL) ? LANG_POOL : [])
  .map((l) => {
    const code = canonical(l.code);
    if (!code) return null;
    return {
      code,
      flag: l.flag || "🌐",
      name: l.name || code.toUpperCase(),
      bcp: BCP[code] || "en-US",
    };
  })
  .filter(Boolean);

function langObj(code) {
  const c = canonical(code);
  return (
    LANGS.find((x) => x.code === c) || {
      code: c,
      flag: "🌐",
      name: c.toUpperCase(),
      bcp: BCP[c] || "en-US",
    }
  );
}

function labelChip(code) {
  const o = langObj(code);
  return `${o.flag} ${o.name}`;
}

const UI_TEXT = {
  tr: {
    ready: "Konuşmak için mikrofona dokununuz.",
    preparing: "Sistem Hazırlanıyor.",
    repeat: "Konuşmanız Bitince Mikrofona Basınız.",
    wait: "Lütfen Bekleyiniz...",
    translating: "Çevriliyor...",
    translateError: "⚠️ Çeviri servisine ulaşılamadı",
  },
  en: {
    ready: "Tap the microphone to speak.",
    preparing: "System is preparing.",
    repeat: "Press the microphone again when you finish speaking.",
    wait: "Please wait...",
    translating: "Translating...",
    translateError: "⚠️ Translation service unavailable",
  },
  de: {
    ready: "Tippen Sie zum Sprechen auf das Mikrofon.",
    preparing: "System wird vorbereitet.",
    repeat: "Drücken Sie das Mikrofon erneut, wenn Sie fertig gesprochen haben.",
    wait: "Bitte warten...",
    translating: "Wird übersetzt...",
    translateError: "⚠️ Übersetzungsdienst nicht erreichbar",
  },
  fr: {
    ready: "Touchez le micro pour parler.",
    preparing: "Le système se prépare.",
    repeat: "Appuyez de nouveau sur le micro quand vous avez fini de parler.",
    wait: "Veuillez patienter...",
    translating: "Traduction en cours...",
    translateError: "⚠️ Service de traduction indisponible",
  },
  it: {
    ready: "Tocca il microfono per parlare.",
    preparing: "Sistema in preparazione.",
    repeat: "Premi di nuovo il microfono quando hai finito di parlare.",
    wait: "Attendere prego...",
    translating: "Traduzione in corso...",
    translateError: "⚠️ Servizio di traduzione non disponibile",
  },
  es: {
    ready: "Toque el micrófono para hablar.",
    preparing: "El sistema se está preparando.",
    repeat: "Pulse el micrófono otra vez cuando termine de hablar.",
    wait: "Por favor espere...",
    translating: "Traduciendo...",
    translateError: "⚠️ Servicio de traducción no disponible",
  },
  ru: {
    ready: "Нажмите на микрофон, чтобы говорить.",
    preparing: "Система подготавливается.",
    repeat: "Нажмите микрофон снова, когда закончите говорить.",
    wait: "Пожалуйста, подождите...",
    translating: "Перевод...",
    translateError: "⚠️ Сервис перевода недоступен",
  },
  el: {
    ready: "Πατήστε το μικρόφωνο για να μιλήσετε.",
    preparing: "Το σύστημα προετοιμάζεται.",
    repeat: "Πατήστε ξανά το μικρόφωνο όταν τελειώσετε να μιλάτε.",
    wait: "Παρακαλώ περιμένετε...",
    translating: "Μετάφραση...",
    translateError: "⚠️ Η υπηρεσία μετάφρασης δεν είναι διαθέσιμη",
  },
  az: {
    ready: "Danışmaq üçün mikrofona toxunun.",
    preparing: "Sistem hazırlanır.",
    repeat: "Danışığınız bitəndə mikrofona yenidən basın.",
    wait: "Zəhmət olmasa gözləyin...",
    translating: "Tərcümə olunur...",
    translateError: "⚠️ Tərcümə xidməti əlçatan deyil",
  },
  ka: {
    ready: "სასაუბროდ დააჭირეთ მიკროფონს.",
    preparing: "სისტემა მზადდება.",
    repeat: "როცა საუბარს დაასრულებთ, მიკროფონს ისევ დააჭირეთ.",
    wait: "გთხოვთ დაელოდოთ...",
    translating: "ითარგმნება...",
    translateError: "⚠️ თარგმნის სერვისი მიუწვდომელია",
  },
};

function t(langCode, key) {
  const c = canonical(langCode);
  const pack = UI_TEXT[c] || UI_TEXT.en;
  return pack[key] || UI_TEXT.en[key] || "";
}

const frameRoot = $("frameRoot");
const topBody = $("topBody");
const botBody = $("botBody");
const topMic = $("topMic");
const botMic = $("botMic");
const topHelper = $("topHelper");
const botHelper = $("botHelper");
const topLangBtn = $("topLangBtn");
const botLangBtn = $("botLangBtn");
const topLangTxt = $("topLangTxt");
const botLangTxt = $("botLangTxt");
const popTop = $("pop-top");
const popBot = $("pop-bot");
const listTop = $("list-top");
const listBot = $("list-bot");
const closeTop = $("close-top");
const closeBot = $("close-bot");
const clearBtn = $("clearBtn");
const homeLink = $("homeLink");
const homeBtn = $("homeBtn");

let topLang = "en";
let botLang = "tr";
let ttsDebounceAt = 0;
let activeSide = null;
let recognizer = null;
let recordingSide = null;
let currentAudio = null;

/* ===== UI ===== */

function pointOrbTo(side) {
  if (!frameRoot) return;
  frameRoot.classList.remove("to-top", "to-bot");
  frameRoot.classList.add(side === "top" ? "to-top" : "to-bot");
}
function getVoicePreference() {
  return localStorage.getItem("tts_voice") || "auto";
}
function setMicState(side, state) {
  const mic = side === "top" ? topMic : botMic;
  if (!mic) return;
  mic.classList.remove("listening", "recorded");
  if (state === "listening") mic.classList.add("listening");
  if (state === "recorded") mic.classList.add("recorded");
}

function resetMics() {
  topMic?.classList.remove("listening", "recorded");
  botMic?.classList.remove("listening", "recorded");
}

function setFrameVisual(state) {
  if (!frameRoot) return;
  frameRoot.classList.remove("is-idle", "is-listening", "is-translating", "is-ready", "is-error");
  if (state === "idle") frameRoot.classList.add("is-idle");
  if (state === "listening") frameRoot.classList.add("is-listening");
  if (state === "translating") frameRoot.classList.add("is-translating");
  if (state === "ready") frameRoot.classList.add("is-ready");
  if (state === "error") frameRoot.classList.add("is-error");
}

function setHelper(el, text, tone) {
  if (!el) return;
  el.className = "helper-text";
  if (tone) el.classList.add(tone);
  el.textContent = text || "";
}

function setSystemReadyUI() {
  activeSide = null;
  resetMics();
  setFrameVisual("ready");
  setHelper(topHelper, t(topLang, "ready"), "helper-ready");
  setHelper(botHelper, t(botLang, "ready"), "helper-ready");
}

function setSystemPreparingUI() {
  activeSide = null;
  resetMics();
  setFrameVisual("error");
  setHelper(topHelper, t(topLang, "preparing"), "helper-wait");
  setHelper(botHelper, t(botLang, "preparing"), "helper-wait");
}

function setListeningUI(side) {
  activeSide = side;
  pointOrbTo(side);
  resetMics();
  setMicState(side, "listening");
  setFrameVisual("listening");

  if (side === "top") {
    setHelper(topHelper, t(topLang, "repeat"), "helper-repeat");
    setHelper(botHelper, t(botLang, "wait"), "helper-wait");
  } else {
    setHelper(topHelper, t(topLang, "wait"), "helper-wait");
    setHelper(botHelper, t(botLang, "repeat"), "helper-repeat");
  }
}

function setTranslatingUI(side) {
  activeSide = side;
  pointOrbTo(side);
  setMicState(side, "recorded");
  setFrameVisual("translating");

  if (side === "top") {
    setHelper(topHelper, t(topLang, "repeat"), "helper-repeat");
    setHelper(botHelper, t(botLang, "wait"), "helper-wait");
  } else {
    setHelper(topHelper, t(topLang, "wait"), "helper-wait");
    setHelper(botHelper, t(botLang, "repeat"), "helper-repeat");
  }
}

function setErrorUI() {
  activeSide = null;
  resetMics();
  setFrameVisual("error");
  setHelper(topHelper, t(topLang, "preparing"), "helper-wait");
  setHelper(botHelper, t(botLang, "preparing"), "helper-wait");
}

function bounceToReady(delay = 1800) {
  setTimeout(() => {
    setSystemReadyUI();
  }, delay);
}

/* ===== Language UI ===== */

function refreshLangLabels() {
  if (topLangTxt) topLangTxt.textContent = labelChip(topLang);
  if (botLangTxt) botLangTxt.textContent = labelChip(botLang);
}

function refreshReadyTextsIfIdle() {
  if (activeSide === null) {
    if (frameRoot?.classList.contains("is-ready")) setSystemReadyUI();
    if (frameRoot?.classList.contains("is-error")) setSystemPreparingUI();
  }
}

function closeAllPop() {
  popTop?.classList.remove("show");
  popBot?.classList.remove("show");
}

function renderPop(side) {
  const list = side === "top" ? listTop : listBot;
  const sel = side === "top" ? topLang : botLang;
  if (!list) return;

  list.innerHTML = LANGS.map((l) => {
    const active = canonical(l.code) === canonical(sel) ? "active" : "";
    return `
      <div class="pop-item ${active}" data-code="${l.code}">
        <div class="pop-left">
          <div class="pop-flag">${l.flag}</div>
          <div class="pop-name">${l.name}</div>
        </div>
        <div class="pop-code">${l.code.toUpperCase()}</div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".pop-item").forEach((el) => {
    el.addEventListener("click", () => {
      const code = el.dataset.code || "en";
      if (side === "top") topLang = code;
      else botLang = code;
      refreshLangLabels();
      refreshReadyTextsIfIdle();
      closeAllPop();
    });
  });
}

/* ===== Audio / Backend TTS ===== */

function stopAudio() {
  try {
    currentAudio?.pause?.();
    currentAudio = null;
  } catch {}
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

function base64ToBlob(base64, mime = "audio/mpeg") {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) {
    byteNumbers[i] = byteChars.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mime });
}

async function speakViaApi(text, langCode) {
  const userId = await getCurrentUserId();

  const r = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
  text: String(text || "").trim(),
  lang: canonical(langCode),
  user_id: userId,
  voice: getVoicePreference(),
}),
  });

  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok || !j?.audio_base64) {
    throw new Error(j?.error || j?.detail || "TTS API unavailable");
  }

  const blob = base64ToBlob(j.audio_base64, "audio/mpeg");
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;

  audio.onended = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  };

  audio.onerror = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
  };

  await audio.play();
}

function speakFallback(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return;

  const c = canonical(langCode);

  if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
    try {
      window.NativeTTS.speak(value, c);
      return;
    } catch {}
  }

  if (!window.speechSynthesis) return;

  const u = new SpeechSynthesisUtterance(value);
  u.lang = langObj(c).bcp;

  if (c === "en") {
    u.rate = 0.82;
    u.pitch = 1.0;
  } else if (c === "de" || c === "fr" || c === "it" || c === "es") {
    u.rate = 0.88;
    u.pitch = 1.0;
  } else {
    u.rate = 0.92;
    u.pitch = 1.0;
  }

  u.volume = 1;

  setTimeout(() => {
    try {
      window.speechSynthesis.speak(u);
    } catch {}
  }, 60);
}

async function speak(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return;

  const now = Date.now();
  if (now - ttsDebounceAt < 250) stopAudio();
  ttsDebounceAt = now;

  stopAudio();

  try {
    await speakViaApi(value, langCode);
  } catch (e) {
    console.warn("TTS API fallback", e);
    speakFallback(value, langCode);
  }
}

/* ===== Scroll ===== */

function keepLatestVisible(side) {
  const wrap = side === "top" ? topBody : botBody;
  if (!wrap) return;

  const apply = () => {
    try {
      wrap.scrollTop = wrap.scrollHeight + 9999;
    } catch {}
  };

  apply();
  requestAnimationFrame(apply);
  setTimeout(apply, 30);
  setTimeout(apply, 120);
}

/* ===== Bubbles ===== */

function addBubble(side, kind, text, opts = {}) {
  const wrap = side === "top" ? topBody : botBody;
  if (!wrap) return null;

  const row = document.createElement("div");
  row.className = `bubble ${kind}` + (opts.latest ? " is-latest" : "");

  const inner = document.createElement("div");
  inner.className = "bubble-row";

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "").trim();

  if (kind === "me") {
    const spk = document.createElement("button");
    spk.type = "button";
    spk.className = "spk-icon";
    spk.setAttribute("aria-label", "Tekrar dinle");
    spk.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M3 10v4h4l5 4V6L7 10H3"></path>
        <path d="M16 8a4 4 0 0 1 0 8"></path>
        <path d="M19 5a8 8 0 0 1 0 14"></path>
      </svg>
    `;
    spk.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await speak(txt.textContent || "", opts.speakLang || "en");
    });
    inner.appendChild(spk);
  }

  inner.appendChild(txt);
  row.appendChild(inner);
  wrap.appendChild(row);

  keepLatestVisible(side);
  return row;
}

function clearLatest(side) {
  const wrap = side === "top" ? topBody : botBody;
  if (!wrap) return;
  wrap.querySelectorAll(".bubble.me.is-latest").forEach((el) => {
    el.classList.remove("is-latest");
  });
}

/* ===== Backend ===== */

async function translateText(text, from, to) {
  const src = canonical(from);
  const dst = canonical(to);

  try {
    const r = await fetch(`${API_BASE}/api/translate_ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: String(text || "").trim(),
        from_lang: src,
        to_lang: dst,
      }),
    });

    if (!r.ok) {
      const raw = await r.text().catch(() => "");
      console.error("translate_ai failed", r.status, raw);
      return null;
    }

    const j = await r.json().catch(() => null);
    return String(j?.translated || "").trim() || null;
  } catch (e) {
    console.error("translate_ai error", e);
    return null;
  }
}

/* ===== Speech ===== */

function buildRecognizer(langCode) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = langObj(langCode).bcp;
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  return rec;
}

function stopRecognizer() {
  if (recognizer) {
    try { recognizer.stop(); } catch {}
    recognizer = null;
  }
}

async function finalizeRecognition(side, text) {
  const src = side === "top" ? topLang : botLang;
  const dst = side === "top" ? botLang : topLang;
  const other = side === "top" ? "bot" : "top";
  const otherWrap = other === "top" ? topBody : botBody;

  const cleaned = String(text || "").trim();
  if (!cleaned) {
    setErrorUI();
    bounceToReady(1800);
    return;
  }

  addBubble(side, "them", cleaned);
  clearLatest(other);

  setTranslatingUI(side);

  addBubble(other, "me", t(dst, "translating"), {
    latest: true,
    speakLang: dst,
  });

  const latestTxt = otherWrap?.querySelector(".bubble.me.is-latest .txt");
  const tr = await translateText(cleaned, src, dst);

  if (!tr) {
    setErrorUI();
    if (latestTxt) {
      latestTxt.textContent = t(dst, "translateError");
      keepLatestVisible(other);
    }
    bounceToReady(1800);
    return;
  }

  if (latestTxt) {
    latestTxt.textContent = tr;
    keepLatestVisible(other);
  } else {
    addBubble(other, "me", tr, { latest: true, speakLang: dst });
  }

  await speak(tr, dst);
  setSystemReadyUI();
}

function startRecording(side) {
  const lang = side === "top" ? topLang : botLang;
  const rec = buildRecognizer(lang);
  if (!rec) {
    setErrorUI();
    bounceToReady(1800);
    return;
  }

  recognizer = rec;
  recordingSide = side;

  rec.onresult = (e) => {
    const heard = e.results?.[0]?.[0]?.transcript || "";
    Promise.resolve().then(() => finalizeRecognition(side, heard));
  };

  rec.onerror = () => {
    if (recordingSide) {
      recordingSide = null;
      recognizer = null;
      setErrorUI();
      bounceToReady(1800);
    }
  };

  rec.onend = () => {
    recognizer = null;
    recordingSide = null;
  };

  try {
    rec.start();
  } catch {
    recognizer = null;
    recordingSide = null;
    setErrorUI();
    bounceToReady(1800);
  }
}

function toggleRecording(side) {
  if (recordingSide === side) {
    stopRecognizer();
    recordingSide = null;
    return;
  }

  if (recordingSide && recordingSide !== side) {
    stopRecognizer();
    recordingSide = null;
  }

  setListeningUI(side);
  startRecording(side);
}

/* ===== Bind ===== */

function bind() {
  setFrameVisual("ready");
  setSystemReadyUI();
  pointOrbTo("bot");
  refreshLangLabels();

  fetch(`${API_BASE}/api/translate_ai/health`).catch(() => {});

  topLangBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
    renderPop("top");
    popTop?.classList.add("show");
  });

  botLangBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
    renderPop("bot");
    popBot?.classList.add("show");
  });

  closeTop?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
  });

  closeBot?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
  });

  document.addEventListener(
    "click",
    (e) => {
      const inside =
        (popTop && popTop.contains(e.target)) ||
        (popBot && popBot.contains(e.target));
      const isBtn = e.target?.closest?.("#topLangBtn,#botLangBtn");
      if (!inside && !isBtn) closeAllPop();
    },
    { capture: true }
  );

  clearBtn?.addEventListener("click", () => {
    stopAudio();
    stopRecognizer();
    recordingSide = null;
    if (topBody) topBody.innerHTML = "";
    if (botBody) botBody.innerHTML = "";
    setSystemReadyUI();
  });

  homeLink?.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  homeBtn?.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  topMic?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleRecording("top");
  });

  botMic?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleRecording("bot");
  });
}

bind();
