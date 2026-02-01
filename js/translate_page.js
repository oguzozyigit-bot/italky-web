// FILE: italky-web/js/translate_page.js
// ✅ Slogan SABİT: "By Ozyigit's" (JS artık slogan değiştirmez)
// ✅ Dropdown: arama + scroll (gizli) + çok dil
// ✅ Mic altta ortada (ID aynı: topMic/botMic)
// ✅ Auto speak ON; speaker tuşu sadece MUTE toggle
// ✅ Wave yalnız dinlerken hızlanır
// ✅ API: POST /api/translate  (BASE_DOMAIN)
// ✅ Ping: GET /api/translate/ping

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
    else if(!d?.has_key) toast("GOOGLE_API_KEY eksik.");
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

function speechLocale(code){ return LANGS.find(x=>x.code===code)?.speech || "en-US"; }
function ttsLocale(code){ return LANGS.find(x=>x.code===code)?.tts || "en-US"; }

async function translateViaApi(text, source, target){
  const b = base();
  if(!b) return text;

  try{
    const r = await fetch(`${b}/api/translate`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      // ✅ backend’in kabul ettiği isimler: source/target veya from_lang/to_lang
      body: JSON.stringify({ text, source, target })
    });
    const data = await r.json().catch(()=> ({}));
    const out = String(
      data?.translated || data?.translation || data?.text || data?.result || ""
    ).trim();
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
function buildDropdown(ddId, btnId, txtId, menuId, defCode){
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
  }

  menu.innerHTML = `
    <div class="dd-search-wrap">
      <input class="dd-search" id="${menuId}__q" placeholder="Ara…" />
    </div>
    <div class="dd-sep">Diller</div>
    ${LANGS.map(l=>`<div class="dd-item" data-code="${l.code}">${l.name}</div>`).join("")}
  `;

  const q = menu.querySelector(`#${menuId}__q`);
  const items = Array.from(menu.querySelectorAll(".dd-item"));

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
  mic?.classList.toggle("listening", !!on);
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
  // back
  $("backBtn")?.addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href = "/pages/home.html";
  });

  // ✅ Sloganlar SABİT kalsın: By Ozyigit's (HTML’de yazıyor)
  // JS burada sloganTop/sloganBot’a dokunmuyor.

  // ping
  await pingApi();

  // scroll follow
  hookScrollFollow("top", $("topBody"));
  hookScrollFollow("bot", $("botBody"));

  // dropdowns
  const topDD = buildDropdown("ddTop","ddTopBtn","ddTopTxt","ddTopMenu","en");
  const botDD = buildDropdown("ddBot","ddBotBtn","ddBotTxt","ddBotMenu","tr");

  // clear
  $("topBody").innerHTML = "";
  $("botBody").innerHTML = "";

  // speaker toggles
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

  // mic
  $("topMic")?.addEventListener("click", ()=> startSide("top", ()=>topDD.get(), ()=>botDD.get()));
  $("botMic")?.addEventListener("click", ()=> startSide("bot", ()=>botDD.get(), ()=>topDD.get()));

  setWaveListening(false);
});
