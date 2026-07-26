// FILE: /js/game_logo_patch.js
// Oyun sayfalarında çalışan akışa dokunmadan sadece görünür marka logosunu standartlaştırır.

const GAME_LOGO_SRC = "https://www.icany.ai/brand/italkyai-logo-clear.png";
const GAME_PATHS = new Set([
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
  "/pages/signal_hunt_ios.html"
]);

function isGamePath() {
  try {
    const path = String(location.pathname || "").replace(/\/+$/, "") || "/";
    return GAME_PATHS.has(path);
  } catch {
    return false;
  }
}

function ensureLogoStyle() {
  if (document.getElementById("italkyGameLogoPatchStyle")) return;
  const style = document.createElement("style");
  style.id = "italkyGameLogoPatchStyle";
  style.textContent = `
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
    @media(max-width:700px){
      .italky-game-logo-img{width:104px!important;max-height:50px!important;}
      .gate-logo.italky-game-logo-ready .italky-game-logo-img{width:136px!important;}
    }
  `;
  document.head.appendChild(style);
}

function logoImg(extraClass = "") {
  return `<img class="italky-game-logo-img ${extraClass}" src="${GAME_LOGO_SRC}" alt="italkyAI" data-no-translate="1">`;
}

function patchLogos() {
  if (!isGamePath()) return;
  ensureLogoStyle();

  document.querySelectorAll("#brandHome.brand-group").forEach((brand) => {
    if (brand.querySelector(".italky-game-logo-img")) return;
    brand.innerHTML = logoImg();
    brand.setAttribute("aria-label", "italkyAI Ana Sayfa");
  });

  document.querySelectorAll(".menu-brandblock").forEach((block) => {
    if (block.querySelector(".italky-game-logo-img")) return;
    block.innerHTML = logoImg("menu-logo");
  });

  document.querySelectorAll(".brand-link img.logo,.brand-link img.brand-logo,header .logo").forEach((img) => {
    if (img.dataset.italkyGameLogoPatched === "1") return;
    img.src = GAME_LOGO_SRC;
    img.alt = "italkyAI";
    img.dataset.italkyGameLogoPatched = "1";
  });

  const gateLogo = document.querySelector(".gate-logo");
  if (gateLogo && !gateLogo.querySelector(".italky-game-logo-img")) {
    gateLogo.innerHTML = logoImg();
    gateLogo.classList.add("italky-game-logo-ready");
  }
}

function boot() {
  if (!isGamePath()) return;
  patchLogos();
  const observer = new MutationObserver(() => patchLogos());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(patchLogos, 200);
  setTimeout(patchLogos, 700);
  setTimeout(patchLogos, 1600);
  setTimeout(() => observer.disconnect(), 6000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
