// /js/facetoface_public.js

import { getLangPoolForSite } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const SITE_LANG_KEY = "site_lang";
const LEGACY_SITE_LANG_KEY = "italky_site_lang_v1";
const NATIVE_LANG_KEY = "italky_native_lang_v7";
const OFFLINE_INSTALLED_KEY = "italky_offline_installed_pairs_v7";

const PUBLIC_F2F_AD_LAST_KEY = "italkyai_public_f2f_last_ad_v4";
const PUBLIC_F2F_AD_INTERVAL_MS = 3 * 60 * 1000;

const TEXT_TRANSLATION_URL = "/pages/text_to_text.html";
const OFFLINE_LANGUAGES_URL = "/pages/offline_languages.html";

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

const UI = {
  tr: {
    download: "DİL İNDİR",
    clear: "TEMİZLE",
    textTranslate: "Yazıdan Çeviri",
    topLang: "ÜST DİL",
    botLang: "ALT DİL",
    offlineNeed: "İnternetsiz ortamda çeviri yapabilmek için dil paketi indirmeniz gereklidir.",
    online: "Online mod aktif.",
    offline: "Offline mod aktif.",
    noOffline: "Bu dil çifti için önce dil paketi indirmeniz gerekli.",
    micError: "Mikrofon hatası.",
    micDenied: "Mikrofon izni gerekli.",
    micUnsupported: "Bu cihazda konuşma algılama desteklenmiyor.",
    translateError: "Çeviri yapılamadı",
    typePlaceholder: "Yazıp gönder...",
    send: "Gönder",
    keyboard: "Yaz",
    adTitle: "Ücretsiz Kullanım",
    adText: "FaceToFace ücretsiz kullanımda reklam içerir. Devam etmek için kısa bir reklam izleyin.",
    watchAd: "Reklam İzle",
    close: "Şimdilik Kapat",
    adNeeded: "Reklam izlenmeden çeviri başlatılmadı.",
    adPreparing: "Reklam hazırlanıyor, devam edebilirsiniz.",
    adOpenError: "Reklam açılamadı, devam edebilirsiniz.",
    downloadAdTitle: "Dil Paketi İndirme",
    downloadAdText: "Bu dili internet olmadan kullanabilmek için dil paketini indirmeniz gerekir. İndirme sayfasına geçmeden önce kısa bir reklam izleyin.",
    downloadThisLang: "Bu dili indir",
    downloadIconTitle: "Offline dil paketini indir"
  },
  en: {
    download: "DOWNLOAD",
    clear: "CLEAR",
    textTranslate: "Text Translation",
    topLang: "TOP LANGUAGE",
    botLang: "BOTTOM LANGUAGE",
    offlineNeed: "To translate without internet, you need to download a language pack.",
    online: "Online mode is active.",
    offline: "Offline mode is active.",
    noOffline: "Please download this language pack first.",
    micError: "Microphone error.",
    micDenied: "Microphone permission is required.",
    micUnsupported: "Speech recognition is not supported on this device.",
    translateError: "Translation failed",
    typePlaceholder: "Type and send...",
    send: "Send",
    keyboard: "Type",
    adTitle: "Free Use",
    adText: "FaceToFace free use includes ads. Watch a short ad to continue.",
    watchAd: "Watch Ad",
    close: "Close",
    adNeeded: "Translation was not started without watching the ad.",
    adPreparing: "Ad is preparing, you can continue.",
    adOpenError: "Ad could not open, you can continue.",
    downloadAdTitle: "Language Pack Download",
    downloadAdText: "To use this language without internet, you need to download its offline pack. Watch a short ad before opening the download page.",
    downloadThisLang: "Download this language",
    downloadIconTitle: "Download offline language pack"
  }
};

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim();
}

function getSiteLang() {
  return canonical(
    localStorage.getItem(SITE_LANG_KEY) ||
      localStorage.getItem(LEGACY_SITE_LANG_KEY) ||
      localStorage.getItem(NATIVE_LANG_KEY) ||
      navigator.language ||
      "tr"
  ) || "tr";
}

let botLang = "";
let topLang = "";

function getUiLang() {
  const c = canonical(botLang);
  return UI[c] ? c : "en";
}

function tx(key) {
  return UI[getUiLang()]?.[key] || UI.en[key] || key;
}

const SITE_LANG = getSiteLang();

const RAW_LANG_POOL = Array.isArray(getLangPoolForSite(SITE_LANG))
  ? getLangPoolForSite(SITE_LANG)
  : [];

const LANGS = RAW_LANG_POOL
  .map((l) => {
    const code = canonical(l.code);
    if (!code) return null;

    return {
      code,
      flag: l.flag || "🌐",
      name: l.name || l.tr_name || code.toUpperCase(),
      bcp: BCP[code] || `${code}-${String(code).toUpperCase()}`
    };
  })
  .filter(Boolean)
  .filter((item, index, arr) => {
    return arr.findIndex((x) => x.code === item.code) === index;
  })
  .sort((a, b) => {
    const priority = ["tr", "en", "de", "fr", "es", "it", "ar", "ru"];
    const ai = priority.indexOf(a.code);
    const bi = priority.indexOf(b.code);

    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    }

    return String(a.name || "").localeCompare(String(b.name || ""), SITE_LANG || "tr");
  });

function langExists(code) {
  return !!LANGS.find((x) => x.code === canonical(code));
}

function langObj(code) {
  const c = canonical(code);

  return LANGS.find((x) => x.code === c) || {
    code: c || "en",
    flag: "🌐",
    name: (c || "en").toUpperCase(),
    bcp: BCP[c] || "en-US"
  };
}

function labelChip(code) {
  const o = langObj(code);
  return `${o.flag} ${o.name}`;
}

function differentLang(base) {
  const b = canonical(base);

  const preferred =
    b === "tr"
      ? ["en", "de", "fr", "es", "it", "ar", "ru"]
      : ["tr", "en", "de", "fr", "es", "it", "ar", "ru"];

  for (const c of preferred) {
    if (c !== b && langExists(c)) return c;
  }

  return LANGS.find((l) => l.code !== b)?.code || "en";
}

function resolveInitialBotLang() {
  const raw = canonical(
    localStorage.getItem(NATIVE_LANG_KEY) ||
      localStorage.getItem(SITE_LANG_KEY) ||
      localStorage.getItem(LEGACY_SITE_LANG_KEY) ||
      navigator.language ||
      "tr"
  );

  if (langExists(raw)) return raw;
  if (langExists("tr")) return "tr";

  return LANGS[0]?.code || "tr";
}

const topBody = $("topBody");
const botBody = $("botBody");
const topMic = $("topMic");
const botMic = $("botMic");

const topLangBtn = $("topLangBtn");
const botLangBtn = $("botLangBtn");

const topModeToggle = $("topModeToggle");

const popTop = $("pop-top");
const popBot = $("pop-bot");
const listTop = $("list-top");
const listBot = $("list-bot");
const closeTop = $("close-top");
const closeBot = $("close-bot");

const topPopTitle = $("topPopTitle");
const botPopTitle = $("botPopTitle");

const clearBtn = $("clearBtn");
const downloadBtn = $("downloadBtn");
const loginBtnTop = $("loginBtnTop");

const adModal = $("adModal");
const adTitle = $("adTitle");
const adText = $("adText");
const watchAdBtn = $("watchAdBtn");
const closeAdBtn = $("closeAdBtn");

const toast = $("toast");

botLang = resolveInitialBotLang();
topLang = langExists("en") && botLang !== "en" ? "en" : differentLang(botLang);

if (topLang === botLang) {
  topLang = differentLang(botLang);
}

let runtimeMode = "online";
let recognizer = null;
let liveText = "";

function showToast(msg = "") {
  if (!toast) return;

  toast.textContent = String(msg || "");
  toast.classList.add("show");

  clearTimeout(window.__publicF2fToastTimer);
  window.__publicF2fToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function getLastAdTs() {
  return Number(localStorage.getItem(PUBLIC_F2F_AD_LAST_KEY) || "0") || 0;
}

function markAdWatchedNow() {
  localStorage.setItem(PUBLIC_F2F_AD_LAST_KEY, String(Date.now()));
}

function shouldShowTimedAd() {
  const last = getLastAdTs();
  if (!last) return true;
  return Date.now() - last >= PUBLIC_F2F_AD_INTERVAL_MS;
}

function showAdGate({
  title = tx("adTitle"),
  text = tx("adText"),
  force = false
} = {}) {
  return new Promise((resolve) => {
    if (!force && !shouldShowTimedAd()) {
      resolve(true);
      return;
    }

    if (!adModal || !watchAdBtn || !closeAdBtn) {
      markAdWatchedNow();
      resolve(true);
      return;
    }

    if (adTitle) adTitle.textContent = title;
    if (adText) adText.textContent = text;
    if (watchAdBtn) watchAdBtn.textContent = tx("watchAd");
    if (closeAdBtn) closeAdBtn.textContent = tx("close");

    adModal.classList.add("show");

    const clean = () => {
      watchAdBtn.onclick = null;
      closeAdBtn.onclick = null;
      adModal.classList.remove("show");
    };

    watchAdBtn.onclick = async () => {
      try {
        if (window.AndroidAdBridge?.showRewardedAd) {
          window.AndroidAdBridge.showRewardedAd("public_facetoface_3min");
        } else if (window.NativeAds?.showRewardedAd) {
          window.NativeAds.showRewardedAd("public_facetoface_3min");
        } else if (window.AdMobBridge?.showRewardedAd) {
          window.AdMobBridge.showRewardedAd("public_facetoface_3min");
        } else {
          showToast(tx("adPreparing"));
        }
      } catch {
        showToast(tx("adOpenError"));
      }

      markAdWatchedNow();
      clean();
      resolve(true);
    };

    closeAdBtn.onclick = () => {
      clean();
      resolve(false);
    };
  });
}

async function ensureAdBeforeTranslate() {
  if (!shouldShowTimedAd()) return true;

  const ok = await showAdGate({
    title: tx("adTitle"),
    text: tx("adText"),
    force: true
  });

  if (!ok) {
    showToast(tx("adNeeded"));
  }

  return ok;
}

async function ensureAdBeforeLanguageDownload(langCode) {
  const info = langObj(langCode);

  const ok = await showAdGate({
    title: tx("downloadAdTitle"),
    text: `${info.flag} ${info.name}\n\n${tx("downloadAdText")}`,
    force: true
  });

  if (!ok) {
    showToast(tx("adNeeded"));
  }

  return ok;
}

function getInstalledOfflinePairs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(OFFLINE_INSTALLED_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function hasInstalledOfflinePair(source, target) {
  const s = canonical(source);
  const t = canonical(target);
  const installed = getInstalledOfflinePairs();

  return !!installed[`${s}_${t}`] || !!installed[`${t}_${s}`];
}

function getNativeLangForDownload() {
  return canonical(
    localStorage.getItem(NATIVE_LANG_KEY) ||
      localStorage.getItem(SITE_LANG_KEY) ||
      localStorage.getItem(LEGACY_SITE_LANG_KEY) ||
      botLang ||
      "tr"
  ) || "tr";
}

function buildOfflineDownloadUrl(targetCode) {
  const source = getNativeLangForDownload();
  const target = canonical(targetCode);

  const url = new URL(OFFLINE_LANGUAGES_URL, window.location.origin);
  url.searchParams.set("source", source);
  url.searchParams.set("target", target);
  url.searchParams.set("from", "facetoface");

  return `${url.pathname}${url.search}`;
}

async function openOfflineDownloadAfterAd(langCode) {
  const code = canonical(langCode);
  if (!code) return;

  const ok = await ensureAdBeforeLanguageDownload(code);
  if (!ok) return;

  location.href = buildOfflineDownloadUrl(code);
}

function syncModeUi() {
  const online = runtimeMode === "online";

  if (!topModeToggle) return;

  topModeToggle.textContent = online ? "ONLINE" : "OFFLINE";
  topModeToggle.classList.toggle("online", online);
  topModeToggle.classList.toggle("offline", !online);
}

function setMode(next) {
  runtimeMode = next === "offline" ? "offline" : "online";
  syncModeUi();

  if (runtimeMode === "offline") {
    if (!hasInstalledOfflinePair(topLang, botLang)) {
      showToast(tx("noOffline"));
    } else {
      showToast(tx("offline"));
    }
  } else {
    showToast(tx("online"));
  }
}

function toggleMode() {
  setMode(runtimeMode === "online" ? "offline" : "online");
}

topModeToggle?.addEventListener("click", toggleMode);

function refreshStaticTexts() {
  if (downloadBtn) downloadBtn.textContent = tx("download");
  if (clearBtn) clearBtn.textContent = tx("clear");

  if (loginBtnTop) {
    loginBtnTop.textContent = tx("textTranslate");
    loginBtnTop.setAttribute("aria-label", tx("textTranslate"));
    loginBtnTop.setAttribute("title", tx("textTranslate"));
  }

  if (topPopTitle) topPopTitle.textContent = tx("topLang");
  if (botPopTitle) botPopTitle.textContent = tx("botLang");

  document.querySelectorAll("[data-f2f-text-input]").forEach((input) => {
    input.setAttribute("placeholder", tx("typePlaceholder"));
  });

  document.querySelectorAll("[data-f2f-send-btn]").forEach((btn) => {
    btn.textContent = tx("send");
  });

  document.querySelectorAll("[data-f2f-keyboard-btn]").forEach((btn) => {
    btn.textContent = "⌨️";
    btn.setAttribute("title", tx("keyboard"));
    btn.setAttribute("aria-label", tx("keyboard"));
  });

  document.querySelectorAll("[data-f2f-download-lang]").forEach((btn) => {
    btn.setAttribute("title", tx("downloadIconTitle"));
    btn.setAttribute("aria-label", tx("downloadIconTitle"));
  });
}

function refreshLangLabels() {
  if (topLangBtn) topLangBtn.textContent = labelChip(topLang);
  if (botLangBtn) botLangBtn.textContent = labelChip(botLang);

  refreshStaticTexts();
}

function closeAllPop() {
  popTop?.classList.remove("show");
  popBot?.classList.remove("show");
}

function renderPop(side) {
  const list = side === "top" ? listTop : listBot;
  const selected = side === "top" ? topLang : botLang;

  if (!list) return;

  list.innerHTML = LANGS.map((l) => {
    const active = l.code === selected ? "active" : "";
    const installedClass = hasInstalledOfflinePair(l.code, side === "top" ? botLang : topLang)
      ? "installed"
      : "";

    return `
      <div class="pop-item ${active}" data-code="${l.code}">
        <div class="pop-left" data-select-lang="${l.code}">
          <div class="pop-flag">${l.flag}</div>
          <div class="pop-name">${l.name}</div>
        </div>

        <div class="pop-actions">
          <div class="pop-code">${l.code.toUpperCase()}</div>
          <button
            class="pop-download-btn ${installedClass}"
            type="button"
            data-f2f-download-lang="${l.code}"
            title="${tx("downloadIconTitle")}"
            aria-label="${tx("downloadIconTitle")}"
          >
            ⬇️
          </button>
        </div>
      </div>
    `;
  }).join("");

  list.querySelectorAll("[data-select-lang]").forEach((el) => {
    el.addEventListener("click", () => {
      const code = canonical(el.dataset.selectLang);

      if (side === "top") {
        topLang = code;

        if (topLang === botLang) {
          botLang = differentLang(topLang);
        }
      } else {
        botLang = code;

        if (botLang === topLang) {
          topLang = differentLang(botLang);
        }
      }

      refreshLangLabels();
      closeAllPop();

      if (runtimeMode === "offline" && !hasInstalledOfflinePair(topLang, botLang)) {
        showToast(tx("noOffline"));
      }
    });
  });

  list.querySelectorAll("[data-f2f-download-lang]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const code = canonical(btn.getAttribute("data-f2f-download-lang"));
      await openOfflineDownloadAfterAd(code);
    });
  });
}

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

closeTop?.addEventListener("click", closeAllPop);
closeBot?.addEventListener("click", closeAllPop);

document.addEventListener(
  "click",
  (e) => {
    const inside =
      popTop?.contains(e.target) ||
      popBot?.contains(e.target) ||
      e.target?.closest?.("#topLangBtn,#botLangBtn");

    if (!inside) closeAllPop();
  },
  { capture: true }
);

downloadBtn?.addEventListener("click", async (e) => {
  e.preventDefault();

  const code = topLang && topLang !== botLang ? topLang : differentLang(botLang);
  await openOfflineDownloadAfterAd(code);
});

loginBtnTop?.addEventListener("click", (e) => {
  e.preventDefault();
  location.href = TEXT_TRANSLATION_URL;
});

function clearBody(body) {
  if (!body) return;
  body.innerHTML = "";
}

function addBubble(side, text, latest = false) {
  const body = side === "top" ? topBody : botBody;

  if (!body) return null;

  if (latest) {
    body.querySelectorAll(".bubble.latest").forEach((x) => {
      x.classList.remove("latest");
    });
  }

  const div = document.createElement("div");
  div.className = `bubble${latest ? " latest" : ""}`;
  div.textContent = String(text || "").trim();

  body.appendChild(div);

  const scroll = () => {
    try {
      body.scrollTop = body.scrollHeight;
    } catch {}
  };

  scroll();
  requestAnimationFrame(scroll);
  setTimeout(scroll, 60);

  return div;
}

function setMicState(side, listening) {
  const mic = side === "top" ? topMic : botMic;
  mic?.classList.toggle("listening", !!listening);
}

function buildRecognizer(langCode) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) return null;

  const rec = new SR();

  rec.lang = langObj(langCode).bcp;
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  return rec;
}

function stopRecognizer() {
  try {
    recognizer?.stop?.();
  } catch {}
}

async function translateOnline(text, from, to) {
  const endpoints = [
    `${API_BASE}/api/translate_ai`,
    `${API_BASE}/api/translate-ai`,
    `${API_BASE}/api/translate`
  ];

  for (const endpoint of endpoints) {
    try {
      const r = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: String(text || "").trim(),
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
      const value = String(j?.translated || j?.translation || j?.text || "").trim();

      if (r.ok && value) return value;
    } catch {}
  }

  return null;
}

function translateOffline(text, from, to) {
  return new Promise((resolve) => {
    if (!window.OfflineTranslate?.translate) {
      resolve(null);
      return;
    }

    const handler = (e) => {
      window.removeEventListener("offlineTranslateResult", handler);

      const value = String(e.detail?.translatedText || "").trim();
      resolve(value || null);
    };

    window.addEventListener("offlineTranslateResult", handler);

    try {
      window.OfflineTranslate.translate(
        JSON.stringify({
          text: String(text || "").trim(),
          from: canonical(from),
          to: canonical(to)
        })
      );
    } catch {
      window.removeEventListener("offlineTranslateResult", handler);
      resolve(null);
    }
  });
}

async function translateText(text, from, to) {
  if (runtimeMode === "offline") {
    if (!hasInstalledOfflinePair(from, to)) {
      showToast(tx("noOffline"));
      return null;
    }

    const offline = await translateOffline(text, from, to);

    if (offline) return offline;

    showToast(tx("translateError"));
    return null;
  }

  return await translateOnline(text, from, to);
}

function speak(text, langCode) {
  const value = String(text || "").trim();

  if (!value) return;

  try {
    window.speechSynthesis?.cancel?.();

    if (window.NativeTTS?.speak) {
      window.NativeTTS.speak(value, canonical(langCode));
      return;
    }

    const u = new SpeechSynthesisUtterance(value);
    u.lang = langObj(langCode).bcp;
    u.rate = 0.95;

    speechSynthesis.speak(u);
  } catch {}
}

function cleanupTranscript(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\b(\S+)( \1\b)+/gi, "$1")
    .trim();
}

async function finalizeSpeech(side, text) {
  const clean = cleanupTranscript(text);

  if (!clean) return;

  const adOk = await ensureAdBeforeTranslate();

  if (!adOk) {
    showToast(tx("adNeeded"));
    return;
  }

  const src = side === "top" ? topLang : botLang;
  const dst = side === "top" ? botLang : topLang;
  const other = side === "top" ? "bot" : "top";

  addBubble(side, clean, false);

  const targetRow = addBubble(other, "", true);
  const translated = await translateText(clean, src, dst);

  if (!translated) {
    if (targetRow) targetRow.textContent = tx("translateError");
    return;
  }

  if (targetRow) targetRow.textContent = translated;

  speak(translated, dst);
}

function startRecording(side) {
  if (recognizer) {
    stopRecognizer();
    return;
  }

  const sourceLang = side === "top" ? topLang : botLang;
  const rec = buildRecognizer(sourceLang);

  if (!rec) {
    showToast(tx("micUnsupported"));
    return;
  }

  recognizer = rec;
  liveText = "";

  rec.onstart = () => {
    setMicState(side, true);
  };

  rec.onresult = (e) => {
    let finalText = "";
    let interimText = "";

    for (let i = 0; i < e.results.length; i++) {
      const txt = String(e.results[i]?.[0]?.transcript || "").trim();

      if (!txt) continue;

      if (e.results[i].isFinal) {
        finalText += ` ${txt}`;
      } else {
        interimText += ` ${txt}`;
      }
    }

    liveText = cleanupTranscript(finalText || interimText || liveText);
  };

  rec.onerror = (e) => {
    const err = String(e?.error || "");

    if (err.includes("not-allowed")) {
      showToast(tx("micDenied"));
    } else {
      showToast(tx("micError"));
    }

    setMicState(side, false);
    recognizer = null;
    liveText = "";
  };

  rec.onend = () => {
    const finalText = cleanupTranscript(liveText);

    setMicState(side, false);
    recognizer = null;
    liveText = "";

    if (finalText) {
      finalizeSpeech(side, finalText);
    }
  };

  try {
    rec.start();
  } catch {
    showToast(tx("micError"));
    setMicState(side, false);
    recognizer = null;
    liveText = "";
  }
}

function injectDesignCssOnce() {
  if (document.getElementById("f2fPublicDesignCss")) return;

  const style = document.createElement("style");
  style.id = "f2fPublicDesignCss";
  style.textContent = `
    .pop-item{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
    }

    .pop-left{
      flex:1;
      min-width:0;
      cursor:pointer;
    }

    .pop-actions{
      display:flex;
      align-items:center;
      gap:8px;
      flex-shrink:0;
    }

    .pop-download-btn{
      width:34px;
      height:34px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,.18);
      background:rgba(255,255,255,.08);
      color:#fff;
      display:flex;
      align-items:center;
      justify-content:center;
      cursor:pointer;
      font-size:15px;
      backdrop-filter:blur(12px);
      -webkit-backdrop-filter:blur(12px);
    }

    .pop-download-btn.installed{
      opacity:.55;
    }

    .f2f-type-wrap{
      display:flex;
      align-items:center;
      gap:8px;
      width:100%;
      padding:8px;
      box-sizing:border-box;
    }

    .f2f-type-wrap.top{
      transform:rotate(180deg);
    }

    .f2f-type-toggle{
      border:1px solid rgba(255,255,255,.18);
      background:rgba(255,255,255,.08);
      color:#fff;
      border-radius:999px;
      min-width:42px;
      height:42px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:18px;
      cursor:pointer;
      backdrop-filter:blur(12px);
      -webkit-backdrop-filter:blur(12px);
    }

    .f2f-type-panel{
      display:none;
      align-items:center;
      gap:8px;
      flex:1;
      min-width:0;
    }

    .f2f-type-panel.show{
      display:flex;
    }

    .f2f-type-input{
      flex:1;
      min-width:0;
      height:42px;
      border-radius:999px;
      border:1px solid rgba(255,255,255,.18);
      outline:none;
      padding:0 14px;
      background:rgba(3,7,18,.72);
      color:#fff;
      font-size:14px;
      box-sizing:border-box;
    }

    .f2f-type-input::placeholder{
      color:rgba(255,255,255,.55);
    }

    .f2f-type-send{
      height:42px;
      border:none;
      border-radius:999px;
      padding:0 14px;
      background:linear-gradient(135deg,#22d3ee,#6366f1);
      color:#fff;
      font-weight:800;
      cursor:pointer;
      white-space:nowrap;
    }
  `;

  document.head.appendChild(style);
}

function findMicMount(side) {
  const mic = side === "top" ? topMic : botMic;

  if (!mic) return null;

  return mic.parentElement || mic;
}

function createTypingControls(side) {
  const mount = findMicMount(side);
  const mic = side === "top" ? topMic : botMic;

  if (!mount || !mic) return;

  if (mount.querySelector(`[data-f2f-type-wrap="${side}"]`)) return;

  const wrap = document.createElement("div");
  wrap.className = `f2f-type-wrap ${side}`;
  wrap.dataset.f2fTypeWrap = side;

  const keyboardBtn = document.createElement("button");
  keyboardBtn.type = "button";
  keyboardBtn.className = "f2f-type-toggle";
  keyboardBtn.dataset.f2fKeyboardBtn = side;
  keyboardBtn.textContent = "⌨️";

  const panel = document.createElement("div");
  panel.className = "f2f-type-panel";
  panel.dataset.f2fTypePanel = side;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "f2f-type-input";
  input.dataset.f2fTextInput = side;
  input.autocomplete = "off";
  input.enterKeyHint = "send";

  const send = document.createElement("button");
  send.type = "button";
  send.className = "f2f-type-send";
  send.dataset.f2fSendBtn = side;

  panel.appendChild(input);
  panel.appendChild(send);

  wrap.appendChild(keyboardBtn);
  wrap.appendChild(panel);

  try {
    mount.appendChild(wrap);
  } catch {
    mic.insertAdjacentElement("afterend", wrap);
  }

  keyboardBtn.addEventListener("click", () => {
    panel.classList.toggle("show");

    if (panel.classList.contains("show")) {
      setTimeout(() => input.focus(), 80);
    }
  });

  const submit = async () => {
    const value = cleanupTranscript(input.value);

    if (!value) return;

    input.value = "";
    await finalizeSpeech(side, value);
  };

  send.addEventListener("click", submit);

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  });
}

function ensureTypingControls() {
  injectDesignCssOnce();
  createTypingControls("top");
  createTypingControls("bot");
  refreshStaticTexts();
}

topMic?.addEventListener("click", () => {
  startRecording("top");
});

botMic?.addEventListener("click", () => {
  startRecording("bot");
});

clearBtn?.addEventListener("click", () => {
  stopRecognizer();

  try {
    window.speechSynthesis?.cancel?.();
  } catch {}

  try {
    window.NativeTTS?.stop?.();
  } catch {}

  recognizer = null;
  liveText = "";

  topMic?.classList.remove("listening");
  botMic?.classList.remove("listening");

  clearBody(topBody);
  clearBody(botBody);
});

function boot() {
  refreshLangLabels();
  syncModeUi();
  clearBody(topBody);
  clearBody(botBody);
  ensureTypingControls();

  setTimeout(() => {
    showToast(tx("offlineNeed"));
  }, 800);
}

boot();
