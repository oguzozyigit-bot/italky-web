// FILE: /js/site_lang.js
// 2050 Site Language Engine (fast + flags + IP detect + manual picker)

const SITE_LANG_KEY = "italky_site_lang_v2";
const IP_LANG_ENDPOINT = "https://ipapi.co/json/"; // lightweight geo/lang hint

// Full-ish language list (extend anytime)
export const LANGS = [
  { code:"en", flag:"🇬🇧" },
  { code:"tr", flag:"🇹🇷" },
  { code:"de", flag:"🇩🇪" },
  { code:"fr", flag:"🇫🇷" },
  { code:"it", flag:"🇮🇹" },
  { code:"es", flag:"🇪🇸" },
  { code:"pt", flag:"🇵🇹" },
  { code:"ru", flag:"🇷🇺" },
  { code:"uk", flag:"🇺🇦" },
  { code:"nl", flag:"🇳🇱" },
  { code:"sv", flag:"🇸🇪" },
  { code:"no", flag:"🇳🇴" },
  { code:"da", flag:"🇩🇰" },
  { code:"fi", flag:"🇫🇮" },
  { code:"pl", flag:"🇵🇱" },
  { code:"cs", flag:"🇨🇿" },
  { code:"sk", flag:"🇸🇰" },
  { code:"hu", flag:"🇭🇺" },
  { code:"ro", flag:"🇷🇴" },
  { code:"bg", flag:"🇧🇬" },
  { code:"el", flag:"🇬🇷" },
  { code:"az", flag:"🇦🇿" },
  { code:"ka", flag:"🇬🇪" },
  { code:"hy", flag:"🇦🇲" },
  { code:"ar", flag:"🇸🇦" },
  { code:"he", flag:"🇮🇱" },
  { code:"fa", flag:"🇮🇷" },
  { code:"ur", flag:"🇵🇰" },
  { code:"hi", flag:"🇮🇳" },
  { code:"bn", flag:"🇧🇩" },
  { code:"id", flag:"🇮🇩" },
  { code:"ms", flag:"🇲🇾" },
  { code:"vi", flag:"🇻🇳" },
  { code:"th", flag:"🇹🇭" },
  { code:"zh", flag:"🇨🇳" },
  { code:"ja", flag:"🇯🇵" },
  { code:"ko", flag:"🇰🇷" }
];

function baseCode(code){
  return String(code||"").toLowerCase().split("-")[0];
}
function findLang(code){
  const c = String(code||"").trim();
  if(!c) return null;

  const exact = LANGS.find(x => String(x.code).toLowerCase() === c.toLowerCase());
  if(exact) return exact;

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
  return "en";
}

export function setSiteLang(code){
  const picked = findLang(code);
  if(!picked) return;
  try{ localStorage.setItem(SITE_LANG_KEY, picked.code); }catch{}
  try{ window.dispatchEvent(new CustomEvent("italky:lang-changed", { detail:{ lang:picked.code } })); }catch{}
}

async function fetchJsonWithTimeout(url, ms=1200){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), ms);
  try{
    const r = await fetch(url, { cache:"no-store", signal: ctrl.signal });
    if(!r.ok) return null;
    return await r.json();
  }catch{
    return null;
  }finally{
    clearTimeout(t);
  }
}

export async function detectSiteLang(){
  // 1) saved
  try{
    const saved = localStorage.getItem(SITE_LANG_KEY);
    if(saved && findLang(saved)) return findLang(saved).code;
  }catch{}

  // 2) IP hint (fast)
  const j = await fetchJsonWithTimeout(IP_LANG_ENDPOINT, 1400);
  if(j){
    const raw = String(j?.languages || j?.language || "").split(",")[0].trim(); // ipapi often: "en,fr"
    const picked = findLang(raw);
    if(picked) return picked.code;

    // country fallback
    const cc = String(j?.country_code || "").toLowerCase().trim();
    if(cc){
      const map = { tr:"tr", de:"de", fr:"fr", it:"it", es:"es", pt:"pt", ru:"ru", nl:"nl", se:"sv", no:"no", dk:"da", fi:"fi", pl:"pl", cz:"cs", sk:"sk", hu:"hu", ro:"ro", bg:"bg", gr:"el", ua:"uk", sa:"ar", ir:"fa", pk:"ur", in:"hi", bd:"bn", cn:"zh", jp:"ja", kr:"ko", id:"id", vn:"vi", th:"th", il:"he", az:"az", ge:"ka", am:"hy" };
      const guess = map[cc];
      if(guess && findLang(guess)) return guess;
    }
  }

  // 3) navigator
  try{
    const nav = navigator.language || "en";
    const picked = findLang(nav);
    if(picked) return picked.code;
  }catch{}

  return "en";
}

/* UI label helper: “🇹🇷 TR” */
function setLangLabel(labelId, code){
  const el = document.getElementById(labelId);
  if(!el) return;
  const picked = findLang(code) || findLang("en");
  el.textContent = `${picked?.flag || "🌐"} ${String(picked?.code || "EN").toUpperCase()}`;
}

/* Mount picker (sheet) */
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

  if(!btn || !sheet || !list) return;

  const render = (filter="")=>{
    const ui = getSiteLang();
    const dn = getDN(ui);
    const q = String(filter||"").toLowerCase().trim();

    const items = LANGS.filter(x=>{
      const code = String(x.code).toLowerCase();
      const name = dn ? String(dn.of(baseCode(x.code))||"") : "";
      const hay = (name + " " + code).toLowerCase();
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
        setLangLabel(labelId, code);
        sheet.classList.remove("show");
      });
    });
  };

  const open = ()=>{
    render(query?.value || "");
    sheet.classList.add("show");
    setTimeout(()=>{ try{ query?.focus(); }catch{} }, 50);
  };
  const closeIt = ()=> sheet.classList.remove("show");

  btn.addEventListener("click", open);
  close?.addEventListener("click", closeIt);
  sheet.addEventListener("click", (e)=>{ if(e.target === sheet) closeIt(); });
  query?.addEventListener("input", ()=> render(query.value));

  // initial label
  setLangLabel(labelId, getSiteLang());

  // external changes
  window.addEventListener("italky:lang-changed", (e)=>{
    const lang = e?.detail?.lang || getSiteLang();
    setLangLabel(labelId, lang);
  });
}
