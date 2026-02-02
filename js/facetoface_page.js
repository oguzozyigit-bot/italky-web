// FILE: italky-web/js/facetoface_page.js
import { BASE_DOMAIN } from "/js/config.js";

const $ = (id)=>document.getElementById(id);

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

let topLang = "en";
let botLang = "tr";

/* ========= BE FREE line: i altı -> y ortası ========= */
function layoutBeFreeLineFor(lineEl, italkyEl, yEl){
  try{
    if(!lineEl || !italkyEl || !yEl) return;
    const wrap = lineEl.parentElement;
    if(!wrap) return;

    // Not: yEl invisible span, italkyEl visible span
    const itR = italkyEl.getBoundingClientRect();
    const yR  = yEl.getBoundingClientRect();
    const wR  = wrap.getBoundingClientRect();

    let left  = itR.left - wR.left;                 // i altı (sol)
    let right = (yR.left + (yR.width/2)) - wR.left; // y ortası

    left  = Math.max(0, Math.min(left, wR.width));
    right = Math.max(0, Math.min(right, wR.width));
    if(right < left){ const t = left; left = right; right = t; }

    wrap.style.setProperty("--beLeft", `${Math.round(left)}px`);
    wrap.style.setProperty("--beRight", `${Math.round(right)}px`);
  }catch{}
}

function layoutAllBeFree(){
  // bottom
  layoutBeFreeLineFor($("beFreeLine"), $("logoItalky"), $("logoY"));
  // top (brandTop rotate var ama ölçüm aynı)
  layoutBeFreeLineFor($("beFreeLineTop"), $("logoItalkyTop"), $("logoYTop"));
}

/* ========= Language sheet logic ========= */
let sheetFor = "bot"; // "top" | "bot"

function renderSheetList(){
  const list = $("sheetList");
  if(!list) return;
  list.innerHTML = LANGS.map(l => `
    <div class="sheetRow" data-code="${l.code}">
      <div class="name">${l.name}</div>
      <div class="code">${l.code}</div>
    </div>
  `).join("");

  list.querySelectorAll(".sheetRow").forEach(row=>{
    row.addEventListener("click", ()=>{
      const code = row.getAttribute("data-code") || "en";
      if(sheetFor === "top"){
        topLang = code;
        $("topLangTxt").textContent = LANGS.find(x=>x.code===topLang)?.name || topLang;
      }else{
        botLang = code;
        $("botLangTxt").textContent = LANGS.find(x=>x.code===botLang)?.name || botLang;
      }

      // seçili işaret
      list.querySelectorAll(".sheetRow").forEach(r=> r.classList.remove("selected"));
      row.classList.add("selected");

      closeSheet();
    });
  });

  // initial selected
  const sel = (sheetFor === "top") ? topLang : botLang;
  list.querySelectorAll(".sheetRow").forEach(r=>{
    if((r.getAttribute("data-code")||"") === sel) r.classList.add("selected");
  });
}

function openSheet(which){
  sheetFor = which;

  const overlay = $("langSheet");
  if(!overlay) return;

  // ✅ Kritik: ÜSTTEN açılıyorsa overlay'e fromTop classı veriyoruz
  overlay.classList.toggle("fromTop", which === "top");
  overlay.classList.add("show");

  $("sheetTitle").textContent = (which === "top") ? "Üst Dil" : "Alt Dil";

  $("sheetQuery").value = "";
  renderSheetList();
  $("sheetQuery")?.focus?.();

  // filtre
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

/* ========= Minimal mic/speak hooks (şimdilik boş bırakıyoruz, mevcut sisteminle entegre edeceksin) ========= */
function bindLangButtons(){
  $("topLangBtn")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); openSheet("top"); });
  $("botLangBtn")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); openSheet("bot"); });

  $("sheetClose")?.addEventListener("click", closeSheet);
  $("langSheet")?.addEventListener("click", (e)=>{
    if(e.target === $("langSheet")) closeSheet();
  });
}

document.addEventListener("DOMContentLoaded", ()=>{
  // default labels
  $("topLangTxt").textContent = LANGS.find(x=>x.code===topLang)?.name || topLang;
  $("botLangTxt").textContent = LANGS.find(x=>x.code===botLang)?.name || botLang;

  bindNav();
  bindLangButtons();

  // BE FREE çizgisini yerleştir
  layoutAllBeFree();
  window.addEventListener("resize", ()=> setTimeout(layoutAllBeFree, 50), { passive:true });
  document.fonts?.ready?.then(()=> setTimeout(layoutAllBeFree, 50)).catch(()=>{});
});
