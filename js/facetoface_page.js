// FILE: italky-web/js/facetoface_page.js
import { BASE_DOMAIN, STORAGE_KEY } from "/js/config.js";
import { getSiteLang } from "/js/i18n.js";

const $ = (id)=>document.getElementById(id);
function base(){ return String(BASE_DOMAIN||"").replace(/\/+$/,""); }

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
   LANGUAGE REGISTRY
   =============================== */
const LANGS = [
  { code:"tr", flag:"🇹🇷", bcp:"tr-TR" },
  { code:"en", flag:"🇬🇧", bcp:"en-US" },
  { code:"en-gb", flag:"🇬🇧", bcp:"en-GB" },
  { code:"de", flag:"🇩🇪", bcp:"de-DE" },
  { code:"fr", flag:"🇫🇷", bcp:"fr-FR" },
  { code:"it", flag:"🇮🇹", bcp:"it-IT" },
  { code:"es", flag:"🇪🇸", bcp:"es-ES" },
  { code:"pt", flag:"🇵🇹", bcp:"pt-PT" },
  { code:"pt-br", flag:"🇧🇷", bcp:"pt-BR" },
  { code:"ru", flag:"🇷🇺", bcp:"ru-RU" },
  { code:"uk", flag:"🇺🇦", bcp:"uk-UA" },
  { code:"bg", flag:"🇧🇬", bcp:"bg-BG" },
  { code:"el", flag:"🇬🇷", bcp:"el-GR" },
  { code:"ro", flag:"🇷🇴", bcp:"ro-RO" },
  { code:"sr", flag:"🇷🇸", bcp:"sr-RS" },
  { code:"hr", flag:"🇭🇷", bcp:"hr-HR" },
  { code:"bs", flag:"🇧🇦", bcp:"bs-BA" },
  { code:"sq", flag:"🇦🇱", bcp:"sq-AL" },
  { code:"mk", flag:"🇲🇰", bcp:"mk-MK" },
  { code:"az", flag:"🇦🇿", bcp:"az-AZ" },
  { code:"ka", flag:"🇬🇪", bcp:"ka-GE" },
  { code:"hy", flag:"🇦🇲", bcp:"hy-AM" },
  { code:"kk", flag:"🇰🇿", bcp:"kk-KZ" },
  { code:"uz", flag:"🇺🇿", bcp:"uz-UZ" },
  { code:"ky", flag:"🇰🇬", bcp:"ky-KG" },
  { code:"mn", flag:"🇲🇳", bcp:"mn-MN" },
  { code:"nl", flag:"🇳🇱", bcp:"nl-NL" },
  { code:"sv", flag:"🇸🇪", bcp:"sv-SE" },
  { code:"no", flag:"🇳🇴", bcp:"nb-NO" },
  { code:"da", flag:"🇩🇰", bcp:"da-DK" },
  { code:"fi", flag:"🇫🇮", bcp:"fi-FI" },
  { code:"pl", flag:"🇵🇱", bcp:"pl-PL" },
  { code:"cs", flag:"🇨🇿", bcp:"cs-CZ" },
  { code:"sk", flag:"🇸🇰", bcp:"sk-SK" },
  { code:"hu", flag:"🇭🇺", bcp:"hu-HU" },
  { code:"sl", flag:"🇸🇮", bcp:"sl-SI" },
  { code:"ar", flag:"🇸🇦", bcp:"ar-SA" },
  { code:"ar-eg", flag:"🇪🇬", bcp:"ar-EG" },
  { code:"he", flag:"🇮🇱", bcp:"he-IL" },
  { code:"fa", flag:"🇮🇷", bcp:"fa-IR" },
  { code:"ur", flag:"🇵🇰", bcp:"ur-PK" },
  { code:"hi", flag:"🇮🇳", bcp:"hi-IN" },
  { code:"bn", flag:"🇧🇩", bcp:"bn-BD" },
  { code:"ta", flag:"🇮🇳", bcp:"ta-IN" },
  { code:"te", flag:"🇮🇳", bcp:"te-IN" },
  { code:"th", flag:"🇹🇭", bcp:"th-TH" },
  { code:"vi", flag:"🇻🇳", bcp:"vi-VN" },
  { code:"id", flag:"🇮🇩", bcp:"id-ID" },
  { code:"ms", flag:"🇲🇾", bcp:"ms-MY" },
  { code:"fil", flag:"🇵🇭", bcp:"fil-PH" },
  { code:"zh", flag:"🇨🇳", bcp:"zh-CN" },
  { code:"zh-tw", flag:"🇹🇼", bcp:"zh-TW" },
  { code:"ja", flag:"🇯🇵", bcp:"ja-JP" },
  { code:"ko", flag:"🇰🇷", bcp:"ko-KR" },
  { code:"sw", flag:"🇰🇪", bcp:"sw-KE" },
  { code:"am", flag:"🇪🇹", bcp:"am-ET" },
];

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
function langObj(code){ return LANGS.find(x=>x.code===code); }
function langFlag(code){ return langObj(code)?.flag || "🌐"; }
function bcp(code){ return langObj(code)?.bcp || "en-US"; }
function langLabel(code){
  const dn = getDisplayNames();
  const baseCode = canonicalLangCode(code);
  if(dn){
    const name = dn.of(baseCode);
    if(name) return name;
  }
  return String(code||"").toUpperCase();
}

/* ===============================
   State
   =============================== */
let topLang = "en";
let botLang = "tr";

/* ===============================
   TTS
   =============================== */
function speak(text, langCode){
  const t = String(text||"").trim();
  if(!t) return;
  if(!("speechSynthesis" in window)) return;
  try{
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = bcp(langCode);
    window.speechSynthesis.speak(u);
  }catch{}
}

function markLatestTranslation(side){
  const wrap = (side === "top") ? $("topBody") : $("botBody");
  if(!wrap) return;
  wrap.querySelectorAll(".bubble.me.is-latest").forEach(el=>el.classList.remove("is-latest"));
  const allMe = wrap.querySelectorAll(".bubble.me");
  const last = allMe[allMe.length - 1];
  if(last) last.classList.add("is-latest");
}

function clearChat(){
  closeAllPop();
  stopAll();
  try{ window.speechSynthesis?.cancel?.(); }catch{}
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

function setMicUI(which, on){
  const btn = (which === "top") ? $("topMic") : $("botMic");
  btn?.classList.toggle("listening", !!on);
  const anyOn = !!on || !!recTop || !!recBot;
  $("frameRoot")?.classList.toggle("listening", anyOn);
}

function closeAllPop(){
  $("pop-top")?.classList.remove("show");
  $("pop-bot")?.classList.remove("show");
}
function labelChip(code){ return `${langFlag(code)} ${langLabel(code)}`; }
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
      if(side === "top"){
        topLang = code;
        if($("topLangTxt")) $("topLangTxt").textContent = labelChip(topLang);
      }else{
        botLang = code;
        if($("botLangTxt")) $("botLangTxt").textContent = labelChip(botLang);
      }
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

async function translateViaApi(text, source, target){
  const b = base();
  if(!b) return text;
  const ctrl = new AbortController();
  const to = setTimeout(()=>ctrl.abort(), 15000);
  try{
    const body = { text, source, target, from_lang: source, to_lang: target };
    const r = await fetch(`${b}/api/translate`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    if(!r.ok) return text;
    const data = await r.json().catch(()=> ({}));
    const out = String(data?.translated || data?.translation || data?.text || "").trim();
    return out || text;
  }catch{ return text; }finally{ clearTimeout(to); }
}

/* ===============================
   STT (Speech To Text)
   =============================== */
let active = null;
let recTop = null;
let recBot = null;

function stopAll(){
  try{ recTop?.stop?.(); }catch{}
  try{ recBot?.stop?.(); }catch{}
  recTop = null; recBot = null; active = null;
  setMicUI("top", false); setMicUI("bot", false);
  $("frameRoot")?.classList.remove("listening");
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
  // ✅ APK İÇİNDE PROTOKOL KONTROLÜNÜ ESNETİYORUZ
  const isAndroid = navigator.userAgent.includes("Android");
  if(location.protocol !== "https:" && location.hostname !== "localhost" && !isAndroid){
    alert("Mikrofon için HTTPS gerekli.");
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    alert("Bu tarayıcı SpeechRecognition desteklemiyor.");
    return;
  }

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
    addBubble(other, "me", translated, dst);
    speak(translated, dst);
  };

  rec.onerror = (err)=>{ 
    console.error("STT Error:", err); 
    stopAll(); 
  };
  rec.onend = ()=>{
    if(active === which) active = null;
    setMicUI(which, false);
    if(!active) $("frameRoot")?.classList.remove("listening");
  };

  if(which === "top") recTop = rec; else recBot = rec;
  try{ rec.start(); } catch{ stopAll(); }
}

/* ===============================
   Nav + Bindings
   =============================== */
const HOME_PATH = "/pages/home.html";

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

document.addEventListener("DOMContentLoaded", ()=>{
  if(!requireLogin()) return;
  if($("topLangTxt")) $("topLangTxt").textContent = labelChip(topLang);
  if($("botLangTxt")) $("botLangTxt").textContent = labelChip(botLang);
  bindNav(); bindLangButtons(); bindMicButtons();
  
  document.addEventListener("click", (e)=>{
    if(!$("pop-top")?.contains(e.target) && !$("pop-bot")?.contains(e.target) && !e.target.closest(".lang-trigger")) closeAllPop();
  }, { capture:true });
});
