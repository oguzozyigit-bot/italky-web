// FILE: /js/facetoface_page.js

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

const STORAGE = {
  SRC: "italky_f2f_src_lang",
  TGT: "italky_f2f_tgt_lang",
  AUTO_SPEAK: "italky_f2f_auto_speak",
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

function pick(...ids) {
  for (const id of ids) {
    const el = $(id);
    if (el) return el;
  }
  return null;
}

function setText(el, value) {
  if (!el) return;
  if ("value" in el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) {
    el.value = value ?? "";
  } else {
    el.textContent = value ?? "";
  }
}

function getText(el) {
  if (!el) return "";
  if ("value" in el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) {
    return String(el.value || "").trim();
  }
  return String(el.textContent || "").trim();
}

function show(el) {
  if (!el) return;
  el.hidden = false;
  el.style.display = "";
}

function hide(el) {
  if (!el) return;
  el.hidden = true;
}

function debounce(fn, wait = 700) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

const dom = {
  sourceLang: null,
  targetLang: null,
  sourceLabel: null,
  targetLabel: null,

  sourceText: null,
  targetText: null,

  recordBtn: null,
  stopBtn: null,
  swapBtn: null,
  clearBtn: null,
  speakBtn: null,
  speakSourceBtn: null,

  status: null,
  micDot: null,
  autoSpeak: null,
};

const state = {
  user: null,
  recording: false,
  recognizing: false,
  supportedRecognition: false,
  recognition: null,
  mediaStream: null,
  finalTranscript: "",
  interimTranscript: "",
  lastTranslatedInput: "",
  translating: false,
  autoSpeak: localStorage.getItem(STORAGE.AUTO_SPEAK) !== "0",
};

function resolveDom() {
  dom.sourceLang =
    pick("sourceLang", "fromLang", "langFrom", "srcLang", "leftLang");
  dom.targetLang =
    pick("targetLang", "toLang", "langTo", "tgtLang", "rightLang");

  dom.sourceLabel = pick("sourceLangLabel", "fromLangLabel", "leftLangLabel");
  dom.targetLabel = pick("targetLangLabel", "toLangLabel", "rightLangLabel");

  dom.sourceText =
    pick("sourceText", "fromText", "inputText", "originalText", "liveText");
  dom.targetText =
    pick("targetText", "toText", "outputText", "translatedText", "resultText");

  dom.recordBtn =
    pick("recordBtn", "toggleRecording", "micBtn", "startBtn", "talkBtn");
  dom.stopBtn = pick("stopBtn", "endBtn", "pauseBtn");
  dom.swapBtn = pick("swapBtn", "switchBtn", "flipBtn");
  dom.clearBtn = pick("clearBtn", "resetBtn");
  dom.speakBtn = pick("speakBtn", "ttsBtn", "playBtn");
  dom.speakSourceBtn = pick("speakSourceBtn", "playSourceBtn");

  dom.status = pick("statusText", "status", "liveStatus", "hintText");
  dom.micDot = pick("micDot", "recordDot", "liveDot");
  dom.autoSpeak = pick("autoSpeak", "autoSpeakToggle");
}

async function getCurrentUserSafe() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch (e) {
    console.warn("auth user alınamadı:", e);
    return null;
  }
}

function setStatus(msg = "", isError = false) {
  if (!dom.status) return;
  dom.status.textContent = msg;
  dom.status.dataset.state = isError ? "error" : "ok";
}

function syncMicUi() {
  if (dom.recordBtn) {
    dom.recordBtn.dataset.recording = state.recording ? "1" : "0";
    dom.recordBtn.classList.toggle("is-recording", !!state.recording);
    dom.recordBtn.setAttribute(
      "aria-label",
      state.recording ? "Kaydı durdur" : "Kaydı başlat"
    );
    if ("textContent" in dom.recordBtn) {
      const txt = dom.recordBtn.dataset.labelMode;
      if (txt === "dynamic") {
        dom.recordBtn.textContent = state.recording ? "Durdur" : "Başlat";
      }
    }
  }
  if (dom.micDot) {
    dom.micDot.classList.toggle("live", !!state.recording);
  }
  if (dom.stopBtn) {
    dom.stopBtn.disabled = !state.recording;
  }
}

function updateLangLabels() {
  const src = getSourceLang();
  const tgt = getTargetLang();

  if (dom.sourceLabel) dom.sourceLabel.textContent = labelChip(src);
  if (dom.targetLabel) dom.targetLabel.textContent = labelChip(tgt);
}

function getSourceLang() {
  const v =
    dom.sourceLang?.value ||
    localStorage.getItem(STORAGE.SRC) ||
    canonical(document.documentElement.lang) ||
    "tr";
  return canonical(v || "tr");
}

function getTargetLang() {
  const fallback = getSourceLang() === "tr" ? "en" : "tr";
  const v = dom.targetLang?.value || localStorage.getItem(STORAGE.TGT) || fallback;
  return canonical(v || fallback);
}

function persistLangs() {
  const src = getSourceLang();
  const tgt = getTargetLang();
  localStorage.setItem(STORAGE.SRC, src);
  localStorage.setItem(STORAGE.TGT, tgt);
  updateLangLabels();
}

function populateSelect(selectEl, selectedCode) {
  if (!selectEl) return;

  const current = canonical(selectedCode || selectEl.value || "en");
  selectEl.innerHTML = "";

  for (const l of LANGS) {
    const opt = document.createElement("option");
    opt.value = l.code;
    opt.textContent = `${l.flag} ${l.name}`;
    if (l.code === current) opt.selected = true;
    selectEl.appendChild(opt);
  }
}

function primeLanguageUI() {
  const savedSrc = localStorage.getItem(STORAGE.SRC) || "tr";
  const savedTgt = localStorage.getItem(STORAGE.TGT) || (savedSrc === "tr" ? "en" : "tr");

  populateSelect(dom.sourceLang, savedSrc);
  populateSelect(dom.targetLang, savedTgt);

  if (dom.sourceLang && !dom.sourceLang.value) dom.sourceLang.value = savedSrc;
  if (dom.targetLang && !dom.targetLang.value) dom.targetLang.value = savedTgt;

  if (dom.autoSpeak) {
    dom.autoSpeak.checked = !!state.autoSpeak;
  }

  updateLangLabels();
}

async function ensureReady() {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Tarayıcı mikrofon erişimini desteklemiyor.");
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    state.mediaStream = stream;
    return true;
  } catch (err) {
    console.error("ensureReady mikrofon hatası:", err);
    setStatus("Mikrofon izni gerekli.", true);
    alert("Mikrofon izni gerekli veya mikrofon başlatılamadı.");
    return false;
  }
}

function releaseMic() {
  try {
    state.mediaStream?.getTracks?.().forEach((t) => t.stop());
  } catch {}
  state.mediaStream = null;
}

function createRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = langObj(getSourceLang()).bcp;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    state.recognizing = true;
    setStatus("Dinleniyor...");
    syncMicUi();
  };

  rec.onend = () => {
    state.recognizing = false;

    if (state.recording) {
      try {
        rec.lang = langObj(getSourceLang()).bcp;
        rec.start();
      } catch (e) {
        console.warn("recognition restart uyarısı:", e);
        state.recording = false;
        syncMicUi();
        setStatus("Ses tanıma yeniden başlatılamadı.", true);
      }
    } else {
      setStatus("Hazır");
      syncMicUi();
    }
  };

  rec.onerror = (ev) => {
    console.error("recognition error:", ev);
    const code = ev?.error || "unknown";

    if (code === "not-allowed" || code === "service-not-allowed") {
      setStatus("Mikrofon izni verilmedi.", true);
      state.recording = false;
      syncMicUi();
      return;
    }

    if (code === "no-speech") {
      setStatus("Ses algılanmadı, dinleme sürüyor...");
      return;
    }

    if (code === "aborted") {
      return;
    }

    setStatus(`Ses tanıma hatası: ${code}`, true);
  };

  rec.onresult = (event) => {
    let interim = "";
    let finalText = state.finalTranscript || "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      const txt = String(res?.[0]?.transcript || "").trim();
      if (!txt) continue;

      if (res.isFinal) {
        finalText = `${finalText} ${txt}`.trim();
      } else {
        interim = `${interim} ${txt}`.trim();
      }
    }

    state.finalTranscript = finalText;
    state.interimTranscript = interim;

    const composed = [state.finalTranscript, state.interimTranscript]
      .filter(Boolean)
      .join(" ")
      .trim();

    setText(dom.sourceText, composed);

    if (state.finalTranscript) {
      debouncedTranslate(state.finalTranscript);
    }
  };

  return rec;
}

async function translateText(text, sourceLang, targetLang) {
  const cleanText = String(text || "").trim();
  if (!cleanText) return "";

  const payload = {
    text: cleanText,
    source_lang: canonical(sourceLang),
    target_lang: canonical(targetLang),
  };

  console.log("translate request gidiyor", payload);

  const res = await fetch(`${API_BASE}/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errTxt = await res.text().catch(() => "");
    throw new Error(`Translate HTTP ${res.status}: ${errTxt || "unknown error"}`);
  }

  const data = await res.json().catch(() => ({}));
  console.log("translate response:", data);

  return (
    data?.translated_text ||
    data?.translation ||
    data?.translated ||
    data?.text ||
    ""
  );
}

function chooseVoiceForLang(code) {
  const synth = window.speechSynthesis;
  if (!synth) return null;

  const voices = synth.getVoices?.() || [];
  const bcp = langObj(code).bcp.toLowerCase();

  return (
    voices.find((v) => String(v.lang || "").toLowerCase() === bcp) ||
    voices.find((v) => String(v.lang || "").toLowerCase().startsWith(canonical(code))) ||
    voices[0] ||
    null
  );
}

function speakText(text, langCode) {
  const clean = String(text || "").trim();
  if (!clean || !window.speechSynthesis) return;

  try {
    window.speechSynthesis.cancel();
  } catch {}

  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = langObj(langCode).bcp;

  const voice = chooseVoiceForLang(langCode);
  if (voice) utter.voice = voice;

  utter.rate = 1;
  utter.pitch = 1;
  utter.volume = 1;

  window.speechSynthesis.speak(utter);
}

async function processTranslateAndSpeak(text) {
  const src = getSourceLang();
  const tgt = getTargetLang();
  const cleanText = String(text || "").trim();

  if (!cleanText) return;
  if (src === tgt) {
    setText(dom.targetText, cleanText);
    if (state.autoSpeak) speakText(cleanText, tgt);
    return;
  }
  if (state.translating) return;
  if (cleanText === state.lastTranslatedInput) return;

  state.translating = true;
  state.lastTranslatedInput = cleanText;
  setStatus("Çeviri yapılıyor...");

  try {
    const translated = await translateText(cleanText, src, tgt);
    setText(dom.targetText, translated || "");
    setStatus("Çeviri hazır");

    if (state.autoSpeak && translated) {
      speakText(translated, tgt);
    }
  } catch (err) {
    console.error("Çeviri hatası:", err);
    setStatus("Çeviri hatası oluştu.", true);
  } finally {
    state.translating = false;
  }
}

const debouncedTranslate = debounce(processTranslateAndSpeak, 600);

async function toggleRecording() {
  if (state.recording) {
    stopRecording();
    return;
  }

  const ok = await ensureReady();
  if (!ok) return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    setStatus("Bu cihazda canlı konuşma tanıma desteklenmiyor.", true);
    alert("Tarayıcı SpeechRecognition desteklemiyor.");
    return;
  }

  if (!state.recognition) {
    state.recognition = createRecognition();
  }

  if (!state.recognition) {
    setStatus("Ses tanıma başlatılamadı.", true);
    return;
  }

  state.recording = true;
  state.finalTranscript = "";
  state.interimTranscript = "";
  state.lastTranslatedInput = "";
  setText(dom.sourceText, "");
  setText(dom.targetText, "");
  syncMicUi();

  try {
    state.recognition.lang = langObj(getSourceLang()).bcp;
    state.recognition.start();
  } catch (err) {
    console.error("recognition start error:", err);
    state.recording = false;
    syncMicUi();
    setStatus("Kayıt başlatılamadı.", true);
    releaseMic();
  }
}

function stopRecording() {
  state.recording = false;
  syncMicUi();

  try {
    state.recognition?.stop?.();
  } catch (e) {
    console.warn("recognition stop uyarısı:", e);
  }

  releaseMic();
  setStatus("Durduruldu");
}

function swapLanguages() {
  const src = getSourceLang();
  const tgt = getTargetLang();

  if (dom.sourceLang) dom.sourceLang.value = tgt;
  if (dom.targetLang) dom.targetLang.value = src;

  persistLangs();
  updateLangLabels();

  const srcText = getText(dom.sourceText);
  const tgtText = getText(dom.targetText);

  setText(dom.sourceText, tgtText);
  setText(dom.targetText, srcText);

  if (state.recognition) {
    state.recognition.lang = langObj(getSourceLang()).bcp;
  }
}

function clearAll() {
  state.finalTranscript = "";
  state.interimTranscript = "";
  state.lastTranslatedInput = "";
  setText(dom.sourceText, "");
  setText(dom.targetText, "");
  setStatus("Temizlendi");
}

function bindEvents() {
  if (dom.recordBtn) {
    dom.recordBtn.addEventListener("click", toggleRecording);
  }

  if (dom.stopBtn) {
    dom.stopBtn.addEventListener("click", stopRecording);
  }

  if (dom.swapBtn) {
    dom.swapBtn.addEventListener("click", swapLanguages);
  }

  if (dom.clearBtn) {
    dom.clearBtn.addEventListener("click", clearAll);
  }

  if (dom.speakBtn) {
    dom.speakBtn.addEventListener("click", () => {
      speakText(getText(dom.targetText), getTargetLang());
    });
  }

  if (dom.speakSourceBtn) {
    dom.speakSourceBtn.addEventListener("click", () => {
      speakText(getText(dom.sourceText), getSourceLang());
    });
  }

  if (dom.sourceLang) {
    dom.sourceLang.addEventListener("change", () => {
      persistLangs();
      if (state.recognition) {
        state.recognition.lang = langObj(getSourceLang()).bcp;
      }
    });
  }

  if (dom.targetLang) {
    dom.targetLang.addEventListener("change", () => {
      persistLangs();
    });
  }

  if (dom.autoSpeak) {
    dom.autoSpeak.addEventListener("change", () => {
      state.autoSpeak = !!dom.autoSpeak.checked;
      localStorage.setItem(STORAGE.AUTO_SPEAK, state.autoSpeak ? "1" : "0");
    });
  }

  if (dom.sourceText) {
    dom.sourceText.addEventListener(
      "input",
      debounce(() => {
        const txt = getText(dom.sourceText);
        if (txt) debouncedTranslate(txt);
      }, 500)
    );
  }

  window.addEventListener("beforeunload", () => {
    try {
      stopRecording();
    } catch {}
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.recording) {
      try {
        stopRecording();
      } catch {}
    }
  });
}

function safeBootVoices() {
  if (!window.speechSynthesis) return;
  try {
    window.speechSynthesis.getVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      try {
        window.speechSynthesis.getVoices();
      } catch {}
    };
  } catch {}
}

function silenceOnboardingCrash() {
  try {
    const oldOnError = window.onerror;
    window.onerror = function (msg, src, line, col, err) {
      const text = String(msg || err?.message || "");
      if (
        text.includes("Cannot set properties of null") &&
        String(src || "").includes("onboarding")
      ) {
        console.warn("onboarding null onclick hatası yutuldu.");
        return true;
      }
      if (typeof oldOnError === "function") {
        return oldOnError.apply(this, arguments);
      }
      return false;
    };
  } catch {}
}

async function init() {
  resolveDom();
  silenceOnboardingCrash();
  safeBootVoices();

  state.user = await getCurrentUserSafe();
  state.supportedRecognition = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  primeLanguageUI();
  bindEvents();
  syncMicUi();

  if (!dom.recordBtn) {
    console.warn("FaceToFace kayıt butonu bulunamadı.");
    setStatus("Kayıt butonu bulunamadı.", true);
    return;
  }

  setStatus(state.supportedRecognition ? "Hazır" : "Bu cihazda canlı konuşma desteklenmiyor.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
