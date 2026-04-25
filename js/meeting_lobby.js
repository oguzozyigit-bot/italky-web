import { supabase } from "/js/supabase_client.js";
import { mountShell } from "/js/ui_shell.js";

const API_ROOT =
  window.ITALKY_API_BASE ||
  localStorage.getItem("italky_api_base") ||
  "https://italky-api.onrender.com/api";

const MEETING_API = `${API_ROOT}/meeting`;

const STORAGE = {
  roomId: "italky_meeting_room_id_v7",
  roomCode: "italky_meeting_room_code_v7",
  roomName: "italky_meeting_room_name_v1",
  meetingLang: "italky_meeting_lang_v7",
  savedMeetings: "italky_saved_meetings_v1"
};

const $ = (id) => document.getElementById(id);

const el = {
  roomNameInput: $("roomNameInput"),
  meetingDateInput: $("meetingDateInput"),
  meetingTimeInput: $("meetingTimeInput"),
  pickTodayBtn: $("pickTodayBtn"),
  pickTomorrowBtn: $("pickTomorrowBtn"),
  pickThreeDayBtn: $("pickThreeDayBtn"),
  createRoomBtn: $("createRoomBtn"),
  roomPreview: $("roomPreview"),
  roomPreviewCode: $("roomPreviewCode"),
  joinCodeInput: $("joinCodeInput"),
  joinRoomBtn: $("joinRoomBtn"),
  refreshMeetingsBtn: $("refreshMeetingsBtn"),
  meetingList: $("meetingList")
};

function safeText(v, fallback = "") {
  return String(v ?? fallback ?? "").trim();
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

function isFutureMeeting(value) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() > Date.now();
}

function dateToInputValue(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function timeToInputValue(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function buildMeetingAtIso() {
  const datePart = safeText(el.meetingDateInput?.value);
  const timePart = safeText(el.meetingTimeInput?.value);

  if (!datePart || !timePart) return "";

  const local = new Date(`${datePart}T${timePart}:00`);
  if (Number.isNaN(local.getTime())) return "";

  return local.toISOString();
}

function setMeetingInputs(date) {
  if (!el.meetingDateInput || !el.meetingTimeInput) return;
  el.meetingDateInput.value = dateToInputValue(date);
  el.meetingTimeInput.value = timeToInputValue(date);
}

function setDefaultMeetingTime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 15);
  now.setSeconds(0, 0);
  setMeetingInputs(now);
}

async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data?.session || null;
}

async function authHeaders() {
  const session = await getSession();
  const token = session?.access_token || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function api(path, options = {}) {
  const res = await fetch(`${MEETING_API}${path}`, {
    method: options.method || "GET",
    headers: await authHeaders(),
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.detail || data?.message || `İstek başarısız (${res.status})`);
  }

  return data;
}

function persistRoom(roomId, roomCode, roomName = "") {
  if (roomId) localStorage.setItem(STORAGE.roomId, roomId);
  if (roomCode) localStorage.setItem(STORAGE.roomCode, roomCode);
  if (roomName) localStorage.setItem(STORAGE.roomName, roomName);
}

function loadSavedMeetings() {
  try {
    const records = JSON.parse(localStorage.getItem(STORAGE.savedMeetings) || "[]");
    return Array.isArray(records) ? records : [];
  } catch {
    return [];
  }
}

function saveSavedMeetings(records) {
  localStorage.setItem(STORAGE.savedMeetings, JSON.stringify(records || []));
}

function persistSavedMeeting(room) {
  const records = loadSavedMeetings();

  const next = {
    room_id: room.room_id,
    room_code: room.room_code,
    room_name: room.room_name || "Toplantı",
    meeting_at: room.meeting_at || "",
    saved_at: room.saved_at || new Date().toISOString(),
    started: !!room.started,
    is_host: !!room.is_host
  };

  const merged = [next, ...records.filter((x) => x.room_id !== next.room_id)].slice(0, 50);
  saveSavedMeetings(merged);
}

function cleanupSavedMeetings() {
  const records = loadSavedMeetings();
  const filtered = records.filter((x) => {
    if (!safeText(x.room_id)) return false;
    if (!safeText(x.meeting_at)) return false;
    return isFutureMeeting(x.meeting_at);
  });

  if (filtered.length !== records.length) {
    saveSavedMeetings(filtered);
  }
}

function goMeeting(roomId, roomCode) {
  if (!roomId) return;

  const url = new URL("/pages/meeting.html", location.origin);
  url.searchParams.set("room_id", roomId);
  if (roomCode) url.searchParams.set("room_code", roomCode);

  location.href = url.toString();
}

async function bootstrapCreateRoom(roomName) {
  const selectedLang = localStorage.getItem(STORAGE.meetingLang) || "tr";

  const payload = {
    membership_no: "",
    display_name: roomName || "Yeni Meeting",
    avatar_url: "",
    lang: selectedLang
  };

  const data = await api("/bootstrap", {
    method: "POST",
    body: payload
  });

  return {
    roomId: safeText(data.room_id),
    roomCode: safeText(data.room_code)
  };
}

async function resolveRoomByCode(roomCode) {
  const code = safeText(roomCode).toUpperCase();
  if (!code) throw new Error("Oda kodu boş");

  const data = await api(`/resolve?meeting_code=${encodeURIComponent(code)}`, {
    method: "GET"
  });

  return {
    roomId: safeText(data.room_id),
    roomCode: safeText(data.room_code || code),
    title: safeText(data.title || "Toplantı")
  };
}

async function createRoomFlow() {
  const roomName = safeText(el.roomNameInput?.value, "Yeni Meeting");
  const meetingAt = buildMeetingAtIso();

  if (!roomName) return;
  if (!meetingAt) return;

  el.createRoomBtn.disabled = true;

  try {
    const room = await bootstrapCreateRoom(roomName);

    if (!room.roomId) {
      throw new Error("Oda oluşturulamadı");
    }

    persistRoom(room.roomId, room.roomCode, roomName);

    persistSavedMeeting({
      room_id: room.roomId,
      room_code: room.roomCode,
      room_name: roomName,
      meeting_at: meetingAt,
      saved_at: new Date().toISOString(),
      started: false,
      is_host: true
    });

    if (el.roomPreview && el.roomPreviewCode) {
      el.roomPreview.style.display = "flex";
      el.roomPreviewCode.textContent = room.roomCode || "—";
    }

    renderSavedMeetings();

    setTimeout(() => {
      goMeeting(room.roomId, room.roomCode);
    }, 300);
  } catch (e) {
    console.error("createRoomFlow error:", e);
  } finally {
    el.createRoomBtn.disabled = false;
  }
}

async function joinRoomFlow() {
  const code = safeText(el.joinCodeInput?.value).toUpperCase();
  if (!code) return;

  el.joinRoomBtn.disabled = true;

  try {
    const room = await resolveRoomByCode(code);

    if (!room.roomId) {
      throw new Error("Oda bulunamadı");
    }

    const records = loadSavedMeetings();
    const matched = records.find((x) => safeText(x.room_code).toUpperCase() === code);

    persistRoom(room.roomId, room.roomCode, room.title);

    if (matched) {
      persistSavedMeeting({
        room_id: room.roomId,
        room_code: room.roomCode,
        room_name: matched.room_name || room.title || "Toplantı",
        meeting_at: matched.meeting_at || "",
        saved_at: matched.saved_at || new Date().toISOString(),
        started: !!matched.started,
        is_host: false
      });
    }

    renderSavedMeetings();
    goMeeting(room.roomId, room.roomCode);
  } catch (e) {
    console.error("joinRoomFlow error:", e);
  } finally {
    el.joinRoomBtn.disabled = false;
  }
}

function renderSavedMeetings() {
  const records = loadSavedMeetings()
    .filter((x) => x.meeting_at && isFutureMeeting(x.meeting_at))
    .sort((a, b) => new Date(a.meeting_at).getTime() - new Date(b.meeting_at).getTime());

  if (!records.length) {
    el.meetingList.innerHTML = `
      <div class="meeting-item">
        <div class="meeting-item-title">Başlayacak kayıtlı toplantı yok.</div>
      </div>
    `;
    return;
  }

  el.meetingList.innerHTML = records.map((item) => {
    return `
      <div class="meeting-item">
        <div class="meeting-item-top">
          <div class="meeting-item-code">${safeText(item.room_code || "------")}</div>
          <div class="meeting-item-date">${formatDateTR(item.meeting_at)}</div>
        </div>
        <div class="meeting-item-title">${safeText(item.room_name || "Toplantı")}</div>
        <button
          class="meeting-item-btn"
          type="button"
          data-room-id="${safeText(item.room_id)}"
          data-room-code="${safeText(item.room_code || "")}"
        >
          Toplantı Odasına Gir
        </button>
      </div>
    `;
  }).join("");

  for (const btn of el.meetingList.querySelectorAll(".meeting-item-btn")) {
    btn.addEventListener("click", () => {
      const roomId = btn.dataset.roomId || "";
      const roomCode = btn.dataset.roomCode || "";
      if (!roomId) return;
      persistRoom(roomId, roomCode);
      goMeeting(roomId, roomCode);
    });
  }
}

function bindQuickButtons() {
  el.pickTodayBtn?.addEventListener("click", () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 15);
    d.setSeconds(0, 0);
    setMeetingInputs(d);
  });

  el.pickTomorrowBtn?.addEventListener("click", () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    setMeetingInputs(d);
  });

  el.pickThreeDayBtn?.addEventListener("click", () => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(10, 0, 0, 0);
    setMeetingInputs(d);
  });
}

function bindEvents() {
  el.createRoomBtn?.addEventListener("click", createRoomFlow);
  el.joinRoomBtn?.addEventListener("click", joinRoomFlow);
  el.refreshMeetingsBtn?.addEventListener("click", () => {
    cleanupSavedMeetings();
    renderSavedMeetings();
  });

  el.joinCodeInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      joinRoomFlow();
    }
  });

  el.roomNameInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      createRoomFlow();
    }
  });

  el.meetingDateInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      createRoomFlow();
    }
  });

  el.meetingTimeInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      createRoomFlow();
    }
  });

  bindQuickButtons();
}

function applyShellVars() {
  try {
    const root = getComputedStyle(document.documentElement);
    const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
    document.documentElement.style.setProperty("--shellLift", footerH ? `${footerH + 8}px` : "0px");
  } catch (e) {
    console.warn("[meeting_lobby] shell vars error:", e);
  }
}

async function init() {
  try {
    mountShell({ scroll: "auto" });
  } catch (e) {
    console.warn("[meeting_lobby] mountShell error:", e);
  }

  applyShellVars();
  setTimeout(applyShellVars, 120);
  setTimeout(applyShellVars, 500);
  window.addEventListener("resize", applyShellVars);

  cleanupSavedMeetings();
  setDefaultMeetingTime();
  bindEvents();
  renderSavedMeetings();
}

init();
