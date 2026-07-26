// FILE: /js/game_logo_patch.js
// Oyun ve seviye tespit sayfalarında çalışan akışa dokunmadan
// sadece görünür marka, BE FREE ve alt bar görünümünü standartlaştırır.

const GAME_LOGO_SRC = "https://www.icany.ai/brand/italkyai-logo-clear.png";
const HOME_HREF = "https://italky.ai/hosgeldiniz";
const STANDARD_SIGNATURE = "by Ozyigit's 2026";
const STANDARD_RUNE = "𐰆𐰍𐰔 𐰇𐰔𐰘𐰃𐰏𐱅";

const PATCH_PATHS = new Set([
  "/pages/game_menu.html",
  "/pages/hangman.html",
  "/pages/word_cracker.html",
  "/pages/gap_master.html",
  "/pages/glitch.html",
  "/pages/signal_hunt.html",
  "/pages/hangman_ios.html",
  "/pages/word_cracker_ios.html",
  "/pages/gap_master_ios.html",
  "/pages/glitch_ios.html",
  "/pages/signal_hunt_ios.html",
  "/pages/level_test_hub.html"
]);

function currentPath() {
  try {
    return String(location.pathname || "").replace(/\/+$/, "") || "/";
  } catch {
    return "/";
  }
}

function isPatchedPath() {
  return PATCH_PATHS.has(currentPath());
}

function ensureLogoStyle() {
  if (document.getElementById("italkyGameLogoPatchStyle")) return;
  const style = document.createElement("style");
  style.id = "italkyGameLogoPatchStyle";
  style.textContent = `
    body.italky-game-brand-patched .brand-group::after,
    body.italky-game-brand-patched .menu-brand-sub,
    body.italky-game-brand-patched [data-italky-be-free],
    body.italky-game-brand-patched .brand-sub,
    body.italky-game-brand-patched .logo-subtitle{
      content:none!important;
      display:none!important;
      visibility:hidden!important;
      width:0!important;
      height:0!important;
      margin:0!important;
      padding:0!important;
      overflow:hidden!important;
    }
    .italky-game-logo-img{
      display:block!important;
      width:132px!important;
      max-width:38vw!important;
      height:auto!important;
      max-height:58px!important;
      object-fit:contain!important;
      background:transparent!important;
      border:0!important;
      box-shadow:none!important;
      filter:none!important;
    }
    .menu-brandblock .italky-game-logo-img,
    .menu-user-meta .italky-game-logo-img{
      width:118px!important;
      max-width:100%!important;
      max-height:50px!important;
    }
    .gate-logo.italky-game-logo-ready{
      width:156px!important;
      height:auto!important;
      min-height:60px!important;
      margin:0 auto 10px!important;
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      background:transparent!important;
      border:0!important;
      box-shadow:none!important;
      font-size:0!important;
    }
    .gate-logo.italky-game-logo-ready .italky-game-logo-img{
      width:156px!important;
      max-width:62vw!important;
      max-height:70px!important;
    }
    body.italky-game-brand-patched .premium-footer,
    body.italky-game-brand-patched .site-footer,
    body.italky-game-brand-patched footer.footer,
    body.italky-game-brand-patched .italky-game-standard-footer{
      position:fixed!important;
      left:0!important;
      right:0!important;
      bottom:0!important;
      z-index:214748200!important;
      min-height:66px!important;
      height:calc(66px + env(safe-area-inset-bottom,0px))!important;
      padding:7px 12px calc(7px + env(safe-area-inset-bottom,0px))!important;
      display:flex!important;
      flex-direction:column!important;
      align-items:center!important;
      justify-content:center!important;
      gap:5px!important;
      overflow:hidden!important;
      border-top:1px solid rgba(78,210,217,.24)!important;
      background:#06111d!important;
      backdrop-filter:blur(16px)!important;
      -webkit-backdrop-filter:blur(16px)!important;
      box-shadow:none!important;
      color:#f6fbff!important;
      text-align:center!important;
      pointer-events:auto!important;
    }
    body.italky-game-brand-patched .italky-game-footer-links{
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      gap:16px!important;
      min-height:18px!important;
      white-space:nowrap!important;
      flex-wrap:nowrap!important;
    }
    body.italky-game-brand-patched .italky-game-footer-links a{
      color:#aebdcc!important;
      text-decoration:none!important;
      font-size:11px!important;
      line-height:1!important;
      font-weight:800!important;
      letter-spacing:0!important;
      text-shadow:none!important;
      -webkit-text-fill-color:currentColor!important;
    }
    body.italky-game-brand-patched .italky-game-footer-signature{
      display:flex!important;
      align-items:center!important;
      justify-content:center!important;
      gap:5px!important;
      min-height:14px!important;
      max-width:100%!important;
      white-space:nowrap!important;
      overflow:hidden!important;
      text-overflow:ellipsis!important;
      color:#91a4b8!important;
      font-size:10px!important;
      line-height:1.15!important;
      font-weight:900!important;
      letter-spacing:0!important;
      text-align:center!important;
      text-shadow:none!important;
      -webkit-text-fill-color:currentColor!important;
    }
    body.italky-game-brand-patched .italky-game-footer-rune{
      display:inline!important;
      margin-left:2px!important;
      color:#36d4ce!important;
      font-family:"Segoe UI Historic","Noto Sans Old Turkic",serif!important;
      font-size:10px!important;
      line-height:1!important;
      font-weight:900!important;
      direction:rtl!important;
      unicode-bidi:isolate!important;
      vertical-align:baseline!important;
      -webkit-text-fill-color:currentColor!important;
    }
    body.italky-game-brand-patched .site-footer-corp,
    body.italky-game-brand-patched .corp,
    body.italky-game-brand-patched a[href*="audience=corporate"]{
      display:none!important;
    }
    body.italky-game-brand-patched .italky-global-footer:not(.italky-game-standard-footer){
      display:none!important;
    }
    @media(max-width:700px){
      .italky-game-logo-img{width:104px!important;max-height:50px!important;}
      .gate-logo.italky-game-logo-ready .italky-game-logo-img{width:136px!important;}
      body.italky-game-brand-patched .italky-game-footer-links{gap:10px!important;}
      body.italky-game-brand-patched .italky-game-footer-links a{font-size:9px!important;}
      body.italky-game-brand-patched .italky-game-footer-signature,
      body.italky-game-brand-patched .italky-game-footer-rune{font-size:8px!important;}
    }
  `;
  document.head.appendChild(style);
}

function logoImg(extraClass = "") {
  return `<img class="italky-game-logo-img ${extraClass}" src="${GAME_LOGO_SRC}" alt="italkyAI" data-no-translate="1">`;
}

function standardFooterHtml() {
  return `
    <nav class="italky-game-footer-links" aria-label="Alt menü">
      <a href="/pages/about.html">Hakkımızda</a>
      <a href="/pages/features.html">Özellikler</a>
      <a href="/pages/privacy.html">Gizlilik</a>
      <a href="/pages/contact.html">İletişim</a>
    </nav>
    <div class="italky-game-footer-signature" data-no-translate="1">
      ${STANDARD_SIGNATURE}<span class="italky-game-footer-rune" lang="otk" dir="rtl">${STANDARD_RUNE}</span>
    </div>`;
}

function killBeFreeText() {
  document.querySelectorAll(".menu-brand-sub,.brand-sub,.logo-subtitle").forEach((el) => {
    if (el.dataset.italkyBeFree === "1") return;
    el.textContent = "";
    el.setAttribute("data-italky-be-free", "1");
  });

  document.querySelectorAll("body *").forEach((el) => {
    if (!el || el.children?.length || el.dataset.italkyBeFree === "1") return;
    const txt = String(el.textContent || "").trim().toUpperCase();
    if (txt === "BE FREE" || txt === "SPEAK · LISTEN · CREATE") {
      el.textContent = "";
      el.setAttribute("data-italky-be-free", "1");
    }
  });
}

function patchLogos() {
  ensureLogoStyle();
  document.body?.classList?.add("italky-game-brand-patched");

  document.querySelectorAll("#brandHome.brand-group").forEach((brand) => {
    if (!brand.querySelector(".italky-game-logo-img")) brand.innerHTML = logoImg();
    brand.setAttribute("aria-label", "italkyAI Ana Sayfa");
    brand.setAttribute("role", "link");
    if (brand.dataset.italkyLogoClickPatched !== "1") {
      brand.dataset.italkyLogoClickPatched = "1";
      brand.addEventListener("click", () => { location.href = HOME_HREF; });
    }
  });

  document.querySelectorAll(".menu-brandblock").forEach((block) => {
    if (!block.querySelector(".italky-game-logo-img")) block.innerHTML = logoImg("menu-logo");
  });

  document.querySelectorAll(".brand-link img.logo,.brand-link img.brand-logo,header .logo,header .brand-logo").forEach((img) => {
    if (img.dataset.italkyGameLogoPatched !== "1") {
      img.src = GAME_LOGO_SRC;
      img.alt = "italkyAI";
      img.dataset.italkyGameLogoPatched = "1";
    }
  });

  document.querySelectorAll(".brand-link,header a.logo-link,header a[aria-label*='Ana']").forEach((link) => {
    try {
      if (link.querySelector?.("img")) link.setAttribute("href", HOME_HREF);
    } catch {}
  });

  const gateLogo = document.querySelector(".gate-logo");
  if (gateLogo && !gateLogo.querySelector(".italky-game-logo-img")) {
    gateLogo.innerHTML = logoImg();
    gateLogo.classList.add("italky-game-logo-ready");
  }

  killBeFreeText();
}

function patchFooter() {
  ensureLogoStyle();
  document.body?.classList?.add("italky-game-brand-patched");

  let footer = document.querySelector("#italkyFooter.premium-footer")
    || document.querySelector("footer.site-footer")
    || document.querySelector("footer.footer")
    || document.querySelector(".italky-game-standard-footer");

  if (!footer) {
    footer = document.createElement("footer");
    document.body.appendChild(footer);
  }

  footer.classList.add("italky-game-standard-footer");
  footer.setAttribute("data-no-translate", "1");

  if (footer.dataset.italkyStandardFooter !== "1") {
    footer.innerHTML = standardFooterHtml();
    footer.dataset.italkyStandardFooter = "1";
  }

  try {
    document.documentElement.style.setProperty("--footerH", `${footer.offsetHeight || 66}px`);
    document.documentElement.style.setProperty("--foot", "66px");
  } catch {}
}

function patchPage() {
  if (!isPatchedPath()) return;
  patchLogos();
  patchFooter();
}

function boot() {
  if (!isPatchedPath()) return;
  patchPage();
  const observer = new MutationObserver(() => patchPage());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(patchPage, 80);
  setTimeout(patchPage, 250);
  setTimeout(patchPage, 700);
  setTimeout(patchPage, 1600);
  setTimeout(patchPage, 2600);
  setTimeout(() => observer.disconnect(), 7000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
