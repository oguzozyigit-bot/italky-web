// FILE: /js/facetoface_page.js
import { STORAGE_KEY } from "/js/config.js";
import { getSiteLang } from "/js/i18n.js";
import { supabase } from "/js/supabase_client.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";
import { setHeaderTokens } from "/js/ui_shell.js";

const $ = (id)=>document.getElementById(id);

const API_BASE = "https://italky-api.onrender.com";
const LOGIN_PATH = "/pages/login.html";
const HOME_PATH  = "/pages/home.html";
const PROFILE_PATH = "/pages/profile.html";

/* ===============================
   AUTH
   =============================== */
async function requireLogin(){
  const { data:{ session } } = await supabase.auth.getSession();
  if(!session?.user){
    location.replace(LOGIN_PATH);
    return false;
  }
  try{ await ensureAuthAndCacheUser(); }catch{}
  return true;
}

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

/* ===============================
   LANGS
   =============================== */
const LANGS = [
  { code:"tr", flag:"🇹🇷", bcp:"tr-TR" },
  { code:"en", flag:"🇬🇧", bcp:"en-US" },
  { code:"de", flag:"🇩🇪", bcp:"de-DE" },
  { code:"fr", flag:"🇫🇷", bcp:"fr-FR" },
  { code:"it", flag:"🇮🇹", bcp:"it-IT" },
  { code:"es", flag:"🇪🇸", bcp:"es-ES" },
  { code:"pt", flag:"🇵🇹", bcp:"pt-PT" },
  { code:"pt-br", flag:"🇧🇷", bcp:"pt-BR" },
  { code:"nl", flag:"🇳🇱", bcp:"nl-NL" },
  { code:"sv", flag:"🇸🇪", bcp:"sv-SE" },
  { code:"no", flag:"🇳🇴", bcp:"nb-NO" },
  { code:"da", flag:"🇩🇰", bcp:"da-DK" },
  { code:"fi", flag:"🇫🇮", bcp:"fi-FI" },
  { code:"pl", flag:"🇵🇱", bcp:"pl-PL" },
  { code:"cs", flag:"🇨🇿", bcp:"cs-CZ" },
  { code:"sk", flag:"🇸🇰", bcp:"sk-SK" },
  { code:"hu", flag:"🇭🇺", bcp:"hu-HU" },
  { code:"ro", flag:"🇷🇴", bcp:"ro-RO" },
  { code:"bg", flag:"🇧🇬", bcp:"bg-BG" },
  { code:"el", flag:"🇬🇷", bcp:"el-GR" },
  { code:"uk", flag:"🇺🇦", bcp:"uk-UA" },
  { code:"ru", flag:"🇷🇺", bcp:"ru-RU" },
  { code:"az", flag:"🇦🇿", bcp:"az-AZ" },
  { code:"ka", flag:"🇬🇪", bcp:"ka-GE" },
  { code:"hy", flag:"🇦🇲", bcp:"hy-AM" },
  { code:"ar", flag:"🇸🇦", bcp:"ar-SA" },
  { code:"he", flag:"🇮🇱", bcp:"he-IL" },
  { code:"fa", flag:"🇮🇷", bcp:"fa-IR" },
  { code:"ur", flag:"🇵🇰", bcp:"ur-PK" },
  { code:"hi", flag:"🇮🇳", bcp:"hi-IN" },
  { code:"bn", flag:"🇧🇩", bcp:"bn-BD" },
  { code:"id", flag:"🇮🇩", bcp:"id-ID" },
  { code:"ms", flag:"🇲🇾", bcp:"ms-MY" },
  { code:"vi", flag:"🇻🇳", bcp:"vi-VN" },
  { code:"th", flag:"🇹🇭", bcp:"th-TH" },
  { code:"zh", flag:"🇨🇳", bcp:"zh-CN" },
  { code:"zh-tw", flag:"🇹🇼", bcp:"zh-TW" },
  { code:"ja", flag:"🇯🇵", bcp:"ja-JP" },
  { code:"ko", flag:"🇰🇷", bcp:"ko-KR" }
];

const TR_FALLBACK = {
  tr:"Türkçe", en:"İngilizce", de:"Almanca", fr:"Fransızca", it:"İtalyanca", es:"İspanyolca",
  pt:"Portekizce", nl:"Hollandaca", sv:"İsveççe", no:"Norveççe", da:"Danca", fi:"Fince",
  pl:"Lehçe", cs:"Çekçe", sk:"Slovakça", hu:"Macarca", ro:"Romence", bg:"Bulgarca",
  el:"Yunanca", uk:"Ukraynaca", ru:"Rusça", az:"Azerbaycanca", ka:"Gürcüce", hy:"Ermenice",
  ar:"Arapça", he:"İbranice", fa:"Farsça", ur:"Urduca", hi:"Hintçe", bn:"Bengalce",
  id:"Endonezce", ms:"Malayca", vi:"Vietnamca", th:"Tayca", zh:"Çince", ja:"Japonca", ko:"Korece"
};

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

function canonicalLangCode(code){
  const c = String(code||"").toLowerCase();
  return c.split("-")[0];
}

/* ✅ API uyumu: pt-br/zh-tw gibi kodları base’e indir */
function normalizeApiLang(code){
  return canonicalLangCode(code);
}

function langObj(code){
  const c = String(code||"").toLowerCase();
  return LANGS.find(x=>x.code===c) || LANGS.find(x=>x.code===canonicalLangCode(c));
}
function langFlag(code){ return langObj(code)?.flag || "🌐"; }
function bcp(code){ return langObj(code)?.bcp || "en-US"; }

function langLabel(code){
  const baseCode = canonicalLangCode(code);
  const dn = getDisplayNames();
  if(dn){
    try{ const name = dn.of(baseCode); if(name) return name; }catch{}
  }
  if(UI_LANG === "tr" && TR_FALLBACK[baseCode]) return TR_FALLBACK[baseCode];
  return String(code||"").toUpperCase();
}
function labelChip(code){ return `${langFlag(code)} ${langLabel(code)}`; }

/* ===============================
   STATE
   =============================== */
let topLang = "en";
let botLang = "tr";

/* ===============================
   FACE2FACE TOKEN SESSION
   =============================== */
let sessionGranted = false;
async function ensureFacetofaceSession(){
  if(sessionGranted) return true;
  try{
    const { data, error } = await supabase.rpc("start_facetoface_session");
    if(error){
      const msg = String(error.message||"");
      if(msg.includes("INSUFFICIENT_TOKENS")){
        alert("Jeton yetersiz. Devam etmek için jeton yükleyin.");
        location.href = PROFILE_PATH;
        return false;
      }
      alert("FaceToFace oturumu başlatılamadı.");
      return false;
    }
    const row = data?.[0] || {};
    if(row?.tokens_left != null) setHeaderTokens(row.tokens_left);
    sessionGranted = true;
    return true;
  }catch{
    alert("FaceToFace oturumu başlatılamadı.");
    return false;
  }
}

/* ===============================
   TTS (STUCK FIX: stop->speak)
   =============================== */
function speak(text, langCode){
  const t = String(text||"").trim();
  if(!t) return;

  if(window.NativeTTS && typeof window.NativeTTS.speak === "function"){
    try{ window.NativeTTS.stop?.(); }catch{}
    try{ window.NativeTTS.speak(t, String(langCode||"en")); return; }catch(e){
      console.warn("NativeTTS.speak failed:", e);
    }
  }

  if(!window.speechSynthesis) return;
  try{ window.speechSynthesis.cancel(); }catch{}

  const u = new SpeechSynthesisUtterance(t);
  u.lang = bcp(langCode);
  u.volume=1; u.rate=1; u.pitch=1;

  try{
    const voices = window.speechSynthesis.getVoices() || [];
    if(voices.length){
      const base = canonicalLangCode(langCode);
      u.voice = voices.find(v=>String(v.lang||"").toLowerCase().startsWith(base)) || voices[0];
    }
  }catch{}
  setTimeout(()=>{ try{ window.speechSynthesis.speak(u); }catch{} }, 60);
}

/* ===============================
   UI
   =============================== */
function markLatestTranslation(side){
  const wrap = (side === "top") ? $("topBody") : $("botBody");
  if(!wrap) return;
  wrap.querySelectorAll(".bubble.me.is-latest").forEach(el=>el.classList.remove("is-latest"));
  const allMe = wrap.querySelectorAll(".bubble.me");
  const last = allMe[allMe.length-1];
  if(last) last.classList.add("is-latest");
}
function closeAllPop(){
  $("pop-top")?.classList.remove("show");
  $("pop-bot")?.classList.remove("show");
}
let active=null, recTop=null, recBot=null;

function setMicUI(which, on){
  const btn = (which==="top") ? $("topMic") : $("botMic");
  btn?.classList.toggle("listening", !!on);
  const anyOn = !!on || !!recTop || !!recBot;
  $("frameRoot")?.classList.toggle("listening", anyOn);
}
function stopAll(){
  try{ recTop?.stop?.(); }catch{}
  try{ recBot?.stop?.(); }catch{}
  recTop=null; recBot=null; active=null;
  setMicUI("top", false); setMicUI("bot", false);
  $("frameRoot")?.classList.remove("listening");
  try{ window.speechSynthesis?.cancel?.(); }catch{}
  try{ window.NativeTTS?.stop?.(); }catch{}
}
function clearChat(){
  closeAllPop(); stopAll();
  $("topBody") && ($("topBody").innerHTML="");
  $("botBody") && ($("botBody").innerHTML="");
}
function addBubble(side, kind, text, langForSpeak){
  const wrap = (side==="top") ? $("topBody") : $("botBody");
  if(!wrap) return;

  const row = document.createElement("div");
  row.className = `bubble ${kind}`;

  const txt = document.createElement("span");
  txt.className="txt";
  txt.textContent = String(text||"").trim() || "—";
  row.appendChild(txt);

  if(kind==="me"){
    const spk = document.createElement("button");
    spk.className="spk";
    spk.type="button";
    spk.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>`;
    spk.addEventListener("click",(e)=>{
      e.preventDefault(); e.stopPropagation();
      speak(txt.textContent, langForSpeak);
    });
    row.appendChild(spk);
  }

  wrap.appendChild(row);
  if(kind==="me") markLatestTranslation(side);
  try{ wrap.scrollTop = wrap.scrollHeight; }catch{}
}

/* ===============================
   Popover
   =============================== */
function renderPop(side){
  const list = $(side==="top" ? "list-top":"list-bot");
  if(!list) return;
  const sel = (side==="top") ? topLang : botLang;

  list.innerHTML = LANGS.map(l=>`
    <div class="pop-item ${l.code===sel?"active":""}" data-code="${l.code}">
      <div class="pop-left">
        <div class="pop-flag">${l.flag}</div>
        <div class="pop-name">${langLabel(l.code)}</div>
      </div>
      <div class="pop-code">${String(l.code).toUpperCase()}</div>
    </div>`).join("");

  list.querySelectorAll(".pop-item").forEach(item=>{
    item.addEventListener("click", ()=>{
      const code = item.getAttribute("data-code") || "en";
      if(side==="top") topLang=code; else botLang=code;
      const tTxt = side==="top" ? $("topLangTxt") : $("botLangTxt");
      if(tTxt) tTxt.textContent = labelChip(code);
      stopAll(); closeAllPop();
    });
  });
}
function togglePop(side){
  const pop = $(side==="top" ? "pop-top":"pop-bot");
  if(!pop) return;
  const willShow = !pop.classList.contains("show");
  closeAllPop();
  if(!willShow) return;
  pop.classList.add("show");
  renderPop(side);
}

/* ===============================
   TRANSLATE (FIXED)
   =============================== */
async function translateViaApi(text, source, target){
  const t = String(text||"").trim();
  if(!t) return t;

  // ✅ API uyumu: en-gb / pt-br / zh-tw -> base dil
  const src = normalizeApiLang(source);
  const dst = normalizeApiLang(target);

  // aynıysa çevirmeye gerek yok
  if(src === dst) return t;

  const ctrl = new AbortController();
  const to = setTimeout(()=>ctrl.abort(), 25000);
  try{
    const body = { text:t, source:src, target:dst, from_lang:src, to_lang:dst };
    const r = await fetch(`${API_BASE}/api/translate`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });

    if(!r.ok){
      const errTxt = await r.text().catch(()=> "");
      console.warn("translate HTTP", r.status, errTxt);
      return null;
    }

    const data = await r.json().catch(()=>({}));
    const out = String(data?.translated||data?.translation||data?.text||"").trim();
    return out || null;
  }catch(e){
    console.warn("translateViaApi failed:", e);
    return null;
  }finally{
    clearTimeout(to);
  }
}

/* ===============================
   STT (IMPORTANT: speak AFTER onend)
   =============================== */
function buildRecognizer(langCode){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const rec = new SR();
  rec.lang = bcp(langCode);
  rec.interimResults=false;
  rec.continuous=false;
  rec.maxAlternatives=1;
  return rec;
}

let pending = null;

async function start(which){
  const ok = await ensureFacetofaceSession();
  if(!ok) return;

  const isAndroid = navigator.userAgent.includes("Android");
  if(location.protocol!=="https:" && location.hostname!=="localhost" && !isAndroid){
    alert("Mikrofon için HTTPS gerekli.");
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ alert("Bu tarayıcı SpeechRecognition desteklemiyor."); return; }

  if(active && active!==which) stopAll();

  const src = (which==="top") ? topLang : botLang;
  const dst = (which==="top") ? botLang : topLang;

  const rec = buildRecognizer(src);
  if(!rec){ alert("Mikrofon başlatılamadı."); return; }

  active = which;
  setMicUI(which, true);

  rec.onresult = (e)=>{
    const t = e.results?.[0]?.[0]?.transcript || "";
    const finalText = String(t||"").trim();
    if(!finalText) return;

    addBubble(which, "them", finalText, src);

    pending = { which, finalText, src, dst };
    try{ rec.stop(); }catch{}
  };

  rec.onerror = (err)=>{ console.error("STT Error:", err); stopAll(); };

  rec.onend = async ()=>{
    if(active===which) active=null;
    setMicUI(which,false);
    if(!active) $("frameRoot")?.classList.remove("listening");

    const p = pending;
    if(p && p.which === which){
      pending = null;

      const other = (which==="top") ? "bot" : "top";
      const translated = await translateViaApi(p.finalText, p.src, p.dst);

      if(!translated){
        addBubble(other, "me", "⚠️ Çeviri şu an yapılamadı.", normalizeApiLang(p.dst));
        return;
      }

      addBubble(other, "me", translated, normalizeApiLang(p.dst));

      // ✅ mic kapandıktan sonra
      setTimeout(()=> speak(translated, normalizeApiLang(p.dst)), 120);
    }
  };

  if(which==="top") recTop=rec; else recBot=rec;
  try{ rec.start(); }catch{ stopAll(); }
}

/* ===============================
   Bindings
   =============================== */
function bindNav(){
  $("homeBtn")?.addEventListener("click", ()=> location.href = HOME_PATH);
  $("topBack")?.addEventListener("click", ()=>{
    stopAll(); closeAllPop();
    if(history.length>1) history.back(); else location.href = HOME_PATH;
  });
  $("clearChat")?.addEventListener("click", ()=> clearChat());
}
function bindLangButtons(){
  $("topLangBtn")?.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); togglePop("top"); });
  $("botLangBtn")?.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); togglePop("bot"); });
  $("close-top")?.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); closeAllPop(); });
  $("close-bot")?.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); closeAllPop(); });
}
function bindMicButtons(){
  $("topMic")?.addEventListener("click",(e)=>{
    e.preventDefault(); closeAllPop();
    if(active==="top") stopAll(); else start("top");
  });
  $("botMic")?.addEventListener("click",(e)=>{
    e.preventDefault(); closeAllPop();
    if(active==="bot") stopAll(); else start("bot");
  });
}

document.addEventListener("DOMContentLoaded", async ()=>{
  if(!(await requireLogin())) return;

  $("topLangTxt") && ($("topLangTxt").textContent = labelChip(topLang));
  $("botLangTxt") && ($("botLangTxt").textContent = labelChip(botLang));

  bindNav(); bindLangButtons(); bindMicButtons();

  try{ window.speechSynthesis?.getVoices?.(); }catch{}

  document.addEventListener("click",(e)=>{
    if(!$("pop-top")?.contains(e.target) && !$("pop-bot")?.contains(e.target) && !e.target.closest(".lang-trigger")) closeAllPop();
  },{capture:true});
});
