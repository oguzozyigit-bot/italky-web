// FILE: /js/facetoface_bluetooth_premium.js

const $ = (id) => document.getElementById(id);
const API_BASE = "https://italky-api.onrender.com";

const isBluetoothMode = new URLSearchParams(location.search).get("mode") === "bluetooth";

let isBtConnected = false;
let isHandsFree = false;
let isSpeaking = false;
let recordingSide = null;
let webRecognizer = null;
let lastSentText = "";
let lastSentAt = 0;

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
  const el = $("miniToast");
  if (!el) return;
  el.textContent = String(message || "");
  el.classList.add("show");
  clearTimeout(window.__premiumBtToastTimer);
  window.__premiumBtToastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

function addBubble(side, text, latest = false) {
  const body = side === "top" ? $("topBody") : $("botBody");
  if (!body) return null;
  if (latest) body.querySelectorAll(".bubble.me.is-latest,.bubble.latest").forEach((x) => x.classList.remove("is-latest", "latest"));

  const div = document.createElement("div");
  div.className = `bubble me${latest ? " is-latest latest" : ""}`;
  div.innerHTML = `<span class="bubble-row"><span class="txt"></span></span>`;
  const txt = div.querySelector(".txt");
  if (txt) txt.textContent = String(text || "").trim();
  else div.textContent = String(text || "").trim();
  body.appendChild(div);

  const scroll = () => {
    try { body.scrollTop = body.scrollHeight; } catch {}
  };
  scroll();
  requestAnimationFrame(scroll);
  setTimeout(scroll, 60);
  return div;
}

function clearBody(side) {
  const body = side === "top" ? $("topBody") : $("botBody");
  if (body) body.innerHTML = "";
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

  isSpeaking = true;
  const delay = Math.max(2600, value.length * 75);

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
  }, delay);
}

function setMicState(side, listening) {
  const mic = side === "top" ? $("topMic") : $("botMic");
  mic?.classList.toggle("listening", !!listening);
}

function cleanupTranscript(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
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

  stopRecognizer();
  recordingSide = side;
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
  } catch {}

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
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      if (event.results[i].isFinal) finalText += event.results[i][0]?.transcript || "";
    }
    if (finalText) handleSpeechFinal(side, finalText);
  };

  rec.onerror = () => {
    recordingSide = null;
    setMicState(side, false);
    restartHandsFreeIfNeeded();
  };

  rec.onend = () => {
    recordingSide = null;
    setMicState(side, false);
    restartHandsFreeIfNeeded();
  };

  try { rec.start(); }
  catch {
    recordingSide = null;
    setMicState(side, false);
    restartHandsFreeIfNeeded();
  }
}

function handleSpeechFinal(side, text) {
  const clean = cleanupTranscript(text);
  recordingSide = null;
  setMicState(side, false);
  if (!clean) {
    restartHandsFreeIfNeeded();
    return;
  }

  if (side === "bot" && isBtConnected) {
    const now = Date.now();
    if (clean === lastSentText && now - lastSentAt < 2500) {
      restartHandsFreeIfNeeded();
      return;
    }
    lastSentText = clean;
    lastSentAt = now;
    try { window.AndroidBridge?.sendBtText?.(clean); } catch {}
    addBubble("bot", clean, false);
    restartHandsFreeIfNeeded();
    return;
  }
}

function restartHandsFreeIfNeeded() {
  if (!isHandsFree || !isBtConnected || recordingSide || isSpeaking) return;
  const delay = 800 + Math.floor(Math.random() * 600);
  setTimeout(() => {
    if (isHandsFree && isBtConnected && !recordingSide && !isSpeaking) startRecording("bot");
  }, delay);
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

function connectBluetooth() {
  try {
    if (window.AndroidBridge?.startBluetoothConnect) window.AndroidBridge.startBluetoothConnect();
    else toast("Bluetooth köprüsü hazır değil.");
  } catch {
    toast("Bluetooth başlatılamadı.");
  }
}

function disconnectBluetooth() {
  try { window.AndroidBridge?.disconnectBluetooth?.(); } catch {}
  window.onBtDisconnected?.();
}

function bindControls() {
  const btBtn = $("btToggleBtn");
  const hfBtn = $("handsFreeToggle");
  if (btBtn) {
    btBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isBtConnected) disconnectBluetooth();
      else connectBluetooth();
    });
  }

  if (hfBtn) {
    hfBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      isHandsFree = !isHandsFree;
      hfBtn.classList.toggle("active", isHandsFree);
      if (isHandsFree) startRecording("bot");
      else stopRecognizer();
    });
  }

  const botMic = $("botMic");
  if (botMic) {
    botMic.addEventListener("click", (e) => {
      if (!isBtConnected) return;
      e.preventDefault();
      e.stopImmediatePropagation?.();
      if (recordingSide === "bot") stopRecognizer();
      else startRecording("bot");
    }, true);
  }
}

function bindBridgeEvents() {
  const previousConnected = window.onBtConnected;
  const previousDisconnected = window.onBtDisconnected;
  const previousMessage = window.onBtMessageReceived;
  const previousSpeech = window.onNativeSpeechResult;
  const previousError = window.onNativeSpeechError;

  window.onBtConnected = function (...args) {
    isBtConnected = true;
    document.body.classList.add("bt-active");
    setBtButtonConnected(true);
    setHandsFreeVisible(true);
    clearBody("top");
    clearBody("bot");
    toast("Bluetooth bağlantısı kuruldu.");
    try { previousConnected?.(...args); } catch {}
  };

  window.onBtDisconnected = function (...args) {
    isBtConnected = false;
    isHandsFree = false;
    stopRecognizer();
    document.body.classList.remove("bt-active");
    setBtButtonConnected(false);
    setHandsFreeVisible(false);
    toast("Bluetooth bağlantısı kapandı.");
    try { previousDisconnected?.(...args); } catch {}
  };

  window.onBtMessageReceived = async function (text, ...args) {
    const raw = String(text || "");
    if (raw.startsWith("SYS_CMD:LANG:")) {
      try { previousMessage?.(text, ...args); } catch {}
      return;
    }

    const row = addBubble("top", "", true);
    const translated = await translateOnline(raw, "auto", currentBotLang());
    const value = translated || "Çeviri alınamadı.";
    const target = row?.querySelector(".txt") || row;
    if (target) target.textContent = value;
    if (translated) speak(translated, currentBotLang());
  };

  window.onNativeSpeechResult = function (arg1, arg2, arg3) {
    let side = "";
    let text = "";
    let isFinal = true;

    try {
      if (typeof arg1 === "string" && (arg1 === "top" || arg1 === "bot")) {
        side = arg1;
        text = String(arg2 || "");
        isFinal = arg3 !== false;
      } else if (typeof arg1 === "string") {
        const data = JSON.parse(arg1);
        side = data?.side || "";
        text = String(data?.text || "");
        isFinal = data?.isFinal !== false;
      } else if (arg1 && typeof arg1 === "object") {
        side = arg1.side || "";
        text = String(arg1.text || "");
        isFinal = arg1.isFinal !== false;
      }
    } catch {}

    if (isBtConnected && side === "bot") {
      if (isFinal) handleSpeechFinal("bot", text);
      return;
    }

    try { previousSpeech?.(arg1, arg2, arg3); } catch {}
  };

  window.onNativeSpeechError = function (error) {
    if (isBtConnected && isHandsFree) {
      recordingSide = null;
      setMicState("bot", false);
      restartHandsFreeIfNeeded();
      return;
    }
    try { previousError?.(error); } catch {}
  };
}

function boot() {
  if (!isBluetoothMode) return;
  document.body.classList.add("premium-bt-mode");
  setHandsFreeVisible(false);
  bindControls();
  bindBridgeEvents();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
