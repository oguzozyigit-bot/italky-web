import { supabase } from "/js/supabase_client.js";

const $ = (id) => document.getElementById(id);

const STORAGE = {
  voice: "italkyai_selected_voice",
  secondVoiceName: "italkyai_second_voice_name",
  secondVoiceOwnerName: "italkyai_second_voice_owner_name",
  savedChats: "italkyai_saved_chats"
};

const API = {
  chat: "https://italky-api.onrender.com/api/italkyai/chat",
  tts: "https://italky-api.onrender.com/api/tts"
};

const UI = {
  chatMessages: $("chatMessages"),
  chatInput: $("chatInput"),
  sendBtn: $("sendBtn"),
  micBtn: $("micBtn"),
  typingState: $("typingState"),

  menu: $("menu"),
  menuBtn: $("menuBtn"),
  menuBackdrop: $("menuBackdrop"),
  menuCloseBtn: $("menuCloseBtn"),

  newChatBtn: $("newChatBtn"),
  saveChatBtn: $("saveChatBtn"),
  saveChatMenuBtn: $("saveChatMenuBtn"),
  savedChatsBtn: $("savedChatsBtn"),
  savedChatsToggleBtn: $("savedChatsToggleBtn"),
  savedChatsList: $("savedChatsList"),
  clearChatMenuBtn: $("clearChatMenuBtn"),

  voiceMenuBtn: $("voiceMenuBtn"),
  voiceSheet: $("voiceSheet"),
  closeVoiceSheet: $("closeVoiceSheet"),
  newVoiceBtn: $("newVoiceBtn"),
  voiceCards: [...document.querySelectorAll("[data-voice-id]")],
  secondVoiceName: $("secondVoiceName"),
  secondVoiceDesc: $("secondVoiceDesc"),

  topAvatarBtn: $("topAvatarBtn"),

  saveModal: $("saveModal"),
  saveChatName: $("saveChatName"),
  cancelSaveChat: $("cancelSaveChat"),
  confirmSaveChat: $("confirmSaveChat"),

  listenModal: $("listenModal"),
  closeListenModal: $("closeListenModal")
};

let currentAudio = null;
let currentUser = null;
let currentProfile = null;
let currentSessionId = crypto.randomUUID();
let currentSavedChatId = null;
let recognition = null;
let lastInputMode = "text";

function stopAudio() {
  try {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }
  } catch {}
  currentAudio = null;
}

function autoResizeTextarea() {
  UI.chatInput.style.height = "auto";
  UI.chatInput.style.height = `${Math.min(UI.chatInput.scrollHeight, 140)}px`;
}

function syncInputActionState() {
  const hasText = String(UI.chatInput.value || "").trim().length > 0;
  UI.micBtn.classList.toggle("hidden", hasText);
  UI.sendBtn.classList.toggle("hidden", !hasText);
}

function updateKeyboardOffset() {
  const vv = window.visualViewport;
  if (!vv) return;

  const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  document.documentElement.style.setProperty("--keyboard-offset", `${keyboardHeight}px`);

  requestAnimationFrame(() => {
    UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight;
  });
}

function openMenu() {
  UI.menu.classList.add("open");
}

function closeMenu() {
  UI.menu.classList.remove("open");
  UI.voiceSheet.classList.remove("open");
}

function toggleSavedChats() {
  UI.savedChatsList.classList.toggle("open");
}

function getSelectedVoice() {
  return localStorage.getItem(STORAGE.voice) || "free_tts";
}

function setSelectedVoice(voiceId) {
  localStorage.setItem(STORAGE.voice, voiceId);
  UI.voiceCards.forEach(card => {
    card.classList.toggle("active", card.dataset.voiceId === voiceId);
  });
}

function hydrateSecondVoiceName() {
  const secondVoiceName = localStorage.getItem(STORAGE.secondVoiceName) || "İkinci Ses";
  const secondVoiceOwnerName = localStorage.getItem(STORAGE.secondVoiceOwnerName) || "";

  UI.secondVoiceName.textContent = secondVoiceName;
  UI.secondVoiceDesc.textContent = secondVoiceOwnerName
    ? `${secondVoiceOwnerName} için tanımlanan özel ses burada görünür.`
    : "Kayıt sayfasında verilen isim burada görünür.";
}

function addMessage(side, text, meta) {
  const row = document.createElement("div");
  row.className = `msg ${side}`;

  const wrap = document.createElement("div");
  wrap.className = "bubble-wrap";

  const bubble = document.createElement("div");
  bubble.className = `bubble ${side}`;
  bubble.textContent = text;

  const metaEl = document.createElement("div");
  metaEl.className = "msg-meta";
  metaEl.textContent = meta || (side === "right" ? "Sen • şimdi" : "italkyAI • şimdi");

  wrap.appendChild(bubble);
  wrap.appendChild(metaEl);
  row.appendChild(wrap);
  UI.chatMessages.appendChild(row);

  requestAnimationFrame(() => {
    UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight;
  });
}

function setTyping(show) {
  UI.typingState.classList.toggle("show", !!show);
}

function countCharacters(text) {
  return String(text || "").length;
}

function getFreeLimit() {
  return 100;
}

function canSendWithoutToken(text) {
  return countCharacters(text) <= getFreeLimit();
}

function buildVoicePayload() {
  const voiceId = getSelectedVoice();

  if (voiceId === "free_tts") return { mode: "free_tts", label: "Ücretsiz Ses" };
  if (voiceId === "mine_clone") return { mode: "clone", label: "Kendi Sesim" };
  if (voiceId === "second_custom") {
    return {
      mode: "special",
      label: localStorage.getItem(STORAGE.secondVoiceName) || "İkinci Ses"
    };
  }

  return { mode: "preset", label: voiceId };
}

async function getAuthContext() {
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user || null;

  if (!currentUser) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,full_name,email,tokens")
    .eq("id", currentUser.id)
    .maybeSingle();

  currentProfile = profile || null;
  return { user: currentUser, profile: currentProfile };
}

async function speakText(text) {
  if (lastInputMode !== "voice") return;

  const clean = String(text || "").trim();
  if (!clean) return;

  stopAudio();

  const voice = buildVoicePayload();

  if (voice.mode === "free_tts") {
    try {
      window.speechSynthesis?.cancel?.();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = "tr-TR";
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
      return;
    } catch {}
  }

  try {
    if (!currentUser) await getAuthContext();
    if (!currentUser) return;

    const resp = await fetch(API.tts, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: clean,
        lang: "tr",
        user_id: currentUser.id,
        voice: voice.mode === "clone" ? "clone" : voice.label,
        module: "italkyai"
      })
    });

    const json = await resp.json().catch(() => ({}));
    const audioBase64 = String(json?.audio_base64 || "").trim();
    if (!audioBase64) return;

    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    currentAudio = audio;
    audio.play().catch(() => {});
  } catch (e) {
    console.error("TTS hata:", e);
  }
}

async function sendCurrentMessage(mode = "text") {
  const text = String(UI.chatInput.value || "").trim();
  if (!text) return;

  lastInputMode = mode;

  const auth = await getAuthContext();
  if (!auth.user) {
    location.href = "/pages/login.html";
    return;
  }

  addMessage("right", text);
  UI.chatInput.value = "";
  autoResizeTextarea();
  syncInputActionState();
  setTyping(true);

  try {
    const voice = buildVoicePayload();

    const payload = {
      user_id: auth.user.id,
      session_id: currentSessionId,
      text,
      voice_mode: voice.mode,
      voice_label: voice.label,
      free_limit: getFreeLimit(),
      can_use_free: canSendWithoutToken(text)
    };

    const resp = await fetch(API.chat, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const json = await resp.json().catch(() => ({}));
    const reply = String(json?.reply || "").trim() || "Şu an cevap üretilemedi.";

    addMessage("left", reply);
    setTyping(false);

    await speakText(reply);
  } catch (e) {
    console.error("Chat hata:", e);
    setTyping(false);
    addMessage("left", "Şu an cevap üretilemedi.");
  }
}

function clearChat() {
  UI.chatMessages.innerHTML = "";
  if (currentSavedChatId) {
    const list = getSavedChats().filter(x => x.id !== currentSavedChatId);
    localStorage.setItem(STORAGE.savedChats, JSON.stringify(list));
    currentSavedChatId = null;
    renderSavedChats();
  }
  currentSessionId = crypto.randomUUID();
  closeMenu();
}

function getSavedChats() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE.savedChats) || "[]");
  } catch {
    return [];
  }
}

function renderSavedChats() {
  const list = getSavedChats();
  UI.savedChatsList.innerHTML = "";

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "saved-chat-btn";
    empty.textContent = "Henüz kayıtlı sohbet yok";
    UI.savedChatsList.appendChild(empty);
    return;
  }

  list.forEach(chat => {
    const btn = document.createElement("button");
    btn.className = "saved-chat-btn";
    btn.innerHTML = `
      <span>${chat.title}</span>
      <span class="saved-chat-meta">${new Date(chat.saved_at).toLocaleString("tr-TR")}</span>
    `;
    btn.addEventListener("click", () => loadSavedChat(chat.id));
    UI.savedChatsList.appendChild(btn);
  });
}

function loadSavedChat(chatId) {
  const chat = getSavedChats().find(x => x.id === chatId);
  if (!chat) return;

  UI.chatMessages.innerHTML = "";
  currentSavedChatId = chat.id;
  currentSessionId = chat.session_id;

  (chat.messages || []).forEach(msg => {
    addMessage(msg.side, msg.text, msg.meta);
  });

  closeMenu();
}

function saveChatNow() {
  const title = String(UI.saveChatName.value || "").trim();
  if (!title) return;

  const messages = [...UI.chatMessages.querySelectorAll(".msg")].map((msg) => ({
    side: msg.classList.contains("right") ? "right" : "left",
    text: msg.querySelector(".bubble")?.textContent || "",
    meta: msg.querySelector(".msg-meta")?.textContent || ""
  }));

  if (!messages.length) {
    UI.saveModal.classList.remove("open");
    return;
  }

  const list = getSavedChats().filter(x => x.id !== currentSavedChatId);
  const id = currentSavedChatId || crypto.randomUUID();

  list.unshift({
    id,
    session_id: currentSessionId,
    title,
    saved_at: new Date().toISOString(),
    messages
  });

  localStorage.setItem(STORAGE.savedChats, JSON.stringify(list));
  currentSavedChatId = id;
  UI.saveModal.classList.remove("open");
  UI.saveChatName.value = "";
  renderSavedChats();
  closeMenu();
}

function openListenMode() {
  UI.listenModal.classList.add("open");
  UI.micBtn.classList.add("listening");

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) return;

  recognition = new Recognition();
  recognition.lang = "tr-TR";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event?.results?.[0]?.[0]?.transcript || "";
    UI.chatInput.value = transcript;
    autoResizeTextarea();
    syncInputActionState();
    closeListenMode(false);
    sendCurrentMessage("voice");
  };

  recognition.onerror = () => {
    closeListenMode(false);
  };

  recognition.onend = () => {
    UI.micBtn.classList.remove("listening");
  };

  try {
    recognition.start();
  } catch {}
}

function closeListenMode(stopRecognition = true) {
  UI.listenModal.classList.remove("open");
  UI.micBtn.classList.remove("listening");

  if (stopRecognition) {
    try { recognition?.stop(); } catch {}
  }
}

function bindEvents() {
  UI.chatInput.addEventListener("input", () => {
    autoResizeTextarea();
    syncInputActionState();
    requestAnimationFrame(() => {
      UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight;
    });
  });

  UI.chatInput.addEventListener("focus", () => {
    setTimeout(updateKeyboardOffset, 80);
  });

  UI.chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendCurrentMessage("text");
    }
  });

  UI.sendBtn.addEventListener("click", () => sendCurrentMessage("text"));

  UI.micBtn.addEventListener("click", openListenMode);
  UI.closeListenModal.addEventListener("click", () => closeListenMode(true));

  UI.menuBtn.addEventListener("click", openMenu);
  UI.menuBackdrop.addEventListener("click", closeMenu);
  UI.menuCloseBtn.addEventListener("click", closeMenu);

  UI.newChatBtn.addEventListener("click", () => {
    UI.chatMessages.innerHTML = "";
    currentSavedChatId = null;
    currentSessionId = crypto.randomUUID();
    closeMenu();
  });

  UI.saveChatBtn.addEventListener("click", () => UI.saveModal.classList.add("open"));
  UI.saveChatMenuBtn.addEventListener("click", () => UI.saveModal.classList.add("open"));

  UI.cancelSaveChat.addEventListener("click", () => {
    UI.saveModal.classList.remove("open");
  });

  UI.confirmSaveChat.addEventListener("click", saveChatNow);

  UI.savedChatsToggleBtn.addEventListener("click", toggleSavedChats);
  UI.clearChatMenuBtn.addEventListener("click", clearChat);

  UI.voiceMenuBtn.addEventListener("click", () => {
    UI.voiceSheet.classList.toggle("open");
  });

  UI.closeVoiceSheet.addEventListener("click", () => {
    UI.voiceSheet.classList.remove("open");
  });

  UI.newVoiceBtn.addEventListener("click", () => {
    location.href = "/pages/ai_voice_profile.html";
  });

  UI.voiceCards.forEach(card => {
    card.addEventListener("click", () => {
      setSelectedVoice(card.dataset.voiceId || "free_tts");
    });
  });

  UI.topAvatarBtn.addEventListener("click", () => {
    location.href = "/pages/ai_voice_profile.html";
  });

  window.visualViewport?.addEventListener("resize", updateKeyboardOffset);
  window.visualViewport?.addEventListener("scroll", updateKeyboardOffset);
}

function setSelectedVoice(voiceId) {
  localStorage.setItem(STORAGE.voice, voiceId);
  UI.voiceCards.forEach(card => {
    card.classList.toggle("active", card.dataset.voiceId === voiceId);
  });
}

function initVoiceState() {
  const selected = localStorage.getItem(STORAGE.voice) || "free_tts";
  setSelectedVoice(selected);
}

function hydrateSecondVoiceName() {
  const secondVoiceName = localStorage.getItem(STORAGE.secondVoiceName) || "İkinci Ses";
  const secondVoiceOwnerName = localStorage.getItem(STORAGE.secondVoiceOwnerName) || "";

  UI.secondVoiceName.textContent = secondVoiceName;
  UI.secondVoiceDesc.textContent = secondVoiceOwnerName
    ? `${secondVoiceOwnerName} için tanımlanan özel ses burada görünür.`
    : "Kayıt sayfasında verilen isim burada görünür.";
}

async function getAuthContext() {
  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user || null;

  if (!currentUser) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,full_name,email,tokens")
    .eq("id", currentUser.id)
    .maybeSingle();

  currentProfile = profile || null;
  return { user: currentUser, profile: currentProfile };
}

function buildVoicePayload() {
  const voiceId = localStorage.getItem(STORAGE.voice) || "free_tts";

  if (voiceId === "free_tts") return { mode: "free_tts", label: "Ücretsiz Ses" };
  if (voiceId === "mine_clone") return { mode: "clone", label: "Kendi Sesim" };
  if (voiceId === "second_custom") {
    return {
      mode: "special",
      label: localStorage.getItem(STORAGE.secondVoiceName) || "İkinci Ses"
    };
  }

  return { mode: "preset", label: voiceId };
}

async function speakText(text) {
  if (lastInputMode !== "voice") return;

  const clean = String(text || "").trim();
  if (!clean) return;

  stopAudio();

  const voice = buildVoicePayload();

  if (voice.mode === "free_tts") {
    try {
      window.speechSynthesis?.cancel?.();
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = "tr-TR";
      utterance.rate = 1;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
      return;
    } catch {}
  }

  try {
    if (!currentUser) await getAuthContext();
    if (!currentUser) return;

    const resp = await fetch(API.tts, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: clean,
        lang: "tr",
        user_id: currentUser.id,
        voice: voice.mode === "clone" ? "clone" : voice.label,
        module: "italkyai"
      })
    });

    const json = await resp.json().catch(() => ({}));
    const audioBase64 = String(json?.audio_base64 || "").trim();
    if (!audioBase64) return;

    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    currentAudio = audio;
    audio.play().catch(() => {});
  } catch (e) {
    console.error("TTS hata:", e);
  }
}

function updateKeyboardOffset() {
  const vv = window.visualViewport;
  if (!vv) return;

  const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  document.documentElement.style.setProperty("--keyboard-offset", `${keyboardHeight}px`);

  requestAnimationFrame(() => {
    UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight;
  });
}

async function init() {
  hydrateSecondVoiceName();
  initVoiceState();
  renderSavedChats();
  bindEvents();
  autoResizeTextarea();
  syncInputActionState();
  await getAuthContext();
  updateKeyboardOffset();
}

init();
