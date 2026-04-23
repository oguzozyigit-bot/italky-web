import { supabase } from "/js/supabase_client.js";

const $ = (id) => document.getElementById(id);

const UI = {
  chatMessages: $("chatMessages"),
  chatInput: $("chatInput"),
  sendBtn: $("sendBtn"),
  micBtn: $("micBtn"),
  typingState: $("typingState"),
  chatComposer: $("chatComposer"),

  menuBtn: $("menuBtn"),
  brandHome: $("brandHome"),
  topSettingsBtn: $("topSettingsBtn"),

  participantsLayer: $("participantsLayer"),
  participantsBackdrop: $("participantsBackdrop"),
  participantsTab: $("participantsTab"),
  participantsClose: $("participantsClose"),
  participantsCountMini: $("participantsCountMini"),
  participantsList: $("participantsList"),
  participantsSub: $("participantsSub"),
  avatarStrip: $("avatarStrip"),
  meetingBadge: $("meetingBadge"),
  meetingTitle: $("meetingTitle"),
  meetingSub: $("meetingSub"),

  myUserId: $("myUserId"),
  myLangSelect: $("myLangSelect"),
  copyMyIdBtn: $("copyMyIdBtn"),
  joinUserIdInput: $("joinUserIdInput"),
  joinUserBtn: $("joinUserBtn"),

  toast: $("toast")
};

const LANG_LABELS = {
  tr: "Türkçe",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  ar: "العربية",
  ru: "Русский"
};

const COLOR_POOL = ["c1", "c2", "c3", "c4", "c5", "c6"];

const state = {
  currentUser: null,
  currentProfile: null,
  recognition: null,
  isListening: false,
  meetingId: new URLSearchParams(location.search).get("meeting_id") || "MEET-001",
  myLang: localStorage.getItem("meeting_my_lang") || "tr",
  participants: [],
  messages: []
};

function showToast(message = "") {
  if (!UI.toast) return;
  UI.toast.textContent = String(message || "");
  UI.toast.classList.add("show");
  clearTimeout(window.__meetingToastTimer);
  window.__meetingToastTimer = setTimeout(() => {
    UI.toast.classList.remove("show");
  }, 2200);
}

function autoResizeTextarea() {
  if (!UI.chatInput) return;
  UI.chatInput.style.height = "auto";
  UI.chatInput.style.height = `${Math.min(UI.chatInput.scrollHeight, 140)}px`;
}

function syncInputActionState() {
  if (!UI.chatInput || !UI.micBtn || !UI.sendBtn) return;
  const hasText = String(UI.chatInput.value || "").trim().length > 0;
  UI.micBtn.classList.toggle("hidden", hasText && !state.isListening);
  UI.sendBtn.classList.toggle("hidden", !hasText);
}

function setListeningUi(isListening) {
  state.isListening = !!isListening;
  UI.chatComposer?.classList.toggle("listening", !!isListening);
  UI.micBtn?.classList.toggle("listening", !!isListening);
  syncInputActionState();
}

function scrollChatToBottom() {
  if (!UI.chatMessages) return;
  requestAnimationFrame(() => {
    UI.chatMessages.scrollTop = UI.chatMessages.scrollHeight + 500;
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

function initialsFromName(name = "") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] || "U") + (parts[1]?.[0] || "");
}

function openParticipantsPanel() {
  UI.participantsLayer?.classList.add("open");
}

function closeParticipantsPanel() {
  UI.participantsLayer?.classList.remove("open");
}

function toggleParticipantsPanel() {
  UI.participantsLayer?.classList.toggle("open");
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function participantColorClass(id = "") {
  const sum = String(id).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return COLOR_POOL[sum % COLOR_POOL.length];
}

function renderParticipants() {
  const list = state.participants || [];
  UI.participantsList.innerHTML = "";
  UI.avatarStrip.innerHTML = "";

  UI.participantsCountMini.textContent = String(list.length);
  UI.meetingBadge.textContent = `${list.length} Kişi`;
  UI.participantsSub.textContent = `${list.length} katılımcı bu meeting odasında görünür.`;

  list.forEach((p) => {
    const row = document.createElement("div");
    row.className = `participant-row ${p.speaking ? "speaking" : ""}`;
    row.innerHTML = `
      <div class="participant-avatar">
        ${p.avatar ? `<img src="${p.avatar}" alt="${escapeHtml(p.name)}">` : `<span>${initialsFromName(p.name)}</span>`}
      </div>
      <div class="participant-meta">
        <div class="participant-name">${escapeHtml(p.name)}</div>
        <div class="participant-id">ID: ${escapeHtml(p.id)}</div>
        <div class="participant-role">${escapeHtml(p.role || "Katılımcı")}</div>
        <div class="participant-lang">Dil: ${escapeHtml(LANG_LABELS[p.lang] || p.lang || "—")}</div>
      </div>
    `;
    UI.participantsList.appendChild(row);

    const mini = document.createElement("div");
    mini.className = "mini-user";
    mini.innerHTML = `
      <div class="mini-avatar ${p.active ? "active" : ""} ${p.speaking ? "speaking" : ""}">
        ${p.avatar ? `<img src="${p.avatar}" alt="${escapeHtml(p.name)}">` : `<span>${initialsFromName(p.name)}</span>`}
      </div>
      <div class="mini-name">${escapeHtml((p.name || "").split(" ")[0] || p.name)}</div>
    `;
    UI.avatarStrip.appendChild(mini);
  });
}

function addSystemMessage(text) {
  const row = document.createElement("div");
  row.className = "msg center";
  row.innerHTML = `
    <div class="bubble-wrap">
      <div class="bubble system">${escapeHtml(text)}</div>
    </div>
  `;
  UI.chatMessages.appendChild(row);
  scrollChatToBottom();
}

function addTranslatedMessage({ senderId, senderName, translatedText, timeLabel = "şimdi", isMine = false }) {
  const side = isMine ? "right" : "left";
  const colorClass = participantColorClass(senderId);

  const row = document.createElement("div");
  row.className = `msg ${side}`;

  if (isMine) {
    row.innerHTML = `
      <div class="bubble-wrap">
        <div class="bubble right">${escapeHtml(translatedText)}</div>
        <div class="msg-name">${escapeHtml(senderName)}</div>
        <div class="msg-meta">${escapeHtml(timeLabel)}</div>
      </div>
    `;
  } else {
    row.innerHTML = `
      <div class="bubble-wrap user-${colorClass}">
        <div class="bubble left">${escapeHtml(translatedText)}</div>
        <div class="msg-name">${escapeHtml(senderName)}</div>
        <div class="msg-meta">${escapeHtml(timeLabel)}</div>
      </div>
    `;
  }

  UI.chatMessages.appendChild(row);
  scrollChatToBottom();
}

function fakeTranslateForViewer(originalText, originalLang, viewerLang) {
  if (viewerLang === originalLang) return originalText;
  return `[${LANG_LABELS[viewerLang] || viewerLang}] ${originalText}`;
}

async function hydrateUser() {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data?.user || null;
    state.currentUser = user;

    if (!user) {
      UI.myUserId.textContent = "Giriş gerekli";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id,full_name,avatar_url,email")
      .eq("id", user.id)
      .maybeSingle();

    state.currentProfile = profile || null;

    const myName =
      profile?.full_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      "Katılımcı";

    const myAvatar =
      profile?.avatar_url ||
      user?.user_metadata?.avatar_url ||
      user?.user_metadata?.picture ||
      "";

    const myId = profile?.id || user?.id || "Bilinmiyor";
    UI.myUserId.textContent = myId;
    UI.meetingTitle.textContent = `Meeting • ${state.meetingId}`;
    UI.myLangSelect.value = state.myLang;

    state.participants = [
      {
        id: myId,
        name: myName,
        avatar: myAvatar,
        role: "Sen",
        active: true,
        speaking: false,
        lang: state.myLang
      },
      {
        id: "MEET-102",
        name: "Ayşe Demir",
        avatar: "",
        role: "Katılımcı",
        active: true,
        speaking: true,
        lang: "tr"
      },
      {
        id: "MEET-103",
        name: "John Carter",
        avatar: "",
        role: "Katılımcı",
        active: true,
        speaking: false,
        lang: "en"
      },
      {
        id: "MEET-104",
        name: "Maria Lopez",
        avatar: "",
        role: "Katılımcı",
        active: true,
        speaking: false,
        lang: "es"
      }
    ];

    renderParticipants();

    if (!UI.chatMessages.querySelector(".msg")) {
      addSystemMessage("Meeting odası hazır. Sağ panelden kendi dilini seçebilir ve kullanıcı ID ile katılımcı ekleyebilirsin.");
      addTranslatedMessage({
        senderId: "MEET-102",
        senderName: "Ayşe Demir",
        translatedText: fakeTranslateForViewer("Toplantı başladı, herkese merhaba.", "tr", state.myLang),
        isMine: false
      });
    }
  } catch (e) {
    console.error("meeting hydrate hata:", e);
    UI.myUserId.textContent = "Yüklenemedi";
  }
}

function collectExistingIds() {
  return new Set((state.participants || []).map((p) => String(p.id || "").trim()));
}

function addParticipantById(rawId) {
  const id = String(rawId || "").trim();
  if (!id) {
    showToast("Önce kullanıcı ID gir.");
    return;
  }

  const ids = collectExistingIds();
  if (ids.has(id)) {
    showToast("Bu kullanıcı zaten listede.");
    return;
  }

  const fakeName = `Kullanıcı ${String(state.participants.length + 1).padStart(2, "0")}`;
  state.participants.push({
    id,
    name: fakeName,
    avatar: "",
    role: "Yeni Katılan",
    active: true,
    speaking: false,
    lang: "en"
  });

  renderParticipants();
  addSystemMessage(`${fakeName} meeting odasına eklendi.`);
  UI.joinUserIdInput.value = "";
  showToast("Katılımcı eklendi");
}

function cleanupTranscript(text = "") {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\b(\S+)( \1\b)+/gi, "$1")
    .trim();
}

function buildStableTranscript(results) {
  const pieces = [];

  for (let i = 0; i < results.length; i++) {
    const chunk = String(results[i]?.[0]?.transcript || "")
      .replace(/\s+/g, " ")
      .trim();

    if (!chunk) continue;

    const prev = pieces[pieces.length - 1] || "";
    if (prev === chunk) continue;
    if (prev && chunk.startsWith(prev)) {
      pieces[pieces.length - 1] = chunk;
      continue;
    }
    if (prev && prev.startsWith(chunk)) continue;

    pieces.push(chunk);
  }

  return cleanupTranscript(pieces.join(" "));
}

function stopRecognition() {
  try { state.recognition?.stop(); } catch {}
  state.recognition = null;
  setListeningUi(false);
}

function startRecognitionOnce() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    showToast("Bu cihazda sesli giriş desteklenmiyor");
    return;
  }

  if (state.isListening) {
    stopRecognition();
    return;
  }

  stopRecognition();

  const recognition = new Recognition();
  recognition.lang = "tr-TR";
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.maxAlternatives = 1;

  state.recognition = recognition;
  let lastTranscript = "";
  setListeningUi(true);

  recognition.onresult = (event) => {
    const transcript = buildStableTranscript(event.results);
    lastTranscript = transcript;

    if (transcript) {
      UI.chatInput.value = transcript;
      autoResizeTextarea();
      syncInputActionState();
      scrollChatToBottom();
    }
  };

  recognition.onerror = () => {
    stopRecognition();
  };

  recognition.onend = () => {
    const finalText = cleanupTranscript(UI.chatInput.value || lastTranscript || "");
    stopRecognition();

    if (finalText) {
      UI.chatInput.value = "";
      autoResizeTextarea();
      syncInputActionState();
      sendMeetingMessage(finalText, "voice");
    }
  };

  try {
    recognition.start();
  } catch {
    stopRecognition();
  }
}

function sendMeetingMessage(text, mode = "text") {
  const value = String(text || "").trim();
  if (!value) return;

  const myId = UI.myUserId.textContent || "me";
  const myName = state.participants.find((p) => p.id === myId)?.name || "Sen";

  addTranslatedMessage({
    senderId: myId,
    senderName: myName,
    translatedText: value,
    isMine: true
  });

  UI.typingState.classList.add("show");

  setTimeout(() => {
    UI.typingState.classList.remove("show");
    const activeSpeaker = state.participants.find((p) => p.id !== myId) || state.participants[0];
    const replyName = activeSpeaker?.name || "Katılımcı";
    const replyLang = activeSpeaker?.lang || "en";
    const originalReply = replyLang === "en"
      ? "Message received. I am replying from the meeting flow."
      : replyLang === "es"
      ? "Mensaje recibido. Estoy respondiendo desde el flujo de reunión."
      : "Mesaj alındı. Meeting akışı üzerinden cevap veriyorum.";

    addTranslatedMessage({
      senderId: activeSpeaker.id,
      senderName: replyName,
      translatedText: fakeTranslateForViewer(originalReply, replyLang, state.myLang),
      isMine: false
    });
  }, 800);
}

function bindEvents() {
  UI.chatInput.addEventListener("input", () => {
    autoResizeTextarea();
    syncInputActionState();
  });

  UI.chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const value = UI.chatInput.value;
      UI.chatInput.value = "";
      autoResizeTextarea();
      syncInputActionState();
      sendMeetingMessage(value, "text");
    }
  });

  UI.sendBtn.addEventListener("click", () => {
    const value = UI.chatInput.value;
    UI.chatInput.value = "";
    autoResizeTextarea();
    syncInputActionState();
    sendMeetingMessage(value, "text");
  });

  UI.micBtn.addEventListener("click", startRecognitionOnce);

  UI.menuBtn.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  UI.brandHome.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  UI.topSettingsBtn.addEventListener("click", () => {
    showToast("Meeting ayarları daha sonra açılacak");
  });

  UI.participantsTab.addEventListener("click", toggleParticipantsPanel);
  UI.participantsClose.addEventListener("click", closeParticipantsPanel);
  UI.participantsBackdrop.addEventListener("click", closeParticipantsPanel);

  UI.copyMyIdBtn.addEventListener("click", async () => {
    const id = UI.myUserId.textContent || "";
    try {
      await navigator.clipboard.writeText(id);
      showToast("Kullanıcı ID kopyalandı");
    } catch {
      showToast("ID kopyalanamadı");
    }
  });

  UI.joinUserBtn.addEventListener("click", () => {
    addParticipantById(UI.joinUserIdInput.value);
  });

  UI.joinUserIdInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addParticipantById(UI.joinUserIdInput.value);
    }
  });

  UI.myLangSelect.addEventListener("change", () => {
    state.myLang = UI.myLangSelect.value || "tr";
    localStorage.setItem("meeting_my_lang", state.myLang);

    const me = state.participants.find((p) => p.id === UI.myUserId.textContent);
    if (me) me.lang = state.myLang;

    renderParticipants();
    showToast(`Dil seçildi: ${LANG_LABELS[state.myLang] || state.myLang}`);
  });

  window.visualViewport?.addEventListener("resize", updateViewportLayout);
  window.visualViewport?.addEventListener("scroll", updateViewportLayout);
  window.addEventListener("resize", updateViewportLayout);
}

async function init() {
  bindEvents();
  autoResizeTextarea();
  syncInputActionState();
  await hydrateUser();
  updateViewportLayout();
  scrollChatToBottom();
}

init();
