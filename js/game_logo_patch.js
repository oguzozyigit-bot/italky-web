// FILE: /js/game_logo_patch.js
// Ortak görünüm düzeltmeleri: logo, alt bar, hamburger menü ve jeton market.

const LOGO = "https://www.icany.ai/brand/italkyai-logo-clear.png";
const HOME = "https://italky.ai";
const SIGN = "by Ozyigit's 2026";
const RUNE = "𐰆𐰍𐰔 𐰇𐰔𐰘𐰃𐰏𐱅";

const BRAND_PATHS = new Set([
  "/pages/game_menu.html", "/pages/hangman.html", "/pages/word_cracker.html", "/pages/gap_master.html", "/pages/glitch.html", "/pages/signal_hunt.html",
  "/pages/hangman_ios.html", "/pages/word_cracker_ios.html", "/pages/gap_master_ios.html", "/pages/glitch_ios.html", "/pages/signal_hunt_ios.html",
  "/pages/level_test_hub.html", "/pages/conference.html"
]);

const TOKEN_PRODUCTS = {
  jeton_20: ["25 Jeton", "0,99 USD", "Başlangıç paketi"],
  jeton_50: ["50 Jeton", "1,49 USD", "Günlük kullanım için ideal"],
  jeton_100: ["100 Jeton", "2,29 USD", "En popüler paket"],
  jeton_500: ["500 Jeton", "9,99 USD", "Yoğun kullanım paketi"]
};

const MENU = [
  ["⌂", "Anasayfa", HOME],
  ["+", "Jeton Yükle", "/pages/jetonbuy.html"],
  ["↕", "Jeton Hareketleri", "/pages/wallet_history.html"],
  ["$", "Fiyatlandırma", "/pages/plan_select.html"],
  ["i", "Hakkımızda", "/pages/about.html"],
  ["◆", "Özellikler", "/pages/features.html"],
  ["◌", "Gizlilik", "/pages/privacy.html"],
  ["@", "İletişim", "/pages/contact.html"],
  ["♫", "Müzik Hakları", "/music-showcase/"],
  ["⇥", "Güvenli Çıkış", "logout"],
  ["×", "Hesabımı Sil", "/pages/delete-account.html"]
];

function path(){ try{return String(location.pathname||"").replace(/\/+$/,"")||"/";}catch{return "/";} }
function esc(v){ return String(v ?? "").replace(/[&<>'"]/g, s => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[s])); }
function logo(cls="italky-ui-logo"){ return `<img class="${cls}" src="${LOGO}" alt="italkyAI" data-no-translate="1">`; }

function style(){
  if(document.getElementById("italkyUnifiedPatchStyle")) return;
  const s=document.createElement("style");
  s.id="italkyUnifiedPatchStyle";
  s.textContent=`
    body.italky-ui-patched .brand-group::after,body.italky-ui-patched .menu-brand-sub,body.italky-ui-patched .brand-sub,body.italky-ui-patched .logo-subtitle,[data-italky-be-free]{display:none!important;content:none!important;visibility:hidden!important;width:0!important;height:0!important;margin:0!important;padding:0!important;overflow:hidden!important}
    .italky-ui-logo{display:block!important;width:132px!important;max-width:42vw!important;height:auto!important;max-height:58px!important;object-fit:contain!important;background:transparent!important;border:0!important;box-shadow:none!important;filter:none!important}
    body.italky-ui-patched .premium-footer,body.italky-ui-patched .site-footer,body.italky-ui-patched footer.footer,body.italky-ui-patched .italky-standard-footer{position:fixed!important;left:0!important;right:0!important;bottom:0!important;z-index:214748200!important;min-height:66px!important;height:calc(66px + env(safe-area-inset-bottom,0px))!important;padding:7px 12px calc(7px + env(safe-area-inset-bottom,0px))!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:5px!important;overflow:hidden!important;border-top:1px solid rgba(78,210,217,.24)!important;background:#06111d!important;color:#f6fbff!important;text-align:center!important;box-shadow:none!important}
    .italky-footer-links{display:flex!important;align-items:center!important;justify-content:center!important;gap:16px!important;white-space:nowrap!important}.italky-footer-links a{color:#aebdcc!important;text-decoration:none!important;font-size:11px!important;font-weight:800!important;line-height:1!important}.italky-footer-sign{display:flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;color:#91a4b8!important;font-size:10px!important;font-weight:900!important;line-height:1.15!important;white-space:nowrap!important}.italky-footer-rune{display:inline!important;color:#36d4ce!important;font-family:"Segoe UI Historic","Noto Sans Old Turkic",serif!important;font-size:10px!important;direction:rtl!important;unicode-bidi:isolate!important}
    body.italky-ui-patched .site-footer-corp,body.italky-ui-patched a[href*="audience=corporate"],body.italky-ui-patched .italky-global-footer:not(.italky-standard-footer){display:none!important}
    body.italky-smart-menu .side-menu .menu-panel{width:min(92vw,370px)!important;padding:calc(16px + env(safe-area-inset-top,0px)) 14px calc(18px + env(safe-area-inset-bottom,0px))!important;gap:12px!important;background:radial-gradient(circle at 14% 0%,rgba(53,213,208,.18),transparent 34%),linear-gradient(180deg,rgba(7,19,31,.99),rgba(4,12,22,.99))!important;border-left:1px solid rgba(53,213,208,.20)!important;box-shadow:-24px 0 70px rgba(0,0,0,.48)!important;overflow-y:auto!important}
    .italky-menu-logo-row{width:100%;min-height:54px;display:flex;align-items:center;justify-content:flex-start;padding:2px 4px 4px;cursor:pointer}.italky-menu-logo-row .italky-ui-logo{width:126px!important;max-width:62%!important;max-height:54px!important}
    .menu-user-card.italky-menu-profile{min-height:118px!important;padding:14px!important;border-radius:24px!important;display:grid!important;grid-template-columns:64px 1fr!important;align-items:center!important;gap:14px!important;background:linear-gradient(180deg,rgba(255,255,255,.075),rgba(255,255,255,.032))!important;border:1px solid rgba(53,213,208,.18)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 18px 44px rgba(0,0,0,.22)!important}
    .italky-avatar{width:64px;height:64px;border-radius:22px;overflow:hidden;border:1px solid rgba(53,213,208,.28);background:linear-gradient(135deg,rgba(53,213,208,.22),rgba(15,23,42,.92));display:grid;place-items:center;cursor:default}.italky-avatar img{width:100%;height:100%;object-fit:cover;display:block}.italky-menu-name{font-size:15px;font-weight:1000;color:#fff;line-height:1.1;margin-bottom:4px}.italky-menu-mail{font-size:12px;font-weight:900;color:#f6fbff;line-height:1.25;word-break:break-all}.italky-token-pill{margin-top:8px;display:inline-flex;align-items:center;gap:7px;min-height:30px;padding:6px 11px;border-radius:999px;background:rgba(53,213,208,.12);border:1px solid rgba(53,213,208,.28);color:#bafffb;font-size:12px;font-weight:1000;white-space:nowrap}
    .menu-nav.italky-menu-nav{display:grid!important;gap:8px!important;overflow:visible!important;padding:0!important}.italky-menu-item{width:100%;min-height:45px;border-radius:16px;display:flex;align-items:center;gap:11px;padding:0 13px;background:linear-gradient(180deg,rgba(255,255,255,.058),rgba(255,255,255,.026));border:1px solid rgba(255,255,255,.075);color:#f6fbff!important;text-decoration:none!important;text-align:left;font-size:13px;font-weight:900;line-height:1;font-family:Outfit,Manrope,Arial,sans-serif;cursor:pointer}.italky-menu-item.danger{color:#fecaca!important;border-color:rgba(248,113,113,.18)}.italky-menu-icon{width:26px;height:26px;border-radius:10px;display:grid;place-items:center;flex:0 0 auto;background:rgba(53,213,208,.11);border:1px solid rgba(53,213,208,.18);color:#84fff7;font-size:13px;font-weight:1000}.italky-menu-item.danger .italky-menu-icon{background:rgba(248,113,113,.10);border-color:rgba(248,113,113,.16);color:#fecaca}
    .italky-token-note{margin:4px 2px 0;padding:11px 12px;border-radius:18px;background:rgba(53,213,208,.08);border:1px solid rgba(53,213,208,.16);color:#b9c8d7;font-size:11px;font-weight:800;line-height:1.45;text-align:center}
    @media(max-width:700px){.italky-ui-logo{width:104px!important;max-height:50px!important}.italky-footer-links{gap:10px!important}.italky-footer-links a{font-size:9px!important}.italky-footer-sign,.italky-footer-rune{font-size:8px!important}.italky-menu-item{min-height:43px;font-size:12px}}
  `;
  document.head.appendChild(s);
}

function footerHtml(){return `<nav class="italky-footer-links"><a href="/pages/about.html">Hakkımızda</a><a href="/pages/features.html">Özellikler</a><a href="/pages/privacy.html">Gizlilik</a><a href="/pages/contact.html">İletişim</a></nav><div class="italky-footer-sign" data-no-translate="1">${SIGN}<span class="italky-footer-rune" lang="otk" dir="rtl">${RUNE}</span></div>`;}

function patchBrand(){
  if(!BRAND_PATHS.has(path())) return;
  style();document.body?.classList?.add("italky-ui-patched");
  document.querySelectorAll("#brandHome.brand-group,.menu-brandblock,.gate-logo").forEach(el=>{ if(!el.querySelector?.(".italky-ui-logo")) el.innerHTML=logo(); });
  document.querySelectorAll(".brand-link img.logo,.brand-link img.brand-logo,header .logo,header .brand-logo").forEach(img=>{img.src=LOGO;img.alt="italkyAI";});
  document.querySelectorAll(".brand-link,header a.logo-link,header a[aria-label*='Ana']").forEach(a=>{try{if(a.querySelector?.("img"))a.href=HOME;}catch{}});
  document.querySelectorAll("body *").forEach(el=>{if(el.children?.length)return;const t=String(el.textContent||"").trim().toUpperCase();if(t==="BE FREE"||t==="SPEAK · LISTEN · CREATE"){el.textContent="";el.dataset.italkyBeFree="1";}});
  let f=document.querySelector("#italkyFooter.premium-footer")||document.querySelector("footer.site-footer")||document.querySelector("footer.footer")||document.querySelector(".italky-standard-footer");
  if(!f){f=document.createElement("footer");document.body.appendChild(f);} f.classList.add("italky-standard-footer");f.dataset.noTranslate="1";if(f.dataset.std!=="1"){f.innerHTML=footerHtml();f.dataset.std="1";} try{document.documentElement.style.setProperty("--footerH",`${f.offsetHeight||66}px`);document.documentElement.style.setProperty("--foot","66px");}catch{}
}

function readStore(){for(const k of ["italky_user_cache","italky_user","user","auth_user","italky_auth_user"]){try{const v=JSON.parse(localStorage.getItem(k)||"null");if(v&&typeof v==="object")return v;}catch{}}return{};}
function fallbackAvatar(v="AI"){const n=String(v||"AI").replace(/@.*/,"").trim().slice(0,2).toUpperCase()||"AI";const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#35d5d0"/><stop offset="1" stop-color="#0f6f8f"/></linearGradient></defs><rect width="96" height="96" rx="28" fill="url(#g)"/><text x="48" y="58" text-anchor="middle" font-family="Arial" font-size="30" font-weight="900" fill="#06111d">${esc(n)}</text></svg>`;return`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;}
function closeMenu(){try{document.getElementById("sideMenu")?.classList.remove("open");document.getElementById("sideMenu")?.setAttribute("aria-hidden","true");document.body?.classList?.remove("ui-menu-open","italky-shell-menu-open");}catch{}}
async function logout(){try{await window.supabase?.auth?.signOut?.();}catch{}try{localStorage.removeItem("italky_supabase_session_backup");localStorage.removeItem("italky_user");}catch{}location.href=HOME;}
function item([ic,lb,hr]){const danger=lb.includes("Çıkış")||lb.includes("Sil");const action=hr==="logout"?'data-action="logout"':"";const href=hr==="logout"?'href="#"':`href="${esc(hr)}"`;return`<a class="italky-menu-item${danger?" danger":""}" ${href} ${action}><span class="italky-menu-icon" data-no-translate="1">${esc(ic)}</span><span>${esc(lb)}</span></a>`;}

function patchMenu(){
  const panel=document.querySelector("#sideMenu .menu-panel"); if(!panel)return; style();document.body?.classList?.add("italky-smart-menu");
  let lr=panel.querySelector(".italky-menu-logo-row"); if(!lr){lr=document.createElement("div");lr.className="italky-menu-logo-row";panel.insertBefore(lr,panel.firstChild);} if(!lr.querySelector("img"))lr.innerHTML=logo("italky-ui-logo"); if(lr.dataset.bound!=="1"){lr.dataset.bound="1";lr.onclick=()=>{location.href=HOME;};}
  const prof=document.getElementById("menuProfileTop"); if(prof){prof.classList.add("italky-menu-profile"); if(prof.dataset.ready!=="1"){prof.dataset.ready="1";prof.innerHTML=`<div class="italky-avatar" id="menuAvatarClick"><img id="menuUserPic" alt="Profil"></div><div><div class="italky-menu-name" id="menuUserName">Kullanıcı</div><div class="italky-menu-mail" id="italkyMenuEmail">-</div><div id="menuLoginDate" style="display:none"></div><div class="italky-token-pill"><span>Jeton</span><strong id="italkyMenuTokenCount">0</strong></div></div>`;prof.onclick=null;prof.style.cursor="default";}}
  const nav=panel.querySelector(".menu-nav"); if(nav){nav.classList.add("italky-menu-nav"); if(nav.dataset.ready!=="1"){nav.dataset.ready="1";nav.innerHTML=MENU.map(item).join("");nav.querySelectorAll(".italky-menu-item").forEach(a=>a.addEventListener("click",e=>{if(a.dataset.action==="logout"){e.preventDefault();closeMenu();logout();return;}closeMenu();}));}}
  hydrateMenu();
}

async function hydrateMenu(){
  const e=document.getElementById("italkyMenuEmail"), n=document.getElementById("menuUserName"), t=document.getElementById("italkyMenuTokenCount"), p=document.getElementById("menuUserPic"); if(!e&&!n&&!t&&!p)return;
  const c=readStore(), a=window.__ITALKY_ACCESS__||{}; let email=a.email||c.email||c.user?.email||""; let name=a.full_name||a.display_name||c.full_name||c.name||email||"Kullanıcı"; let pic=a.avatar_url||a.picture||c.avatar_url||c.picture||""; let tokens=Number(a.tokens??c.tokens??c.jetons??0)||0;
  try{const sb=window.supabase;if(sb?.auth?.getSession){const {data:{session}}=await sb.auth.getSession();const u=session?.user, m=u?.user_metadata||{};email=u?.email||email;name=m.full_name||m.name||name;pic=m.avatar_url||m.picture||pic;if(u?.id){const {data}=await sb.from("profiles").select("email,full_name,display_name,avatar_url,tokens").eq("id",u.id).maybeSingle();if(data){email=data.email||email;name=data.full_name||data.display_name||name;pic=data.avatar_url||pic;tokens=Number(data.tokens??tokens)||0;}}}}catch{}
  if(e)e.textContent=email||"E-posta bulunamadı"; if(n)n.textContent=name||"Kullanıcı"; if(t)t.textContent=String(tokens); if(p){p.referrerPolicy="no-referrer";p.onerror=()=>{p.src=fallbackAvatar(name||email);};p.src=pic||fallbackAvatar(name||email);}
}

function patchJeton(){
  if(path()!=="/pages/jetonbuy.html")return; style(); document.querySelectorAll('.pkg[onclick*="jeton_10"],.pkg[onclick*="jeton_250"]').forEach(x=>x.remove());
  Object.entries(TOKEN_PRODUCTS).forEach(([id,[am,pr,bo]])=>{const card=document.querySelector(`.pkg[onclick*="${id}"]`);if(!card)return;card.querySelector(".amt")&&(card.querySelector(".amt").textContent=am);card.querySelector(".price")&&(card.querySelector(".price").textContent=pr);card.querySelector(".bonus")&&(card.querySelector(".bonus").textContent=bo);card.dataset.googleProduct=id;});
  const hp=document.querySelector(".head p"); if(hp)hp.textContent="Jeton satın alma işlemini Google Play hesabınızla tamamlayabilirsiniz."; if(!document.getElementById("italkyTokenDayNote")){const d=document.createElement("div");d.id="italkyTokenDayNote";d.className="italky-token-note";d.textContent="Günü olmayan kullanıcıda ilk girişte 6 jeton düşer ve 24 saat kullanım açılır. Sonraki 24 saatlik kullanımlar 5 jetondur.";document.querySelector(".balanceCard")?.insertAdjacentElement("afterend",d);}
}

function patchGate(){ document.querySelectorAll('[data-action="membership"],#menuBuyDaysBtn').forEach(b=>{b.textContent="Jeton Yükle";}); }
function bindGateRedirect(){if(window.__italkyGateRedirectBound)return;window.__italkyGateRedirectBound=true;document.addEventListener("click",e=>{const b=e.target?.closest?.('[data-action="membership"],#menuBuyDaysBtn');if(!b)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();location.href="/pages/jetonbuy.html";},true);}

function patchAll(){patchBrand();patchMenu();patchJeton();patchGate();}
function boot(){bindGateRedirect();patchAll();const o=new MutationObserver(()=>patchAll());o.observe(document.documentElement,{childList:true,subtree:true});[80,250,700,1600,2600].forEach(ms=>setTimeout(patchAll,ms));}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
window.addEventListener("focus",()=>setTimeout(hydrateMenu,120));
window.addEventListener("italkyAccessReady",()=>setTimeout(hydrateMenu,120));
