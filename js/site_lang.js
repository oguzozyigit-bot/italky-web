// FILE: /js/site_lang.js
const SITE_LANG_KEY = "italky_site_lang_v2";

// “Ülke/IP’den dil” için hafif servis.
// İstersen sonra kendi backend’ine alırız.
const IP_LANG_ENDPOINT = "https://ipapi.co/json/";

const LANGS = [
  { code:"tr", flag:"🇹🇷" }, { code:"en", flag:"🇬🇧" }, { code:"de", flag:"🇩🇪" }, { code:"fr", flag:"🇫🇷" },
  { code:"it", flag:"🇮🇹" }, { code:"es", flag:"🇪🇸" }, { code:"pt", flag:"🇵🇹" }, { code:"pt-BR", flag:"🇧🇷" },
  { code:"nl", flag:"🇳🇱" }, { code:"sv", flag:"🇸🇪" }, { code:"nb", flag:"🇳🇴" }, { code:"da", flag:"🇩🇰" },
  { code:"fi", flag:"🇫🇮" }, { code:"pl", flag:"🇵🇱" }, { code:"cs", flag:"🇨🇿" }, { code:"sk", flag:"🇸🇰" },
  { code:"hu", flag:"🇭🇺" }, { code:"ro", flag:"🇷🇴" }, { code:"bg", flag:"🇧🇬" }, { code:"el", flag:"🇬🇷" },
  { code:"uk", flag:"🇺🇦" }, { code:"ru", flag:"🇷🇺" }, { code:"az", flag:"🇦🇿" }, { code:"ka", flag:"🇬🇪" },
  { code:"hy", flag:"🇦🇲" }, { code:"ar", flag:"🇸🇦" }, { code:"he", flag:"🇮🇱" }, { code:"fa", flag:"🇮🇷" },
  { code:"ur", flag:"🇵🇰" }, { code:"hi", flag:"🇮🇳" }, { code:"bn", flag:"🇧🇩" }, { code:"id", flag:"🇮🇩" },
  { code:"ms", flag:"🇲🇾" }, { code:"vi", flag:"🇻🇳" }, { code:"th", flag:"🇹🇭" },
  { code:"zh", flag:"🇨🇳" }, { code:"zh-TW", flag:"🇹🇼" }, { code:"ja", flag:"🇯🇵" }, { code:"ko", flag:"🇰🇷" },
  { code:"sw", flag:"🇰🇪" }, { code:"am", flag:"🇪🇹" }
];

function baseCode(code){
  return String(code||"").toLowerCase().split("-")[0];
}

function findLang(code){
  const c = String(code||"").trim();
  if(!c) return null;
  // exact
  const exact = LANGS.find(x => String(x.code).toLowerCase() === c.toLowerCase());
  if(exact) return exact;
  // base match
  const b = baseCode(c);
  return LANGS.find(x => baseCode(x.code) === b) || null;
}

function getDN(lang){
  try{ return new Intl.DisplayNames([lang], { type:"language" }); }catch{ return null; }
}

export function getSiteLang(){
  try{
    const saved = localStorage.getItem(SITE_LANG_KEY);
    if(saved && findLang(saved)) return findLang(saved).code;
  }catch{}
  // fallback
  return "en";
}

export async function detectSiteLang(){
  // 1) saved
  try{
    const saved = localStorage.getItem(SITE_LANG_KEY);
    if(saved && findLang(saved)) return findLang(saved).code;
  }catch{}

  // 2) IP
  try{
    const r = await fetch(IP_LANG_ENDPOINT, { cache:"no-store" });
    if(r.ok){
      const j = await r.json();
      const lang = String(j?.languages || j?.language || "").split(",")[0].trim(); // ipapi: "en,fr"
      const picked = findLang(lang);
      if(picked) return picked.code;
    }
  }catch{}

  // 3) navigator
  try{
    const nav = navigator.language || "en";
    const picked = findLang(nav);
    if(picked) return picked.code;
  }catch{}
  return "en";
}

export function setSiteLang(code){
  const picked = findLang(code);
  if(!picked) return;
  try{ localStorage.setItem(SITE_LANG_KEY, picked.code); }catch{}
  // sayfa içi “UI metni” güncellemesi istersen burada tetiklenir
  try{ window.dispatchEvent(new CustomEvent("italky:lang-changed", { detail: { lang: picked.code } })); }catch{}
}

export function mountLangPicker({
  btnId="langBtn",
  sheetId="langSheet",
  listId="langSheetList",
  queryId="langSheetQuery",
  closeId="langSheetClose",
  labelId="langLabel"
} = {}){
  const btn = document.getElementById(btnId);
  const sheet = document.getElementById(sheetId);
  const list = document.getElementById(listId);
  const query = document.getElementById(queryId);
  const close = document.getElementById(closeId);
  const label = document.getElementById(labelId);

  if(!btn || !sheet || !list) return;

  const render = (filter="")=>{
    const ui = getSiteLang();
    const dn = getDN(ui);
    const q = String(filter||"").toLowerCase().trim();

    const items = LANGS.filter(x=>{
      const c = String(x.code).toLowerCase();
      const name = dn ? String(dn.of(baseCode(x.code))||"") : "";
      const hay = (name + " " + c).toLowerCase();
      return !q || hay.includes(q);
    });

    list.innerHTML = items.map(x=>{
      const code = x.code;
      const name = dn ? (dn.of(baseCode(code)) || code) : code;
      return `
        <div class="sheet-row" data-code="${code}">
          <div class="sheet-left">
            <div class="sheet-flag">${x.flag}</div>
            <div class="sheet-name">${name}</div>
          </div>
          <div class="sheet-code">${code}</div>
        </div>
      `;
    }).join("");

    list.querySelectorAll(".sheet-row").forEach(row=>{
      row.addEventListener("click", ()=>{
        const code = row.getAttribute("data-code") || "en";
        setSiteLang(code);
        applyLangLabel();
        sheet.classList.remove("show");
      });
    });
  };

  const applyLangLabel = ()=>{
    const lang = getSiteLang();
    const picked = findLang(lang) || findLang("en");
    if(label && picked){
      // label: “🇹🇷 TR” gibi
      label.textContent = `${picked.flag} ${String(picked.code).toUpperCase()}`;
    }
  };

  btn.addEventListener("click", ()=>{
    render(query?.value || "");
    sheet.classList.add("show");
    setTimeout(()=>{ try{ query?.focus(); }catch{} }, 50);
  });

  close?.addEventListener("click", ()=> sheet.classList.remove("show"));
  sheet.addEventListener("click", (e)=>{
    if(e.target === sheet) sheet.classList.remove("show");
  });

  query?.addEventListener("input", ()=> render(query.value));

  // first label paint
  applyLangLabel();

  // when lang changes elsewhere
  window.addEventListener("italky:lang-changed", ()=>{
    applyLangLabel();
  });
}
