// FILE: /js/facetoface_page.js
import { getSiteLang } from "/js/i18n.js";
import { supabase } from "/js/supabase_client.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";
import { setHeaderTokens } from "/js/ui_shell.js";

const $ = (id) => document.getElementById(id);

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
   TTS (Android WebView)
=============================== */
function speak(text, langCode){
  const t = String(text||"").trim();
  if(!t) return;

  // APK NativeTTS
  if(window.NativeTTS && typeof window.NativeTTS.speak === "function"){
    try{ window.NativeTTS.stop?.(); }catch{}
    setTimeout(()=>{
      try{ window.NativeTTS.speak(t, String(langCode||"en")); }catch(e){
        console.warn("NativeTTS.speak failed:", e);
      }
    }, 220);
    return;
  }

  // Web fallback
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
   UI helpers
=============================== */
function closeAllPop(){
  $("pop-top")?.classList.remove("show");
  $("pop-bot")?.classList.remove("show");
}

function setLangButtonTexts(){
  const topBtn = $("topLangBtn");
  const botBtn = $("botLangBtn");
  if(topBtn) topBtn.textContent = `${langFlag(topLang)} ${langLabel(topLang).toUpperCase()} ⌵`;
  if(botBtn) botBtn.textContent = `${langFlag(botLang)} ${langLabel(botLang).toUpperCase()} ⌵`;
}

function renderPop(side){
  const list = $(side==="top" ? "list-top" : "list-bot");
  if(!list) return;
  const sel = (side==="top") ? topLang : botLang;

  list.innerHTML = LANGS.map(l=>{
    const active = l.code === sel ? "active" : "";
    return `
      <div class="pop-item ${active}" data-code="${l.code}">
        <div class="pop-left">
          <div class="pop-flag">${l.flag}</div>
          <div class="pop-name">${langLabel(l.code)}</div>
        </div>
        <div class="pop-code">${String(l.code).toUpperCase()}</div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".pop-item").forEach(item=>{
    item.addEventListener("click",(e)=>{
      e.preventDefault();
      e.stopPropagation();
      const code = item.getAttribute("data-code") || "en";
      if(side==="top") topLang = code; else botLang = code;

      setLangButtonTexts();
      stopAll(); // dil değişince mic reset
      closeAllPop();
    });
  });
}

function addBubble(side, kind, text, langForSpeak){
  const wrap = (side==="top") ? $("topBody") : $("botBody");
  if(!wrap) return;

  const bubble = document.createElement("div");
  bubble.className = `bubble ${kind}`;

  // ✅ Metin + hoparlör aynı satır
  const row = document.createElement("div");
  row.className = "txt-row";

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text||"").trim() || "—";
  row.appendChild(txt);

  // ✅ Hoparlör sadece çeviri (me) için
  if(kind === "me"){
    const spk = document.createElement("div");
    spk.className = "spk-icon";
    spk.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M3 10v4h4l5 4V6L7 10H3zm13.5 2c0-1.77-1.02-3.29-2.5-4.03v8.06c1.48-.74 2.5-2.26 2.5-4.03zM14 3.23v2.06c2.89 1 5 3.77 5 6.71s-2.11 5.71-5 6.71v2.06c4.01-1.07 7-4.71 7-8.77s-2.99-7.7-7-8.77z"></path>
      </svg>
    `;
    spk.addEventListener("click",(e)=>{
      e.preventDefault(); e.stopPropagation();
      speak(txt.textContent, langForSpeak);
    });
    row.appendChild(spk);
  }

  bubble.appendChild(row);
  wrap.appendChild(bubble);

  try{ wrap.scrollTop = wrap.scrollHeight; }catch{}
}

/* ===============================
   Translate
=============================== */
async function translateViaApi(text, source, target){
  const t = String(text||"").trim();
  if(!t) return t;

  const src = normalizeApiLang(source);
  const dst = normalizeApiLang(target);
  if(src === dst) return t;

  const ctrl = new AbortController();
  const to = setTimeout(()=>ctrl.abort(), 25000);
  try{
    // ✅ Bizim API bu body’yi kabul ediyor:
    const body = { text:t, from_lang:src, to_lang:dst, source:src, target:dst };
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
   STT
=============================== */
let active = null, recTop = null, recBot = null;
let pending = null;

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
  setMicUI("top", false);
  setMicUI("bot", false);
  try{ window.speechSynthesis?.cancel?.(); }catch{}
  try{ window.NativeTTS?.stop?.(); }catch{}
}

function buildRecognizer(langCode){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const rec = new SR();
  rec.lang = bcp(langCode);
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  return rec;
}

async function start(which){
  const ok = await ensureFacetofaceSession();
  if(!ok) return;

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    alert("Bu cihaz SpeechRecognition desteklemiyor.");
    return;
  }

  if(active && active !== which) stopAll();

  const src = (which==="top") ? topLang : botLang;
  const dst = (which==="top") ? botLang : topLang;

  const rec = buildRecognizer(src);
  if(!rec){
    alert("Mikrofon başlatılamadı.");
    return;
  }

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

  rec.onerror = (err)=>{
    console.error("STT Error:", err);
    stopAll();
  };

  rec.onend = async ()=>{
    if(active === which) active = null;
    setMicUI(which, false);

    const p = pending;
    if(p && p.which === which){
      pending = null;

      const other = (which==="top") ? "bot" : "top";
      const translated = await translateViaApi(p.finalText, p.src, p.dst);
      const speakLang = normalizeApiLang(p.dst);

      if(!translated){
        addBubble(other, "me", "⚠️ Çeviri şu an yapılamadı.", speakLang);
        return;
      }

      addBubble(other, "me", translated, speakLang);

      // ✅ otomatik ses
      setTimeout(()=> speak(translated, speakLang), 120);
    }
  };

  if(which==="top") recTop = rec; else recBot = rec;

  try{ rec.start(); }catch(e){
    console.warn("rec.start failed:", e);
    stopAll();
  }
}

/* ===============================
   Bindings
=============================== */
function bindUI(){
  // mic
  $("topMic")?.addEventListener("click",(e)=>{
    e.preventDefault(); e.stopPropagation();
    closeAllPop();
    if(active==="top") stopAll(); else start("top");
  });
  $("botMic")?.addEventListener("click",(e)=>{
    e.preventDefault(); e.stopPropagation();
    closeAllPop();
    if(active==="bot") stopAll(); else start("bot");
  });

  // lang btn -> pop
  $("topLangBtn")?.addEventListener("click",(e)=>{
    e.preventDefault(); e.stopPropagation();
    const pop = $("pop-top");
    if(!pop) return;
    const willShow = !pop.classList.contains("show");
    closeAllPop();
    if(willShow){
      pop.classList.add("show");
      renderPop("top");
    }
  });

  $("botLangBtn")?.addEventListener("click",(e)=>{
    e.preventDefault(); e.stopPropagation();
    const pop = $("pop-bot");
    if(!pop) return;
    const willShow = !pop.classList.contains("show");
    closeAllPop();
    if(willShow){
      pop.classList.add("show");
      renderPop("bot");
    }
  });

  // clear
  $("clearBtn")?.addEventListener("click",(e)=>{
    e.preventDefault(); e.stopPropagation();
    stopAll();
    $("topBody") && ($("topBody").innerHTML="");
    $("botBody") && ($("botBody").innerHTML="");
  });

  // logo -> home (isteğe bağlı)
  $("homeBtn")?.addEventListener("click", ()=> location.href = HOME_PATH);
}

document.addEventListener("DOMContentLoaded", async ()=>{
  if(!(await requireLogin())) return;

  setLangButtonTexts();
  bindUI();

  // voice preload (web)
  try{ window.speechSynthesis?.getVoices?.(); }catch{}
});
