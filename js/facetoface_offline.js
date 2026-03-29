import { STORAGE_KEY } from "/js/config.js";
import { getSiteLang } from "/js/i18n.js";
import { supabase } from "/js/supabase_client.js";
import { getLangPoolForSite } from "/js/lang_pool_full.js";

const $ = (id) => document.getElementById(id);
const PIVOT = "en";
const USER_LANG_KEY = "italky_user_lang_v1";
const LOCAL_INSTALLED_KEY = "offline_installed_langs_v2";

/* ===============================
   AUTH GUARD
=============================== */
function requireLogin() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      location.replace("/pages/login.html");
      return false;
    }
    const u = JSON.parse(raw);
    if (!u || !u.email) {
      localStorage.removeItem(STORAGE_KEY);
      location.replace("/pages/login.html");
      return false;
    }
    return true;
  } catch {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    location.replace("/pages/login.html");
    return false;
  }
}

function norm(v) {
  return String(v || "").trim().toLowerCase();
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
let topLang = "de";
let botLang = "tr";

/* ===============================
   LANG POOL
=============================== */
function getLangPool() {
  const raw = Array.isArray(getLangPoolForSite?.("tr")) ? getLangPoolForSite("tr") : [];
  const seen = new Set();
  return raw
    .map((x) => ({
      code: norm(x?.code),
      flag: String(x?.flag || "🌐"),
      name: String(x?.name || "").trim()
    }))
    .filter((x) => x.code && x.name)
    .filter((x) => {
      if (seen.has(x.code)) return false;
      seen.add(x.code);
      return true;
    });
}

const LANGS = getLangPool();

function langObj(code) {
  return LANGS.find((x) => x.code === norm(code)) || {
    code: norm(code),
    flag: "🌐",
    name: String(code || "").toUpperCase()
  };
}

function labelChip(code) {
  const o = langObj(code);
  return `${o.flag} ${o.name}`;
}

function bcp(code) {
  const c = norm(code);
  const map = {
    tr: "tr-TR",
    en: "en-US",
    de: "de-DE",
    fr: "fr-FR",
    es: "es-ES",
    it: "it-IT",
    pt: "pt-PT",
    ar: "ar-SA",
    ru: "ru-RU",
    ja: "ja-JP",
    ko: "ko-KR",
    zh: "zh-CN"
  };
  return map[c] || "en-US";
}

/* ===============================
   OFFLINE ACCESS
=============================== */
function getUserLang() {
  return norm(localStorage.getItem(USER_LANG_KEY) || "tr");
}

function getLocalInstalled() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_INSTALLED_KEY) || "[]");
  } catch {
    return [];
  }
}

function getInstalledTargets() {
  const own = getUserLang();
  return getLocalInstalled()
    .map(norm)
    .filter((x) => x && x !== own && x !== PIVOT);
}

async function getProfile() {
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id || "";
  if (!userId) return null;

  const { data: row } = await supabase
    .from("profiles")
    .select("offline_langs")
    .eq("id", userId)
    .single();

  return row || null;
}

function hasDownloaded(profile, targetLang) {
  const raw = profile?.offline_langs;
  if (!Array.isArray(raw)) return false;

  return raw.some((x) => {
    if (typeof x === "string") return norm(x) === norm(targetLang);
    return norm(x?.code) === norm(targetLang) && Number(x?.download_count || 0) > 0;
  });
}

function getAvailableTargetLanguages(profile) {
  const installed = getInstalledTargets();
  return installed.filter((code) => hasDownloaded(profile, code));
}

function ensureOfflineLanguageState(profile) {
  botLang = getUserLang();

  const available = getAvailableTargetLanguages(profile);

  if (!available.length) {
    alert("Bu cihazda offline hedef dil kurulu değil. Önce Offline Diller sayfasından paket indirin.");
    location.replace("/pages/offline_languages.html");
    return false;
  }

  if (!available.includes(topLang)) {
    topLang = available[0];
  }

  return true;
}

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

function clearChat() {
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
function isAndroidBridgeReady() {
  return !!(
    window.Android &&
    typeof window.Android.ct2Check === "function" &&
    typeof window.Android.ct2Translate === "function"
  );
}

function ct2Direction(source, target) {
  return `${norm(source)}-${norm(target)}`;
}

function checkDirectionInstalled(source, target) {
  const dir = ct2Direction(source, target);

  if (getLocalInstalled().map(norm).includes(norm(source)) && norm(target) === PIVOT) return true;
  if (getLocalInstalled().map(norm).includes(norm(target)) && norm(source) === PIVOT) return true;

  if (!isAndroidBridgeReady()) return false;

  try {
    const raw = window.Android.ct2Check(JSON.stringify({ required: [dir] }));
    const res = JSON.parse(raw || "{}");
    return !!res[dir];
  } catch {
    return false;
  }
}

async function translateOneHop(text, source, target) {
  const t = String(text || "").trim();
  if (!t) return t;

  const dir = ct2Direction(source, target);
  if (!checkDirectionInstalled(source, target)) return t;
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

async function translateViaBridge(text, source, target) {
  const s = norm(source);
  const t = norm(target);
  const val = String(text || "").trim();
  if (!val) return val;

  if (s === t) return val;

  if (s === PIVOT || t === PIVOT) {
    return await translateOneHop(val, s, t);
  }

  const pivoted = await translateOneHop(val, s, PIVOT);
  return await translateOneHop(pivoted, PIVOT, t);
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
    const translated = await translateViaBridge(finalText, src, dst);

    addBubble(other, "me", translated, dst);
    speak(translated, dst);
  };

  rec.onerror = () => {
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
function bindNav() {
  $("homeBtn")?.addEventListener("click", () => {
    stopAll();
    location.href = "/pages/home.html";
  });

  $("topBack")?.addEventListener("click", () => {
    stopAll();
    location.href = "/pages/home.html";
  });

  $("clearChat")?.addEventListener("click", () => {
    clearChat();
  });
}

function bindMicButtons() {
  $("topMic")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (active === "top") stopAll();
    else start("top");
  });

  $("botMic")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (active === "bot") stopAll();
    else start("bot");
  });
}

function setOfflineLangs(profile) {
  const available = getAvailableTargetLanguages(profile);

  botLang = getUserLang();
  topLang = available[0];

  if ($("topLangTxt")) $("topLangTxt").textContent = labelChip(topLang);
  if ($("botLangTxt")) $("botLangTxt").textContent = labelChip(botLang);
  if ($("offlinePill")) $("offlinePill").textContent = `Offline Çeviri • ${langName(botLang)} → ${langName(topLang)}`;

  if ($("topHelper")) {
    $("topHelper").textContent = `${langName(topLang)} konuş. Çeviri aşağıda ${langName(botLang)} görünür.`;
  }

  if ($("botHelper")) {
    $("botHelper").textContent = `${langName(botLang)} konuş. Çeviri yukarıda ${langName(topLang)} görünür.`;
  }

  $("topLangBtn")?.addEventListener("click", () => {
    const next = prompt(
      `Kurulu hedef diller: ${available.map((x) => langName(x)).join(", ")}\n\nHedef dil kodu girin:`,
      topLang
    );
    const code = norm(next);
    if (!code) return;
    if (!available.includes(code)) return;
    topLang = code;
    $("topLangTxt").textContent = labelChip(topLang);
    if ($("offlinePill")) $("offlinePill").textContent = `Offline Çeviri • ${langName(botLang)} → ${langName(topLang)}`;
    if ($("topHelper")) $("topHelper").textContent = `${langName(topLang)} konuş. Çeviri aşağıda ${langName(botLang)} görünür.`;
    if ($("botHelper")) $("botHelper").textContent = `${langName(botLang)} konuş. Çeviri yukarıda ${langName(topLang)} görünür.`;
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    if (!requireLogin()) return;
  } catch {
    location.replace("/pages/login.html");
    return;
  }

  const profile = await getProfile();
  if (!profile) {
    alert("Offline profil bilgisi okunamadı.");
    location.replace("/pages/offline_languages.html");
    return;
  }

  if (!ensureOfflineLanguageState(profile)) {
    return;
  }

  setOfflineLangs(profile);
  bindNav();
  bindMicButtons();

  try { window.speechSynthesis?.getVoices?.(); } catch {}
});
