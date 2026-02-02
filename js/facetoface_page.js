// FILE: italky-web/js/facetoface_page.js
import { BASE_DOMAIN } from "/js/config.js";

const $ = (id)=>document.getElementById(id);

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 2000);
}

const LANGS = [
  { code:"tr", name:"Türkçe" },
  { code:"en", name:"English" },
  { code:"de", name:"Deutsch" },
  { code:"fr", name:"Français" },
  { code:"it", name:"Italiano" },
  { code:"es", name:"Español" },
  { code:"ru", name:"Русский" },
  { code:"ar", name:"العربية" },
];

function getLangName(code){
  return (LANGS.find(x=>x.code===code)?.name || code);
}

/* ====== STATE ====== */
let activeTarget = "bot"; // "top" | "bot"
let topLang = "en";
let botLang = "tr";

/* ====== SHEET OPEN/CLOSE (TOP: üstten + 180°) ====== */
function openSheet(which){
  activeTarget = (which === "top") ? "top" : "bot";
  const sh = $("langSheet");
  if(!sh) return;

  sh.classList.toggle("fromTop", activeTarget === "top");

  const title = $("sheetTitle");
  if(title) title.textContent = (activeTarget === "top") ? "Üst Dil" : "Alt Dil";

  renderSheetList();
  sh.classList.add("show");

  setTimeout(()=>{ try{ $("sheetQuery")?.focus?.(); }catch{} }, 30);
}

function closeSheet(){
  $("langSheet")?.classList.remove("show");
}

function renderSheetList(){
  const list = $("sheetList");
  if(!list) return;
  list.innerHTML = "";

  const selected = (activeTarget === "top") ? topLang : botLang;

  LANGS.forEach(l=>{
    const row = document.createElement("div");
    row.className = "sheetRow" + (l.code === selected ? " selected" : "");
    row.innerHTML = `<div class="name">${l.name}</div><div class="code">${l.code}</div>`;
    row.addEventListener("click", ()=>{
      if(activeTarget === "top"){
        topLang = l.code;
        $("topLangTxt").textContent = getLangName(topLang);
      }else{
        botLang = l.code;
        $("botLangTxt").textContent = getLangName(botLang);
      }
      closeSheet();
    });
    list.appendChild(row);
  });

  const q = $("sheetQuery");
  if(q && !q.dataset.__bound){
    q.dataset.__bound = "1";
    q.addEventListener("input", ()=>{
      const s = (q.value||"").toLowerCase().trim();
      list.querySelectorAll(".sheetRow").forEach((el)=>{
        const t = (el.textContent||"").toLowerCase();
        el.style.display = (!s || t.includes(s)) ? "" : "none";
      });
    });
  }else if(q){
    q.value = "";
  }
}

/* ====== TRANSLATE API ====== */
async function translateViaApi(text, from_lang, to_lang){
  const base = (BASE_DOMAIN || "").replace(/\/+$/,"");
  if(!base) return text;
  try{
    const r = await fetch(`${base}/api/translate`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ text, from_lang, to_lang })
    });
    if(!r.ok) throw new Error("api");
    const data = await r.json();
    return (data?.translated || data?.text || "").trim() || text;
  }catch{
    return text;
  }
}

/* ====== SpeechRecognition ====== */
function speechLocale(code){
  return (code==="tr")?"tr-TR":
         (code==="en")?"en-US":
         (code==="de")?"de-DE":
         (code==="fr")?"fr-FR":
         (code==="it")?"it-IT":
         (code==="es")?"es-ES":
         (code==="ru")?"ru-RU":
         (code==="ar")?"ar-SA":
         "en-US";
}
function buildRecognizer(langCode){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const rec = new SR();
  rec.lang = speechLocale(langCode);
  rec.interimResults = true;
  rec.continuous = false;
  return rec;
}

function setWaveListening(on){
  $("frameRoot")?.classList.toggle("listening", !!on);
}

function addBubble(side, kind, text){
  const wrap = $(side === "top" ? "topBody" : "botBody");
  if(!wrap) return;
  const b = document.createElement("div");
  b.className = `bubble ${kind}`;
  b.textContent = text || "—";
  wrap.appendChild(b);
  wrap.scrollTop = wrap.scrollHeight;
}

async function onFinal(side, src, dst, finalText){
  const other = (side === "top") ? "bot" : "top";
  addBubble(side, "them", finalText);
  const out = await translateViaApi(finalText, src, dst);
  addBubble(other, "me", out);
}

let active = null;
let topRec = null;
let botRec = null;

function stopAll(){
  try{ topRec?.stop?.(); }catch{}
  try{ botRec?.stop?.(); }catch{}
  topRec = null;
  botRec = null;
  active = null;
  setWaveListening(false);
}

function startSide(side){
  const src = (side === "top") ? topLang : botLang;
  const dst = (side === "top") ? botLang : topLang;

  if(active && active !== side) stopAll();

  const rec = buildRecognizer(src);
  if(!rec){ toast("Bu cihaz konuşmayı yazıya çevirmiyor."); return; }

  active = side;
  setWaveListening(true);

  let finalText = "";
  let live = "";

  rec.onresult = (e)=>{
    let chunk = "";
    for(let i=e.resultIndex;i<e.results.length;i++){
      const t = e.results[i]?.[0]?.transcript || "";
      if(e.results[i].isFinal) finalText += t + " ";
      else chunk += t + " ";
    }
    live = (finalText + chunk).trim();
  };

  rec.onerror = ()=>{
    toast("Mikrofon izin/HTTPS/cihaz sıkıntısı olabilir.");
    stopAll();
  };

  rec.onend = async ()=>{
    const txt = (finalText || live || "").trim();
    setWaveListening(false);
    active = null;
    if(txt) await onFinal(side, src, dst, txt);
  };

  if(side === "top") topRec = rec;
  else botRec = rec;

  try{ rec.start(); }
  catch{ toast("Mikrofon açılamadı."); stopAll(); }
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("backBtn")?.addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href = "/pages/home.html";
  });

  $("topLangTxt").textContent = getLangName(topLang);
  $("botLangTxt").textContent = getLangName(botLang);

  $("topLangBtn")?.addEventListener("click", ()=> openSheet("top"));
  $("botLangBtn")?.addEventListener("click", ()=> openSheet("bot"));

  $("sheetClose")?.addEventListener("click", closeSheet);
  $("langSheet")?.addEventListener("click", (e)=>{
    if(e.target === $("langSheet")) closeSheet();
  });

  $("topMic")?.addEventListener("click", ()=> startSide("top"));
  $("botMic")?.addEventListener("click", ()=> startSide("bot"));
});
