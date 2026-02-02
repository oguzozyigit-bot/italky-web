// FILE: italky-web/js/fast_page.js
// Italky - Anında Çeviri (Toplantı Modu) v2
// ✅ Spam yok: interim çeviri YOK
// ✅ Final + sessizlik (900ms) ile tek sefer çeviri
// ✅ Dedupe: aynı cümle tekrar basılmaz
// ✅ Opsiyonel: "Duyulan" satırını göster/gizle (SRC toggle)

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
  { code:"tr", name:"Türkçe",   sr:"tr-TR", tts:"tr-TR" },
  { code:"en", name:"English",  sr:"en-US", tts:"en-US" },
  { code:"de", name:"Deutsch",  sr:"de-DE", tts:"de-DE" },
  { code:"fr", name:"Français", sr:"fr-FR", tts:"fr-FR" },
  { code:"it", name:"Italiano", sr:"it-IT", tts:"it-IT" },
  { code:"es", name:"Español",  sr:"es-ES", tts:"es-ES" },
  { code:"pt", name:"Português",sr:"pt-PT", tts:"pt-PT" },
  { code:"ru", name:"Русский",  sr:"ru-RU", tts:"ru-RU" },
  { code:"ar", name:"العربية",  sr:"ar-SA", tts:"ar-SA" },
  { code:"nl", name:"Nederlands",sr:"nl-NL", tts:"nl-NL" },
  { code:"sv", name:"Svenska",  sr:"sv-SE", tts:"sv-SE" },
  { code:"no", name:"Norsk",    sr:"nb-NO", tts:"nb-NO" },
  { code:"da", name:"Dansk",    sr:"da-DK", tts:"da-DK" },
  { code:"pl", name:"Polski",   sr:"pl-PL", tts:"pl-PL" },
  { code:"el", name:"Ελληνικά", sr:"el-GR", tts:"el-GR" },
];

function langBy(code){
  return LANGS.find(x=>x.code===code) || LANGS[0];
}

function fillSelect(sel, def){
  sel.innerHTML = LANGS.map(l=>`<option value="${l.code}">${l.name}</option>`).join("");
  sel.value = def;
}

function baseUrl(){
  return String(BASE_DOMAIN||"").replace(/\/+$/,"");
}

async function translateViaApi(text, source, target){
  const base = baseUrl();
  if(!base) return text;

  const payload = { text, target };
  if(source) payload.source = source;

  const r = await fetch(`${base}/api/translate`,{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(payload)
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

  // SRC görünürlük toggle
  if(kind === "src" && !SHOW_SRC) return;

  b.innerHTML = kind === "src"
    ? `<div class="small">Duyulan</div>${escapeHtml(text)}`
    : `<div class="small">Çeviri</div>${escapeHtml(text)}`;

  wrap.appendChild(b);
  wrap.scrollTop = wrap.scrollHeight;
}

/* Speaker (TTS) */
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
    u.lang = langBy(langCode).tts || "en-US";
    u.rate = 1.0;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  }catch{}
}

/* SpeechRecognition */
let rec = null;
let running = false;

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

/* ✅ spam kontrol: final/sessizlik ile flush */
let bufferText = "";
let silenceTimer = null;
let inFlight = false;
let lastPushed = "";  // dedupe
let SHOW_SRC = true;

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
  silenceTimer = setTimeout(()=> flushBuffer(), 900); // 900ms sessizlik
}

async function flushBuffer(){
  clearSilence();
  if(inFlight) return;

  const text = String(bufferText||"").trim();
  bufferText = "";

  if(!text) return;

  const n = norm(text);
  if(!n) return;

  // aynı şeyi tekrar basma
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
  }catch{
    $("panelStatus").textContent = "Hata";
    toast("Çeviri hatası (API/Key/CORS).");
  }finally{
    inFlight = false;
  }
}

/* Start/Stop */
function stop(){
  running = false;
  $("micBtn").classList.remove("listening");
  $("panelStatus").textContent = "Durdu";
  clearSilence();
  bufferText = "";

  try{ rec && rec.stop && rec.stop(); }catch{}
  rec = null;
}

function start(){
  if(!srSupported()){
    toast("Bu cihaz konuşmayı yazıya çevirmiyor.");
    return;
  }

  const src = $("srcLang").value;
  const srLocale = langBy(src).sr || "en-US";
  rec = buildRecognizer(srLocale);

  if(!rec){
    toast("Mikrofon başlatılamadı.");
    return;
  }

  running = true;
  $("micBtn").classList.add("listening");
  $("panelStatus").textContent = "Dinliyor";

  bufferText = "";
  lastPushed = "";
  inFlight = false;
  clearSilence();

  rec.onresult = (e)=>{
    let interim = "";
    let finals = "";

    for(let i=e.resultIndex; i<e.results.length; i++){
      const t = e.results[i]?.[0]?.transcript || "";
      if(e.results[i].isFinal) finals += t + " ";
      else interim += t + " ";
    }

    // Final geldiyse direkt buffer’a ekle ve flush planla
    if(finals.trim()){
      bufferText = (bufferText ? bufferText + " " : "") + finals.trim();
      scheduleFlush();
      return;
    }

    // Interim geldikçe sadece “sessizlik sayaç” yenile
    if(interim.trim()){
      // buffer’ı interim ile şişirmiyoruz, sadece bekliyoruz
      scheduleFlush();
    }
  };

  rec.onerror = ()=>{
    toast("Mikrofon izin/HTTPS/cihaz sorunu olabilir.");
    stop();
  };

  rec.onend = ()=>{
    if(running){
      // bazı cihazlarda continuous biter → yeniden başlat
      try{ rec && rec.start && rec.start(); }
      catch{ stop(); }
    }
  };

  try{ rec.start(); }
  catch{
    toast("Mikrofon başlatılamadı.");
    stop();
  }
}

/* UX helpers */
function swapIfSame(){
  const a = $("srcLang").value;
  const b = $("dstLang").value;
  if(a === b){
    $("dstLang").value = (a === "tr") ? "en" : "tr";
  }
}

function toggleSrc(){
  SHOW_SRC = !SHOW_SRC;
  toast(SHOW_SRC ? "Duyulan açık" : "Duyulan kapalı");
}

/* Wire */
document.addEventListener("DOMContentLoaded", ()=>{
  $("backBtn").addEventListener("click", ()=>{
    if(history.length > 1) history.back();
    else location.href = "/pages/home.html";
  });

  fillSelect($("srcLang"), "en");
  fillSelect($("dstLang"), "tr");
  swapIfSame();

  $("srcLang").addEventListener("change", ()=>{
    swapIfSame();
    if(running){ stop(); start(); }
  });
  $("dstLang").addEventListener("change", swapIfSame);

  setMuted(false);
  $("spkBtn").addEventListener("click", ()=>{
    setMuted(!muted);
    toast(muted ? "Ses kapalı" : "Ses açık");
  });

  // Duyulan göster/gizle: hoparlöre uzun basınca toggle (UI bozulmasın)
  $("spkBtn").addEventListener("contextmenu", (e)=>{ e.preventDefault(); toggleSrc(); });
  $("spkBtn").addEventListener("pointerdown", (e)=>{
    // 650ms basılı tutarsa toggle
    const t0 = Date.now();
    const up = ()=>{
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      if(Date.now() - t0 >= 650) toggleSrc();
    };
    window.addEventListener("pointerup", up, { once:true });
    window.addEventListener("pointercancel", up, { once:true });
  });

  $("micBtn").addEventListener("click", ()=>{
    if(running) stop();
    else start();
  });

  $("panelStatus").textContent = "Hazır";
});
