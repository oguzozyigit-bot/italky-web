// FILE: /js/live_interpreter_page.js

import { LANG_POOL } from "/js/lang_pool_full.js";

const $ = (id) => document.getElementById(id);

/* =========================
   API / WS
========================= */
const API_BASE = "https://italky-api.onrender.com/api";
const WS_BASE = "wss://italky-api.onrender.com";

/* =========================
   DOM
========================= */
const roomMetaText = $("roomMetaText");
const statusText = $("statusText");

const peerList = $("peerList");
const meList = $("meList");
const peerEmpty = $("peerEmpty");
const meEmpty = $("meEmpty");

const clearBtn = $("clearBtn");
const homeBtn = $("homeBtn");

const myLangBtn = $("myLangBtn");
const myLangTxt = $("myLangTxt");
const peerLangBtn = $("peerLangBtn");
const peerLangTxt = $("peerLangTxt");
const voiceBtn = $("voiceBtn");
const voiceTxt = $("voiceTxt");
const muteBtn = $("muteBtn");

const myLangPop = $("myLangPop");
const myLangList = $("myLangList");
const closeMyLang = $("closeMyLang");

const peerLangPop = $("peerLangPop");
const peerLangList = $("peerLangList");
const closePeerLang = $("closePeerLang");

const voicePop = $("voicePop");
const voiceList = $("voiceList");
const closeVoice = $("closeVoice");

const micBtn = $("micBtn");
const textInput = $("textInput");
const sendBtn = $("sendBtn");

/* =========================
   URL PARAMS
========================= */
const query = new URLSearchParams(location.search);

let roomId = String(query.get("room") || "").trim();
const hostCode = String(query.get("host") || "").trim().toUpperCase();
const role = String(query.get("role") || "guest").trim().toLowerCase();

let myLang = String(
  query.get("my") || localStorage.getItem("live_interpreter_lang") || "tr"
).trim().toLowerCase();

let peerLang = String(
  query.get("peer") || localStorage.getItem("live_interpreter_peer_lang") || "en"
).trim().toLowerCase();

/* =========================
   STATE
========================= */
let ws = null;
let wsReady = false;
let pingTimer = null;

let myVoicePref = localStorage.getItem("live_interpreter_voice") || "female";
let isMuted = localStorage.getItem("live_interpreter_muted") === "1";

let recognition = null;
let isListening = false;

/* =========================
   LANG
========================= */
const BCP = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  it: "it-IT",
  es: "es-ES",
  ru: "ru-RU",
  el: "el-GR",
  az: "az-AZ",
  ka: "ka-GE",
  pt: "pt-PT",
  nl: "nl-NL",
  ar: "ar-SA",
  zh: "zh-CN",
  ja: "ja-JP",
  ko: "ko-KR"
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

/* =========================
   VOICE OPTIONS
========================= */
const VOICE_OPTIONS = [
  { id: "female", label: "Kadın Ses" },
  { id: "male", label: "Erkek Ses" },
  { id: "self", label: "Kendi Sesim" }
];

/* =========================
   UI HELPERS
========================= */
function setStatusText(text) {
  if (statusText) statusText.textContent = text || "";
}

function updateRoomMeta() {
  if (!roomMetaText) return;

  if (roomId) {
    roomMetaText.textContent = `Room: ${roomId}`;
  } else if (hostCode) {
    roomMetaText.textContent = `Host: ${hostCode}`;
  } else {
    roomMetaText.textContent = "Room hazırlanıyor...";
  }
}

function hideEmpty(el) {
  if (el) el.style.display = "none";
}

function showEmptyIfNeeded(listEl, emptyEl) {
  if (!listEl || !emptyEl) return;
  const hasBubble = !!listEl.querySelector(".bubble, .sysBubble");
  emptyEl.style.display = hasBubble ? "none" : "flex";
}

function autoGrowTextarea() {
  if (!textInput) return;
  textInput.style.height = "auto";
  const next = Math.min(textInput.scrollHeight, 116);
  textInput.style.height = `${next}px`;
}

function closeAllPops() {
  myLangPop?.classList.remove("show");
  peerLangPop?.classList.remove("show");
  voicePop?.classList.remove("show");
}

function refreshLabels() {
  if (myLangTxt) myLangTxt.textContent = labelChip(myLang);
  if (peerLangTxt) peerLangTxt.textContent = labelChip(peerLang);

  const item = VOICE_OPTIONS.find((v) => v.id === myVoicePref) || VOICE_OPTIONS[0];
  if (voiceTxt) voiceTxt.textContent = item.label;

  if (muteBtn) {
    muteBtn.classList.toggle("is-muted", isMuted);
  }
}

/* =========================
   MESSAGE UI
========================= */
function demoteOldMessages(listEl) {
  if (!listEl) return;

  const bubbles = [...listEl.querySelectorAll(".bubble")];
  bubbles.forEach((b) => {
    b.classList.remove("is-latest", "is-old-1", "is-old-2", "is-old-3");
  });

  const reversed = [...bubbles].reverse();

  reversed.forEach((b, idx) => {
    if (idx === 0) b.classList.add("is-latest");
    else if (idx === 1) b.classList.add("is-old-1");
    else if (idx === 2) b.classList.add("is-old-2");
    else b.classList.add("is-old-3");
  });
}

function scrollBottom(listEl) {
  if (!listEl) return;

  const apply = () => {
    try { listEl.scrollTop = listEl.scrollHeight; } catch {}
  };

  apply();
  requestAnimationFrame(apply);
  setTimeout(apply, 40);
}

function makeSpeakerButton(text, langCode) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "spkBtn";
  btn.setAttribute("aria-label", "Dinlet");

  btn.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M11 5 6 9H3v6h3l5 4V5Z"></path>
      <path d="M16 9a4 4 0 0 1 0 6"></path>
      <path d="M19 5a8 8 0 0 1 0 14"></path>
    </svg>
  `;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await speak(text, langCode);
  });

  return btn;
}

function addBubble(listEl, emptyEl, text, side, withSpeaker = false, speakLang = "tr") {
  if (!listEl) return;

  hideEmpty(emptyEl);

  const row = document.createElement("div");
  row.className = "bubble";

  const wrap = document.createElement("div");
  wrap.className = "bubbleRow";

  const txt = document.createElement("div");
  txt.className = "bubbleText";
  txt.textContent = String(text || "").trim();

  wrap.appendChild(txt);

  if (withSpeaker) {
    wrap.appendChild(makeSpeakerButton(txt.textContent, speakLang));
  }

  row.appendChild(wrap);
  listEl.appendChild(row);

  demoteOldMessages(listEl);
  scrollBottom(listEl);
  showEmptyIfNeeded(listEl, emptyEl);

  return row;
}

function addSystemTo(listEl, emptyEl, text) {
  if (!listEl) return;

  hideEmpty(emptyEl);

  const row = document.createElement("div");
  row.className = "sysBubble";
  row.textContent = String(text || "").trim();

  listEl.appendChild(row);
  scrollBottom(listEl);
  showEmptyIfNeeded(listEl, emptyEl);
}

/* =========================
   SPEECH / TTS
========================= */
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

  if (myVoicePref === "female") {
    return pool.find((v) => /female|woman|zira|aria|seda|helena|jenny|susan/i.test(v.name)) || pool[0];
  }
  if (myVoicePref === "male") {
    return pool.find((v) => /male|man|david|mark|george|james|alex|tom/i.test(v.name)) || pool[0];
  }
  return pool[0];
}

async function speak(text, langCode) {
  const t = String(text || "").trim();
  if (!t || isMuted) return;

  stopSpeech();

  if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
    try {
      window.NativeTTS.speak(t, canonical(langCode));
      return;
    } catch {}
  }

  if (!window.speechSynthesis) return;

  const u = new SpeechSynthesisUtterance(t);
  u.lang = langObj(langCode).bcp;
  u.rate = 1;
  u.pitch = 1;
  u.volume = 1;

  const voice = chooseWebVoice(langCode);
  if (voice) u.voice = voice;

  window.speechSynthesis.speak(u);
}

/* =========================
   POPUP RENDER
========================= */
function renderLangList(targetEl, selectedCode, onSelect) {
  if (!targetEl) return;

  targetEl.innerHTML = LANGS.map((l) => {
    const active = canonical(l.code) === canonical(selectedCode) ? "active" : "";
    return `
      <button class="popItem ${active}" type="button" data-code="${l.code}">
        <div class="popLeft">
          <div class="popFlag">${l.flag}</div>
          <div class="popName">${l.name}</div>
        </div>
        <div class="popCode">${l.code.toUpperCase()}</div>
      </button>
    `;
  }).join("");

  targetEl.querySelectorAll(".popItem").forEach((el) => {
    el.addEventListener("click", () => {
      const code = canonical(el.getAttribute("data-code") || "tr");
      onSelect(code);
      closeAllPops();
    });
  });
}

function renderVoiceList() {
  if (!voiceList) return;

  voiceList.innerHTML = VOICE_OPTIONS.map((v) => {
    const active = v.id === myVoicePref ? "active" : "";
    return `
      <button class="popItem ${active}" type="button" data-voice="${v.id}">
        <div class="popLeft">
          <div class="popName">${v.label}</div>
        </div>
        <div class="popCode">${v.id.toUpperCase()}</div>
      </button>
    `;
  }).join("");

  voiceList.querySelectorAll(".popItem").forEach((el) => {
    el.addEventListener("click", () => {
      myVoicePref = String(el.getAttribute("data-voice") || "female").trim().toLowerCase();
      localStorage.setItem("live_interpreter_voice", myVoicePref);
      refreshLabels();
      closeAllPops();
    });
  });
}

/* =========================
   ROOM API
========================= */
async function createRoomIfHost() {
  if (role !== "host") return null;
  if (roomId) return { room_id: roomId };

  if (!hostCode) {
    throw new Error("host_code bulunamadı");
  }

  const r = await fetch(`${API_BASE}/interpreter/create-room`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      host_code: hostCode,
      my_lang: myLang,
      mode: "interpreter"
    })
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.room_id) {
    throw new Error(j?.detail || j?.error || "room create başarısız");
  }

  return j;
}

async function resolveRoomByHost() {
  if (!hostCode) return null;

  const r = await fetch(`${API_BASE}/interpreter/resolve-room`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      host_code: hostCode,
      my_lang: myLang,
      mode: "interpreter"
    })
  });

  const j = await r.json().catch(() => ({}));

  if (!r.ok || !j?.room_id) {
    throw new Error(j?.detail || j?.error || "room resolve başarısız");
  }

  return j;
}

async function joinRoomIfNeeded() {
  if (!roomId) return;
  if (role !== "guest") return;

  try {
    const r = await fetch(`${API_BASE}/interpreter/join-room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        room_id: roomId,
        my_lang: myLang
      })
    });

    const j = await r.json().catch(() => ({}));

    if (!r.ok) {
      throw new Error(j?.detail || "join-room başarısız");
    }

    addSystemTo(meList, meEmpty, "Odaya katılım bildirildi");
  } catch (e) {
    console.warn("[join room]", e);
    addSystemTo(meList, meEmpty, "Join-room çağrısı başarısız");
  }
}

/* =========================
   WS
========================= */
function wsUrl() {
  if (!roomId) {
    console.error("roomId yok → websocket açılamaz");
    return null;
  }

  return `${WS_BASE}/api/ws/interpreter/${encodeURIComponent(roomId)}?role=${encodeURIComponent(role)}&lang=${encodeURIComponent(myLang)}`;
}

function stopSocket() {
  try { ws?.close?.(); } catch {}
  ws = null;
  wsReady = false;

  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

function startPing() {
  if (pingTimer) clearInterval(pingTimer);

  pingTimer = setInterval(() => {
    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "ping" }));
      }
    } catch {}
  }, 15000);
}

function startSocket() {
  const url = wsUrl();

  if (!url) {
    setStatusText("Room bilgisi yok");
    addSystemTo(meList, meEmpty, "WebSocket için room bilgisi bulunamadı");
    return;
  }

  stopSocket();

  try {
    ws = new WebSocket(url);
  } catch (e) {
    console.error("[ws create]", e);
    setStatusText("WebSocket açılamadı");
    addSystemTo(meList, meEmpty, "WebSocket açılamadı");
    return;
  }

  setStatusText("WebSocket bağlanıyor...");

  ws.onopen = () => {
    wsReady = true;
    setStatusText("Bağlantı kuruldu");
    addSystemTo(meList, meEmpty, "Bağlantı hazır");
    startPing();
  };

  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      const type = String(payload?.type || "").trim();

      if (type === "presence") {
        if (payload?.room_id && !roomId) {
          roomId = String(payload.room_id).trim();
          updateRoomMeta();
        }

        if (payload?.guest_lang) {
          peerLang = canonical(payload.guest_lang);
          localStorage.setItem("live_interpreter_peer_lang", peerLang);
          refreshLabels();
        }

        addSystemTo(meList, meEmpty, "Odaya bağlantı kuruldu");
        return;
      }

      if (type === "peer_joined") {
        if (payload?.guest_lang) {
          peerLang = canonical(payload.guest_lang);
          localStorage.setItem("live_interpreter_peer_lang", peerLang);
          refreshLabels();
        }

        addSystemTo(meList, meEmpty, "Karşı taraf bağlandı");
        return;
      }

      if (type === "translated_message") {
        const sender = String(payload?.sender || "").trim().toLowerCase();
        const translated = String(payload?.translated_text || "").trim();
        const original = String(payload?.original_text || "").trim();

        if (!translated && !original) return;

        if (sender === role) {
          // Ben gönderdim → alt panelde orijinalim kalsın, gerekirse translated ekleme
          return;
        }

        // Karşı taraf konuştu → üstte bana çevrilmiş hali göster
        addBubble(
          peerList,
          peerEmpty,
          translated || original,
          "peer",
          true,
          myLang
        );

        if (translated) {
          speak(translated, myLang);
        }
        return;
      }

      if (type === "peer_left") {
        addSystemTo(peerList, peerEmpty, "Karşı taraf ayrıldı");
        return;
      }

      if (type === "pong") {
        return;
      }

      if (type === "error") {
        console.warn("[ws error payload]", payload);
        setStatusText(payload.message || "Sunucu hatası");
        addSystemTo(meList, meEmpty, payload.message || "Sunucu hatası");
      }
    } catch (e) {
      console.warn("[ws parse error]", e);
    }
  };

  ws.onerror = () => {
    wsReady = false;
    setStatusText("WebSocket hata verdi");
    addSystemTo(meList, meEmpty, "WebSocket hata verdi");
  };

  ws.onclose = () => {
    wsReady = false;

    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }

    setStatusText("Bağlantı kapandı");
    addSystemTo(meList, meEmpty, "Bağlantı kapandı");
  };
}

/* =========================
   SEND
========================= */
function canSend() {
  return !!(wsReady && ws && ws.readyState === WebSocket.OPEN && roomId);
}

function sendTextMessage(rawText) {
  const text = String(rawText || "").trim();
  if (!text) return;

  if (!canSend()) {
    addSystemTo(meList, meEmpty, "Bağlantı hazır değil");
    return;
  }

  // Alt panelde kendi mesajımı göster
  addBubble(meList, meEmpty, text, "me", false, myLang);

  try {
    ws.send(JSON.stringify({
      type: "text_message",
      text,
      from_lang: canonical(myLang),
      to_lang: canonical(peerLang)
    }));
  } catch (e) {
    console.error("[ws send]", e);
    addSystemTo(meList, meEmpty, "Mesaj gönderilemedi");
  }
}

function handleSend() {
  const value = String(textInput?.value || "").trim();
  if (!value) return;

  sendTextMessage(value);

  if (textInput) {
    textInput.value = "";
    autoGrowTextarea();
  }
}

/* =========================
   SPEECH RECOGNITION
========================= */
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

async function startListeningFlow() {
  if (isListening) return;

  if (!canSend()) {
    addSystemTo(meList, meEmpty, "Bağlantı hazır değil");
    return;
  }

  isListening = true;
  micBtn?.classList.add("listening");
  setStatusText("Dinleniyor... konuş");

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

        recognition.onresult = (e) =>
          finish(String(e.results?.[0]?.[0]?.transcript || "").trim() || null);

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
      setStatusText("Konuşma alınamadı");
      return;
    }

    sendTextMessage(spoken);
    setStatusText("Mesaj gönderildi");
  } finally {
    isListening = false;
    micBtn?.classList.remove("listening");
  }
}

/* =========================
   EVENTS
========================= */
myLangBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  closeAllPops();
  renderLangList(myLangList, myLang, (code) => {
    myLang = canonical(code);
    localStorage.setItem("live_interpreter_lang", myLang);
    refreshLabels();
    rebuildRecognition();
  });
  myLangPop?.classList.add("show");
});

peerLangBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  closeAllPops();
  renderLangList(peerLangList, peerLang, (code) => {
    peerLang = canonical(code);
    localStorage.setItem("live_interpreter_peer_lang", peerLang);
    refreshLabels();
  });
  peerLangPop?.classList.add("show");
});

voiceBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  closeAllPops();
  renderVoiceList();
  voicePop?.classList.add("show");
});

closeMyLang?.addEventListener("click", closeAllPops);
closePeerLang?.addEventListener("click", closeAllPops);
closeVoice?.addEventListener("click", closeAllPops);

document.addEventListener("click", (e) => {
  const inside =
    myLangPop?.contains(e.target) ||
    peerLangPop?.contains(e.target) ||
    voicePop?.contains(e.target);

  const onBtn = e.target?.closest?.("#myLangBtn,#peerLangBtn,#voiceBtn");
  if (!inside && !onBtn) closeAllPops();
}, { capture: true });

muteBtn?.addEventListener("click", () => {
  isMuted = !isMuted;
  localStorage.setItem("live_interpreter_muted", isMuted ? "1" : "0");
  refreshLabels();
  if (isMuted) stopSpeech();
});

clearBtn?.addEventListener("click", () => {
  stopSpeech();

  if (peerList) peerList.innerHTML = "";
  if (meList) meList.innerHTML = "";

  if (peerEmpty) {
    peerEmpty.style.display = "flex";
    peerList?.appendChild(peerEmpty);
  }

  if (meEmpty) {
    meEmpty.style.display = "flex";
    meList?.appendChild(meEmpty);
  }

  setStatusText("Temizlendi");
});

homeBtn?.addEventListener("click", () => {
  stopSocket();
  location.href = "/pages/home.html";
});

micBtn?.addEventListener("click", async (e) => {
  e.preventDefault();
  e.stopPropagation();
  await startListeningFlow();
});

sendBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  handleSend();
});

textInput?.addEventListener("input", autoGrowTextarea);

textInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

/* =========================
   BOOT
========================= */
async function boot() {
  refreshLabels();
  rebuildRecognition();
  updateRoomMeta();
  autoGrowTextarea();

  try {
    window.speechSynthesis?.getVoices?.();
    window.speechSynthesis.onvoiceschanged = () => {};
  } catch {}

  localStorage.setItem("live_interpreter_lang", myLang);
  localStorage.setItem("live_interpreter_peer_lang", peerLang);

  try {
    if (roomId) {
      addSystemTo(meList, meEmpty, "Room hazır • " + roomId);
      updateRoomMeta();
    } else if (hostCode) {
      addSystemTo(meList, meEmpty, "Host hazır • " + hostCode);

      if (role === "host") {
        setStatusText("Oda oluşturuluyor...");

        const created = await createRoomIfHost();
        roomId = String(created?.room_id || "").trim();

        if (!roomId) {
          throw new Error("Host room oluşturulamadı");
        }

        updateRoomMeta();
        addSystemTo(meList, meEmpty, "Host room açıldı • " + roomId);
      } else {
        setStatusText("Oda çözülüyor...");

        const resolved = await resolveRoomByHost();
        roomId = String(resolved?.room_id || "").trim();

        if (!roomId) {
          throw new Error("room_id boş geldi");
        }

        updateRoomMeta();
        addSystemTo(meList, meEmpty, "Room çözüldü • " + roomId);
      }
    } else {
      addSystemTo(meList, meEmpty, "Bağlantı hazırlanıyor...");
      setStatusText("Host veya room bilgisi yok");
      return;
    }
  } catch (e) {
    console.error("[boot room error]", e);
    setStatusText(e?.message || "Room işlemi başarısız");
    addSystemTo(meList, meEmpty, e?.message || "Room işlemi başarısız");
    return;
  }

  await joinRoomIfNeeded();
  startSocket();
}

boot();
window.addEventListener("beforeunload", stopSocket);
