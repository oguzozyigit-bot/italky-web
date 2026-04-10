import { supabase } from "/js/supabase_client.js";

const $ = (id) => document.getElementById(id);

const STORAGE = {
  voice: "italkyai_selected_voice",
  secondVoiceName: "italkyai_second_voice_name",
  secondVoiceOwnerName: "italkyai_second_voice_owner_name"
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
  homeBtn: $("homeBtn"),
  brandHome: $("brandHome"),
  jetonYukleBtn: $("jetonYukleBtn"),

  newChatBtn: $("newChatBtn"),
  saveChatMenuBtn: $("saveChatMenuBtn"),
  savedChatsToggleBtn: $("savedChatsToggleBtn"),
  savedChatsList: $("savedChatsList"),
  clearChatMenuBtn: $("clearChatMenuBtn"),

  voiceMenuBtn: $("voiceMenuBtn"),
  voiceSheet: $("voiceSheet"),
  newVoiceBtn: $("newVoiceBtn"),
  voiceCards: [...document.querySelectorAll("[data-voice-id]")],
  secondVoiceName: $("secondVoiceName"),
  secondVoiceDesc: $("secondVoiceDesc"),

  topAvatarBtn: $("topAvatarBtn"),
  topAvatarImg: $("topAvatarImg"),

  menuUserAvatar: $("menuUserAvatar"),
  menuUserAvatarImg: $("menuUserAvatarImg"),
  menuUserName: $("menuUserName"),
  menuJeton: $("menuJeton"),

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

function scrollChatToBottom() {
  requestAnimationFrame(() => {
    UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight + 200;
  });
}

function updateKeyboardOffset() {
  const vv = window.visualViewport;
  if (!vv) return;

  const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  document.documentElement.style.setProperty("--keyboard-offset", `${keyboardHeight}px`);
  scrollChatToBottom();
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

  scrollChatToBottom();
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
  try {
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user || null;

    if (!currentUser) return { user: null, profile: null };

    const { data: profile } = await supabase
      .from("profiles")
      .select("id,full_name,email,tokens,avatar_url")
      .eq("id", currentUser.id)
      .maybeSingle();

    currentProfile = profile || null;
    return { user: currentUser, profile: currentProfile };
  } catch (e) {
    console.error("Auth context hata:", e);
    return { user: null, profile: null };
  }
}

async function hydrateProfileUI() {
  const ctx = await getAuthContext();

  const avatarUrl =
    ctx?.profile?.avatar_url ||
    ctx?.user?.user_metadata?.avatar_url ||
    ctx?.user?.user_metadata?.picture ||
    "";

  const displayName =
    ctx?.profile?.full_name ||
    ctx?.user?.user_metadata?.full_name ||
    ctx?.user?.user_metadata?.name ||
    ctx?.user?.email ||
    "Kullanıcı";

  const tokens = Number(ctx?.profile?.tokens || 0);

  if (avatarUrl) {
    UI.topAvatarImg.src = avatarUrl;
    UI.topAvatarBtn.classList.remove("empty");

    UI.menuUserAvatarImg.src = avatarUrl;
    UI.menuUserAvatar.innerHTML = "";
    UI.menuUserAvatar.appendChild(UI.menuUserAvatarImg);
  }

  UI.menuUserName.textContent = displayName;
  UI.menuJeton.textContent = `Jeton: ${tokens}`;
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

function buildLocalFallbackReply(text) {
  return `Tamam, bunu aldım. Biraz daha aç da seni yarım yamalak anlamayayım: ${text}`;
}

async function sendCurrentMessage(mode = "text") {
  const text = String(UI.chatInput.value || "").trim();
  if (!text) return;

  lastInputMode = mode;

  const auth = await getAuthContext();

  addMessage("right", text);
  UI.chatInput.value = "";
  autoResizeTextarea();
  syncInputActionState();
  setTyping(true);

  try {
    let reply = "";

    if (auth.user) {
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

      if (resp.ok) {
        const json = await resp.json().catch(() => ({}));
        reply = String(json?.reply || "").trim();
      }
    }

    if (!reply) reply = buildLocalFallbackReply(text);

    addMessage("left", reply);
    setTyping(false);
    await speakText(reply);
  } catch (e) {
    console.error("Chat hata:", e);
    const reply = buildLocalFallbackReply(text);
    setTyping(false);
    addMessage("left", reply);
    await speakText(reply);
  }
}

function clearChatDom() {
  UI.chatMessages.innerHTML = "";
}

const LOCAL_SAVED_KEY = "italkyai_local_saved_chats";

function getLocalSavedChats() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_SAVED_KEY) || "[]");
  } catch {
    return [];
  }
}

function setLocalSavedChats(list) {
  localStorage.setItem(LOCAL_SAVED_KEY, JSON.stringify(list));
}

async function fetchSavedChats() {
  const auth = await getAuthContext();
  if (auth.user) {
    try {
      const { data, error } = await supabase
        .from("chat_persona_saved_chats")
        .select("id, session_id, title, created_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });

      if (!error && data) return data;
    } catch {}
  }
  return getLocalSavedChats();
}

async function fetchSavedChatMessages(savedChatId) {
  const auth = await getAuthContext();
  if (auth.user) {
    try {
      const { data, error } = await supabase
        .from("chat_persona_saved_chat_messages")
        .select("id, role, message, created_at")
        .eq("saved_chat_id", savedChatId)
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: true });

      if (!error && data) return data;
    } catch {}
  }

  const local = getLocalSavedChats().find(x => x.id === savedChatId);
  if (!local) return [];
  return (local.messages || []).map((m, i) => ({
    id: i + 1,
    role: m.side === "right" ? "user" : "assistant",
    message: m.text,
    created_at: local.created_at
  }));
}

async function renderSavedChats() {
  UI.savedChatsList.innerHTML = "";
  const list = await fetchSavedChats();

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
      <span class="saved-chat-meta">${new Date(chat.created_at).toLocaleString("tr-TR")}</span>
    `;
    btn.addEventListener("click", () => loadSavedChat(chat.id));
    UI.savedChatsList.appendChild(btn);
  });
}

async function loadSavedChat(savedChatId) {
  const messages = await fetchSavedChatMessages(savedChatId);
  if (!messages.length) return;

  clearChatDom();
  currentSavedChatId = savedChatId;

  const chats = await fetchSavedChats();
  const found = chats.find(x => x.id === savedChatId);
  currentSessionId = found?.session_id || crypto.randomUUID();

  messages.forEach(msg => {
    addMessage(msg.role === "user" ? "right" : "left", msg.message);
  });

  closeMenu();
}

async function deleteCurrentSavedChat() {
  if (!currentSavedChatId) {
    clearChatDom();
    currentSessionId = crypto.randomUUID();
    closeMenu();
    return;
  }

  const auth = await getAuthContext();

  if (auth.user) {
    try {
      await supabase
        .from("chat_persona_saved_chats")
        .delete()
        .eq("id", currentSavedChatId)
        .eq("user_id", auth.user.id);
    } catch (e) {
      console.error("Sohbet sil hata:", e);
    }
  } else {
    const list = getLocalSavedChats().filter(x => x.id !== currentSavedChatId);
    setLocalSavedChats(list);
  }

  currentSavedChatId = null;
  currentSessionId = crypto.randomUUID();
  clearChatDom();
  await renderSavedChats();
  closeMenu();
}

async function saveChatNow() {
  const title = String(UI.saveChatName.value || "").trim();
  if (!title) return;

  const auth = await getAuthContext();
  const messageRows = [...UI.chatMessages.querySelectorAll(".msg")].map((msg) => {
    const side = msg.classList.contains("right") ? "user" : "assistant";
    const text = msg.querySelector(".bubble")?.textContent || "";
    return { role: side, message: text, char_count: text.length };
  });

  if (!messageRows.length) {
    UI.saveModal.classList.remove("open");
    return;
  }

  if (auth.user) {
    try {
      let savedChatId = currentSavedChatId;

      if (!savedChatId) {
        const { data: inserted, error: insertErr } = await supabase
          .from("chat_persona_saved_chats")
          .insert({
            user_id: auth.user.id,
            session_id: currentSessionId,
            title
          })
          .select("id")
          .single();

        if (insertErr) throw insertErr;
        savedChatId = inserted.id;
        currentSavedChatId = savedChatId;
      } else {
        const { error: updateErr } = await supabase
          .from("chat_persona_saved_chats")
          .update({ title })
          .eq("id", savedChatId)
          .eq("user_id", auth.user.id);

        if (updateErr) throw updateErr;

        await supabase
          .from("chat_persona_saved_chat_messages")
          .delete()
          .eq("saved_chat_id", savedChatId)
          .eq("user_id", auth.user.id);
      }

      const rows = messageRows.map((row) => ({
        saved_chat_id: savedChatId,
        user_id: auth.user.id,
        session_id: currentSessionId,
        role: row.role,
        message: row.message,
        char_count: row.char_count
      }));

      const { error: msgErr } = await supabase
        .from("chat_persona_saved_chat_messages")
        .insert(rows);

      if (msgErr) throw msgErr;
    } catch (e) {
      console.error("Sohbet kaydet hata:", e);
    }
  } else {
    const list = getLocalSavedChats().filter(x => x.id !== currentSavedChatId);
    const id = currentSavedChatId || crypto.randomUUID();

    list.unshift({
      id,
      session_id: currentSessionId,
      title,
      created_at: new Date().toISOString(),
      messages: messageRows.map(x => ({
        side: x.role === "user" ? "right" : "left",
        text: x.message
      }))
    });

    setLocalSavedChats(list);
    currentSavedChatId = id;
  }

  UI.saveModal.classList.remove("open");
  UI.saveChatName.value = "";
  await renderSavedChats();
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
    scrollChatToBottom();
  });

  UI.chatInput.addEventListener("focus", () => {
    setTimeout(updateKeyboardOffset, 100);
    setTimeout(scrollChatToBottom, 180);
    setTimeout(scrollChatToBottom, 280);
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

  UI.homeBtn.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  UI.brandHome.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  UI.jetonYukleBtn.addEventListener("click", () => {
    location.href = "/pages/jetonbuy.html";
  });

  UI.newChatBtn.addEventListener("click", () => {
    clearChatDom();
    currentSavedChatId = null;
    currentSessionId = crypto.randomUUID();
    closeMenu();
  });

  UI.saveChatMenuBtn.addEventListener("click", () => {
    UI.saveModal.classList.add("open");
  });

  UI.cancelSaveChat.addEventListener("click", () => {
    UI.saveModal.classList.remove("open");
  });

  UI.confirmSaveChat.addEventListener("click", saveChatNow);

  UI.savedChatsToggleBtn.addEventListener("click", async () => {
    toggleSavedChats();
    if (UI.savedChatsList.classList.contains("open")) {
      await renderSavedChats();
    }
  });

  UI.clearChatMenuBtn.addEventListener("click", deleteCurrentSavedChat);

  UI.voiceMenuBtn.addEventListener("click", () => {
    UI.voiceSheet.classList.toggle("open");
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
  window.addEventListener("resize", updateKeyboardOffset);
}

async function init() {
  hydrateSecondVoiceName();
  setSelectedVoice(getSelectedVoice());
  bindEvents();
  autoResizeTextarea();
  syncInputActionState();
  await hydrateProfileUI();
  await renderSavedChats();
  updateKeyboardOffset();
  scrollChatToBottom();
}

init();
