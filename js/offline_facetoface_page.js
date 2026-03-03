// FILE: /js/offline_facetoface_page.js
// ✅ Offline Face-to-Face (Metin ağırlıklı) — Mic zorunlu değil
// ✅ Mic butonu: Offline’da "Metin Gir" çalışır (stabil)
// ✅ TTS: NativeTTS varsa offline çalışır; yoksa speechSynthesis fallback
// ✅ Model kontrol: seçilen dil çiftinin 2 yön zip’i cache’te yoksa offline’da uyarır ve Offline Diller sayfasına yollar
// ✅ Çeviri: İnternet varsa /api/translate_ai ile (online kalite), internet yoksa "Offline motor yakında" (şimdilik)

import { LANG_POOL } from "/js/lang_pool_full.js";
import { supabase } from "/js/supabase_client.js";

const API_BASE = "https://italky-api.onrender.com";
const BUCKET = "offline";
const CACHE_NAME = "italky-offline-v1";

const $ = (id)=>document.getElementById(id);

const BCP = {
  tr:"tr-TR", en:"en-US", de:"de-DE", fr:"fr-FR", it:"it-IT", es:"es-ES",
  ru:"ru-RU", el:"el-GR", az:"az-AZ", ka:"ka-GE"
};

const LANGS = (Array.isArray(LANG_POOL) ? LANG_POOL : []).map(l=>{
  const code = String(l.code||"").toLowerCase().trim();
  if(!code) return null;
  return { code, flag: l.flag||"🌐", name: l.name||code.toUpperCase(), bcp: BCP[code] || "en-US" };
}).filter(Boolean);

const allowed = new Set(["tr","en","de","fr","it","es","ru","el","az","ka"]);

function canonical(code){
  return String(code||"").toLowerCase().split("-")[0].trim();
}
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
   Cache helpers (model var mı?)
================================ */
function pairPath(pair){ return `langpacks/${pair}/model.zip`; }
function publicUrl(path){
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data?.publicUrl || "";
}
async function cacheOpen(){ return await caches.open(CACHE_NAME); }
async function isCached(url){
  const c = await cacheOpen();
  const m = await c.match(url);
  return !!m;
}

async function ensurePairInstalled(src, dst){
  const a = `${canonical(src)}-${canonical(dst)}`;
  const b = `${canonical(dst)}-${canonical(src)}`;

  const u1 = publicUrl(pairPath(a));
  const u2 = publicUrl(pairPath(b));
  if(!u1 || !u2) return false;

  const ok1 = await isCached(u1);
  const ok2 = await isCached(u2);
  return ok1 && ok2;
}

/* ===============================
   Bubble + Speaker
================================ */
function stopAudio(){
  try{ window.speechSynthesis?.cancel?.(); }catch{}
  try{ window.NativeTTS?.stop?.(); }catch{}
}

function speak(text, langCode){
  const t = String(text||"").trim();
  if(!t) return;

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

  // offline motor daha sonra
  return null;
}

/* ===============================
   Offline input flow (Mic = Text input)
================================ */
let topLang = "en";
let botLang = "tr";

async function askTextInput(side){
  const src = side==="top" ? topLang : botLang;
  const dst = side==="top" ? botLang : topLang;
  const other = side==="top" ? "bot" : "top";

  // ✅ offline model kontrol (yalnız offline iken)
  if(!navigator.onLine){
    const ok = await ensurePairInstalled(src, dst);
    if(!ok){
      alert("Bu dil çifti offline indirili değil. Önce Offline Diller sayfasından indir.");
      location.href = "/pages/offline_languages.html";
      return;
    }
  }

  const raw = prompt(`${langObj(src).name} yazın → ${langObj(dst).name} çevrilecek:`) || "";
  const text = String(raw).trim();
  if(!text) return;

  setFrameListening(true);
  try{
    addBubble(side, "them", text);

    const tr = await translateText(text, src, dst);

    clearLatest(other);

    if(!tr){
      addBubble(other, "me", "⚠️ Offline çeviri motoru bir sonraki adım. Şimdilik internet varsa çevirir.", { latest:true, speakLang: dst });
      return;
    }

    addBubble(other, "me", tr, { latest:true, speakLang: dst });
    speak(tr, dst);

  }finally{
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
    await askTextInput("top");
  });

  botMic?.addEventListener("click", async (e)=>{
    e.preventDefault(); e.stopPropagation();
    await askTextInput("bot");
  });
}

bind();
