import { supabase } from "/js/supabase_client.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";
import { LANG_POOL } from "/js/lang_pool_full.js";
import { mountShell } from "/js/ui_shell.js";

/* -------------------------
   SHELL
-------------------------- */
try {
  mountShell({ scroll: "none" });
} catch (e) {
  console.error("ui_shell HATASI:", e);
}

/* -------------------------
   DOM
-------------------------- */
const $ = (id) => document.getElementById(id);

const fromBtn = $("fromBtn");
const toBtn = $("toBtn");
const btnSwap = $("btnSwap");

const fromFlag = $("fromFlag");
const toFlag = $("toFlag");
const fromName = $("fromName");
const toName = $("toName");

const srcTxt = $("srcTxt");
const dstTxt = $("dstTxt");

const btnMic = $("btnMic");
const btnSpeak = $("btnSpeak");
const btnTranslate = $("btnTranslate");

const langModal = $("langModal");
const modalClose = $("modalClose");
const langSearch = $("langSearch");
const langList = $("langList");
const modalModeTitle = $("modalModeTitle");
const toastEl = $("toast");

/* -------------------------
   CONFIG
-------------------------- */
const API_BASE = "https://italky-api.onrender.com";
const TRANSLATE_ENDPOINT = `${API_BASE}/api/translate`;
const TTS_ENDPOINT = `${API_BASE}/api/tts`;
const STT_ENDPOINT = `${API_BASE}/api/stt`;
const USAGE_SPEND_ENDPOINT = `${API_BASE}/api/usage/spend`;

/* -------------------------
   STATE
-------------------------- */
let modalMode = "from";
let fromLang = localStorage.getItem("qtt_from_lang") || "tr";
let toLang = localStorage.getItem("qtt_to_lang") || "en";
let ALL_LANGS = [];

let mediaRecorder = null;
let mediaChunks = [];
let mediaStream = null;
let mediaRecording = false;

/* -------------------------
   HELPERS
-------------------------- */
function canonical(code) {
  return String(code || "").trim().toLowerCase();
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
  clearTimeout(window.__textTranslateToast);
  window.__textTranslateToast = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 1700);
}

function setMicState(listening) {
  if (!btnMic) return;
  btnMic.classList.toggle("listening", !!listening);
  btnMic.textContent = listening ? "⏺️" : "🎙️";
}

/* -------------------------
   AUTH
-------------------------- */
async function requireLogin() {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session?.user) {
    location.replace("/pages/login.html");
    return false;
  }
  try { await ensureAuthAndCacheUser(); } catch {}
  return true;
}

/* -------------------------
   BILLING
-------------------------- */
async function spendUsage(moduleKey, usedChars) {
  const safeChars = Number(usedChars || 0);
  if (safeChars <= 0) {
    return { ok: true, charged_tokens: 0, remaining_chars: 0 };
  }

  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id || "";

  if (!userId) {
    toast("Önce giriş yapın.");
    throw new Error("no_user");
  }

  const r = await fetch(USAGE_SPEND_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      module_key: moduleKey,
      used_chars: safeChars
    })
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok) {
    if (r.status === 402) {
      toast("Jeton yetersiz. Jeton Market açılıyor.");
      location.href = "/pages/jetonbuy.html";
      throw new Error("insufficient_tokens");
    }
    throw new Error(j.detail || "usage_spend_failed");
  }

  return j;
}

/* -------------------------
   LANG DATA
-------------------------- */
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
  cs:"🇨🇿", sk:"🇸🇰", sl:"🇸🇮", hr:"🇭🇷", sr:"🇷🇸", bs:"🇧🇦", hu:"🇭🇺", fi:"🇫🇮", sv:"🇸🇪",
  no:"🇳🇴", da:"🇩🇰", is:"🇮🇸", et:"🇪🇪", lv:"🇱🇻", lt:"🇱🇹", az:"🇦🇿", ka:"🇬🇪", fa:"🇮🇷",
  hi:"🇮🇳", ur:"🇵🇰", bn:"🇧🇩", pa:"🇮🇳", ta:"🇮🇳", te:"🇮🇳", ml:"🇮🇳", mr:"🇮🇳", gu:"🇮🇳",
  kn:"🇮🇳", th:"🇹🇭", vi:"🇻🇳", id:"🇮🇩", ms:"🇲🇾", sw:"🇰🇪", he:"🇮🇱", iw:"🇮🇱", hy:"🇦🇲",
  be:"🇧🇾", kk:"🇰🇿", ky:"🇰🇬", uz:"🇺🇿", tk:"🇹🇲", mn:"🇲🇳"
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

      const trName = getTurkishName(item);

      return {
        code,
        flag: getFlag(code, item),
        trName,
        searchText: [
          code,
          trName,
          item?.name || "",
          item?.nativeName || "",
          item?.name_tr || "",
          item?.tr || ""
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
  fromName.textContent = fromObj.trName;
  toName.textContent = toObj.trName;

  localStorage.setItem("qtt_from_lang", canonical(fromLang));
  localStorage.setItem("qtt_to_lang", canonical(toLang));
}

/* -------------------------
   LANG MODAL
-------------------------- */
function renderLangList(query = "") {
  const q = String(query || "").trim().toLowerCase();
  const currentCode = modalMode === "from" ? canonical(fromLang) : canonical(toLang);

  const filtered = !q
    ? ALL_LANGS
    : ALL_LANGS.filter((item) => item.searchText.includes(q));

  if (!filtered.length) {
    langList.innerHTML = `<div class="empty-state">Aradığın dil bulunamadı. Biraz daha kısa yaz, dil seni görmemiş olabilir.</div>`;
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

      if (modalMode === "from") {
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
      closeLangModal();
    });
  });
}

function openLangModal(mode) {
  modalMode = mode === "to" ? "to" : "from";
  modalModeTitle.textContent = modalMode === "from" ? "Kaynak Dil" : "Hedef Dil";
  langModal.classList.add("show");
  langModal.setAttribute("aria-hidden", "false");
  langSearch.value = "";
  renderLangList("");
  setTimeout(() => langSearch.focus(), 40);
}

function closeLangModal() {
  langModal.classList.remove("show");
  langModal.setAttribute("aria-hidden", "true");
}

/* -------------------------
   SPEAK
-------------------------- */
let audio = null;
let speakCtl = null;
let speakToken = 0;
let lastClickAt = 0;

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

function speakNativeFallback(text, langCode) {
  const t = String(text || "").trim();
  if (!t) return false;

  if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
    try { window.NativeTTS.stop?.(); } catch {}
    setTimeout(() => {
      try { window.NativeTTS.speak(t, String(langCode || "en")); } catch {}
    }, 100);
    return true;
  }

  if (!window.speechSynthesis) return false;

  try { window.speechSynthesis.cancel(); } catch {}
  const u = new SpeechSynthesisUtterance(t);
  u.lang = String(langCode || "en");
  u.rate = 1;
  u.pitch = 1;
  u.volume = 1;

  setTimeout(() => {
    try { window.speechSynthesis.speak(u); } catch {}
  }, 60);

  return true;
}

async function speakText(text, langCode) {
  const now = Date.now();
  if (now - lastClickAt < 180) return;
  lastClickAt = now;

  const t = String(text || "").trim();
  if (!t || t === "...") return;

  stopSpeak();

  const myToken = ++speakToken;

  btnSpeak.style.pointerEvents = "none";
  setTimeout(() => {
    btnSpeak.style.pointerEvents = "auto";
  }, 250);

  try {
    speakCtl = new AbortController();

    const r = await fetch(TTS_ENDPOINT, {
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

      if (myToken !== speakToken) return;
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

/* -------------------------
   MIC
-------------------------- */
function stopMediaStream() {
  try {
    mediaStream?.getTracks?.().forEach((track) => track.stop());
  } catch {}
  mediaStream = null;
}

function browserSpeechSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

function mediaRecorderSupported() {
  return !!(navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined");
}

async function startBrowserSpeechRecognition() {
  return new Promise((resolve) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      resolve(false);
      return;
    }

    let recognition;
    try {
      recognition = new SR();
      recognition.lang = canonical(fromLang);
      recognition.interimResults = false;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
    } catch {
      resolve(false);
      return;
    }

    let finished = false;
    const done = (ok) => {
      if (finished) return;
      finished = true;
      setMicState(false);
      resolve(ok);
    };

    recognition.onresult = async (e) => {
      const t = e.results?.[0]?.[0]?.transcript || "";
      const txt = String(t || "").trim();
      if (txt) {
        srcTxt.value = txt;
        await translateText();
      }
    };

    recognition.onerror = () => done(false);
    recognition.onend = () => done(true);

    try {
      setMicState(true);
      recognition.start();
    } catch {
      done(false);
    }
  });
}

async function startMediaRecorderFlow() {
  if (!mediaRecorderSupported()) {
    toast("Bu cihazda mikrofon özelliği desteklenmiyor.");
    return;
  }

  if (!mediaRecording) {
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(mediaStream);
      mediaChunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data?.size) mediaChunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setMicState(false);
        mediaRecording = false;

        const blob = new Blob(mediaChunks, { type: "audio/webm" });
        const fd = new FormData();
        fd.append("file", blob, "speech.webm");
        fd.append("lang", canonical(fromLang));

        srcTxt.value = "Dinleniyor...";

        try {
          const r = await fetch(STT_ENDPOINT, {
            method: "POST",
            body: fd
          });

          const j = await r.json().catch(() => ({}));
          const text = String(j?.text || "").trim();

          if (text) {
            srcTxt.value = text;
            await translateText();
          } else {
            srcTxt.value = "";
            toast("Ses çözümlenemedi.");
          }
        } catch (e) {
          console.error("stt error", e);
          srcTxt.value = "";
          toast("Ses çözümlenemedi.");
        } finally {
          stopMediaStream();
        }
      };

      mediaRecorder.start();
      mediaRecording = true;
      setMicState(true);
    } catch (e) {
      console.error("mic permission error", e);
      stopMediaStream();
      setMicState(false);
      toast("Mikrofon izni gerekli.");
    }
    return;
  }

  try {
    mediaRecorder.stop();
  } catch {
    mediaRecording = false;
    setMicState(false);
    stopMediaStream();
  }
}

async function handleMic() {
  if (mediaRecording) {
    await startMediaRecorderFlow();
    return;
  }

  if (browserSpeechSupported()) {
    const ok = await startBrowserSpeechRecognition();
    if (ok) return;
  }

  await startMediaRecorderFlow();
}

/* -------------------------
   TRANSLATE
-------------------------- */
async function translateText() {
  const text = String(srcTxt.value || "").trim();

  if (!text) {
    dstTxt.textContent = "...";
    toast("Önce çevrilecek bir metin yaz.");
    return;
  }

  btnTranslate.disabled = true;
  btnTranslate.textContent = "✨ ÇEVRİLİYOR...";
  dstTxt.style.opacity = "0.45";
  dstTxt.textContent = "Çevriliyor...";

  try {
    const body = {
      text,
      source: canonical(fromLang),
      target: canonical(toLang),
      from_lang: canonical(fromLang),
      to_lang: canonical(toLang)
    };

    const r = await fetch(TRANSLATE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const raw = await r.text().catch(() => "");
    if (!r.ok) {
      console.warn("translate fail", r.status, raw);
      dstTxt.textContent = "⚠️ Çeviri şu an yapılamadı.";
      return;
    }

    let data = {};
    try { data = JSON.parse(raw); } catch { data = {}; }

    const out = String(data?.translated || data?.translation || data?.text || "").trim();

    if (!out) {
      dstTxt.textContent = "⚠️ Çeviri şu an yapılamadı.";
      return;
    }

    await spendUsage("text", out.length);

    dstTxt.textContent = out;

    setTimeout(() => {
      speakText(out, canonical(toLang));
    }, 160);
  } catch (e) {
    console.warn(e);
    if (String(e?.message || "") !== "insufficient_tokens") {
      dstTxt.textContent = "⚠️ Çeviri şu an yapılamadı.";
    }
  } finally {
    dstTxt.style.opacity = "1";
    btnTranslate.disabled = false;
    btnTranslate.textContent = "✨ ÇEVİR";
  }
}

/* -------------------------
   BIND
-------------------------- */
function bind() {
  fromBtn?.addEventListener("click", () => openLangModal("from"));
  toBtn?.addEventListener("click", () => openLangModal("to"));

  btnSwap?.addEventListener("click", () => {
    const a = fromLang;
    const b = toLang;
    fromLang = b;
    toLang = a;
    renderTopLanguageButtons();
    toast("Diller değiştirildi");
  });

  modalClose?.addEventListener("click", closeLangModal);

  langModal?.addEventListener("click", (e) => {
    if (e.target === langModal) closeLangModal();
  });

  langSearch?.addEventListener("input", (e) => {
    renderLangList(e.target.value || "");
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && langModal?.classList.contains("show")) {
      closeLangModal();
    }
  });

  btnTranslate?.addEventListener("click", translateText);

  srcTxt?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      translateText();
    }
  });

  btnMic?.addEventListener("click", handleMic);

  btnSpeak?.addEventListener("click", () => {
    const t = String(dstTxt.textContent || "").trim();
    if (t && t !== "...") {
      speakText(t, canonical(toLang));
    }
  });
}

/* -------------------------
   BOOT
-------------------------- */
document.addEventListener("DOMContentLoaded", async () => {
  if (!(await requireLogin())) return;

  ALL_LANGS = sanitizeLangPool();
  ensureValidLanguages();
  renderTopLanguageButtons();
  renderLangList("");
  bind();

  dstTxt.textContent = "...";
  setMicState(false);
});

window.addEventListener("beforeunload", () => {
  stopSpeak();
  stopMediaStream();
  try { mediaRecorder?.stop?.(); } catch {}
});
