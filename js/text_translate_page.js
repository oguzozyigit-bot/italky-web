/* FILE: /js/text_translate_page.js — HYPER-VISION 2050 EDITION */
import { apiPOST } from "/js/api.js";
import { getSiteLang } from "/js/i18n.js";
import { supabase } from "/js/supabase_client.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";

const $ = (id) => document.getElementById(id);
const LOGIN_PATH = "/pages/login.html";

// Toast Mesaj Sistemi
function toast(msg){
  const el = $("toast");
  if(!el) return;
  el.textContent = String(msg||"");
  el.style.display = "block";
  el.style.opacity = "1";
  clearTimeout(window.__to);
  window.__to = setTimeout(()=> {
    el.style.opacity = "0";
    setTimeout(()=> el.style.display = "none", 300);
  }, 2000);
}

// 2050 GLOBAL DİL VERİTABANI (Eksiksiz & Bayraklı)
const LANGS = [
  { code:"tr", flag:"🇹🇷", bcp:"tr-TR" },
  { code:"en", flag:"🇬🇧", bcp:"en-US" },
  { code:"de", flag:"🇩🇪", bcp:"de-DE" },
  { code:"fr", flag:"🇫🇷", bcp:"fr-FR" },
  { code:"it", flag:"🇮🇹", bcp:"it-IT" },
  { code:"es", flag:"🇪🇸", bcp:"es-ES" },
  { code:"pt", flag:"🇵🇹", bcp:"pt-PT" },
  { code:"ru", flag:"🇷🇺", bcp:"ru-RU" },
  { code:"ar", flag:"🇸🇦", bcp:"ar-SA" },
  { code:"fa", flag:"🇮🇷", bcp:"fa-IR" },
  { code:"hi", flag:"🇮🇳", bcp:"hi-IN" },
  { code:"zh", flag:"🇨🇳", bcp:"zh-CN" },
  { code:"ja", flag:"🇯🇵", bcp:"ja-JP" },
  { code:"ko", flag:"🇰🇷", bcp:"ko-KR" },
  { code:"id", flag:"🇮🇩", bcp:"id-ID" },
  { code:"vi", flag:"🇻🇳", bcp:"vi-VN" },
  { code:"th", flag:"🇹🇭", bcp:"th-TH" }
];

function langObj(code){
  const c = String(code||"").toLowerCase();
  return LANGS.find(x=>x.code===c) || LANGS[0];
}

/* Defaults: EN -> TR (Ozyigit's Choice) */
let fromLang = sessionStorage.getItem("italky_text_from_v3") || "en";
let toLang   = sessionStorage.getItem("italky_text_to_v3") || "tr";

function setLangUI(){
  const fObj = langObj(fromLang);
  const tObj = langObj(toLang);
  if($("fromFlag")) $("fromFlag").textContent = fObj.flag;
  if($("fromLangTxt")) $("fromLangTxt").textContent = fObj.code.toUpperCase();
  if($("toFlag")) $("toFlag").textContent = tObj.flag;
  if($("toLangTxt")) $("toLangTxt").textContent = tObj.code.toUpperCase();
}

/* ✅ CORE SELECTOR (AÇILIR PENCERE) MANTIĞI */
let sheetFor = "from";

function openSheet(which){
  sheetFor = which;
  const sheet = $("langSheet");
  if(!sheet) return;

  renderSheet(""); // Listeyi tazele
  sheet.classList.add("active"); // 2050 Pop-up efekti
  
  setTimeout(() => $("sheetQuery")?.focus(), 100);
}

function closeSheet(){
  $("langSheet")?.classList.remove("active");
}

function renderSheet(filter){
  const q = String(filter||"").toLowerCase().trim();
  const list = $("sheetList");
  if(!list) return;

  const items = LANGS.filter(l => l.code.includes(q));

  list.innerHTML = items.map(l => `
    <div class="sheetRow" data-code="${l.code}">
      <span style="font-size:24px">${l.flag}</span>
      <span class="rowName">${l.code.toUpperCase()}</span>
    </div>
  `).join("");

  list.querySelectorAll(".sheetRow").forEach(row => {
    row.onclick = () => {
      const code = row.getAttribute("data-code");
      if(sheetFor === "from") fromLang = code; else toLang = code;
      
      sessionStorage.setItem("italky_text_from_v3", fromLang);
      sessionStorage.setItem("italky_text_to_v3", toLang);
      
      setLangUI();
      closeSheet();
    };
  });
}

/* NEURAL TRANSLATE ENGINE */
async function doTranslate(silent=false){
  const inEl = $("inText");
  const outEl = $("outText");
  const btn = $("translateBtn");
  const text = String(inEl?.value || "").trim();

  if(!text) {
    if(!silent) toast("İşlenecek veri bulunamadı");
    return;
  }

  if(btn) btn.innerText = "YÜKLENİYOR...";
  if(outEl) {
    outEl.textContent = "...";
    outEl.style.opacity = "0.5";
  }

  try {
    const body = { text, source: fromLang, target: toLang };
    const data = await apiPOST("/api/translate", body);
    const result = data?.translated || data?.translation || data?.text || "Çeviri Başarısız";
    
    if(outEl) {
      outEl.textContent = result;
      outEl.style.opacity = "1";
    }
  } catch(e) {
    toast("Engine Bağlantı Hatası");
    if(outEl) outEl.textContent = "—";
  } finally {
    if(btn) btn.innerText = "NEURAL ENGINE";
  }
}

/* SESLENDİRME VE DİĞER ÖZELLİKLER */
function speak(text, langCode){
  const t = String(text||"").trim();
  if(!t) return;
  if(window.NativeTTS) {
    window.NativeTTS.speak(t, langCode);
  } else {
    const u = new SpeechSynthesisUtterance(t);
    u.lang = langObj(langCode).bcp;
    window.speechSynthesis.speak(u);
  }
}

/* INITIALIZATION */
async function init(){
  // Auth Check
  const { data: { session } } = await supabase.auth.getSession();
  if(!session) return window.location.replace(LOGIN_PATH);

  setLangUI();

  // Event Listeners (2050 Standards)
  $("fromLangBtn").onclick = () => openSheet("from");
  $("toLangBtn").onclick = () => openSheet("to");
  
  $("swapBtn").onclick = () => {
    [fromLang, toLang] = [toLang, fromLang];
    setLangUI();
  };

  $("sheetClose").onclick = closeSheet;
  $("sheetQuery").oninput = (e) => renderSheet(e.target.value);
  
  $("langSheet").onclick = (e) => { if(e.target === $("langSheet")) closeSheet(); };

  $("clearBtn").onclick = () => {
    $("inText").value = "";
    $("outText").textContent = "—";
  };

  $("translateBtn").onclick = () => doTranslate();

  $("speakIn").onclick = () => speak($("inText").value, fromLang);
  $("speakOut").onclick = () => speak($("outText").textContent, toLang);

  // Mic Logic
  $("micIn").onclick = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR) return toast("Mic desteği yok");
    const rec = new SR();
    rec.lang = langObj(fromLang).bcp;
    rec.onstart = () => $("micIn").classList.add("listening");
    rec.onresult = (e) => {
      $("inText").value = e.results[0][0].transcript;
      doTranslate(true);
    };
    rec.onend = () => $("micIn").classList.remove("listening");
    rec.start();
  };
}

init();
