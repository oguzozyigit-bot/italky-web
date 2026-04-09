import { mountShell } from "/js/ui_shell.js";
import { supabase } from "/js/supabase_client.js";

try {
  mountShell({ scroll: "none" });
} catch (e) {
  console.error("ui_shell HATASI:", e);
}

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
  toggleVoiceBtn: $("toggleVoiceBtn"),
  voiceSheet: $("voiceSheet"),
  closeVoiceSheet: $("closeVoiceSheet"),
  newVoiceBtn: $("newVoiceBtn"),
  typingState: $("typingState"),
  voiceCards: [...document.querySelectorAll("[data-voice-id]")],
  secondVoiceName: $("secondVoiceName"),
  secondVoiceDesc: $("secondVoiceDesc"),
  clearChatBtn: $("clearChatBtn"),
  saveChatBtn: $("saveChatBtn"),
  savedChatsBtn: $("savedChatsBtn"),
  saveModal: $("saveModal"),
  saveChatName: $("saveChatName"),
  cancelSaveChat: $("cancelSaveChat"),
  confirmSaveChat: $("confirmSaveChat"),
  listenModal: $("listenModal"),
  closeListenModal: $("closeListenModal"),
  chatMain: document.querySelector(".chat-main")
};

let currentAudio = null;
let currentUser = null;
let currentProfile = null;
let currentSessionId = crypto.randomUUID();

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

async function sendCurrentMessage() {
  const text = String(UI.chatInput.value || "").trim();
  if (!text) return;

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
  currentSessionId = crypto.randomUUID();
}

async function saveChat() {
  const title = String(UI.saveChatName.value || "").trim();
  if (!title) return;

  const auth = await getAuthContext();
  if (!auth.user) return;

  const messages = [...UI.chatMessages.querySelectorAll(".msg")].map((msg) => {
    const side = msg.classList.contains("right") ? "user" : "assistant";
    const text = msg.querySelector(".bubble")?.textContent || "";
    return { role: side, message: text };
  });

  if (!messages.length) {
    UI.saveModal.classList.remove("open");
    return;
  }

  try {
    await supabase.from("chat_persona_saved_chats").insert({
      user_id: auth.user.id,
      session_id: currentSessionId,
      title
    });

    for (const row of messages) {
      await supabase.from("chat_persona_saved_chat_messages").insert({
        user_id: auth.user.id,
        session_id: currentSessionId,
        role: row.role,
        message: row.message
      });
    }
  } catch (e) {
    console.error("Sohbet kaydet hata:", e);
  }

  UI.saveModal.classList.remove("open");
  UI.saveChatName.value = "";
}

function updateViewportForKeyboard() {
  const vv = window.visualViewport;
  if (!vv) return;

  const keyboardHeight = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  document.documentElement.style.setProperty("--composerOffset", `${keyboardHeight}px`);

  requestAnimationFrame(() => {
    UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight;
  });
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
    setTimeout(updateViewportForKeyboard, 80);
  });

  UI.chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendCurrentMessage();
    }
  });

  UI.sendBtn.addEventListener("click", sendCurrentMessage);

  UI.micBtn.addEventListener("click", () => {
    UI.listenModal.classList.add("open");
    UI.micBtn.classList.add("listening");
  });

  UI.closeListenModal.addEventListener("click", () => {
    UI.listenModal.classList.remove("open");
    UI.micBtn.classList.remove("listening");
  });

  UI.toggleVoiceBtn.addEventListener("click", () => {
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

  UI.clearChatBtn.addEventListener("click", clearChat);

  UI.saveChatBtn.addEventListener("click", () => {
    UI.saveModal.classList.add("open");
  });

  UI.cancelSaveChat.addEventListener("click", () => {
    UI.saveModal.classList.remove("open");
  });

  UI.confirmSaveChat.addEventListener("click", saveChat);

  UI.savedChatsBtn.addEventListener("click", () => {
    location.href = "/pages/saved_chats.html";
  });

  window.visualViewport?.addEventListener("resize", updateViewportForKeyboard);
  window.visualViewport?.addEventListener("scroll", updateViewportForKeyboard);
}

async function init() {
  hydrateSecondVoiceName();
  setSelectedVoice(getSelectedVoice());
  bindEvents();
  autoResizeTextarea();
  syncInputActionState();
  await getAuthContext();
  updateViewportForKeyboard();
}

init();
