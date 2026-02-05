// /js/text_translate_page.js
import { BASE_DOMAIN } from "/js/config.js";

const $ = (id) => document.getElementById(id);
function base(){ return String(BASE_DOMAIN||"").replace(/\/+$/,""); }

function toast(msg){
  const t = $("toast");
  if(!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(window.__to);
  window.__to = setTimeout(()=> t.classList.remove("show"), 1800);
}

/* ✅ Bayraklı dil listesi (yüz yüzedeki gibi) */
const LANGS = [
  { code:"auto", tr:"Dili Algıla", native:"Auto", flag:"🌐", tts:"" },
  { code:"tr", tr:"Türkçe", native:"Türkçe", flag:"🇹🇷", tts:"tr-TR" },
  { code:"en", tr:"İngilizce", native:"English", flag:"🇬🇧", tts:"en-US" },
  { code:"de", tr:"Almanca", native:"Deutsch", flag:"🇩🇪", tts:"de-DE" },
  { code:"fr", tr:"Fransızca", native:"Français", flag:"🇫🇷", tts:"fr-FR" },
  { code:"es", tr:"İspanyolca", native:"Español", flag:"🇪🇸", tts:"es-ES" },
  { code:"it", tr:"İtalyanca", native:"Italiano", flag:"🇮🇹", tts:"it-IT" },
  { code:"pt", tr:"Portekizce", native:"Português", flag:"🇵🇹", tts:"pt-PT" },
  { code:"ru", tr:"Rusça", native:"Русский", flag:"🇷🇺", tts:"ru-RU" },
  { code:"ar", tr:"Arapça", native:"العربية", flag:"🇸🇦", tts:"ar-SA" },
  { code:"zh", tr:"Çince", native:"中文", flag:"🇨🇳", tts:"zh-CN" },
  { code:"ja", tr:"Japonca", native:"日本語", flag:"🇯🇵", tts:"ja-JP" },
  { code:"ko", tr:"Korece", native:"한국어", flag:"🇰🇷", tts:"ko-KR" },
];

function getLang(code){
  return LANGS.find(l=>l.code===code) || { code, tr: code, native: code, flag:"🌐", tts:"en-US" };
}
function setLangUI(){
  $("fromLangTxt").textContent = getLang(fromLang).tr + (detectedFrom && fromLang==="auto" ? ` (${detectedFrom.toUpperCase()})` : "");
  $("fromFlag").textContent = fromLang==="auto" ? (detectedFrom ? getLang(detectedFrom).flag : "🌐") : getLang(fromLang).flag;

  $("toLangTxt").textContent = getLang(toLang).tr;
  $("toFlag").textContent = getLang(toLang).flag;
}

/* ✅ Sayfadan çıkana kadar kalsın: sessionStorage */
const SS_FROM = "italky_text_translate_from_v1";
const SS_TO   = "italky_text_translate_to_v1";
const SS_MANUAL_TO = "italky_text_translate_to_manual_v1";

let fromLang = sessionStorage.getItem(SS_FROM) || "auto";
let toLang   = sessionStorage.getItem(SS_TO) || "tr";
let manualTo = (sessionStorage.getItem(SS_MANUAL_TO) || "0") === "1";

// auto algılama sonrası göstereceğimiz “detected”
let detectedFrom = null;

function persist(){
  sessionStorage.setItem(SS_FROM, fromLang);
  sessionStorage.setItem(SS_TO, toLang);
  sessionStorage.setItem(SS_MANUAL_TO, manualTo ? "1" : "0");
}

/* ===== language sheet ===== */
let sheetFor = "from"; // from|to

function openSheet(which){
  sheetFor = which;
  $("langSheet")?.classList.add("show");
  $("sheetTitle").textContent = which === "from" ? "Kaynak Dil" : "Hedef Dil";
  $("sheetQuery").value = "";
  renderSheet("");
  setTimeout(()=>{ try{ $("sheetQuery")?.focus(); }catch{} }, 0);
}
function closeSheet(){ $("langSheet")?.classList.remove("show"); }

function renderSheet(filter){
  const q = String(filter||"").toLowerCase().trim();
  const list = $("sheetList");
  if(!list) return;

  const current = sheetFor === "from" ? fromLang : toLang;

  const items = LANGS.filter(l=>{
    if(sheetFor === "to" && l.code === "auto") return false;
    if(!q) return true;
    const hay = `${l.tr} ${l.native} ${l.code}`.toLowerCase();
    return hay.includes(q);
  });

  list.innerHTML = items.map(l=>{
    const sel = (l.code === current) ? "selected" : "";
    return `
      <div class="sheetRow ${sel}" data-code="${l.code}">
        <div class="left">
          <div class="code" style="min-width:28px; text-align:center;">${l.flag}</div>
          <div class="name">${l.tr}</div>
        </div>
        <div class="code">${l.code.toUpperCase()}</div>
      </div>
    `;
  }).join("");

  list.querySelectorAll(".sheetRow").forEach(row=>{
    row.addEventListener("click", ()=>{
      const code = row.getAttribute("data-code") || "en";
      if(sheetFor === "from"){
        fromLang = code;
        detectedFrom = null; // manual değişince algılananı sıfırla
        // kaynak dili seçilince (auto hariç) hedefi zorlamıyoruz
      }else{
        toLang = code;
        manualTo = true; // ✅ kullanıcı hedefi değiştirdiyse sayfa boyunca kilit
      }
      persist();
      setLangUI();
      closeSheet();
      toast("Dil seçildi");
    });
  });
}

/* ===== API translate ===== */
async function translateViaApi(text, source, target){
  const b = base();
  if(!b) return { out:"", detected:null };

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

  // detected language (backend farklı isimlerle dönebilir)
  const det = String(
    data?.detected || data?.detected_lang || data?.detected_language || data?.source_lang || data?.source || ""
  ).trim().toLowerCase();

  return { out: out || "", detected: det || null };
}

/* ===== Auto target rule =====
   - Algıladığı dil Türkçe ise hedef otomatik İngilizce
   - Algıladığı dil Türkçe değilse hedef otomatik Türkçe
   - Kullanıcı hedefi değiştirirse sayfa boyunca sabit (manualTo=true)
*/
function applyAutoTargetRule(detected){
  if(manualTo) return;

  const d = String(detected||"").toLowerCase().trim();
  if(!d) return;

  detectedFrom = d;

  if(d === "tr"){
    toLang = "en";
  }else{
    toLang = "tr";
  }
  persist();
  setLangUI();
}

/* ===== counts ===== */
function updateCounts(){
  const inV = String($("inText").value || "");
  $("countIn").textContent = String(inV.length);

  const outV = String($("outText").textContent || "");
  $("countOut").textContent = String(outV === "—" ? 0 : outV.length);
}

/* ===== TTS (hoparlör) ===== */
function speak(text, langCode){
  const t = String(text||"").trim();
  if(!t) return;
  if(!("speechSynthesis" in window)) { toast("Ses desteği yok"); return; }

  try{
    const u = new SpeechSynthesisUtterance(t);
    const info = getLang(langCode);
    u.lang = info.tts || "en-US";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }catch{
    toast("Okuma başlatılamadı");
  }
}

async function doTranslate(){
  const text = String($("inText").value || "").trim();
  if(!text){
    toast("Metin yaz");
    return;
  }

  $("outText").textContent = "Çevriliyor…";
  updateCounts();

  // source empty -> backend auto algılama
  const src = (fromLang === "auto") ? "" : fromLang;

  try{
    const { out, detected } = await translateViaApi(text, src, toLang);

    // ✅ auto ise, algılananı al ve hedef kuralını uygula
    if(fromLang === "auto"){
      applyAutoTargetRule(detected || detectLight(text));
    }

    $("outText").textContent = out || "—";
  }catch{
    $("outText").textContent = "—";
    toast("Çeviri alınamadı");
  }

  setLangUI();
  updateCounts();
}

/* Hafif algılama (backend detected dönmezse yedek) */
function detectLight(text){
  const t = String(text||"").toLowerCase();
  // Türkçe karakterler varsa büyük ihtimal tr
  if(/[çğıöşü]/.test(t)) return "tr";
  // basit kelime ipuçları
  const trHints = [" ve ", " bir ", " için ", " değil ", " merhaba", " selam", " nasılsın", " teşekkür"];
  let score = 0;
  for(const h of trHints) if(t.includes(h)) score++;
  if(score >= 1) return "tr";
  return "en"; // default
}

function swapLang(){
  if(fromLang === "auto"){
    toast("Kaynak dil 'Algıla' iken değiştirilemez");
    return;
  }
  const a = fromLang; fromLang = toLang; toLang = a;
  // swap -> artık manuel kabul edelim (kullanıcı bilinçli değiştiriyor)
  manualTo = true;
  detectedFrom = null;
  persist();
  setLangUI();
  toast("Diller değişti");
}

document.addEventListener("DOMContentLoaded", ()=>{
  $("backBtn")?.addEventListener("click", ()=>{
    if(history.length>1) history.back();
    else location.href = "/pages/home.html";
  });
  $("logoHome")?.addEventListener("click", ()=> location.href="/pages/home.html");

  // ilk UI
  setLangUI();
  updateCounts();

  $("fromLangBtn")?.addEventListener("click", ()=> openSheet("from"));
  $("toLangBtn")?.addEventListener("click", ()=> openSheet("to"));
  $("swapBtn")?.addEventListener("click", swapLang);

  $("sheetClose")?.addEventListener("click", closeSheet);
  $("langSheet")?.addEventListener("click", (e)=>{ if(e.target === $("langSheet")) closeSheet(); });
  $("sheetQuery")?.addEventListener("input", ()=> renderSheet($("sheetQuery").value));

  $("clearBtn")?.addEventListener("click", ()=>{
    $("inText").value = "";
    $("outText").textContent = "—";
    // temizleyince: auto hedef kilidi bozulmasın, ama detected görünümü sıfırlansın
    detectedFrom = null;
    setLangUI();
    updateCounts();
  });

  $("translateBtn")?.addEventListener("click", doTranslate);
  $("inText")?.addEventListener("input", updateCounts);

  // hoparlörler
  $("speakIn")?.addEventListener("click", ()=>{
    const txt = String($("inText").value||"").trim();
    if(!txt) return toast("Metin yok");
    const lang = (fromLang === "auto") ? (detectedFrom || detectLight(txt)) : fromLang;
    speak(txt, lang);
  });

  $("speakOut")?.addEventListener("click", ()=>{
    const txt = String($("outText").textContent||"").trim();
    if(!txt || txt==="—") return toast("Çeviri yok");
    speak(txt, toLang);
  });
});
