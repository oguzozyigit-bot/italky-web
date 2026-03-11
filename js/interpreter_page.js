// FILE: /js/interpreter_page.js

import { mountShell } from "/js/ui_shell.js";
import { LANG_POOL } from "/js/lang_pool_full.js";
import { supabase } from "/js/supabase_client.js";
import { startNFCJoin } from "/js/nfc_pair.js";

mountShell({ scroll: "auto" });

const $ = (id) => document.getElementById(id);

const myLang = $("myLang");
const createQrBtn = $("createQrBtn");
const scanQrBtn = $("scanQrBtn");
const hostCodeText = $("hostCodeText");

const HOST_CODE_KEY = "italky_interpreter_host_code";
const MY_LANG_KEY = "italky_interpreter_my_lang";

let stableHostCode = "";

function canonical(code) {
  return String(code || "").toLowerCase().trim();
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
}

function randomCode() {
  return "ITK" + Math.random().toString(36).slice(2, 10).toUpperCase();
}

function buildLangOptions() {
  const langs = Array.isArray(LANG_POOL) ? LANG_POOL : [];

  if (!myLang) return;

  myLang.innerHTML = langs.map((l) => {
    const code = canonical(l.code);
    return `<option value="${code}">
      ${l.flag || "🌐"} ${l.name || code.toUpperCase()}
    </option>`;
  }).join("");

  myLang.value = localStorage.getItem(MY_LANG_KEY) || "tr";
}

function saveLang() {
  try {
    if (myLang) {
      localStorage.setItem(MY_LANG_KEY, myLang.value);
    }
  } catch {}
}

async function getCurrentUser() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user || null;
  } catch {
    return null;
  }
}

function deriveCodeFromUser(user) {
  const meta = user?.user_metadata || {};

  const candidates = [
    localStorage.getItem("membership_no"),
    localStorage.getItem("uyelik_no"),
    localStorage.getItem("member_no"),
    meta.membership_no,
    meta.uyelik_no,
    meta.member_no,
    meta.user_no,
    user?.id,
    user?.email?.split("@")?.[0]
  ];

  for (const raw of candidates) {
    const code = slugify(raw);
    if (code && code.length >= 6) {
      return "ITK-" + code.slice(0, 10);
    }
  }

  return "";
}

async function ensureStableHostCode() {
  try {
    const existing = localStorage.getItem(HOST_CODE_KEY);

    if (existing && String(existing).trim()) {
      stableHostCode = String(existing).trim();
      return stableHostCode;
    }
  } catch {}

  const user = await getCurrentUser();

  const derived =
    deriveCodeFromUser(user) ||
    ("ITK-" + randomCode().replace("ITK", "").slice(0, 10));

  stableHostCode = derived;

  try {
    localStorage.setItem(HOST_CODE_KEY, stableHostCode);
  } catch {}

  return stableHostCode;
}

function buildStableRoomId(hostCode) {
  return `itr-${String(hostCode || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")}`;
}

/* QR / NFC artık live-interpreter deep link üretir */
function buildJoinUrl(hostCode) {
  const cleanHost = String(hostCode || "").trim();
  if (!cleanHost) return "";

  const url = new URL("/live-interpreter", location.origin);
  url.searchParams.set("host", cleanHost);
  url.searchParams.set("v", "1");

  return url.toString();
}

async function createQr() {
  saveLang();

  const hostCode = await ensureStableHostCode();
  const roomId = buildStableRoomId(hostCode);
  const joinUrl = buildJoinUrl(hostCode);

  const q = new URLSearchParams({
    room: roomId,
    my: myLang?.value || "tr",
    host: hostCode,
    join_url: joinUrl
  });

  location.href = `/pages/interpreter_qr_host.html?${q.toString()}`;
}

async function goScan() {
  saveLang();

  const hostCode = await ensureStableHostCode();

  const q = new URLSearchParams({
    my: myLang?.value || "tr",
    self_host: hostCode
  });

  location.href = `/pages/interpreter_qr_scan.html?${q.toString()}`;
}

/* ===============================
   NFC ile direct live interpreter
================================ */

function joinWithNfcToken(token) {
  const hostCode = String(token || "").trim();
  if (!hostCode) return;

  const q = new URLSearchParams({
    host: hostCode,
    my: myLang?.value || "tr"
  });

  location.href = `/pages/live_interpreter.html?${q.toString()}`;
}

/* ===============================
   INIT
================================ */

async function init() {
  buildLangOptions();
  saveLang();

  const hostCode = await ensureStableHostCode();

  if (hostCodeText) {
    hostCodeText.textContent = hostCode;
  }

  createQrBtn?.addEventListener("click", createQr);
  scanQrBtn?.addEventListener("click", goScan);
  myLang?.addEventListener("change", saveLang);

  // NFC dinleme
  await startNFCJoin((token) => {
    console.log("NFC session:", token);
    joinWithNfcToken(token);
  });
}

init();
