// FILE: italky-web/js/facetoface_offline.js
import { STORAGE_KEY } from "/js/config.js";
import { getSiteLang } from "/js/i18n.js";

const $ = (id) => document.getElementById(id);

/* ===============================
   AUTH GUARD
=============================== */
function requireLogin() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      location.replace("./index.html");
      return false;
    }
    const u = JSON.parse(raw);
    if (!u || !u.email) {
      localStorage.removeItem(STORAGE_KEY);
      location.replace("./index.html");
      return false;
    }
    return true;
  } catch {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    location.replace("./index.html");
    return false;
  }
}

function getSystemUILang() {
  try {
    const l = String(getSiteLang?.() || "").toLowerCase().trim();
    if (l) return l;
  } catch {}
  try {
    const l2 = String(localStorage.getItem("italky_site_lang_v1") || "").toLowerCase().trim();
    if (l2) return l2;
  } catch {}
  return "tr";
}

let UI_LANG = getSystemUILang();

/* ===============================
   OFFLINE LANGUAGE REGISTRY (ONLY EN/TR)
=============================== */
const LANGS = [
  { code: "tr", flag: "🇹🇷", bcp: "tr-TR" },
  { code: "en", flag: "🇬🇧", bcp: "en-US" }
];

let _dn = null;
function getDisplayNames() {
  if (_dn && _dn.__lang === UI_LANG) return _dn;
  _dn = null;
  try {
    const dn = new Intl.DisplayNames([UI_LANG], { type: "language" });
    dn.__lang = UI_LANG;
    _dn = dn;
  } catch {
    _dn = null;
  }
  return _dn;
}

function canonicalLangCode(code) {
  const c = String(code || "").toLowerCase();
  return c.split("-")[0];
}

function langObj(code) {
  return LANGS.find(x => x.code === code);
}

function langFlag(code) {
  return langObj(code)?.flag || "🌐";
}

function bcp(code) {
  return langObj(code)?.bcp || "en-US";
}

function langLabel(code) {
  const dn = getDisplayNames();
  const baseCode = canonicalLangCode(code);
  if (dn) {
    const name = dn.of(baseCode);
    if (name) return name;
  }
  return String(code || "").toUpperCase();
}

function labelChip(code) {
  return `${langFlag(code)} ${langLabel(code)}`;
}

/* ===============================
   State (FIXED)
=============================== */
let topLang = "en";
let botLang = "tr";

/* ===============================
   TTS
=============================== */
function speak(text, langCode) {
  const t = String(text || "").trim();
  if (!t) return;
  if (!window.speechSynthesis) return;

  try { window.speechSynthesis.cancel(); } catch {}

  const u = new SpeechSynthesisUtterance(t);
  u.lang = bcp(langCode);
  u.volume = 1.0;
  u.rate = 1.0;
  u.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length > 0) {
    const base = String(langCode || "").split("-")[0];
    const target = voices.find(v => String(v.lang || "").toLowerCase().startsWith(base)) || voices[0];
    u.voice = target;
  }

  setTimeout(() => {
    try { window.speechSynthesis.speak(u); } catch {}
  }, 50);
}

/* ===============================
   UI helpers
=============================== */
function markLatestTranslation(side) {
  const wrap = (side === "top") ? $("topBody") : $("botBody");
  if (!wrap) return;

  wrap.querySelectorAll(".bubble.me.is-latest").forEach(el => el.classList.remove("is-latest"));
  const allMe = wrap.querySelectorAll(".bubble.me");
  const last = allMe[allMe.length - 1];
  if (last) last.classList.add("is-latest");
}

function closeAllPop() {
  $("pop-top")?.classList.remove("show");
  $("pop-bot")?.classList.remove("show");
}

function clearChat() {
  closeAllPop();
  stopAll();
  try { window.speechSynthesis?.cancel?.(); } catch {}

  const top = $("topBody");
  const bot = $("botBody");
  if (top) top.innerHTML = "";
  if (bot) bot.innerHTML = "";
}

function addBubble(side, kind, text, langForSpeak) {
  const wrap = (side === "top") ? $("topBody") : $("botBody");
  if (!wrap) return;

  const row = document.createElement("div");
  row.className = `bubble ${kind}`;

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "").trim() || "—";
  row.appendChild(txt);

  if (kind === "me") {
    const spk = document.createElement("button");
    spk.className = "spk";
    spk.type = "button";
    spk.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 5L6 9H2v6h4l5 4V5z"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>`;
    spk.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      speak(txt.textContent, langForSpeak);
    });
    row.appendChild(spk);
  }

  wrap.appendChild(row);
  if (kind === "me") markLatestTranslation(side);

  try { wrap.scrollTop = wrap.scrollHeight; } catch {}
}

let active = null;
let recTop = null;
let recBot = null;

function setMicUI(which, on) {
  const btn = (which === "top") ? $("topMic") : $("botMic");
  btn?.classList.toggle("listening", !!on);

  const anyOn = !!on || !!recTop || !!recBot;
  $("frameRoot")?.classList.toggle("listening", anyOn);
}

function stopAll() {
  try { recTop?.stop?.(); } catch {}
  try { recBot?.stop?.(); } catch {}
  recTop = null;
  recBot = null;
  active = null;
  setMicUI("top", false);
  setMicUI("bot", false);
  $("frameRoot")?.classList.remove("listening");
}

/* ===============================
   OFFLINE CT2 BRIDGE
=============================== */
const CT2_REQUIRED = ["en-tr", "tr-en"];
let CT2_OK = false;

function isAndroidBridgeReady() {
  return !!(
    window.Android &&
    typeof window.Android.ct2Check === "function" &&
    typeof window.Android.ct2Translate === "function"
  );
}

function ct2Direction(source, target) {
  const s = String(source || "").toLowerCase();
  const t = String(target || "").toLowerCase();
  return `${s}-${t}`;
}

function checkCt2Packs() {
  const sim = String(localStorage.getItem("ct2_sim_state") || "").trim();

  if (sim === "installed") {
    CT2_OK = true;
    return true;
  }
  if (sim === "missing") {
    CT2_OK = false;
    return false;
  }

  if (!isAndroidBridgeReady()) {
    CT2_OK = false;
    return false;
  }

  try {
    const raw = window.Android.ct2Check(JSON.stringify({ required: CT2_REQUIRED }));
    const res = JSON.parse(raw || "{}");
    const ok = CT2_REQUIRED.every(k => !!res[k]);
    CT2_OK = ok;
    return ok;
  } catch {
    CT2_OK = false;
    return false;
  }
}

async function translateViaCt2(text, source, target) {
  const t = String(text || "").trim();
  if (!t) return t;

  const dir = ct2Direction(source, target);
  if (dir !== "en-tr" && dir !== "tr-en") return t;

  if (!CT2_OK) return t;
  if (!isAndroidBridgeReady()) return t;

  try {
    const raw = window.Android.ct2Translate(JSON.stringify({
      direction: dir,
      text: t,
      source,
      target
    }));
    const res = JSON.parse(raw || "{}");
    const out = String(res?.text || res?.translated || res?.translation || "").trim();
    return out || t;
  } catch {
    return t;
  }
}

/* ===============================
   STT
=============================== */
function buildRecognizer(langCode) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = bcp(langCode);
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;

  return rec;
}

async function start(which) {
  if (!CT2_OK) {
    alert("Offline paketler eksik. (en-tr / tr-en) Paketler yüklenmeden Offline çalışmaz.");
    return;
  }

  const isAndroid = navigator.userAgent.includes("Android");
  if (location.protocol !== "https:" && location.hostname !== "localhost" && !isAndroid) {
    alert("Mikrofon için HTTPS gerekli.");
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert("Bu tarayıcı SpeechRecognition desteklemiyor.");
    return;
  }

  if (active && active !== which) stopAll();

  const src = (which === "top") ? topLang : botLang;
  const dst = (which === "top") ? botLang : topLang;

  const rec = buildRecognizer(src);
  if (!rec) {
    alert("Mikrofon başlatılamadı.");
    return;
  }

  active = which;
  setMicUI(which, true);

  rec.onresult = async (e) => {
    const t = e.results?.[0]?.[0]?.transcript || "";
    const finalText = String(t || "").trim();
    if (!finalText) return;

    addBubble(which, "them", finalText, src);

    const other = (which === "top") ? "bot" : "top";
    const translated = await translateViaCt2(finalText, src, dst);

    addBubble(other, "me", translated, dst);
    speak(translated, dst);
  };

  rec.onerror = (err) => {
    console.error("STT Error:", err);
    stopAll();
  };

  rec.onend = () => {
    if (active === which) active = null;
    setMicUI(which, false);
    if (!active) $("frameRoot")?.classList.remove("listening");
  };

  if (which === "top") recTop = rec;
  else recBot = rec;

  try {
    rec.start();
  } catch {
    stopAll();
  }
}

/* ===============================
   Bindings
=============================== */
const HOME_PATH = "./home.html";
const LOGIN_PATH = "./index.html";

function bindNav() {
  $("homeBtn")?.addEventListener("click", () => {
    stopAll();
    closeAllPop();
    location.href = HOME_PATH;
  });

  $("topBack")?.addEventListener("click", () => {
    stopAll();
    closeAllPop();
    if (history.length > 1) history.back();
    else location.href = HOME_PATH;
  });

  $("clearChat")?.addEventListener("click", () => {
    clearChat();
  });
}

function bindLangButtons() {
  $("topLangBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  $("botLangBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  $("close-top")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
  });

  $("close-bot")?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
  });
}

function bindMicButtons() {
  $("topMic")?.addEventListener("click", (e) => {
    e.preventDefault();
    closeAllPop();
    if (active === "top") stopAll();
    else start("top");
  });

  $("botMic")?.addEventListener("click", (e) => {
    e.preventDefault();
    closeAllPop();
    if (active === "bot") stopAll();
    else start("bot");
  });
}

function setOfflineFixedLangs() {
  topLang = "en";
  botLang = "tr";

  if ($("topLangTxt")) $("topLangTxt").textContent = labelChip(topLang);
  if ($("botLangTxt")) $("botLangTxt").textContent = labelChip(botLang);

  closeAllPop();
}

document.addEventListener("DOMContentLoaded", () => {
  try {
    if (!requireLogin()) return;
  } catch {
    location.replace(LOGIN_PATH);
    return;
  }

  setOfflineFixedLangs();
  bindNav();
  bindLangButtons();
  bindMicButtons();

  try { window.speechSynthesis?.getVoices?.(); } catch {}

  checkCt2Packs();

  document.addEventListener("click", (e) => {
    if (
      !$("pop-top")?.contains(e.target) &&
      !$("pop-bot")?.contains(e.target) &&
      !e.target.closest(".lang-trigger")
    ) {
      closeAllPop();
    }
  }, { capture: true });
});
