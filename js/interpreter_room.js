import { mountShell } from "/js/ui_shell.js";
import { LANG_POOL } from "/js/lang_pool_full.js";

mountShell({ scroll: "auto" });

const $ = (id) => document.getElementById(id);

const roomCodeEl = $("roomCode");
const myLangView = $("myLangView");
const peerLangView = $("peerLangView");
const pairDot = $("pairDot");
const pairText = $("pairText");
const headsetDot = $("headsetDot");
const headsetText = $("headsetText");
const qrBox = $("qrBox");
const copyCodeBtn = $("copyCodeBtn");
const shareBtn = $("shareBtn");
const scanAgainBtn = $("scanAgainBtn");
const startLiveBtn = $("startLiveBtn");

function canonical(code) {
  return String(code || "").toLowerCase().trim();
}

function getLangLabel(code) {
  const c = canonical(code);
  const item = (Array.isArray(LANG_POOL) ? LANG_POOL : []).find(
    (x) => canonical(x.code) === c
  );
  if (!item) return c.toUpperCase() || "—";
  return `${item.flag || "🌐"} ${item.name || c.toUpperCase()}`;
}

function getHeadsetState() {
  try {
    if (window.Android && typeof window.Android.isHeadsetConnected === "function") {
      return !!window.Android.isHeadsetConnected();
    }
  } catch {}
  return false;
}

function paintHeadsetState() {
  const connected = getHeadsetState();
  headsetDot.classList.remove("ok", "warn");
  if (connected) {
    headsetDot.classList.add("ok");
    headsetText.textContent = "Kulaklık bağlı. Interpreter Mode için uygun.";
  } else {
    headsetDot.classList.add("warn");
    headsetText.textContent = "Kulaklık algılanmadı. İsterseniz yine devam edebilirsiniz.";
  }
}

function getParams() {
  const u = new URL(location.href);
  return {
    room: (u.searchParams.get("room") || "").trim().toUpperCase(),
    my: canonical(u.searchParams.get("my") || "tr"),
    peer: canonical(u.searchParams.get("peer") || "en"),
    mode: (u.searchParams.get("mode") || "host").trim(),
  };
}

function paintRoom() {
  const p = getParams();

  roomCodeEl.textContent = p.room || "------";
  myLangView.textContent = getLangLabel(p.my);
  peerLangView.textContent = getLangLabel(p.peer);

  const shareText = `italkyAI Interpreter Room\nKod: ${p.room || "------"}\nDil: ${p.my.toUpperCase()} ↔ ${p.peer.toUpperCase()}`;
  qrBox.textContent = shareText;
}

function setWaitingState() {
  pairDot.classList.remove("ok", "warn");
  pairText.textContent = "Karşı taraf bekleniyor...";
}

async function copyCode() {
  const code = roomCodeEl.textContent.trim();
  if (!code || code === "------") return;

  try {
    await navigator.clipboard.writeText(code);
    pairDot.classList.remove("warn");
    pairDot.classList.add("ok");
    pairText.textContent = "Oda kodu kopyalandı.";
    setTimeout(setWaitingState, 1400);
  } catch {
    pairDot.classList.remove("ok");
    pairDot.classList.add("warn");
    pairText.textContent = "Kod kopyalanamadı.";
    setTimeout(setWaitingState, 1400);
  }
}

async function shareRoom() {
  const p = getParams();
  const text = `italkyAI Interpreter Room\nKod: ${p.room || "------"}\nDiller: ${p.my.toUpperCase()} ↔ ${p.peer.toUpperCase()}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: "Interpreter Room", text });
      return;
    } catch {}
  }

  try {
    await navigator.clipboard.writeText(text);
    pairDot.classList.remove("warn");
    pairDot.classList.add("ok");
    pairText.textContent = "Paylaşım metni panoya kopyalandı.";
    setTimeout(setWaitingState, 1400);
  } catch {
    alert(text);
  }
}

function goToLive() {
  const p = getParams();
  const q = new URLSearchParams({
    room: p.room,
    my: p.my,
    peer: p.peer,
    mode: p.mode,
  });
  location.href = `/pages/interpreter_live.html?${q.toString()}`;
}

function scanAgain() {
  alert("QR tarama ve katılımcı eşleştirme bir sonraki adımda bağlanacak.");
}

copyCodeBtn?.addEventListener("click", copyCode);
shareBtn?.addEventListener("click", shareRoom);
scanAgainBtn?.addEventListener("click", scanAgain);
startLiveBtn?.addEventListener("click", goToLive);

paintRoom();
paintHeadsetState();
setWaitingState();
setInterval(paintHeadsetState, 2500);
