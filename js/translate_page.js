// FILE: italky-web/js/translate_page.js
// ✅ ÇEVİRİ FIX: backend hangi alanı isterse çalışsın diye 2 format birden gönderir
// ✅ Dil seçici sheet + arama + çok dil
// ✅ Scroll gizli
// ✅ Slogan sabit: By Ozyigit's
// ✅ Ping: GET /api/translate/_ping (senin backend’de var)

import { BASE_DOMAIN } from "/js/config.js";
const $ = (id)=>document.getElementById(id);

function base(){ return (BASE_DOMAIN || "").replace(/\/+$/,""); }

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=>t.classList.remove("show"), 2000);
}

async function pingApi(){
  const b = base();
  if(!b) return;
  try{
    // ✅ senin backend’de: /api/translate/_ping
    const r = await fetch(`${b}/api/translate/_ping`, { method:"GET" });
    const d = await r.json().catch(()=> ({}));
    if(!d?.ok) toast("Çeviri motoru hazır değil.");
    else if(!d?.has_key) toast("GOOGLE_API_KEY eksik.");
  }catch{
    toast("API erişilemiyor (Render uyuyor olabilir).");
  }
}

function setWaveListening(on){
  $("frameRoot")?.classList.toggle("listening", !!on);
}

/* ✅ Geniş dil listesi */
const LANGS = [
  { code:"tr", tr:"Türkçe", native:"Türkçe", speech:"tr-TR", tts:"tr-TR" },
  { code:"en", tr:"İngilizce", native:"English", speech:"en-US", tts:"en-US" },
  { code:"de", tr:"Almanca", native:"Deutsch", speech:"de-DE", tts:"de-DE" },
  { code:"fr", tr:"Fransızca", native:"Français", speech:"fr-FR", tts:"fr-FR" },
  { code:"es", tr:"İspanyolca", native:"Español", speech:"es-ES", tts:"es-ES" },
  { code:"it", tr:"İtalyanca", native:"Italiano", speech:"it-IT", tts:"it-IT" },
  { code:"pt", tr:"Portekizce", native:"Português", speech:"pt-PT", tts:"pt-PT" },
  { code:"nl", tr:"Felemenkçe", native:"Nederlands", speech:"nl-NL", tts:"nl-NL" },
  { code:"ru", tr:"Rusça", native:"Русский", speech:"ru-RU", tts:"ru-RU" },
  { code:"ar", tr:"Arapça", native:"العربية", speech:"ar-SA", tts:"ar-SA" },
  { code:"zh", tr:"Çince (Basitleştirilmiş)", native:"中文", speech:"zh-CN", tts:"zh-CN" },
  { code:"ja", tr:"Japonca", native:"日本語", speech:"ja-JP", tts:"ja-JP" },
  { code:"ko", tr:"Korece", native:"한국어", speech:"ko-KR", tts:"ko-KR" },
  { code:"el", tr:"Yunanca", native:"Ελληνικά", speech:"el-GR", tts:"el-GR" },
  { code:"sv", tr:"İsveççe", native:"Svenska", speech:"sv-SE", tts:"sv-SE" },
  { code:"no", tr:"Norveççe", native:"Norsk", speech:"nb-NO", tts:"nb-NO" },
  { code:"da", tr:"Danca", native:"Dansk", speech:"da-DK", tts:"da-DK" },
  { code:"fi", tr:"Fince", native:"Suomi", speech:"fi-FI", tts:"fi-FI" },
  { code:"pl", tr:"Lehçe", native:"Polski", speech:"pl-PL", tts:"pl-PL" },
  { code:"cs", tr:"Çekçe", native:"Čeština", speech:"cs-CZ", tts:"cs-CZ" },
  { code:"sk", tr:"Slovakça", native:"Slovenčina", speech:"sk-SK", tts:"sk-SK" },
  { code:"hu", tr:"Macarca", native:"Magyar", speech:"hu-HU", tts:"hu-HU" },
  { code:"ro", tr:"Romence", native:"Română", speech:"ro-RO", tts:"ro-RO" },
  { code:"bg", tr:"Bulgarca", native:"Български", speech:"bg-BG", tts:"bg-BG" },
  { code:"uk", tr:"Ukraynaca", native:"Українська", speech:"uk-UA", tts:"uk-UA" },
  { code:"sr", tr:"Sırpça", native:"Srpski", speech:"sr-RS", tts:"sr-RS" },
  { code:"hr", tr:"Hırvatça", native:"Hrvatski", speech:"hr-HR", tts:"hr-HR" },
  { code:"sl", tr:"Slovence", native:"Slovenščina", speech:"sl-SI", tts:"sl-SI" },
  { code:"sq", tr:"Arnavutça", native:"Shqip", speech:"sq-AL", tts:"sq-AL" },
  { code:"he", tr:"İbranice", native:"עברית", speech:"he-IL", tts:"he-IL" },
  { code:"fa", tr:"Farsça", native:"فارسی", speech:"fa-IR", tts:"fa-IR" },
  { code:"hi", tr:"Hintçe", native:"हिन्दी", speech:"hi-IN", tts:"hi-IN" },
  { code:"bn", tr:"Bengalce", native:"বাংলা", speech:"bn-BD", tts:"bn-BD" },
  { code:"ur", tr:"Urduca", native:"اردو", speech:"ur-PK", tts:"ur-PK" },
  { code:"id", tr:"Endonezce", native:"Bahasa Indonesia", speech:"id-ID", tts:"id-ID" },
  { code:"ms", tr:"Malayca", native:"Bahasa Melayu", speech:"ms-MY", tts:"ms-MY" },
  { code:"th", tr:"Tayca", native:"ไทย", speech:"th-TH", tts:"th-TH" },
  { code:"vi", tr:"Vietnamca", native:"Tiếng Việt", speech:"vi-VN", tts:"vi-VN" },
];

const HOT = ["tr","en","de","fr","es","it","ru","ar"];

function labelOf(code){
  const x = LANGS.find(l=>l.code===code);
  return x ? x.tr : code;
}
function speechLocale(code){
  const x = LANGS.find(l=>l.code===code);
  return x?.speech || "en-US";
}
function ttsLocale(code){
  const x = LANGS.find(l=>l.code===code);
  return x?.tts || "en-US";
}

/* ✅ Çeviri: 2 format birden gönder (backend uyumsuzluğu biter) */
async function translateViaApi(text, source, target){
  const b = base();
  if(!b) return text;

  const body = {
    text,
    // format-1
    source,
    target,
    // format-2 (senin backend)
    from_lang: source,
    to_lang: target,
  };

  try{
    const r = await fetch(`${b}/api/translate`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(body)
    });

    const data = await r.json().catch(()=> ({}));
    const out = String(
      data?.translated || data?.translation || data?.text || data?.translated_text || ""
    ).trim();

    return out || text;
  }catch{
    return text;
  }
}

/* SpeechRecognition */
function buildRecognizer(langCode){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const rec = new SR();
  rec.lang = speechLocale(langCode);
  rec.interimResults = true;
  rec.continuous = false;
  return rec;
}

/* auto-follow */
const follow = { top:true, bot:true };
function isNearBottom(el, slack=140){
  try{ return (el.scrollHeight - el.scrollTop - el.clientHeight) < slack; }
  catch{ return true; }
}
function hookScrollFollow(sideName, el){
  el.addEventListener("scroll", ()=>{ follow[sideName] = isNearBottom(el); }, { passive:true });
}
function scrollIfNeeded(sideName, el){
  if(follow[sideName]) el.scrollTop = el.scrollHeight;
}

/* bubbles */
function addBubble(sideName, kind, text){
  const wrap = $(sideName === "top" ? "topBody" : "botBody");
  const b = document.createElement("div");
  b.className = `bubble ${kind}`;
  b.textContent = text || "—";
  wrap.appendChild(b);
  scrollIfNeeded(sideName, wrap);
}

/* speaker mute */
const mute = { top:false, bot:false };
function setMute(side, on){
  mute[side] = !!on;
  const btn = $(side === "top" ? "topSpeak" : "botSpeak");
  btn?.classList.toggle("muted", mute[side]);
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

/* mic flow */
let active = null;
let topRec = null;
let botRec = null;

function setMicUI(side, on){
  const mic = $(side === "top" ? "topMic" : "botMic");
  mic?.classList.toggle("listening", !!on);
  setWaveListening(!!on);
}
function stopAll(){
  try{ topRec?.stop?.(); }catch{}
  try{ botRec?.stop?.(); }catch{}
  topRec = null; botRec = null;
  active = null;
  setMicUI("top", false);
  setMicUI("bot", false);
  setWaveListening(false);
}
async function onFinal(side, srcCode, dstCode, finalText){
  const otherSide = (side === "top") ? "bot" : "top";
  addBubble(side, "them", finalText);
  const out = await translateViaApi(finalText, srcCode, dstCode);
  addBubble(otherSide, "me", out);
  speakAuto(out, dstCode, otherSide);
}

function startSide(side, getLang, getOtherLang){
  if(active && active !== side) stopAll();

  const srcCode = getLang();
  const dstCode = getOtherLang();

  const rec = buildRecognizer(srcCode);
  if(!rec){
    toast("Bu cihaz konuşmayı yazıya çevirmiyor.");
    return;
  }

  active = side;
  setMicUI(side, true);

  let live = "";
  let finalText = "";

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
    toast("Mikrofon izin/HTTPS/cihaz sorunu olabilir.");
    stopAll();
  };

  rec.onend = async ()=>{
    const txt = (finalText || live || "").trim();
    setMicUI(side, false);
    if(!txt){ active = null; return; }
    await onFinal(side, srcCode, dstCode, txt);
    active = null;
  };

  if(side === "top") topRec = rec; else botRec = rec;

  try{ rec.start(); }
  catch{ toast("Mikrofon açılamadı."); stopAll(); }
}

/* ===== Language Sheet ===== */
let sheetTarget = "bot";
let langTop = "en";
let langBot = "tr";

function openSheet(target){
  sheetTarget = target;
  $("langSheet")?.classList.add("show");
  $("sheetTitle").textContent = (target === "top" ? "Üst Dil" : "Alt Dil") + " seç";
  $("sheetQuery").value = "";
  renderSheetList("");
  setTimeout(()=>{ try{ $("sheetQuery")?.focus(); }catch{} }, 0);
}
function closeSheet(){ $("langSheet")?.classList.remove("show"); }

function renderSheetList(filter){
  const q = String(filter||"").toLowerCase().trim();
  const list = $("sheetList");
  if(!list) return;

  const current = (sheetTarget === "top") ? langTop : langBot;

  const hot = LANGS.filter(l=>HOT.includes(l.code));
  const rest = LANGS.filter(l=>!HOT.includes(l.code));
  const all = [...hot, ...rest].filter(l=>{
    if(!q) return true;
    const hay = `${l.tr} ${l.native} ${l.code}`.toLowerCase();
    return hay.includes(q);
  });

  list.innerHTML = all.map(l=>{
    const sel = (l.code === current) ? "selected" : "";
    return `
      <div class="sheetRow ${sel}" data-code="${l.code}">
        <div>
          <div class="name">${l.tr}</div>
          <div class="code">${l.native} • ${l.code}</div>
        </div>
        <div class="code">${l.code.toUpperCase()}</div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".sheetRow").forEach(row=>{
    row.addEventListener("click", ()=>{
      const code = row.getAttribute("data-code") || "en";
      if(sheetTarget === "top"){
        langTop = code;
        $("topLangTxt").textContent = labelOf(langTop);
      }else{
        langBot = code;
        $("botLangTxt").textContent = labelOf(langBot);
      }
      closeSheet();
      toast("Dil seçildi");
    });
  });
}

/* Boot */
document.addEventListener("DOMContentLoaded", async ()=>{
  $("backBtn")?.addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href = "/pages/home.html";
  });

  await pingApi();

  hookScrollFollow("top", $("topBody"));
  hookScrollFollow("bot", $("botBody"));

  $("topLangTxt").textContent = labelOf(langTop);
  $("botLangTxt").textContent = labelOf(langBot);

  $("topLangBtn")?.addEventListener("click", ()=> openSheet("top"));
  $("botLangBtn")?.addEventListener("click", ()=> openSheet("bot"));
  $("sheetClose")?.addEventListener("click", closeSheet);
  $("langSheet")?.addEventListener("click", (e)=>{
    if(e.target === $("langSheet")) closeSheet();
  });
  $("sheetQuery")?.addEventListener("input", ()=> renderSheetList($("sheetQuery").value));

  $("topSpeak")?.addEventListener("click", ()=>{
    setMute("top", !mute.top);
    toast(mute.top ? "Ses kapalı" : "Ses açık");
  });
  $("botSpeak")?.addEventListener("click", ()=>{
    setMute("bot", !mute.bot);
    toast(mute.bot ? "Ses kapalı" : "Ses açık");
  });
  setMute("top", false);
  setMute("bot", false);

  $("topMic")?.addEventListener("click", ()=> startSide("top", ()=>langTop, ()=>langBot));
  $("botMic")?.addEventListener("click", ()=> startSide("bot", ()=>langBot, ()=>langTop));

  setWaveListening(false);

  // ✅ hızlı test: ilk açılışta 1 kere çalışıp API’nin çeviri verdiğini teyit eder
  // (sessiz, ekrana basmıyor)
  try{
    const t = await translateViaApi("hello", "en", "tr");
    if(t && t.toLowerCase() !== "hello") {
      // sadece debug için
      // toast("Çeviri hazır");
    }
  }catch{}
});
