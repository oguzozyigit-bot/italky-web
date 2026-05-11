// Isolated 2 Telefon / Bluetooth flow. No FaceToFace local translate, AI answer, or local TTS.

const API_BASE = "https://italky-api.onrender.com";
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
    return { text: raw, messageId: "", origin: "remote_bt", sourceLang: "auto", sentAt: 0 };
  }

  try {
    const data = JSON.parse(raw);
    return {
      text: String(data?.text || data?.message || ""),
      messageId: String(data?.messageId || data?.id || ""),
      origin: String(data?.origin || "remote_bt"),
      sourceLang: canonical(data?.sourceLang || "auto"),
      sentAt: Number(data?.sentAt || 0)
    };
  } catch {
    return { text: raw, messageId: "", origin: "remote_bt", sourceLang: "auto", sentAt: 0 };
  }
}

function clearPanel(side) {
  const body = side === "top" ? $("topBody") : $("botBody");
  if (body) body.innerHTML = "";
}

function addLine(side, text, latest = false) {
  const body = side === "top" ? $("topBody") : $("botBody");
  if (!body) return null;
  if (latest) body.querySelectorAll(".bubble.latest,.bubble.is-latest").forEach((x) => x.classList.remove("latest", "is-latest"));
  const div = document.createElement("div");
  div.className = `bubble${latest ? " latest is-latest" : ""}`;
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
  const payload = {
    text: value,
    messageId,
    origin: "local_speech",
    sourceLang: siteLang(),
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

  addLine("bot", value, false);
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

  const target = siteLang();
  const row = addLine("top", "Çevriliyor...", true);
  const translated = await translateIncoming(incomingText, payload.sourceLang || "auto", target);
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
    toast("Önce Bluetooth ile diğer telefonu bağlayın.");
    return;
  }
  if (recording) {
    stopSpeech();
    return;
  }

  const lang = bcpFor(siteLang());
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
    if (window.AndroidBridge?.startBluetoothConnect) window.AndroidBridge.startBluetoothConnect();
    else toast("Bluetooth köprüsü hazır değil.");
  } catch {
    toast("Bluetooth başlatılamadı.");
  }
}

function setConnected(value) {
  btConnected = !!value;
  window.isBtConnected = btConnected;
  document.body.classList.toggle("bt-active", btConnected);
  $("btToggleBtn")?.classList.toggle("connected", btConnected);
  const hf = $("handsFreeToggle");
  if (hf) {
    hf.style.display = btConnected ? "inline-flex" : "none";
    if (!btConnected) hf.classList.remove("active");
  }
  if (!btConnected) {
    handsFree = false;
    stopSpeech();
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

  window.onBtConnected = function () {
    setConnected(true);
    clearPanel("top");
    clearPanel("bot");
    toast("Bluetooth bağlantısı kuruldu.");
  };

  window.onBtDisconnected = function () {
    setConnected(false);
    toast("Bluetooth bağlantısı kapandı.");
  };

  window.onBtMessageReceived = handleBtMessage;
  window.onNativeSpeechResult = handleSpeechResult;
  window.onNativeSpeechError = handleSpeechError;
  window.__italkyStartHandsFreeListening = () => startSpeech();
}

export function installTwoPhoneBluetoothMode(options = {}) {
  if (installed) return;
  installed = true;
  bindControls(options);
  bindBridge();
  setConnected(false);
}
