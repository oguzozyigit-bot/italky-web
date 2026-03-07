import { LANG_POOL } from "/js/lang_pool_full.js";

const API_BASE = "https://italky-api.onrender.com";
const $ = (id)=>document.getElementById(id);

const BCP = {
  tr:"tr-TR", en:"en-US", de:"de-DE", fr:"fr-FR", it:"it-IT", es:"es-ES",
  ru:"ru-RU", el:"el-GR", az:"az-AZ", ka:"ka-GE"
};

function canonical(code){
  return String(code||"").toLowerCase().split("-")[0].trim();
}

const LANGS = (Array.isArray(LANG_POOL) ? LANG_POOL : []).map(l=>{
  const code = canonical(l.code);
  if(!code) return null;
  return { code, flag:l.flag||"🌐", name:l.name||code.toUpperCase(), bcp:BCP[code]||"en-US" };
}).filter(Boolean);

function langObj(code){
  const c = canonical(code);
  return LANGS.find(x=>x.code===c) || { code:c, flag:"🌐", name:c.toUpperCase(), bcp:BCP[c]||"en-US" };
}

function labelChip(code){
  const o = langObj(code);
  return `${o.flag} ${o.name}`;
}

/* UI */
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

const clearBtn = $("clearBtn");
const homeLink = $("homeLink");
const homeBtn = $("homeBtn");

const statusPill = $("statusPill");

const textModal = $("textModal");
const textModalTitle = $("textModalTitle");
const textModalInput = $("textModalInput");
const textModalOk = $("textModalOk");
const textModalCancel = $("textModalCancel");

let topLang = "en";
let botLang = "tr";
let ttsDebounceAt = 0;

/* ===============================
   STATUS
================================ */

function setStatus(type,text){
  if(!statusPill) return;
  statusPill.className=`status-pill ${type}`;
  statusPill.textContent=text;
}

function bounceReady(){
  setTimeout(()=>setStatus("idle","Hazır"),1400);
}

/* ===============================
   POPUP TEXT INPUT
================================ */

function askTextInput(title){
  return new Promise((resolve)=>{
    if(!textModal){
      const raw = prompt(title)||"";
      return resolve(raw.trim()||null);
    }

    textModalTitle.textContent=title;
    textModalInput.value="";
    textModal.classList.add("show");

    const finish=(v)=>{
      textModal.classList.remove("show");
      resolve(v);
    }

    textModalOk.onclick=()=>{
      finish(textModalInput.value.trim()||null);
    }

    textModalCancel.onclick=()=>finish(null);

    textModalInput.onkeydown=(e)=>{
      if(e.key==="Enter"){
        e.preventDefault();
        finish(textModalInput.value.trim()||null);
      }
      if(e.key==="Escape"){
        finish(null);
      }
    }

    setTimeout(()=>textModalInput.focus(),50);
  });
}

/* ===============================
   AUDIO
================================ */

function stopAudio(){
  try{window.speechSynthesis?.cancel()}catch{}
  try{window.NativeTTS?.stop()}catch{}
}

function speak(text,langCode){
  const t = String(text||"").trim();
  if(!t) return;

  const now=Date.now();
  if(now-ttsDebounceAt<250) stopAudio();
  ttsDebounceAt=now;

  stopAudio();

  if(window.NativeTTS && typeof window.NativeTTS.speak==="function"){
    try{
      window.NativeTTS.speak(t,canonical(langCode));
      return;
    }catch{}
  }

  if(!window.speechSynthesis) return;

  const u=new SpeechSynthesisUtterance(t);
  u.lang=langObj(langCode).bcp;
  setTimeout(()=>window.speechSynthesis.speak(u),60);
}

/* ===============================
   BUBBLE
================================ */

function addBubble(side,kind,text,opts={}){
  const wrap=side==="top"?topBody:botBody;
  if(!wrap) return;

  const row=document.createElement("div");
  row.className=`bubble ${kind}`+(opts.latest?" is-latest":"");

  if(kind==="me"){
    const spk=document.createElement("div");
    spk.className="spk-icon";
    spk.innerHTML=`<svg viewBox="0 0 24 24"><path d="M3 10v4h4l5 4V6L7 10H3"/><path d="M16 8a4 4 0 0 1 0 8"/><path d="M19 5a8 8 0 0 1 0 14"/></svg>`;
    spk.onclick=()=>{
      const txt=row.querySelector(".txt")?.textContent||"";
      speak(txt,opts.speakLang||"en");
    };
    row.appendChild(spk);
  }

  const txt=document.createElement("span");
  txt.className="txt";
  txt.textContent=text;
  row.appendChild(txt);

  wrap.appendChild(row);
  wrap.scrollTop=wrap.scrollHeight;
}

function clearLatest(side){
  const wrap=side==="top"?topBody:botBody;
  wrap?.querySelectorAll(".bubble.me.is-latest").forEach(x=>x.classList.remove("is-latest"));
}

/* ===============================
   TRANSLATE
================================ */

async function translateText(text,from,to){

  const src=canonical(from);
  const dst=canonical(to);

  try{
    const r=await fetch(`${API_BASE}/api/translate_ai`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        text:text,
        from_lang:src,
        to_lang:dst
      })
    });

    if(!r.ok){
      console.error("translate_ai failed",r.status);
      return null;
    }

    const j=await r.json().catch(()=>null);
    return String(j?.translated||"").trim()||null;

  }catch(e){
    console.error("translate_ai error",e);
    return null;
  }
}

/* ===============================
   SPEECH
================================ */

function getRecognizer(langCode){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR) return null;

  const rec=new SR();
  rec.lang=langObj(langCode).bcp;
  rec.interimResults=false;
  rec.continuous=false;
  rec.maxAlternatives=1;

  return rec;
}

async function speechToText(langCode){
  return new Promise(resolve=>{

    const rec=getRecognizer(langCode);
    if(!rec) return resolve(null);

    let done=false;

    const finish=v=>{
      if(done) return;
      done=true;
      try{rec.stop()}catch{}
      resolve(v);
    }

    rec.onresult=e=>{
      const t=e.results?.[0]?.[0]?.transcript||"";
      finish(t.trim()||null);
    }

    rec.onerror=()=>finish(null);
    rec.onend=()=>{if(!done)finish(null)}

    try{
      rec.start();
      setTimeout(()=>finish(null),8000);
    }catch{
      finish(null);
    }

  });
}

/* ===============================
   INPUT FLOW
================================ */

async function handleInput(side){
  const src = side === "top" ? topLang : botLang;
  const dst = side === "top" ? botLang : topLang;
  const other = side === "top" ? "bot" : "top";
  const otherWrap = other === "top" ? topBody : botBody;

  setStatus("listening", "Dinleniyor");

  let text = await speechToText(src);

  if(!text){
    text = await askTextInput(`${langObj(src).name} yaz → ${langObj(dst).name} çevrilecek`);
  }

  if(!text){
    setStatus("idle", "Hazır");
    return;
  }

  addBubble(side, "them", text);

  clearLatest(other);
  setStatus("translating", "Çevriliyor");

  // Geçici balon
  addBubble(other, "me", "Çevriliyor...", { latest:true, speakLang: dst });

  const latestTxt = otherWrap?.querySelector(".bubble.me.is-latest .txt");

  const tr = await translateText(text, src, dst);

  if(!tr){
    setStatus("error", "Bağlantı hatası");
    if(latestTxt){
      latestTxt.textContent = "⚠️ Çeviri servisine ulaşılamadı";
    }
    bounceReady();
    return;
  }

  if(latestTxt){
    latestTxt.textContent = tr;
  }else{
    addBubble(other, "me", tr, { latest:true, speakLang: dst });
  }

  speak(tr, dst);
  setStatus("ready", "Hazır");
  bounceReady();
}

/* ===============================
   UI BINDINGS
================================ */

function refreshLangLabels(){
  topLangTxt.textContent=labelChip(topLang);
  botLangTxt.textContent=labelChip(botLang);
}

function closeAllPop(){
  popTop?.classList.remove("show");
  popBot?.classList.remove("show");
}

function renderPop(side){

  const list=side==="top"?listTop:listBot;
  const sel=side==="top"?topLang:botLang;

  list.innerHTML=LANGS.map(l=>{
    const active=canonical(l.code)===canonical(sel)?"active":"";
    return `<div class="pop-item ${active}" data-code="${l.code}">
      <div class="pop-left">
      <div class="pop-flag">${l.flag}</div>
      <div class="pop-name">${l.name}</div>
      </div>
      <div class="pop-code">${l.code.toUpperCase()}</div>
    </div>`
  }).join("");

  list.querySelectorAll(".pop-item").forEach(el=>{
    el.onclick=()=>{
      const code=el.dataset.code;
      if(side==="top") topLang=code;
      else botLang=code;
      refreshLangLabels();
      closeAllPop();
    }
  });
}

function bind(){

  setStatus("idle","Hazır");
  refreshLangLabels();

  topLangBtn.onclick=()=>{renderPop("top");popTop.classList.add("show")}
  botLangBtn.onclick=()=>{renderPop("bot");popBot.classList.add("show")}

  closeTop.onclick=closeAllPop;
  closeBot.onclick=closeAllPop;

  document.addEventListener("click",(e)=>{
    if(!e.target.closest(".popover")&&!e.target.closest(".lang-trigger")) closeAllPop();
  });

  clearBtn.onclick=()=>{
    stopAudio();
    topBody.innerHTML="";
    botBody.innerHTML="";
  }

  homeLink.onclick=()=>location.href="/pages/home.html";
  homeBtn.onclick=()=>location.href="/pages/home.html";

  topMic.onclick=()=>handleInput("top");
  botMic.onclick=()=>handleInput("bot");
}

bind();
