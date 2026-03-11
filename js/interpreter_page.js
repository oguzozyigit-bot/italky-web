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
      localStorage.setItem(MY_LANG_KEY, canonical(myLang.value || "tr"));
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

/* ===============================
   QR HOST FLOW
   Host tarafı gerçek room'u
   interpreter_qr_host.js içinde create-room ile oluşturur.
================================ */
async function createQr() {
  saveLang();

  const hostCode = await ensureStableHostCode();
  const selectedLang = canonical(myLang?.value || "tr");

  const q = new URLSearchParams({
    my: selectedLang,
    host: hostCode
  });

  location.href = `/pages/interpreter_qr_host.html?${q.toString()}`;
}

/* ===============================
   QR SCAN FLOW
================================ */
async function goScan() {
  saveLang();

  const selectedLang = canonical(myLang?.value || "tr");
  const hostCode = await ensureStableHostCode();

  const q = new URLSearchParams({
    my: selectedLang,
    self_host: hostCode
  });

  location.href = `/pages/interpreter_qr_scan.html?${q.toString()}`;
}

/* ===============================
   NFC FLOW
   1) tam URL gelirse direkt aç
   2) room id gelirse interpreter_join
   3) host code gelirse open/interpreter köprüsü
================================ */
function joinWithNfcToken(token) {
  const raw = String(token || "").trim();
  if (!raw) return;

  // Tam link geldiyse direkt aç
  if (/^https?:\/\//i.test(raw)) {
    location.href = raw;
    return;
  }

  // Gerçek room id geldiyse join sayfasına git
  if (/^[A-Za-z0-9\-_]{8,20}$/.test(raw) && !raw.startsWith("ITK-")) {
    const q = new URLSearchParams({
      room: raw,
      v: "1"
    });
    location.href = `/pages/interpreter_join.html?${q.toString()}`;
    return;
  }

  // Host code geldiyse deep-link köprüsüne git
  const hostCode = raw;
  const q = new URLSearchParams({
    host: hostCode,
    v: "1"
  });

  location.href = `/open/interpreter?${q.toString()}`;
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

  try {
    await startNFCJoin((token) => {
      console.log("NFC session:", token);
      joinWithNfcToken(token);
    });
  } catch (e) {
    console.warn("[NFC init]", e);
  }
}

init();
