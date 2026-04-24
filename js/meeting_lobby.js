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
  meetingLang: "italky_meeting_lang_v7"
};

const $ = (id) => document.getElementById(id);

const el = {
  roomNameInput: $("roomNameInput"),
  createRoomBtn: $("createRoomBtn"),
  roomPreview: $("roomPreview"),
  roomPreviewCode: $("roomPreviewCode"),

  joinCodeInput: $("joinCodeInput"),
  joinRoomBtn: $("joinRoomBtn"),
  goMeetingBtn: $("goMeetingBtn"),

  toast: $("toast")
};

function showToast(message = "") {
  if (!el.toast) return;
  el.toast.textContent = String(message);
  el.toast.classList.add("show");
  clearTimeout(window.__meetingLobbyToastTimer);
  window.__meetingLobbyToastTimer = setTimeout(() => {
    el.toast.classList.remove("show");
  }, 2200);
}

function safeText(v, fallback = "") {
  return String(v ?? fallback ?? "").trim();
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

function persistRoom(roomId, roomCode, roomName = "") {
  if (roomId) localStorage.setItem(STORAGE.roomId, roomId);
  if (roomCode) localStorage.setItem(STORAGE.roomCode, roomCode);
  if (roomName) localStorage.setItem(STORAGE.roomName, roomName);
}

function goMeeting(roomId, roomCode) {
  const url = new URL("/pages/meeting.html", location.origin);
  if (roomId) url.searchParams.set("room_id", roomId);
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
  el.createRoomBtn.disabled = true;

  try {
    const room = await bootstrapCreateRoom(roomName);
    if (!room.roomId) {
      throw new Error("Oda oluşturulamadı");
    }

    persistRoom(room.roomId, room.roomCode, roomName);

    if (el.roomPreview && el.roomPreviewCode) {
      el.roomPreview.style.display = "flex";
      el.roomPreviewCode.textContent = room.roomCode || "—";
    }

    showToast("Oda oluşturuldu");
    setTimeout(() => {
      goMeeting(room.roomId, room.roomCode);
    }, 350);
  } catch (e) {
    console.error(e);
    showToast(e.message || "Oda oluşturulamadı");
  } finally {
    el.createRoomBtn.disabled = false;
  }
}

async function joinRoomFlow() {
  const code = safeText(el.joinCodeInput?.value).toUpperCase();
  if (!code) {
    showToast("Önce oda kodu gir");
    return;
  }

  el.joinRoomBtn.disabled = true;

  try {
    const room = await resolveRoomByCode(code);
    if (!room.roomId) {
      throw new Error("Oda bulunamadı");
    }

    persistRoom(room.roomId, room.roomCode);
    showToast("Odaya bağlanılıyor");
    setTimeout(() => {
      goMeeting(room.roomId, room.roomCode);
    }, 250);
  } catch (e) {
    console.error(e);
    showToast(e.message || "Odaya katılınamadı");
  } finally {
    el.joinRoomBtn.disabled = false;
  }
}

function goLastRoom() {
  const roomId = localStorage.getItem(STORAGE.roomId) || "";
  const roomCode = localStorage.getItem(STORAGE.roomCode) || "";

  if (!roomId) {
    showToast("Kayıtlı son oda yok");
    return;
  }

  goMeeting(roomId, roomCode);
}

function bindEvents() {
  el.createRoomBtn?.addEventListener("click", createRoomFlow);
  el.joinRoomBtn?.addEventListener("click", joinRoomFlow);
  el.goMeetingBtn?.addEventListener("click", goLastRoom);

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

function applyShellVars() {
  try {
    const root = getComputedStyle(document.documentElement);
    const footerH = parseFloat(root.getPropertyValue("--footerH")) || 0;
    document.documentElement.style.setProperty("--shellLift", footerH ? `${footerH + 8}px` : "0px");
  } catch (_) {}
}

async function init() {
  try {
    mountShell({ scroll: "auto" });
  } catch (_) {}

  applyShellVars();
  setTimeout(applyShellVars, 120);
  setTimeout(applyShellVars, 500);
  window.addEventListener("resize", applyShellVars);

  bindEvents();
}

init();
