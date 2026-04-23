import { supabase } from "/js/supabase_client.js";
import { ensureModuleAdAccess } from "/js/ad_gate.js";

const $ = (id) => document.getElementById(id);

const UI = {
  chatMessages: $("chatMessages"),
  chatInput: $("chatInput"),
  sendBtn: $("sendBtn"),
  micBtn: $("micBtn"),
  typingState: $("typingState"),
  chatComposer: $("chatComposer"),

  menu: $("menu"),
  menuBtn: $("menuBtn"),
  menuBackdrop: $("menuBackdrop"),
  brandHome: $("brandHome"),
  topSettingsBtn: $("topSettingsBtn"),

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

const MODULE_KEY = "meeting_room_access";
const STORAGE_LANG_KEY = "meeting_my_lang";

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
  myLang: localStorage.getItem(STORAGE_LANG_KEY) || "tr",
  participants: []
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

function openMenu() {
  UI.menu?.classList.add("open");
}

function closeMenu() {
  UI.menu?.classList.remove("open");
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

function addSystemMessage(text) {
  if (!UI.chatMessages) return;
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
  if (!UI.chatMessages) return;

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

async function getCurrentUserAndProfile() {
  const { data } = await supabase.auth.getUser();
  const user = data?.user || null;

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, email")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: profile || null };
}

function renderParticipants() {
  if (!UI.avatarStrip || !UI.meetingBadge) return;

  UI.avatarStrip.innerHTML = "";
  UI.meetingBadge.textContent = `${state.participants.length} Kişi`;

  state.participants.forEach((p) => {
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

async function hydrateUser() {
  try {
    const { user, profile } = await getCurrentUserAndProfile();
    state.currentUser = user;
    state.currentProfile = profile;

    if (!user) {
      if (UI.myUserId) UI.myUserId.textContent = "Giriş gerekli";
      return;
    }

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

    if (UI.myUserId) UI.myUserId.textContent = myId;
    if (UI.meetingTitle) UI.meetingTitle.textContent = `Meeting • ${state.meetingId}`;
    if (UI.meetingSub) UI.meetingSub.textContent = `Herkes mesajları kendi dilinde görür. Senin dilin: ${LANG_LABELS[state.myLang] || state.myLang}`;
    if (UI.myLangSelect) UI.myLangSelect.value = state.myLang;

    state.participants = [
      {
        id: myId,
        name: myName,
        avatar: myAvatar,
        active: true,
        speaking: false,
        lang: state.myLang
      }
    ];

    renderParticipants();

    if (!UI.chatMessages?.querySelector(".msg")) {
      addSystemMessage("Meeting odası hazır. Menüden kendi dilini seçebilir ve kullanıcı ID ile katılımcı ekleyebilirsin.");
    }
  } catch (e) {
    console.error("meeting hydrate hata:", e);
    if (UI.myUserId) UI.myUserId.textContent = "Yüklenemedi";
  }
}

function collectExistingIds() {
  return new Set((state.participants || []).map((p) => String(p.id || "").trim()));
}

async function addParticipantById(rawId) {
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

  state.participants.push({
    id,
    name: `Kullanıcı ${String(state.participants.length + 1).padStart(2, "0")}`,
    avatar: "",
    active: true,
    speaking: false,
    lang: "en"
  });

  renderParticipants();
  if (UI.joinUserIdInput) UI.joinUserIdInput.value = "";
  addSystemMessage(`${id} meeting listesine eklendi.`);
  showToast("Katılımcı eklendi");
  closeMenu();
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

    if (transcript && UI.chatInput) {
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
    const finalText = cleanupTranscript(UI.chatInput?.value || lastTranscript || "");
    stopRecognition();

    if (finalText) {
      if (UI.chatInput) UI.chatInput.value = "";
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

  const myId = UI.myUserId?.textContent || "me";
  const me = state.participants.find((p) => p.id === myId);
  const myName = me?.name || "Sen";

  addTranslatedMessage({
    senderId: myId,
    senderName: myName,
    translatedText: value,
    isMine: true
  });

  UI.typingState?.classList.add("show");

  setTimeout(() => {
    UI.typingState?.classList.remove("show");
    const responder = state.participants.find((p) => p.id !== myId);
    if (!responder) return;

    const originalReply = responder.lang === "en"
      ? "Message received. I am replying from the meeting flow."
      : responder.lang === "es"
      ? "Mensaje recibido. Estoy respondiendo desde el flujo de reunión."
      : responder.lang === "de"
      ? "Nachricht erhalten. Ich antworte aus dem Meeting-Ablauf."
      : "Mesaj alındı. Meeting akışı üzerinden cevap veriyorum.";

    addTranslatedMessage({
      senderId: responder.id,
      senderName: responder.name,
      translatedText: fakeTranslateForViewer(originalReply, responder.lang, state.myLang),
      isMine: false
    });
  }, 800);
}

async function ensureMeetingAdAccess() {
  const ok = await ensureModuleAdAccess({
    moduleKey: MODULE_KEY,
    title: "Meeting için kısa bir reklam gösterilecek",
    text: "Bu modülü kullanabilmeniz için 1 kısa reklam gösterilecektir.\nReklamı tamamladıktan sonra bu modüle 24 saat boyunca tekrar reklam görmeden giriş yapabilirsiniz.",
    placement: "meeting_access",
    hours: 24
  });

  if (!ok) {
    location.href = "/pages/home.html";
  }

  return ok;
}

function bindEvents() {
  UI.menuBtn?.addEventListener("click", openMenu);
  UI.menuBackdrop?.addEventListener("click", closeMenu);

  UI.brandHome?.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  UI.topSettingsBtn?.addEventListener("click", () => {
    showToast("Meeting ayarları daha sonra açılacak");
  });

  UI.copyMyIdBtn?.addEventListener("click", async () => {
    const id = UI.myUserId?.textContent || "";
    try {
      await navigator.clipboard.writeText(id);
      showToast("Kullanıcı ID kopyalandı");
    } catch {
      showToast("ID kopyalanamadı");
    }
  });

  UI.myLangSelect?.addEventListener("change", () => {
    state.myLang = UI.myLangSelect.value || "tr";
    localStorage.setItem(STORAGE_LANG_KEY, state.myLang);

    const me = state.participants.find((p) => p.id === UI.myUserId?.textContent);
    if (me) me.lang = state.myLang;

    if (UI.meetingSub) {
      UI.meetingSub.textContent = `Herkes mesajları kendi dilinde görür. Senin dilin: ${LANG_LABELS[state.myLang] || state.myLang}`;
    }

    renderParticipants();
    showToast(`Dil seçildi: ${LANG_LABELS[state.myLang] || state.myLang}`);
    closeMenu();
  });

  UI.joinUserBtn?.addEventListener("click", () => {
    addParticipantById(UI.joinUserIdInput?.value || "");
  });

  UI.joinUserIdInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addParticipantById(UI.joinUserIdInput?.value || "");
    }
  });

  UI.chatInput?.addEventListener("input", () => {
    autoResizeTextarea();
    syncInputActionState();
  });

  UI.chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const value = UI.chatInput.value;
      UI.chatInput.value = "";
      autoResizeTextarea();
      syncInputActionState();
      sendMeetingMessage(value, "text");
    }
  });

  UI.sendBtn?.addEventListener("click", () => {
    const value = UI.chatInput?.value || "";
    if (UI.chatInput) UI.chatInput.value = "";
    autoResizeTextarea();
    syncInputActionState();
    sendMeetingMessage(value, "text");
  });

  UI.micBtn?.addEventListener("click", startRecognitionOnce);

  window.visualViewport?.addEventListener("resize", updateViewportLayout);
  window.visualViewport?.addEventListener("scroll", updateViewportLayout);
  window.addEventListener("resize", updateViewportLayout);
}

async function init() {
  const accessOk = await ensureMeetingAdAccess();
  if (!accessOk) return;

  bindEvents();
  autoResizeTextarea();
  syncInputActionState();
  await hydrateUser();
  updateViewportLayout();
  scrollChatToBottom();
}

init();
