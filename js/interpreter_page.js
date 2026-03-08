import { mountShell } from "/js/ui_shell.js";
import { LANG_POOL } from "/js/lang_pool_full.js";

mountShell({ scroll: "auto" });

const $ = (id) => document.getElementById(id);

const myLang = $("myLang");
const createQrBtn = $("createQrBtn");
const scanQrBtn = $("scanQrBtn");
const headsetDot = $("headsetDot");
const headsetText = $("headsetText");

const DEFAULT_MY = localStorage.getItem("italky_interpreter_my_lang") || "tr";

function canonical(code) {
  return String(code || "").toLowerCase().trim();
}

function buildLangOptions() {
  const langs = Array.isArray(LANG_POOL) ? LANG_POOL : [];

  myLang.innerHTML = langs
    .map((l) => {
      const code = canonical(l.code);
      const flag = l.flag || "🌐";
      const name = l.name || code.toUpperCase();
      return `<option value="${code}">${flag} ${name}</option>`;
    })
    .join("");

  myLang.value = DEFAULT_MY;
  if (!myLang.value && langs[0]) myLang.value = canonical(langs[0].code);
}

function saveLangPref() {
  try {
    localStorage.setItem("italky_interpreter_my_lang", myLang.value);
  } catch {}
}

function randomToken() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
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
    headsetText.textContent = "Kulaklık algılanmadı. Yine de devam edebilirsiniz.";
  }
}

function goHost() {
  saveLangPref();
  const room = randomToken();
  const q = new URLSearchParams({
    room,
    my: myLang.value,
    mode: "host",
  });
  location.href = `/pages/interpreter_qr_host.html?${q.toString()}`;
}

function goScan() {
  saveLangPref();
  const q = new URLSearchParams({
    my: myLang.value,
    mode: "guest",
  });
  location.href = `/pages/interpreter_qr_scan.html?${q.toString()}`;
}

createQrBtn?.addEventListener("click", goHost);
scanQrBtn?.addEventListener("click", goScan);
myLang?.addEventListener("change", saveLangPref);

buildLangOptions();
paintHeadsetState();
setInterval(paintHeadsetState, 2500);
