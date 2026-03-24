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

const F2F_VOICE_KEY = "facetoface_voice_mode";
const F2F_TRANSLATE_KEY = "facetoface_translate_mode";

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
      code: c || "en",
      flag: "🌐",
      name: (c || "en").toUpperCase(),
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
    preparing: "Sistem hazırlanıyor...",
    repeat: "Konuşmanız bitince mikrofona tekrar basınız.",
    wait: "Lütfen bekleyiniz...",
    translating: "Çevriliyor...",
    translateError: "⚠️ Çeviri servisine ulaşılamadı",
    micBlocked: "⚠️ Mikrofon izni gerekli",
    speechUnsupported: "⚠️ Bu cihazda konuşma algılama desteklenmiyor",
  },
  en: {
    ready: "Tap the microphone to speak.",
    preparing: "System is preparing...",
    repeat: "Press the microphone again when you finish speaking.",
    wait: "Please wait...",
    translating: "Translating...",
    translateError: "⚠️ Translation service unavailable",
    micBlocked: "⚠️ Microphone permission required",
    speechUnsupported: "⚠️ Speech recognition is not supported on this device",
  },
  de: {
    ready: "Tippen Sie zum Sprechen auf das Mikrofon.",
    preparing: "System wird vorbereitet...",
    repeat: "Drücken Sie das Mikrofon erneut, wenn Sie fertig gesprochen haben.",
    wait: "Bitte warten...",
    translating: "Wird übersetzt...",
    translateError: "⚠️ Übersetzungsdienst not reachable",
    micBlocked: "⚠️ Mikrofonberechtigung erforderlich",
    speechUnsupported: "⚠️ Spracherkennung wird auf diesem Gerät nicht unterstützt",
  },
  fr: {
    ready: "Touchez le micro pour parler.",
    preparing: "Le système se prépare...",
    repeat: "Appuyez de nouveau sur le micro quand vous avez fini de parler.",
    wait: "Veuillez patienter...",
    translating: "Traduction en cours...",
    translateError: "⚠️ Service de traduction indisponible",
    micBlocked: "⚠️ Autorisation micro requise",
    speechUnsupported: "⚠️ La reconnaissance vocale n'est pas prise en charge sur cet appareil",
  },
  it: {
    ready: "Tocca il microfono per parlare.",
    preparing: "Sistema in preparazione...",
    repeat: "Premi di nuovo il microfono quando hai finito di parlare.",
    wait: "Attendere prego...",
    translating: "Traduzione in corso...",
    translateError: "⚠️ Servizio di traduzione non disponibile",
    micBlocked: "⚠️ Autorizzazione microfono richiesta",
    speechUnsupported: "⚠️ Il riconoscimento vocale non è supportato su questo dispositivo",
  },
  es: {
    ready: "Toque el micrófono para hablar.",
    preparing: "El sistema se está preparando...",
    repeat: "Pulse el micrófono otra vez cuando termine de hablar.",
    wait: "Por favor espere...",
    translating: "Traduciendo...",
    translateError: "⚠️ Servicio de traducción no disponible",
    micBlocked: "⚠️ Se requiere permiso de micrófono",
    speechUnsupported: "⚠️ El reconocimiento de voz no es compatible con este dispositivo",
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
const settingsBtn = $("settingsBtn");

let topLang = "en";
let botLang = "tr";
let ttsDebounceAt = 0;
let activeSide = null;
let recognizer = null;
let recordingSide = null;
let currentAudio = null;
let audioCtx = null;
let bootReady = false;
let bootStarted = false;
let bootPromise = null;
let voicesReady = false;

function getFaceVoiceMode() {
  return String(localStorage.getItem(F2F_VOICE_KEY) || "auto").trim().toLowerCase();
}

function getFaceTranslateMode() {
  const value = String(localStorage.getItem(F2F_TRANSLATE_KEY) || "normal").trim().toLowerCase();
  return value === "cultural" ? "cultural" : "normal";
}

function canonTone(value) {
  const v = String(value || "neutral").trim().toLowerCase();
  return ["neutral", "happy", "angry", "sad", "excited"].includes(v) ? v : "neutral";
}

function detectToneFromText(text) {
  const raw = String(text || "").trim();
  if (!raw) return "neutral";

  const s = raw.toLowerCase();
  const exclamations = (raw.match(/!/g) || []).length;
  const upperRatio = (() => {
    const letters = raw.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "");
    if (!letters.length) return 0;
    const upper = letters.replace(/[^A-ZÇĞİÖŞÜ]/g, "").length;
    return upper / letters.length;
  })();

  const angryWords = [
    "saçma", "yeter", "sinir", "sinirim", "delirdim", "bıktım", "biktim",
    "rezalet", "berbat", "nefret", "uyuz", "çıldırdım", "cildirdim"
  ];

  const sadWords = [
    "üzgün", "uzgun", "kötüyüm", "kotuyum", "moralim bozuk",
    "canım sıkkın", "canim sikkin", "yoruldum", "tükendim", "tukendim"
  ];

  const happyWords = [
    "harika", "süper", "super", "müthiş", "muthis", "bayıldım",
    "bayildim", "çok iyi", "cok iyi", "sevindim", "mutlu oldum"
  ];

  const excitedWords = [
    "inanamıyorum", "inanamiyorum", "şahane", "sahane", "wow",
    "efsane", "heyecanlıyım", "heyecanliyim"
  ];

  const hasAny = (arr) => arr.some((w) => s.includes(w));

  if (hasAny(angryWords) || exclamations >= 2 || upperRatio > 0.55) return "angry";
  if (hasAny(sadWords)) return "sad";
  if (hasAny(excitedWords)) return "excited";
  if (hasAny(happyWords)) return "happy";
  if (exclamations === 1) return "excited";

  return "neutral";
}

function pointOrbTo(side) {
  if (!frameRoot) return;
  frameRoot.classList.remove("to-top", "to-bot");
  frameRoot.classList.add(side === "top" ? "to-top" : "to-bot");
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

function bounceToReady(delay = 1200) {
  setTimeout(() => setSystemReadyUI(), delay);
}

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
      if (side === "top") topLang = canonical(code);
      else botLang = canonical(code);

      refreshLangLabels();
      refreshReadyTextsIfIdle();
      closeAllPop();
    });
  });
}

function stopAudio() {
  try {
    currentAudio?.pause?.();
    currentAudio = null;
  } catch {}

  try {
    window.speechSynthesis?.cancel?.();
  } catch {}

  try {
    window.NativeTTS?.stop?.();
  } catch {}
}

async function getCurrentUserId() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || localStorage.getItem("user_id") || null;
  } catch {
    return localStorage.getItem("user_id") || null;
  }
}

function getVoicePreference() {
  const faceMode = getFaceVoiceMode();
  if (["auto", "female", "male", "clone"].includes(faceMode)) return faceMode;

  return String(
    localStorage.getItem("tts_voice") ||
    localStorage.getItem("live_interpreter_voice") ||
    "auto"
  ).toLowerCase().trim();
}

async function hasReadyVoiceProfile() {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("tts_voice_ready,tts_voice_id")
      .eq("id", userId)
      .maybeSingle();

    if (error) return false;
    return !!data?.tts_voice_ready && !!String(data?.tts_voice_id || "").trim();
  } catch {
    return false;
  }
}

async function warmAudio() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") await audioCtx.resume();
    }
  } catch {}

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      voicesReady = true;
    }
  } catch {}
}

async function speakViaApi(text, langCode, tone = "neutral") {
  const userId = await getCurrentUserId();
  const voice = getVoicePreference();

  const r = await fetch(`${API_BASE}/api/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: String(text || "").trim(),
      lang: canonical(langCode),
      user_id: userId,
      module: "facetoface",
      voice,
      tone: canonTone(tone),
    }),
  });

  const j = await r.json().catch(() => null);

  if (!r.ok || !j?.ok || !j?.audio_base64) {
    throw new Error(j?.error || j?.detail || "TTS API unavailable");
  }

  const audio = new Audio(`data:audio/mp3;base64,${j.audio_base64}`);
  audio.preload = "auto";
  audio.playsInline = true;
  currentAudio = audio;

  audio.onended = () => {
    if (currentAudio === audio) currentAudio = null;
  };

  audio.onerror = () => {
    if (currentAudio === audio) currentAudio = null;
  };

  await warmAudio();
  await audio.play();
  return true;
}

function chooseWebVoice(langCode) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const bcp = langObj(langCode).bcp.toLowerCase();
  const langBase = canonical(langCode);
  const pref = getVoicePreference();

  let pool = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith(langBase));
  if (!pool.length) pool = voices.filter((v) => String(v.lang || "").toLowerCase() === bcp);
  if (!pool.length) pool = voices;
  if (!pool.length) return null;

  if (pref === "female") {
    return pool.find((v) => /female|woman|zira|aria|seda|helena|jenny|susan|eva|anna|emma/i.test(v.name)) || pool[0];
  }

  if (pref === "male") {
    return pool.find((v) => /male|man|david|mark|george|james|alex|tom|jon|paul/i.test(v.name)) || pool[0];
  }

  return pool[0];
}

function toneToFallbackSpeechParams(tone) {
  const t = canonTone(tone);
  if (t === "happy") return { rate: 1.03, pitch: 1.15 };
  if (t === "angry") return { rate: 1.08, pitch: 1.0 };
  if (t === "sad") return { rate: 0.88, pitch: 0.9 };
  if (t === "excited") return { rate: 1.12, pitch: 1.2 };
  return { rate: 1.0, pitch: 1.0 };
}

function speakFallback(text, langCode, tone = "neutral") {
  const value = String(text || "").trim();
  if (!value) return;

  const c = canonical(langCode);
  const pref = getVoicePreference();
  const toneCfg = toneToFallbackSpeechParams(tone);

  try {
    window.speechSynthesis?.cancel?.();
  } catch {}

  if (pref === "auto" && window.NativeTTS && typeof window.NativeTTS.speak === "function") {
    try {
      window.NativeTTS.speak(value, c);
      return;
    } catch {}
  }

  if (!window.speechSynthesis) return;

  try {
    if (!voicesReady) {
      window.speechSynthesis.getVoices();
      voicesReady = true;
    }
  } catch {}

  const u = new SpeechSynthesisUtterance(value);
  u.lang = langObj(c).bcp;

  const baseRate = c === "en" ? 0.82 : ["de", "fr", "it", "es"].includes(c) ? 0.88 : 0.92;
  u.rate = Math.max(0.7, Math.min(1.35, baseRate * toneCfg.rate));
  u.pitch = Math.max(0.7, Math.min(1.4, toneCfg.pitch));
  u.volume = 1;

  const voice = chooseWebVoice(c);
  if (voice) u.voice = voice;

  setTimeout(() => {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }, 80);
}

async function speak(text, langCode, tone = "neutral") {
  const value = String(text || "").trim();
  if (!value) return;

  const now = Date.now();
  if (now - ttsDebounceAt < 250) stopAudio();
  ttsDebounceAt = now;
  stopAudio();

  const voice = getVoicePreference();

  if (voice === "auto") {
    speakFallback(value, langCode, tone);
    return;
  }

  if (voice === "clone") {
    try {
      const ready = await hasReadyVoiceProfile();
      if (!ready) {
        speakFallback(value, langCode, tone);
        return;
      }
      await speakViaApi(value, langCode, tone);
      return;
    } catch {
      speakFallback(value, langCode, tone);
      return;
    }
  }

  try {
    await speakViaApi(value, langCode, tone);
  } catch {
    speakFallback(value, langCode, tone);
  }
}

async function spendFaceUsage(usedChars) {
  const safeChars = Number(usedChars || 0);
  if (safeChars <= 0) return;

  const userId = await getCurrentUserId();
  if (!userId) return;

  const r = await fetch(`${API_BASE}/api/billing/usage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      module: "facetoface",
      characters: safeChars,
    }),
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok) {
    if (r.status === 402) {
      alert("Jetonunuz yetersiz. Jeton Market'e yönlendiriliyorsunuz.");
      location.href = "/pages/jetonbuy.html";
      throw new Error("insufficient_tokens");
    }
    throw new Error(j.detail || "facetoface_usage_failed");
  }

  return j;
}

function keepLatestVisible(side) {
  const wrap = side === "top" ? topBody : botBody;
  if (!wrap) return;

  const apply = () => {
    try {
      wrap.scrollTop = wrap.scrollHeight;
    } catch {}
  };

  apply();
  requestAnimationFrame(apply);
  setTimeout(apply, 30);
  setTimeout(apply, 100);
}

function createSpeakerButton(text, langCode, tone = "neutral") {
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
    await speak(text, langCode, tone);
  });
  return btn;
}

function addBubble(side, kind, text, opts = {}) {
  const wrap = side === "top" ? topBody : botBody;
  if (!wrap) return null;

  const row = document.createElement("div");
  row.className = `bubble ${kind}${opts.latest ? " is-latest" : ""}`;

  const inner = document.createElement("div");
  inner.className = "bubble-row";

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "").trim();

  if (opts.withSpeaker || kind === "me") {
    const spk = createSpeakerButton(
      txt.textContent || "",
      opts.speakLang || "en",
      opts.speakTone || "neutral"
    );
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
  wrap.querySelectorAll(".bubble.me.is-latest").forEach((el) => el.classList.remove("is-latest"));
}

async function translateText(text, from, to) {
  const src = canonical(from);
  const dst = canonical(to);

  // 🔥 BURASI KRİTİK
  const mode = getFaceTranslateMode(); // normal | cultural

  try {
    const r = await fetch(`${API_BASE}/api/translate_ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: String(text || "").trim(),
        from_lang: src,
        to_lang: dst,
        mode // 🔥 BURAYI EKLEDİK
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
    try {
      recognizer.stop();
    } catch {}
    recognizer = null;
  }
}

async function finalizeRecognition(side, text) {
  const src = side === "top" ? topLang : botLang;
  const dst = side === "top" ? botLang : topLang;
  const sourceTone = detectToneFromText(text);
  const other = side === "top" ? "bot" : "top";
  const otherWrap = other === "top" ? topBody : botBody;

  const cleaned = String(text || "").trim();
  if (!cleaned) {
    setErrorUI();
    bounceToReady(1000);
    return;
  }

  addBubble(side, "them", cleaned);
  clearLatest(other);

  setTranslatingUI(side);

  addBubble(other, "me", t(dst, "translating"), {
    latest: true,
    speakLang: dst,
    speakTone: sourceTone,
  });

  const latestTxt = otherWrap?.querySelector(".bubble.me.is-latest .txt");
  const tr = await translateText(cleaned, src, dst);

  if (!tr) {
    setErrorUI();
    if (latestTxt) {
      latestTxt.textContent = t(dst, "translateError");
      keepLatestVisible(other);
    }
    bounceToReady(1200);
    return;
  }

  try {
    await spendFaceUsage(tr.length);
  } catch (e) {
    if (String(e?.message || "") === "insufficient_tokens") return;
  }

  if (latestTxt) {
    latestTxt.textContent = tr;
    keepLatestVisible(other);
  } else {
    addBubble(other, "me", tr, {
      latest: true,
      speakLang: dst,
      speakTone: sourceTone,
    });
  }

  await speak(tr, dst, sourceTone);
  setSystemReadyUI();
}

function startRecording(side) {
  const lang = side === "top" ? topLang : botLang;
  const rec = buildRecognizer(lang);

  if (!rec) {
    setErrorUI();
    const helper = side === "top" ? topHelper : botHelper;
    setHelper(helper, t(lang, "speechUnsupported"), "helper-wait");
    bounceToReady(1800);
    return;
  }

  recognizer = rec;
  recordingSide = side;

  rec.onstart = () => {
    setListeningUI(side);
  };

  rec.onresult = (e) => {
    const heard = e.results?.[0]?.[0]?.transcript || "";
    Promise.resolve().then(() => finalizeRecognition(side, heard));
  };

  rec.onerror = (e) => {
    const helper = side === "top" ? topHelper : botHelper;
    if (String(e?.error || "").includes("not-allowed")) {
      setHelper(helper, t(lang, "micBlocked"), "helper-wait");
    } else {
      setHelper(helper, t(lang, "preparing"), "helper-wait");
    }
    recordingSide = null;
    recognizer = null;
    setErrorUI();
    bounceToReady(1600);
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
    bounceToReady(1200);
  }
}

async function toggleRecording(side) {
  await ensureReady();

  if (recordingSide === side) {
    stopRecognizer();
    recordingSide = null;
    setTranslatingUI(side);
    return;
  }

  if (recordingSide && recordingSide !== side) {
    stopRecognizer();
    recordingSide = null;
  }

  startRecording(side);
}

async function warmApis() {
  await Promise.allSettled([
    fetch(`${API_BASE}/healthz`).catch(() => {}),
    fetch(`${API_BASE}/api/translate_ai/health`).catch(() => {}),
  ]);
}

function unlockOnFirstTouch() {
  const once = async () => {
    try {
      await warmAudio();
    } catch {}
    window.removeEventListener("touchstart", once);
    window.removeEventListener("pointerdown", once);
    window.removeEventListener("click", once);
  };

  window.addEventListener("touchstart", once, { passive: true });
  window.addEventListener("pointerdown", once, { passive: true });
  window.addEventListener("click", once, { passive: true });
}

function startBoot() {
  if (bootStarted) return bootPromise;
  bootStarted = true;

  bootPromise = (async () => {
    setSystemPreparingUI();
    refreshLangLabels();
    pointOrbTo("bot");

    await Promise.allSettled([warmApis(), warmAudio()]);

    bootReady = true;
    setSystemReadyUI();
  })();

  return bootPromise;
}

async function ensureReady() {
  if (bootReady) return true;
  if (!bootStarted) startBoot();
  try {
    await bootPromise;
  } catch {}
  return true;
}

function safeHomeHref() {
  return "/pages/home.html";
}

function bindKeyboardButton(el, handler) {
  if (!el) return;
  el.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      await handler(e);
    }
  });
}

function bind() {
  refreshLangLabels();
  unlockOnFirstTouch();
  startBoot();

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

  document.addEventListener("click", (e) => {
    const inside =
      (popTop && popTop.contains(e.target)) ||
      (popBot && popBot.contains(e.target));
    const isBtn = e.target?.closest?.("#topLangBtn,#botLangBtn");
    if (!inside && !isBtn) closeAllPop();
  }, { capture: true });

  clearBtn?.addEventListener("click", () => {
    stopAudio();
    stopRecognizer();
    recordingSide = null;
    if (topBody) topBody.innerHTML = "";
    if (botBody) botBody.innerHTML = "";
    setSystemReadyUI();
  });

  homeLink?.addEventListener("click", () => {
    location.href = safeHomeHref();
  });

  homeBtn?.addEventListener("click", () => {
    location.href = safeHomeHref();
  });

  settingsBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = "/pages/facetoface_open.html?edit=1";
  });

  topMic?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleRecording("top");
  });

  botMic?.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleRecording("bot");
  });

  bindKeyboardButton(topMic, async (e) => {
    e.stopPropagation();
    await toggleRecording("top");
  });

  bindKeyboardButton(botMic, async (e) => {
    e.stopPropagation();
    await toggleRecording("bot");
  });

  bindKeyboardButton(homeBtn, async () => {
    location.href = safeHomeHref();
  });

  bindKeyboardButton(settingsBtn, async () => {
    location.href = "/pages/facetoface_open.html?edit=1";
  });

  try {
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        voicesReady = true;
      };
      window.speechSynthesis.getVoices();
    }
  } catch {}
}

if (
  !frameRoot || !topBody || !botBody || !topMic || !botMic ||
  !topHelper || !botHelper || !topLangBtn || !botLangBtn ||
  !topLangTxt || !botLangTxt || !popTop || !popBot ||
  !listTop || !listBot || !closeTop || !closeBot ||
  !clearBtn || !homeLink || !homeBtn
) {
  console.error("[facetoface] Gerekli DOM elemanları eksik.");
} else {
  bind();
}
