// FILE: italky-web/js/fast_page.js
// Italky - Anında Çeviri (Toplantı Modu) v3
// ✅ Bordo panel tam ekran (HTML)
// ✅ Play/Pause altta ortada
// ✅ "Duyulan" yok, sadece Çeviri düşer
// ✅ Custom dropdown (dark, arama+scroll) => beyaz popup yok
// ✅ Ses SESSİZ: ekstra beep yok (TTS default kapalı)
// ⚠️ SpeechRecognition sistem bip'i bazı cihazlarda engellenemez.

import { BASE_DOMAIN } from "/js/config.js";

const $ = (id)=>document.getElementById(id);

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 1800);
}

const LANGS = [
  { code:"tr", name:"Türkçe",    sr:"tr-TR", tts:"tr-TR" },
  { code:"en", name:"English",   sr:"en-US", tts:"en-US" },
  { code:"de", name:"Deutsch",   sr:"de-DE", tts:"de-DE" },
  { code:"fr", name:"Français",  sr:"fr-FR", tts:"fr-FR" },
  { code:"it", name:"Italiano",  sr:"it-IT", tts:"it-IT" },
  { code:"es", name:"Español",   sr:"es-ES", tts:"es-ES" },
  { code:"pt", name:"Português", sr:"pt-PT", tts:"pt-PT" },
  { code:"ru", name:"Русский",   sr:"ru-RU", tts:"ru-RU" },
  { code:"ar", name:"العربية",   sr:"ar-SA", tts:"ar-SA" },
  { code:"nl", name:"Nederlands",sr:"nl-NL", tts:"nl-NL" },
  { code:"sv", name:"Svenska",   sr:"sv-SE", tts:"sv-SE" },
  { code:"no", name:"Norsk",     sr:"nb-NO", tts:"nb-NO" },
  { code:"da", name:"Dansk",     sr:"da-DK", tts:"da-DK" },
  { code:"pl", name:"Polski",    sr:"pl-PL", tts:"pl-PL" },
  { code:"el", name:"Ελληνικά",  sr:"el-GR", tts:"el-GR" },
];

function by(code){
  return LANGS.find(x=>x.code===code) || LANGS[0];
}

function baseUrl(){
  return String(BASE_DOMAIN||"").replace(/\/+$/,"");
}

function escapeHtml(s=""){
  return String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

function addTranslated(text){
  const wrap = $("stream");
  const b = document.createElement("div");
  b.className = "bubble trg";
  b.innerHTML = `<div class="small">Çeviri</div>${escapeHtml(text)}`;
  wrap.appendChild(b);
  wrap.scrollTop = wrap.scrollHeight;
}

/* ========= Custom Dropdown ========= */
function buildDropdown(rootId, btnId, txtId, menuId, defCode, onChange){
  const root = $(rootId);
  const btn = $(btnId);
  const txt = $(txtId);
  const menu = $(menuId);

  let current = defCode;

  function closeAll(){
    document.querySelectorAll(".dd.open").forEach(x=>x.classList.remove("open"));
  }

  function setValue(code){
    current = code;
    txt.textContent = by(code).name;
    onChange?.(code);
  }

  menu.innerHTML = `
    <div class="ddSearchWrap">
      <input class="ddSearch" type="text" placeholder="Ara..." />
    </div>
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
    it.addEventListener("click", ()=>{
      const code = it.getAttribute("data-code");
      closeAll();
      setValue(code);
    });
  });

  btn.addEventListener("click", (e)=>{
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

  document.addEventListener("click", ()=> closeAll());

  setValue(defCode);

  return { get: ()=> current, set: (c)=> setValue(c) };
}

/* ========= SR + Flush ========= */
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

function norm(s){
  return String(s||"")
    .toLowerCase()
    .trim()
    .replace(/\s+/g," ")
    .replace(/[’']/g,"'")
    .replace(/[.,!?;:]+$/g,"");
}

/* ✅ TTS: default kapalı */
let ttsOn = false;
function setTts(on){
  ttsOn = !!on;
  $("spkBtn").classList.toggle("on", ttsOn);
  if(!ttsOn){
    try{ window.speechSynthesis?.cancel?.(); }catch{}
  }
}
function speak(text, langCode){
  if(!ttsOn) return;
  if(!("speechSynthesis" in window)) return;

  try{
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text||""));
    u.lang = by(langCode).tts || "en-US";
    u.rate = 1.0;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  }catch{}
}

/* backend translate */
async function translateViaApi(text, src, dst){
  const base = baseUrl();
  if(!base) return text;

  const body = {
    text,
    source: src,
    target: dst,
    from_lang: src,
    to_lang: dst
  };

  const r = await fetch(`${base}/api/translate`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });

  if(!r.ok){
    const tx = await r.text().catch(()=> "");
    throw new Error(tx || `HTTP ${r.status}`);
  }

  const data = await r.json().catch(()=> ({}));
  const out = String(
    data.text || data.translated || data.translation || data.translatedText || ""
  ).trim();

  return out || text;
}

/* play/pause */
let rec = null;
let running = false;
let bufferText = "";
let silenceTimer = null;
let inFlight = false;
let lastPushed = "";

function setPlayUI(on){
  $("playBtn").classList.toggle("running", !!on);
  $("icoPlay").style.display = on ? "none" : "block";
  $("icoPause").style.display = on ? "block" : "none";
}

function clearSilence(){
  if(silenceTimer){
    clearTimeout(silenceTimer);
    silenceTimer = null;
  }
}
function scheduleFlush(){
  clearSilence();
  silenceTimer = setTimeout(()=> flushBuffer(), 900);
}

async function flushBuffer(){
  clearSilence();
  if(inFlight) return;

  const text = String(bufferText||"").trim();
  bufferText = "";

  if(!text) return;

  const n = norm(text);
  if(!n) return;
  if(n === lastPushed) return;

  inFlight = true;

  const src = srcDD.get();
  const dst = dstDD.get();

  try{
    $("panelStatus").textContent = "Çeviriyorum…";
    const out = await translateViaApi(text, src, dst);
    addTranslated(out);
    speak(out, dst);
    lastPushed = n;
    $("panelStatus").textContent = "Dinliyor";
  }catch(e){
    $("panelStatus").textContent = "Hata";
    toast("Çeviri hatası (422/CORS/KEY).");
    console.warn("TRANSLATE_ERR:", e?.message || e);
  }finally{
    inFlight = false;
  }
}

function stop(){
  running = false;
  setPlayUI(false);
  $("panelStatus").textContent = "Hazır";
  clearSilence();
  bufferText = "";
  try{ rec?.stop?.(); }catch{}
  rec = null;
}

function start(){
  if(!srSupported()){
    toast("Bu cihaz konuşmayı yazıya çevirmiyor.");
    return;
  }

  const src = srcDD.get();
  const srLocale = by(src).sr || "en-US";

  rec = buildRecognizer(srLocale);
  if(!rec){
    toast("Mikrofon başlatılamadı.");
    return;
  }

  running = true;
  setPlayUI(true);
  bufferText = "";
  lastPushed = "";
  inFlight = false;
  clearSilence();

  $("panelStatus").textContent = "Dinliyor";

  rec.onresult = (e)=>{
    let finals = "";
    let interim = "";

    for(let i=e.resultIndex; i<e.results.length; i++){
      const t = e.results[i]?.[0]?.transcript || "";
      if(e.results[i].isFinal) finals += t + " ";
      else interim += t + " ";
    }

    if(finals.trim()){
      bufferText = (bufferText ? bufferText + " " : "") + finals.trim();
      scheduleFlush();
      return;
    }

    if(interim.trim()){
      scheduleFlush();
    }
  };

  rec.onerror = ()=>{
    toast("Mikrofon izin/HTTPS/cihaz sorunu olabilir.");
    stop();
  };

  rec.onend = ()=>{
    if(running){
      try{ rec?.start?.(); } catch { stop(); }
    }
  };

  try{ rec.start(); }
  catch{
    toast("Mikrofon başlatılamadı.");
    stop();
  }
}

/* ========= init ========= */
let srcDD, dstDD;

document.addEventListener("DOMContentLoaded", ()=>{
  $("backBtn").addEventListener("click", ()=>{
    if(history.length > 1) history.back();
    else location.href = "/pages/home.html";
  });

  $("brandHome").addEventListener("click", ()=>{
    location.href = "/pages/home.html";
  });

  // dropdowns
  srcDD = buildDropdown("ddSrc","ddSrcBtn","ddSrcTxt","ddSrcMenu","en", ()=>{
    if(srcDD.get() === dstDD.get()){
      dstDD.set(srcDD.get()==="tr" ? "en" : "tr");
    }
    if(running){ stop(); start(); }
  });

  dstDD = buildDropdown("ddDst","ddDstBtn","ddDstTxt","ddDstMenu","tr", ()=>{
    if(srcDD.get() === dstDD.get()){
      dstDD.set(srcDD.get()==="tr" ? "en" : "tr");
    }
  });

  // TTS toggle (default OFF)
  setTts(false);
  $("spkBtn").addEventListener("click", ()=>{
    setTts(!ttsOn);
    toast(ttsOn ? "Ses açık" : "Sessiz");
  });

  // play/pause
  $("playBtn").addEventListener("click", ()=>{
    if(running) stop();
    else start();
  });

  $("panelStatus").textContent = "Hazır";
});
