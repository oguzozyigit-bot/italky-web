// FILE: italky-web/js/facetoface_page.js
import { BASE_DOMAIN } from "/js/config.js";
import { getSiteLang } from "/js/i18n.js";

const $ = (id)=>document.getElementById(id);
function base(){ return String(BASE_DOMAIN||"").replace(/\/+$/,""); }

/* ===============================
   SYSTEM LANGUAGE (profile/i18n)
   =============================== */
function getSystemUILang(){
  // i18n varsa onu kullan
  try{
    const l = String(getSiteLang?.() || "").toLowerCase().trim();
    if(l) return l;
  }catch{}

  // fallback (i18n key)
  try{
    const l2 = String(localStorage.getItem("italky_site_lang_v1") || "").toLowerCase().trim();
    if(l2) return l2;
  }catch{}

  return "tr";
}
let UI_LANG = getSystemUILang(); // tr|en|de|it|fr expected
const UI_FALLBACKS = (lang)=>{
  // boş kalmasın diye sırayla fallback
  const x = String(lang||"tr").toLowerCase();
  // hedef: önce seçili, sonra en, sonra tr
  const set = [x, "en", "tr"];
  return Array.from(new Set(set));
};

/* ===============================
   LANG LIST (wide)
   label: {tr,en,de,it,fr}  (some entries might have only tr/en; fallback handles)
   =============================== */
const LANGS = [
  // Core
  { code:"tr", flag:"🇹🇷", bcp:"tr-TR", label:{ tr:"Türkçe", en:"Turkish", de:"Türkisch", it:"Turco", fr:"Turc" } },
  { code:"en", flag:"🇬🇧", bcp:"en-US", label:{ tr:"İngilizce", en:"English", de:"Englisch", it:"Inglese", fr:"Anglais" } },
  { code:"en-gb", flag:"🇬🇧", bcp:"en-GB", label:{ tr:"İngilizce (UK)", en:"English (UK)", de:"Englisch (UK)", it:"Inglese (UK)", fr:"Anglais (UK)" } },

  { code:"de", flag:"🇩🇪", bcp:"de-DE", label:{ tr:"Almanca", en:"German", de:"Deutsch", it:"Tedesco", fr:"Allemand" } },
  { code:"fr", flag:"🇫🇷", bcp:"fr-FR", label:{ tr:"Fransızca", en:"French", de:"Französisch", it:"Francese", fr:"Français" } },
  { code:"it", flag:"🇮🇹", bcp:"it-IT", label:{ tr:"İtalyanca", en:"Italian", de:"Italienisch", it:"Italiano", fr:"Italien" } },
  { code:"es", flag:"🇪🇸", bcp:"es-ES", label:{ tr:"İspanyolca", en:"Spanish", de:"Spanisch", it:"Spagnolo", fr:"Espagnol" } },
  { code:"pt", flag:"🇵🇹", bcp:"pt-PT", label:{ tr:"Portekizce", en:"Portuguese", de:"Portugiesisch", it:"Portoghese", fr:"Portugais" } },
  { code:"pt-br", flag:"🇧🇷", bcp:"pt-BR", label:{ tr:"Portekizce (Brezilya)", en:"Portuguese (Brazil)", de:"Portugiesisch (Brasilien)", it:"Portoghese (Brasile)", fr:"Portugais (Brésil)" } },

  // Western / Nordic
  { code:"nl", flag:"🇳🇱", bcp:"nl-NL", label:{ tr:"Felemenkçe", en:"Dutch", de:"Niederländisch", it:"Olandese", fr:"Néerlandais" } },
  { code:"sv", flag:"🇸🇪", bcp:"sv-SE", label:{ tr:"İsveççe", en:"Swedish", de:"Schwedisch", it:"Svedese", fr:"Suédois" } },
  { code:"no", flag:"🇳🇴", bcp:"nb-NO", label:{ tr:"Norveççe", en:"Norwegian (Bokmål)", de:"Norwegisch (Bokmål)", it:"Norvegese (Bokmål)", fr:"Norvégien (Bokmål)" } },
  { code:"da", flag:"🇩🇰", bcp:"da-DK", label:{ tr:"Danca", en:"Danish", de:"Dänisch", it:"Danese", fr:"Danois" } },
  { code:"fi", flag:"🇫🇮", bcp:"fi-FI", label:{ tr:"Fince", en:"Finnish", de:"Finnisch", it:"Finlandese", fr:"Finnois" } },
  { code:"is", flag:"🇮🇸", bcp:"is-IS", label:{ tr:"İzlandaca", en:"Icelandic", de:"Isländisch", it:"Islandese", fr:"Islandais" } },

  // Central/Eastern Europe
  { code:"pl", flag:"🇵🇱", bcp:"pl-PL", label:{ tr:"Lehçe", en:"Polish", de:"Polnisch", it:"Polacco", fr:"Polonais" } },
  { code:"cs", flag:"🇨🇿", bcp:"cs-CZ", label:{ tr:"Çekçe", en:"Czech", de:"Tschechisch", it:"Ceco", fr:"Tchèque" } },
  { code:"sk", flag:"🇸🇰", bcp:"sk-SK", label:{ tr:"Slovakça", en:"Slovak", de:"Slowakisch", it:"Slovacco", fr:"Slovaque" } },
  { code:"hu", flag:"🇭🇺", bcp:"hu-HU", label:{ tr:"Macarca", en:"Hungarian", de:"Ungarisch", it:"Ungherese", fr:"Hongrois" } },
  { code:"ro", flag:"🇷🇴", bcp:"ro-RO", label:{ tr:"Romence", en:"Romanian", de:"Rumänisch", it:"Rumeno", fr:"Roumain" } },
  { code:"bg", flag:"🇧🇬", bcp:"bg-BG", label:{ tr:"Bulgarca", en:"Bulgarian", de:"Bulgarisch", it:"Bulgaro", fr:"Bulgare" } },
  { code:"el", flag:"🇬🇷", bcp:"el-GR", label:{ tr:"Yunanca", en:"Greek", de:"Griechisch", it:"Greco", fr:"Grec" } },
  { code:"uk", flag:"🇺🇦", bcp:"uk-UA", label:{ tr:"Ukraynaca", en:"Ukrainian", de:"Ukrainisch", it:"Ucraino", fr:"Ukrainien" } },
  { code:"ru", flag:"🇷🇺", bcp:"ru-RU", label:{ tr:"Rusça", en:"Russian", de:"Russisch", it:"Russo", fr:"Russe" } },
  { code:"sr", flag:"🇷🇸", bcp:"sr-RS", label:{ tr:"Sırpça", en:"Serbian", de:"Serbisch", it:"Serbo", fr:"Serbe" } },
  { code:"hr", flag:"🇭🇷", bcp:"hr-HR", label:{ tr:"Hırvatça", en:"Croatian", de:"Kroatisch", it:"Croato", fr:"Croate" } },
  { code:"bs", flag:"🇧🇦", bcp:"bs-BA", label:{ tr:"Boşnakça", en:"Bosnian", de:"Bosnisch", it:"Bosniaco", fr:"Bosniaque" } },
  { code:"sq", flag:"🇦🇱", bcp:"sq-AL", label:{ tr:"Arnavutça", en:"Albanian", de:"Albanisch", it:"Albanese", fr:"Albanais" } },

  // Middle East
  { code:"ar", flag:"🇸🇦", bcp:"ar-SA", label:{ tr:"Arapça", en:"Arabic", de:"Arabisch", it:"Arabo", fr:"Arabe" } },
  { code:"he", flag:"🇮🇱", bcp:"he-IL", label:{ tr:"İbranice", en:"Hebrew", de:"Hebräisch", it:"Ebraico", fr:"Hébreu" } },
  { code:"fa", flag:"🇮🇷", bcp:"fa-IR", label:{ tr:"Farsça", en:"Persian", de:"Persisch", it:"Persiano", fr:"Persan" } },
  { code:"ur", flag:"🇵🇰", bcp:"ur-PK", label:{ tr:"Urduca", en:"Urdu", de:"Urdu", it:"Urdu", fr:"Ourdou" } },

  // South Asia
  { code:"hi", flag:"🇮🇳", bcp:"hi-IN", label:{ tr:"Hintçe", en:"Hindi", de:"Hindi", it:"Hindi", fr:"Hindi" } },
  { code:"bn", flag:"🇧🇩", bcp:"bn-BD", label:{ tr:"Bengalce", en:"Bengali", de:"Bengalisch", it:"Bengalese", fr:"Bengali" } },
  { code:"ta", flag:"🇮🇳", bcp:"ta-IN", label:{ tr:"Tamilce", en:"Tamil", de:"Tamil", it:"Tamil", fr:"Tamoul" } },
  { code:"te", flag:"🇮🇳", bcp:"te-IN", label:{ tr:"Teluguca", en:"Telugu", de:"Telugu", it:"Telugu", fr:"Télougou" } },

  // East / SE Asia
  { code:"zh", flag:"🇨🇳", bcp:"zh-CN", label:{ tr:"Çince (Basitleştirilmiş)", en:"Chinese (Simplified)", de:"Chinesisch (Vereinfacht)", it:"Cinese (Semplificato)", fr:"Chinois (Simplifié)" } },
  { code:"zh-tw", flag:"🇹🇼", bcp:"zh-TW", label:{ tr:"Çince (Geleneksel)", en:"Chinese (Traditional)", de:"Chinesisch (Traditionell)", it:"Cinese (Tradizionale)", fr:"Chinois (Traditionnel)" } },
  { code:"ja", flag:"🇯🇵", bcp:"ja-JP", label:{ tr:"Japonca", en:"Japanese", de:"Japanisch", it:"Giapponese", fr:"Japonais" } },
  { code:"ko", flag:"🇰🇷", bcp:"ko-KR", label:{ tr:"Korece", en:"Korean", de:"Koreanisch", it:"Coreano", fr:"Coréen" } },
  { code:"th", flag:"🇹🇭", bcp:"th-TH", label:{ tr:"Tayca", en:"Thai", de:"Thailändisch", it:"Tailandese", fr:"Thaï" } },
  { code:"vi", flag:"🇻🇳", bcp:"vi-VN", label:{ tr:"Vietnamca", en:"Vietnamese", de:"Vietnamesisch", it:"Vietnamita", fr:"Vietnamien" } },
  { code:"id", flag:"🇮🇩", bcp:"id-ID", label:{ tr:"Endonezce", en:"Indonesian", de:"Indonesisch", it:"Indonesiano", fr:"Indonésien" } },
  { code:"ms", flag:"🇲🇾", bcp:"ms-MY", label:{ tr:"Malayca", en:"Malay", de:"Malaiisch", it:"Malese", fr:"Malais" } },

  // Africa (some common)
  { code:"sw", flag:"🇰🇪", bcp:"sw-KE", label:{ tr:"Svahili", en:"Swahili", de:"Swahili", it:"Swahili", fr:"Swahili" } },
  { code:"am", flag:"🇪🇹", bcp:"am-ET", label:{ tr:"Amharca", en:"Amharic", de:"Amharisch", it:"Amarico", fr:"Amharique" } },
];

/* ===============================
   Language name utilities
   =============================== */
function langObj(code){ return LANGS.find(x=>x.code===code); }
function langFlag(code){ return langObj(code)?.flag || "🌐"; }
function bcp(code){ return langObj(code)?.bcp || "en-US"; }
function langLabel(code){
  const o = langObj(code);
  if(!o) return String(code||"").toUpperCase();
  const wants = UI_FALLBACKS(UI_LANG);
  for(const k of wants){
    const v = o.label?.[k];
    if(v) return v;
  }
  // fallback to any label
  const any = o.label?.en || o.label?.tr;
  return any || String(code||"").toUpperCase();
}

/* ===============================
   State
   =============================== */
let topLang = "en";
let botLang = "tr";

/* ===============================
   TTS
   =============================== */
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

/* ===============================
   Bubbles
   - speaker ONLY on translated bubble (me)
   =============================== */
function addBubble(side, kind, text, langForSpeak){
  const wrap = (side === "top") ? $("topBody") : $("botBody");
  if(!wrap) return;

  const row = document.createElement("div");
  row.className = `bubble ${kind}`;

  const txt = document.createElement("span");
  txt.className = "txt";
  txt.textContent = String(text||"").trim() || "—";
  row.appendChild(txt);

  if(kind === "me"){
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

/* ===============================
   UI helpers
   =============================== */
function setMicUI(which, on){
  const btn = (which === "top") ? $("topMic") : $("botMic");
  btn?.classList.toggle("listening", !!on);
  $("frameRoot")?.classList.toggle("listening", !!on);
}

/* ===============================
   Popovers (no search, no keyboard)
   =============================== */
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
        <div class="pop-name">${langLabel(l.code)}</div>
      </div>
      <div class="pop-code">${String(l.code).toUpperCase()}</div>
    </div>
  `).join("");

  list.querySelectorAll(".pop-item").forEach(item=>{
    item.addEventListener("click", ()=>{
      const code = item.getAttribute("data-code") || "en";

      if(side === "top"){
        topLang = code;
        const t = $("topLangTxt");
        if(t) t.textContent = `${langFlag(topLang)} ${langLabel(topLang)}`;
      }else{
        botLang = code;
        const t = $("botLangTxt");
        if(t) t.textContent = `${langFlag(botLang)} ${langLabel(botLang)}`;
      }

      stopAll();
      closeAllPop();
    });
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
}

/* ===============================
   Translate API
   =============================== */
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

/* ===============================
   STT
   =============================== */
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

    // konuşulan (them) — hoparlör yok
    addBubble(which, "them", finalText, src);

    // çeviri karşı tarafa (me) — hoparlör var
    const other = (which === "top") ? "bot" : "top";
    try{
      const translated = await translateViaApi(finalText, src, dst);
      addBubble(other, "me", translated, dst);
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

/* ===============================
   Nav + Bindings
   =============================== */
function bindNav(){
  $("homeBtn")?.addEventListener("click", ()=>{
    location.href = "/pages/home.html";
  });

  $("topBack")?.addEventListener("click", ()=>{
    stopAll();
    closeAllPop();
    if(history.length > 1) history.back();
    else location.href="/pages/home.html";
  });
}

function bindLangButtons(){
  $("topLangBtn")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); togglePop("top"); });
  $("botLangBtn")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); togglePop("bot"); });

  $("close-top")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); closeAllPop(); });
  $("close-bot")?.addEventListener("click", (e)=>{ e.preventDefault(); e.stopPropagation(); closeAllPop(); });
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

function bindOutsideClose(){
  document.addEventListener("click", (e)=>{
    const t = e.target;

    const inTop = $("pop-top")?.contains(t) || $("topLangBtn")?.contains(t);
    const inBot = $("pop-bot")?.contains(t) || $("botLangBtn")?.contains(t);
    const inClose = $("close-top")?.contains(t) || $("close-bot")?.contains(t);

    if(inTop || inBot || inClose) return;
    closeAllPop();
  }, { capture:true });
}

function updateUILangIfChanged(){
  const now = getSystemUILang();
  if(now === UI_LANG) return;
  UI_LANG = now;

  // seçili dil etiketlerini yeni UI diline göre refresh
  const t1 = $("topLangTxt");
  const t2 = $("botLangTxt");
  if(t1) t1.textContent = `${langFlag(topLang)} ${langLabel(topLang)}`;
  if(t2) t2.textContent = `${langFlag(botLang)} ${langLabel(botLang)}`;

  // popover açıksa da refreshle
  if($("pop-top")?.classList.contains("show")) renderPop("top");
  if($("pop-bot")?.classList.contains("show")) renderPop("bot");
}

document.addEventListener("DOMContentLoaded", ()=>{
  // initial labels
  if($("topLangTxt")) $("topLangTxt").textContent = `${langFlag(topLang)} ${langLabel(topLang)}`;
  if($("botLangTxt")) $("botLangTxt").textContent = `${langFlag(botLang)} ${langLabel(botLang)}`;

  bindNav();
  bindLangButtons();
  bindMicButtons();
  bindOutsideClose();

  // ✅ Profile sayfasında dil değişince bu sayfa açıkken de güncellensin
  window.addEventListener("storage", (e)=>{
    if(e.key === "italky_site_lang_v1" || e.key === "italky_lang_ping"){
      updateUILangIfChanged();
    }
  });
});
