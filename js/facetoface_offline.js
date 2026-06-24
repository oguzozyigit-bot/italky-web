import { getLangPoolForSite } from "/js/lang_pool_full.js";

const $ = (id) => document.getElementById(id);

const topBody = $("topBody");
const botBody = $("botBody");

const topMic = $("topMic");
const botMic = $("botMic");
const topSend = $("topSend");
const botSend = $("botSend");
const topInput = $("topInput");
const botInput = $("botInput");
const topComposer = $("topComposer");
const botComposer = $("botComposer");

const topKeyboardWrap = $("topKeyboardWrap");
const botKeyboardWrap = $("botKeyboardWrap");
const topKeyboard = $("topKeyboard");
const botKeyboard = $("botKeyboard");

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
const homeText = $("homeText");
const clearText = $("clearText");
const centerHub = $("centerHub");
const topSettingsMini = $("topSettingsMini");
const botSettingsMini = $("botSettingsMini");
const miniToast = $("miniToast");
const frameRoot = $("frameRoot");

const uiModal = $("uiModal");
const uiModalTitle = $("uiModalTitle");
const uiModalText = $("uiModalText");
const uiModalGo = $("uiModalGo");
const uiModalClose = $("uiModalClose");

const STORAGE = {
  installedPairs: "italky_offline_installed_pairs_v7",
  nativeLang: "italky_native_lang_v7"
};

const BCP = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
  ru: "ru-RU",
  ar: "ar-SA",
  zh: "zh-CN"
};

const PLACEHOLDERS = {
  tr: "Mesajını buraya yaz",
  en: "Write your message here",
  de: "Schreibe hier deine Nachricht",
  fr: "Écris ici ton message",
  it: "Scrivi qui il tuo messaggio",
  es: "Escribe aquí tu mensaje",
  ru: "Введите сообщение",
  ar: "اكتب رسالتك هنا",
  zh: "在这里输入消息"
};

const HOME_LABELS = {
  tr: "ANA SAYFA",
  en: "HOME",
  de: "START",
  fr: "ACCUEIL",
  it: "HOME",
  es: "INICIO",
  ru: "ГЛАВНАЯ",
  ar: "الرئيسية",
  zh: "首页"
};

const CLEAR_LABELS = {
  tr: "TEMİZLE",
  en: "CLEAR",
  de: "LÖSCHEN",
  fr: "EFFACER",
  it: "PULISCI",
  es: "LIMPIAR",
  ru: "ОЧИСТИТЬ",
  ar: "مسح",
  zh: "清除"
};

const ALT_CHARS = {
  a: ["â", "á", "à"],
  A: ["Â", "Á", "À"],
  c: ["ç"],
  C: ["Ç"],
  g: ["ğ"],
  G: ["Ğ"],
  i: ["ı", "î"],
  I: ["İ", "Î"],
  o: ["ö", "ô", "ó"],
  O: ["Ö", "Ô", "Ó"],
  s: ["ş"],
  S: ["Ş"],
  u: ["ü", "û", "ú"],
  U: ["Ü", "Û", "Ú"],
  e: ["é", "è", "ê"],
  E: ["É", "È", "Ê"],
  n: ["ñ"],
  N: ["Ñ"]
};

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim();
}

function safeJsonParse(raw, fallback) {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function getInstalledPairs() {
  return safeJsonParse(localStorage.getItem(STORAGE.installedPairs) || "{}", {});
}

function getNativeLang() {
  return canonical(localStorage.getItem(STORAGE.nativeLang) || "tr");
}

function getInstalledOfflineLanguageCodes() {
  const pairs = getInstalledPairs();
  const codes = new Set();

  Object.values(pairs).forEach((item) => {
    if (!item || typeof item !== "object") return;
    const from = canonical(item.from);
    const to = canonical(item.to);
    if (from) codes.add(from);
    if (to) codes.add(to);
  });

  return [...codes];
}

function hasAnyInstalledOfflinePair() {
  const pairs = getInstalledPairs();
  return Object.keys(pairs).length > 0;
}

function pairKey(a, b) {
  return `${canonical(a)}_${canonical(b)}`;
}

function hasInstalledBiDirectional(a, b) {
  const pairs = getInstalledPairs();
  return !!pairs[pairKey(a, b)] && !!pairs[pairKey(b, a)];
}

const SITE_LANG = "tr";
const RAW_LANG_POOL = Array.isArray(getLangPoolForSite(SITE_LANG))
  ? getLangPoolForSite(SITE_LANG)
  : [];

const RAW_LANGS = RAW_LANG_POOL
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

const INSTALLED_CODES = getInstalledOfflineLanguageCodes();
const LANGS = RAW_LANGS.filter((lang) => INSTALLED_CODES.includes(lang.code));

let topLang = LANGS.find((x) => x.code !== getNativeLang())?.code || getNativeLang();
let botLang = getNativeLang();

let activeKeyboardSide = null;
let activeUiSide = "bot";
let shiftState = { top: false, bot: false };
let altMenuEl = null;
let holdTimer = null;
let currentAudio = null;
let speakRunId = 0;
let typewriterRunId = 0;
let nativeSpeechSide = null;
let audioCtx = null;

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

function getPlaceholder(code) {
  return PLACEHOLDERS[canonical(code)] || PLACEHOLDERS.en;
}

function translateUiLabel(map, lang) {
  return map[canonical(lang)] || map.en;
}

function setCenterUiSide(side) {
  activeUiSide = side === "top" ? "top" : "bot";
  centerHub?.classList.toggle("to-top", activeUiSide === "top");
  const lang = activeUiSide === "top" ? topLang : botLang;
  if (homeText) homeText.textContent = translateUiLabel(HOME_LABELS, lang);
  if (clearText) clearText.textContent = translateUiLabel(CLEAR_LABELS, lang);
}

function showToast(msg = "") {
  if (!miniToast) return;
  miniToast.textContent = String(msg || "");
  miniToast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    miniToast.classList.remove("show");
  }, 1900);
}

function showSetupRequiredModal() {
  if (!uiModal || !uiModalTitle || !uiModalText || !uiModalGo || !uiModalClose) {
    location.href = "/pages/offline_languages.html";
    return;
  }

  uiModalTitle.textContent = "Dil Kurulumu Gerekli";
  uiModalText.textContent = "Henüz dil kurulumu yapmadınız. Lütfen dil kurulumunuzu tamamlayın.";
  uiModal.classList.add("open");

  uiModalGo.textContent = "Offline Diller";
  uiModalClose.textContent = "Kapat";

  uiModalGo.onclick = () => {
    location.href = "/pages/offline_languages.html";
  };

  uiModalClose.onclick = () => {
    uiModal.classList.remove("open");
    location.href = "/pages/offline_languages.html";
  };
}

function setErrorUI() {
  frameRoot?.classList.remove("is-idle", "is-listening", "is-translating", "is-ready");
  frameRoot?.classList.add("is-error");
}

function setReadyUI() {
  frameRoot?.classList.remove("is-idle", "is-listening", "is-translating", "is-error");
  frameRoot?.classList.add("is-ready");
  topComposer?.classList.remove("listening");
  botComposer?.classList.remove("listening");
  topMic?.classList.remove("listening");
  botMic?.classList.remove("listening");
}

function setListeningUI(side) {
  frameRoot?.classList.remove("is-idle", "is-translating", "is-error", "is-ready");
  frameRoot?.classList.add("is-listening");
  pointOrbTo(side);
  setCenterUiSide(side);

  if (side === "top") {
    topComposer?.classList.add("listening");
    topMic?.classList.add("listening");
  } else {
    botComposer?.classList.add("listening");
    botMic?.classList.add("listening");
  }
}

function pointOrbTo(side) {
  if (!frameRoot) return;
  frameRoot.classList.remove("to-top", "to-bot");
  frameRoot.classList.add(side === "top" ? "to-top" : "to-bot");
}

function setInputPlaceholder(side, value = "") {
  const input = side === "top" ? topInput : botInput;
  if (!input) return;
  input.placeholder = value;
}

function restoreInputPlaceholder(side) {
  const lang = side === "top" ? topLang : botLang;
  setInputPlaceholder(side, getPlaceholder(lang));
}

function refreshLangLabels() {
  if (topLangTxt) topLangTxt.textContent = labelChip(topLang);
  if (botLangTxt) botLangTxt.textContent = labelChip(botLang);
  restoreInputPlaceholder("top");
  restoreInputPlaceholder("bot");
  setCenterUiSide(activeUiSide);
}

function closeAllPop() {
  popTop?.classList.remove("show");
  popBot?.classList.remove("show");
}

function renderPop(side) {
  const list = side === "top" ? listTop : listBot;
  const sel = side === "top" ? topLang : botLang;
  if (!list) return;

  const targetBase = side === "top" ? botLang : topLang;

  const available = LANGS.filter((l) => hasInstalledBiDirectional(targetBase, l.code));

  list.innerHTML = available.map((l) => {
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
      const code = canonical(el.dataset.code || "en");
      if (side === "top") topLang = code;
      else botLang = code;

      refreshLangLabels();
      renderKeyboard(side);
      closeAllPop();
    });
  });
}

function autoResizeTextarea(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 84)}px`;
}

function syncComposerButtons(side) {
  const input = side === "top" ? topInput : botInput;
  const mic = side === "top" ? topMic : botMic;
  const send = side === "top" ? topSend : botSend;
  if (!input || !mic || !send) return;

  const hasText = String(input.value || "").trim().length > 0;
  mic.classList.remove("hidden");
  send.classList.toggle("hidden", !hasText);
}

function syncAllComposerButtons() {
  syncComposerButtons("top");
  syncComposerButtons("bot");
}

function hideAltMenu() {
  altMenuEl?.remove();
  altMenuEl = null;
  clearTimeout(holdTimer);
  holdTimer = null;
}

function showKeyboard(side) {
  activeKeyboardSide = side;
  setCenterUiSide(side);
  topKeyboardWrap?.classList.toggle("show", side === "top");
  botKeyboardWrap?.classList.toggle("show", side === "bot");
  hideAltMenu();
  renderKeyboard(side);
  keepLatestVisible(side);
}

function hideKeyboards() {
  activeKeyboardSide = null;
  hideAltMenu();
  topKeyboardWrap?.classList.remove("show");
  botKeyboardWrap?.classList.remove("show");
}

function keyPressFeedback() {
  try { navigator.vibrate?.(8) } catch {}

  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();

    const ctx = audioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.value = 520;
    gain.gain.value = 0.02;

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    osc.start(now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    osc.stop(now + 0.05);
  } catch {}
}

function appendInputValue(side, value) {
  const input = side === "top" ? topInput : botInput;
  if (!input) return;

  keyPressFeedback();
  input.value = `${input.value || ""}${value}`;
  autoResizeTextarea(input);
  syncComposerButtons(side);
}

function backspaceInputValue(side) {
  const input = side === "top" ? topInput : botInput;
  if (!input) return;

  keyPressFeedback();
  input.value = String(input.value || "").slice(0, -1);
  autoResizeTextarea(input);
  syncComposerButtons(side);
}

function keyboardRows(lang, shift) {
  const c = canonical(lang);
  const upper = !!shift;
  const numRow = ["1","2","3","4","5","6","7","8","9","0"];

  if (c === "tr") {
    return {
      nums: numRow,
      r1: upper ? ["Q","W","E","R","T","Y","U","I","O","P"] : ["q","w","e","r","t","y","u","ı","o","p"],
      r2: upper ? ["A","S","D","F","G","H","J","K","L"] : ["a","s","d","f","g","h","j","k","l"],
      r3: upper ? ["Z","X","C","V","B","N","M"] : ["z","x","c","v","b","n","m"],
    };
  }

  const mapRow = (row) => upper ? row.map((x) => x.toUpperCase()) : row;
  return {
    nums: numRow,
    r1: mapRow(["q","w","e","r","t","y","u","i","o","p"]),
    r2: mapRow(["a","s","d","f","g","h","j","k","l"]),
    r3: mapRow(["z","x","c","v","b","n","m"]),
  };
}

function svgShift() {
  return `
    <svg viewBox="0 0 24 24">
      <path d="M12 4l6 7h-4v8H10v-8H6l6-7z"></path>
    </svg>
  `;
}

function svgBackspace() {
  return `
    <svg viewBox="0 0 24 24">
      <path d="M21 6H9l-6 6 6 6h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"></path>
      <path d="M10 9l5 6"></path>
      <path d="M15 9l-5 6"></path>
    </svg>
  `;
}

function createKey({ label = "", html = "", onTap, onLongPress = null, className = "" }) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `kb-key ${className}`.trim();
  if (html) btn.innerHTML = html;
  else btn.textContent = label;

  let longTriggered = false;

  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    longTriggered = false;

    if (onLongPress) {
      holdTimer = setTimeout(() => {
        longTriggered = true;
        onLongPress(btn);
      }, 320);
    }
  });

  btn.addEventListener("pointerup", (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearTimeout(holdTimer);
    holdTimer = null;
    if (!longTriggered && onTap) onTap();
  });

  btn.addEventListener("pointerleave", () => {
    clearTimeout(holdTimer);
    holdTimer = null;
  });

  btn.addEventListener("contextmenu", (e) => e.preventDefault());
  return btn;
}

function createAltMenu(hostBtn, chars, onPick) {
  hideAltMenu();
  if (!hostBtn || !chars?.length) return;

  const wrap = document.createElement("div");
  wrap.className = "alt-pop";

  chars.forEach((ch) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "alt-key";
    b.textContent = ch;
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onPick(ch);
      hideAltMenu();
    });
    wrap.appendChild(b);
  });

  hostBtn.appendChild(wrap);
  altMenuEl = wrap;
}

function renderCharKeys(rowEl, chars, side) {
  chars.forEach((ch) => {
    const alts = ALT_CHARS[ch] || ALT_CHARS[String(ch).toLowerCase()] || [];
    rowEl.appendChild(createKey({
      label: ch,
      onTap: () => {
        hideAltMenu();
        appendInputValue(side, ch);
        if (shiftState[side] && /[A-ZÇĞİÖŞÜ]/.test(ch)) {
          shiftState[side] = false;
          renderKeyboard(side);
        }
      },
      onLongPress: alts.length ? (btn) => {
        createAltMenu(btn, alts, (picked) => appendInputValue(side, picked));
      } : null
    }));
  });
}

function renderKeyboard(side) {
  const wrap = side === "top" ? topKeyboard : botKeyboard;
  const lang = side === "top" ? topLang : botLang;
  if (!wrap) return;

  const rows = keyboardRows(lang, shiftState[side]);
  wrap.innerHTML = "";

  const rowNums = document.createElement("div");
  rowNums.className = "kb-row";
  renderCharKeys(rowNums, rows.nums, side);
  wrap.appendChild(rowNums);

  const row1 = document.createElement("div");
  row1.className = "kb-row";
  renderCharKeys(row1, rows.r1, side);
  wrap.appendChild(row1);

  const row2 = document.createElement("div");
  row2.className = "kb-row";
  row2.appendChild(document.createElement("div")).style.flex = "0.35";
  renderCharKeys(row2, rows.r2, side);
  row2.appendChild(document.createElement("div")).style.flex = "0.35";
  wrap.appendChild(row2);

  const row3 = document.createElement("div");
  row3.className = "kb-row";

  row3.appendChild(createKey({
    html: svgShift(),
    className: "icon wide",
    onTap: () => {
      keyPressFeedback();
      hideAltMenu();
      shiftState[side] = !shiftState[side];
      renderKeyboard(side);
    }
  }));

  renderCharKeys(row3, rows.r3, side);

  row3.appendChild(createKey({
    html: svgBackspace(),
    className: "icon wide",
    onTap: () => {
      hideAltMenu();
      backspaceInputValue(side);
    }
  }));

  wrap.appendChild(row3);

  const row4 = document.createElement("div");
  row4.className = "kb-row";

  row4.appendChild(createKey({ label: ",", onTap: () => appendInputValue(side, ",") }));
  row4.appendChild(createKey({ label: ".", onTap: () => appendInputValue(side, ".") }));
  row4.appendChild(createKey({ label: " ", className: "xwide", onTap: () => appendInputValue(side, " ") }));
  row4.appendChild(createKey({ label: "?", onTap: () => appendInputValue(side, "?") }));
  row4.appendChild(createKey({ label: "!", onTap: () => appendInputValue(side, "!") }));

  wrap.appendChild(row4);
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
  setTimeout(apply, 40);
  setTimeout(apply, 120);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopTypewriter() {
  typewriterRunId += 1;
}

async function typewriteText(el, finalText, side) {
  if (!el) return;

  stopTypewriter();
  const runId = typewriterRunId;
  const full = String(finalText || "").trim();

  el.textContent = "";
  if (!full) return;

  let i = 0;
  while (i < full.length) {
    if (runId !== typewriterRunId) return;
    const next = Math.min(full.length, i + 2);
    el.textContent = full.slice(0, next);
    i = next;
    keepLatestVisible(side);
    await wait(10);
  }
}

function stopAudio() {
  speakRunId += 1;

  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
  } catch {}

  currentAudio = null;

  try { window.speechSynthesis?.cancel?.() } catch {}
  try { window.NativeTTS?.stop?.() } catch {}
}

function chooseWebVoice(langCode) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const langBase = canonical(langCode);
  let pool = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith(langBase));
  return pool[0] || voices[0] || null;
}

function speakFallback(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return false;

  try {
    if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
      window.NativeTTS.speak(value, canonical(langCode));
      return true;
    }
  } catch {}

  if (!window.speechSynthesis) return false;

  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(value);
    u.lang = langObj(langCode).bcp;
    u.rate = 0.95;
    u.pitch = 1;
    const voice = chooseWebVoice(langCode);
    if (voice) u.voice = voice;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

async function speak(text, langCode) {
  stopAudio();
  speakFallback(text, langCode);
}

function createSpeakerButton(getText, langCode) {
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
    const value = typeof getText === "function" ? String(getText() || "").trim() : "";
    if (!value) return;
    await speak(value, langCode);
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
    inner.appendChild(createSpeakerButton(() => txt.textContent || "", opts.speakLang || "en"));
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

async function offlineTranslateText(text, from, to) {
  if (!window.OfflineTranslate || typeof window.OfflineTranslate.translate !== "function") {
    throw new Error("Offline köprüsü bulunamadı.");
  }

  return new Promise((resolve, reject) => {
    let done = false;

    const finish = (fn, value) => {
      if (done) return;
      done = true;
      window.removeEventListener("offlineTranslateResult", onResult);
      clearTimeout(timer);
      fn(value);
    };

    const onResult = (e) => {
      const detail = e?.detail || {};
      // Native bridge returns {translatedText, status} — never {ok: true}
      const value = String(
        detail.translatedText || detail.translation || detail.result || detail.text || ""
      ).trim();
      if (!value) {
        finish(reject, new Error(detail.error || "offline_translate_empty"));
        return;
      }
      finish(resolve, value);
    };

    const timer = setTimeout(() => {
      finish(reject, new Error("offlineTranslateResult_timeout"));
    }, 120000);

    window.addEventListener("offlineTranslateResult", onResult, { once: true });

    window.OfflineTranslate.translate(JSON.stringify({
      from: canonical(from),
      to: canonical(to),
      text: String(text || "").trim()
    }));
  });
}

async function finalizeTypedMessage(side, rawText) {
  const text = String(rawText || "").replace(/\s+/g, " ").trim();
  if (!text) return;

  const src = side === "top" ? topLang : botLang;
  const dst = side === "top" ? botLang : topLang;
  const other = side === "top" ? "bot" : "top";

  addBubble(side, "them", text);
  clearLatest(other);

  frameRoot?.classList.remove("is-ready", "is-error");
  frameRoot?.classList.add("is-translating");
  pointOrbTo(side);
  setCenterUiSide(side);

  const latestRow = addBubble(other, "me", "Çevriliyor...", {
    latest: true,
    speakLang: dst
  });

  const latestTxt = latestRow?.querySelector(".txt");

  try {
    const tr = await offlineTranslateText(text, src, dst);
    if (!tr) throw new Error("offline_empty_translation");

    if (latestTxt) {
      latestTxt.textContent = "";
      await typewriteText(latestTxt, tr, other);
      await speak(tr, dst);
    }

    setReadyUI();
  } catch (e) {
    setErrorUI();
    if (latestTxt) latestTxt.textContent = "⚠️ Çeviri hatası";
    showToast("Offline çeviri yapılamadı");
    setTimeout(() => setReadyUI(), 1200);
  }
}

async function sendTyped(side) {
  const input = side === "top" ? topInput : botInput;
  if (!input) return;

  const text = String(input.value || "").trim();
  if (!text) return;

  input.value = "";
  autoResizeTextarea(input);
  restoreInputPlaceholder(side);
  syncComposerButtons(side);

  await finalizeTypedMessage(side, text);
}

function handleNativeSpeechResult(side, text) {
  const cleaned = String(text || "").trim();
  if (!cleaned) {
    setReadyUI();
    return;
  }

  const input = side === "top" ? topInput : botInput;
  if (!input) return;

  input.value = cleaned;
  autoResizeTextarea(input);
  syncComposerButtons(side);
  sendTyped(side);
}

function startOfflineNativeMic(side) {
  if (!window.Native || typeof window.Native.startSpeechRecognition !== "function") {
    showToast("Bu cihazda mikrofon kullanılamıyor");
    return;
  }

  const lang = side === "top" ? topLang : botLang;
  nativeSpeechSide = side;
  setListeningUI(side);

  try {
    window.Native.startSpeechRecognition(langObj(lang).bcp, side);
  } catch {
    nativeSpeechSide = null;
    setErrorUI();
    showToast("Mikrofon başlatılamadı");
    setTimeout(() => setReadyUI(), 1200);
  }
}

window.onNativeSpeechResult = (payload) => {
  try {
    const side = String(payload?.side || nativeSpeechSide || "top");
    const text = String(payload?.text || "").trim();
    nativeSpeechSide = null;
    handleNativeSpeechResult(side, text);
  } catch {
    nativeSpeechSide = null;
    setErrorUI();
    setTimeout(() => setReadyUI(), 1200);
  }
};

window.onNativeSpeechError = () => {
  nativeSpeechSide = null;
  setErrorUI();
  showToast("Mikrofon işlemi tamamlanamadı");
  setTimeout(() => setReadyUI(), 1200);
};

function bindInput(side) {
  const input = side === "top" ? topInput : botInput;
  const send = side === "top" ? topSend : botSend;
  const mic = side === "top" ? topMic : botMic;

  if (!input || !send || !mic) return;

  const open = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCenterUiSide(side);
    showKeyboard(side);
  };

  input.addEventListener("pointerdown", open);
  input.addEventListener("click", open);
  input.addEventListener("focus", () => {
    setCenterUiSide(side);
    showKeyboard(side);
  });

  send.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  send.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCenterUiSide(side);
    await sendTyped(side);
  });

  mic.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCenterUiSide(side);
    hideKeyboards();
    startOfflineNativeMic(side);
  });

  input.addEventListener("input", () => {
    autoResizeTextarea(input);
    syncComposerButtons(side);
  });

  autoResizeTextarea(input);
  syncComposerButtons(side);
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
  if (!hasAnyInstalledOfflinePair()) {
    showSetupRequiredModal();
    return;
  }

  setReadyUI();
  refreshLangLabels();
  pointOrbTo("bot");
  setCenterUiSide("bot");

  homeLink?.classList.add("hidden");
  topSettingsMini?.classList.add("hidden");
  botSettingsMini?.classList.add("hidden");

  topSettingsMini?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    showToast("Offline modda ayarlar kapalı");
  });

  botSettingsMini?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    showToast("Offline modda ayarlar kapalı");
  });

  topLangBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCenterUiSide("top");
    closeAllPop();
    renderPop("top");
    popTop?.classList.add("show");
  });

  botLangBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCenterUiSide("bot");
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
    const insidePop =
      (popTop && popTop.contains(e.target)) ||
      (popBot && popBot.contains(e.target));
    const isLangBtn = e.target?.closest?.("#topLangBtn,#botLangBtn");
    const isInput = e.target?.closest?.("#topInput,#botInput");
    const isKb = e.target?.closest?.("#topKeyboardWrap,#botKeyboardWrap");
    const isAlt = e.target?.closest?.(".alt-pop");

    if (!insidePop && !isLangBtn) closeAllPop();
    if (!isInput && !isKb && !isAlt) hideKeyboards();
  }, { capture: true });

  clearBtn?.addEventListener("click", () => {
    stopAudio();
    stopTypewriter();

    if (topBody) topBody.innerHTML = "";
    if (botBody) botBody.innerHTML = "";

    if (topInput) {
      topInput.value = "";
      autoResizeTextarea(topInput);
    }
    if (botInput) {
      botInput.value = "";
      autoResizeTextarea(botInput);
    }

    restoreInputPlaceholder("top");
    restoreInputPlaceholder("bot");

    hideKeyboards();
    syncAllComposerButtons();
    setReadyUI();
  });

  homeBtn?.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  bindInput("top");
  bindInput("bot");

  bindKeyboardButton(homeBtn, async () => {
    location.href = "/pages/home.html";
  });

  renderKeyboard("top");
  renderKeyboard("bot");

  showToast("Bağlantı kesildi. Offline çeviri ile devam ediliyor.");
}

const requiredDomOk =
  !!frameRoot &&
  !!topBody &&
  !!botBody &&
  !!topSend &&
  !!botSend &&
  !!topInput &&
  !!botInput &&
  !!topComposer &&
  !!botComposer &&
  !!topKeyboardWrap &&
  !!botKeyboardWrap &&
  !!topKeyboard &&
  !!botKeyboard &&
  !!topLangBtn &&
  !!botLangBtn &&
  !!topLangTxt &&
  !!botLangTxt &&
  !!popTop &&
  !!popBot &&
  !!listTop &&
  !!listBot &&
  !!closeTop &&
  !!closeBot &&
  !!clearBtn &&
  !!homeBtn &&
  !!miniToast &&
  !!centerHub &&
  !!homeText &&
  !!clearText &&
  !!uiModal &&
  !!uiModalTitle &&
  !!uiModalText &&
  !!uiModalGo &&
  !!uiModalClose;

if (!requiredDomOk) {
  console.error("[facetoface_offline] Gerekli DOM elemanları eksik.");
} else {
  try {
    bind();
  } catch (e) {
    console.error("[facetoface_offline bind error]", e);
  }
}
