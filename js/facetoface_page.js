// FILE: /js/facetoface_page.js
import { STORAGE_KEY } from "/js/config.js";
import { getSiteLang } from "/js/i18n.js";
import { supabase } from "/js/supabase_client.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";
import { setHeaderTokens } from "/js/ui_shell.js";

const $ = (id)=>document.getElementById(id);

// ✅ ONLINE API BASE (Render)
const API_BASE = "https://italky-api.onrender.com";

// ✅ doğru yollar
const LOGIN_PATH = "/pages/login.html";
const HOME_PATH  = "/pages/home.html";
const PROFILE_PATH = "/pages/profile.html";

/* ===============================
   AUTH GUARD (Supabase session)
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
   LANGUAGE REGISTRY (BÜYÜK)
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
  }catch{
    _dn = null;
  }
  return _dn;
}
function canonicalLangCode(code){
  const c = String(code||"").toLowerCase();
  return c.split("-")[0];
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
    try{
      const name = dn.of(baseCode);
      if(name) return name;
    }catch{}
  }
  if(UI_LANG === "tr" && TR_FALLBACK[baseCode]) return TR_FALLBACK[baseCode];
  return String(code||"").toUpperCase();
}
function labelChip(code){ return `${langFlag(code)} ${langLabel(code)}`; }

/* ===============================
   State
   =============================== */
let topLang = "en";
let botLang = "tr";

/* ===============================
   ✅ 1 Jeton = 60 dakika
   - İlk mic kullanımında RPC çağır
   - 60 dk içinde yeniden çağırma
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
      console.warn(error);
      alert("FaceToFace oturumu başlatılamadı.");
      return false;
    }

    const row = data?.[0] || {};
    if(row?.tokens_left != null){
      try{ setHeaderTokens(row.tokens_left); }catch{}
    }

    // charged true ise 1 jeton düştü; false ise aktif session vardı
    sessionGranted = true;
    return true;
  }catch(e){
    console.warn(e);
    alert("FaceToFace oturumu başlatılamadı.");
    return false;
  }
}

/* ===============================
   TTS
   =============================== */
function nativeTtsAvailable(){
  return !!(window.NativeTTS && typeof window.NativeTTS.speak === "function");
}
function nativeTtsStop(){
  try{
    if(window.NativeTTS && typeof window.NativeTTS.stop === "function"){
      window.NativeTTS.stop();
    }
  }catch{}
}

function speak(text, langCode) {
  const t = String(text || "").trim();
  if (!t) return;

  // ✅ APK: NativeTTS varsa önce STOP sonra SPEAK (stuck fix)
  if (window.NativeTTS && typeof window.NativeTTS.speak === "function") {
    try {
      if (typeof window.NativeTTS.stop === "function") {
        window.NativeTTS.stop();
      }
    } catch (_) {}

    try {
      window.NativeTTS.speak(t, String(langCode || "en"));
      return;
    } catch (e) {
      console.warn("NativeTTS.speak failed:", e);
      // fallback devam
    }
  }

  // ✅ Web fallback
  if (!window.speechSynthesis) return;
  try { window.speechSynthesis.cancel(); } catch (_) {}

  const u = new SpeechSynthesisUtterance(t);
  u.lang = bcp(langCode);
  u.volume = 1.0; u.rate = 1.0; u.pitch = 1.0;

  try {
    const voices = window.speechSynthesis.getVoices() || [];
    if (voices.length > 0) {
      const base = String(langCode || "").split("-")[0];
      u.voice = voices.find(v => String(v.lang || "").startsWith(base)) || voices[0];
    }
  } catch (_) {}

  setTimeout(() => {
    try { window.speechSynthesis.speak(u); } catch (e) { console.warn(e); }
  }, 60);
}
/* ===============================
   UI helpers
   =============================== */
function markLatestTranslation(side){
  const wrap = (side === "top") ? $("topBody") : $("botBody");
  if(!wrap) return;
  wrap.querySelectorAll(".bubble.me.is-latest").forEach(el=>el.classList.remove("is-latest"));
  const allMe = wrap.querySelectorAll(".bubble.me");
  const last = allMe[allMe.length - 1];
  if(last) last.classList.add("is-latest");
}

function closeAllPop(){
  $("pop-top")?.classList.remove("show");
  $("pop-bot")?.classList.remove("show");
}

let active = null;
let recTop = null;
let recBot = null;

function setMicUI(which, on){
  const btn = (which === "top") ? $("topMic") : $("botMic");
  btn?.classList.toggle("listening", !!on);
  const anyOn = !!on || !!recTop || !!recBot;
  $("frameRoot")?.classList.toggle("listening", anyOn);
}

function stopAll(){
  try{ recTop?.stop?.(); }catch{}
  try{ recBot?.stop?.(); }catch{}
  recTop = null; recBot = null; active = null;
  setMicUI("top", false); setMicUI("bot", false);
  $("frameRoot")?.classList.remove("listening");
  nativeTtsStop();
  try{ window.speechSynthesis?.cancel?.(); }catch{}
}

function clearChat(){
  closeAllPop();
  stopAll();
  const top = $("topBody");
  const bot = $("botBody");
  if(top) top.innerHTML = "";
  if(bot) bot.innerHTML = "";
}

function addBubble(side, kind, text, langForSpeak){
  const wrap = (side === "top") ? $("topBody") : $("botBody");
  if(!wrap) return;

  const row = document.createElement("div");
  row.className = `bubble ${kind}`;

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text||"").trim() || "—";
  row.appendChild(txt);

  if(kind === "me"){
    const spk = document.createElement("button");
    spk.className = "spk";
    spk.type = "button";
    spk.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>`;
    spk.addEventListener("click", (e)=>{
      e.preventDefault(); e.stopPropagation();
      speak(txt.textContent, langForSpeak);
    });
    row.appendChild(spk);
  }

  wrap.appendChild(row);
  if(kind === "me") markLatestTranslation(side);
  try{ wrap.scrollTop = wrap.scrollHeight; }catch{}
}

/* ===============================
   Popover
   =============================== */
function renderPop(side){
  const list = $(side === "top" ? "list-top" : "list-bot");
  if(!list) return;
  const sel = (side === "top") ? topLang : botLang;

  list.innerHTML = LANGS.map(l => `
    <div class="pop-item ${l.code===sel ? "active":""}" data-code="${l.code}">
      <div class="pop-left">
        <div class="pop-flag">${l.flag}</div>
        <div class="pop-name">${langLabel(l.code)}</div>
      </div>
      <div class="pop-code">${String(l.code).toUpperCase()}</div>
    </div>`).join("");

  list.querySelectorAll(".pop-item").forEach(item=>{
    item.addEventListener("click", ()=>{
      const code = item.getAttribute("data-code") || "en";
      if(side === "top") topLang = code; else botLang = code;

      const tTxt = side === "top" ? $("topLangTxt") : $("botLangTxt");
      if(tTxt) tTxt.textContent = labelChip(code);

      stopAll(); closeAllPop();
    });
  });
}

function togglePop(side){
  const pop = $(side === "top" ? "pop-top" : "pop-bot");
  if(!pop) return;
  const willShow = !pop.classList.contains("show");
  closeAllPop();
  if(!willShow) return;
  pop.classList.add("show");
  renderPop(side);
}

/* ===============================
   ONLINE TRANSLATE (Render API)
   =============================== */
async function translateViaApi(text, source, target){
  const t = String(text||"").trim();
  if(!t) return t;

  const ctrl = new AbortController();
  const to = setTimeout(()=>ctrl.abort(), 15000);

  try{
    const body = { text: t, source, target, from_lang: source, to_lang: target };
    const r = await fetch(`${API_BASE}/api/translate`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });

    if(!r.ok) throw new Error(`HTTP ${r.status}`);

    const data = await r.json().catch(()=> ({}));
    const out = String(data?.translated || data?.translation || data?.text || "").trim();
    return out || t;
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
  // ✅ İlk kullanımda oturum/jeton kontrol
  const ok = await ensureFacetofaceSession();
  if(!ok) return;

  const isAndroid = navigator.userAgent.includes("Android");
  if(location.protocol !== "https:" && location.hostname !== "localhost" && !isAndroid){
    alert("Mikrofon için HTTPS gerekli.");
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ alert("Bu tarayıcı SpeechRecognition desteklemiyor."); return; }

  if(active && active !== which) stopAll();

  const src = (which === "top") ? topLang : botLang;
  const dst = (which === "top") ? botLang : topLang;

  const rec = buildRecognizer(src);
  if(!rec){ alert("Mikrofon başlatılamadı."); return; }

  active = which;
  setMicUI(which, true);

  rec.onresult = async (e)=>{
    const t = e.results?.[0]?.[0]?.transcript || "";
    const finalText = String(t||"").trim();
    if(!finalText) return;

    addBubble(which, "them", finalText, src);

    const other = (which === "top") ? "bot" : "top";
    const translated = await translateViaApi(finalText, src, dst);

    if(!translated){
      addBubble(other, "me", "⚠️ Çeviri şu an yapılamadı. İnternet/API kontrol edin.", dst);
      return;
    }

    addBubble(other, "me", translated, dst);
    speak(translated, dst);
  };

  rec.onerror = (err)=>{ console.error("STT Error:", err); stopAll(); };
  rec.onend = ()=>{
    if(active === which) active = null;
    setMicUI(which, false);
    if(!active) $("frameRoot")?.classList.remove("listening");
  };

  if(which === "top") recTop = rec; else recBot = rec;
  try{ rec.start(); } catch{ stopAll(); }
}

/* ===============================
   Bindings
   =============================== */
function bindNav(){
  $("homeBtn")?.addEventListener("click", ()=>{ location.href = HOME_PATH; });
  $("topBack")?.addEventListener("click", ()=>{
    stopAll(); closeAllPop();
    if(history.length > 1) history.back(); else location.href = HOME_PATH;
  });
  $("clearChat")?.addEventListener("click", ()=>{ clearChat(); });
}

function bindLangButtons(){
  $("topLangBtn")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); togglePop("top"); });
  $("botLangBtn")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); togglePop("bot"); });
  $("close-top")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); closeAllPop(); });
  $("close-bot")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); closeAllPop(); });
}

function bindMicButtons(){
  $("topMic")?.addEventListener("click", (e)=>{
    e.preventDefault(); closeAllPop();
    if(active === "top") stopAll(); else start("top");
  });
  $("botMic")?.addEventListener("click", (e)=>{
    e.preventDefault(); closeAllPop();
    if(active === "bot") stopAll(); else start("bot");
  });
}

document.addEventListener("DOMContentLoaded", async ()=>{
  if(!(await requireLogin())) return;

  if($("topLangTxt")) $("topLangTxt").textContent = labelChip(topLang);
  if($("botLangTxt")) $("botLangTxt").textContent = labelChip(botLang);

  bindNav();
  bindLangButtons();
  bindMicButtons();

  try{ window.speechSynthesis?.getVoices?.(); }catch{}

  document.addEventListener("click", (e)=>{
    if(!$("pop-top")?.contains(e.target) && !$("pop-bot")?.contains(e.target) && !e.target.closest(".lang-trigger")) closeAllPop();
  }, { capture:true });
});
