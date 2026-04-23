import { supabase } from "/js/supabase_client.js";
import { ensureModuleAdAccess } from "/js/ad_gate.js";
import { getLangPoolForSite } from "/js/lang_pool_full.js";
import { STORAGE_KEY } from "/js/config.js";

const API_BASE = "https://italky-api.onrender.com";
const MODULE_KEY = "meeting_room_access";
const STORAGE_LANG_KEY = "meeting_my_lang";

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

const COLOR_POOL = ["c1", "c2", "c3", "c4", "c5", "c6"];

const state = {
  currentUser: null,
  currentProfile: null,
  recognition: null,
  isListening: false,
  meetingId: new URLSearchParams(location.search).get("meeting_id") || "",
  meetingCode: new URLSearchParams(location.search).get("meeting_code") || "",
  myLang: localStorage.getItem(STORAGE_LANG_KEY) || "tr",
  participants: [],
  langPool: [],
  memberNo: "",
  displayName: "",
  avatarUrl: "",
  speakingAudio: null,
  speakingAbort: null
};

function injectExtraStyles() {
  if (document.getElementById("meeting-page-extra-styles")) return;

  const style = document.createElement("style");
  style.id = "meeting-page-extra-styles";
  style.textContent = `
    .bubble-row{
      display:flex;
      align-items:flex-start;
      gap:10px;
    }

    .bubble-text{
      min-width:0;
      flex:1;
    }

    .speaker-btn{
      width:30px;
      height:30px;
      min-width:30px;
      border:none;
      border-radius:10px;
      background:rgba(255,255,255,.06);
      border:1px solid rgba(255,255,255,.08);
      color:#fff;
      cursor:pointer;
      display:flex;
      align-items:center;
      justify-content:center;
      flex:0 0 auto;
      margin-top:2px;
    }

    .speaker-btn svg{
      width:15px;
      height:15px;
      stroke:currentColor;
      stroke-width:2;
      fill:none;
      stroke-linecap:round;
      stroke-linejoin:round;
    }

    .bubble-wrap.user-c1 .bubble.right{ border-right:4px solid var(--u1) !important; }
    .bubble-wrap.user-c2 .bubble.right{ border-right:4px solid var(--u2) !important; }
    .bubble-wrap.user-c3 .bubble.right{ border-right:4px solid var(--u3) !important; }
    .bubble-wrap.user-c4 .bubble.right{ border-right:4px solid var(--u4) !important; }
    .bubble-wrap.user-c5 .bubble.right{ border-right:4px solid var(--u5) !important; }
    .bubble-wrap.user-c6 .bubble.right{ border-right:4px solid var(--u6) !important; }

    .bubble-wrap.self-bubble .bubble.left{
      border-left:4px solid var(--blue2) !important;
      background:linear-gradient(180deg,#102343,#0d1d39) !important;
    }
  `;
  document.head.appendChild(style);
}

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

function getCachedUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function buildMemberNo(user, profile) {
  const meta = user?.user_metadata || {};
  const cached = getCachedUser();

  return (
    profile?.member_no ||
    profile?.membership_no ||
    profile?.user_no ||
    profile?.public_user_id ||
    profile?.short_id ||
    meta.membership_no ||
    meta.member_no ||
    cached?.membership_no ||
    cached?.uyelik_no ||
    (user?.id ? user.id.replace(/-/g, "").slice(0, 8).toUpperCase() : "")
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
    btn.addEventListener("click", async () => {
      const code = String(btn.dataset.code || "").trim().toLowerCase();
      if (!code) return;

      state.myLang = code;
      localStorage.setItem(STORAGE_LANG_KEY, state.myLang);
      renderLangPickerText();

      if (UI.meetingSub) {
        UI.meetingSub.textContent = `Herkes mesajları kendi dilinde görür. Senin dilin: ${getLanguageName(state.myLang)}`;
      }

      if (state.meetingId) {
        try {
          await patchMyLanguage(state.meetingId, state.myLang);
        } catch (e) {
          console.error("Dil güncellenemedi:", e);
        }
      }

      closeLangModal();
      showToast(`Dil seçildi: ${getLanguageName(state.myLang)}`);
      await refreshAll();
    });
  });
}

function participantColorClass(id = "") {
  const sum = String(id).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return COLOR_POOL[sum % COLOR_POOL.length];
}

function renderProfile(profile, user) {
  const cached = getCachedUser();

  const name =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    cached?.display_name ||
    cached?.name ||
    user?.email?.split("@")[0] ||
    "Kullanıcı";

  const avatar =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture ||
    cached?.picture ||
    cached?.avatar ||
    cached?.avatar_url ||
    "";

  const memberNo = buildMemberNo(user, profile) || "Üyelik numarası bulunamadı";

  state.displayName = name;
  state.avatarUrl = avatar;
  state.memberNo = memberNo;

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

function clearMessages() {
  if (UI.chatMessages) UI.chatMessages.innerHTML = "";
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

function stopSpeaking() {
  try {
    if (state.speakingAbort) state.speakingAbort.abort();
  } catch {}
  state.speakingAbort = null;

  try {
    if (state.speakingAudio) {
      state.speakingAudio.pause();
      state.speakingAudio.currentTime = 0;
    }
  } catch {}
  state.speakingAudio = null;

  try { window.speechSynthesis?.cancel?.(); } catch {}
  try { window.NativeTTS?.stop?.(); } catch {}
}

function getSpeechLang(code) {
  const c = String(code || "tr").toLowerCase();
  const map = {
    tr: "tr-TR",
    en: "en-US",
    de: "de-DE",
    fr: "fr-FR",
    es: "es-ES",
    it: "it-IT",
    ar: "ar-SA",
    ru: "ru-RU"
  };
  return map[c] || "tr-TR";
}

function chooseWebVoice(langCode) {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  const target = getSpeechLang(langCode).toLowerCase();
  const base = String(langCode || "").toLowerCase();

  return (
    voices.find((v) => String(v.lang || "").toLowerCase() === target) ||
    voices.find((v) => String(v.lang || "").toLowerCase().startsWith(base)) ||
    voices[0] ||
    null
  );
}

async function speakText(text, langCode) {
  const value = String(text || "").trim();
  if (!value) return;

  stopSpeaking();

  try {
    if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
      window.NativeTTS.speak(value, String(langCode || "tr"));
      return;
    }
  } catch {}

  if (window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(value);
      utter.lang = getSpeechLang(langCode);
      const voice = chooseWebVoice(langCode);
      if (voice) utter.voice = voice;
      utter.rate = 0.96;
      utter.pitch = 1;
      window.speechSynthesis.speak(utter);
      return;
    } catch {}
  }

  try {
    state.speakingAbort = new AbortController();

    const resp = await fetch(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: value,
        lang: String(langCode || "tr").toLowerCase()
      }),
      signal: state.speakingAbort.signal
    });

    const json = await resp.json().catch(() => ({}));
    const audioBase64 = json?.audio_base64 || "";

    if (!resp.ok || !audioBase64) return;

    const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
    state.speakingAudio = audio;
    await audio.play();
  } catch {}
}

function speakerButton(text, langCode) {
  return `
    <button class="speaker-btn" type="button" data-speak="${encodeURIComponent(text)}" data-lang="${encodeURIComponent(langCode)}" aria-label="Mesajı dinle">
      <svg viewBox="0 0 24 24">
        <path d="M5 14H8L13 18V6L8 10H5V14Z"></path>
        <path d="M17 9C18.3 10.1 19 11.5 19 12.9C19 14.3 18.3 15.7 17 16.8"></path>
      </svg>
    </button>
  `;
}

function addRenderedMessage(msg) {
  const isSystem = msg.message_type === "system";
  if (isSystem) {
    addSystemMessage(msg.translated_text || msg.original_text || "");
    return;
  }

  const isMine = String(msg.sender_member_no || "") === String(state.memberNo || "");
  const side = isMine ? "left" : "right";
  const colorClass = participantColorClass(msg.sender_member_no || msg.sender_user_id || msg.id || "");
  const text = msg.translated_text || msg.original_text || "";
  const speakLang = state.myLang;
  const senderName = msg.sender_name || "Kullanıcı";

  const row = document.createElement("div");
  row.className = `msg ${side}`;

  if (isMine) {
    row.innerHTML = `
      <div class="bubble-wrap self-bubble">
        <div class="bubble left">
          <div class="bubble-row">
            <div class="bubble-text">${escapeHtml(text)}</div>
            ${speakerButton(text, speakLang)}
          </div>
        </div>
        <div class="msg-name">${escapeHtml(senderName)}</div>
      </div>
    `;
  } else {
    row.innerHTML = `
      <div class="bubble-wrap user-${colorClass}">
        <div class="bubble right">
          <div class="bubble-row">
            <div class="bubble-text">${escapeHtml(text)}</div>
            ${speakerButton(text, speakLang)}
          </div>
        </div>
        <div class="msg-name">${escapeHtml(senderName)}</div>
      </div>
    `;
  }

  UI.chatMessages.appendChild(row);
}

function bindSpeakerButtons() {
  UI.chatMessages?.querySelectorAll(".speaker-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const text = decodeURIComponent(btn.dataset.speak || "");
      const lang = decodeURIComponent(btn.dataset.lang || "tr");
      await speakText(text, lang);
    });
  });
}

async function authHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function apiGet(path) {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: await authHeaders()
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json?.detail || json?.error || `GET ${path} failed`);
  return json;
}

async function apiPost(path, body) {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body || {})
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json?.detail || json?.error || `POST ${path} failed`);
  return json;
}

async function apiPatch(path, body) {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: "PATCH",
    headers: await authHeaders(),
    body: JSON.stringify(body || {})
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json?.detail || json?.error || `PATCH ${path} failed`);
  return json;
}

async function createMeetingIfNeeded() {
  if (state.meetingId) return;

  const created = await apiPost("/api/meeting/create", {
    title: "Yeni Meeting",
    lang_code: state.myLang
  });

  state.meetingId = created.meeting_id || "";
  state.meetingCode = created.meeting_code || "";

  if (state.meetingId) {
    const url = new URL(location.href);
    url.searchParams.set("meeting_id", state.meetingId);
    if (state.meetingCode) url.searchParams.set("meeting_code", state.meetingCode);
    history.replaceState({}, "", url.toString());
  }
}

async function loadMeeting() {
  if (!state.meetingId) return;

  const data = await apiGet(`/api/meeting/${state.meetingId}`);
  const meeting = data?.meeting || {};
  const participants = Array.isArray(data?.participants) ? data.participants : [];

  if (UI.meetingTitle) {
    UI.meetingTitle.textContent = `Meeting • ${meeting.meeting_code || state.meetingId}`;
  }

  state.participants = participants.map((p) => ({
    id: p.member_no || p.user_id || p.id,
    name: p.display_name || "Kullanıcı",
    avatar: p.avatar_url || "",
    active: !!p.is_active,
    speaking: false,
    lang: p.lang_code || "tr",
    isMe: String(p.member_no || "") === String(state.memberNo || "")
  }));

  renderParticipants();
}

async function loadMessages() {
  if (!state.meetingId) return;

  const data = await apiGet(`/api/meeting/${state.meetingId}/messages`);
  const rows = Array.isArray(data?.messages) ? data.messages : [];

  clearMessages();
  rows.forEach(addRenderedMessage);
  bindSpeakerButtons();
  scrollChatToBottom();
}

async function patchMyLanguage(meetingId, langCode) {
  return apiPatch(`/api/meeting/${meetingId}/my-language`, {
    lang_code: langCode
  });
}

async function sendMeetingMessage(text) {
  const value = String(text || "").trim();
  if (!value || !state.meetingId) return;

  await apiPost(`/api/meeting/${state.meetingId}/message`, {
    text: value
  });

  await loadMessages();
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

  UI.chatInput?.addEventListener("keydown", async (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const value = UI.chatInput.value;
      UI.chatInput.value = "";
      autoResizeTextarea();
      syncInputActionState();
      await sendMeetingMessage(value);
    }
  });

  UI.sendBtn?.addEventListener("click", async () => {
    const value = UI.chatInput?.value || "";
    if (UI.chatInput) UI.chatInput.value = "";
    autoResizeTextarea();
    syncInputActionState();
    await sendMeetingMessage(value);
  });

  UI.micBtn?.addEventListener("click", startRecognitionOnce);

  window.visualViewport?.addEventListener("resize", updateViewportLayout);
  window.visualViewport?.addEventListener("scroll", updateViewportLayout);
  window.addEventListener("resize", updateViewportLayout);
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

  recognition.onend = async () => {
    const finalText = cleanupTranscript(UI.chatInput?.value || lastTranscript || "");
    stopRecognition();

    if (finalText) {
      if (UI.chatInput) UI.chatInput.value = "";
      autoResizeTextarea();
      syncInputActionState();
      await sendMeetingMessage(finalText);
    }
  };

  try {
    recognition.start();
  } catch {
    stopRecognition();
  }
}

async function refreshAll() {
  await loadMeeting();
  await loadMessages();
}

async function init() {
  injectExtraStyles();
  buildLangPool();

  const accessOk = await ensureMeetingAdAccess();
  if (!accessOk) return;

  bindEvents();
  autoResizeTextarea();
  syncInputActionState();

  const { user, profile } = await getCurrentUserAndProfile();
  state.currentUser = user;
  state.currentProfile = profile;

  if (!user) {
    location.href = "/pages/login.html";
    return;
  }

  renderProfile(profile, user);
  await createMeetingIfNeeded();
  await refreshAll();

  updateViewportLayout();
  scrollChatToBottom();
}

init();
