import { supabase } from "/js/supabase_client.js";
import { LANG_POOL } from "/js/lang_pool_full.js";
import { ensureModuleAdAccess } from "/js/ad_gate.js?v=8";

const $ = (id) => document.getElementById(id);

const menuBtn = $("menuBtn");
const brandBackHome = $("brandBackHome");
const drawerLayer = $("drawerLayer");
const drawerBackdrop = $("drawerBackdrop");

const langTrigger = $("langTrigger");
const langLayer = $("langLayer");
const langBackdrop = $("langBackdrop");
const langList = $("langList");

const participantsStrip = $("participantsStrip");
const participantCount = $("participantCount");
const chatFeed = $("chatFeed");
const chatScroll = $("chatScroll");

const messageInput = $("messageInput");
const micBtn = $("micBtn");
const sendBtn = $("sendBtn");

const drawerAvatar = $("drawerAvatar");
const drawerName = $("drawerName");
const drawerStatus = $("drawerStatus");

const selectedLangFlag = $("selectedLangFlag");
const selectedLangName = $("selectedLangName");

const roomCodeValue = $("roomCodeValue");
const copyRoomCodeBtn = $("copyRoomCodeBtn");

const meetingDateCard = $("meetingDateCard");
const meetingDateValue = $("meetingDateValue");

const saveMeetingBtn = $("saveMeetingBtn");
const goHomeBtn = $("goHomeBtn");
const cancelMeetingBtn = $("cancelMeetingBtn");
const leaveMeetingBtn = $("leaveMeetingBtn");

const confirmLayer = $("confirmLayer");
const confirmTitle = $("confirmTitle");
const confirmText = $("confirmText");
const confirmOkBtn = $("confirmOkBtn");
const confirmCancelBtn = $("confirmCancelBtn");

const toastEl = $("toast");

const POLL_MS = 2800;
const API_ROOT =
  window.ITALKY_API_BASE ||
  localStorage.getItem("italky_api_base") ||
  "https://italky-api.onrender.com/api";

let pollTimer = null;
let speechRecognition = null;
let recognitionActive = false;
let confirmResolver = null;

const state = {
  accessToken: "",
  userId: "",
  sessionUser: null,
  roomId: "",
  roomCode: "",
  me: null,
  participants: [],
  messages: [],
  langs: [],
  myLang: "tr",
  lastMessageKey: "",
  meetingStarted: false,
  savedMeetingStarted: false,
  savedMeetingAt: null,
  booted: false
};

const COLOR_MAP = {
  c1: "#79ddff",
  c2: "#ff8fe1",
  c3: "#b88cff",
  c4: "#7ff0ba",
  c5: "#ffcc72",
  c6: "#ff8a8a"
};

function escapeHtml(v = "") {
  return String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showToast(text = "") {
  if (!toastEl) return;
  toastEl.textContent = text;
  toastEl.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    toastEl.classList.remove("show");
  }, 2200);
}

function getInitials(name = "") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return parts.slice(0, 2).map((x) => x[0]).join("").toUpperCase();
}

function normalizeLangPool() {
  const list = Array.isArray(LANG_POOL) ? LANG_POOL : [];
  const out = list
    .map((item) => {
      const code = item?.code || item?.lang || item?.value || item?.id || "";
      const flag = item?.flag || item?.emoji || "🌐";
      const name =
        item?.name_tr ||
        item?.tr ||
        item?.name ||
        item?.title ||
        item?.label ||
        item?.native ||
        code;

      return {
        code: String(code).trim().toLowerCase(),
        flag: String(flag || "🌐"),
        name: String(name || code || "Dil")
      };
    })
    .filter((x) => x.code);

  const uniq = [];
  const seen = new Set();

  for (const row of out) {
    if (seen.has(row.code)) continue;
    seen.add(row.code);
    uniq.push(row);
  }

  if (!uniq.length) {
    return [
      { code: "tr", flag: "🇹🇷", name: "Türkçe" },
      { code: "en", flag: "🇬🇧", name: "İngilizce" },
      { code: "de", flag: "🇩🇪", name: "Almanca" },
      { code: "fr", flag: "🇫🇷", name: "Fransızca" }
    ];
  }

  return uniq;
}

function getLangRow(code = "tr") {
  return state.langs.find((x) => x.code === String(code).toLowerCase()) || {
    code: String(code).toLowerCase(),
    flag: "🌐",
    name: String(code).toUpperCase()
  };
}

function updateSelectedLangUi() {
  const row = getLangRow(state.myLang);
  selectedLangFlag.textContent = row.flag;
  selectedLangName.textContent = row.name;
}

function autoGrowInput() {
  messageInput.style.height = "28px";
  messageInput.style.height = `${Math.min(messageInput.scrollHeight, 120)}px`;
}

function refreshSendButton() {
  const hasText = String(messageInput.value || "").trim().length > 0;
  sendBtn.classList.toggle("hidden", !hasText);
  micBtn.classList.toggle("hidden", hasText);
}

function openDrawer() {
  drawerLayer.classList.add("open");
}

function closeDrawer() {
  drawerLayer.classList.remove("open");
}

function openLangLayer() {
  renderLangList();
  langLayer.classList.add("open");
}

function closeLangLayer() {
  langLayer.classList.remove("open");
}

function openConfirm(title, text) {
  return new Promise((resolve) => {
    confirmResolver = resolve;
    confirmTitle.textContent = title;
    confirmText.textContent = text;
    confirmLayer.classList.add("open");
  });
}

function closeConfirm(result) {
  confirmLayer.classList.remove("open");
  if (typeof confirmResolver === "function") {
    const fn = confirmResolver;
    confirmResolver = null;
    fn(result);
  }
}

function attachAvatar(el, name, avatarUrl) {
  if (!el) return;
  const safeAvatar = String(avatarUrl || "").trim();
  if (safeAvatar) {
    el.innerHTML = `<img src="${safeAvatar}" alt="${escapeHtml(name || "Kullanıcı")}">`;
  } else {
    el.textContent = getInitials(name || "Kullanıcı");
  }
}

function renderDrawerProfile() {
  const me = state.me || {};
  attachAvatar(drawerAvatar, me.display_name || "Kullanıcı", me.avatar_url || "");
  drawerName.textContent = me.display_name || "Kullanıcı";
  drawerStatus.textContent = me.is_host ? "Yönetici" : "Katılımcı";
  roomCodeValue.textContent = state.roomCode || "------";
  updateSelectedLangUi();

  const showDate = Boolean(me.is_host) && !state.meetingStarted;
  meetingDateCard.style.display = showDate ? "block" : "none";

  const showCancelMeeting = Boolean(me.is_host) && !state.meetingStarted;
  cancelMeetingBtn.style.display = showCancelMeeting ? "block" : "none";

  const showLeaveMeeting = state.meetingStarted;
  leaveMeetingBtn.style.display = showLeaveMeeting ? "block" : "none";
}

function participantColorKey(p) {
  return COLOR_MAP[p?.color_key] || COLOR_MAP.c1;
}

function buildMessageKey(msg) {
  return [
    msg?.id || "",
    msg?.created_at || "",
    msg?.sender_id || "",
    msg?.original_text || ""
  ].join("|");
}

function normalizeParticipant(p = {}) {
  return {
    ...p,
    user_id: String(p.user_id || ""),
    display_name: p.display_name || p.sender_name || "Kullanıcı",
    avatar_url: p.avatar_url || "",
    is_host: !!p.is_host,
    is_active: p.is_active !== false,
    color_key: p.color_key || "c1"
  };
}

function renderParticipants() {
  const list = Array.isArray(state.participants) ? state.participants : [];
  participantCount.textContent = String(list.length || 1);

  participantsStrip.innerHTML = list
    .map((p) => {
      const safeName = escapeHtml(p.display_name || "Kullanıcı");
      const avatarUrl = String(p.avatar_url || "").trim();
      const hostClass = p.is_host ? "participant-host" : "";
      const avatarContent = avatarUrl
        ? `<img src="${avatarUrl}" alt="${safeName}">`
        : escapeHtml(getInitials(p.display_name || "Kullanıcı"));

      return `
        <div class="participant-chip" data-user-id="${escapeHtml(p.user_id)}">
          <div class="participant-avatar ${hostClass}">
            ${avatarContent}
          </div>
          <div class="participant-name">${safeName}</div>
        </div>
      `;
    })
    .join("");

  for (const chip of participantsStrip.querySelectorAll(".participant-chip")) {
    const userId = chip.dataset.userId || "";
    let holdTimer = null;

    const startHold = () => {
      holdTimer = setTimeout(async () => {
        await onParticipantHold(userId);
      }, 550);
    };

    const clearHold = () => {
      clearTimeout(holdTimer);
      holdTimer = null;
    };

    chip.addEventListener("touchstart", startHold, { passive: true });
    chip.addEventListener("touchend", clearHold, { passive: true });
    chip.addEventListener("touchcancel", clearHold, { passive: true });
    chip.addEventListener("mousedown", startHold);
    chip.addEventListener("mouseup", clearHold);
    chip.addEventListener("mouseleave", clearHold);
  }
}

async function onParticipantHold(userId) {
  const me = state.me || {};
  if (!me.is_host) return;
  if (!userId || userId === state.userId) return;

  const target = state.participants.find((p) => String(p.user_id) === String(userId));
  if (!target) return;

  const ok = await openConfirm(
    "Katılımcıyı Çıkar",
    `${target.display_name || "Kullanıcı"} kişisini toplantıdan çıkartmak istiyor musunuz?`
  );

  if (!ok) return;

  try {
    await apiPost("/meeting/remove-participant", {
      room_id: state.roomId,
      target_user_id: userId
    });
    await refreshState();
    showToast("Katılımcı çıkarıldı");
  } catch (e) {
    console.error("remove participant error:", e);
    showToast("Katılımcı çıkarılamadı");
  }
}

function renderMessages() {
  const participantsById = new Map(
    (state.participants || []).map((p) => [String(p.user_id || ""), p])
  );
  const messages = Array.isArray(state.messages) ? state.messages : [];

  state.meetingStarted = messages.some((m) => m.message_type === "text");

  chatFeed.innerHTML = messages
    .map((msg) => {
      const isSystem = msg.message_type === "system";
      const isMine = !isSystem && String(msg.sender_id || "") === String(state.userId || "");
      const rowParticipant = participantsById.get(String(msg.sender_id || ""));
      const authorName = isMine
        ? state.me?.display_name || "Ben"
        : msg.sender_name || rowParticipant?.display_name || "Katılımcı";

      const lineColor = participantColorKey(rowParticipant || {});
      const text = escapeHtml(msg.translated_text || msg.original_text || "");
      const speakLang = getLangRow(state.myLang)?.code || "tr";

      if (isSystem) {
        return `
          <div class="msg system">
            <div class="system-badge">${escapeHtml(msg.original_text || msg.translated_text || "")}</div>
          </div>
        `;
      }

      return `
        <div class="msg ${isMine ? "mine" : "other"}">
          <div class="msg-block">
            <div class="msg-row">
              <div class="bubble" style="--line-color:${lineColor}">
                <div class="bubble-text">${text}</div>
                <button class="speaker-btn" type="button" data-speak="${escapeHtml(msg.translated_text || msg.original_text || "")}" data-lang="${escapeHtml(speakLang)}" aria-label="Dinle">
                  <svg viewBox="0 0 24 24">
                    <path d="M11 5L6 9H3v6h3l5 4V5z"></path>
                    <path d="M15.5 8.5a5 5 0 0 1 0 7"></path>
                    <path d="M17.8 6a8.5 8.5 0 0 1 0 12"></path>
                  </svg>
                </button>
              </div>
            </div>
            <div class="msg-author">${escapeHtml(authorName)}</div>
          </div>
        </div>
      `;
    })
    .join("");

  for (const btn of chatFeed.querySelectorAll(".speaker-btn")) {
    btn.addEventListener("click", () => {
      speakText(btn.dataset.speak || "", btn.dataset.lang || "tr");
    });
  }

  const last = messages[messages.length - 1];
  const nextKey = last ? buildMessageKey(last) : "";
  const shouldScroll = state.lastMessageKey !== nextKey || !state.lastMessageKey;
  state.lastMessageKey = nextKey;

  if (shouldScroll) {
    requestAnimationFrame(() => {
      chatScroll.scrollTop = chatScroll.scrollHeight + 500;
    });
  }

  renderDrawerProfile();
}

function renderLangList() {
  langList.innerHTML = state.langs
    .map((row) => {
      const active = row.code === state.myLang ? "active" : "";
      return `
        <button class="lang-option ${active}" type="button" data-code="${escapeHtml(row.code)}">
          <div class="lang-option-left">
            <div class="lang-flag">${escapeHtml(row.flag)}</div>
            <div class="lang-option-name">${escapeHtml(row.name)}</div>
          </div>
          <div class="lang-check"></div>
        </button>
      `;
    })
    .join("");

  for (const btn of langList.querySelectorAll(".lang-option")) {
    btn.addEventListener("click", async () => {
      const code = String(btn.dataset.code || "tr").toLowerCase();
      if (code === state.myLang) {
        closeLangLayer();
        return;
      }

      state.myLang = code;
      updateSelectedLangUi();
      closeLangLayer();

      if (!state.roomId) return;

      try {
        await apiPost("/meeting/language", {
          room_id: state.roomId,
          lang: state.myLang
        });

        await refreshState();
        showToast("Dil güncellendi");
      } catch (e) {
        console.error("language update error:", e);
        showToast("Dil güncellenemedi");
      }
    });
  }
}

async function copyText(value, successText = "Kopyalandı") {
  try {
    await navigator.clipboard.writeText(String(value || ""));
    showToast(successText);
  } catch (e) {
    console.error("copy error:", e);
    showToast("Kopyalanamadı");
  }
}

async function getSessionOrThrow() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const session = data?.session;
  if (!session?.access_token || !session?.user) {
    window.location.href = "/pages/login.html";
    throw new Error("session_missing");
  }
  state.accessToken = session.access_token;
  state.userId = String(session.user.id || "");
  state.sessionUser = session.user;
  return session;
}

function buildBootstrapBody() {
  const user = state.sessionUser || {};
  const meta = user.user_metadata || {};

  const displayName =
    meta.hitap ||
    meta.name ||
    meta.full_name ||
    (user.email ? String(user.email).split("@")[0] : "") ||
    "Kullanıcı";

  const avatarUrl = meta.avatar_url || meta.picture || meta.avatar || "";

  return {
    membership_no: "",
    display_name: displayName,
    avatar_url: avatarUrl || null,
    lang: state.myLang || "tr"
  };
}

async function apiGet(path) {
  const res = await fetch(`${API_ROOT}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${state.accessToken}`
    }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.detail || `GET ${path} failed`);
  }
  return data;
}

async function apiPost(path, body) {
  const res = await fetch(`${API_ROOT}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${state.accessToken}`
    },
    body: JSON.stringify(body || {})
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.detail || `POST ${path} failed`);
  }
  return data;
}

function deriveMeFromParticipants() {
  const meRow = (state.participants || []).find(
    (p) => String(p.user_id || "") === String(state.userId || "")
  );

  if (meRow) {
    state.me = meRow;
    if (meRow.lang) state.myLang = String(meRow.lang).toLowerCase();
    return;
  }

  const user = state.sessionUser || {};
  const meta = user.user_metadata || {};

  state.me = {
    user_id: state.userId,
    display_name:
      meta.hitap ||
      meta.name ||
      meta.full_name ||
      (user.email ? String(user.email).split("@")[0] : "") ||
      "Kullanıcı",
    avatar_url: meta.avatar_url || meta.picture || meta.avatar || "",
    is_host: false,
    lang: state.myLang
  };
}

async function bootstrapMeeting() {
  const body = buildBootstrapBody();
  const data = await apiPost("/meeting/bootstrap", body);

  state.roomId = data?.room_id || "";
  state.roomCode = data?.room_code || "";
  state.participants = (Array.isArray(data?.participants) ? data.participants : []).map(normalizeParticipant);
  state.messages = Array.isArray(data?.messages) ? data.messages : [];

  deriveMeFromParticipants();
  renderDrawerProfile();
  renderParticipants();
  renderMessages();
}

async function refreshState() {
  if (!state.roomId) return;
  const data = await apiGet(`/meeting/state?room_id=${encodeURIComponent(state.roomId)}`);
  state.participants = (Array.isArray(data?.participants) ? data.participants : []).map(normalizeParticipant);
  state.messages = Array.isArray(data?.messages) ? data.messages : [];
  deriveMeFromParticipants();
  renderDrawerProfile();
  renderParticipants();
  renderMessages();
}

async function sendMessage() {
  const text = String(messageInput.value || "").trim();
  if (!text || !state.roomId) return;

  try {
    sendBtn.disabled = true;

    if (!state.meetingStarted) {
      state.savedMeetingStarted = true;
      localStorage.setItem(`meeting_started_${state.roomId}`, "1");
    }

    await apiPost("/meeting/message", {
      room_id: state.roomId,
      text,
      sender_lang: state.myLang,
      target_lang: state.myLang
    });

    messageInput.value = "";
    autoGrowInput();
    refreshSendButton();
    await refreshState();
  } catch (e) {
    console.error("sendMessage error:", e);
    showToast("Mesaj gönderilemedi");
  } finally {
    sendBtn.disabled = false;
  }
}

function speakText(text = "", lang = "tr") {
  try {
    if ("NativeTTS" in window && typeof window.NativeTTS?.speak === "function") {
      window.NativeTTS.speak(String(text || ""), lang || "tr");
      return;
    }

    if (!("speechSynthesis" in window)) {
      showToast("Seslendirme desteklenmiyor");
      return;
    }

    const utter = new SpeechSynthesisUtterance(String(text || ""));
    utter.lang = lang || "tr-TR";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.error("speakText error:", e);
  }
}

function setupKeyboardOffset() {
  if (!window.visualViewport) return;

  const update = () => {
    const vv = window.visualViewport;
    const keyboard = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty("--keyboard-offset", `${keyboard}px`);
  };

  window.visualViewport.addEventListener("resize", update);
  window.visualViewport.addEventListener("scroll", update);
  update();
}

function setupRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  speechRecognition = new SR();
  speechRecognition.lang = "tr-TR";
  speechRecognition.interimResults = false;
  speechRecognition.maxAlternatives = 1;

  speechRecognition.onstart = () => {
    recognitionActive = true;
    showToast("Dinliyorum...");
  };

  speechRecognition.onend = () => {
    recognitionActive = false;
  };

  speechRecognition.onerror = (e) => {
    recognitionActive = false;
    console.error("speech recognition error:", e);
    showToast("Ses algılanamadı");
  };

  speechRecognition.onresult = (event) => {
    const text = event?.results?.[0]?.[0]?.transcript || "";
    if (!text) return;
    messageInput.value = `${String(messageInput.value || "").trim()} ${text}`.trim();
    autoGrowInput();
    refreshSendButton();
  };
}

function formatDateTR(value) {
  if (!value) return "--/--/---- --:--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--/--/---- --:--";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(d);
}

function saveMeetingSnapshot() {
  if (!state.roomId) return;

  const records = JSON.parse(localStorage.getItem("italky_saved_meetings_v1") || "[]");
  const me = state.me || {};
  const next = {
    room_id: state.roomId,
    room_code: state.roomCode,
    saved_at: new Date().toISOString(),
    started: !!state.meetingStarted,
    is_host: !!me.is_host,
    title: me.is_host ? "Yönetici Toplantısı" : "Katıldığım Toplantı"
  };

  const merged = [next, ...records.filter((x) => x.room_id !== state.roomId)].slice(0, 20);
  localStorage.setItem("italky_saved_meetings_v1", JSON.stringify(merged));
  showToast("Toplantı kaydedildi");
}

async function leaveMeetingFlow(goHomeAfter = false) {
  try {
    await apiPost("/meeting/leave", {
      room_id: state.roomId
    });
  } catch (e) {
    console.error("leaveMeeting error:", e);
  }

  if (goHomeAfter) {
    window.location.href = "/pages/home.html";
  }
}

async function handleGoHome() {
  if (state.meetingStarted) {
    const ok = await openConfirm(
      "Toplantıdan Ayrıl",
      "Toplantıdan ayrılmak istediğinize emin misiniz?"
    );
    if (!ok) return;
    await leaveMeetingFlow(true);
    return;
  }

  window.location.href = "/pages/home.html";
}

async function handleBrandHome() {
  if (state.meetingStarted) {
    const ok = await openConfirm(
      "Toplantıdan Ayrıl",
      "Toplantıdan ayrılmak istediğinize emin misiniz?"
    );
    if (!ok) return;
    await leaveMeetingFlow(true);
    return;
  }

  window.location.href = "/pages/home.html";
}

async function handleCancelMeeting() {
  const ok = await openConfirm(
    "Kayıtlı Toplantıyı İptal Et",
    "Bu kayıtlı toplantıyı iptal etmek istediğinize emin misiniz?"
  );
  if (!ok) return;

  try {
    await apiPost("/meeting/cancel", {
      room_id: state.roomId
    });
  } catch (e) {
    console.error("cancel meeting error:", e);
  }

  const records = JSON.parse(localStorage.getItem("italky_saved_meetings_v1") || "[]");
  localStorage.setItem(
    "italky_saved_meetings_v1",
    JSON.stringify(records.filter((x) => x.room_id !== state.roomId))
  );

  showToast("Toplantı iptal edildi");
  setTimeout(() => {
    window.location.href = "/pages/meeting_lobby.html";
  }, 400);
}

async function handleLeaveMeeting() {
  const ok = await openConfirm(
    "Toplantıdan Ayrıl",
    "Toplantıdan ayrılmak istediğinize emin misiniz?"
  );
  if (!ok) return;
  await leaveMeetingFlow(true);
}

function bindEvents() {
  menuBtn.addEventListener("click", openDrawer);
  drawerBackdrop.addEventListener("click", closeDrawer);

  langTrigger.addEventListener("click", openLangLayer);
  langBackdrop.addEventListener("click", closeLangLayer);

  copyRoomCodeBtn.addEventListener("click", () => {
    copyText(state.roomCode || "", "Oda kodu kopyalandı");
  });

  saveMeetingBtn.addEventListener("click", saveMeetingSnapshot);
  goHomeBtn.addEventListener("click", handleGoHome);
  cancelMeetingBtn.addEventListener("click", handleCancelMeeting);
  leaveMeetingBtn.addEventListener("click", handleLeaveMeeting);
  brandBackHome.addEventListener("click", handleBrandHome);

  confirmCancelBtn.addEventListener("click", () => closeConfirm(false));
  confirmOkBtn.addEventListener("click", () => closeConfirm(true));

  messageInput.addEventListener("input", () => {
    autoGrowInput();
    refreshSendButton();
  });

  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  sendBtn.addEventListener("click", sendMessage);

  micBtn.addEventListener("click", () => {
    if (!speechRecognition) {
      showToast("Cihazda sesle yazma desteklenmiyor");
      return;
    }

    if (recognitionActive) {
      speechRecognition.stop();
      return;
    }

    const langCode = getLangRow(state.myLang)?.code || "tr";
    speechRecognition.lang = langCode === "tr" ? "tr-TR" : langCode;
    speechRecognition.start();
  });
}

function startPolling() {
  stopPolling();
  pollTimer = setInterval(async () => {
    try {
      await refreshState();
    } catch (e) {
      console.error("poll refresh error:", e);
    }
  }, POLL_MS);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function gateMeetingAd() {
  try {
    const ok = await ensureModuleAdAccess({
      moduleKey: "meeting_room",
      title: "Toplantı odası için kısa bir reklam gösterilecek",
      text: "Toplantı odasını kullanabilmeniz için 1 kısa reklam gösterilecektir.\nReklamı tamamladıktan sonra bu modüle 24 saat boyunca tekrar reklam görmeden girebilirsiniz.",
      placement: "meeting_room",
      hours: 24
    });

    if (!ok) {
      window.location.href = "/pages/home.html";
      return false;
    }

    return true;
  } catch (e) {
    console.error("meeting ad gate error:", e);
    return true;
  }
}

async function boot() {
  if (state.booted) return;
  state.booted = true;

  try {
    const adOk = await gateMeetingAd();
    if (!adOk) return;

    state.langs = normalizeLangPool();
    await getSessionOrThrow();

    const user = state.sessionUser || {};
    const meta = user.user_metadata || {};
    const url = new URL(window.location.href);

    const urlLang = url.searchParams.get("lang") || "";
    const metaLang = meta.lang || meta.site_lang || meta.system_lang || "tr";

    state.myLang = String(urlLang || metaLang || "tr").toLowerCase();
    state.roomId =
      url.searchParams.get("room_id") ||
      localStorage.getItem("italky_meeting_room_id_v7") ||
      "";
    state.roomCode =
      url.searchParams.get("room_code") ||
      localStorage.getItem("italky_meeting_room_code_v7") ||
      "";

    const savedStarted = localStorage.getItem(`meeting_started_${state.roomId}`) === "1";
    state.savedMeetingStarted = savedStarted;

    const savedMeetings = JSON.parse(localStorage.getItem("italky_saved_meetings_v1") || "[]");
    const currentSaved = savedMeetings.find((x) => x.room_id === state.roomId) || null;
    state.savedMeetingAt = currentSaved?.saved_at || new Date().toISOString();
    meetingDateValue.textContent = formatDateTR(state.savedMeetingAt);

    updateSelectedLangUi();

    bindEvents();
    setupKeyboardOffset();
    setupRecognition();
    autoGrowInput();
    refreshSendButton();

    if (!state.roomId) {
      showToast("Oda bilgisi bulunamadı");
      return;
    }

    await bootstrapMeeting();
    state.meetingStarted = state.savedMeetingStarted || state.meetingStarted;
    renderDrawerProfile();
    startPolling();
  } catch (e) {
    console.error("meeting boot error:", e);
    showToast("Meeting yüklenemedi");
  }
}

window.addEventListener("beforeunload", stopPolling);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopPolling();
  else if (state.roomId) startPolling();
});

boot();
