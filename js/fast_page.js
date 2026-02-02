// FILE: italky-web/js/fast_page.js
// Italky - Anında Çeviri (Toplantı Modu) v2.2
// ✅ Play/Pause
// ✅ Final + 900ms sessizlik => tek blok çeviri (spam yok)
// ✅ 422 fix: backend'e hem (source/target) hem (from_lang/to_lang) gönder
// ✅ ITALKY logo click => home

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

function fillSelect(sel, def){
  sel.innerHTML = LANGS.map(l=>`<option value="${l.code}">${l.name}</option>`).join("");
  sel.value = def;
}

function baseUrl(){
  return String(BASE_DOMAIN||"").replace(/\/+$/,"");
}

/* HTML safe */
function escapeHtml(s=""){
  return String(s)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/'/g,"&#39;");
}

function addLine(kind, text){
  const wrap = $("lines");
  const b = document.createElement("div");
  b.className = `bubble ${kind}`;
  b.innerHTML =
    kind === "src"
      ? `<div class="small">Duyulan</div>${escapeHtml(text)}`
      : `<div class="small">Çeviri</div>${escapeHtml(text)}`;

  wrap.appendChild(b);
  wrap.scrollTop = wrap.scrollHeight;
}

/* TTS toggle */
let muted = false;
function setMuted(on){
  muted = !!on;
  $("spkBtn").classList.toggle("muted", muted);
}
function speak(text, langCode){
  if(muted) return;
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

/* SpeechRecognition */
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

/* ✅ 422 FIX: gönderim şekli */
async function translateViaApi(text, src, dst){
  const base = baseUrl();
  if(!base) return text;

  // bazı routerlar source/target ister, bazıları from_lang/to_lang
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

/* spam-control: final + sessizlik */
let rec = null;
let running = false;
let bufferText = "";
let silenceTimer = null;
let inFlight = false;
let lastPushed = "";

function norm(s){
  return String(s||"")
    .toLowerCase()
    .trim()
    .replace(/\s+/g," ")
    .replace(/[’']/g,"'")
    .replace(/[.,!?;:]+$/g,"");
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

  const src = $("srcLang").value;
  const dst = $("dstLang").value;

  try{
    $("panelStatus").textContent = "Çeviriyorum…";
    const out = await translateViaApi(text, src, dst);

    addLine("src", text);
    addLine("trg", out);

    speak(out, dst);

    lastPushed = n;
    $("panelStatus").textContent = "Dinliyor";
  }catch(e){
    $("panelStatus").textContent = "Hata";
    toast("Çeviri hatası (422/CORS/KEY).");
    // debug için console'a bas
    console.warn("TRANSLATE_ERR:", e?.message || e);
  }finally{
    inFlight = false;
  }
}

/* Play / Pause UI */
function setPlayUI(on){
  $("playBtn").classList.toggle("running", !!on);
  $("icoPlay").style.display = on ? "none" : "block";
  $("icoPause").style.display = on ? "block" : "none";
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

  const src = $("srcLang").value;
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
      // bazı cihazlar continuous'ı kapatır: yeniden dene
      try{ rec?.start?.(); }
      catch{ stop(); }
    }
  };

  try{ rec.start(); }
  catch{
    toast("Mikrofon başlatılamadı.");
    stop();
  }
}

function swapIfSame(){
  const a = $("srcLang").value;
  const b = $("dstLang").value;
  if(a === b){
    $("dstLang").value = (a === "tr") ? "en" : "tr";
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("backBtn").addEventListener("click", ()=>{
    if(history.length > 1) history.back();
    else location.href = "/pages/home.html";
  });

  $("brandHome").addEventListener("click", ()=>{
    location.href = "/pages/home.html";
  });

  fillSelect($("srcLang"), "en");
  fillSelect($("dstLang"), "tr");
  swapIfSame();

  $("srcLang").addEventListener("change", ()=>{
    swapIfSame();
    if(running){
      stop();
      start();
    }
  });
  $("dstLang").addEventListener("change", swapIfSame);

  setMuted(false);
  $("spkBtn").addEventListener("click", ()=>{
    setMuted(!muted);
    toast(muted ? "Ses kapalı" : "Ses açık");
  });

  $("playBtn").addEventListener("click", ()=>{
    if(running) stop();
    else start();
  });

  $("panelStatus").textContent = "Hazır";
});
