// FILE: italky-web/js/text_translate_offline.js
// Offline mode: CT2 bridge + SINGLE language pair (EN <-> TR) fixed
import { STORAGE_KEY } from "/js/config.js";
import { getSiteLang } from "/js/i18n.js";

const $ = (id)=>document.getElementById(id);

/* ===============================
   AUTH GUARD
   =============================== */
function requireLogin(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) { location.replace("/index.html"); return false; }
    const u = JSON.parse(raw);
    if(!u || !u.email){
      localStorage.removeItem(STORAGE_KEY);
      location.replace("/index.html");
      return false;
    }
    return true;
  }catch{
    try{ localStorage.removeItem(STORAGE_KEY); }catch{}
    location.replace("/index.html");
    return false;
  }
}

/* ===============================
   UI LANG (display names)
   =============================== */
function getSystemUILang(){
  try{
    const l = String(getSiteLang?.() || "").toLowerCase().trim();
    if(l) return l;
  }catch{}
  try{
    const l2 = String(localStorage.getItem("italky_site_lang_v1") || "").toLowerCase().trim();
    if(l2) return l2;
  }catch{}
  return "tr";
}

let UI_LANG = getSystemUILang();

/* ONLY EN/TR registry (fixed pair) */
const LANGS = [
  { code:"en", flag:"🇬🇧", bcp:"en-US" },
  { code:"tr", flag:"🇹🇷", bcp:"tr-TR" }
];

let _dn = null;
function getDisplayNames(){
  if(_dn && _dn.__lang === UI_LANG) return _dn;
  _dn = null;
  try{
    const dn = new Intl.DisplayNames([UI_LANG], { type:"language" });
    dn.__lang = UI_LANG;
    _dn = dn;
  }catch{ _dn = null; }
  return _dn;
}
function canonical(code){ return String(code||"").toLowerCase().split("-")[0]; }
function langObj(code){ return LANGS.find(x=>x.code===code); }
function langFlag(code){ return langObj(code)?.flag || "🌐"; }
function bcp(code){ return langObj(code)?.bcp || "en-US"; }
function langLabel(code){
  const dn = getDisplayNames();
  const c = canonical(code);
  if(dn){
    const name = dn.of(c);
    if(name) return name;
  }
  return String(code||"").toUpperCase();
}

/* ===============================
   TOAST
   =============================== */
function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = String(msg||"");
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 1600);
}

/* ===============================
   TTS
   =============================== */
function speak(text, langCode){
  const t = String(text||"").trim();
  if(!t) return;
  if(!window.speechSynthesis) return;

  try{ window.speechSynthesis.cancel(); }catch{}
  const u = new SpeechSynthesisUtterance(t);
  u.lang = bcp(langCode);
  u.volume = 1.0; u.rate = 1.0; u.pitch = 1.0;

  const voices = window.speechSynthesis.getVoices();
  if(voices?.length){
    const base = String(langCode||"").split("-")[0];
    u.voice = voices.find(v => String(v.lang||"").startsWith(base)) || voices[0];
  }
  setTimeout(()=>{ try{ window.speechSynthesis.speak(u); }catch{} }, 50);
}

/* ===============================
   CT2 BRIDGE
   =============================== */
const CT2_REQUIRED = ["en-tr", "tr-en"];
let CT2_OK = false;

function bridgeReady(){
  return !!(window.Android && typeof window.Android.ct2Check === "function" && typeof window.Android.ct2Translate === "function");
}
function dir(src, dst){ return `${String(src||"").toLowerCase()}-${String(dst||"").toLowerCase()}`; }

function checkCt2(){
  const sim = String(localStorage.getItem("ct2_sim_state")||"").trim(); // installed / missing
  if(sim === "installed"){ CT2_OK = true; return true; }
  if(sim === "missing"){ CT2_OK = false; return false; }

  if(!bridgeReady()){ CT2_OK = false; return false; }

  try{
    const raw = window.Android.ct2Check(JSON.stringify({ required: CT2_REQUIRED }));
    const res = JSON.parse(raw || "{}");
    CT2_OK = CT2_REQUIRED.every(k => !!res[k]);
    return CT2_OK;
  }catch{
    CT2_OK = false;
    return false;
  }
}

async function translateCt2(text, src, dst){
  const t = String(text||"").trim();
  if(!t) return t;

  const d = dir(src, dst);
  if(d !== "en-tr" && d !== "tr-en") return t;

  if(!CT2_OK) return t;
  if(!bridgeReady()) return t;

  try{
    const raw = window.Android.ct2Translate(JSON.stringify({ direction: d, text: t, source: src, target: dst }));
    const res = JSON.parse(raw || "{}");
    const out = String(res?.text || res?.translated || res?.translation || "").trim();
    return out || t;
  }catch{
    return t;
  }
}

/* ===============================
   STT (Mic In)
   =============================== */
let rec = null;
function buildRecognizer(langCode){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const r = new SR();
  r.lang = bcp(langCode);
  r.interimResults = false;
  r.continuous = false;
  r.maxAlternatives = 1;
  return r;
}

function setMicUI(on){
  $("micIn")?.classList.toggle("listening", !!on);
}

async function startMic(){
  if(!CT2_OK){
    toast("Offline paketler eksik (en-tr / tr-en).");
    return;
  }

  const isAndroid = navigator.userAgent.includes("Android");
  if(location.protocol !== "https:" && location.hostname !== "localhost" && !isAndroid){
    toast("Mikrofon için HTTPS gerekli.");
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    toast("SpeechRecognition yok.");
    return;
  }

  if(rec){
    try{ rec.stop(); }catch{}
    rec = null;
    setMicUI(false);
    return;
  }

  const src = state.from; // fixed
  const r = buildRecognizer(src);
  if(!r){ toast("Mikrofon açılamadı."); return; }

  rec = r;
  setMicUI(true);

  r.onresult = (e)=>{
    const t = e.results?.[0]?.[0]?.transcript || "";
    const finalText = String(t||"").trim();
    if(!finalText) return;
    const ta = $("inText");
    if(ta){
      ta.value = (ta.value ? (ta.value + " ") : "") + finalText;
      updateCounts();
    }
  };
  r.onerror = ()=>{ rec = null; setMicUI(false); };
  r.onend = ()=>{ rec = null; setMicUI(false); };

  try{ r.start(); }catch{ rec = null; setMicUI(false); }
}

/* ===============================
   FIXED LANG STATE (NO SHEET)
   =============================== */
const state = { from:"en", to:"tr" };

function setLangUI(){
  $("fromFlag").textContent = langFlag(state.from);
  $("toFlag").textContent = langFlag(state.to);
  $("fromLangTxt").textContent = langLabel(state.from);
  $("toLangTxt").textContent = langLabel(state.to);
}

/* ===============================
   COUNTS + ACTIONS
   =============================== */
function updateCounts(){
  const inT = $("inText")?.value || "";
  const outT = $("outText")?.textContent || "";
  $("countIn") && ($("countIn").textContent = String(inT.length));
  $("countOut") && ($("countOut").textContent = String(outT === "—" ? 0 : outT.length));
}

async function doTranslate(){
  const txt = String($("inText")?.value || "").trim();
  if(!txt){ toast("Metin gir."); return; }

  if(!CT2_OK){
    toast("Offline paket eksik.");
    return;
  }

  $("outText").textContent = "…";
  updateCounts();

  const out = await translateCt2(txt, state.from, state.to);
  $("outText").textContent = out || "—";
  updateCounts();
}

function clearAll(){
  $("inText") && ($("inText").value = "");
  $("outText") && ($("outText").textContent = "—");
  updateCounts();
}

/* ===============================
   BOOT
   =============================== */
document.addEventListener("DOMContentLoaded", ()=>{
  if(!requireLogin()) return;

  // user info
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    const u = raw ? JSON.parse(raw) : null;
    if(u){
      $("userName") && ($("userName").textContent = u.name || "—");
      $("userPlan") && ($("userPlan").textContent = "OFFLINE");
      if(u.picture){
        const a = $("avatarBtn");
        if(a){
          a.innerHTML = `<img src="${u.picture}" alt="">`;
        }
      }
    }
  }catch{}

  // preload voices
  try{ window.speechSynthesis?.getVoices?.(); }catch{}

  // FIXED LANGS: EN -> TR
  state.from = "en";
  state.to = "tr";
  setLangUI();

  // CT2 check
  checkCt2();
  if(!CT2_OK){
    toast("Offline paket yok: en-tr / tr-en");
  }

  // bind home
  $("logoHome")?.addEventListener("click", ()=> location.href="/pages/home.html");

  // ✅ LANG BUTTONS DISABLED (tek çift)
  $("fromLangBtn")?.addEventListener("click", (e)=>{ e.preventDefault(); toast("Offline: Dil sabit (EN→TR)"); });
  $("toLangBtn")?.addEventListener("click", (e)=>{ e.preventDefault(); toast("Offline: Dil sabit (EN→TR)"); });

  // ✅ Swap: istersen kapatalım. Şimdilik KAPALI (tek yön sabit).
  $("swapBtn")?.addEventListener("click", (e)=>{
    e.preventDefault();
    toast("Offline: Dil sabit (EN→TR)");
  });

  // sheet tamamen devre dışı (varsa kapalı kalsın)
  $("langSheet")?.classList.remove("show");

  // input handlers
  $("inText")?.addEventListener("input", updateCounts);

  $("translateBtn")?.addEventListener("click", doTranslate);
  $("clearBtn")?.addEventListener("click", clearAll);

  $("micIn")?.addEventListener("click", startMic);

  $("speakIn")?.addEventListener("click", ()=>{
    const txt = String($("inText")?.value || "").trim();
    if(!txt) return;
    speak(txt, state.from);
  });

  $("speakOut")?.addEventListener("click", ()=>{
    const txt = String($("outText")?.textContent || "").trim();
    if(!txt || txt === "—" || txt === "…") return;
    speak(txt, state.to);
  });

  updateCounts();
});
