// FILE: italky-web/js/facetoface_page.js
import { BASE_DOMAIN } from "/js/config.js";

const $ = (id)=>document.getElementById(id);

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 1600);
}

function setListening(on){
  $("frameRoot")?.classList.toggle("listening", !!on);
}

const LANGS = [
  // En sık üstte
  { code:"tr", name:"Türkçe",  speech:"tr-TR", tts:"tr-TR" },
  { code:"en", name:"İngilizce", speech:"en-US", tts:"en-US" },
  { code:"de", name:"Almanca", speech:"de-DE", tts:"de-DE" },
  { code:"fr", name:"Fransızca", speech:"fr-FR", tts:"fr-FR" },
  { code:"it", name:"İtalyanca", speech:"it-IT", tts:"it-IT" },
  { code:"es", name:"İspanyolca", speech:"es-ES", tts:"es-ES" },
  { code:"pt", name:"Portekizce", speech:"pt-PT", tts:"pt-PT" },
  { code:"ru", name:"Rusça", speech:"ru-RU", tts:"ru-RU" },
  { code:"ar", name:"Arapça", speech:"ar-SA", tts:"ar-SA" },
  { code:"nl", name:"Flemenkçe", speech:"nl-NL", tts:"nl-NL" },
  { code:"sv", name:"İsveççe", speech:"sv-SE", tts:"sv-SE" },
  { code:"no", name:"Norveççe", speech:"nb-NO", tts:"nb-NO" },
  { code:"da", name:"Danca", speech:"da-DK", tts:"da-DK" },
  { code:"pl", name:"Lehçe", speech:"pl-PL", tts:"pl-PL" },
  { code:"cs", name:"Çekçe", speech:"cs-CZ", tts:"cs-CZ" },
  { code:"hu", name:"Macarca", speech:"hu-HU", tts:"hu-HU" },
  { code:"ro", name:"Romence", speech:"ro-RO", tts:"ro-RO" },
  { code:"el", name:"Yunanca", speech:"el-GR", tts:"el-GR" },
  { code:"uk", name:"Ukraynaca", speech:"uk-UA", tts:"uk-UA" },
  { code:"zh", name:"Çince", speech:"zh-CN", tts:"zh-CN" },
  { code:"ja", name:"Japonca", speech:"ja-JP", tts:"ja-JP" },
  { code:"ko", name:"Korece", speech:"ko-KR", tts:"ko-KR" },
];

function langName(code){
  return LANGS.find(x=>x.code===code)?.name || code;
}
function speechLocale(code){
  return LANGS.find(x=>x.code===code)?.speech || "en-US";
}
function ttsLocale(code){
  return LANGS.find(x=>x.code===code)?.tts || "en-US";
}

function baseUrl(){
  return (BASE_DOMAIN || "").replace(/\/+$/,"");
}

/* API translate: expects {text, source, target} and returns {translated|text} */
async function translateViaApi(text, source, target){
  const base = baseUrl();
  if(!base) return text;

  try{
    const r = await fetch(`${base}/api/translate`, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        text,
        source: (source||"") || null,
        target: target
      })
    });
    const js = await r.json().catch(()=> ({}));
    const out = String(js.translated || js.text || js.translation || "").trim();
    return out || text;
  }catch{
    return text;
  }
}

/* speech recognizer */
function buildRecognizer(langCode){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const rec = new SR();
  rec.lang = speechLocale(langCode);
  rec.interimResults = false;
  rec.continuous = false;
  return rec;
}

/* auto-follow per side */
const follow = { top:true, bot:true };
function isNearBottom(el, slack=140){
  try{ return (el.scrollHeight - el.scrollTop - el.clientHeight) < slack; }
  catch{ return true; }
}
function hookFollow(side, el){
  el.addEventListener("scroll", ()=>{ follow[side] = isNearBottom(el); }, { passive:true });
}
function scrollIfNeeded(side, el){
  if(follow[side]) el.scrollTop = el.scrollHeight;
}

/* bubbles */
function addBubble(side, kind, text){
  const wrap = (side==="top") ? $("topBody") : $("botBody");
  const b = document.createElement("div");
  b.className = `bubble ${kind}`;
  b.textContent = text || "—";
  wrap.appendChild(b);
  scrollIfNeeded(side, wrap);
}

/* TTS toggle (mute only) */
const mute = { top:false, bot:false };
function setMute(side, on){
  mute[side] = !!on;
  const btn = (side==="top") ? $("topSpeak") : $("botSpeak");
  btn.classList.toggle("muted", mute[side]);
}
function speakAuto(text, langCode, side){
  if(mute[side]) return;
  const t = String(text||"").trim();
  if(!t) return;
  if(!("speechSynthesis" in window)) return;

  try{
    const u = new SpeechSynthesisUtterance(t);
    u.lang = ttsLocale(langCode);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }catch{}
}

/* ============ SINGLE SHEET (directional) ============ */
const sheet = $("langSheet");
const sheetTitle = $("sheetTitle");
const sheetList = $("sheetList");
const sheetQuery = $("sheetQuery");
const sheetClose = $("sheetClose");

let sheetCtx = null; // { side: "top"|"bot", setLang: fn, currentCode: fn }

function openSheetFor(side){
  // side top => open to top user: add from-top
  sheet.classList.toggle("from-top", side === "top");
  sheet.classList.add("show");

  // focus search
  try{
    sheetQuery.value = "";
    renderSheetRows("");
    setTimeout(()=> sheetQuery.focus(), 60);
  }catch{}

  // title
  sheetTitle.textContent = (side === "top") ? "Üst taraf dili" : "Alt taraf dili";
}

function closeSheet(){
  sheet.classList.remove("show", "from-top");
  sheetCtx = null;
}

function renderSheetRows(filter){
  const q = String(filter||"").toLowerCase().trim();

  const curCode = sheetCtx?.get?.() || "";
  const rows = [];

  for(const l of LANGS){
    const name = l.name.toLowerCase();
    const code = l.code.toLowerCase();
    if(q && !(name.includes(q) || code.includes(q))) continue;

    const selected = (l.code === curCode);
    rows.push(`
      <div class="sheetRow ${selected ? "selected":""}" data-code="${l.code}">
        <div class="name">${l.name}</div>
        <div class="code">${l.code}</div>
      </div>
    `);
  }

  sheetList.innerHTML = rows.join("") || `
    <div class="sheetRow">
      <div class="name">Sonuç yok</div>
      <div class="code">—</div>
    </div>
  `;

  sheetList.querySelectorAll(".sheetRow[data-code]").forEach(el=>{
    el.addEventListener("click", ()=>{
      const code = el.getAttribute("data-code");
      if(!code || !sheetCtx) return;
      sheetCtx.set(code);
      closeSheet();
    });
  });
}

/* ============ Face-to-face logic ============ */
let topLang = "en";
let botLang = "tr";
let active = null; // "top"|"bot"
let topRec = null;
let botRec = null;

function setLangUI(){
  $("topLangTxt").textContent = langName(topLang);
  $("botLangTxt").textContent = langName(botLang);
}

function stopAll(){
  try{ topRec?.stop?.(); }catch{}
  try{ botRec?.stop?.(); }catch{}
  topRec = null;
  botRec = null;
  active = null;
  $("topMic")?.classList.remove("listening");
  $("botMic")?.classList.remove("listening");
  setListening(false);
}

async function onFinal(side, finalText){
  const src = (side==="top") ? topLang : botLang;
  const dst = (side==="top") ? botLang : topLang;
  const other = (side==="top") ? "bot" : "top";

  // speaker bubble on their side
  addBubble(side, "them", finalText);

  // translate on other side
  const out = await translateViaApi(finalText, src, dst);
  addBubble(other, "me", out);

  // auto speak for receiver
  speakAuto(out, dst, other);
}

function startSide(side){
  if(active && active !== side) stopAll();

  const srcCode = (side==="top") ? topLang : botLang;
  const rec = buildRecognizer(srcCode);
  if(!rec){
    toast("Bu cihaz konuşmayı yazıya çevirmiyor.");
    return;
  }

  active = side;
  setListening(true);

  const btn = (side==="top") ? $("topMic") : $("botMic");
  btn.classList.add("listening");

  let finalText = "";

  rec.onresult = (e)=>{
    // only final; some browsers still give interim=false but keep safe
    const t = e.results?.[0]?.[0]?.transcript || "";
    finalText = String(t||"").trim();
  };

  rec.onerror = ()=>{
    toast("Mikrofon izin/HTTPS sorunu olabilir.");
    stopAll();
  };

  rec.onend = async ()=>{
    btn.classList.remove("listening");
    setListening(false);

    const txt = String(finalText||"").trim();
    if(!txt){
      active = null;
      return;
    }
    await onFinal(side, txt);
    active = null;
  };

  if(side==="top") topRec = rec; else botRec = rec;

  try{ rec.start(); }
  catch{
    toast("Mikrofon açılamadı.");
    stopAll();
  }
}

/* ========= boot ========= */
document.addEventListener("DOMContentLoaded", ()=>{
  // back
  $("backBtn")?.addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href = "/pages/home.html";
  });

  // follow scroll
  hookFollow("top", $("topBody"));
  hookFollow("bot", $("botBody"));

  // initial UI
  setLangUI();
  setMute("top", false);
  setMute("bot", false);

  // speaker toggles mute only
  $("topSpeak")?.addEventListener("click", ()=>{
    setMute("top", !mute.top);
    toast(mute.top ? "Ses kapalı" : "Ses açık");
  });
  $("botSpeak")?.addEventListener("click", ()=>{
    setMute("bot", !mute.bot);
    toast(mute.bot ? "Ses kapalı" : "Ses açık");
  });

  // mic
  $("topMic")?.addEventListener("click", ()=> startSide("top"));
  $("botMic")?.addEventListener("click", ()=> startSide("bot"));

  // open sheet for TOP (must face top user)
  $("topLangBtn")?.addEventListener("click", (e)=>{
    e.preventDefault(); e.stopPropagation();
    sheetCtx = {
      get: ()=> topLang,
      set: (code)=>{ topLang = code; setLangUI(); }
    };
    openSheetFor("top"); // ✅ critical
  });

  // open sheet for BOTTOM
  $("botLangBtn")?.addEventListener("click", (e)=>{
    e.preventDefault(); e.stopPropagation();
    sheetCtx = {
      get: ()=> botLang,
      set: (code)=>{ botLang = code; setLangUI(); }
    };
    openSheetFor("bot");
  });

  // sheet close and overlay click
  sheetClose?.addEventListener("click", closeSheet);
  sheet?.addEventListener("click", (e)=>{
    if(e.target === sheet) closeSheet();
  });

  // search
  sheetQuery?.addEventListener("input", ()=>{
    renderSheetRows(sheetQuery.value || "");
  });

  // initial rows
  sheetList.innerHTML = "";
  renderSheetRows("");

  // ensure wave off initially
  setListening(false);
});
