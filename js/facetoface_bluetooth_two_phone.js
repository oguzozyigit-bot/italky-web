// Isolated 2 Telefon room-code flow. No Bluetooth, Nearby pairing, FaceToFace AI answer, or local TTS.
import { LANG_POOL, getLangName } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com";
const WS_BASE = API_BASE.replace(/^http/i, "ws");
const MY_LANG_KEY = "italky_bt_my_lang_v1";
const ROOM_KEY = "italky_two_phone_room_code_v1";
const HOME_HREF = "/pages/home.html";
const $ = (id) => document.getElementById(id);
const CONNECT_FAILED_MESSAGE = "Bağlantı kurulamadı. Kodu ve internet bağlantınızı kontrol edip tekrar deneyin.";
const CONNECT_ERROR_GRACE_MS = 2800;

let installed = false;
let roomConnected = false;
let handsFree = false;
let recording = false;
let speakingRemote = false;
let leavingPage = false;
let lastSentText = "";
let lastSentAt = 0;
let restartTimer = null;
let webRecognizer = null;
let allowRemoteTts = false;
let remoteLangState = null;
let roomSocket = null;
let roomCode = "";
let roomRole = "";
let roomReady = false;
let waitingForPeer = false;
let connectAttemptId = 0;
let pendingConnectErrorTimer = null;
let peerId = localStorage.getItem("italky_two_phone_peer_id_v1") || "";

if (!peerId) {
  peerId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  localStorage.setItem("italky_two_phone_peer_id_v1", peerId);
}

const COMMON_LANGS = ["tr", "en", "de", "fr", "es", "it", "ru", "ar", "pt", "nl", "pl", "uk", "fa", "zh", "ja", "ko"];

function canonical(code) {
  return String(code || "").toLowerCase().split("-")[0].trim() || "en";
}

function siteLang() {
  return canonical(
    localStorage.getItem("site_lang") ||
    localStorage.getItem("italky_site_lang_v1") ||
    document.documentElement.lang ||
    navigator.language ||
    "en"
  );
}

function defaultRemoteFor(lang) {
  return canonical(lang) === "tr" ? "en" : "tr";
}

function myLang() {
  return canonical(localStorage.getItem(MY_LANG_KEY) || siteLang() || "en");
}

function remoteLang() {
  return canonical(remoteLangState?.myLang || defaultRemoteFor(myLang()));
}

function langMeta(code) {
  const lang = canonical(code);
  return LANG_POOL.find((item) => canonical(item?.code) === lang) || { code: lang, flag: "🌐" };
}

function langFlag(code) {
  return langMeta(code).flag || "🌐";
}

function langLabel(code) {
  const lang = canonical(code);
  try {
    return getLangName(lang, siteLang()) || getLangName(lang, "en") || lang.toUpperCase();
  } catch {
    return lang.toUpperCase();
  }
}

function langDisplay(code) {
  const lang = canonical(code);
  return `${langFlag(lang)} ${langLabel(lang)}`;
}

function availableLanguages() {
  const seen = new Set();
  const featured = COMMON_LANGS.map((code) => LANG_POOL.find((item) => canonical(item?.code) === code)).filter(Boolean);
  const merged = [...featured, ...LANG_POOL];
  return merged.filter((item) => {
    const code = canonical(item?.code);
    if (!code || seen.has(code)) return false;
    seen.add(code);
    return true;
  });
}

function bcpFor(code) {
  const c = canonical(code);
  return {
    tr: "tr-TR", en: "en-US", de: "de-DE", fr: "fr-FR", it: "it-IT", es: "es-ES",
    ar: "ar-SA", ru: "ru-RU", pt: "pt-PT", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR"
  }[c] || "en-US";
}

function toast(message) {
  const el = $("miniToast") || $("toast");
  if (!el) return;
  el.textContent = String(message || "");
  el.classList.add("show");
  clearTimeout(window.__twoPhoneToastTimer);
  window.__twoPhoneToastTimer = setTimeout(() => el.classList.remove("show"), 1900);
}

function clean(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\b(\S+)( \1\b)+/gi, "$1")
    .trim();
}

function makeCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function formatCode(code) {
  const digits = String(code || "").replace(/\D/g, "").slice(0, 6);
  return digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits;
}

function normalizeCode(code) {
  return String(code || "").replace(/\D/g, "").slice(0, 6);
}

function makeMessageId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getVersionCode() {
  const read = (bridge) => {
    try {
      if (!bridge || typeof bridge.getVersionCode !== "function") return null;
      const value = Number(String(bridge.getVersionCode() ?? "").trim());
      return Number.isFinite(value) && value > 0 ? value : null;
    } catch {
      return null;
    }
  };
  return read(window.AndroidBridge) || read(window.Native) || 83;
}

function injectTwoPhoneCss() {
  if ($("italkyTwoPhoneUxStyle")) return;
  const style = document.createElement("style");
  style.id = "italkyTwoPhoneUxStyle";
  style.textContent = `
    body.bt-premium-mode .two-phone-room-gate{position:fixed;inset:0;z-index:2147483600;display:none;align-items:center;justify-content:center;padding:20px;background:radial-gradient(circle at 50% 0%,rgba(59,130,246,.26),transparent 42%),rgba(2,6,23,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#fff;}
    body.two-phone-room-pending .two-phone-room-gate{display:flex;}
    body.two-phone-room-pending .container{filter:blur(2px);pointer-events:none;}
    body.bt-premium-mode .two-phone-room-card{width:min(92vw,420px);border:1px solid rgba(147,197,253,.25);border-radius:26px;background:linear-gradient(180deg,rgba(15,23,42,.96),rgba(2,6,23,.98));box-shadow:0 28px 80px rgba(0,0,0,.58),inset 0 1px 0 rgba(255,255,255,.07);padding:20px;}
    body.bt-premium-mode .two-phone-room-title{font-size:24px;font-weight:1000;letter-spacing:-.3px;margin:0 0 8px;}
    body.bt-premium-mode .two-phone-room-desc{margin:0 0 18px;color:rgba(219,234,254,.78);font-size:14px;line-height:1.45;font-weight:700;}
    body.bt-premium-mode .two-phone-room-actions{display:grid;gap:10px;margin-top:14px;}
    body.bt-premium-mode .two-phone-room-btn{min-height:52px;border:0;border-radius:16px;padding:0 15px;font:inherit;font-weight:1000;color:#fff;cursor:pointer;background:linear-gradient(135deg,#2563eb,#0891b2);box-shadow:0 14px 30px rgba(37,99,235,.25);}
    body.bt-premium-mode .two-phone-room-btn.secondary{background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);}
    body.bt-premium-mode .two-phone-room-btn.home{background:rgba(15,23,42,.82);border:1px solid rgba(147,197,253,.22);box-shadow:none;}
    body.bt-premium-mode .two-phone-room-code{margin:16px 0 10px;padding:18px;border-radius:20px;text-align:center;font-size:42px;line-height:1;font-weight:1000;letter-spacing:5px;background:rgba(15,23,42,.72);border:1px solid rgba(96,165,250,.24);color:#bfdbfe;}
    body.bt-premium-mode .two-phone-code-input{width:100%;min-height:56px;border-radius:16px;border:1px solid rgba(147,197,253,.28);background:rgba(15,23,42,.72);color:#fff;text-align:center;font-size:28px;font-weight:1000;letter-spacing:4px;outline:none;}
    body.bt-premium-mode .two-phone-room-status{min-height:22px;margin-top:12px;color:#bfdbfe;font-size:13px;font-weight:900;text-align:center;}
    body.bt-premium-mode .two-phone-room-status.error{color:#fca5a5;}
    body.bt-premium-mode .two-phone-lang-bar{width:min(88vw,560px);margin:10px auto 6px;display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:stretch;position:relative;z-index:40;}
    body.bt-premium-mode .two-phone-lang-card{min-width:0;min-height:54px;border:1px solid rgba(147,197,253,.22);border-radius:16px;background:linear-gradient(145deg,rgba(15,23,42,.86),rgba(30,64,175,.24));color:#fff;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:9px 11px;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.07),0 12px 28px rgba(2,6,23,.22);font-family:inherit;text-align:left;}
    body.bt-premium-mode .two-phone-lang-card.readonly{cursor:default;border-color:rgba(45,212,191,.18);background:linear-gradient(145deg,rgba(15,23,42,.78),rgba(20,184,166,.12));}
    body.bt-premium-mode .two-phone-lang-label{color:rgba(191,219,254,.70);font-size:10px;font-weight:1000;letter-spacing:.6px;text-transform:uppercase;white-space:nowrap;}
    body.bt-premium-mode .two-phone-lang-value{margin-top:4px;max-width:100%;color:#fff;font-size:14px;font-weight:1000;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    body.bt-premium-mode .two-phone-lang-arrow{display:flex;align-items:center;justify-content:center;color:#93c5fd;font-weight:1000;font-size:16px;text-shadow:0 0 16px rgba(59,130,246,.45);}
    body.bt-premium-mode .two-phone-remote-pair,.two-phone-bt-status{display:none!important;}
    body.bt-premium-mode .two-phone-footer-seal{display:none!important;}
    body.bt-premium-mode .two-phone-lang-picker{position:fixed;inset:0;z-index:2147483647;display:none;align-items:center;justify-content:center;padding:18px;background:rgba(2,6,23,.72);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);}
    body.bt-premium-mode .two-phone-lang-picker.show{display:flex;}
    body.bt-premium-mode .two-phone-lang-picker-card{width:min(92vw,390px);max-height:min(72vh,560px);display:flex;flex-direction:column;overflow:hidden;border-radius:22px;border:1px solid rgba(147,197,253,.24);background:linear-gradient(180deg,#0f172a,#020617);box-shadow:0 24px 70px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06);}
    body.bt-premium-mode .two-phone-lang-picker-head{padding:15px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-bottom:1px solid rgba(255,255,255,.08);font-size:14px;font-weight:1000;}
    body.bt-premium-mode .two-phone-lang-picker-close{width:36px;height:36px;border:none;border-radius:12px;background:rgba(255,255,255,.08);color:#fff;font-size:18px;font-weight:1000;cursor:pointer;}
    body.bt-premium-mode .two-phone-lang-picker-list{overflow-y:auto;padding:9px;scrollbar-width:none;}
    body.bt-premium-mode .two-phone-lang-picker-list::-webkit-scrollbar{display:none;}
    body.bt-premium-mode .two-phone-lang-option{width:100%;min-height:46px;border:none;border-radius:14px;background:transparent;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:0 12px;font-family:inherit;font-size:14px;font-weight:900;cursor:pointer;}
    body.bt-premium-mode .two-phone-lang-option.active{background:rgba(59,130,246,.18);color:#bfdbfe;}
    body.bt-premium-mode .half-screen > .lang-row{display:none!important;}
    body.bt-premium-mode #topSection .composer-stack{display:none!important;}
    body.bt-premium-mode #botSection .composer-stack{position:relative!important;isolation:isolate!important;}
    body.bt-premium-mode #centerHub #handsFreeToggle,body.bt-premium-mode .center-hub #handsFreeToggle{display:none!important;pointer-events:none!important;}
    body.bt-premium-mode #botSection .composer-stack > #handsFreeToggle{position:absolute!important;left:calc(50% + 50px)!important;top:50%!important;right:auto!important;bottom:auto!important;transform:translateY(-50%)!important;z-index:70!important;width:auto!important;max-width:116px!important;min-height:40px!important;white-space:nowrap!important;padding:7px 10px!important;font-size:10px!important;line-height:1!important;gap:6px!important;flex-shrink:0!important;}
    body.bt-premium-mode #botSection .composer-stack > #handsFreeToggle span{display:inline!important;overflow:visible!important;text-overflow:clip!important;white-space:nowrap!important;}
    body.bt-premium-mode .two-phone-message{transition:font-size .18s ease,opacity .18s ease,transform .18s ease;}
    body.bt-premium-mode .chat-body .two-phone-message{font-size:19px!important;opacity:.54!important;line-height:1.22!important;max-width:86%!important;}
    body.bt-premium-mode .chat-body .two-phone-message.latest,body.bt-premium-mode .chat-body .two-phone-message.is-latest{font-size:31px!important;opacity:1!important;font-weight:1000!important;}
    body.bt-premium-mode #topBody,body.bt-premium-mode #botBody{justify-content:flex-end!important;gap:12px!important;}
    body.bt-premium-mode #botMic.room-mic-disabled{opacity:.52;filter:saturate(.65);box-shadow:none!important;}
    @media(max-width:390px){body.bt-premium-mode .two-phone-room-card{padding:17px;}body.bt-premium-mode .two-phone-room-code{font-size:34px;}body.bt-premium-mode .two-phone-lang-bar{width:min(84vw,340px);gap:6px;margin-top:8px;}body.bt-premium-mode .two-phone-lang-card{min-height:50px;padding:8px 9px;}body.bt-premium-mode .two-phone-lang-value{font-size:13px;}body.bt-premium-mode .chat-body .two-phone-message{font-size:17px!important;}body.bt-premium-mode .chat-body .two-phone-message.latest,body.bt-premium-mode .chat-body .two-phone-message.is-latest{font-size:27px!important;}body.bt-premium-mode #botSection .composer-stack > #handsFreeToggle{left:calc(50% + 42px)!important;width:auto!important;height:38px!important;min-height:38px!important;max-width:112px!important;padding:6px 8px!important;justify-content:center!important;gap:5px!important;font-size:9px!important;}body.bt-premium-mode #botSection .composer-stack > #handsFreeToggle span{display:inline!important;font-size:9px!important;line-height:1!important;max-width:76px!important;overflow:visible!important;text-overflow:clip!important;}body.bt-premium-mode #botSection .composer-stack > #handsFreeToggle svg{width:15px!important;height:15px!important;flex:0 0 auto!important;}}
  `;
  document.head.appendChild(style);
}

function ensureRoomGate() {
  injectTwoPhoneCss();
  let gate = $("twoPhoneRoomGate");
  if (gate) return gate;
  gate = document.createElement("div");
  gate.id = "twoPhoneRoomGate";
  gate.className = "two-phone-room-gate";
  document.body.appendChild(gate);
  return gate;
}

function renderRoomHome(status = "") {
  const gate = ensureRoomGate();
  gate.innerHTML = `
    <div class="two-phone-room-card" role="dialog" aria-modal="true" aria-labelledby="twoPhoneRoomTitle">
      <h2 id="twoPhoneRoomTitle" class="two-phone-room-title">İki telefonla görüşme</h2>
      <p class="two-phone-room-desc">Bir telefonda görüşme başlatın, diğer telefonda kodu girerek katılın.</p>
      <div class="two-phone-room-actions">
        <button id="twoPhoneCreateRoom" class="two-phone-room-btn" type="button">Görüşme başlat</button>
        <button id="twoPhoneJoinRoom" class="two-phone-room-btn secondary" type="button">Görüşmeye katıl</button>
        <button id="twoPhoneHomeRoom" class="two-phone-room-btn home" type="button">Ana sayfaya dön</button>
      </div>
      <div id="twoPhoneRoomStatus" class="two-phone-room-status">${status}</div>
    </div>`;
  $("twoPhoneCreateRoom")?.addEventListener("click", () => showHostRoom());
  $("twoPhoneJoinRoom")?.addEventListener("click", () => showJoinRoom());
  $("twoPhoneHomeRoom")?.addEventListener("click", goHome);
}

function showRoomGate(status = "") {
  document.body.classList.add("two-phone-room-pending");
  renderRoomHome(status);
}

function hideRoomGate() {
  document.body.classList.remove("two-phone-room-pending");
}

function setGateStatus(message, error = false) {
  const el = $("twoPhoneRoomStatus");
  if (!el) return;
  el.textContent = String(message || "");
  el.classList.toggle("error", !!error);
}

function clearPendingConnectError() {
  clearTimeout(pendingConnectErrorTimer);
  pendingConnectErrorTimer = null;
}

function scheduleConnectError(attemptId, message = CONNECT_FAILED_MESSAGE) {
  clearPendingConnectError();
  pendingConnectErrorTimer = setTimeout(() => {
    if (attemptId !== connectAttemptId || roomReady || roomConnected || leavingPage) return;
    setGateStatus(message, true);
  }, CONNECT_ERROR_GRACE_MS);
}

function showHostRoom() {
  const code = makeCode();
  roomCode = code;
  localStorage.setItem(ROOM_KEY, code);
  const gate = ensureRoomGate();
  gate.innerHTML = `
    <div class="two-phone-room-card" role="dialog" aria-modal="true">
      <h2 class="two-phone-room-title">Görüşme kodunuz</h2>
      <p class="two-phone-room-desc">Bu kodu karşı telefona girin.</p>
      <div class="two-phone-room-code">${formatCode(code)}</div>
      <div id="twoPhoneRoomStatus" class="two-phone-room-status">Bağlanıyor…</div>
      <div class="two-phone-room-actions">
        <button id="twoPhoneRoomBack" class="two-phone-room-btn secondary" type="button">Geri</button>
        <button id="twoPhoneHomeRoom" class="two-phone-room-btn home" type="button">Ana sayfaya dön</button>
      </div>
    </div>`;
  $("twoPhoneRoomBack")?.addEventListener("click", () => {
    closeRoomSocket();
    renderRoomHome();
  });
  $("twoPhoneHomeRoom")?.addEventListener("click", goHome);
  connectRoom("host", code);
}

function showJoinRoom() {
  const gate = ensureRoomGate();
  gate.innerHTML = `
    <div class="two-phone-room-card" role="dialog" aria-modal="true">
      <h2 class="two-phone-room-title">Görüşme kodunu girin</h2>
      <p class="two-phone-room-desc">Karşı telefonda görünen 6 haneli kodu yazın.</p>
      <input id="twoPhoneCodeInput" class="two-phone-code-input" inputmode="numeric" maxlength="7" autocomplete="one-time-code" placeholder="482 913" />
      <div id="twoPhoneRoomStatus" class="two-phone-room-status"></div>
      <div class="two-phone-room-actions">
        <button id="twoPhoneConnectRoom" class="two-phone-room-btn" type="button">Bağlan</button>
        <button id="twoPhoneRoomBack" class="two-phone-room-btn secondary" type="button">Geri</button>
        <button id="twoPhoneHomeRoom" class="two-phone-room-btn home" type="button">Ana sayfaya dön</button>
      </div>
    </div>`;
  const input = $("twoPhoneCodeInput");
  input?.addEventListener("input", () => { input.value = formatCode(input.value); });
  input?.addEventListener("keydown", (event) => { if (event.key === "Enter") connectRoom("guest", input.value); });
  $("twoPhoneConnectRoom")?.addEventListener("click", () => connectRoom("guest", input?.value || ""));
  $("twoPhoneRoomBack")?.addEventListener("click", () => renderRoomHome());
  $("twoPhoneHomeRoom")?.addEventListener("click", goHome);
  setTimeout(() => input?.focus(), 120);
}

function closeRoomSocket() {
  clearPendingConnectError();
  try { roomSocket?.close(); } catch {}
  roomSocket = null;
  roomReady = false;
  waitingForPeer = false;
}

function connectRoom(role, rawCode) {
  const code = normalizeCode(rawCode);
  if (code.length !== 6) {
    setGateStatus(CONNECT_FAILED_MESSAGE, true);
    return;
  }

  closeRoomSocket();
  const attemptId = ++connectAttemptId;
  roomCode = code;
  roomRole = role;
  roomReady = false;
  waitingForPeer = role === "host";
  setGateStatus("Bağlanıyor…");

  const ws = new WebSocket(`${WS_BASE}/api/f2f/ws/${encodeURIComponent(code)}`);
  roomSocket = ws;

  ws.onopen = () => {
    const type = role === "host" ? "create" : "join";
    ws.send(JSON.stringify({ type, from: peerId, from_name: "italkyAI", me_lang: myLang(), role }));
  };

  ws.onmessage = (event) => {
    let data = null;
    try { data = JSON.parse(event.data); } catch { return; }
    handleRoomPayload(data);
  };

  ws.onerror = () => scheduleConnectError(attemptId);
  ws.onclose = () => {
    if (leavingPage) return;
    const wasConnected = roomConnected;
    setConnected(false, false);
    if (wasConnected) showRoomGate("Bağlantı kapandı. Tekrar bağlanabilir veya ana sayfaya dönebilirsiniz.");
    else if (!roomReady) scheduleConnectError(attemptId);
  };
}

function findRemoteFromRoster(roster) {
  if (!Array.isArray(roster)) return null;
  return roster.find((p) => String(p?.from || p?.id || "") !== peerId) || null;
}

function handleRoomPayload(data) {
  const type = String(data?.type || "");

  if (type === "room_created") {
    roomReady = true;
    setGateStatus("Kod hazır. Karşı telefonun katılması bekleniyor.");
    sendLangState();
    return;
  }

  if (type === "room_joined") {
    roomReady = true;
    clearPendingConnectError();
    enterConversation();
    sendLangState();
    return;
  }

  if (type === "room_not_found") {
    scheduleConnectError(connectAttemptId);
    return;
  }

  if (type === "peer_joined") {
    const peer = data?.peer || findRemoteFromRoster(data?.roster);
    if (peer?.me_lang) handleLangState({ myLang: peer.me_lang });
    if (roomRole === "host" && waitingForPeer) enterConversation();
    sendLangState();
    return;
  }

  if (type === "presence") {
    const roster = Array.isArray(data?.roster) ? data.roster : (Array.isArray(data?.peers) ? data.peers : []);
    const remote = findRemoteFromRoster(roster);
    if (remote?.me_lang) handleLangState({ myLang: remote.me_lang });
    if (roomRole === "host" && waitingForPeer && roster.length >= 2) enterConversation();
    return;
  }

  if (type === "profile_updated" || type === "language_update") {
    const peer = data?.peer || data;
    const sender = String(peer?.from || peer?.senderId || data?.from || data?.senderId || "");
    const lang = peer?.me_lang || peer?.lang || data?.me_lang || data?.lang;
    if ((!sender || sender !== peerId) && lang) handleLangState({ myLang: lang });
    return;
  }

  if (type === "peer_left") {
    setConnected(false, false);
    showRoomGate("Bağlantı kapandı. Tekrar bağlanabilir veya ana sayfaya dönebilirsiniz.");
    return;
  }

  if (type === "message") handleRoomMessage(data);
}

function enterConversation() {
  waitingForPeer = false;
  roomReady = true;
  clearPendingConnectError();
  hideRoomGate();
  setConnected(true, true);
  clearPanel("top");
  clearPanel("bot");
  toast("Bağlandı. Konuşmaya başlayabilirsiniz.");
}

function sendRoomJson(data) {
  try {
    if (!roomSocket || roomSocket.readyState !== WebSocket.OPEN) return false;
    roomSocket.send(JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn("[TWO_PHONE_ROOM] send failed", e);
    return false;
  }
}

function sendLangState() {
  if (!roomSocket || roomSocket.readyState !== WebSocket.OPEN) return;
  const lang = myLang();
  sendRoomJson({ type: "profile_sync", from: peerId, from_name: "italkyAI", me_lang: lang, role: roomRole });
}

function sendLeave() {
  closeRoomSocket();
}

function goHome() {
  if (leavingPage) return;
  leavingPage = true;
  sendLeave();
  location.href = HOME_HREF;
}

function handleLangState(payload) {
  const lang = canonical(payload.myLang || payload.me_lang || payload.lang || "");
  if (!lang) return;
  remoteLangState = { myLang: lang, myLangName: langLabel(lang), myFlag: langFlag(lang) };
  updateLanguageUi();
}

function ensureLanguageUi() {
  injectTwoPhoneCss();
  const topSection = $("topSection");
  if (!topSection || $("twoPhoneLangBar")) return;

  const bar = document.createElement("div");
  bar.id = "twoPhoneLangBar";
  bar.className = "two-phone-lang-bar";
  bar.innerHTML = `
    <button id="twoPhoneMyLang" class="two-phone-lang-card" type="button">
      <span class="two-phone-lang-label">Benim Dilim</span>
      <span class="two-phone-lang-value"></span>
    </button>
    <div class="two-phone-lang-arrow" aria-hidden="true">↔</div>
    <div id="twoPhoneRemoteLang" class="two-phone-lang-card readonly" role="status" aria-live="polite">
      <span class="two-phone-lang-label">Karşı Dil</span>
      <span class="two-phone-lang-value"></span>
    </div>`;

  const remotePair = document.createElement("div");
  remotePair.id = "twoPhoneRemotePair";
  remotePair.className = "two-phone-remote-pair";
  const status = document.createElement("div");
  status.id = "twoPhoneBtStatus";
  status.className = "two-phone-bt-status";

  const hint = $("premiumBtHint");
  if (hint?.nextSibling) {
    topSection.insertBefore(bar, hint.nextSibling);
    topSection.insertBefore(remotePair, bar.nextSibling);
    topSection.insertBefore(status, remotePair.nextSibling);
  } else {
    topSection.insertBefore(bar, topSection.firstChild);
    topSection.insertBefore(remotePair, bar.nextSibling);
    topSection.insertBefore(status, remotePair.nextSibling);
  }

  $("twoPhoneMyLang")?.addEventListener("click", () => openLanguagePicker());
  updateLanguageUi();
  ensureFooterSeal();
}

function ensureFooterSeal() {
  $("twoPhoneFooterSeal")?.remove();
}

function updateLanguageUi() {
  const mine = myLang();
  const remote = remoteLangState?.myLang ? canonical(remoteLangState.myLang) : "";
  const myEl = $("twoPhoneMyLang")?.querySelector(".two-phone-lang-value");
  const remoteEl = $("twoPhoneRemoteLang")?.querySelector(".two-phone-lang-value");
  if (myEl) myEl.textContent = langDisplay(mine);
  if (remoteEl) remoteEl.textContent = remote ? langDisplay(remote) : "Bekleniyor";
  setRemotePair(remote || defaultRemoteFor(mine), mine);
}

function openLanguagePicker() {
  const current = myLang();
  let picker = $("twoPhoneLangPicker");
  if (!picker) {
    picker = document.createElement("div");
    picker.id = "twoPhoneLangPicker";
    picker.className = "two-phone-lang-picker";
    document.body.appendChild(picker);
    picker.addEventListener("click", (event) => {
      if (event.target === picker) picker.classList.remove("show");
    });
  }

  const list = availableLanguages().map((lang) => {
    const code = canonical(lang.code);
    const active = code === current ? " active" : "";
    return `<button class="two-phone-lang-option${active}" type="button" data-code="${code}"><span>${lang.flag || "🌐"} ${langLabel(code)}</span><small>${code.toUpperCase()}</small></button>`;
  }).join("");

  picker.innerHTML = `
    <div class="two-phone-lang-picker-card">
      <div class="two-phone-lang-picker-head">
        <span>Benim Dilim</span>
        <button class="two-phone-lang-picker-close" type="button" aria-label="Kapat">×</button>
      </div>
      <div class="two-phone-lang-picker-list">${list}</div>
    </div>`;

  picker.querySelector(".two-phone-lang-picker-close")?.addEventListener("click", () => picker.classList.remove("show"));
  picker.querySelectorAll(".two-phone-lang-option").forEach((button) => {
    button.addEventListener("click", () => {
      const code = canonical(button.getAttribute("data-code"));
      localStorage.setItem(MY_LANG_KEY, code);
      updateLanguageUi();
      sendLangState();
      picker.classList.remove("show");
    });
  });
  picker.classList.add("show");
}

function setRemotePair(source, target) {
  const el = $("twoPhoneRemotePair");
  if (!el) return;
  const src = canonical(source || "auto");
  const dst = canonical(target || myLang());
  el.textContent = `${src === "auto" ? "Otomatik" : langDisplay(src)} → ${langDisplay(dst)}`;
}

function clearPanel(side) {
  const body = side === "top" ? $("topBody") : $("botBody");
  if (body) body.innerHTML = "";
}

function addLine(side, text, latest = false) {
  const body = side === "top" ? $("topBody") : $("botBody");
  if (!body) return null;
  body.querySelectorAll(".bubble.latest,.bubble.is-latest").forEach((x) => x.classList.remove("latest", "is-latest"));
  const div = document.createElement("div");
  div.className = `bubble two-phone-message${latest ? " latest is-latest" : ""}`;
  div.textContent = String(text || "");
  body.appendChild(div);
  requestAnimationFrame(() => {
    try { body.scrollTop = body.scrollHeight; } catch {}
  });
  return div;
}

function setMicListening(value) { $("botMic")?.classList.toggle("listening", !!value); }
function updateMicAvailability() {
  const mic = $("botMic");
  if (!mic) return;
  mic.classList.toggle("room-mic-disabled", !roomConnected);
  mic.setAttribute("aria-disabled", String(!roomConnected));
}

function stopSpeech() {
  recording = false;
  setMicListening(false);
  try {
    if (window.Native?.stopSpeechRecognition) window.Native.stopSpeechRecognition();
    else if (window.AndroidBridge?.stopSpeechRecognition) window.AndroidBridge.stopSpeechRecognition();
    else if (webRecognizer) webRecognizer.stop();
  } catch {}
  webRecognizer = null;
}

function installTtsGuard() {
  if (window.__italkyTwoPhoneTtsGuardInstalled) return;
  window.__italkyTwoPhoneTtsGuardInstalled = true;
  const wrap = (owner, key) => {
    try {
      if (!owner || typeof owner[key] !== "function" || owner[key].__italkyTwoPhoneGuarded) return;
      const original = owner[key].bind(owner);
      const guarded = function (...args) {
        if (!allowRemoteTts) {
          console.warn("[TWO_PHONE_ROOM] blocked local TTS");
          return undefined;
        }
        return original(...args);
      };
      guarded.__italkyTwoPhoneGuarded = true;
      owner[key] = guarded;
    } catch {}
  };
  wrap(window.AndroidBridge, "speak");
  wrap(window.NativeTTS, "speak");
  wrap(window.speechSynthesis, "speak");
}

async function translateIncoming(text, from, to) {
  const payload = {
    text: clean(text), from_lang: canonical(from || "auto"), to_lang: canonical(to),
    source: canonical(from || "auto"), target: canonical(to), mode: "normal", use_ai: false, cultural: false, tone: "neutral"
  };
  const endpoints = [`${API_BASE}/api/translate_ai`, `${API_BASE}/api/translate-ai`, `${API_BASE}/api/translate`];
  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => null);
      const value = clean(data?.translated || data?.translation || data?.text || "");
      if (res.ok && value) return value;
    } catch {}
  }
  return null;
}

function speakRemoteTranslation(text, lang) {
  const value = clean(text);
  if (!value) return;
  speakingRemote = true;
  allowRemoteTts = true;
  try {
    installTtsGuard();
    if (window.AndroidBridge?.speak) window.AndroidBridge.speak(value, canonical(lang));
    else if (window.NativeTTS?.speak) window.NativeTTS.speak(value, canonical(lang));
    else if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(value);
      utterance.lang = bcpFor(lang);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  } catch {}
  finally { allowRemoteTts = false; }
  setTimeout(() => {
    speakingRemote = false;
    restartHandsFreeIfNeeded();
  }, Math.max(2600, value.length * 70));
}

function sendLocalSpeech(text) {
  const value = clean(text);
  if (!value) { restartHandsFreeIfNeeded(); return; }
  if (!roomConnected) { toast("Önce görüşme bağlantısı kurun."); restartHandsFreeIfNeeded(); return; }
  const now = Date.now();
  if (value === lastSentText && now - lastSentAt < 2500) return;
  const src = myLang();
  const dst = remoteLang();
  lastSentText = value;
  lastSentAt = now;
  const ok = sendRoomJson({ type: "message", text: value, lang: src, messageId: makeMessageId(), targetLang: dst, origin: "local_speech", sentAt: now });
  if (!ok) toast("Mesaj gönderilemedi.");
  addLine("bot", value, true);
  setRemotePair(src, dst);
  restartHandsFreeIfNeeded();
}

async function handleRoomMessage(data) {
  const incomingText = clean(data?.text || data?.message || "");
  if (!incomingText) return;
  const target = myLang();
  const source = canonical(data?.lang || data?.sourceLang || remoteLang());
  handleLangState({ myLang: source });
  setRemotePair(source, target);
  const row = addLine("top", "Çevriliyor...", true);
  const translated = await translateIncoming(incomingText, source, target);
  const finalText = translated || "Çeviri alınamadı.";
  if (row) row.textContent = finalText;
  if (translated) speakRemoteTranslation(translated, target);
}

function parseSpeechResult(arg1, arg2, arg3) {
  let text = "";
  let isFinal = true;
  if (typeof arg1 === "string" && (arg1 === "top" || arg1 === "bot")) {
    text = String(arg2 || ""); isFinal = arg3 !== false;
  } else if (typeof arg1 === "string") {
    try { const data = JSON.parse(arg1); text = String(data?.text || data?.transcript || ""); isFinal = data?.isFinal !== false && data?.final !== false; }
    catch { text = arg1; isFinal = arg3 !== false; }
  } else if (arg1 && typeof arg1 === "object") {
    text = String(arg1.text || arg1.transcript || ""); isFinal = arg1.isFinal !== false && arg1.final !== false;
  }
  return { text: clean(text), isFinal };
}

function handleSpeechResult(arg1, arg2, arg3) {
  const result = parseSpeechResult(arg1, arg2, arg3);
  if (!roomConnected || !result.isFinal) return;
  recording = false;
  setMicListening(false);
  sendLocalSpeech(result.text);
}

function handleSpeechError(errorMsg) {
  const code = String(errorMsg || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  recording = false;
  setMicListening(false);
  if (["manual_stop_empty", "no_speech", "no_match", "speech_timeout", "timeout", "empty", "empty_result", "client_error", "recognizer_busy"].includes(code)) {
    restartHandsFreeIfNeeded();
    return;
  }
  if (code.includes("permission")) toast("Mikrofon izni gerekli.");
  else if (handsFree) {
    restartHandsFreeIfNeeded();
    return;
  }
  else toast("Mikrofon başlatılamadı.");
  restartHandsFreeIfNeeded();
}

function startSpeech() {
  if (!roomConnected) { toast("Önce görüşme bağlantısı kurun."); showRoomGate(); return; }
  if (recording) { stopSpeech(); return; }
  const lang = bcpFor(myLang());
  recording = true;
  setMicListening(true);
  try {
    if (window.Native?.startSpeechRecognition) { window.Native.startSpeechRecognition(lang, "bot"); return; }
    if (window.AndroidBridge?.startSpeechRecognition) { window.AndroidBridge.startSpeechRecognition(lang, "bot"); return; }
  } catch (e) { console.warn("[TWO_PHONE_ROOM] native speech start failed", e); }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) { recording = false; setMicListening(false); toast("Bu cihazda konuşma tanıma hazır değil."); return; }
  const rec = new SpeechRecognition();
  webRecognizer = rec;
  rec.lang = lang;
  rec.continuous = false;
  rec.interimResults = true;
  rec.onresult = (event) => {
    let finalText = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) if (event.results[i].isFinal) finalText += event.results[i][0]?.transcript || "";
    if (finalText) handleSpeechResult("bot", finalText, true);
  };
  rec.onerror = (event) => handleSpeechError(event?.error || "speech_error");
  rec.onend = () => { if (recording) { recording = false; setMicListening(false); restartHandsFreeIfNeeded(); } };
  try { rec.start(); }
  catch (e) { console.warn("[TWO_PHONE_ROOM] web speech start failed", e); handleSpeechError("start_error"); }
}

function restartHandsFreeIfNeeded() {
  clearTimeout(restartTimer);
  if (!handsFree || !roomConnected || recording || speakingRemote) return;
  restartTimer = setTimeout(() => {
    if (handsFree && roomConnected && !recording && !speakingRemote) startSpeech();
  }, 900 + Math.floor(Math.random() * 500));
}

function setConnected(value, notify = true) {
  const wasConnected = roomConnected;
  roomConnected = !!value;
  window.isBtConnected = roomConnected;
  document.body.classList.toggle("bt-active", roomConnected);
  $("btToggleBtn")?.classList.toggle("connected", roomConnected);
  updateMicAvailability();
  const hf = $("handsFreeToggle");
  if (hf) {
    hf.style.display = roomConnected ? "inline-flex" : "none";
    if (!roomConnected) hf.classList.remove("active");
  }
  if (roomConnected) {
    sendLangState();
    setTimeout(sendLangState, 700);
  } else {
    handsFree = false;
    remoteLangState = null;
    stopSpeech();
    updateLanguageUi();
    if (wasConnected && notify) toast("Görüşme bağlantısı kapandı.");
  }
}

function bindControls(options = {}) {
  const botMic = $("botMic");
  const roomBtn = $("btToggleBtn");
  const hfBtn = $("handsFreeToggle");
  const clearBtn = $("clearBtn") || $("sideClearBtn");
  const homeLink = $("homeLink");
  const homeHref = options.homeHref || HOME_HREF;

  botMic?.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation?.(); startSpeech(); }, true);
  botMic?.addEventListener("keydown", (event) => { if (event.key !== "Enter" && event.key !== " ") return; event.preventDefault(); event.stopPropagation(); startSpeech(); }, true);
  roomBtn?.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); showRoomGate(); }, true);
  hfBtn?.addEventListener("click", (event) => {
    event.preventDefault(); event.stopPropagation(); handsFree = !handsFree; hfBtn.classList.toggle("active", handsFree);
    if (handsFree) startSpeech(); else stopSpeech();
  }, true);
  clearBtn?.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); clearPanel("top"); clearPanel("bot"); }, true);
  homeLink?.addEventListener("click", (event) => { event.preventDefault(); leavingPage = true; sendLeave(); setTimeout(() => { location.href = homeHref; }, 80); }, true);
}

function bindBridge() {
  installTtsGuard();
  window.onNativeSpeechResult = handleSpeechResult;
  window.onNativeSpeechError = handleSpeechError;
  window.__italkyStartHandsFreeListening = () => startSpeech();
  window.addEventListener("pagehide", () => { if (roomConnected && !leavingPage) sendLeave(); });
}

export function installTwoPhoneBluetoothMode(options = {}) {
  if (installed) return;
  installed = true;
  if (!localStorage.getItem(MY_LANG_KEY)) localStorage.setItem(MY_LANG_KEY, siteLang() || "en");
  ensureLanguageUi();
  bindControls(options);
  bindBridge();
  setConnected(false, false);
  showRoomGate();
}
