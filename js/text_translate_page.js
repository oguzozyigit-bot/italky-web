// FILE: /js/text_translate_page.js — FINAL (Shell uyumlu + AUTO fix)
import { apiPOST } from "/js/api.js";
import { getSiteLang } from "/js/i18n.js";
import { supabase } from "/js/supabase_client.js";
import { ensureAuthAndCacheUser } from "/js/auth.js";

const $ = (id) => document.getElementById(id);

const LOGIN_PATH = "/pages/login.html";

function toast(msg){
  const el = $("toast");
  if(!el) return;
  el.textContent = String(msg||"");
  el.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=> el.classList.remove("show"), 1800);
}

/* ===============================
   UI language
=============================== */
function getSystemUILang(){
  try{
    const l = String(getSiteLang?.() || "").toLowerCase().trim();
    if(l) return l;
  }catch{}
  try{
    const l2 = String(localStorage.getItem("italky_site_lang_v1") || "").toLowerCase().trim();
    if(l2) return l2;
  }catch{}
  return "tr";
}
let UI_LANG = getSystemUILang();

const AUTO_LABELS = {
  tr: "Dili Algıla",
  en: "Detect language",
  de: "Sprache erkennen",
  it: "Rileva lingua",
  fr: "Détecter la langue",
  es: "Detectar idioma",
  ru: "Определить язык"
};
function autoLabel(){ return AUTO_LABELS[UI_LANG] || AUTO_LABELS.tr; }
function sourceLabel(){ return ({ tr:"Kaynak Dil", en:"Source" }[UI_LANG] || "Kaynak Dil"); }
function targetLabel(){ return ({ tr:"Hedef Dil", en:"Target" }[UI_LANG] || "Hedef Dil"); }
function searchLabel(){ return ({ tr:"Ara…", en:"Search…" }[UI_LANG] || "Ara…"); }

/* ===============================
   LANG registry (wide)
=============================== */
const LANGS = [
  { code:"auto", flag:"✨", bcp:"" },

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
  { code:"bn", flag:"🇧🇩", bcp:"bn-BD" },
  { code:"id", flag:"🇮🇩", bcp:"id-ID" },
  { code:"ms", flag:"🇲🇾", bcp:"ms-MY" },
  { code:"vi", flag:"🇻🇳", bcp:"vi-VN" },
  { code:"th", flag:"🇹🇭", bcp:"th-TH" },
  { code:"zh", flag:"🇨🇳", bcp:"zh-CN" },
  { code:"ja", flag:"🇯🇵", bcp:"ja-JP" },
  { code:"ko", flag:"🇰🇷", bcp:"ko-KR" },

  { code:"az", flag:"🇦🇿", bcp:"az-AZ" },
  { code:"uk", flag:"🇺🇦", bcp:"uk-UA" },
  { code:"el", flag:"🇬🇷", bcp:"el-GR" },
  { code:"nl", flag:"🇳🇱", bcp:"nl-NL" },
  { code:"sv", flag:"🇸🇪", bcp:"sv-SE" },
  { code:"da", flag:"🇩🇰", bcp:"da-DK" },
  { code:"fi", flag:"🇫🇮", bcp:"fi-FI" },
  { code:"pl", flag:"🇵🇱", bcp:"pl-PL" },
];

function canonical(code){ return String(code||"").toLowerCase().split("-")[0]; }
function langObj(code){
  const c = String(code||"").toLowerCase();
  return LANGS.find(x=>x.code===c) || LANGS.find(x=>x.code===canonical(c)) || LANGS[0];
}
function langFlag(code){ return langObj(code)?.flag || "🌐"; }
function bcp(code){ return langObj(code)?.bcp || "en-US"; }

/* localized names */
let _dn = null;
function getDisplayNames(){
  if(_dn && _dn.__lang === UI_LANG) return _dn;
  _dn = null;
  try{
    const dn = new Intl.DisplayNames([UI_LANG], { type:"language" });
    dn.__lang = UI_LANG;
    _dn = dn;
  }catch{ _dn = null; }
  return _dn;
}
function langLabel(code){
  const c = String(code||"").toLowerCase();
  if(c==="auto") return autoLabel();
  const dn = getDisplayNames();
  const base = canonical(c);
  if(dn){
    try{
      const name = dn.of(base);
      if(name) return name;
    }catch{}
  }
  return c.toUpperCase();
}

/* ===============================
   Auth grace (zıplama fix)
=============================== */
async function waitForSession(graceMs=1600){
  const t0 = Date.now();
  while(Date.now()-t0 < graceMs){
    const { data:{ session } } = await supabase.auth.getSession();
    if(session?.user) return session;
    await new Promise(r=>setTimeout(r, 120));
  }
  const { data:{ session } } = await supabase.auth.getSession();
  return session || null;
}

async function ensureLogged(){
  const session = await waitForSession(1600);
  if(!session?.user){
    location.replace(LOGIN_PATH);
    return null;
  }
  try{ await ensureAuthAndCacheUser(); }catch{}
  return session.user;
}

/* ===============================
   State
=============================== */
const SS_FROM = "italky_text_from_v1";
const SS_TO   = "italky_text_to_v1";

let fromLang = sessionStorage.getItem(SS_FROM) || "auto";
let toLang   = sessionStorage.getItem(SS_TO) || "tr";
let detectedFrom = null;

function persist(){
  sessionStorage.setItem(SS_FROM, fromLang);
  sessionStorage.setItem(SS_TO, toLang);
}

function setLangUI(){
  const fromShown = (fromLang==="auto")
    ? `${autoLabel()}${detectedFrom ? ` (${String(detectedFrom).toUpperCase()})` : ""}`
    : langLabel(fromLang);

  $("fromFlag") && ($("fromFlag").textContent = fromLang==="auto" ? (detectedFrom ? langFlag(detectedFrom) : "✨") : langFlag(fromLang));
  $("fromLangTxt") && ($("fromLangTxt").textContent = fromShown);

  $("toFlag") && ($("toFlag").textContent = langFlag(toLang));
  $("toLangTxt") && ($("toLangTxt").textContent = langLabel(toLang));
}

/* ===============================
   Sheet
=============================== */
let sheetFor = "from";
function openSheet(which){
  sheetFor = which;
  $("langSheet")?.classList.add("show");
  $("sheetTitle") && ($("sheetTitle").textContent = (which==="from") ? sourceLabel() : targetLabel());
  $("sheetQuery") && ($("sheetQuery").placeholder = searchLabel());
  if($("sheetQuery")) $("sheetQuery").value = "";
  renderSheet("");
  setTimeout(()=>{ try{ $("sheetQuery")?.focus(); }catch{} }, 0);
}
function closeSheet(){ $("langSheet")?.classList.remove("show"); }

function renderSheet(filter){
  const q = String(filter||"").toLowerCase().trim();
  const list = $("sheetList");
  if(!list) return;

  const current = (sheetFor==="from") ? fromLang : toLang;

  const items = LANGS.filter(l=>{
    if(sheetFor==="to" && l.code==="auto") return false;
    if(!q) return true;
    const label = langLabel(l.code).toLowerCase();
    const code = String(l.code).toLowerCase();
    return (`${label} ${code}`).includes(q);
  });

  list.innerHTML = items.map(l=>{
    const sel = (l.code===current) ? "selected" : "";
    return `
      <div class="sheetRow ${sel}" data-code="${l.code}">
        <div style="display:flex;align-items:center;gap:10px;min-width:0;">
          <div style="min-width:28px;text-align:center;font-size:18px;">${l.flag}</div>
          <div style="font-weight:900;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${langLabel(l.code)}</div>
        </div>
        <div style="opacity:.6;font-weight:900;color:#fff;">${String(l.code).toUpperCase()}</div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".sheetRow").forEach(row=>{
    row.addEventListener("click", ()=>{
      const code = row.getAttribute("data-code") || "en";
      if(sheetFor==="from"){
        fromLang = code;
        detectedFrom = null;
      }else{
        toLang = code;
      }
      persist();
      setLangUI();
      closeSheet();
      toast(UI_LANG==="tr" ? "Dil seçildi" : "Saved");
    });
  });
}

/* ===============================
   Helpers: detect TR quickly
=============================== */
function detectLightTR(text){
  const tt = String(text||"").toLowerCase();
  if(/[çğıöşü]/.test(tt)) return "tr";
  const trHints = [" ve ", " bir ", " için ", " değil ", " merhaba", " selam", " nasılsın", " teşekkür"];
  for(const h of trHints) if(tt.includes(h)) return "tr";
  return "en";
}

function applyAutoTargetRule(detected){
  const d = String(detected||"").toLowerCase().trim();
  if(!d) return;
  detectedFrom = d;
  // auto kuralı: TR -> EN; diğer -> TR
  toLang = (d==="tr") ? "en" : "tr";
  persist();
  setLangUI();
}

/* ===============================
   Native TTS + Web fallback
=============================== */
function speak(text, langCode){
  const t = String(text||"").trim();
  if(!t) return;

  if(window.NativeTTS && typeof window.NativeTTS.speak === "function"){
    try{ window.NativeTTS.stop?.(); }catch{}
    try{ window.NativeTTS.speak(t, String(langCode||"en")); return; }catch{}
  }

  if(!("speechSynthesis" in window)) return;
  try{
    const u = new SpeechSynthesisUtterance(t);
    u.lang = bcp(langCode);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }catch{}
}

/* ===============================
   STT
=============================== */
let sttBusy = false;
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

function startSTT(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ toast(UI_LANG==="tr" ? "STT yok" : "No STT"); return; }
  if(sttBusy) return;

  const micBtn = $("micIn");
  const listenCode = (fromLang==="auto") ? "tr" : fromLang;
  const rec = buildRecognizer(listenCode);
  if(!rec){ toast(UI_LANG==="tr" ? "Mic açılamadı" : "Mic failed"); return; }

  sttBusy = true;
  micBtn?.classList.add("listening");

  rec.onresult = async (e)=>{
    const tr = e.results?.[0]?.[0]?.transcript || "";
    const txt = String(tr||"").trim();
    if(!txt) return;

    $("inText") && ($("inText").value = txt);

    if(fromLang==="auto"){
      applyAutoTargetRule(detectLightTR(txt));
    }

    await doTranslate(true);
  };
  rec.onend = ()=>{
    micBtn?.classList.remove("listening");
    sttBusy = false;
  };
  rec.onerror = ()=>{
    micBtn?.classList.remove("listening");
    sttBusy = false;
  };

  try{ rec.start(); }catch{
    micBtn?.classList.remove("listening");
    sttBusy = false;
  }
}

/* ===============================
   Translate (apiPOST) + AUTO fix
   - from=auto iken source göndermiyoruz
=============================== */
async function translateViaApi(text, source, target){
  const body = { text, target, to_lang: target };

  // ✅ AUTO hatası fix: source=auto göndermiyoruz
  if(source && source !== "auto"){
    body.source = source;
    body.from_lang = source;
  }

  const data = await apiPOST("/api/translate", body, { timeoutMs: 20000 });

  const out = String(data?.translated || data?.translation || data?.text || "").trim();
  const det = String(data?.detected || data?.source_lang || "").trim().toLowerCase();

  return { out: out || "", detected: det || null };
}

async function doTranslate(silent=false){
  const text = String($("inText")?.value || "").trim();
  if(!text){
    if(!silent) toast(UI_LANG==="tr" ? "Metin yaz" : "Type text");
    return;
  }

  $("outText") && ($("outText").textContent = (UI_LANG==="tr" ? "Çevriliyor…" : "Translating…"));

  const src = (fromLang==="auto") ? "auto" : fromLang;

  try{
    const { out, detected } = await translateViaApi(text, src, toLang);

    if(fromLang==="auto"){
      applyAutoTargetRule(detected || detectLightTR(text));
    }

    $("outText") && ($("outText").textContent = out || "—");
  }catch(e){
    $("outText") && ($("outText").textContent = "—");
    if(!silent) toast(UI_LANG==="tr" ? "Çeviri alınamadı" : "Translate failed");
  }
}

function swapLang(){
  if(fromLang==="auto"){
    toast(UI_LANG==="tr" ? "Algıla açıkken değiştirilemez" : "Can't swap");
    return;
  }
  const a = fromLang; fromLang = toLang; toLang = a;
  detectedFrom = null;
  persist();
  setLangUI();
}

/* ===============================
   Boot
=============================== */
document.addEventListener("DOMContentLoaded", async ()=>{
  const u = await ensureLogged();
  if(!u) return;

  // i18n safe
  try{ applyI18n(document); }catch{}
  UI_LANG = getSystemUILang();

  setLangUI();

  $("fromLangBtn")?.addEventListener("click", ()=> openSheet("from"));
  $("toLangBtn")?.addEventListener("click", ()=> openSheet("to"));
  $("swapBtn")?.addEventListener("click", swapLang);

  $("sheetClose")?.addEventListener("click", closeSheet);
  $("langSheet")?.addEventListener("click", (e)=>{ if(e.target === $("langSheet")) closeSheet(); });
  $("sheetQuery")?.addEventListener("input", ()=> renderSheet($("sheetQuery")?.value));

  $("clearBtn")?.addEventListener("click", ()=>{
    $("inText") && ($("inText").value = "");
    $("outText") && ($("outText").textContent = "—");
    detectedFrom = null;
    persist();
    setLangUI();
  });

  $("translateBtn")?.addEventListener("click", ()=> doTranslate(false));

  $("micIn")?.addEventListener("click", startSTT);

  $("speakIn")?.addEventListener("click", ()=>{
    const txt = String($("inText")?.value||"").trim();
    if(!txt) return toast(UI_LANG==="tr" ? "Metin yok" : "No text");
    const lang = (fromLang==="auto") ? (detectedFrom || detectLightTR(txt)) : fromLang;
    speak(txt, lang);
  });

  $("speakOut")?.addEventListener("click", ()=>{
    const txt = String($("outText")?.textContent||"").trim();
    if(!txt || txt==="—") return toast(UI_LANG==="tr" ? "Çeviri yok" : "No output");
    speak(txt, toLang);
  });
});
