// FILE: /js/text_translate_page.js

import { supabase } from "/js/supabase_client.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";

/* -------------------------
   DOM
-------------------------- */
const $ = (id) => document.getElementById(id);

const fromBtn = $("fromLangBtn");
const toBtn   = $("toLangBtn");
const swapBtn = $("swapBtn");

const fromFlag = $("fromFlag");
const toFlag   = $("toFlag");
const fromTxt  = $("fromLangTxt");
const toTxt    = $("toLangTxt");

const inText   = $("inText");
const outText  = $("outText");

const micIn    = $("micIn");
const speakIn  = $("speakIn");
const speakOut = $("speakOut");

const clearBtn = $("clearBtn");
const translateBtn = $("translateBtn");

const sheetList  = $("sheetList");
const sheetQuery = $("sheetQuery");

/* -------------------------
   CONFIG
-------------------------- */
const API_BASE = "https://italky-api.onrender.com";
const LANGS_ENDPOINT = `${API_BASE}/api/translate/languages`;
const TRANSLATE_ENDPOINT = `${API_BASE}/api/translate`;
const USAGE_SPEND_ENDPOINT = `${API_BASE}/api/usage/spend`;

/* -------------------------
   STATE
-------------------------- */
let LANGS = [];
let activePick = "from";

let fromLang = "tr";
let toLang = "en";

function canonical(code){
  return String(code || "").toLowerCase().trim();
}

const FLAG = {
  tr:"🇹🇷", en:"🇬🇧", de:"🇩🇪", fr:"🇫🇷", it:"🇮🇹", es:"🇪🇸",
  pt:"🇵🇹", ru:"🇷🇺", ar:"🇸🇦", fa:"🇮🇷", hi:"🇮🇳", ur:"🇵🇰",
  ja:"🇯🇵", ko:"🇰🇷", zh:"🇨🇳", nl:"🇳🇱", sv:"🇸🇪", no:"🇳🇴",
  da:"🇩🇰", fi:"🇫🇮", pl:"🇵🇱", cs:"🇨🇿", hu:"🇭🇺", ro:"🇷🇴",
  bg:"🇧🇬", el:"🇬🇷", uk:"🇺🇦", az:"🇦🇿", ka:"🇬🇪", hy:"🇦🇲",
  id:"🇮🇩", ms:"🇲🇾", vi:"🇻🇳", th:"🇹🇭"
};

function flagOf(code){
  const c = canonical(code);
  return FLAG[c] || "🌐";
}

function labelOf(code){
  const c = canonical(code);
  const item = LANGS.find(x => canonical(x.code) === c);
  if(item?.name) return item.name;
  return c.toUpperCase();
}

function refreshHeader(){
  fromFlag.textContent = flagOf(fromLang);
  toFlag.textContent   = flagOf(toLang);
  fromTxt.textContent  = String(fromLang || "TR").toUpperCase();
  toTxt.textContent    = String(toLang || "EN").toUpperCase();
}

/* -------------------------
   AUTH
-------------------------- */
async function requireLogin(){
  const { data:{ session } } = await supabase.auth.getSession();
  if(!session?.user){
    location.replace("/pages/login.html");
    return false;
  }
  try{ await ensureAuthAndCacheUser(); }catch{}
  return true;
}

/* -------------------------
   USAGE BILLING
-------------------------- */
async function spendUsage(moduleKey, usedChars){
  const safeChars = Number(usedChars || 0);

  if(safeChars <= 0){
    return { ok:true, charged_tokens:0, remaining_chars:0 };
  }

  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id || "";

  if(!userId){
    alert("Önce giriş yapın.");
    throw new Error("no_user");
  }

  const r = await fetch(USAGE_SPEND_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      user_id: userId,
      module_key: moduleKey,
      used_chars: safeChars
    })
  });

  const j = await r.json().catch(() => ({}));

  if(!r.ok){
    if(r.status === 402){
      alert("Kontörünüz yetersiz. Jeton Market'e yönlendiriliyorsunuz.");
      location.href = "/pages/jetonbuy.html";
      throw new Error("insufficient_tokens");
    }
    throw new Error(j.detail || "usage_spend_failed");
  }

  return j;
}

/* -------------------------
   LANG SHEET
-------------------------- */
function renderSheet(filter=""){
  const q = String(filter || "").toLowerCase().trim();

  const list = (q)
    ? LANGS.filter(x => (x.name||"").toLowerCase().includes(q) || String(x.code||"").toLowerCase().includes(q))
    : LANGS;

  sheetList.innerHTML = list.map(l => {
    const c = canonical(l.code);
    const name = l.name || c.toUpperCase();
    const fl = flagOf(c);
    return `
      <div class="sheetRow" data-code="${c}">
        <div class="sheetLeft">
          <div class="sheetFlag">${fl}</div>
          <div class="sheetName">${escapeHtml(name)}</div>
        </div>
        <div class="sheetCode">${escapeHtml(c.toUpperCase())}</div>
      </div>
    `;
  }).join("");

  sheetList.querySelectorAll(".sheetRow").forEach(row=>{
    row.addEventListener("click", ()=>{
      const code = row.getAttribute("data-code") || "en";
      if(activePick === "from") fromLang = code; else toLang = code;
      refreshHeader();
      window.__CLOSE_LANG_SHEET__?.();
    });
  });
}

function openSheet(which){
  activePick = which;
  renderSheet(sheetQuery.value || "");
  window.__OPEN_LANG_SHEET__?.();
}

/* -------------------------
   TTS
-------------------------- */
function speak(text, langCode){
  const t = String(text || "").trim();
  if(!t) return;

  if(window.NativeTTS && typeof window.NativeTTS.speak === "function"){
    try{ window.NativeTTS.stop?.(); }catch{}
    setTimeout(()=>{
      try{ window.NativeTTS.speak(t, String(langCode||"en")); }catch{}
    }, 120);
    return;
  }

  if(!window.speechSynthesis) return;
  try{ window.speechSynthesis.cancel(); }catch{}
  const u = new SpeechSynthesisUtterance(t);
  u.lang = (langCode||"en").toString();
  u.rate = 1;
  u.pitch = 1;
  u.volume = 1;
  setTimeout(()=>{ try{ window.speechSynthesis.speak(u); }catch{} }, 60);
}

/* -------------------------
   STT (Mic)
-------------------------- */
let rec = null;

function buildRecognizer(langCode){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const r = new SR();
  r.lang = (langCode||"en").toString();
  r.interimResults = false;
  r.continuous = false;
  r.maxAlternatives = 1;
  return r;
}

async function startMic(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    alert("Bu cihaz SpeechRecognition desteklemiyor.");
    return;
  }

  try{ rec?.stop?.(); }catch{}
  rec = buildRecognizer(fromLang);

  if(!rec){
    alert("Mikrofon başlatılamadı.");
    return;
  }

  micIn.classList.add("listening");

  rec.onresult = (e)=>{
    const t = e.results?.[0]?.[0]?.transcript || "";
    const txt = String(t||"").trim();
    if(txt) inText.value = txt;
  };

  rec.onerror = ()=> {
    micIn.classList.remove("listening");
  };

  rec.onend = ()=> {
    micIn.classList.remove("listening");
  };

  try{
    rec.start();
  }catch{
    micIn.classList.remove("listening");
  }
}

/* -------------------------
   TRANSLATE
-------------------------- */
async function translate(){
  const t = String(inText.value || "").trim();
  if(!t){
    outText.textContent = "—";
    return;
  }

  translateBtn.disabled = true;
  translateBtn.textContent = "ÇEVİRİLİYOR…";

  try{
    const body = {
      text: t,
      source: canonical(fromLang),
      target: canonical(toLang),
      from_lang: canonical(fromLang),
      to_lang: canonical(toLang)
    };

    const r = await fetch(TRANSLATE_ENDPOINT, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(body)
    });

    const raw = await r.text().catch(()=> "");
    if(!r.ok){
      console.warn("translate fail", r.status, raw);
      outText.textContent = "⚠️ Çeviri şu an yapılamadı.";
      return;
    }

    let data = {};
    try{ data = JSON.parse(raw); }catch{ data = {}; }

    const out = String(data?.translated || data?.translation || data?.text || "").trim();

    if(!out){
      outText.textContent = "⚠️ Çeviri şu an yapılamadı.";
      return;
    }

    await spendUsage("text", out.length);

    outText.textContent = out;

    setTimeout(()=> speak(out, canonical(toLang)), 160);

  }catch(e){
    console.warn(e);
    if(String(e?.message || "") !== "insufficient_tokens"){
      outText.textContent = "⚠️ Çeviri şu an yapılamadı.";
    }
  }finally{
    translateBtn.disabled = false;
    translateBtn.textContent = "NEURAL ENGINE";
  }
}

/* -------------------------
   LOAD LANGS
-------------------------- */
async function loadLangs(){
  const fallback = [
    {code:"tr", name:"Türkçe"},
    {code:"en", name:"English"},
    {code:"de", name:"Deutsch"},
    {code:"fr", name:"Français"},
    {code:"es", name:"Español"},
    {code:"it", name:"Italiano"},
    {code:"pt", name:"Português"},
    {code:"ru", name:"Русский"},
    {code:"ar", name:"العربية"}
  ];

  try{
    const r = await fetch(LANGS_ENDPOINT, { method:"GET" });
    const data = await r.json().catch(()=>null);
    if(Array.isArray(data) && data.length){
      LANGS = data
        .map(x => ({ code: canonical(x.code), name: x.name || String(x.code||"") }))
        .filter(x => x.code && x.code !== "auto" && x.code !== "detect");
      return;
    }
  }catch(e){
    console.warn("langs fetch fail", e);
  }
  LANGS = fallback;
}

/* -------------------------
   HELPERS
-------------------------- */
function escapeHtml(s){
  return String(s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* -------------------------
   BINDINGS
-------------------------- */
function bind(){
  fromBtn.addEventListener("click", ()=> openSheet("from"));
  toBtn.addEventListener("click", ()=> openSheet("to"));

  swapBtn.addEventListener("click", ()=>{
    const a = fromLang;
    fromLang = toLang;
    toLang = a;
    refreshHeader();
  });

  sheetQuery.addEventListener("input", (e)=> renderSheet(e.target.value || ""));

  clearBtn.addEventListener("click", ()=>{
    inText.value = "";
    outText.textContent = "—";
    try{ window.NativeTTS?.stop?.(); }catch{}
    try{ window.speechSynthesis?.cancel?.(); }catch{}
  });

  translateBtn.addEventListener("click", translate);

  micIn.addEventListener("click", startMic);

  speakIn.addEventListener("click", ()=>{
    const t = String(inText.value||"").trim();
    if(t) speak(t, canonical(fromLang));
  });

  speakOut.addEventListener("click", ()=>{
    const t = String(outText.textContent||"").trim();
    if(t && t !== "—") speak(t, canonical(toLang));
  });
}

/* -------------------------
   BOOT
-------------------------- */
document.addEventListener("DOMContentLoaded", async ()=>{
  if(!(await requireLogin())) return;

  await loadLangs();

  fromLang = "tr";
  toLang = "en";

  refreshHeader();
  renderSheet("");

  bind();
});
