// FILE: /js/offline_facetoface_page.js
// ✅ Offline Face-to-Face FINAL
// ✅ Mic: SpeechRecognition varsa konuşmayı yazıya çevirir (WebView uyumlu)
// ✅ SpeechRecognition yoksa/çalışmazsa: otomatik prompt ile metin alır (asla kitlenmez)
// ✅ TTS: NativeTTS öncelikli, yoksa speechSynthesis. Üst üste binme engelli.
// ✅ Offline model kontrol: window.Offline.isInstalled ile (2 yön) kontrol
// ✅ Çeviri: Online ise /api/translate_ai, offline ise (şimdilik) uyarı + metin gösterimi

import { LANG_POOL } from "/js/lang_pool_full.js";
import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";
const BUCKET = "offline";

const $ = (id)=>document.getElementById(id);

const BCP = {
  tr:"tr-TR", en:"en-US", de:"de-DE", fr:"fr-FR", it:"it-IT", es:"es-ES",
  ru:"ru-RU", el:"el-GR", az:"az-AZ", ka:"ka-GE"
};

const allowed = new Set(["tr","en","de","fr","it","es","ru","el","az","ka"]);

function canonical(code){
  return String(code||"").toLowerCase().split("-")[0].trim();
}

const LANGS = (Array.isArray(LANG_POOL) ? LANG_POOL : []).map(l=>{
  const code = canonical(l.code);
  if(!code) return null;
  return { code, flag: l.flag||"🌐", name: l.name||code.toUpperCase(), bcp: BCP[code] || "en-US" };
}).filter(Boolean);

function langObj(code){
  const c = canonical(code);
  return LANGS.find(x=>x.code===c) || { code:c, flag:"🌐", name:c.toUpperCase(), bcp: BCP[c]||"en-US" };
}
function labelChip(code){
  const o = langObj(code);
  return `${o.flag} ${o.name}`;
}

// UI refs
const topBody = $("topBody");
const botBody = $("botBody");
const topMic = $("topMic");
const botMic = $("botMic");

const topLangBtn = $("topLangBtn");
const botLangBtn = $("botLangBtn");
const topLangTxt = $("topLangTxt");
const botLangTxt = $("botLangTxt");

const popTop = $("pop-top");
const popBot = $("pop-bot");
const listTop = $("list-top");
const listBot = $("list-bot");
const closeTop = $("close-top");
const closeBot = $("close-bot");
const clearChat = $("clearChat");

function setFrameListening(on){
  const root = document.getElementById("frameRoot");
  if(root) root.classList.toggle("listening", !!on);
}

let topLang = "en";
let botLang = "tr";

function refreshLangLabels(){
  if(topLangTxt) topLangTxt.textContent = labelChip(topLang);
  if(botLangTxt) botLangTxt.textContent = labelChip(botLang);
}

function closeAllPop(){
  popTop?.classList.remove("show");
  popBot?.classList.remove("show");
}

function renderPop(side){
  const list = side==="top" ? listTop : listBot;
  const sel = side==="top" ? topLang : botLang;
  if(!list) return;

  const items = LANGS.filter(x=>allowed.has(canonical(x.code)));

  list.innerHTML = items.map(l=>{
    const active = canonical(l.code) === canonical(sel) ? "active" : "";
    return `
      <div class="pop-item ${active}" data-code="${canonical(l.code)}">
        <div class="pop-left">
          <div class="pop-flag">${l.flag}</div>
          <div class="pop-name">${l.name}</div>
        </div>
        <div class="pop-code">${canonical(l.code).toUpperCase()}</div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".pop-item").forEach(el=>{
    el.addEventListener("click", ()=>{
      const code = el.getAttribute("data-code") || "en";
      if(side==="top") topLang = code; else botLang = code;
      refreshLangLabels();
      closeAllPop();
    });
  });
}

/* ===============================
   Model kontrol (Native bridge)
================================ */
function pairPath(pair){ return `langpacks/${pair}/model.zip`; }
function publicUrl(path){
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}

function nativeReady(){
  return !!(window.Offline && typeof window.Offline.isInstalled === "function");
}
function isInstalledNative(pair){
  try{ return !!window.Offline.isInstalled(canonical(pair)); }catch{ return false; }
}

async function ensurePairInstalled(src, dst){
  // offline modda: iki yön de kurulu mu?
  const a = `${canonical(src)}-${canonical(dst)}`;
  const b = `${canonical(dst)}-${canonical(src)}`;

  if(nativeReady()){
    return isInstalledNative(a) && isInstalledNative(b);
  }

  // bridge yoksa yine de indirmeye yönlendirelim
  return false;
}

/* ===============================
   Bubble + Speaker
================================ */
let ttsDebounceAt = 0;

function stopAudio(){
  try{ window.speechSynthesis?.cancel?.(); }catch{}
  try{ window.NativeTTS?.stop?.(); }catch{}
}

function speak(text, langCode){
  const t = String(text||"").trim();
  if(!t) return;

  // ✅ spam engeli
  const now = Date.now();
  if(now - ttsDebounceAt < 250){
    stopAudio();
  }
  ttsDebounceAt = now;

  stopAudio();

  // ✅ NativeTTS varsa offline
  if(window.NativeTTS && typeof window.NativeTTS.speak === "function"){
    try{ window.NativeTTS.speak(t, canonical(langCode)); }catch{}
    return;
  }

  // web fallback
  if(!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(t);
  u.lang = langObj(langCode).bcp;
  u.rate = 1; u.pitch = 1; u.volume = 1;
  setTimeout(()=>{ try{ window.speechSynthesis.speak(u); }catch{} }, 60);
}

function addBubble(side, kind, text, opts={}){
  const wrap = side==="top" ? topBody : botBody;
  if(!wrap) return null;

  const row = document.createElement("div");
  row.className = `bubble ${kind}` + (opts.latest ? " is-latest" : "");

  if(kind === "me"){
    const spk = document.createElement("div");
    spk.className = "spk";
    spk.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 10v4h4l5 4V6L7 10H3z"></path>
        <path d="M16 8a4 4 0 0 1 0 8"></path>
        <path d="M19 5a8 8 0 0 1 0 14"></path>
      </svg>
    `;
    spk.addEventListener("click",(e)=>{
      e.preventDefault(); e.stopPropagation();
      const txt = row.querySelector(".txt")?.textContent || "";
      speak(txt, opts.speakLang || "en");
    });
    row.appendChild(spk);
  }

  const txt = document.createElement("span");
  txt.className="txt";
  txt.textContent = String(text||"").trim();
  row.appendChild(txt);

  wrap.appendChild(row);
  try{ wrap.scrollTop = wrap.scrollHeight; }catch{}
  return row;
}

function clearLatest(side){
  const wrap = side==="top" ? topBody : botBody;
  if(!wrap) return;
  wrap.querySelectorAll(".bubble.me.is-latest").forEach(x=>x.classList.remove("is-latest"));
}

/* ===============================
   Translate (online if available)
================================ */
async function translateText(text, from, to){
  const t = String(text||"").trim();
  if(!t) return "";
  const src = canonical(from);
  const dst = canonical(to);
  if(src === dst) return t;

  if(navigator.onLine){
    try{
      const r = await fetch(`${API_BASE}/api/translate_ai`,{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ text: t, from_lang: src, to_lang: dst })
      });
      if(!r.ok) return null;
      const j = await r.json().catch(()=>null);
      return String(j?.translated||"").trim() || null;
    }catch{
      return null;
    }
  }

  // offline motor daha sonra (native translate geldiğinde buraya bağlarız)
  return null;
}

/* ===============================
   Mic → SpeechRecognition (varsa)
================================ */
function getRecognizer(langCode){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const rec = new SR();
  rec.lang = langObj(langCode).bcp;
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  return rec;
}

async function speechToText(langCode){
  return new Promise((resolve)=>{
    const rec = getRecognizer(langCode);
    if(!rec) return resolve(null);

    let done = false;
    const finish = (val)=>{
      if(done) return;
      done = true;
      try{ rec.stop?.(); }catch{}
      resolve(val);
    };

    rec.onresult = (e)=>{
      const t = e.results?.[0]?.[0]?.transcript || "";
      finish(String(t||"").trim() || null);
    };
    rec.onerror = ()=> finish(null);
    rec.onend = ()=> { if(!done) finish(null); };

    try{
      rec.start();
      // 8 sn emniyet
      setTimeout(()=>finish(null), 8000);
    }catch{
      finish(null);
    }
  });
}

/* ===============================
   Input flow (Mic + fallback)
================================ */
async function handleInput(side){
  const src = side==="top" ? topLang : botLang;
  const dst = side==="top" ? botLang : topLang;
  const other = side==="top" ? "bot" : "top";

  // offline iken model kurulu mu?
  if(!navigator.onLine){
    const ok = await ensurePairInstalled(src, dst);
    if(!ok){
      alert("Bu dil çifti offline indirili değil. Önce Offline Diller sayfasından indir.");
      location.href = "/pages/offline_languages.html";
      return;
    }
  }

  setFrameListening(true);

  try{
    // 1) Mic -> SpeechRecognition
    let text = await speechToText(src);

    // 2) fallback prompt
    if(!text){
      const raw = prompt(`${langObj(src).name} yazın → ${langObj(dst).name} çevrilecek:`) || "";
      text = String(raw).trim() || null;
    }

    if(!text) return;

    addBubble(side, "them", text);

    const tr = await translateText(text, src, dst);
    clearLatest(other);

    if(!tr){
      addBubble(
        other,
        "me",
        navigator.onLine
          ? "⚠️ Çeviri servisine ulaşılamadı."
          : "⚠️ Offline çeviri motoru (native) bir sonraki adım. Şimdilik internet varken çevirir.",
        { latest:true, speakLang: dst }
      );
      return;
    }

    addBubble(other, "me", tr, { latest:true, speakLang: dst });
    speak(tr, dst);

  } finally {
    setFrameListening(false);
  }
}

/* ===============================
   Bindings
================================ */
function bind(){
  refreshLangLabels();

  topLangBtn?.addEventListener("click",(e)=>{
    e.preventDefault(); e.stopPropagation();
    closeAllPop();
    renderPop("top");
    popTop?.classList.add("show");
  });

  botLangBtn?.addEventListener("click",(e)=>{
    e.preventDefault(); e.stopPropagation();
    closeAllPop();
    renderPop("bot");
    popBot?.classList.add("show");
  });

  closeTop?.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); closeAllPop(); });
  closeBot?.addEventListener("click",(e)=>{ e.preventDefault(); e.stopPropagation(); closeAllPop(); });

  document.addEventListener("click",(e)=>{
    const inside = (popTop && popTop.contains(e.target)) || (popBot && popBot.contains(e.target));
    const isBtn = e.target?.closest?.("#topLangBtn,#botLangBtn");
    if(!inside && !isBtn) closeAllPop();
  }, { capture:true });

  clearChat?.addEventListener("click", ()=>{
    stopAudio();
    if(topBody) topBody.innerHTML = "";
    if(botBody) botBody.innerHTML = "";
  });

  topMic?.addEventListener("click", async (e)=>{
    e.preventDefault(); e.stopPropagation();
    await handleInput("top");
  });

  botMic?.addEventListener("click", async (e)=>{
    e.preventDefault(); e.stopPropagation();
    await handleInput("bot");
  });
}

bind();
