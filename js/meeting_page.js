import { supabase } from "/js/supabase_client.js";
import { ensureModuleAdAccess } from "/js/ad_gate.js";
import { getLangPoolForSite } from "/js/lang_pool_full.js";

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
  menuClose: $("menuClose"),
  brandHome: $("brandHome"),
  topSettingsBtn: $("topSettingsBtn"),

  avatarStrip: $("avatarStrip"),
  meetingBadge: $("meetingBadge"),
  meetingTitle: $("meetingTitle"),
  meetingSub: $("meetingSub"),

  profileAvatar: $("profileAvatar"),
  profileName: $("profileName"),
  profileMemberNo: $("profileMemberNo"),

  myUserId: $("myUserId"),
  copyMyIdBtn: $("copyMyIdBtn"),

  myLangPicker: $("myLangPicker"),
  myLangPickerText: $("myLangPickerText"),

  joinUserIdInput: $("joinUserIdInput"),
  joinUserBtn: $("joinUserBtn"),

  langModal: $("langModal"),
  langModalClose: $("langModalClose"),
  langSearch: $("langSearch"),
  langList: $("langList"),

  toast: $("toast")
};

const MODULE_KEY = "meeting_room_access";
const STORAGE_LANG_KEY = "meeting_my_lang";

const COLOR_POOL = ["c1", "c2", "c3", "c4", "c5", "c6"];

const state = {
  currentUser: null,
  currentProfile: null,
  recognition: null,
  isListening: false,
  meetingId: new URLSearchParams(location.search).get("meeting_id") || "MEET-001",
  myLang: localStorage.getItem(STORAGE_LANG_KEY) || "tr",
  participants: [],
  langPool: []
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

function openLangModal() {
  UI.langModal?.classList.add("open");
  renderLangList(UI.langSearch?.value || "");
}

function closeLangModal() {
  UI.langModal?.classList.remove("open");
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

function normalizeMemberNo(profile, user) {
  return (
    profile?.member_no ||
    profile?.membership_no ||
    profile?.user_no ||
    profile?.public_user_id ||
    profile?.short_id ||
    profile?.id ||
    user?.id ||
    "Bilinmiyor"
  );
}

function getLanguageName(code) {
  const c = String(code || "").trim().toLowerCase();
  const found = state.langPool.find((x) => x.code === c);
  return found?.name || c.toUpperCase();
}

function getLanguageFlag(code) {
  const c = String(code || "").trim().toLowerCase();
  const found = state.langPool.find((x) => x.code === c);
  return found?.flag || "🌐";
}

function renderLangPickerText() {
  if (!UI.myLangPickerText) return;
  UI.myLangPickerText.textContent = `${getLanguageFlag(state.myLang)} ${getLanguageName(state.myLang)}`;
}

function renderLangList(query = "") {
  if (!UI.langList) return;
  const q = String(query || "").trim().toLowerCase();

  const filtered = !q
    ? state.langPool
    : state.langPool.filter((lang) => {
        const hay = `${lang.name} ${lang.code}`.toLowerCase();
        return hay.includes(q);
      });

  UI.langList.innerHTML = filtered.map((lang) => `
    <button class="lang-item ${lang.code === state.myLang ? "active" : ""}" type="button" data-code="${escapeHtml(lang.code)}">
      <div class="lang-left">
        <div class="lang-flag">${lang.flag || "🌐"}</div>
        <div>
          <div class="lang-name">${escapeHtml(lang.name)}</div>
          <div class="lang-code">${escapeHtml(lang.code)}</div>
        </div>
      </div>
      <div>${lang.code === state.myLang ? "✓" : ""}</div>
    </button>
  `).join("");

  UI.langList.querySelectorAll(".lang-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      const code = String(btn.dataset.code || "").trim().toLowerCase();
      if (!code) return;

      state.myLang = code;
      localStorage.setItem(STORAGE_LANG_KEY, state.myLang);

      renderLangPickerText();

      if (UI.meetingSub) {
        UI.meetingSub.textContent = `Herkes mesajları kendi dilinde görür. Senin dilin: ${getLanguageName(state.myLang)}`;
      }

      closeLangModal();
      showToast(`Dil seçildi: ${getLanguageName(state.myLang)}`);
    });
  });
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
  return `[${getLanguageName(viewerLang)}] ${originalText}`;
}

async function getCurrentUserAndProfile() {
  const { data } = await supabase.auth.getUser();
  const user = data?.user || null;

  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { user, profile: profile || null };
}

function renderProfile(profile, user) {
  const name =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Kullanıcı";

  const avatar =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    "";

  const memberNo = normalizeMemberNo(profile, user);

  if (UI.profileName) UI.profileName.textContent = name;
  if (UI.profileMemberNo) UI.profileMemberNo.textContent = `Üyelik No: ${memberNo}`;
  if (UI.myUserId) UI.myUserId.textContent = memberNo;

  if (UI.profileAvatar) {
    if (avatar) {
      UI.profileAvatar.innerHTML = `<img src="${avatar}" alt="${escapeHtml(name)}">`;
    } else {
      UI.profileAvatar.textContent = initialsFromName(name);
    }
  }
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

    renderProfile(profile, user);

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

    const myMemberNo = normalizeMemberNo(profile, user);

    if (UI.meetingTitle) UI.meetingTitle.textContent = `Meeting • ${state.meetingId}`;
    if (UI.meetingSub) UI.meetingSub.textContent = `Herkes mesajları kendi dilinde görür. Senin dilin: ${getLanguageName(state.myLang)}`;

    state.participants = [
      {
        id: myMemberNo,
        name: myName,
        avatar: myAvatar,
        active: true,
        speaking: false,
        lang: state.myLang
      }
    ];

    renderParticipants();

    if (!UI.chatMessages?.querySelector(".msg")) {
      addSystemMessage("Meeting odası hazır. Menüden kendi dilini seçebilir ve üyelik numarası ile katılımcı ekleyebilirsin.");
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
  const memberNo = String(rawId || "").trim();
  if (!memberNo) {
    showToast("Önce üyelik numarası gir.");
    return;
  }

  const ids = collectExistingIds();
  if (ids.has(memberNo)) {
    showToast("Bu kullanıcı zaten listede.");
    return;
  }

  state.participants.push({
    id: memberNo,
    name: `Üye ${String(state.participants.length + 1).padStart(2, "0")}`,
    avatar: "",
    active: true,
    speaking: false,
    lang: "en"
  });

  renderParticipants();
  if (UI.joinUserIdInput) UI.joinUserIdInput.value = "";
  addSystemMessage(`${memberNo} meeting listesine eklendi.`);
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

function buildLangPool() {
  try {
    const raw = getLangPoolForSite("tr") || [];
    const seen = new Set();

    state.langPool = raw
      .map((item) => ({
        code: String(item.code || "").trim().toLowerCase(),
        name: String(item.name || item.tr_name || item.code || "").trim(),
        flag: item.flag || "🌐"
      }))
      .filter((item) => item.code && !seen.has(item.code) && seen.add(item.code))
      .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  } catch (e) {
    console.error("lang pool hata:", e);
    state.langPool = [
      { code: "tr", name: "Türkçe", flag: "🇹🇷" },
      { code: "en", name: "English", flag: "🇬🇧" }
    ];
  }

  renderLangPickerText();
}

function bindEvents() {
  UI.menuBtn?.addEventListener("click", openMenu);
  UI.menuBackdrop?.addEventListener("click", closeMenu);
  UI.menuClose?.addEventListener("click", closeMenu);

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
      showToast("Üyelik numarası kopyalandı");
    } catch {
      showToast("Numara kopyalanamadı");
    }
  });

  UI.myLangPicker?.addEventListener("click", openLangModal);
  UI.langModalClose?.addEventListener("click", closeLangModal);
  UI.langModal?.addEventListener("click", (e) => {
    if (e.target === UI.langModal) closeLangModal();
  });

  UI.langSearch?.addEventListener("input", () => {
    renderLangList(UI.langSearch.value || "");
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
  buildLangPool();

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
