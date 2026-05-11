// Isolated 2 Telefon / Bluetooth flow. No FaceToFace local translate, AI answer, or local TTS.
import { LANG_POOL, getLangName } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com";
const SOURCE_LANG_KEY = "italky_two_phone_source_lang_v1";
const TARGET_LANG_KEY = "italky_two_phone_target_lang_v1";
const $ = (id) => document.getElementById(id);

let installed = false;
let btConnected = false;
let handsFree = false;
let recording = false;
let speakingRemote = false;
let lastSentText = "";
let lastSentAt = 0;
let lastSentMessageId = "";
let restartTimer = null;
let webRecognizer = null;
let allowRemoteTts = false;
let discoveryTimer = null;

const COMMON_LANGS = ["tr", "en", "de", "fr", "es", "it", "ru", "ar", "pt", "nl", "pl", "uk", "fa", "zh", "ja", "ko"];

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim() || "en";
}

function siteLang() {
  return canonical(
    localStorage.getItem("site_lang") ||
    localStorage.getItem("italky_site_lang_v1") ||
    document.documentElement.lang ||
    navigator.language ||
    "en"
  );
}

function defaultTargetFor(source) {
  return canonical(source) === "tr" ? "en" : "tr";
}

function sourceLang() {
  return canonical(localStorage.getItem(SOURCE_LANG_KEY) || siteLang());
}

function targetLang() {
  return canonical(localStorage.getItem(TARGET_LANG_KEY) || defaultTargetFor(sourceLang()));
}

function langLabel(code) {
  const lang = canonical(code);
  try {
    return getLangName(lang, siteLang()) || getLangName(lang, "en") || lang.toUpperCase();
  } catch {
    return lang.toUpperCase();
  }
}

function availableLanguages() {
  const seen = new Set();
  const featured = COMMON_LANGS.map((code) => LANG_POOL.find((item) => canonical(item?.code) === code)).filter(Boolean);
  const merged = [...featured, ...LANG_POOL];
  return merged.filter((item) => {
    const code = canonical(item?.code);
    if (!code || seen.has(code)) return false;
    seen.add(code);
    return true;
  });
}

function bcpFor(code) {
  const c = canonical(code);
  return {
    tr: "tr-TR",
    en: "en-US",
    de: "de-DE",
    fr: "fr-FR",
    it: "it-IT",
    es: "es-ES",
    ar: "ar-SA",
    ru: "ru-RU",
    pt: "pt-PT",
    zh: "zh-CN",
    ja: "ja-JP",
    ko: "ko-KR"
  }[c] || "en-US";
}

function toast(message) {
  const el = $("miniToast") || $("toast");
  if (!el) return;
  el.textContent = String(message || "");
  el.classList.add("show");
  clearTimeout(window.__twoPhoneBtToastTimer);
  window.__twoPhoneBtToastTimer = setTimeout(() => el.classList.remove("show"), 1900);
}

function clean(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\b(\S+)( \1\b)+/gi, "$1")
    .trim();
}

function makeMessageId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function parseWirePayload(value) {
  const raw = String(value || "");
  if (!raw.trim().startsWith("{")) {
    return { text: raw, messageId: "", origin: "remote_bt", sourceLang: "auto", targetLang: targetLang(), sentAt: 0 };
  }

  try {
    const data = JSON.parse(raw);
    return {
      text: String(data?.text || data?.message || ""),
      messageId: String(data?.messageId || data?.id || ""),
      origin: String(data?.origin || "remote_bt"),
      sourceLang: canonical(data?.sourceLang || "auto"),
      targetLang: canonical(data?.targetLang || targetLang()),
      sentAt: Number(data?.sentAt || 0)
    };
  } catch {
    return { text: raw, messageId: "", origin: "remote_bt", sourceLang: "auto", targetLang: targetLang(), sentAt: 0 };
  }
}

function injectTwoPhoneCss() {
  if ($("italkyTwoPhoneUxStyle")) return;
  const style = document.createElement("style");
  style.id = "italkyTwoPhoneUxStyle";
  style.textContent = `
    body.bt-premium-mode .two-phone-lang-bar{
      width:min(88vw,560px);
      margin:10px auto 6px;
      display:grid;
      grid-template-columns:1fr auto 1fr;
      gap:8px;
      align-items:stretch;
      position:relative;
      z-index:40;
    }
    body.bt-premium-mode .two-phone-lang-card{
      min-width:0;
      min-height:54px;
      border:1px solid rgba(147,197,253,.22);
      border-radius:16px;
      background:linear-gradient(145deg,rgba(15,23,42,.86),rgba(30,64,175,.24));
      color:#fff;
      display:flex;
      flex-direction:column;
      justify-content:center;
      align-items:flex-start;
      padding:9px 11px;
      cursor:pointer;
      box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 12px 28px rgba(2,6,23,.22);
      font-family:inherit;
      text-align:left;
    }
    body.bt-premium-mode .two-phone-lang-label{
      color:rgba(191,219,254,.70);
      font-size:10px;
      font-weight:1000;
      letter-spacing:.6px;
      text-transform:uppercase;
      white-space:nowrap;
    }
    body.bt-premium-mode .two-phone-lang-value{
      margin-top:4px;
      max-width:100%;
      color:#fff;
      font-size:14px;
      font-weight:1000;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    body.bt-premium-mode .two-phone-lang-arrow{
      display:flex;
      align-items:center;
      justify-content:center;
      color:#93c5fd;
      font-weight:1000;
      font-size:16px;
      text-shadow:0 0 16px rgba(59,130,246,.45);
    }
    body.bt-premium-mode .two-phone-remote-pair{
      width:min(88vw,560px);
      min-height:24px;
      margin:0 auto 4px;
      color:rgba(226,232,240,.72);
      font-size:11px;
      font-weight:900;
      text-align:center;
      position:relative;
      z-index:39;
    }
    body.bt-premium-mode .two-phone-bt-status{
      width:min(80vw,430px);
      min-height:28px;
      margin:4px auto 0;
      color:rgba(219,234,254,.82);
      font-size:11px;
      font-weight:900;
      text-align:center;
      position:relative;
      z-index:39;
    }
    body.bt-premium-mode .two-phone-bt-status.connected{color:#86efac;}
    body.bt-premium-mode .two-phone-bt-status.warn{color:#fcd34d;}
    body.bt-premium-mode .two-phone-bt-status.error{color:#fca5a5;}
    body.bt-premium-mode .two-phone-lang-picker{
      position:fixed;
      inset:0;
      z-index:2147483647;
      display:none;
      align-items:center;
      justify-content:center;
      padding:18px;
      background:rgba(2,6,23,.72);
      backdrop-filter:blur(10px);
      -webkit-backdrop-filter:blur(10px);
    }
    body.bt-premium-mode .two-phone-lang-picker.show{display:flex;}
    body.bt-premium-mode .two-phone-lang-picker-card{
      width:min(92vw,390px);
      max-height:min(72vh,560px);
      display:flex;
      flex-direction:column;
      overflow:hidden;
      border-radius:22px;
      border:1px solid rgba(147,197,253,.24);
      background:linear-gradient(180deg,#0f172a,#020617);
      box-shadow:0 24px 70px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.06);
    }
    body.bt-premium-mode .two-phone-lang-picker-head{
      padding:15px 16px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      border-bottom:1px solid rgba(255,255,255,.08);
      font-size:14px;
      font-weight:1000;
    }
    body.bt-premium-mode .two-phone-lang-picker-close{
      width:36px;
      height:36px;
      border:none;
      border-radius:12px;
      background:rgba(255,255,255,.08);
      color:#fff;
      font-size:18px;
      font-weight:1000;
      cursor:pointer;
    }
    body.bt-premium-mode .two-phone-lang-picker-list{
      overflow-y:auto;
      padding:9px;
      scrollbar-width:none;
    }
    body.bt-premium-mode .two-phone-lang-picker-list::-webkit-scrollbar{display:none;}
    body.bt-premium-mode .two-phone-lang-option{
      width:100%;
      min-height:46px;
      border:none;
      border-radius:14px;
      background:transparent;
      color:#fff;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      padding:0 12px;
      font-family:inherit;
      font-size:14px;
      font-weight:900;
      cursor:pointer;
    }
    body.bt-premium-mode .two-phone-lang-option.active{
      background:rgba(59,130,246,.18);
      color:#bfdbfe;
    }
    body.bt-premium-mode .two-phone-message{
      transition:font-size .18s ease, opacity .18s ease, transform .18s ease;
    }
    body.bt-premium-mode .chat-body .two-phone-message{
      font-size:19px!important;
      opacity:.54!important;
      line-height:1.22!important;
      max-width:86%!important;
    }
    body.bt-premium-mode .chat-body .two-phone-message.latest,
    body.bt-premium-mode .chat-body .two-phone-message.is-latest{
      font-size:31px!important;
      opacity:1!important;
      font-weight:1000!important;
    }
    body.bt-premium-mode #topBody,
    body.bt-premium-mode #botBody{
      justify-content:flex-end!important;
      gap:12px!important;
    }
    body.bt-premium-mode #botMic.bt-mic-disabled{
      opacity:.52;
      filter:saturate(.65);
      box-shadow:none!important;
    }
    @media(max-width:390px){
      body.bt-premium-mode .two-phone-lang-bar{width:min(84vw,340px);gap:6px;margin-top:8px;}
      body.bt-premium-mode .two-phone-lang-card{min-height:50px;padding:8px 9px;}
      body.bt-premium-mode .two-phone-lang-value{font-size:13px;}
      body.bt-premium-mode .chat-body .two-phone-message{font-size:17px!important;}
      body.bt-premium-mode .chat-body .two-phone-message.latest,
      body.bt-premium-mode .chat-body .two-phone-message.is-latest{font-size:27px!important;}
    }
  `;
  document.head.appendChild(style);
}

function ensureLanguageUi() {
  injectTwoPhoneCss();
  const topSection = $("topSection");
  if (!topSection || $("twoPhoneLangBar")) return;

  const bar = document.createElement("div");
  bar.id = "twoPhoneLangBar";
  bar.className = "two-phone-lang-bar";
  bar.innerHTML = `
    <button id="twoPhoneSourceLang" class="two-phone-lang-card" type="button">
      <span class="two-phone-lang-label">Benim Dilim</span>
      <span class="two-phone-lang-value"></span>
    </button>
    <div class="two-phone-lang-arrow" aria-hidden="true">→</div>
    <button id="twoPhoneTargetLang" class="two-phone-lang-card" type="button">
      <span class="two-phone-lang-label">Çeviri Dili</span>
      <span class="two-phone-lang-value"></span>
    </button>
  `;

  const remotePair = document.createElement("div");
  remotePair.id = "twoPhoneRemotePair";
  remotePair.className = "two-phone-remote-pair";
  remotePair.textContent = "Karşı telefondan gelecek çeviri burada görünecek.";

  const status = document.createElement("div");
  status.id = "twoPhoneBtStatus";
  status.className = "two-phone-bt-status warn";
  status.textContent = "Önce Bluetooth bağlantısı kurun.";

  const hint = $("premiumBtHint");
  if (hint?.nextSibling) {
    topSection.insertBefore(bar, hint.nextSibling);
    topSection.insertBefore(remotePair, bar.nextSibling);
    topSection.insertBefore(status, remotePair.nextSibling);
  } else {
    topSection.insertBefore(bar, topSection.firstChild);
    topSection.insertBefore(remotePair, bar.nextSibling);
    topSection.insertBefore(status, remotePair.nextSibling);
  }

  $("twoPhoneSourceLang")?.addEventListener("click", () => openLanguagePicker("source"));
  $("twoPhoneTargetLang")?.addEventListener("click", () => openLanguagePicker("target"));
  updateLanguageUi();
}

function updateLanguageUi() {
  const src = sourceLang();
  const dst = targetLang();
  const srcEl = $("twoPhoneSourceLang")?.querySelector(".two-phone-lang-value");
  const dstEl = $("twoPhoneTargetLang")?.querySelector(".two-phone-lang-value");
  if (srcEl) srcEl.textContent = langLabel(src);
  if (dstEl) dstEl.textContent = langLabel(dst);
}

function openLanguagePicker(kind) {
  const current = kind === "source" ? sourceLang() : targetLang();
  const title = kind === "source" ? "Benim Dilim" : "Çeviri Dili";
  let picker = $("twoPhoneLangPicker");
  if (!picker) {
    picker = document.createElement("div");
    picker.id = "twoPhoneLangPicker";
    picker.className = "two-phone-lang-picker";
    document.body.appendChild(picker);
    picker.addEventListener("click", (event) => {
      if (event.target === picker) picker.classList.remove("show");
    });
  }

  const list = availableLanguages().map((lang) => {
    const code = canonical(lang.code);
    const active = code === current ? " active" : "";
    return `<button class="two-phone-lang-option${active}" type="button" data-code="${code}"><span>${lang.flag || "🌐"} ${langLabel(code)}</span><small>${code.toUpperCase()}</small></button>`;
  }).join("");

  picker.innerHTML = `
    <div class="two-phone-lang-picker-card">
      <div class="two-phone-lang-picker-head">
        <span>${title}</span>
        <button class="two-phone-lang-picker-close" type="button" aria-label="Kapat">×</button>
      </div>
      <div class="two-phone-lang-picker-list">${list}</div>
    </div>
  `;

  picker.querySelector(".two-phone-lang-picker-close")?.addEventListener("click", () => picker.classList.remove("show"));
  picker.querySelectorAll(".two-phone-lang-option").forEach((button) => {
    button.addEventListener("click", () => {
      const code = canonical(button.getAttribute("data-code"));
      if (kind === "source") {
        localStorage.setItem(SOURCE_LANG_KEY, code);
        if (!localStorage.getItem(TARGET_LANG_KEY) || targetLang() === code) {
          localStorage.setItem(TARGET_LANG_KEY, defaultTargetFor(code));
        }
      } else {
        localStorage.setItem(TARGET_LANG_KEY, code);
      }
      updateLanguageUi();
      picker.classList.remove("show");
    });
  });

  picker.classList.add("show");
}

function setRemotePair(source, target) {
  const el = $("twoPhoneRemotePair");
  if (!el) return;
  const src = canonical(source || "auto");
  const dst = canonical(target || targetLang());
  el.textContent = `${src === "auto" ? "Otomatik" : langLabel(src)} → ${langLabel(dst)}`;
}

function setBtStatus(message, state = "warn") {
  const el = $("twoPhoneBtStatus");
  if (!el) return;
  el.textContent = String(message || "");
  el.classList.remove("connected", "warn", "error");
  el.classList.add(state);
}

function startDiscoveryStatus() {
  clearTimeout(discoveryTimer);
  setBtStatus("Cihaz aranıyor...", "warn");
  discoveryTimer = setTimeout(() => {
    if (!btConnected) setBtStatus("Yeni cihaz bulunamadı. Telefonların Bluetooth'unu ve görünürlüğünü kontrol edin.", "error");
  }, 22000);
}

function stopDiscoveryStatus() {
  clearTimeout(discoveryTimer);
  discoveryTimer = null;
}

function clearPanel(side) {
  const body = side === "top" ? $("topBody") : $("botBody");
  if (body) body.innerHTML = "";
}

function addLine(side, text, latest = false) {
  const body = side === "top" ? $("topBody") : $("botBody");
  if (!body) return null;
  body.querySelectorAll(".bubble.latest,.bubble.is-latest").forEach((x) => x.classList.remove("latest", "is-latest"));
  const div = document.createElement("div");
  div.className = `bubble two-phone-message${latest ? " latest is-latest" : ""}`;
  div.textContent = String(text || "");
  body.appendChild(div);
  requestAnimationFrame(() => {
    try { body.scrollTop = body.scrollHeight; } catch {}
  });
  return div;
}

function setMicListening(value) {
  $("botMic")?.classList.toggle("listening", !!value);
}

function updateMicAvailability() {
  const mic = $("botMic");
  if (!mic) return;
  mic.classList.toggle("bt-mic-disabled", !btConnected);
  mic.setAttribute("aria-disabled", String(!btConnected));
}

function stopSpeech() {
  recording = false;
  setMicListening(false);
  try {
    if (window.Native?.stopSpeechRecognition) window.Native.stopSpeechRecognition();
    else if (window.AndroidBridge?.stopSpeechRecognition) window.AndroidBridge.stopSpeechRecognition();
    else if (webRecognizer) webRecognizer.stop();
  } catch {}
  webRecognizer = null;
}

function installTtsGuard() {
  if (window.__italkyTwoPhoneTtsGuardInstalled) return;
  window.__italkyTwoPhoneTtsGuardInstalled = true;

  const wrap = (owner, key) => {
    try {
      if (!owner || typeof owner[key] !== "function" || owner[key].__italkyTwoPhoneGuarded) return;
      const original = owner[key].bind(owner);
      const guarded = function (...args) {
        if (!allowRemoteTts) {
          console.warn("[TWO_PHONE_BT] blocked local TTS");
          return undefined;
        }
        return original(...args);
      };
      guarded.__italkyTwoPhoneGuarded = true;
      owner[key] = guarded;
    } catch {}
  };

  wrap(window.AndroidBridge, "speak");
  wrap(window.NativeTTS, "speak");
  wrap(window.speechSynthesis, "speak");
}

async function translateIncoming(text, from, to) {
  const payload = {
    text: clean(text),
    from_lang: canonical(from || "auto"),
    to_lang: canonical(to),
    source: canonical(from || "auto"),
    target: canonical(to),
    mode: "normal",
    use_ai: false,
    cultural: false,
    tone: "neutral"
  };

  const endpoints = [`${API_BASE}/api/translate_ai`, `${API_BASE}/api/translate-ai`, `${API_BASE}/api/translate`];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      const value = clean(data?.translated || data?.translation || data?.text || "");
      if (res.ok && value) return value;
    } catch {}
  }
  return null;
}

function speakRemoteTranslation(text, lang) {
  const value = clean(text);
  if (!value) return;
  speakingRemote = true;
  allowRemoteTts = true;
  try {
    installTtsGuard();
    if (window.AndroidBridge?.speak) window.AndroidBridge.speak(value, canonical(lang));
    else if (window.NativeTTS?.speak) window.NativeTTS.speak(value, canonical(lang));
    else if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(value);
      utterance.lang = bcpFor(lang);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  } catch {}
  finally {
    allowRemoteTts = false;
  }

  setTimeout(() => {
    speakingRemote = false;
    restartHandsFreeIfNeeded();
  }, Math.max(2600, value.length * 70));
}

function sendLocalSpeech(text) {
  const value = clean(text);
  if (!value) {
    restartHandsFreeIfNeeded();
    return;
  }

  const now = Date.now();
  if (value === lastSentText && now - lastSentAt < 2500) return;

  const messageId = makeMessageId();
  const src = sourceLang();
  const dst = targetLang();
  const payload = {
    text: value,
    messageId,
    origin: "local_speech",
    sourceLang: src,
    targetLang: dst,
    sentAt: now
  };
  const wire = JSON.stringify(payload);

  lastSentText = value;
  lastSentAt = now;
  lastSentMessageId = messageId;

  try {
    if (window.AndroidBridge?.sendBtText) window.AndroidBridge.sendBtText(wire);
    else if (window.Native?.sendBtText) window.Native.sendBtText(wire);
    else if (window.AndroidBridge?.sendBluetoothText) window.AndroidBridge.sendBluetoothText(wire);
    else toast("Bluetooth gönderim köprüsü hazır değil.");
  } catch (e) {
    console.warn("[TWO_PHONE_BT] send failed", e);
    toast("Bluetooth mesajı gönderilemedi.");
  }

  addLine("bot", value, true);
  setRemotePair(src, dst);
  restartHandsFreeIfNeeded();
}

function isLocalEcho(text, messageId) {
  const value = clean(text);
  if (messageId && messageId === lastSentMessageId) return true;
  return !!value && value === lastSentText && Date.now() - lastSentAt < 8000;
}

async function handleBtMessage(value) {
  const payload = parseWirePayload(value);
  const incomingText = clean(payload.text);

  if (!incomingText || isLocalEcho(incomingText, payload.messageId)) {
    console.warn("[TWO_PHONE_BT] ignored local echo");
    return;
  }

  const target = canonical(payload.targetLang || targetLang());
  const source = payload.sourceLang || "auto";
  setRemotePair(source, target);
  addLine("top", incomingText, false);
  const row = addLine("top", "Çevriliyor...", true);
  const translated = await translateIncoming(incomingText, source, target);
  const finalText = translated || "Çeviri alınamadı.";
  if (row) row.textContent = finalText;
  if (translated) speakRemoteTranslation(translated, target);
}

function parseSpeechResult(arg1, arg2, arg3) {
  let text = "";
  let isFinal = true;

  if (typeof arg1 === "string" && (arg1 === "top" || arg1 === "bot")) {
    text = String(arg2 || "");
    isFinal = arg3 !== false;
  } else if (typeof arg1 === "string") {
    try {
      const data = JSON.parse(arg1);
      text = String(data?.text || data?.transcript || "");
      isFinal = data?.isFinal !== false && data?.final !== false;
    } catch {
      text = arg1;
      isFinal = arg3 !== false;
    }
  } else if (arg1 && typeof arg1 === "object") {
    text = String(arg1.text || arg1.transcript || "");
    isFinal = arg1.isFinal !== false && arg1.final !== false;
  }

  return { text: clean(text), isFinal };
}

function handleSpeechResult(arg1, arg2, arg3) {
  const result = parseSpeechResult(arg1, arg2, arg3);
  if (!btConnected || !result.isFinal) return;
  recording = false;
  setMicListening(false);
  sendLocalSpeech(result.text);
}

function handleSpeechError(errorMsg) {
  const code = String(errorMsg || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  recording = false;
  setMicListening(false);

  if (["manual_stop_empty", "no_speech", "no_match", "speech_timeout", "timeout", "empty", "empty_result", "client_error", "recognizer_busy"].includes(code)) {
    restartHandsFreeIfNeeded();
    return;
  }

  if (code.includes("permission")) toast("Mikrofon izni gerekli.");
  else toast("Mikrofon başlatılamadı.");
  restartHandsFreeIfNeeded();
}

function startSpeech() {
  if (!btConnected) {
    toast("Önce Bluetooth bağlantısı kurun.");
    return;
  }
  if (recording) {
    stopSpeech();
    return;
  }

  const lang = bcpFor(sourceLang());
  recording = true;
  setMicListening(true);

  try {
    if (window.Native?.startSpeechRecognition) {
      window.Native.startSpeechRecognition(lang, "bot");
      return;
    }
    if (window.AndroidBridge?.startSpeechRecognition) {
      window.AndroidBridge.startSpeechRecognition(lang, "bot");
      return;
    }
  } catch (e) {
    console.warn("[TWO_PHONE_BT] native speech start failed", e);
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    recording = false;
    setMicListening(false);
    toast("Bu cihazda konuşma tanıma hazır değil.");
    return;
  }

  const rec = new SpeechRecognition();
  webRecognizer = rec;
  rec.lang = lang;
  rec.continuous = false;
  rec.interimResults = true;
  rec.onresult = (event) => {
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      if (event.results[i].isFinal) finalText += event.results[i][0]?.transcript || "";
    }
    if (finalText) handleSpeechResult("bot", finalText, true);
  };
  rec.onerror = (event) => handleSpeechError(event?.error || "speech_error");
  rec.onend = () => {
    if (recording) {
      recording = false;
      setMicListening(false);
      restartHandsFreeIfNeeded();
    }
  };

  try { rec.start(); }
  catch (e) {
    console.warn("[TWO_PHONE_BT] web speech start failed", e);
    handleSpeechError("start_error");
  }
}

function restartHandsFreeIfNeeded() {
  clearTimeout(restartTimer);
  if (!handsFree || !btConnected || recording || speakingRemote) return;
  restartTimer = setTimeout(() => {
    if (handsFree && btConnected && !recording && !speakingRemote) startSpeech();
  }, 900 + Math.floor(Math.random() * 500));
}

function connectBluetooth() {
  try {
    startDiscoveryStatus();
    if (window.AndroidBridge?.startBluetoothConnect) window.AndroidBridge.startBluetoothConnect();
    else {
      stopDiscoveryStatus();
      setBtStatus("Bluetooth köprüsü hazır değil.", "error");
      toast("Bluetooth köprüsü hazır değil.");
    }
  } catch {
    stopDiscoveryStatus();
    setBtStatus("Bluetooth başlatılamadı.", "error");
    toast("Bluetooth başlatılamadı.");
  }
}

function setConnected(value, deviceName = "") {
  btConnected = !!value;
  window.isBtConnected = btConnected;
  document.body.classList.toggle("bt-active", btConnected);
  $("btToggleBtn")?.classList.toggle("connected", btConnected);
  updateMicAvailability();
  const hf = $("handsFreeToggle");
  if (hf) {
    hf.style.display = btConnected ? "inline-flex" : "none";
    if (!btConnected) hf.classList.remove("active");
  }
  if (btConnected) {
    stopDiscoveryStatus();
    setBtStatus(deviceName ? `${deviceName} · Bağlandı` : "Bağlandı", "connected");
  } else {
    handsFree = false;
    stopSpeech();
    setBtStatus("Önce Bluetooth bağlantısı kurun.", "warn");
  }
}

function bindControls(options = {}) {
  const botMic = $("botMic");
  const btBtn = $("btToggleBtn");
  const hfBtn = $("handsFreeToggle");
  const clearBtn = $("clearBtn") || $("sideClearBtn");
  const homeLink = $("homeLink");

  botMic?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    startSpeech();
  }, true);

  botMic?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    startSpeech();
  }, true);

  btBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    connectBluetooth();
  }, true);

  hfBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    handsFree = !handsFree;
    hfBtn.classList.toggle("active", handsFree);
    if (handsFree) startSpeech();
    else stopSpeech();
  }, true);

  clearBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearPanel("top");
    clearPanel("bot");
  }, true);

  homeLink?.addEventListener("click", (event) => {
    event.preventDefault();
    location.href = options.homeHref || "/pages/home.html";
  }, true);
}

function bindBridge() {
  installTtsGuard();

  window.onBtConnected = function (deviceName) {
    setConnected(true, clean(deviceName));
    clearPanel("top");
    clearPanel("bot");
    toast("Bluetooth bağlantısı kuruldu.");
  };

  window.onBtDisconnected = function () {
    setConnected(false);
    toast("Bluetooth bağlantısı kapandı.");
  };

  window.onBtDevicePickerClosed = function () {
    if (!btConnected) setBtStatus("Cihaz seçimi kapandı.", "warn");
  };

  window.onBtDiscoveryStarted = function () {
    startDiscoveryStatus();
  };

  window.onBtDiscoveryFinished = function (count) {
    if (btConnected) return;
    stopDiscoveryStatus();
    const found = Number(count || 0);
    if (found > 0) setBtStatus(`${found} cihaz bulundu. Bağlanmak için cihazı seçin.`, "warn");
    else setBtStatus("Yeni cihaz bulunamadı. Telefonların Bluetooth'unu ve görünürlüğünü kontrol edin.", "error");
  };

  window.onBtPermissionMissing = function () {
    stopDiscoveryStatus();
    setBtStatus("Bluetooth tarama izni gerekli.", "error");
    toast("Bluetooth tarama izni gerekli.");
  };

  window.onBtPairingStarted = function () {
    setBtStatus("Eşleşme başlatıldı...", "warn");
  };

  window.onBtPairingFailed = function () {
    setBtStatus("Eşleşme tamamlanamadı. Cihazları görünür yapıp tekrar deneyin.", "error");
  };

  window.onBtMessageReceived = handleBtMessage;
  window.onBtMessage = handleBtMessage;
  window.onBluetoothMessageReceived = handleBtMessage;
  window.onBluetoothMessage = handleBtMessage;
  window.onNativeSpeechResult = handleSpeechResult;
  window.onNativeSpeechError = handleSpeechError;
  window.__italkyStartHandsFreeListening = () => startSpeech();
}

export function installTwoPhoneBluetoothMode(options = {}) {
  if (installed) return;
  installed = true;
  ensureLanguageUi();
  bindControls(options);
  bindBridge();
  setConnected(false);
}
