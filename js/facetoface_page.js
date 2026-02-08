// FILE: italky-web/js/facetoface_page.js
import { BASE_DOMAIN } from "/js/config.js";

const $ = (id)=>document.getElementById(id);
function base(){ return String(BASE_DOMAIN||"").replace(/\/+$/,""); }

/* ✅ Dil listesi + bayrak + TTS locale */
const LANGS = [
  { code:"tr", name:"Türkçe", flag:"🇹🇷", bcp:"tr-TR" },
  { code:"en", name:"İngilizce", flag:"🇬🇧", bcp:"en-US" },
  { code:"de", name:"Almanca", flag:"🇩🇪", bcp:"de-DE" },
  { code:"fr", name:"Fransızca", flag:"🇫🇷", bcp:"fr-FR" },
  { code:"it", name:"İtalyanca", flag:"🇮🇹", bcp:"it-IT" },
  { code:"es", name:"İspanyolca", flag:"🇪🇸", bcp:"es-ES" },
  { code:"pt", name:"Portekizce", flag:"🇵🇹", bcp:"pt-PT" },
  { code:"pt-br", name:"Portekizce (Brezilya)", flag:"🇧🇷", bcp:"pt-BR" },

  { code:"nl", name:"Felemenkçe", flag:"🇳🇱", bcp:"nl-NL" },
  { code:"sv", name:"İsveççe", flag:"🇸🇪", bcp:"sv-SE" },
  { code:"no", name:"Norveççe", flag:"🇳🇴", bcp:"nb-NO" },
  { code:"da", name:"Danca", flag:"🇩🇰", bcp:"da-DK" },
  { code:"fi", name:"Fince", flag:"🇫🇮", bcp:"fi-FI" },

  { code:"pl", name:"Lehçe", flag:"🇵🇱", bcp:"pl-PL" },
  { code:"cs", name:"Çekçe", flag:"🇨🇿", bcp:"cs-CZ" },
  { code:"sk", name:"Slovakça", flag:"🇸🇰", bcp:"sk-SK" },
  { code:"hu", name:"Macarca", flag:"🇭🇺", bcp:"hu-HU" },
  { code:"ro", name:"Romence", flag:"🇷🇴", bcp:"ro-RO" },
  { code:"bg", name:"Bulgarca", flag:"🇧🇬", bcp:"bg-BG" },
  { code:"el", name:"Yunanca", flag:"🇬🇷", bcp:"el-GR" },

  { code:"ru", name:"Rusça", flag:"🇷🇺", bcp:"ru-RU" },
  { code:"uk", name:"Ukraynaca", flag:"🇺🇦", bcp:"uk-UA" },
  { code:"sr", name:"Sırpça", flag:"🇷🇸", bcp:"sr-RS" },
  { code:"hr", name:"Hırvatça", flag:"🇭🇷", bcp:"hr-HR" },
  { code:"bs", name:"Boşnakça", flag:"🇧🇦", bcp:"bs-BA" },
  { code:"sq", name:"Arnavutça", flag:"🇦🇱", bcp:"sq-AL" },

  { code:"ar", name:"Arapça", flag:"🇸🇦", bcp:"ar-SA" },
  { code:"fa", name:"Farsça", flag:"🇮🇷", bcp:"fa-IR" },
  { code:"ur", name:"Urduca", flag:"🇵🇰", bcp:"ur-PK" },
  { code:"hi", name:"Hintçe", flag:"🇮🇳", bcp:"hi-IN" },
  { code:"bn", name:"Bengalce", flag:"🇧🇩", bcp:"bn-BD" },
  { code:"ta", name:"Tamilce", flag:"🇮🇳", bcp:"ta-IN" },
  { code:"te", name:"Teluguca", flag:"🇮🇳", bcp:"te-IN" },

  { code:"th", name:"Tayca", flag:"🇹🇭", bcp:"th-TH" },
  { code:"vi", name:"Vietnamca", flag:"🇻🇳", bcp:"vi-VN" },
  { code:"id", name:"Endonezce", flag:"🇮🇩", bcp:"id-ID" },
  { code:"ms", name:"Malayca", flag:"🇲🇾", bcp:"ms-MY" },

  { code:"zh", name:"Çince", flag:"🇨🇳", bcp:"zh-CN" },
  { code:"zh-tw", name:"Çince (Geleneksel)", flag:"🇹🇼", bcp:"zh-TW" },
  { code:"ja", name:"Japonca", flag:"🇯🇵", bcp:"ja-JP" },
  { code:"ko", name:"Korece", flag:"🇰🇷", bcp:"ko-KR" },
  { code:"he", name:"İbranice", flag:"🇮🇱", bcp:"he-IL" },
];

let topLang = "en";
let botLang = "tr";

function langName(code){ return LANGS.find(x=>x.code===code)?.name || code; }
function langFlag(code){ return LANGS.find(x=>x.code===code)?.flag || "🌐"; }
function bcp(code){ return LANGS.find(x=>x.code===code)?.bcp || "en-US"; }

/* ===== TTS ===== */
function speak(text, langCode){
  const t = String(text||"").trim();
  if(!t) return;
  if(!("speechSynthesis" in window)) return;

  try{
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(t);
    u.lang = bcp(langCode);
    window.speechSynthesis.speak(u);
  }catch{}
}

/* ===== bubbles (with inline speaker for incoming speech) ===== */
function addBubble(side, kind, text, langForSpeak){
  const wrap = (side === "top") ? $("topBody") : $("botBody");
  if(!wrap) return;

  const row = document.createElement("div");
  row.className = `bubble ${kind}`;

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text||"").trim() || "—";

  row.appendChild(txt);

  // ✅ hoparlör sadece "them" (gelen konuşma) yanında
  if(kind === "them"){
    const spk = document.createElement("button");
    spk.className = "spk";
    spk.type = "button";
    spk.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M11 5L6 9H2v6h4l5 4V5z"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      </svg>
    `;
    spk.addEventListener("click", (e)=>{
      e.preventDefault();
      e.stopPropagation();
      speak(txt.textContent, langForSpeak);
    });
    row.appendChild(spk);
  }

  wrap.appendChild(row);
  try{ wrap.scrollTop = wrap.scrollHeight; }catch{}
}

/* ===== UI ===== */
function setMicUI(which, on){
  const btn = (which === "top") ? $("topMic") : $("botMic");
  btn?.classList.toggle("listening", !!on);
  $("frameRoot")?.classList.toggle("listening", !!on);
}

/* ===== Popover Language ===== */
function closeAllPop(){
  $("pop-top")?.classList.remove("show");
  $("pop-bot")?.classList.remove("show");
}

function renderPop(side){
  const list = $(side === "top" ? "list-top" : "list-bot");
  if(!list) return;

  const sel = (side === "top") ? topLang : botLang;

  list.innerHTML = LANGS.map(l => `
    <div class="pop-item ${l.code===sel ? "active":""}" data-code="${l.code}">
      <div class="pop-left">
        <div class="pop-flag">${l.flag}</div>
        <div class="pop-name">${l.name}</div>
      </div>
      <div class="pop-code">${l.code}</div>
    </div>
  `).join("");

  list.querySelectorAll(".pop-item").forEach(item=>{
    item.addEventListener("click", ()=>{
      const code = item.getAttribute("data-code") || "en";
      if(side === "top"){
        topLang = code;
        const t = $("topLangTxt");
        if(t) t.textContent = `${topLang.toUpperCase()}`;
      }else{
        botLang = code;
        const t = $("botLangTxt");
        if(t) t.textContent = `${botLang.toUpperCase()}`;
      }
      stopAll();
      closeAllPop();
    });
  });
}

function applySearch(side){
  const q = String($(side === "top" ? "search-top" : "search-bot")?.value || "").toLowerCase().trim();
  const list = $(side === "top" ? "list-top" : "list-bot");
  if(!list) return;

  list.querySelectorAll(".pop-item").forEach(item=>{
    const code = String(item.getAttribute("data-code")||"").toLowerCase();
    const name = String(item.querySelector(".pop-name")?.textContent||"").toLowerCase();
    const show = !q || code.includes(q) || name.includes(q);
    item.style.display = show ? "flex" : "none";
  });
}

function togglePop(side){
  const pop = $(side === "top" ? "pop-top" : "pop-bot");
  if(!pop) return;

  const willShow = !pop.classList.contains("show");
  closeAllPop();
  if(!willShow) return;

  pop.classList.add("show");
  renderPop(side);

  const s = $(side === "top" ? "search-top" : "search-bot");
  if(s){
    s.value = "";
    s.focus?.();
    s.oninput = ()=> applySearch(side);
  }
}

/* ===== Translate ===== */
async function translateViaApi(text, source, target){
  const b = base();
  if(!b) return text;

  const body = { text, source, target, from_lang: source, to_lang: target };

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
}

/* ===== STT ===== */
let active = null;
let recTop = null;
let recBot = null;

function stopAll(){
  try{ recTop?.stop?.(); }catch{}
  try{ recBot?.stop?.(); }catch{}
  recTop = null;
  recBot = null;
  active = null;
  setMicUI("top", false);
  setMicUI("bot", false);
}

function buildRecognizer(langCode){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;

  const rec = new SR();
  rec.lang = bcp(langCode);
  rec.interimResults = false;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  return rec;
}

async function start(which){
  // Mikrofon HTTPS ister (localhost hariç)
  if(location.protocol !== "https:" && location.hostname !== "localhost"){
    alert("Mikrofon için HTTPS gerekli. (Vercel/HTTPS kullan)");
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    alert("Bu tarayıcı SpeechRecognition desteklemiyor (Chrome/Edge dene).");
    return;
  }

  if(active && active !== which) stopAll();

  const src = (which === "top") ? topLang : botLang;
  const dst = (which === "top") ? botLang : topLang;

  const rec = buildRecognizer(src);
  if(!rec){
    alert("Mikrofon başlatılamadı.");
    return;
  }

  active = which;
  setMicUI(which, true);

  rec.onresult = async (e)=>{
    const t = e.results?.[0]?.[0]?.transcript || "";
    const finalText = String(t||"").trim();
    if(!finalText) return;

    // ✅ gelen konuşma (them) + yanında hoparlör
    addBubble(which, "them", finalText, src);

    // ✅ çeviriyi diğer tarafa yaz (me)
    const other = (which === "top") ? "bot" : "top";
    try{
      const translated = await translateViaApi(finalText, src, dst);
      addBubble(other, "me", translated, dst);

      // otomatik ses: çeviri hangi tarafa yazıldıysa o tarafın dilinde okur
      speak(translated, dst);
    }catch{}
  };

  rec.onerror = ()=>{
    stopAll();
    alert("Mikrofon çalışmadı. Site ayarlarından mikrofonu Allow yap (Chrome: kilit simgesi).");
  };

  rec.onend = ()=>{
    setMicUI(which, false);
    active = null;
  };

  if(which === "top") recTop = rec;
  else recBot = rec;

  try{ rec.start(); }
  catch{
    stopAll();
    alert("Mikrofon başlatılamadı.");
  }
}

/* ===== Buttons ===== */
function bindNav(){
  // ✅ Logo: home
  $("homeBtn")?.addEventListener("click", ()=>{
    location.href = "/pages/home.html";
  });

  // ✅ burgundy-side arrow: back/start
  $("topBack")?.addEventListener("click", ()=>{
    stopAll();
    closeAllPop();
    if(history.length > 1) history.back();
    else location.href = "/pages/home.html";
  });
}

function bindLangButtons(){
  $("topLangBtn")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); togglePop("top"); });
  $("botLangBtn")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); togglePop("bot"); });
}

function bindMicButtons(){
  $("topMic")?.addEventListener("click", (e)=>{
    e.preventDefault();
    closeAllPop();
    if(active === "top") stopAll();
    else start("top");
  });

  $("botMic")?.addEventListener("click", (e)=>{
    e.preventDefault();
    closeAllPop();
    if(active === "bot") stopAll();
    else start("bot");
  });
}

// click outside closes popover (no page overlay)
function bindOutsideClose(){
  document.addEventListener("click", (e)=>{
    const t = e.target;

    const inTop = $("pop-top")?.contains(t) || $("topLangBtn")?.contains(t);
    const inBot = $("pop-bot")?.contains(t) || $("botLangBtn")?.contains(t);

    if(inTop || inBot) return;
    closeAllPop();
  }, { capture:true });
}

document.addEventListener("DOMContentLoaded", ()=>{
  // initial labels
  if($("topLangTxt")) $("topLangTxt").textContent = topLang.toUpperCase();
  if($("botLangTxt")) $("botLangTxt").textContent = botLang.toUpperCase();

  bindNav();
  bindLangButtons();
  bindMicButtons();
  bindOutsideClose();
});
