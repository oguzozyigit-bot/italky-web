// FILE: italky-web/js/facetoface_page.js
import { BASE_DOMAIN } from "/js/config.js";

const $ = (id)=>document.getElementById(id);

/* ✅ Dil listesi: çok daha geniş + bayrak */
const LANGS = [
  { code:"tr", name:"Türkçe", flag:"🇹🇷" },
  { code:"en", name:"English", flag:"🇬🇧" },
  { code:"de", name:"Deutsch", flag:"🇩🇪" },
  { code:"fr", name:"Français", flag:"🇫🇷" },
  { code:"it", name:"Italiano", flag:"🇮🇹" },
  { code:"es", name:"Español", flag:"🇪🇸" },
  { code:"pt", name:"Português", flag:"🇵🇹" },
  { code:"pt-br", name:"Português (Brasil)", flag:"🇧🇷" },
  { code:"nl", name:"Nederlands", flag:"🇳🇱" },
  { code:"sv", name:"Svenska", flag:"🇸🇪" },
  { code:"no", name:"Norsk", flag:"🇳🇴" },
  { code:"da", name:"Dansk", flag:"🇩🇰" },
  { code:"fi", name:"Suomi", flag:"🇫🇮" },
  { code:"pl", name:"Polski", flag:"🇵🇱" },
  { code:"cs", name:"Čeština", flag:"🇨🇿" },
  { code:"sk", name:"Slovenčina", flag:"🇸🇰" },
  { code:"hu", name:"Magyar", flag:"🇭🇺" },
  { code:"ro", name:"Română", flag:"🇷🇴" },
  { code:"bg", name:"Български", flag:"🇧🇬" },
  { code:"el", name:"Ελληνικά", flag:"🇬🇷" },
  { code:"ru", name:"Русский", flag:"🇷🇺" },
  { code:"uk", name:"Українська", flag:"🇺🇦" },
  { code:"sr", name:"Српски", flag:"🇷🇸" },
  { code:"hr", name:"Hrvatski", flag:"🇭🇷" },
  { code:"bs", name:"Bosanski", flag:"🇧🇦" },
  { code:"sq", name:"Shqip", flag:"🇦🇱" },
  { code:"ar", name:"العربية", flag:"🇸🇦" },
  { code:"fa", name:"فارسی", flag:"🇮🇷" },
  { code:"ur", name:"اردو", flag:"🇵🇰" },
  { code:"hi", name:"हिन्दी", flag:"🇮🇳" },
  { code:"bn", name:"বাংলা", flag:"🇧🇩" },
  { code:"ta", name:"தமிழ்", flag:"🇮🇳" },
  { code:"te", name:"తెలుగు", flag:"🇮🇳" },
  { code:"th", name:"ไทย", flag:"🇹🇭" },
  { code:"vi", name:"Tiếng Việt", flag:"🇻🇳" },
  { code:"id", name:"Bahasa Indonesia", flag:"🇮🇩" },
  { code:"ms", name:"Bahasa Melayu", flag:"🇲🇾" },
  { code:"zh", name:"中文", flag:"🇨🇳" },
  { code:"zh-tw", name:"中文 (繁體)", flag:"🇹🇼" },
  { code:"ja", name:"日本語", flag:"🇯🇵" },
  { code:"ko", name:"한국어", flag:"🇰🇷" },
  { code:"he", name:"עברית", flag:"🇮🇱" },
];

let topLang = "en";
let botLang = "tr";

function langName(code){
  return LANGS.find(x=>x.code===code)?.name || code;
}
function langFlag(code){
  return LANGS.find(x=>x.code===code)?.flag || "🌐";
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

function bindLangButtons(){
  $("topLangBtn")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); openSheet("top"); });
  $("botLangBtn")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); openSheet("bot"); });

  $("sheetClose")?.addEventListener("click", closeSheet);
  $("langSheet")?.addEventListener("click", (e)=>{
    if(e.target === $("langSheet")) closeSheet();
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("topLangTxt").textContent = `${langFlag(topLang)} ${langName(topLang)}`;
  $("botLangTxt").textContent = `${langFlag(botLang)} ${langName(botLang)}`;

  bindNav();
  bindLangButtons();
});
