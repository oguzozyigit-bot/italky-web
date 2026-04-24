import { supabase } from "/js/supabase_client.js";

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

function persistSavedMeeting(room) {
  const records = JSON.parse(localStorage.getItem(STORAGE.savedMeetings) || "[]");
  const next = {
    room_id: room.room_id,
    room_code: room.room_code,
    room_name: room.room_name || "Toplantı",
    saved_at: room.saved_at || new Date().toISOString(),
    started: !!room.started,
    is_host: !!room.is_host
  };

  const merged = [next, ...records.filter(x => x.room_id !== next.room_id)].slice(0, 20);
  localStorage.setItem(STORAGE.savedMeetings, JSON.stringify(merged));
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
    roomCode: safeText(data.room_code || code)
  };
}

async function createRoomFlow() {
  const roomName = safeText(el.roomNameInput?.value, "Yeni Meeting");
  if (!roomName) return;

  el.createRoomBtn.disabled = true;

  try {
    const room = await bootstrapCreateRoom(roomName);

    if (!room.roomId) throw new Error("Oda oluşturulamadı");

    persistRoom(room.roomId, room.roomCode, roomName);
    persistSavedMeeting({
      room_id: room.roomId,
      room_code: room.roomCode,
      room_name: roomName,
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
    console.error(e);
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

    if (!room.roomId) throw new Error("Oda bulunamadı");

    persistRoom(room.roomId, room.roomCode);
    persistSavedMeeting({
      room_id: room.roomId,
      room_code: room.roomCode,
      room_name: "Katıldığım Toplantı",
      saved_at: new Date().toISOString(),
      started: false,
      is_host: false
    });

    renderSavedMeetings();

    setTimeout(() => {
      goMeeting(room.roomId, room.roomCode);
    }, 250);
  } catch (e) {
    console.error(e);
  } finally {
    el.joinRoomBtn.disabled = false;
  }
}

function renderSavedMeetings() {
  const records = JSON.parse(localStorage.getItem(STORAGE.savedMeetings) || "[]");

  if (!records.length) {
    el.meetingList.innerHTML = `
      <div class="meeting-item">
        <div class="meeting-item-title">Henüz kayıtlı toplantı yok.</div>
      </div>
    `;
    return;
  }

  el.meetingList.innerHTML = records.map((item) => {
    return `
      <div class="meeting-item">
        <div class="meeting-item-top">
          <div class="meeting-item-code">${item.room_code || "------"}</div>
          <div class="meeting-item-date">${formatDateTR(item.saved_at)}</div>
        </div>
        <div class="meeting-item-title">${item.room_name || "Toplantı"}</div>
        <button class="meeting-item-btn" type="button" data-room-id="${item.room_id}" data-room-code="${item.room_code || ""}">
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

function bindEvents() {
  el.createRoomBtn?.addEventListener("click", createRoomFlow);
  el.joinRoomBtn?.addEventListener("click", joinRoomFlow);
  el.refreshMeetingsBtn?.addEventListener("click", renderSavedMeetings);

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
}

function init() {
  bindEvents();
  renderSavedMeetings();
}

init();
