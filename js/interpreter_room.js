import { mountShell } from "/js/ui_shell.js";
import { LANG_POOL } from "/js/lang_pool_full.js";

try {
  mountShell({ scroll: "auto" });
} catch (e) {
  console.warn("[interpreter room shell]", e);
}

const $ = (id) => document.getElementById(id);

const myLang = $("myLang");
const hostCodeText = $("hostCodeText");
const roomIdText = $("roomIdText");
const voiceInfoText = $("voiceInfoText");
const cancelBtn = $("cancelBtn");
const startBtn = $("startBtn");
const toastEl = $("toast");

const MY_LANG_KEY = "italky_interpreter_my_lang";
const TTS_VOICE_KEY = "tts_voice";

function toast(msg) {
  if (!toastEl) return;
  toastEl.textContent = String(msg || "");
  toastEl.classList.add("show");
  clearTimeout(window.__roomToastTimer);
  window.__roomToastTimer = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 1800);
}

function getParams() {
  const p = new URLSearchParams(location.search);
  return {
    room: String(p.get("room") || "").trim(),
    host: String(p.get("host") || "").trim(),
    version: String(p.get("v") || "1").trim()
  };
}

function canonical(code) {
  return String(code || "").toLowerCase().trim();
}

function labelOfVoice(v) {
  const x = String(v || "auto").toLowerCase().trim();
  if (x === "female") return "Kadın sesi";
  if (x === "male") return "Erkek sesi";
  if (x === "clone" || x === "my") return "Benim Sesim";
  return "Otomatik";
}

function buildLangOptions(selectEl, selected) {
  const langs = Array.isArray(LANG_POOL) ? LANG_POOL : [];
  selectEl.innerHTML = langs.map((l) => {
    const code = canonical(l.code);
    return `<option value="${code}">${l.flag || "🌐"} ${l.name || code.toUpperCase()}</option>`;
  }).join("");

  const hasSelected = [...selectEl.options].some((o) => o.value === selected);
  selectEl.value = hasSelected ? selected : "tr";
}

function buildLiveUrl({ room, host, version, my }) {
  const url = new URL("/pages/live_interpreter.html", location.origin);
  url.searchParams.set("room", room);
  if (host) url.searchParams.set("host", host);
  url.searchParams.set("v", version || "1");
  url.searchParams.set("my", my);
  url.searchParams.set("role", "guest");
  url.searchParams.set("payer", "1");
  return url.toString();
}

function init() {
  const params = getParams();

  if (!params.room) {
    toast("Geçersiz oda bilgisi.");
    setTimeout(() => {
      location.href = "/pages/home.html";
    }, 900);
    return;
  }

  hostCodeText.textContent = params.host || "—";
  roomIdText.textContent = params.room;

  const savedMy = localStorage.getItem(MY_LANG_KEY) || "tr";
  buildLangOptions(myLang, savedMy);

  const voiceValue = localStorage.getItem(TTS_VOICE_KEY) || "auto";
  voiceInfoText.textContent = `Profilde seçtiğin çeviri sesi kullanılacak: ${labelOfVoice(voiceValue)}.`;

  myLang.addEventListener("change", () => {
    localStorage.setItem(MY_LANG_KEY, myLang.value);
  });

  cancelBtn?.addEventListener("click", () => {
    if (history.length > 1) {
      history.back();
    } else {
      location.href = "/pages/home.html";
    }
  });

  startBtn?.addEventListener("click", () => {
    if (!myLang.value) {
      toast("Lütfen kendi dilini seç.");
      return;
    }

    localStorage.setItem(MY_LANG_KEY, myLang.value);

    const liveUrl = buildLiveUrl({
      room: params.room,
      host: params.host,
      version: params.version,
      my: myLang.value
    });

    location.href = liveUrl;
  });
}

init();
