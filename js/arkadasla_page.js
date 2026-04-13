import { supabase } from "/js/supabase_client.js";
import { LANG_POOL } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com/api/arkadasla";
const TRANSLATE_API = "https://italky-api.onrender.com/api/translate";
const APP_STORE_URL = "https://play.google.com/store/apps/details?id=com.ozyigits.italkyai";

const STORAGE = {
  language: "italky_translation_from_lang",
  voiceMode: "italkyai_shared_voice_mode",
  voiceName: "italkyai_shared_voice_name",
  cultural: "italky_translation_cultural_mode",
  autoRead: "italky_arkadasla_auto_read"
};

const VOICES = [
  { id: "auto", label: "Otomatik Ses" },
  { id: "Hüma", label: "Hüma" },
  { id: "Ozan", label: "Ozan" },
  { id: "Umay", label: "Umay" },
  { id: "Jale", label: "Jale" },
  { id: "Mina", label: "Mina" },
  { id: "Beren", label: "Beren" },
  { id: "Kaan", label: "Kaan" }
];

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

  incomingRequestModal: $("incomingRequestModal"),
  incomingRequestText: $("incomingRequestText"),
  acceptRequestBtn: $("acceptRequestBtn"),
  rejectRequestBtn: $("rejectRequestBtn"),

  leaveChatModal: $("leaveChatModal"),
  leaveChatText: $("leaveChatText"),
  leaveChatNoBtn: $("leaveChatNoBtn"),
  leaveChatYesBtn: $("leaveChatYesBtn"),

  savePromptModal: $("savePromptModal"),
  skipSaveBtn: $("skipSaveBtn"),
  openSaveNameBtn: $("openSaveNameBtn"),

  saveNameModal: $("saveNameModal"),
  saveChatNameInput: $("saveChatNameInput"),
  cancelSaveNameBtn: $("cancelSaveNameBtn"),
  confirmSaveNameBtn: $("confirmSaveNameBtn"),

  addContactModal: $("addContactModal"),
  addContactText: $("addContactText"),
  contactNameInput: $("contactNameInput"),
  cancelContactBtn: $("cancelContactBtn"),
  confirmContactBtn: $("confirmContactBtn"),

  deleteContactModal: $("deleteContactModal"),
  deleteContactText: $("deleteContactText"),
  cancelDeleteContactBtn: $("cancelDeleteContactBtn"),
  confirmDeleteContactBtn: $("confirmDeleteContactBtn"),

  appQrModal: $("appQrModal"),
  appQrImage: $("appQrImage"),
  copyStoreLinkBtn: $("copyStoreLinkBtn"),
  closeQrModalBtn: $("closeQrModalBtn"),

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
  copyMyCodeBtn: $("copyMyCodeBtn"),
  openConnectFromMenuBtn: $("openConnectFromMenuBtn"),
  toggleContactsBtn: $("toggleContactsBtn"),
  contactsList: $("contactsList"),
  toggleSavedChatsBtn: $("toggleSavedChatsBtn"),
  savedChatsList: $("savedChatsList"),
  showAppQrBtn: $("showAppQrBtn"),
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
  activePeerOnline: false,
  activePeerBusy: false,

  incomingRequest: null,
  pendingDeleteContactId: null,
  loadedMessageIds: new Set(),

  recognition: null,
  leavingReason: "manual",

  contactsOpen: false,
  savedChatsOpen: false,

  timers: {
    incoming: null,
    conversation: null,
    messages: null,
    contacts: null,
    presence: null
  }
};

function getLangItems() {
  try {
    if (Array.isArray(LANG_POOL) && LANG_POOL.length) {
      return LANG_POOL.map(item => ({
        code: item.code || item.key || item.id,
        tr_name: item.tr_name || item.tr || item.turkish || item.label_tr || item.native || item.name || item.code,
        flag: item.flag || flagFromCode(item.code || item.key || item.id)
      })).filter(x => x.code);
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
  if (!text) return "";

  try {
    const resp = await fetch(TRANSLATE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        from: fromLang,
        to: toLang,
        mode: state.culturalMode ? "cultural" : "normal"
      })
    });

    const json = await resp.json().catch(() => ({}));
    if (!resp.ok) return "";
    return String(json?.translated_text || json?.translation || json?.result || "").trim();
  } catch {
    return "";
  }
}

function openMenu() { UI.menu?.classList.add("open"); }
function closeMenu() { UI.menu?.classList.remove("open"); }
function openModal(el) { el?.classList.add("open"); }
function closeModal(el) { el?.classList.remove("open"); }
function openSheet(el) { el?.classList.add("open"); }
function closeSheet(el) { el?.classList.remove("open"); }

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

  const name = document.createElement("div");
  name.className = "msg-name";
  name.textContent = payload.name || (side === "right" ? "Sen" : "Karşı Taraf");

  const main = document.createElement("div");
  main.textContent = payload.text || "";

  bubble.appendChild(name);
  bubble.appendChild(main);

  if (payload.translatedText) {
    const tr = document.createElement("div");
    tr.className = "msg-translate";
    tr.textContent = payload.translatedText;
    bubble.appendChild(tr);
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
}

function syncPeerBar() {
  if (UI.peerName) UI.peerName.textContent = state.activePeerName || "Henüz bağlantı yok";
  if (UI.peerFlag) UI.peerFlag.textContent = state.activePeerFlag || "🌐";
  if (UI.peerLang) UI.peerLang.textContent = state.activePeerName ? state.selectedLangLabel : "Dil seçilmedi";

  if (!UI.peerStatusText) return;
  if (!state.activePeerName) {
    UI.peerStatusText.textContent = "";
    return;
  }

  if (state.activePeerBusy) {
    UI.peerStatusText.textContent = "Meşgul";
  } else if (state.activePeerOnline) {
    UI.peerStatusText.textContent = "Çevrimiçi";
  } else {
    UI.peerStatusText.textContent = "Çevrimdışı";
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

function copyText(text, okMessage = "Kopyalandı.") {
  navigator.clipboard?.writeText(text)
    .then(() => addSystemMessage(okMessage))
    .catch(() => addSystemMessage("Kopyalama yapılamadı."));
}

function buildQrUrl(text) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(text)}`;
}

function syncSettingsUI() {
  UI.autoReadToggle?.classList.toggle("active", !!state.autoRead);
  UI.culturalToggle?.classList.toggle("active", !!state.culturalMode);
}

function hydrateSettingsFromStorage() {
  const langs = getLangItems();
  const storedLang = localStorage.getItem(STORAGE.language) || "tr";
  const found = langs.find(x => x.code === storedLang) || langs[0];

  state.selectedLang = found.code;
  state.selectedLangLabel = found.tr_name;
  state.selectedFlag = found.flag;
  state.selectedVoiceName = localStorage.getItem(STORAGE.voiceName) || "auto";
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
      addSystemMessage(`Dil seçildi: ${lang.tr_name}`);
      syncPeerBar();
      await updatePresence();
    });
    UI.langList.appendChild(btn);
  });
}

function renderVoiceList() {
  if (!UI.voiceList) return;
  UI.voiceList.innerHTML = "";

  VOICES.forEach((voice) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `voice-btn ${state.selectedVoiceName === voice.id ? "active" : ""}`;
    btn.textContent = voice.label;
    btn.addEventListener("click", () => {
      state.selectedVoiceName = voice.id;
      localStorage.setItem(STORAGE.voiceName, voice.id);
      renderVoiceList();
      addSystemMessage(`Ses seçildi: ${voice.label}`);
    });
    UI.voiceList.appendChild(btn);
  });
}

function stopSpeaking() {
  try { window.speechSynthesis?.cancel(); } catch {}
}

function findSpeechVoiceForSelection() {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const voices = synth.getVoices() || [];
  if (!voices.length) return null;

  if (state.selectedVoiceName && state.selectedVoiceName !== "auto") {
    const byName = voices.find(v => v.name.toLowerCase().includes(state.selectedVoiceName.toLowerCase()));
    if (byName) return byName;
  }

  return voices.find(v => (v.lang || "").toLowerCase().startsWith((state.selectedLang || "tr").toLowerCase())) || voices[0] || null;
}

function speakText(text) {
  if (!state.autoRead || !text || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;

  stopSpeaking();

  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = speechLangFor(state.selectedLang);

  const voice = findSpeechVoiceForSelection();
  if (voice) {
    utter.voice = voice;
    utter.lang = voice.lang || utter.lang;
  }

  try { window.speechSynthesis.speak(utter); } catch {}
}

function startRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    addSystemMessage("Bu cihazda sesli giriş desteklenmiyor.");
    return;
  }

  try { state.recognition?.stop(); } catch {}

  const recognition = new Recognition();
  recognition.lang = speechLangFor(state.selectedLang);
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event?.results?.[0]?.[0]?.transcript || "";
    if (transcript.trim() && UI.chatInput) {
      UI.chatInput.value = transcript.trim();
      autoResizeTextarea();
      syncInputActionState();
    }
  };

  recognition.onerror = () => addSystemMessage("Ses algılanamadı. Bir daha deneyelim.");

  try {
    recognition.start();
    state.recognition = recognition;
  } catch {}
}

function beep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1046, ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch {}
}

function longPress(element, onLongPress) {
  let timer = null;

  const start = () => {
    timer = setTimeout(() => onLongPress(), 650);
  };

  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  element.addEventListener("touchstart", start, { passive: true });
  element.addEventListener("mousedown", start);
  element.addEventListener("touchend", cancel);
  element.addEventListener("touchmove", cancel);
  element.addEventListener("mouseleave", cancel);
  element.addEventListener("mouseup", cancel);
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
  if (UI.menuUserName) UI.menuUserName.textContent = state.myName;

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
        is_busy: !!state.activeConversationId,
        current_conversation_id: state.activeConversationId || null
      })
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
    UI.incomingRequestText.textContent = `${latest.requester_name} bağlanmak istiyor. Onaylıyor musun?`;
    openModal(UI.incomingRequestModal);
    beep();
  } catch {}
}

async function checkCurrentConversation() {
  try {
    const res = await api("/conversation/current");
    const conv = res.conversation;

    if (!conv) {
      state.activeConversationId = null;
      state.activePeerUserId = null;
      state.activePeerName = "";
      state.activePeerCode = "";
      state.activePeerLang = "tr";
      state.activePeerFlag = "🌐";
      state.activePeerOnline = false;
      state.activePeerBusy = false;
      syncPeerBar();
      return;
    }

    state.activeConversationId = conv.id;
    state.activePeerUserId = conv.other_user_id;
    state.activePeerName = conv.other_name || "Karşı Taraf";
    state.activePeerCode = conv.other_code || "";
    state.activePeerLang = conv.other_lang || "tr";
    state.activePeerFlag = conv.other_flag || flagFromCode(conv.other_lang || "tr");
    state.activePeerOnline = true;
    state.activePeerBusy = true;
    syncPeerBar();
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
      const name = side === "right" ? "Sen" : (state.activePeerName || "Karşı Taraf");

      addChatMessage(side, {
        name,
        text: item.text,
        translatedText: item.translated_text || "",
        meta: `${name} • ${state.selectedLangLabel}`
      }, item.id);

      if (side === "left") speakText(item.translated_text || item.text);
    }
  } catch {}
}

async function sendRequest(targetCode) {
  try {
    setTyping(true, "İstek gönderiliyor...");
    const res = await api("/request", {
      method: "POST",
      body: JSON.stringify({
        target_code: targetCode,
        requester_lang: state.selectedLang,
        requester_flag: state.selectedFlag
      })
    });
    setTyping(false);
    addSystemMessage(`${res.target_name || targetCode} kullanıcısına sohbet isteği gönderildi.`);
    closeModal(UI.connectModal);
    closeMenu();
  } catch (e) {
    setTyping(false);
    addSystemMessage(e.message || "İstek gönderilemedi.");
  }
}

async function acceptIncomingRequest() {
  if (!state.incomingRequest?.request_id) return;

  try {
    const res = await api("/respond", {
      method: "POST",
      body: JSON.stringify({
        request_id: state.incomingRequest.request_id,
        action: "accept"
      })
    });

    state.activeConversationId = res.conversation_id;
    state.activePeerName = state.incomingRequest.requester_name || "Karşı Taraf";
    state.activePeerCode = state.incomingRequest.requester_code || "";
    state.activePeerLang = state.incomingRequest.requester_lang || "tr";
    state.activePeerFlag = state.incomingRequest.requester_flag || flagFromCode(state.activePeerLang);
    state.activePeerOnline = true;
    state.activePeerBusy = true;

    syncPeerBar();
    closeModal(UI.incomingRequestModal);
    addSystemMessage(`${state.activePeerName} ile bağlantı kuruldu.`);
    speakText(`${state.activePeerName} ile bağlantı kuruldu`);
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
    addSystemMessage(`${state.incomingRequest.requester_name || "Karşı Taraf"} isteği reddedildi.`);
    closeModal(UI.incomingRequestModal);
  } catch (e) {
    addSystemMessage(e.message || "İstek reddedilemedi.");
  } finally {
    state.incomingRequest = null;
  }
}

async function sendMessage() {
  const text = String(UI.chatInput?.value || "").trim();
  if (!text) return;

  if (!state.activeConversationId) {
    addSystemMessage("Önce bir bağlantı kurman gerekiyor.");
    return;
  }

  try {
    const translatedText = await translateText(text, state.selectedLang, state.activePeerLang);

    await api("/message", {
      method: "POST",
      body: JSON.stringify({
        conversation_id: state.activeConversationId,
        text,
        source_lang: state.selectedLang,
        source_flag: state.selectedFlag,
        translated_text: translatedText || null
      })
    });

    UI.chatInput.value = "";
    autoResizeTextarea();
    syncInputActionState();
    await pollMessages();
  } catch (e) {
    addSystemMessage(e.message || "Mesaj gönderilemedi.");
  }
}

async function loadContacts() {
  if (!UI.contactsList) return;

  try {
    const res = await api("/contacts");
    const items = res.items || [];
    UI.contactsList.innerHTML = "";

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "saved-btn";
      empty.textContent = "Henüz rehber boş";
      UI.contactsList.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "contact-card";

      const presence = document.createElement("div");
      presence.className = `contact-presence ${item.is_busy ? "presence-busy" : item.is_online ? "presence-online" : "presence-offline"}`;

      const meta = document.createElement("div");
      meta.className = "contact-meta";
      meta.innerHTML = `
        <div class="contact-name-line">
          <span class="contact-flag">${item.contact_flag || "🌐"}</span>
          <span class="contact-name">${item.contact_name}</span>
        </div>
        <div class="contact-sub">${item.is_busy ? "Meşgul" : item.is_online ? "Çevrimiçi" : "Çevrimdışı"} • ${item.contact_code}</div>
      `;

      card.appendChild(presence);
      card.appendChild(meta);

      card.addEventListener("click", async () => {
        if (!item.is_online) {
          addSystemMessage("Bu kişi şu anda çevrimdışı.");
          return;
        }
        if (item.is_busy) {
          addSystemMessage("Bu kişi şu anda meşgul.");
          return;
        }
        await sendRequest(item.contact_code);
      });

      longPress(card, () => {
        state.pendingDeleteContactId = item.id;
        UI.deleteContactText.textContent = `${item.contact_name} adlı kişiyi rehberden silmek istiyor musun?`;
        openModal(UI.deleteContactModal);
      });

      UI.contactsList.appendChild(card);
    });
  } catch {}
}

async function saveCurrentContact() {
  const name = String(UI.contactNameInput?.value || "").trim();
  if (!name || !state.activePeerCode) {
    await goHomeNow();
    return;
  }

  try {
    await api("/contacts", {
      method: "POST",
      body: JSON.stringify({
        contact_code: state.activePeerCode,
        contact_name: name,
        contact_lang: state.activePeerLang,
        contact_flag: state.activePeerFlag
      })
    });
    closeModal(UI.addContactModal);
    addSystemMessage("Kişi rehbere eklendi.");
    await loadContacts();
    await goHomeNow();
  } catch (e) {
    addSystemMessage(e.message || "Rehbere eklenemedi.");
    await goHomeNow();
  }
}

async function deleteContactNow() {
  if (!state.pendingDeleteContactId) return;

  try {
    await api(`/contacts/${state.pendingDeleteContactId}`, { method: "DELETE" });
    state.pendingDeleteContactId = null;
    closeModal(UI.deleteContactModal);
    addSystemMessage("Kişi rehberden silindi.");
    await loadContacts();
  } catch (e) {
    addSystemMessage(e.message || "Kişi silinemedi.");
  }
}

async function loadSavedChats() {
  if (!UI.savedChatsList) return;

  try {
    const res = await api("/saved");
    const items = res.items || [];
    UI.savedChatsList.innerHTML = "";

    if (!items.length) {
      const empty = document.createElement("div");
      empty.className = "saved-btn";
      empty.textContent = "Henüz kayıtlı sohbet yok";
      UI.savedChatsList.appendChild(empty);
      return;
    }

    items.forEach((item) => {
      const btn = document.createElement("button");
      btn.className = "saved-btn";
      btn.innerHTML = `
        <span>${item.title}</span>
        <span class="saved-meta">${item.peer_flag || "🌐"} ${item.peer_name || "Karşı Taraf"} • ${new Date(item.updated_at).toLocaleString("tr-TR")}</span>
      `;
      btn.addEventListener("click", async () => {
        try {
          const detail = await api(`/saved/${item.id}`);
          clearChatDom();
          state.activePeerName = detail.saved_chat.peer_name || "Karşı Taraf";
          state.activePeerLang = detail.saved_chat.peer_lang || "tr";
          state.activePeerFlag = detail.saved_chat.peer_flag || flagFromCode(state.activePeerLang);
          state.activePeerOnline = false;
          state.activePeerBusy = false;
          syncPeerBar();

          (detail.messages || []).forEach((msg) => {
            if (msg.side === "center") {
              addSystemMessage(msg.text);
            } else {
              addChatMessage(msg.side, {
                name: msg.sender_name || (msg.side === "right" ? "Sen" : state.activePeerName),
                text: msg.text,
                translatedText: msg.translated_text || "",
                meta: msg.meta || ""
              }, msg.id);
            }
          });

          closeMenu();
          addSystemMessage(`Kayıtlı sohbet açıldı: ${item.title}`);
        } catch (e) {
          addSystemMessage(e.message || "Kayıtlı sohbet açılamadı.");
        }
      });
      UI.savedChatsList.appendChild(btn);
    });
  } catch {}
}

function getOutgoingMessagesForSave() {
  if (!UI.chatMessages) return [];
  return [...UI.chatMessages.querySelectorAll(".msg")].map((row) => {
    const side = row.classList.contains("right") ? "right" : row.classList.contains("left") ? "left" : "center";
    const name = row.querySelector(".msg-name")?.textContent?.trim() || "";
    const textNode = row.querySelector(".bubble, .system-bubble");
    const translated = row.querySelector(".msg-translate")?.textContent?.trim() || "";
    const meta = row.querySelector(".msg-meta")?.textContent?.trim() || "";

    let text = textNode?.textContent?.trim() || "";
    if (translated) text = text.replace(translated, "").trim();
    if (name) text = text.replace(name, "").trim();

    return {
      side,
      sender_name: name || null,
      text,
      translated_text: translated || null,
      meta: meta || null
    };
  }).filter(x => x.text);
}

async function saveChatByName() {
  const title = String(UI.saveChatNameInput?.value || "").trim();
  if (!title) {
    addSystemMessage("Lütfen sohbet adı yaz.");
    return;
  }

  try {
    await api("/saved", {
      method: "POST",
      body: JSON.stringify({
        conversation_id: state.activeConversationId,
        title,
        peer_user_id: state.activePeerUserId,
        peer_name: state.activePeerName,
        peer_lang: state.activePeerLang,
        peer_flag: state.activePeerFlag,
        messages: getOutgoingMessagesForSave()
      })
    });

    closeModal(UI.saveNameModal);
    addSystemMessage(`Sohbet kaydedildi: ${title}`);
    await loadSavedChats();
    await maybeAskAddContactThenHome();
  } catch (e) {
    addSystemMessage(e.message || "Sohbet kaydedilemedi.");
    await maybeAskAddContactThenHome();
  }
}

async function endConversationBackend() {
  if (!state.activeConversationId) return;
  try {
    await api(`/end?conversation_id=${encodeURIComponent(state.activeConversationId)}`, { method: "POST" });
  } catch {}
}

async function resetAfterEndChat() {
  stopSpeaking();
  await endConversationBackend();

  state.activeConversationId = null;
  state.activePeerUserId = null;
  state.activePeerName = "";
  state.activePeerCode = "";
  state.activePeerLang = "tr";
  state.activePeerFlag = "🌐";
  state.activePeerOnline = false;
  state.activePeerBusy = false;

  syncPeerBar();
  clearChatDom();
  addSystemMessage("Sohbet kapatıldı.");
  await updatePresence();
}

async function isPeerInContacts() {
  if (!state.activePeerCode) return true;
  try {
    const res = await api("/contacts");
    return (res.items || []).some(x => (x.contact_code || "").toUpperCase() === state.activePeerCode.toUpperCase());
  } catch {
    return true;
  }
}

async function maybeAskAddContactThenHome() {
  const exists = await isPeerInContacts();
  if (state.activePeerName && state.activePeerCode && !exists) {
    UI.addContactText.textContent = `${state.activePeerName} adlı kişiyi rehbere eklemek ister misiniz?`;
    UI.contactNameInput.value = state.activePeerName;
    openModal(UI.addContactModal);
    return;
  }
  await goHomeNow();
}

async function goHomeNow() {
  await resetAfterEndChat();
  location.href = "/pages/home.html";
}

async function handleLeaveFlow(reason = "manual") {
  state.leavingReason = reason;
  if (!state.activeConversationId && !UI.chatMessages?.children.length) {
    location.href = "/pages/home.html";
    return;
  }

  const who = state.activePeerName || "Bu kişi";
  UI.leaveChatText.textContent =
    reason === "peer_left"
      ? `${who} sohbetten ayrıldı. Sohbeti kaydetmek ister misiniz?`
      : `${who} ile sohbeti bitirmek istiyor musunuz?`;

  openModal(UI.leaveChatModal);
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
    await handleLeaveFlow("manual");
  });

  UI.brandHome?.addEventListener("click", async () => {
    await handleLeaveFlow("manual");
  });

  UI.openConnectFromMenuBtn?.addEventListener("click", () => openModal(UI.connectModal));
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

  UI.copyMyCodeBtn?.addEventListener("click", () => {
    copyText(state.myCode, "Sohbet ID kopyalandı.");
  });

  UI.showAppQrBtn?.addEventListener("click", () => {
    if (UI.appQrImage) UI.appQrImage.src = buildQrUrl(APP_STORE_URL);
    openModal(UI.appQrModal);
  });

  UI.topQrBtn?.addEventListener("click", () => {
    if (UI.appQrImage) UI.appQrImage.src = buildQrUrl(APP_STORE_URL);
    openModal(UI.appQrModal);
  });

  UI.closeQrModalBtn?.addEventListener("click", () => closeModal(UI.appQrModal));
  UI.copyStoreLinkBtn?.addEventListener("click", () => copyText(APP_STORE_URL, "Mağaza linki kopyalandı."));

  UI.topSettingsBtn?.addEventListener("click", () => openSheet(UI.settingsSheet));
  UI.openSettingsFromMenuBtn?.addEventListener("click", () => openSheet(UI.settingsSheet));
  UI.closeSettingsSheetBtn?.addEventListener("click", () => closeSheet(UI.settingsSheet));
  UI.goSettingsPageBtn?.addEventListener("click", () => {
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
    addSystemMessage(state.culturalMode ? "Kültürel çeviri açıldı." : "Kültürel çeviri kapatıldı.");
  });

  UI.peerFlag?.addEventListener("click", () => openSheet(UI.langSheet));
  UI.peerLang?.addEventListener("click", () => openSheet(UI.langSheet));
  UI.closeLangSheetBtn?.addEventListener("click", () => closeSheet(UI.langSheet));

  UI.toggleContactsBtn?.addEventListener("click", async () => {
    state.contactsOpen = !state.contactsOpen;
    UI.contactsList?.classList.toggle("open", state.contactsOpen);
    if (state.contactsOpen) await loadContacts();
  });

  UI.toggleSavedChatsBtn?.addEventListener("click", async () => {
    state.savedChatsOpen = !state.savedChatsOpen;
    UI.savedChatsList?.classList.toggle("open", state.savedChatsOpen);
    if (state.savedChatsOpen) await loadSavedChats();
  });

  UI.endChatBtn?.addEventListener("click", async () => {
    closeMenu();
    await handleLeaveFlow("manual");
  });

  UI.acceptRequestBtn?.addEventListener("click", acceptIncomingRequest);
  UI.rejectRequestBtn?.addEventListener("click", rejectIncomingRequest);

  UI.leaveChatNoBtn?.addEventListener("click", () => closeModal(UI.leaveChatModal));
  UI.leaveChatYesBtn?.addEventListener("click", async () => {
    closeModal(UI.leaveChatModal);
    openModal(UI.savePromptModal);
  });

  UI.skipSaveBtn?.addEventListener("click", async () => {
    closeModal(UI.savePromptModal);
    await maybeAskAddContactThenHome();
  });

  UI.openSaveNameBtn?.addEventListener("click", () => {
    closeModal(UI.savePromptModal);
    openModal(UI.saveNameModal);
  });

  UI.cancelSaveNameBtn?.addEventListener("click", async () => {
    closeModal(UI.saveNameModal);
    await maybeAskAddContactThenHome();
  });

  UI.confirmSaveNameBtn?.addEventListener("click", saveChatByName);

  UI.cancelContactBtn?.addEventListener("click", async () => {
    closeModal(UI.addContactModal);
    await goHomeNow();
  });

  UI.confirmContactBtn?.addEventListener("click", saveCurrentContact);

  UI.cancelDeleteContactBtn?.addEventListener("click", () => {
    state.pendingDeleteContactId = null;
    closeModal(UI.deleteContactModal);
  });

  UI.confirmDeleteContactBtn?.addEventListener("click", deleteContactNow);

  window.visualViewport?.addEventListener("resize", updateViewportLayout);
  window.visualViewport?.addEventListener("scroll", updateViewportLayout);
  window.addEventListener("resize", updateViewportLayout);

  document.addEventListener("visibilitychange", async () => {
    await updatePresence(document.hidden ? "background" : "foreground");
  });

  window.addEventListener("beforeunload", (e) => {
    if (state.activeConversationId) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}

function startTimers() {
  stopTimers();

  state.timers.incoming = setInterval(pollIncomingRequests, 5000);
  state.timers.conversation = setInterval(checkCurrentConversation, 5000);
  state.timers.messages = setInterval(pollMessages, 2500);
  state.timers.contacts = setInterval(() => {
    if (state.contactsOpen) loadContacts();
  }, 7000);
  state.timers.presence = setInterval(() => {
    updatePresence(document.hidden ? "background" : "foreground");
  }, 20000);
}

function stopTimers() {
  Object.values(state.timers).forEach((timer) => timer && clearInterval(timer));
}

async function init() {
  try {
    state.authToken = await getAuthToken();
    if (!state.authToken) {
      location.href = "/pages/login.html";
      return;
    }

    hydrateSettingsFromStorage();
    renderLangList();
    renderVoiceList();
    autoResizeTextarea();
    syncInputActionState();
    updateViewportLayout();

    await loadProfileUI();
    syncPeerBar();
    addSystemMessage(`Merhaba ${(state.myName || "Kullanıcı").split(" ")[0]}. Kod girerek bağlantı başlatabilirsin.`);

    bindEvents();
    await updatePresence("foreground");
    await checkCurrentConversation();
    await pollIncomingRequests();

    startTimers();
    scrollChatToBottom();
  } catch (e) {
    console.error("ARKADASLA INIT HATASI:", e);
    addSystemMessage("Sayfa başlatılırken bir hata oluştu.");
  }
}

init();
