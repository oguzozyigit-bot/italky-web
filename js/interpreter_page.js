import { mountShell } from "/js/ui_shell.js";
import { LANG_POOL } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com";

mountShell({ scroll: "auto" });

const $ = (id) => document.getElementById(id);
const myLang = $("myLang");
const createQrBtn = $("createQrBtn");
const scanQrBtn = $("scanQrBtn");

function canonical(code){
  return String(code || "").toLowerCase().trim();
}

function buildLangOptions(){
  const langs = Array.isArray(LANG_POOL) ? LANG_POOL : [];
  myLang.innerHTML = langs.map((l)=>{
    const code = canonical(l.code);
    return `<option value="${code}">${l.flag || "🌐"} ${l.name || code.toUpperCase()}</option>`;
  }).join("");

  myLang.value = localStorage.getItem("italky_interpreter_my_lang") || "tr";
}

function saveLang(){
  try{ localStorage.setItem("italky_interpreter_my_lang", myLang.value); }catch{}
}

async function createRoom(){
  saveLang();

  const r = await fetch(`${API_BASE}/api/interpreter/create-room`, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ my_lang: myLang.value })
  });

  const j = await r.json().catch(()=>null);
  if(!r.ok || !j?.room_id){
    alert("QR odası oluşturulamadı.");
    return;
  }

  const q = new URLSearchParams({
    room: j.room_id,
    my: myLang.value,
    join_url: j.join_url || ""
  });

  location.href = `/pages/interpreter_qr_host.html?${q.toString()}`;
}

function goScan(){
  saveLang();
  const q = new URLSearchParams({
    my: myLang.value
  });
  location.href = `/pages/interpreter_qr_scan.html?${q.toString()}`;
}

createQrBtn?.addEventListener("click", createRoom);
scanQrBtn?.addEventListener("click", goScan);

myLang?.addEventListener("change", saveLang);

buildLangOptions();
