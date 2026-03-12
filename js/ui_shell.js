import { STORAGE_KEY } from "/js/config.js";

const LOADING_OVERLAY_HTML = `
<div id="shellOverlay" style="
  position:fixed; inset:0; background:#070812; z-index:99999;
  display:flex; align-items:center; justify-content:center;
  transition:opacity .35s ease;
">
  <div style="text-align:center; font-family:Outfit,sans-serif;">
    <div style="font-size:30px; font-weight:800; color:#f5f7ff;">
      italky
      <span style="
        background:linear-gradient(135deg,#8bd3ff 0%, #7c5cff 45%, #ff66c4 100%);
        -webkit-background-clip:text;
        -webkit-text-fill-color:transparent;
      ">AI</span>
    </div>
    <div style="
      font-size:10px; letter-spacing:4px; color:rgba(255,255,255,.36);
      margin-top:8px; font-weight:800;
    ">BE FREE</div>
  </div>
</div>`;

const HOME_HEADER_HTML = `
<header class="premium-header" id="italkyHeader">
  <div class="brand-group" id="brandHome" style="cursor:pointer;">
    <h1>
      <span>italky</span>
      <span class="ai">AI</span>
    </h1>
    <div class="brand-slogan">BE FREE</div>
  </div>

  <button class="menu-btn" id="menuBtn" aria-label="Menü" type="button">
    <span></span><span></span><span></span>
  </button>
</header>

<aside class="side-menu" id="sideMenu" aria-hidden="true">
  <div class="menu-backdrop" id="menuBackdrop"></div>

  <div class="menu-panel">
    <div class="menu-top">
      <div class="menu-title">
        <div class="menu-brand">
          <span class="menu-brand-main">italky</span>
          <span class="menu-brand-ai">AI</span>
        </div>
        <div class="menu-sub">Modüller</div>
      </div>

      <button class="menu-close" id="menuClose" aria-label="Kapat" type="button">✕</button>
    </div>

    <nav class="menu-nav">
      <a href="/pages/home.html">Ana Sayfa</a>
      <a href="/pages/offline_languages.html">Offline Diller</a>
      <a href="/pages/academy.html">Academy</a>
      <a href="/pages/games.html">Oyunlar</a>
      <a href="/pages/profile.html">Profil</a>
      <a href="/pages/settings.html">Ayarlar</a>
      <a href="/pages/privacy.html">Gizlilik</a>
      <a href="/pages/contact.html">İletişim</a>
    </nav>

    <div class="menu-sign">italkyAI By Ozyigit's • 2026</div>
  </div>
</aside>`;

const HOME_FOOTER_HTML = `
<footer class="premium-footer" id="italkyFooter">
  <div class="signature">italkyAI By Ozyigit's • 2026</div>
</footer>`;

const SHELL_CSS = `
:root{
  --ai-gradient: linear-gradient(135deg,#8bd3ff 0%,#7c5cff 45%,#ff66c4 100%);
  --footerH:0px;
  --shell-bg-1:#060814;
  --shell-bg-2:#0b1020;
  --shell-line:rgba(255,255,255,.08);
  --shell-soft:rgba(255,255,255,.05);
  --shell-text:#f5f7ff;
  --shell-muted:rgba(255,255,255,.56);
  --shell-blue:rgba(86,170,255,.24);
  --shell-pink:rgba(255,102,196,.16);
}

*{
  box-sizing:border-box;
  -webkit-tap-highlight-color:transparent;
}

html,body{
  margin:0;
  padding:0;
  width:100%;
  height:100%;
  background:#05070f !important;
  font-family:'Outfit',sans-serif;
  overflow:hidden;
  color:var(--shell-text);
}

body.ui-menu-open{
  overflow:hidden;
}

.italky-bg{
  position:fixed;
  inset:0;
  pointer-events:none;
  z-index:0;
  background:
    radial-gradient(circle at 20% 15%, rgba(124,92,255,.14) 0%, transparent 28%),
    radial-gradient(circle at 78% 22%, rgba(139,211,255,.11) 0%, transparent 24%),
    radial-gradient(circle at 50% 55%, rgba(255,102,196,.06) 0%, transparent 22%),
    linear-gradient(180deg,#05070f 0%, #090d19 45%, #05070f 100%);
}

.italky-bg::after{
  content:"";
  position:absolute;
  inset:0;
  background:
    linear-gradient(to bottom, transparent, rgba(255,255,255,.015)),
    repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 36px,
      rgba(255,255,255,.015) 37px
    );
  opacity:.35;
}

.app-viewport{
  position:relative;
  z-index:5;
  width:100%;
  max-width:430px;
  height:100dvh;
  margin:0 auto;
  display:flex;
  flex-direction:column;
  background:
    linear-gradient(180deg, rgba(13,17,31,.90) 0%, rgba(8,11,22,.82) 100%);
  backdrop-filter:blur(18px);
  border-left:1px solid rgba(255,255,255,.06);
  border-right:1px solid rgba(255,255,255,.06);
  overflow:hidden;
  box-shadow:
    0 0 0 1px rgba(255,255,255,.02),
    0 18px 50px rgba(0,0,0,.36);
}

.premium-header{
  position:relative;
  padding:calc(18px + env(safe-area-inset-top)) 18px 14px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  border-bottom:1px solid var(--shell-line);
  background:
    linear-gradient(180deg, rgba(10,13,24,.88) 0%, rgba(10,13,24,.52) 100%);
  flex:0 0 auto;
}

.premium-header::after{
  content:"";
  position:absolute;
  left:18px;
  right:18px;
  bottom:-1px;
  height:1px;
  background:linear-gradient(90deg, transparent, rgba(139,211,255,.22), transparent);
}

.brand-group{
  display:flex;
  flex-direction:column;
  gap:3px;
}

.brand-group h1{
  margin:0;
  display:flex;
  gap:2px;
  align-items:center;
  font-family:'Outfit',sans-serif;
  font-size:26px;
  line-height:1;
  font-weight:800;
  letter-spacing:-0.4px;
  color:#f6f8ff;
}

.brand-group h1 .ai{
  background:var(--ai-gradient);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  filter:drop-shadow(0 0 10px rgba(124,92,255,.25));
}

.brand-slogan{
  font-size:9px;
  font-weight:800;
  letter-spacing:3.8px;
  color:rgba(255,255,255,.38);
  margin-left:1px;
}

.menu-btn{
  width:44px;
  height:44px;
  border:none;
  border-radius:14px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.07), rgba(255,255,255,.03));
  border:1px solid rgba(255,255,255,.08);
  box-shadow:
    0 8px 18px rgba(0,0,0,.24),
    inset 0 1px 0 rgba(255,255,255,.05);
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:4px;
  cursor:pointer;
}

.menu-btn span{
  display:block;
  width:18px;
  height:2px;
  border-radius:999px;
  background:#f2f5ff;
}

.shellMain{
  flex:1;
  min-height:0;
  overflow-y:auto;
  padding-bottom:calc(var(--footerH) + 10px);
  position:relative;
}

.premium-footer{
  position:absolute;
  left:0;
  right:0;
  bottom:0;
  display:flex;
  justify-content:center;
  align-items:center;
  background:rgba(9,12,22,.74);
  backdrop-filter:blur(16px);
  border-top:1px solid rgba(255,255,255,.06);
  padding:10px 12px calc(10px + env(safe-area-inset-bottom));
  z-index:30;
}

.signature{
  font-size:10px;
  font-weight:700;
  letter-spacing:.3px;
  color:rgba(255,255,255,.34);
}

/* SIDE MENU */

.side-menu{
  position:fixed;
  inset:0;
  z-index:200;
  pointer-events:none;
}

.side-menu.open{
  pointer-events:auto;
}

.menu-backdrop{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,.42);
  opacity:0;
  transition:opacity .24s ease;
  backdrop-filter:blur(4px);
}

.side-menu.open .menu-backdrop{
  opacity:1;
}

.menu-panel{
  position:absolute;
  top:0;
  right:0;
  width:min(84vw, 320px);
  height:100%;
  transform:translateX(104%);
  transition:transform .28s ease;
  background:
    linear-gradient(180deg, rgba(12,16,29,.98) 0%, rgba(8,11,21,.98) 100%);
  border-left:1px solid rgba(255,255,255,.07);
  box-shadow:-18px 0 44px rgba(0,0,0,.38);
  padding:
    calc(18px + env(safe-area-inset-top))
    16px
    calc(18px + env(safe-area-inset-bottom));
  display:flex;
  flex-direction:column;
}

.side-menu.open .menu-panel{
  transform:translateX(0);
}

.menu-top{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:10px;
  margin-bottom:20px;
}

.menu-title{
  display:flex;
  flex-direction:column;
  gap:4px;
}

.menu-brand{
  display:flex;
  align-items:center;
  gap:2px;
  font-size:25px;
  font-weight:800;
  line-height:1;
}

.menu-brand-main{
  color:#f6f8ff;
}

.menu-brand-ai{
  background:var(--ai-gradient);
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
}

.menu-sub{
  font-size:12px;
  color:rgba(255,255,255,.44);
  letter-spacing:.3px;
}

.menu-close{
  width:38px;
  height:38px;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.04);
  color:#fff;
  font-size:18px;
  cursor:pointer;
}

.menu-nav{
  display:flex;
  flex-direction:column;
  gap:10px;
}

.menu-nav a{
  text-decoration:none;
  color:#f3f6ff;
  padding:14px 14px;
  border-radius:16px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.025));
  border:1px solid rgba(255,255,255,.06);
  font-size:15px;
  font-weight:700;
  letter-spacing:.1px;
}

.menu-nav a:hover,
.menu-nav a:active{
  background:
    linear-gradient(180deg, rgba(139,211,255,.12), rgba(124,92,255,.10));
}

.menu-sign{
  margin-top:auto;
  padding-top:18px;
  font-size:11px;
  color:rgba(255,255,255,.32);
  text-align:center;
}
`;

export function mountShell(options = {}) {
  document.documentElement.style.backgroundColor = "#05070f";

  if (!document.getElementById("shellOverlay")) {
    document.body.insertAdjacentHTML("afterbegin", LOADING_OVERLAY_HTML);
  }

  if (!document.getElementById("italkyShellStyle")) {
    const st = document.createElement("style");
    st.id = "italkyShellStyle";
    st.textContent = SHELL_CSS;
    document.head.prepend(st);
  }

  const content = document.getElementById("pageContent");
  if (!content) {
    removeOverlaySoon();
    return;
  }

  if (document.getElementById("italkyAppShell")) {
    finishMount(options);
    return;
  }

  const bg = document.createElement("div");
  bg.className = "italky-bg";

  const shell = document.createElement("div");
  shell.className = "app-viewport";
  shell.id = "italkyAppShell";
  shell.innerHTML = `${HOME_HEADER_HTML}<main class="shellMain" id="shellMain"></main>${HOME_FOOTER_HTML}`;

  const main = shell.querySelector("#shellMain");
  main.appendChild(content);

  document.body.prepend(bg, shell);

  document.getElementById("brandHome")?.addEventListener("click", () => {
    location.href = "/pages/home.html";
  });

  bindMenu();
  finishMount(options);
  window.addEventListener("resize", syncFooterHeight, { passive: true });
}

function finishMount(options) {
  const main = document.getElementById("shellMain");
  if (main) main.style.overflow = (options?.scroll === "none") ? "hidden" : "auto";

  requestAnimationFrame(() => {
    document.body.classList.add("ui-ready");
    hydrateFromCache();
    syncFooterHeight();
    setTimeout(removeOverlaySoon, 100);
  });
}

function bindMenu() {
  const menuBtn = document.getElementById("menuBtn");
  const sideMenu = document.getElementById("sideMenu");
  const menuBackdrop = document.getElementById("menuBackdrop");
  const menuClose = document.getElementById("menuClose");

  if (!menuBtn || !sideMenu) return;

  const openMenu = () => {
    sideMenu.classList.add("open");
    sideMenu.setAttribute("aria-hidden", "false");
    document.body.classList.add("ui-menu-open");
  };

  const closeMenu = () => {
    sideMenu.classList.remove("open");
    sideMenu.setAttribute("aria-hidden", "true");
    document.body.classList.remove("ui-menu-open");
  };

  menuBtn.addEventListener("click", openMenu);
  menuBackdrop?.addEventListener("click", closeMenu);
  menuClose?.addEventListener("click", closeMenu);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

export function hydrateFromCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    JSON.parse(raw);
  } catch (e) {}
}

function syncFooterHeight() {
  const f = document.getElementById("italkyFooter");
  if (f) document.documentElement.style.setProperty("--footerH", f.offsetHeight + "px");
}

function removeOverlaySoon() {
  const ov = document.getElementById("shellOverlay");
  if (ov) {
    ov.style.opacity = "0";
    setTimeout(() => ov.remove(), 350);
  }
}

export function setHeaderTokens(val) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const u = raw ? JSON.parse(raw) : {};
    u.tokens = Number(val ?? 0);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  } catch (e) {}
}
