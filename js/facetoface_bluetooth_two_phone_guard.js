// FILE: /js/facetoface_bluetooth_two_phone_guard.js
// Thin guard layer for the 2 Telefon room-code flow. Keeps the existing UI/gameplay,
// but enforces a two-device session contract and softens transient join races.
import { installTwoPhoneBluetoothMode as installBaseTwoPhoneMode } from "/js/facetoface_bluetooth_two_phone.js";

const PEER_KEY = "italky_two_phone_peer_id_v1";
const ROOM_FULL_MESSAGE = "Bu oturum yalnızca 2 cihaz destekler.";
const CONNECT_FAILED_MESSAGE = "Bağlantı kurulamadı. Bluetooth eşleşmesini kontrol edip tekrar deneyin.";
const RETRY_DELAYS = [0, 800, 1800];
const WS_ROOM_PATTERN = /\/api\/f2f\/ws\//;
const HOME_HREF = "/pages/home.html";

let installed = false;
let originalWebSocket = null;
let currentSocket = null;
let localDeviceId = "";
let remoteDeviceId = "";
let roomRole = "";
let connectionState = "disconnected";
let helloAccepted = false;
let roomReadySeen = false;
let joinAttempt = 0;
let retryTimer = null;
let lastJoinCode = "";
let suppressRetry = false;
let finalFailureShown = false;

function btLog(label, data = {}) {
  try {
    console.warn(`[TWO_PHONE_BT] ${label} ${JSON.stringify(data || {})}`);
  } catch {
    console.warn(`[TWO_PHONE_BT] ${label}`);
  }
}

function $(id) {
  return document.getElementById(id);
}

function ensureLocalDeviceId() {
  localDeviceId = localStorage.getItem(PEER_KEY) || "";
  if (!localDeviceId) {
    localDeviceId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(PEER_KEY, localDeviceId);
  }
  return localDeviceId;
}

function peerIdOf(value) {
  if (!value || typeof value !== "object") return "";
  return String(value.deviceId || value.fromDeviceId || value.from || value.id || value.senderId || value.peerId || "").trim();
}

function senderIdOf(value) {
  if (!value || typeof value !== "object") return "";
  return String(value.fromDeviceId || value.from || value.senderId || value.deviceId || value.peerId || value.id || "").trim();
}

function targetIdOf(value) {
  if (!value || typeof value !== "object") return "";
  return String(value.toDeviceId || value.to || value.targetDeviceId || value.target || "").trim();
}

function isForLocalDevice(value) {
  const target = targetIdOf(value);
  return !target || target === localDeviceId;
}

function setRoomStatus(message, error = false) {
  const el = $("twoPhoneRoomStatus");
  if (!el) return;
  el.textContent = String(message || "");
  el.classList.toggle("error", !!error);
}

function toast(message) {
  const el = $("miniToast") || $("toast");
  if (!el) return;
  el.textContent = String(message || "");
  el.classList.add("show");
  clearTimeout(window.__twoPhoneBtGuardToastTimer);
  window.__twoPhoneBtGuardToastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

function setConnectionState(next) {
  connectionState = next;
  document.body.dataset.twoPhoneBtState = next;
  document.body.classList.toggle("two-phone-room-full", next === "full");
}

function resetState(reason = "reset") {
  clearTimeout(retryTimer);
  retryTimer = null;
  currentSocket = null;
  remoteDeviceId = "";
  roomRole = "";
  helloAccepted = false;
  roomReadySeen = false;
  suppressRetry = false;
  finalFailureShown = false;
  setConnectionState("disconnected");
  btLog("state reset", { reason });
}

function canAcceptPeer(deviceId) {
  if (!deviceId || deviceId === localDeviceId) return true;
  return !remoteDeviceId || remoteDeviceId === deviceId;
}

function isKnownRemote(deviceId) {
  return !!deviceId && !!remoteDeviceId && deviceId === remoteDeviceId;
}

function rememberRemote(deviceId) {
  if (!deviceId || deviceId === localDeviceId) return false;
  if (!remoteDeviceId) remoteDeviceId = deviceId;
  return remoteDeviceId === deviceId;
}

function safeSendRaw(socket, payload) {
  try {
    if (!socket || socket.readyState !== WebSocket.OPEN) return false;
    socket.__italkyNativeSend(JSON.stringify(payload));
    return true;
  } catch (error) {
    btLog("send failed", { message: error?.message || String(error) });
    return false;
  }
}

function makeIdentityPayload(type) {
  return {
    type,
    deviceId: localDeviceId,
    fromDeviceId: localDeviceId,
    from: localDeviceId,
    role: "two_phone",
    ts: Date.now()
  };
}

function sendHello(socket) {
  const payload = makeIdentityPayload("hello");
  if (safeSendRaw(socket, payload)) btLog("hello sent", { deviceId: localDeviceId, state: connectionState });
}

function sendHelloAck(socket, targetDeviceId, accepted, reason = "") {
  const payload = {
    ...makeIdentityPayload("hello_ack"),
    toDeviceId: targetDeviceId,
    to: targetDeviceId,
    accepted: !!accepted,
    reason: reason || undefined
  };
  safeSendRaw(socket, payload);
  if (accepted) btLog("hello ack accepted", { targetDeviceId });
  else btLog("room_full reject third", { third: targetDeviceId, reason });
}

function rejectRoomFull(socket, targetDeviceId = "") {
  sendHelloAck(socket, targetDeviceId, false, "room_full");
}

function closeRejectedSocket(socket) {
  suppressRetry = true;
  try { socket?.close?.(); } catch {}
}

function showSelfRoomFull() {
  setConnectionState("full");
  setRoomStatus(ROOM_FULL_MESSAGE, true);
  toast(ROOM_FULL_MESSAGE);
}

function rosterIds(data) {
  const roster = Array.isArray(data?.roster) ? data.roster : (Array.isArray(data?.peers) ? data.peers : []);
  return roster.map(peerIdOf).filter(Boolean);
}

function handlePresence(socket, data) {
  const ids = rosterIds(data);
  if (!ids.length) return true;
  const uniqueIds = [...new Set(ids)];
  const myIndex = uniqueIds.indexOf(localDeviceId);
  const remoteCandidates = uniqueIds.filter((id) => id !== localDeviceId);

  if (uniqueIds.length > 2) {
    if (myIndex >= 2 || (!remoteDeviceId && roomRole !== "host" && remoteCandidates.length > 1)) {
      showSelfRoomFull();
      btLog("room_full reject third", { third: localDeviceId, roster: uniqueIds, selfRejected: true });
      closeRejectedSocket(socket);
      return false;
    }

    const allowedRemote = remoteDeviceId || remoteCandidates[0] || "";
    if (allowedRemote) rememberRemote(allowedRemote);
    remoteCandidates.filter((id) => id !== allowedRemote).forEach((id) => rejectRoomFull(socket, id));
    btLog("reset skipped reason=third_party", { roster: uniqueIds, allowedRemote });
    return false;
  }

  if (!remoteDeviceId && remoteCandidates[0]) rememberRemote(remoteCandidates[0]);
  return true;
}

function shouldIgnoreThirdPartyExit(data) {
  const sender = senderIdOf(data) || peerIdOf(data?.peer);
  if (!sender || sender === localDeviceId) return true;
  if (!remoteDeviceId) return false;
  if (sender !== remoteDeviceId) {
    btLog("leave ignored from non-peer", { fromDeviceId: sender, remoteDeviceId, type: data?.type || "unknown" });
    btLog("reset skipped reason=third_party", { fromDeviceId: sender });
    return true;
  }
  return false;
}

function handleGuardPayload(socket, data) {
  const type = String(data?.type || "");
  if (!type) return true;

  if (type === "room_created") {
    roomReadySeen = true;
    setConnectionState("pairing");
    setTimeout(() => sendHello(socket), 80);
    return true;
  }

  if (type === "room_joined") {
    roomReadySeen = true;
    setConnectionState("pairing");
    setTimeout(() => sendHello(socket), 80);
    setTimeout(() => {
      if (!helloAccepted && connectionState === "pairing" && roomRole !== "host") {
        btLog("connect retry n", { attempt: joinAttempt + 1, reason: "hello_ack_pending" });
      }
    }, 1200);
    return true;
  }

  if (type === "presence") return handlePresence(socket, data);

  if (type === "peer_joined") {
    const joinedId = peerIdOf(data?.peer) || senderIdOf(data);
    if (joinedId && !canAcceptPeer(joinedId)) {
      rejectRoomFull(socket, joinedId);
      btLog("room_full reject third", { third: joinedId, remoteDeviceId });
      return false;
    }
    if (joinedId) {
      rememberRemote(joinedId);
      helloAccepted = true;
      setConnectionState("connected");
      sendHelloAck(socket, joinedId, true);
    }
    return true;
  }

  if (type === "hello") {
    const incomingId = peerIdOf(data) || senderIdOf(data);
    if (incomingId && !canAcceptPeer(incomingId)) {
      rejectRoomFull(socket, incomingId);
      btLog("room_full reject third", { third: incomingId, remoteDeviceId });
      setConnectionState("connected");
      return false;
    }
    if (incomingId) {
      rememberRemote(incomingId);
      helloAccepted = true;
      setConnectionState("connected");
      sendHelloAck(socket, incomingId, true);
    }
    return false;
  }

  if (type === "hello_ack") {
    if (!isForLocalDevice(data)) {
      if (data?.reason === "room_full" || data?.accepted === false) {
        btLog("room_full ignored by active peer", { toDeviceId: targetIdOf(data), fromDeviceId: senderIdOf(data) });
      }
      return false;
    }
    if (data?.accepted === false || data?.reason === "room_full") {
      if (connectionState === "connected" && remoteDeviceId) {
        btLog("room_full ignored by active peer", { fromDeviceId: senderIdOf(data), remoteDeviceId });
        return false;
      }
      showSelfRoomFull();
      btLog("room_full reject third", { third: localDeviceId, by: senderIdOf(data), reason: data?.reason || "rejected" });
      closeRejectedSocket(socket);
      return false;
    }
    const ackFrom = senderIdOf(data) || peerIdOf(data);
    if (ackFrom) rememberRemote(ackFrom);
    helloAccepted = true;
    setConnectionState("connected");
    btLog("hello ack accepted", { from: ackFrom || "unknown" });
    return false;
  }

  if (type === "room_full" || type === "rejected") {
    if (!isForLocalDevice(data) || (connectionState === "connected" && remoteDeviceId)) {
      btLog("room_full ignored by active peer", { toDeviceId: targetIdOf(data), fromDeviceId: senderIdOf(data) });
      return false;
    }
    showSelfRoomFull();
    closeRejectedSocket(socket);
    return false;
  }

  if (type === "leave" || type === "peer_left") {
    if (shouldIgnoreThirdPartyExit(data)) return false;
    return true;
  }

  if (type === "host_closed") {
    if (shouldIgnoreThirdPartyExit(data)) return false;
    setRoomStatus("Sohbet sahibi oturumu kapattı.", true);
    toast("Sohbet sahibi oturumu kapattı.");
    resetState("host_closed");
    setTimeout(() => {
      document.body.classList.add("two-phone-room-pending");
    }, 600);
    return false;
  }

  if (type === "message") {
    const sender = senderIdOf(data);
    if (sender && sender !== localDeviceId && remoteDeviceId && sender !== remoteDeviceId) {
      btLog("room_full reject third", { third: sender, reason: "message_from_third_device" });
      return false;
    }
  }

  return true;
}

function maybeScheduleRetry(socket, reason) {
  if (suppressRetry || helloAccepted || roomReadySeen || connectionState === "full") return;
  if (!lastJoinCode || roomRole !== "guest") return;
  if (joinAttempt >= RETRY_DELAYS.length - 1) {
    if (!finalFailureShown) {
      finalFailureShown = true;
      setConnectionState("disconnected");
      setRoomStatus(CONNECT_FAILED_MESSAGE, true);
      btLog("connect failed final", { reason, attempts: RETRY_DELAYS.length });
    }
    return;
  }

  joinAttempt += 1;
  const delay = RETRY_DELAYS[joinAttempt] || 800;
  clearTimeout(retryTimer);
  setRoomStatus("Bağlanıyor…");
  btLog("connect retry n", { attempt: joinAttempt + 1, delay, reason });
  retryTimer = setTimeout(() => {
    const btn = $("twoPhoneConnectRoom");
    if (!btn || helloAccepted || connectionState === "full") return;
    btn.click();
  }, delay);
}

function shouldSendExitPayload() {
  return connectionState !== "full" && !suppressRetry && currentSocket?.readyState === WebSocket.OPEN;
}

function sendExitPayload(socket) {
  if (!shouldSendExitPayload()) return false;
  return safeSendRaw(socket, {
    ...makeIdentityPayload(roomRole === "host" && helloAccepted ? "host_closed" : "leave"),
    toDeviceId: remoteDeviceId || undefined,
    to: remoteDeviceId || undefined
  });
}

function patchSocket(socket, url) {
  if (!WS_ROOM_PATTERN.test(String(url || ""))) return socket;
  ensureLocalDeviceId();
  currentSocket = socket;
  roomReadySeen = false;
  helloAccepted = false;
  setConnectionState("pairing");

  const nativeSend = socket.send.bind(socket);
  const nativeClose = socket.close.bind(socket);
  const nativeAddEventListener = socket.addEventListener.bind(socket);
  socket.__italkyNativeSend = nativeSend;

  socket.send = function guardedSend(raw) {
    let data = null;
    try { data = JSON.parse(raw); } catch {}
    if (data?.type === "create" || data?.type === "join") {
      roomRole = data?.type === "create" ? "host" : "guest";
      setConnectionState("pairing");
      if (roomRole === "guest") {
        lastJoinCode = String(url || "").split("/").pop() || lastJoinCode;
        if (joinAttempt === 0) btLog("connect retry n", { attempt: 1, delay: 0, reason: "join_start" });
      }
    }
    return nativeSend(raw);
  };

  socket.close = function guardedClose(...args) {
    try { sendExitPayload(socket); } catch {}
    return nativeClose(...args);
  };

  let guardedOnMessage = null;
  Object.defineProperty(socket, "onmessage", {
    configurable: true,
    get() { return guardedOnMessage; },
    set(handler) { guardedOnMessage = handler; }
  });

  nativeAddEventListener("message", (event) => {
    let data = null;
    try { data = JSON.parse(event?.data); } catch {}
    btLog("ws message", { type: data?.type || "raw" });
    if (data && !handleGuardPayload(socket, data)) return;
    if (typeof guardedOnMessage === "function") guardedOnMessage.call(socket, event);
  });

  nativeAddEventListener("open", () => {
    btLog("ws open", { url: String(url || ""), state: connectionState });
  });
  nativeAddEventListener("error", () => {
    btLog("connect retry n", { attempt: joinAttempt + 1, reason: "socket_error" });
    setTimeout(() => maybeScheduleRetry(socket, "socket_error"), 40);
  });
  nativeAddEventListener("close", () => {
    if (connectionState === "full") return;
    setTimeout(() => maybeScheduleRetry(socket, "socket_close"), 40);
  });

  return socket;
}

function installWebSocketGuard() {
  if (window.__italkyTwoPhoneWebSocketGuardInstalled) return;
  if (typeof window.WebSocket !== "function") return;
  window.__italkyTwoPhoneWebSocketGuardInstalled = true;
  originalWebSocket = window.WebSocket;

  function GuardedWebSocket(url, protocols) {
    const socket = protocols === undefined ? new originalWebSocket(url) : new originalWebSocket(url, protocols);
    return patchSocket(socket, url);
  }

  GuardedWebSocket.prototype = originalWebSocket.prototype;
  Object.setPrototypeOf(GuardedWebSocket, originalWebSocket);
  ["CONNECTING", "OPEN", "CLOSING", "CLOSED"].forEach((key) => {
    try { GuardedWebSocket[key] = originalWebSocket[key]; } catch {}
  });
  window.WebSocket = GuardedWebSocket;
}

function installUiGuards(homeHref = HOME_HREF) {
  document.addEventListener("click", (event) => {
    const mic = event.target?.closest?.("#botMic");
    if (mic && (!helloAccepted || connectionState === "full")) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      toast(connectionState === "full" ? ROOM_FULL_MESSAGE : "Önce Bluetooth ile diğer telefonu bağlayın.");
      btLog("mic blocked", { state: connectionState, helloAccepted });
      return;
    }

    const join = event.target?.closest?.("#twoPhoneConnectRoom");
    if (join) {
      const input = $("twoPhoneCodeInput");
      const nextCode = String(input?.value || "").replace(/\D/g, "").slice(0, 6);
      if (nextCode !== lastJoinCode) joinAttempt = 0;
      lastJoinCode = nextCode;
      finalFailureShown = false;
      suppressRetry = false;
      btLog("connect retry n", { attempt: 1, delay: 0, reason: "user_join", code: lastJoinCode });
    }

    const home = event.target?.closest?.("#homeLink,#twoPhoneHomeRoom");
    if (home && currentSocket?.readyState === WebSocket.OPEN) {
      sendExitPayload(currentSocket);
      resetState("home_leave");
      setTimeout(() => { if (location.pathname !== homeHref) location.href = homeHref; }, 80);
    }
  }, true);

  window.addEventListener("pagehide", () => {
    if (currentSocket?.readyState === WebSocket.OPEN) sendExitPayload(currentSocket);
    resetState("pagehide");
  });
}

export function installTwoPhoneBluetoothMode(options = {}) {
  if (installed) return;
  installed = true;
  ensureLocalDeviceId();
  installWebSocketGuard();
  installUiGuards(options.homeHref || HOME_HREF);
  installBaseTwoPhoneMode(options);
}
