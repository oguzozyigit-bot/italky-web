// FILE: /js/site_lang.js

const SITE_LANG_KEY = "italky_site_lang_v2";
const IP_LANG_ENDPOINT = "https://ipapi.co/json/";

/* ======================================================
   FULL LANGUAGE LIST (All supported site languages)
====================================================== */

const LANGS = [
  { code:"tr", flag:"🇹🇷" },
  { code:"en", flag:"🇬🇧" },
  { code:"de", flag:"🇩🇪" },
  { code:"fr", flag:"🇫🇷" },
  { code:"it", flag:"🇮🇹" },
  { code:"es", flag:"🇪🇸" },
  { code:"pt", flag:"🇵🇹" },
  { code:"ru", flag:"🇷🇺" },
  { code:"ar", flag:"🇸🇦" },
  { code:"fa", flag:"🇮🇷" },
  { code:"hi", flag:"🇮🇳" },
  { code:"zh", flag:"🇨🇳" },
  { code:"ja", flag:"🇯🇵" },
  { code:"ko", flag:"🇰🇷" },
  { code:"id", flag:"🇮🇩" },
  { code:"vi", flag:"🇻🇳" },
  { code:"th", flag:"🇹🇭" },
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
  { code:"uk", flag:"🇺🇦" },
  { code:"az", flag:"🇦🇿" },
  { code:"ka", flag:"🇬🇪" },
  { code:"hy", flag:"🇦🇲" },
  { code:"he", flag:"🇮🇱" },
  { code:"ur", flag:"🇵🇰" },
  { code:"bn", flag:"🇧🇩" }
];

/* ======================================================
   HELPERS
====================================================== */

function baseCode(code){
  return String(code || "").toLowerCase().split("-")[0];
}

function findLang(code){
  const b = baseCode(code);
  return LANGS.find(l => l.code === b) || LANGS[1]; // fallback en
}

/* ======================================================
   CORE GET / SET
====================================================== */

export function getSiteLang(){
  const saved = localStorage.getItem(SITE_LANG_KEY);
  if(saved && findLang(saved)) return findLang(saved).code;
  return "en";
}

export function setSiteLang(code){
  const picked = findLang(code);
  localStorage.setItem(SITE_LANG_KEY, picked.code);
  window.dispatchEvent(new CustomEvent("italky:lang-changed", {
    detail: { lang: picked.code }
  }));
}

/* ======================================================
   AUTO DETECT (IP + Browser)
====================================================== */

export async function detectSiteLang(){
  // 1) Saved
  const saved = localStorage.getItem(SITE_LANG_KEY);
  if(saved && findLang(saved)) return saved;

  // 2) IP based
  try{
    const r = await fetch(IP_LANG_ENDPOINT, { cache:"no-store" });
    if(r.ok){
      const j = await r.json();
      const ipLang = baseCode(j?.languages || j?.language || "");
      if(findLang(ipLang)) return ipLang;
    }
  }catch{}

  // 3) Browser
  const nav = baseCode(navigator.language);
  if(findLang(nav)) return nav;

  return "en";
}

/* ======================================================
   MOUNT LANGUAGE PICKER
====================================================== */

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

  function applyLabel(){
    const lang = getSiteLang();
    const picked = findLang(lang);
    if(label){
      label.textContent = `${picked.flag} ${picked.code.toUpperCase()}`;
    }
  }

  function render(filter=""){
    const q = String(filter).toLowerCase();
    list.innerHTML = LANGS
      .filter(l => l.code.includes(q))
      .map(l => `
        <div class="sheet-row" data-code="${l.code}">
          <span class="sheet-flag">${l.flag}</span>
          <span class="sheet-name">${l.code.toUpperCase()}</span>
        </div>
      `).join("");

    list.querySelectorAll(".sheet-row").forEach(row=>{
      row.addEventListener("click", ()=>{
        const code = row.getAttribute("data-code");
        setSiteLang(code);
        applyLabel();
        sheet.classList.remove("show");
      });
    });
  }

  btn.addEventListener("click", ()=>{
    render(query?.value || "");
    sheet.classList.add("show");
    setTimeout(()=> query?.focus(), 50);
  });

  close?.addEventListener("click", ()=> sheet.classList.remove("show"));
  sheet.addEventListener("click", e=>{
    if(e.target === sheet) sheet.classList.remove("show");
  });

  query?.addEventListener("input", ()=> render(query.value));

  applyLabel();

  window.addEventListener("italky:lang-changed", applyLabel);
}
