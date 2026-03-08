import { mountShell } from "/js/ui_shell.js";
import { LANG_POOL } from "/js/lang_pool_full.js";

mountShell({ scroll: "auto" });

const $ = (id) => document.getElementById(id);

const myLang = $("myLang");
const peerLang = $("peerLang");
const roomCode = $("roomCode");
const createRoomBtn = $("createRoomBtn");
const showQrBtn = $("showQrBtn");
const joinCodeBtn = $("joinCodeBtn");
const scanQrBtn = $("scanQrBtn");
const headsetDot = $("headsetDot");
const headsetText = $("headsetText");

const DEFAULT_MY = localStorage.getItem("italky_interpreter_my_lang") || "tr";
const DEFAULT_PEER = localStorage.getItem("italky_interpreter_peer_lang") || "en";

function canonical(code) {
  return String(code || "").toLowerCase().trim();
}

function buildLangOptions() {
  const langs = Array.isArray(LANG_POOL) ? LANG_POOL : [];

  const html = langs
    .map((l) => {
      const code = canonical(l.code);
      const flag = l.flag || "🌐";
      const name = l.name || code.toUpperCase();
      return `<option value="${code}">${flag} ${name}</option>`;
    })
    .join("");

  myLang.innerHTML = html;
  peerLang.innerHTML = html;

  myLang.value = DEFAULT_MY;
  peerLang.value = DEFAULT_PEER;

  if (!myLang.value && langs[0]) myLang.value = canonical(langs[0].code);
  if (!peerLang.value && langs[1]) peerLang.value = canonical(langs[1].code || langs[0].code);
}

function saveLangPrefs() {
  try {
    localStorage.setItem("italky_interpreter_my_lang", myLang.value);
    localStorage.setItem("italky_interpreter_peer_lang", peerLang.value);
  } catch {}
}

function randomRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function setRoomCode(code) {
  roomCode.textContent = code || "------";
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
  if (connected) {
    headsetDot.classList.add("ok");
    headsetText.textContent = "Kulaklık bağlı. Interpreter mod için uygun.";
  } else {
    headsetDot.classList.remove("ok");
    headsetText.textContent = "Kulaklık algılanmadı. Yine de devam edebilirsiniz.";
  }
}

function openRoom(code, mode = "host") {
  const q = new URLSearchParams({
    room: code,
    my: myLang.value,
    peer: peerLang.value,
    mode,
  });
  location.href = `/pages/interpreter_room.html?${q.toString()}`;
}

createRoomBtn?.addEventListener("click", () => {
  saveLangPrefs();
  const code = randomRoomCode();
  setRoomCode(code);
  openRoom(code, "host");
});

showQrBtn?.addEventListener("click", () => {
  saveLangPrefs();
  const current = roomCode.textContent && roomCode.textContent !== "------"
    ? roomCode.textContent.trim()
    : randomRoomCode();
  setRoomCode(current);
  openRoom(current, "host");
});

joinCodeBtn?.addEventListener("click", () => {
  saveLangPrefs();
  const code = prompt("Oda kodunu giriniz:");
  const clean = String(code || "").trim().toUpperCase();
  if (!clean) return;
  setRoomCode(clean);
  openRoom(clean, "guest");
});

scanQrBtn?.addEventListener("click", () => {
  saveLangPrefs();
  alert("QR tarayıcı bir sonraki adımda bağlanacak.");
});

myLang?.addEventListener("change", saveLangPrefs);
peerLang?.addEventListener("change", saveLangPrefs);

buildLangOptions();
paintHeadsetState();
setRoomCode("");
setInterval(paintHeadsetState, 2500);
