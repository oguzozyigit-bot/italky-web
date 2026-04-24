import { supabase } from "/js/supabase_client.js";
import { getLangPoolForSite } from "/js/lang_pool_full.js";
import { STORAGE_KEY } from "/js/config.js";

const API_ROOT =
  window.ITALKY_API_BASE ||
  localStorage.getItem("italky_api_base") ||
  "https://italky-api.onrender.com/api";

const MEETING_API = `${API_ROOT}/meeting`;

const STORAGE = {
  lang: "italky_meeting_lang_v7",
  roomId: "italky_meeting_room_id_v7",
  roomCode: "italky_meeting_room_code_v7"
};

const COLOR_POOL = [
  "#84d6ff",
  "#8af09f",
  "#ffb86a",
  "#f78cff",
  "#73ebff",
  "#ffd76f",
  "#94b4ff",
  "#ff8e8e",
  "#78f0cd",
  "#b48cff"
];

const FALLBACK_LANGS = [
  { code: "tr", name: "Türkçe", flag: "🇹🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "ru", name: "Русский", flag: "🇷🇺" }
];

const $ = (id) => document.getElementById(id);

const el = {
  menuBtn: $("menuBtn"),
  participantCount: $("participantCount"),
  participantsStrip: $("participantsStrip"),
  chatScroll: $("chatScroll"),
  chatFeed: $("chatFeed"),
  messageInput: $("messageInput"),
  sendBtn: $("sendBtn"),
  micBtn: $("micBtn"),

  drawerLayer: $("drawerLayer"),
  drawerBackdrop: $("drawerBackdrop"),
  drawerCloseBtn: $("drawerCloseBtn"),
  drawerAvatar: $("drawerAvatar"),
  drawerName: $("drawerName"),
  drawerMemberSub: $("drawerMemberSub"),
  myMembershipNo: $("myMembershipNo"),
  copyMemberBtn: $("copyMemberBtn"),
  joinInput: $("joinInput"),
  joinBtn: $("joinBtn"),

  langTrigger: $("langTrigger"),
  selectedLangFlag: $("selectedLangFlag"),
  selectedLangName: $("selectedLangName"),
  langLayer: $("langLayer"),
  langBackdrop: $("langBackdrop"),
  langCloseBtn: $("langCloseBtn"),
  langList: $("langList"),

  toast: $("toast")
};

const state = {
  user: null,
  profile: null,
  membershipNo: "",
  displayName: "",
  avatarUrl: "",
  roomId: localStorage.getItem(STORAGE.roomId) || "",
  roomCode: localStorage.getItem(STORAGE.roomCode) || "",
  selectedLang: localStorage.getItem(STORAGE.lang) || "tr",
  participants: [],
  messages: [],
  langs: [...FALLBACK_LANGS],
  pollTimer: null,
  speechRec: null
};

function showToast(message = "") {
  if (!el.toast) return;
  el.toast.textContent = String(message);
  el.toast.classList.add("show");
  clearTimeout(window.__meetingToastTimer);
  window.__meetingToastTimer = setTimeout(() => {
    el.toast.classList.remove("show");
  }, 2200);
}

function safeText(v, fallback = "") {
  return String(v ?? fallback ?? "").trim();
}

function escapeHtml(v = "") {
  return String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatInitials(name = "") {
  const parts = safeText(name).split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function hashCode(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

function getColorForKey(key = "") {
  return COLOR_POOL[hashCode(String(key)) % COLOR_POOL.length];
}

function getAuthHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session || null;
}

async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data?.user || null;
}

async function getProfileByUserId(userId) {
  if (!userId) return null;

  try {
    let res = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (res?.data) return res.data;

    res = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    return res?.data || null;
  } catch (e) {
    console.warn("[meeting] profile alınamadı:", e);
    return null;
  }
}

function getCachedUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function pickMembershipNo(user, profile) {
  const meta = user?.user_metadata || {};
  const cached = getCachedUser();

  return (
    safeText(profile?.membership_no) ||
    safeText(profile?.member_no) ||
    safeText(profile?.membership_number) ||
    safeText(profile?.uyelik_no) ||
    safeText(meta?.membership_no) ||
    safeText(meta?.member_no) ||
    safeText(meta?.membership_number) ||
    safeText(meta?.uyelik_no) ||
    safeText(cached?.membership_no) ||
    safeText(cached?.uyelik_no) ||
    safeText(profile?.id).replaceAll("-", "").slice(0, 8).toUpperCase() ||
    safeText(user?.id).replaceAll("-", "").slice(0, 8).toUpperCase()
  );
}

function pickDisplayName(user, profile) {
  const meta = user?.user_metadata || {};
  return (
    safeText(profile?.hitap) ||
    safeText(profile?.display_name) ||
    safeText(profile?.full_name) ||
    safeText(profile?.name) ||
    safeText(meta?.hitap) ||
    safeText(meta?.full_name) ||
    safeText(meta?.name) ||
    safeText(meta?.display_name) ||
    safeText(user?.email).split("@")[0] ||
    "Kullanıcı"
  );
}

function pickAvatar(user, profile) {
  const meta = user?.user_metadata || {};
  return (
    safeText(profile?.avatar_url) ||
    safeText(profile?.picture) ||
    safeText(profile?.avatar) ||
    safeText(meta?.avatar_url) ||
    safeText(meta?.picture) ||
    safeText(meta?.avatar) ||
    ""
  );
}

async function loadLangPool() {
  try {
    const raw = getLangPoolForSite("tr");
    if (Array.isArray(raw) && raw.length) {
      state.langs = raw
        .map((x) => ({
          code: safeText(x.code).toLowerCase(),
          name: safeText(x.name || x.tr_name || x.code),
          flag: safeText(x.flag || "🌐")
        }))
        .filter((x) => x.code && x.name);
      return;
    }
  } catch (_) {}

  state.langs = [...FALLBACK_LANGS];
}

function getLangInfo(code) {
  return (
    state.langs.find((x) => x.code === code) ||
    FALLBACK_LANGS.find((x) => x.code === code) ||
    { code, name: code?.toUpperCase?.() || "Dil", flag: "🌐" }
  );
}

function renderSelectedLanguage() {
  const info = getLangInfo(state.selectedLang);
  el.selectedLangFlag.textContent = info.flag || "🌐";
  el.selectedLangName.textContent = info.name || "Dil";
}

function renderLangOptions() {
  const html = state.langs
    .map((lang) => {
      const active = lang.code === state.selectedLang ? "active" : "";
      return `
        <button class="lang-option ${active}" type="button" data-code="${escapeHtml(lang.code)}">
          <div class="lang-option-left">
            <div style="font-size:20px">${escapeHtml(lang.flag || "🌐")}</div>
            <div class="lang-option-name">${escapeHtml(lang.name)}</div>
          </div>
          <div class="lang-check"></div>
        </button>
      `;
    })
    .join("");

  el.langList.innerHTML = html;

  Array.from(el.langList.querySelectorAll(".lang-option")).forEach((btn) => {
    btn.addEventListener("click", async () => {
      const code = btn.dataset.code || "tr";
      state.selectedLang = code;
      localStorage.setItem(STORAGE.lang, code);
      renderSelectedLanguage();
      renderLangOptions();
      closeLangModal();
      await updateMyLanguage();
      await refreshRoomState(true);
      showToast("Dil güncellendi");
    });
  });
}

function openDrawer() {
  el.drawerLayer.classList.add("open");
}

function closeDrawer() {
  el.drawerLayer.classList.remove("open");
}

function openLangModal() {
  el.langLayer.classList.add("open");
}

function closeLangModal() {
  el.langLayer.classList.remove("open");
}

function renderProfile() {
  const name = state.displayName || "Kullanıcı";
  const memberNo = state.membershipNo || "—";

  el.drawerName.textContent = name;
  el.drawerMemberSub.textContent = `Üyelik No: ${memberNo}`;
  el.myMembershipNo.textContent = memberNo;

  if (state.avatarUrl) {
    el.drawerAvatar.innerHTML = `<img src="${escapeHtml(state.avatarUrl)}" alt="Avatar">`;
  } else {
    el.drawerAvatar.textContent = formatInitials(name);
  }
}

function normalizeParticipant(item = {}) {
  const id =
    safeText(item.user_id) ||
    safeText(item.id) ||
    safeText(item.participant_id) ||
    safeText(item.membership_no) ||
    Math.random().toString(36).slice(2);

  const name =
    safeText(item.display_name) ||
    safeText(item.name) ||
    safeText(item.full_name) ||
    safeText(item.hitap) ||
    "Kullanıcı";

  const avatar =
    safeText(item.avatar_url) ||
    safeText(item.avatar) ||
    safeText(item.picture);

  return { id, name, avatar };
}

function renderParticipants() {
  const participants = Array.isArray(state.participants) ? state.participants : [];
  el.participantCount.textContent = String(participants.length || 1);

  const ordered = [...participants].sort((a, b) => {
    const aMine = a.id === state.user?.id ? 1 : 0;
    const bMine = b.id === state.user?.id ? 1 : 0;
    return aMine - bMine;
  });

  el.participantsStrip.innerHTML = ordered
    .map((p) => {
      const avatarHtml = p.avatar
        ? `<img src="${escapeHtml(p.avatar)}" alt="${escapeHtml(p.name)}">`
        : escapeHtml(formatInitials(p.name));
      return `
        <div class="participant-chip">
          <div class="participant-avatar">${avatarHtml}</div>
          <div class="participant-name">${escapeHtml(p.name)}</div>
        </div>
      `;
    })
    .join("");

  requestAnimationFrame(() => {
    el.participantsStrip.scrollLeft = el.participantsStrip.scrollWidth;
  });
}

function normalizeMessage(msg = {}) {
  const senderId = safeText(msg.sender_id) || safeText(msg.user_id);
  const senderName =
    safeText(msg.sender_name) ||
    safeText(msg.display_name) ||
    safeText(msg.author_name) ||
    safeText(msg.sender) ||
    "";

  return {
    id: safeText(msg.id) || Math.random().toString(36).slice(2),
    senderId,
    senderName,
    text:
      safeText(msg.translated_text) ||
      safeText(msg.text_local) ||
      safeText(msg.text) ||
      safeText(msg.message),
    originalText: safeText(msg.original_text),
    system: Boolean(msg.system || msg.type === "system" || msg.message_type === "system")
  };
}

function renderMessages() {
  const messages = Array.isArray(state.messages) ? state.messages : [];

  const html = messages
    .map((raw) => {
      const msg = normalizeMessage(raw);
      const mine = msg.senderId && state.user?.id && msg.senderId === state.user.id;

      if (msg.system) {
        return `
          <div class="msg system">
            <div class="system-badge">${escapeHtml(msg.text)}</div>
          </div>
        `;
      }

      const cls = mine ? "mine" : "other";
      const author = mine ? state.displayName : (msg.senderName || "Katılımcı");
      const colorKey = msg.senderId || msg.senderName || msg.id;
      const color = getColorForKey(colorKey);
      const speechText = msg.text || msg.originalText || "";

      return `
        <div class="msg ${cls}">
          <div class="msg-block">
            <div class="msg-row">
              <div class="bubble" style="--line-color:${color}">
                <div class="bubble-text">${escapeHtml(msg.text)}</div>
                <button
                  class="speaker-btn"
                  type="button"
                  data-speech="${escapeHtml(speechText)}"
                  aria-label="Oku"
                >
                  <svg viewBox="0 0 24 24">
                    <polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
                    <path d="M18.5 6a8.5 8.5 0 0 1 0 12"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div class="msg-author">${escapeHtml(author)}</div>
          </div>
        </div>
      `;
    })
    .join("");

  el.chatFeed.innerHTML = html;

  Array.from(el.chatFeed.querySelectorAll(".speaker-btn")).forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.dataset.speech || "";
      speakText(text);
    });
  });

  scrollChatToBottom();
}

function scrollChatToBottom() {
  requestAnimationFrame(() => {
    el.chatScroll.scrollTop = el.chatScroll.scrollHeight + 9999;
  });
}

function autoResizeTextarea() {
  el.messageInput.style.height = "28px";
  el.messageInput.style.height = `${Math.min(el.messageInput.scrollHeight, 120)}px`;
}

function syncSendState() {
  const hasText = !!safeText(el.messageInput.value);
  el.sendBtn.classList.toggle("hidden", !hasText);
  el.micBtn.classList.toggle("hidden", hasText);
}

function syncKeyboardOffset() {
  const vv = window.visualViewport;
  if (!vv) return;
  const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  document.documentElement.style.setProperty("--keyboard-offset", `${keyboard}px`);
}

function bindInputEvents() {
  el.messageInput.addEventListener("input", () => {
    autoResizeTextarea();
    syncSendState();
  });

  el.messageInput.addEventListener("focus", () => {
    setTimeout(syncKeyboardOffset, 60);
    setTimeout(scrollChatToBottom, 100);
  });

  el.messageInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (safeText(el.messageInput.value)) {
        await sendMessage();
      }
    }
  });
}

function bindDrawerEvents() {
  el.menuBtn.addEventListener("click", openDrawer);
  el.drawerBackdrop.addEventListener("click", closeDrawer);
  el.drawerCloseBtn.addEventListener("click", closeDrawer);

  el.langTrigger.addEventListener("click", openLangModal);
  el.langBackdrop.addEventListener("click", closeLangModal);
  el.langCloseBtn.addEventListener("click", closeLangModal);

  el.copyMemberBtn.addEventListener("click", async () => {
    try {
      const text = state.membershipNo || "";
      if (!text) return;
      await navigator.clipboard.writeText(text);
      showToast("Üyelik numarası kopyalandı");
    } catch (_) {
      showToast("Kopyalama yapılamadı");
    }
  });

  el.joinBtn.addEventListener("click", joinByMembershipNumber);
}

function bindActionEvents() {
  el.sendBtn.addEventListener("click", sendMessage);
  el.micBtn.addEventListener("click", toggleSpeechInput);
}

async function api(path, options = {}) {
  const session = await getSession();
  const token = session?.access_token || "";

  const res = await fetch(`${MEETING_API}${path}`, {
    method: options.method || "GET",
    headers: getAuthHeaders(token),
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!res.ok) {
    let msg = `İstek başarısız (${res.status})`;
    try {
      const err = await res.json();
      msg = err?.detail || err?.message || msg;
    } catch (_) {}
    throw new Error(msg);
  }

  try {
    return await res.json();
  } catch (_) {
    return {};
  }
}

async function bootstrapMeeting() {
  try {
    const payload = {
      membership_no: state.membershipNo,
      display_name: state.displayName,
      avatar_url: state.avatarUrl,
      lang: state.selectedLang
    };

    const data = await api("/bootstrap", {
      method: "POST",
      body: payload
    });

    state.roomId = safeText(data.room_id) || state.roomId;
    state.roomCode = safeText(data.room_code) || state.roomCode;

    if (state.roomId) localStorage.setItem(STORAGE.roomId, state.roomId);
    if (state.roomCode) localStorage.setItem(STORAGE.roomCode, state.roomCode);

    state.participants = Array.isArray(data.participants)
      ? data.participants.map(normalizeParticipant)
      : [normalizeParticipant({
          user_id: state.user.id,
          display_name: state.displayName,
          avatar_url: state.avatarUrl
        })];

    state.messages = Array.isArray(data.messages)
      ? data.messages.map(normalizeMessage)
      : [];
  } catch (e) {
    console.warn("[meeting bootstrap]", e);
    state.participants = [normalizeParticipant({
      user_id: state.user.id,
      display_name: state.displayName,
      avatar_url: state.avatarUrl
    })];
    state.messages = [];
  }

  renderParticipants();
  renderMessages();
}

async function refreshRoomState(silent = false) {
  if (!state.roomId) {
    renderParticipants();
    renderMessages();
    return;
  }

  try {
    const data = await api(`/state?room_id=${encodeURIComponent(state.roomId)}`);

    if (Array.isArray(data.participants)) {
      state.participants = data.participants.map(normalizeParticipant);
    }

    if (Array.isArray(data.messages)) {
      state.messages = data.messages.map(normalizeMessage);
    }

    renderParticipants();
    renderMessages();
  } catch (e) {
    if (!silent) console.warn("[meeting state]", e);
  }
}

async function updateMyLanguage() {
  if (!state.roomId) return;

  try {
    await api("/language", {
      method: "POST",
      body: {
        room_id: state.roomId,
        lang: state.selectedLang
      }
    });
  } catch (e) {
    console.warn("[meeting language]", e);
  }
}

async function joinByMembershipNumber() {
  const target = safeText(el.joinInput.value).toUpperCase();
  if (!target) {
    showToast("Üyelik numarası gir");
    return;
  }

  try {
    await api("/join", {
      method: "POST",
      body: {
        room_id: state.roomId,
        target_membership_no: target,
        inviter_membership_no: state.membershipNo
      }
    });

    el.joinInput.value = "";
    closeDrawer();
    showToast("Katılımcı eklendi");
    await refreshRoomState(true);
  } catch (e) {
    console.error(e);
    showToast(e.message || "Katılımcı eklenemedi");
  }
}

async function sendMessage() {
  const text = safeText(el.messageInput.value);
  if (!text) return;
  if (!state.roomId) {
    showToast("Meeting hazır değil");
    return;
  }

  try {
    await api("/message", {
      method: "POST",
      body: {
        room_id: state.roomId,
        text,
        sender_lang: state.selectedLang,
        target_lang: state.selectedLang
      }
    });

    el.messageInput.value = "";
    autoResizeTextarea();
    syncSendState();

    await refreshRoomState(true);
  } catch (e) {
    console.error(e);
    showToast(e.message || "Mesaj gönderilemedi");
  }
}

function speakText(text) {
  const msg = safeText(text);
  if (!msg) return;

  try {
    if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
      try { window.NativeTTS.stop?.(); } catch (_) {}
      setTimeout(() => {
        try {
          window.NativeTTS.speak(msg, state.selectedLang || "tr");
        } catch (_) {
          showToast("Ses okuma başlatılamadı");
        }
      }, 50);
      return;
    }

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(msg);
      utter.lang = state.selectedLang || "tr-TR";
      utter.rate = 0.96;
      utter.pitch = 1;
      window.speechSynthesis.speak(utter);
      return;
    }

    showToast("Ses okuma desteklenmiyor");
  } catch (_) {
    showToast("Ses okuma başlatılamadı");
  }
}

function toggleSpeechInput() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    showToast("Sesli giriş desteklenmiyor");
    return;
  }

  if (state.speechRec) {
    try { state.speechRec.stop(); } catch (_) {}
    state.speechRec = null;
    return;
  }

  const recognition = new SR();
  recognition.lang = state.selectedLang || "tr-TR";
  recognition.interimResults = true;
  recognition.continuous = false;

  recognition.onstart = () => {
    state.speechRec = recognition;
    showToast("Dinleniyor...");
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    el.messageInput.value = transcript.trim();
    autoResizeTextarea();
    syncSendState();
  };

  recognition.onerror = () => {
    state.speechRec = null;
    showToast("Sesli giriş hatası");
  };

  recognition.onend = () => {
    state.speechRec = null;
  };

  recognition.start();
}

function startPolling() {
  stopPolling();
  state.pollTimer = setInterval(() => {
    refreshRoomState(true);
  }, 2500);
}

function stopPolling() {
  if (state.pollTimer) {
    clearInterval(state.pollTimer);
    state.pollTimer = null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopPolling();
  } else {
    startPolling();
    refreshRoomState(true);
  }
});

window.visualViewport?.addEventListener("resize", syncKeyboardOffset);
window.visualViewport?.addEventListener("scroll", syncKeyboardOffset);
window.addEventListener("resize", syncKeyboardOffset);

window.addEventListener("beforeunload", async () => {
  try {
    if (state.roomId) {
      await api("/leave", {
        method: "POST",
        body: { room_id: state.roomId }
      });
    }
  } catch (_) {}
});

async function init() {
  await loadLangPool();
  renderSelectedLanguage();
  renderLangOptions();

  bindInputEvents();
  bindDrawerEvents();
  bindActionEvents();
  autoResizeTextarea();
  syncSendState();
  syncKeyboardOffset();

  state.user = await getCurrentUser();
  if (!state.user) {
    showToast("Oturum bulunamadı");
    location.href = "/pages/login.html";
    return;
  }

  state.profile = await getProfileByUserId(state.user.id);
  state.membershipNo = pickMembershipNo(state.user, state.profile);
  state.displayName = pickDisplayName(state.user, state.profile);
  state.avatarUrl = pickAvatar(state.user, state.profile);

  renderProfile();

  await bootstrapMeeting();
  startPolling();
  scrollChatToBottom();
}

init();
