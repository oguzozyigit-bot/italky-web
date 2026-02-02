// FILE: italky-web/js/fast_page.js
// Anında Çeviri v8
// ✅ Default: TR -> EN
// ✅ Play/Pause: pointerdown + click fallback
// ✅ liveWave.running class (shimmer)
// ✅ Anti-loop: dedupe + min-change + cooldown + hard cap
// ✅ Sessiz: hiçbir bip/ses üretmeyiz (OS bip'i web ile kapatılamaz)

import { BASE_DOMAIN } from "/js/config.js";
const $ = (id)=>document.getElementById(id);

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 2200);
}

const LANGS = [
  { code:"tr", name:"Türkçe",     sr:"tr-TR" },
  { code:"en", name:"English",    sr:"en-US" },
  { code:"de", name:"Deutsch",    sr:"de-DE" },
  { code:"fr", name:"Français",   sr:"fr-FR" },
  { code:"it", name:"Italiano",   sr:"it-IT" },
  { code:"es", name:"Español",    sr:"es-ES" },
  { code:"pt", name:"Português",  sr:"pt-PT" },
  { code:"ru", name:"Русский",    sr:"ru-RU" },
  { code:"ar", name:"العربية",    sr:"ar-SA" },
  { code:"nl", name:"Nederlands", sr:"nl-NL" },
  { code:"sv", name:"Svenska",    sr:"sv-SE" },
  { code:"no", name:"Norsk",      sr:"nb-NO" },
  { code:"da", name:"Dansk",      sr:"da-DK" },
  { code:"pl", name:"Polski",     sr:"pl-PL" },
];

function by(code){ return LANGS.find(x=>x.code===code) || LANGS[0]; }
function baseUrl(){ return String(BASE_DOMAIN||"").replace(/\/+$/,""); }

function escapeHtml(s=""){
  return String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}
function norm(s){
  return String(s||"")
    .toLowerCase()
    .trim()
    .replace(/\s+/g," ")
    .replace(/[’']/g,"'")
    .replace(/[.,!?;:]+$/g,"");
}

/* ========= UI ========= */
function setStatusTop(s){ $("panelStatus").textContent = s; }
function setStatusWave(s){ $("waveStatus").textContent = s; }

function setPlayUI(on){
  $("playBtn")?.classList.toggle("running", !!on);
  $("liveWave")?.classList.toggle("running", !!on);
  $("icoPlay").style.display = on ? "none" : "block";
  $("icoPause").style.display = on ? "block" : "none";
}

/* stream lines */
function ensureLiveBubble(){
  const wrap = $("stream");
  const last = wrap.lastElementChild;
  if(last && last.dataset.live === "1") return last;

  const b = document.createElement("div");
  b.className = "bubble";
  b.dataset.live = "1";
  b.innerHTML = "—";
  wrap.appendChild(b);

  while(wrap.children.length > 8) wrap.removeChild(wrap.firstElementChild);
  wrap.scrollTop = wrap.scrollHeight;
  return b;
}
function finalizeLiveBubble(){
  const wrap = $("stream");
  const last = wrap.lastElementChild;
  if(last && last.dataset.live === "1") last.dataset.live = "0";
}

/* ========= Dropdown ========= */
function buildDropdown(rootId, btnId, txtId, menuId, defCode){
  const root = $(rootId);
  const btn = $(btnId);
  const txt = $(txtId);
  const menu = $(menuId);

  let current = defCode;

  function closeAll(){
    document.querySelectorAll(".dd.open").forEach(x=>x.classList.remove("open"));
  }

  function setValue(code, silent=false){
    current = code;
    txt.textContent = by(code).name;
    if(!silent) root.dispatchEvent(new CustomEvent("italky:change", { detail:{ code } }));
  }

  menu.innerHTML = `
    <div class="ddSearchWrap"><input class="ddSearch" type="text" placeholder="Ara..." /></div>
    ${LANGS.map(l=>`<div class="ddItem" data-code="${l.code}">${l.name}</div>`).join("")}
  `;

  const search = menu.querySelector(".ddSearch");
  const items = Array.from(menu.querySelectorAll(".ddItem"));

  function filter(q){
    const s = String(q||"").toLowerCase().trim();
    items.forEach(it=>{
      const name = (it.textContent||"").toLowerCase();
      it.classList.toggle("hidden", s && !name.includes(s));
    });
  }
  search.addEventListener("input", ()=> filter(search.value));

  items.forEach(it=>{
    it.addEventListener("pointerdown", (e)=>{
      e.preventDefault();
      e.stopPropagation();
      const code = it.getAttribute("data-code");
      closeAll();
      setValue(code, false);
    });
    // click fallback
    it.addEventListener("click", (e)=>{
      e.preventDefault();
      e.stopPropagation();
      const code = it.getAttribute("data-code");
      closeAll();
      setValue(code, false);
    });
  });

  btn.addEventListener("pointerdown", (e)=>{
    e.preventDefault();
    e.stopPropagation();
    const open = root.classList.contains("open");
    closeAll();
    root.classList.toggle("open", !open);
    if(!open){
      search.value = "";
      filter("");
      setTimeout(()=> search.focus(), 0);
    }
  });
  // click fallback
  btn.addEventListener("click", (e)=>{
    e.preventDefault();
    e.stopPropagation();
    const open = root.classList.contains("open");
    closeAll();
    root.classList.toggle("open", !open);
    if(!open){
      search.value = "";
      filter("");
      setTimeout(()=> search.focus(), 0);
    }
  });

  document.addEventListener("pointerdown", ()=> closeAll(), { passive:true });

  setValue(defCode, true);
  return { get:()=>current, set:(c)=>setValue(c,false), root };
}

/* ========= SpeechRecognition ========= */
function srSupported(){
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}
function buildRecognizer(srLocale){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const r = new SR();
  r.lang = srLocale;
  r.interimResults = true;
  r.continuous = true;
  return r;
}

/* ========= Translate API ========= */
async function translateViaApi(text, src, dst){
  const base = baseUrl();
  if(!base) return text;

  // backend farklı alan isimleri bekleyebiliyor → ikisini de gönderiyoruz
  const body = { text, source: src, target: dst, from_lang: src, to_lang: dst };

  const r = await fetch(`${base}/api/translate`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });

  const raw = await r.text().catch(()=> "");
  if(!r.ok) throw new Error(raw || `HTTP ${r.status}`);

  let data = {};
  try{ data = JSON.parse(raw || "{}"); }catch{ data = {}; }

  return String(data.text || data.translated || data.translation || data.translatedText || "").trim() || text;
}

/* ========= Engine ========= */
let srcDD, dstDD;
let rec = null;
let running = false;

let interimText = "";
let finalText = "";

let inFlight = false;
let tickTimer = null;
let sentenceTimer = null;

/* anti-loop controls */
let lastCombined = "";
let lastOut = "";
let sameOutCount = 0;
let lastReqAt = 0;

function clearTimers(){
  if(tickTimer){ clearInterval(tickTimer); tickTimer=null; }
  if(sentenceTimer){ clearTimeout(sentenceTimer); sentenceTimer=null; }
}

function enforceDifferent(){
  if(srcDD.get() === dstDD.get()){
    dstDD.set(srcDD.get()==="tr" ? "en" : "tr");
  }
}

function changedEnough(newText, prevText){
  const a = norm(newText);
  const b = norm(prevText);
  if(!a) return false;
  if(a === b) return false;

  if(b && Math.abs(a.length - b.length) <= 2) return false;
  if(b && a.startsWith(b) && (a.length - b.length) < 6) return false;

  return true;
}

async function translateTick(){
  if(!running) return;
  if(inFlight) return;

  const combined = (finalText + " " + interimText).trim();
  const combinedN = norm(combined);

  if(combinedN.length < 6) return;
  if(!changedEnough(combined, lastCombined)) return;

  const now = Date.now();
  if(now - lastReqAt < 280) return;
  lastReqAt = now;

  lastCombined = combined;

  inFlight = true;
  try{
    const src = srcDD.get();
    const dst = dstDD.get();
    const out = await translateViaApi(combined, src, dst);

    const outN = norm(out);
    if(outN && outN === norm(lastOut)){
      sameOutCount++;
      if(sameOutCount >= 3) return;
    }else{
      sameOutCount = 0;
      lastOut = out;
    }

    const live = ensureLiveBubble();
    live.innerHTML = escapeHtml(out || "—");
    $("stream").scrollTop = $("stream").scrollHeight;

  }catch(e){
    const m = String(e?.message || e || "").slice(0, 220);
    toast(`Çeviri hatası: ${m || "bilinmiyor"}`);
  }finally{
    inFlight = false;
  }
}

function stop(){
  running = false;
  setPlayUI(false);
  setStatusTop("Hazır");
  setStatusWave("Hazır");

  clearTimers();

  interimText = "";
  finalText = "";
  inFlight = false;

  lastCombined = "";
  lastOut = "";
  sameOutCount = 0;
  lastReqAt = 0;

  try{ rec?.stop?.(); }catch{}
  rec = null;

  finalizeLiveBubble();
}

function start(){
  if(!srSupported()){
    toast("Bu cihaz konuşmayı yazıya çevirmiyor.");
    return;
  }

  enforceDifferent();

  const srLocale = by(srcDD.get()).sr || "en-US";
  rec = buildRecognizer(srLocale);
  if(!rec){
    toast("Mikrofon başlatılamadı.");
    return;
  }

  running = true;
  setPlayUI(true);
  setStatusTop("Dinliyor");
  setStatusWave("Dinliyor");

  interimText = "";
  finalText = "";
  inFlight = false;

  lastCombined = "";
  lastOut = "";
  sameOutCount = 0;
  lastReqAt = 0;

  clearTimers();
  tickTimer = setInterval(translateTick, 350);

  rec.onresult = (e)=>{
    let finals = "";
    let interim = "";

    for(let i=e.resultIndex; i<e.results.length; i++){
      const t = e.results[i]?.[0]?.transcript || "";
      if(e.results[i].isFinal) finals += t + " ";
      else interim += t + " ";
    }

    if(finals.trim()){
      finalText = (finalText ? (finalText + " ") : "") + finals.trim();
      interimText = "";

      if(sentenceTimer) clearTimeout(sentenceTimer);
      sentenceTimer = setTimeout(()=>{
        finalizeLiveBubble();
        finalText = "";
        interimText = "";
        lastCombined = "";
        lastOut = "";
        sameOutCount = 0;
      }, 900);
      return;
    }

    if(interim.trim()){
      interimText = interim.trim();
    }
  };

  rec.onerror = ()=>{
    toast("Mikrofon izin/HTTPS/cihaz sorunu olabilir.");
    stop();
  };

  rec.onend = ()=>{
    if(running){
      try{ rec?.start?.(); }catch{ stop(); }
    }
  };

  try{ rec.start(); }
  catch{
    toast("Mikrofon başlatılamadı.");
    stop();
  }
}

/* ========= init ========= */
document.addEventListener("DOMContentLoaded", ()=>{
  $("backBtn").addEventListener("pointerdown", (e)=>{
    e.preventDefault();
    if(history.length>1) history.back();
    else location.href = "/pages/home.html";
  });

  $("brandHome").addEventListener("pointerdown", (e)=>{
    e.preventDefault();
    location.href = "/pages/home.html";
  });

  // ✅ Default TR -> EN
  srcDD = buildDropdown("ddSrc","ddSrcBtn","ddSrcTxt","ddSrcMenu","tr");
  dstDD = buildDropdown("ddDst","ddDstBtn","ddDstTxt","ddDstMenu","en");

  srcDD.root.addEventListener("italky:change", ()=>{
    enforceDifferent();
    if(running){
      stop();
      start();
    }
  });
  dstDD.root.addEventListener("italky:change", ()=> enforceDifferent());

  // Speaker: sadece UI. Ses üretmeyiz.
  let ttsOn = false;
  const setTts = (on)=>{
    ttsOn = !!on;
    $("spkBtn")?.classList.toggle("on", ttsOn);
    toast(ttsOn ? "Ses açık" : "Sessiz");
  };
  setTts(false);
  $("spkBtn").addEventListener("pointerdown", (e)=>{
    e.preventDefault(); e.stopPropagation();
    setTts(!ttsOn);
  });

  setPlayUI(false);
  setStatusTop("Hazır");
  setStatusWave("Hazır");

  const toggle = (e)=>{
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if(running) stop();
    else start();
  };

  $("playBtn").addEventListener("pointerdown", toggle);
  $("playBtn").addEventListener("click", toggle); // ✅ fallback
});
