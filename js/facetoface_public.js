import { getLangPoolForSite } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

const SITE_LANG_KEY = "site_lang";
const LEGACY_SITE_LANG_KEY = "italky_site_lang_v1";
const NATIVE_LANG_KEY = "italky_native_lang_v7";
const OFFLINE_INSTALLED_KEY = "italky_offline_installed_pairs_v7";
const PUBLIC_F2F_AD_KEY = "italkyai_public_f2f_ad_v1";

const BCP = {
  tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", it: "it-IT",
  es: "es-ES", ar: "ar-SA", ru: "ru-RU", bg: "bg-BG", pt: "pt-PT",
  zh: "zh-CN", ja: "ja-JP", ko: "ko-KR"
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
  .filter(Boolean);

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
  const preferred = b === "tr"
    ? ["en", "de", "fr", "es", "it", "ar", "ru"]
    : ["tr", "en", "de", "fr", "es", "it", "ar", "ru"];

  for (const c of preferred) {
    if (c !== b && langExists(c)) return c;
  }

  return LANGS.find((l) => l.code !== b)?.code || "en";
}

const topBody = $("topBody");
const botBody = $("botBody");
const topMic = $("topMic");
const botMic = $("botMic");

const topLangBtn = $("topLangBtn");
const botLangBtn = $("botLangBtn");
const topLangTxt = topLangBtn;
const botLangTxt = botLangBtn;

const topModeToggle = $("topModeToggle");
const botModeToggle = $("botModeToggle");

const popTop = $("pop-top");
const popBot = $("pop-bot");
const listTop = $("list-top");
const listBot = $("list-bot");
const closeTop = $("close-top");
const closeBot = $("close-bot");

const topMenuBtn = $("topMenuBtn");
const botMenuBtn = $("botMenuBtn");
const sideMenu = $("sideMenu");
const menuBackdrop = $("menuBackdrop");

const clearBtn = $("clearBtn");
const downloadBtn = $("downloadBtn");

const adModal = $("adModal");
const watchAdBtn = $("watchAdBtn");
const closeAdBtn = $("closeAdBtn");
const toast = $("toast");

let topLang = langExists("en") ? "en" : differentLang("tr");
let botLang = langExists("tr") ? "tr" : getSiteLang();

if (topLang === botLang) topLang = differentLang(botLang);

let runtimeMode = "online";
let recognizer = null;
let recordingSide = null;
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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function adWatchedToday() {
  return localStorage.getItem(PUBLIC_F2F_AD_KEY) === todayKey();
}

function markAdWatchedToday() {
  localStorage.setItem(PUBLIC_F2F_AD_KEY, todayKey());
}

function showAdBeforeTranslate() {
  return new Promise((resolve) => {
    if (adWatchedToday()) {
      resolve(true);
      return;
    }

    if (!adModal || !watchAdBtn || !closeAdBtn) {
      markAdWatchedToday();
      resolve(true);
      return;
    }

    adModal.classList.add("show");

    const clean = () => {
      watchAdBtn.onclick = null;
      closeAdBtn.onclick = null;
      adModal.classList.remove("show");
    };

    watchAdBtn.onclick = async () => {
      try {
        if (window.AndroidAdBridge?.showRewardedAd) {
          window.AndroidAdBridge.showRewardedAd("public_facetoface_daily");
        } else if (window.NativeAds?.showRewardedAd) {
          window.NativeAds.showRewardedAd("public_facetoface_daily");
        } else {
          showToast("Reklam sistemi hazır değil, bugünlük devam edebilirsiniz.");
        }
      } catch {}

      markAdWatchedToday();
      clean();
      resolve(true);
    };

    closeAdBtn.onclick = () => {
      clean();
      resolve(false);
    };
  });
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

function syncModeUi() {
  const online = runtimeMode === "online";

  [topModeToggle, botModeToggle].forEach((btn) => {
    if (!btn) return;
    btn.textContent = online ? "ONLINE" : "OFFLINE";
    btn.classList.toggle("online", online);
    btn.classList.toggle("offline", !online);
  });
}

function setMode(next) {
  runtimeMode = next === "offline" ? "offline" : "online";
  syncModeUi();

  if (runtimeMode === "offline") {
    if (!hasInstalledOfflinePair(topLang, botLang)) {
      showToast("Bu dil çifti için önce dil paketi indirmeniz gerekli.");
    } else {
      showToast("Offline mod aktif.");
    }
  } else {
    showToast("Online mod aktif.");
  }
}

function toggleMode() {
  setMode(runtimeMode === "online" ? "offline" : "online");
}

topModeToggle?.addEventListener("click", toggleMode);
botModeToggle?.addEventListener("click", toggleMode);

function refreshLangLabels() {
  if (topLangTxt) topLangTxt.textContent = labelChip(topLang);
  if (botLangTxt) botLangTxt.textContent = labelChip(botLang);
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
      const code = canonical(el.dataset.code);

      if (side === "top") {
        topLang = code;
        if (topLang === botLang) botLang = differentLang(topLang);
      } else {
        botLang = code;
        if (botLang === topLang) topLang = differentLang(botLang);
      }

      refreshLangLabels();
      closeAllPop();

      if (runtimeMode === "offline" && !hasInstalledOfflinePair(topLang, botLang)) {
        showToast("Bu dil çifti offline hazır değil. Dil İndir bölümünden paketi indirebilirsiniz.");
      }
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

document.addEventListener("click", (e) => {
  const inside =
    popTop?.contains(e.target) ||
    popBot?.contains(e.target) ||
    e.target?.closest?.("#topLangBtn,#botLangBtn");

  if (!inside) closeAllPop();
}, { capture: true });

function openMenu() {
  sideMenu?.classList.add("open");
  menuBackdrop?.classList.add("show");
}

function closeMenu() {
  sideMenu?.classList.remove("open");
  menuBackdrop?.classList.remove("show");
}

topMenuBtn?.addEventListener("click", openMenu);
botMenuBtn?.addEventListener("click", openMenu);
menuBackdrop?.addEventListener("click", closeMenu);

downloadBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  location.href = "/pages/offline_languages_public.html";
});

function clearBody(body, text) {
  if (!body) return;
  body.innerHTML = "";
  const div = document.createElement("div");
  div.className = "bubble";
  div.textContent = text;
  body.appendChild(div);
}

function addBubble(side, text, latest = false) {
  const body = side === "top" ? topBody : botBody;
  if (!body) return null;

  if (latest) {
    body.querySelectorAll(".bubble.latest").forEach((x) => x.classList.remove("latest"));
  }

  const div = document.createElement("div");
  div.className = `bubble${latest ? " latest" : ""}`;
  div.textContent = String(text || "").trim();
  body.appendChild(div);

  const scroll = () => {
    try { body.scrollTop = body.scrollHeight; } catch {}
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
  try { recognizer?.stop?.(); } catch {}
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
        headers: { "Content-Type": "application/json" },
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
      window.OfflineTranslate.translate(JSON.stringify({
        text: String(text || "").trim(),
        from: canonical(from),
        to: canonical(to)
      }));
    } catch {
      window.removeEventListener("offlineTranslateResult", handler);
      resolve(null);
    }
  });
}

async function translateText(text, from, to) {
  if (runtimeMode === "offline") {
    if (!hasInstalledOfflinePair(from, to)) {
      showToast("Bu dil çifti offline hazır değil. Dil paketini indirmeniz gerekli.");
      return null;
    }

    const offline = await translateOffline(text, from, to);
    if (offline) return offline;

    showToast("Offline çeviri yapılamadı.");
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

  const allowed = await showAdBeforeTranslate();
  if (!allowed) {
    showToast("Reklam izlenmeden çeviri başlatılmadı.");
    return;
  }

  const src = side === "top" ? topLang : botLang;
  const dst = side === "top" ? botLang : topLang;
  const other = side === "top" ? "bot" : "top";

  addBubble(side, clean, false);

  const targetRow = addBubble(other, "Çevriliyor...", true);
  const translated = await translateText(clean, src, dst);

  if (!translated) {
    if (targetRow) targetRow.textContent = "Çeviri yapılamadı";
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
    showToast("Bu cihazda konuşma algılama desteklenmiyor.");
    return;
  }

  recognizer = rec;
  recordingSide = side;
  liveText = "";

  rec.onstart = () => {
    setMicState(side, true);
    addBubble(side, "Dinliyorum...", true);
  };

  rec.onresult = (e) => {
    let finalText = "";
    let interimText = "";

    for (let i = 0; i < e.results.length; i++) {
      const txt = String(e.results[i]?.[0]?.transcript || "").trim();
      if (!txt) continue;

      if (e.results[i].isFinal) finalText += ` ${txt}`;
      else interimText += ` ${txt}`;
    }

    liveText = cleanupTranscript(finalText || interimText || liveText);

    const body = side === "top" ? topBody : botBody;
    const latest = body?.querySelector(".bubble.latest");

    if (latest && liveText) latest.textContent = liveText;
  };

  rec.onerror = (e) => {
    const err = String(e?.error || "");
    if (err.includes("not-allowed")) showToast("Mikrofon izni gerekli.");
    else showToast("Mikrofon hatası.");

    setMicState(side, false);
    recognizer = null;
    recordingSide = null;
    liveText = "";
  };

  rec.onend = () => {
    const finalText = cleanupTranscript(liveText);

    setMicState(side, false);
    recognizer = null;
    recordingSide = null;
    liveText = "";

    if (finalText) {
      finalizeSpeech(side, finalText);
    }
  };

  try {
    rec.start();
  } catch {
    showToast("Mikrofon başlatılamadı.");
    setMicState(side, false);
    recognizer = null;
    recordingSide = null;
    liveText = "";
  }
}

topMic?.addEventListener("click", () => startRecording("top"));
botMic?.addEventListener("click", () => startRecording("bot"));

clearBtn?.addEventListener("click", () => {
  stopRecognizer();

  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}

  recognizer = null;
  recordingSide = null;
  liveText = "";

  topMic?.classList.remove("listening");
  botMic?.classList.remove("listening");

  clearBody(topBody, "Karşı taraf konuşsun");
  clearBody(botBody, "Konuşmak için mikrofona bas");
});

function boot() {
  refreshLangLabels();
  syncModeUi();

  setTimeout(() => {
    showToast("İnternetsiz ortamda çeviri yapabilmek için dil paketi indirmeniz gereklidir.");
  }, 800);
}

boot();
