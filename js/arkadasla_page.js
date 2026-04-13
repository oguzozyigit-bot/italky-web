import { supabase } from "/js/supabase_client.js";
import { LANG_POOL } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com/api/arkadasla";
const TRANSLATE_ENDPOINTS = [
  "https://italky-api.onrender.com/api/translate_ai",
  "https://italky-api.onrender.com/api/translate-ai",
  "https://italky-api.onrender.com/api/translate"
];
const TTS_API = "https://italky-api.onrender.com/api/tts";

const STORAGE = {
  language: "italky_translation_from_lang",
  voiceName: "italkyai_shared_voice_name",
  cultural: "italky_translation_cultural_mode",
  autoRead: "italky_arkadasla_auto_read"
};

const $ = (id) => document.getElementById(id);

const UI = {
  chatMessages: $("chatMessages"),
  chatInput: $("chatInput"),
  sendBtn: $("sendBtn"),
  micBtn: $("micBtn"),
  typingState: $("typingState"),

  menu: $("menu"),
  menuBtn: $("menuBtn"),
  menuBackdrop: $("menuBackdrop"),
  homeBtn: $("homeBtn"),
  brandHome: $("brandHome"),

  menuUserAvatar: $("menuUserAvatar"),
  menuUserAvatarImg: $("menuUserAvatarImg"),
  menuUserName: $("menuUserName"),
  menuMyCode: $("menuMyCode"),

  modalOwnCode: $("modalOwnCode"),
  peerFlag: $("peerFlag"),
  peerName: $("peerName"),
  peerLang: $("peerLang"),
  peerStatusText: $("peerStatusText"),

  connectModal: $("connectModal"),
  connectCodeInput: $("connectCodeInput"),
  connectNowBtn: $("connectNowBtn"),
  closeConnectModalBtn: $("closeConnectModalBtn"),

  requestSentModal: $("requestSentModal"),
  requestSentText: $("requestSentText"),
  cancelOutgoingRequestBtn: $("cancelOutgoingRequestBtn"),
  closeRequestSentBtn: $("closeRequestSentBtn"),

  incomingRequestModal: $("incomingRequestModal"),
  incomingRequestText: $("incomingRequestText"),
  acceptRequestBtn: $("acceptRequestBtn"),
  rejectRequestBtn: $("rejectRequestBtn"),
  blockRequestBtn: $("blockRequestBtn"),

  leaveChatModal: $("leaveChatModal"),
  leaveChatText: $("leaveChatText"),
  leaveChatNoBtn: $("leaveChatNoBtn"),
  leaveChatYesBtn: $("leaveChatYesBtn"),

  langSheet: $("langSheet"),
  langList: $("langList"),
  closeLangSheetBtn: $("closeLangSheetBtn"),

  settingsSheet: $("settingsSheet"),
  voiceList: $("voiceList"),
  autoReadToggle: $("autoReadToggle"),
  culturalToggle: $("culturalToggle"),
  closeSettingsSheetBtn: $("closeSettingsSheetBtn"),
  goSettingsPageBtn: $("goSettingsPageBtn"),

  newConnectionBtn: $("newConnectionBtn"),
  toggleContactsBtn: $("toggleContactsBtn"),
  contactsList: $("contactsList"),
  manualAddContactBtn: $("manualAddContactBtn"),
  toggleBlockedBtn: $("toggleBlockedBtn"),
  blockedList: $("blockedList"),
  toggleSavedChatsBtn: $("toggleSavedChatsBtn"),
  savedChatsList: $("savedChatsList"),
  endChatBtn: $("endChatBtn"),
  openSettingsFromMenuBtn: $("openSettingsFromMenuBtn"),

  topQrBtn: $("topQrBtn"),
  topSettingsBtn: $("topSettingsBtn")
};

const state = {
  authToken: "",
  currentUser: null,
  myCode: "",
  myName: "",

  selectedLang: "tr",
  selectedLangLabel: "Türkçe",
  selectedFlag: "🇹🇷",
  selectedVoiceName: "auto",
  culturalMode: false,
  autoRead: true,

  activeConversationId: null,
  activePeerUserId: null,
  activePeerName: "",
  activePeerCode: "",
  activePeerLang: "tr",
  activePeerFlag: "🌐",
  activePeerVoice: "auto",
  activePeerOnline: false,
  activePeerBusy: false,

  incomingRequest: null,
  outgoingRequest: null,

  loadedMessageIds: new Set(),
  localEchoKeys: new Set(),
  sendLock: false,

  recognition: null,
  recognitionBuffer: "",
  recognitionFinalizeTimer: null,
  currentAudio: null,
  synthUnlocked: false,

  timers: {
    incoming: null,
    conversation: null,
    messages: null,
    presence: null
  }
};

function safeName(value, fallback = "Karşı Taraf") {
  const clean = String(value || "").trim();
  return clean || fallback;
}

function shortName(value, fallback = "Karşı Taraf") {
  return safeName(value, fallback).split(" ")[0];
}

function normalizeVoiceName(v) {
  const val = String(v || "auto").trim().toLowerCase();
  if (["auto", "mine", "second", "memory"].includes(val)) return val;
  if (val === "clone") return "mine";
  return "auto";
}

function voiceLabel(v) {
  const m = normalizeVoiceName(v);
  if (m === "mine") return "Kendi Sesim";
  if (m === "second") return "2. Ses";
  if (m === "memory") return "Hatıra Sesi";
  return "Otomatik Ses";
}

function injectMicAnimationStyle() {
  if (document.getElementById("arkadaslaMicAnimStyle")) return;
  const style = document.createElement("style");
  style.id = "arkadaslaMicAnimStyle";
  style.textContent = `
    .mic-btn.listening{
      position:relative;
      border-radius:50%;
      box-shadow:0 0 0 1px rgba(34,211,238,.35),0 0 26px rgba(34,211,238,.18);
    }
    .mic-btn.listening::after{
      content:"";
      position:absolute;
      inset:-7px;
      border-radius:50%;
      border:2px solid rgba(34,211,238,.72);
      box-shadow:0 0 0 8px rgba(34,211,238,.10),0 0 24px rgba(34,211,238,.16);
      animation:arkadaslaMicPulse 1s ease-out infinite;
    }
    @keyframes arkadaslaMicPulse{
      0%{ transform:scale(.92); opacity:.95; }
      70%{ transform:scale(1.14); opacity:.14; }
      100%{ transform:scale(1.18); opacity:0; }
    }
  `;
  document.head.appendChild(style);
}

function getLangItems() {
  try {
    if (Array.isArray(LANG_POOL) && LANG_POOL.length) {
      return LANG_POOL.map((item) => ({
        code: item.code || item.key || item.id,
        tr_name: item.tr_name || item.tr || item.turkish || item.label_tr || item.native || item.name || item.code,
        flag: item.flag || flagFromCode(item.code || item.key || item.id)
      })).filter((x) => x.code);
    }
  } catch {}
  return [
    { code: "tr", tr_name: "Türkçe", flag: "🇹🇷" },
    { code: "en", tr_name: "İngilizce", flag: "🇬🇧" },
    { code: "de", tr_name: "Almanca", flag: "🇩🇪" },
    { code: "fr", tr_name: "Fransızca", flag: "🇫🇷" },
    { code: "it", tr_name: "İtalyanca", flag: "🇮🇹" },
    { code: "es", tr_name: "İspanyolca", flag: "🇪🇸" }
  ];
}

function flagFromCode(code) {
  const map = {
    tr: "🇹🇷",
    en: "🇬🇧",
    de: "🇩🇪",
    fr: "🇫🇷",
    it: "🇮🇹",
    es: "🇪🇸"
  };
  return map[(code || "").toLowerCase()] || "🌐";
}

function speechLangFor(code) {
  const map = {
    tr: "tr-TR",
    en: "en-US",
    de: "de-DE",
    fr: "fr-FR",
    it: "it-IT",
    es: "es-ES"
  };
  return map[code] || `${code}-${String(code).toUpperCase()}`;
}

async function getAuthToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || "";
}

async function api(path, options = {}) {
  if (!state.authToken) state.authToken = await getAuthToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (state.authToken) headers.Authorization = `Bearer ${state.authToken}`;

  const resp = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(json?.detail || json?.message || "İşlem başarısız.");
  }
  return json;
}

async function translateText(text, fromLang, toLang) {
  const clean = String(text || "").trim();
  if (!clean) return "";

  for (const endpoint of TRANSLATE_ENDPOINTS) {
    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: clean,
          from_lang: fromLang,
          to_lang: toLang,
          from: fromLang,
          to: toLang,
          source: fromLang,
          target: toLang,
          mode: state.culturalMode ? "cultural" : "normal",
          use_ai: state.culturalMode,
          cultural: state.culturalMode
        })
      });

      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) continue;

      const value = String(
        json?.translated_text ||
        json?.translated ||
        json?.translation ||
        json?.result ||
        json?.text ||
        ""
      ).trim();

      if (value) return value;
    } catch {}
  }
  return "";
}

function openMenu() { UI.menu?.classList.add("open"); }
function closeMenu() { UI.menu?.classList.remove("open"); }
function openModal(el) { el?.classList.add("open"); }
function closeModal(el) { el?.classList.remove("open"); }
function openSheet(el) { el?.classList.add("open"); }
function closeSheet(el) { el?.classList.remove("open"); }

function closeAllConnectionModals() {
  closeModal(UI.connectModal);
  closeModal(UI.requestSentModal);
  closeModal(UI.incomingRequestModal);
}

function autoResizeTextarea() {
  if (!UI.chatInput) return;
  UI.chatInput.style.height = "auto";
  UI.chatInput.style.height = `${Math.min(UI.chatInput.scrollHeight, 140)}px`;
}

function syncInputActionState() {
  if (!UI.chatInput || !UI.micBtn || !UI.sendBtn) return;
  const hasText = String(UI.chatInput.value || "").trim().length > 0;
  UI.micBtn.classList.toggle("hidden", hasText);
  UI.sendBtn.classList.toggle("hidden", !hasText);
}

function scrollChatToBottom() {
  if (!UI.chatMessages) return;
  requestAnimationFrame(() => {
    UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight + 999;
  });
}

function updateViewportLayout() {
  const vv = window.visualViewport;
  if (!vv) return;
  document.documentElement.style.setProperty("--app-height", `${vv.height}px`);
  const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  document.documentElement.style.setProperty("--keyboard-offset", `${keyboardHeight}px`);
  requestAnimationFrame(scrollChatToBottom);
}

function setTyping(show, text = "Bağlantı kuruluyor...") {
  if (!UI.typingState) return;
  UI.typingState.textContent = text;
  UI.typingState.classList.toggle("show", !!show);
}

function addSystemMessage(text) {
  if (!UI.chatMessages) return;
  const row = document.createElement("div");
  row.className = "msg center";
  const bubble = document.createElement("div");
  bubble.className = "system-bubble";
  bubble.textContent = text;
  row.appendChild(bubble);
  UI.chatMessages.appendChild(row);
  scrollChatToBottom();
}

function makeLocalEchoKey(conversationId, text) {
  return `${conversationId}__${String(text || "").trim().toLowerCase()}`;
}

function addChatMessage(side, payload = {}, id = null) {
  if (!UI.chatMessages) return;
  if (id && state.loadedMessageIds.has(id)) return;
  if (id) state.loadedMessageIds.add(id);

  const row = document.createElement("div");
  row.className = `msg ${side}`;
  if (id) row.dataset.mid = id;

  const wrap = document.createElement("div");
  wrap.className = "bubble-wrap";

  const bubble = document.createElement("div");
  bubble.className = `bubble ${side}`;

  const main = document.createElement("div");
  const original = String(payload.text || "").trim();
  const translated = String(payload.translatedText || "").trim();

  if (side === "right") {
    main.textContent = original;
    bubble.appendChild(main);
  } else {
    main.textContent = translated || original;
    bubble.appendChild(main);

    if (translated && original && translated !== original) {
      const src = document.createElement("div");
      src.className = "msg-translate";
      src.textContent = original;
      bubble.appendChild(src);
    }
  }

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  meta.textContent = payload.meta || "";

  wrap.appendChild(bubble);
  wrap.appendChild(meta);
  row.appendChild(wrap);
  UI.chatMessages.appendChild(row);
  scrollChatToBottom();
}

function clearChatDom() {
  if (!UI.chatMessages) return;
  UI.chatMessages.innerHTML = "";
  state.loadedMessageIds.clear();
  state.localEchoKeys.clear();
}

function syncPeerBar() {
  if (UI.peerName) UI.peerName.textContent = safeName(state.activePeerName, "Henüz bağlantı yok");
  if (UI.peerFlag) UI.peerFlag.textContent = state.activePeerFlag || "🌐";
  if (UI.peerLang) UI.peerLang.textContent = state.activePeerLang || "Dil seçilmedi";

  if (!UI.peerStatusText) return;

  if (!state.activePeerName) {
    UI.peerStatusText.textContent = "Kod girerek bağlantı başlat";
    return;
  }

  const modeText = state.culturalMode ? "Kültürel çeviri açık" : "Normal çeviri";
  const voiceText = voiceLabel(state.selectedVoiceName);

  if (state.activePeerBusy) {
    UI.peerStatusText.textContent = `${modeText} • ${voiceText}`;
  } else if (state.activePeerOnline) {
    UI.peerStatusText.textContent = `Çevrimiçi • ${modeText} • ${voiceText}`;
  } else {
    UI.peerStatusText.textContent = `Çevrimdışı • ${modeText}`;
  }
}

function normalizeCodeInput() {
  if (!UI.connectCodeInput) return;
  let raw = String(UI.connectCodeInput.value || "").toUpperCase();
  raw = raw.replace(/[^A-Z0-9]/g, "");
  const letters = raw.replace(/[^A-Z]/g, "").slice(0, 2);
  const digits = raw.replace(/[^0-9]/g, "").slice(0, 4);
  UI.connectCodeInput.value = `${letters}${digits}`;
}

function syncSettingsUI() {
  UI.autoReadToggle?.classList.toggle("active", !!state.autoRead);
  UI.culturalToggle?.classList.toggle("active", !!state.culturalMode);
}

function hydrateSettingsFromStorage() {
  const langs = getLangItems();
  const storedLang = localStorage.getItem(STORAGE.language) || "tr";
  const found = langs.find((x) => x.code === storedLang) || langs[0];

  state.selectedLang = found.code;
  state.selectedLangLabel = found.tr_name;
  state.selectedFlag = found.flag;
  state.selectedVoiceName = normalizeVoiceName(localStorage.getItem(STORAGE.voiceName) || "auto");
  state.culturalMode = localStorage.getItem(STORAGE.cultural) === "1";
  state.autoRead = localStorage.getItem(STORAGE.autoRead) !== "0";
  syncSettingsUI();
}

function renderLangList() {
  if (!UI.langList) return;
  UI.langList.innerHTML = "";

  getLangItems().forEach((lang) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `lang-btn ${state.selectedLang === lang.code ? "active" : ""}`;
    btn.innerHTML = `
      <div class="lang-left">
        <span class="lang-flag">${lang.flag}</span>
        <span class="lang-name">${lang.tr_name}</span>
      </div>
      <span class="lang-check">✓</span>
    `;
    btn.addEventListener("click", async () => {
      state.selectedLang = lang.code;
      state.selectedLangLabel = lang.tr_name;
      state.selectedFlag = lang.flag;
      localStorage.setItem(STORAGE.language, lang.code);
      renderLangList();
      closeSheet(UI.langSheet);
      syncPeerBar();
      await updatePresence();
    });
    UI.langList.appendChild(btn);
  });
}

function renderVoiceList() {
  if (!UI.voiceList) return;
  UI.voiceList.innerHTML = "";

  [
    { id: "auto", label: "Otomatik Ses" },
    { id: "mine", label: "Kendi Sesim" },
    { id: "second", label: "2. Ses" },
    { id: "memory", label: "Hatıra Sesi" }
  ].forEach((voice) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `voice-btn ${state.selectedVoiceName === voice.id ? "active" : ""}`;
    btn.textContent = voice.label;
    btn.addEventListener("click", async () => {
      state.selectedVoiceName = voice.id;
      localStorage.setItem(STORAGE.voiceName, voice.id);
      renderVoiceList();
      syncPeerBar();
      await updatePresence();
    });
    UI.voiceList.appendChild(btn);
  });
}

function unlockSpeech() {
  if (state.synthUnlocked) return;
  state.synthUnlocked = true;
  try {
    const utter = new SpeechSynthesisUtterance(" ");
    utter.volume = 0;
    window.speechSynthesis.speak(utter);
    window.speechSynthesis.cancel();
  } catch {}
}

function stopSpeaking() {
  try { window.speechSynthesis?.cancel(); } catch {}
  try {
    if (state.currentAudio) {
      state.currentAudio.pause();
      state.currentAudio.currentTime = 0;
    }
  } catch {}
  state.currentAudio = null;
}

function chooseVoice(langCode) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const target = speechLangFor(langCode).toLowerCase();
  const base = String(langCode || "").toLowerCase();

  let found = voices.find(v => String(v.lang || "").toLowerCase() === target);
  if (!found) found = voices.find(v => String(v.lang || "").toLowerCase().startsWith(base));
  return found || null;
}

function speakWithBrowser(text, langCode = "tr") {
  if (!state.autoRead || !text || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  unlockSpeech();
  stopSpeaking();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = speechLangFor(langCode);
  utter.rate = 0.92;
  utter.pitch = 1.0;
  const voice = chooseVoice(langCode);
  if (voice) utter.voice = voice;

  try {
    window.speechSynthesis.speak(utter);
  } catch {}
}

async function speakWithSelectedVoice(text, langCode, voiceName, ownerUserId) {
  if (!state.autoRead || !text) return;

  const resolvedVoice = normalizeVoiceName(voiceName);

  if (resolvedVoice === "auto" || !ownerUserId) {
    speakWithBrowser(text, langCode);
    return;
  }

  try {
    const resp = await fetch(TTS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        lang: langCode,
        user_id: ownerUserId,
        module: "arkadasla",
        selected_voice: resolvedVoice,
        voice: resolvedVoice === "mine" ? "clone" : resolvedVoice,
        voice_mode: resolvedVoice === "mine" ? "clone" : (resolvedVoice === "auto" ? "auto" : "preset"),
        preset_voice: resolvedVoice === "second" || resolvedVoice === "memory" ? resolvedVoice : "",
        tone: "neutral"
      })
    });

    const json = await resp.json().catch(() => ({}));
    const audioBase64 = String(
      json?.audio_base64 ||
      json?.audio ||
      json?.data?.audio_base64 ||
      json?.result?.audio_base64 ||
      ""
    ).trim();

    if (!resp.ok || !audioBase64) {
      speakWithBrowser(text, langCode);
      return;
    }

    stopSpeaking();
    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    audio.preload = "auto";
    audio.playsInline = true;
    state.currentAudio = audio;
    await audio.play();
  } catch {
    speakWithBrowser(text, langCode);
  }
}

function setMicListening(isListening) {
  UI.micBtn?.classList.toggle("listening", !!isListening);
}

function finalizeRecognizedSpeech() {
  const finalText = String(state.recognitionBuffer || "").trim();
  state.recognitionBuffer = "";
  clearTimeout(state.recognitionFinalizeTimer);

  if (!finalText) {
    setMicListening(false);
    return;
  }

  if (UI.chatInput) {
    UI.chatInput.value = finalText;
    autoResizeTextarea();
    syncInputActionState();
  }

  setMicListening(false);
  sendMessage();
}

function startRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    addSystemMessage("Bu cihazda sesli giriş desteklenmiyor.");
    return;
  }

  try { state.recognition?.stop(); } catch {}

  state.recognitionBuffer = "";

  const recognition = new Recognition();
  recognition.lang = speechLangFor(state.selectedLang);
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = true;

  recognition.onstart = () => {
    setMicListening(true);
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = 0; i < event.results.length; i++) {
      transcript += ` ${event.results[i][0].transcript || ""}`;
    }
    state.recognitionBuffer = transcript.trim();

    if (UI.chatInput) {
      UI.chatInput.value = state.recognitionBuffer;
      autoResizeTextarea();
      syncInputActionState();
    }

    clearTimeout(state.recognitionFinalizeTimer);
    state.recognitionFinalizeTimer = setTimeout(() => {
      try { recognition.stop(); } catch {}
    }, 1800);
  };

  recognition.onerror = () => {
    clearTimeout(state.recognitionFinalizeTimer);
    setMicListening(false);
  };

  recognition.onend = () => {
    finalizeRecognizedSpeech();
  };

  try {
    recognition.start();
    state.recognition = recognition;
  } catch {
    setMicListening(false);
  }
}

async function loadProfileUI() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    location.href = "/pages/login.html";
    return;
  }

  state.currentUser = user;
  state.myName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "Kullanıcı";

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,full_name,email,avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.full_name) state.myName = profile.full_name;
  if (UI.menuUserName) UI.menuUserName.textContent = shortName(state.myName, "Kullanıcı");

  const avatarUrl =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    "";

  if (avatarUrl && UI.menuUserAvatar && UI.menuUserAvatarImg) {
    UI.menuUserAvatar.innerHTML = "";
    UI.menuUserAvatarImg.src = avatarUrl;
    UI.menuUserAvatar.appendChild(UI.menuUserAvatarImg);
  }

  const me = await api("/me");
  state.myCode = me.chat_code || "";
  if (UI.modalOwnCode) UI.modalOwnCode.textContent = state.myCode;
  if (UI.menuMyCode) UI.menuMyCode.textContent = `Sohbet ID: ${state.myCode}`;
}

async function updatePresence(appState = "foreground") {
  try {
    await api("/presence", {
      method: "POST",
      body: JSON.stringify({
        app_state: appState,
        selected_lang: state.selectedLang,
        selected_flag: state.selectedFlag,
        selected_voice: state.selectedVoiceName,
        is_busy: !!state.activeConversationId,
        current_conversation_id: state.activeConversationId || null
      })
    });
  } catch {}
}

function ringIncoming() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    [784, 988].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.18);
      gain.gain.setValueAtTime(0.0001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.05, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.17);
    });
  } catch {}
}

async function pollIncomingRequests() {
  try {
    const res = await api("/incoming");
    const items = res.items || [];
    if (!items.length) return;

    const latest = items[0];
    if (state.incomingRequest?.request_id === latest.request_id) return;

    state.incomingRequest = latest;
    UI.incomingRequestText.textContent = `${safeName(latest.requester_name, latest.requester_code || "Karşı Taraf")} seninle sohbet etmek istiyor.`;
    openModal(UI.incomingRequestModal);
    ringIncoming();
  } catch {}
}

async function checkCurrentConversation() {
  try {
    const res = await api("/conversation/current");
    const conv = res.conversation;

    if (!conv) {
      if (state.activeConversationId) {
        addSystemMessage(`${shortName(state.activePeerName || "Karşı Taraf")} ayrıldı.`);
      }

      state.activeConversationId = null;
      state.activePeerUserId = null;
      state.activePeerName = "";
      state.activePeerCode = "";
      state.activePeerLang = "tr";
      state.activePeerFlag = "🌐";
      state.activePeerVoice = "auto";
      state.activePeerOnline = false;
      state.activePeerBusy = false;
      syncPeerBar();
      return;
    }

    const wasDisconnected = !state.activeConversationId;

    state.activeConversationId = conv.id;
    state.activePeerUserId = conv.other_user_id;
    state.activePeerName = safeName(conv.other_name, conv.other_code || "Karşı Taraf");
    state.activePeerCode = conv.other_code || "";
    state.activePeerLang = conv.other_lang || "tr";
    state.activePeerFlag = conv.other_flag || flagFromCode(conv.other_lang || "tr");
    state.activePeerVoice = normalizeVoiceName(conv.other_voice || "auto");
    state.activePeerOnline = true;
    state.activePeerBusy = true;

    syncPeerBar();

    if (wasDisconnected) {
      closeAllConnectionModals();
      addSystemMessage(`${shortName(state.activePeerName)} ile bağlantı kuruldu.`);
    }
  } catch {}
}

async function pollMessages() {
  if (!state.activeConversationId) return;

  try {
    const res = await api(`/messages?conversation_id=${encodeURIComponent(state.activeConversationId)}`);
    const items = res.items || [];

    for (const item of items) {
      if (state.loadedMessageIds.has(item.id)) continue;

      const side = item.sender_user_id === state.currentUser.id ? "right" : "left";
      const sourceLang = item.source_lang || (side === "right" ? state.selectedLang : state.activePeerLang);
      const targetLang = side === "left" ? state.selectedLang : state.activePeerLang;

      const echoKey = makeLocalEchoKey(state.activeConversationId, item.text);
      if (side === "right" && state.localEchoKeys.has(echoKey)) {
        state.loadedMessageIds.add(item.id);
        state.localEchoKeys.delete(echoKey);
        continue;
      }

      const translated =
        side === "left"
          ? (item.translated_text || await translateText(item.text, sourceLang, targetLang))
          : "";

      addChatMessage(side, {
        text: item.text,
        translatedText: translated,
        meta: side === "right" ? "Şimdi" : "Az önce"
      }, item.id);

      if (side === "left") {
        await speakWithSelectedVoice(
          translated || item.text,
          state.selectedLang,
          item.source_voice || state.activePeerVoice || "auto",
          item.sender_user_id
        );
      }
    }
  } catch {}
}

async function sendRequest(targetCode) {
  try {
    const res = await api("/request", {
      method: "POST",
      body: JSON.stringify({
        target_code: targetCode,
        requester_lang: state.selectedLang,
        requester_flag: state.selectedFlag,
        requester_voice: state.selectedVoiceName
      })
    });

    state.outgoingRequest = {
      targetCode,
      targetName: safeName(res.target_name, targetCode),
      requestId: res.request_id || null
    };

    UI.requestSentText.textContent = `${shortName(state.outgoingRequest.targetName)} kullanıcısına sohbet isteği gönderdin.`;
    closeModal(UI.connectModal);
    openModal(UI.requestSentModal);
  } catch (e) {
    addSystemMessage(e.message || "İstek gönderilemedi.");
  }
}

async function acceptIncomingRequest() {
  if (!state.incomingRequest?.request_id) return;

  try {
    const incoming = state.incomingRequest;

    const res = await api("/respond", {
      method: "POST",
      body: JSON.stringify({
        request_id: incoming.request_id,
        action: "accept"
      })
    });

    state.activeConversationId = res.conversation_id;
    state.activePeerName = safeName(incoming.requester_name, incoming.requester_code || "Karşı Taraf");
    state.activePeerCode = incoming.requester_code || "";
    state.activePeerLang = incoming.requester_lang || "tr";
    state.activePeerFlag = incoming.requester_flag || flagFromCode(state.activePeerLang);
    state.activePeerVoice = normalizeVoiceName(incoming.requester_voice || "auto");
    state.activePeerOnline = true;
    state.activePeerBusy = true;

    closeAllConnectionModals();
    syncPeerBar();
    addSystemMessage(`${shortName(state.activePeerName)} ile bağlantı kuruldu.`);
    await updatePresence();
  } catch (e) {
    addSystemMessage(e.message || "İstek onaylanamadı.");
  } finally {
    state.incomingRequest = null;
  }
}

async function rejectIncomingRequest() {
  if (!state.incomingRequest?.request_id) return;

  try {
    await api("/respond", {
      method: "POST",
      body: JSON.stringify({
        request_id: state.incomingRequest.request_id,
        action: "reject"
      })
    });
    closeModal(UI.incomingRequestModal);
  } catch (e) {
    addSystemMessage(e.message || "İstek reddedilemedi.");
  } finally {
    state.incomingRequest = null;
  }
}

async function sendLeaveNotice() {
  if (!state.activeConversationId) return;
  try {
    const leaveText = `${shortName(state.myName, "Kullanıcı")} ayrıldı.`;
    const translated = await translateText(leaveText, state.selectedLang, state.activePeerLang);

    await api("/message", {
      method: "POST",
      body: JSON.stringify({
        conversation_id: state.activeConversationId,
        text: leaveText,
        source_lang: state.selectedLang,
        source_flag: state.selectedFlag,
        source_voice: "auto",
        translated_text: translated || null
      })
    });
  } catch {}
}

async function sendMessage() {
  const text = String(UI.chatInput?.value || "").trim();
  if (!text || state.sendLock) return;

  if (!state.activeConversationId) {
    addSystemMessage("Önce bağlantı kurman gerekiyor.");
    return;
  }

  state.sendLock = true;

  try {
    const translatedText = await translateText(text, state.selectedLang, state.activePeerLang);
    const echoKey = makeLocalEchoKey(state.activeConversationId, text);

    state.localEchoKeys.add(echoKey);

    addChatMessage("right", {
      text,
      translatedText: "",
      meta: "Şimdi"
    });

    await api("/message", {
      method: "POST",
      body: JSON.stringify({
        conversation_id: state.activeConversationId,
        text,
        source_lang: state.selectedLang,
        source_flag: state.selectedFlag,
        source_voice: state.selectedVoiceName,
        translated_text: translatedText || null
      })
    });

    UI.chatInput.value = "";
    autoResizeTextarea();
    syncInputActionState();
  } catch (e) {
    addSystemMessage(e.message || "Mesaj gönderilemedi.");
  } finally {
    state.sendLock = false;
  }
}

async function endConversationBackend() {
  if (!state.activeConversationId) return;
  try {
    await api(`/end?conversation_id=${encodeURIComponent(state.activeConversationId)}`, {
      method: "POST"
    });
  } catch {}
}

async function resetAfterEndChat() {
  stopSpeaking();
  try { state.recognition?.stop(); } catch {}
  await endConversationBackend();

  state.activeConversationId = null;
  state.activePeerUserId = null;
  state.activePeerName = "";
  state.activePeerCode = "";
  state.activePeerLang = "tr";
  state.activePeerFlag = "🌐";
  state.activePeerVoice = "auto";
  state.activePeerOnline = false;
  state.activePeerBusy = false;

  syncPeerBar();
  clearChatDom();
  addSystemMessage("Sohbet kapatıldı.");
  await updatePresence();
}

function startTimers() {
  stopTimers();
  state.timers.incoming = setInterval(pollIncomingRequests, 2500);
  state.timers.conversation = setInterval(checkCurrentConversation, 1500);
  state.timers.messages = setInterval(pollMessages, 900);
  state.timers.presence = setInterval(() => {
    updatePresence(document.hidden ? "background" : "foreground");
  }, 10000);
}

function stopTimers() {
  Object.values(state.timers).forEach((timer) => timer && clearInterval(timer));
}

function hideUnusedUi() {
  UI.toggleContactsBtn?.classList.add("hidden");
  UI.manualAddContactBtn?.classList.add("hidden");
  UI.toggleBlockedBtn?.classList.add("hidden");
  UI.toggleSavedChatsBtn?.classList.add("hidden");
  UI.contactsList?.classList.remove("open");
  UI.blockedList?.classList.remove("open");
  UI.savedChatsList?.classList.remove("open");
}

function bindEvents() {
  UI.chatInput?.addEventListener("input", () => {
    autoResizeTextarea();
    syncInputActionState();
    scrollChatToBottom();
  });

  UI.chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  UI.sendBtn?.addEventListener("click", sendMessage);
  UI.micBtn?.addEventListener("click", startRecognition);

  UI.menuBtn?.addEventListener("click", openMenu);
  UI.menuBackdrop?.addEventListener("click", closeMenu);

  UI.homeBtn?.addEventListener("click", async () => {
    closeMenu();
    UI.leaveChatText.textContent = "Sohbetten ayrılmak istiyor musunuz?";
    openModal(UI.leaveChatModal);
  });

  UI.brandHome?.addEventListener("click", async () => {
    UI.leaveChatText.textContent = "Sohbetten ayrılmak istiyor musunuz?";
    openModal(UI.leaveChatModal);
  });

  UI.newConnectionBtn?.addEventListener("click", () => openModal(UI.connectModal));
  UI.closeConnectModalBtn?.addEventListener("click", () => closeModal(UI.connectModal));
  UI.connectCodeInput?.addEventListener("input", normalizeCodeInput);

  UI.connectNowBtn?.addEventListener("click", async () => {
    const code = String(UI.connectCodeInput?.value || "").trim().toUpperCase();
    if (!/^[A-Z]{2}[0-9]{4}$/.test(code)) {
      addSystemMessage("Lütfen 2 harf ve 4 rakamdan oluşan kod gir.");
      return;
    }
    if (code === state.myCode) {
      addSystemMessage("Kendi kodunu giremezsin.");
      return;
    }
    await sendRequest(code);
  });

  UI.cancelOutgoingRequestBtn?.addEventListener("click", () => {
    closeModal(UI.requestSentModal);
    state.outgoingRequest = null;
  });

  UI.closeRequestSentBtn?.addEventListener("click", () => closeModal(UI.requestSentModal));

  UI.topSettingsBtn?.addEventListener("click", () => {
    location.href = "/pages/arkadasla_settings.html";
  });

  UI.openSettingsFromMenuBtn?.addEventListener("click", () => {
    closeMenu();
    location.href = "/pages/arkadasla_settings.html";
  });

  UI.closeSettingsSheetBtn?.addEventListener("click", () => closeSheet(UI.settingsSheet));

  UI.goSettingsPageBtn?.addEventListener("click", () => {
    closeSheet(UI.settingsSheet);
    location.href = "/pages/arkadasla_settings.html";
  });

  UI.autoReadToggle?.addEventListener("click", () => {
    state.autoRead = !state.autoRead;
    localStorage.setItem(STORAGE.autoRead, state.autoRead ? "1" : "0");
    syncSettingsUI();
    if (!state.autoRead) stopSpeaking();
  });

  UI.culturalToggle?.addEventListener("click", () => {
    state.culturalMode = !state.culturalMode;
    localStorage.setItem(STORAGE.cultural, state.culturalMode ? "1" : "0");
    syncSettingsUI();
    syncPeerBar();
  });

  UI.peerFlag?.addEventListener("click", () => openSheet(UI.langSheet));
  UI.peerLang?.addEventListener("click", () => openSheet(UI.langSheet));
  UI.closeLangSheetBtn?.addEventListener("click", () => closeSheet(UI.langSheet));

  UI.acceptRequestBtn?.addEventListener("click", acceptIncomingRequest);
  UI.rejectRequestBtn?.addEventListener("click", rejectIncomingRequest);
  UI.blockRequestBtn?.addEventListener("click", rejectIncomingRequest);

  UI.leaveChatNoBtn?.addEventListener("click", () => closeModal(UI.leaveChatModal));

  UI.leaveChatYesBtn?.addEventListener("click", async () => {
    closeModal(UI.leaveChatModal);
    await sendLeaveNotice();
    await resetAfterEndChat();
    location.href = "/pages/home.html";
  });

  window.visualViewport?.addEventListener("resize", updateViewportLayout);
  window.visualViewport?.addEventListener("scroll", updateViewportLayout);
  window.addEventListener("resize", updateViewportLayout);

  document.addEventListener("visibilitychange", async () => {
    await updatePresence(document.hidden ? "background" : "foreground");
  });

  document.addEventListener("pointerdown", unlockSpeech, { once: true });
  document.addEventListener("touchstart", unlockSpeech, { once: true, passive: true });
}

async function init() {
  try {
    state.authToken = await getAuthToken();
    if (!state.authToken) {
      location.href = "/pages/login.html";
      return;
    }

    injectMicAnimationStyle();
    hideUnusedUi();
    hydrateSettingsFromStorage();
    renderLangList();
    renderVoiceList();
    autoResizeTextarea();
    syncInputActionState();
    updateViewportLayout();

    await loadProfileUI();
    syncPeerBar();
    addSystemMessage(`Merhaba ${shortName(state.myName, "Kullanıcı")}. Kod girerek bağlantı başlatabilirsin.`);

    bindEvents();
    await updatePresence("foreground");
    await checkCurrentConversation();
    await pollIncomingRequests();
    startTimers();

    setTimeout(() => openModal(UI.connectModal), 300);
    scrollChatToBottom();
  } catch (e) {
    console.error("ARKADASLA INIT HATASI:", e);
    addSystemMessage("Sayfa başlatılırken bir hata oluştu.");
  }
}

init();
