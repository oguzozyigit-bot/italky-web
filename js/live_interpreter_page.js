// FILE: /js/live_interpreter_page.js

import { LANG_POOL } from "/js/lang_pool_full.js";

const $ = (id) => document.getElementById(id);
const WS_BASE = "wss://italky-api.onrender.com";

const frameRoot = $("frameRoot");
const topBody = $("topBody");
const botBody = $("botBody");
const topLangBtn = $("topLangBtn");
const topLangTxt = $("topLangTxt");
const popTop = $("pop-top");
const listTop = $("list-top");
const closeTop = $("close-top");
const topVoiceBtn = $("topVoiceBtn");
const voicePopTop = $("voice-pop-top");
const voiceListTop = $("voice-list-top");
const closeVoiceTop = $("close-voice-top");
const topMuteBtn = $("topMuteBtn");
const homeLink = $("homeLink");
const homeBtn = $("homeBtn");
const clearBtn = $("clearBtn");
const botMic = $("botMic");
const botHelper = $("botHelper");

const query = new URLSearchParams(location.search);
const roomId = String(query.get("room") || "").trim();
const role = String(query.get("role") || "guest").trim().toLowerCase();
const hostCode = String(query.get("host") || "").trim();

let myLang = String(query.get("my") || localStorage.getItem("live_interpreter_lang") || "tr").trim().toLowerCase();
let peerLang = String(query.get("peer") || localStorage.getItem("live_interpreter_peer_lang") || "en").trim().toLowerCase();

let myVoicePref = localStorage.getItem("live_interpreter_voice") || "female";
let isMuted = localStorage.getItem("live_interpreter_muted") === "1";

let recognition = null;
let isListening = false;
let ws = null;
let wsReady = false;
let pingTimer = null;

const BCP = {
  tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", it: "it-IT",
  es: "es-ES", ru: "ru-RU", el: "el-GR", az: "az-AZ", ka: "ka-GE",
  pt: "pt-PT", nl: "nl-NL", ar: "ar-SA", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR"
};

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim();
}

myLang = canonical(myLang || "tr");
peerLang = canonical(peerLang || "en");

const LANGS = (Array.isArray(LANG_POOL) ? LANG_POOL : [])
  .map((l) => {
    const code = canonical(l.code);
    if (!code) return null;
    return {
      code,
      flag: l.flag || "🌐",
      name: l.name || code.toUpperCase(),
      bcp: BCP[code] || "en-US"
    };
  })
  .filter(Boolean);

function langObj(code) {
  const c = canonical(code);
  return LANGS.find((x) => x.code === c) || {
    code: c,
    flag: "🌐",
    name: c.toUpperCase(),
    bcp: BCP[c] || "en-US"
  };
}

function labelChip(code) {
  const o = langObj(code);
  return `${o.flag} ${o.name}`;
}

const VOICE_OPTIONS = [
  { id: "female", label: "Kadın Ses" },
  { id: "male", label: "Erkek Ses" },
  { id: "self", label: "Kendi Sesim" }
];

function refreshVoiceLabel() {
  const item = VOICE_OPTIONS.find((v) => v.id === myVoicePref) || VOICE_OPTIONS[0];
  if (topVoiceBtn) topVoiceBtn.textContent = `${item.label} ⌵`;
}

function setHelper(mode, text) {
  if (!botHelper) return;
  botHelper.className = "helper-text";
  if (mode === "ready") botHelper.classList.add("helper-ready");
  else if (mode === "wait") botHelper.classList.add("helper-wait");
  else if (mode === "repeat") botHelper.classList.add("helper-repeat");
  botHelper.textContent = text || "";
}

function setRootState(state) {
  if (!frameRoot) return;
  frameRoot.classList.remove("is-ready", "is-listening", "is-translating", "is-idle", "is-error");
  frameRoot.classList.add(state);
}

function closeAllPop() {
  popTop?.classList.remove("show");
  voicePopTop?.classList.remove("show");
}

function updateMuteButton() {
  if (!topMuteBtn) return;
  topMuteBtn.style.opacity = isMuted ? "0.55" : "1";
}

function clearLatest(container) {
  container?.querySelectorAll(".bubble.me.is-latest")?.forEach((el) => {
    el.classList.remove("is-latest");
  });
}

function demoteOld(container) {
  const items = [...container.querySelectorAll(".bubble.me")];
  if (items.length <= 1) return;

  items.forEach((el, idx) => {
    if (idx < items.length - 1) {
      el.classList.remove("is-latest");
      el.style.opacity = idx < items.length - 3 ? ".45" : ".72";
    }
  });
}

function renderLangPopup() {
  if (!listTop) return;

  listTop.innerHTML = LANGS.map((l) => {
    const active = canonical(l.code) === canonical(myLang) ? "active" : "";
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

  listTop.querySelectorAll(".pop-item").forEach((el) => {
    el.addEventListener("click", () => {
      myLang = canonical(el.getAttribute("data-code") || "tr");
      localStorage.setItem("live_interpreter_lang", myLang);
      if (topLangTxt) topLangTxt.textContent = labelChip(myLang);
      rebuildRecognition();
      closeAllPop();
    });
  });
}

function renderVoicePopup() {
  if (!voiceListTop) return;

  voiceListTop.innerHTML = VOICE_OPTIONS.map((v) => {
    const active = v.id === myVoicePref ? "active" : "";
    return `
      <div class="pop-item ${active}" data-voice="${v.id}">
        <div class="pop-left"><div class="pop-name">${v.label}</div></div>
        <div class="pop-code">${v.id.toUpperCase()}</div>
      </div>
    `;
  }).join("");

  voiceListTop.querySelectorAll(".pop-item").forEach((el) => {
    el.addEventListener("click", () => {
      myVoicePref = el.getAttribute("data-voice") || "female";
      localStorage.setItem("live_interpreter_voice", myVoicePref);
      refreshVoiceLabel();
      closeAllPop();
    });
  });
}

function makeSpeakerButton(text, langCode) {
  const btn = document.createElement("button");
  btn.className = "spk-icon";
  btn.type = "button";
  btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 10v4h4l5 4V6L7 10H3"></path><path d="M16 9a4 4 0 0 1 0 6"></path><path d="M19 5a8 8 0 0 1 0 14"></path></svg>`;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    speak(text, langCode);
  });
  return btn;
}

function addTopBubble(text) {
  if (!topBody) return;
  const row = document.createElement("div");
  row.className = "bubble me is-latest";

  const wrap = document.createElement("div");
  wrap.className = "bubble-row";

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "").trim();

  wrap.appendChild(txt);
  wrap.appendChild(makeSpeakerButton(text, myLang));
  row.appendChild(wrap);

  clearLatest(topBody);
  topBody.appendChild(row);
  topBody.scrollTop = topBody.scrollHeight;
  demoteOld(topBody);
}

function addBottomBubble(text) {
  if (!botBody) return;
  const row = document.createElement("div");
  row.className = "bubble me is-latest";

  const wrap = document.createElement("div");
  wrap.className = "bubble-row";

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text || "").trim();

  wrap.appendChild(txt);
  row.appendChild(wrap);

  clearLatest(botBody);
  botBody.appendChild(row);
  botBody.scrollTop = botBody.scrollHeight;
  demoteOld(botBody);
}

function stopSpeech() {
  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}
}

function chooseWebVoice(langCode) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const bcp = langObj(langCode).bcp.toLowerCase();
  const langBase = canonical(langCode);

  let pool = voices.filter((v) => String(v.lang || "").toLowerCase().startsWith(langBase));
  if (!pool.length) pool = voices.filter((v) => String(v.lang || "").toLowerCase() === bcp);
  if (!pool.length) pool = voices;
  if (!pool.length) return null;

  if (myVoicePref === "female") return pool.find((v) => /female|woman|zira|aria|seda|helena|jenny|susan/i.test(v.name)) || pool[0];
  if (myVoicePref === "male") return pool.find((v) => /male|man|david|mark|george|james|alex|tom/i.test(v.name)) || pool[0];
  return pool[0];
}

function speak(text, langCode) {
  const t = String(text || "").trim();
  if (!t || isMuted) return;

  stopSpeech();
  setRootState("is-translating");

  if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
    try {
      window.NativeTTS.speak(t, canonical(langCode));
      setTimeout(() => setRootState("is-ready"), 900);
      return;
    } catch {}
  }

  if (!window.speechSynthesis) {
    setRootState("is-ready");
    return;
  }

  const u = new SpeechSynthesisUtterance(t);
  u.lang = langObj(langCode).bcp;
  u.rate = 1;
  u.pitch = 1;
  u.volume = 1;
  const voice = chooseWebVoice(langCode);
  if (voice) u.voice = voice;
  u.onend = () => setRootState("is-ready");
  u.onerror = () => setRootState("is-ready");
  window.speechSynthesis.speak(u);
}

function createRecognizer() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;

  const rec = new SR();
  rec.lang = langObj(myLang).bcp;
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  return rec;
}

function rebuildRecognition() {
  recognition = createRecognizer();
}

async function speechToTextFallback() {
  const txt = prompt(`${langObj(myLang).name} olarak konuşmanı yaz:`) || "";
  return String(txt).trim() || null;
}

function wsUrl() {
  const url = new URL(`${WS_BASE}/ws/interpreter/${encodeURIComponent(roomId)}`);
  url.searchParams.set("role", role);
  url.searchParams.set("lang", myLang);
  return url.toString();
}

function stopSocket() {
  try { ws?.close?.(); } catch {}
  ws = null;
  wsReady = false;
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = null;
}

function handleSocketMessage(payload) {
  const type = String(payload?.type || "").trim();

  if (type === "presence") {
    if (role === "host" && payload?.guest_lang) {
      peerLang = canonical(payload.guest_lang);
      localStorage.setItem("live_interpreter_peer_lang", peerLang);
    }
    if (role === "guest" && payload?.host_lang) {
      peerLang = canonical(payload.host_lang);
      localStorage.setItem("live_interpreter_peer_lang", peerLang);
    }
    return;
  }

  if (type === "peer_joined") {
    setHelper("ready", "Karşı taraf bağlandı");
    setRootState("is-ready");

    if (role === "host" && payload?.guest_lang) {
      peerLang = canonical(payload.guest_lang);
      localStorage.setItem("live_interpreter_peer_lang", peerLang);
    }
    return;
  }

  if (type === "translated_message") {
    const sender = String(payload?.sender || "").trim().toLowerCase();
    if (!sender || sender === role) return;

    const translated = String(payload?.translated_text || "").trim();
    if (!translated) return;

    addTopBubble(translated);
    speak(translated, myLang);
    setHelper("ready", "Mesaj geldi");
    setRootState("is-ready");
    return;
  }

  if (type === "peer_left") {
    setHelper("wait", "Karşı taraf ayrıldı");
    setRootState("is-idle");
    return;
  }

  if (type === "error") {
    console.warn("[ws error]", payload);
    setHelper("wait", payload?.message || "Bağlantı hatası");
    setRootState("is-error");
  }
}

function startSocket() {
  if (!roomId) {
    setHelper("wait", "Room ID bulunamadı");
    setRootState("is-error");
    return;
  }

  stopSocket();

  try {
    ws = new WebSocket(wsUrl());
  } catch (e) {
    console.error("[ws create]", e);
    setHelper("wait", "WebSocket açılamadı");
    setRootState("is-error");
    return;
  }

  ws.onopen = () => {
    wsReady = true;
    setHelper("ready", "Konuşmaya hazır");
    setRootState("is-ready");

    pingTimer = setInterval(() => {
      try {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      } catch {}
    }, 15000);
  };

  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      handleSocketMessage(payload);
    } catch (e) {
      console.warn("[ws parse]", e);
    }
  };

  ws.onerror = () => {
    wsReady = false;
    setHelper("wait", "Bağlantı sorunu");
    setRootState("is-error");
  };

  ws.onclose = () => {
    wsReady = false;
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = null;
    setHelper("wait", "Bağlantı kapandı");
    setRootState("is-idle");
  };
}

async function startListeningFlow() {
  if (isListening) return;

  if (!wsReady || !ws || ws.readyState !== WebSocket.OPEN) {
    setHelper("wait", "Bağlantı hazır değil");
    setRootState("is-error");
    return;
  }

  isListening = true;
  botMic?.classList.add("listening");
  setRootState("is-listening");
  setHelper("wait", "Dinleniyor... konuş");

  try {
    let spoken = null;

    if (window.Native && typeof window.Native.startSpeechRecognition === "function") {
      spoken = await new Promise((resolve) => {
        let finished = false;
        const done = (val) => {
          if (finished) return;
          finished = true;
          window.onNativeSpeechResult = null;
          window.onNativeSpeechError = null;
          resolve(val);
        };

        window.onNativeSpeechResult = (payload) => {
          try {
            done(String(payload?.text || "").trim() || null);
          } catch {
            done(null);
          }
        };

        window.onNativeSpeechError = () => done(null);

        try {
          window.Native.startSpeechRecognition(langObj(myLang).bcp, "bottom");
          setTimeout(() => done(null), 9000);
        } catch {
          done(null);
        }
      });
    } else if (recognition) {
      spoken = await new Promise((resolve) => {
        let finished = false;
        const finish = (val) => {
          if (finished) return;
          finished = true;
          try { recognition.stop(); } catch {}
          resolve(val);
        };

        recognition.onresult = (e) => finish(String(e.results?.[0]?.[0]?.transcript || "").trim() || null);
        recognition.onerror = () => finish(null);
        recognition.onend = () => finish(null);

        try {
          recognition.start();
          setTimeout(() => finish(null), 9000);
        } catch {
          finish(null);
        }
      });
    }

    if (!spoken) spoken = await speechToTextFallback();

    if (!spoken) {
      setHelper("ready", "Konuşma alınamadı");
      setRootState("is-ready");
      return;
    }

    addBottomBubble(spoken);
    setRootState("is-translating");
    setHelper("repeat", "Gönderiliyor...");

    try {
      ws.send(JSON.stringify({
        type: "text_message",
        text: spoken,
        from_lang: canonical(myLang),
        to_lang: canonical(peerLang)
      }));
    } catch (e) {
      console.error("[ws send]", e);
      setHelper("wait", "Mesaj gönderilemedi");
      setRootState("is-error");
      return;
    }

    setHelper("ready", "Karşı taraf bekleniyor...");
    setRootState("is-ready");
  } finally {
    isListening = false;
    botMic?.classList.remove("listening");
  }
}

topLangBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  closeAllPop();
  renderLangPopup();
  popTop?.classList.add("show");
});

topVoiceBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  closeAllPop();
  renderVoicePopup();
  voicePopTop?.classList.add("show");
});

closeTop?.addEventListener("click", () => closeAllPop());
closeVoiceTop?.addEventListener("click", () => closeAllPop());

document.addEventListener("click", (e) => {
  const inLang = popTop?.contains(e.target);
  const inVoice = voicePopTop?.contains(e.target);
  const onBtn = e.target?.closest?.("#topLangBtn,#topVoiceBtn");
  if (!inLang && !inVoice && !onBtn) closeAllPop();
}, { capture: true });

topMuteBtn?.addEventListener("click", () => {
  isMuted = !isMuted;
  localStorage.setItem("live_interpreter_muted", isMuted ? "1" : "0");
  updateMuteButton();
  if (isMuted) stopSpeech();
});

clearBtn?.addEventListener("click", () => {
  stopSpeech();
  if (topBody) topBody.innerHTML = "";
  if (botBody) botBody.innerHTML = "";
  setHelper("ready", "Temizlendi");
  setRootState("is-ready");
});

homeLink?.addEventListener("click", () => {
  stopSocket();
  location.href = "/pages/home.html";
});

homeBtn?.addEventListener("click", () => {
  stopSocket();
  location.href = "/pages/home.html";
});

botMic?.addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  await startListeningFlow();
});

botMic?.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    await startListeningFlow();
  }
});

function bootInfo() {
  if (hostCode) addTopBubble(`Bağlantı hazır • ${hostCode}`);
  else if (roomId) addTopBubble(`Oda hazır • ${roomId}`);
  else addTopBubble("Canlı çeviri bağlantısı hazır.");
}

function init() {
  if (topLangTxt) topLangTxt.textContent = labelChip(myLang);
  refreshVoiceLabel();
  updateMuteButton();
  rebuildRecognition();
  setRootState("is-ready");
  setHelper("ready", "Bağlantı kuruluyor...");

  try {
    window.speechSynthesis?.getVoices?.();
    window.speechSynthesis.onvoiceschanged = () => {};
  } catch {}

  localStorage.setItem("live_interpreter_lang", myLang);
  localStorage.setItem("live_interpreter_peer_lang", peerLang);

  bootInfo();
  startSocket();
}

init();
window.addEventListener("beforeunload", stopSocket);
