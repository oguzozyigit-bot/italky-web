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
const API_BASE = "https://italky-api.onrender.com"; // italky-api
const LANGS_ENDPOINT = `${API_BASE}/api/translate/languages`;

// LibreTranslate endpoint’in senin API’de /api/translate ise:
const TRANSLATE_ENDPOINT = `${API_BASE}/api/translate`;

/* -------------------------
   STATE
-------------------------- */
let LANGS = []; // [{code, name, flag?}]
let activePick = "from"; // from/to

let fromLang = "en";
let toLang = "tr";

function canonical(code){
  return String(code || "").toLowerCase().trim();
}

// basit bayrak: en sık olanlar + fallback 🌐
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
  fromTxt.textContent  = String(fromLang || "EN").toUpperCase();
  toTxt.textContent    = String(toLang || "TR").toUpperCase();
}

/* -------------------------
   AUTH (sayfa koruma)
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
  // listeyi her açışta güncelle (dil sayısı artınca)
  renderSheet(sheetQuery.value || "");
  window.__OPEN_LANG_SHEET__?.();
}

/* -------------------------
   TTS
-------------------------- */
function speak(text, langCode){
  const t = String(text || "").trim();
  if(!t) return;

  // ✅ APK NativeTTS öncelikli
  if(window.NativeTTS && typeof window.NativeTTS.speak === "function"){
    try{ window.NativeTTS.stop?.(); }catch{}
    setTimeout(()=>{
      try{ window.NativeTTS.speak(t, String(langCode||"en")); }catch{}
    }, 120);
    return;
  }

  // web fallback
  if(!window.speechSynthesis) return;
  try{ window.speechSynthesis.cancel(); }catch{}
  const u = new SpeechSynthesisUtterance(t);
  u.lang = (langCode||"en").toString();
  u.rate = 1; u.pitch = 1; u.volume = 1;
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

  // mevcut çalışıyorsa kapat
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
   ✅ Senin backend /api/translate şu gövdelerden birini istiyor olabilir.
   Biz her ikisini de gönderiyoruz:
   - source/target
   - from_lang/to_lang
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
    outText.textContent = out || "⚠️ Çeviri şu an yapılamadı.";

    // ✅ otomatik ses
    if(out) setTimeout(()=> speak(out, canonical(toLang)), 160);

  }catch(e){
    console.warn(e);
    outText.textContent = "⚠️ Çeviri şu an yapılamadı.";
  }finally{
    translateBtn.disabled = false;
    translateBtn.textContent = "NEURAL ENGINE";
  }
}

/* -------------------------
   LOAD LANGS (Render LibreTranslate → API proxy)
-------------------------- */
async function loadLangs(){
  // fallback sabit liste (en kötü durumda bile UI boş kalmaz)
  const fallback = [
    {code:"en", name:"English"},
    {code:"tr", name:"Türkçe"},
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
      LANGS = data.map(x => ({ code: canonical(x.code), name: x.name || String(x.code||"") }));
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
  refreshHeader();
  renderSheet("");

  bind();
});
