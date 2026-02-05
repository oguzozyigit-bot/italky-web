// FILE: italky-web/js/facetoface_page.js
import { BASE_DOMAIN } from "/js/config.js";

const $ = (id)=>document.getElementById(id);

function base(){ return String(BASE_DOMAIN||"").replace(/\/+$/,""); }

/* ✅ Dil listesi: çok daha geniş + bayrak */
const LANGS = [
  { code:"tr", name:"Türkçe", flag:"🇹🇷", bcp:"tr-TR" },
  { code:"en", name:"English", flag:"🇬🇧", bcp:"en-US" },
  { code:"de", name:"Deutsch", flag:"🇩🇪", bcp:"de-DE" },
  { code:"fr", name:"Français", flag:"🇫🇷", bcp:"fr-FR" },
  { code:"it", name:"Italiano", flag:"🇮🇹", bcp:"it-IT" },
  { code:"es", name:"Español", flag:"🇪🇸", bcp:"es-ES" },
  { code:"pt", name:"Português", flag:"🇵🇹", bcp:"pt-PT" },
  { code:"pt-br", name:"Português (Brasil)", flag:"🇧🇷", bcp:"pt-BR" },
  { code:"nl", name:"Nederlands", flag:"🇳🇱", bcp:"nl-NL" },
  { code:"sv", name:"Svenska", flag:"🇸🇪", bcp:"sv-SE" },
  { code:"no", name:"Norsk", flag:"🇳🇴", bcp:"nb-NO" },
  { code:"da", name:"Dansk", flag:"🇩🇰", bcp:"da-DK" },
  { code:"fi", name:"Suomi", flag:"🇫🇮", bcp:"fi-FI" },
  { code:"pl", name:"Polski", flag:"🇵🇱", bcp:"pl-PL" },
  { code:"cs", name:"Čeština", flag:"🇨🇿", bcp:"cs-CZ" },
  { code:"sk", name:"Slovenčina", flag:"🇸🇰", bcp:"sk-SK" },
  { code:"hu", name:"Magyar", flag:"🇭🇺", bcp:"hu-HU" },
  { code:"ro", name:"Română", flag:"🇷🇴", bcp:"ro-RO" },
  { code:"bg", name:"Български", flag:"🇧🇬", bcp:"bg-BG" },
  { code:"el", name:"Ελληνικά", flag:"🇬🇷", bcp:"el-GR" },
  { code:"ru", name:"Русский", flag:"🇷🇺", bcp:"ru-RU" },
  { code:"uk", name:"Українська", flag:"🇺🇦", bcp:"uk-UA" },
  { code:"sr", name:"Српски", flag:"🇷🇸", bcp:"sr-RS" },
  { code:"hr", name:"Hrvatski", flag:"🇭🇷", bcp:"hr-HR" },
  { code:"bs", name:"Bosanski", flag:"🇧🇦", bcp:"bs-BA" },
  { code:"sq", name:"Shqip", flag:"🇦🇱", bcp:"sq-AL" },
  { code:"ar", name:"العربية", flag:"🇸🇦", bcp:"ar-SA" },
  { code:"fa", name:"فارسی", flag:"🇮🇷", bcp:"fa-IR" },
  { code:"ur", name:"اردو", flag:"🇵🇰", bcp:"ur-PK" },
  { code:"hi", name:"हिन्दी", flag:"🇮🇳", bcp:"hi-IN" },
  { code:"bn", name:"বাংলা", flag:"🇧🇩", bcp:"bn-BD" },
  { code:"ta", name:"தமிழ்", flag:"🇮🇳", bcp:"ta-IN" },
  { code:"te", name:"తెలుగు", flag:"🇮🇳", bcp:"te-IN" },
  { code:"th", name:"ไทย", flag:"🇹🇭", bcp:"th-TH" },
  { code:"vi", name:"Tiếng Việt", flag:"🇻🇳", bcp:"vi-VN" },
  { code:"id", name:"Bahasa Indonesia", flag:"🇮🇩", bcp:"id-ID" },
  { code:"ms", name:"Bahasa Melayu", flag:"🇲🇾", bcp:"ms-MY" },
  { code:"zh", name:"中文", flag:"🇨🇳", bcp:"zh-CN" },
  { code:"zh-tw", name:"中文 (繁體)", flag:"🇹🇼", bcp:"zh-TW" },
  { code:"ja", name:"日本語", flag:"🇯🇵", bcp:"ja-JP" },
  { code:"ko", name:"한국어", flag:"🇰🇷", bcp:"ko-KR" },
  { code:"he", name:"עברית", flag:"🇮🇱", bcp:"he-IL" },
];

let topLang = "en";
let botLang = "tr";

function langName(code){ return LANGS.find(x=>x.code===code)?.name || code; }
function langFlag(code){ return LANGS.find(x=>x.code===code)?.flag || "🌐"; }
function bcp(code){ return LANGS.find(x=>x.code===code)?.bcp || "en-US"; }

/* ========= toasts (basit) ========= */
function toast(msg){
  // yüz yüze sayfasında toast UI yok, ama en azından net uyarı
  alert(msg);
}

/* ========= bubbles ========= */
function addBubble(side, kind, text){
  const wrap = (side === "top") ? $("topBody") : $("botBody");
  if(!wrap) return;
  const b = document.createElement("div");
  b.className = `bubble ${kind}`; // kind: me/them
  b.textContent = String(text||"").trim() || "—";
  wrap.appendChild(b);
  wrap.scrollTop = wrap.scrollHeight;
}

function setMicUI(which, on){
  const btn = (which === "top") ? $("topMic") : $("botMic");
  btn?.classList.toggle("listening", !!on);
  $("frameRoot")?.classList.toggle("listening", !!on);
}

/* ========= Language sheet ========= */
let sheetFor = "bot"; // "top" | "bot"

function renderSheetList(){
  const list = $("sheetList");
  if(!list) return;

  const sel = (sheetFor === "top") ? topLang : botLang;

  list.innerHTML = LANGS.map(l => `
    <div class="sheetRow ${l.code===sel ? "selected":""}" data-code="${l.code}">
      <div class="left">
        <div class="flag">${l.flag}</div>
        <div class="name">${l.name}</div>
      </div>
      <div class="code">${l.code}</div>
    </div>
  `).join("");

  list.querySelectorAll(".sheetRow").forEach(row=>{
    row.addEventListener("click", ()=>{
      const code = row.getAttribute("data-code") || "en";

      if(sheetFor === "top"){
        topLang = code;
        $("topLangTxt").textContent = `${langFlag(topLang)} ${langName(topLang)}`;
      }else{
        botLang = code;
        $("botLangTxt").textContent = `${langFlag(botLang)} ${langName(botLang)}`;
      }

      stopAll();
      closeSheet();
    });
  });
}

function openSheet(which){
  sheetFor = which;

  const overlay = $("langSheet");
  if(!overlay) return;

  overlay.classList.toggle("fromTop", which === "top");
  overlay.classList.add("show");

  $("sheetTitle").textContent = (which === "top") ? "Üst Dil" : "Alt Dil";
  $("sheetQuery").value = "";
  renderSheetList();

  $("sheetQuery")?.focus?.();

  $("sheetQuery").oninput = ()=>{
    const q = ($("sheetQuery").value || "").toLowerCase().trim();
    overlay.querySelectorAll(".sheetRow").forEach(r=>{
      const code = (r.getAttribute("data-code")||"").toLowerCase();
      const nm = (r.querySelector(".name")?.textContent||"").toLowerCase();
      const show = !q || nm.includes(q) || code.includes(q);
      r.style.display = show ? "flex" : "none";
    });
  };
}

function closeSheet(){
  const overlay = $("langSheet");
  if(!overlay) return;
  overlay.classList.remove("show");
  overlay.classList.remove("fromTop");
}

/* ========= Back ========= */
function bindNav(){
  $("backBtn")?.addEventListener("click", ()=>{
    if(history.length > 1) history.back();
    else location.href="/pages/home.html";
  });
}

/* ========= Translate ========= */
async function translateViaApi(text, source, target){
  const b = base();
  if(!b) return text;

  const body = {
    text,
    source,
    target,
    from_lang: source,
    to_lang: target,
  };

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

/* ========= STT ========= */
let active = null;
let recTop = null;
let recBot = null;

function stopAll(){
  try{ recTop?.stop?.(); }catch{}
  try{ recBot?.stop?.(); }catch{}
  recTop = null; recBot = null;
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
  return rec;
}

async function start(which){
  // ✅ SpeechRecognition HTTPS ister (localhost hariç)
  if(location.protocol !== "https:" && location.hostname !== "localhost"){
    toast("Mikrofon için HTTPS gerekli. (Vercel/HTTPS kullan)");
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){
    toast("Bu tarayıcı SpeechRecognition desteklemiyor (Chrome/Edge dene).");
    return;
  }

  if(active && active !== which) stopAll();

  const src = (which === "top") ? topLang : botLang;
  const dst = (which === "top") ? botLang : topLang;

  const rec = buildRecognizer(src);
  if(!rec){
    toast("Mikrofon başlatılamadı.");
    return;
  }

  active = which;
  setMicUI(which, true);

  rec.onresult = async (e)=>{
    const t = e.results?.[0]?.[0]?.transcript || "";
    const finalText = String(t||"").trim();
    if(!finalText) return;

    // konuşanı kendi tarafına yaz
    addBubble(which, "them", finalText);

    // çeviriyi karşı tarafa yaz
    try{
      const translated = await translateViaApi(finalText, src, dst);
      const other = (which === "top") ? "bot" : "top";
      addBubble(other, "me", translated);
    }catch{
      // sessiz
    }
  };

  rec.onerror = (ev)=>{
    stopAll();
    // izin reddi / network vb.
    toast("Mikrofon çalışmadı. İzin verildi mi? (Site ayarlarından mikrofonu Allow yap)");
  };

  rec.onend = ()=>{
    setMicUI(which, false);
    active = null;
  };

  if(which === "top") recTop = rec; else recBot = rec;

  try{ rec.start(); }
  catch{
    stopAll();
    toast("Mikrofon başlatılamadı.");
  }
}

/* ========= Buttons ========= */
function bindLangButtons(){
  $("topLangBtn")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); openSheet("top"); });
  $("botLangBtn")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); openSheet("bot"); });

  $("sheetClose")?.addEventListener("click", closeSheet);
  $("langSheet")?.addEventListener("click", (e)=>{
    if(e.target === $("langSheet")) closeSheet();
  });
}

function bindMicButtons(){
  $("topMic")?.addEventListener("click", (e)=>{
    e.preventDefault();
    if(active === "top") stopAll();
    else start("top");
  });

  $("botMic")?.addEventListener("click", (e)=>{
    e.preventDefault();
    if(active === "bot") stopAll();
    else start("bot");
  });

  // Speak butonları (mute toggle – şimdilik görsel)
  $("topSpeak")?.addEventListener("click", ()=> $("topSpeak")?.classList.toggle("muted"));
  $("botSpeak")?.addEventListener("click", ()=> $("botSpeak")?.classList.toggle("muted"));
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("topLangTxt").textContent = `${langFlag(topLang)} ${langName(topLang)}`;
  $("botLangTxt").textContent = `${langFlag(botLang)} ${langName(botLang)}`;

  bindNav();
  bindLangButtons();
  bindMicButtons();
});
