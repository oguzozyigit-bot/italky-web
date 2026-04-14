import { supabase } from "/js/supabase_client.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";
import { LANG_POOL } from "/js/lang_pool_full.js";
import { mountShell } from "/js/ui_shell.js";
import {
  getOfflineStatus,
  setMockOfflineLicense,
  downloadOfflineModel,
  translateOffline
} from "/js/offline_translate_bridge.js";

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
const btnOfflineModel = $("btnOfflineModel");

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

/* -------------------------
   STATE
-------------------------- */
let modalMode = "from";
let fromLang = localStorage.getItem("qtt_from_lang") || "tr";
let toLang = localStorage.getItem("qtt_to_lang") || "en";
let ALL_LANGS = [];

let activeMode = "standard";
let audio = null;
let speakCtl = null;
let speakToken = 0;
let lastClickAt = 0;

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
  console.log("[toast]", msg);
  if (!toastEl) {
    alert(String(msg || ""));
    return;
  }
  toastEl.textContent = String(msg || "");
  toastEl.classList.add("show");
  clearTimeout(window.__textTranslateToast);
  window.__textTranslateToast = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2200);
}

function setOutputText(text) {
  if (!dstTxt) return;
  dstTxt.textContent = String(text || "");
}

function getSourceText() {
  if (!srcTxt) return "";
  return String(srcTxt.value || "").trim();
}

function hasOfflineBridge() {
  return !!window.OfflineTranslate;
}

function ensureMockOfflineLicenseOnce() {
  if (!hasOfflineBridge()) return;

  const key = "italky_offline_mock_license_set_v1";
  if (localStorage.getItem(key) === "1") return;

  try {
    setMockOfflineLicense(30);
    localStorage.setItem(key, "1");
    console.log("Mock lisans yazıldı");
  } catch (e) {
    console.warn("Mock lisans yazılamadı:", e);
  }
}

function readOfflineStatusSafe() {
  try {
    return getOfflineStatus();
  } catch (e) {
    console.error("offline status error:", e);
    return { ok: false, error: "offline_status_failed" };
  }
}

function waitForCustomEventOnce(eventName, timeoutMs = 45000) {
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
  if (!hasOfflineBridge()) throw new Error("offline_bridge_missing");

  const waiter = waitForCustomEventOnce("offlineModelDownloadResult", 60000);
  downloadOfflineModel(from, to, wifiOnly);
  const detail = await waiter;

  if (!detail?.ok) {
    throw new Error(detail?.error || "offline_model_download_failed");
  }

  return detail;
}

async function requestOfflineTranslate(from, to, text) {
  if (!hasOfflineBridge()) throw new Error("offline_bridge_missing");

  const waiter = waitForCustomEventOnce("offlineTranslateResult", 45000);
  translateOffline(from, to, text);
  const detail = await waiter;

  if (!detail?.ok) {
    throw new Error(detail?.error || "offline_translate_failed");
  }

  return String(detail?.translatedText || "").trim();
}

async function manualDownloadOfflineCurrentModel() {
  if (!hasOfflineBridge()) {
    toast("Offline köprüsü bulunamadı.");
    return;
  }

  const status = readOfflineStatusSafe();
  console.log("offline status:", status);

  if (!status?.licenseValid) {
    toast("Offline lisans yok veya süresi dolmuş.");
    return;
  }

  const from = canonical(fromLang);
  const to = canonical(toLang);

  try {
    toast("Offline model indiriliyor...");
    await requestOfflineModelDownload(from, to, false);
    toast(`Offline model hazır: ${from.toUpperCase()} → ${to.toUpperCase()}`);
  } catch (e) {
    console.error("model download error:", e);
    toast(`Offline model indirilemedi: ${e?.message || "bilinmeyen hata"}`);
  }
}

async function translateText() {
  const text = getSourceText();

  if (!text) {
    setOutputText("...");
    toast("Önce çevrilecek bir metin yaz.");
    return;
  }

  const from = canonical(fromLang);
  const to = canonical(toLang);

  try {
    const status = readOfflineStatusSafe();
    if (!status?.licenseValid) {
      toast("Offline lisans yok veya süresi dolmuş.");
      return;
    }

    setOutputText("Çevriliyor...");
    const out = await requestOfflineTranslate(from, to, text);

    if (!out) {
      setOutputText("⚠️ Çeviri alınamadı.");
      return;
    }

    setOutputText(out);
  } catch (e) {
    console.error("offline translate error:", e);
    setOutputText("⚠️ Çeviri şu an yapılamadı.");
    toast(`Çeviri hatası: ${e?.message || "bilinmeyen hata"}`);
  }
}

/* -------------------------
   TTS
-------------------------- */
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

  try {
    speakCtl = new AbortController();

    const r = await fetch(`${API_BASE}/api/tts`, {
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

/* -------------------------
   AUTH
-------------------------- */
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

  if (fromFlag) fromFlag.textContent = fromObj.flag;
  if (toFlag) toFlag.textContent = toObj.flag;
  if (fromName) fromName.textContent = fromObj.trName;
  if (toName) toName.textContent = toObj.trName;

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
    langList.innerHTML = `<div class="empty-state">Aradığın dil bulunamadı.</div>`;
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
  if (modalModeTitle) {
    modalModeTitle.textContent = modalMode === "from" ? "Kaynak Dil" : "Hedef Dil";
  }
  if (langModal) {
    langModal.classList.add("show");
    langModal.setAttribute("aria-hidden", "false");
  }
  if (langSearch) {
    langSearch.value = "";
    setTimeout(() => langSearch.focus(), 40);
  }
  renderLangList("");
}

function closeLangModal() {
  if (langModal) {
    langModal.classList.remove("show");
    langModal.setAttribute("aria-hidden", "true");
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

  btnTranslate?.addEventListener("click", async () => {
    await translateText();
  });

  btnOfflineModel?.addEventListener("click", async () => {
    toast("Offline butonu çalıştı");
    await manualDownloadOfflineCurrentModel();
  });

  btnSpeak?.addEventListener("click", () => {
    const t = String(dstTxt?.textContent || "").trim();
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

  setOutputText("...");
  ensureMockOfflineLicenseOnce();

  console.log("offline status:", readOfflineStatusSafe());
});
