// Shared FaceToFace Bluetooth flow extracted from the working guest login_entry flow.

const API_BASE = "https://italky-api.onrender.com";
const $ = (id) => document.getElementById(id);

let installed = false;
let isBtConnected = false;
let isHandsFree = false;
let isSpeaking = false;
let recordingSide = null;
let webRecognizer = null;
let liveText = "";
let lastSentText = "";
let lastSentAt = 0;
let handsFreeRestartTimer = null;
let btPickerTimeout = null;
let previousHandlers = null;

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim() || "en";
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
    bg: "bg-BG",
    pt: "pt-PT",
    zh: "zh-CN",
    ja: "ja-JP",
    ko: "ko-KR"
  }[c] || "en-US";
}

function currentBotLang() {
  return canonical(window.botLang || localStorage.getItem("f2f_bot_lang") || localStorage.getItem("site_lang") || "en");
}

function currentTopLang() {
  return canonical(window.topLang || localStorage.getItem("f2f_top_lang") || "en");
}

function toast(message) {
  const el = $("miniToast") || $("toast");
  if (!el) return;
  el.textContent = String(message || "");
  el.classList.add("show");
  clearTimeout(window.__premiumBtToastTimer);
  window.__premiumBtToastTimer = setTimeout(() => el.classList.remove("show"), 1900);
}

function clearBody(target) {
  const body = typeof target === "string" ? (target === "top" ? $("topBody") : $("botBody")) : target;
  if (body) body.innerHTML = "";
}

function addBubble(side, text, latest = false) {
  const body = side === "top" ? $("topBody") : $("botBody");
  if (!body) return null;
  if (latest) body.querySelectorAll(".bubble.latest,.bubble.is-latest").forEach((x) => x.classList.remove("latest", "is-latest"));

  const div = document.createElement("div");
  div.className = `bubble${latest ? " latest is-latest" : ""}`;
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
  const mic = side === "top" ? $("topMic") : $("botMic");
  mic?.classList.toggle("listening", !!listening);
}

function cleanupTranscript(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\b(\S+)( \1\b)+/gi, "$1")
    .trim();
}

function stopRecognizer() {
  const side = recordingSide;
  recordingSide = null;
  if (side) setMicState(side, false);

  try {
    if (window.Native?.stopSpeechRecognition) window.Native.stopSpeechRecognition();
    else if (window.AndroidBridge?.stopSpeechRecognition) window.AndroidBridge.stopSpeechRecognition();
    else if (webRecognizer) webRecognizer.stop();
  } catch {}
  webRecognizer = null;
}

function startRecording(side = "bot") {
  if (!isBtConnected && side === "bot") {
    toast("Önce Bluetooth bağlantısı kurun.");
    return;
  }

  if (recordingSide) stopRecognizer();
  recordingSide = side;
  liveText = "";
  setMicState(side, true);

  const lang = side === "top" ? currentTopLang() : currentBotLang();
  const bcp = bcpFor(lang);

  try {
    if (window.Native?.startSpeechRecognition) {
      window.Native.startSpeechRecognition(bcp, side);
      return;
    }
    if (window.AndroidBridge?.startSpeechRecognition) {
      window.AndroidBridge.startSpeechRecognition(bcp, side);
      return;
    }
  } catch (e) {
    console.warn("[BT_GUEST_FLOW] native speech start failed", e);
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    recordingSide = null;
    setMicState(side, false);
    toast("Bu cihazda konuşma tanıma hazır değil.");
    return;
  }

  const rec = new SpeechRecognition();
  webRecognizer = rec;
  rec.lang = bcp;
  rec.continuous = false;
  rec.interimResults = true;

  rec.onresult = (event) => {
    let finalTranscript = "";
    let interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      if (event.results[i].isFinal) finalTranscript += event.results[i][0]?.transcript || "";
      else interimTranscript += event.results[i][0]?.transcript || "";
    }
    if (finalTranscript) handleNativeSpeechResult(side, finalTranscript, true);
    else if (interimTranscript) handleNativeSpeechResult(side, interimTranscript, false);
  };
  rec.onerror = (event) => handleNativeSpeechError(event?.error || "speech_error");
  rec.onend = () => {
    if (recordingSide === side) {
      setMicState(side, false);
      recordingSide = null;
      restartHandsFreeIfNeeded();
    }
  };

  try { rec.start(); }
  catch (e) {
    console.warn("[BT_GUEST_FLOW] web speech start blocked", e);
    handleNativeSpeechError("start_error");
  }
}

async function translateOnline(text, from, to) {
  const payload = {
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
      const value = String(data?.translated || data?.translation || data?.text || "").trim();
      if (res.ok && value) return value;
    } catch {}
  }
  return null;
}

function speak(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return;
  if (isHandsFree) stopRecognizer();
  isSpeaking = true;

  try {
    if (window.AndroidBridge?.speak) window.AndroidBridge.speak(value, canonical(langCode));
    else if (window.NativeTTS?.speak) window.NativeTTS.speak(value, canonical(langCode));
    else if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(value);
      u.lang = bcpFor(langCode);
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
    }
  } catch {}

  setTimeout(() => {
    isSpeaking = false;
    restartHandsFreeIfNeeded();
  }, Math.max(3000, value.length * 80));
}

function sendBluetoothText(text) {
  const clean = cleanupTranscript(text);
  if (!clean) return;
  const now = Date.now();
  if (clean === lastSentText && now - lastSentAt < 2500) return;
  lastSentText = clean;
  lastSentAt = now;

  try {
    if (window.AndroidBridge?.sendBtText) window.AndroidBridge.sendBtText(clean);
    else if (window.Native?.sendBtText) window.Native.sendBtText(clean);
    else if (window.AndroidBridge?.sendBluetoothText) window.AndroidBridge.sendBluetoothText(clean);
  } catch (e) {
    console.warn("[BT_GUEST_FLOW] sendBtText failed", e);
  }
  addBubble("bot", clean, false);
}

function finalizeSpeech(side, text) {
  recordingSide = null;
  setMicState(side, false);
  const clean = cleanupTranscript(text);
  if (!clean) {
    restartHandsFreeIfNeeded();
    return;
  }

  if (isBtConnected && side === "bot") {
    sendBluetoothText(clean);
    restartHandsFreeIfNeeded();
    return;
  }
}

function parseSpeechArgs(arg1, arg2, arg3) {
  let side = recordingSide || "bot";
  let text = "";
  let isFinal = true;

  if (typeof arg1 === "string" && (arg1 === "top" || arg1 === "bot")) {
    side = arg1;
    text = String(arg2 || "");
    isFinal = typeof arg3 !== "undefined" ? arg3 !== false : true;
  } else if (typeof arg1 === "string") {
    try {
      const data = JSON.parse(arg1);
      side = data?.side || recordingSide || "bot";
      text = String(data?.text || data?.transcript || "");
      isFinal = data?.isFinal !== false && data?.final !== false;
    } catch {
      text = arg1;
      isFinal = arg3 !== false;
    }
  } else if (arg1 && typeof arg1 === "object") {
    side = arg1.side || recordingSide || "bot";
    text = String(arg1.text || arg1.transcript || "");
    isFinal = arg1.isFinal !== false && arg1.final !== false;
  }

  return { side, text, isFinal };
}

function handleNativeSpeechResult(arg1, arg2, arg3) {
  const parsed = parseSpeechArgs(arg1, arg2, arg3);
  liveText = cleanupTranscript(parsed.text);

  if (!isBtConnected) return;

  if (parsed.isFinal) {
    finalizeSpeech("bot", liveText);
    liveText = "";
  }
}

function handleNativeSpeechError(errorMsg) {
  const code = String(errorMsg || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  recordingSide = null;
  setMicState("bot", false);

  if (["manual_stop_empty", "no_speech", "no_match", "speech_timeout", "timeout", "empty", "empty_result"].includes(code)) {
    restartHandsFreeIfNeeded();
    return;
  }

  if (isHandsFree && ["client_error", "recognizer_busy", "start_error"].includes(code)) {
    restartHandsFreeIfNeeded();
    return;
  }

  if (code.includes("permission")) toast("Mikrofon izni gerekli");
  else if (code.includes("network") || code.includes("server")) toast("Ağ bağlantısı zayıf veya konuşma motoru yanıt vermiyor.");
  else if (!isHandsFree) toast(`Mikrofon hatası (${errorMsg || "unknown"})`);

  restartHandsFreeIfNeeded();
}

function restartHandsFreeIfNeeded() {
  clearTimeout(handsFreeRestartTimer);
  if (!isHandsFree || !isBtConnected || recordingSide || isSpeaking) return;
  const delay = 800 + Math.floor(Math.random() * 600);
  handsFreeRestartTimer = setTimeout(() => {
    if (isHandsFree && isBtConnected && !recordingSide && !isSpeaking) startRecording("bot");
  }, delay);
}

function clearBluetoothPickerTimer() {
  clearTimeout(btPickerTimeout);
  btPickerTimeout = null;
}

function setBtButtonConnected(connected) {
  const btn = $("btToggleBtn");
  if (!btn) return;
  btn.classList.toggle("connected", !!connected);
}

function setHandsFreeVisible(visible) {
  const btn = $("handsFreeToggle");
  if (!btn) return;
  btn.style.display = visible ? "inline-flex" : "none";
  if (!visible) btn.classList.remove("active");
}

function closeLanguagePopups() {
  $("pop-top")?.classList.remove("show");
  $("pop-bot")?.classList.remove("show");
}

function handleConnected() {
  clearBluetoothPickerTimer();
  isBtConnected = true;
  window.isBtConnected = true;
  document.body.classList.add("bt-active");
  setBtButtonConnected(true);
  setHandsFreeVisible(true);
  clearBody("top");
  clearBody("bot");
  closeLanguagePopups();
  toast("Bluetooth bağlantısı kuruldu.");
}

function handleDisconnected() {
  clearBluetoothPickerTimer();
  isBtConnected = false;
  isHandsFree = false;
  window.isBtConnected = false;
  stopRecognizer();
  document.body.classList.remove("bt-active");
  setBtButtonConnected(false);
  setHandsFreeVisible(false);
  closeLanguagePopups();
  toast("Bluetooth bağlantısı kapandı.");
}

async function handleBluetoothMessage(text, ...args) {
  const raw = String(text || "");
  if (raw.startsWith("SYS_CMD:LANG:")) {
    try { previousHandlers?.btMessage?.(text, ...args); } catch {}
    return;
  }

  const row = addBubble("top", "", true);
  const translated = await translateOnline(raw, "auto", currentBotLang());
  const value = translated || "Çeviri alınamadı.";
  if (row) row.textContent = value;
  if (translated) speak(translated, currentBotLang());
}

function connectBluetooth() {
  clearBluetoothPickerTimer();
  btPickerTimeout = setTimeout(() => {
    if (!isBtConnected) toast("Yeni cihaz bulunamadı. Telefonların Bluetooth'unu ve görünürlüğünü kontrol edin.");
  }, 22000);

  try {
    if (window.AndroidBridge?.startBluetoothConnect) window.AndroidBridge.startBluetoothConnect();
    else toast("Bluetooth köprüsü hazır değil.");
  } catch {
    clearBluetoothPickerTimer();
    toast("Bluetooth başlatılamadı.");
  }
}

function bindControls(options = {}) {
  const btBtn = $("btToggleBtn");
  const hfBtn = $("handsFreeToggle");
  const botMic = $("botMic");

  if (btBtn && !btBtn.__italkySharedBtBound) {
    btBtn.__italkySharedBtBound = true;
    btBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (isBtConnected) {
        toast("Bluetooth bağlantısı aktif.");
        return;
      }
      connectBluetooth();
    }, true);
  }

  if (hfBtn && !hfBtn.__italkySharedBtBound) {
    hfBtn.__italkySharedBtBound = true;
    hfBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      isHandsFree = !isHandsFree;
      hfBtn.classList.toggle("active", isHandsFree);
      if (isHandsFree) startRecording("bot");
      else stopRecognizer();
    }, true);
  }

  if (botMic && !botMic.__italkySharedBtBound) {
    botMic.__italkySharedBtBound = true;
    botMic.addEventListener("click", (event) => {
      if (!isBtConnected) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      if (recordingSide === "bot") stopRecognizer();
      else startRecording("bot");
    }, true);
  }

  const clearBtn = $("clearBtn") || $("sideClearBtn");
  if (clearBtn && !clearBtn.__italkySharedBtClearBound) {
    clearBtn.__italkySharedBtClearBound = true;
    clearBtn.addEventListener("click", () => {
      stopRecognizer();
      liveText = "";
      clearBody("top");
      clearBody("bot");
    }, true);
  }

  const homeLink = $("homeLink");
  if (homeLink && !homeLink.__italkySharedBtHomeBound) {
    homeLink.__italkySharedBtHomeBound = true;
    homeLink.addEventListener("click", (event) => {
      if (!options.homeHref) return;
      event.preventDefault();
      location.href = options.homeHref;
    }, true);
  }
}

function bindBridgeEvents() {
  if (!previousHandlers) {
    previousHandlers = {
      btMessage: window.onBtMessageReceived,
      pickerClosed: window.onBtDevicePickerClosed,
      permissionMissing: window.onBtPermissionMissing,
      discoveryError: window.onBtDiscoveryError,
      discoveryFinished: window.onBtDiscoveryFinished
    };
  }

  window.onBtConnected = handleConnected;
  window.onBtDisconnected = handleDisconnected;
  window.onBtMessageReceived = handleBluetoothMessage;
  window.onNativeSpeechResult = handleNativeSpeechResult;
  window.onNativeSpeechError = handleNativeSpeechError;
  window.__italkyStartHandsFreeListening = () => startRecording("bot");

  window.onBtDevicePickerClosed = function (...args) {
    clearBluetoothPickerTimer();
    try { previousHandlers?.pickerClosed?.(...args); } catch {}
  };

  window.onBtPermissionMissing = function (...args) {
    clearBluetoothPickerTimer();
    toast("Bluetooth tarama izni gerekli.");
    try { previousHandlers?.permissionMissing?.(...args); } catch {}
  };

  window.onBtDiscoveryError = function (message, ...args) {
    clearBluetoothPickerTimer();
    const raw = String(message || "").toLowerCase();
    if (raw.includes("permission") || raw.includes("izin")) toast("Bluetooth tarama izni gerekli.");
    else toast("Yeni cihaz bulunamadı. Telefonların Bluetooth'unu ve görünürlüğünü kontrol edin.");
    try { previousHandlers?.discoveryError?.(message, ...args); } catch {}
  };

  window.onBtDiscoveryFinished = function (count, ...args) {
    clearBluetoothPickerTimer();
    const found = Number(count || 0);
    if (!isBtConnected && found <= 0) toast("Yeni cihaz bulunamadı. Telefonların Bluetooth'unu ve görünürlüğünü kontrol edin.");
    try { previousHandlers?.discoveryFinished?.(count, ...args); } catch {}
  };
}

export function installFaceToFaceBluetoothGuestFlow(options = {}) {
  if (installed) return;
  installed = true;
  bindControls(options);
  bindBridgeEvents();
  setHandsFreeVisible(false);
}
