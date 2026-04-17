import { supabase } from "/js/supabase_client.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";
import { LANG_POOL } from "/js/lang_pool_full.js";
import {
  getOfflineStatus,
  setMockOfflineLicense,
  downloadOfflineModel,
  translateOffline
} from "/js/offline_translate_bridge.js";

const $ = (id) => document.getElementById(id);

const frameRoot = $("frameRoot");

const fromBtn = $("fromBtn");
const toBtn = $("toBtn");
const swapBtn = $("swapBtn");
const fromFlag = $("fromFlag");
const toFlag = $("toFlag");
const fromText = $("fromText");
const toText = $("toText");

const offlineToggle = $("offlineToggle");
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
let capturedSpeech = "";

let offlineEnabled = localStorage.getItem("text_single_offline_enabled") === "1";
let soundEnabled = localStorage.getItem("text_single_sound_enabled") !== "0";

function canonical(code) {
  return String(code || "").trim().toLowerCase();
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

function setOutput(main, sub = "") {
  resultBubble.textContent = String(main || "");
  resultSub.textContent = String(sub || "");
  resultBubble.className = `bubble ${String(main || "").trim() && String(main || "").trim() !== "..." ? "latest" : "normal"}`;
  resultArea.scrollTop = resultArea.scrollHeight + 300;
}

function syncInputPreview() {
  inputPreviewBubble.textContent = normalizeText(inputBox.value);
}

function syncInputButtons() {
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

function stopSpeak() {
  try {
    if (speakCtl) speakCtl.abort();
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
  const voices = window.speechSynthesis?.getVoices?.() || [];
  return voices.find(v => String(v.lang || "").toLowerCase().startsWith(canonical(langCode))) ||
         voices.find(v => String(v.lang || "").toLowerCase().startsWith("en")) ||
         voices[0] ||
         null;
}

function speakNativeFallback(text, langCode) {
  const t = String(text || "").trim();
  if (!t) return false;

  if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
    try { window.NativeTTS.stop?.(); } catch {}
    setTimeout(() => {
      try { window.NativeTTS.speak(t, String(langCode || "en")); } catch {}
    }, 80);
    return true;
  }

  if (!window.speechSynthesis) return false;

  try { window.speechSynthesis.cancel(); } catch {}
  const u = new SpeechSynthesisUtterance(t);
  u.lang = String(langCode || "en");
  const voice = chooseWebVoice(langCode);
  if (voice) u.voice = voice;
  setTimeout(() => {
    try { window.speechSynthesis.speak(u); } catch {}
  }, 60);

  return true;
}

async function speakText(text, langCode) {
  if (!soundEnabled) return;
  const t = normalizeText(text);
  if (!t || t === "...") return;

  stopSpeak();
  const myToken = ++speakToken;

  try {
    speakCtl = new AbortController();

    const r = await fetch("https://italky-api.onrender.com/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: t,
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
      audio.onended = () => { if (myToken === speakToken) audio = null; };
      audio.onerror = () => { if (myToken === speakToken) audio = null; };
      await audio.play();
      return;
    }

    speakNativeFallback(t, canonical(langCode));
  } catch (e) {
    if (e?.name !== "AbortError") {
      speakNativeFallback(t, canonical(langCode));
    }
  }
}

function hasOfflineBridge() {
  return typeof translateOffline === "function" && typeof downloadOfflineModel === "function";
}

function ensureMockOfflineLicenseOnce() {
  if (!hasOfflineBridge()) return;

  const key = "italky_offline_mock_license_set_text_single_v3";
  if (localStorage.getItem(key) === "1") return;

  try {
    setMockOfflineLicense(30);
    localStorage.setItem(key, "1");
  } catch {}
}

function readOfflineStatusSafe() {
  try {
    return getOfflineStatus();
  } catch {
    return { ok: false, error: "offline_status_failed" };
  }
}

function waitForCustomEventOnce(eventName, timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    let done = false;

    const finish = (fn, value) => {
      if (done) return;
      done = true;
      window.removeEventListener(eventName, onEvent);
      clearTimeout(timer);
      fn(value);
    };

    const onEvent = (e) => {
      finish(resolve, e?.detail || {});
    };

    const timer = setTimeout(() => {
      finish(reject, new Error(`${eventName}_timeout`));
    }, timeoutMs);

    window.addEventListener(eventName, onEvent, { once: true });
  });
}

async function requestOfflineModelDownload(from, to, wifiOnly = false) {
  const waiter = waitForCustomEventOnce("offlineModelDownloadResult", 120000);
  downloadOfflineModel(from, to, wifiOnly);
  const detail = await waiter;

  if (!detail?.ok) {
    throw new Error(detail?.error || "offline_model_download_failed");
  }

  return detail;
}

async function requestOfflineTranslate(from, to, text) {
  const waiter = waitForCustomEventOnce("offlineTranslateResult", 120000);
  translateOffline(from, to, text);
  const detail = await waiter;

  if (!detail?.ok) {
    throw new Error(detail?.error || "offline_translate_failed");
  }

  return String(detail?.translatedText || "").trim();
}

async function ensureOfflineModelReady(from, to) {
  const status = readOfflineStatusSafe();
  if (!status?.licenseValid) throw new Error("offline_license_invalid");
  await requestOfflineModelDownload(from, to, false);
}

async function translateGoogleFree(text, from, to) {
  const params = new URLSearchParams({
    client: "gtx",
    sl: from,
    tl: to,
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
  ja:"🇯🇵", ko:"🇰🇷", pt:"🇵🇹", nl:"🇳🇱", el:"🇬🇷", uk:"🇺🇦", pl:"🇵🇱", ro:"🇷🇴", bg:"🇧🇬"
};

function getFlag(code, item) {
  return item?.flag || FLAG_MAP[canonical(code)] || "🌐";
}

function getTurkishName(item) {
  const code = canonical(item?.code);
  return (
    TURKISH_LANG_NAMES[code] ||
    item?.tr ||
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

      return {
        code,
        flag: getFlag(code, item),
        trName: getTurkishName(item),
        searchText: [
          code,
          getTurkishName(item),
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

  fromFlag.textContent = fromObj.flag;
  toFlag.textContent = toObj.flag;
  fromText.textContent = fromObj.trName;
  toText.textContent = toObj.trName;

  localStorage.setItem("text_single_from_lang", canonical(fromLang));
  localStorage.setItem("text_single_to_lang", canonical(toLang));
}

function renderToggles() {
  offlineToggle.classList.toggle("active", !!offlineEnabled);
  offlineToggle.classList.toggle("inactive", !offlineEnabled);

  soundToggle.classList.toggle("active", !!soundEnabled);
  soundToggle.classList.toggle("inactive", !soundEnabled);

  localStorage.setItem("text_single_offline_enabled", offlineEnabled ? "1" : "0");
  localStorage.setItem("text_single_sound_enabled", soundEnabled ? "1" : "0");
}

function renderLangList(query = "") {
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
  popoverTitle.textContent = popoverMode === "from" ? "Kaynak Dil Seç" : "Hedef Dil Seç";
  langPopover.classList.add("show");
  langSearch.value = "";
  renderLangList("");
  setTimeout(() => langSearch.focus(), 40);
}

function closeLangPopover() {
  langPopover.classList.remove("show");
}

async function manualDownloadOfflineCurrentModel() {
  if (!hasOfflineBridge()) {
    toast("Offline köprüsü bulunamadı.");
    return;
  }

  const status = readOfflineStatusSafe();
  if (!status?.licenseValid) {
    toast("Offline lisans yok veya süresi dolmuş.");
    return;
  }

  const from = canonical(fromLang);
  const to = canonical(toLang);

  try {
    toast(`Model indiriliyor: ${from.toUpperCase()} → ${to.toUpperCase()}`);
    await ensureOfflineModelReady(from, to);
    toast(`Offline model hazır: ${from.toUpperCase()} → ${to.toUpperCase()}`);
  } catch (e) {
    toast(`Model indirme hatası: ${e?.message || "bilinmeyen hata"}`);
  }
}

async function translateText() {
  const text = normalizeText(inputBox.value);
  if (!text) {
    setOutput("...", "");
    toast("Önce çevrilecek bir metin yaz.");
    return;
  }

  const myToken = ++lastTranslateToken;
  const from = canonical(fromLang);
  const to = canonical(toLang);

  frameRoot.classList.remove("is-ready", "is-error");
  frameRoot.classList.add("is-translating");
  setOutput("Çevriliyor...", text);

  try {
    let out = "";

    if (offlineEnabled) {
      if (!hasOfflineBridge()) throw new Error("offline_bridge_missing");
      out = await requestOfflineTranslate(from, to, text);
    } else {
      out = await translateGoogleFree(text, from, to);
    }

    if (myToken !== lastTranslateToken) return;

    setOutput(out, text);

    frameRoot.classList.remove("is-translating", "is-error");
    frameRoot.classList.add("is-ready");

    if (soundEnabled) {
      setTimeout(() => {
        speakText(out, to);
      }, 140);
    }
  } catch (e) {
    if (myToken !== lastTranslateToken) return;

    setOutput("⚠️ Çeviri şu an yapılamadı.", text);
    frameRoot.classList.remove("is-translating");
    frameRoot.classList.add("is-error");
    toast(`Çeviri hatası: ${e?.message || "bilinmeyen hata"}`);

    setTimeout(() => {
      frameRoot.classList.remove("is-error");
      frameRoot.classList.add("is-ready");
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
  try { recognizer?.stop(); } catch {}
  recognizer = null;
  listening = false;
  capturedSpeech = "";
  syncInputButtons();
}

function startRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    toast("Bu cihazda sesli giriş desteklenmiyor");
    return;
  }

  if (listening) {
    stopRecognition();
    return;
  }

  recognizer = new SR();
  recognizer.lang = "tr-TR";
  recognizer.interimResults = true;
  recognizer.continuous = false;
  recognizer.maxAlternatives = 1;

  recognizer.onstart = () => {
    listening = true;
    capturedSpeech = "";
    syncInputButtons();
  };

  recognizer.onresult = (e) => {
    const stableText = extractStableRecognitionText(e.results);
    capturedSpeech = stableText;
    inputBox.value = stableText;
    inputBox.style.height = "auto";
    inputBox.style.height = `${Math.min(inputBox.scrollHeight, 140)}px`;
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
  fromBtn.addEventListener("click", () => openLangPopover("from"));
  toBtn.addEventListener("click", () => openLangPopover("to"));

  swapBtn.addEventListener("click", () => {
    const oldFrom = fromLang;
    fromLang = toLang;
    toLang = oldFrom;
    renderTopLanguageButtons();
    toast("Diller değiştirildi");
  });

  popoverClose.addEventListener("click", closeLangPopover);
  langPopover.addEventListener("click", (e) => {
    if (e.target === langPopover) closeLangPopover();
  });

  langSearch.addEventListener("input", (e) => {
    renderLangList(e.target.value || "");
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && langPopover.classList.contains("show")) {
      closeLangPopover();
    }
  });

  offlineToggle.addEventListener("click", async () => {
    offlineEnabled = !offlineEnabled;
    renderToggles();

    if (offlineEnabled) {
      toast("Offline modu açıldı");
      try {
        await manualDownloadOfflineCurrentModel();
      } catch {}
    } else {
      toast("Offline modu kapatıldı");
    }
  });

  soundToggle.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    renderToggles();
    if (!soundEnabled) stopSpeak();
    toast(soundEnabled ? "Ses açıldı" : "Ses kapatıldı");
  });

  translateBtn.addEventListener("click", translateText);

  inputBox.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      translateText();
    }
  });

  inputBox.addEventListener("input", () => {
    inputBox.style.height = "auto";
    inputBox.style.height = `${Math.min(inputBox.scrollHeight, 140)}px`;
    syncInputPreview();
    syncInputButtons();
  });

  micBtn.addEventListener("click", startRecognition);

  homeLink.addEventListener("click", (e) => {
    e.preventDefault();
    location.href = "/pages/home.html";
  });

  homeBtn.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  clearBtn.addEventListener("click", () => {
    inputBox.value = "";
    inputBox.style.height = "auto";
    setOutput("...", "");
    syncInputPreview();
    stopSpeak();
    stopRecognition();
    frameRoot.classList.remove("is-translating", "is-error");
    frameRoot.classList.add("is-ready");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!(await requireLogin())) return;

  ALL_LANGS = sanitizeLangPool();
  ensureValidLanguages();
  renderTopLanguageButtons();
  renderToggles();
  bindEvents();

  setOutput("...", "");
  ensureMockOfflineLicenseOnce();

  inputBox.style.height = "auto";
  inputBox.removeAttribute("readonly");
  inputBox.disabled = false;
  syncInputPreview();
  syncInputButtons();
  frameRoot.classList.add("is-ready");
});

window.addEventListener("beforeunload", () => {
  stopSpeak();
  stopRecognition();
});
