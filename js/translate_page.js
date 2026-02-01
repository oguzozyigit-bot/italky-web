// FILE: italky-web/js/translate_page.js
// ✅ POST /api/translate bağlandı
// ✅ Ping: GET /api/translate/ping
// ✅ TR/EN etiket yok
// ✅ "Hazır" yok
// ✅ Auto speak ON (mute toggle)
// ✅ Dropdown search + scroll gizli zaten HTML/CSS’de

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

function base(){
  return (BASE_DOMAIN || "").replace(/\/+$/,"");
}

async function pingApi(){
  const b = base();
  if(!b) return;
  try{
    const r = await fetch(`${b}/api/translate/ping`, { method:"GET" });
    const d = await r.json().catch(()=> ({}));
    if(!d?.ok) toast("Çeviri motoru hazır değil.");
    else if(!d?.has_key) toast("Translate API key eksik.");
  }catch{
    toast("API erişilemiyor (Render uyuyor olabilir).");
  }
}

function setWaveListening(on){
  $("frameRoot")?.classList.toggle("listening", !!on);
}

const LANGS = [
  // ✅ Sık kullanılanlar üstte (Türkçe en üst)
  { code:"tr", name:"Türkçe",  speech:"tr-TR", tts:"tr-TR" },
  { code:"en", name:"İngilizce", speech:"en-US", tts:"en-US" },
  { code:"de", name:"Almanca", speech:"de-DE", tts:"de-DE" },
  { code:"fr", name:"Fransızca",speech:"fr-FR", tts:"fr-FR" },
  { code:"es", name:"İspanyolca", speech:"es-ES", tts:"es-ES" },
  { code:"it", name:"İtalyanca", speech:"it-IT", tts:"it-IT" },
  { code:"pt", name:"Portekizce", speech:"pt-PT", tts:"pt-PT" },
  { code:"nl", name:"Felemenkçe", speech:"nl-NL", tts:"nl-NL" },
  { code:"ru", name:"Rusça", speech:"ru-RU", tts:"ru-RU" },
  { code:"ar", name:"Arapça", speech:"ar-SA", tts:"ar-SA" },
  { code:"zh", name:"Çince", speech:"zh-CN", tts:"zh-CN" },
  { code:"ja", name:"Japonca", speech:"ja-JP", tts:"ja-JP" },
  { code:"ko", name:"Korece", speech:"ko-KR", tts:"ko-KR" },
];

const SLOGAN_TR = "Yapay Zekânın Geleneksel Aklı";
const SLOGAN_MAP = {
  tr: SLOGAN_TR,
  en: "The Traditional Mind of AI",
  de: "Der traditionelle Verstand der KI",
  fr: "L’esprit traditionnel de l’IA",
  es: "La mente tradicional de la IA",
  it: "La mente tradizionale dell’IA",
  pt: "A mente tradicional da IA",
  nl: "De traditionele geest van AI",
  ru: "Традиционный разум ИИ",
  ar: "عقل الذكاء الاصطناعي التقليدي",
  zh: "AI 的传统思维",
  ja: "AIの伝統的な知性",
  ko: "AI의 전통적 지성",
};
function sloganFor(code){ return SLOGAN_MAP[code] || SLOGAN_TR; }
function speechLocale(code){ return LANGS.find(x=>x.code===code)?.speech || "en-US"; }
function ttsLocale(code){ return LANGS.find(x=>x.code===code)?.tts || "en-US"; }

async function translateViaApi(text, source, target){
  const b = base();
  if(!b) return text;

  try{
    const r = await fetch(`${b}/api/translate`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ text, source, target })
    });
    const data = await r.json().catch(()=> ({}));
    // ✅ farklı backend cevaplarını tolere et
    const out =
      String(data?.translated || data?.text || data?.translation || data?.result || "").trim();
    return out || text;
  }catch{
    return text;
  }
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

/* Auto-follow per side */
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

/* Add bubbles (NO labels) */
function addBubble(sideName, kind, text){
  const wrap = $(sideName === "top" ? "topBody" : "botBody");
  const b = document.createElement("div");
  b.className = `bubble ${kind}`;
  b.textContent = text || "—";
  wrap.appendChild(b);
  scrollIfNeeded(sideName, wrap);
}

/* Custom dropdown with search */
function buildDropdown(ddId, btnId, txtId, menuId, defCode, onChange){
  const dd = $(ddId);
  const btn = $(btnId);
  const txt = $(txtId);
  const menu = $(menuId);

  let current = defCode;

  function closeAll(){
    document.querySelectorAll(".dd.open").forEach(x=> x.classList.remove("open"));
  }

  function setValue(code){
    current = code;
    txt.textContent = (LANGS.find(l=>l.code===code)?.name || code);
    onChange?.(code);
  }

  // ✅ menu render (search + list)
  menu.innerHTML = `
    <div class="dd-search-wrap">
      <input class="dd-search" id="${menuId}__q" placeholder="Ara…" />
    </div>
    <div class="dd-sep">Sık kullanılan</div>
    ${LANGS.map(l=>`<div class="dd-item" data-code="${l.code}">${l.name}</div>`).join("")}
  `;

  const q = menu.querySelector(`#${menuId}__q`);
  const items = Array.from(menu.querySelectorAll(".dd-item"));

  // ✅ filtre
  q?.addEventListener("input", ()=>{
    const v = String(q.value||"").toLowerCase().trim();
    items.forEach(it=>{
      const name = String(it.textContent||"").toLowerCase();
      it.classList.toggle("hidden", v && !name.includes(v));
    });
  });

  items.forEach(it=>{
    it.addEventListener("click", ()=>{
      const code = it.getAttribute("data-code");
      closeAll();
      setValue(code);
    });
  });

  btn.addEventListener("click", (e)=>{
    e.stopPropagation();
    const open = dd.classList.contains("open");
    closeAll();
    dd.classList.toggle("open", !open);
    // açılınca search’e fokus
    if(!open){
      setTimeout(()=>{ try{ q?.focus(); }catch{} }, 0);
    }
  });

  document.addEventListener("click", ()=> closeAll());

  setValue(defCode);
  return { get: ()=> current, set: (c)=> setValue(c) };
}

/* Mic + wave */
let active = null;
let topRec = null;
let botRec = null;

function setMicUI(side, on){
  const mic = $(side === "top" ? "topMic" : "botMic");
  mic.classList.toggle("listening", !!on);
  setWaveListening(!!on);
}

function stopAll(){
  try{ topRec?.stop?.(); }catch{}
  try{ botRec?.stop?.(); }catch{}
  topRec = null;
  botRec = null;
  active = null;
  setMicUI("top", false);
  setMicUI("bot", false);
  setWaveListening(false);
}

/* Auto speak toggle (mute) */
const mute = { top:false, bot:false }; // false => speak ON
function setMute(side, on){
  mute[side] = !!on;
  const btn = $(side === "top" ? "topSpeak" : "botSpeak");
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
    toast("Bu cihaz konuşmayı yazıya çevirmiyor (SpeechRecognition yok).");
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

    if(!txt){
      active = null;
      return;
    }

    await onFinal(side, srcCode, dstCode, txt);
    active = null;
  };

  if(side === "top") topRec = rec;
  else botRec = rec;

  try{ rec.start(); }
  catch{
    toast("Mikrofon açılamadı.");
    stopAll();
  }
}

document.addEventListener("DOMContentLoaded", async ()=>{
  $("backBtn").addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href = "/pages/home.html";
  });

  // ✅ API ping (Render uyuyor mu / key var mı)
  await pingApi();

  hookScrollFollow("top", $("topBody"));
  hookScrollFollow("bot", $("botBody"));

  const topDD = buildDropdown("ddTop","ddTopBtn","ddTopTxt","ddTopMenu","en", (code)=>{
    $("sloganTop").textContent = sloganFor(code);
  });

  const botDD = buildDropdown("ddBot","ddBotBtn","ddBotTxt","ddBotMenu","tr", (code)=>{
    $("sloganBot").textContent = sloganFor(code);
  });

  $("sloganTop").textContent = sloganFor(topDD.get());
  $("sloganBot").textContent = sloganFor(botDD.get());

  $("topBody").innerHTML = "";
  $("botBody").innerHTML = "";

  $("topSpeak").addEventListener("click", ()=>{
    setMute("top", !mute.top);
    toast(mute.top ? "Ses kapalı" : "Ses açık");
  });
  $("botSpeak").addEventListener("click", ()=>{
    setMute("bot", !mute.bot);
    toast(mute.bot ? "Ses kapalı" : "Ses açık");
  });

  setMute("top", false);
  setMute("bot", false);

  $("topMic").addEventListener("click", ()=> startSide("top", ()=>topDD.get(), ()=>botDD.get()));
  $("botMic").addEventListener("click", ()=> startSide("bot", ()=>botDD.get(), ()=>topDD.get()));

  setWaveListening(false);
});
