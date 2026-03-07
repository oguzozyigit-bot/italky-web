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

const frameRoot = $("frameRoot");
const tapHint = $("tapHint");

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

let topLang = "en";
let botLang = "tr";
let ttsDebounceAt = 0;

function setStatus(type, text){
  if(statusPill){
    statusPill.className = `status-pill ${type}`;
    statusPill.textContent = text;
  }

  if(frameRoot){
    frameRoot.classList.remove("is-idle","is-listening","is-translating","is-ready","is-error");

    if(type === "idle") frameRoot.classList.add("is-idle");
    if(type === "listening") frameRoot.classList.add("is-listening");
    if(type === "translating") frameRoot.classList.add("is-translating");
    if(type === "ready") frameRoot.classList.add("is-ready");
    if(type === "error") frameRoot.classList.add("is-error");
  }

  if(tapHint){
    if(type === "listening"){
      tapHint.textContent = "Dinleniyor...";
    }else if(type === "translating"){
      tapHint.textContent = "Çeviri hazırlanıyor";
    }else if(type === "ready"){
      tapHint.textContent = "Tekrar konuşmak için mikrofona dokun";
    }else if(type === "error"){
      tapHint.textContent = "Tekrar denemek için mikrofona dokun";
    }else{
      tapHint.textContent = "Konuşmak için mikrofona dokun";
    }
  }
}

function bounceReady(delay = 1800){
  setTimeout(()=> setStatus("idle","Hazır"), delay);
}

function pointOrbTo(side){
  if(!frameRoot) return;
  frameRoot.classList.remove("to-top", "to-bot");
  frameRoot.classList.add(side === "top" ? "to-top" : "to-bot");
}

function setMicState(side, state){
  const mic = side === "top" ? topMic : botMic;
  if(!mic) return;

  mic.classList.remove("listening", "recorded");

  if(state === "listening") mic.classList.add("listening");
  if(state === "recorded") mic.classList.add("recorded");
}

function resetMics(){
  topMic?.classList.remove("listening", "recorded");
  botMic?.classList.remove("listening", "recorded");
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

  list.innerHTML = LANGS.map(l=>{
    const active = canonical(l.code)===canonical(sel) ? "active" : "";
    return `
      <div class="pop-item ${active}" data-code="${l.code}">
        <div class="pop-left">
          <div class="pop-flag">${l.flag}</div>
          <div class="pop-name">${l.name}</div>
        </div>
        <div class="pop-code">${l.code.toUpperCase()}</div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".pop-item").forEach(el=>{
    el.addEventListener("click", ()=>{
      const code = el.dataset.code || "en";
      if(side==="top") topLang = code;
      else botLang = code;
      refreshLangLabels();
      closeAllPop();
    });
  });
}

function stopAudio(){
  try{ window.speechSynthesis?.cancel?.(); }catch{}
  try{ window.NativeTTS?.stop?.(); }catch{}
}

function speak(text, langCode){
  const t = String(text||"").trim();
  if(!t) return;

  const now = Date.now();
  if(now - ttsDebounceAt < 250) stopAudio();
  ttsDebounceAt = now;

  stopAudio();

  if(window.NativeTTS && typeof window.NativeTTS.speak === "function"){
    try{
      window.NativeTTS.speak(t, canonical(langCode));
      return;
    }catch{}
  }

  if(!window.speechSynthesis) return;

  const u = new SpeechSynthesisUtterance(t);
  u.lang = langObj(langCode).bcp;
  u.rate = 1;
  u.pitch = 1;
  u.volume = 1;

  setTimeout(()=>{
    try{ window.speechSynthesis.speak(u); }catch{}
  }, 60);
}

function addBubble(side, kind, text, opts={}){
  const wrap = side==="top" ? topBody : botBody;
  if(!wrap) return null;

  const row = document.createElement("div");
  row.className = `bubble ${kind}` + (opts.latest ? " is-latest" : "");

  if(kind === "me"){
    const spk = document.createElement("div");
    spk.className = "spk-icon";
    spk.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M3 10v4h4l5 4V6L7 10H3"></path>
        <path d="M16 8a4 4 0 0 1 0 8"></path>
        <path d="M19 5a8 8 0 0 1 0 14"></path>
      </svg>
    `;
    spk.addEventListener("click", ()=>{
      const txt = row.querySelector(".txt")?.textContent || "";
      speak(txt, opts.speakLang || "en");
    });
    row.appendChild(spk);
  }

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text||"").trim();
  row.appendChild(txt);

  wrap.appendChild(row);
  try{ wrap.scrollTop = wrap.scrollHeight; }catch{}
  return row;
}

function clearLatest(side){
  const wrap = side==="top" ? topBody : botBody;
  wrap?.querySelectorAll(".bubble.me.is-latest").forEach(x=>x.classList.remove("is-latest"));
}

async function translateText(text, from, to){
  const src = canonical(from);
  const dst = canonical(to);

  try{
    const r = await fetch(`${API_BASE}/api/translate_ai`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        text: String(text||"").trim(),
        from_lang: src,
        to_lang: dst
      })
    });

    if(!r.ok){
      const raw = await r.text().catch(()=> "");
      console.error("translate_ai failed", r.status, raw);
      return null;
    }

    const j = await r.json().catch(()=>null);
    return String(j?.translated || "").trim() || null;
  }catch(e){
    console.error("translate_ai error", e);
    return null;
  }
}

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
      setTimeout(()=>finish(null), 8000);
    }catch{
      finish(null);
    }
  });
}

async function handleInput(side){
  const src = side === "top" ? topLang : botLang;
  const dst = side === "top" ? botLang : topLang;
  const other = side === "top" ? "bot" : "top";
  const otherWrap = other === "top" ? topBody : botBody;

  pointOrbTo(side);
  resetMics();
  setMicState(side, "listening");
  setStatus("listening", "Dinleniyor");

  let text = await speechToText(src);

  if(!text){
    resetMics();
    setStatus("error", "Ses alınamadı");
    bounceReady(1800);
    return;
  }

  setMicState(side, "recorded");
  addBubble(side, "them", text);

  clearLatest(other);
  setStatus("translating", "Çevriliyor");

  addBubble(other, "me", "Çevriliyor...", { latest:true, speakLang: dst });
  const latestTxt = otherWrap?.querySelector(".bubble.me.is-latest .txt");

  const tr = await translateText(text, src, dst);

  if(!tr){
    resetMics();
    setStatus("error", "Bağlantı hatası");
    if(latestTxt){
      latestTxt.textContent = "⚠️ Çeviri servisine ulaşılamadı";
    }
    bounceReady(1800);
    return;
  }

  if(latestTxt){
    latestTxt.textContent = tr;
  }else{
    addBubble(other, "me", tr, { latest:true, speakLang: dst });
  }

  speak(tr, dst);
  resetMics();
  setStatus("ready", "Hazır");

  setTimeout(()=>{
    setStatus("idle", "Hazır");
  }, 1800);
}

function bind(){
  setStatus("idle","Hazır");
  pointOrbTo("bot");
  resetMics();
  refreshLangLabels();

  topLangBtn?.addEventListener("click",(e)=>{
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
    renderPop("top");
    popTop?.classList.add("show");
  });

  botLangBtn?.addEventListener("click",(e)=>{
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
    renderPop("bot");
    popBot?.classList.add("show");
  });

  closeTop?.addEventListener("click",(e)=>{
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
  });

  closeBot?.addEventListener("click",(e)=>{
    e.preventDefault();
    e.stopPropagation();
    closeAllPop();
  });

  document.addEventListener("click",(e)=>{
    const inside = (popTop && popTop.contains(e.target)) || (popBot && popBot.contains(e.target));
    const isBtn = e.target?.closest?.("#topLangBtn,#botLangBtn");
    if(!inside && !isBtn) closeAllPop();
  }, { capture:true });

  clearBtn?.addEventListener("click", ()=>{
    stopAudio();
    if(topBody) topBody.innerHTML = "";
    if(botBody) botBody.innerHTML = "";
    resetMics();
    setStatus("idle","Hazır");
  });

  homeLink?.addEventListener("click", ()=> location.href="/pages/home.html");
  homeBtn?.addEventListener("click", ()=> location.href="/pages/home.html");

  topMic?.addEventListener("click", async (e)=>{
    e.preventDefault();
    e.stopPropagation();
    await handleInput("top");
  });

  botMic?.addEventListener("click", async (e)=>{
    e.preventDefault();
    e.stopPropagation();
    await handleInput("bot");
  });
}

bind();
